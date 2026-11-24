import type { Metadata } from 'next';
import { WebChat } from '@/components/chat/web-chat';

export const metadata: Metadata = {
  title: 'Chat with the bot',
  description: 'The KaamSetu bot in your browser: join by voice note, hear job alerts, accept work.',
};

export default function ChatPage() {
  return (
    <div className="pt-14">
      <WebChat />
    </div>
  );
}
