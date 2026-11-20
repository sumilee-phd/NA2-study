import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCH_SPOT, BOUNDS, ENTRANCE, blocked, clearLine, findPath, slide, seatAnchor, seatEntry, seatSpot, cleanRemote } from '../src/study-cafe-map.mjs';

function walkable(from, path) {
  let at = from;
  for (const point of path) { if (!clearLine(at, point)) return false; at = point; }
  return true;
}

test('입구와 모든 자리의 진입 지점은 비어 있고, 책상 위는 막혀 있음', () => {
  assert.equal(blocked(ENTRANCE.x, ENTRANCE.z), false);
  assert.equal(blocked(BENCH_SPOT.x, BENCH_SPOT.z), false, '실습대 앞');
  assert.ok(findPath(ENTRANCE, BENCH_SPOT).length > 0);
  for (let i = 0; i < 10; i += 1) {
    const entry = seatEntry(i); const desk = seatAnchor(i); const spot = seatSpot(i);
    assert.equal(blocked(entry.x, entry.z), false, `자리 ${i + 1} 진입 지점`);
    assert.equal(blocked(desk.x, desk.z), true, `자리 ${i + 1} 책상`);
    assert.equal(blocked(spot.x, spot.z), true, `자리 ${i + 1} 의자`);
  }
  assert.equal(blocked(BOUNDS.minX - 1, 0), true);
  assert.equal(blocked(9.1, -4.4), true, '조리대');
});

test('입구에서 모든 자리까지 가구를 뚫지 않고 걸어갈 수 있음', () => {
  for (let i = 0; i < 10; i += 1) {
    const goal = seatEntry(i);
    const path = findPath(ENTRANCE, goal);
    assert.ok(path.length > 0, `자리 ${i + 1} 경로`);
    assert.ok(walkable(ENTRANCE, path), `자리 ${i + 1} 경로가 가구를 지남`);
    const end = path[path.length - 1];
    assert.ok(Math.hypot(end.x - goal.x, end.z - goal.z) < 0.01);
  }
});

test('탕비실과 실습대 앞까지 갈 수 있고, 가구 위를 누르면 가장 가까운 빈 곳에서 멈춤', () => {
  for (const goal of [{ x: 9, z: -3.2 }, { x: -5.5, z: 1.8 }, { x: 10.2, z: 3.5 }]) {
    const path = findPath(seatEntry(0), goal);
    assert.ok(path.length > 0);
    assert.ok(walkable(seatEntry(0), path));
  }
  const path = findPath(ENTRANCE, seatAnchor(2));
  const end = path[path.length - 1];
  assert.equal(blocked(end.x, end.z), false);
  assert.ok(Math.hypot(end.x - seatAnchor(2).x, end.z - seatAnchor(2).z) < 1.6);
});

test('키보드 이동은 막힌 방향으로 가지 않고 벽을 따라 미끄러짐', () => {
  const open = slide(ENTRANCE, 0.1, 0);
  assert.ok(Math.abs(open.x - ENTRANCE.x - 0.1) < 1e-9);
  const edge = { x: 0, z: BOUNDS.maxZ - 0.01 };
  const moved = slide(edge, 0.1, 0.1);
  assert.ok(Math.abs(moved.x - 0.1) < 1e-9);
  assert.equal(moved.z, edge.z);
  const corner = { x: BOUNDS.maxX - 0.01, z: BOUNDS.maxZ - 0.01 };
  assert.deepEqual(slide(corner, 0.1, 0.1), corner);
});

test('다른 참가자가 보낸 위치는 형식과 범위를 확인', () => {
  assert.deepEqual(cleanRemote({ id: '24f986ee', x: 1, z: 2, s: 1 }), { id: '24f986ee', x: 1, z: 2, s: 1, e: 0, et: 0 });
  assert.deepEqual(cleanRemote({ id: '24f986ee', x: 1, z: 2, s: 2, e: 3, et: 7 }), { id: '24f986ee', x: 1, z: 2, s: 2, e: 3, et: 7 });
  assert.deepEqual([cleanRemote({ id: '24f986ee', x: 1, z: 2, s: 2, e: 9, et: -4 }).e, cleanRemote({ id: '24f986ee', x: 1, z: 2, s: 2, e: 9, et: 'x' }).et], [0, 0]);
  assert.deepEqual(cleanRemote({ id: '24f986ee', x: 999, z: -999, s: 2 }), { id: '24f986ee', x: BOUNDS.maxX, z: BOUNDS.minZ, s: 2, e: 0, et: 0 });
  assert.equal(cleanRemote({ id: '24f986ee', x: 0, z: 0, s: 3 }).s, 3, '실습대에서 연습 중');
  for (const bad of [null, 'x', {}, { id: 'zzz', x: 0, z: 0, s: 0 }, { id: '24f986ee', x: NaN, z: 0, s: 0 }, { id: '24f986ee', x: 0, z: 0, s: 7 }, { id: 5, x: 0, z: 0, s: 0 }]) assert.equal(cleanRemote(bad), null);
});
