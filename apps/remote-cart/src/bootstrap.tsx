/**
 * @file bootstrap.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 싱글톤 공유 모듈(React, ReactDOM, TanStack Query) 협상 완료 후 단독 실행 쇼케이스를 DOM에 마운트하는 2단 부트스트랩 엔트리입니다 ([Study 04 #01]).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'remote_shared/theme';
import { App } from './App';

/** 단독 실행 마운트 대상 루트 DOM 엘리먼트 */
const rootElement = document.getElementById('root');

// [분기 설명] 마운트 대상 #root 엘리먼트가 존재할 때만 React 루트를 생성합니다.
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="indigo">
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}
