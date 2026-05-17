'use client';

import { useMemo, useState, useCallback } from 'react';
import Header from '@/components/Header';
import PlayerSubmissionCard from '@/components/PlayerSubmissionCard';
import ProgressStatus from '@/components/ProgressStatus';
import WaitingOnBanner from '@/components/WaitingOnBanner';
import BoardCard from '@/components/BoardCard';
import ResetButton from '@/components/ResetButton';
import SmsSignupInput from '@/components/SmsSignupInput';
import BanterSection from '@/components/BanterSection';
import ScoreNotification from '@/components/ScoreNotification';
import { useStore } from '@/context/StoreContext';
import { Score } from '@/lib/types';
import { generateBoard, getSubmissionOrder } from '@/lib/board';

export default function TodayPage() {
  const {
    state,
    submitScore,
    getTodaySubmissions,
    getPlayerHistory,
    hydrated,
    banterMessages,
    sendBanter,
    notification,
    clearNotification,
  } = useStore();

  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  const todaySubmissions = getTodaySubmissions();
  const { group } = state;

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const allSubmitted = group.players.every(p =>
    todaySubmissions.some(s => s.playerId === p.id)
  );

  const waitingPlayers = group.players.filter(
    p => !todaySubmissions.some(s => s.playerId === p.id)
  );

  const board = useMemo(() => {
    if (todaySubmissions.length === 0) return null;
    return generateBoard(group, todaySubmissions, today);
  }, [group, todaySubmissions, today]);

  const submissionOrder = useMemo(() => getSubmissionOrder(todaySubmissions), [todaySubmissions]);

  const displayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const handleSubmit = useCallback((playerId: string, score: Score, banter?: string) => {
    submitScore(playerId, score);
    if (banter) sendBanter(playerId, banter, true);
    setActivePlayerId(playerId);
  }, [submitScore, sendBanter]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header showBack backHref="/groups/demo-family" backLabel="The Family" title={displayDate} />

      <ScoreNotification notification={notification} onDismiss={clearNotification} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <ProgressStatus submitted={todaySubmissions.length} total={group.players.length} />
        <SmsSignupInput groupId="demo-family" />

        {!allSubmitted && todaySubmissions.length > 0 && (
          <WaitingOnBanner waitingPlayers={waitingPlayers} />
        )}

        {allSubmitted && board && <BoardCard board={board} group={group} />}

        {/* Player cards */}
        <div className="space-y-3">
          {group.players.map(player => {
            const submission = todaySubmissions.find(s => s.playerId === player.id) ?? null;
            const playerWithStreak = state.group.players.find(p => p.id === player.id) ?? player;
            const history = getPlayerHistory(player.id, 7);
            return (
              <PlayerSubmissionCard
                key={player.id}
                player={playerWithStreak}
                submission={submission}
                onSubmit={(score, banter) => handleSubmit(player.id, score, banter)}
                boardComplete={allSubmitted}
                history={history}
                submissionOrder={submissionOrder.get(player.id)}
              />
            );
          })}
        </div>

        {/* Banter section */}
        <BanterSection
          messages={banterMessages}
          players={group.players}
          onSendMessage={sendBanter}
          currentPlayerId={activePlayerId ?? group.players[0]?.id}
        />

        <div className="text-center pt-4 pb-8">
          <ResetButton />
        </div>
      </main>
    </div>
  );
}
