/** KaamScore dial: a 270° gauge with tick marks. Server-safe (pure SVG). */
export function KaamDial({ value, size = 132 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const ticks = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" role="img" aria-label={`KaamScore ${v} out of 100`}>
      <g transform="rotate(135 66 66)">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#D9D3C7" strokeWidth="10" strokeDasharray={`${arc} ${c}`} />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#FF5B14" strokeWidth="10" strokeDasharray={`${(arc * v) / 100} ${c}`} />
        {ticks.map((i) => {
          const a = ((i / 10) * 270 * Math.PI) / 180;
          const x1 = 66 + Math.cos(a) * 40;
          const y1 = 66 + Math.sin(a) * 40;
          const x2 = 66 + Math.cos(a) * (i % 5 === 0 ? 34 : 37);
          const y2 = 66 + Math.sin(a) * (i % 5 === 0 ? 34 : 37);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#121210" strokeWidth={i % 5 === 0 ? 1.5 : 1} />;
        })}
      </g>
      <text x="66" y="72" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="34" letterSpacing="-1.5" fill="#121210">
        {v}
      </text>
      <text x="66" y="92" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="1" fill="#5F5D58">
        /100
      </text>
    </svg>
  );
}

/** Circular "VERIFIED" stamp with text on a path. */
export function VerifiedSeal({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Verified by KaamSetu" className="-rotate-12">
      <defs>
        <path id="seal-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#FF5B14" strokeWidth="2" />
      <circle cx="50" cy="50" r="27" fill="#FF5B14" />
      <text fontFamily="var(--font-mono)" fontSize="9.2" letterSpacing="2.4" fill="#D94400" fontWeight="600">
        <textPath href="#seal-path">VERIFIED · KAAMSETU · VERIFIED · KAAMSETU ·</textPath>
      </text>
      <path d="M39 50.5l7.5 7.5L62 42.5" fill="none" stroke="#121210" strokeWidth="4" strokeLinecap="square" />
    </svg>
  );
}
