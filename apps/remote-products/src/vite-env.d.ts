/**
 * @file vite-env.d.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vite 클라이언트 환경 타입 및 Module Federation 2.0 @mf-types 내 Ark UI 기반 Props 상속을 위한 타입 매핑 정의입니다.
 *              런타임에는 @ark-ui/react를 직접 설치·임포트하지 않고 remote_shared/ui를 통해서만 소비합니다.
 */
/// <reference types="vite/client" />

declare module '@ark-ui/react/factory' {
  import type { ComponentPropsWithoutRef, ElementType } from 'react';

  /**
   * @description @mf-types/remote_shared가 노출하는 HTMLArkProps<T>의 표준 React 엘리먼트 Props 호환 타입
   */
  export type HTMLArkProps<T extends ElementType> = ComponentPropsWithoutRef<T>;
}

declare module '@ark-ui/react/select' {
  import type { ComponentPropsWithoutRef } from 'react';

  export namespace Select {
    /**
     * @description @mf-types/remote_shared의 SelectProps가 Omit으로 상속하는 ArkSelect.RootProps 호환 인터페이스
     */
    export interface RootProps<T = unknown> extends ComponentPropsWithoutRef<'div'> {
      /** 내부 컬렉션 객체 */
      collection?: T;
      /** 현재 선택된 값 배열 */
      value?: string[];
      /** 기본 선택된 값 배열 */
      defaultValue?: string[];
      /** 값 변경 시 호출되는 콜백 */
      onValueChange?: (details: { value: string[]; items: T[] }) => void;
    }
  }
}

declare module '@ark-ui/react/collapsible' {
  import type { ComponentPropsWithoutRef } from 'react';

  export namespace Collapsible {
    /**
     * @description @mf-types/remote_shared의 CollapsibleProps가 상속하는 ArkCollapsible.RootProps 호환 인터페이스
     */
    export interface RootProps extends ComponentPropsWithoutRef<'div'> {
      /** 기본 열림 여부 */
      defaultOpen?: boolean;
      /** 제어형 열림 여부 */
      open?: boolean;
      /** 열림 상태 변경 콜백 */
      onOpenChange?: (details: { open: boolean }) => void;
    }
  }
}

declare module '@ark-ui/react/tabs' {
  import type { ComponentPropsWithoutRef } from 'react';

  export namespace Tabs {
    /**
     * @description @mf-types/remote_shared의 TabsProps가 상속하는 ArkTabs.RootProps 호환 인터페이스
     */
    export interface RootProps extends ComponentPropsWithoutRef<'div'> {
      /** 현재 활성 탭 값 */
      value?: string;
      /** 기본 활성 탭 값 */
      defaultValue?: string;
      /** 탭 변경 콜백 */
      onValueChange?: (details: { value: string }) => void;
    }
  }
}

declare module '@ark-ui/react/splitter' {
  import type { ComponentPropsWithoutRef } from 'react';

  export namespace Splitter {
    /**
     * @description @mf-types/remote_shared의 SplitterProps가 상속하는 ArkSplitter.RootProps 호환 인터페이스
     */
    export interface RootProps extends ComponentPropsWithoutRef<'div'> {
      /** 패널 크기 배열 */
      size?: number[];
      /** 기본 패널 크기 배열 */
      defaultSize?: number[];
    }
  }
}
