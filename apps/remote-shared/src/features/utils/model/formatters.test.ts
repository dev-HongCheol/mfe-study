/**
 * @file formatters.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-03 / EC-04] 원화 정수 포맷터(formatCurrency) 및 한국어 날짜·상대 시간 포맷터 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatRelativeTime } from './formatters.js';

describe('formatters (TC-03 & EC-04)', () => {
  it('TC-03: 원화 정수를 천 단위 콤마와 원 단위로 포맷팅하고 날짜와 상대 시간을 한국어로 반환한다', () => {
    expect(formatCurrency(129000)).toBe('129,000원');
    expect(formatCurrency(0)).toBe('0원');

    const dateFormatted = formatDate('2026-11-02T15:30:00.000Z');
    expect(dateFormatted).toContain('2026');

    const now = new Date('2026-11-02T15:32:00.000Z');
    const relative = formatRelativeTime('2026-11-02T15:30:00.000Z', now);
    expect(relative).toContain('2분 전');
  });

  it('EC-04: 부동소수점 오차 금액을 정수로 반올림하고 잘못된 날짜 입력 시 크래시 없이 "-" 폴백을 반환한다', () => {
    expect(formatCurrency(19999.999999)).toBe('20,000원');
    expect(formatCurrency(-0)).toBe('0원');
    expect(formatCurrency(Number.NaN)).toBe('0원');

    expect(formatDate('not-a-valid-date')).toBe('-');
    expect(formatRelativeTime('not-a-valid-date')).toBe('-');
  });
});
