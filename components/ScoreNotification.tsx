'use client';

import { useEffect, useState } from 'react';
import { Player, Score } from '@/lib/types';
import { scoreDisplay, scoreEmoji } from '@/lib/board';

interface Notification {
  id: string;
  player: Player;
  score: Score;
  message?: string;
}

interface ScoreNotificationProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export default function ScoreNotification({ notification, onDismiss }: ScoreNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{notification.player.avatarEmoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-white">{notification.player.name}</span>
              <span className="text-sm text-zinc-400">just scored</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black text-white">{scoreDisplay(notification.score)}</span>
              <span className="text-lg">{scoreEmoji(notification.score)}</span>
            </div>
            {notification.message && (
              <p className="text-sm text-zinc-300 mt-2 italic">&ldquo;{notification.message}&rdquo;</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
