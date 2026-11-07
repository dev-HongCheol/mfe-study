/**
 * @file setup.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vitest jsdom 환경 초기화, jest-dom 매처 등록, jsdom-undici Request/AbortSignal 호환성 보정 및 MSW 서버 생명주기 설정입니다.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server.js';
import { sharedQueryClient } from './stubs/remote-shared-utils.js';

/**
 * [분기 설명] jsdom v26의 window.AbortSignal과 Node 22(undici) 내장 Request/fetch 간
 * 인스턴스 클래스 불일치로 인해 ky가 new Request(url, { signal }) 호출 시 발생하는 TypeError를 방지합니다.
 */
const OriginalRequest = globalThis.Request;
const OriginalFetch = globalThis.fetch;

class JsdomCompatibleRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init && 'signal' in init) {
      const { signal: _jsdomSignal, ...restInit } = init;
      super(input, restInit);
      return;
    }
    super(input, init);
  }
}

globalThis.Request = JsdomCompatibleRequest as typeof Request;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (init && 'signal' in init) {
    // [분기 설명] 이미 취소(aborted)된 signal이 전달된 경우 즉시 AbortError로 거부합니다.
    if (init.signal?.aborted) {
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    }
    const { signal: _jsdomSignal, ...restInit } = init;
    return OriginalFetch(input, restInit);
  }
  return OriginalFetch(input, init);
}) as typeof fetch;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  sharedQueryClient.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

afterAll(() => {
  server.close();
});
