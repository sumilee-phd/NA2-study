export const PRACTICAL_NAV = [
  { id: 'home', path: '/practical', label: '실기 홈' },
  { id: 'work', path: '/practical/work', label: '작업형' },
  { id: 'lab', path: '/practical/lab', label: '실습형' },
  { id: 'questions', path: '/practical/questions', label: '단답형/객관식' },
];

export const PRACTICAL_AREAS = [
  { id: 'work', number: '01', title: '작업형', subtitle: '케이블 제작·결선', path: '/practical/work', status: '케이블링 연습 가능',
    description: '핀 배열을 익힌 뒤, 실제 케이블에 커넥터를 연결하고 다이렉트·크로스 결선을 확인합니다.',
    subjects: ['T568A·T568B', '다이렉트·크로스', '제작·점검'], action: '작업형 학습 안내' },
  { id: 'lab', number: '02', title: '실습형', subtitle: '라우터·Windows Server', path: '/practical/lab', status: '공식 실습 도구 안내',
    description: '문제에 제시된 조건을 읽고 라우터와 Windows Server의 설정을 직접 수행하는 영역입니다.',
    subjects: ['라우터 설정', 'Windows Server 설정'], action: '실습 도구 확인' },
  { id: 'questions', number: '03', title: '단답형/객관식', subtitle: '용어 입력·조건에 맞는 보기 선택', path: '/practical/questions', status: '24문항 연습·오답 복습',
    description: '설명에 해당하는 용어를 짧게 쓰거나, 주어진 조건에 맞는 보기를 하나 또는 여러 개 고릅니다.',
    subjects: ['단답형', '단일 선택', '복수 선택'], action: '문제풀이 시작' },
];

export const PRACTICAL_SOURCES = {
  router: { title: 'ICQA Router Emulator 안내', url: 'https://www.icqa.or.kr/cn/board/dataroom/21', checkedAt: '2026-10-23' },
  windows64: { title: 'ICQA 실습용 에뮬레이터 64bit 안내', url: 'https://www.icqa.or.kr/cn/board/dataroom/18', checkedAt: '2026-10-23' },
  downloads: { title: 'ICQA 네트워크관리사 자료실', url: 'https://www.icqa.or.kr/cn/board/dataroom?sca=%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC%EA%B4%80%EB%A6%AC%EC%82%AC', checkedAt: '2026-10-23' },
};

export function practicalSection(path) {
  if (path === '/cabling' || path.startsWith('/cabling/')) return 'work';
  return PRACTICAL_NAV.find(item => item.path === path)?.id || null;
}
