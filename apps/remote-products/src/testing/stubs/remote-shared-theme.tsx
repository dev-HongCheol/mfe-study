/**
 * @file remote-shared-theme.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vitest 단독 TDD 실행 시 remote_shared/theme 모듈을 대체하는 로컬 테스트 스텁입니다 ([Study 04 #11]).
 */
import { type ReactNode, createContext, useContext, useState } from 'react';
import type { ThemeMode } from './remote-shared-utils.js';

/**
 * @description 테마 옵션 메타데이터 인터페이스
 */
export interface ThemeOptionMeta {
  /** 테마 식별자 */
  value: ThemeMode;
  /** 화면 표시용 한글 라벨 */
  label: string;
}

/** 지원되는 4종 테마 목록 상수 */
export const AVAILABLE_THEMES: readonly ThemeOptionMeta[] = [
  { value: 'indigo', label: 'Indigo (기본)' },
  { value: 'emerald', label: 'Emerald (민트)' },
  { value: 'rose', label: 'Rose (코랄)' },
  { value: 'dark', label: 'Dark (다크)' },
] as const;

/** 표준 z-index 계층 상수 */
export const Z_INDEX_TOKENS = {
  header: 100,
  dropdown: 200,
  drawer: 300,
  modal: 400,
  toast: 500,
} as const;

/**
 * @description 테마 컨텍스트 값 인터페이스
 */
export interface ThemeContextValue {
  /** 현재 활성 테마 */
  theme: ThemeMode;
  /** 테마 변경 함수 */
  setTheme: (nextTheme: ThemeMode) => void;
  /** 선택 가능한 테마 목록 */
  availableThemes: readonly ThemeOptionMeta[];
}

/**
 * @description ThemeProvider Props 인터페이스
 */
export interface ThemeProviderProps {
  /** 초기 테마 모드 */
  defaultTheme?: ThemeMode;
  /** 자식 노드 */
  children: ReactNode;
}

/** 테스트용 테마 Context 인스턴스 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'indigo',
  setTheme: () => undefined,
  availableThemes: AVAILABLE_THEMES,
});

/**
 * 테스트용 ThemeProvider 스텁 컴포넌트입니다.
 *
 * @param props - 초기 테마 및 자식 컴포넌트
 * @returns ThemeContext.Provider 엘리먼트
 */
export function ThemeProvider({ defaultTheme = 'indigo', children }: ThemeProviderProps) {
  /** 현재 선택된 테마 상태 */
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * 현재 테마 컨텍스트 값을 반환하는 테스트용 훅입니다.
 *
 * @returns ThemeContextValue 객체
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
