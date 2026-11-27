/**
 * @file bootstrap-fallback.test.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description remote_shared 오프라인 부트스트랩 폴백 모듈(bootstrap-fallback.ts)의 <template> 복제, XSS 안전 주입, 새로고침 콜백 및 템플릿 누락 방어를 검증하는 단위 테스트입니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOTSTRAP_FALLBACK_TEMPLATE_ID, renderBootstrapFallback } from './bootstrap-fallback';

/** index.html 원본 문자열에서 <body> 내부 마크업을 추출해 테스트 DOM에 재현합니다. */
function mountIndexHtmlBody(): void {
  const indexHtmlPath = resolve(import.meta.dirname, '../index.html');
  const html = readFileSync(indexHtmlPath, 'utf-8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = bodyMatch?.[1] ?? '<div id="root"></div>';
}

describe('renderBootstrapFallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('index.html의 <template>을 복제해 에러 메시지와 새로고침 버튼을 안전하게 렌더링한다', () => {
    mountIndexHtmlBody();
    const onReload = vi.fn();

    renderBootstrapFallback(new Error('Failed to fetch remoteEntry.js'), onReload);

    const alertSection = document.querySelector<HTMLElement>('#root [role="alert"]');
    expect(alertSection).not.toBeNull();
    expect(alertSection?.textContent).toContain('remote-shared :3004');
    expect(alertSection?.textContent).toContain('Failed to fetch remoteEntry.js');

    const reloadButton = document.querySelector<HTMLButtonElement>('#root [data-fallback-reload]');
    expect(reloadButton).not.toBeNull();
    reloadButton?.click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('HTML 태그가 포함된 에러 메시지도 textContent로 이스케이프해 XSS 실행을 차단한다', () => {
    mountIndexHtmlBody();

    renderBootstrapFallback('<img src=x onerror="window.__xss=1" />', vi.fn());

    const detailElement = document.querySelector<HTMLElement>('#root [data-fallback-error]');
    expect(detailElement?.textContent).toBe('<img src=x onerror="window.__xss=1" />');
    expect(detailElement?.querySelector('img')).toBeNull();
  });

  it('<template>이 DOM에 없어도 최소 폴백 안내 UI와 새로고침 버튼을 안전하게 렌더링한다', () => {
    document.body.innerHTML = '<div id="root"></div>';
    expect(document.getElementById(BOOTSTRAP_FALLBACK_TEMPLATE_ID)).toBeNull();

    const onReload = vi.fn();
    renderBootstrapFallback(new Error('Network offline'), onReload);

    const alertSection = document.querySelector<HTMLElement>('#root [role="alert"]');
    expect(alertSection).not.toBeNull();
    expect(alertSection?.textContent).toContain('Network offline');

    const reloadButton = alertSection?.querySelector<HTMLButtonElement>('button');
    reloadButton?.click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('#root 컨테이너가 없으면 예외 없이 안전하게 종료한다', () => {
    expect(() => {
      renderBootstrapFallback(new Error('No root container'), vi.fn());
    }).not.toThrow();
  });
});
