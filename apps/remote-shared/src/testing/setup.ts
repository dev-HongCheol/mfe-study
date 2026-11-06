/**
 * @file setup.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description Vitest jsdom 테스트 환경에 jest-dom 매처, 자동 DOM 정리 및 Ark UI(Splitter 등)용 브라우저 API 폴리필을 등록합니다.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 각 테스트 종료 시마다 이전 렌더링 트리와 포털 DOM 노드를 깨끗이 제거합니다.
afterEach(() => {
  cleanup();
});

/**
 * Ark UI Splitter 및 Positioner 상태 머신이 jsdom 환경에서 크래시 없이 동작하도록 보장하는 ResizeObserver 폴리필 클래스
 */
class MockResizeObserver {
  /** 관찰 시작 스텁 */
  observe(): void {}

  /** 단일 엘리먼트 관찰 해제 스텁 */
  unobserve(): void {}

  /** 전체 관찰 해제 스텁 */
  disconnect(): void {}
}

// [분기 설명] jsdom 기본 환경에는 ResizeObserver가 없으므로 미정의 상태일 때만 전역에 주입합니다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

// [분기 설명] Ark UI Select 키보드/포커스 이동 시 호출되는 scrollTo가 jsdom에 없을 경우 빈 함수로 보완합니다.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollTo === 'undefined') {
  Element.prototype.scrollTo = () => {};
}
