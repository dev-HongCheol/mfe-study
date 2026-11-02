/**
 * @file error.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description Error 인스턴스가 아닌 예외(문자열, null, API 에러 봉투 등)를 일관된 표준 객체로 변환하는 유틸리티입니다 ([Study 05 #12]).
 */

/**
 * @description 모든 형태의 런타임 예외(Error, 문자열, API 에러 봉투 등)를 안전하게 표준화한 에러 객체 인터페이스
 */
export interface NormalizedError {
  /** 사용자 또는 로그에 안전하게 표시할 한글/표준 에러 메시지 */
  message: string;

  /** 머신 판독용 에러 코드 (예: 'UNKNOWN_ERROR', 'OUT_OF_STOCK', 'NETWORK_ERROR') */
  code: string;

  /** HTTP 응답 상태 코드 (네트워크 에러 등 상태 코드가 있는 경우 선택적 포함) */
  status?: number;

  /** 디버깅 추적을 위해 보존한 원본 예외 값 */
  originalError: unknown;
}

/**
 * 알 수 없는(unknown) 형태의 예외 값을 받아 항상 안전한 NormalizedError 객체로 변환합니다.
 *
 * @param err - catch 블록 등에서 포착된 임의의 예외 값
 * @returns 안전하게 정규화된 NormalizedError 객체
 */
export function normalizeError(err: unknown): NormalizedError {
  // [분기 설명 1] 이미 NormalizedError 형태이거나 커스텀 code/message 객체인 경우 속성을 보존합니다.
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;

    // 백엔드 표준 에러 봉투({ success: false, error: { code, message } }) 형태인 경우
    if (typeof record.error === 'object' && record.error !== null) {
      const inner = record.error as Record<string, unknown>;
      if (typeof inner.message === 'string') {
        return {
          message: inner.message,
          code: typeof inner.code === 'string' ? inner.code : 'API_ERROR',
          status: typeof record.status === 'number' ? record.status : undefined,
          originalError: err,
        };
      }
    }

    // AbortError 취소 예외인 경우
    if (record.name === 'AbortError') {
      return {
        message: '요청이 취소되었습니다.',
        code: 'ABORTED',
        originalError: err,
      };
    }

    if (typeof record.message === 'string' && typeof record.code === 'string') {
      return {
        message: record.message,
        code: record.code,
        status: typeof record.status === 'number' ? record.status : undefined,
        originalError: 'originalError' in record ? record.originalError : err,
      };
    }
  }

  // [분기 설명 2] 표준 Error 인스턴스인 경우
  if (err instanceof Error) {
    return {
      message: err.message || '알 수 없는 오류가 발생했습니다.',
      code: err.name === 'Error' ? 'ERROR' : err.name.toUpperCase(),
      originalError: err,
    };
  }

  // [분기 설명 3] throw "문자열" 형태로 던져진 예외인 경우
  if (typeof err === 'string' && err.trim().length > 0) {
    return {
      message: err,
      code: 'STRING_ERROR',
      originalError: err,
    };
  }

  // [분기 설명 4] null, undefined, 숫자 등 그 외 모든 비표준 예외 폴백
  return {
    message: '예기치 못한 오류가 발생했습니다.',
    code: 'UNKNOWN_ERROR',
    originalError: err,
  };
}
