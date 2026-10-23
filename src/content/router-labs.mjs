const checkedAt = '2026-10-23';

const source = (title, url, section) => ({ title, url, section, checkedAt });

const S = {
  icqa: source(
    'ICQA — Router Emulator 프로그램: 수험생 실습용',
    'https://www.icqa.or.kr/cn/board/dataroom/21',
    '공식 실습 도구 안내와 다운로드'
  ),
  cli: source(
    'Cisco — Cisco IOS CLI for Initial Configuration',
    'https://www.cisco.com/c/en/us/td/docs/routers/access/1900/software/configuration/guide/Software_Configuration/appendixAcli.html',
    'Configuring the Router Hostname; Configuring Virtual Terminal Lines for Remote Console Access; Saving Your Router Configuration'
  ),
  configuration: source(
    'Cisco — Managing Configuration Files',
    'https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/system-management/system-management/m_cm-config-files-0.html',
    '현재 설정과 시작 설정의 구분, show 및 copy 명령'
  ),
  interfaces: source(
    'Cisco — Configure Initial Router Settings on Cisco 4000 Series ISRs',
    'https://www.cisco.com/c/en/us/td/docs/routers/access/4400/software/configuration/xe-16-12/isr4400swcfg-xe-16-12-book/isr4400swcfg-xe-16-9-book_chapter_011010.html',
    'Configure Gigabit Ethernet Interfaces; Configure IP Routing and IP Protocols'
  ),
  routing: source(
    'Cisco — IOS IP Routing: Protocol-Independent Command Reference',
    'https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/iri-cr-book/iri-cr-a1.html',
    'ip route: 정적 경로 문법과 다음 홉 경로의 유효성'
  ),
  timeout: source(
    'Cisco — IOS Configuration Fundamentals Command Reference',
    'https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/Cisco_IOS_Configuration_Fundamentals_Command_Reference/D_through_E.html',
    'exec-timeout: minutes [seconds], line configuration mode'
  ),
  security: source(
    'Cisco — Harden IOS Devices',
    'https://www.cisco.com/c/en/us/support/docs/ip/access-lists/13608-21.html',
    'Use Secure Protocols When Possible; EXEC Timeout; Control vty and tty Lines'
  ),
};

const modeOptions = [
  { value: 'user-exec', label: '사용자 EXEC: Router>' },
  { value: 'privileged-exec', label: '특권 EXEC: Router#' },
  { value: 'global-config', label: '전역 설정: Router(config)#' },
  { value: 'interface-config', label: '인터페이스 설정: Router(config-if)#' },
  { value: 'line-config', label: '라인 설정: Router(config-line)#' },
];

const saveOptions = [
  { value: 'running-config', label: 'running-config: 현재 실행 설정' },
  { value: 'startup-config', label: 'startup-config: 시작 설정' },
  { value: 'terminal-output', label: '터미널에 표시된 조회 결과' },
];

const saveCheck = (id) => ({
  id,
  label: '재시작에 대비해 현재 설정을 복사할 대상',
  kind: 'choice',
  expected: 'startup-config',
  options: saveOptions,
  explanation: 'copy running-config startup-config는 현재 실행 설정을 시작 설정으로 복사합니다. 조회 화면의 출력 내용을 저장하는 명령은 아닙니다.',
});

const executionNote = '공식 문서와 설정값을 대조한 실습 자료입니다. 이 화면은 IOS 명령을 실행하거나 장비 상태를 자동 채점하지 않습니다. 작성 과정에서 ICQA 프로그램과 실제 라우터를 실행하지 않았으므로 사용 중인 버전의 명령 지원 여부는 별도로 확인하세요.';

export const ROUTER_LABS = [
  {
    id: 'router-basics',
    group: 'router',
    title: '라우터 모드·호스트 이름·저장',
    summary: '프롬프트로 명령을 입력할 위치를 구분하고, 호스트 이름 변경과 시작 설정 저장을 연습합니다.',
    minutes: 12,
    objectives: [
      '사용자 EXEC, 특권 EXEC, 전역 설정 모드를 프롬프트로 구분합니다.',
      '지정한 호스트 이름을 정확하게 입력합니다.',
      '현재 설정 조회와 시작 설정 저장을 구분합니다.',
    ],
    environment: '콘솔로 접속한 독립 연습용 라우터에서 Router>로 시작하는 과제입니다. 이미 Router#이면 enable 단계는 생략합니다. ICQA 공식 도구나 같은 IOS 문법을 지원하는 연습 환경에서 수행하며, 운영 중인 장비의 설정을 바꾸는 과제가 아닙니다.',
    scenario: '실습실의 라우터 이름을 LAB-R1로 지정하고, 다음 시작 때 읽을 설정에도 같은 이름이 남도록 저장하세요.',
    requirements: [
      { label: '호스트 이름', value: 'LAB-R1 — 이 과제에서는 대소문자까지 일치시킵니다.' },
      { label: '조회할 내용', value: '현재 실행 설정의 hostname 항목' },
      { label: '저장 방향', value: '현재 실행 설정 → 시작 설정' },
    ],
    steps: [
      {
        title: '현재 모드를 확인하세요',
        body: 'Router>에서는 enable을 입력해 Router#으로 이동합니다. 뒤의 #만 보고 설정 모드라고 판단하지 말고, 괄호 안의 config 표시도 확인하세요.',
        commands: ['enable'],
        check: '특권 EXEC 모드의 프롬프트가 Router# 형태인지 확인합니다.',
      },
      {
        title: '전역 설정에서 이름을 지정하세요',
        body: 'configure terminal로 전역 설정 모드에 들어갑니다. hostname 명령 뒤에 요구한 이름을 입력하면 프롬프트 앞의 장비 이름이 바뀝니다.',
        commands: ['configure terminal', 'hostname LAB-R1'],
        check: 'LAB-R1(config)#처럼 이름과 전역 설정 표시가 함께 보이는지 확인합니다.',
      },
      {
        title: '현재 설정을 조회하세요',
        body: 'end로 특권 EXEC 모드에 돌아온 뒤 현재 설정을 읽습니다. 화면에서 hostname LAB-R1을 찾으세요.',
        commands: ['end', 'show running-config'],
        check: '이름을 확인한 시점과 시작 설정에 저장한 시점은 서로 다릅니다.',
      },
      {
        title: '시작 설정에 저장하고 확인하세요',
        body: 'copy 명령을 실행합니다. Destination filename [startup-config]?가 나오면 기본 이름을 유지하도록 Enter를 누릅니다. 저장 완료를 확인한 뒤 시작 설정을 조회합니다.',
        commands: ['copy running-config startup-config', 'show startup-config'],
        check: '시작 설정에도 hostname LAB-R1이 있는지 확인합니다. 이 과제에서 재부팅할 필요는 없습니다.',
      },
    ],
    checks: [
      {
        id: 'router-basics-hostname',
        label: '설정할 호스트 이름',
        kind: 'text',
        expected: 'LAB-R1',
        explanation: '과제의 정확한 문자열은 LAB-R1입니다. 이 입력값 점검은 대소문자도 구분합니다.',
        hint: '영문 대문자, 하이픈, 숫자의 순서를 확인하세요.',
      },
      {
        id: 'router-basics-hostname-mode',
        label: 'hostname 명령을 입력하는 모드',
        kind: 'choice',
        expected: 'global-config',
        options: modeOptions,
        explanation: 'hostname은 전역 설정 모드에서 입력합니다. configure terminal로 들어가면 (config)#가 표시됩니다.',
      },
      {
        id: 'router-basics-save-mode',
        label: '이 절차에서 copy 명령을 입력하는 모드',
        kind: 'choice',
        expected: 'privileged-exec',
        options: modeOptions,
        explanation: '이 절차에서는 end로 특권 EXEC 모드에 돌아온 후 copy running-config startup-config를 실행합니다.',
      },
      saveCheck('router-basics-save-target'),
    ],
    solution: [
      {
        title: '전체 명령 순서',
        body: 'Router>에서 시작하는 예입니다. 프롬프트 자체는 입력하지 않습니다. 저장 대상 질문이 나타나면 Enter로 startup-config를 선택한 뒤 마지막 조회 명령을 입력하세요.',
        commands: [
          'enable',
          'configure terminal',
          'hostname LAB-R1',
          'end',
          'show running-config',
          'copy running-config startup-config',
          'show startup-config',
        ],
      },
    ],
    pitfalls: [
      { title: '조회와 저장을 섞지 마세요', body: 'show running-config는 설정을 화면에 표시합니다. copy running-config startup-config는 현재 설정을 시작 설정으로 복사합니다. show 명령의 화면 출력을 복사하는 과정이 아닙니다.' },
      { title: '이름이 바뀌어도 모드는 따로 확인하세요', body: 'LAB-R1(config)#와 LAB-R1#는 서로 다른 모드입니다. 이름이 바뀌었다는 사실만으로 저장까지 끝난 것은 아닙니다.' },
    ],
    sourcePages: [281],
    sourceNotes: [
      '사용자 제공 2024 교재 PDF 281쪽의 호스트 이름·저장 과제를 참고하여 이름, 안내, 점검 문항을 자체 작성했습니다. 교재 스캔 화면은 포함하지 않았습니다.',
      'ICQA 자료실은 수험생용 공식 도구의 안내 근거입니다. 이 자체 과제가 공식 기출문제이거나 협회 채점과 동일하다는 의미는 아닙니다.',
      executionNote,
    ],
    sources: [S.icqa, S.cli, S.configuration],
    relatedTheory: ['devices-switch-router'],
  },
  {
    id: 'router-interface',
    group: 'router',
    title: '인터페이스 IPv4·마스크·활성화',
    summary: '지정한 포트에 IPv4 주소와 마스크를 설정하고, 관리상 활성화와 실제 링크 상태를 나누어 확인합니다.',
    minutes: 12,
    objectives: [
      '/26 네트워크의 첫 사용 가능 주소와 서브넷 마스크를 구합니다.',
      '인터페이스 설정 모드에서 주소와 no shutdown을 적용합니다.',
      '주소·상태 조회 후 시작 설정에 저장합니다.',
    ],
    environment: 'FastEthernet0/0이라는 라우팅용 인터페이스가 제공되는 독립 연습 장비를 가정합니다. 연결 상대와 케이블은 준비되어 있으며 주소 중복은 없습니다. 실제 장비가 GigabitEthernet0/0 또는 다른 이름을 쓰면 show ip interface brief로 이름을 확인하고 과제 장비에 맞게 바꿔야 합니다. 모든 기기에 FastEthernet0/0이 있다는 뜻은 아닙니다.',
    scenario: 'FastEthernet0/0을 192.168.10.0/26 네트워크의 첫 사용 가능한 호스트 주소로 설정하고 관리상 비활성화를 해제하세요. 주소와 상태를 조회한 뒤 설정을 저장하세요.',
    requirements: [
      { label: '과제 인터페이스', value: 'FastEthernet0/0' },
      { label: '네트워크', value: '192.168.10.0/26' },
      { label: '인터페이스 주소', value: '위 네트워크의 첫 사용 가능한 호스트 주소' },
      { label: '관리 상태', value: 'shutdown 해제' },
      { label: '저장 대상', value: 'startup-config' },
    ],
    steps: [
      {
        title: '포트와 주소 범위를 확인하세요',
        body: '특권 EXEC 모드에서 인터페이스 목록을 읽습니다. 과제 포트가 있는지 확인하고 /26의 마스크와 첫 호스트 주소를 계산하세요.',
        commands: ['enable', 'show ip interface brief'],
        check: 'FastEthernet0/0의 존재와 현재 IP-Address, Status, Protocol을 확인합니다.',
      },
      {
        title: '인터페이스 설정 모드로 이동하세요',
        body: '전역 설정에서 해당 인터페이스를 선택합니다. (config-if)#가 보이는 위치에서 ip address 뒤에 계산한 주소와 마스크를 입력하세요.',
        commands: ['configure terminal', 'interface FastEthernet0/0'],
        check: '다른 포트를 선택하지 않았는지 확인합니다.',
      },
      {
        title: '관리상 비활성화를 해제하세요',
        body: 'IP 주소를 설정한 후 no shutdown을 입력합니다. 이 명령만으로 케이블이나 상대 장비 문제까지 해결되는 것은 아닙니다.',
        commands: ['no shutdown', 'end'],
        check: '특권 EXEC 모드로 돌아왔는지 확인합니다.',
      },
      {
        title: '주소·마스크·링크 상태를 조회하세요',
        body: 'brief 출력에서 주소와 상태를 확인하고, running-config의 해당 인터페이스 항목에서 마스크를 확인합니다. Status와 Protocol이 up인지 따로 읽으세요.',
        commands: ['show ip interface brief', 'show running-config'],
        check: 'administratively down은 관리상 비활성화 상태입니다. no shutdown 후에도 down이면 연결 상대와 케이블 등 실제 환경을 확인해야 합니다.',
      },
      {
        title: '시작 설정을 저장하세요',
        body: '확인한 현재 설정을 시작 설정으로 복사합니다. 저장 대상 질문이 나오면 기본값을 선택하고 저장 완료를 확인하세요.',
        commands: ['copy running-config startup-config', 'show startup-config'],
        check: '해당 인터페이스의 IP 주소와 마스크가 시작 설정에도 있는지 확인합니다.',
      },
    ],
    checks: [
      {
        id: 'router-interface-address',
        label: '첫 사용 가능한 인터페이스 IPv4 주소',
        kind: 'ipv4',
        expected: '192.168.10.1',
        explanation: '/26 블록의 네트워크 주소는 192.168.10.0, 브로드캐스트 주소는 192.168.10.63입니다. 첫 호스트 주소는 192.168.10.1입니다.',
        hint: '네트워크 주소 자체를 인터페이스의 호스트 주소로 지정하지 마세요.',
      },
      {
        id: 'router-interface-mask',
        label: '/26을 점으로 구분한 서브넷 마스크',
        kind: 'mask',
        expected: '255.255.255.192',
        explanation: '/26은 앞의 26비트가 1입니다. 마지막 옥텟 11000000은 192이므로 255.255.255.192입니다.',
      },
      {
        id: 'router-interface-mode',
        label: '이 과제의 ip address 명령 입력 모드',
        kind: 'choice',
        expected: 'interface-config',
        options: modeOptions,
        explanation: 'interface FastEthernet0/0으로 선택한 인터페이스의 (config-if)#에서 주소를 설정합니다.',
      },
      {
        id: 'router-interface-enable',
        label: '관리상 비활성화를 해제하는 명령',
        kind: 'choice',
        expected: 'no shutdown',
        options: [
          { value: 'shutdown', label: 'shutdown' },
          { value: 'no shutdown', label: 'no shutdown' },
          { value: 'show ip interface brief', label: 'show ip interface brief' },
        ],
        explanation: 'no shutdown은 인터페이스의 관리상 비활성화를 해제합니다. show ip interface brief는 조회 명령입니다.',
      },
      saveCheck('router-interface-save-target'),
    ],
    solution: [
      {
        title: '주소 계산과 전체 명령',
        body: '블록 크기는 64개 주소입니다. 이 블록의 호스트 범위는 192.168.10.1~192.168.10.62입니다. 아래 명령은 FastEthernet0/0이 제공되는 과제 환경을 기준으로 합니다.',
        commands: [
          'enable',
          'show ip interface brief',
          'configure terminal',
          'interface FastEthernet0/0',
          'ip address 192.168.10.1 255.255.255.192',
          'no shutdown',
          'end',
          'show ip interface brief',
          'show running-config',
          'copy running-config startup-config',
          'show startup-config',
        ],
      },
    ],
    pitfalls: [
      { title: 'IP 설정과 포트 활성화는 다릅니다', body: '주소를 입력했다고 shutdown 상태가 자동으로 해제된다고 가정하지 마세요. 주소·마스크·관리 상태를 각각 확인합니다.' },
      { title: 'brief 출력만으로 마스크를 확인하지 마세요', body: 'show ip interface brief는 주로 주소와 상태를 간단히 보여 줍니다. 이 절차에서는 show running-config의 ip address 행으로 마스크도 확인합니다.' },
      { title: '인터페이스 이름을 그대로 적용하지 마세요', body: 'FastEthernet0/0은 이 과제의 장비 조건입니다. 실제 장비의 포트 이름과 라우팅 기능 지원 여부는 먼저 확인해야 합니다.' },
    ],
    sourcePages: [291, 297],
    sourceNotes: [
      '사용자 제공 2024 교재 PDF 291쪽의 인터페이스 활성화와 297쪽의 IPv4 설정 유형을 참고했습니다. 포트 조건과 사설 주소를 새로 정해 작성했으며 스캔 이미지는 포함하지 않았습니다.',
      'Cisco 문서의 ip address, no shutdown, show ip interface brief 절차를 대조했습니다. 문서에 제시된 기종의 포트 이름을 ICQA 도구의 고정 사양으로 간주하지 않았습니다.',
      executionNote,
    ],
    sources: [S.icqa, S.interfaces, S.configuration],
    relatedTheory: ['devices-switch-router', 'tcpip-subnetting'],
  },
  {
    id: 'router-route',
    group: 'router',
    title: '목적지·마스크·다음 홉으로 정적 경로 설정',
    summary: '멀리 있는 네트워크와 바로 다음 라우터의 주소를 구분해 정적 경로를 작성하고 확인합니다.',
    minutes: 12,
    objectives: [
      '목적지 네트워크 주소와 다음 홉 주소를 구분합니다.',
      '전역 설정 모드에서 정적 경로를 작성합니다.',
      '설정 내용, 실제 라우팅 테이블, 시작 설정을 각각 확인합니다.',
    ],
    environment: '두 연습 라우터 R1·R2의 IP 라우팅이 활성화되어 있고 연결 구간은 up 상태라고 가정합니다. R1의 연결 주소는 10.0.12.1/30, R2는 10.0.12.2/30입니다. R1의 LAN은 192.168.10.0/24, R2의 LAN은 192.168.20.0/24이며 R2의 반환 경로는 미리 설정되어 있습니다. 이번 과제에서는 R1만 설정합니다.',
    scenario: 'R1이 192.168.20.0/24로 향하는 패킷을 연결 상대 R2로 전달하도록 정적 경로를 추가하고, 조회·저장을 완료하세요.',
    requirements: [
      { label: '설정할 장비', value: 'R1' },
      { label: '목적지 네트워크', value: '192.168.20.0/24' },
      { label: '라우터 연결망', value: '10.0.12.0/30' },
      { label: 'R1 연결 주소', value: '10.0.12.1' },
      { label: 'R2 연결 주소', value: '10.0.12.2' },
      { label: '저장 대상', value: 'startup-config' },
    ],
    steps: [
      {
        title: '목적지와 다음 홉을 나누세요',
        body: '목적지는 R2 뒤의 네트워크입니다. 다음 홉은 R1에서 패킷을 넘겨줄 R2의 연결 주소입니다. R1 자신의 주소를 다음 홉으로 입력하지 마세요.',
        check: '목적지 네트워크, 목적지 마스크, 다음 홉의 세 값을 따로 적어 봅니다.',
      },
      {
        title: '기존 경로와 연결 상태를 확인하세요',
        body: 'R1에서 연결망과 인터페이스 상태를 읽습니다. 같은 목적지에 이미 다른 경로가 있는지 확인하세요.',
        commands: ['enable', 'show ip interface brief', 'show ip route'],
        check: '이 과제의 연결망 10.0.12.0/30과 연결 상대 10.0.12.2에 도달할 조건을 확인합니다.',
      },
      {
        title: '전역 설정에서 정적 경로를 입력하세요',
        body: 'configure terminal 다음에 ip route, 목적지 네트워크, 목적지 마스크, 다음 홉 순서로 입력합니다. 인터페이스 설정 모드에서 입력하는 명령이 아닙니다.',
        commands: ['configure terminal'],
        check: 'R1(config)#에서 입력하는지 확인합니다.',
      },
      {
        title: '설정 내용과 사용 중인 경로를 대조하세요',
        body: 'end로 돌아온 뒤 running-config의 ip route 행과 라우팅 테이블을 각각 확인합니다. 이 과제 조건에서 목적지 /24와 다음 홉이 맞는 정적 경로를 찾으세요.',
        commands: ['end', 'show running-config', 'show ip route'],
        check: '정적 경로의 표시는 S입니다. 설정 행이 있어도 다음 홉으로 가는 유효한 경로가 없으면 사용 중인 라우팅 테이블에 나타나지 않을 수 있습니다.',
      },
      {
        title: '시작 설정에 경로를 저장하세요',
        body: '현재 설정을 복사한 뒤 시작 설정의 ip route 행을 다시 읽습니다. show ip route의 조회 화면을 저장하는 과정은 아닙니다.',
        commands: ['copy running-config startup-config', 'show startup-config'],
        check: '목적지 주소·마스크·다음 홉이 시작 설정에서도 일치하는지 확인합니다.',
      },
    ],
    checks: [
      {
        id: 'router-route-destination',
        label: 'ip route 뒤의 목적지 네트워크 주소',
        kind: 'ipv4',
        expected: '192.168.20.0',
        explanation: '추가할 경로의 목적지는 192.168.20.0/24 전체입니다. R2의 개별 인터페이스 주소를 목적지 네트워크 자리와 혼동하지 마세요.',
      },
      {
        id: 'router-route-mask',
        label: '목적지 /24의 서브넷 마스크',
        kind: 'mask',
        expected: '255.255.255.0',
        explanation: '목적지 네트워크의 /24 마스크를 사용합니다. 연결망 /30의 마스크 255.255.255.252를 쓰는 자리가 아닙니다.',
      },
      {
        id: 'router-route-next-hop',
        label: '다음 홉 IPv4 주소',
        kind: 'ipv4',
        expected: '10.0.12.2',
        explanation: 'R1의 다음 전달 대상은 연결 상대 R2의 10.0.12.2입니다. 10.0.12.1은 R1 자신의 연결 주소입니다.',
        hint: '출발 장비가 아닌 바로 다음 라우터의 연결 주소를 고르세요.',
      },
      {
        id: 'router-route-mode',
        label: 'ip route 명령을 입력하는 모드',
        kind: 'choice',
        expected: 'global-config',
        options: modeOptions,
        explanation: 'ip route는 전역 설정 모드에서 입력합니다. 이 과제에서는 configure terminal 다음에 정적 경로를 추가합니다.',
      },
      saveCheck('router-route-save-target'),
    ],
    solution: [
      {
        title: 'R1에 입력할 전체 명령',
        body: '목적지 /24는 255.255.255.0이며, 연결 상대 R2의 주소 10.0.12.2를 다음 홉으로 지정합니다. R2와 연결 구간의 사전 설정은 이 과제의 준비 조건입니다.',
        commands: [
          'enable',
          'show ip interface brief',
          'show ip route',
          'configure terminal',
          'ip route 192.168.20.0 255.255.255.0 10.0.12.2',
          'end',
          'show running-config',
          'show ip route',
          'copy running-config startup-config',
          'show startup-config',
        ],
      },
    ],
    pitfalls: [
      { title: '목적지와 다음 홉을 바꾸지 마세요', body: '192.168.20.0은 도달할 네트워크이고 10.0.12.2는 다음 전달 대상입니다. 연결망의 네트워크 주소 10.0.12.0이나 R1 자신의 10.0.12.1을 다음 홉으로 쓰지 않습니다.' },
      { title: '설정 저장이 통신 성공을 증명하지는 않습니다', body: '시작 설정에 경로가 있어도 링크, 다음 홉 도달성, 상대편 반환 경로를 따로 확인해야 합니다. 이 화면의 값 점검은 실제 패킷 전달 시험을 대신하지 않습니다.' },
      { title: '기본 게이트웨이 명령과 구분하세요', body: '이 과제는 IP 라우팅이 활성화된 R1의 특정 목적지 경로를 추가합니다. ip default-gateway로 이 정적 경로를 대신하지 않습니다.' },
    ],
    sourcePages: [331],
    sourceNotes: [
      '사용자 제공 2024 교재 PDF 331쪽의 두 라우터 정적 경로 유형을 참고했습니다. 목적지·연결망·사전 조건을 새로 작성하고 next hop과 목적지를 구분했습니다. 스캔과 원문 문제 화면은 포함하지 않았습니다.',
      'Cisco의 ip route dest-prefix mask next-hop-ip-address 문법 및 show ip route 절차와 대조했습니다.',
      executionNote,
    ],
    sources: [S.icqa, S.routing, S.interfaces, S.configuration],
    relatedTheory: ['devices-switch-router', 'tcpip-subnetting'],
  },
  {
    id: 'router-access',
    group: 'router',
    title: '콘솔·VTY와 접속 유휴 시간',
    summary: '콘솔과 원격 접속 라인을 구분하고, VTY 유휴 시간을 분·초로 설정한 뒤 저장합니다.',
    minutes: 12,
    objectives: [
      'console 0과 vty 0 4의 대상과 라인 개수를 구분합니다.',
      '라인 비밀번호와 login의 역할을 구분합니다.',
      'exec-timeout의 분·초 순서를 확인하고 시작 설정에 저장합니다.',
    ],
    environment: '콘솔로 접속한 격리된 시험 연습 환경입니다. console 0과 vty 0~4가 제공되고, 별도 AAA 인증은 설정되지 않았으며 VTY의 Telnet 허용 및 IP 연결은 미리 준비되어 있다고 가정합니다. 아래 비밀번호는 이 연습에만 쓰는 예시입니다. 실제 운영 환경의 원격 접속 정책은 별도로 정해야 합니다.',
    scenario: '콘솔 라인과 VTY 라인에 서로 다른 연습용 비밀번호를 설정하세요. VTY에서는 사용자 입력이 5분 30초 동안 없으면 세션을 끝내도록 설정하고 저장하세요.',
    requirements: [
      { label: '콘솔 대상', value: 'console 0' },
      { label: '콘솔 연습용 비밀번호', value: 'ConsoleLab26' },
      { label: '원격 접속 대상', value: 'vty 0 4 — 양 끝 번호 포함' },
      { label: 'VTY 연습용 비밀번호', value: 'VtyLab26' },
      { label: 'VTY 유휴 시간', value: '5분 30초' },
      { label: '저장 대상', value: 'startup-config' },
    ],
    steps: [
      {
        title: '콘솔 라인을 선택하세요',
        body: '전역 설정에서 line console 0으로 로컬 콘솔 라인을 선택합니다. 라인을 선택하면 프롬프트가 (config-line)# 형태로 바뀝니다.',
        commands: ['enable', 'configure terminal', 'line console 0'],
        check: '지금 선택한 대상이 vty가 아닌 console 0인지 확인합니다.',
      },
      {
        title: '콘솔 비밀번호 확인을 설정하세요',
        body: '연습용 비밀번호를 지정한 뒤 login으로 라인 비밀번호 확인을 적용합니다. exit로 전역 설정에 돌아갑니다.',
        commands: ['password ConsoleLab26', 'login', 'exit'],
        check: '비밀번호 문자열의 대소문자와 대상 라인을 확인합니다.',
      },
      {
        title: 'VTY 라인과 유휴 시간을 설정하세요',
        body: 'vty 0 4는 0번부터 4번까지 5개 라인을 선택합니다. 비밀번호와 login을 설정한 뒤 exec-timeout에 분, 초 순서로 값을 넣습니다.',
        commands: ['line vty 0 4', 'password VtyLab26', 'login', 'exec-timeout 5 30'],
        check: 'exec-timeout 5 30은 총 330초입니다. 5.30분 또는 530초가 아닙니다.',
      },
      {
        title: '두 라인의 설정을 각각 확인하세요',
        body: '특권 EXEC 모드로 돌아와 현재 설정에서 콘솔과 VTY 항목을 각각 찾습니다. VTY 범위와 exec-timeout의 두 값을 확인하세요.',
        commands: ['end', 'show running-config'],
        check: '설정에 따라 비밀번호가 변환되어 표시될 수 있으므로 화면 문자열만으로 실제 인증 성공을 단정하지 않습니다.',
      },
      {
        title: '저장하고 연습 범위를 구분하세요',
        body: '시작 설정에 저장한 뒤 두 라인 항목을 확인합니다. 원격 인증·유휴 종료의 실제 동작은 준비된 공식 도구나 장비에서 별도 수행해야 합니다.',
        commands: ['copy running-config startup-config', 'show startup-config'],
        check: 'Telnet 연습 절차를 운영 보안 설정의 완성본으로 사용하지 마세요. Cisco는 관리 정보 보호를 위해 SSH 같은 암호화된 원격 접속을 권고합니다.',
      },
    ],
    checks: [
      {
        id: 'router-access-console-type',
        label: '로컬 콘솔 접속을 설정하는 라인 종류',
        kind: 'choice',
        expected: 'console',
        options: [
          { value: 'console', label: 'console' },
          { value: 'vty', label: 'vty' },
          { value: 'interface', label: 'interface' },
        ],
        explanation: 'line console 0은 로컬 콘솔 접속 라인을 선택합니다. 인터페이스의 IP 주소를 지정하는 명령과 다릅니다.',
      },
      {
        id: 'router-access-vty-type',
        label: '이 과제에서 원격 접속을 설정하는 라인 종류',
        kind: 'choice',
        expected: 'vty',
        options: [
          { value: 'console', label: 'console' },
          { value: 'vty', label: 'vty' },
          { value: 'interface', label: 'interface' },
        ],
        explanation: 'VTY는 원격 접속용 가상 터미널 라인입니다. Telnet 전용이라는 뜻은 아니며, 지원 환경에서는 SSH도 VTY를 사용합니다.',
      },
      {
        id: 'router-access-vty-count',
        label: 'line vty 0 4로 선택하는 라인 수',
        kind: 'integer',
        expected: '5',
        explanation: '양 끝 번호를 포함하므로 0, 1, 2, 3, 4의 5개입니다. 모든 장비의 전체 VTY 개수가 5개라는 뜻은 아닙니다.',
      },
      {
        id: 'router-access-timeout-minutes',
        label: 'exec-timeout의 첫 번째 값: 분',
        kind: 'integer',
        expected: '5',
        explanation: '요구한 유휴 시간 5분 30초 중 첫 번째 인수는 분 단위의 5입니다.',
      },
      {
        id: 'router-access-timeout-seconds',
        label: 'exec-timeout의 두 번째 값: 초',
        kind: 'integer',
        expected: '30',
        explanation: '두 번째 인수는 추가 초입니다. 5분에 30초를 더하므로 exec-timeout 5 30을 사용합니다.',
      },
      saveCheck('router-access-save-target'),
    ],
    solution: [
      {
        title: '격리된 시험 연습 환경의 전체 명령',
        body: '콘솔로 접속한 Router>에서 시작하는 예입니다. VTY의 Telnet 허용과 IP 연결은 준비 조건이며, 이 순서만으로 SSH 서버 설정이 완료되지는 않습니다.',
        commands: [
          'enable',
          'configure terminal',
          'line console 0',
          'password ConsoleLab26',
          'login',
          'exit',
          'line vty 0 4',
          'password VtyLab26',
          'login',
          'exec-timeout 5 30',
          'end',
          'show running-config',
          'copy running-config startup-config',
          'show startup-config',
        ],
      },
    ],
    pitfalls: [
      { title: 'VTY 번호와 개수를 구분하세요', body: '0 4는 시작과 끝 번호입니다. 4개를 선택한다는 의미가 아니며, 장비에 따라 추가 VTY 라인이 존재할 수 있습니다.' },
      { title: '분과 초의 자리를 바꾸지 마세요', body: 'exec-timeout 30 5는 30분 5초입니다. 또한 0 0은 0초 뒤 즉시 종료가 아니라 유휴 시간 제한을 없애는 설정이므로 이 과제의 답이 아닙니다.' },
      { title: '비밀번호와 login을 함께 확인하세요', body: '이 과제의 초기 인증 조건에서는 password로 라인 비밀번호를 지정하고 login으로 접속 시 확인을 적용합니다. 비밀번호만 적었다고 실제 접속 확인까지 완료된 것은 아닙니다.' },
      { title: '시험의 Telnet과 운영 환경의 SSH를 구분하세요', body: '교재의 Telnet 유형을 이해하는 연습입니다. 운영 환경에서는 인증·관리 정보가 암호화되는 SSH를 권고하며, 실제 장비의 계정·키·허용 접속 정책을 갖춘 별도 설정이 필요합니다.' },
    ],
    sourcePages: [289, 290, 291],
    sourceNotes: [
      '사용자 제공 2024 교재 PDF 289~291쪽의 VTY 비밀번호·유휴 시간·콘솔 비밀번호 유형을 참고했습니다. 과제 조건과 비밀번호, 제한 시간은 새로 정했습니다. 스캔 이미지는 포함하지 않았습니다.',
      'exec-timeout의 minutes [seconds] 순서와 라인 설정 모드, VTY의 원격 접속 역할을 Cisco 공식 문서로 대조했습니다. Telnet 유형을 실제 운영의 SSH 권고와 구분했습니다.',
      executionNote,
    ],
    sources: [S.icqa, S.cli, S.timeout, S.security, S.configuration],
    relatedTheory: ['devices-switch-router'],
  },
];
