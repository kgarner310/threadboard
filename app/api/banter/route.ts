import { NextRequest, NextResponse } from 'next/server';
import { BanterMessage } from '@/lib/types';

const memStore = new Map<string, BanterMessage[]>();
const MAX_MESSAGES = 100;

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _redis: any = null;
async function redis() {
  if (!REDIS_URL) return null;
  if (!_redis) {
    const { default: Redis } = await import('ioredis');
    _redis = new Redis(REDIS_URL);
  }
  return _redis;
}

function banterKey(groupId: string, date: string) {
  return `banter:${groupId}:${date}`;
}

async function getMessages(key: string): Promise<BanterMessage[]> {
  const r = await redis();
  if (r) {
    const raw: string[] = await r.lrange(key, 0, -1);
    return raw.map(s => JSON.parse(s));
  }
  return memStore.get(key) ?? [];
}

async function appendMessage(key: string, msg: BanterMessage): Promise<void> {
  const r = await redis();
  if (r) {
    await r.rpush(key, JSON.stringify(msg));
    await r.ltrim(key, -MAX_MESSAGES, -1);
    await r.expire(key, 7 * 24 * 60 * 60);
    return;
  }
  const existing = memStore.get(key) ?? [];
  memStore.set(key, [...existing, msg].slice(-MAX_MESSAGES));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const date = searchParams.get('date');
  if (!groupId || !date) return NextResponse.json([]);
  const messages = await getMessages(banterKey(groupId, date));
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { groupId: string; date: string; message: BanterMessage };
  const { groupId, date, message } = body;
  if (!groupId || !date || !message?.id || !message?.playerId || !message?.message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  await appendMessage(banterKey(groupId, date), message);
  return NextResponse.json({ ok: true });
}
