import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROOM_KEY, NAME_MAX, cleanName, loadRoom, saveRoom, tickRoom, roomSeconds, startRoom, stopRoom, formatDuration, rosterView } from './study-room-model.mjs';
import './study-room.css';

const API = (import.meta.env.VITE_STUDY_ROOM_URL || '').replace(/\/+$/, '');
const API_KEY = import.meta.env.VITE_STUDY_ROOM_KEY || '';
export const STUDY_ROOM_READY = Boolean(API && API_KEY);
const BEAT_MS = 20000;
const SAVE_MS = 15000;

const storage = () => { try { return window.localStorage; } catch { return { getItem() { return null; }, setItem() { throw new Error('no storage'); } }; } };

async function beat(payload, signal) {
  const response = await fetch(`${API}/rest/v1/rpc/study_beat`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`study room ${response.status}`);
  return response.json();
}

export default function StudyRoom() {
  const [room, setRoom] = useState(() => loadRoom(storage(), Date.now()));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(room.name);
  const [roster, setRoster] = useState({ rows: [], at: 0, loaded: false });
  const [failed, setFailed] = useState(false);
  const roomRef = useRef(room);
  const openRef = useRef(open);
  const saved = useRef({ at: 0, key: '' });
  const toggleRef = useRef(null);
  roomRef.current = room;
  openRef.current = open;

  const studying = room.startedAt != null;
  const seconds = roomSeconds(room, room.lastTick);
  const name = cleanName(draft);

  // 1초마다 시간 반영. 공부 중이 아니고 패널도 닫혀 있으면 멈춤
  useEffect(() => {
    if (!studying && !open) return undefined;
    const tick = () => setRoom(current => tickRoom(current, Date.now()));
    const id = setInterval(tick, 1000);
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', tick); };
  }, [studying, open]);

  // 저장: 상태가 바뀌면 바로, 시간만 흐를 때는 15초 간격
  useEffect(() => {
    const key = `${room.name}|${room.day}|${room.baseSeconds}|${room.startedAt}`;
    if (key === saved.current.key && room.lastTick - saved.current.at < SAVE_MS) return;
    if (saveRoom(storage(), room)) saved.current = { at: room.lastTick, key };
  }, [room]);

  useEffect(() => {
    const flush = () => saveRoom(storage(), tickRoom(roomRef.current, Date.now()));
    const changed = event => { if (event.key === ROOM_KEY) { const next = loadRoom(storage(), Date.now()); setRoom(next); setDraft(next.name); } };
    window.addEventListener('pagehide', flush);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('storage', changed); };
  }, []);

  // 서버 통신: 공부 기록이 있으면 내 시간을 올리고, 아니면 목록만 받아 옴
  const sync = useCallback(async () => {
    const now = Date.now();
    const current = tickRoom(roomRef.current, now);
    const active = current.startedAt != null;
    const total = roomSeconds(current, now);
    const share = Boolean(current.name) && (active || total > 0);
    if (!share && !openRef.current) return;
    if (!active && !openRef.current && document.visibilityState === 'hidden') return;
    try {
      const rows = await beat(share
        ? { p_client: current.clientId, p_name: current.name, p_seconds: total, p_studying: active }
        : { p_client: null, p_name: null, p_seconds: 0, p_studying: false });
      setRoster({ rows, at: Date.now(), loaded: true });
      setFailed(false);
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    sync();
    const id = setInterval(sync, BEAT_MS);
    return () => clearInterval(id);
  }, [sync, studying, open, room.name]);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const commitName = () => { setDraft(name); setRoom(current => current.name === name ? current : { ...current, name }); };
  const start = () => { if (!name) return; setRoom(current => startRoom({ ...current, name }, Date.now())); setDraft(name); };
  const stop = () => setRoom(current => stopRoom(current, Date.now()));

  const people = useMemo(
    () => rosterView(roster.rows, roster.at, room.lastTick, { name: room.name, seconds, studying }),
    [roster, room.lastTick, room.name, seconds, studying],
  );
  const studyingCount = people.filter(person => person.studying).length;

  return <aside className={`room ${open ? 'is-open' : ''}`} aria-label="함께 공부">
    {open && <section className="room-panel" id="room-panel">
      <header className="room-head"><h2>함께 공부</h2><button type="button" className="room-close" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>닫기</button></header>
      <p className="room-note">공부를 시작하면 닉네임과 오늘 공부시간이 접속 중인 학습자에게 표시됩니다.</p>
      <label className="room-name">닉네임
        <input value={draft} maxLength={NAME_MAX * 2} onChange={event => setDraft(event.target.value)} onBlur={commitName} placeholder="실명 대신 닉네임" autoComplete="off" disabled={studying}/>
      </label>
      {!name && <p className="room-hint">닉네임을 입력하면 시작할 수 있습니다. 최대 {NAME_MAX}자</p>}
      <div className="room-clock"><span>오늘 공부시간</span><small>{studying ? '공부 중' : seconds > 0 ? '멈춤' : '시작 전'}</small><b>{formatDuration(seconds)}</b></div>
      {studying
        ? <button type="button" className="room-action" onClick={stop}>잠시 멈춤</button>
        : <button type="button" className="room-action primary" onClick={start} disabled={!name}>{seconds > 0 ? '이어서 공부' : '공부 시작'}</button>}
      <div className="room-list-head"><h3>접속 중</h3><span>{people.length}명 · 공부 중 {studyingCount}명</span></div>
      {failed && <p className="room-error" role="status">접속자 목록을 불러오지 못했습니다. 공부시간은 이 기기에 계속 기록됩니다.</p>}
      {!failed && roster.loaded && people.length === 0 && <p className="room-empty">지금 공부시간을 공유 중인 학습자가 없습니다.</p>}
      {people.length > 0 && <ol className="room-list">{people.map((person, index) => <li key={person.id} className={person.me ? 'is-me' : ''}>
        <span className="room-rank">{index + 1}</span>
        <span className="room-person"><b>{person.name}</b>{person.me && <em>나</em>}</span>
        <span className={`room-state ${person.studying ? 'is-on' : ''}`}>{person.studying ? '공부 중' : '멈춤'}</span>
        <span className="room-time">{formatDuration(person.seconds)}</span>
      </li>)}</ol>}
      <p className="room-foot">공부시간은 한국 시간 자정에 0으로 돌아갑니다. 창을 닫으면 시간이 멈춥니다.</p>
    </section>}
    <button type="button" ref={toggleRef} className={`room-toggle ${studying ? 'is-on' : ''}`} aria-expanded={open} aria-controls="room-panel" onClick={() => setOpen(value => !value)}>
      <span className="room-dot" aria-hidden="true"/>
      <span>함께 공부</span>
      {(studying || seconds > 0) && <b>{formatDuration(seconds)}</b>}
      {studying && <small>공부 중</small>}
    </button>
  </aside>;
}
