// 함께 집중 타이머: 시각만으로 집중과 휴식을 정해 모두가 같은 시간표를 봄(서버 없음).
// 매시 00~25분, 30~55분은 집중이고 25~30분, 55~00분은 휴식. 돌발퀴즈는 휴식이 시작될 때 열림.
export const FOCUS_MS = 25 * 60 * 1000;
export const BREAK_MS = 5 * 60 * 1000;
export const CYCLE_MS = FOCUS_MS + BREAK_MS;

export function focusState(now) {
  const index = Math.floor(now / CYCLE_MS);
  const elapsed = now - index * CYCLE_MS;
  const focusing = elapsed < FOCUS_MS;
  return { mode: focusing ? 'focus' : 'break', remain: (focusing ? FOCUS_MS : CYCLE_MS) - elapsed, index };
}
export function focusLabel(mode) { return mode === 'focus' ? '집중 시간' : '쉬는 시간'; }
