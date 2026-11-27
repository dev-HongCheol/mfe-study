/**
 * @file validators.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description 전사 MFE 앱이 공통으로 사용하는 비인증 사용자 ID 정규화(normalizeUserId) 및 표준 열거형 타입 가드(isThemeMode, isSyncMode) 유틸리티입니다 ([SSOT § 5.4.2~§ 5.4.3]).
 */
import { type SyncMode, type ThemeMode, syncModeSchema, themeModeSchema } from './contracts';

/**
 * Props 또는 이벤트로 전달받은 사용자 ID를 정규화합니다 ([SSOT § 5.4.2, § 5.4.3]).
 * null, undefined, 비문자열, 빈 문자열 또는 공백만 있는 문자열은 임의 유저로 폴백하지 않고 null(비로그인)을 반환합니다.
 *
 * @param rawUserId - Props 또는 이벤트로 전달된 원본 사용자 ID
 * @returns 양끝 공백이 제거된 유효 사용자 ID 문자열 또는 null(비로그인)
 */
export function normalizeUserId(rawUserId?: string | null): string | null {
  // [분기 설명] 런타임 타입 오염(숫자·객체·null·undefined)을 예외 없이 비로그인(null) 상태로 차단합니다.
  if (typeof rawUserId !== 'string') {
    return null;
  }

  const trimmed = rawUserId.trim();

  // [분기 설명] 공백만 입력된 문자열이 유효 로그인 ID로 오인되지 않도록 길이가 0이면 null을 반환합니다.
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

/**
 * 알 수 없는 입력값이 표준 실시간 테마 모드('indigo' | 'emerald' | 'rose' | 'dark')인지 런타임 검증하는 타입 가드입니다.
 * Select onChange 등에서 위험한 `as ThemeMode` 강제 단언을 대체하기 위해 사용합니다.
 *
 * @param value - 외부 UI 이벤트나 스토리지 등에서 전달된 미검증 입력값
 * @returns 유효한 ThemeMode이면 true, 그렇지 않으면 false
 */
export function isThemeMode(value: unknown): value is ThemeMode {
  return themeModeSchema.safeParse(value).success;
}

/**
 * 알 수 없는 입력값이 표준 상태 동기화 비교 모드('mode-a-event' | 'mode-b-query')인지 런타임 검증하는 타입 가드입니다.
 * Select onChange 등에서 위험한 `as SyncMode` 강제 단언을 대체하기 위해 사용합니다.
 *
 * @param value - 외부 UI 이벤트나 스토리지 등에서 전달된 미검증 입력값
 * @returns 유효한 SyncMode이면 true, 그렇지 않으면 false
 */
export function isSyncMode(value: unknown): value is SyncMode {
  return syncModeSchema.safeParse(value).success;
}
