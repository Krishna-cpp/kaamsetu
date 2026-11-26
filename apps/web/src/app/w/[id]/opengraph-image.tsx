import { getCtx, skillLabel, toPublicWorker, type PublicWorker } from '@kaamsetu/core/server';
import { ImageResponse } from 'next/og';
import { C, Glyph, Hazard, loadOgFonts, OG_SIZE, StarIcon } from '@/components/ui/og';
import { tradeColor } from '@/components/ui/trade';
import { initials } from '@/lib/format';

export const runtime = 'nodejs';
export const alt = 'KaamSetu worker ID card';
export const size = OG_SIZE;
export const contentType = 'image/png';

async function getWorker(id: string): Promise<PublicWorker | null> {
  try {
    const w = await getCtx().repo.getWorker(id);
    return w && w.status !== 'deleted' ? toPublicWorker(w) : null;
  } catch {
    return null;
  }
}

const MONO = 'KAAMSETU · WORKER ID · KAAMSCORE RATING JOBS DONE LOCALITY VERIFIED SCAN KS-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/·';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorker(id);

  if (!w) {
    const { fonts } = await loadOgFonts({ display: 'KaamSetuVerified workers', serif: 'found by voice.', mono: MONO });
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: C.paper,
          color: C.ink,
          fontFamily: 'Bricolage',
        }}
      >
        <Hazard height={56} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '60px 80px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 22, letterSpacing: 3, color: C.concrete }}>
            KAAMSETU · WORKER ID
          </div>
          <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, letterSpacing: -5, marginTop: 18, lineHeight: 0.95 }}>
            Verified workers,
          </div>
          <div style={{ display: 'flex', fontFamily: 'Instrument', fontStyle: 'italic', fontSize: 112, color: C.hivisText, lineHeight: 1 }}>
            found by voice.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
            <Glyph size={48} />
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.5 }}>KaamSetu</div>
          </div>
        </div>
      </div>,
      { ...size, fonts },
    );
  }

  const skill = w.skills[0] ?? 'helper';
  const trade = w.skills
    .slice(0, 2)
    .map((s) => skillLabel(s))
    .join(' · ');
  const tc = tradeColor(skill);
  const idNo = 'KS-' + w.id.replace(/^w_/, '').toUpperCase();
  const rating = w.stats.ratingCount ? w.stats.ratingAvg.toFixed(1) : '—';
  const nameSize = w.name.length > 18 ? 70 : 88;
  const { fonts } = await loadOgFonts({
    display:
      w.name +
      initials(w.name) +
      trade +
      w.locality +
      rating +
      String(w.kaamScore) +
      String(w.stats.jobsCompleted) +
      'KaamSetu0123456789—.',
    mono: MONO + idNo,
  });

  return new ImageResponse(
    <div
      style={{ width: '100%', height: '100%', display: 'flex', background: C.paper2, padding: 34, fontFamily: 'Bricolage', color: C.ink }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: '#FBF8F1',
          border: `5px solid ${C.ink}`,
          boxShadow: `14px 14px 0 0 ${C.ink}`,
          marginRight: 14,
          marginBottom: 14,
        }}
      >
        {/* strap */}
        <div style={{ display: 'flex', position: 'relative', height: 58, borderBottom: `5px solid ${C.ink}` }}>
          <Hazard width={1122} height={53} />
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 11,
              display: 'flex',
              background: C.ink,
              color: C.paper,
              fontFamily: 'GeistMono',
              fontSize: 20,
              letterSpacing: 2.5,
              padding: '5px 12px',
            }}
          >
            KAAMSETU
          </div>
          <div
            style={{
              position: 'absolute',
              left: 521,
              top: 18,
              width: 80,
              height: 18,
              borderRadius: 999,
              border: `4px solid ${C.ink}`,
              background: C.paper,
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 20,
              top: 11,
              display: 'flex',
              background: C.ink,
              color: C.signal,
              fontFamily: 'GeistMono',
              fontSize: 20,
              letterSpacing: 2.5,
              padding: '5px 12px',
            }}
          >
            WORKER ID
          </div>
        </div>

        {/* body */}
        <div style={{ display: 'flex', flex: 1, padding: '34px 44px 0', position: 'relative' }}>
          <div
            style={{
              width: 176,
              height: 176,
              background: tc.bg,
              color: tc.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: -3,
            }}
          >
            {initials(w.name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 36, flex: 1 }}>
            <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 20, letterSpacing: 2.5, color: C.concrete }}>ID · {idNo}</div>
            <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, letterSpacing: -4, lineHeight: 0.95, marginTop: 10 }}>
              {w.name}
            </div>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -1.2, marginTop: 12 }}>
              {trade}
              <span style={{ color: C.concrete, marginLeft: 16 }}>· {w.locality}</span>
            </div>
          </div>
          {w.verified && (
            <div style={{ position: 'absolute', right: 40, top: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="108" height="108" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke={C.hivis} strokeWidth="3" strokeDasharray="6 4" />
                <circle cx="50" cy="50" r="34" fill={C.hivis} />
                <path d="M35 51l10 10 21-22" fill="none" stroke={C.ink} strokeWidth="6" strokeLinecap="square" />
              </svg>
              <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 16, letterSpacing: 2.5, color: C.hivisText, marginTop: 6 }}>
                VERIFIED
              </div>
            </div>
          )}
        </div>

        {/* stats */}
        <div style={{ display: 'flex', margin: '0 44px 36px', border: `4px solid ${C.ink}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', background: C.hivis, padding: '14px 26px', width: 300 }}>
            <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 18, letterSpacing: 2.5 }}>KAAMSCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 84, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
              {String(w.kaamScore)}
              <span style={{ fontFamily: 'GeistMono', fontSize: 22, letterSpacing: 1, marginLeft: 8 }}>/100</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 26px', borderLeft: `4px solid ${C.ink}`, flex: 1 }}>
            <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 18, letterSpacing: 2.5, color: C.concrete }}>RATING</div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 84, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}
            >
              {rating}
              <StarIcon size={52} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 26px', borderLeft: `4px solid ${C.ink}`, flex: 1 }}>
            <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 18, letterSpacing: 2.5, color: C.concrete }}>JOBS DONE</div>
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
              {String(w.stats.jobsCompleted)}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '0 26px',
              borderLeft: `4px solid ${C.ink}`,
            }}
          >
            <Glyph size={46} />
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, letterSpacing: -1.2 }}>KaamSetu</div>
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
