/**
 * @file SharedShowcase.integration.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06, TC-08] 3계층 단방향 의존성(utils -> theme -> ui), 컴포넌트 파일명 PascalCase 규칙, UI Props 경계 캡슐화(Study 09), .js 확장자 0건 및 단독 쇼케이스 통합 테스트입니다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { ThemeProvider } from '../exposed/theme';

/**
 * 지정된 디렉터리 하위의 모든 파일 경로를 재귀적으로 수집합니다.
 *
 * @param dirPath - 탐색할 시작 디렉터리 경로
 * @returns 파일 절대 경로 배열
 */
function collectAllFiles(dirPath: string): string[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

describe('remote-shared 아키텍처 무결성 및 단독 쇼케이스 통합 검증 (TC-06, TC-08)', () => {
  const srcRoot = resolve(import.meta.dirname, '..');

  it('1) utils -> theme -> ui 단방향 의존성만 허용하며 역방향 import가 0건이어야 한다 (Study 05 #09)', () => {
    const utilsFiles = collectAllFiles(resolve(srcRoot, 'features/utils')).concat([
      resolve(srcRoot, 'exposed/utils.ts'),
    ]);
    const themeFiles = collectAllFiles(resolve(srcRoot, 'features/theme')).concat([
      resolve(srcRoot, 'exposed/theme.ts'),
    ]);

    for (const file of utilsFiles) {
      const code = readFileSync(file, 'utf-8');
      expect(code).not.toMatch(/from\s+['"][^'"]*\/(theme|ui)(\/|\.|$)/);
    }

    for (const file of themeFiles) {
      const code = readFileSync(file, 'utf-8');
      expect(code).not.toMatch(/from\s+['"][^'"]*\/features\/ui\//);
      expect(code).not.toMatch(/from\s+['"][^'"]*\/exposed\/ui/);
    }
  });

  it('2) features/ui 및 features/theme/ui 내 모든 React 컴포넌트(.tsx) 파일명은 대문자(PascalCase)로 시작해야 한다', () => {
    const uiFiles = [
      ...collectAllFiles(resolve(srcRoot, 'features/ui')),
      ...collectAllFiles(resolve(srcRoot, 'features/theme/ui')),
    ].filter((f) => extname(f) === '.tsx');

    expect(uiFiles.length).toBeGreaterThanOrEqual(14);
    for (const file of uiFiles) {
      const baseName = file.split(/[\\/]/).pop() ?? '';
      expect(baseName).toMatch(/^[A-Z]/);
    }
  });

  it('3) 단독 실행 쇼케이스(App.tsx)가 마운트되어 테마 전환 및 컴포넌트 카탈로그 조작이 정상 동작한다', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /remote-shared 디자인 시스템/ }),
    ).toBeInTheDocument();

    // 쇼케이스 내 다크 테마 전환 버튼 동작 확인
    const darkBtn = screen.getByRole('button', { name: /Dark 테마 전환/ });
    await user.click(darkBtn);
    expect(document.documentElement.getAttribute('data-mfe-theme')).toBe('dark');
  });

  it('4) vite.config.ts에 @mf-types 생성(generateTypes: true)과 동적 힌트 비활성화(disableDynamicRemoteTypeHints: true)가 함께 설정되어 있어야 한다 (Study 04 #04)', () => {
    const viteConfigPath = resolve(srcRoot, '../vite.config.ts');
    const viteConfigCode = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfigCode).not.toContain('dts: false');
    expect(viteConfigCode).toContain('generateTypes: true');
    expect(viteConfigCode).toContain("tsConfigPath: './tsconfig.json'");
    expect(viteConfigCode).toContain('disableDynamicRemoteTypeHints: true');
  });

  it('5) TC-06: src/** 전체 TypeScript 파일의 상대 경로 import에 .js 확장자가 0건이어야 한다 (Study 04 #01)', () => {
    const tsFiles = collectAllFiles(srcRoot).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    );
    const offendingFiles: string[] = [];

    for (const file of tsFiles) {
      const code = readFileSync(file, 'utf-8');
      if (/(?:from|import\s*\()\s*['"]\.\.?\/[^'"]+\.js['"]/.test(code)) {
        offendingFiles.push(file);
      }
    }

    expect(offendingFiles).toEqual([]);
  });

  it('6) TC-06: 13종 UI 컴포넌트의 노출 Props가 @ark-ui/react 타입(HTMLArkProps, Ark*.RootProps)을 직접 상속하지 않아야 한다 (Study 09)', () => {
    const uiComponentFiles = [
      ...collectAllFiles(resolve(srcRoot, 'features/ui/components')),
      ...collectAllFiles(resolve(srcRoot, 'features/ui/layouts')),
    ].filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'));

    expect(uiComponentFiles.length).toBe(13);

    const leakyFiles: string[] = [];
    for (const file of uiComponentFiles) {
      const code = readFileSync(file, 'utf-8');
      // [분기 설명] 외부 계약(Props)으로 HTMLArkProps나 Ark*.RootProps가 누출되는 패턴을 정적 차단합니다.
      if (/\bHTMLArkProps\b|Ark\w+\.RootProps\b/.test(code)) {
        leakyFiles.push(file);
      }
    }

    expect(leakyFiles).toEqual([]);
  });

  it('7) TC-06: dist/@mf-types 산출물이 존재하는 경우 모든 .d.ts 파일에 @ark-ui/react 참조가 0건이어야 한다 (Study 09)', () => {
    const mfTypesDir = resolve(srcRoot, '../dist/@mf-types');
    // [분기 설명] 최초 빌드 전 단위 테스트만 실행되는 경우 건너뛰고, 빌드 산출물이 존재할 때는 실제 생성된 .d.ts 전체를 검사합니다.
    if (!existsSync(mfTypesDir)) {
      return;
    }

    const dtsFiles = collectAllFiles(mfTypesDir).filter((file) => file.endsWith('.d.ts'));
    expect(dtsFiles.length).toBeGreaterThan(0);

    const leakyDtsFiles: string[] = [];
    for (const file of dtsFiles) {
      const content = readFileSync(file, 'utf-8');
      // [분기 설명] 생성된 .d.ts 타입 선언 파일에 @ark-ui/react 모듈 import 또는 참조가 단 한 건이라도 남으면 실패 처리합니다.
      if (
        /(?:from|import\s*\()\s*['"]@ark-ui\/react/.test(content) ||
        content.includes('@ark-ui/react')
      ) {
        leakyDtsFiles.push(file);
      }
    }

    expect(leakyDtsFiles).toEqual([]);
  });
});
