/**
 * @file Button.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'button'>을 기본 상속하고 로딩 잠금(disabled + aria-busy) 및 시각 변형을 제공하는 공통 버튼 컴포넌트입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import '../ui-styles.css';

/**
 * @description [Button.tsx] ark.button(HTMLArkProps<'button'>)을 기본 상속하고 로딩 잠금 및 시각 변형을 제공하는 버튼 Props
 */
export interface ButtonProps extends HTMLArkProps<'button'> {
  /** 버튼의 시각적 강조 스타일 변형 (기본값: 'primary') */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';

  /** 버튼 패딩 및 폰트 크기 규격 (기본값: 'md') */
  size?: 'sm' | 'md' | 'lg';

  /** 비동기 요청 진행 중 여부 (true일 때 disabled 및 aria-busy 자동 활성화 — Study 05 #01, #15) */
  isLoading?: boolean;

  /** 가로 너비 100% 확장 여부 (기본값: false) */
  fullWidth?: boolean;
}

/**
 * 도메인 지식 0%를 유지하며 모든 마이크로 앱에서 공통으로 사용하는 버튼 컴포넌트입니다.
 *
 * @param props - HTMLArkProps<'button'> 및 시각적 변형·로딩 속성
 * @returns ark.button 엘리먼트
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...restArkProps
}: ButtonProps) {
  /** 로딩 중이거나 명시적으로 비활성화된 경우 버튼 클릭을 물리적으로 차단합니다 */
  const isButtonDisabled = Boolean(disabled || isLoading);

  return (
    <ark.button
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      data-disabled={isButtonDisabled ? '' : undefined}
      className={clsx(
        'mfe-ui-button',
        `mfe-ui-button--${variant}`,
        `mfe-ui-button--${size}`,
        fullWidth && 'mfe-ui-button--full',
        className,
      )}
      {...restArkProps}
    >
      {children}
    </ark.button>
  );
}
