# 전체 프로젝트 진행 현황 및 마스터 TODO (`todo.md`)

> **문서 목적**: 전체 파일을 매번 탐색하지 않고도 현재 프로젝트가 어디까지 진행되었고 다음 작업이 무엇인지 즉시 파악하기 위한 **최우선 참조 문서(전체 마스터 현황판 + 루트 `Scope: root` 할 일 통합 관리)**입니다.
> - **작업 시작 시(1단계)**: `SessionStart` / `PreInvocation` 훅이 이 파일(`todo.md`)과 대상 마이크로 앱의 `apps/<서비스>/docs/todo.md`를 가장 먼저 읽어 에이전트 컨텍스트에 자동 주입합니다.
> - **머지 승인 시(5단계)**: PR 확인 후 사용자가 머지를 승인하면, **실제 머지가 일어나기 직전에** 반드시 이 문서(`todo.md`)와 해당 서비스의 `apps/<서비스>/docs/todo.md`를 업데이트해야 합니다 (`verify-todo-before-merge.mjs` 훅으로 강제).

---

## 📍 현재 진행 상태 요약 (Current Status)

- **현재 단계**: **Phase 1 — 통합 대시보드 뷰 & 핵심 프로세스 구축 단계** (`Phase 0` 사전 아키텍처·문서·하네스 구축 완료)
- **최근 완료 작업**:
  - 영구 학습 문서 폴더 `docs/study/` 신설 및 5종 학습 가이드(`01-mfe-concepts-and-guide.md`, `02-polyrepo-and-architecture-decisions.md`, `03-ai-harness-and-tdd-workflow-guide.md`, `04-mfe-real-world-pitfalls-and-solutions.md`, `05-fullstack-service-real-world-issues.md`) 구축
  - 초기 마스터 설계 문서 3종(`02-infra-and-architecture.md`, `03-setup-and-convention.md`, `04-workflow-and-harness.md`)을 Git 미추적 `temp/` 폴더로 격리 보관
  - `docs/templates/` 표준 문서·코드 리뷰·PR 템플릿 5종(`todo`, `01-plan-and-design`, `02-tdd-spec`, `03-code-review`, `pull-request`) 생성 및 한국어 가독성 원칙 반영
  - **[Phase 0 - Step 0.1 & 0.2]** 각 서비스의 코드·테스트 폴더 아키텍처(`exposed/` + 경량 FSD `features/{ui,api,model}` + 단위 테스트 `Co-location` & `testing/`·`__tests__/`) 및 표준 라이브러리(`TanStack Query + ky`, `React Hook Form + Zod`, `date-fns`, `es-toolkit`, `Ark UI + clsx`, `msw`, `supertest`, Node 22 내장 `node:sqlite`, `pnpm catalog:`) 확정 완료
  - **[Phase 0 - Step 0.3 & 0.4]** 루트 크로스 플랫폼 워크스페이스 설정(`biome.json`, `pnpm-workspace.yaml`, `turbo.json`, `lefthook.yml`, `README.md`, `GEMINI.md`) 및 Antigravity 5대 라이프사이클 훅(`.agents/hooks.json`, `scripts/*.mjs` 8종) TDD 구현 및 최종 리뷰 통과 완료
- **다음 진행 예정 작업 (Next Up)**:
  - **[Phase 1 - Step 1.0] Phase 1 서비스 간 공통 연동 계약(API · EventBus · Shared Exposes · Remote Props) 정본 설계 및 머지** (`Scope: root` | `Branch: root/docs/phase1-service-contracts`)

---

## 📋 전체 단계별 TODO 리스트

상태 표기: `[x]` 완료 | `[-]` 진행 중 | `[ ]` 대기 중

### Phase 0. 사전 아키텍처 설계·라이브러리 선정·하네스 구축 및 최종 문서 리뷰 (`Scope: root`)
> 본격적인 서비스 구현(`Phase 1`)에 들어가기 전에 폴더 아키텍처, 공통 유틸리티 라이브러리, 그리고 기본 AI 워크플로우 하네스(`GEMINI.md`, `hooks.json`)까지 모두 반영한 뒤 **승인자(사용자)의 최종 문서·하네스 전체 리뷰**를 거칩니다.

- [x] `docs/study/01-mfe-concepts-and-guide.md` 작성 및 이동 (MFE 개념, Q1~Q8, 6대 프로세스, 3대 디버깅 툴)
- [x] `docs/study/02-polyrepo-and-architecture-decisions.md` 작성 (물리적 멀티레포 5대 학습 요소, 앱별 `docs/` 응집도, 공통 템플릿 설계 Q&A)
- [x] `docs/study/03-ai-harness-and-tdd-workflow-guide.md` 작성 (전체 5단계 TDD 워크플로우, **단계별 모델(`High`↔`Medium`) 전환 알림**, 하네스 3계층 및 5대 훅 동작 원리, 멀티레포 자동 동기화)
- [x] `docs/study/04-mfe-real-world-pitfalls-and-solutions.md` 작성 (MFE 미경험자는 미리 알 수 없는 **14대 실전 고유 이슈와 해결 아키텍처** 총정리)
- [x] `docs/study/05-fullstack-service-real-world-issues.md` 작성 (풀스택 서비스 구현 **16대 실전 이슈: FE · BE/DB · 공통 모듈 · 디자인** 총정리)
- [x] `docs/study/06-workspace-and-harness-setup-guide.md` 작성 (빈 폴더부터 따라 하는 워크스페이스·패키지 카탈로그·Lefthook·AI 하네스·GitHub CLI 초기 세팅 명령어 A-to-Z 가이드)
- [x] 임시 설계서 3종(`02-infra-and-architecture.md`, `03-setup-and-convention.md`, `04-workflow-and-harness.md`) 작성, **단계별 모델 전환 알림 설계 반영** 및 최신화 *(Step 0.3에서 Git 미추적 `temp/` 폴더로 이동하여 참조 후, 전체 프로젝트 구축 완료 시점에 삭제)*
- [x] `Context7 MCP` 단일 등록 및 기존 미사용 MCP 제거
- [x] `docs/templates/` 공통 표준 문서·코드 리뷰·PR 템플릿 5종(`todo.template.md`, `01-plan-and-design.template.md`, `02-tdd-spec.template.md`, `03-code-review.template.md`, `pull-request.template.md`) 생성 및 한국어 가독성 원칙 반영
- [x] **Step 0.1: 각 서비스의 코드 및 테스트 코드 폴더 아키텍처 조사·선정 (`Context7` 활용)**
  - 프론트엔드(`exposed/` + 경량 FSD 세그먼트 `features/{ui,api,model}` + `testing/{stubs,msw}`), 백엔드(`app.ts`/`server.ts` 분리 + `modules/`), 테스트 코드(`Co-location` 단위 테스트 + `__tests__/` 통합 테스트) 하이브리드 아키텍처 확정 및 문서 반영 완료
- [x] **Step 0.2: 범용·최신 추천 유틸리티 및 보조 라이브러리 조사·선정 및 학습 문서 업데이트**
  - 클라이언트 패칭(`@tanstack/react-query` + `ky`), 폼·스키마 검증(`react-hook-form` + `@hookform/resolvers` + `zod`), 날짜(`date-fns`), 유틸리티(`es-toolkit`), 스타일 병합(`clsx`), TDD 모킹(`msw`, `supertest`), DB(`node:sqlite`), 버전 통제(`pnpm catalog:`) 선정 및 학습 문서 업데이트 완료
- [x] **Step 0.3: 루트 기본 워크스페이스 설정 및 AI 워크플로우 하네스(`GEMINI.md`, `.agents/hooks.json`, `scripts/*.mjs`) 구축** (`Branch: root/chore/init-workspace-harness`)
  - 문서 경로: 루트 `todo.md` 및 `docs/features/20261022-init-workspace-harness/` (`01-plan-and-design.md`, `02-tdd-spec.md`, `03-code-review.md`)
  - `.gitignore`(`temp/` 추적 제외 포함) 생성 및 루트 임시 설계서 3종(`02~04`)을 `temp/` 폴더로 이동 완료
  - `.gitattributes`, `.editorconfig`, `biome.json`, `pnpm-workspace.yaml`(`catalog:` 포함), `turbo.json`, `tsconfig.base.json`, `README.md` 생성 완료
  - 에이전트 하네스(`GEMINI.md`, `.agents/hooks.json`, `.agents/active-scope.json`, `scripts/*.mjs` 8종) 및 Git 훅(`lefthook.yml`) TDD 구축 완료
- [x] **Step 0.4: ★ [필수 승인 게이트] 최종 문서(`docs/study/*`, 템플릿 5종) 및 워크플로우 하네스 전체 리뷰 및 승인**
  - Step 0.1 ~ 0.3의 결과가 모두 반영된 전체 문서와 하네스 최종 리뷰 통과 및 `main` 반영 완료 (`temp/` 폴더 내 초기 설계서는 Git 추적 없이 로컬 참조용으로 유지하며 전체 구축 완료 후 삭제)

---

### Phase 1. 통합 대시보드 뷰 & 핵심 프로세스 구축 (TDD 기반)
> **Step 0.4 최종 리뷰 승인 이후** 순차 진행합니다.
> - **다중 앱 연계 설계 원칙(SSOT)**: 여러 서비스가 연계되는 기능은 **Step 1.0(`Scope: root`)**에서 공통 인터페이스·이벤트·API 계약 설계 문서를 먼저 작성·머지합니다. 이후 각 앱(`Step 1.1 ~ 1.5`)에서는 내용을 중복 작성하지 않고 루트 정본 문서의 **항목(섹션 제목)**만 참조하여 각 앱의 설계 문서를 작성합니다. (앱 작업 중 계약 변경이 필요하면 앱 브랜치를 홀드하고 `root` 브랜치에서 정본을 먼저 업데이트·머지한 뒤 이어서 진행합니다.)

- [ ] **Step 1.0: Phase 1 서비스 간 공통 연동 계약(API · EventBus · Shared Exposes · Remote Props) 정본 설계 및 머지** (`Scope: root` | `Branch: root/docs/phase1-service-contracts`)
  - 문서 경로: `docs/features/YYYYMMDD-phase1-service-contracts/01-plan-and-design.md` (본 코드 구현 없이 설계 문서만 작성 및 머지)
- [ ] **Step 1.1: 백엔드 API 서버 & 내장 SQLite 3종 SQL 구축** (`Scope: api` | `Branch: api/feat/sqlite-and-rest-api`)
  - 문서 경로: `apps/api-server/docs/todo.md` 및 `apps/api-server/docs/features/YYYYMMDD-sqlite-and-rest-api/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - DB 3종 SQL (`01-schema.sql`, `02-reset-seed.sql`, `03-drop-all.sql` + `_schema_comments` + `.sql-hashes.json`) 및 REST API TDD 구현 (`Port 4000`)
- [ ] **Step 1.2: 원격 공통 디자인 시스템 & 유틸리티 구축** (`Scope: shared` | `Branch: shared/feat/ark-ui-and-utils`)
  - 문서 경로: `apps/remote-shared/docs/todo.md` 및 `apps/remote-shared/docs/features/YYYYMMDD-ark-ui-and-utils/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - `Ark UI (@ark-ui/react)` 캡슐화 컴포넌트(`Button`, `Heading(H1~H5)`, `Select`, `Skeleton`, `Badge`), 공통 레이아웃(`Container`, `Grid`, `Flex`, `Stack`, `Card`, `Splitter`, `Tabs`, `Collapsible`), 실시간 테마(`Indigo`/`Emerald`/`Rose`/`Dark`), 공통 유틸리티(`mfeEventBus`, `formatCurrency`, `formatDate`, `httpClient`, `sharedQueryClient`) TDD 구현 및 노출 (`Port 3004` / Vite)
- [ ] **Step 1.3: 상품 목록 원격 앱 구축** (`Scope: products` | `Branch: products/feat/catalog-list`)
  - 문서 경로: `apps/remote-products/docs/todo.md` 및 `apps/remote-products/docs/features/YYYYMMDD-catalog-list/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - `./ProductList` 컴포넌트, 장바구니 담기 **비교 학습 모드(`Mode A: 리모트별 독립 QueryClient + CustomEvent` vs `Mode B: 싱글톤 sharedQueryClient + invalidateQueries`)** 지원, 단독 실행(Standalone) 화면 TDD 구현 (`Port 3002` / Vite)
- [ ] **Step 1.4: 장바구니 원격 앱 구축** (`Scope: cart` | `Branch: cart/feat/cart-widget-sync`)
  - 문서 경로: `apps/remote-cart/docs/todo.md` 및 `apps/remote-cart/docs/features/YYYYMMDD-cart-widget-sync/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - `./CartWidget` 컴포넌트, **비교 학습 모드(`Mode A: CustomEvent 수신 후 자체 QueryClient 재조회` vs `Mode B: sharedQueryClient 캐시 무효화 자동 감지`)**, CSS 스타일 충돌/격리 토글, 단독 실행(Standalone) 화면 TDD 구현 (`Port 3003` / Rspack)
- [ ] **Step 1.5: 공통 껍데기 호스트 2종 구축** (`Scope: host-vite` & `host-rspack` | `Branch: host-vite/feat/dashboard`, `host-rspack/feat/dashboard`)
  - 문서 경로: `apps/host-vite/docs/todo.md`, `apps/host-vite/docs/features/YYYYMMDD-dashboard/` 및 `apps/host-rspack/docs/todo.md`, `apps/host-rspack/docs/features/YYYYMMDD-dashboard/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - 원격 모듈 통합 대시보드, `Suspense` + `Skeleton` (1.5초 지연 시뮬레이션 토글), `RemoteErrorBoundary` 장애 격리, 실시간 MFE 학습 모니터(`MfeInspector` — **`Mode A: CustomEvent` ↔ `Mode B: sharedQueryClient` 비교 관찰 토글** 포함) TDD 구현 (`Port 3000`, `Port 3001`)
- [ ] **Step 1.6: ★ [필수] Phase 1 실제 Module Federation 런타임 연결 스모크 테스트** (`Scope: root` | `Branch: root/test/phase1-mfe-smoke`)
  - 문서 경로: `docs/features/YYYYMMDD-phase1-mfe-smoke/` (`01-plan-and-design.md`, `02-tdd-spec.md`)
  - `Vitest`의 로컬 스텁(`stubs/`) 모킹이 잡아내지 못하는 실제 번들러 런타임 연결(`Host(3000/3001) → remoteEntry.js / mf-manifest.json → Remote(3002/3003) → remote-shared(3004) → 싱글톤 협상 및 실제 렌더링`)이 정상 동작하는지 6개 서버를 실제로 띄워 검증하는 얇은 스모크 테스트(`scripts/verify-mfe-smoke.mjs`) 구축 및 통과 확인

---

### Phase 2. URL 경로(Routing) 전환 및 동적 Remote URL (Phase 1 검토 후 진행)
- [ ] **Step 2.1**: 상단 메뉴(`/`, `/products`, `/products/:id`, `/cart`) 라우팅 연동 및 하위 라우터 동기화
- [ ] **Step 2.2**: 빌드 설정 파일 하드코딩 없이 런타임 동적 URL 등록(`registerRemotes`) 실험

---

### Phase 3. MFE 전문 디버깅 & E2E 테스트 업그레이드
- [ ] **Step 3.1**: `Module Federation DevTools` 매니페스트(`mf-manifest.json`) 연동 확인
- [ ] **Step 3.2**: `Rsdoctor` (`@rsdoctor/rspack-plugin`) 번들 및 공유 의존성 진단 대시보드 연동 (`@rsdoctor/mcp-server` 검토 포함)
- [ ] **Step 3.3**: 분산 마이크로 앱 에러 출처 자동 추적기 (`Sentry` MFE `moduleMetadata` / 콜스택 파서) 구현
- [ ] **Step 3.4**: `Playwright` 멀티 서버 통합 E2E 테스트 구축 (`@playwright/mcp` 검토 포함)

---

### Phase 4. 이종 프레임워크(React Host + Vue Remote) 결합 실험 (선택 진행)
- [ ] **Step 4.1**: `mount(el)` 패턴 기반 Vue 3 원격 마이크로 앱 추가 및 Host 연동 검증
