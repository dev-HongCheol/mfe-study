/**
 * @file error.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description 비표준 예외를 안전하게 정규화하는 normalizeError와, Zod 스키마 검증 실패 좌표 추출(extractSchemaIssues) 및 DEV/PROD 이원화 리포트(formatErrorReport) 유틸리티입니다 ([Study 05 #10, #12]).
 */
import { ZodError } from 'zod';

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
 * @description Zod 스키마 검증 실패(RESPONSE_SCHEMA_INVALID) 시 개별 필드 불일치 좌표를 나타내는 인터페이스 ([Study 05 #10])
 */
export interface SchemaIssueDetail {
  /** 실패한 데이터 경로 문자열 (예: '[0].createdAt', 'category', '(root)') */
  path: string;

  /** Zod 이슈 코드 (예: 'invalid_type', 'too_big') */
  code: string;

  /** 상세 실패 사유 메시지 */
  message: string;
}

/**
 * @description 실행 환경(DEV vs PROD)별로 이원화된 표준 에러 표시 모델 인터페이스 ([Study 05 #10])
 */
export interface ErrorReport {
  /** 머신 판독용 표준 에러 코드 (예: 'RESPONSE_SCHEMA_INVALID', 'OUT_OF_STOCK') */
  code: string;

  /** 사용자에게 표시할 안내 문구 (운영 환경에서는 내부 스키마 구조를 숨긴 안전 문구) */
  userMessage: string;

  /** 개발 환경(DEV)에서만 노출되는 스키마 불일치 필드 목록 (운영 환경에서는 항상 빈 배열) */
  devDetails: SchemaIssueDetail[];
}

/** UI 배너 폭주를 방지하기 위해 extractSchemaIssues에서 기본으로 추출하는 최대 스키마 이슈 개수 상수 */
const DEFAULT_MAX_SCHEMA_ISSUES = 5;

/** 운영 환경(PROD)에서 RESPONSE_SCHEMA_INVALID 발생 시 내부 스키마 구조를 숨기고 표시할 안전 안내 문구 상수 */
const PROD_SCHEMA_ERROR_MESSAGE =
  '일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

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

/**
 * Zod 이슈의 path 세그먼트 배열을 사람이 읽기 쉬운 필드 좌표 문자열(예: '[0].price', 'items[2].name', '(root)')로 포맷합니다.
 *
 * @param pathSegments - Zod 이슈의 path 세그먼트 배열
 * @returns 포맷된 필드 경로 문자열
 */
function formatZodIssuePath(pathSegments: ReadonlyArray<string | number>): string {
  // [분기 설명] 최상위 루트 검증 실패 시 빈 path 배열을 명시적 '(root)' 표기로 변환합니다.
  if (pathSegments.length === 0) {
    return '(root)';
  }

  return pathSegments
    .map((segment, index) => {
      // [분기 설명] 숫자 인덱스는 배열 표기('[0]')로, 문자열 키는 첫 항목 그대로·후속 항목은 점 표기('.field')로 결합합니다.
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return index === 0 ? String(segment) : `.${String(segment)}`;
    })
    .join('');
}

/**
 * 원본 예외(ZodError 인스턴스 또는 이종 번들러·직렬화 경계를 넘은 issues 배열 객체)에서 실패 필드 좌표 목록을 추출합니다 ([Study 05 #10]).
 *
 * @param originalError - NormalizedError.originalError에 보존된 원본 예외 값
 * @param maxIssues - 추출할 최대 이슈 개수 (기본값: 5, 0 이하 또는 비유한 수 전달 시 빈 배열 반환)
 * @returns 구조화된 SchemaIssueDetail 배열
 */
export function extractSchemaIssues(
  originalError: unknown,
  maxIssues: number = DEFAULT_MAX_SCHEMA_ISSUES,
): SchemaIssueDetail[] {
  // [분기 설명] maxIssues가 NaN·무한대·0 이하인 경우 잘못된 슬라이싱이나 빈 목록 오작동을 막기 위해 즉시 빈 배열을 반환합니다.
  if (!Number.isFinite(maxIssues) || maxIssues <= 0) {
    return [];
  }

  const limit = Math.floor(maxIssues);

  // [분기 설명 1] 동일 번들 컨텍스트의 실제 ZodError 인스턴스인 경우 공식 issues 속성을 직접 매핑합니다.
  if (originalError instanceof ZodError) {
    return originalError.issues.slice(0, limit).map((issue) => ({
      path: formatZodIssuePath(issue.path),
      code: issue.code,
      message: issue.message,
    }));
  }

  // [분기 설명 2] 이종 번들러(Vite ↔ Rspack)나 직렬화 경계에서 instanceof ZodError가 실패할 수 있으므로 issues 배열 덕타이핑을 지원합니다.
  if (typeof originalError === 'object' && originalError !== null) {
    const record = originalError as { issues?: unknown };
    if (Array.isArray(record.issues)) {
      return record.issues.slice(0, limit).map((rawIssue) => {
        const issue = (typeof rawIssue === 'object' && rawIssue !== null ? rawIssue : {}) as {
          path?: unknown;
          code?: unknown;
          message?: unknown;
        };
        const rawPath = Array.isArray(issue.path)
          ? issue.path.filter(
              (segment): segment is string | number =>
                typeof segment === 'string' || typeof segment === 'number',
            )
          : [];

        return {
          path: formatZodIssuePath(rawPath),
          code: typeof issue.code === 'string' ? issue.code : 'invalid_schema',
          message: typeof issue.message === 'string' ? issue.message : '스키마 형식 불일치',
        };
      });
    }
  }

  return [];
}

/**
 * 정규화된 에러 객체를 실행 환경(DEV vs PROD)에 따라 이원화된 ErrorReport로 변환합니다 ([Study 05 #10]).
 * MFE 프로덕션 안전성(Fail-Closed)을 위해 isDev 기본값은 false이며, 소비자 앱은 자신의 import.meta.env.DEV를 명시 전달합니다.
 *
 * @param error - normalizeError로 표준화된 에러 객체
 * @param isDev - 호출 측 소비자 앱의 개발 환경 여부 (기본값: false)
 * @returns 환경별로 안전하게 분리된 ErrorReport 객체
 */
export function formatErrorReport(error: NormalizedError, isDev = false): ErrorReport {
  const isSchemaInvalid = error.code === 'RESPONSE_SCHEMA_INVALID';

  // [분기 설명] 운영 환경(PROD) 및 isDev 미지정(Fail-Closed) 시 내부 DB·스키마 경로 노출을 차단하고 사용자 친화적 문구만 반환합니다.
  if (!isDev) {
    return {
      code: error.code,
      userMessage: isSchemaInvalid ? PROD_SCHEMA_ERROR_MESSAGE : error.message,
      devDetails: [],
    };
  }

  // [분기 설명] 개발 환경(DEV)에서는 RESPONSE_SCHEMA_INVALID에 한해 실패 필드 좌표(devDetails)를 첨부해 즉시 원인 파악을 돕습니다.
  return {
    code: error.code,
    userMessage: error.message,
    devDetails: isSchemaInvalid ? extractSchemaIssues(error.originalError) : [],
  };
}
