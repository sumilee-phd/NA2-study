import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAYER_TERMS, NAME_MAX, NAME_PATTERN_SOURCE, isAutoName, randomName, layerNote, ROOM_KEY, GAP_MS, cleanName, dayKey, dayStart, emptyRoom, parseRoom, loadRoom, saveRoom, tickRoom, roomSeconds, startRoom, stopRoom, formatDuration, rosterView, newClientId } from '../src/study-room-model.mjs';

const ID = '11111111-2222-4333-8444-555555555555';
const T0 = Date.UTC(2026, 10, 19, 3, 0, 0); // KST 2026-11-19 12:00

test('날짜는 한국 시간 기준', () => {
  assert.equal(dayKey(Date.UTC(2026, 10, 19, 14, 59, 59)), '2026-11-19');
  assert.equal(dayKey(Date.UTC(2026, 10, 19, 15, 0, 0)), '2026-11-20');
  assert.equal(dayStart(T0), Date.UTC(2026, 10, 18, 15, 0, 0));
});

test('표시 이름 정리: 공백·제어문자 제거, 길이 제한', () => {
  assert.equal(cleanName('  수미' + String.fromCharCode(0x200b, 10) + '  쌤 '), '수미 쌤');
  assert.equal(Array.from(cleanName('가'.repeat(30))).length, NAME_MAX);
  assert.equal(cleanName(null), '');
});

test('시작·멈춤으로 공부시간 누적', () => {
  let room = startRoom(emptyRoom(T0, ID), T0);
  assert.equal(roomSeconds(room, T0 + 90_000), 90);
  room = stopRoom(tickRoom(room, T0 + 60_000), T0 + 90_000);
  assert.equal(room.startedAt, null);
  assert.equal(roomSeconds(room, T0 + 500_000), 90);
  room = startRoom(room, T0 + 600_000);
  assert.equal(roomSeconds(room, T0 + 630_000), 120);
  assert.equal(startRoom(room, T0 + 640_000).startedAt, T0 + 600_000);
});

test('기록이 오래 끊긴 구간은 공부시간에서 제외', () => {
  let room = startRoom(emptyRoom(T0, ID), T0);
  room = tickRoom(room, T0 + 60_000);
  const later = T0 + 60_000 + GAP_MS + 3_600_000;
  room = tickRoom(room, later);
  assert.equal(roomSeconds(room, later), 60);
  assert.equal(roomSeconds(room, later + 10_000), 70);
});

test('짧게 끊긴 구간은 그대로 포함', () => {
  let room = startRoom(emptyRoom(T0, ID), T0);
  room = tickRoom(room, T0 + GAP_MS - 1000);
  assert.equal(roomSeconds(room, T0 + GAP_MS - 1000), (GAP_MS - 1000) / 1000);
});

test('자정이 지나면 새 날짜로 0부터 다시 셈', () => {
  const before = Date.UTC(2026, 10, 19, 14, 58, 0); // KST 23:58
  let room = startRoom(emptyRoom(before, ID), before);
  const after = Date.UTC(2026, 10, 19, 15, 1, 0); // KST 00:01
  room = tickRoom(room, after);
  assert.equal(room.day, '2026-11-20');
  assert.equal(roomSeconds(room, after), 60);
  const paused = tickRoom(stopRoom(startRoom(emptyRoom(before, ID), before), before + 30_000), after);
  assert.equal(roomSeconds(paused, after), 0);
});

test('저장 값 복원과 손상 값 처리', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const room = startRoom(emptyRoom(T0, ID, '3계층 라우터 27'), T0);
  assert.equal(saveRoom(storage, tickRoom(room, T0 + 30_000)), true);
  const loaded = loadRoom(storage, T0 + 40_000);
  assert.equal(loaded.clientId, ID);
  assert.equal(loaded.name, '3계층 라우터 27');
  assert.equal(roomSeconds(loaded, T0 + 40_000), 40);
  store.set(ROOM_KEY, '{broken');
  assert.equal(loadRoom(storage, T0).baseSeconds, 0);
  assert.equal(isAutoName(parseRoom(JSON.stringify({ v: 1, clientId: 'x' }), T0).name), true);
  const typed = parseRoom(JSON.stringify({ v: 1, clientId: ID, name: '홍길동', day: dayKey(T0) }), T0);
  assert.equal(typed.clientId, ID);
  assert.equal(isAutoName(typed.name), true);
  assert.equal(parseRoom(JSON.stringify({ v: 1, clientId: ID, baseSeconds: 9e9, day: dayKey(T0), startedAt: T0 + 5000 }), T0).baseSeconds, 86400);
  assert.equal(loadRoom({ getItem() { throw new Error('blocked'); } }, T0).startedAt, null);
  assert.equal(saveRoom({ setItem() { throw new Error('full'); } }, room), false);
});

test('시간 표시와 식별자 형식', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(3725), '01:02:05');
  assert.match(newClientId(null), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('접속자 목록: 공부 중인 사람만 시간이 흐르고 내 행은 이 기기 값 사용', () => {
  const rows = [
    { id: 'a', nick: '가', secs: 100, studying: true, me: false },
    { id: 'b', nick: '나', secs: 105, studying: false, me: false },
    { id: 'c', nick: '옛이름', secs: 1, studying: false, me: true },
    null, { nick: 'id 없음' },
  ];
  const view = rosterView(rows, T0, T0 + 10_000, { name: '다', seconds: 300, studying: true });
  assert.deepEqual(view.map(r => [r.name, r.seconds, r.studying, r.me]), [['다', 300, true, true], ['가', 110, true, false], ['나', 105, false, false]]);
  assert.deepEqual(rosterView(undefined, T0, T0, null), []);
});

test('닉네임 자동 부여: 계층과 용어가 맞는 조합만 생성', () => {
  const all = Object.values(LAYER_TERMS).flat();
  assert.equal(new Set(all).size, all.length, '한 용어는 한 계층에만 둔다');
  assert.equal(randomName(() => 0), '1계층 허브 10');
  assert.equal(randomName(() => 0.999999), '7계층 NTP 99');
  for (let i = 0; i < 500; i += 1) {
    const name = randomName();
    assert.equal(isAutoName(name), true, name);
    assert.ok(Array.from(name).length <= NAME_MAX, name);
    assert.ok(LAYER_TERMS[name[0]].includes(name.slice(4, -3)), name);
  }
  for (const bad of ['홍길동', '3계층 TCP 27', '4계층 TCP 7', '4계층 TCP 100', ' 4계층 TCP 27', '4계층 TCP 27' + String.fromCharCode(10), '', null]) assert.equal(isAutoName(bad), false, String(bad));
  assert.equal(layerNote('3계층 라우터 27'), 'OSI 3계층(네트워크 계층)');
  assert.equal(layerNote('홍길동'), '');
  assert.equal(isAutoName(emptyRoom(T0).name), true);
});

test('서버 SQL의 닉네임 형식 검사가 앱의 목록과 일치', () => {
  const sql = readFileSync(new URL('../supabase/study-room.sql', import.meta.url), 'utf8');
  const found = sql.match(/v_name ~ '([^']+)'/);
  assert.ok(found, 'SQL에 형식 검사가 있어야 한다');
  assert.equal(found[1], NAME_PATTERN_SOURCE);
  assert.ok(sql.includes('check (char_length(name) between 1 and ' + NAME_MAX + ')'));
});
