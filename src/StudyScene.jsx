import { useEffect, useRef, useState } from 'react';
import { createStudyScene } from './study-scene.js';
import { SEATS, formatDuration } from './study-room-model.mjs';
import { autoQuiz, practiceQuiz, questionIndex, questionFile, cleanQuestion, verdict, countdown } from './study-quiz-model.mjs';
import { focusState, focusLabel } from './study-focus-model.mjs';
import { play, setSound, soundOn } from './study-sfx.js';

const QUIZ_BASE = `${import.meta.env.BASE_URL}data/quiz/`;
const TALL = '(max-width: 640px) and (orientation: portrait)';
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
  const [quiz, setQuiz] = useState({ phase: 'idle', remain: 0, practice: false, key: '' });
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [closedKey, setClosedKey] = useState('');
  const practice = useRef(null);
  const count = useRef(null);
  const loaded = useRef({ key: '', question: null });
  const lastPhase = useRef('idle');
  // 함께 집중 타이머와 소리
  const [focus, setFocus] = useState(() => { const state = focusState(Date.now()); return { mode: state.mode, left: countdown(state.remain) }; });
  const lastMode = useRef(null);
  const [sound, setSoundState] = useState(soundOn);
  // 세로로 긴 휴대폰 화면: 조이스틱을 두고 버튼은 메뉴로 접음
  const [portrait, setPortrait] = useState(() => window.matchMedia?.(TALL).matches ?? false);
  const [more, setMore] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickOn = useRef(false);
  useEffect(() => {
    const query = window.matchMedia?.(TALL); if (!query) return undefined;
    const change = () => { setPortrait(query.matches); setMore(false); scene.current?.setStick(0, 0); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

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
        onEnter: () => play('enter'),
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

  // 집중 타이머와 돌발퀴즈: 시각만으로 단계를 정하므로 모두 같은 때 같은 화면을 봄
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
      const timer = focusState(now); const left = countdown(timer.remain);
      if (lastMode.current && lastMode.current !== timer.mode) play(timer.mode === 'focus' ? 'focus' : 'rest');
      lastMode.current = timer.mode;
      setFocus(previous => (previous.mode === timer.mode && previous.left === left ? previous : { mode: timer.mode, left }));

      let state = practice.current ? practiceQuiz(now, practice.current.at, practice.current.seed) : autoQuiz(now);
      if (practice.current && state.phase === 'idle') { practice.current = null; state = autoQuiz(now); }
      const key = state.phase === 'idle' ? '' : `${state.practice ? 'p' : 'a'}${state.slot}`;
      if (key && loaded.current.key !== key) { setQuestion(null); setResult(null); load(key, state.slot); }
      const ready = Boolean(key && loaded.current.key === key && loaded.current.question);
      const phase = state.phase === 'idle' || (state.phase !== 'soon' && !ready) ? 'idle' : state.phase;
      if (phase !== lastPhase.current) {
        if (phase === 'reveal') {
          const answer = loaded.current.question.answer; const zone = scene.current?.myZone() ?? null;
          const outcome = verdict(zone, answer);
          setResult({ answer, zone, verdict: outcome });
          scene.current?.setQuiz({ active: true, answer });
          if (outcome !== 'none') play(outcome);
        } else {
          scene.current?.setQuiz({ active: phase !== 'idle', answer: null });
          if (phase === 'ask') play('quiz');
        }
        lastPhase.current = phase;
      }
      setQuiz(previous => (previous.phase === phase && previous.remain === state.remain && previous.key === key
        ? previous : { phase, remain: state.remain, practice: state.practice, key }));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => { stopped = true; clearInterval(id); scene.current?.setQuiz({ active: false }); };
  }, [broken]);

  if (broken) return <p className="room-loading" role="status">이 기기에서는 3D 화면을 표시할 수 없습니다. 접속자 목록은 함께 공부 창에서 확인할 수 있습니다.</p>;
  const running = quiz.phase !== 'idle';
  const toggleSound = () => { const next = !sound; setSound(next); setSoundState(next); };
  // 조이스틱: 누른 곳에서 끈 방향과 거리만큼 걸음
  const stickMove = event => {
    const pad = event.currentTarget.getBoundingClientRect(); const limit = pad.width / 2 - 18;
    let dx = event.clientX - (pad.left + pad.width / 2); let dy = event.clientY - (pad.top + pad.height / 2);
    const length = Math.hypot(dx, dy); if (length > limit) { dx = (dx / length) * limit; dy = (dy / length) * limit; }
    setKnob({ x: dx, y: dy }); scene.current?.setStick(dx / limit, dy / limit);
  };
  const stickDown = event => { event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* 지원하지 않는 기기 */ } stickOn.current = true; stickMove(event); };
  const stickUp = () => { stickOn.current = false; setKnob({ x: 0, y: 0 }); scene.current?.setStick(0, 0); };
  return <div className={`room-ui ${portrait ? 'is-portrait' : ''} ${more ? 'is-more' : ''}`}>
    <div className="room-canvas" ref={host}/>
    <div className="room-quiz-chip">
      <span className={`room-focus is-${focus.mode}`}>{focusLabel(focus.mode)} <b>{focus.left}</b></span>
      {!running && <button type="button" className="room-extra" onClick={() => { practice.current = { at: Date.now(), seed: Math.floor(Math.random() * 1e6) }; setClosedKey(''); setMore(false); }}>연습 퀴즈</button>}
      <button type="button" className="room-extra" aria-pressed={sound} onClick={toggleSound}>{sound ? '소리 켜짐' : '소리 꺼짐'}</button>
      {portrait && <button type="button" aria-expanded={more} onClick={() => setMore(value => !value)}>{more ? '메뉴 닫기' : '메뉴'}</button>}
    </div>
    <div className="room-pad room-pad-emote room-extra" role="group" aria-label="인사와 응원">
      <button type="button" onClick={() => scene.current?.emote(1)} title="인사 (1)">인사</button>
      <button type="button" onClick={() => scene.current?.emote(2)} title="박수 (2)">박수</button>
      <button type="button" onClick={() => scene.current?.emote(3)} title="응원 (3)">응원</button>
    </div>
    <div className="room-pad room-pad-view room-extra" role="group" aria-label="시점">
      <button type="button" onClick={() => scene.current?.turnView(0.42)} aria-label="왼쪽으로 돌리기" title="왼쪽으로 돌리기 (Q)">↺</button>
      <button type="button" onClick={() => scene.current?.turnView(-0.42)} aria-label="오른쪽으로 돌리기" title="오른쪽으로 돌리기 (E)">↻</button>
      <button type="button" onClick={() => scene.current?.zoomView(1.3)} aria-label="확대" title="확대 (+ · 휠)">＋</button>
      <button type="button" onClick={() => scene.current?.zoomView(1 / 1.3)} aria-label="축소" title="축소 (− · 휠)">－</button>
      <button type="button" onClick={() => scene.current?.resetView()} aria-label="처음 시점" title="처음 시점 (0)">처음</button>
    </div>
    {portrait && <>
      <div className="room-stick" role="application" aria-label="이동 조이스틱" onPointerDown={stickDown} onPointerMove={event => { if (stickOn.current) stickMove(event); }} onPointerUp={stickUp} onPointerCancel={stickUp}>
        <span style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}/>
      </div>
      <p className="room-rotate-hint">조이스틱이나 바닥을 눌러 이동하고, 빈 자리를 누르면 앉습니다. 두 손가락으로 확대합니다. 가로로 돌리면 방 전체가 보입니다.</p>
    </>}
    {running && closedKey !== quiz.key && <section className="room-quiz" aria-label="돌발퀴즈">
      <header><h3>돌발퀴즈{quiz.practice ? ' · 연습' : ''}</h3><span>{quiz.phase === 'soon' ? `${quiz.remain}초 뒤 시작` : quiz.phase === 'ask' ? `남은 시간 ${quiz.remain}초` : '정답 공개'}</span><button type="button" onClick={() => setClosedKey(quiz.key)}>닫기</button></header>
      {quiz.phase === 'soon' && <p>곧 문제가 나옵니다. 답은 앞쪽 바닥의 1~4번 구역에 서서 고릅니다.</p>}
      {quiz.phase !== 'soon' && question && <>
        <img src={question.image} alt={question.title}/>
        {quiz.phase === 'ask' && <p>정답이라고 생각하는 번호의 구역으로 이동해 서 주세요.</p>}
        {quiz.phase === 'reveal' && result && <p className={`room-quiz-result is-${result.verdict}`} role="status"><b>정답 {result.answer}번</b> {VERDICT_TEXT[result.verdict]}{result.zone ? ` 선택 ${result.zone}번` : ''}</p>}
      </>}
    </section>}
  </div>;
}
