/**
 * @file error.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [EC-03] 비표준 예외(문자열, null, API 에러 봉투)를 표준 객체로 변환하는 normalizeError 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import { normalizeError } from './error.js';

describe('normalizeError (EC-03)', () => {
  it('Error 인스턴스, 단순 문자열, null, 백엔드 API 에러 봉투를 모두 안전한 NormalizedError로 변환한다', () => {
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
});
