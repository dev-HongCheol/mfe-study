# 📋 [remote-products] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `products`
- **대상 경로**: `apps/remote-products` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + React Hook Form + Zod + ky + es-toolkit + MSW + Vitest`
- **최종 업데이트**: `2026-11-07`
- **핵심 역할**: 상품 카탈로그 조회·카테고리/검색어 필터링 및 장바구니 담기(`POST /api/cart`) 기능을 담당하는 도메인 원격 마이크로 앱입니다 (`Port 3002`). `remote_shared`(`Port 3004`)의 디자인 시스템·테마·유틸리티를 런타임 소비하는 동시에 호스트(`host-vite:3000`, `host-rspack:3001`)에 `./ProductList` 컴포넌트를 노출하며, **상태 동기화 아키텍처 비교 학습 모드(`Mode A: 독립 QueryClient + CustomEvent` vs `Mode B: 싱글톤 sharedQueryClient + invalidateQueries`)**를 지원합니다.
- **노출 모듈 (`exposes`)**:
  - `./ProductList` (`./src/exposed/ProductList.tsx`): 상품 카탈로그 그리드, 카테고리/키워드 필터 바, 1.5초 로딩 지연 시뮬레이션 스켈레톤 및 장바구니 담기 통합 컴포넌트 (`@mf-types.zip` 원격 타입 생성 포함)
- **소비 모듈 (`remotes`) / 외부 의존성**:
  - `remote_shared` (`http://localhost:3004/mf-manifest.json`): `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils` 런타임 소비 및 `@mf-types` 자동 동기화 (`@ark-ui/react`, `clsx` 직접 설치 0%)
  - `api-server` (`http://localhost:4000/api`): `GET /api/products`, `POST /api/cart` REST API 연동

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- [-] **[`20261107-catalog-list`](./features/20261107-catalog-list/01-plan-and-design.md)**: [Phase 1 - Step 1.3] 상품 목록 원격 앱(`./ProductList`), `Mode A vs Mode B` 상태 동기화 및 단독 실행 쇼케이스 구축 (`Port 3002`)
  - **작업 브랜치**: `products/feat/catalog-list`
  - **설계 문서**: [01-plan-and-design.md](./features/20261107-catalog-list/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/20261107-catalog-list/02-tdd-spec.md)
  - **코드 리뷰**: [03-code-review.md](./features/20261107-catalog-list/03-code-review.md)

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 2 - Step 2.1] 상품 상세 하위 라우트(`/products/:id`) 및 호스트 라우터 히스토리 동기화**: 단독 실행(`BrowserRouter`)과 호스트 결합(하위/메모리 라우터) 시 `window.history` 충돌 방지 라우팅 구현
- [ ] **[Phase 3 - Step 3.3] 상품 리모트 에러 출처 메타데이터(`moduleMetadata`) 연동**: 분산 마이크로 앱 콜스택 추적 실험 연동

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- *아직 완료된 작업이 없습니다.*
