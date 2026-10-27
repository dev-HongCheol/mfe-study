# 🧪 [TDD 명세서] {{TASK_TITLE}} (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `{{SCOPE_ID}}` |
| **테스트 러너 및 모킹 도구** | `Vitest` (+ `@testing-library/react`, `MSW` / 백엔드 `Supertest`) |
| **단위 테스트 경로 (`Co-location`)** | `src/**/{{TARGET_NAME}}.test.ts(x)` (소스 파일과 동일 폴더에 근접 배치) |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/{{SCENARIO_NAME}}.integration.test.ts(x)` |
| **테스트 실행 명령어** | `pnpm --filter {{PACKAGE_NAME}} test` |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: {{TEST_CASE_1_TITLE}}
- **사전 조건 (`Given`)**: {{GIVEN_CONDITION}}
- **실행 동작 (`When`)**: {{WHEN_ACTION}}
- **기대 결과 (`Then`)**: {{THEN_EXPECTED_RESULT}}

### TC-02: {{TEST_CASE_2_TITLE}}
- **사전 조건 (`Given`)**: {{GIVEN_CONDITION}}
- **실행 동작 (`When`)**: {{WHEN_ACTION}}
- **기대 결과 (`Then`)**: {{THEN_EXPECTED_RESULT}}

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`
> 네트워크 실패, 잘못된 입력값, 빈 데이터, 리모트 모듈 로드 실패 등 비정상 상황을 검증합니다.

### EC-01: {{EDGE_CASE_1_TITLE}}
- **사전 조건 (`Given`)**: {{GIVEN_CONDITION}}
- **실행 동작 (`When`)**: {{WHEN_ACTION}}
- **기대 결과 및 폴백 동작 (`Then`)**: {{THEN_FALLBACK_OR_ERROR_RESPONSE}}

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - {{REMOTE_STUB_STRATEGY_DESCRIPTION}} (예: `vitest.config.ts` alias를 통한 `remote_shared/*` 로컬 스텁 매핑)
- **네트워크 / API / DB 모킹 (`src/testing/msw/` 또는 인메모리 SQLite + `Supertest`)**:
  - {{MOCK_STRATEGY_DESCRIPTION}}
- **테스트 픽스처 (시드 / 더미 데이터)**:
  - {{FIXTURE_DATA_DESCRIPTION}}

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared`, `products`, `cart`, `host-*` 전용)
> 💡 **안내**: 백엔드(`api`) 또는 루트(`root`) 작업인 경우 `N/A (해당 없음)`으로 표기합니다.

- **적용 여부**: `적용` | `N/A (해당 없음)`
- [ ] **단독 실행(Standalone) 렌더링 검증**: 호스트 없이 단독 엔트리(`bootstrap.tsx`) 마운트 시 화면이 정상 동작하는가?
- [ ] **리모트 장애 격리 검증**: 리모트 서버 오프라인 또는 런타임 에러 발생 시 호스트의 `RemoteErrorBoundary`가 이를 포착해 폴백 UI를 띄우고 다른 영역은 정상 유지되는가?
- [ ] **이벤트 버스 및 쿼리 캐시 연동**: `CustomEvent` 발행/구독 또는 `sharedQueryClient` 캐시 무효화가 정상 동작하는가?
- [ ] **접근성(A11y) 및 역할 검증**: `Ark UI` 헤드리스 컴포넌트의 `role`, `aria-*` 속성이 정상 렌더링되는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
> 💡 **안내**: 프론트엔드 또는 루트 작업인 경우 `N/A (해당 없음)`으로 표기합니다.

- **적용 여부**: `적용` | `N/A (해당 없음)`
- [ ] **3종 SQL 순차 실행 멱등성 검증**: 인메모리/임시 SQLite에서 `03-drop-all.sql` -> `01-schema.sql` -> `02-reset-seed.sql` 순서로 반복 실행 시 에러 없이 초기 시드 상태가 재현되는가?
- [ ] **스키마 주석 메타 테이블 검증**: `_schema_comments` 테이블에 신규/수정된 모든 테이블과 컬럼의 한글 설명이 누락 없이 조회되는가?
- [ ] **SQL 해시 동기화 검증**: `node scripts/verify-sql-sync.mjs` 실행 시 3개 파일의 SHA-256 해시가 일치하는가?

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md` 및 해당 앱의 `docs/todo.md`(`../todo.md`)를 최신 상태로 업데이트했는가?
