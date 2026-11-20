// 스터디카페 효과음. 소리 파일 없이 Web Audio로 만듦. 소리 설정이 켜져 있을 때만 남.
const KEY = 'na2-study:sound';
let context = null;
let enabled = false;
try { enabled = window.localStorage.getItem(KEY) === 'on'; } catch { enabled = false; }

export function soundOn() { return enabled; }
export function setSound(value) {
  enabled = Boolean(value);
  try { window.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* 저장하지 못해도 이번 접속에서는 적용 */ }
  if (enabled) { audio()?.resume?.(); play('on'); }
}
function audio() {
  if (context) return context;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { context = new Ctor(); } catch { context = null; }
  return context;
}
// 음 하나: 부드럽게 시작해 서서히 사라짐
function note(ctx, frequency, at, length, volume = 0.07, type = 'sine') {
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = type; osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination); osc.start(at); osc.stop(at + length + 0.05);
}
const TUNES = {
  on: [[660, 0, 0.18], [880, 0.12, 0.3]],
  // 누가 들어옴: 문에 달린 작은 종
  enter: [[1568, 0, 0.5, 0.04, 'triangle'], [2093, 0.09, 0.6, 0.035, 'triangle'], [1568, 0.32, 0.5, 0.025, 'triangle']],
  quiz: [[784, 0, 0.16], [988, 0.14, 0.16], [1175, 0.28, 0.4]],
  right: [[784, 0, 0.14], [1047, 0.12, 0.14], [1319, 0.24, 0.5]],
  wrong: [[392, 0, 0.25], [330, 0.2, 0.45]],
  // 집중 시작: 올라가는 두 음, 휴식 시작: 내려가는 세 음
  focus: [[523, 0, 0.25], [784, 0.2, 0.5]],
  rest: [[784, 0, 0.3], [659, 0.25, 0.3], [523, 0.5, 0.7]],
};
export function play(name) {
  if (!enabled || !TUNES[name]) return;
  const ctx = audio(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const start = ctx.currentTime + 0.02;
  for (const [frequency, offset, length, volume, type] of TUNES[name]) note(ctx, frequency, start + offset, length, volume, type);
}
