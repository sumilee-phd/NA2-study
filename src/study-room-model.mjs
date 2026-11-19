// 함께 공부(공부시간 공유) 타이머 모델. 화면·통신과 분리한 순수 함수만 둠.
export const ROOM_KEY = 'na2-study:room:v1';
export const NAME_MAX = 12;
export const GAP_MS = 5 * 60 * 1000; // 이보다 오래 기록이 끊기면 창이 닫혀 있던 것으로 보고 그 구간은 제외
export const DAY_SECONDS = 86400;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY_MS = DAY_SECONDS * 1000;

export function dayKey(now) { return new Date(now + KST_OFFSET).toISOString().slice(0, 10); }
export function dayStart(now) { return Math.floor((now + KST_OFFSET) / DAY_MS) * DAY_MS - KST_OFFSET; }
function span(from, to) { return Math.max(0, Math.floor((to - from) / 1000)); }

export function cleanName(value) {
  const text = String(value ?? '').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(text).slice(0, NAME_MAX).join('').trim();
}

export function newClientId(random = globalThis.crypto) {
  if (random?.randomUUID) return random.randomUUID();
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4'; hex[16] = '89ab'[Math.floor(Math.random() * 4)];
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function emptyRoom(now, clientId = newClientId()) {
  return { v: 1, clientId, name: '', day: dayKey(now), baseSeconds: 0, startedAt: null, lastTick: now };
}

export function parseRoom(raw, now) {
  let value = null;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { value = null; }
  if (!value || value.v !== 1 || !UUID.test(value.clientId || '')) return emptyRoom(now);
  const base = Number.isFinite(value.baseSeconds) ? Math.min(DAY_SECONDS, Math.max(0, Math.floor(value.baseSeconds))) : 0;
  const started = Number.isFinite(value.startedAt) && value.startedAt <= now ? value.startedAt : null;
  const last = Number.isFinite(value.lastTick) && value.lastTick <= now ? value.lastTick : now;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value.day || '') ? value.day : dayKey(now);
  return tickRoom({ v: 1, clientId: value.clientId, name: cleanName(value.name), day, baseSeconds: base, startedAt: started, lastTick: last }, now);
}

export function loadRoom(storage, now) {
  try { return parseRoom(storage.getItem(ROOM_KEY), now); } catch { return emptyRoom(now); }
}
export function saveRoom(storage, room) {
  try { storage.setItem(ROOM_KEY, JSON.stringify(room)); return true; } catch { return false; }
}

// 시간 흐름 반영: 끊긴 구간 제외, 날짜(KST)가 바뀌면 0부터 다시 셈
export function tickRoom(room, now) {
  let next = room;
  if (next.startedAt != null && now - next.lastTick > GAP_MS) {
    next = { ...next, baseSeconds: next.baseSeconds + span(next.startedAt, next.lastTick), startedAt: now };
  }
  const day = dayKey(now);
  if (next.day !== day) {
    next = { ...next, day, baseSeconds: 0, startedAt: next.startedAt == null ? null : Math.max(next.startedAt, dayStart(now)) };
  }
  return { ...next, lastTick: now };
}

export function roomSeconds(room, now) {
  const running = room.startedAt == null ? 0 : span(room.startedAt, now);
  return Math.min(DAY_SECONDS, room.baseSeconds + running);
}

export function startRoom(room, now) {
  const next = tickRoom(room, now);
  return next.startedAt != null ? next : { ...next, startedAt: now };
}
export function stopRoom(room, now) {
  const next = tickRoom(room, now);
  return next.startedAt == null ? next : { ...next, baseSeconds: roomSeconds(next, now), startedAt: null };
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const pad = n => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

// 서버 응답을 화면 목록으로 변환. 공부 중인 사람은 받아온 뒤 흐른 시간만큼 더해 보여 줌
export function rosterView(rows, fetchedAt, now, mine) {
  const list = (Array.isArray(rows) ? rows : []).filter(row => row && typeof row.id === 'string').map(row => {
    const me = Boolean(row.me);
    const studying = me && mine ? mine.studying : Boolean(row.studying);
    const base = Math.max(0, Math.floor(Number(row.secs) || 0));
    const seconds = me && mine ? mine.seconds : Math.min(DAY_SECONDS, base + (studying ? span(fetchedAt, now) : 0));
    return { id: row.id, name: cleanName(me && mine ? mine.name : row.nick) || '이름 없음', studying, seconds, me };
  });
  return list.sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, 'ko'));
}
