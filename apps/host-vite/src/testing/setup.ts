/**
 * @file setup.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Vitest 실행 전후로 jest-dom 매처 등록, MSW 서버 생명주기 제어, 스토리지·공유 쿼리 캐시·리모트 장애 시뮬레이션 플래그를 초기화합니다.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';
import { resetRemoteCartStub } from './stubs/remote-cart';
import { resetRemoteProductsStub } from './stubs/remote-products';
import { sharedQueryClient } from './stubs/remote-shared-utils';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  sharedQueryClient.clear();
  resetRemoteProductsStub();
  resetRemoteCartStub();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.mfeTheme;
  }
});

afterAll(() => {
  server.close();
});
