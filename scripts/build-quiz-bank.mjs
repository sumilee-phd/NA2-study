// 스터디카페 돌발퀴즈용 문항을 필기 문제은행에서 뽑아 한 문제씩 작은 파일로 저장함.
// 실행: node scripts/build-quiz-bank.mjs   (public/data/bank.json이 바뀌면 다시 실행)
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PER_SUBJECT = 40;
const MAX_HEIGHT = 150; // 원본 PDF에서 문항이 차지한 높이(pt). 길거나 그림이 큰 문항은 뺌
const MAX_IMAGE = 30000; // 문항 이미지(data URI) 글자 수 상한
const bank = JSON.parse(readFileSync(fileURLToPath(new URL('../public/data/bank.json', import.meta.url)), 'utf8'));
const out = fileURLToPath(new URL('../public/data/quiz/', import.meta.url));

const height = question => question.parts[0].rect[3] - question.parts[0].rect[1];
const eligible = bank.questions.filter(question => question.parts.length === 1 && question.images.length === 1
  && [1, 2, 3, 4].includes(question.answer) && height(question) <= MAX_HEIGHT && question.images[0].length <= MAX_IMAGE);

// 과목별로 고르게, 시험 회차가 섞이도록 id 순으로 일정 간격을 두고 뽑음
const bySubject = new Map();
for (const question of eligible) { if (!bySubject.has(question.subject)) bySubject.set(question.subject, []); bySubject.get(question.subject).push(question); }
const picked = [];
for (const [, list] of [...bySubject].sort((a, b) => a[0].localeCompare(b[0], 'ko'))) {
  list.sort((a, b) => a.id.localeCompare(b.id));
  const take = Math.min(PER_SUBJECT, list.length);
  for (let i = 0; i < take; i += 1) picked.push(list[Math.floor((i * list.length) / take)]);
}
// 과목이 번갈아 나오도록 섞되, 실행할 때마다 같은 순서가 되게 함
picked.sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));

// 이 PC의 Node는 한글 경로에서 폴더째 지우기(rmSync recursive)가 멈추므로 파일을 하나씩 지움
mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) if (name.endsWith('.json')) unlinkSync(out + name);
picked.forEach((question, index) => {
  const item = { id: question.id, exam: question.exam, number: question.number, subject: question.subject, title: question.title.replace(/\s+/g, ' ').trim(), answer: question.answer, image: question.images[0] };
  writeFileSync(`${out}q${String(index).padStart(3, '0')}.json`, JSON.stringify(item));
});
writeFileSync(`${out}index.json`, JSON.stringify({ count: picked.length, subjects: Object.fromEntries([...bySubject].map(([subject]) => [subject, picked.filter(q => q.subject === subject).length])) }));
console.log(`돌발퀴즈 문항 ${picked.length}개 저장 (${readdirSync(out).length - 1}개 파일)`);
