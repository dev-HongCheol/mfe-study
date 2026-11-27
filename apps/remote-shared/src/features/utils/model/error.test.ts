/**
 * @file error.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-04, EC-03] normalizeError, extractSchemaIssues 및 DEV/PROD 이원화 formatErrorReport 단위 테스트입니다 ([Study 05 #10, #12]).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as exposedUtils from '../../../exposed/utils';
import {
  type NormalizedError,
  extractSchemaIssues,
  formatErrorReport,
  normalizeError,
} from './error';

describe('normalizeError & 스키마 에러 리포트 (TC-04, EC-03)', () => {
  it('EC-03(기존): Error 인스턴스, 단순 문자열, null, 백엔드 API 에러 봉투를 모두 안전한 NormalizedError로 변환한다', () => {
    const fromError = normalizeError(new Error('일반 에러 발생'));
    expect(fromError.message).toBe('일반 에러 발생');
    expect(fromError.code).toBe('ERROR');

    const fromString = normalizeError('단순 문자열 예외');
    expect(fromString.message).toBe('단순 문자열 예외');
    expect(fromString.code).toBe('STRING_ERROR');

    const fromNull = normalizeError(null);
    expect(fromNull.code).toBe('UNKNOWN_ERROR');
    expect(fromNull.message.length).toBeGreaterThan(0);

    const fromEnvelope = normalizeError({
      success: false,
      error: {
        code: 'OUT_OF_STOCK',
        message: '재고가 부족합니다.',
      },
    });
    expect(fromEnvelope.code).toBe('OUT_OF_STOCK');
    expect(fromEnvelope.message).toBe('재고가 부족합니다.');
  });

  it('TC-04: extractSchemaIssues는 실제 ZodError와 이종 번들러 직렬화 issues 객체 모두에서 필드 좌표를 추출한다', () => {
    const listSchema = z.array(
      z.object({
        id: z.number().int().positive(),
        price: z.number().int().nonnegative(),
        createdAt: z.string().min(1),
      }),
    );

    const parsed = listSchema.safeParse([{ id: -1, price: 'invalid', createdAt: '' }]);
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const fromZodError = extractSchemaIssues(parsed.error);
    expect(fromZodError).toHaveLength(3);
    expect(fromZodError[0]?.path).toBe('[0].id');
    expect(fromZodError[1]?.path).toBe('[0].price');
    expect(fromZodError[2]?.path).toBe('[0].createdAt');

    // 이종 번들러/직렬화 경계를 넘어 instanceof ZodError가 성립하지 않는 평문 객체 덕타이핑 검증
    const serializedLikeError = {
      issues: [
        { path: ['items', 2, 'name'], code: 'invalid_type', message: 'Expected string' },
        { path: [], code: 'custom', message: '루트 스키마 오류' },
      ],
    };
    const fromPlainObject = extractSchemaIssues(serializedLikeError);
    expect(fromPlainObject).toEqual([
      { path: 'items[2].name', code: 'invalid_type', message: 'Expected string' },
      { path: '(root)', code: 'custom', message: '루트 스키마 오류' },
    ]);

    expect(typeof exposedUtils.extractSchemaIssues).toBe('function');
    expect(typeof exposedUtils.formatErrorReport).toBe('function');
  });

  it('TC-04: formatErrorReport는 RESPONSE_SCHEMA_INVALID를 DEV/PROD로 이원화하고 일반 비즈니스 에러는 원문을 유지한다', () => {
    const schema = z.array(z.object({ price: z.number() }));
    const parsed = schema.safeParse([{ price: 'not-a-number' }]);
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const schemaError: NormalizedError = {
      code: 'RESPONSE_SCHEMA_INVALID',
      message: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
      originalError: parsed.error,
    };

    const devReport = formatErrorReport(schemaError, true);
    expect(devReport.code).toBe('RESPONSE_SCHEMA_INVALID');
    expect(devReport.userMessage).toBe('서버 응답 데이터 형식이 계약과 일치하지 않습니다.');
    expect(devReport.devDetails).toHaveLength(1);
    expect(devReport.devDetails[0]?.path).toBe('[0].price');

    const prodReport = formatErrorReport(schemaError, false);
    expect(prodReport.code).toBe('RESPONSE_SCHEMA_INVALID');
    expect(prodReport.userMessage).toBe(
      '일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(prodReport.devDetails).toEqual([]);

    const businessError: NormalizedError = {
      code: 'OUT_OF_STOCK',
      message: '재고가 부족합니다.',
      originalError: { issues: [{ path: ['stock'], code: 'custom', message: 'ignore' }] },
    };

    expect(formatErrorReport(businessError, true)).toEqual({
      code: 'OUT_OF_STOCK',
      userMessage: '재고가 부족합니다.',
      devDetails: [],
    });
    expect(formatErrorReport(businessError, false)).toEqual({
      code: 'OUT_OF_STOCK',
      userMessage: '재고가 부족합니다.',
      devDetails: [],
    });
  });

  it('EC-03: extractSchemaIssues의 최대 개수 제한·비정상 입력 방어 및 formatErrorReport의 Fail-Closed 기본값(false)을 검증한다', () => {
    const manyIssuesError = {
      issues: Array.from({ length: 8 }, (_, idx) => ({
        path: [idx, 'field'],
        code: 'invalid_type',
        message: `오류 ${idx}`,
      })),
    };

    // 기본 최대 5건, 명시 maxIssues 적용, 0 이하/NaN 방어
    expect(extractSchemaIssues(manyIssuesError)).toHaveLength(5);
    expect(extractSchemaIssues(manyIssuesError, 2)).toHaveLength(2);
    expect(extractSchemaIssues(manyIssuesError, 0)).toEqual([]);
    expect(extractSchemaIssues(manyIssuesError, -3)).toEqual([]);
    expect(extractSchemaIssues(manyIssuesError, Number.NaN)).toEqual([]);

    // 비정상 입력 방어
    expect(extractSchemaIssues(null)).toEqual([]);
    expect(extractSchemaIssues(undefined)).toEqual([]);
    expect(extractSchemaIssues(new Error('ordinary'))).toEqual([]);
    expect(extractSchemaIssues({ issues: 'not-an-array' })).toEqual([]);

    // isDev 미전달 시 Fail-Closed(운영 안전 모드) 기본 동작 검증
    const schemaError: NormalizedError = {
      code: 'RESPONSE_SCHEMA_INVALID',
      message: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
      originalError: manyIssuesError,
    };
    const defaultReport = formatErrorReport(schemaError);
    expect(defaultReport.devDetails).toEqual([]);
    expect(defaultReport.userMessage).toBe(
      '일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
  });
});
