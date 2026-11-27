/**
 * @file bootstrap-fallback.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description remote_shared(:3004) 프리로드 실패 시 동적 로드되어 index.html의 폴백 <template>과 전용 CSS로 안전하게 오프라인 안내 화면을 렌더링하는 모듈입니다 ([Study 04 #01, #14]).
 */
import './bootstrap-fallback.css';

/** index.html에 선언된 부트스트랩 폴백 <template> 엘리먼트 ID */
export const BOOTSTRAP_FALLBACK_TEMPLATE_ID = 'host-bootstrap-fallback-template';

/** 호스트 루트 DOM 마운트 컨테이너 ID */
const ROOT_ELEMENT_ID = 'root';

/**
 * 전달된 예외 객체에서 안전하게 표시할 문자열 메시지를 추출합니다.
 *
 * @param err - 프리로드 단계에서 포착된 예외 객체
 * @returns 사용자·개발자 안내용 에러 문자열
 */
function formatBootstrapErrorMessage(err: unknown): string {
  // [분기 설명] Error 인스턴스는 message를 우선 사용하고, 비표준 예외는 String으로 변환합니다.
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return String(err);
}

/**
 * index.html의 <template>을 찾을 수 없는 예외/테스트 환경에서도 최소 안내 UI를 구성합니다.
 *
 * @param message - 표시할 에러 메시지 문자열
 * @param onReload - 새로고침 버튼 클릭 시 실행할 콜백
 * @returns 순수 DOM으로 구성된 최소 폴백 엘리먼트
 */
function createMinimalFallbackNode(message: string, onReload: () => void): HTMLElement {
  const section = document.createElement('section');
  section.className = 'host-bootstrap-fallback';
  section.setAttribute('role', 'alert');

  const heading = document.createElement('h1');
  heading.className = 'host-bootstrap-fallback-title';
  heading.textContent = '공통 디자인 시스템 서버(remote-shared :3004)에 연결할 수 없습니다';

  const detail = document.createElement('pre');
  detail.className = 'host-bootstrap-fallback-detail';
  detail.textContent = message;

  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.className = 'host-bootstrap-fallback-reload';
  reloadButton.textContent = '페이지 새로고침';
  reloadButton.addEventListener('click', onReload);

  section.append(heading, detail, reloadButton);
  return section;
}

/**
 * remote_shared(Port 3004) 서버 자체가 오프라인일 때 백지 화면 대신 순수 DOM 폴백 안내를 렌더링합니다.
 * React·원격 UI에 의존하지 않고 index.html의 <template>과 bootstrap-fallback.css만 사용합니다.
 *
 * @param err - 프리로드 단계에서 포착된 예외 객체
 * @param onReload - 새로고침 버튼 클릭 시 실행할 선택적 콜백 (기본값: window.location.reload)
 */
export function renderBootstrapFallback(
  err: unknown,
  onReload: () => void = () => {
    window.location.reload();
  },
): void {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  // [분기 설명] DOM 컨테이너가 없는 환경에서는 렌더링을 생략하고 안전하게 종료합니다.
  if (!rootElement) {
    return;
  }

  const message = formatBootstrapErrorMessage(err);
  const templateElement = document.getElementById(BOOTSTRAP_FALLBACK_TEMPLATE_ID);

  // [보안 준수] innerHTML 대신 DOM API와 textContent만 사용해 XSS 위험을 원천 차단합니다.
  rootElement.replaceChildren();

  // [분기 설명] index.html에 선언된 <template>이 존재하면 마크업을 복제해 데이터·이벤트만 바인딩합니다.
  if (templateElement instanceof HTMLTemplateElement) {
    const fragment = templateElement.content.cloneNode(true) as DocumentFragment;
    const detailElement = fragment.querySelector<HTMLElement>('[data-fallback-error]');
    const reloadButton = fragment.querySelector<HTMLButtonElement>('[data-fallback-reload]');

    // [분기 설명] 에러 상세 슬롯이 존재하면 textContent로 안전하게 예외 메시지를 주입합니다.
    if (detailElement) {
      detailElement.textContent = message;
    }

    // [분기 설명] 새로고침 버튼 슬롯이 존재하면 클릭 이벤트 리스너를 연결합니다.
    if (reloadButton) {
      reloadButton.addEventListener('click', onReload);
    }

    rootElement.appendChild(fragment);
    return;
  }

  // [분기 설명] 템플릿이 누락된 환경에서도 백지 화면이 되지 않도록 최소 DOM 노드를 폴백 렌더링합니다.
  rootElement.appendChild(createMinimalFallbackNode(message, onReload));
}
