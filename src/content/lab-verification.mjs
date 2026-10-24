export const LAB_VERIFICATION_PATH = '/practical/lab/verification';
export const LAB_VERIFICATION_REPORT = 'https://github.com/sumilee-phd/NA2-study/blob/main/docs/PRACTICAL_LABS_VERIFICATION.md';

// 문서와 공개 화면이 함께 사용하는 검증 결과. 학습자의 입력 판정·저장 기록과는 별개입니다.
export const LAB_VERIFICATION = {
  date: '2026-10-24',
  title: '8개 과제 최종 검증표',
  summary: '8개 과제의 설정·저장 절차를 확인했고, 콘솔 인증은 ICQA에서, VTY 원격 인증과 유휴 종료는 Packet Tracer에서 추가 확인했습니다.',
  boundary: '통과는 각 항목에 적힌 관찰 범위에 한정합니다. 이 표는 실습 자료의 검증 결과이며, 학습자의 완료 기록이나 시험 점수가 아닙니다.',
  environments: [
    { title: 'ICQA Windows 실습용 에뮬레이터', description: '개별 설정 화면에서 입력·저장·다시 열어 값 확인. 실제 Windows Server 동작과 구분합니다.' },
    { title: 'ICQA 라우터 시험 데모', description: 'router.exe 1.0.0.0에서 명령·설정 저장·콘솔 인증 확인. VTY 원격 접속은 미지원입니다.' },
    { title: 'Cisco Packet Tracer', description: '9.0.0.0810의 1941 모델에서 VTY 원격 인증·유휴 종료를 추가 확인한 소프트웨어 시뮬레이션입니다.' },
  ],
  rows: [
    {
      labId: 'windows-ipv4', title: 'IPv4 주소·서브넷 설정',
      icqa: { state: 'confirmed', label: '입력·저장·재확인 통과', detail: '/29 주소·마스크·게이트웨이·DNS를 입력하고 속성을 다시 열어 값 유지를 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제 미실시', detail: '' },
      limit: '실제 네트워크 통신은 미검증입니다. ipconfig /all은 설정과 무관한 고정 출력이므로 검증 근거로 사용할 수 없습니다.',
    },
    {
      labId: 'windows-dhcp', title: 'DHCP 범위·임대 기간',
      icqa: { state: 'confirmed', label: '비활성 범위 생성·설정 확인 통과', detail: '주소 범위, /25 마스크, 제외 범위, 6시간 임대를 속성과 주소 풀에서 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제 미실시', detail: '' },
      limit: '범위 활성화, 클라이언트의 실제 주소 임대·갱신은 미실시입니다.',
    },
    {
      labId: 'windows-dns-records', title: 'DNS A·CNAME 레코드',
      icqa: { state: 'confirmed', label: '생성·보존 확인 통과', detail: 'lab.example 영역에 A·CNAME을 생성하고 목록·속성에서 값을 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제 미실시', detail: '' },
      limit: '실제 이름 조회는 미검증입니다. 에뮬레이터의 nslookup은 고정 출력이므로 생성한 레코드의 응답 확인에 사용할 수 없습니다.',
    },
    {
      labId: 'windows-dns-soa', title: 'DNS SOA 관리 정보·시간',
      icqa: { state: 'confirmed', label: '입력·저장·재확인 통과', detail: '일련번호, 주 서버, 책임자, 갱신·재시도·만료·TTL 값과 단위를 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제 미실시', detail: '' },
      limit: '설정한 시간에 따른 실제 DNS 동작은 미검증입니다. 레코드 추가 후 일련번호 자동 증가는 관찰되지 않았습니다.',
    },
    {
      labId: 'router-basics', title: '라우터 모드·호스트 이름·저장',
      icqa: { state: 'confirmed', label: '명령·저장 통과', detail: '모드 전환, hostname LAB-R1, 저장 [OK], running-config·startup-config의 이름 일치를 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제의 독립 검증 미실시', detail: '' },
      limit: '프로그램 재실행 후에는 새 시험으로 초기화됩니다. 실행 중 저장 성공과 재실행 간 보존을 구분해야 합니다.',
    },
    {
      labId: 'router-interface', title: '인터페이스 IPv4·마스크·활성화',
      icqa: { state: 'confirmed', label: '설정·저장 통과', detail: 'FastEthernet0/0의 주소·마스크와 관리상 활성화를 확인했습니다. 상태는 up / protocol down입니다.' },
      packetTracer: { state: 'preparation', label: 'VTY 실습 준비 과정만 확인', detail: '해당 과제 자체는 미실시입니다. 별도 주소를 사용한 Gig0/0 up/up·ping 4/4를 확인했습니다.' },
      limit: '원래 과제의 포트·주소 조건으로 실제 통신한 결과는 없습니다. Packet Tracer의 준비 과정 결과를 해당 과제 전체 통과로 확대하지 않습니다.',
    },
    {
      labId: 'router-route', title: '정적 경로 설정',
      icqa: { state: 'confirmed', label: '명령 수락·설정 저장 통과', detail: 'ip route 행이 running-config·startup-config에 유지되는 것을 확인했습니다.' },
      packetTracer: { state: 'not-tested', label: '해당 과제 미실시', detail: '' },
      limit: '라우팅 테이블에 경로가 실제 등록되는지, 다른 네트워크로 패킷이 전달되는지는 미검증입니다. Packet Tracer의 동일 서브넷 ping은 정적 경로 검증이 아닙니다.',
    },
    {
      labId: 'router-access', title: '콘솔·VTY 인증·유휴 시간',
      icqa: { state: 'confirmed', label: '설정·저장 및 콘솔 인증 통과', detail: '두 라인의 비밀번호·login, VTY exec-timeout 5 30 저장을 확인했습니다. 콘솔 재접속 시 오답 거부·정답 접속을 확인했습니다. VTY 원격 접속은 도구 미지원입니다.' },
      packetTracer: { state: 'confirmed', label: 'VTY 인증·유휴 종료 관찰 통과', detail: '라인 비밀번호 + login으로 오답 거부·정답 접속 및 vty 0을 확인했습니다. 입력 없는 대기 후 330.4초 초과~344.2초 이하에 종료되고 VTY 목록에서 사라졌습니다.' },
      limit: '소프트웨어 시뮬레이션 1회 결과입니다. 정확히 330초에 종료됐다는 검증은 아닙니다. 실제 장비·다른 IOS 버전은 미검증입니다.',
    },
  ],
  limitations: [
    { title: 'Windows 실행 방식', detail: 'ICQA 개별 화면 프로그램을 일반 권한으로 실행했습니다. 관리자 권한 런처를 통한 전체 실행 흐름과의 동일성은 확인하지 않았습니다.' },
    { title: '저장과 재실행', detail: 'Windows 에뮬레이터의 실행 중 값 유지와 프로그램 재실행 후 초기화를 구분해야 합니다. 라우터 데모도 재실행하면 새 시험으로 시작하며 startup-config is not present가 확인됐습니다.' },
    { title: '환경 구분', detail: 'Packet Tracer 검증은 9.0.0.0810의 1941 모델 시뮬레이션입니다. 실제 Windows Server 2022, 실제 Cisco 장비 또는 실제 IOS 이미지에서 수행한 검증은 아닙니다.' },
    { title: '시험 채점', detail: '자체 학습 과제의 실행 확인이며, 협회 시험의 채점 방식·점수와 일치하는지는 확인하지 못했습니다.' },
  ],
};
