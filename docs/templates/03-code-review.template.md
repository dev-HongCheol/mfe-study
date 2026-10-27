# 🔍 [코드 리뷰 및 품질·보안 검증서] {{TASK_TITLE}} (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`
> 승인자가 빠르고 정확하게 리뷰할 수 있도록 에이전트가 반드시 정리해서 전달해야 하는 **5대 핵심 데이터**입니다.

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `src/...` | {{PLANNED_ACTION}} | `NEW` \| `MOD` | `+00 / -0` | `일치` \| `보완 (사유 기재)` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Request` / `Event Payload`)**: {{INPUT_DATA_SUMMARY}}
- **내부 핵심 처리 로직**: {{CORE_LOGIC_FLOW_SUMMARY}}
- **출력 데이터 (`Render` / `Response` / `State Change`)**: {{OUTPUT_DATA_SUMMARY}}

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter {{PACKAGE_NAME}} test`
- **통과 현황**: 총 `{{TOTAL_COUNT}}`건 중 `{{PASS_COUNT}}`건 통과 (`0`건 실패, 소요 시간: `{{DURATION}}ms`)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` {{TC_01_RESULT_SUMMARY}}
  - `[EC-01]` {{EC_01_RESULT_SUMMARY}}

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` | `실패`
- **타입 검사 (`tsc --noEmit`)**: `통과` | `실패`
- **작업 스코프 격리 (`verify-scope.mjs`)**: `{{SCOPE_ID}}` 범위 외 수정 0건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과` | `N/A (해당 없음)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
> 변경된 코드에서 발생할 수 있는 보안 취약점을 점검합니다. (해당 없는 항목은 `N/A` 표기)

- [ ] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: SQLite 쿼리 작성 시 문자열 결합(`${}`)을 절대 쓰지 않고 100% 바인딩 파라미터(`?`)를 사용했으며, 외부 입력(`req.body`, `req.query`, 이벤트 페이로드)을 런타임 스키마(`zod` 등)로 검증했는가? (`통과` / `N/A`)
- [ ] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 등 위험한 API 사용이 없으며 사용자 입력이 안전하게 이스케이프되는가? (`통과` / `N/A`)
- [ ] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 요청한 `userId` 권한 확인이 누락되지 않았으며, 토큰이나 내부 스택 트레이스가 콘솔 로그나 에러 응답으로 유출되지 않는가? (`통과` / `N/A`)
- [ ] **[SEC-04] 안전한 CORS 및 네트워크 경계**: 지정된 아키텍처 포트 정책과 타임아웃/에러 처리가 올바르게 적용되었는가? (`통과` / `N/A`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
> 💡 백엔드(`api`) 또는 루트(`root`) 단독 작업인 경우 `N/A`로 표기합니다.

- **적용 여부**: `적용` | `N/A (해당 없음)`
- [ ] **초기화·경로 (#01~#04)**: `main.tsx` + `bootstrap.tsx` 2단 분리, 리모트 정적 에셋 안전 참조(`import.meta.url`), 개발 서버 `cors: true` & `strictPort: true`, `remotes.d.ts` 안전망이 유지되었는가?
- [ ] **DOM·스타일 격리 (#05~#06)**: 도메인 리모트에서 전역 `CSS Reset`이나 태그 선택자(`button`, `body`, `*`)를 쓰지 않았으며, 모달·드롭다운에 `remote-shared`의 표준 `--z-*` 토큰을 사용했는가?
- [ ] **상태·라우팅·메모리·스토리지 (#07~#10)**: 공유 Context의 단일 원격 출처 참조, 단독/결합 라우터 진입점 분리, `useMfeEvent`를 통한 이벤트 리스너 자동 해제(좀비 리스너 방지), `localStorage` 스코프 프리픽스(`mfe:<scope>:*`)를 준수했는가?
- [ ] **단독 테스트·장애 복구 (#11~#14)**: 타 서버 실행 없이 `Vitest` 로컬 스텁으로 단독 테스트가 통과하며, `RemoteErrorBoundary` 재시도 복구가 정상 동작하는가?

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`, `products`, `cart`, `host-*` 해당 시)
- [ ] **비동기 경합 및 폭포수 방지 (#01~#02)**: 버튼 연타 방지(`isPending` 비활성화) 및 구버전 조회 취소(`cancelQueries`), 병렬 쿼리 처리로 직렬 `Waterfall`을 방지했는가?
- [ ] **렌더링 및 금액·시간 정확성 (#03~#04)**: 리스트에 DB 고유 `id`를 `key`로 부여하고 불필요한 `useEffect` 파생 상태를 제거했으며, 금액은 정수 연산 후 `formatCurrency`로 포맷팅했는가?
- [ ] **레이아웃·테마·접근성 (#13~#16)**: 스켈레톤 `CLS`(화면 밀림) 방지, 색상 하드코딩 금지(시맨틱 CSS 변수만 사용), `:focus-visible` 및 `aria-busy` 접근성 적용, 플렉스 자식 `min-width: 0` 및 숫자 `tabular-nums`를 적용했는가?

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [ ] **SQLite 무결성 및 동시성 (#05~#06)**: `PRAGMA foreign_keys = ON` 및 `journal_mode = WAL`이 활성화되었으며, 수량·재고 변경 시 원자적 `UPSERT` 또는 `db.transaction()`을 사용했는가?
- [ ] **표준 에러 응답 및 쿼리 최적화 (#07~#08)**: 표준 응답 엔벨로프(`{ success, data, error }`)와 전역 에러 미들웨어를 통일했으며, `JOIN` 단일 조회와 인덱스로 `N+1 쿼리`를 방지했는가?

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [ ] **모듈 구조 및 예외 안전성 (#09~#12)**: 무분별한 배럴 파일(`index.ts`) 순환 참조가 없고, `normalizeError`로 안전하게 예외를 처리했는가?
- [ ] **6대 주석 원칙 ([`Study 02` §3](../study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 파일 최상단 헤더, **모든 인터페이스 내부 속성의 `/** */` 인텔리센스 한글 주석**, 함수·상수 주석, 분기문(`if/else`)의 의도(Why) 주석이 빠짐없이 작성·동기화되었는가?

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`
> 자체 코드 리뷰 과정에서 발견하여 수정 완료한 사항과, 승인자(사용자)에게 확인받고자 하는 핵심 질문/의사결정 사항을 기록합니다.

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **{{ISSUE_FOUND_1}}** -> {{HOW_IT_WAS_FIXED_1}} (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **{{HIGHLIGHT_OR_QUESTION_1}}**: {{DETAILED_EXPLANATION_FOR_APPROVER}}

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)` | `🛠️ 보완 필요 (Fix Required)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](./pull-request.template.md) 기반 PR 초안 및 커밋 메시지 보고 진행
