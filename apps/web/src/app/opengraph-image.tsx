import { ImageResponse } from 'next/og';
import { C, Glyph, Hazard, loadOgFonts, OG_SIZE } from '@/components/ui/og';

export const alt = 'KaamSetu: Kaam milega. Paas mein. Work, found by voice, within walking distance.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const HEAD_1 = 'Kaam milega.';
const HEAD_2 = 'Paas mein.';
const SUB = 'Work, found by voice, within walking distance.';
const CHANNELS = ['Telegram', 'Voice agent', 'Hindi', 'मराठी', 'English'];

export default async function Image() {
  const { fonts, has } = await loadOgFonts({
    display: HEAD_1 + 'KaamSetu' + '0123456789',
    displayRegular: SUB,
    serif: HEAD_2,
    mono: CHANNELS.join(' · ').toUpperCase() + 'PUNE · VOICE-FIRST JOB MATCHING MARATHI 1234',
    deva: 'मराठी काम सेतु',
  });
  const deva = has('Mukta');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.paper, color: C.ink, fontFamily: 'Bricolage' }}>
        <Hazard height={30} />
        <div style={{ display: 'flex', flex: 1, position: 'relative', padding: '44px 72px 40px' }}>
          {/* left: copy */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Glyph size={52} />
              <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.6 }}>KaamSetu</div>
              {deva && <div style={{ fontFamily: 'Mukta', fontSize: 26, fontWeight: 600, color: C.concrete, marginTop: 6 }}>काम सेतु</div>}
            </div>
            <div style={{ display: 'flex', fontFamily: 'GeistMono', fontSize: 17, letterSpacing: 2.5, color: C.concrete, marginTop: 34 }}>
              PUNE · VOICE-FIRST JOB MATCHING
            </div>
            <div style={{ display: 'flex', fontSize: 118, fontWeight: 700, letterSpacing: -5.5, lineHeight: 0.92, marginTop: 14 }}>{HEAD_1}</div>
            <div style={{ display: 'flex', fontFamily: 'Instrument', fontStyle: 'italic', fontSize: 140, color: C.hivisText, letterSpacing: -3, lineHeight: 0.95 }}>
              {HEAD_2}
            </div>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 400, color: '#3A3935', marginTop: 18 }}>{SUB}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto', gap: 14, fontFamily: 'GeistMono', fontSize: 20, letterSpacing: 2 }}>
              {CHANNELS.map((c, i) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {i > 0 && <div style={{ width: 7, height: 7, background: C.hivis }} />}
                  <div style={c === 'मराठी' && deva ? { fontFamily: 'Mukta', fontSize: 24, letterSpacing: 0 } : {}}>
                    {c === 'मराठी' && !deva ? 'MARATHI' : c === 'मराठी' ? c : c.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right: radius ring with ranked pins */}
          <div style={{ position: 'absolute', right: 40, top: 86, width: 330, height: 330, transform: 'scale(0.9)', display: 'flex' }}>
            <svg width="330" height="330" viewBox="0 0 330 330" style={{ position: 'absolute', left: 0, top: 0 }}>
              <circle cx="165" cy="165" r="150" fill="rgba(255,91,20,0.07)" stroke={C.hivis} strokeWidth="2.5" strokeDasharray="10 7" />
              <circle cx="165" cy="165" r="80" fill="none" stroke={C.line} strokeWidth="1.5" />
              <path d="M0 165H330M165 0V330" stroke={C.line} strokeWidth="1" />
            </svg>
            <div style={{ position: 'absolute', left: 143, top: 143, width: 44, height: 44, background: C.ink, border: `3px solid ${C.paper}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, background: C.hivis }} />
            </div>
            {[
              { n: 1, x: 222, y: 96, bg: C.hivis, fg: C.ink, s: 50 },
              { n: 2, x: 82, y: 210, bg: C.signal, fg: C.ink, s: 42 },
              { n: 3, x: 236, y: 232, bg: '#8C8A84', fg: C.paper, s: 40 },
              { n: 4, x: 70, y: 70, bg: C.paper, fg: C.concrete, s: 34 },
            ].map((p) => (
              <div
                key={p.n}
                style={{
                  position: 'absolute',
                  left: p.x - p.s / 2,
                  top: p.y - p.s / 2,
                  width: p.s,
                  height: p.s,
                  borderRadius: 999,
                  background: p.bg,
                  color: p.fg,
                  border: `3px solid ${C.ink}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'GeistMono',
                  fontSize: p.s * 0.42,
                }}
              >
                {String(p.n)}
              </div>
            ))}
          </div>
        </div>
        <Hazard height={12} />
      </div>
    ),
    { ...size, fonts },
  );
}
