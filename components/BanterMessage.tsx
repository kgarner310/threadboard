'use client';

import { Player } from '@/lib/types';

interface BanterMessageProps {
  playerName: string;
  playerEmoji: string;
  message: string;
  timestamp: string;
  hasScore?: boolean;
}

export default function BanterMessage({ 
  playerName, 
  playerEmoji, 
  message, 
  timestamp, 
  hasScore 
}: BanterMessageProps) {
  const timeDisplay = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex gap-3 p-3 hover:bg-zinc-800/30 rounded-lg transition-colors">
      <div className="text-2xl flex-shrink-0">{playerEmoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm text-white">{playerName}</span>
          <span className="text-xs text-zinc-500">{timeDisplay}</span>
          {hasScore && (
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              scored
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
