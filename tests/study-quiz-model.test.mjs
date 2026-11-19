import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { QUIZ_EVERY, SOON_MS, ASK_MS, REVEAL_MS, autoQuiz, practiceQuiz, questionIndex, questionFile, cleanQuestion, verdict, countdown } from '../src/study-quiz-model.mjs';
import { QUIZ_ZONES, zoneOf, blocked, findPath, ENTRANCE } from '../src/study-cafe-map.mjs';

const T0 = 1000 * QUIZ_EVERY; // 30분 경계

test('정시 퀴즈: 예고, 문제, 정답 공개, 대기 순으로 진행', () => {
  assert.deepEqual([autoQuiz(T0).phase, autoQuiz(T0).remain, autoQuiz(T0).slot], ['soon', 15, 1000]);
  assert.equal(autoQuiz(T0 + SOON_MS).phase, 'ask');
  assert.equal(autoQuiz(T0 + SOON_MS).remain, 30);
  assert.equal(autoQuiz(T0 + SOON_MS + ASK_MS - 1).phase, 'ask');
  assert.equal(autoQuiz(T0 + SOON_MS + ASK_MS).phase, 'reveal');
  assert.equal(autoQuiz(T0 + SOON_MS + ASK_MS + REVEAL_MS).phase, 'idle');
  assert.equal(autoQuiz(T0 - 1).phase, 'idle');
  assert.equal(autoQuiz(T0 - 1).slot, 999);
  assert.equal(autoQuiz(T0 + 60_000).next, QUIZ_EVERY - 60_000);
});

test('같은 시각이면 누구나 같은 문제, 30분마다 다른 문제', () => {
  assert.equal(questionIndex(autoQuiz(T0 + 5).slot, 160), questionIndex(autoQuiz(T0 + 40_000).slot, 160));
  const seen = new Set(); for (let slot = 1000; slot < 1160; slot += 1) seen.add(questionIndex(slot, 160));
  assert.equal(seen.size, 160, '160번 동안 모든 문항이 한 번씩 나옴');
  assert.equal(questionIndex(5, 0), -1);
  assert.equal(questionFile(7), 'q007.json');
});

test('연습 퀴즈는 누른 시각부터 짧은 예고 뒤 시작', () => {
  assert.equal(practiceQuiz(5000, 5000, 42).phase, 'soon');
  assert.equal(practiceQuiz(5000 + 3000, 5000, 42).phase, 'ask');
  assert.equal(practiceQuiz(5000 + 3000 + ASK_MS + REVEAL_MS, 5000, 42).phase, 'idle');
  assert.equal(practiceQuiz(9000, 5000, 42).practice, true);
});

test('판정과 표시', () => {
  assert.equal(verdict(2, 2), 'right'); assert.equal(verdict(3, 2), 'wrong'); assert.equal(verdict(null, 2), 'none');
  assert.equal(countdown(125_000), '02:05'); assert.equal(countdown(-5), '00:00');
  assert.equal(cleanQuestion({ id: 'a', title: 't', answer: 5, image: 'data:image/webp;base64,x' }), null);
  assert.equal(cleanQuestion({ id: 'a', title: 't', answer: 2, image: 'https://example.com/x.png' }), null);
  assert.equal(cleanQuestion(null), null);
});

test('답 구역 네 곳은 서로 겹치지 않고 걸어갈 수 있는 바닥에 있음', () => {
  assert.deepEqual(QUIZ_ZONES.map(zone => zone.n), [1, 2, 3, 4]);
  for (const zone of QUIZ_ZONES) {
    assert.equal(zoneOf(zone.x, zone.z), zone.n);
    for (const [dx, dz] of [[0, 0], [zone.w / 2 - 0.1, zone.d / 2 - 0.1], [-zone.w / 2 + 0.1, -zone.d / 2 + 0.1]]) assert.equal(blocked(zone.x + dx, zone.z + dz), false, `${zone.n}번 구역`);
    assert.ok(findPath(ENTRANCE, { x: zone.x, z: zone.z }).length > 0);
  }
  assert.equal(zoneOf((QUIZ_ZONES[0].x + QUIZ_ZONES[1].x) / 2, QUIZ_ZONES[0].z), null, '구역 사이는 어느 답도 아님');
  assert.equal(zoneOf(ENTRANCE.x, ENTRANCE.z), null, '입구에 서 있는 것만으로 답이 되지 않음');
  assert.equal(zoneOf(0, 0), null);
});

test('퀴즈 문항 파일: 개수와 형식이 맞고 정답이 1~4', () => {
  const dir = new URL('../public/data/quiz/', import.meta.url);
  const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
  const files = readdirSync(dir).filter(name => /^q\d{3}\.json$/.test(name));
  assert.equal(files.length, index.count);
  assert.ok(index.count >= 100);
  for (let i = 0; i < index.count; i += 1) {
    const item = cleanQuestion(JSON.parse(readFileSync(new URL(questionFile(i), dir), 'utf8')));
    assert.ok(item, questionFile(i));
    assert.ok(item.title.length > 3);
  }
});
