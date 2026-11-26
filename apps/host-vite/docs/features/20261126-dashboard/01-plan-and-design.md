# 📐 [기획 및 설계] `host-vite` 공통 껍데기 호스트 대시보드 · 장애 격리 · `MfeInspector` 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261126-dashboard` |
| **서비스 스코프 (`Scope ID`)** | `host-vite` (`apps/host-vite`) |
| **작업 브랜치** | `host-vite/feat/dashboard` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + Zod + ky + Vitest + MSW` |
| **작성일** | `2026-11-26` |
| **작업 규모 평가** | `적정 (단일 PR)` — `host-vite` 초기 부트스트랩, 3대 원격 통합 대시보드, 장애 격리 및 `MfeInspector` 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- `Step 1.1 ~ 1.4`에서 독립 구축한 4개 백엔드·리모트 서버(`api-server:4000`, `remote-shared:3004`, `remote-products:3002`, `remote-cart:3003`)를 최초로 한 화면에 결합하는 **`Vite 7` 기반 공통 껍데기 호스트(`Port 3000`)**를 구축합니다.
- 호스트는 도메인 비즈니스 로직(상품 필터, 장바구니 CRUD)을 직접 소유하지 않고, **① 글로벌 인증·테마·동기화 모드·로딩 지연 제어**, **② 리모트별 독립 장애 격리(`RemoteErrorBoundary` + `Suspense`)**, **③ 실시간 MFE 학습 모니터(`MfeInspector`)** 역할에만 집중합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **동종(`Vite` ↔ `Vite`) + 이종(`Vite` ↔ `Rspack`) 3대 리모트 동시 소비**: `remote_shared(3004)`와 `remote_products(3002)`는 `type: 'module'` ESM으로, `remote_cart(3003)`는 `type: 'var'`(`remoteEntry.type: 'global'`)로 동시에 소비하며 React 서브패스 3종(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)을 포함한 6종 싱글톤을 공유합니다.
- **진짜 장애 격리 (`Fault Isolation`) 아키텍처**: 도메인 리모트(`ProductList`, `CartWidget`)는 `main.ts`에서 선행 로드하지 않고 `React.lazy`로 지연 로딩하여 각각의 `<RemoteErrorBoundary>` + `<Suspense>` 안에 격리합니다. `remote-cart(3003)` 서버가 중단되거나 런타임 오류를 던져도 `remote-products(3002)`와 호스트 대시보드는 정상 동작하며 장바구니 영역만 독립 폴백 UI와 `[다시 시도]` 버튼을 표시합니다.
- **`Mode A (CustomEvent)` vs `Mode B (sharedQueryClient)` 실시간 비교 관찰**: `MfeInspector`에서 모드를 즉시 전환하며 `mfeEventBus`의 4대 표준 이벤트 스트림(`sourceId` 발신자 포함)과 `sharedQueryClient.getQueryCache()` 실시간 스냅샷 차이를 한눈에 비교합니다.

### 2.3 루트 공통 설계 정본(SSOT) 및 공통 호스트 아키텍처 가이드 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**:
  - [Phase 1 서비스 간 공통 연동 계약 정본 (`01-plan-and-design.md`)](../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
  - [MFE Study 서비스 레지스트리 정본 (`docs/service-registry.md`)](../../../../docs/service-registry.md)
  - [Study 14. MFE 공통 껍데기 호스트(App Shell) · 장애 격리 · `MfeInspector` 아키텍처 가이드 (`docs/study/14-mfe-host-shell-and-inspector-architecture.md`)](../../../../docs/study/14-mfe-host-shell-and-inspector-architecture.md) *(Vite·Rspack 두 호스트 공통 화면 구조, 5대 내부 모델 사용처, `QueryCache` 스냅샷 원리 및 번들러 설정 비교 정본)*
- **참조 항목(섹션 제목)**:
  - 루트 계약 정본 `§ 5.1.1 표준 API 응답 엔벨로프 계약 (ApiResponse<T> & ApiErrorPayload)`
  - 루트 계약 정본 `§ 5.1.2 데이터베이스 4대 테이블 및 도메인 엔티티 계약` (`UserEntity`, `HostOriginType`)
  - 루트 계약 정본 `§ 5.1.3 REST API 7대 엔드포인트 요청·응답 상세 명세` (`GET /api/users`, `POST /api/auth/login`)
  - 루트 계약 정본 `§ 5.2 마이크로 앱 간 이벤트 버스(mfeEventBus) 및 Zod 페이로드 계약` *(단, `CSS_ISOLATION_CHANGED`는 PR #15에서 폐기되어 표준 4대 이벤트 정본은 `docs/service-registry.md § 4.2` 기준)*
  - 루트 계약 정본 `§ 5.3 원격 공통 모듈(remote-shared, Port 3004) 노출(exposes) 시그니처 계약`
  - 루트 계약 정본 `§ 5.4 도메인 리모트(ProductList, CartWidget) 노출 Props 및 상태 동기화(Mode A vs Mode B) 비교 계약`
  - 루트 계약 정본 `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약`
  - 서비스 레지스트리 `§ 4.2 ~ § 4.3` (`remote_shared` 3대 서브패스, `sourceId` 발신자 식별, 6대 소비 규칙)
  - 서비스 레지스트리 `§ 5.2 ~ § 5.3` (`remote_products/ProductList` 소비 규칙)
  - 서비스 레지스트리 `§ 6.2 ~ § 6.3` (`remote_cart/CartWidget` 소비 규칙 및 React 서브패스 3종 공유)
  - **Study 14 공통 호스트 정본**: `§ 1 역할 경계`, `§ 2 두 호스트 공통 화면 아키텍처 (화면 계층 구조 및 영역 책임)`, `§ 3 호스트 공통 5대 데이터 모델과 사용처·데이터 흐름 매핑 (§ 3.1 ~ § 3.2)`, `§ 4 리모트 장애 격리와 2단 진입점 원칙`, `§ 5 Vite 호스트 vs Rspack 호스트 번들러별 설정 비교`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite`, `@tanstack/react-query` (v5)
- **핵심 스펙 및 주의사항**:
  - **`@module-federation/vite` 이종 번들러 `remotes` 소비 규칙**: 객체 형식 `remotes`에서 `type`을 생략하면 레거시 `'var'` 기본값과 경고가 출력됩니다. `Vite` ESM 리모트(`remote_shared`, `remote_products`)는 반드시 `type: 'module'`을 명시하고, `Rsbuild(Rspack)`의 `remoteEntry.type: 'global'` 리모트(`remote_cart`)는 명시적으로 **`type: 'var'`**과 `entryGlobalName: 'remote_cart'`를 지정해야 이종 번들러 런타임 로딩과 `mf-manifest.json` 해석이 경고 없이 동작합니다.
  - **`@tanstack/react-query` v5 `QueryCache` 구독 스펙**: `sharedQueryClient.getQueryCache().subscribe(listener)`는 캐시 내 쿼리 추가·삭제·상태 갱신·옵저버 변경 시 즉시 알림을 발행하며 클린업 함수를 반환합니다. `getQueryCache().getAll()`과 결합해 `MfeInspector`에서 `Mode B` 캐시 엔트리(`queryKey`, `status`, `fetchStatus`, `dataUpdatedAt`, `observersCount`)를 실시간으로 관찰합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 모든 React 컴포넌트는 `1 컴포넌트 = 1 파일`(`PascalCase.tsx`) 원칙을 준수하고, 비컴포넌트 진입점·API·훅·모델은 `kebab-case.ts`로 분리합니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준 — 루트 파일은 `[루트]` 표기) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `package.json` | `@mfe-study/host-vite` 패키지 정의 (`@ark-ui/react`·`clsx` 미설치, `catalog:` 공유 버전 준수) |
| `NEW` | `tsconfig.json` | `@mf-types/*` 자동 소비 경로 매핑 및 `strict` TypeScript 설정 |
| `NEW` | `vite.config.ts` | `Port 3000` 고정, `remote_shared`/`remote_products`(`module`) + `remote_cart`(`var`) 소비, React 서브패스 포함 6종 싱글톤 공유, `dts.consumeTypes` 설정 |
| `NEW` | `vitest.config.ts` | `jsdom` + 로컬 `remote_shared/*`·`remote_products/*`·`remote_cart/*` 스텁 alias 매핑 |
| `NEW` | `index.html` | 호스트 진입 HTML (`Port 3000 | Vite Host`) |
| `NEW` | `src/vite-env.d.ts` | Vite 클라이언트 타입 참조 전용 (임시 `@ark-ui/react` Shim `0줄`) |
| `NEW` | `src/main.ts` | `remote_shared` 3대 서브패스 선행 프리로드 + `remote_shared` 장애 시 순수 DOM 폴백 렌더링 후 `bootstrap.tsx` 동적 로드 |
| `NEW` | `src/bootstrap.tsx` | `React.StrictMode` + `ThemeProvider` + `App` 마운트 진입점 |
| `NEW` | `src/App.tsx` | 호스트 상태(인증·동기화 모드·지연 시뮬레이션·테마 연동) 오케스트레이션 및 `HostHeader`·`DashboardWorkspace`·`MfeInspector` 조합 |
| `NEW` | `src/features/auth/api/auth-api.ts` | `GET /api/users`, `POST /api/auth/login` `ky` + `Zod` 검증 API 클라이언트 |
| `NEW` | `src/features/auth/api/auth-api.test.ts` | 인증 API 조회·로그인·에러 처리 단위 테스트 |
| `NEW` | `src/features/auth/model/auth-schema.ts` | `UserEntity` 및 저장 세션(`HostStoredAuthSession`) `Zod` 스키마·인터페이스 |
| `NEW` | `src/features/auth/model/use-host-auth.ts` | 시드 사용자 조회, `createScopedStorage('host-vite')` 세션 복원·보존, 로그인/비로그인 전환 및 `AUTH_CHANGED` 이벤트 발행 훅 |
| `NEW` | `src/features/dashboard/model/host-preferences.ts` | 호스트 스코프 스토리지(`syncMode`, `simulateDelay` 저장·복원) 및 `host-vite` 발신자 `sourceId` 생성 유틸 |
| `NEW` | `src/features/dashboard/model/host-preferences.test.ts` | 호스트 환경설정 스토리지 `Zod` 파싱·오염 폴백 단위 테스트 |
| `NEW` | `src/features/dashboard/ui/RemoteErrorBoundary.tsx` | 원격 리모트 장애 포착 전용 순수 React `ErrorBoundary` (`remote_shared/ui` 비의존 내장 스타일 + `[다시 시도]` 복구) |
| `NEW` | `src/features/dashboard/ui/RemoteErrorBoundary.test.tsx` | 장애 포착·폴백 UI·`[다시 시도]` 정상 복구 단위 테스트 |
| `NEW` | `src/features/dashboard/ui/RemoteWidgetSlot.tsx` | 개별 리모트용 `RemoteErrorBoundary` + `Suspense` + `Skeleton` + 리마운트 키 관리 슬롯 컴포넌트 |
| `NEW` | `src/features/dashboard/ui/HostHeader.tsx` | 호스트 식별 배지, 사용자 로그인/전환(비로그인 포함), 4종 테마 전환, 1.5초 지연 토글 글로벌 헤더 |
| `NEW` | `src/features/dashboard/ui/HostHeader.test.tsx` | 헤더 사용자 전환·테마 전환·지연 토글 단위 테스트 |
| `NEW` | `src/features/dashboard/ui/DashboardWorkspace.tsx` | `Splitter` 기반 좌측 `ProductList(:3002)` ↔ 우측 `CartWidget(:3003)` 통합 배치 및 개별 리모트 오류 시뮬레이션/복구 영역 |
| `NEW` | `src/features/dashboard/ui/host-dashboard.css` | `.host-*` 프리픽스 전용 스타일 (전역 태그 선택자·`#hex` 하드코딩 0건) |
| `NEW` | `src/features/inspector/model/use-mfe-event-log.ts` | 4대 표준 이벤트(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`) 실시간 구독·로그 누적·비우기 훅 |
| `NEW` | `src/features/inspector/model/use-mfe-event-log.test.ts` | 4대 이벤트 수신·`sourceId` 메타 기록·최대 개수 유지·언마운트 클린업 단위 테스트 |
| `NEW` | `src/features/inspector/model/use-shared-query-cache.ts` | `sharedQueryClient.getQueryCache().subscribe` 기반 실시간 캐시 엔트리 스냅샷 훅 |
| `NEW` | `src/features/inspector/ui/EventLogTab.tsx` | `MfeInspector` 이벤트 스트림 탭 컴포넌트 |
| `NEW` | `src/features/inspector/ui/RuntimeStatusTab.tsx` | `MfeInspector` 연결 리모트·싱글톤·`sharedQueryClient` 캐시 관찰 탭 컴포넌트 |
| `NEW` | `src/features/inspector/ui/MfeInspector.tsx` | `Collapsible` + `Tabs` 기반 실시간 학습 모니터 (`Mode A` ↔ `Mode B` 전환 스위치 + 이벤트 로그 + 캐시/리모트 상태) |
| `NEW` | `src/features/inspector/ui/MfeInspector.test.tsx` | 모드 전환·이벤트 스트림·캐시 스냅샷 표시 단위 테스트 |
| `NEW` | `src/testing/setup.ts` | `Vitest` 글로벌 셋업 (`@testing-library/jest-dom`, MSW, 스토리지·캐시 초기화) |
| `NEW` | `src/testing/msw/handlers.ts` | `GET /api/users`, `POST /api/auth/login` MSW 핸들러 및 시드 픽스처 |
| `NEW` | `src/testing/msw/server.ts` | MSW Node 서버 인스턴스 |
| `NEW` | `src/testing/stubs/remote-shared-ui.tsx` | `remote_shared/ui` 로컬 테스트 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-theme.tsx` | `remote_shared/theme` 로컬 테스트 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-utils.ts` | `remote_shared/utils` 최신 계약(PR #15·#16 정본) 로컬 테스트 스텁 |
| `NEW` | `src/testing/stubs/remote-products.tsx` | `remote_products/ProductList` 로컬 테스트 스텁 (전달된 `Props` 검증 및 장애 시뮬레이션 지원) |
| `NEW` | `src/testing/stubs/remote-cart.tsx` | `remote_cart/CartWidget` 로컬 테스트 스텁 (전달된 `Props` 검증 및 장애 시뮬레이션 지원) |
| `NEW` | `src/__tests__/HostDashboard.integration.test.tsx` | 호스트 전체 통합 테스트 (지연 로딩·장애 격리·복구·인증 전환·`Mode A↔B`·`MfeInspector`·정적 아키텍처 회귀 검증) |
| `MOD` | `[루트] vitest.config.ts` | `'apps/host-vite/vitest.config.ts'` 워크스페이스 프로젝트 등록 |
| `MOD` | `[루트] package.json` | `"dev:host-vite"` 단축 실행 스크립트 추가 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> - `UserEntity`, `SyncMode`, `ThemeMode`, 4대 이벤트 페이로드 계약은 루트 정본(`§ 5.1 ~ § 5.4`)과 `remote_shared/utils` 정본을 그대로 사용합니다.
> - 아래 5개 호스트 공통 모델이 **화면의 어느 영역(와이어프레임)에서 어떤 데이터 흐름으로 생성·소비되는지**에 대한 상세 해설은 **[Study 14 § 2 ~ § 3](../../../../docs/study/14-mfe-host-shell-and-inspector-architecture.md)**을 참조합니다.
>   - `HostStoredAuthSession` → `use-host-auth.ts` (`mfe:host-vite:auth-session` 저장·복원) → `HostHeader` & 리모트 `userId` Props
>   - `HostPreferences` → `host-preferences.ts` (`mfe:host-vite:preferences` 저장·복원) → `App` / `HostHeader` / `MfeInspector`
>   - `MfeEventLogEntry` → `use-mfe-event-log.ts` (`useMfeEvent` 4대 구독) → `MfeInspector` / `EventLogTab`
>   - `SharedQueryCacheEntrySnapshot` → `use-shared-query-cache.ts` (`sharedQueryClient.getQueryCache()`) → `MfeInspector` / `RuntimeStatusTab` 하단 캐시 테이블
>   - `RemoteModuleDescriptor` → `RuntimeStatusTab` 상단 연결 리모트 3종(`3004`, `3002`, `3003`) 메타 카드 목록

```ts
/**
 * @description 호스트 localStorage(createScopedStorage('host-vite'))에 저장되는 사용자 인증 세션 인터페이스
 */
export interface HostStoredAuthSession {
  /** 로그인된 사용자 고유 식별자 (예: 'user-1') */
  userId: string;

  /** 화면 표시용 사용자 이름 (예: '홍길동 (VIP)') */
  username: string;

  /** 사용자 권한 등급 ('admin' | 'member') */
  role: 'admin' | 'member';

  /** 백엔드 POST /api/auth/login에서 발급된 테스트 토큰 */
  token: string;
}

/**
 * @description 호스트 localStorage에 저장되는 학습 환경설정 인터페이스
 */
export interface HostPreferences {
  /** 현재 선택된 상태 동기화 학습 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: 'mode-a-event' | 'mode-b-query';

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;
}

/**
 * @description MfeInspector 실시간 이벤트 스트림에 기록되는 단일 이벤트 로그 엔트리 인터페이스
 */
export interface MfeEventLogEntry {
  /** 리스트 렌더링용 고유 식별자 */
  id: string;

  /** 수신된 표준 MFE 이벤트 이름 (예: 'mfe:cart-updated') */
  eventName: string;

  /** 이벤트 발신자 식별자 (sourceId 미포함 레거시 이벤트는 'anonymous') */
  sourceId: string;

  /** 이벤트가 발생한 ISO-8601 시각 문자열 */
  timestamp: string;

  /** 승인자·학습자가 즉시 읽을 수 있는 한글 요약 문자열 */
  summary: string;

  /** 상세 디버깅용 직렬화 페이로드 문자열 */
  rawPayloadJson: string;
}

/**
 * @description MfeInspector 런타임 탭에서 관찰하는 sharedQueryClient 캐시 항목 스냅샷 인터페이스
 */
export interface SharedQueryCacheEntrySnapshot {
  /** 직렬화된 쿼리 키 문자열 (예: '["cart","user-1",...]') */
  queryKeyLabel: string;

  /** 현재 쿼리 상태 ('pending' | 'error' | 'success') */
  status: 'pending' | 'error' | 'success';

  /** 현재 네트워크 페치 상태 ('fetching' | 'paused' | 'idle') */
  fetchStatus: 'fetching' | 'paused' | 'idle';

  /** 해당 쿼리를 구독 중인 활성 옵저버 수 */
  observerCount: number;

  /** 마지막 성공 데이터 갱신 타임스탬프 (ms, 미갱신 시 0) */
  dataUpdatedAt: number;

  /** 캐시가 무효화(invalidated) 상태인지 여부 */
  isInvalidated: boolean;
}

/**
 * @description 호스트가 소비하는 원격 모듈의 메타 정보 인터페이스
 */
export interface RemoteModuleDescriptor {
  /** 원격 모듈 식별 이름 (예: 'remote_cart') */
  remoteName: string;

  /** 화면 표시용 한글 서비스명 */
  label: string;

  /** 원격 개발 서버 포트 번호 */
  port: number;

  /** 공급자 번들러 종류 ('Vite 7 (ESM)' | 'Rsbuild / Rspack (Global)') */
  bundlerLabel: string;

  /** 원격 매니페스트 정본 URL */
  manifestUrl: string;

  /** 소비 중인 노출 경로 목록 */
  consumedPaths: readonly string[];
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`host-vite` 전용)

- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 없음 (호스트 전용 앱)
  - **소비 모듈 (`remotes`)**:
    - `remote_shared`: `{ type: 'module', name: 'remote_shared', entry: 'http://localhost:3004/mf-manifest.json', entryGlobalName: 'remote_shared', shareScope: 'default' }`
    - `remote_products`: `{ type: 'module', name: 'remote_products', entry: 'http://localhost:3002/mf-manifest.json', entryGlobalName: 'remote_products', shareScope: 'default' }`
    - `remote_cart`: `{ type: 'var', name: 'remote_cart', entry: 'http://localhost:3003/mf-manifest.json', entryGlobalName: 'remote_cart', shareScope: 'default' }` *(이종 `Rspack` global 리모트 대응)*
  - **공유 의존성 (`shared` & `singleton`)**: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client` (`^19.1.0`), `@tanstack/react-query` (`^5.74.4`) 6종 모두 `singleton: true` 명시 통일
  - **원격 타입 동기화 (`dts`)**: `consumeTypes: { typesOnBuild: true, abortOnError: false }` + `dev: { disableDynamicRemoteTypeHints: true }` 적용 (수동 `remotes.d.ts` 및 `@ark-ui/react` 임시 Shim `0줄`)
- **2단 진입점 및 장애 격리 마운트 처리**:
  - `src/main.ts`에서는 호스트 껍데기 렌더링에 필요한 `remote_shared/{utils,theme,ui}`만 `Promise.all`로 선행 프리로드한 뒤 `import('./bootstrap')`를 호출합니다. 만약 `remote_shared(3004)`마저 오프라인인 경우에는 백지 화면 대신 순수 DOM 안내 폴백과 새로고침 버튼을 렌더링합니다.
  - 도메인 리모트(`remote_products/ProductList`, `remote_cart/CartWidget`)는 **`React.lazy`로 컴포넌트 레벨에서 지연 로딩**하고, 각 위젯을 독립된 `<RemoteWidgetSlot>`(`<RemoteErrorBoundary>` + `<Suspense fallback={<Skeleton ... />}>`)으로 감싸 한쪽 서버가 다운되거나 예외를 던져도 다른 쪽 리모트와 호스트 헤더·모니터가 100% 정상 유지되도록 격리합니다.
  - `RemoteErrorBoundary` 폴백 UI는 `remote_shared/ui`에 의존하지 않고 순수 React + 자체 안전 폴백 스타일로 작성하며, `[다시 시도]` 클릭 시 에러 상태 초기화 + 리마운트 키 증가로 즉시 재연결을 시도합니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - 호스트 자체 발신자 식별자 `HOST_SOURCE_ID = createMfeEventSourceId('host-vite')`를 생성해 `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED` 이벤트 발행 시 `{ sourceId: HOST_SOURCE_ID }`를 함께 전달합니다.
  - 사용자 전환 시 `POST /api/auth/login` 성공 응답을 `createScopedStorage('host-vite')`에 저장하고 `userId` Props와 `AUTH_CHANGED` 이벤트로 전파합니다. 게스트(비로그인) 선택 시 스토리지 세션을 제거하고 `userId={null}`을 전달해 두 리모트의 비인증 3중 차단이 동시에 동작하는지 확인합니다.
  - `MfeInspector`는 `useMfeEvent`로 표준 4대 이벤트를 구독(언마운트 100% 클린업)하고, `sharedQueryClient.getQueryCache().subscribe`로 `Mode B` 캐시 엔트리 변화를 실시간 관찰합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - `package.json`에 `@ark-ui/react`, `clsx`를 직접 설치하지 않고 `remote_shared/ui`에서만 소비합니다.
  - `host-dashboard.css`의 모든 클래스는 `.host-*` 프리픽스로 통일하고, 전역 태그 선택자 및 `#hex` 색상 하드코딩을 금지(정적 회귀 테스트 검증)합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)

- **적용 여부**: `N/A (해당 없음)`
