/**
 * @file http-client.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @vitest-environment node
 * @description [TC-04 / EC-03] ky 기반 httpClient의 표준 응답 엔벨로프 언래핑, AbortSignal 취소 및 에러 정규화 테스트입니다.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApiClient, unwrapApiResponse } from './http-client.js';

const server = setupServer(
  http.get('http://localhost:4000/api/health', () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: 'ok',
        dbMode: 'wal',
        foreignKeys: true,
      },
    });
  }),
  http.post('http://localhost:4000/api/cart', () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: '재고가 부족합니다.',
        },
      },
      { status: 400 },
    );
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('httpClient & unwrapApiResponse (TC-04 & EC-03)', () => {
  const client = createApiClient('http://localhost:4000/api');

  it('TC-04: 성공 응답 봉투({ success: true, data })에서 내부 도메인 데이터를 추출하고 Zod 스키마로 검증한다', async () => {
    const healthSchema = z.object({
      status: z.literal('ok'),
      dbMode: z.enum(['wal', 'memory']),
      foreignKeys: z.boolean(),
    });

    const data = await unwrapApiResponse(client.get('health'), healthSchema);
    expect(data).toEqual({
      status: 'ok',
      dbMode: 'wal',
      foreignKeys: true,
    });
  });

  it('TC-04: AbortSignal이 이미 취소된 상태면 네트워크 요청을 즉시 중단한다', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      unwrapApiResponse(client.get('health', { signal: controller.signal })),
    ).rejects.toMatchObject({
      code: 'ABORTED',
    });
  });

  it('EC-03: 백엔드가 HTTP 400 표준 에러 봉투를 반환하면 code와 한글 message를 보존한 NormalizedError를 던진다', async () => {
    await expect(unwrapApiResponse(client.post('cart', { json: {} }))).rejects.toMatchObject({
      code: 'OUT_OF_STOCK',
      message: '재고가 부족합니다.',
      status: 400,
    });
  });
});
