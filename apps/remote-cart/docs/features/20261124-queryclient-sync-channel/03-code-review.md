# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-cart` `Mode A` 자기 에코(Self-Echo) 제거 및 `QueryClient` 단위 동기화 채널 리팩토링 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 (서비스 루트 기준) | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 규모 | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `src/features/cart/model/cart-sync-channel.ts` | `Symbol.for` `WeakMap` 레지스트리, 고유 `sourceId` + Ref-Counting 단일 리스너, `useSyncExternalStore` 훅, `syncCartAfterMutation` 신설 | `NEW` | 신규 1개 파일 | `일치` |
| `src/features/cart/model/cart-sync-channel.test.ts` | 동기화 채널 단위 테스트 신설 | `NEW` | 신규 1개 파일 | `일치` (`EC-01`은 DOM `dispatchEvent` 예외 전파 스펙을 고려해 `mfeEventBus.emit` 스파이 예외 모킹으로 정교화) |
| `src/exposed/CartWidget.tsx` | `<QueryClientProvider key={effectiveSyncMode} client={activeQueryClient}>` 리마운트 적용 | `MOD` | +4 / -1 | `일치` (실전 브라우저 `Mode A → Mode B` 전환 시 `QueryObserver` Split-Brain 보강) |
| `src/features/cart/model/use-cart-queries.ts` | 쿼리 키 `['cart', userId, { apiBaseUrl, simulateDelay }]` 정렬, 사용자 단위 `cancelQueries`, `syncCartAfterMutation` 위임 | `MOD` | 68줄 변경 | `일치` |
| `src/features/cart/ui/CartWidgetView.tsx` | `useState(0)` + `useMfeEvent` 제거 → `useCartSyncChannel` 연동 (`Mode B` 구독 `0회`) | `MOD` | 29줄 변경 | `일치` |
| `src/testing/stubs/remote-shared-utils.ts` | PR #15·#16 최신 `remote-shared/utils` 계약과 1:1 정합화 | `MOD` | 263줄 변경 | `일치` |
| `src/__tests__/CartWidget.integration.test.tsx` | 기존 `TC-05` 쿼리 키 정밀화 + Study 12 8대 회귀 시나리오(3지표 분리 검증) 통합 테스트 추가 | `MOD` | 692줄 변경 | `일치` (`매트릭스 #8` `Mode B` 전환 후 실제 `GET`·화면 갱신 검증 보강) |
| `docs/study/12-mfe-event-self-echo-and-queryclient-sync.md` | `§ 3.5` `Mode A ↔ Mode B` `QueryObserver` Split-Brain 및 `key` 리마운트 원리 추가 | `MOD` | 루트 스터디 문서 | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Event Payload` / `QueryClient`)**:
  - `CartWidgetView`가 주입받은 `activeQueryClient`, 정규화된 `userId: string | null`, `enabled = syncMode === 'mode-a-event'`를 `useCartSyncChannel`에 전달
  - 쓰기 뮤테이션(`[+1]`, `[삭제]`, `[장바구니 비우기]`) 성공 시 `syncCartAfterMutation(activeQueryClient, syncMode, CartUpdatedEventPayload)` 호출
- **내부 핵심 처리 로직**:
  1. **채널 소유 단위 = `QueryClient`**: `Symbol.for('mfe-study.remote-cart.sync-channels')` 전역 `WeakMap<QueryClient, CartSyncChannel>`에서 `QueryClient`당 고유 `sourceId`(`createMfeEventSourceId('remote-cart')`) 1개 발급
  2. **단일 리스너 & 자기 에코 자동 차단**: `subscribeCartSync`가 `users: Map<string, number>` Ref-Counting으로 `QueryClient`당 `mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, ..., { ignoreSourceId: channel.sourceId })`를 최대 1개만 유지하고, `disposed` 멱등 가드로 `<StrictMode>` 이중 마운트·부분 언마운트 방어
  3. **외부 이벤트 수신 동기화**: 타 `sourceId`(또는 구버전 무-`sourceId`) 이벤트 수신 시 `receivedCountByUser` `+1` → `useSyncExternalStore` 구독 위젯 전원 통지 → `queryClient.invalidateQueries({ queryKey: ['cart', payload.userId] })` 1회 실행
  4. **쓰기 뮤테이션 후 동기화**: `Mode A`는 `mfeEventBus.emit(..., { sourceId: channel.sourceId })` 선행(`try/catch` 예외 격리) → `await queryClient.invalidateQueries({ queryKey: ['cart', userId] })` 1회, `Mode B`는 `emit` `0회` + `invalidateQueries` 1회
- **출력 데이터 (`Render` / `Cache State` / `Network`)**:
  - 자기 뮤테이션 시 `receivedEventCount` `0회` 유지 및 실제 `GET /api/cart` 정확히 `1회` 재조회 (중복 호출 완전 제거)
  - 동일 `QueryClient` 공유 위젯 간 `receivedEventCount` 100% 일치 및 `invalidateQueries` 1회 불변식 유지
  - `Mode B`에서는 `mfeEventBus.subscribe` · `emit` 모두 `0회`, 외부 `['cart']` prefix 무효화 100% 하위 호환

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**:
  - 앱 단독: `pnpm --filter @mfe-study/remote-cart test`
  - 루트 전체: `pnpm test`
- **통과 현황**:
  - `remote-cart` 단독: 총 `9`개 파일 / `42`건 중 **`42`건 통과** (`0`건 실패, Unhandled Error `0`건, 소요 시간: `9.26s`)
  - 루트 전체: 총 `43`개 파일 / `148`건 중 **`148`건 통과** (`0`건 실패, 소요 시간: `22.69s`)
- **주요 검증 시나리오 요약**:
  - `[TC-01 ~ TC-08]` Study 12 8대 회귀 시나리오(단일 위젯 자기 뮤테이션, 동일 `QueryClient` 위젯 2개 공유, 독립 `QueryClient` A·B 2개, 부분·완전 언마운트 Ref-Counting, React 19 `<StrictMode>`, 중첩 동기 이벤트, 빠른 연속 뮤테이션 지연 응답 엇갈림, `Mode A ↔ Mode B` 전환) 3지표(`receivedEventCount` / `invalidateQueries` / 실제 `GET /api/cart`) 전원 통과
  - `[EC-01 ~ EC-04]` `emit` 동기 예외 `try/catch` 격리, 멱등 중복 해제 및 타 사용자(`user-2`) 격리, 비인증(`null`) 차단, 스텁 PR #15·#16 계약 정합성 전원 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`pnpm check` — `167`개 파일 검사, 수정 필요 `0`건, `56ms`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (최신 `remote-shared:3004` `@mf-types.zip` 동기화 후 무-Shim `typecheck` 오류 `0`건)
- **프로덕션 번들링 (`rsbuild build`)**: `통과` (`3.83s`, `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip` 정상 생성)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `cart` (`apps/remote-cart`) 및 `.agents/active-scope.json` 범위 외 수정 `0`건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 이벤트 페이로드는 `mfeEventBus`의 `Zod` 스키마(`MFE_EVENT_SCHEMAS`)로 송수신 양단에서 런타임 검증되며, 예약 메타 키(`__mfeSourceId`)는 `Zod strip`으로 핸들러 전달 전 자동 제거됨 (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용 0건 (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 비로그인(`userId: null`) 상태에서 `useCartQuery`(`enabled: false`), `useCartSyncChannel`(구독 `0회`), 뮤테이션 가드 3중 차단이 유지되며, 토큰 등 민감 정보 로그 출력 0건 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `rsbuild.config.ts`의 기존 포트(`3003`)·CORS 정책 유지, 외부 이벤트 리스너 예외는 `try/catch`로 격리 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리, `assetPrefix: 'auto'`, `strictPort: true`, 최신 `remote-shared` `@mf-types.zip` 무-Shim 동기화 검증 완료
- [x] **DOM·스타일 격리 (#05~#06)**: 전역 태그 선택자·색상 `#hex` 하드코딩 `0건` 정적 회귀 테스트 통과
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `QueryClient` 단위 `WeakMap` + `Ref-Counting` + 멱등 클린업으로 좀비 리스너 `0개` 및 `sourceId` / `ignoreSourceId` 자기 에코 차단(`Study 04 #09`) 완료, 언마운트된 `QueryClient`는 `WeakMap`으로 자동 GC
- [x] **단독 테스트·장애 복구 (#11~#14)**: 타 서버 없이 `Vitest` + 최신화된 `remote-shared-utils` 스텁으로 `42건` 단독 통과, `syncCartAfterMutation` `try/catch`로 외부 리스너 장애 격리

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`cart`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `onMutate`에서 사용자 단위 `cancelQueries({ queryKey: ['cart', userId] })` 정밀 취소 + `TanStack Query v5` `invalidateQueries`의 `cancelRefetch: true` 동작을 매트릭스 #7(지연 응답 엇갈림) 통합 테스트로 실증
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `useSyncExternalStore`가 원시 `number` 스냅샷과 `getServerSnapshot: () => 0`을 반환해 불필요한 리렌더링 및 하이드레이션 불일치 방지
- [x] **레이아웃·테마·접근성 (#13~#16)**: 기존 `.cart-*` 스타일·시맨틱 CSS 변수·접근성 속성(`role="alert"`, `aria-label`) 회귀 없이 유지

### 4.2 백엔드 API & SQLite DB 점검 (`api`)
- `N/A (해당 없음)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `cart-sync-channel.ts` → `use-cart-queries.ts` → `CartWidgetView.tsx` 단방향 의존성 유지, 순환 참조 `0건`
- [x] **6대 주석 원칙 (`GEMINI.md` 4조)**: 신규 `cart-sync-channel.ts` 및 수정 파일 전체에 최상단 파일 헤더(`@file`, `@app`, `@exposed`, `@description`), 모든 인터페이스 내부 속성 `/** ... */` 한글 주석, 함수·훅 JSDoc(`@param`, `@returns`), 상수·상태 주석, 분기문 의도(`[분기 설명]`) 주석 누락 없이 작성·동기화 완료

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **`EC-01` DOM `EventTarget.dispatchEvent` 예외 전파 특성 발견** -> 브라우저/jsdom 표준상 `dispatchEvent`는 리스너 내부 `throw`를 호출 측으로 rethrow하지 않고 전역 `Uncaught Exception`으로 보고하므로, `cart-sync-channel.test.ts` `EC-01`을 `vi.spyOn(mfeEventBus, 'emit').mockImplementationOnce(...)`로 정교화하여 `syncCartAfterMutation`의 실제 `try/catch` 격리 분기를 Unhandled Error `0건`으로 정확 검증 완료
2. **통합 테스트 매트릭스 #7 버튼 텍스트 및 TS 제어 흐름 좁힘(`never`) 보정** -> `CartSummaryCard` 실제 라벨(`/장바구니 비우기/i`) 정합화 및 비동기 클로저 해소 콜백을 객체 프로퍼티(`delayedGate.release`)로 감싸 `tsc --noEmit` 통과 완료
3. **로컬 `@mf-types` 최신 동기화 및 스텁 계약 정합화** -> PR #15·#16 이후 구버전이었던 로컬 `@mf-types`를 `remote-shared:3004` 프리뷰 서버에서 재동기화해 무-Shim `typecheck`·`rsbuild build`를 실증하고, 테스트 스텁(`remote-shared-utils.ts`)에서 폐기된 `CSS_ISOLATION_CHANGED` 제거 및 `sourceId`/`ignoreSourceId` 필터링 1:1 동기화 완료
4. **실전 브라우저 `Mode A → Mode B` 전환 시 `[장바구니 비우기]` 화면 미갱신(`QueryObserver` Split-Brain) 발견·해결** -> `TanStack Query v5`의 `useBaseQuery`/`useMutation` 내부 `Observer`가 `React.useState` 초기값으로 최초 `localQueryClient`에 영구 고정되어 `sharedQueryClient`에 쿼리가 미등록되던 원인을 확인하고, `CartWidget.tsx`에 `<QueryClientProvider key={effectiveSyncMode} client={activeQueryClient}>` 적용, `매트릭스 #8` 회귀 테스트(`Red → Green`) 보강 및 `Study 12 § 3.5` 영구 문서화 완료

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **사용자 단위 쿼리 키 정렬 (`['cart', userId, { apiBaseUrl, simulateDelay }]`) 및 `Mode B` 하위 호환**: `remote-cart` 자체의 `cancelQueries`/`invalidateQueries`는 `['cart', userId]`로 사용자 격리를 정밀화하면서도, `remote-products`가 `Mode B`에서 호출하는 `sharedQueryClient.invalidateQueries({ queryKey: ['cart'] })`는 `TanStack Query v5` prefix 매칭으로 100% 하위 호환되도록 검증했습니다.
2. **PR #16 `sourceId` 인프라의 첫 소비자 적용 완결**: `Study 12` 2단계 로드맵의 2차 구현으로 `createMfeEventSourceId('remote-cart')` + `{ sourceId }` / `{ ignoreSourceId }` 패턴을 실전 적용했으며, 다음 단계인 `Step 1.5` 호스트 2종(`host-vite`, `host-rspack`)에서도 동일한 패턴을 일관되게 적용할 수 있습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: `pull-request.template.md` 기반 PR 초안 및 순수 텍스트 커밋 메시지를 보고하고 **PR 생성 승인**을 요청합니다. *(PR 생성 후 즉시 멈추며, 머지 승인 시 5단계-C에서 TODO·서비스 레지스트리 업데이트 후 머지 진행)*
