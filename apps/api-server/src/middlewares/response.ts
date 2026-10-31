/**
 * @file response.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 표준 API 응답 봉투(ApiResponse<T>) 생성 헬퍼 및 비즈니스 예외 클래스(AppError)를 제공합니다.
 */
import type { Response } from 'express';
import type { ApiErrorCode, ApiResponse } from '../types/contracts.js';

/**
 * @description AppError 생성자에 전달하는 에러 구성 옵션 인터페이스
 */
export interface AppErrorOptions {
  /** HTTP 응답 상태 코드 (예: 400, 404, 409, 500) */
  statusCode: number;

  /** 머신 판독용 표준 에러 코드 */
  code: ApiErrorCode;

  /** 클라이언트에게 전달할 한글 에러 설명 메시지 */
  message: string;

  /** Zod 검증 이슈 목록 등 선택적 디버깅 세부 정보 */
  details?: unknown;
}

/**
 * 백엔드 도메인 서비스 및 라우터에서 의도된 비즈니스/검증 실패를 던질 때 사용하는 표준 예외 클래스입니다.
 */
export class AppError extends Error {
  /** HTTP 응답 상태 코드 */
  public readonly statusCode: number;

  /** 머신 판독용 표준 에러 코드 */
  public readonly code: ApiErrorCode;

  /** 추가 디버깅 상세 정보 */
  public readonly details?: unknown;

  /**
   * AppError 인스턴스를 생성합니다.
   *
   * @param options - 상태 코드, 에러 코드, 한글 메시지 및 상세 정보
   */
  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

/**
 * 성공한 API 요청의 데이터를 표준 응답 봉투({ success: true, data })로 감싸서 전송합니다.
 *
 * @param res - Express Response 객체
 * @param data - 응답 본문에 담을 도메인 데이터
 * @param statusCode - HTTP 상태 코드 (기본값: 200)
 * @returns 표준 봉투가 전송된 Express Response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}
