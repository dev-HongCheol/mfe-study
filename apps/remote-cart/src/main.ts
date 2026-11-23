/**
 * @file main.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 싱글톤 공유 시 발생하는 eager consumption 에러를 방지하기 위한 비동기 2단 부트스트랩 진입점입니다 ([Study 04 #01]).
 */
void import('./bootstrap');
