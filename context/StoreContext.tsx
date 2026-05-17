'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Submission, Score, BanterMessage, Player } from '@/lib/types';
import { DEMO_GROUP, SEED_SUBMISSIONS } from '@/lib/seed';
import { fetchSubmissions, pushSubmission, clearSubmissions, fetchBanter, pushBanter } from '@/lib/submissionsApi';

const STORAGE_KEY = 'threadboard_v1';
const DEMO_GROUP_ID = DEMO_GROUP.id;

export function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitialState(): AppState {
  return { group: DEMO_GROUP, submissions: SEED_SUBMISSIONS };
}

export interface ScoreNotification {
  id: string;
  player: Player;
  score: Score;
  message?: string;
}

interface StoreContextValue {
  state: AppState;
  hydrated: boolean;
  submitScore: (playerId: string, score: Score) => void;
  resetDemo: () => void;
  getTodaySubmissions: () => Submission[];
  getPlayerHistory: (playerId: string, days: number) => Array<{ date: string; score: Score | null }>;
  banterMessages: BanterMessage[];
  sendBanter: (playerId: string, message: string, hasScore?: boolean) => void;
  notification: ScoreNotification | null;
  clearNotification: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);
  const [todaySubs, setTodaySubs] = useState<Submission[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [banterMessages, setBanterMessages] = useState<BanterMessage[]>([]);
  const [notification, setNotification] = useState<ScoreNotification | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSubsRef = useRef<Submission[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        setState({
          group: { ...DEMO_GROUP, players: DEMO_GROUP.players.map(base => {
            const stored = parsed.group?.players?.find(p => p.id === base.id);
            return stored ? { ...base, streak: stored.streak } : base;
          })},
          submissions: parsed.submissions ?? [],
        });
      }
    } catch { /* corrupt storage — start fresh */ }

    Promise.all([
      fetchSubmissions(DEMO_GROUP_ID, getTodayDate()),
      fetchBanter(DEMO_GROUP_ID, getTodayDate()),
    ]).then(([subs, msgs]) => {
      prevSubsRef.current = subs;
      setTodaySubs(subs);
      setBanterMessages(msgs);
    }).finally(() => setHydrated(true));
  }, []);

  const syncFromServer = useCallback(async () => {
    const [subs, msgs] = await Promise.all([
      fetchSubmissions(DEMO_GROUP_ID, getTodayDate()),
      fetchBanter(DEMO_GROUP_ID, getTodayDate()),
    ]);

    const prev = prevSubsRef.current;
    if (prev.length > 0) {
      const newSubs = subs.filter(s => !prev.find(p => p.playerId === s.playerId));
      if (newSubs.length > 0) {
        const newest = newSubs[0];
        const player = DEMO_GROUP.players.find(p => p.id === newest.playerId);
        if (player) {
          setNotification({ id: `${newest.playerId}:${newest.submittedAt}`, player, score: newest.score });
        }
      }
    }
    prevSubsRef.current = subs;

    setTodaySubs(subs);
    setBanterMessages(msgs);
  }, []);

  useEffect(() => {
    pollRef.current = setInterval(syncFromServer, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncFromServer]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, hydrated]);

  const submitScore = useCallback(async (playerId: string, score: Score) => {
    const date = getTodayDate();
    const sub: Submission = { playerId, date, score, submittedAt: new Date().toISOString() };

    setTodaySubs(prev => {
      const updated = [...prev.filter(s => s.playerId !== playerId), sub];
      prevSubsRef.current = updated;
      return updated;
    });
    setState(prev => ({
      group: { ...prev.group, players: prev.group.players.map(p =>
        p.id !== playerId ? p : { ...p, streak: score === 'DNP' ? 0 : p.streak + 1 }
      )},
      submissions: [...prev.submissions.filter(s => !(s.playerId === playerId && s.date === date)), sub],
    }));

    await pushSubmission(DEMO_GROUP_ID, sub);
  }, []);

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
    pushBanter(DEMO_GROUP_ID, date, msg).catch(() => {});
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  const resetDemo = useCallback(async () => {
    prevSubsRef.current = [];
    setState(getInitialState());
    setTodaySubs([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    await clearSubmissions(DEMO_GROUP_ID, getTodayDate());
  }, []);

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
          : state.submissions.find(s => s.playerId === playerId && s.date === date);
        result.push({ date, score: sub?.score ?? null });
      }
      return result;
    },
    [todaySubs, state.submissions]
  );

  return (
    <StoreContext.Provider value={{
      state,
      hydrated,
      submitScore,
      resetDemo,
      getTodaySubmissions,
      getPlayerHistory,
      banterMessages,
      sendBanter,
      notification,
      clearNotification,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
