import { useEffect, useRef, useState } from 'react';
import { createStudyScene } from './study-scene.js';
import { SEATS, formatDuration } from './study-room-model.mjs';

// 3D 스터디카페 화면. three와 Trystero는 이 파일을 열 때만 내려받음
export default function StudyScene({ people, self, onAway, onSit, onPickSeat }) {
  const host = useRef(null);
  const scene = useRef(null);
  const net = useRef(null);
  const handlers = useRef({});
  const myId = useRef(null);
  const [broken, setBroken] = useState(false);
  handlers.current = { onAway, onSit, onPickSeat };
  myId.current = people.find(person => person.me && person.seat)?.id ?? null;

  useEffect(() => {
    let closed = false;
    try {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      scene.current = createStudyScene(host.current, {
        reducedMotion, seats: SEATS,
        onAway: () => handlers.current.onAway?.(),
        onSit: () => handlers.current.onSit?.(),
        onPickSeat: seat => handlers.current.onPickSeat?.(seat),
        // 자리가 있는 사람만 위치를 알림
        onState: value => { if (myId.current) net.current?.send({ id: myId.current, ...value }); },
      });
    } catch { setBroken(true); return undefined; }
    // 직접 연결이 막힌 환경에서도 좌석과 공부시간은 서버 신호로 계속 보임
    import('./study-net.js').then(module => {
      if (closed) return;
      net.current = module.joinCafe({ onMove: value => scene.current?.setRemote(value), onGone: id => scene.current?.dropRemote(id) });
      scene.current?.announce();
    }).catch(() => {});
    return () => { closed = true; net.current?.leave(); net.current = null; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => {
    scene.current?.update(people.map(person => ({ ...person, time: formatDuration(person.seconds) })), self);
  }, [people, self, broken]);

  if (broken) return <p className="room-loading" role="status">이 기기에서는 3D 화면을 표시할 수 없습니다. 접속자 목록은 함께 공부 창에서 확인할 수 있습니다.</p>;
  return <div className="room-canvas" ref={host}/>;
}
