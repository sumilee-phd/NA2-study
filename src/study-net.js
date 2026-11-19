// 스터디카페 안에서 걷는 위치를 참가자 브라우저끼리 직접 주고받음(Trystero, WebRTC).
// 닉네임·좌석·공부시간은 여기로 보내지 않고 서버 함수가 맡음. 받은 값은 형식과 범위를 확인한 뒤에만 씀.
import { joinRoom } from 'trystero';
import { cleanRemote } from './study-cafe-map.mjs';

const APP_ID = 'sumilee-phd.github.io/NA2-study';
const ROOM = 'cafe-1';

export function joinCafe({ onMove, onGone }) {
  // identity 'none': 브라우저에 식별 키를 남기지 않고 접속할 때마다 새 임시 ID를 씀
  const room = joinRoom({ appId: APP_ID, identity: 'none' }, ROOM);
  const walk = room.makeUserState('walk', null);
  const owners = new Map(); // 연결 ID -> 서버가 준 참가자 id
  const off = walk.onChange((value, context) => {
    if (context.self) return;
    if (context.removed) { const id = owners.get(context.userId); owners.delete(context.userId); if (id) onGone(id); return; }
    const clean = cleanRemote(value);
    if (!clean) return;
    owners.set(context.userId, clean.id);
    onMove(clean);
  });
  return {
    send(value) { try { walk.set(value); } catch { /* 연결 전이면 다음 전송에서 다시 보냄 */ } },
    leave() { try { off?.(); } catch { /* 이미 정리됨 */ } return room.leave().catch(() => {}); },
  };
}
