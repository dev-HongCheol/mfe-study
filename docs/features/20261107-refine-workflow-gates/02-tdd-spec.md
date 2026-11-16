# 🧪 [TDD 명세서] 워크플로우 브랜치 선생성 및 PR 생성·머지 분리 게이트 강화 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `root` |
| **테스트 러너 및 모킹 도구** | `Vitest` (`node` 환경) |
| **단위 테스트 경로 (`Co-location`)** | `scripts/__tests__/harness.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `scripts/__tests__/harness.test.ts` |
| **테스트 실행 명령어** | `pnpm test` (`vitest run`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`

### TC-05: 5단계 컨텍스트 주입 배너에 PR 생성 후 즉시 정지 지침 포함 검증 (`inject-context.mjs`)
- **사전 조건 (`Given`)**: `.agents/active-scope.json`의 `currentStep`이 `5`인 상태
- **실행 동작 (`When`)**: `buildContextInjection({ currentStep: 5 })`를 호출한다.
- **기대 결과 (`Then`)**: 반환된 안내 메시지에 `5단계-B(PR 생성 후 즉시 멈춤)` 및 `PR 생성과 머지를 한 번에 실행하지 말 것`이라는 지침이 명시되어야 한다.

### TC-06: 커밋 완료된 TODO 업데이트 + 깨끗한 워킹 트리 상태에서 단독 머지 명령 허용 (`verify-todo-before-merge.mjs`)
- **사전 조건 (`Given`)**: `committedFiles`에 `todo.md`와 `apps/remote-products/docs/todo.md`가 포함되어 있고, `uncommittedFiles`가 빈 배열(`[]`)인 상태
- **실행 동작 (`When`)**: `evaluateTodoBeforeMerge({ commandLine: 'gh pr merge 7 --merge' })`를 실행한다.
- **기대 결과 (`Then`)**: `{ decision: 'allow' }`를 반환해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-04: `main` 또는 `master` 브랜치 위에서 파일 생성·수정 시 즉시 차단 (`verify-scope.mjs`)
- **사전 조건 (`Given`)**: 현재 체크아웃된 브랜치(`currentBranch`)가 `'main'`인 상태
- **실행 동작 (`When`)**: 에이전트가 전역 허용 문서(`todo.md` 또는 `01-plan-and-design.md`)라도 `evaluateScopeAccess`로 쓰기를 시도한다.
- **기대 결과 및 폴백 동작 (`Then`)**: `{ decision: 'deny' }`를 반환하고 사유(`reason`)에 먼저 작업 브랜치를 생성·전환하라는 안내가 포함되어야 한다.

### EC-05: 한 명령줄에서 `gh pr create`와 `gh pr merge`(`git merge`) 동시 실행 시도 차단 (`verify-todo-before-merge.mjs`)
- **사전 조건 (`Given`)**: `todo.md`가 모두 업데이트되어 있더라도 에이전트가 한 번의 `run_command`에서 PR 생성과 머지를 연속으로 묶어 실행하려는 상황
- **실행 동작 (`When`)**: `evaluateTodoBeforeMerge({ commandLine: 'gh pr create --fill ; gh pr merge --merge' })`를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: `{ decision: 'deny' }`를 반환하고 `"PR 생성과 머지는 한 번에 실행할 수 없습니다"`라는 명확한 차단 사유를 반환해야 한다.

### EC-06: `todo.md` 등을 수정만 하고 아직 커밋하지 않은 상태(`uncommittedFiles` 존재)에서 머지 시도 차단 (`verify-todo-before-merge.mjs`)
- **사전 조건 (`Given`)**: 워킹 트리에 `uncommittedFiles: ['todo.md']`가 커밋되지 않고 남아 있는 상태
- **실행 동작 (`When`)**: `evaluateTodoBeforeMerge({ commandLine: 'gh pr merge 7 --merge' })`를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: `{ decision: 'deny' }`를 반환하고 미커밋 변경사항을 먼저 커밋·푸시한 뒤 머지하라는 안내를 반환해야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A (루트 Node.js 스크립트 테스트)`
- **네트워크 / API / DB 모킹**: 실제 `git` 서브프로세스 의존 없이 순수 함수 파라미터(`currentBranch`, `committedFiles`, `uncommittedFiles`) 주입을 통해 결정론적으로 검증하며, 기본값 경로에서는 `execSync` 폴백이 안전하게 동작하도록 구현합니다.
- **테스트 픽스처**: 임시 디렉토리(`mkdtempSync`) 및 모의 `activeScope` 픽스처 객체 활용

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증
- **적용 여부**: `N/A (해당 없음)`

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [x] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(별도 머지 승인 시)** 실제 머지 직전에 루트 `todo.md`를 최신 상태로 업데이트했는가?
