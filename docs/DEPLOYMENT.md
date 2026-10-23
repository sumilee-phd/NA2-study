# 공개 배포 검증

검증일: 2026-10-23 (한국시간)

- 공개 사이트: https://sumilee-phd.github.io/NA2-study/
- 리포: https://github.com/sumilee-phd/NA2-study
- 기본 브랜치: `main`
- Pages 방식: GitHub Actions. `main` 푸시 또는 수동 실행 시 테스트·빌드 후 배포.
- 최초 공개 검증 코드: `e3bf09696d8762be8673cd122ed25334e386cd09`
- [검증 워크플로 성공](https://github.com/sumilee-phd/NA2-study/actions/runs/39878858740)
- [Pages 배포 성공](https://github.com/sumilee-phd/NA2-study/actions/runs/39878858724)

## 배포와 자동 검사

GitHub의 Ubuntu·Node.js 22 환경에서 의존성 설치, 58개 테스트, Vite 빌드와 Pages 배포가 성공했다. 첫 실행에서는 로컬 검토 이미지 경로에 의존한 테스트 1개가 실패했다. 검토 당시 텍스트·이미지 해시, 정답, 쪽수를 `CONTENT_EVIDENCE.json`으로 추적하고 문제은행과 직접 대조하도록 수정한 뒤 다시 통과했다. 테스트를 생략하거나 원문 데이터를 변경하지 않았다.

공개 HTML, 메인 JavaScript와 CSS, `data/bank.json`이 모두 HTTP 200으로 응답했다. 문제은행은 24,968,935바이트, 900문항이며 SHA-256은 `979ca7ba0c4ec2b45fc9e9b627cb8a2c871b7951bef1d7a426afb6bb27234ece`로 보존된 원본과 일치했다.

## 공개 브라우저 확인

1. 공개 홈에서 이론 10개 목록과 서브넷 이론 페이지를 열고 읽음으로 표시했다.
2. 이론의 `2022-03-Q03` 링크로 필기 문제은행을 불러왔다. 원문 이미지와 보기 표시를 확인했다.
3. 2번 선택 후 정답 3번 안내를 확인하고 제출했다. 새로고침 뒤 필기 기록은 응답 1건·정답률 0%·세션 1건으로 유지됐다.
4. 실기 T568B 배열 교정에서 뒤바뀐 4·5번을 교환하고 완료했다. 새로고침 뒤 완료 상태와 교정 기록 1건이 유지됐다.
5. 학습센터로 돌아왔을 때 읽은 이론 1/10이 유지됐고, 검증 탭의 error·warn 로그는 없었다.

증거 이미지는 로컬 `verification/public-20261023/`의 `01-live-home.png`, `02-live-written-records.png`, `03-live-correction-restored.png`, `04-live-home-verified.png`에 보관한다. 검증용 학습 기록은 해당 브라우저의 새 통합 앱 저장 키에만 생성했다.

## 기존 앱과 검증 한계

기존 `NA2-com`과 `NA2-cabling`의 로컬·GitHub main 커밋은 각각 `7e0c035d8f49063ae51e5715bb5dd9062487da20`, `8036a544085cf96f52e535bda8ebd8c14c86031b`로 유지됐다. 로컬 추적 파일 42개의 SHA-256도 기준 기록과 일치했다. 기존 리포와 공개 앱의 코드·배포는 변경하지 않았다.

이번 공개 검증은 데스크톱 브라우저의 핵심 흐름을 확인한 것이다. 실제 스마트폰·모든 브라우저·900문항 전체의 답안 정확도를 인증하는 검증은 아니다. 초기 이론 범위와 실물 케이블 측정의 한계는 기존 문서를 따른다.
