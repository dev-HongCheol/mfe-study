/**
 * @file main.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Module Federation 싱글톤 공유 모듈의 eager consumption 에러 및 첫 로드 시 리모트 네임스페이스 미초기화(DeferredRemoteProxy undefined) 경쟁 조건을 방지하기 위한 비동기 진입점입니다 ([Study 04 #01]).
 */

// [분기/방어 설명]
// @module-federation/vite는 정적 Named Import를 DeferredRemoteProxy로 변환하므로,
// 첫 브라우저 접속 시 remote_shared의 서브패스(utils, theme, ui)가 완전히 로드(__mf_remote_pending 완료)된 후
// bootstrap.tsx가 평가되도록 Promise.all로 선행 프리로드를 보장합니다.
void Promise.all([
  import('remote_shared/utils'),
  import('remote_shared/theme'),
  import('remote_shared/ui'),
]).then(() => import('./bootstrap'));
