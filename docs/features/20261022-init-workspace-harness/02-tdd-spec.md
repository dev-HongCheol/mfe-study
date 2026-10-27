# 🧪 [TDD 명세서] 루트 기본 워크스페이스 설정 및 AI 워크플로우 하네스 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `root` |
| **테스트 러너 및 모킹 도구** | `Vitest` (`Node.js v22.17.0` 환경, 내장 `node:sqlite` 연동) |
| **단위 테스트 경로 (`Co-location` / `scripts`)** | `scripts/__tests__/harness.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `scripts/__tests__/sql-sync.integration.test.ts` |
| **테스트 실행 명령어** | `pnpm test` (또는 `npx vitest run`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: 활성 스코프 내부 파일 및 전역 허용 파일(`Global Whitelist`) 수정 허용 검증 (`verify-scope.mjs`)
- **사전 조건 (`Given`)**: `.agents/active-scope.json`의 활성 스코프가 `products`(`path: "apps/remote-products"`)로 설정되어 있을 때
- **실행 동작 (`When`)**: 에이전트가 `apps/remote-products/src/exposed/ProductList.tsx` 또는 전역 허용 파일인 루트 `todo.md`, `docs/study/01-mfe-concepts-and-guide.md`, `biome.json`에 대해 `write_file` / `edit_file`을 호출하면
- **기대 결과 (`Then`)**: `verifyScope` 함수가 `{ decision: 'allow' }`를 반환하여 파일 수정을 정상 허용한다.

### TC-02: 단계별 모델(`Argon High` ↔ `Argon Medium`) 전환 알림 및 `todo.md` 컨텍스트 주입 검증 (`inject-context.mjs`)
- **사전 조건 (`Given`)**: `.agents/active-scope.json`의 `currentStep`이 `2`(TDD 명세 작성 단계) 또는 `5`(코드 리뷰 단계)로 설정되어 있고 루트 `todo.md`가 존재할 때
- **실행 동작 (`When`)**: `PreInvocation` 훅 페이로드로 `buildContextInjection` 함수를 실행하면
- **기대 결과 (`Then`)**: 반환된 `injectSteps` 내 `ephemeralMessage`에 현재 활성 스코프 정보, `todo.md`의 다음 진행 작업 요약, 그리고 `currentStep === 2`일 때는 `Argon Medium` 전환 권장 안내가, `currentStep === 5`일 때는 `Argon High` 전환 권장 안내가 정확히 포함된다.

### TC-03: DB 3종 SQL 파일 SHA-256 해시 일치 및 `node:sqlite` 인메모리 순차 실행 무결성 검증 (`verify-sql-sync.mjs`)
- **사전 조건 (`Given`)**: 임시 테스트 디렉토리에 유효한 `01-schema.sql`(`_schema_comments` 포함), `02-reset-seed.sql`, `03-drop-all.sql` 파일 3종이 존재하고 해시가 `.sql-hashes.json`에 동기화되어 있을 때
- **실행 동작 (`When`)**: `verifySqlSync` 검증 함수를 실행하면
- **기대 결과 (`Then`)**: 3개 파일의 SHA-256 해시 일치 확인 후, Node.js 22 내장 `node:sqlite`(`DatabaseSync(':memory:')`)에서 `01 -> 02 -> 03 -> 01 -> 02` 순차 실행이 에러 없이 통과하고 `{ valid: true }`를 반환한다.

### TC-04: 단계 인식형(`currentStep`) 종료 게이트 동작 검증 (`verify-stop-gate.mjs`)
- **사전 조건 (`Given`)**: `.agents/active-scope.json`의 `currentStep`이 `1`(설계), `2`(TDD 명세), 또는 `3`(`Red` 실패 테스트 단계)일 때
- **실행 동작 (`When`)**: 에이전트가 턴을 종료하여 `Stop` 훅 판정 함수를 호출하면
- **기대 결과 (`Then`)**: 아직 본 코드가 구현되기 전(`Red` 단계 포함)이므로 테스트 실패로 인한 데드락 없이 즉시 종료 허용(`{ decision: 'allow_stop' }`)을 반환한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`
> 스코프 위반, SQL 해시 불일치, `todo.md` 미갱신 머지 시도 등 규칙 위반 상황을 검증합니다.

### EC-01: 활성 스코프 외 타 마이크로 앱 폴더 수정 시도 차단 (`verify-scope.mjs`)
- **사전 조건 (`Given`)**: 활성 스코프가 `products`(`path: "apps/remote-products"`)로 잠겨 있을 때
- **실행 동작 (`When`)**: 에이전트가 `apps/remote-cart/src/exposed/CartWidget.tsx` 또는 `apps/api-server/src/app.ts` 수정을 시도하면
- **기대 결과 및 폴백 동작 (`Then`)**: `{ decision: 'deny' }`와 함께 현재 허용된 스코프(`products`) 외 타 서비스 폴더(`apps/remote-cart`)는 수정할 수 없다는 한글 차단 사유(`reason`)를 반환한다.

### EC-02: `todo.md` 업데이트 누락 상태에서 Git 머지 시도 차단 (`verify-todo-before-merge.mjs`)
- **사전 조건 (`Given`)**: 에이전트가 `run_command`로 `git merge` 명령을 실행하려 하는데, 변경된 파일 목록에 루트 `todo.md`(그리고 마이크로 앱 스코프인 경우 `apps/<서비스>/docs/todo.md`)가 포함되어 있지 않을 때
- **실행 동작 (`When`)**: `verifyTodoBeforeMerge` 함수를 호출하면
- **기대 결과 및 폴백 동작 (`Then`)**: `{ decision: 'deny' }`를 반환하고 머지 직전에 반드시 `todo.md`를 업데이트해야 한다는 안내 메시지를 출력한다. (단, `scope === 'root'`일 때는 루트 `todo.md` 1개만 업데이트되어 있으면 `{ decision: 'allow' }`를 반환한다.)

### EC-03: 3종 SQL 중 일부 파일만 수정되어 해시가 불일치할 때 차단 (`verify-sql-sync.mjs`)
- **사전 조건 (`Given`)**: `01-schema.sql`에 새 컬럼을 추가했으나 `.sql-hashes.json`을 갱신하지 않았거나 `03-drop-all.sql` 문법에 오류가 있을 때
- **실행 동작 (`When`)**: `verifySqlSync` 함수를 호출하면
- **기대 결과 및 폴백 동작 (`Then`)**: `{ valid: false }`와 함께 해시 불일치 또는 인메모리 SQL 실행 실패 원인을 상세히 반환한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `N/A (루트 Node.js 스크립트 테스트)`
- **파일 시스템 및 SQLite 테스트 픽스처 (`os.tmpdir()` & `node:sqlite`)**:
  - 실제 프로젝트 파일을 오염시키지 않도록 `os.tmpdir()` 내에 임시 테스트 폴더와 샘플 3종 SQL 파일을 생성하고, `node:sqlite`의 `new DatabaseSync(':memory:')`를 사용하여 초고속으로 검증합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared`, `products`, `cart`, `host-*` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `적용 (3종 SQL 검증기 verify-sql-sync.mjs 자체에 대한 TDD 검증)`
- [ ] **3종 SQL 순차 실행 멱등성 검증**: 인메모리 SQLite(`:memory:`)에서 `03-drop-all.sql` -> `01-schema.sql` -> `02-reset-seed.sql` 순서로 실행 시 에러 여부를 정확히 판별하는가?
- [ ] **스키마 주석 메타 테이블 검증**: `_schema_comments` 테이블이 누락되었을 때 검증기가 이를 감지해 에러를 반환하는가?
- [ ] **SQL 해시 동기화 검증**: `--update` 플래그 실행 시 3개 파일의 SHA-256 해시가 `.sql-hashes.json`에 정확히 기록되는가?

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`를 최신 상태로 업데이트했는가?
