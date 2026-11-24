import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { geohashEncode, geohashWithNeighbours, haversineKm } from '../geo';
import { parseMatchId } from '../ids';
import type { FeedEvent, Job, Match, Rating, Worker } from '../schemas';
import type { NearbyQuery, Repo } from './repo';

/**
 * Single-table design (table: PK, SK; GSI1, GSI2, GSI3 with *PK/*SK string keys)
 *
 * Entity   | PK              | SK                    | GSI1PK (geo)      | GSI1SK           | GSI2PK            | GSI2SK            | GSI3PK     | GSI3SK
 * ---------|-----------------|-----------------------|-------------------|------------------|-------------------|-------------------|------------|---------
 * Worker   | WORKER#<id>     | PROFILE               | GEO4#<gh4>        | WORKER#<id>      | CHAT#<chatId>     | WORKER            | TYPE#WORKER| <createdAt>
 * Job      | JOB#<id>        | META                  | GEO4#<gh4>        | JOB#<createdAt>  | –                 | –                 | TYPE#JOB   | <createdAt>
 * Match    | JOB#<jobId>     | MATCH#<workerId>      | –                 | –                | WORKER#<workerId> | MATCH#<createdAt> | –          | –
 * Rating   | WORKER#<id>     | RATING#<createdAt>    | –                 | –                | JOB#<jobId>       | RATING#<workerId> | –          | –
 * Event    | FEED            | <at>#<id>             | –                 | –                | –                 | –                 | –          | –
 * Session  | SESSION#<chat>  | STATE                 | –                 | –                | –                 | –                 | –          | –
 * Phone    | PHONE#<last10>  | WORKER                | (pointer item → workerId)
 *
 * Nearby query = GSI1 over the geohash-4 cell (~39×20 km) + 8 neighbours, then exact haversine filter.
 */
const GEO_PRECISION = 4;

type Item = Record<string, unknown>;
const strip = <T>(item: Item | undefined): T | null => {
  if (!item) return null;
  const { PK: _a, SK: _b, GSI1PK: _c, GSI1SK: _d, GSI2PK: _e, GSI2SK: _f, GSI3PK: _g, GSI3SK: _h, entity: _i, ...rest } = item;
  return rest as T;
};

export class DynamoRepo implements Repo {
  readonly name = 'dynamo' as const;
  private doc: DynamoDBDocumentClient;
  constructor(
    private table: string,
    region: string,
  ) {
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  private async queryAll(input: Omit<QueryCommandInput, 'TableName'>): Promise<Item[]> {
    const out: Item[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await this.doc.send(new QueryCommand({ TableName: this.table, ...input, ExclusiveStartKey }));
      out.push(...((res.Items ?? []) as Item[]));
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey && out.length < 2000);
    return out;
  }

  private workerItem(w: Worker): Item {
    return {
      PK: `WORKER#${w.id}`,
      SK: 'PROFILE',
      GSI1PK: `GEO4#${geohashEncode(w.location.lat, w.location.lng, GEO_PRECISION)}`,
      GSI1SK: `WORKER#${w.id}`,
      ...(w.chatId ? { GSI2PK: `CHAT#${w.chatId}`, GSI2SK: 'WORKER' } : {}),
      GSI3PK: 'TYPE#WORKER',
      GSI3SK: w.createdAt,
      entity: 'worker',
      ...w,
    };
  }

  async getWorker(id: string) {
    const res = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `WORKER#${id}`, SK: 'PROFILE' } }));
    return strip<Worker>(res.Item as Item | undefined);
  }
  async getWorkerByChat(chatId: string) {
    const items = await this.queryAll({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :p AND GSI2SK = :s',
      ExpressionAttributeValues: { ':p': `CHAT#${chatId}`, ':s': 'WORKER' },
    });
    return strip<Worker>(items[0]);
  }
  async getWorkerByPhone(phone: string) {
    const p = phone.replace(/\D/g, '').slice(-10);
    const res = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `PHONE#${p}`, SK: 'WORKER' } }));
    const id = (res.Item as { workerId?: string } | undefined)?.workerId;
    return id ? this.getWorker(id) : null;
  }
  async putWorker(w: Worker) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: this.workerItem(w) }));
    if (w.phone) {
      const p = w.phone.replace(/\D/g, '').slice(-10);
      await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `PHONE#${p}`, SK: 'WORKER', workerId: w.id } }));
    }
  }
  async deleteWorker(id: string) {
    const w = await this.getWorker(id);
    const own = await this.queryAll({ KeyConditionExpression: 'PK = :p', ExpressionAttributeValues: { ':p': `WORKER#${id}` } });
    const matches = await this.listMatchesForWorker(id);
    const keys = [
      ...own.map((i) => ({ PK: i.PK, SK: i.SK })),
      ...matches.map((m) => ({ PK: `JOB#${m.jobId}`, SK: `MATCH#${m.workerId}` })),
      ...(w?.phone ? [{ PK: `PHONE#${w.phone.replace(/\D/g, '').slice(-10)}`, SK: 'WORKER' }] : []),
    ];
    for (let i = 0; i < keys.length; i += 25) {
      await this.doc.send(
        new BatchWriteCommand({ RequestItems: { [this.table]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) } }),
      );
    }
  }
  async listWorkers(near?: NearbyQuery) {
    if (!near) {
      const items = await this.queryAll({ IndexName: 'GSI3', KeyConditionExpression: 'GSI3PK = :p', ExpressionAttributeValues: { ':p': 'TYPE#WORKER' } });
      return items.map((i) => strip<Worker>(i)!).filter((w) => w.status !== 'deleted');
    }
    const cells = geohashWithNeighbours(geohashEncode(near.lat, near.lng, GEO_PRECISION));
    const results = await Promise.all(
      cells.map((c) =>
        this.queryAll({
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :p AND begins_with(GSI1SK, :s)',
          ExpressionAttributeValues: { ':p': `GEO4#${c}`, ':s': 'WORKER#' },
        }),
      ),
    );
    return results
      .flat()
      .map((i) => strip<Worker>(i)!)
      .filter((w) => w.status !== 'deleted' && haversineKm(w.location, near) <= near.radiusKm * 1.5);
  }

  async getJob(id: string) {
    const res = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `JOB#${id}`, SK: 'META' } }));
    return strip<Job>(res.Item as Item | undefined);
  }
  async putJob(j: Job) {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          PK: `JOB#${j.id}`,
          SK: 'META',
          GSI1PK: `GEO4#${geohashEncode(j.location.lat, j.location.lng, GEO_PRECISION)}`,
          GSI1SK: `JOB#${j.createdAt}`,
          GSI3PK: 'TYPE#JOB',
          GSI3SK: j.createdAt,
          entity: 'job',
          ...j,
        },
      }),
    );
  }
  async listJobs(opts: { limit?: number; near?: NearbyQuery } = {}) {
    const near = opts.near;
    if (near) {
      const cells = geohashWithNeighbours(geohashEncode(near.lat, near.lng, GEO_PRECISION));
      const res = await Promise.all(
        cells.map((c) =>
          this.queryAll({
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :p AND begins_with(GSI1SK, :s)',
            ExpressionAttributeValues: { ':p': `GEO4#${c}`, ':s': 'JOB#' },
          }),
        ),
      );
      return res
        .flat()
        .map((i) => strip<Job>(i)!)
        .filter((j) => haversineKm(j.location, near) <= near.radiusKm)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, opts.limit ?? 100);
    }
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :p',
        ExpressionAttributeValues: { ':p': 'TYPE#JOB' },
        ScanIndexForward: false,
        Limit: opts.limit ?? 100,
      }),
    );
    return ((res.Items ?? []) as Item[]).map((i) => strip<Job>(i)!);
  }

  private matchItem(m: Match): Item {
    return { PK: `JOB#${m.jobId}`, SK: `MATCH#${m.workerId}`, GSI2PK: `WORKER#${m.workerId}`, GSI2SK: `MATCH#${m.createdAt}`, entity: 'match', ...m };
  }
  async putMatches(ms: Match[]) {
    for (let i = 0; i < ms.length; i += 25) {
      await this.doc.send(
        new BatchWriteCommand({ RequestItems: { [this.table]: ms.slice(i, i + 25).map((m) => ({ PutRequest: { Item: this.matchItem(m) } })) } }),
      );
    }
  }
  async getMatch(id: string) {
    const k = parseMatchId(id);
    if (!k) return null;
    const res = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `JOB#${k.jobId}`, SK: `MATCH#${k.workerId}` } }));
    return strip<Match>(res.Item as Item | undefined);
  }
  async updateMatch(id: string, patch: Partial<Match>) {
    const cur = await this.getMatch(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    await this.doc.send(new PutCommand({ TableName: this.table, Item: this.matchItem(next) }));
    return next;
  }
  async listMatchesForJob(jobId: string) {
    const items = await this.queryAll({
      KeyConditionExpression: 'PK = :p AND begins_with(SK, :s)',
      ExpressionAttributeValues: { ':p': `JOB#${jobId}`, ':s': 'MATCH#' },
    });
    return items.map((i) => strip<Match>(i)!).sort((a, b) => a.rank - b.rank);
  }
  async listMatchesForWorker(workerId: string) {
    const items = await this.queryAll({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :p AND begins_with(GSI2SK, :s)',
      ExpressionAttributeValues: { ':p': `WORKER#${workerId}`, ':s': 'MATCH#' },
      ScanIndexForward: false,
    });
    return items.map((i) => strip<Match>(i)!);
  }

  async addRating(r: Rating) {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `WORKER#${r.workerId}`, SK: `RATING#${r.createdAt}`, GSI2PK: `JOB#${r.jobId}`, GSI2SK: `RATING#${r.workerId}`, entity: 'rating', ...r },
      }),
    );
  }
  async listRatings(workerId: string) {
    const items = await this.queryAll({
      KeyConditionExpression: 'PK = :p AND begins_with(SK, :s)',
      ExpressionAttributeValues: { ':p': `WORKER#${workerId}`, ':s': 'RATING#' },
      ScanIndexForward: false,
    });
    return items.map((i) => strip<Rating>(i)!);
  }

  async addEvent(e: FeedEvent) {
    const ttl = Math.floor(Date.now() / 1000) + 7 * 86400;
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: 'FEED', SK: `${e.at}#${e.id}`, entity: 'event', ttl, ...e } }));
  }
  async listEvents(opts: { since?: string; limit?: number } = {}) {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: opts.since ? 'PK = :p AND SK > :s' : 'PK = :p',
        ExpressionAttributeValues: opts.since ? { ':p': 'FEED', ':s': `${opts.since}#~` } : { ':p': 'FEED' },
        ScanIndexForward: false,
        Limit: opts.limit ?? 50,
      }),
    );
    return ((res.Items ?? []) as Item[]).map((i) => {
      const { ttl: _t, ...rest } = strip<FeedEvent & { ttl?: number }>(i)!;
      return rest;
    });
  }

  async getSession(chatId: string) {
    const res = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `SESSION#${chatId}`, SK: 'STATE' } }));
    return (res.Item?.data as Record<string, unknown> | undefined) ?? null;
  }
  async putSession(chatId: string, data: Record<string, unknown>) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `SESSION#${chatId}`, SK: 'STATE', data } }));
  }

  /** Delete everything (used by `seed --reset` against Dynamo). */
  async deleteKeys(keys: { PK: string; SK: string }[]) {
    await Promise.all(keys.map((Key) => this.doc.send(new DeleteCommand({ TableName: this.table, Key }))));
  }
}
