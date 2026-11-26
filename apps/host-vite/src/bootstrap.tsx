/**
 * @file bootstrap.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description remote_shared 선행 프리로드 완료 후 React 19 StrictMode와 단일 원격 ThemeProvider로 호스트 App을 마운트하는 부트스트랩 파일입니다 ([Study 04 #01, #07]).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'remote_shared/theme';
import { App } from './App';

/** 호스트 루트 DOM 마운트 컨테이너 조회 */
const rootElement = document.getElementById('root');

// [분기 설명] index.html에 #root 컨테이너가 존재할 때만 마운트를 수행합니다.
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}
