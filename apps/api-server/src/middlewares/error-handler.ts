/**
 * @file error-handler.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [Study 05 #07 & #12] 미등록 경로(404) 핸들러, 비표준 예외 안전 변환(normalizeBackendError) 및 전역 에러 핸들러 미들웨어를 제공합니다.
 */
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorCode, ApiResponse } from '../types/contracts.js';
import { AppError } from './response.js';

/**
 * @description normalizeBackendError가 반환하는 정규화된 에러 정보 인터페이스
 */
export interface NormalizedBackendError {
  /** HTTP 응답 상태 코드 */
  statusCode: number;

  /** 표준 에러 코드 */
  code: ApiErrorCode;

  /** 클라이언트 응답으로 안전하게 노출할 한글 에러 메시지 (500 에러 시 내부 원문 마스킹) */
  message: string;

  /** 서버 내부 디버깅·로깅용 원본 예외 메시지 */
  internalMessage: string;

  /** 선택적 에러 상세 정보 (Zod 이슈 목록 등) */
  details?: unknown;
}

/**
 * 알 수 없는(unknown) 타입의 예외를 항상 안전한 표준 에러 구조로 변환합니다 (Study 05 #12 & SEC-03).
 *
 * @param err - catch 블록이나 Express 에러 미들웨어로 전달된 임의의 예외 값
 * @returns 상태 코드·에러 코드·외부 노출 메시지·내부 원문 메시지가 보장된 정규화 객체
 */
export function normalizeBackendError(err: unknown): NormalizedBackendError {
  // [분기 설명 1] 도메인/라우터에서 명시적으로 던진 AppError는 의도된 사용자 메시지이므로 그대로 반환합니다.
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      internalMessage: err.message,
      details: err.details,
    };
  }

  // [분기 설명 2] Zod 스키마 파싱 에러가 직접 던져진 경우 400 VALIDATION_ERROR로 변환합니다.
  if (err instanceof ZodError) {
    const msg = err.issues[0]?.message ?? '요청 입력값 검증에 실패했습니다.';
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: msg,
      internalMessage: msg,
      details: err.issues,
    };
  }

  // [분기 설명 3] express.json() 파서가 문법이 깨진 JSON 본문을 받았을 때 던지는 SyntaxError(status: 400)는
  // 500 서버 장애가 아닌 클라이언트 입력 오류(400 VALIDATION_ERROR)로 정확히 분류합니다.
  if (
    err instanceof SyntaxError &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: unknown }).status === 400
  ) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '유효하지 않은 JSON 요청 본문 형식입니다.',
      internalMessage: err.message,
    };
  }

  // [분기 설명 4] 의도되지 않은 일반 Error 인스턴스(DB 내부 오류 등)는 [SEC-03] 민감 정보 노출 차단을 위해
  // 외부 응답 message는 고정 한글 문구로 마스킹하고 원본 메시지는 internalMessage에만 보존합니다.
  if (err instanceof Error) {
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      internalMessage: err.message || '서버 내부 오류가 발생했습니다.',
    };
  }

  // [분기 설명 5] throw '문자열'이나 객체 등 Error 인스턴스가 아닌 비표준 예외가 던져져도
  // 크래시 없이 외부 응답은 마스킹하고 internalMessage에 원문을 안전하게 기록합니다.
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: '서버 내부 오류가 발생했습니다.',
    internalMessage:
      typeof err === 'string' && err.trim() ? err : '알 수 없는 비표준 서버 예외가 발생했습니다.',
  };
}

/**
 * 등록되지 않은 API 경로 요청에 대해 표준 404 NOT_FOUND 봉투를 반환하는 미들웨어입니다.
 *
 * @param req - Express Request 객체
 * @param _res - Express Response 객체
 * @param next - Express NextFunction
 * @returns void
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `요청하신 API 경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
    }),
  );
};

/**
 * Express 앱 최하단에서 모든 동기·비동기 예외를 포착해 표준 에러 봉투(ApiResponse<never>)로 응답하는 전역 에러 미들웨어입니다.
 *
 * @param err - 전달된 예외 객체
 * @param _req - Express Request 객체
 * @param res - Express Response 객체
 * @param _next - Express NextFunction (4개 인자 시그니처 유지 필수)
 * @returns 표준 에러 봉투 JSON 응답
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next,
) => {
  const normalized = normalizeBackendError(err);

  return res.status(normalized.statusCode).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details !== undefined ? { details: normalized.details } : {}),
    },
  });
};
