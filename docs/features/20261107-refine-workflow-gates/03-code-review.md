# 🔍 [코드 리뷰 및 품질·보안 검증서] 워크플로우 브랜치 선생성 및 PR 생성·머지 분리 게이트 강화 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어와 범용 영문 키워드로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `GEMINI.md` | 1단계 착수 전 브랜치 선생성 및 `5-A / 5-B / 5-C` 분리 | `MOD` | `+7 / -6` | `일치` |
| `docs/study/03-ai-harness-and-tdd-workflow-guide.md` | 5단계 플로우차트 및 `PreToolUse` 차단 규칙 최신화 | `MOD` | `+21 / -18` | `일치` |
| `docs/templates/pull-request.template.md` | PR 생성 직후 멈춤 및 머지 직전 체크리스트 보강 | `MOD` | `+2 / -1` | `일치` |
| `.gitignore` | `.mf/` 진단 캐시 추적 제외 | `MOD` | `+1 / -0` | `일치` |
| `scripts/verify-scope.mjs` | `main`/`master` 브랜치 위 파일 쓰기 원천 차단 추가 | `MOD` | `+34 / -4` | `일치` |
| `scripts/verify-todo-before-merge.mjs` | `gh pr create` + 머지 동시 실행 차단 및 미커밋 상태 머지 차단 | `MOD` | `+73 / -31` | `일치` |
| `scripts/inject-context.mjs` | 1단계 브랜치 선생성 및 5단계 `PR 생성까지만 수행 후 정지` 배너 반영 | `MOD` | `+9 / -9` | `일치` |
| `scripts/__tests__/harness.test.ts` | 신규 차단 시나리오(`EC-04`, `TC-05`, `EC-05`, `EC-06`) TDD 테스트 추가 | `MOD` | `+60 / -8` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터**:
  - `PreToolUse (write_file | edit_file)`: 대상 파일 경로(`targetPath`) 및 현재 Git 브랜치(`currentBranch`).
  - `PreToolUse (run_command)`: 쉘 명령어 문자열(`commandLine`), 미커밋 파일 배열(`uncommittedFiles`), 브랜치 내 커밋 완료된 변경 파일 배열(`committedFiles`).
- **내부 핵심 처리 로직**:
  - `evaluateScopeAccess`: 워크스페이스 내부 경로에 대해 `currentBranch`가 `'main'` 또는 `'master'`이면 스코프/화이트리스트 여부와 무관하게 즉시 `deny` 반환.
  - `evaluateTodoBeforeMerge`: ① `gh pr create`와 `gh pr merge`/`git merge`가 한 명령줄에 공존하면 즉시 `deny` 반환, ② `uncommittedFiles.length > 0`이면 머지 전 미커밋 파일 커밋을 요구하며 `deny` 반환, ③ `committedFiles`에 루트 `todo.md`(및 개별 앱 `docs/todo.md`)가 포함되어 있는지 검증.
- **출력 데이터**:
  - `{ decision: 'allow' }` 또는 `{ decision: 'deny', reason: '...' }` JSON 표준 출력.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm test` (`vitest run`)
- **통과 현황**: 하네스 스위트 총 `9`건 중 `9`건 통과 (전체 워크스페이스 26개 파일 / 49건 전원 통과, `0`건 실패)
- **주요 검증 시나리오 요약**:
  - `[EC-04]` `main` 브랜치에서 `01-plan-and-design.md` 생성 시도 시 `[Branch Gate 차단]`으로 즉시 차단됨을 확인
  - `[TC-02/05]` `currentStep: 5` 주입 배너에 `PR 생성까지만 수행 후 즉시 멈춤` 안내 포함 확인
  - `[EC-05]` `gh pr create ... ; gh pr merge ...` 동시 실행 시도 시 `[PR Gate 차단]`으로 즉시 차단됨을 확인
  - `[EC-06]` `todo.md`를 수정만 하고 커밋하지 않은 상태(`uncommittedFiles` 존재)에서 `gh pr merge` 시도 시 `[Merge Gate 차단]`으로 즉시 차단됨을 확인

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 98 files. No fixes applied.`)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `root` 범위 외(`apps/*`) 수정 0건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: `N/A (루트 하네스 스크립트)`
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `N/A`
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: `execSync` 호출 시 고정된 Git 조회 명령어만 실행하며 외부 입력을 쉘에 결합하지 않아 Command Injection 위험이 없습니다. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `N/A`

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트
- **적용 여부**: `N/A (해당 없음 — Scope: root)`

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트
### 4.1 프론트엔드 & 디자인 시스템 점검
- `N/A (해당 없음 — Scope: root)`

### 4.2 백엔드 API & SQLite DB 점검
- `N/A (해당 없음 — Scope: root)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: Git 서브프로세스 조회 실패 시 안전한 빈 문자열/빈 배열 폴백으로 훅 크래시를 방지했습니다.
- [x] **6대 주석 원칙**: 파일 상단 역할 헤더, JSDoc `@param`/`@returns`, 상수 주석 및 모든 분기문(`if/else`)의 의도(Why) 주석을 빠짐없이 동기화했습니다.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **Module Federation 진단 캐시(`.mf/`) 추적 방지 보강**:
   - `@module-federation/vite` 빌드 시 생성되는 `.mf/diagnostics/latest.json`이 Git에 추적되지 않도록 `.gitignore`에 `.mf/` 항목을 함께 추가했습니다. (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **강화된 3중 게이트 확인**:
   - 이제 ① `main` 브랜치 위에서 파일 쓰기 차단, ② `gh pr create` + `gh pr merge` 동시 실행 차단, ③ 미커밋 `todo.md` 상태에서의 머지 차단이 모두 `PreToolUse` 훅으로 기계적으로 강제됩니다.
   - PR을 확인하신 뒤 머지 여부를 결정해 주시면 감사하겠습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: `gh pr create`로 **PR 생성까지만 수행 후 즉시 정지**하고 승인자 검토 대기
