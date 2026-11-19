import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROOM_KEY, SEATS, randomName, layerNote, loadRoom, saveRoom, tickRoom, roomSeconds, startRoom, stopRoom, formatDuration, rosterView } from './study-room-model.mjs';
import './study-room.css';

const API = (import.meta.env.VITE_STUDY_ROOM_URL || '').replace(/\/+$/, '');
const API_KEY = import.meta.env.VITE_STUDY_ROOM_KEY || '';
export const STUDY_ROOM_READY = Boolean(API && API_KEY);
const StudyScene = lazy(() => import('./StudyScene.jsx'));
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
  const [roster, setRoster] = useState({ rows: [], at: 0, loaded: false });
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState(false);
  const [full, setFull] = useState(false);
  const [atBench, setAtBench] = useState(false);
  const wantRef = useRef(null); // 스터디카페에서 눌러 고른 자리 번호
  const viewRef = useRef(null);
  const roomRef = useRef(room);
  const openRef = useRef(open);
  const saved = useRef({ at: 0, key: '' });
  const toggleRef = useRef(null);
  roomRef.current = room;
  openRef.current = open || view;

  const studying = room.startedAt != null;
  const seconds = roomSeconds(room, room.lastTick);

  // 1초마다 시간 반영. 공부 중이 아니고 패널도 닫혀 있으면 멈춤
  useEffect(() => {
    if (!studying && !open && !view) return undefined;
    const tick = () => setRoom(current => tickRoom(current, Date.now()));
    const id = setInterval(tick, 1000);
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', tick); };
  }, [studying, open, view]);

  // 저장: 상태가 바뀌면 바로, 시간만 흐를 때는 15초 간격
  useEffect(() => {
    const key = `${room.name}|${room.day}|${room.baseSeconds}|${room.startedAt}`;
    if (key === saved.current.key && room.lastTick - saved.current.at < SAVE_MS) return;
    if (saveRoom(storage(), room)) saved.current = { at: room.lastTick, key };
  }, [room]);

  useEffect(() => {
    const flush = () => saveRoom(storage(), tickRoom(roomRef.current, Date.now()));
    const changed = event => { if (event.key === ROOM_KEY) { setRoom(loadRoom(storage(), Date.now())); } };
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
        ? { p_client: current.clientId, p_name: current.name, p_seconds: total, p_studying: active, p_seat: wantRef.current }
        : { p_client: null, p_name: null, p_seconds: 0, p_studying: false, p_seat: null });
      setRoster({ rows, at: Date.now(), loaded: true });
      setFailed(false);
      // 좌석이 모두 차면 서버가 자리를 주지 않음: 타이머를 멈추고 안내
      const seated = Array.isArray(rows) && rows.some(row => row && row.me);
      if (share) wantRef.current = null;
      if (seated) setFull(false);
      else if (share && active) { setFull(true); setRoom(latest => stopRoom(latest, Date.now())); }
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    sync();
    const id = setInterval(sync, BEAT_MS);
    return () => clearInterval(id);
  }, [sync, studying, open, view, room.name]);

  useEffect(() => {
    if (!open && !view) return undefined;
    const close = event => { if (event.key !== 'Escape') return; if (view) setView(false); else setOpen(false); toggleRef.current?.focus(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, view]);
  useEffect(() => { if (view) viewRef.current?.focus(); }, [view]);

  const rename = () => setRoom(current => { let name = randomName(); while (name === current.name) name = randomName(); return { ...current, name }; });
  const start = () => { setFull(false); setRoom(current => startRoom(current, Date.now())); };
  const pickSeat = seat => { wantRef.current = seat; if (roomRef.current.startedAt == null) start(); else sync(); };
  const stop = () => setRoom(current => stopRoom(current, Date.now()));

  const people = useMemo(
    () => rosterView(roster.rows, roster.at, room.lastTick, { name: room.name, seconds, studying }),
    [roster, room.lastTick, room.name, seconds, studying],
  );
  const studyingCount = people.filter(person => person.studying).length;
  const seated = people.filter(person => person.seat).length;
  const selfInfo = useMemo(() => ({ name: room.name, time: formatDuration(seconds) }), [room.name, seconds]);
  const fullNote = full && <p className="room-full" role="status">자리가 모두 찼습니다({SEATS}석). 잠시 후 다시 오세요.</p>;
  const action = studying
    ? <button type="button" className="room-action" onClick={stop}>잠시 멈춤</button>
    : <button type="button" className="room-action primary" onClick={start}>{seconds > 0 ? '이어서 공부' : '공부 시작'}</button>;

  return <aside className={`room ${open ? 'is-open' : ''}`} aria-label="함께 공부">
    {open && <section className="room-panel" id="room-panel">
      <header className="room-head"><h2>함께 공부</h2><button type="button" className="room-close" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>닫기</button></header>
      <p className="room-note">공부를 시작하면 아래 닉네임과 오늘 공부시간이 접속 중인 학습자에게 표시됩니다.</p>
      <div className="room-name"><div><span>내 닉네임</span><b aria-live="polite">{room.name}</b><small>{layerNote(room.name)}</small></div><button type="button" onClick={rename} disabled={studying}>다른 닉네임</button></div>
      <p className="room-hint">닉네임은 자동으로 정해집니다. 앞의 계층은 뒤 용어가 속한 OSI 계층입니다.</p>
      <div className="room-clock"><span>오늘 공부시간</span><small>{studying ? '공부 중' : seconds > 0 ? '멈춤' : '시작 전'}</small><b>{formatDuration(seconds)}</b></div>
      {action}
      {fullNote}
      <button type="button" className="room-action" onClick={() => { setView(true); setOpen(false); }}>스터디카페 보기</button>
      <div className="room-list-head"><h3>접속 중</h3><span>{seated} / {SEATS}석 · 공부 중 {studyingCount}명</span></div>
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
    {view && <div className="room-view" role="dialog" aria-modal="true" aria-labelledby="room-view-title" tabIndex={-1} ref={viewRef}>
      <header className="room-view-head"><h2 id="room-view-title">NA2 스터디카페</h2><span>{seated} / {SEATS}석 · 공부 중 {studyingCount}명</span><button type="button" className="room-close" onClick={() => { setView(false); toggleRef.current?.focus(); }}>닫기</button></header>
      <div className="room-stage"><Suspense fallback={<p className="room-loading" role="status">스터디카페를 준비하고 있습니다…</p>}><StudyScene people={people} self={selfInfo} onAway={stop} onSit={start} onPickSeat={pickSeat} onBench={setAtBench}/></Suspense>{atBench && <a className="room-bench-link" href="#/cabling" onClick={() => { setView(false); setAtBench(false); }}>케이블링 훈련 열기</a>}<p className="room-tip">바닥을 누르거나 방향키(WASD)로 이동합니다. 빈 자리를 누르면 앉고, 자리를 뜨면 공부시간이 멈춥니다. 실습대를 누르면 케이블 제작 순서를 연습합니다. 움직임은 참가자 브라우저끼리 직접 연결해 공유합니다.</p></div>
      <footer className="room-view-foot"><div className="room-view-me"><span>{room.name}</span><b>{formatDuration(seconds)}</b><small>{studying ? '공부 중' : seconds > 0 ? '멈춤' : '시작 전'}</small></div>{action}{fullNote}</footer>
      <ul className="room-sr">{people.filter(person => person.seat).map(person => <li key={person.id}>{person.seat}번 자리 {person.name}, {person.studying ? '공부 중' : '멈춤'}, {formatDuration(person.seconds)}</li>)}</ul>
    </div>}
    <button type="button" ref={toggleRef} className={`room-toggle ${studying ? 'is-on' : ''}`} aria-expanded={open} aria-controls="room-panel" onClick={() => setOpen(value => !value)}>
      <span className="room-dot" aria-hidden="true"/>
      <span>함께 공부</span>
      {(studying || seconds > 0) && <b>{formatDuration(seconds)}</b>}
      {studying && <small>공부 중</small>}
    </button>
  </aside>;
}
