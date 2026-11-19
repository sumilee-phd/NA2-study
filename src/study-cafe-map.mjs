// 스터디카페 평면: 좌석 위치, 가구가 차지한 영역, 길찾기. three 없이 계산만 함(테스트 대상).
export const SEAT_X = [-4.4, -2.2, 0, 2.2, 4.4];
export const ROW_Z = [-2.9, 1.9];
export const BOUNDS = { minX: -6.7, maxX: 10.8, minZ: -4.45, maxZ: 4.5 };
export const ENTRANCE = { x: 6.15, z: 2.2 };
// 돌발퀴즈 답 구역: 앞줄 책상 앞 빈 바닥에 1~4번을 나란히 둠
export const QUIZ_ZONES = [-4.2, -1.4, 1.4, 4.2].map((x, i) => ({ n: i + 1, x, z: 3.65, w: 2.5, d: 1.5 }));
export function zoneOf(x, z) { for (const zone of QUIZ_ZONES) if (Math.abs(x - zone.x) <= zone.w / 2 && Math.abs(z - zone.z) <= zone.d / 2) return zone.n; return null; }
export const BENCH_SPOT = { x: -6.25, z: 3.1 }; // 케이블링 실습대 앞
export const WALK_SPEED = 2.6;
const RADIUS = 0.25; // 캐릭터 몸통 반지름만큼 가구를 넓혀서 계산
const CELL = 0.3;

export function seatAnchor(index) { return { x: SEAT_X[index % SEAT_X.length], z: ROW_Z[Math.floor(index / SEAT_X.length) % ROW_Z.length] }; }
// 앉았을 때 몸의 위치와, 의자 뒤에서 자리로 들어가는 지점
export function seatSpot(index) { const a = seatAnchor(index); return { x: a.x, z: a.z - 0.66 }; }
export function seatEntry(index) { const a = seatAnchor(index); return { x: a.x, z: a.z - 1.3 }; }

// 가구가 차지한 사각형 [minX, maxX, minZ, maxZ]
const FURNITURE = [
  [-6.9, -6.35, -2.85, 0.45], // 책장
  [-6.95, -5.98, 0.88, 2.62], // 케이블링 실습대
  [6.95, 7.15, -4.9, 0.62], // 탕비실 가벽
  [7.4, 10.8, -4.9, -3.95], // 조리대
  [10.28, 10.82, -2.85, -2.35], // 정수기
  [10.13, 10.87, -1.65, -0.95], // 냉장고
  [8.5, 9.5, 0.7, 1.7], // 서서 쉬는 탁자
  [5.95, 6.65, 3.25, 3.95], // 화분
];
export function blocks(seats = 10) {
  const list = FURNITURE.slice();
  for (let i = 0; i < seats; i += 1) { const a = seatAnchor(i); list.push([a.x - 0.92, a.x + 0.92, a.z - 0.98, a.z + 0.5]); }
  return list;
}
const ALL = blocks();

export function blocked(x, z, list = ALL) {
  if (!(x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ)) return true;
  for (const [x0, x1, z0, z1] of list) if (x > x0 - RADIUS && x < x1 + RADIUS && z > z0 - RADIUS && z < z1 + RADIUS) return true;
  return false;
}

const COLS = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / CELL);
const ROWS = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ) / CELL);
const center = (col, row) => ({ x: BOUNDS.minX + (col + 0.5) * CELL, z: BOUNDS.minZ + (row + 0.5) * CELL });
const cellOf = point => [Math.min(COLS - 1, Math.max(0, Math.floor((point.x - BOUNDS.minX) / CELL))), Math.min(ROWS - 1, Math.max(0, Math.floor((point.z - BOUNDS.minZ) / CELL)))];
const FREE = new Uint8Array(COLS * ROWS);
for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) { const c = center(col, row); FREE[row * COLS + col] = blocked(c.x, c.z) ? 0 : 1; }
const free = (col, row) => col >= 0 && row >= 0 && col < COLS && row < ROWS && FREE[row * COLS + col] === 1;

function nearestFree(point) {
  const [col, row] = cellOf(point);
  if (free(col, row)) return [col, row];
  for (let ring = 1; ring < Math.max(COLS, ROWS); ring += 1) {
    let best = null; let bestDistance = Infinity;
    for (let dr = -ring; dr <= ring; dr += 1) for (let dc = -ring; dc <= ring; dc += 1) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring || !free(col + dc, row + dr)) continue;
      const c = center(col + dc, row + dr); const d = (c.x - point.x) ** 2 + (c.z - point.z) ** 2;
      if (d < bestDistance) { bestDistance = d; best = [col + dc, row + dr]; }
    }
    if (best) return best;
  }
  return null;
}

// 두 점 사이를 곧게 걸을 수 있는지
export function clearLine(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1));
  for (let i = 0; i <= steps; i += 1) { const t = i / steps; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false; }
  return true;
}

// A* 길찾기. 걸어갈 점들의 목록을 돌려주고, 갈 수 없으면 빈 목록
export function findPath(from, to) {
  const start = nearestFree(from); const goal = nearestFree(to);
  if (!start || !goal) return [];
  const startKey = start[1] * COLS + start[0]; const goalKey = goal[1] * COLS + goal[0];
  const cost = new Float32Array(COLS * ROWS).fill(Infinity); const prev = new Int32Array(COLS * ROWS).fill(-1); const done = new Uint8Array(COLS * ROWS);
  const open = [startKey]; cost[startKey] = 0;
  const estimate = key => Math.hypot((key % COLS) - goal[0], Math.floor(key / COLS) - goal[1]);
  while (open.length) {
    let pick = 0; for (let i = 1; i < open.length; i += 1) if (cost[open[i]] + estimate(open[i]) < cost[open[pick]] + estimate(open[pick])) pick = i;
    const key = open.splice(pick, 1)[0];
    if (key === goalKey) break;
    if (done[key]) continue; done[key] = 1;
    const col = key % COLS; const row = Math.floor(key / COLS);
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const c = col + dc; const r = row + dr;
      if (!free(c, r) || (dr && dc && (!free(col + dc, row) || !free(col, row + dr)))) continue; // 모서리를 비스듬히 뚫지 않음
      const next = r * COLS + c; const step = cost[key] + (dr && dc ? 1.4142 : 1);
      if (step < cost[next]) { cost[next] = step; prev[next] = key; open.push(next); }
    }
  }
  if (goalKey !== startKey && prev[goalKey] === -1) return [];
  const cells = []; for (let key = goalKey; key !== -1; key = prev[key]) cells.push(center(key % COLS, Math.floor(key / COLS)));
  cells.reverse();
  const last = blocked(to.x, to.z) ? cells[cells.length - 1] : { x: to.x, z: to.z };
  const points = [...cells.slice(1, -1), last];
  // 곧게 갈 수 있는 구간은 중간 점을 건너뜀
  const path = []; let anchor = { x: from.x, z: from.z }; let i = 0;
  while (i < points.length) { let j = points.length - 1; while (j > i && !clearLine(anchor, points[j])) j -= 1; path.push(points[j]); anchor = points[j]; i = j + 1; }
  return path;
}

// 키보드 이동: 막히면 한 축으로만 미끄러짐
export function slide(from, dx, dz) {
  if (!blocked(from.x + dx, from.z + dz)) return { x: from.x + dx, z: from.z + dz };
  if (dx && !blocked(from.x + dx, from.z)) return { x: from.x + dx, z: from.z };
  if (dz && !blocked(from.x, from.z + dz)) return { x: from.x, z: from.z + dz };
  return { x: from.x, z: from.z };
}

// 다른 참가자가 보낸 위치는 믿지 않고 형식과 범위를 확인
export function cleanRemote(value) {
  if (!value || typeof value !== 'object') return null;
  const { id, x, z, s } = value;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}$/.test(id) || !Number.isFinite(x) || !Number.isFinite(z) || ![0, 1, 2, 3].includes(s)) return null;
  return { id, x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x)), z: Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z)), s };
}
