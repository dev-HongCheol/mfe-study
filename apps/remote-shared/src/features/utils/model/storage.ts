/**
 * @file storage.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description 동일 출처(Origin)에서 다중 마이크로 앱 간 localStorage 키 충돌 및 오염을 막는 스코프 스토리지 래퍼입니다 ([Study 04 #10, Study 05 #10]).
 */
import type { ZodType } from 'zod';

/**
 * @description 스코프 프리픽스(mfe:<scopeId>:<key>)와 Zod 런타임 검증이 결합된 안전한 localStorage 래퍼 인터페이스
 */
export interface ScopedStorage {
  /** 현재 스토리지 인스턴스에 바인딩된 서비스 스코프 식별자 */
  readonly scopeId: string;

  /** 실제 localStorage에 저장될 네임스페이스 키 문자열(mfe:<scopeId>:<key>)을 생성합니다. */
  buildKey: (key: string) => string;

  /** 저장된 JSON 값을 읽어 Zod 스키마(safeParse)로 검증한 뒤 유효하면 반환하고, 오염·부재 시 fallback을 반환합니다. */
  getItem: <T>(key: string, schema: ZodType<T>, fallback: T) => T;

  /** 값을 JSON 직렬화하여 스코프 프리픽스가 붙은 키에 안전하게 저장합니다. */
  setItem: <T>(key: string, value: T) => void;

  /** 해당 스코프 프리픽스가 붙은 단일 키를 삭제합니다. */
  removeItem: (key: string) => void;

  /** 타 마이크로 앱의 키는 건드리지 않고 현재 스코프(mfe:<scopeId>:*)의 키만 선택적으로 모두 삭제합니다. */
  clearScope: () => void;
}

/**
 * 지정된 서비스 스코프 ID(예: 'shared', 'products', 'cart', 'host-vite')로 격리된 localStorage 래퍼를 생성합니다.
 *
 * @param scopeId - 네임스페이스로 사용할 서비스 스코프 식별자
 * @returns 스코프 프리픽스 및 Zod 검증이 내장된 ScopedStorage 객체
 */
export function createScopedStorage(scopeId: string): ScopedStorage {
  /** 스코프별 고유 키 접두사 (예: 'mfe:shared:') */
  const prefix = `mfe:${scopeId}:`;

  /**
   * 로컬 키 이름에 스코프 접두사를 결합합니다.
   *
   * @param key - 스코프 내부 키 이름
   * @returns 프리픽스가 결합된 전체 키 문자열
   */
  function buildKey(key: string): string {
    return `${prefix}${key}`;
  }

  return {
    scopeId,
    buildKey,

    getItem<T>(key: string, schema: ZodType<T>, fallback: T): T {
      // [분기 설명] 브라우저 localStorage를 사용할 수 없는 환경에서는 즉시 기본값을 반환합니다.
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallback;
      }

      try {
        const raw = window.localStorage.getItem(buildKey(key));
        // [분기 설명] 아직 저장된 값이 없는 초기 상태일 경우 기본값을 반환합니다.
        if (raw === null) {
          return fallback;
        }

        const parsedJson: unknown = JSON.parse(raw);
        const validated = schema.safeParse(parsedJson);

        // [분기 설명] 예전 버전 스키마나 수동 조작으로 데이터가 오염된 경우 크래시 대신 기본값으로 복구합니다.
        if (!validated.success) {
          return fallback;
        }

        return validated.data;
      } catch {
        return fallback;
      }
    },

    setItem<T>(key: string, value: T): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      try {
        window.localStorage.setItem(buildKey(key), JSON.stringify(value));
      } catch {
        // 스토리지 용량 초과(QuotaExceededError) 시 앱이 멈추지 않도록 무시
      }
    },

    removeItem(key: string): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      window.localStorage.removeItem(buildKey(key));
    },

    clearScope(): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const currentKey = window.localStorage.key(i);
        // [분기 설명] 전체 localStorage.clear()를 부르면 다른 마이크로 앱의 데이터까지 날아가므로 현재 스코프 접두사만 골라냅니다.
        if (currentKey?.startsWith(prefix)) {
          keysToRemove.push(currentKey);
        }
      }

      for (const targetKey of keysToRemove) {
        window.localStorage.removeItem(targetKey);
      }
    },
  };
}
