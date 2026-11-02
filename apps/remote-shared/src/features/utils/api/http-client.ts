/**
 * @file http-client.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description ky 기반 공통 HTTP 클라이언트 및 백엔드 표준 응답 봉투(ApiResponse<T>) 언래핑 도우미입니다 ([Study 05 #01, #07, #10]).
 */
import ky, { HTTPError, type KyInstance, type ResponsePromise } from 'ky';
import type { ZodType } from 'zod';
import type { ApiResponse } from '../model/contracts.js';
import { type NormalizedError, normalizeError } from '../model/error.js';

/** 백엔드 REST API 기본 Base URL 상수 (Port 4000) */
export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

/**
 * 지정된 Base URL을 바라보는 ky HTTP 클라이언트 인스턴스를 생성합니다.
 *
 * @param baseUrl - 백엔드 API 기본 경로 (기본값: 'http://localhost:4000/api')
 * @returns 설정된 KyInstance 객체
 */
export function createApiClient(baseUrl: string = DEFAULT_API_BASE_URL): KyInstance {
  return ky.create({
    prefixUrl: baseUrl,
    timeout: 10_000,
    retry: 0,
    headers: {
      Accept: 'application/json',
    },
  });
}

/** 기본 백엔드(http://localhost:4000/api)를 바라보는 기본 공유 HTTP 클라이언트 인스턴스 */
export const httpClient: KyInstance = createApiClient(DEFAULT_API_BASE_URL);

/**
 * ky 응답 Promise를 받아 표준 응답 봉투({ success, data, error })를 벗겨내고 선택적으로 Zod 스키마 검증까지 수행합니다.
 *
 * @param responsePromise - httpClient.get(...) 등이 반환한 ResponsePromise
 * @param dataSchema - 응답 data 페이로드를 검증할 선택적 Zod 스키마
 * @returns 검증 및 언래핑된 도메인 데이터 T
 */
export async function unwrapApiResponse<T>(
  responsePromise: ResponsePromise,
  dataSchema?: ZodType<T>,
): Promise<T> {
  try {
    const envelope = await responsePromise.json<ApiResponse<T>>();

    // [분기 설명] HTTP 200이더라도 봉투 내부의 success가 false이거나 data가 비어 있으면 표준 에러로 변환합니다.
    if (!envelope.success || envelope.data === undefined) {
      const normalized: NormalizedError = {
        code: envelope.error?.code ?? 'API_ERROR',
        message: envelope.error?.message ?? '요청 처리에 실패했습니다.',
        originalError: envelope,
      };
      throw normalized;
    }

    // [분기 설명] 호출 측에서 Zod 스키마를 전달한 경우 런타임 응답 데이터 오염 여부를 검증합니다 (Study 05 #10).
    if (dataSchema) {
      const parsed = dataSchema.safeParse(envelope.data);
      if (!parsed.success) {
        const schemaError: NormalizedError = {
          code: 'RESPONSE_SCHEMA_INVALID',
          message: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
          originalError: parsed.error,
        };
        throw schemaError;
      }
      return parsed.data;
    }

    return envelope.data;
  } catch (err) {
    // [분기 설명] ky의 HTTPError(4xx/5xx)인 경우 응답 본문의 표준 에러 봉투를 파싱하여 code와 한글 메시지를 살려냅니다.
    if (err instanceof HTTPError) {
      try {
        const errorBody = (await err.response.json()) as ApiResponse<unknown>;
        const httpNormalized: NormalizedError = {
          code: errorBody.error?.code ?? `HTTP_${err.response.status}`,
          message: errorBody.error?.message ?? err.message,
          status: err.response.status,
          originalError: errorBody,
        };
        throw httpNormalized;
      } catch (innerErr) {
        if (
          typeof innerErr === 'object' &&
          innerErr !== null &&
          'code' in innerErr &&
          'message' in innerErr
        ) {
          throw innerErr;
        }
      }
    }

    throw normalizeError(err);
  }
}
