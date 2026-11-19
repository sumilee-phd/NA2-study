// 함께 공부 기능의 로컬 확인용 가짜 서버. supabase/study-room.sql의 study_beat와 같은 응답 형식.
// 실행: node scripts/study-room-mock.mjs [--demo]   (--demo는 예시 접속자 3명 추가)
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 8799);
const rows = new Map();
const demo = process.argv.includes('--demo')
  ? [['d1', '라우터장인', 5400, true], ['d2', '서브넷연습', 1830, false], ['d3', 'OSI7', 640, true]].map(([id, nick, secs, studying]) => ({ id, nick, secs, studying, at: Date.now() }))
  : [];
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
    const name = String(input.p_name || '').trim().slice(0, 12);
    if (input.p_client && name) rows.set(input.p_client, { nick: name, secs: Math.max(0, Math.min(86400, Number(input.p_seconds) || 0)), studying: Boolean(input.p_studying), at: now });
    const list = [...rows].filter(([, row]) => now - row.at < 60000).map(([client, row]) => ({ id: createHash('md5').update(client).digest('hex').slice(0, 8), nick: row.nick, secs: row.secs, studying: row.studying, me: client === input.p_client }));
    for (const row of demo) list.push({ id: row.id, nick: row.nick, secs: row.secs + (row.studying ? Math.floor((now - row.at) / 1000) : 0), studying: row.studying, me: false });
    list.sort((a, b) => b.secs - a.secs);
    response.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    response.end(JSON.stringify(list));
  });
}).listen(PORT, '127.0.0.1', () => console.log(`study room mock: http://127.0.0.1:${PORT}`));
