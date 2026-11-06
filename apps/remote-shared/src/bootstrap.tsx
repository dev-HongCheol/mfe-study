/**
 * @file bootstrap.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description 싱글톤 협상 완료 후 단독 실행(Standalone Port 3004) 쇼케이스 화면을 마운트하는 부트스트랩입니다.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { ThemeProvider } from './exposed/theme.js';

const rootElement = document.getElementById('root');

// [분기 설명] #root 엘리먼트가 존재할 때만 단독 실행 쇼케이스 트리를 안전하게 마운트합니다.
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}
