import { useEffect, useRef, useState } from 'react';
import { createStudyScene } from './study-scene.js';
import { SEATS, formatDuration } from './study-room-model.mjs';
import { autoQuiz, practiceQuiz, questionIndex, questionFile, cleanQuestion, verdict, countdown } from './study-quiz-model.mjs';

const QUIZ_BASE = `${import.meta.env.BASE_URL}data/quiz/`;
const VERDICT_TEXT = { right: '맞혔습니다.', wrong: '틀렸습니다.', none: '답 구역에 서지 않아 참여하지 않았습니다.' };

// 3D 스터디카페 화면. three와 Trystero는 이 파일을 열 때만 내려받음
export default function StudyScene({ people, self, onAway, onSit, onPickSeat, onBench, onQuizStand }) {
  const host = useRef(null);
  const scene = useRef(null);
  const net = useRef(null);
  const handlers = useRef({});
  const myId = useRef(null);
  const [broken, setBroken] = useState(false);
  // 돌발퀴즈
  const [quiz, setQuiz] = useState({ phase: 'idle', remain: 0, next: 0, practice: false, key: '' });
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [closedKey, setClosedKey] = useState('');
  const practice = useRef(null);
  const count = useRef(null);
  const loaded = useRef({ key: '', question: null });
  const lastPhase = useRef('idle');

  handlers.current = { onAway, onSit, onPickSeat, onBench, onQuizStand };
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
        onBench: active => handlers.current.onBench?.(active),
        onQuizStand: active => handlers.current.onQuizStand?.(active),
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

  // 돌발퀴즈 진행: 시각만으로 단계를 정하므로 모두 같은 때 같은 문제를 봄
  useEffect(() => {
    if (broken) return undefined;
    let stopped = false;
    const load = async (key, slot) => {
      loaded.current = { key, question: null };
      try {
        if (count.current == null) count.current = (await (await fetch(`${QUIZ_BASE}index.json`)).json()).count;
        const index = questionIndex(slot, count.current);
        if (index < 0) return;
        const item = cleanQuestion(await (await fetch(`${QUIZ_BASE}${questionFile(index)}`)).json());
        if (stopped || loaded.current.key !== key || !item) return;
        loaded.current.question = item; setQuestion(item);
      } catch { /* 문제를 받지 못하면 이번 퀴즈는 건너뜀 */ }
    };
    const tick = () => {
      const now = Date.now();
      let state = practice.current ? practiceQuiz(now, practice.current.at, practice.current.seed) : autoQuiz(now);
      if (practice.current && state.phase === 'idle') { practice.current = null; state = autoQuiz(now); }
      const key = state.phase === 'idle' ? '' : `${state.practice ? 'p' : 'a'}${state.slot}`;
      if (key && loaded.current.key !== key) { setQuestion(null); setResult(null); load(key, state.slot); }
      const ready = Boolean(key && loaded.current.key === key && loaded.current.question);
      const phase = state.phase === 'idle' || (state.phase !== 'soon' && !ready) ? 'idle' : state.phase;
      if (phase !== lastPhase.current) {
        if (phase === 'reveal') {
          const answer = loaded.current.question.answer; const zone = scene.current?.myZone() ?? null;
          setResult({ answer, zone, verdict: verdict(zone, answer) });
          scene.current?.setQuiz({ active: true, answer });
        } else scene.current?.setQuiz({ active: phase !== 'idle', answer: null });
        lastPhase.current = phase;
      }
      setQuiz(previous => (previous.phase === phase && previous.remain === state.remain && previous.key === key && Math.abs(previous.next - state.next) < 900
        ? previous : { phase, remain: state.remain, next: state.next, practice: state.practice, key }));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => { stopped = true; clearInterval(id); scene.current?.setQuiz({ active: false }); };
  }, [broken]);

  if (broken) return <p className="room-loading" role="status">이 기기에서는 3D 화면을 표시할 수 없습니다. 접속자 목록은 함께 공부 창에서 확인할 수 있습니다.</p>;
  const running = quiz.phase !== 'idle';
  return <>
    <div className="room-canvas" ref={host}/>
    {!running && <div className="room-quiz-chip"><span>다음 돌발퀴즈 <b>{countdown(quiz.next)}</b></span><button type="button" onClick={() => { practice.current = { at: Date.now(), seed: Math.floor(Math.random() * 1e6) }; setClosedKey(''); }}>연습 퀴즈</button></div>}
    {running && closedKey !== quiz.key && <section className="room-quiz" aria-label="돌발퀴즈">
      <header><h3>돌발퀴즈{quiz.practice ? ' · 연습' : ''}</h3><span>{quiz.phase === 'soon' ? `${quiz.remain}초 뒤 시작` : quiz.phase === 'ask' ? `남은 시간 ${quiz.remain}초` : '정답 공개'}</span><button type="button" onClick={() => setClosedKey(quiz.key)}>닫기</button></header>
      {quiz.phase === 'soon' && <p>곧 문제가 나옵니다. 답은 앞쪽 바닥의 1~4번 구역에 서서 고릅니다.</p>}
      {quiz.phase !== 'soon' && question && <>
        <img src={question.image} alt={question.title}/>
        {quiz.phase === 'ask' && <p>정답이라고 생각하는 번호의 구역으로 이동해 서 주세요.</p>}
        {quiz.phase === 'reveal' && result && <p className={`room-quiz-result is-${result.verdict}`} role="status"><b>정답 {result.answer}번</b> {VERDICT_TEXT[result.verdict]}{result.zone ? ` 선택 ${result.zone}번` : ''}</p>}
      </>}
    </section>}
  </>;
}
