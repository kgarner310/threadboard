import { Submission, BanterMessage } from './types';

export async function fetchSubmissions(groupId: string, date: string): Promise<Submission[]> {
  try {
    const res = await fetch(
      `/api/submissions?groupId=${encodeURIComponent(groupId)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function pushSubmission(groupId: string, submission: Submission): Promise<void> {
  try {
    await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, submission }),
    });
  } catch {
    // Fire and forget — local state already updated optimistically
  }
}

export async function clearSubmissions(groupId: string, date: string): Promise<void> {
  try {
    await fetch(
      `/api/submissions?groupId=${encodeURIComponent(groupId)}&date=${encodeURIComponent(date)}`,
      { method: 'DELETE' }
    );
  } catch {
    // ignore
  }
}

export async function fetchBanter(groupId: string, date: string): Promise<BanterMessage[]> {
  try {
    const res = await fetch(
      `/api/banter?groupId=${encodeURIComponent(groupId)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function pushBanter(groupId: string, date: string, message: BanterMessage): Promise<void> {
  try {
    await fetch('/api/banter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, date, message }),
    });
  } catch {
    // Fire and forget
  }
}
