# Windows·라우터 실습 자료 검수

검토일: 2026-10-23. 기준 커밋: `3327f7b`. 실습 자료 추가와 기존 기능 회귀 확인을 기록한다. 공개 배포 결과는 `DEPLOYMENT.md`에 별도로 기록한다.

## 제공 범위

| 과제 ID | 학습 내용 | 입력값 점검 |
|---|---|---:|
| windows-ipv4 | IPv4·마스크·게이트웨이·DNS·네트워크/브로드캐스트 주소 | 6 |
| windows-dhcp | 주소 풀·제외 범위·6시간 임대·배포 후보 수 | 6 |
| windows-dns-records | A·CNAME·FQDN·별칭 대상 | 6 |
| windows-dns-soa | 주 서버·일련번호·갱신/재시도/만료/MINIMUM | 6 |
| router-basics | 명령 모드·hostname·현재/시작 설정 | 4 |
| router-interface | IPv4·/26·인터페이스 모드·no shutdown·저장 | 5 |
| router-route | 목적지 네트워크·마스크·다음 홉·모드·저장 | 5 |
| router-access | console·VTY·라인 수·유휴 시간·저장 | 6 |

8개 과제, 총 44개 입력값 점검이다. 각 과제는 조건, 단계별 절차, 풀이, 확인 명령, 혼동하기 쉬운 부분, 교재의 PDF 쪽수와 공식 문서 링크를 제공한다. 약 12분 표시는 설치를 제외한 학습 계획값이며 실제 학습자 소요시간을 측정한 결과가 아니다.

## 근거와 교정

사용자가 제공한 `2024네트워크관리사12급필기실기_opt.pdf`의 해당 원본 이미지를 확인했다. 교재 스캔이나 전체 본문은 앱·리포에 포함하지 않았으며 조건과 설명은 학습용으로 재구성했다. 파일의 `sourcePages`는 표지를 포함한 PDF 쪽수이다. 개별 기술 근거와 확인 절은 `windows-labs.mjs`, `router-labs.mjs`의 `sources`에 기록한다.

- [ICQA 출제기준 변경](https://www.icqa.or.kr/cn/board/notice/463): 2025-08-01부터 Windows Server 2022 출제, 기존 실기 에뮬레이터 유지. 2016 화면을 현재 OS 버전으로 표시하지 않는다.
- DHCP: PDF 253쪽의 임대 요구는 6시간이나 257쪽 완료 화면은 8시간이다. 요구 조건을 따라 **0일·6시간·0분**으로 교정했다. `.1~.126`에서 `.1~.10`을 제외한 후보 수는 **116개**이다. [Microsoft DHCP](https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server)와 대조했다. 추가 옵션을 구성하지 않는 이 과제는 비활성 범위 확인까지이며 실제 임대를 성공했다고 표시하지 않는다.
- IPv4: 새 `/29` 예제를 비트 연산으로 검증했다. `192.168.50.18/29`의 네트워크는 `.16`, 브로드캐스트는 `.23`, 일반 LAN 호스트는 `.17~.22`이다. 오래된 all-zero/all-ones 서브넷 제외 계산을 적용하지 않는다.
- DNS: A는 IPv4 주소, CNAME은 대상 이름으로 구분했다. [Microsoft DNS 레코드 관리](https://learn.microsoft.com/en-us/windows-server/networking/dns/manage-resource-records)로 확인했다. SOA MINIMUM을 모든 레코드 TTL로 설명하지 않으며, [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html#section-3)의 부정 응답 캐시 규칙으로 보완했다.
- 라우터: [Cisco 초기 설정](https://www.cisco.com/c/en/us/td/docs/routers/access/1900/software/configuration/guide/Software_Configuration/appendixAcli.html) 등을 근거로 모드·설정·조회·저장을 구분했다. `show`의 출력 결과와 `copy running-config startup-config`의 설정 복사를 혼동하지 않는다. `no shutdown` 후에도 실제 링크가 반드시 올라오는 것은 아니며, 정적 경로 저장과 패킷 전달 성공도 구분한다.
- VTY: `0 4`는 5개 라인, `exec-timeout 5 30`은 5분 30초이다. Telnet 유형의 시험 연습과 실제 운영에서의 SSH 권고를 구분하고 초기 인증·접속 조건을 명시했다.

이번 범위 밖의 교재 문항과 본문은 가져오지 않았다. 전체 474쪽의 오류를 모두 수정·인증했다는 의미가 아니다.

## 상태와 판정

`na2_study_labs_v1`에 과제별 초안·확인 여부·풀이 참고 여부만 저장한다. 기존 학습센터·필기·케이블링·단답형 저장 키와 점수를 변경하지 않는다. IPv4는 엄격한 4옥텟, 마스크는 연속 비트 또는 `/접두 길이`, DNS 이름은 대소문자·마지막 점 정규화, 정수는 안전한 정수, hostname은 과제에서 요구한 대소문자로 비교한다.

답안 수정 시 이전 판정을 해제한다. 오답 피드백의 기준값이나 풀이를 참고한 경우 해당 표시를 남긴다. 진행률은 실행 성공률이나 시험 점수가 아니라 모든 입력값이 일치한 과제 수이다. 과제 전환·메뉴 이동은 입력을 보존하며 새로고침 시 저장된 상태를 복원한다.

손상·빈 문자열 원문·미래 버전·저장 실패·다른 탭 변경은 기존 원문을 덮어쓰지 않고 저장을 중단한다. 미저장 입력은 메뉴 이동 중 메모리에 유지하며 현재 입력 백업과 새로고침/종료 전 경고를 제공한다. 비교 후 쓰기는 원자적 다중 탭 잠금이 아니다. 백업 가져오기는 제공하지 않는다.

필기·케이블링 평가 중에는 실습 목록·상세·풀이를 DOM에 렌더링하지 않는다. 이 기능은 기존 학습 흐름 차단을 유지하는 것으로 감독 시험의 보안을 뜻하지 않는다.

## 검증 결과

- Windows의 Node 24 환경: 기존 84개와 신규 12개, **총 96개 자동 테스트 통과**. 빈 답·오답·잘못된 주소/마스크·DNS 표기·정수·초안 왕복·손상·용량 실패·탭 충돌·기존 저장 키 보존을 검사했다.
- Vite 프로덕션 빌드 통과. `/NA2-study/` 배포 경로로 별도 빌드해 로컬 브라우저에서 확인했다. 새 실습 번들은 실습 진입 시 지연 로딩한다.
- 원본 검증: NA2-com `7e0c035`, NA2-cabling `8036a54`, 추적 파일 42개 SHA-256 일치. 원본 두 리포는 변경하지 않았다.
- 브라우저: Windows 4과제와 라우터 4과제의 입력 판정 44개, 목록 진행률 8/8 확인. IPv4에서 5/6 오답 → 수정 시 판정 해제 → 6/6 확인 → 새로고침 복원과 풀이 참고 표시를 확인했다. `/29`, `/25`, `/26`, `/24`, 대문자 FQDN과 마지막 점 입력을 확인했다. 최종 로컬 검수 탭의 error·warn 로그는 없었다.
- 기존 필기: 900문항 로딩, 2026년 2회 연습의 1번 답안 선택 후 실습 메뉴 왕복 시 문항과 선택 보존.
- 기존 케이블링: 유형 평가 4문항 제출·다음·결과 4/4 확인. 진행 중 실습/단답형 차단과 새로고침 차단 유지, 종료 후 해제 확인.
- 기존 실기 문제: PRAC-006의 `DHCP` 초안을 실습 메뉴 왕복 후 복원하고 정답·해설 표시 확인.
- 모바일: 브라우저 360×800 viewport에서 목록과 정적 경로 상세/입력 확인. 문서 폭 345px, scrollWidth 345px로 페이지 가로 넘침 없음. 실제 휴대전화 검사는 아님.
- 독립 소스 리뷰: 빈 답 44항목, 8개 상세 경로, 끝 슬래시, 잘못된 ID·상속 속성 이름·추가 하위 경로 거부 및 평가/저장 연결 확인. 해결되지 않은 결함을 발견하지 못했다.

로컬 화면 증거는 Git에서 제외하는 `verification/practical-labs-20261023/`에 보관한다. 위 결과는 웹앱·콘텐츠 검증이다. ICQA 라우터 시험 데모의 직접 검증은 아래 절에 따로 기록하며, 실제 Windows Server와 Cisco 장비는 실행하지 않았다.

## ICQA 에뮬레이터 직접 검증

검증일: 2026-10-23 (한국시간). 라우터 19:24~19:40, Windows 20:22~21:40. Windows 11 PC에서 Claude 데스크톱 앱의 화면 제어 도구로 실제 프로그램 창을 조작하고 출력을 읽었다. 앞 절의 웹앱 입력 판정은 이 검증으로 취급하지 않는다.

### 프로그램과 실행 방식

- 라우터: [ICQA 자료실 21](https://www.icqa.or.kr/cn/board/dataroom/21)의 `router.zip`(22,525,867바이트)에서 푼 `router.exe`. 파일 버전 1.0.0.0, 제품명 표기 없음. 창 제목은 "라우터 시뮬레이터"에서 시작 후 "라우터 실기"로 바뀐다. 시험 데모 1종(20분, 3문항, ROUTER1·ROUTER2 활성, ROUTER3·4 비활성)만 제공한다.
- 1차 실행에서는 앱의 4개 라우터 과제를 ROUTER1·ROUTER2 콘솔에서 시험했다. 앱 설정이 섞이지 않도록 프로그램을 다시 실행한 2차 실행에서 공식 3문항만 전체 명령으로 수행하고 답안을 제출했다.
- 데모 안내문은 "실제 라우터의 화면이나 구성요소가 다르거나 제한적"이라고 밝히고, startup-config 저장에는 `copy running-config startup-config` 또는 `copy r s`만 쓰며 `write`는 동작하지 않는다고 명시한다.
- Windows: 사용자 승인 후 [ICQA 자료실 18](https://www.icqa.or.kr/cn/board/dataroom/18)에서 `icqaControlSetup64.msi`(7,643,648바이트, SHA-256 `ee44e3b3a442cf1abcb65b859bb97c4bc005b9f295831c1a7eb1e24221a33e59`, 디지털 서명 없음, 제품 icqaControl 1.0.0, 제조사 ICQA)를 내려받아 기본 경로 `C:\Program Files\ICQA\icqaControl\`에 설치했다. .NET Framework 3.5 SP1은 이미 설치되어 있었다. 관리자 권한 확인 창은 사용자가 처리했다.
- 런처 `icqaControl.exe`(파일 버전 1.2.0.0)는 매니페스트가 `requireAdministrator`라 관리자 권한(High 무결성)으로 실행되고, 런처에서 연 화면도 관리자 권한을 물려받는다. 일반 권한의 화면 제어 입력은 Windows가 차단하여 런처 경로에서는 조작할 수 없었다. 사용자 선택에 따라 같은 설치 폴더의 개별 화면 프로그램 `pcNetworkC.exe`·`ntDHCPC.exe`·`ntDNSC.exe`·`CMDC.exe`(매니페스트 `asInvoker`)를 일반 권한으로 직접 실행해 검증했다. 런처를 거친 공식 실행 흐름과 동작이 다를 수 있다.
- 런처의 "네트워크관리사" 분류에는 컴퓨터(네트워크 속성·레지스트리 편집기·폴더 권한·프린터 및 팩스), 제어판(시스템 등록정보·인터넷 옵션·프로그램 및 기능), 관리도구(DHCP 등) 항목이 있다. 화면은 DHCP 범위 속성의 네트워크 액세스 보호 탭, 명령 프롬프트의 `Microsoft Windows [Version 6.2.9200]` 표시처럼 Windows Server 2022 이전 세대 구성을 따른다.
- 에뮬레이터 화면은 채점 결과를 표시하지 않는다. 입력값은 실행 중에만 유지되었고, 프로그램을 닫았다 다시 열면 초기값으로 돌아갔다. 설치 폴더의 XML 설정 파일 수정 시각은 바뀌지 않았다.
- [출제기준 변경 공지](https://www.icqa.or.kr/cn/board/notice/463)는 2026-10-23 재확인 결과 2025-01-13 게시 내용 그대로이다: 2025-08-01부터 Windows Server 2022 출제, 실기 에뮬레이터는 기존 방식 유지.

### 과제별 판정

| 과제 | 실제 조건과 앱 예제의 차이 | 관찰 결과 | 판정 |
|---|---|---|---|
| windows-ipv4 | 연습 문제 화면이 없어 앱 예제 값을 네트워크 속성 화면에 직접 입력 | 로컬 영역 연결 속성 → Internet Protocol Version 4 (TCP/IPv4) 속성. 다음 IP 주소 사용 선택 시 DNS도 수동 지정으로 전환. 192.168.50.18 / 255.255.255.248 / 192.168.50.17 / DNS 192.168.50.19 입력 → 확인 → 다시 열어 네 값 유지. 마스크 자동 채움 없음, 빈 보조 DNS는 `0.0.0.0` 표시, 프로그램 재실행 시 자동으로 받기로 초기화. 명령 프롬프트의 `ipconfig /all`은 고정 예시 값(192.168.66.5) 출력 | 통과(입력·저장·재확인). 네트워크·브로드캐스트 계산값은 화면 대상 아님 |
| windows-dhcp | 앱 예제 값 직접 입력 | IPv4 → 동작 → 새 범위 마법사. 이름 AI-LAB, 192.168.100.1~126, 기본 길이 24를 25로 올리자 마스크 255.255.255.128로 변경, 제외 .1~.10 추가, 임대 기본 8일·0시간·0분을 0일·6시간·0분으로 변경, 옵션 기본 선택 "예"를 "아니요, 나중에 구성"으로 변경. 완료 화면 요약 없음. 범위 `[192.168.100.1] AI-LAB` 상태 비활성, 범위 메뉴에 활성화 항목 존재. 범위 속성 0일·6시간·0분, 주소 풀에 배포 범위와 제외 범위 표시 | 통과(비활성 범위까지). 활성화·임대는 미실행 |
| windows-dns-records | 앱은 기존 영역을 가정하지만 에뮬레이터는 빈 정방향 조회 영역으로 시작 | 새 영역 마법사로 주 영역 lab.example(lab.example.dns, 동적 업데이트 허용 안 함) 생성. 영역 오른쪽 클릭 메뉴의 새 호스트에서 web01·192.168.60.20 → FQDN `web01.lab.example`, 생성 알림. 새 별칭에서 www·대상 `web01.lab.example` → FQDN `www.lab.example`. 목록과 www 속성에서 A·CNAME 확인. 명령 프롬프트의 `nslookup web01.lab.example 192.168.60.2`는 dns.icqa.or.kr·www.icqa.or.kr 고정 문구만 출력 | 통과(레코드 생성·보존). 이름 조회는 도구 미지원 |
| windows-dns-soa | 앱 예제 값 직접 입력 | SOA 탭 기본값: 일련번호 0, ICQAServer., hostmaster., 15분, 10분, 1일, 최소(기본값) TTL 1시간, 이 레코드의 TTL 0:1:0:0. 단위 목록 초·분·시간·일. 2026102301, ns1.lab.example, hostmaster.lab.example, 60분, 15분, 1일, 10분(단위를 시간→분으로 변경) 입력 → 확인 → 다시 열어 유지, 목록 SOA 데이터 `[2026102301]`. 이후 호스트 추가 시 일련번호 자동 증가 없음 | 통과 |
| router-basics | 공식 문제 1은 ROUTER2의 `ICQA`. 앱 예제 `LAB-R1`은 ROUTER1에 연습으로 설정 | 7개 명령 모두 수락. `LAB-R1(config)#`·`LAB-R1#` 프롬프트, `Destination filename [startup-config]?` 뒤 Enter로 `Building configuration...[OK]`, running·startup 모두 `hostname LAB-R1` | 통과 |
| router-interface | 공식 문제 3은 FastEthernet 0/0에 192.168.0.100/24. 앱 예제는 192.168.10.1/26 | 기본 설정 인터페이스는 Fa0/0·Fa1/0·S2/0·S3/0. `interface FastEthernet0/0`, `ip address 192.168.10.1 255.255.255.192`, `no shutdown`, 저장 수락, startup에 주소·마스크 유지. `show interfaces`는 `FastEthernet0/0 is up, line protocol is down (disabled)`. 앱 절차의 `show ip interface brief`는 Invalid input | 수정 후 통과(설정·저장). 링크 up/up은 데모에서 미성립 |
| router-route | 앱 전제(연결 구간 up, R2 반환 경로)가 데모에서 성립하지 않음 | 전역 설정에서 `ip route 192.168.20.0 255.255.255.0 10.0.12.2` 수락, running·startup에 같은 행. 두 라우터 Serial2/0에 10.0.12.1/30·10.0.12.2/30과 `no shutdown`을 넣어도 `changed state to down`. `show ip route`는 코드 범례와 `Gateway of last resort is not set`만 표시 | 수정 후 통과(설정·저장). 경로 등록·패킷 전달은 도구 미지원 |
| router-access | — | 기본 설정에 `line con 0`, `line aux 0`, `login`이 있는 `line vty 0 4`. `line console 0`·`line vty 0 4`에서 `(config-line)#`, `password ?`는 `7`과 `LINE` 형식 표시. `exec-timeout 5 30` 수락, running·startup의 vty 아래 유지 | 일부 통과. 비밀번호 문자열·콘솔 `login` 입력과 인증·유휴 종료는 미실행 |

공식 데모 3문항(2차 실행): ROUTER2 `enable` → `configure terminal` → `hostname ICQA` → `end` → `copy running-config startup-config`, ROUTER1 `enable` → `configure terminal` → `interface FastEthernet0/0` → `ip address 192.168.0.100 255.255.255.0` → `no shutdown` 1회 → `end` → `copy running-config startup-config`를 모두 `[OK]`까지 확인하고 제출했다. 제출 후 화면은 "수고하셨습니다."와 "처음으로"뿐이며 점수·문항별 정오를 표시하지 않는다. 따라서 **데모 자체 채점 결과는 확인할 수 없다(도구 미지원)**. 1차 실행에서는 ROUTER2의 `en`·`conf t`·`hostname ICQA`·`copy r s`·`sh start`로 시작 설정에 `hostname ICQA`가 저장되는 것을 따로 확인했다.

### 발견한 데모 동작과 앱 수정

1. `show ip interface brief`와 `show ip interface ?`는 `% Invalid input detected`로 거부되었다. `show ip ?` 도움말에는 `interface`가 표시되지만 실행되지 않는다. → router-interface의 1·4단계와 풀이, router-route의 2단계와 풀이에서 `show running-config`·`show interfaces`로 교체했다. 수정 전 콘텐츠에는 이 명령이 6곳 있었다.
2. 시작 배너는 `CISCO1921/K9`, `2 Gigabit Ethernet interfaces`를 표시하지만 `interface GigabitEthernet0/0`은 거부되고 설정 목록은 FastEthernet·Serial이다. → 앱 예제의 FastEthernet0/0은 데모와 일치하므로 유지하고, 포트 이름은 배너가 아닌 설정 목록으로 확인하도록 환경 설명을 고쳤다.
3. 같은 인터페이스에 `no shutdown`을 반복하면 두 번째 입력이 메시지 없이 `administratively down`으로 되돌리고, 세 번째 입력은 다시 `changed state to up`을 표시했다(두 차례 재현). → 한 번만 입력하고 running-config에 `shutdown` 행이 없는지 확인하도록 절차·풀이·주의점에 추가했다. [참고 검수 문서](PRACTICAL_REFERENCE_REVIEW.md)의 확인 보류 항목도 갱신했다.
4. 연결 구간이 올라오지 않고 `show ip route`에 연결 경로도 나타나지 않는다. → router-route 환경·확인 문구에 데모에서는 설정 행과 저장까지만 확인한다고 명시했다.
5. 데모 안내의 저장 명령 제한(`write` 불가) → router-basics 주의점에 추가했다. `en`, `conf t`, `int fa0/0`, `copy r s`, `sh start` 축약형 수락은 풀이 설명과 출처 노트에 기록했다.
6. 모든 라우터 과제의 출처 노트에서 "ICQA 프로그램을 실행하지 않았다"는 문장을 실제 확인 범위로 바꾸고, 과제별 데모 확인 결과를 추가했다. 과제 상세의 검토 범위 문구는 Windows·라우터 묶음별로 나누었다. 점검 항목 ID와 기준값은 바꾸지 않아 기존 학습 기록과 호환된다.

### 발견한 Windows 에뮬레이터 동작과 앱 수정

Windows 4개 과제의 기준값과 계산값에는 오류가 없었다. 교재 PDF 257쪽 확대 이미지에서도 임대 기간이 0일·8시간·0분으로 보여, 6시간 교정 근거는 유지했다. 에뮬레이터 화면과 맞지 않던 안내를 다음과 같이 고쳤다.

1. IPv4: "자동으로 채워진 마스크를 확인"하라는 안내 → 에뮬레이터는 마스크를 채우지 않으므로 직접 입력하도록 절차와 주의점을 고쳤다. 화면에 없는 "적용" 대신 "확인"으로 저장하도록 바꾸고, 빈 보조 DNS의 `0.0.0.0` 표시와 재실행 시 초기화를 기록했다. 명령 프롬프트 에뮬레이터의 `ipconfig /all`이 고정 예시 값을 출력한다는 점도 명시했다.
2. DHCP: 길이 기본값 24와 길이·마스크 연동, 임대 기본값 8일·0시간·0분, 옵션 화면의 기본 선택이 "지금 구성"이라는 점, 범위가 시작 주소와 이름으로 표시된다는 점을 절차에 추가했다.
3. DNS 레코드: 에뮬레이터가 빈 정방향 조회 영역으로 시작하므로 주 영역 lab.example을 먼저 만들도록 환경 설명에 추가했다. 새 호스트·새 별칭은 동작 메뉴가 아니라 영역의 오른쪽 클릭 메뉴에 있다는 점과, `nslookup`이 고정 문구를 출력해 이름 조회 확인에 쓸 수 없다는 점을 명시했다.
4. SOA: 단위 목록(초·분·시간·일)과 기본값, 최소(기본값) TTL의 단위를 시간에서 분으로 바꿔야 한다는 점, 이 레코드의 TTL 형식(`DDDDD:HH.MM.SS`, 3600초 = `0:1:0:0`), 에뮬레이터는 레코드를 추가해도 일련번호를 자동으로 올리지 않는다는 점을 추가했다.
5. Windows 과제의 "ICQA 프로그램을 설치·실행하여 검증한 결과는 아니다"라는 노트를 실제 확인 범위로 바꾸고 과제별 에뮬레이터 확인 노트를 추가했다. 검토 범위 문구도 같은 내용으로 갱신했다. 점검 항목 ID와 기준값은 바꾸지 않았다.

기타 관찰(앱 수정 없음): `?` 도움말 뒤에도 입력 줄에 `?`가 남아 지우고 입력해야 한다. `-- MORE --`는 Space로 넘기고 `q`로 멈춘다. 설정을 바꿔도 `Current configuration : 547 bytes` 표시는 바뀌지 않았다. 자동 입력 도구가 보낸 붙여넣기 입력은 콘솔에 반영되지 않아 모든 명령을 한 단어씩 직접 입력했다.

### 수정 후 확인

- `npm test`: 기존 96개와 데모 제약 회귀 테스트 1개, **총 97개 통과**. 새 테스트는 라우터 과제 명령에 데모가 거부한 조회 명령·GigabitEthernet·`write`가 없는지, 명령 묶음마다 `no shutdown`이 한 번 이하인지, 저장 명령과 데모 확인 노트가 있는지 검사한다.
- `npm run verify:originals`: NA2-com `7e0c035`, NA2-cabling `8036a54`, 추적 파일 42개 SHA-256 일치.
- `npm run build`: 한글이 포함된 로컬 작업 경로에서는 오류 메시지 없이 `dist/`가 갱신되지 않았다. 추적 파일을 영문 임시 경로로 복사해 같은 명령으로 빌드하여 통과(종료 코드 0)했다. GitHub Actions 빌드는 이 경로 문제와 무관하다.
- 로컬 브라우저(영문 경로 빌드): router-interface 오답 4/5 → 수정 시 판정 해제 → 5/5 → 새로고침 복원, 라우터 과제 4개의 새 명령·데모 노트·검토 범위 표시, 목록 진행률 1/8, 필기 900문항 로딩과 2026년 2회 1번 선택 유지, 케이블링 유형 판별 평가 중 실습 자료 미표시와 4/4 완료 후 해제, 실기 단답형 PRAC-006 초안 복원·정답 확인, 360×800에서 라우터 상세 4개 가로 넘침 없음, 콘솔 로그 없음.

Windows 반영 후 `npm test`는 Windows 에뮬레이터 확인 노트와 주요 화면 기본값 안내를 검사하는 테스트 1개를 더해 **총 98개 통과**했다. 빌드·원본 보존·브라우저 회귀 결과는 [배포 검증](DEPLOYMENT.md)에 기록한다.

화면 증거는 Git에서 제외하는 `verification/emulator-20261023/`에 보관한다: `router-run1/`(48장), `router-run2-official/`(9장), `windows/`(62장), `local-regression/`, `public/`, `SHA256SUMS.txt`.

### 남은 한계

- Windows 에뮬레이터는 관리자 권한 런처를 거치지 않고 개별 화면 프로그램을 일반 권한으로 실행해 확인했다. 런처를 통한 실행과 저장·종료 동작이 같은지는 확인하지 못했다.
- Windows 에뮬레이터는 채점 기능이 없으므로 시험 채점 결과를 확인할 수 없다. DHCP 범위 활성화와 주소 임대, DNS 이름 조회, 실제 통신은 실행하지 않았다.
- 라우터 데모는 공식 데모 3문항만 내장하므로 앱 과제는 같은 콘솔에 연습 설정을 입력해 확인했다. 데모는 채점 결과를 표시하지 않아 협회 채점과의 일치는 확인할 수 없다.
- 라우터 연결 구간·경로 등록·패킷 전달, 비밀번호 문자열과 콘솔 `login` 입력, 실제 인증과 `exec-timeout` 유휴 종료는 확인하지 못했다.
- 실제 Cisco 장비와 Windows Server에서의 동작은 이번 검증 범위가 아니다.
