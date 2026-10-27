# 📋 [{{SERVICE_NAME}}] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `{{SCOPE_ID}}` (`api` | `shared` | `products` | `cart` | `host-vite` | `host-rspack`)
- **대상 경로**: `apps/{{SERVICE_DIR}}` (루트 작업은 루트 [`todo.md`](../../todo.md)에서 통합 관리)
- **기술 스택**: `{{TECH_STACK}}` (예: `Vite + React 19 + TypeScript` | `Rspack/Rsbuild + React 19` | `Node.js + Express + SQLite`)
- **최종 업데이트**: `YYYY-MM-DD`
- **핵심 역할**: {{SERVICE_ROLE_DESCRIPTION}}
- **노출 모듈 (`exposes`) / API 엔드포인트**: {{EXPOSES_OR_ENDPOINTS}} (해당 없으면 `N/A`)
- **소비 모듈 (`remotes`) / 외부 의존성**: {{REMOTES_OR_DEPENDENCIES}} (해당 없으면 `N/A`)

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- [ ] **[`YYYYMMDD-task-name`](./features/YYYYMMDD-task-name/01-plan-and-design.md)**: {{TASK_SUMMARY}}
  - **작업 브랜치**: `{{SCOPE_ID}}/feat/task-name`
  - **설계 문서**: [01-plan-and-design.md](./features/YYYYMMDD-task-name/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/YYYYMMDD-task-name/02-tdd-spec.md)

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **{{BACKLOG_ITEM_1}}**: {{BACKLOG_DESC_1}}
- [ ] **{{BACKLOG_ITEM_2}}**: {{BACKLOG_DESC_2}}

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- [x] **[`YYYYMMDD-sample-task`](./features/YYYYMMDD-sample-task/01-plan-and-design.md)**: 샘플 초기 세팅 완료 (`YYYY-MM-DD` 머지 완료)
  - **작업 브랜치**: `{{SCOPE_ID}}/chore/sample-task`
  - **설계 문서**: [01-plan-and-design.md](./features/YYYYMMDD-sample-task/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/YYYYMMDD-sample-task/02-tdd-spec.md)
