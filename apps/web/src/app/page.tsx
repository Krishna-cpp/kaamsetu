import dynamic from 'next/dynamic';
import { TechTrust } from '@/components/landing/bento';
import { FooterCta } from '@/components/landing/footer-cta';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { TradeMarquee } from '@/components/landing/marquee';
import { Welfare } from '@/components/landing/welfare';
import { Problem } from '@/components/landing/problem';
import { SmoothScroll } from '@/components/landing/smooth-scroll';

// Interactive, audio-driven sections: split into their own chunks.
const VoiceDemo = dynamic(() => import('@/components/landing/voice-demo').then((m) => m.VoiceDemo), {
  loading: () => <div className="skeleton h-[900px] bg-ink" aria-hidden />,
});
const LanguageShowcase = dynamic(() => import('@/components/landing/languages').then((m) => m.LanguageShowcase), {
  loading: () => <div className="skeleton h-[720px]" aria-hidden />,
});

export default function Home() {
  return (
    <div className="ks-landing">
      <SmoothScroll />
      <Hero />
      <TradeMarquee />
      <Problem />
      <HowItWorks />
      <VoiceDemo />
      <LanguageShowcase />
      <Welfare />
      <TechTrust />
      <FooterCta />
    </div>
  );
}
