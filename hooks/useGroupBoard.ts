'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Group, Submission, Score, BanterMessage, Player } from '@/lib/types';
import { fetchSubmissions, pushSubmission, clearSubmissions, fetchBanter, pushBanter } from '@/lib/submissionsApi';

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localHistoryKey(groupId: string) {
  return `tb_hist_${groupId}`;
}

export interface ScoreNotification {
  id: string;
  player: Player;
  score: Score;
  message?: string;
}

interface GroupBoardState {
  submitScore: (playerId: string, score: Score) => void;
  getTodaySubmissions: () => Submission[];
  getPlayerHistory: (playerId: string, days: number) => Array<{ date: string; score: Score | null }>;
  resetBoard: () => void;
  hydrated: boolean;
  banterMessages: BanterMessage[];
  sendBanter: (playerId: string, message: string, hasScore?: boolean) => void;
  notification: ScoreNotification | null;
  clearNotification: () => void;
}

export function useGroupBoard(group: Group): GroupBoardState {
  const [todaySubs, setTodaySubs] = useState<Submission[]>([]);
  const [historySubs, setHistorySubs] = useState<Submission[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [banterMessages, setBanterMessages] = useState<BanterMessage[]>([]);
  const [notification, setNotification] = useState<ScoreNotification | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSubsRef = useRef<Submission[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(localHistoryKey(group.id));
      if (raw) setHistorySubs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [group.id]);

  const syncFromServer = useCallback(async () => {
    const [subs, msgs] = await Promise.all([
      fetchSubmissions(group.id, getTodayDate()),
      fetchBanter(group.id, getTodayDate()),
    ]);

    // Detect new submissions for toast notifications
    const prev = prevSubsRef.current;
    if (prev.length > 0) {
      const newSubs = subs.filter(s => !prev.find(p => p.playerId === s.playerId));
      if (newSubs.length > 0) {
        const newest = newSubs[0];
        const player = group.players.find(p => p.id === newest.playerId);
        if (player) {
          setNotification({ id: `${newest.playerId}:${newest.submittedAt}`, player, score: newest.score });
        }
      }
    }
    prevSubsRef.current = subs;

    setTodaySubs(subs);
    setBanterMessages(msgs);
  }, [group.id, group.players]);

  useEffect(() => {
    syncFromServer().finally(() => setHydrated(true));
  }, [syncFromServer]);

  useEffect(() => {
    pollRef.current = setInterval(syncFromServer, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncFromServer]);

  const submitScore = useCallback(async (playerId: string, score: Score) => {
    const date = getTodayDate();
    const sub: Submission = { playerId, date, score, submittedAt: new Date().toISOString() };

    setTodaySubs(prev => {
      const updated = [...prev.filter(s => s.playerId !== playerId), sub];
      prevSubsRef.current = updated;
      return updated;
    });

    await pushSubmission(group.id, sub);

    const updatedSubs = [...todaySubs.filter(s => s.playerId !== playerId), sub];
    const isLast = group.players.every(p => updatedSubs.some(s => s.playerId === p.id));
    const player = group.players.find(p => p.id === playerId);
    const submitterPhone = localStorage.getItem(`tb_phone_${group.id}`) ?? undefined;
    fetch('/api/sms/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: group.id,
        playerName: player?.name ?? 'Someone',
        playerId,
        date,
        boardUrl: window.location.href,
        isLast,
        submitterPhone,
      }),
    }).catch(() => {});

    setHistorySubs(prev => {
      const updated = [...prev.filter(s => !(s.playerId === playerId && s.date === date)), sub];
      try { localStorage.setItem(localHistoryKey(group.id), JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, [group.id, group.players, todaySubs]);

  const sendBanter = useCallback((playerId: string, message: string, hasScore = false) => {
    const date = getTodayDate();
    const msg: BanterMessage = {
      id: `${playerId}:${Date.now()}`,
      playerId,
      message,
      timestamp: new Date().toISOString(),
      hasScore,
    };
    setBanterMessages(prev => [...prev, msg]);
    pushBanter(group.id, date, msg).catch(() => {});
  }, [group.id]);

  const clearNotification = useCallback(() => setNotification(null), []);

  const getTodaySubmissions = useCallback(() => todaySubs, [todaySubs]);

  const getPlayerHistory = useCallback(
    (playerId: string, days: number): Array<{ date: string; score: Score | null }> => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const sub = i === 0
          ? todaySubs.find(s => s.playerId === playerId)
          : historySubs.find(s => s.playerId === playerId && s.date === date);
        result.push({ date, score: sub?.score ?? null });
      }
      return result;
    },
    [todaySubs, historySubs]
  );

  const resetBoard = useCallback(async () => {
    const date = getTodayDate();
    prevSubsRef.current = [];
    setTodaySubs([]);
    await clearSubmissions(group.id, date);
    try {
      localStorage.removeItem(localHistoryKey(group.id));
      setHistorySubs([]);
    } catch { /* ignore */ }
  }, [group.id]);

  return {
    submitScore,
    getTodaySubmissions,
    getPlayerHistory,
    resetBoard,
    hydrated,
    banterMessages,
    sendBanter,
    notification,
    clearNotification,
  };
}
