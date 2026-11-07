# 📐 [기획 및 설계] 워크플로우 브랜치 선생성 및 PR 생성·머지 분리 게이트 강화 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261107-refine-workflow-gates` |
| **서비스 스코프 (`Scope ID`)** | `root` (`.` 루트 워크플로우 문서 및 AI 하네스 훅) |
| **작업 브랜치** | `root/chore/refine-workflow-gates` |
| **기술 스택 / 번들러** | `Node.js 22 (ESM .mjs) + Vitest + Antigravity Lifecycle Hooks` |
| **작성일** | `2026-11-07` |
| **작업 규모 평가** | `적정 (단일 PR)` |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 기존 5단계 TDD 워크플로우 문서(`GEMINI.md`, `Study 03`)와 하네스 스크립트(`inject-context.mjs`, `verify-scope.mjs`, `verify-todo-before-merge.mjs`)에 아래 3가지 구조적 빈틈이 존재하여 에이전트가 반복적으로 절차를 오해하는 문제가 발생했습니다:
  1. **5단계 `PR 생성`과 `머지`의 혼합**: `5단계-B`에 `PR 보고`와 `머지`가 한 항목으로 묶여 있어, 에이전트가 PR 생성 후 멈추지 않고 PR 생성과 머지를 한 번에 승인받거나 연속 실행하려 시도함.
  2. **브랜치 생성 시점의 모순**: `2단계 승인 시 브랜치 생성`으로 기술되어 있어 1단계(`01-plan-and-design.md`)와 2단계(`02-tdd-spec.md`) 문서를 `main` 브랜치 위에서 작성하게 되는 문제 발생.
  3. **미커밋 TODO 상태에서의 머지 허용 허점**: `verify-todo-before-merge.mjs`가 워킹 트리의 미커밋 변경(`git status`)만 있어도 통과시켜서 `todo.md` 커밋·푸시 없이 `gh pr merge`가 실행될 수 있음.
- 이를 문서 개정뿐 아니라 **기계적 `PreToolUse` 하네스 훅 차단 로직**으로 원천 봉쇄합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **AI 하네스 엔지니어링의 핵심 원리 (프롬프트 지침 + 결정론적 코드 게이트 결합)**:
  - 프롬프트(`GEMINI.md`)에만 적힌 규칙은 컨텍스트가 길어질 때 누락될 수 있으나, `PreToolUse` 훅(`verify-scope.mjs`, `verify-todo-before-merge.mjs`)에서 결정론적 조건(`main` 브랜치 파일 쓰기 차단, `gh pr create` + `gh pr merge` 동시 실행 차단, 미커밋 상태 머지 차단)으로 막으면 100% 강제됩니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: `N/A (루트 하네스 자체 개선 작업)`
- **참조 항목(섹션 제목)**: `N/A`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `Vitest v3`, `Node.js 22 child_process / fs`
- **핵심 스펙 및 주의사항**:
  - Antigravity `PreToolUse` 훅은 표준 출력(`stdout`)으로 `{ decision: "allow" }` 또는 `{ decision: "deny", reason: "..." }` JSON을 반환하여 도구 실행을 즉시 차단하고 에이전트에게 교정 사유를 전달합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `MOD` | `GEMINI.md` | 1단계 착수 전 브랜치 선생성 명문화 및 5단계를 `5-A(코드리뷰)` → `5-B(PR 생성 후 즉시 정지)` → `5-C(별도 머지 승인 후 TODO·레지스트리 갱신 및 머지)`로 분리 |
| `MOD` | `docs/study/03-ai-harness-and-tdd-workflow-guide.md` | 5단계 플로우차트(`5-A/5-B/5-C`), 1단계 브랜치 선생성 원칙 및 강화된 `PreToolUse` 훅 동작 원리 반영 |
| `MOD` | `docs/templates/pull-request.template.md` | PR 생성 직후 멈춤 원칙 및 머지 직전 `docs/service-registry.md` 갱신 체크리스트 보완 |
| `MOD` | `.gitignore` | Module Federation 진단 캐시 폴더(`.mf/`) 추적 제외 추가 |
| `MOD` | `scripts/verify-scope.mjs` | `main`/`master` 브랜치 위에서 `write_file`/`edit_file` 시도 시 즉시 `deny` 차단 기능 추가 |
| `MOD` | `scripts/verify-todo-before-merge.mjs` | ① 단일 명령줄 내 `gh pr create` + `gh pr merge`/`git merge` 동시 실행 차단, ② 워킹 트리 미커밋 변경 존재 시 머지 차단, ③ 커밋된 브랜치 diff 기준 `todo.md`·앱 `docs/todo.md` 갱신 검증 |
| `MOD` | `scripts/inject-context.mjs` | 1단계(브랜치 선생성 확인) 및 5단계(`PR 생성 후 즉시 정지, 머지 동시 진행 금지`) 컨텍스트 배너 강화 |
| `MOD` | `scripts/__tests__/harness.test.ts` | 신규 차단 게이트 3종(`main` 브랜치 쓰기 차단, PR 생성·머지 동시 실행 차단, 미커밋 상태 머지 차단) TDD 테스트 추가 |
| `NEW` | `docs/features/20261107-refine-workflow-gates/*` | 본 작업의 기획·설계서(`01`), TDD 명세서(`02`), 코드 리뷰서(`03`) |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`

```ts
/**
 * @description verify-scope.mjs 스코프 및 브랜치 접근 검증 입력 파라미터
 */
export interface EvaluateScopeAccessParams {
  /** 수정하려는 대상 파일 경로 */
  targetPath: string;

  /** 워크스페이스 루트 경로 (선택적) */
  workspaceRoot?: string;

  /** 활성 스코프 메타데이터 (선택적) */
  activeScope?: ActiveScopeConfig;

  /** 현재 체크아웃된 Git 브랜치명 (미지정 시 git rev-parse로 조회, 'main'/'master'일 때 모든 파일 쓰기 차단) */
  currentBranch?: string;
}

/**
 * @description verify-todo-before-merge.mjs 명령 게이트 검증 입력 파라미터
 */
export interface EvaluateTodoBeforeMergeParams {
  /** 실행하려는 쉘 명령줄 문자열 */
  commandLine: string;

  /** 활성 스코프 메타데이터 (선택적) */
  activeScope?: ActiveScopeConfig;

  /** 현재 브랜치에서 main 대비 커밋 완료된 변경 파일 목록 */
  committedFiles?: string[];

  /** 현재 워킹 트리에 아직 커밋되지 않고 남아 있는 파일 목록 (비어 있지 않으면 머지 차단) */
  uncommittedFiles?: string[];
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared`, `products`, `cart`, `host-*` 전용)
- **적용 여부**: `N/A (해당 없음 — Scope: root)`

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — Scope: root)`
