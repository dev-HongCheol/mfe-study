/**
 * @file formatters.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description 원화 정수 반올림 포맷터(formatCurrency) 및 date-fns(ko) 기반 날짜·상대 시간 포맷터입니다 ([Study 05 #04]).
 */
import { format, formatDistance, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/** 한국어 원화 천 단위 콤마 포맷팅을 위한 싱글톤 NumberFormat 인스턴스 */
const krwFormatter = new Intl.NumberFormat('ko-KR');

/**
 * 숫자 금액의 부동소수점 오차를 반올림(Math.round)하여 제거한 뒤 한국어 원화 문자열(예: "129,000원")로 변환합니다.
 *
 * @param amount - 포맷팅할 원화 금액 숫자
 * @returns 천 단위 콤마와 '원'이 붙은 문자열
 */
export function formatCurrency(amount: number): string {
  // [분기 설명] NaN이나 무한대 값이 들어왔을 때 화면에 "NaN원"이 노출되지 않도록 0원으로 안전하게 방어합니다.
  if (!Number.isFinite(amount)) {
    return '0원';
  }

  // [분기 설명] JS에서 -0이 생성될 경우 "-0원"으로 찍히는 현상을 방지하기 위해 +0으로 정규화합니다.
  const rounded = Math.round(amount);
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return `${krwFormatter.format(normalized)}원`;
}

/**
 * 입력된 날짜 문자열 또는 Date 객체를 파싱하여 유효한 Date 인스턴스로 변환합니다.
 *
 * @param dateInput - ISO-8601 문자열, SQLite 로컬 시간 문자열 또는 Date 객체
 * @returns 유효한 Date 객체 또는 파싱 실패 시 null
 */
function parseSafeDate(dateInput: string | Date): Date | null {
  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null;
  }

  const trimmed = String(dateInput || '').trim();
  if (!trimmed) {
    return null;
  }

  // SQLite datetime('now', 'localtime') 형식('YYYY-MM-DD HH:mm:ss')을 ISO 형식으로 보정
  const normalizedStr =
    trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;

  const parsed = parseISO(normalizedStr);
  if (isValid(parsed)) {
    return parsed;
  }

  const fallbackDate = new Date(trimmed);
  return isValid(fallbackDate) ? fallbackDate : null;
}

/**
 * 날짜 문자열을 한국어 표준 일시 형식(기본값: 'yyyy. MM. dd. HH:mm')으로 포맷팅합니다.
 *
 * @param dateStr - 변환할 날짜 문자열
 * @param pattern - date-fns 포맷 패턴 문자열 (기본값: 'yyyy. MM. dd. HH:mm')
 * @returns 포맷팅된 한국어 날짜 문자열 (유효하지 않은 날짜일 경우 '-')
 */
export function formatDate(dateStr: string, pattern = 'yyyy. MM. dd. HH:mm'): string {
  const parsed = parseSafeDate(dateStr);
  // [분기 설명] 잘못된 날짜 문자열로 인해 RangeError가 던져져 컴포넌트가 깨지는 것을 방지합니다.
  if (!parsed) {
    return '-';
  }

  return format(parsed, pattern, { locale: ko });
}

/**
 * 기준 시각 대비 상대 시간(예: "방금 전", "2분 전")을 한국어로 반환합니다.
 *
 * @param dateStr - 대상 날짜 문자열
 * @param baseDate - 비교 기준 시각 (테스트 결정성 보장을 위해 주입 가능, 기본값: 현재 시각)
 * @returns 한국어 상대 시간 문자열 (유효하지 않은 날짜일 경우 '-')
 */
export function formatRelativeTime(dateStr: string, baseDate: Date = new Date()): string {
  const parsed = parseSafeDate(dateStr);
  if (!parsed) {
    return '-';
  }

  const diffMs = Math.abs(baseDate.getTime() - parsed.getTime());
  // [분기 설명] 10초 미만의 아주 짧은 시간 차이는 사용자 친화적으로 '방금 전'으로 표시합니다.
  if (diffMs < 10_000) {
    return '방금 전';
  }

  return formatDistance(parsed, baseDate, {
    addSuffix: true,
    locale: ko,
  });
}
