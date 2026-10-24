import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LABS, labFromPath } from '../src/content/practical-labs.mjs';
import { practicalSection } from '../src/content/practical.mjs';
import { LAB_VERIFICATION, LAB_VERIFICATION_PATH } from '../src/content/lab-verification.mjs';
import { documentSummary, renderVerificationSummary, REPORT_URL } from '../scripts/sync-lab-verification.mjs';

test('verification covers exactly the existing labs without becoming a scored lab', () => {
  const ids = LAB_VERIFICATION.rows.map(row => row.labId);
  assert.deepEqual(ids, LABS.map(lab => lab.id));
  assert.equal(new Set(ids).size, 8);
  assert.equal(LABS.flatMap(lab => lab.checks).length, 44);
  for (const row of LAB_VERIFICATION.rows) {
    assert.ok(labFromPath(`/practical/lab/${row.labId}`));
    assert.ok(row.title && row.icqa.label && row.icqa.detail && row.packetTracer.label && row.limit);
  }
  assert.equal(practicalSection(LAB_VERIFICATION_PATH), 'lab');
  assert.equal(labFromPath(LAB_VERIFICATION_PATH), null);
  assert.deepEqual(LAB_VERIFICATION.rows.filter(row => row.packetTracer.state === 'confirmed').map(row => row.labId), ['router-access']);
  assert.equal(LAB_VERIFICATION.rows.find(row => row.labId === 'router-interface').packetTracer.state, 'preparation');
});

test('published Markdown summary matches the content rendered by the site', () => {
  assert.equal(documentSummary(readFileSync(REPORT_URL, 'utf8')), renderVerificationSummary());
  const text = JSON.stringify(LAB_VERIFICATION);
  assert.ok(text.includes('330.4초 초과~344.2초 이하'));
  assert.ok(text.includes('정확히 330초에 종료됐다는 검증은 아닙니다'));
  assert.ok(text.includes('관리자 권한 런처'));
  assert.ok(text.includes('startup-config is not present'));
});
