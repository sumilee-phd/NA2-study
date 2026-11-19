// 함께 공부 3D 스터디카페. three만 사용하고 화면(React)과 분리함.
// 좌석 10개, 사람마다 닉네임 해시로 생김새를 정함. 공부 중이면 스탠드가 켜지고 필기 동작을 함.
import * as THREE from 'three';
import { BENCH_SPOT, ENTRANCE, WALK_SPEED, findPath, seatAnchor, seatEntry, seatSpot, slide } from './study-cafe-map.mjs';

const FPS = 20;

function hash(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function toon(color, extra) { return new THREE.MeshToonMaterial({ color, ...extra }); }
function box(w, h, d, material) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.castShadow = true; m.receiveShadow = true; return m; }
function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

function skyColors(hour) {
  if (hour >= 7 && hour < 17) return ['#bfe3f5', '#eaf6fb'];
  if (hour >= 17 && hour < 19) return ['#f5b98a', '#fbe3c4'];
  if (hour >= 5 && hour < 7) return ['#f3c9b0', '#dfe9f2'];
  return ['#1c2b4a', '#33466b'];
}

function labelTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return { canvas, texture, text: '' };
}
function drawLabel(label, name, time, state, me) {
  const text = `${name}|${time}|${state}|${me}`;
  if (label.text === text) return;
  label.text = text;
  const c = label.canvas.getContext('2d'); const w = label.canvas.width; const h = label.canvas.height;
  c.clearRect(0, 0, w, h);
  c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 22);
  c.fillStyle = me ? '#103b37' : '#ffffff'; c.fill();
  c.lineWidth = 6; c.strokeStyle = me ? '#a8e5c8' : '#ccd8d1'; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = me ? '#ffffff' : '#192d33';
  c.font = '600 46px "NA2 Paperlogy", "Malgun Gothic", sans-serif';
  c.fillText(name, w / 2, 56, w - 40);
  c.fillStyle = me ? '#a8e5c8' : state === '공부 중' ? '#087a61' : '#687779';
  c.font = '600 40px "NA2 Paperlogy", "Malgun Gothic", sans-serif';
  c.fillText(`${time} · ${state}`, w / 2, 112, w - 40);
  label.texture.needsUpdate = true;
}

// 케이블 제작 순서 안내판(T568B). 색 순서는 실기 모듈(src/modules/cabling/content.mjs)과 같음.
const WIRES = [
  { name: '흰주황', color: '#e8862e', striped: true }, { name: '주황', color: '#e8862e' },
  { name: '흰초록', color: '#3f9b57', striped: true }, { name: '파랑', color: '#2f79c4' },
  { name: '흰파랑', color: '#2f79c4', striped: true }, { name: '초록', color: '#3f9b57' },
  { name: '흰갈색', color: '#8a5a3c', striped: true }, { name: '갈색', color: '#8a5a3c' },
];
// 피복을 벗긴 직후에는 쌍끼리 붙어 있음: 주황 쌍, 초록 쌍, 파랑 쌍, 갈색 쌍. 값은 T568B에서 갈 자리
const PAIR_SLOT = [0, 1, 2, 4, 5, 3, 6, 7];
const CABLE_STEPS = [
  ['피복 벗기기', 2.2], ['T568B 순서로 펴기', 3.6], ['끝을 가지런히 자르기', 1.8],
  ['RJ-45 커넥터에 끼우기', 2.2], ['랜툴로 압착하기', 1.8], ['테스터로 1~8번 확인', 3.6],
];
const CABLE_TOTAL = CABLE_STEPS.reduce((sum, step) => sum + step[1], 0);
const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function drawCableSteps(canvas, seconds) {
  const c = canvas.getContext('2d'); const W = canvas.width; const H = canvas.height;
  let rest = seconds % CABLE_TOTAL; let step = 0;
  while (step < CABLE_STEPS.length - 1 && rest >= CABLE_STEPS[step][1]) { rest -= CABLE_STEPS[step][1]; step += 1; }
  const p = rest / CABLE_STEPS[step][1];
  const font = (size, weight = 600) => `${weight} ${size}px "NA2 Paperlogy", "Malgun Gothic", sans-serif`;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 20); c.fill();
  c.lineWidth = 5; c.strokeStyle = '#103b37'; c.stroke();
  c.fillStyle = '#103b37'; c.beginPath(); c.roundRect(4, 4, W - 8, 64, [20, 20, 0, 0]); c.fill();
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = font(30, 700);
  c.fillText(`${step + 1}. ${CABLE_STEPS[step][0]}`, 28, 38);
  c.textAlign = 'right'; c.fillStyle = '#a8e5c8'; c.font = font(24); c.fillText(`T568B · ${step + 1} / ${CABLE_STEPS.length}`, W - 28, 38);

  const top = 96; const gap = 30; const left = 60; const strip = 250; const tip = 420;
  const stripped = step === 0 ? ease(p) : 1; // 피복이 물러난 정도
  const sorted = step < 1 ? 0 : step === 1 ? ease(p) : 1; // 색 순서가 맞춰진 정도
  const cut = step < 2 ? 0 : step === 2 ? ease(p) : 1;
  const plugged = step < 3 ? 0 : step === 3 ? ease(p) : 1;
  const crimp = step === 4 ? Math.sin(Math.min(1, p * 1.4) * Math.PI) : 0;

  // 전선 8가닥
  WIRES.forEach((wire, index) => {
    const from = PAIR_SLOT.indexOf(index); const slot = from + (index - from) * sorted;
    const y = top + slot * gap + 13;
    const ragged = ((index * 37) % 5) * 9; const end = tip + 40 + ragged * (1 - cut) - 40 * cut;
    const start = strip + (1 - stripped) * 190;
    if (end > start) {
      c.lineCap = 'round'; c.lineWidth = 15; c.strokeStyle = wire.striped ? '#ffffff' : wire.color;
      c.beginPath(); c.moveTo(start, y); c.lineTo(end, y); c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#59635f'; c.strokeRect(start - 7, y - 8.5, end - start + 14, 17);
      if (wire.striped) { c.lineWidth = 5; c.strokeStyle = wire.color; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(start, y); c.lineTo(end, y); c.stroke(); c.setLineDash([]); }
    }
    if (sorted > 0.95 && plugged < 0.2) { c.textAlign = 'left'; c.fillStyle = '#192d33'; c.font = font(19); c.fillText(`${index + 1} ${wire.name}`, tip + 62, y + 1); }
  });
  // 피복
  const jacketEnd = strip + (1 - stripped) * 190;
  c.fillStyle = '#2f79c4'; c.beginPath(); c.roundRect(left - 40, top - 8, jacketEnd - left + 40, 8 * gap + 16, 26); c.fill();
  c.fillStyle = '#ffffff'; c.font = font(20); c.textAlign = 'center'; c.fillText('UTP', (left + jacketEnd) / 2 - 20, top + 121);
  // 자르는 선
  if (step === 2) { c.strokeStyle = '#c2475d'; c.lineWidth = 4; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(tip + 2, top - 6); c.lineTo(tip + 2, top + 8 * gap + 6); c.stroke(); c.setLineDash([]); }
  // 커넥터: 클립이 뒤쪽이고 접점이 보이는 방향, 위에서부터 1번
  if (step >= 3) {
    const x = W + 20 - plugged * (W + 20 - (tip - 110));
    c.fillStyle = '#eef6f4cc'; c.strokeStyle = '#59635f'; c.lineWidth = 3; c.beginPath(); c.roundRect(x, top - 14, 190, 8 * gap + 28, 10); c.fill(); c.stroke();
    for (let i = 0; i < 8; i += 1) { c.fillStyle = crimp > 0.5 || step > 4 ? '#b8891f' : '#e6c15a'; c.fillRect(x + 128, top + i * gap + 4, 46, 18); c.fillStyle = '#192d33'; c.font = font(15, 700); c.textAlign = 'center'; c.fillText(String(i + 1), x + 151, top + i * gap + 14); }
  }
  // 랜툴 턱
  if (step === 4) {
    const jaw = 34 - crimp * 30; const x = tip - 120;
    c.fillStyle = '#8c9a94'; c.fillRect(x, top - 14 - jaw - 30, 210, 30); c.fillRect(x, top + 8 * gap + 14 + jaw, 210, 30);
    c.fillStyle = '#2f6f9f'; c.fillRect(x + 210, top - 14 - jaw - 30, 150, 22); c.fillRect(x + 210, top + 8 * gap + 22 + jaw, 150, 22);
  }
  // 테스터
  if (step === 5) {
    const lit = Math.min(8, Math.floor(p * 9.5));
    c.fillStyle = '#f2c230'; c.beginPath(); c.roundRect(40, H - 78, W - 80, 58, 12); c.fill();
    for (let i = 0; i < 8; i += 1) { const x = 96 + i * ((W - 192) / 7); c.fillStyle = i < lit ? '#22c55e' : '#6b5a12'; c.beginPath(); c.arc(x, H - 56, 11, 0, Math.PI * 2); c.fill(); c.fillStyle = '#192d33'; c.font = font(16, 700); c.textAlign = 'center'; c.fillText(String(i + 1), x, H - 32); }
  } else {
    c.textAlign = 'left'; c.fillStyle = '#687779'; c.font = font(20, 400);
    const note = ['피복을 2~3cm 벗기고 네 쌍을 풉니다.', '초록 쌍을 갈라 3번과 6번에, 파랑 쌍을 4번과 5번에 둡니다.', '여덟 가닥의 길이를 같게 맞춥니다.', '여덟 가닥이 끝까지 닿도록 밀어 넣습니다.', '손잡이를 끝까지 쥐어 접점을 눌러 줍니다.'][step];
    c.fillText(note, 40, H - 42);
  }
}

function buildDesk() {
  const group = new THREE.Group();
  const wood = toon('#d8b98f'); const leg = toon('#8c9a94');
  group.add(at(box(1.7, 0.08, 0.9, wood), 0, 0.78, 0));
  for (const [x, z] of [[-0.75, -0.36], [0.75, -0.36], [-0.75, 0.36], [0.75, 0.36]]) group.add(at(box(0.07, 0.76, 0.07, leg), x, 0.38, z));
  // 1인 칸막이: 양옆은 높게, 앞은 얼굴이 보이도록 낮게
  const panel = toon('#f4efe4'); const trim = toon('#087a61');
  for (const x of [-0.87, 0.87]) {
    group.add(at(box(0.05, 0.62, 1.0, panel), x, 1.13, -0.06));
    group.add(at(box(0.06, 0.04, 1.02, trim), x, 1.46, -0.06));
  }
  group.add(at(box(1.74, 0.08, 0.05, panel), 0, 0.86, 0.44), at(box(1.76, 0.03, 0.06, trim), 0, 0.915, 0.44));
  // 펼친 책
  const page = toon('#fbfaf5');
  const left = at(box(0.3, 0.02, 0.4, page), -0.16, 0.84, 0.02); left.rotation.z = 0.06;
  const right = at(box(0.3, 0.02, 0.4, page), 0.16, 0.84, 0.02); right.rotation.z = -0.06;
  const book = new THREE.Group(); book.add(left, right, at(box(0.66, 0.015, 0.44, toon('#2f6f9f')), 0, 0.826, 0.02));
  book.scale.setScalar(0.78); book.position.set(-0.3, 0.18, -0.14);
  group.add(book);
  // 노트북: 화면은 앉은 사람 쪽을 향하고, 덮개의 표시등이 공부 중일 때 켜짐
  const laptop = new THREE.Group(); const shell = toon('#56636b');
  laptop.add(at(box(0.5, 0.022, 0.32, shell), 0, 0.831, 0));
  laptop.add(at(box(0.4, 0.004, 0.2, toon('#59635f')), 0, 0.844, -0.03));
  const lid = new THREE.Group(); lid.position.set(0, 0.842, 0.16); lid.rotation.x = 0.3;
  lid.add(at(box(0.5, 0.34, 0.018, shell), 0, 0.17, 0));
  const screenMaterial = new THREE.MeshBasicMaterial({ color: '#2a3431' });
  lid.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), screenMaterial), 0, 0.17, -0.0095)); lid.children[1].rotation.y = Math.PI;
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#8c9a94' });
  lid.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), lightMaterial), 0, 0.17, 0.0095));
  laptop.add(lid); laptop.position.set(0.16, 0, 0.1);
  group.add(laptop);
  // 스탠드
  const lamp = new THREE.Group();
  const metal = toon('#44524d');
  lamp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16), metal), 0, 0.835, 0));
  const pole = at(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), metal), 0, 1.04, 0);
  const shade = at(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.16, 16, 1, true), toon('#087a61', { side: THREE.DoubleSide })), 0.1, 1.24, 0.06);
  shade.rotation.z = -0.5;
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: '#59635f' });
  const bulb = at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), bulbMaterial), 0.12, 1.19, 0.06);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: '#fff2b8', transparent: true, opacity: 0, depthWrite: false });
  const glow = at(new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), glowMaterial), 0.3, 0.83, 0.05); glow.rotation.x = -Math.PI / 2;
  lamp.add(pole, shade, bulb); lamp.position.set(-0.62, 0, -0.22);
  group.add(lamp, at(glow, -0.32, 0.826, -0.1));
  // 의자
  const chair = new THREE.Group(); const fabric = toon('#5d7f76');
  chair.add(at(box(0.5, 0.07, 0.5, fabric), 0, 0.46, 0), at(box(0.5, 0.55, 0.07, fabric), 0, 0.76, -0.24));
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.add(at(box(0.05, 0.44, 0.05, leg), x, 0.22, z));
  chair.position.set(0, 0, -0.72);
  group.add(chair);
  return { group, bulbMaterial, glowMaterial, screenMaterial, lightMaterial };
}

// 동물형 캐릭터. 특정 작품의 캐릭터를 본뜨지 않은 자체 도안이며, 종류와 색은 닉네임 해시로 정함.
const ANIMALS = [
  { kind: 'capybara', fur: ['#b48a5c', '#a67c52', '#c29a6a'], muzzle: '#d9b98f' },
  { kind: 'cat', fur: ['#f3e3c8', '#f0b878', '#c9c9cf', '#fbf7ef'], muzzle: '#ffffff' },
  { kind: 'bear', fur: ['#c99a6b', '#8d6748', '#f4efe6'], muzzle: '#f6e6cf' },
  { kind: 'rabbit', fur: ['#fbf7f2', '#f6dfe0', '#e9e2d6'], muzzle: '#ffffff' },
  { kind: 'hamster', fur: ['#f0c98f', '#e8b97a', '#f6dcb4'], muzzle: '#fff8ee' },
  { kind: 'chick', fur: ['#ffe07a', '#ffd35c', '#fff0a8'], muzzle: '#ffb14a' },
];
const SCARF = ['#087a61', '#2f6f9f', '#c2475d', '#7a5ea8', '#e08a3c', '#3f8f8a'];

function buildPerson(id) {
  const seed = hash(id);
  const animal = ANIMALS[seed % ANIMALS.length];
  const fur = toon(animal.fur[(seed >>> 4) % animal.fur.length]);
  const pale = toon(animal.muzzle);
  const scarfMaterial = toon(SCARF[(seed >>> 9) % SCARF.length]);
  const dark = new THREE.MeshBasicMaterial({ color: '#2a2422' });
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const pink = new THREE.MeshBasicMaterial({ color: '#f7a8a6', transparent: true, opacity: 0.7 });
  const ball = (radius, material, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = at(new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material), x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };

  const group = new THREE.Group();
  // 작은 몸통과 목도리
  group.add(ball(0.23, fur, 0, 0.7, 0, 1, 1.05, 0.9));
  const scarf = at(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 20), scarfMaterial), 0, 0.9, 0.01); scarf.rotation.x = Math.PI / 2; group.add(scarf);

  // 큰 머리
  const head = new THREE.Group(); head.position.set(0, 1.24, 0.03);
  const wide = animal.kind === 'capybara' ? 1.12 : animal.kind === 'hamster' ? 1.14 : 1.04;
  const tall = animal.kind === 'capybara' ? 0.9 : 0.94;
  head.add(ball(0.37, fur, 0, 0, 0, wide, tall, 0.96));

  // 귀
  if (animal.kind === 'cat') {
    for (const x of [-0.22, 0.22]) { const ear = at(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 4), fur), x, 0.33, -0.02); ear.rotation.y = Math.PI / 4; ear.rotation.z = x > 0 ? -0.25 : 0.25; ear.castShadow = true; head.add(ear); }
  } else if (animal.kind === 'rabbit') {
    for (const x of [-0.13, 0.13]) { const ear = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.3, 4, 10), fur), x, 0.52, -0.04); ear.rotation.z = x > 0 ? -0.14 : 0.14; ear.castShadow = true; head.add(ear); head.add(ball(0.035, pink, x * 1.02, 0.52, 0.02, 1, 3.2, 0.5)); }
  } else if (animal.kind === 'chick') {
    for (const [x, tilt] of [[-0.05, 0.4], [0.05, -0.4], [0, 0]]) { const tuft = at(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 6), fur), x, 0.38, 0); tuft.rotation.z = tilt; head.add(tuft); }
  } else {
    const size = animal.kind === 'bear' ? 0.12 : animal.kind === 'capybara' ? 0.07 : 0.09;
    const spread = animal.kind === 'capybara' ? 0.27 : 0.28;
    for (const x of [-spread, spread]) { head.add(ball(size, fur, x, animal.kind === 'capybara' ? 0.27 : 0.26, -0.04, 1, 1, 0.6)); if (animal.kind !== 'capybara') head.add(ball(size * 0.55, pink, x, 0.26, 0.01, 1, 1, 0.4)); }
  }

  // 얼굴: 눈은 낮고 넓게, 작은 반짝임과 볼 터치
  const eyeY = -0.03; const eyeX = animal.kind === 'capybara' ? 0.2 : 0.16;
  for (const x of [-eyeX, eyeX]) {
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), dark), x, eyeY, 0.33));
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), white), x + 0.014, eyeY + 0.018, 0.366));
    const cheek = at(new THREE.Mesh(new THREE.CircleGeometry(0.058, 16), pink), x * 1.5, eyeY - 0.085, 0.3); cheek.rotation.y = x > 0 ? 0.55 : -0.55; head.add(cheek);
  }
  if (animal.kind === 'chick') {
    const beak = at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 8), pale), 0, -0.07, 0.38); beak.rotation.x = Math.PI / 2; head.add(beak);
  } else {
    // 주둥이, 코, 작은 입
    const big = animal.kind === 'capybara';
    head.add(ball(big ? 0.15 : 0.1, pale, 0, big ? -0.1 : -0.09, big ? 0.27 : 0.29, big ? 1.25 : 1.2, big ? 0.85 : 0.8, 0.6));
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(big ? 0.034 : 0.022, 10, 8), animal.kind === 'cat' || animal.kind === 'rabbit' ? new THREE.MeshBasicMaterial({ color: '#e58a8a' }) : dark), 0, big ? -0.05 : -0.065, big ? 0.365 : 0.352));
    for (const x of [-0.024, 0.024]) { const lip = at(new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 12, Math.PI), dark), x, big ? -0.1 : -0.095, big ? 0.36 : 0.35); lip.rotation.z = Math.PI; head.add(lip); }
  }
  if (animal.kind === 'hamster') for (const x of [-0.2, 0.2]) head.add(ball(0.12, pale, x, -0.1, 0.2, 1, 0.85, 0.7));

  // 짧은 팔
  const arm = side => { const pivot = new THREE.Group(); pivot.position.set(side * 0.2, 0.84, 0.05); pivot.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 4, 10), fur), 0, -0.11, 0), ball(0.075, fur, 0, -0.24, 0)); return pivot; };
  const left = arm(-1); const right = arm(1);
  // 연필(오른손)과 멈춤일 때 드는 컵(왼손)
  const pencil = at(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 6), toon('#f2b84b')), 0, -0.3, 0.06); pencil.rotation.x = 0.9; right.add(pencil);
  const mug = at(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.12, 14), toon('#ffffff')), 0, -0.3, 0.07); mug.visible = false; left.add(mug);
  // 짧은 다리: 앉으면 책상에 가려지고 걸을 때 앞뒤로 흔듦
  const leg = side => { const pivot = new THREE.Group(); pivot.position.set(side * 0.1, 0.5, 0); pivot.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 4, 10), fur), 0, -0.2, 0), ball(0.085, fur, 0, -0.42, 0.04, 1, 0.7, 1.3)); return pivot; };
  const legs = [leg(-1), leg(1)];
  group.add(head, left, right, ...legs);
  return { group, head, left, right, legs, mug, pencil, phase: (seed % 628) / 100 };
}

export function createStudyScene(container, { reducedMotion = false, seats = 10, onState, onAway, onSit, onPickSeat, onBench } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color('#f3f5f2');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfd8d2', 1.5));
  const sun = new THREE.DirectionalLight('#fff6e6', 1.9); sun.position.set(-6, 12, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 13, top: 8, bottom: -8, near: 1, far: 30 }); sun.shadow.bias = -0.0015;
  scene.add(sun);

  // 방: 바닥, 깔개, 뒷벽과 왼쪽 벽
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9.6), toon('#e7d7bd')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 7.2), toon('#cfe3d6')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, -0.6); rug.receiveShadow = true; scene.add(rug);
  const wallMaterial = toon('#f7f4ec');
  scene.add(at(box(14, 3.4, 0.16, wallMaterial), 0, 1.7, -4.8), at(box(0.16, 3.4, 9.6, wallMaterial), -7, 1.7, 0));
  scene.add(at(box(14, 0.16, 0.2, toon('#103b37')), 0, 0.08, -4.7));
  // 창문 2개: 한국 시간에 맞춘 하늘색
  const skyMaterials = [];
  for (const x of [-3.6, 3.6]) {
    scene.add(at(box(2.5, 1.6, 0.06, toon('#ffffff')), x, 2.05, -4.7));
    const sky = new THREE.MeshBasicMaterial({ color: '#bfe3f5' }); skyMaterials.push(sky);
    scene.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4), sky), x, 2.05, -4.66));
    scene.add(at(box(0.05, 1.4, 0.03, toon('#ffffff')), x, 2.05, -4.64), at(box(2.3, 0.05, 0.03, toon('#ffffff')), x, 2.05, -4.64));
  }
  // 벽 표지
  const sign = document.createElement('canvas'); sign.width = 768; sign.height = 192;
  const signTexture = new THREE.CanvasTexture(sign); signTexture.colorSpace = THREE.SRGBColorSpace;
  const paintSign = () => { const c = sign.getContext('2d'); c.fillStyle = '#103b37'; c.beginPath(); c.roundRect(0, 0, 768, 192, 24); c.fill(); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 74px "NA2 Gmarket Sans", "Malgun Gothic", sans-serif'; c.fillText('NA2 스터디카페', 384, 78); c.fillStyle = '#a8e5c8'; c.font = '600 40px "NA2 Paperlogy", "Malgun Gothic", sans-serif'; c.fillText('네트워크관리사 2급', 384, 146); signTexture.needsUpdate = true; };
  paintSign(); document.fonts?.ready?.then(paintSign).catch(() => {});
  scene.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTexture })), 0, 2.45, -4.7));
  // 왼쪽 벽 책장
  const shelf = new THREE.Group(); const shelfWood = toon('#b98f63');
  shelf.add(at(box(0.5, 2.4, 3.2, shelfWood), 0, 1.2, 0));
  const spines = ['#087a61', '#2f6f9f', '#c2475d', '#a8873a', '#7a5ea8', '#3f8f8a'];
  for (let row = 0; row < 3; row += 1) for (let i = 0; i < 11; i += 1) shelf.add(at(box(0.3, 0.46 + ((i * 7 + row * 3) % 4) * 0.035, 0.2, toon(spines[(i + row * 2) % spines.length])), 0.16, 0.5 + row * 0.72, -1.3 + i * 0.26));
  shelf.position.set(-6.62, 0, -1.2); scene.add(shelf);
  // 책장 옆 케이블링 실습대: UTP 케이블 타래, 랜툴(압착기), 테스터, RJ-45 커넥터
  const bench = new THREE.Group(); const steel = toon('#aab4b0'); const grip = toon('#2f6f9f');
  bench.add(at(box(0.9, 0.07, 1.7, toon('#d8b98f')), 0, 0.8, 0));
  for (const [x, z] of [[-0.38, -0.76], [0.38, -0.76], [-0.38, 0.76], [0.38, 0.76]]) bench.add(at(box(0.07, 0.78, 0.07, toon('#8c9a94')), x, 0.39, z));
  const coil = (color, radius, x, z, turns = 3) => { for (let i = 0; i < turns; i += 1) { const ring = at(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.028, 8, 28), toon(color)), x, 0.865 + i * 0.05, z); ring.rotation.x = Math.PI / 2; ring.castShadow = true; bench.add(ring); } };
  coil('#2f79c4', 0.24, -0.08, -0.5, 4); coil('#8c9a94', 0.17, 0.12, -0.02, 3);
  // 타래에서 풀려 나온 랜선과 끝의 커넥터
  const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.16, 0.87, -0.5), new THREE.Vector3(0.3, 0.86, -0.3), new THREE.Vector3(0.22, 0.86, 0.1), new THREE.Vector3(0.3, 0.86, 0.36)]), 24, 0.022, 8), toon('#2f79c4')); lead.castShadow = true; bench.add(lead);
  const plug = () => { const g = new THREE.Group(); g.add(box(0.06, 0.045, 0.09, new THREE.MeshToonMaterial({ color: '#eef6f4', transparent: true, opacity: 0.85 })), at(box(0.045, 0.012, 0.05, toon('#d9b24a')), 0, 0.018, 0.02)); return g; };
  const end = plug(); end.position.set(0.3, 0.86, 0.41); bench.add(end);
  for (const [x, z, turn] of [[-0.3, 0.2, 0.5], [-0.22, 0.3, -0.4], [-0.33, 0.36, 1.2]]) { const p = plug(); p.position.set(x, 0.86, z); p.rotation.y = turn; bench.add(p); }
  // 랜툴: 금속 머리와 벌어진 손잡이 두 개
  const tool = new THREE.Group();
  tool.add(at(box(0.11, 0.05, 0.16, steel), 0, 0, -0.14), at(box(0.07, 0.03, 0.05, toon('#44524d')), 0, 0.03, -0.2));
  for (const side of [-1, 1]) { const handle = at(box(0.045, 0.04, 0.34, grip), side * 0.055, 0, 0.1); handle.rotation.y = side * -0.2; tool.add(handle); }
  tool.position.set(0.08, 0.865, 0.62); tool.rotation.y = 0.9; bench.add(tool);
  // 케이블 테스터 본체와 리모트
  for (const [x, z, long] of [[-0.24, 0.66, 0.2], [-0.33, 0.52, 0.11]]) { const unit = at(box(0.1, 0.05, long, toon('#f2c230')), x, 0.865, z); unit.rotation.y = 0.3; bench.add(unit); bench.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#3ad17a' })), x, 0.895, z)); }
  // 벽에 건 케이블과 표지
  for (const [color, z] of [['#e08a3c', -0.35], ['#3f8f5a', 0.1]]) { const hang = at(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), toon(color)), -0.4, 1.75, z); hang.rotation.y = Math.PI / 2; hang.scale.y = 1.25; bench.add(hang); }
  const tag = document.createElement('canvas'); tag.width = 512; tag.height = 128;
  const tagTexture = new THREE.CanvasTexture(tag); tagTexture.colorSpace = THREE.SRGBColorSpace;
  const paintTag = () => { const c = tag.getContext('2d'); c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, 512, 128, 18); c.fill(); c.lineWidth = 8; c.strokeStyle = '#087a61'; c.stroke(); c.fillStyle = '#103b37'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 60px "NA2 Gmarket Sans", "Malgun Gothic", sans-serif'; c.fillText('케이블링 실습대', 256, 68); tagTexture.needsUpdate = true; };
  paintTag(); document.fonts?.ready?.then(paintTag).catch(() => {});
  const tagMesh = at(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: tagTexture })), -0.44, 2.35, 0); tagMesh.rotation.y = Math.PI / 2; bench.add(tagMesh);
  bench.position.set(-6.45, 0, 1.75); scene.add(bench);
  // 화분
  for (const [x, z] of [[6.3, 3.6]]) { const pot = at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 14), toon('#b5653a')), x, 0.25, z); pot.castShadow = true; const leaf = toon('#3f8f5a'); scene.add(pot); for (let i = 0; i < 3; i += 1) { const l = at(new THREE.Mesh(new THREE.SphereGeometry(0.34 - i * 0.06, 12, 10), leaf), x + (i - 1) * 0.12, 0.8 + i * 0.3, z); l.castShadow = true; scene.add(l); } }

  // 오른쪽 탕비실: 낮은 가벽으로 나누고 조리대, 커피머신, 전기포트, 정수기, 냉장고를 둠
  const pantry = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(4, 9.6), toon('#d9e3e6')); tile.rotation.x = -Math.PI / 2; tile.position.set(9, 0.002, 0); tile.receiveShadow = true; pantry.add(tile);
  pantry.add(at(box(4, 3.4, 0.16, wallMaterial), 9, 1.7, -4.8), at(box(4, 0.16, 0.2, toon('#103b37')), 9, 0.08, -4.7));
  // 가벽: 앞쪽은 드나드는 통로로 비워 둠
  pantry.add(at(box(0.14, 1.5, 5.4, toon('#f4efe4')), 7.05, 0.75, -2.1), at(box(0.18, 0.06, 5.44, toon('#087a61')), 7.05, 1.53, -2.1));
  // 조리대와 상부 선반
  const counter = toon('#f7f4ec'); const top = toon('#8c9a94');
  pantry.add(at(box(3.3, 0.86, 0.7, counter), 9.1, 0.43, -4.35), at(box(3.4, 0.06, 0.78, top), 9.1, 0.89, -4.33));
  for (const x of [8.0, 8.85, 9.7]) pantry.add(at(box(0.04, 0.5, 0.02, top), x, 0.45, -3.99));
  pantry.add(at(box(3.0, 0.06, 0.34, toon('#d8b98f')), 9.1, 2.0, -4.55));
  const cupColors = ['#ffffff', '#a8e5c8', '#f2c230', '#f7a8a6', '#2f6f9f', '#ffffff'];
  cupColors.forEach((color, i) => { const cup = at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 12), toon(color)), 8.0 + i * 0.3, 2.1, -4.55); cup.castShadow = true; pantry.add(cup); });
  // 커피머신
  const machine = new THREE.Group(); const body = toon('#33403c');
  machine.add(at(box(0.5, 0.56, 0.42, body), 0, 0.28, 0), at(box(0.5, 0.1, 0.5, toon('#59635f')), 0, 0.05, 0.04), at(box(0.36, 0.14, 0.1, toon('#087a61')), 0, 0.44, 0.22));
  machine.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 12), toon('#ffffff')), 0, 0.165, 0.2));
  machine.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#3ad17a' })), 0.18, 0.5, 0.215));
  machine.position.set(8.2, 0.92, -4.38); pantry.add(machine);
  // 전기포트와 컵 쟁반
  const kettle = new THREE.Group(); kettle.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.26, 16), toon('#dfe6e3')), 0, 0.13, 0), at(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 14, Math.PI), toon('#33403c')), 0.13, 0.15, 0));
  kettle.children[1].rotation.z = -Math.PI / 2; kettle.position.set(9.0, 0.92, -4.35); pantry.add(kettle);
  pantry.add(at(box(0.6, 0.02, 0.36, toon('#b98f63')), 9.75, 0.93, -4.3));
  for (const [x, z] of [[9.58, -4.34], [9.76, -4.25], [9.92, -4.36]]) pantry.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.11, 12), toon('#ffffff')), x, 0.995, z));
  // 정수기
  const water = new THREE.Group();
  water.add(at(box(0.5, 1.15, 0.46, toon('#f7f4ec')), 0, 0.575, 0), at(box(0.34, 0.2, 0.06, toon('#cfd8d2')), 0, 0.72, 0.24));
  const bottle = at(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 16), new THREE.MeshToonMaterial({ color: '#bfe3f5', transparent: true, opacity: 0.8 })), 0, 1.38, 0); water.add(bottle);
  for (const [x, color] of [[-0.08, '#2f79c4'], [0.08, '#c2475d']]) water.add(at(box(0.05, 0.07, 0.05, toon(color)), x, 0.78, 0.28));
  water.position.set(10.55, 0, -2.6); pantry.add(water);
  // 작은 냉장고와 그 위 간식 바구니
  const fridge = new THREE.Group();
  fridge.add(at(box(0.7, 1.3, 0.66, toon('#dfe6e3')), 0, 0.65, 0), at(box(0.03, 0.4, 0.03, top), -0.28, 0.85, 0.35), at(box(0.7, 0.02, 0.02, top), 0, 0.42, 0.335));
  fridge.add(at(box(0.44, 0.14, 0.34, toon('#b98f63')), 0, 1.37, 0));
  for (const [x, color] of [[-0.12, '#f2c230'], [0.02, '#c2475d'], [0.13, '#3f8f5a']]) fridge.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(color)), x, 1.47, 0));
  fridge.position.set(10.5, 0, -1.3); pantry.add(fridge);
  // 서서 쉬는 높은 탁자
  const stand = new THREE.Group();
  stand.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), toon('#d8b98f')), 0, 1.05, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.02, 10), top), 0, 0.52, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 20), top), 0, 0.02, 0));
  stand.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.11, 12), toon('#a8e5c8')), 0.15, 1.13, 0.05));
  stand.children.forEach(child => { child.castShadow = true; });
  stand.position.set(9.0, 0, 1.2); pantry.add(stand);
  // 표지
  const pantrySign = document.createElement('canvas'); pantrySign.width = 384; pantrySign.height = 144;
  const pantryTexture = new THREE.CanvasTexture(pantrySign); pantryTexture.colorSpace = THREE.SRGBColorSpace;
  const paintPantry = () => { const c = pantrySign.getContext('2d'); c.fillStyle = '#103b37'; c.beginPath(); c.roundRect(0, 0, 384, 144, 20); c.fill(); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 76px "NA2 Gmarket Sans", "Malgun Gothic", sans-serif'; c.fillText('탕비실', 192, 78); pantryTexture.needsUpdate = true; };
  paintPantry(); document.fonts?.ready?.then(paintPantry).catch(() => {});
  pantry.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ map: pantryTexture })), 9.1, 2.75, -4.7));
  scene.add(pantry);

  // 좌석
  const desks = [];
  const pickTargets = [];
  for (let i = 0; i < seats; i += 1) {
    const desk = buildDesk();
    const a = seatAnchor(i);
    const anchor = new THREE.Group(); anchor.position.set(a.x, 0, a.z);
    anchor.add(desk.group);
    const plate = document.createElement('canvas'); plate.width = 128; plate.height = 64;
    const pc = plate.getContext('2d'); pc.fillStyle = '#103b37'; pc.beginPath(); pc.roundRect(0, 0, 128, 64, 12); pc.fill(); pc.fillStyle = '#ffffff'; pc.textAlign = 'center'; pc.textBaseline = 'middle'; pc.font = '700 40px "Malgun Gothic", sans-serif'; pc.fillText(String(i + 1), 64, 34);
    const plateTexture = new THREE.CanvasTexture(plate); plateTexture.colorSpace = THREE.SRGBColorSpace;
    anchor.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: plateTexture })), 0, 0.62, 0.456));
    // 눌렀을 때 자리를 고르는 보이지 않는 영역
    const pick = at(new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.5, 1.5), new THREE.MeshBasicMaterial({ visible: false })), 0, 0.75, -0.24);
    pick.userData.seat = i; anchor.add(pick); pickTargets.push(pick);
    scene.add(anchor);
    desks.push({ ...desk, anchor });
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ visible: false })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // 실습대: 누르면 그 앞으로 가서 케이블 제작을 연습함
  const benchPick = at(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 2.0), new THREE.MeshBasicMaterial({ visible: false })), -6.4, 1.0, 1.75); scene.add(benchPick);
  const board = document.createElement('canvas'); board.width = 640; board.height = 440;
  const boardTexture = new THREE.CanvasTexture(board); boardTexture.colorSpace = THREE.SRGBColorSpace;
  const boardSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: boardTexture, depthTest: false, transparent: true, opacity: 0 }));
  boardSprite.scale.set(6.0, 4.125, 1); boardSprite.position.set(-3.6, 4.7, 1.2); boardSprite.renderOrder = 20; boardSprite.visible = false; scene.add(boardSprite);
  let benchClock = 0;
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 24), new THREE.MeshBasicMaterial({ color: '#087a61', transparent: true, opacity: 0, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; scene.add(marker);

  const state = { disposed: false, last: 0, raf: 0, dirty: true, sentAt: 0, sentKey: '' };
  const actors = new Map(); // 다른 참가자: 서버가 준 id -> 캐릭터
  const remotes = new Map(); // 다른 참가자가 직접 보낸 위치
  const keys = new Set();

  function makeActor(id) {
    const person = buildPerson(id);
    const root = new THREE.Group(); root.add(person.group);
    const label = labelTexture();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label.texture, depthTest: false, transparent: true }));
    sprite.scale.set(1.75, 0.55, 1); sprite.position.set(0, 2.25, 0); sprite.renderOrder = 10; root.add(sprite);
    scene.add(root);
    return { id, person, root, label, sprite, mode: 'stand', seat: null, studying: false, pos: { x: 0, z: 0 }, heading: 0, path: [], goal: null, moving: false, born: performance.now() };
  }
  function dropActor(actor) {
    scene.remove(actor.root);
    actor.root.traverse(object => { object.geometry?.dispose?.(); });
    actor.sprite.material.dispose(); actor.label.texture.dispose();
  }
  function place(actor) {
    if (actor.mode === 'sit' && actor.seat != null) { const spot = seatSpot(actor.seat); actor.root.position.set(spot.x, 0, spot.z); actor.root.rotation.y = 0; actor.person.group.position.y = -0.08; }
    else { actor.root.position.set(actor.pos.x, 0, actor.pos.z); actor.root.rotation.y = actor.heading; actor.person.group.position.y = 0; }
  }
  function sit(actor) { actor.mode = 'sit'; actor.path = []; actor.goal = null; actor.moving = false; if (actor.seat != null) actor.pos = { ...seatEntry(actor.seat) }; place(actor); }
  function standUp(actor) { if (actor.mode !== 'sit') return; actor.mode = 'stand'; if (actor.seat != null) actor.pos = { ...seatEntry(actor.seat) }; actor.heading = Math.PI; place(actor); }

  // 내 캐릭터는 자리가 없어도 항상 있음
  const me = makeActor(`me-${Math.random()}`);
  me.pos = { ...ENTRANCE }; me.heading = Math.PI; me.rosterId = null; me.name = ''; place(me);
  let self = { name: '', time: '00:00:00' };

  function share(force) {
    const s = me.mode === 'sit' ? 0 : me.moving ? 1 : me.mode === 'bench' ? 3 : 2;
    const key = `${s}|${me.pos.x.toFixed(2)}|${me.pos.z.toFixed(2)}`;
    const now = performance.now();
    if (!force && (key === state.sentKey ? now - state.sentAt < 3000 : now - state.sentAt < 120)) return;
    state.sentKey = key; state.sentAt = now;
    onState?.({ x: Number(me.pos.x.toFixed(2)), z: Number(me.pos.z.toFixed(2)), s });
  }

  function walkTo(actor, point, goal) {
    const path = findPath(actor.pos, point);
    if (!path.length) return false;
    actor.path = path; actor.goal = goal || null; return true;
  }
  // 직접 조작으로 자리를 뜨면 공부를 멈춤
  function leaveByHand() {
    if (me.mode === 'sit') standUp(me);
    if (me.mode === 'bench') { me.mode = 'stand'; onBench?.(false); }
    me.goal = null;
    if (me.studying) { me.studying = false; onAway?.(); }
  }

  function update(people, mine) {
    if (mine) self = mine;
    const seen = new Set();
    const occupied = new Array(desks.length).fill(null);
    let myRow = null;
    for (const person of people) {
      if (!Number.isInteger(person.seat) || person.seat < 1 || person.seat > desks.length) continue;
      const seat = person.seat - 1;
      if (person.me) { myRow = { ...person, seat }; continue; }
      seen.add(person.id);
      let actor = actors.get(person.id);
      if (!actor) { actor = makeActor(person.id); actors.set(person.id, actor); actor.seat = seat; sit(actor); }
      if (actor.seat !== seat) { actor.seat = seat; if (actor.mode === 'sit') sit(actor); }
      actor.studying = person.studying; actor.name = person.name; actor.time = person.time;
      occupied[seat] = actor;
    }
    for (const [id, actor] of actors) if (!seen.has(id)) { dropActor(actor); actors.delete(id); remotes.delete(id); }

    // 내 자리와 상태
    if (myRow) {
      const moved = me.seat !== myRow.seat;
      me.rosterId = myRow.id; me.seat = myRow.seat; me.studying = myRow.studying; occupied[myRow.seat] = me;
      if (moved && me.mode === 'sit') standUp(me);
      // 실습대에서 연습하는 동안에는 공부 중이어도 자리로 돌아가지 않음
      if (me.studying && me.mode !== 'sit' && me.mode !== 'bench' && me.goal !== 'bench' && (moved || me.goal !== 'sit')) { if (!walkTo(me, seatEntry(me.seat), 'sit')) sit(me); }
    } else {
      if (me.mode === 'sit') standUp(me);
      me.rosterId = null; me.seat = null; me.studying = false; if (me.goal === 'sit') { me.goal = null; me.path = []; }
    }
    state.occupied = occupied;
    const [top] = skyColors(new Date(Date.now() + 9 * 3600000).getUTCHours());
    for (const sky of skyMaterials) sky.color.set(top);
    state.dirty = true;
  }

  function paint() {
    // 스탠드와 노트북은 실제로 앉아서 공부하는 자리만 켬
    desks.forEach((desk, index) => {
      const actor = state.occupied?.[index];
      const on = Boolean(actor && actor.mode === 'sit' && actor.studying);
      desk.bulbMaterial.color.set(on ? '#fff2b8' : '#59635f'); desk.glowMaterial.opacity = on ? 0.5 : 0;
      desk.screenMaterial.color.set(on ? '#bfe9d8' : '#2a3431'); desk.lightMaterial.color.set(on ? '#a8e5c8' : '#8c9a94');
    });
    for (const actor of actors.values()) drawLabel(actor.label, actor.name || '', actor.time || '', actor.mode === 'bench' && actor.studying ? '실습 중' : actor.mode !== 'sit' ? '자리 비움' : actor.studying ? '공부 중' : '멈춤', false);
    drawLabel(me.label, self.name || '나', self.time || '', me.mode === 'bench' && me.studying ? '실습 중' : me.seat == null ? '자리 없음' : me.mode !== 'sit' ? '자리 비움' : me.studying ? '공부 중' : '멈춤', true);
  }

  function stepPath(actor, dt) {
    let budget = WALK_SPEED * dt; actor.moving = false;
    while (actor.path.length && budget > 0) {
      const next = actor.path[0]; const dx = next.x - actor.pos.x; const dz = next.z - actor.pos.z; const distance = Math.hypot(dx, dz);
      if (distance > 0.001) actor.heading = Math.atan2(dx, dz);
      if (distance <= budget || reducedMotion) { actor.pos = { x: next.x, z: next.z }; actor.path.shift(); budget -= distance; }
      else { actor.pos = { x: actor.pos.x + (dx / distance) * budget, z: actor.pos.z + (dz / distance) * budget }; budget = 0; }
      actor.moving = true;
    }
    if (!actor.path.length && actor.goal === 'sit' && actor.seat != null) sit(actor);
    if (!actor.path.length && actor.goal === 'bench') { actor.goal = null; actor.mode = 'bench'; actor.heading = -2.4; actor.moving = false; if (actor === me) onBench?.(true); }
  }

  function simulate(now, dt) {
    // 내 캐릭터: 키보드가 먼저, 없으면 누른 곳까지 걷기
    let kx = 0; let kz = 0;
    if (keys.has('left')) kx -= 1; if (keys.has('right')) kx += 1; if (keys.has('up')) kz -= 1; if (keys.has('down')) kz += 1;
    if (kx || kz) {
      leaveByHand(); me.path = [];
      const length = Math.hypot(kx, kz); const step = WALK_SPEED * dt;
      const next = slide(me.pos, (kx / length) * step, (kz / length) * step);
      me.moving = next.x !== me.pos.x || next.z !== me.pos.z; me.heading = Math.atan2(kx, kz); me.pos = next;
    } else if (me.mode !== 'sit') stepPath(me, dt);
    else me.moving = false;
    place(me); share(false);
    if (marker.material.opacity > 0) marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.2);

    // 다른 참가자: 직접 받은 위치가 최근 것이면 그 위치로, 아니면 자리에 앉은 모습으로
    for (const [id, actor] of actors) {
      const remote = remotes.get(id);
      const away = remote && remote.s !== 0; // 상대가 나가면 dropRemote로 지워짐
      if (!away) { if (actor.mode !== 'sit') sit(actor); actor.moving = false; continue; }
      if (actor.mode === 'sit') standUp(actor);
      const dx = remote.x - actor.pos.x; const dz = remote.z - actor.pos.z; const distance = Math.hypot(dx, dz);
      actor.moving = distance > 0.06;
      actor.mode = !actor.moving && remote.s === 3 ? 'bench' : 'stand'; if (actor.mode === 'bench') actor.heading = -2.4;
      if (actor.moving) { const step = Math.min(distance, Math.max(WALK_SPEED * dt, distance * 0.25)); actor.pos = { x: actor.pos.x + (dx / distance) * step, z: actor.pos.z + (dz / distance) * step }; actor.heading = Math.atan2(dx, dz); }
      place(actor);
    }
  }

  function pose(now) {
    const t = now / 1000; const move = reducedMotion ? 0 : 1;
    for (const actor of [me, ...actors.values()]) {
      const p = actor.person;
      const grow = reducedMotion ? 1 : Math.min(1, (now - actor.born) / 350);
      p.group.scale.setScalar(0.6 + 0.4 * grow * (2 - grow));
      p.pencil.visible = actor.mode === 'sit' && actor.studying;
      p.mug.visible = actor.mode === 'sit' && !actor.studying;
      for (const leg of p.legs) leg.rotation.x = 0;
      p.group.position.y = actor.mode === 'sit' ? -0.08 : 0;
      if (actor.mode === 'bench') {
        // 실습대 앞: 몸을 숙이고 두 손으로 랜툴을 쥐었다 폄
        const squeeze = Math.sin(t * 5 + p.phase) * 0.18 * move;
        p.group.rotation.x = 0.16; p.group.position.y = 0;
        p.head.rotation.x = 0.22; p.head.rotation.z = 0;
        p.left.rotation.x = -1.2; p.left.rotation.z = 0.35 + squeeze; p.right.rotation.x = -1.2; p.right.rotation.z = -0.35 - squeeze;
      } else if (actor.mode !== 'sit') {
        const swing = actor.moving ? Math.sin(t * 11 + p.phase) * 0.7 * move : 0;
        p.group.rotation.x = actor.moving ? 0.08 : 0;
        p.group.position.y = actor.moving ? Math.abs(Math.sin(t * 11 + p.phase)) * 0.05 * move : 0;
        p.head.rotation.x = 0; p.head.rotation.z = actor.moving ? 0 : Math.sin(t * 0.6 + p.phase) * 0.04 * move;
        p.legs[0].rotation.x = swing; p.legs[1].rotation.x = -swing;
        p.left.rotation.x = -swing * 0.8; p.right.rotation.x = swing * 0.8; p.left.rotation.z = 0.12; p.right.rotation.z = -0.12;
      } else if (actor.studying) {
        p.group.rotation.x = 0.06;
        p.head.rotation.x = 0.16 + Math.sin(t * 0.7 + p.phase) * 0.03 * move;
        p.head.rotation.z = Math.sin(t * 0.45 + p.phase) * 0.04 * move;
        p.right.rotation.x = -1.25; p.right.rotation.z = -0.25 + Math.sin(t * 6 + p.phase) * 0.07 * move;
        p.left.rotation.x = -1.15; p.left.rotation.z = 0.3;
      } else {
        p.group.rotation.x = -0.1;
        p.head.rotation.x = -0.05; p.head.rotation.z = Math.sin(t * 0.5 + p.phase) * 0.05 * move;
        p.right.rotation.x = -0.25; p.right.rotation.z = -0.1;
        p.left.rotation.x = -1.5 + Math.sin(t * 0.8 + p.phase) * 0.08 * move; p.left.rotation.z = 0.15;
      }
    }
  }

  // 조작: 방향키·WASD, 바닥과 책상 누르기
  const KEY = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  const typing = event => { const tag = event.target?.tagName; return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable; };
  const keyDown = event => { const k = KEY[event.code]; if (!k || typing(event) || event.ctrlKey || event.metaKey || event.altKey) return; event.preventDefault(); keys.add(k); state.dirty = true; };
  const keyUp = event => { const k = KEY[event.code]; if (k) keys.delete(k); };
  const blur = () => keys.clear();
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);

  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = null;
  const pointerDown = event => { down = { x: event.clientX, y: event.clientY }; };
  const pointerUp = event => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) { down = null; return; }
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const desk = raycaster.intersectObjects(pickTargets, false)[0];
    if (raycaster.intersectObject(benchPick, false)[0]) {
      if (me.mode === 'bench') return;
      const from = me.mode === 'sit' && me.seat != null ? seatEntry(me.seat) : me.pos;
      const way = findPath(from, BENCH_SPOT);
      if (!way.length) return;
      leaveByHand(); me.path = way; me.goal = 'bench'; state.dirty = true; return;
    }
    if (desk) {
      const seat = desk.object.userData.seat; const owner = state.occupied?.[seat];
      if (owner && owner !== me) return; // 남의 자리
      if (owner === me) { if (!me.studying) onSit?.(); return; }
      onPickSeat?.(seat + 1); return;
    }
    const floorHit = raycaster.intersectObject(ground, false)[0];
    if (!floorHit) return;
    const start = me.mode === 'sit' && me.seat != null ? seatEntry(me.seat) : me.pos;
    const path = findPath(start, { x: floorHit.point.x, z: floorHit.point.z });
    if (!path.length) return;
    leaveByHand(); me.path = path; me.goal = null;
    const end = path[path.length - 1]; marker.position.set(end.x, 0.02, end.z); marker.material.opacity = 0.9; state.dirty = true;
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.style.touchAction = 'manipulation'; renderer.domElement.style.cursor = 'pointer';

  function resize() {
    const width = Math.max(1, container.clientWidth); const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block';
    camera.aspect = width / height;
    // 좁은 화면에서는 방 전체가 들어오도록 물러남
    const back = Math.max(1, 2.15 / camera.aspect);
    camera.position.set(1.6, 7.6 * back, 14.6 * back); camera.lookAt(1.6, 0.9, -0.6);
    camera.updateProjectionMatrix(); state.dirty = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();

  function frame(now) {
    if (state.disposed) return;
    state.raf = requestAnimationFrame(frame);
    if (document.visibilityState === 'hidden') return;
    if (now - state.last < 1000 / FPS - 4) return;
    const dt = Math.min(0.25, state.last ? (now - state.last) / 1000 : 0.05);
    state.last = now;
    simulate(now, dt); paint(); pose(now);
    // 누군가 실습 중이면 제작 순서 안내판을 띄움
    const practicing = me.mode === 'bench' || [...actors.values()].some(actor => actor.mode === 'bench');
    const fade = boardSprite.material.opacity + (practicing ? dt * 3 : -dt * 3);
    boardSprite.material.opacity = Math.min(1, Math.max(0, fade)); boardSprite.visible = boardSprite.material.opacity > 0.01;
    if (practicing) { benchClock += reducedMotion ? 0 : dt; drawCableSteps(board, reducedMotion ? 6.2 : benchClock); boardTexture.needsUpdate = true; } else benchClock = 0;
    renderer.render(scene, camera);
  }
  state.raf = requestAnimationFrame(frame);

  return {
    update,
    // 다른 참가자가 직접 보낸 위치(형식 확인을 마친 값)
    setRemote(value) { if (value.id !== me.rosterId) remotes.set(value.id, { ...value, at: performance.now() }); },
    dropRemote(id) { remotes.delete(id); },
    announce() { share(true); },
    dispose() {
      state.disposed = true; cancelAnimationFrame(state.raf); observer.disconnect();
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur);
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp);
      scene.traverse(object => { object.geometry?.dispose?.(); const m = object.material; if (m) { m.map?.dispose?.(); m.dispose?.(); } });
      renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    },
  };
}
