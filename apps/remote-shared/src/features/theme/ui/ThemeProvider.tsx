/**
 * @file ThemeProvider.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./theme)
 * @description 침묵의 React Context 단절을 막는 단일 원격 ThemeContext, ThemeProvider 및 useTheme 훅입니다. 발신자 식별(sourceId)과 자기 에코(Self-Echo) 자동 차단을 내장합니다 ([Study 04 #07, #09, Study 05 #14]).
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MFE_EVENTS, type ThemeMode, themeModeSchema } from '../../utils/model/contracts';
import { createMfeEventSourceId, mfeEventBus, useMfeEvent } from '../../utils/model/event-bus';
import { createScopedStorage } from '../../utils/model/storage';
import { isThemeMode } from '../../utils/model/validators';
import {
  AVAILABLE_THEMES,
  type ThemeOptionMeta,
  applyThemeTokensToDocument,
} from '../model/tokens';
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

/** ThemeProvider 인스턴스별 mfe:theme-changed 발신자 ID 접두사 상수 */
const THEME_EVENT_SOURCE_PREFIX = 'remote-shared-theme';

/** ThemeProvider 외부(기본 ThemeContext)에서 setTheme이 호출될 때 사용하는 폴백 발신자 ID 접두사 상수 */
const FALLBACK_THEME_EVENT_SOURCE_PREFIX = 'remote-shared-theme-fallback';

/** Provider 외부 기본 컨텍스트 호출용 폴백 발신자 ID 지연 캐시 */
let cachedFallbackThemeSourceId: string | null = null;

/**
 * ThemeProvider 외부에서 기본 ThemeContext.setTheme이 호출될 때 사용할 고유 폴백 sourceId를 1회 지연 생성합니다.
 *
 * @returns 'remote-shared-theme-fallback:<uuid>' 형식의 고유 발신자 ID
 */
function getFallbackThemeSourceId(): string {
  // [분기 설명] 모듈 로드 시점 즉시 생성하지 않고 실제 폴백 호출 시에만 1회 발급해 불필요한 부작용을 줄입니다.
  if (cachedFallbackThemeSourceId === null) {
    cachedFallbackThemeSourceId = createMfeEventSourceId(FALLBACK_THEME_EVENT_SOURCE_PREFIX);
  }
  return cachedFallbackThemeSourceId;
}

/**
 * 모든 마이크로 앱이 단일 원격 출처(remote_shared/theme)에서 공유하는 ThemeContext 인스턴스 ([Study 04 #07])
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'indigo',
  setTheme: (nextTheme: ThemeMode) => {
    // [분기 설명] Provider 외부 기본 컨텍스트 호출에서도 무효 테마 문자열로 인한 DOM 토큰 주입 크래시 및 오염 이벤트 발행을 차단합니다.
    if (!isThemeMode(nextTheme)) {
      return;
    }

    sharedThemeStorage.setItem('theme', nextTheme);
    applyThemeTokensToDocument(nextTheme);
    mfeEventBus.emit(
      MFE_EVENTS.THEME_CHANGED,
      {
        theme: nextTheme,
        timestamp: new Date().toISOString(),
      },
      { sourceId: getFallbackThemeSourceId() },
    );
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
  /** 이 ThemeProvider 마운트 인스턴스 생명주기 동안 유지되는 고유 mfe:theme-changed 발신자 ID Ref */
  const themeSourceIdRef = useRef<string | null>(null);
  // [분기 설명] 최초 렌더 시 1회만 sourceId를 지연 생성해 리렌더 간 동일 발신자 ID를 유지하고 자기 에코를 정확히 식별합니다.
  if (themeSourceIdRef.current === null) {
    themeSourceIdRef.current = createMfeEventSourceId(THEME_EVENT_SOURCE_PREFIX);
  }
  const themeSourceId = themeSourceIdRef.current;

  /** 현재 활성화된 테마 모드 상태 (초기값은 스코프 스토리지에서 Zod 검증 후 로드) */
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    sharedThemeStorage.getItem('theme', themeModeSchema, defaultTheme),
  );

  // 테마 상태가 변경될 때마다 document.documentElement(:root)에 CSS 변수 및 data-mfe-theme 속성을 주입합니다.
  useEffect(() => {
    applyThemeTokensToDocument(theme);
  }, [theme]);

  /**
   * 사용자가 테마를 변경할 때 상태 업데이트, localStorage 저장, sourceId가 첨부된 커스텀 이벤트 발행을 일괄 수행합니다.
   */
  const setTheme = useCallback(
    (nextTheme: ThemeMode): void => {
      // [분기 설명] 잘못된 테마 문자열이 전달되었을 때 스타일이 깨지지 않도록 무시합니다.
      if (!isThemeMode(nextTheme)) {
        return;
      }

      setThemeState(nextTheme);
      sharedThemeStorage.setItem('theme', nextTheme);
      applyThemeTokensToDocument(nextTheme);
      mfeEventBus.emit(
        MFE_EVENTS.THEME_CHANGED,
        {
          theme: nextTheme,
          timestamp: new Date().toISOString(),
        },
        { sourceId: themeSourceId },
      );
    },
    [themeSourceId],
  );

  // 다른 마이크로 앱이나 외부 패널에서 발행한 mfe:theme-changed 이벤트만 수신하고, 자기 자신이 발행한 이벤트(Self-Echo)는 경계에서 차단합니다.
  useMfeEvent(
    MFE_EVENTS.THEME_CHANGED,
    (payload) => {
      setThemeState((prev) => {
        // [분기 설명] 이미 동일한 테마가 적용되어 있으면 불필요한 리렌더링을 건너뜁니다.
        if (prev === payload.theme) {
          return prev;
        }
        sharedThemeStorage.setItem('theme', payload.theme);
        applyThemeTokensToDocument(payload.theme);
        return payload.theme;
      });
    },
    { ignoreSourceId: themeSourceId },
  );

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
