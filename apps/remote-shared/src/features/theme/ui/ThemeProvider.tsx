/**
 * @file ThemeProvider.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./theme)
 * @description 침묵의 React Context 단절을 막는 단일 원격 ThemeContext, ThemeProvider 및 useTheme 훅입니다 ([Study 04 #07, Study 05 #14]).
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { MFE_EVENTS, type ThemeMode, themeModeSchema } from '../../utils/model/contracts.js';
import { mfeEventBus, useMfeEvent } from '../../utils/model/event-bus.js';
import { createScopedStorage } from '../../utils/model/storage.js';
import {
  AVAILABLE_THEMES,
  type ThemeOptionMeta,
  applyThemeTokensToDocument,
} from '../model/tokens.js';
import './theme.css';

/**
 * @description ThemeProvider가 하위 호스트 및 모든 리모트 컴포넌트에 공유하는 테마 컨텍스트 값 인터페이스
 */
export interface ThemeContextValue {
  /** 현재 활성화된 테마 모드 ('indigo' | 'emerald' | 'rose' | 'dark') */
  theme: ThemeMode;

  /** 테마를 즉시 변경하고 localStorage 영속화 및 mfe:theme-changed 이벤트를 함께 발행하는 함수 */
  setTheme: (nextTheme: ThemeMode) => void;

  /** 지원되는 전체 테마 목록 메타데이터 (테마 스위처 UI 렌더링용) */
  availableThemes: ReadonlyArray<ThemeOptionMeta>;
}

/**
 * @description ThemeProvider 컴포넌트 Props 인터페이스
 */
export interface ThemeProviderProps {
  /** 초기 기본 테마 모드 (저장된 테마가 없을 때 사용, 기본값: 'indigo') */
  defaultTheme?: ThemeMode;

  /** 테마 컨텍스트를 공급받을 하위 트리 노드 */
  children: ReactNode;
}

/** shared 스코프 전용 localStorage 래퍼 인스턴스 (키: mfe:shared:theme) */
const sharedThemeStorage = createScopedStorage('shared');

/**
 * 모든 마이크로 앱이 단일 원격 출처(remote_shared/theme)에서 공유하는 ThemeContext 인스턴스 ([Study 04 #07])
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'indigo',
  setTheme: (nextTheme: ThemeMode) => {
    sharedThemeStorage.setItem('theme', nextTheme);
    applyThemeTokensToDocument(nextTheme);
    mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, {
      theme: nextTheme,
      timestamp: new Date().toISOString(),
    });
  },
  availableThemes: AVAILABLE_THEMES,
});

/**
 * 호스트 또는 단독 실행 루트를 감싸 실시간 테마 상태, 루트 CSS 변수 주입, 이벤트 버스 동기화를 관리하는 프로바이더 컴포넌트입니다.
 *
 * @param props - 기본 테마 및 하위 React 노드
 * @returns ThemeContext.Provider 래퍼 엘리먼트
 */
export function ThemeProvider({ defaultTheme = 'indigo', children }: ThemeProviderProps) {
  /** 현재 활성화된 테마 모드 상태 (초기값은 스코프 스토리지에서 Zod 검증 후 로드) */
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    sharedThemeStorage.getItem('theme', themeModeSchema, defaultTheme),
  );

  // 테마 상태가 변경될 때마다 document.documentElement(:root)에 CSS 변수 및 data-mfe-theme 속성을 주입합니다.
  useEffect(() => {
    applyThemeTokensToDocument(theme);
  }, [theme]);

  /**
   * 사용자가 테마를 변경할 때 상태 업데이트, localStorage 저장, 커스텀 이벤트 발행을 일괄 수행합니다.
   */
  const setTheme = useCallback((nextTheme: ThemeMode): void => {
    const parsed = themeModeSchema.safeParse(nextTheme);
    // [분기 설명] 잘못된 테마 문자열이 전달되었을 때 스타일이 깨지지 않도록 무시합니다.
    if (!parsed.success) {
      return;
    }

    setThemeState(parsed.data);
    sharedThemeStorage.setItem('theme', parsed.data);
    applyThemeTokensToDocument(parsed.data);
    mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, {
      theme: parsed.data,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // 다른 마이크로 앱이나 외부 패널에서 발행한 mfe:theme-changed 이벤트를 수신해 상태를 자동 동기화합니다.
  useMfeEvent(MFE_EVENTS.THEME_CHANGED, (payload) => {
    setThemeState((prev) => {
      // [분기 설명] 이미 동일한 테마가 적용되어 있으면 불필요한 리렌더링을 건너뜁니다.
      if (prev === payload.theme) {
        return prev;
      }
      sharedThemeStorage.setItem('theme', payload.theme);
      applyThemeTokensToDocument(payload.theme);
      return payload.theme;
    });
  });

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      availableThemes: AVAILABLE_THEMES,
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * 현재 활성 테마(theme), 테마 변경 함수(setTheme), 지원 테마 목록(availableThemes)을 반환하는 커스텀 훅입니다.
 *
 * @returns ThemeContextValue 객체
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
