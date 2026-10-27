# 📐 [기획 및 설계] {{TASK_TITLE}} (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `YYYYMMDD-{{TASK_SLUG}}` (날짜 하이픈 없음) |
| **서비스 스코프 (`Scope ID`)** | `{{SCOPE_ID}}` (`root` \| `api` \| `shared` \| `products` \| `cart` \| `host-vite` \| `host-rspack`) |
| **작업 브랜치** | `{{SCOPE_ID}}/{{BRANCH_TYPE}}/{{TASK_SLUG}}` (패턴 A) |
| **기술 스택 / 번들러** | `{{TECH_STACK}}` (예: `Vite 6 + React 19` / `Rsbuild + Rspack` / `Express + SQLite`) |
| **작성일** | `YYYY-MM-DD` |
| **작업 규모 평가** | `적정 (단일 PR)` \| `분할 권장 (사유 기재)` |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- {{WHY_AND_WHAT_WE_BUILD}}

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- {{LEARNING_POINT_1}}
- {{LEARNING_POINT_2}}

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
> ⚠️ **참조 작성 원칙**: 여러 마이크로 앱 간 연계가 필요한 기능은 루트(`docs/features/YYYYMMDD-<공통설계>/01-plan-and-design.md`)에 먼저 정의된 정본 문서를 참조합니다. **루트 정본이 수정될 때 모든 앱 문서를 다시 고치는 문제를 막기 위해, 루트 문서의 구체적인 본문 내용을 이곳에 복사·재작성하지 말고 반드시 대상 문서 경로와 '항목(섹션 제목)'만 가리키는 형태로 작성합니다.** (작업 중 인터페이스 재협의가 필요하면 현재 앱 브랜치를 홀드하고 `root` 브랜치에서 정본을 먼저 업데이트·머지한 뒤 재개합니다.)

- **참조 정본 문서**: `[{{ROOT_DOC_TITLE}}](../../../../docs/features/{{ROOT_FEATURE_DIR}}/01-plan-and-design.md)` (루트 단독 작업이거나 연계 없는 작업이면 `N/A`)
- **참조 항목(섹션 제목)**:
  - `§ {{SECTION_NUMBER_AND_TITLE_1}}` (예: `§ 5.1 상품 조회 및 장바구니 추가 REST API 계약`)
  - `§ {{SECTION_NUMBER_AND_TITLE_2}}` (예: `§ 5.2 mfe:cart-updated 이벤트 버스 스키마`)

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
> 구현 전 `Context7` MCP를 통해 조회한 최신 라이브러리 버전 및 공식 API 스펙 요약입니다.

- **조회 대상 라이브러리**: `{{LIBRARY_NAMES}}` (예: `@module-federation/vite`, `@ark-ui/react`, `better-sqlite3` 등)
- **핵심 스펙 및 주의사항**:
  - {{CONTEXT7_FINDING_1}}
  - {{CONTEXT7_FINDING_2}}

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`) 내에서 생성·수정·삭제될 파일과 역할입니다.
> - **프론트엔드 표준 경로**: `src/exposed/`(노출 진입점), `src/features/<도메인>/{ui,api,model}/`, `src/testing/{stubs,msw}/`, 단위 테스트 `Co-location`(`*.test.ts(x)`), 통합 테스트 `src/__tests__/`
> - **백엔드 표준 경로**: `src/app.ts`, `src/server.ts`, `src/db/`, `src/modules/<도메인>/`, `src/middlewares/`, `src/__tests__/`

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `src/...` | {{FILE_ROLE_DESCRIPTION}} |
| `MOD` | `package.json` | {{FILE_ROLE_DESCRIPTION}} |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 모든 인터페이스와 속성에는 에디터 인텔리센스 표시를 위해 내부 JSDoc(`/** ... */`) 한글 설명 주석을 필수로 작성하며, 외부 경계(API·이벤트·스토리지·폼) 데이터는 `Zod` 런타임 스키마를 함께 정의합니다.

```ts
/**
 * @description {{INTERFACE_DESCRIPTION}}
 */
export interface SampleContract {
  /** 고유 식별자 */
  id: string;
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared`, `products`, `cart`, `host-*` 전용)
> 💡 **안내**: 백엔드(`api`) 또는 루트(`root`) 작업인 경우 아래 항목을 `N/A (해당 없음)`으로 표기하고 넘어갑니다.

- **적용 여부**: `적용` | `N/A (해당 없음)`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: {{EXPOSES_CONFIG_OR_NONE}}
  - **소비 모듈 (`remotes`)**: {{REMOTES_CONFIG_OR_NONE}}
  - **공유 의존성 (`shared` & `singleton`)**: {{SHARED_CONFIG_OR_NONE}}
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - {{STANDALONE_VS_HOST_MOUNT_DESIGN}}
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - {{EVENT_BUS_OR_QUERY_CLIENT_DESIGN}}
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - {{UI_AND_STYLE_ISOLATION_DESIGN}}

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
> 💡 **안내**: 프론트엔드(`shared`, `products`, `cart`, `host-*`) 또는 루트(`root`) 작업인 경우 아래 항목을 `N/A (해당 없음)`으로 표기하고 넘어갑니다.

- **적용 여부**: `적용` | `N/A (해당 없음)`
- **REST API 엔드포인트 명세**:
  - `{{HTTP_METHOD}} /api/{{ENDPOINT}}`: {{API_DESCRIPTION}}
- **DB 스키마 변경 및 3종 SQL 파일 동기화 계획 (`apps/api-server/sql/`)**:
  1. `01-schema.sql`: {{SCHEMA_CHANGE_AND_INLINE_COMMENTS}} (`_schema_comments` 메타 테이블 한글 설명 등록 포함)
  2. `02-reset-seed.sql`: {{RESET_AND_SEED_DATA_CHANGE}}
  3. `03-drop-all.sql`: {{DROP_TABLE_OR_INDEX_CHANGE}}
- **해시 동기화 검증**: 수정 후 `node scripts/verify-sql-sync.mjs --update` 실행 예정 여부 (`Yes` / `No`)
