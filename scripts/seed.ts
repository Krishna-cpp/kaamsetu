/**
 * Seeds ~60 workers, ~20 jobs (with matches/history), ratings and a live feed across Pune.
 *   npm run seed            # reset + seed the configured store (file by default)
 */
import {
  emptyDb,
  FileRepo,
  geohashEncode,
  getCtx,
  getLocality,
  jitter,
  matchId,
  rankWorkers,
  SEED_LOCALITIES,
  todayIST,
  type DbShape,
  type FeedEvent,
  type Job,
  type Language,
  type Match,
  type Rating,
  type Skill,
  type Worker,
} from '@kaamsetu/core/server';
import { localityLabel, skillLabel } from '@kaamsetu/core';

// Deterministic PRNG so the demo looks the same every time
let seed = 20261124;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

type Spec = [name: string, lang: Language, skills: Skill[]];
const WORKERS: Spec[] = [
  ['Ramesh Pawar', 'mr', ['plumber']],
  ['Sunil Yadav', 'hi', ['painter']],
  ['Ganesh Shinde', 'mr', ['mason', 'tile_fitter']],
  ['Joseph D’Souza', 'en', ['electrician', 'ac_technician']],
  ['Imran Shaikh', 'hi', ['electrician']],
  ['Lakshmi Bai', 'mr', ['domestic', 'cook']],
  ['Santosh Jadhav', 'mr', ['painter']],
  ['Raju Kumar', 'hi', ['helper', 'mason']],
  ['Anita Kamble', 'mr', ['cook']],
  ['Mohammed Rafiq', 'hi', ['carpenter']],
  ['Vijay Gaikwad', 'mr', ['driver']],
  ['Pooja Waghmare', 'mr', ['domestic']],
  ['Arjun Singh', 'hi', ['security_guard']],
  ['Prakash More', 'mr', ['plumber', 'tile_fitter']],
  ['Manoj Tiwari', 'hi', ['painter', 'helper']],
  ['Sachin Kale', 'mr', ['electrician']],
  ['Deepak Verma', 'hi', ['welder']],
  ['Kavita Salunkhe', 'mr', ['cook', 'domestic']],
  ['Ravi Chavan', 'mr', ['delivery', 'driver']],
  ['Abdul Karim', 'hi', ['mason']],
  ['Suresh Patil', 'mr', ['carpenter', 'painter']],
  ['Rekha Devi', 'hi', ['domestic']],
  ['Nitin Bhosale', 'mr', ['ac_technician']],
  ['Amit Mishra', 'hi', ['delivery']],
  ['Balu Khandagale', 'mr', ['helper']],
  ['Farhan Qureshi', 'hi', ['tile_fitter']],
  ['Dnyaneshwar Mane', 'mr', ['mason']],
  ['Shankar Pandey', 'hi', ['plumber']],
  ['Meena Sonawane', 'mr', ['cook']],
  ['Rahul Deshmukh', 'mr', ['painter']],
  ['Kishore Nair', 'en', ['electrician']],
  ['Sanjay Gupta', 'hi', ['driver']],
  ['Asha Ingle', 'mr', ['domestic', 'helper']],
  ['Vikas Thorat', 'mr', ['welder', 'helper']],
  ['Pappu Ram', 'hi', ['helper']],
  ['Anil Londhe', 'mr', ['plumber']],
  ['Salim Ansari', 'hi', ['painter']],
  ['Ganpat Lokhande', 'mr', ['carpenter']],
  ['Bhavna Rathod', 'hi', ['cook']],
  ['Yogesh Kulkarni', 'mr', ['ac_technician', 'electrician']],
  ['Ramprasad Sahu', 'hi', ['mason']],
  ['Sunita Gaikwad', 'mr', ['domestic']],
  ['Ajay Chauhan', 'hi', ['security_guard']],
  ['Mahesh Pawar', 'mr', ['tile_fitter', 'mason']],
  ['Dinesh Prajapati', 'hi', ['painter']],
  ['Tukaram Jagtap', 'mr', ['driver']],
  ['Ashok Rawat', 'hi', ['plumber']],
  ['Pradeep Shetty', 'en', ['cook']],
  ['Bablu Khan', 'hi', ['delivery']],
  ['Rohini Kadam', 'mr', ['cook', 'domestic']],
  ['Kiran Sutar', 'mr', ['carpenter']],
  ['Hanumant Gore', 'mr', ['helper', 'painter']],
  ['Shabana Begum', 'hi', ['domestic']],
  ['Vinod Yadav', 'hi', ['electrician']],
  ['Ankush Mhaske', 'mr', ['welder']],
  ['Maria Fernandes', 'en', ['domestic', 'cook']],
  ['Rajesh Kurhade', 'mr', ['mason']],
  ['Govind Rao', 'en', ['security_guard', 'driver']],
  ['Sagar Wagh', 'mr', ['painter']],
  ['Laxman Bhise', 'mr', ['plumber']],
];

const WAGE_BAND: Record<Skill, [number, number]> = {
  plumber: [700, 1100],
  electrician: [750, 1300],
  mason: [700, 1100],
  painter: [650, 1000],
  carpenter: [750, 1200],
  tile_fitter: [800, 1300],
  welder: [800, 1300],
  ac_technician: [900, 1500],
  driver: [700, 1100],
  delivery: [500, 800],
  cook: [600, 1000],
  domestic: [500, 700],
  helper: [500, 700],
  security_guard: [550, 800],
};

const INTROS: Record<Language, (n: string, s: string, l: string, w: number, y: number) => string> = {
  hi: (n, s, l, w, y) => `मेरा नाम ${n} है। मैं ${s} का काम करता हूँ, ${y} साल का अनुभव है। ${l} में रहता हूँ। ${w} रुपये रोज़ चाहिए।`,
  mr: (n, s, l, w, y) => `माझं नाव ${n} आहे. मी ${s} आहे, ${y} वर्षांचा अनुभव आहे. ${l} मध्ये राहतो. रोज ${w} रुपये हवेत.`,
  en: (n, s, l, w, y) => `I'm ${n}, a ${s.toLowerCase()} with ${y} years of experience, based in ${l}. I charge ₹${w} a day.`,
  kn: (n, s, l, w, y) => `ನನ್ನ ಹೆಸರು ${n}. ನಾನು ${s}, ${y} ವರ್ಷದ ಅನುಭವ. ${l} ನಲ್ಲಿ ಇದ್ದೇನೆ. ದಿನಕ್ಕೆ ${w} ರೂಪಾಯಿ ಬೇಕು.`,
};

const REVIEWS = [
  'Came on time, neat work.',
  'Very honest, finished a day early.',
  'Good work, will call again.',
  'Cleaned up after the job. Recommended.',
  'Polite and skilled.',
  'काम बढ़िया किया, समय पर आए।',
  'खूप छान काम केलं.',
  'Fixed it in one visit.',
];

const EMPLOYERS = [
  { name: 'Mrs. Kulkarni', business: null, phone: '+91 98220 11223' },
  { name: 'Shree Ganesh Hardware', business: 'Hardware shop', phone: '+91 98500 44556' },
  { name: 'Hotel Sai Palace', business: 'Restaurant', phone: '+91 97300 77889' },
  { name: 'Mr. Deshpande', business: null, phone: '+91 99220 33445' },
  { name: 'Green Acres Society', business: 'Housing society', phone: '+91 98810 22110' },
  { name: 'Patil Constructions', business: 'Contractor', phone: '+91 98230 99887' },
  { name: 'Mehta Interiors', business: 'Interior studio', phone: '+91 90110 55667' },
  { name: 'Blue Tokai Café', business: 'Café', phone: '+91 97660 12121' },
];

const JOB_SPECS: { skill: Skill; loc: (typeof SEED_LOCALITIES)[number]; n: number; days: number; wage: number; ago: number; desc: string }[] = [
  { skill: 'painter', loc: 'Baner', n: 2, days: 3, wage: 900, ago: 6, desc: 'Repaint 2BHK interior walls, putty touch-up.' },
  { skill: 'plumber', loc: 'Kothrud', n: 1, days: 1, wage: 850, ago: 30, desc: 'Leaking kitchen sink and bathroom tap.' },
  { skill: 'electrician', loc: 'Viman Nagar', n: 1, days: 2, wage: 1100, ago: 55, desc: 'Rewire shop lighting, install 6 fans.' },
  { skill: 'mason', loc: 'Hadapsar', n: 3, days: 7, wage: 950, ago: 90, desc: 'Compound wall construction.' },
  { skill: 'cook', loc: 'Shivajinagar', n: 1, days: 5, wage: 800, ago: 140, desc: 'Wedding catering helper cook.' },
  { skill: 'helper', loc: 'Pimpri', n: 4, days: 2, wage: 600, ago: 200, desc: 'Godown loading and unloading.' },
  { skill: 'domestic', loc: 'Aundh', n: 1, days: 30, wage: 600, ago: 260, desc: 'Daily house cleaning, mornings.' },
  { skill: 'driver', loc: 'Hinjewadi', n: 1, days: 10, wage: 1000, ago: 320, desc: 'Tempo driver for office shifting.' },
  { skill: 'tile_fitter', loc: 'Wakad', n: 2, days: 4, wage: 1100, ago: 400, desc: 'Bathroom re-tiling, 2 bathrooms.' },
  { skill: 'carpenter', loc: 'Kothrud', n: 1, days: 3, wage: 1000, ago: 480, desc: 'Wardrobe repair and new shelves.' },
  { skill: 'ac_technician', loc: 'Kharadi', n: 1, days: 1, wage: 1200, ago: 600, desc: 'Service 4 split ACs in office.' },
  { skill: 'security_guard', loc: 'Baner', n: 2, days: 30, wage: 700, ago: 720, desc: 'Night guard for housing society.' },
  { skill: 'welder', loc: 'Pimpri', n: 1, days: 2, wage: 1000, ago: 900, desc: 'Window grill fabrication.' },
  { skill: 'painter', loc: 'Kharadi', n: 1, days: 2, wage: 850, ago: 1100, desc: 'Café exterior wall mural base coat.' },
  { skill: 'delivery', loc: 'Viman Nagar', n: 2, days: 7, wage: 650, ago: 1300, desc: 'Grocery deliveries, evening shift.' },
  { skill: 'plumber', loc: 'Wakad', n: 1, days: 1, wage: 800, ago: 1500, desc: 'New water purifier connection.' },
  { skill: 'mason', loc: 'Aundh', n: 1, days: 2, wage: 450, ago: 1700, desc: 'Small plaster repair.' },
  { skill: 'electrician', loc: 'Hadapsar', n: 1, days: 1, wage: 900, ago: 2000, desc: 'Inverter installation.' },
  { skill: 'cook', loc: 'Hinjewadi', n: 1, days: 30, wage: 900, ago: 2400, desc: 'Tiffin service cook.' },
  { skill: 'helper', loc: 'Shivajinagar', n: 2, days: 1, wage: 650, ago: 2800, desc: 'Event setup helpers.' },
];

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

function buildWorkers(): Worker[] {
  return WORKERS.map(([name, language, skills], i) => {
    const locName = i === 0 ? 'Kothrud' : SEED_LOCALITIES[i % SEED_LOCALITIES.length]!;
    const loc = getLocality(locName)!;
    const location = jitter({ lat: loc.lat, lng: loc.lng }, i + 1, 1400);
    const [lo, hi] = WAGE_BAND[skills[0]!];
    const expectedWage = i === 0 ? 800 : Math.round(int(lo, hi) / 50) * 50;
    const jobsCompleted = i === 0 ? 12 : rnd() < 0.15 ? 0 : int(1, 45);
    const ratingCount = Math.min(jobsCompleted, Math.max(0, jobsCompleted - int(0, 3)));
    const ratingAvg = ratingCount ? Math.round((3.7 + rnd() * 1.3) * 10) / 10 : 0;
    const years = i === 0 ? 9 : int(1, 18);
    const createdMinsAgo = int(3 * 1440, 120 * 1440);
    const w: Worker = {
      id: i === 0 ? 'w_ramesh' : `w_seed${String(i).padStart(3, '0')}`,
      name,
      phone: `+91 9${String(int(100000000, 999999999))}`,
      channel: 'seed',
      chatId: null,
      language,
      skills,
      experienceYears: years,
      locality: loc.name,
      location,
      geohash: geohashEncode(location.lat, location.lng, 6),
      expectedWage,
      availability: rnd() < 0.12 ? 'busy' : 'available',
      availableFrom: null,
      stats: {
        jobsCompleted,
        ratingAvg: i === 0 ? 4.8 : Math.min(5, ratingAvg),
        ratingCount: i === 0 ? 11 : ratingCount,
        completionRate: jobsCompleted ? Math.round((0.82 + rnd() * 0.18) * 100) / 100 : 0,
      },
      verified: jobsCompleted >= 3,
      status: 'active',
      introTranscript: INTROS[language](name.split(' ')[0]!, skillLabel(skills[0]!, language), localityLabel(loc.name, language), expectedWage, years),
      introAudioUrl: null,
      consentAt: iso(createdMinsAgo),
      createdAt: iso(createdMinsAgo),
      updatedAt: iso(createdMinsAgo),
    };
    if (w.availability === 'busy') w.availableFrom = addDays(todayIST(), int(1, 6));
    return w;
  });
}

function main() {
  const ctx = getCtx();
  const workers = buildWorkers();
  const db: DbShape = emptyDb();
  for (const w of workers) db.workers[w.id] = w;

  const events: FeedEvent[] = [];
  let ev = 0;
  const event = (e: Omit<FeedEvent, 'id'>) => events.push({ id: `ev_seed${String(ev++).padStart(4, '0')}`, ...e });

  // Recent registrations into the feed
  for (const w of [...workers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12)) {
    event({
      type: 'worker_registered',
      at: w.createdAt,
      title: `${w.name.split(' ')[0]} joined as ${skillLabel(w.skills[0]!)}`,
      subtitle: `${w.locality} · ₹${w.expectedWage}/day · via ${pick(['telegram', 'phone agent', 'telegram'])}`,
      location: w.location,
      refId: w.id,
      jobId: null,
    });
  }

  JOB_SPECS.forEach((s, i) => {
    const loc = getLocality(s.loc)!;
    const location = jitter({ lat: loc.lat, lng: loc.lng }, 500 + i, 700);
    const createdAt = iso(s.ago);
    const emp = EMPLOYERS[i % EMPLOYERS.length]!;
    const job: Job = {
      id: `j_seed${String(i).padStart(3, '0')}`,
      code: String(400 + i * 7).padStart(4, '0'),
      skill: s.skill,
      workersNeeded: s.n,
      durationDays: s.days,
      wagePerDay: s.wage,
      startDate: addDays(todayIST(), s.ago > 1440 ? -1 : 1),
      locality: loc.name,
      location,
      geohash: geohashEncode(location.lat, location.lng, 6),
      radiusKm: 8,
      description: s.desc,
      employer: emp,
      language: 'en',
      source: i % 3 === 0 ? 'voice' : 'form',
      transcript: null,
      status: 'open',
      flags: s.wage < 500 ? ['below_min_wage'] : [],
      createdAt,
    };
    const ranked = rankWorkers(workers, job, { limit: 10 });
    let accepted = 0;
    const matches: Match[] = ranked.map((r, k) => {
      const alerted = k < Math.max(5, s.n * 3);
      // older jobs: resolved
      const resolve = s.ago > 300 && alerted; // jobs from the last ~5h stay open (bot + agent have work to offer)
      let status: Match['status'] = alerted ? 'alerted' : 'suggested';
      if (resolve) {
        const accepts = accepted < s.n && (k === 0 || rnd() < 0.55);
        status = accepts ? 'accepted' : rnd() < 0.5 ? 'declined' : 'viewed';
        if (accepts) accepted++;
      }
      const t0 = Date.parse(createdAt);
      return {
        id: matchId(job.id, r.worker.id),
        jobId: job.id,
        workerId: r.worker.id,
        rank: k + 1,
        score: r.score,
        breakdown: r.breakdown,
        distanceKm: r.distanceKm,
        why: r.why,
        status,
        alertedAt: alerted ? createdAt : null,
        viewedAt: status !== 'alerted' && status !== 'suggested' ? new Date(t0 + int(1, 6) * 60_000).toISOString() : null,
        respondedAt: status === 'accepted' || status === 'declined' ? new Date(t0 + int(6, 15) * 60_000).toISOString() : null,
        sim: null,
        createdAt,
      };
    });
    if (accepted >= s.n) job.status = 'filled';
    db.jobs[job.id] = job;
    for (const m of matches) db.matches[m.id] = m;

    event({
      type: 'job_posted',
      at: createdAt,
      title: `${s.n} × ${skillLabel(s.skill)} needed in ${loc.name}`,
      subtitle: `JOB #${job.code} · ₹${s.wage}/day · ${s.days} day${s.days > 1 ? 's' : ''}`,
      location,
      refId: job.id,
      jobId: job.id,
    });
    event({
      type: 'match_alerted',
      at: new Date(Date.parse(createdAt) + 20_000).toISOString(),
      title: `Voice alerts sent to ${matches.filter((m) => m.alertedAt).length} workers`,
      subtitle: `JOB #${job.code} · best match ${ranked[0]?.worker.name ?? '—'}`,
      location,
      refId: job.id,
      jobId: job.id,
    });
    for (const m of matches.filter((x) => x.status === 'accepted')) {
      const w = db.workers[m.workerId]!;
      event({
        type: 'match_accepted',
        at: m.respondedAt!,
        title: `${w.name.split(' ')[0]} accepted JOB #${job.code}`,
        subtitle: `${skillLabel(s.skill)} · ${loc.name} · ${m.distanceKm.toFixed(1)} km`,
        location: w.location,
        refId: m.id,
        jobId: job.id,
      });
    }
  });

  // ── Scheme Finder demo: Ramesh's completed construction work (88 days in the last 12 months) ──
  // Ten past jobs he did through KaamSetu, marked done by the employer. One more 3-day job (JOB #0410,
  // accepted, not yet marked done) takes him past the 90-day BOCW requirement during the demo.
  const ramesh = db.workers['w_ramesh']!;
  const HISTORY: { days: number; ago: number; loc: string; emp: number; skill: Skill; confirmed: boolean }[] = [
    { days: 10, ago: 330, loc: 'Kothrud', emp: 5, skill: 'plumber', confirmed: true },
    { days: 8, ago: 300, loc: 'Warje', emp: 3, skill: 'plumber', confirmed: true },
    { days: 12, ago: 265, loc: 'Kothrud', emp: 5, skill: 'plumber', confirmed: true },
    { days: 6, ago: 230, loc: 'Bavdhan', emp: 1, skill: 'plumber', confirmed: false },
    { days: 9, ago: 195, loc: 'Deccan', emp: 3, skill: 'plumber', confirmed: true },
    { days: 7, ago: 160, loc: 'Kothrud', emp: 6, skill: 'helper', confirmed: true },
    { days: 11, ago: 120, loc: 'Sinhagad Road', emp: 5, skill: 'plumber', confirmed: true },
    { days: 8, ago: 85, loc: 'Kothrud', emp: 3, skill: 'plumber', confirmed: false },
    { days: 10, ago: 50, loc: 'Warje', emp: 5, skill: 'plumber', confirmed: true },
    { days: 7, ago: 20, loc: 'Kothrud', emp: 6, skill: 'plumber', confirmed: true },
  ];
  HISTORY.forEach((h, k) => {
    const loc = getLocality(h.loc)!;
    const createdAt = iso((h.ago + h.days + 2) * 1440);
    const job: Job = {
      id: `j_hist${String(k).padStart(3, '0')}`,
      code: String(200 + k * 3).padStart(4, '0'),
      skill: h.skill,
      workersNeeded: 1,
      durationDays: h.days,
      wagePerDay: 750 + (k % 3) * 50,
      startDate: new Date(Date.now() - (h.ago + h.days) * 86_400_000).toISOString().slice(0, 10),
      locality: loc.name,
      location: { lat: loc.lat, lng: loc.lng },
      geohash: geohashEncode(loc.lat, loc.lng, 6),
      radiusKm: 8,
      description: 'Plumbing and fitting work on a building site.',
      employer: EMPLOYERS[h.emp]!,
      language: 'en',
      source: 'form',
      transcript: null,
      status: 'closed',
      flags: [],
      createdAt,
    };
    db.jobs[job.id] = job;
    const m: Match = {
      id: matchId(job.id, ramesh.id),
      jobId: job.id,
      workerId: ramesh.id,
      rank: 1,
      score: 90,
      breakdown: { skill: 1, proximity: 0.9, wage: 1, trust: 0.85, availability: 1 },
      distanceKm: 1.2,
      why: 'Plumber · nearby · past KaamSetu job',
      status: 'accepted',
      alertedAt: createdAt,
      viewedAt: createdAt,
      respondedAt: createdAt,
      completedAt: iso(h.ago * 1440),
      employerConfirmed: h.confirmed,
      sim: null,
      createdAt,
    };
    db.matches[m.id] = m;
  });

  // The demo job: accepted by Ramesh, waiting for the employer to tap "Mark job done" on /hire
  {
    const loc = getLocality('Kothrud')!;
    const createdAt = iso(26 * 60);
    const job: Job = {
      id: 'j_demo_bocw',
      code: '0410',
      skill: 'plumber',
      workersNeeded: 1,
      durationDays: 3,
      wagePerDay: 850,
      startDate: addDays(todayIST(), -3),
      locality: loc.name,
      location: jitter({ lat: loc.lat, lng: loc.lng }, 777, 400),
      geohash: geohashEncode(loc.lat, loc.lng, 6),
      radiusKm: 8,
      description: 'Bathroom pipeline replacement in a new building (3 days).',
      employer: EMPLOYERS[5]!,
      language: 'en',
      source: 'form',
      transcript: null,
      status: 'filled',
      flags: [],
      createdAt,
    };
    db.jobs[job.id] = job;
    const m: Match = {
      id: matchId(job.id, ramesh.id),
      jobId: job.id,
      workerId: ramesh.id,
      rank: 1,
      score: 93,
      breakdown: { skill: 1, proximity: 0.95, wage: 1, trust: 0.83, availability: 1 },
      distanceKm: 0.8,
      why: 'Plumber · 800 m away · asks ₹800 (you offer ₹850) · 4.8★ from 12 jobs',
      status: 'accepted',
      alertedAt: createdAt,
      viewedAt: createdAt,
      respondedAt: createdAt,
      completedAt: null,
      employerConfirmed: false,
      sim: null,
      createdAt,
    };
    db.matches[m.id] = m;
  }

  // Ratings history (matches worker stats roughly)
  const ratings: Rating[] = [];
  for (const w of workers) {
    const n = Math.min(w.stats.ratingCount, 6);
    for (let k = 0; k < n; k++) {
      const stars = Math.max(3, Math.min(5, Math.round(w.stats.ratingAvg + (rnd() - 0.5))));
      ratings.push({
        id: `r_${w.id}_${k}`,
        jobId: `j_hist_${k}`,
        workerId: w.id,
        stars,
        comment: rnd() < 0.7 ? pick(REVIEWS) : null,
        audioUrl: null,
        createdAt: iso(int(2 * 1440, 90 * 1440)),
      });
    }
  }
  db.ratings = ratings;
  db.events = events.sort((a, b) => a.at.localeCompare(b.at));

  return { ctx, db };
}

async function run() {
  const { ctx, db } = main();
  if (ctx.repo instanceof FileRepo) {
    await ctx.repo.replaceAll(db);
  } else {
    // Reset: delete every item so test leftovers don't survive a re-seed
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: ctx.env.AWS_REGION }));
    let start: Record<string, unknown> | undefined;
    let removed = 0;
    do {
      const page = await doc.send(new ScanCommand({ TableName: ctx.env.DYNAMO_TABLE, ProjectionExpression: 'PK, SK', ExclusiveStartKey: start }));
      const keys = (page.Items ?? []) as { PK: string; SK: string }[];
      for (let i = 0; i < keys.length; i += 25) {
        await doc.send(
          new BatchWriteCommand({
            RequestItems: { [ctx.env.DYNAMO_TABLE]: keys.slice(i, i + 25).map((k) => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } })) },
          }),
        );
      }
      removed += keys.length;
      start = page.LastEvaluatedKey;
    } while (start);
    console.log(`Cleared ${removed} items from ${ctx.env.DYNAMO_TABLE}`);
    for (const w of Object.values(db.workers)) await ctx.repo.putWorker(w);
    for (const j of Object.values(db.jobs)) await ctx.repo.putJob(j);
    await ctx.repo.putMatches(Object.values(db.matches));
    for (const r of db.ratings) await ctx.repo.addRating(r);
    for (const e of db.events) await ctx.repo.addEvent(e);
  }
  console.log(
    `Seeded ${Object.keys(db.workers).length} workers, ${Object.keys(db.jobs).length} jobs, ${Object.keys(db.matches).length} matches, ${db.ratings.length} ratings, ${db.events.length} events → ${ctx.repo.name}`,
  );
}

run().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
