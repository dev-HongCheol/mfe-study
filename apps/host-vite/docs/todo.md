# 📋 [host-vite] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `host-vite`
- **대상 경로**: `apps/host-vite` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + Zod + ky + MSW + Vitest`
- **최종 업데이트**: `2026-11-26`
- **핵심 역할**: `Vite 7` 기반 공통 껍데기 호스트(App Shell) 애플리케이션입니다 (`Port 3000`). 동종 `Vite` 리모트(`remote-shared:3004`, `remote-products:3002`)와 이종 `Rsbuild(Rspack)` 리모트(`remote-cart:3003`)를 런타임 Module Federation 2.0으로 단일 대시보드에 통합하고, 글로벌 인증·테마·로딩 지연 제어, 개별 `RemoteErrorBoundary` + `Suspense` 장애 격리, 실시간 `MfeInspector`(`Mode A` ↔ `Mode B` 비교 전환·이벤트 스트림·`sharedQueryClient` 캐시 관찰)를 제공합니다.
- **노출 모듈 (`exposes`)**: `N/A` (최상위 호스트 소비자 전용 앱)
- **소비 모듈 (`remotes`) / 외부 의존성**:
  - `remote_shared` (`http://localhost:3004/mf-manifest.json`, `type: 'module'`): `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils` (`@ark-ui/react`, `clsx` 직접 설치 0%, 무-Shim 소비)
  - `remote_products` (`http://localhost:3002/mf-manifest.json`, `type: 'module'`): `remote_products/ProductList` (`React.lazy` 지연 로딩 + 장애 격리)
  - `remote_cart` (`http://localhost:3003/mf-manifest.json`, `type: 'var'`): `remote_cart/CartWidget` (`React.lazy` 지연 로딩 + 이종 `Rspack` 번들러 소비 + 장애 격리)
  - `api-server` (`http://localhost:4000/api`): `GET /api/users`, `POST /api/auth/login` 인증 컨텍스트 연동

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- [ ] **[`20261126-dashboard`](./features/20261126-dashboard/01-plan-and-design.md)**: [Phase 1 - Step 1.5] `Vite 7` 공통 껍데기 호스트(`apps/host-vite:3000`) 통합 대시보드, 장애 격리 및 실시간 `MfeInspector` 구축
  - **작업 브랜치**: `host-vite/feat/dashboard`
  - **설계 문서**: [01-plan-and-design.md](./features/20261126-dashboard/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/20261126-dashboard/02-tdd-spec.md)

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 2 - Step 2.1] 상단 라우팅(`/`, `/products`, `/cart`) 및 리모트 하위 라우터 동기화**: 다중 뷰 전환 및 브라우저 히스토리 연동
- [ ] **[Phase 2 - Step 2.2] 런타임 동적 Remote URL 등록(`registerRemotes`) 실험**: 빌드 타임 하드코딩 없이 매니페스트 URL 동적 주입
- [ ] **[Phase 3 - Step 3.3] 분산 마이크로 앱 에러 출처 자동 추적기 연동**: `RemoteErrorBoundary`에 리모트 출처 메타데이터 로깅 강화

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- *완료된 작업이 아직 없습니다.*
