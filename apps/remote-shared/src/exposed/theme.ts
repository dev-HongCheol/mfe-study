/**
 * @file theme.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (remote_shared/theme)
 * @description Module Federation './theme' 서브패스 공개 진입점입니다. 단방향 의존성 원칙에 따라 ui 모듈을 절대 참조하지 않습니다.
 */
export {
  AVAILABLE_THEMES,
  type ThemeOptionMeta,
  Z_INDEX_TOKENS,
  applyThemeTokensToDocument,
} from '../features/theme/model/tokens.js';
export {
  ThemeContext,
  type ThemeContextValue,
  ThemeProvider,
  type ThemeProviderProps,
  useTheme,
} from '../features/theme/ui/ThemeProvider.js';
export type { ThemeMode } from '../features/utils/model/contracts.js';
