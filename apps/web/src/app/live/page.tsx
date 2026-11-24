import type { Metadata } from 'next';
import { LiveApp } from '@/components/live/live-app';

export const metadata: Metadata = {
  title: 'Live',
  description: 'KaamSetu network ops: workers, jobs and voice-alert replies across Pune, in real time.',
};

export default function LivePage() {
  return <LiveApp />;
}
