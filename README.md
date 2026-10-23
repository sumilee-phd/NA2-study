# NA2 Study

네트워크관리사 2급 이론·필기 문제풀이·실기 케이블링을 연결하는 별도 React 학습 앱입니다.

- 공개 사이트: https://sumilee-phd.github.io/NA2-study/
- 소스 리포: https://github.com/sumilee-phd/NA2-study
- `127.0.0.1` 주소는 개발 PC의 로컬 미리보기입니다. 다른 기기에서는 공개 사이트를 이용합니다.

## 기준 버전과 독립성

기존 `sumilee-phd/NA2-com`의 `7e0c035d8f49063ae51e5715bb5dd9062487da20`, `sumilee-phd/NA2-cabling`의 `8036a544085cf96f52e535bda8ebd8c14c86031b`를 원본 기준으로 고정합니다. 이 프로젝트만 확장하며 기존 리포·배포·저장 기록을 수정하지 않습니다. [기준 파일과 SHA-256](docs/BASELINES.json)을 기록했습니다.

## 포함 기능

- 학습센터: 초기 이론 10개, 자체 개념 확인 20문항, 학습 안내, FAQ 12개, 준비물 8종, 별도 학습 기록과 백업.
- 필기: 기존 900문항, 회차 연습·실전 시험·오답·북마크·기록. 원문을 검토한 8문항에서 관련 이론으로 이동.
- 실기: 기존 개념·22개 문항 템플릿·제작 연습에 핀별 진단·선택 복습·배열 교정·무힌트 재평가 추가.
- 처음에는 학습센터만 열며 필기 데이터는 필기 모듈 진입 후 불러옵니다. 한 번 연 모듈은 이론을 읽는 동안 유지합니다.

이론은 초기 핵심 주제 수록분으로 전체 시험 범위를 다룬 완성 요약집이 아닙니다. 자체 개념 확인과 케이블링 연습은 공식 기출시험이 아닙니다. 필기 기출 채점은 원본 자료의 가채점 답안표를 따릅니다. 앱은 실물 케이블의 압착·접촉·링크 성능을 측정하지 않습니다.

## 실행

```sh
npm ci
npm test
npm run dev
npm run build
npm run preview
```

기본 로컬 주소는 `/`이며 GitHub Actions에서는 저장소명으로 기본 경로를 정합니다. `BASE_PATH=/NA2-study/`를 지정하면 동일한 하위 경로에서 미리 볼 수 있습니다. `main` 브랜치에 푸시하면 테스트·빌드 성공 후 GitHub Pages로 자동 배포됩니다. Actions의 `Deploy Pages`에서 수동으로 다시 실행할 수도 있습니다.

## 기록

`na2_study_learning_v1`, `na2_study_written_v1`, `na2_study_cabling_v1`의 새 키를 사용합니다. 기존 독립 앱의 기록을 자동으로 가져오거나 변경하지 않습니다. 이론·필기·실기 기록은 각각 해당 기록 화면에서 백업합니다. 평가를 진행 중이면 학습센터 이론 진입을 가리며 필기 시험 시간은 계속 흐릅니다. 이는 앱 내부 학습 흐름이며 외부 자료 열람을 통제하는 시험 감독 기능이 아닙니다.

## 문서

- [PRD](docs/PRD.md)
- [디자인 기준](DESIGN.md)
- [콘텐츠 검토](docs/CONTENT_REVIEW.md)
- [필기 통합](docs/WRITTEN_INTEGRATION.md)
- [실기 통합](docs/CABLING_INTEGRATION.md)
- [검증 결과](docs/VERIFICATION.md)
- [공개 배포 검증](docs/DEPLOYMENT.md)

원본 폴더 두 개가 이 프로젝트의 형제 폴더에 있으면 `npm run verify:originals`로 기준 커밋·작업 트리·파일 해시를 확인할 수 있습니다. 원본을 고치거나 되돌리는 동작은 수행하지 않습니다.
