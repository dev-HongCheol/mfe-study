# 📜 MFE Study AI 프로젝트 헌법 (`GEMINI.md`)

이 문서는 워크스페이스 내 모든 작업에서 AI 에이전트가 예외 없이 준수해야 하는 최상위 프로젝트 헌법입니다.

---

## 1. 언어, 환경 및 커뮤니케이션 대원칙
1. **한국어 전용 및 승인 후 작업 시작**:
   - 모든 설명과 생각(`thought`) 과정은 한국어로 작성합니다.
   - 코드 구현이나 파일 수정 요청 시, 반드시 **작업 계획을 먼저 설명하고 사용자의 진행 승인을 받은 후에만** 실제 작업을 시작합니다.
2. **Windows PowerShell 및 크로스 플랫폼 호환성**:
   - 터미널 명령어 연결 시 `&&` 대신 `;`를 사용하며, OS 종속 쉘 문법 대신 Node.js 스크립트와 PowerShell 호환 명령어를 사용합니다.
   - 모든 파일의 인코딩은 `UTF-8`, 줄바꿈은 `LF`(`\n`)로 통일하며, 마크다운 문서 내부 링크는 OS 드라이브 문자가 없는 **상대 경로(`./`, `../`)**만 사용합니다.
3. **승인자 중심의 한국어 가독성 원칙**:
   - 기획·설계서, TDD 명세서, 코드 리뷰서, TODO, PR 초안은 승인자(사용자)가 가장 읽기 편한 자연스러운 한국어로 작성합니다.
   - 문맥상 한글이 자연스러운 용어(**호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 모킹, 시드 데이터, 폴백** 등)는 한글로 표기하고, 범용 약어 및 코드 식별자(`PR`, `TDD`, `MFE`, `API`, `DB`, `SQL`, `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query`)는 원어 그대로 표기합니다.

---

## 2. 5단계 TDD 워크플로우 및 단계별 모델(`High` ↔ `Medium`) 운영
모든 기능 및 DB 작업은 아래 1~5단계 순서를 엄격히 따르며, 단계 전환 시 사용자에게 모델 전환 알림을 안내합니다.

| 단계 | 핵심 작업 내용 | 권장 모델 | 필수 산출물 및 참조 템플릿/문서 |
| :---: | :--- | :---: | :--- |
| **1단계** | 루트 [`todo.md`](./todo.md) · [`service-registry.md`](./docs/service-registry.md) 및 대상 앱 `docs/todo.md` 확인 · `Context7` 스펙 선조회 · 기획/설계서 작성 | 🔴 **`Argon High`** | [`01-plan-and-design.template.md`](./docs/templates/01-plan-and-design.template.md) 참조 → `01-plan-and-design.md` 작성 후 **🟡 `Argon Medium` 전환 알림** |
| **2단계** | TDD 명세서 작성 · 스코프 선정 및 **사용자 구현 승인 요청** | 🟡 **`Argon Medium`** | [`02-tdd-spec.template.md`](./docs/templates/02-tdd-spec.template.md) 참조 → `02-tdd-spec.md` 작성 → **승인 시 브랜치 생성 및 `.agents/active-scope.json` 잠금** |
| **3단계** | 실패하는 테스트 코드(`Red`) 먼저 작성 (`Vitest`) | 🟡 **`Argon Medium`** | 단위 테스트(`Co-location`) 및 통합 테스트(`__tests__/`) 작성 후 의도된 실패(`Red`) 확인 |
| **4단계** | 본 코드 · 6대 주석 · 3종 SQL 구현 (`Green & Refactor`) | 🟡 **`Argon Medium`** | [`Study 04`](./docs/study/04-mfe-real-world-pitfalls-and-solutions.md) · [`Study 05`](./docs/study/05-fullstack-service-real-world-issues.md) 방어 설계 적용 → 테스트 통과(`Green`) 후 **🔴 `Argon High` 전환 알림** |
| **5단계-A** | PR 생성 전 심층 코드 리뷰 문서 작성 및 자체 감사 | 🔴 **`Argon High`** | [`03-code-review.template.md`](./docs/templates/03-code-review.template.md) 참조 → `03-code-review.md` 작성 (보안 4대 + MFE 14대 + 서비스 16대 전수 점검) |
| **5단계-B** | PR 초안 및 커밋 메시지 보고 → **머지 승인 시 TODO · 레지스트리 업데이트 후 머지** | 🟡 **`Argon Medium`** | [`pull-request.template.md`](./docs/templates/pull-request.template.md) 참조 보고 → 승인 직후·실제 머지 직전에 `todo.md` 및 [`docs/service-registry.md`](./docs/service-registry.md) 업데이트 후 머지 |

---

## 3. 다중 서비스 연계 설계(SSOT) 및 물리적 멀티레포 스코프 격리 규약
1. **7대 공식 스코프 및 브랜치 네이밍 (패턴 A: `<서비스명>/<작업타입>/<작업내용>`)**:
   - `root` (`.` / 루트 설정·공통 설계·하네스), `api` (`apps/api-server`, Port `4000`), `shared` (`apps/remote-shared`, Port `3004`), `products` (`apps/remote-products`, Port `3002`), `cart` (`apps/remote-cart`, Port `3003`), `host-vite` (`apps/host-vite`, Port `3000`), `host-rspack` (`apps/host-rspack`, Port `3001`).
   - `main` 브랜치 직접 커밋·푸시·머지는 절대 금지하며, 한 번의 브랜치 작업에서는 `.agents/active-scope.json`에 승인된 단일 서비스 폴더만 수정합니다.
2. **연계 작업 시 `root` 선행 설계 및 항목(제목) 참조 원칙 (SSOT)**:
   - 여러 마이크로 앱 간 연계가 필요한 기능은 **`root` 브랜치에서 공통 설계(`docs/features/YYYYMMDD-<작업명>/01-plan-and-design.md`)를 먼저 작성·머지**합니다.
   - 이후 각 앱의 설계서에서는 루트 설계 내용을 복사·재작성하지 않고 **루트 정본 문서의 경로와 '항목(섹션 제목)'만 가리키는 참조 형태**로 작성합니다.
   - 앱 개발 도중 인터페이스 재협의가 필요하면 **즉시 앱 브랜치 작업을 홀드(`stash`/대기)**하고 → **`root`에서 브랜치를 새로 따서 정본 설계 문서를 업데이트·머지**한 뒤 → **정본을 앱 브랜치로 다시 받아 이어서 진행**합니다.
3. **MFE 아키텍처 핵심 준수 사항**:
   - 앱 간 로컬 파일 참조(`workspace:*` 또는 상대 경로 코드 import) 금지 — 오직 Module Federation 런타임 로딩으로만 공유합니다.
   - `@ark-ui/react` 및 `clsx`는 `remote-shared/ui`에서 단일 창구로 캡슐화하여 노출(`exposes`)하고, 다른 서비스 앱들은 `remote_shared/ui`의 컴포넌트와 레이아웃(`Splitter`, `Tabs`, `Collapsible`, `Container`, `Grid`, `Flex`, `Stack`, `Card`)을 가져다 씁니다.
   - 상태 동기화는 **`Mode A` (`리모트별 독립 QueryClient + CustomEvent`)**와 **`Mode B` (`싱글톤 sharedQueryClient + invalidateQueries`)**를 비교 학습할 수 있도록 구현하며, Phase 1 끝에 실제 6개 서버를 기동하는 **런타임 MF 스모크 테스트(`verify-mfe-smoke.mjs`)**를 필수로 통과해야 합니다.

---

## 4. 코드 6대 주석 원칙 및 DB 3종 SQL 상시 동기화 규칙
1. **코드 6대 주석 원칙 (필수)**:
   - ① **인터페이스/타입 이너(Inner) 주석**: 인터페이스 자체뿐만 아니라 **내부의 모든 속성(Property)마다 `/** ... */` 한글 설명 주석**을 필수로 달아 인텔리센스에 표시되게 합니다.
   - ② **함수·컴포넌트·훅 상단 JSDoc**: 역할 설명, `@param`, `@returns` 필수 명시.
   - ③ **주요 상수·상태(`useState`/`useRef`) 주석**: 모듈 상수 및 상태 변수 상단 용도 명시.
   - ④ **분기문(`if/else`, `switch`) 의도 주석**: 무엇을 하는지보다 **"왜(Why) 이 분기가 필요한지"** 상세 설명.
   - ⑤ **파일 최상단 역할 헤더**: `@file`, `@app`, `@exposed`, `@description` 명시.
   - ⑥ **주석 동기화**: 코드 수정 시 관련 주석도 반드시 함께 업데이트.
2. **내장 SQLite(`node:sqlite`) 3종 SQL 파일 상시 동기화 (`apps/api-server/sql/`)**:
   - `01-schema.sql`(인라인 주석 + `_schema_comments` 메타 테이블 필수), `02-reset-seed.sql`, `03-drop-all.sql` 3개 파일은 항상 세트로 수정하며, 수정 후 `node scripts/verify-sql-sync.mjs --update`로 `.sql-hashes.json` 해시와 인메모리 순차 실행(`01 -> 02 -> 03 -> 01`) 무결성을 검증합니다.

---

## 5. 커밋 메시지 출력 규칙 (순수 텍스트)
1. 첫 줄에 제목을 쓴다.
2. 엔터를 두 번 입력하여 빈 줄을 **딱 하나**만 만든다.
3. 본문의 각 항목은 앞에 공백을 단 한 칸도 두지 않고 줄의 시작점부터 `- `로 시작한다.
4. 마크다운 리스트 문법이나 코드 블록(`` ` ``)은 복사 시 문제를 일으키므로 절대 사용하지 않고 순수 텍스트로만 출력한다.

---

## 6. 필수 참조 문서 지도 (`docs/service-registry.md`, `docs/templates/`, `docs/study/`, `temp/`)
작업 단계마다 아래 문서를 반드시 `read_file`로 직접 읽어 양식과 방어 아키텍처를 준수합니다.

0. **구현 완료된 서비스별 명령어 · REST API · 노출 모듈(`exposes`) 통합 정본 (새 세션 최우선 참조)**:
   - 서비스 레지스트리 및 명령어·API 요약 정본: [`./docs/service-registry.md`](./docs/service-registry.md)
   - Phase 1 서비스 간 상세 연동 계약 정본(SSOT): [`./docs/features/20261027-phase1-service-contracts/01-plan-and-design.md`](./docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
1. **표준 문서·리뷰·PR 템플릿 5종 (`./docs/templates/`)**:
   - 서비스별 TODO 초기화 시: [`./docs/templates/todo.template.md`](./docs/templates/todo.template.md)
   - [1단계] 기획 및 설계서 작성 시: [`./docs/templates/01-plan-and-design.template.md`](./docs/templates/01-plan-and-design.template.md)
   - [2단계] TDD 명세서 작성 시: [`./docs/templates/02-tdd-spec.template.md`](./docs/templates/02-tdd-spec.template.md)
   - [5단계-A] PR 전 심층 코드 리뷰 시: [`./docs/templates/03-code-review.template.md`](./docs/templates/03-code-review.template.md)
   - [5단계-B] PR 초안 및 커밋 메시지 보고 시: [`./docs/templates/pull-request.template.md`](./docs/templates/pull-request.template.md)
2. **영구 아키텍처·실전 이슈·세팅 가이드 정본 6종 (`./docs/study/`)**:
   - MFE 핵심 원리 및 `Mode A vs Mode B` 비교 학습: [`./docs/study/01-mfe-concepts-and-guide.md`](./docs/study/01-mfe-concepts-and-guide.md)
   - 경량 FSD 폴더 아키텍처(`exposed/`, `features/{ui,api,model}`, `testing/`), 선정 라이브러리, SSOT 참조 원칙: [`./docs/study/02-polyrepo-and-architecture-decisions.md`](./docs/study/02-polyrepo-and-architecture-decisions.md)
   - 5단계 TDD 워크플로우 및 하네스 5대 훅 동작 원리: [`./docs/study/03-ai-harness-and-tdd-workflow-guide.md`](./docs/study/03-ai-harness-and-tdd-workflow-guide.md)
   - **[구현·리뷰 필독] MFE 14대 실전 고유 이슈와 해결 아키텍처**: [`./docs/study/04-mfe-real-world-pitfalls-and-solutions.md`](./docs/study/04-mfe-real-world-pitfalls-and-solutions.md)
   - **[구현·리뷰 필독] 풀스택 서비스 16대 실전 이슈(FE·BE/DB·공통모듈·디자인)**: [`./docs/study/05-fullstack-service-real-world-issues.md`](./docs/study/05-fullstack-service-real-world-issues.md)
   - **[세팅·명령어 기록] 워크스페이스·하네스 및 각 서비스 세팅 A-to-Z 가이드**: [`./docs/study/06-workspace-and-harness-setup-guide.md`](./docs/study/06-workspace-and-harness-setup-guide.md)
3. **초기 프로젝트 구축 참조용 마스터 설계서 (`./temp/` — Git 미추적 로컬 참조용)**:
   - 전체 초기 구축이 완료되어 삭제되기 전까지 포트, DB 테이블, API 엔드포인트, 세부 컨벤션 확인 시 참조:
     - `./temp/02-infra-and-architecture.md`
     - `./temp/03-setup-and-convention.md`
     - `./temp/04-workflow-and-harness.md`

