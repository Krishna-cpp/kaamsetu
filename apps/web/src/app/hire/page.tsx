import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HireApp } from '@/components/hire/hire-app';

export const metadata: Metadata = {
  title: 'Hire nearby workers',
  description: 'Say what you need. KaamSetu ranks verified workers nearby and sends them a voice alert in their language.',
};

export default function HirePage() {
  return (
    <Suspense fallback={<div className="pt-14" />}>
      <HireApp />
    </Suspense>
  );
}
