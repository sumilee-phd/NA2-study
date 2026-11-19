// 함께 공부 기능의 로컬 확인용 가짜 서버. supabase/study-room.sql의 study_beat와 같은 응답 형식.
// 실행: node scripts/study-room-mock.mjs [--demo] [--full]
//   --demo 예시 접속자 6명 추가, --full 예시 접속자로 10석을 모두 채움(만석 안내 확인용)
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 8799);
const SEATS = 10;
const rows = new Map();
const SAMPLE = [
  ['3계층 라우터 41', 5400, true, 2], ['4계층 TCP 18', 1830, false, 5], ['7계층 DNS 73', 640, true, 8],
  ['2계층 스위치 56', 3120, true, 3], ['1계층 리피터 22', 260, true, 7], ['6계층 암호화 90', 4410, false, 10],
  ['5계층 세션 37', 900, true, 1], ['7계층 SMTP 64', 2000, true, 4], ['3계층 OSPF 15', 150, true, 6], ['2계층 VLAN 88', 7200, true, 9],
];
const count = process.argv.includes('--full') ? 10 : process.argv.includes('--demo') ? 6 : 0;
const demo = SAMPLE.slice(0, count).map(([nick, secs, studying, seat], i) => ({ id: `demo${i}`, nick, secs, studying, seat, at: Date.now() }));
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

createServer((request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return; }
  if (request.method !== 'POST' || request.url !== '/rest/v1/rpc/study_beat') { response.writeHead(404, cors); response.end(); return; }
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    let input = {};
    try { input = JSON.parse(body || '{}'); } catch { response.writeHead(400, cors); response.end(); return; }
    const now = Date.now();
    const name = String(input.p_name || '').trim().slice(0, 16);
    if (input.p_client && name) {
      const old = rows.get(input.p_client);
      const live = old && now - old.at < 60000;
      const taken = new Set(demo.map(row => row.seat));
      for (const [client, row] of rows) if (client !== input.p_client && now - row.at < 60000) taken.add(row.seat);
      const free = Array.from({ length: SEATS }, (_, i) => i + 1).find(seat => !taken.has(seat));
      const want = Number.isInteger(input.p_seat) && input.p_seat >= 1 && input.p_seat <= SEATS && !taken.has(input.p_seat) && (live || input.p_studying) ? input.p_seat : undefined;
      const seat = want ?? (live ? old.seat : input.p_studying ? free : undefined);
      if (seat) rows.set(input.p_client, { nick: name, secs: Math.max(0, Math.min(86400, Number(input.p_seconds) || 0)), studying: Boolean(input.p_studying), seat, at: now });
    }
    const list = [...rows].filter(([, row]) => now - row.at < 60000).map(([client, row]) => ({ id: createHash('md5').update(client).digest('hex').slice(0, 8), nick: row.nick, secs: row.secs, studying: row.studying, me: client === input.p_client, seat: row.seat }));
    for (const row of demo) list.push({ id: row.id, nick: row.nick, secs: row.secs + (row.studying ? Math.floor((now - row.at) / 1000) : 0), studying: row.studying, me: false, seat: row.seat });
    list.sort((a, b) => b.secs - a.secs);
    response.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    response.end(JSON.stringify(list));
  });
}).listen(PORT, '127.0.0.1', () => console.log(`study room mock: http://127.0.0.1:${PORT}`));
