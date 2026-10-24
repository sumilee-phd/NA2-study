import { useEffect, useRef, useState } from 'react';
import { THEORY_FIGURES, THEORY_REFERENCES, FIGURE_TECHNICAL_SOURCES } from './content/theory-figures.mjs';
import './theory-figures.css';

const assets = import.meta.glob('./assets/theory/*.svg', { eager: true, query: '?url', import: 'default' });
const urlFor = figure => assets[`./assets/theory/${figure.file}`];

export function TheoryPreview({ topicId }) {
  const figure = THEORY_FIGURES[topicId]?.[0];
  if (!figure) return null;
  return <div className="theory-preview" aria-hidden="true"><img src={urlFor(figure)} alt="" width="760" height="520" loading="lazy" decoding="async"/></div>;
}

export function TheoryFigures({ topicId, section }) {
  return (THEORY_FIGURES[topicId] || []).filter(figure => figure.section === section).map(figure => <TheoryFigure key={figure.id} figure={figure}/>);
}

export function TheoryFigureSources({ topicId }) {
  return <details className="theory-reference"><summary>도해 참고자료와 검토 · 2026-10-24</summary><p>{THEORY_REFERENCES[topicId]}. 슬라이드 번호는 파일의 첫 장부터 센 순서입니다.</p><p>제공 강의자료의 설명 구조를 참고하고 위 기술 문서와 대조하여 학습용 벡터 도해로 재구성했습니다.</p>{FIGURE_TECHNICAL_SOURCES[topicId]?.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></p>)}</details>;
}

function TheoryFigure({ figure }) {
  const dialog = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!opened) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [opened]);
  function openFigure() {
    setZoomed(false);
    dialog.current.showModal();
    setOpened(true);
  }
  return <figure className="theory-figure">
    <div className="theory-figure-heading"><h3>{figure.title}</h3><button className="hub-button" type="button" onClick={openFigure} aria-label={`${figure.title} 크게 보기`}>크게 보기</button></div>
    <img className="theory-figure-image" src={urlFor(figure)} alt={figure.alt} width="760" height="520" loading="lazy" decoding="async"/>
    <figcaption>{figure.caption}<span className="theory-figure-credit">학습용 재구성 도해 · {figure.checkedAt} · 기술 근거는 아래 출처와 검토에서 확인</span></figcaption>
    <dialog ref={dialog} className="theory-dialog" aria-labelledby={`${figure.id}-dialog-title`} onClose={() => setOpened(false)}>
      <div className="theory-dialog-toolbar"><h2 id={`${figure.id}-dialog-title`}>{figure.title}</h2><div><button className="hub-button" type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? '화면에 맞추기' : '확대하기'}</button><button className="hub-button primary" type="button" onClick={() => dialog.current.close()} autoFocus>닫기</button></div></div>
      <div className={`theory-dialog-image ${zoomed ? 'is-zoomed' : ''}`} tabIndex={0} role="region" aria-label="도해 보기 영역"><img src={urlFor(figure)} alt={figure.alt}/></div>
      <p>{figure.caption}</p>
    </dialog>
  </figure>;
}
