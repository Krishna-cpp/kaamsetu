import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif, Mukta } from 'next/font/google';
import { SiteChrome } from '@/components/site-chrome';
import './globals.css';

// Perf: only the faces visible in the first viewport are preloaded (LCP headline + body).
// Bricolage is variable: one file covers every weight.
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });
const instrument = Instrument_Serif({ subsets: ['latin'], variable: '--font-instrument', display: 'swap', weight: '400', style: ['italic', 'normal'] });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false });
const mukta = Mukta({ subsets: ['devanagari', 'latin'], variable: '--font-mukta', display: 'swap', weight: ['400', '600', '700'], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: { default: 'KaamSetu · काम सेतु: work, found by voice', template: '%s · KaamSetu' },
  description:
    'Voice-first, multilingual, hyper-local job matching for India’s informal workers. Speak in Hindi, Marathi or English; get matched to work within walking distance.',
  openGraph: {
    title: 'KaamSetu: Kaam milega. Paas mein.',
    description: 'Work, found by voice, within walking distance.',
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#121210', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${geist.variable} ${geistMono.variable} ${mukta.variable}`}>
      <body>
        <SiteChrome>{children}</SiteChrome>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
