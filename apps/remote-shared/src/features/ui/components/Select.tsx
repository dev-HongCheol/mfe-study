/**
 * @file Select.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI Select.RootProps를 Omit으로 기본 상속하고 createListCollection·Portal·--mfe-z-dropdown을 캡슐화한 드롭다운 컴포넌트입니다.
 */
import { Portal } from '@ark-ui/react/portal';
import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { clsx } from 'clsx';
import { useMemo } from 'react';
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
 * @description [Select.tsx] ArkSelect.RootProps를 Omit으로 기본 상속하고 단일 문자열 value/onChange 및 options 배열로 편의성을 높인 Props
 */
export interface SelectProps
  extends Omit<
    ArkSelect.RootProps<SelectOptionItem>,
    'collection' | 'value' | 'defaultValue' | 'onValueChange' | 'onChange' | 'children'
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
}

/**
 * 다른 마이크로 앱들이 @ark-ui/react를 직접 설치하지 않고도 포털 드롭다운을 사용할 수 있도록 캡슐화한 Select 컴포넌트입니다.
 *
 * @param props - ArkSelect.RootProps 상속 속성 및 options/value/onChange 편의 속성
 * @returns ArkSelect 조합 엘리먼트
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = '선택하세요',
  ariaLabel,
  label,
  className,
  ...restArkRootProps
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
      onValueChange={(details) => {
        const nextVal = details.value[0];
        // [분기 설명] 유효한 문자열 항목이 선택되었을 때만 상위 onChange 콜백을 호출합니다.
        if (typeof nextVal === 'string') {
          onChange(nextVal);
        }
      }}
      className={clsx('mfe-ui-select-root', className)}
      {...restArkRootProps}
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
