/**
 * @file vite-env.d.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vite 클라이언트 실행 환경의 전역 타입 선언 파일입니다.
 *              remote_shared/ui 노출 Props는 ComponentPropsWithoutRef 기반으로 경계 캡슐화되어 있어 별도 @ark-ui/react 타입 Shim 없이 @mf-types만으로 정적 타입 검사를 통과합니다 ([Study 09]).
 */
/// <reference types="vite/client" />
