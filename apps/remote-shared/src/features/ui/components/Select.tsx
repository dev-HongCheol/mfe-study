/**
 * @file Select.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 내부 구현에만 Ark UI Select·Portal·--mfe-z-dropdown을 캡슐화하고 외부 계약은 순수 React 표준 속성으로 노출하는 드롭다운 컴포넌트입니다 ([Study 09]).
 */
import { Portal } from '@ark-ui/react/portal';
import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { clsx } from 'clsx';
import { type ComponentPropsWithoutRef, useMemo } from 'react';
import '../ui-styles.css';

/**
 * @description [Select.tsx] 드롭다운 개별 선택 항목 인터페이스
 */
export interface SelectOptionItem {
  /** 화면에 표시할 항목 텍스트 */
  label: string;

  /** 선택 시 전달될 고유 문자열 값 */
  value: string;

  /** 개별 항목 비활성화 여부 (선택적) */
  disabled?: boolean;
}

/**
 * @description [Select.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 드롭다운 Props
 */
export interface SelectProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'defaultValue' | 'onChange' | 'onSelect' | 'children' | 'dir'
  > {
  /** 선택 가능한 옵션 배열 (내부에서 createListCollection으로 자동 변환) */
  options: SelectOptionItem[];

  /** 현재 선택된 단일 문자열 값 (내부에서 [value] 배열로 자동 매핑) */
  value: string;

  /** 새 항목 선택 시 단일 문자열 값으로 호출되는 편의 콜백 */
  onChange: (value: string) => void;

  /** 값이 선택되지 않았을 때 표시할 안내 문구 (선택적) */
  placeholder?: string;

  /** 스크린 리더 접근성을 위한 필수 레이블 */
  ariaLabel: string;

  /** 상단에 시각적으로 표시할 선택적 라벨 텍스트 */
  label?: string;

  /** 네이티브 폼 제출 시 사용할 hidden select 필드 이름 (선택적) */
  name?: string;

  /** 드롭다운 전체 비활성화 여부 (선택적) */
  disabled?: boolean;

  /** 읽기 전용 여부 (선택적) */
  readOnly?: boolean;

  /** 필수 입력 여부 (선택적) */
  required?: boolean;

  /** 유효성 검사 오류 상태 표시 여부 (선택적) */
  invalid?: boolean;

  /** 항목 선택 후 드롭다운 자동 닫힘 여부 (기본값: true) */
  closeOnSelect?: boolean;

  /** 드롭다운 콘텐츠 최초 열림 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 드롭다운 닫힘 시 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;
}

/**
 * 다른 마이크로 앱들이 Ark UI를 직접 설치하지 않고도 포털 드롭다운을 사용할 수 있도록 경계 캡슐화한 Select 컴포넌트입니다.
 *
 * @param props - 표준 div 속성 및 드롭다운 제어·폼 편의 속성
 * @returns ArkSelect 조합 엘리먼트
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = '선택하세요',
  ariaLabel,
  label,
  name,
  disabled,
  readOnly,
  required,
  invalid,
  closeOnSelect,
  lazyMount,
  unmountOnExit,
  className,
  ...restDivProps
}: SelectProps) {
  /** options 배열이 바뀔 때만 Ark UI ListCollection을 재생성합니다 */
  const collection = useMemo(
    () =>
      createListCollection<SelectOptionItem>({
        items: options,
      }),
    [options],
  );

  return (
    <ArkSelect.Root
      collection={collection}
      value={value ? [value] : []}
      name={name}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      invalid={invalid}
      closeOnSelect={closeOnSelect}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      onValueChange={(details) => {
        const nextVal = details.value[0];
        // [분기 설명] 유효한 문자열 항목이 선택되었을 때만 상위 onChange 콜백을 호출합니다.
        if (typeof nextVal === 'string') {
          onChange(nextVal);
        }
      }}
      className={clsx('mfe-ui-select-root', className)}
      {...restDivProps}
    >
      {label ? <span className="mfe-ui-select-label">{label}</span> : null}

      <ArkSelect.Control>
        <ArkSelect.Trigger aria-label={ariaLabel} className="mfe-ui-select-trigger">
          <ArkSelect.ValueText placeholder={placeholder} />
          <ArkSelect.Indicator aria-hidden="true">▾</ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>

      <Portal>
        <ArkSelect.Positioner className="mfe-ui-select-positioner">
          <ArkSelect.Content className="mfe-ui-select-content">
            {collection.items.map((item) => (
              <ArkSelect.Item key={item.value} item={item} className="mfe-ui-select-item">
                <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
                <ArkSelect.ItemIndicator aria-hidden="true">✓</ArkSelect.ItemIndicator>
              </ArkSelect.Item>
            ))}
          </ArkSelect.Content>
        </ArkSelect.Positioner>
      </Portal>

      <ArkSelect.HiddenSelect />
    </ArkSelect.Root>
  );
}
