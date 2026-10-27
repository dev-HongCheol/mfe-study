# 🔍 [코드 리뷰 및 품질·보안 검증서] 루트 기본 워크스페이스 설정 및 AI 워크플로우 하네스 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `temp/02~04-*.md` | 초기 마스터 설계서 3종 `temp/` 이동 | `MOVE` | - | `일치` (Git 추적 제외 처리 완료) |
| `.gitignore`, `.gitattributes`, `.editorconfig` | 크로스 플랫폼 줄바꿈(`LF`) 및 추적 제외 | `NEW` | `+68 / -0` | `일치` |
| `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `lefthook.yml`, `vitest.config.ts` | 루트 워크스페이스(`catalog:` 포함) 및 품질 파이프라인 | `NEW` | `+198 / -0` | `일치` (`tsconfig.base.json`에 `.mjs` JSDoc 추론을 위한 `allowJs: true` 보완) |
| `README.md`, `GEMINI.md` | 프로젝트 대문 문서 및 AI 프로젝트 헌법 | `NEW` | `+185 / -0` | `일치` |
| `.agents/active-scope.json`, `.agents/hooks.json` | 활성 스코프 상태 및 5대 라이프사이클 훅 등록 | `NEW` | `+75 / -0` | `일치` |
| `scripts/*.mjs` (8종) | 컨텍스트 주입, 스코프 잠금, 머지 전 TODO 검사, 자동 포맷, 3종 SQL 검증, 종료 게이트, Phase 1 스모크 검증 | `NEW` | `+595 / -0` | `일치` |
| `scripts/__tests__/harness.test.ts` | 하네스 스크립트 단위·통합 TDD 테스트 스위트 | `NEW` | `+202 / -0` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`stdin` JSON / CLI 인자)**: Antigravity 에이전트 훅 엔진이 `stdin`으로 전달하는 `toolCall`(`name`, `args.Path`, `args.CommandLine`), `workspacePaths`, `terminationReason` 및 `.agents/active-scope.json`의 상태 데이터(`scope`, `path`, `currentStep`).
- **내부 핵심 처리 로직**:
  - `verify-scope.mjs`: 워크스페이스 루트 기준 상대 경로를 정규화하여 전역 허용 목록(`Global Whitelist`) 또는 활성 서비스 폴더(`activeScope.path`) 내부인지 대조합니다.
  - `verify-sql-sync.mjs`: `01-schema.sql`, `02-reset-seed.sql`, `03-drop-all.sql`의 `LF` 정규화 SHA-256 해시를 `.sql-hashes.json`과 비교하고, Node.js 22 내장 `node:sqlite`(`DatabaseSync(':memory:')`)에서 `01 -> 02 -> 03 -> 01 -> 02` 순차 멱등성과 `_schema_comments` 등록 여부를 검증합니다.
- **출력 데이터 (`stdout` JSON)**: `PreToolUse`는 `{ decision: 'allow' | 'deny', reason }`, `PreInvocation`은 `{ injectSteps: [{ ephemeralMessage }] }`, `Stop`은 `{ decision: 'allow_stop' | 'continue', reason }`을 반환합니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm test` (`vitest run`)
- **통과 현황**: 총 `6`건 중 `6`건 통과 (`0`건 실패, 소요 시간: `16ms`)
- **주요 검증 시나리오 요약**:
  - `[TC-01 & EC-01]` 활성 스코프(`products`) 내부 및 전역 파일 수정 `allow`, 타 서비스(`apps/remote-cart`) 수정 `deny` 차단 확인
  - `[TC-02]` `currentStep`별(`2단계 -> Argon Medium`, `5단계 -> Argon High`) 모델 전환 안내 배너 및 `todo.md` 주입 확인
  - `[EC-02]` `git merge` 실행 시 `todo.md` 미갱신 차단 및 `root` 스코프 단일 `todo.md` 허용 확인
  - `[TC-03 & EC-03]` 3종 SQL SHA-256 해시 불일치 감지 및 `node:sqlite` 인메모리 순차 실행(`01->02->03->01`) 통과 확인
  - `[TC-04]` `currentStep <= 3`(`Red` 단계)에서 데드락 없이 즉시 종료 허용(`allow_stop`) 확인

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 16 files in 5ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`0 errors`)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `root` 범위 외 개별 마이크로 앱 본 코드 수정 0건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과` (Step 1.1 전 스킵 동작 및 임시 디렉토리 인메모리 SQL 검증 완료)

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] 명령어 주입(Command Injection) 방어 및 안전한 프로세스 실행**: `auto-format.mjs`에서 파일 경로를 쉘 문자열로 결합하지 않고 `execFileSync(process.execPath, [biomeBin, 'check', '--write', absTarget])` 배열 인자 방식을 사용하여 특수문자 경로로 인한 쉘 인젝션을 원천 차단함 (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `N/A (Node.js CLI 하네스 스크립트 작업)`
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: `.gitignore`에 `.env*`, `*.db`, `temp/`를 등록하여 민감 정보나 임시 설계 파일이 원격 저장소에 유출되지 않도록 방어함 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `verify-mfe-smoke.mjs`에서 리모트 및 백엔드 서버의 `Access-Control-Allow-Origin` 헤더 누락 여부를 자동 검증하도록 구현함 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용 (루트 워크스페이스 및 Phase 1 스모크 검증기 범위)`
- [x] **다중 포트 CORS 및 런타임 연결 검증 (#03, #11)**: `Vitest` 로컬 스텁 모킹의 맹점을 보완하기 위해 실제 6개 서버의 매니페스트(`mf-manifest.json`)와 `CORS` 헤더를 검증하는 `scripts/verify-mfe-smoke.mjs`(`pnpm smoke:phase1`)를 구축함.
- [x] **싱글톤 버전 드리프트 방지 (#01, #07)**: `pnpm-workspace.yaml`의 `catalog:`에 `react`, `react-dom`, `@tanstack/react-query`, `@ark-ui/react`, `zod` 버전을 중앙 고정하여 멀티레포 간 버전 불일치를 예방함.

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`, `products`, `cart`, `host-*` 해당 시)
- `N/A (루트 인프라 작업)`

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **SQLite 외래키 활성화 및 3종 SQL 멱등성 검증 (#05)**: `verify-sql-sync.mjs`가 인메모리 DB를 열 때 `PRAGMA foreign_keys = ON;`을 강제 활성화한 상태에서 `01 -> 02 -> 03 -> 01 -> 02` 순차 실행과 `_schema_comments` 메타데이터 존재 여부를 검증하도록 구현함.

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 공통 유틸리티를 `scripts/harness-utils.mjs`로 분리하여 순환 참조 없이 단방향으로만 참조함.
- [x] **6대 주석 원칙 ([`Study 02` §3](../../study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 모든 파일 최상단 헤더(`@file`, `@app`, `@exposed`, `@description`), 함수 JSDoc(`@param`, `@returns`), 상수 설명, 분기문(`if/else`)의 의도(Why) 주석을 빠짐없이 작성함.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **TypeScript(`tsc --noEmit`)에서 `.mjs` 모듈 임포트 시 `TS7016` 에러 발생** -> `tsconfig.base.json`에 `"allowJs": true` 옵션을 추가하여 `.mjs` 파일 내 JSDoc 타입이 `tsc`에서 완벽하게 추론되도록 해결 완료.
2. **Windows(`CRLF`)와 macOS(`LF`) 환경 간 SQL 파일 해시 불일치 가능성** -> `verify-sql-sync.mjs`의 `computeNormalizedSha256` 함수에서 해시 계산 전 `.replace(/\r\n/g, '\n')` 정규화를 수행하도록 방어 로직 적용 완료.

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **Step 0.3 & Step 0.4 통합 확인**: 루트 워크스페이스 설정 파일 10종, `README.md`, `GEMINI.md`, `.agents/hooks.json`, 그리고 `scripts/*.mjs` 8종과 TDD 테스트(`6 passed`)가 모두 구축되었습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고 진행
