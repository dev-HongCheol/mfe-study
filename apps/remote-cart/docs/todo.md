# 📋 [remote-cart] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `cart`
- **대상 경로**: `apps/remote-cart` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Rsbuild (Rspack) + React 19 + TypeScript 5.7 + @module-federation/rsbuild-plugin + TanStack Query v5 + Zod + ky + es-toolkit + MSW + Vitest`
- **최종 업데이트**: `2026-11-23`
- **핵심 역할**: 장바구니 목록 조회(`GET /api/cart`), 수량 추가(`POST /api/cart`), 단건·전체 삭제(`DELETE /api/cart/:id`) 기능을 담당하는 **프로젝트 최초의 `Rspack (Rsbuild)` 기반 도메인 원격 마이크로 앱**입니다 (`Port 3003`). `Vite`로 빌드된 `remote_shared`(`Port 3004`)를 이종 번들러 간 Module Federation 2.0(`mf-manifest.json` + `@mf-types.zip`)으로 런타임 소비하면서, 상위 호스트(`host-vite:3000`, `host-rspack:3001`)에 `./CartWidget` 컴포넌트를 노출합니다.
- **노출 모듈 (`exposes`)**:
  - `./CartWidget` (`./src/exposed/CartWidget.tsx`): 장바구니 목록·합계 카드, `Mode A(CustomEvent 수신 재조회)` vs `Mode B(sharedQueryClient 공유 캐시 자동 감지)` 비교 학습, CSS 격리/오염 비교 토글 및 비인증 차단 통합 위젯 (`@mf-types.zip` 원격 타입 생성 포함)
- **소비 모듈 (`remotes`) / 외부 의존성**:
  - `remote_shared` (`http://localhost:3004/mf-manifest.json`): `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils` 런타임 소비 및 `@mf-types` 자동 동기화 (`@ark-ui/react`, `clsx` 직접 설치 0%, 무-Shim 소비)
  - `api-server` (`http://localhost:4000/api`): `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` REST API 연동

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- [-] **[`20261123-cart-widget-sync`](./features/20261123-cart-widget-sync/01-plan-and-design.md)**: [Phase 1 - Step 1.4] 장바구니 원격 앱(`./CartWidget`, `Port 3003`, `Rspack/Rsbuild`), `Mode A vs Mode B` 상태 동기화, CSS 격리/오염 비교 토글 및 단독 실행 쇼케이스 TDD 구축
  - **작업 브랜치**: `cart/feat/cart-widget-sync`
  - **설계 문서**: [01-plan-and-design.md](./features/20261123-cart-widget-sync/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/20261123-cart-widget-sync/02-tdd-spec.md)

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 2 - Step 2.1] 장바구니 전용 라우트(`/cart`) 및 호스트 라우터 동기화**: 단독 실행과 호스트 결합 시 `MemoryHistory` 격리 라우팅 연동
- [ ] **[Phase 3 - Step 3.2] `Rsdoctor` (`@rsdoctor/rspack-plugin`) 번들·공유 의존성 진단 연동**: `Rspack` 공유 싱글톤 및 청크 크기 시각화 대시보드 연결

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- *아직 머지 완료된 작업이 없습니다.*
