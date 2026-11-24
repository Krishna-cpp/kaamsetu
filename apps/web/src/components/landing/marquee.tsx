const TRADES: { text: string; lang: 'en' | 'hi' | 'mr' }[] = [
  { text: 'Plumber', lang: 'en' },
  { text: 'प्लंबर', lang: 'hi' },
  { text: 'Electrician', lang: 'en' },
  { text: 'इलेक्ट्रीशियन', lang: 'hi' },
  { text: 'Mason', lang: 'en' },
  { text: 'गवंडी', lang: 'mr' },
  { text: 'Painter', lang: 'en' },
  { text: 'पेंटर', lang: 'hi' },
  { text: 'Carpenter', lang: 'en' },
  { text: 'सुतार', lang: 'mr' },
  { text: 'Cook', lang: 'en' },
  { text: 'रसोइया', lang: 'hi' },
  { text: 'Driver', lang: 'en' },
  { text: 'ड्रायव्हर', lang: 'mr' },
  { text: 'Helper', lang: 'en' },
  { text: 'हमाल', lang: 'mr' },
  { text: 'Welder', lang: 'en' },
  { text: 'वेल्डर', lang: 'hi' },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {TRADES.map((t, i) => (
        <li key={i} className="flex items-center">
          <span
            lang={t.lang}
            className={
              t.lang === 'en'
                ? 'display px-[0.35em] text-[clamp(44px,7.2vw,112px)] leading-[1.05] text-paper'
                : 'px-[0.35em] text-[clamp(40px,6.4vw,100px)] leading-[1.25] font-bold text-signal'
            }
          >
            {t.text}
          </span>
          <span className="inline-block size-[clamp(8px,0.9vw,14px)] shrink-0 bg-hivis" aria-hidden />
        </li>
      ))}
    </ul>
  );
}

/** Ink band of trades in three scripts, edged with the hazard stripe. */
export function TradeMarquee() {
  return (
    <section aria-label="Trades on KaamSetu" className="relative bg-ink">
      <div className="hazard hazard-anim h-3" aria-hidden />
      <div className="label flex justify-between border-b border-line-dark px-[var(--gutter)] py-2 text-concrete">
        <span>14 trades · 3 languages · 1 voice note</span>
        <span className="hidden sm:inline">Hindi · मराठी · English</span>
      </div>
      <div className="ks-marquee flex overflow-hidden py-5 md:py-8">
        <div className="ks-marquee-track flex">
          <Row />
          <Row hidden />
        </div>
      </div>
      <div className="h-px bg-line-dark" aria-hidden />
    </section>
  );
}
