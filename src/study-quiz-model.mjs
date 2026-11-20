// 스터디카페 돌발퀴즈: 시각으로 단계와 문제 번호를 정함. 진행자나 서버 없이 모두가 같은 문제를 봄.
export const QUIZ_EVERY = 30 * 60 * 1000;
export const QUIZ_OFFSET = 25 * 60 * 1000; // 매시 25분과 55분: 집중 타이머의 쉬는 시간이 시작될 때
export const SOON_MS = 15000; // 예고
export const ASK_MS = 30000; // 문제 풀이
export const REVEAL_MS = 15000; // 정답 공개
const PRACTICE_SOON = 3000;

function phaseAt(elapsed, soon) {
  if (elapsed < 0) return { phase: 'idle', remain: 0 };
  if (elapsed < soon) return { phase: 'soon', remain: Math.ceil((soon - elapsed) / 1000) };
  if (elapsed < soon + ASK_MS) return { phase: 'ask', remain: Math.ceil((soon + ASK_MS - elapsed) / 1000) };
  if (elapsed < soon + ASK_MS + REVEAL_MS) return { phase: 'reveal', remain: Math.ceil((soon + ASK_MS + REVEAL_MS - elapsed) / 1000) };
  return { phase: 'idle', remain: 0 };
}

// 정시 퀴즈의 현재 단계. slot은 30분 단위 번호로, 같은 시각이면 누구에게나 같음
export function autoQuiz(now) {
  const slot = Math.floor((now - QUIZ_OFFSET) / QUIZ_EVERY);
  const start = slot * QUIZ_EVERY + QUIZ_OFFSET;
  const state = phaseAt(now - start, SOON_MS);
  return { ...state, slot, practice: false, next: start + QUIZ_EVERY - now };
}
// 혼자 바로 풀어 보는 연습 퀴즈. startedAt은 버튼을 누른 시각
export function practiceQuiz(now, startedAt, seed) {
  const state = phaseAt(now - startedAt, PRACTICE_SOON);
  return { ...state, slot: seed, practice: true, next: 0 };
}

// 문제 번호: 30분마다 문항 목록을 고르게 돌도록 큰 소수로 건너뜀
export function questionIndex(slot, count) {
  if (!Number.isInteger(count) || count <= 0) return -1;
  return Number((BigInt(Math.abs(Math.floor(slot))) * 7919n) % BigInt(count));
}
export function questionFile(index) { return `q${String(index).padStart(3, '0')}.json`; }

export function cleanQuestion(value) {
  if (!value || typeof value !== 'object') return null;
  const { id, subject, title, answer, image } = value;
  if (typeof id !== 'string' || typeof title !== 'string' || ![1, 2, 3, 4].includes(answer)) return null;
  if (typeof image !== 'string' || !image.startsWith('data:image/')) return null;
  return { id, subject: typeof subject === 'string' ? subject : '', title, answer, image };
}

export function verdict(zone, answer) { return zone == null ? 'none' : zone === answer ? 'right' : 'wrong'; }
export function countdown(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
