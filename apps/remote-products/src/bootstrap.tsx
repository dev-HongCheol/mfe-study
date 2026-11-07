/**
 * @file bootstrap.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 싱글톤 의존성(React, TanStack Query) 비동기 협상이 완료된 후 단독 실행 화면을 #root에 마운트하는 부트스트랩 엔트리입니다 ([Study 04 #01]).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'remote_shared/theme';
import { App } from './App.js';

/**
 * #root 엘리먼트를 찾아 단독 실행 쇼케이스(App)를 마운트합니다.
 */
function mountStandaloneApp(): void {
  const rootElement = document.getElementById('root');
  // [분기 설명] DOM에 #root 마운트 컨테이너가 없을 경우 명확한 에러를 발생시켜 조기 진단합니다.
  if (!rootElement) {
    throw new Error('[remote-products] #root 엘리먼트를 찾을 수 없습니다.');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="indigo">
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

mountStandaloneApp();
