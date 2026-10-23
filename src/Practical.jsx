import { PRACTICAL_AREAS, PRACTICAL_SOURCES, practicalSection } from './content/practical.mjs';

function Title({ number, title, children }) {
  return <header className="hub-page-title hub-practical-title"><span className="hub-eyebrow">실기 학습 {number && ` / ${number}`}</span><h1>{title}</h1><p>{children}</p></header>;
}
function ExternalLink({ source, children }) {
  return <a className="hub-button" href={source.url} target="_blank" rel="noopener noreferrer">{children || source.title}<span className="hub-link-direction" aria-hidden="true">↗</span><span className="hub-sr-only"> (새 탭)</span></a>;
}
function AreaIcon({ id }) {
  const drawing = id === 'work'
    ? <><path d="M7 3v5m10-5v5M5 8h14v5a7 7 0 0 1-14 0ZM12 20v3"/><path d="M8 12h8"/></>
    : id === 'lab'
      ? <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8m-4-4v4m-5-10 3 3-3 3m6 0h4"/></>
      : <><rect x="5" y="3" width="14" height="19" rx="2"/><path d="m8 9 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3"/></>;
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>;
}
function Home() {
  return <>
    <Title title="실기, 세 영역으로 준비하세요">작업형은 직접 만들고, 실습형은 설정하고, 단답형/객관식은 개념을 구분하는 연습입니다.</Title>
    <section className="hub-practical-grid" aria-label="실기 세 영역">
      {PRACTICAL_AREAS.map(area => <article className="hub-practical-card" key={area.id}>
        <div className="hub-practical-card-top"><span className="hub-course-icon"><AreaIcon id={area.id}/></span><span className="hub-practical-number">{area.number}</span></div>
        <h2>{area.title}</h2><p className="hub-practical-subtitle">{area.subtitle}</p><p>{area.description}</p>
        <ul className="hub-practical-tags">{area.subjects.map(subject => <li key={subject}>{subject}</li>)}</ul>
        <div className="hub-practical-card-bottom"><span className="hub-availability">{area.status}</span><a className="hub-button" href={`#${area.path}`}>{area.action}<span aria-hidden="true">→</span></a></div>
      </article>)}
    </section>
    <section className="hub-practical-next"><div><h2>지금 바로 케이블링을 연습할 수 있습니다</h2><p>기존 핀별 복습, 배열 교정과 학습 기록을 그대로 이용하세요.</p></div><a className="hub-button primary" href="#/cabling">케이블링 연습 시작</a></section>
    <p className="hub-inline-note">이 학습센터는 시험 준비를 돕는 보조 도구입니다. 실제 시험의 출제 범위와 응시 안내는 해당 회차의 공식 공지를 확인하세요.</p>
  </>;
}
function Work() {
  return <>
    <Title number="01" title="작업형 · 케이블 제작·결선">화면에서 배열을 익힌 뒤, 실제 케이블과 공구로 제작하고 시험기로 연결 상태를 확인하세요.</Title>
    <div className="hub-practical-detail-grid"><section className="hub-panel"><h2>제작 전부터 완성까지</h2><ol className="hub-guide-steps">
      <li>문제에서 요구한 다이렉트 또는 크로스 결선을 확인합니다.</li>
      <li>커넥터를 보는 방향과 핀 번호를 확인하고, 양 끝에 적용할 배열을 정합니다.</li>
      <li>사용하는 공구·플러그의 설명에 따라 케이블을 준비하고 도체를 배열합니다.</li>
      <li>도체의 삽입 상태와 배열을 확인한 뒤 커넥터를 압착합니다.</li>
      <li>케이블 시험기로 와이어맵·단선·단락 등 지원하는 항목을 확인합니다.</li>
    </ol><a className="hub-button primary" href="#/cabling">케이블링 연습 시작</a></section>
    <aside className="hub-panel"><h2>필요한 연습으로 이동</h2><div className="hub-practical-links">
      <a href="#/learn/theory/cabling-orientation">커넥터 관찰 방향과 핀 번호<span aria-hidden="true">→</span></a>
      <a href="#/learn/theory/cabling-t568">T568A·T568B와 결선 원리<span aria-hidden="true">→</span></a>
      <a href="#/cabling/pins">핀별 복습<span aria-hidden="true">→</span></a>
      <a href="#/cabling/correction">틀린 배열 교정<span aria-hidden="true">→</span></a>
      <a href="#/learn/tools">케이블 제작 준비물<span aria-hidden="true">→</span></a>
    </div></aside></div>
    <p className="hub-inline-note">화면에서 배열을 맞힌 것과 실물 케이블의 제작 품질은 별도로 확인합니다. 단순 도통 시험기의 결과만으로 모든 전송 성능이 검증되는 것은 아닙니다.</p>
  </>;
}
function Lab() {
  return <>
    <Title number="02" title="실습형 · 라우터와 Windows Server">문제의 대상과 설정값을 확인하고, 지정된 환경에서 설정을 수행하는 연습입니다.</Title>
    <div className="hub-practical-detail-grid is-even"><section className="hub-panel hub-practical-lab"><span className="hub-tag">라우터</span><h2>명령어로 설정하고 저장하기</h2><p>명령 모드, 대상 인터페이스, IP 주소·서브넷마스크, 설정 저장 여부를 확인합니다.</p>
      <ol className="hub-guide-steps"><li>공식 안내에서 Router Emulator를 내려받고 압축을 풉니다.</li><li>문제의 대상 라우터와 조건을 확인한 뒤 명령을 입력합니다.</li><li>문제에서 요구한 설정과 저장 상태를 확인합니다.</li></ol>
      <ExternalLink source={PRACTICAL_SOURCES.router}/><p className="hub-practical-status">이 학습센터의 별도 웹 라우터 실습실은 준비 중입니다. 현재는 공식 프로그램을 이용해 주세요.</p>
    </section><section className="hub-panel hub-practical-lab"><span className="hub-tag">Windows Server</span><h2>조건에 맞게 설정하기</h2><p>문제에서 지정한 항목과 값을 읽고, 실습용 에뮬레이터의 관리 화면에서 설정합니다.</p>
      <ol className="hub-guide-steps"><li>PC 운영체제의 32·64비트 구분을 확인합니다.</li><li>공식 자료실에서 실행 환경에 맞는 실습용 에뮬레이터와 필요한 구성요소를 확인합니다.</li><li>문제 조건에 따라 설정하고 입력값을 다시 확인합니다.</li></ol>
      <ExternalLink source={PRACTICAL_SOURCES.windows64}/><p className="hub-practical-status">64비트용 공식 안내에는 .NET Framework 3.5가 필요하다고 명시되어 있습니다. 다른 실행 환경은 자료실에서 해당 버전의 안내를 확인하세요.</p>
    </section></div>
    <section className="hub-practical-next"><div><h2>실습 프로그램은 공식 자료실에서</h2><p>프로그램별 실행 조건과 업데이트 안내를 확인하세요. 안내 확인일: 2026-10-23.</p></div><ExternalLink source={PRACTICAL_SOURCES.downloads}/></section>
  </>;
}
export default function PracticalPage({ path }) {
  const section = practicalSection(path);
  if (section === 'home') return <Home/>;
  if (section === 'work') return <Work/>;
  if (section === 'lab') return <Lab/>;
  return <div className="hub-empty"><h1>실기 화면을 찾을 수 없습니다</h1><a className="hub-button" href="#/practical">실기 홈으로</a></div>;
}
