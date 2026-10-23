import test from 'node:test';
import assert from 'node:assert/strict';
import { LABS, LAB_BY_ID, labFromPath } from '../src/content/practical-labs.mjs';
import { practicalSection } from '../src/content/practical.mjs';
import { TOPICS } from '../src/content/learning.mjs';
import { LAB_STORAGE_KEY, normalizeLabAnswer, gradeLab, freshLabState, freshLabEntry, loadLabState, persistLabState, validateLabState, updateLabEntry, completedLabs } from '../src/practical-lab-model.mjs';

const answers = lab => Object.fromEntries(lab.checks.map(check => [check.id, check.expected]));
const value = (id, field) => LAB_BY_ID[id].checks.find(check => check.id === field).expected;
const store = initial => { const map = new Map(Object.entries(initial || {})); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
const ipNumber = ip => ip.split('.').reduce((n, octet) => (n << 8n) + BigInt(octet), 0n);
const ipString = n => [24n, 16n, 8n, 0n].map(shift => Number((n >> shift) & 255n)).join('.');

test('eight source-grounded labs have unique identifiers and valid theory links', () => {
  assert.equal(LABS.length, 8);
  assert.equal(LABS.filter(lab => lab.group === 'windows').length, 4);
  assert.equal(LABS.flatMap(lab => lab.checks).length, 44);
  assert.equal(new Set(LABS.map(lab => lab.id)).size, 8);
  const allowed = new Set(['www.icqa.or.kr', 'www.cisco.com', 'learn.microsoft.com', 'www.rfc-editor.org']);
  for (const lab of LABS) {
    assert.ok(lab.steps.length && lab.solution.length && lab.pitfalls.length && lab.sourceNotes.length);
    assert.equal(new Set(lab.checks.map(check => check.id)).size, lab.checks.length);
    assert.ok(lab.sourcePages.every(page => Number.isInteger(page) && page > 0 && page <= 474));
    assert.ok(lab.relatedTheory.every(id => TOPICS.some(topic => topic.id === id)));
    for (const source of lab.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(allowed.has(url.hostname), source.url);
      assert.equal(source.checkedAt, '2026-10-23');
    }
    for (const check of lab.checks) {
      assert.ok(check.explanation);
      assert.notEqual(normalizeLabAnswer(check.kind, check.expected), null, check.id);
      if (check.kind === 'choice') assert.ok(check.options.some(option => option.value === check.expected));
    }
  }
});

test('all canonical answers pass, blank and wrong fields do not', () => {
  for (const lab of LABS) {
    assert.ok(gradeLab(lab, answers(lab)).passed, lab.id);
    assert.equal(gradeLab(lab).correct, 0);
    const incorrect = { ...answers(lab), [lab.checks[0].id]: 'incorrect' };
    assert.equal(gradeLab(lab, incorrect).correct, lab.checks.length - 1);
    assert.equal(gradeLab(lab, incorrect).passed, false);
  }
});

test('CIDR and contiguous masks normalize to the same value; invalid masks fail', () => {
  for (const [prefix, mask] of [[0, '0.0.0.0'], [25, '255.255.255.128'], [26, '255.255.255.192'], [29, '255.255.255.248'], [32, '255.255.255.255']]) {
    assert.equal(normalizeLabAnswer('mask', `/${prefix}`), mask);
    assert.equal(normalizeLabAnswer('mask', mask), mask);
  }
  for (const invalid of ['/33', '/-1', '/029', '255.0.255.0', '255.255.255.127', '255.256.0.0', '29']) assert.equal(normalizeLabAnswer('mask', invalid), null, invalid);
});

test('IPv4 rejects ambiguous octets and malformed addresses', () => {
  assert.equal(normalizeLabAnswer('ipv4', ' 192.168.50.18 '), '192.168.50.18');
  for (const invalid of ['192.168.050.18', '256.0.0.1', '1.2.3', '1.2.3.4.5', '1.2.3.-1', '1.2.3.4/24']) assert.equal(normalizeLabAnswer('ipv4', invalid), null);
});

test('DNS names allow case and terminal dot, but not spaces or IP-like substitutions for names', () => {
  assert.equal(normalizeLabAnswer('dns-name', ' WEB01.LAB.EXAMPLE. '), 'web01.lab.example');
  for (const invalid of ['web01..lab.example', '-host.lab.example', 'web 01.lab.example']) assert.equal(normalizeLabAnswer('dns-name', invalid), null);
  const lab = LAB_BY_ID['windows-dns-records'];
  const response = answers(lab);
  response['host-fqdn'] = 'WEB01.LAB.EXAMPLE.';
  assert.ok(gradeLab(lab, response).passed);
  response['host-fqdn'] = '192.168.60.20';
  assert.equal(gradeLab(lab, response).passed, false);
});

test('integer inputs require safe whole numbers and text preserves hostname case', () => {
  assert.equal(normalizeLabAnswer('integer', ' 006 '), '6');
  for (const invalid of ['6.0', '6시간', '6e0', '-6', '9007199254740992']) assert.equal(normalizeLabAnswer('integer', invalid), null);
  const lab = LAB_BY_ID['router-basics'];
  assert.equal(gradeLab(lab, { ...answers(lab), 'router-basics-hostname': 'lab-r1' }).passed, false);
});

test('IPv4 subnet answers agree with independent bitwise network and broadcast calculation', () => {
  const addr = ipNumber(value('windows-ipv4', 'server-ip'));
  const mask = ipNumber(value('windows-ipv4', 'subnet-mask'));
  const network = addr & mask;
  assert.equal(ipString(network), value('windows-ipv4', 'network-address'));
  assert.equal(ipString(network | (0xffffffffn ^ mask)), value('windows-ipv4', 'broadcast-address'));
  assert.equal(value('windows-dhcp', 'available-count'), String((126 - 1 + 1) - (10 - 1 + 1)));
  assert.equal(value('windows-dhcp', 'lease-hours'), '6');
});

test('lab routes accept only known exact identifiers and reject inherited names', () => {
  for (const lab of LABS) assert.equal(labFromPath(`/practical/lab/${lab.id}`), lab);
  for (const path of ['/practical/lab/constructor', '/practical/lab/__proto__', '/practical/lab/missing', '/practical/lab/windows-ipv4/extra']) assert.equal(labFromPath(path), null);
  assert.equal(practicalSection('/practical/lab/windows-ipv4'), 'lab');
  assert.equal(practicalSection('/cabling/pins'), 'work');
});

test('draft and checked state survive serialization without touching existing modules', () => {
  const storage = store({ na2_study_written_v1: 'written', na2_study_cabling_v1: 'cabling', na2_study_practical_v1: 'quiz', na2_study_learning_v1: 'learning' });
  const initial = loadLabState(storage);
  let state = updateLabEntry(initial.state, 'windows-ipv4', { answers: { 'server-ip': '192.168.50.' } });
  assert.equal(persistLabState(storage, state, initial.observed).ok, true);
  assert.equal(loadLabState(storage).state.entries['windows-ipv4'].answers['server-ip'], '192.168.50.');
  const observed = storage.getItem(LAB_STORAGE_KEY);
  state = updateLabEntry(state, 'windows-ipv4', { answers: answers(LAB_BY_ID['windows-ipv4']), checked: true, usedSolution: true });
  assert.equal(persistLabState(storage, state, observed).ok, true);
  assert.deepEqual(loadLabState(storage).state, state);
  assert.equal(completedLabs(state).length, 1);
  state = updateLabEntry(state, 'windows-ipv4', { checked: false });
  assert.equal(completedLabs(state).length, 0);
  for (const [key, expected] of [['written','written'], ['cabling','cabling'], ['practical','quiz'], ['learning','learning']]) assert.equal(storage.getItem(`na2_study_${key}_v1`), expected);
});

test('corrupt, future and oversized stored data is preserved with saving disabled', () => {
  for (const raw of ['', '{broken', '{"version":2,"entries":{}}', 'x'.repeat(100001)]) {
    const storage = store({ [LAB_STORAGE_KEY]: raw });
    const result = loadLabState(storage);
    assert.equal(result.canSave, false);
    assert.ok(result.warning);
    assert.equal(storage.getItem(LAB_STORAGE_KEY), raw);
  }
});

test('unknown fields, invalid types and oversized answers are rejected', () => {
  for (const entry of [null, { ...freshLabEntry(), checked: 'yes' }, { ...freshLabEntry(), answers: { fake: 'x' } }, { ...freshLabEntry(), answers: { 'server-ip': 'x'.repeat(241) } }]) {
    assert.throws(() => validateLabState({ version: 1, entries: { 'windows-ipv4': entry } }));
  }
  assert.throws(() => updateLabEntry(freshLabState(), 'constructor', {}));
  assert.throws(() => validateLabState(JSON.parse('{"version":1,"entries":{"__proto__":{"answers":{},"checked":false,"usedSolution":false}}}')));
});

test('write conflicts never overwrite a different tab and quota errors retain in-memory answers', () => {
  const state = updateLabEntry(freshLabState(), 'router-basics', { answers: { 'router-basics-hostname': 'LAB-R1' } });
  const storage = store({ [LAB_STORAGE_KEY]: 'other-tab' });
  assert.equal(persistLabState(storage, state, null).ok, false);
  assert.equal(storage.getItem(LAB_STORAGE_KEY), 'other-tab');
  const broken = { getItem: () => null, setItem() { throw new Error('quota'); } };
  assert.equal(persistLabState(broken, state, null).ok, false);
  assert.equal(state.entries['router-basics'].answers['router-basics-hostname'], 'LAB-R1');
  assert.equal(loadLabState({ getItem() { throw new Error('blocked'); } }).canSave, false);
});
