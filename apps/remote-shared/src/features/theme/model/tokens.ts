/**
 * @file tokens.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./theme)
 * @description 전사 표준 z-index 계층 상수(Z_INDEX_TOKENS), 4종 실시간 테마 메타데이터 및 루트 CSS 변수 주입 함수입니다 ([Study 04 #06, Study 05 #14]).
 */
import type { ThemeMode } from '../../utils/model/contracts.js';

/**
 * @description 다중 마이크로 앱 간 Portal(드롭다운, 모달, 토스트 등) 레이어 충돌을 방지하는 전사 표준 z-index 계층 토큰 상수 (루트 SSOT § 5.3.2)
 */
export const Z_INDEX_TOKENS = {
  /** 상단 글로벌 헤더 계층 */
  header: 100,

  /** Select 드롭다운 및 팝오버 계층 */
  dropdown: 200,

  /** 사이드 드로어 및 MfeInspector 확장 패널 계층 */
  drawer: 300,

  /** 모달 다이얼로그 계층 */
  modal: 400,

  /** 최상단 알림 토스트 계층 */
  toast: 500,
} as const;

/**
 * @description 테마 스위처 UI 렌더링을 위한 개별 테마 옵션 메타데이터 인터페이스
 */
export interface ThemeOptionMeta {
  /** 테마 모드 식별자 코드 ('indigo' | 'emerald' | 'rose' | 'dark') */
  value: ThemeMode;

  /** 사용자 화면에 표시할 테마 이름 */
  label: string;
}

/** 지원되는 4종 테마 메타데이터 목록 상수 */
export const AVAILABLE_THEMES: ReadonlyArray<ThemeOptionMeta> = [
  { value: 'indigo', label: 'Indigo (기본)' },
  { value: 'emerald', label: 'Emerald (그린)' },
  { value: 'rose', label: 'Rose (코랄)' },
  { value: 'dark', label: 'Dark (다크 모드)' },
] as const;

/** 테마별 브랜드 포인트 색상 및 배경·텍스트 시맨틱 CSS 변수 값 매핑 사전 */
const THEME_CSS_VARIABLE_MAP: Record<ThemeMode, Record<string, string>> = {
  indigo: {
    '--mfe-bg-app': '#f8fafc',
    '--mfe-bg-surface': '#ffffff',
    '--mfe-bg-elevated': '#f1f5f9',
    '--mfe-text-primary': '#0f172a',
    '--mfe-text-secondary': '#334155',
    '--mfe-text-muted': '#64748b',
    '--mfe-brand-primary': '#4f46e5',
    '--mfe-brand-hover': '#4338ca',
    '--mfe-danger': '#dc2626',
    '--mfe-border-subtle': '#e2e8f0',
  },
  emerald: {
    '--mfe-bg-app': '#f0fdf4',
    '--mfe-bg-surface': '#ffffff',
    '--mfe-bg-elevated': '#dcfce7',
    '--mfe-text-primary': '#064e3b',
    '--mfe-text-secondary': '#065f46',
    '--mfe-text-muted': '#047857',
    '--mfe-brand-primary': '#059669',
    '--mfe-brand-hover': '#047857',
    '--mfe-danger': '#dc2626',
    '--mfe-border-subtle': '#bbf7d0',
  },
  rose: {
    '--mfe-bg-app': '#fff1f2',
    '--mfe-bg-surface': '#ffffff',
    '--mfe-bg-elevated': '#ffe4e6',
    '--mfe-text-primary': '#4c0519',
    '--mfe-text-secondary': '#881337',
    '--mfe-text-muted': '#9f1239',
    '--mfe-brand-primary': '#e11d48',
    '--mfe-brand-hover': '#be123c',
    '--mfe-danger': '#b91c1c',
    '--mfe-border-subtle': '#fecdd3',
  },
  dark: {
    '--mfe-bg-app': '#0f172a',
    '--mfe-bg-surface': '#1e293b',
    '--mfe-bg-elevated': '#334155',
    '--mfe-text-primary': '#f8fafc',
    '--mfe-text-secondary': '#cbd5e1',
    '--mfe-text-muted': '#94a3b8',
    '--mfe-brand-primary': '#6366f1',
    '--mfe-brand-hover': '#818cf8',
    '--mfe-danger': '#ef4444',
    '--mfe-border-subtle': '#334155',
  },
};

/**
 * document.documentElement(:root)에 현재 선택된 테마 속성(data-mfe-theme), 시맨틱 색상 토큰 및 z-index 토큰을 즉시 주입합니다.
 *
 * @param theme - 적용할 테마 모드 ('indigo' | 'emerald' | 'rose' | 'dark')
 * @returns void
 */
export function applyThemeTokensToDocument(theme: ThemeMode): void {
  // [분기 설명] SSR 또는 비브라우저 환경에서 document 접근 에러를 예방합니다.
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-mfe-theme', theme);

  const tokenValues = THEME_CSS_VARIABLE_MAP[theme];
  for (const [varName, varValue] of Object.entries(tokenValues)) {
    root.style.setProperty(varName, varValue);
  }

  // 공통 레이아웃 간격·모서리 토큰 및 전사 표준 z-index 토큰 주입
  root.style.setProperty('--mfe-radius-md', '0.5rem');
  root.style.setProperty('--mfe-space-sm', '0.5rem');
  root.style.setProperty('--mfe-space-md', '1rem');
  root.style.setProperty('--mfe-space-lg', '1.5rem');
  root.style.setProperty('--mfe-z-header', String(Z_INDEX_TOKENS.header));
  root.style.setProperty('--mfe-z-dropdown', String(Z_INDEX_TOKENS.dropdown));
  root.style.setProperty('--mfe-z-drawer', String(Z_INDEX_TOKENS.drawer));
  root.style.setProperty('--mfe-z-modal', String(Z_INDEX_TOKENS.modal));
  root.style.setProperty('--mfe-z-toast', String(Z_INDEX_TOKENS.toast));
  root.style.setProperty('--z-dropdown', String(Z_INDEX_TOKENS.dropdown));
}
