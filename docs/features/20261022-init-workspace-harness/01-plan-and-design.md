# 📐 [기획 및 설계] 루트 기본 워크스페이스 설정 및 AI 워크플로우 하네스 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261022-init-workspace-harness` |
| **서비스 스코프 (`Scope ID`)** | `root` |
| **작업 브랜치** | `root/chore/init-workspace-harness` (패턴 A) |
| **기술 스택 / 번들러** | `Node.js v22.17.0` + `pnpm workspaces (catalog:)` + `Turborepo` + `Biome` + `Vitest` + `Lefthook` |
| **작성일** | `2026-10-22` |
| **작업 규모 평가** | `적정 (단일 PR)` — 루트 공통 컨피그 및 에이전트 하네스 훅 스크립트 초기 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 본격적인 마이크로 서비스(`api`, `shared`, `products`, `cart`, `host-*`) 구현에 앞서, macOS와 Windows 양쪽 장비에서 줄바꿈(`LF`) 및 포맷팅 충돌 없이 100% 동일하게 동작하는 **루트 워크스페이스 인프라**를 구축합니다.
- 초기 마스터 설계 문서 3종(`02~04`)을 Git 추적에서 제외되는 **`temp/` 폴더로 격리 보관**하여 프로젝트 전반 구축이 완료될 때까지 참조하고, 루트에는 정식 대문 문서인 `README.md`와 AI 프로젝트 헌법인 `GEMINI.md`를 배치합니다.
- 에이전트가 5단계 `TDD` 워크플로우, 물리적 멀티레포 스코프 격리, 단계별 모델(`High` ↔ `Medium`) 전환 안내, 3종 `SQL` 해시 동기화, 머지 직전 `todo.md` 갱신 규칙을 어기지 못하도록 기계적으로 강제하는 **AI 라이프사이클 훅(`.agents/hooks.json` 및 `scripts/*.mjs`)**을 `TDD`로 구현합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **물리적 멀티레포 호환 스코프 격리(`Scope Lock`) 자동화**: 단일 저장소 안에서 작업하더라도 `.agents/active-scope.json`과 `PreToolUse` 훅(`verify-scope.mjs`)을 통해 승인된 서비스 폴더 외 수정을 원천 차단하는 거버넌스 메커니즘을 구축합니다.
- **토큰 최적화 및 데드락 방지형 라이프사이클 훅 설계**: `PreInvocation`에서는 `ephemeralMessage`를 활용해 대화 이력을 오염시키지 않고 현재 스코프와 단계별 모델(`Argon High` ↔ `Argon Medium`) 전환 알림을 주입하며, `Stop` 훅에서는 현재 단계(`currentStep`)를 인식하여 3단계(`Red`) 실패 테스트 작성 시 무한 루프에 빠지지 않도록 제어합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: `N/A` (본 작업이 루트 워크스페이스 및 하네스 최초 구축 정본임)
- **참조 항목(섹션 제목)**: `N/A`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP & `agy-customizations`) — `[공통 필수]`
> 구현 전 `Context7` MCP 및 내장 `agy-customizations` 가이드를 통해 확인한 공식 스펙 및 주의사항입니다.

- **조회 대상 라이브러리**: `Antigravity Lifecycle Hooks (.agents/hooks.json)`, `@biomejs/biome`, `pnpm workspaces (catalog:)`
- **핵심 스펙 및 주의사항**:
  1. **`.agents/hooks.json` 실행 경로 및 입출력 계약**:
     - `hooks.json`에 등록된 명령어 실행 시 작업 디렉토리(`CWD`)가 `.agents/` 폴더로 설정될 수 있으므로, Node.js `v22`의 `import.meta.dirname`을 사용하여 항상 프로젝트 루트 경로를 안전하게 역산하도록 스크립트를 작성해야 합니다.
     - `PreToolUse`와 `PostToolUse`는 반드시 `{ "matcher": "write_file|edit_file", "hooks": [...] }` 그룹 구조를 사용해야 하며, `SessionStart`, `PreInvocation`, `Stop`은 플랫 배열(`[...]`) 구조를 사용합니다.
     - 도구 인자 키 이름은 `write_file`/`edit_file`의 경우 `toolCall.args.Path`, `run_command`의 경우 `toolCall.args.CommandLine`으로 전달됩니다.
  2. **`Biome` (`biome.json`) 최신 설정**:
     - `formatter.lineEnding: "lf"`, `formatter.indentStyle: "space"`, `formatter.indentWidth: 2`를 명시하고, `vcs.useIgnoreFile: true`를 설정해 `.gitignore`(`temp/`, `node_modules/`, `dist/` 등)를 자동으로 존중하게 합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`root`) 내에서 생성·수정·이동될 파일과 역할입니다.

| 구분 (`NEW` / `MOD` / `MOVE`) | 파일 경로 (루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `MOVE` | `temp/02-infra-and-architecture.md`<br>`temp/03-setup-and-convention.md`<br>`temp/04-workflow-and-harness.md` | 루트의 초기 마스터 설계서 3종을 Git 미추적 `temp/` 폴더로 이동하여 전체 구축 완료 시까지 참조 |
| `NEW` | `.gitignore` | `node_modules`, `dist`, `*.db`, `.mf-types`, **`temp/`** 등 Git 추적 제외 규칙 정의 |
| `NEW` | `.gitattributes` | Mac & Windows 간 모든 텍스트 파일 줄바꿈 `LF` 강제 통일 (`* text=auto eol=lf`) |
| `NEW` | `.editorconfig` | 에디터 인코딩(`utf-8`), 줄바꿈(`lf`), 들여쓰기(`2 spaces`) 통일 |
| `NEW` | `package.json` | 루트 워크스페이스 통합 실행·테스트·포맷팅·DB 관리 스크립트 및 `packageManager` 명시 |
| `NEW` | `pnpm-workspace.yaml` | `apps/*` 워크스페이스 선언 및 전사 공통 패키지 버전 고정용 **`catalog:`** 정의 |
| `NEW` | `turbo.json` | `dev`, `build`, `test`, `check` 태스크 파이프라인 정의 |
| `NEW` | `tsconfig.base.json` | 전 서비스 공통 TypeScript 엄격 모드(`strict: true`) 기본 설정 |
| `NEW` | `biome.json` | `Biome` 포맷터(`lf`, `2 spaces`) 및 린터 통합 설정 |
| `NEW` | `lefthook.yml` | Git `pre-commit` 및 `pre-push` 품질·SQL 해시·TDD 검증 훅 설정 |
| `NEW` | `README.md` | 프로젝트 아키텍처 다이어그램, 포트 할당표, 빠른 실행 가이드, `docs/study/` 학습 문서 지도 |
| `NEW` | `GEMINI.md` | AI 에이전트 최상위 프로젝트 헌법 (5단계 TDD, SSOT 항목 참조 원칙, 한국어 가독성, 6대 주석, 3종 SQL) |
| `NEW` | `.agents/active-scope.json` | 현재 승인된 작업 스코프, 브랜치, 피처 폴더, 진행 단계(`currentStep`) 상태 파일 |
| `NEW` | `.agents/hooks.json` | Antigravity 5대 라이프사이클 훅(`SessionStart`, `PreInvocation`, `PreToolUse`, `PostToolUse`, `Stop`) 설정 |
| `NEW` | `scripts/harness-utils.mjs` | 훅 스크립트 공통 유틸리티 (표준 입출력 JSON 파싱, 루트 경로 해석, 스코프 설정 로드) |
| `NEW` | `scripts/inject-context.mjs` | `[SessionStart/PreInvocation]` 루트/앱 `todo.md` 요약 및 단계별 모델(`High`↔`Medium`) 전환 알림 주입 |
| `NEW` | `scripts/verify-scope.mjs` | `[PreToolUse]` `write_file`/`edit_file` 실행 시 활성 스코프 외 타 서비스 폴더 수정 차단 (전역 컨피그 예외 허용) |
| `NEW` | `scripts/verify-todo-before-merge.mjs` | `[PreToolUse]` `run_command`로 머지/푸시 실행 시 무단 `main` 푸시 차단 및 머지 직전 `todo.md` 갱신 검증 |
| `NEW` | `scripts/auto-format.mjs` | `[PostToolUse]` 파일 생성·수정 직후 `Biome` 자동 포맷팅 실행 |
| `NEW` | `scripts/verify-sql-sync.mjs` | `[Stop/Git Hook]` `apps/api-server/sql/` 3종 SQL 파일 SHA-256 해시 일치 및 `node:sqlite` 인메모리 순차 실행 검증 |
| `NEW` | `scripts/verify-stop-gate.mjs` | `[Stop]` 현재 단계(`currentStep`)를 인식하여 4~5단계에서 포맷·SQL 해시·테스트 통과 여부 최종 점검 |
| `NEW` | `scripts/verify-mfe-smoke.mjs` | `[Phase 1 스모크]` 실제 서버 기동 시 `remoteEntry.js` 응답 및 `CORS` 헤더 검증 스크립트 기본 골격 |
| `NEW` | `scripts/__tests__/harness.test.ts` | 하네스 핵심 검증 로직(`verify-scope`, `verify-todo-before-merge`, `verify-sql-sync`, `verify-stop-gate`, `inject-context`) 단위 TDD 테스트 |
| `NEW` | `vitest.config.ts` | 루트 하네스 스크립트 TDD 실행을 위한 `Vitest` 설정 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `JSON` 스키마) — `[공통 필수]`
> 모든 인터페이스와 속성에는 에디터 인텔리센스 표시를 위해 내부 JSDoc(`/** ... */`) 한글 설명 주석을 필수로 작성합니다.

```ts
/**
 * @description .agents/active-scope.json 에 저장되는 현재 작업 스코프 및 워크플로우 단계 상태 인터페이스
 */
export interface ActiveScopeConfig {
  /** 현재 승인된 공식 서비스 스코프 ID ('root' | 'api' | 'shared' | 'products' | 'cart' | 'host-vite' | 'host-rspack') */
  scope: 'root' | 'api' | 'shared' | 'products' | 'cart' | 'host-vite' | 'host-rspack';

  /** 수정이 허용된 대상 서비스 폴더 상대 경로 (예: 'apps/remote-products', 루트 작업 시 '.') */
  path: string;

  /** 현재 작업 중인 Git 브랜치 이름 (패턴 A: '<서비스명>/<작업타입>/<작업내용>') */
  branch: string;

  /** 현재 작업의 기획·TDD·리뷰 문서가 위치한 피처 폴더 경로 (예: 'docs/features/20261022-init-workspace-harness') */
  featureDir: string;

  /**
   * 5단계 TDD 워크플로우 중 현재 진행 중인 단계 번호
   * - 1: 기획·설계서 작성 (Argon High 권장)
   * - 2: TDD 명세서 작성 및 승인 대기 (Argon Medium 전환 권장)
   * - 3: 실패하는 테스트 코드 작성 - Red 단계 (Argon Medium)
   * - 4: 본 코드 및 3종 SQL 구현 - Green 단계 (Argon Medium -> 완료 시 High 전환 권장)
   * - 5: 코드 리뷰(03-code-review.md) 및 PR·머지 단계 (Argon High -> Medium)
   */
  currentStep: 1 | 2 | 3 | 4 | 5;

  /** 코드 구현 없이 설계 문서만 머지하는 루트 공통 설계 전용 브랜치 여부 (기본값: false) */
  isDocsOnly?: boolean;
}

/**
 * @description PreToolUse 훅(verify-scope.mjs, verify-todo-before-merge.mjs)이 반환하는 판정 결과 인터페이스
 */
export interface PreToolUseHookOutput {
  /** 도구 실행 허용 여부 ('allow': 즉시 허용 | 'deny': 즉시 차단 | 'ask': 사용자 확인 요청) */
  decision: 'allow' | 'deny' | 'ask';

  /** 차단(deny) 또는 확인 요청(ask) 시 에이전트와 사용자에게 표시할 상세 한글 사유 */
  reason?: string;
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared`, `products`, `cart`, `host-*` 전용)
- **적용 여부**: `N/A (해당 없음 — 루트 워크스페이스 및 하네스 구축 작업)`

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 단, Step 1.1에서 사용할 verify-sql-sync.mjs 검증 스크립트와 Node.js 22 내장 node:sqlite 인메모리 실행기를 이번 단계에서 미리 구축함)`
