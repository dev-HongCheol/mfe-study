# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-shared/utils` 이벤트 버스 발신자 식별(`sourceId`) 및 자기 에코(Self-Echo) 자동 필터링 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 이벤트 버스, 폴백 등)와 범용 영문 키워드(`PR`, `TDD`, `MFE`, `Zod`, `@mf-types` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `apps/remote-shared/src/features/utils/model/event-bus.ts` | `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`, `createMfeEventSourceId` 추가 및 `__mfeSourceId` 기반 자기 에코 차단 + `useMfeEvent` 무재등록 Ref 적용 | `MOD` | `+156 / -16` | `일치` (`Object.assign`으로 타입 안전하게 평문 `detail` 결합) |
| `apps/remote-shared/src/exposed/utils.ts` | `createMfeEventSourceId` 및 신규 옵션·메타 타입 3종 재노출 추가 | `MOD` | `+9 / -1` | `일치` |
| `apps/remote-shared/src/features/utils/model/event-bus.test.ts` | `TC-01`(자기 에코 차단·`meta` 전달), `TC-03`(`createMfeEventSourceId`), `EC-01`(하위 호환), `EC-02`(공백·비정상 메타 방어) 단위 테스트 추가 | `MOD` | `+125 / -2` | `일치` |
| `apps/remote-shared/src/features/utils/model/UseMfeEvent.test.tsx` | `TC-02`(`useMfeEvent` 자기 에코 차단 및 `ignoreSourceId` 변경 시 리스너 무재등록 검증) 추가 | `MOD` | `+56 / -6` | `일치` |
| `apps/remote-shared/src/__tests__/SharedShowcase.integration.test.tsx` | `TC-04`(`dist/@mf-types/**/*.d.ts` 내 신규 공개 심볼 포함 및 `@ark-ui/react` 무누출 검증) 강화 | `MOD` | `+8 / -1` | `일치` |
| `docs/study/12-mfe-event-self-echo-and-queryclient-sync.md` | 최종 확정 방식(A안: `mfeEventBus` `__mfeSourceId` 표준 패턴 + 2단계 로드맵 + 호스트 2종 재사용 예시)으로 전면 현행화 | `MOD` | `+135 / -259` | `일치` |
| `docs/study/04-mfe-real-world-pitfalls-and-solutions.md` | `#09` 항목에 양방향 이벤트 자기 에코(Self-Echo) 차단 패턴 및 `Study 12` 참조 등재 | `MOD` | `+10 / -8` | `일치` |
| `apps/remote-shared/docs/todo.md` & `docs/features/20261124-event-bus-source-id/*` | 진행 중 등록 및 `01-plan-and-design.md`, `02-tdd-spec.md`, `03-code-review.md` 작성 | `NEW/MOD` | `문서 4종` | `일치` |
| `.agents/active-scope.json` | 활성 스코프 `shared` 및 브랜치·단계 동기화 | `MOD` | `+3 / -3` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`emit` / `subscribe` / `useMfeEvent`)**:
  - 발신자는 `mfeEventBus.emit(eventName, payload, { sourceId? })`로 기존과 동일하게 도메인 페이로드를 전달하며, 필요 시 `createMfeEventSourceId(prefix)`로 발급한 고유 `sourceId`를 선택적으로 넘깁니다.
  - 구독자는 `mfeEventBus.subscribe(eventName, handler, { ignoreSourceId? })` 또는 `useMfeEvent(eventName, handler, { ignoreSourceId? })`를 호출합니다.
- **내부 핵심 처리 로직**:
  - `emit`은 도메인 `Zod` 스키마(`MFE_EVENT_SCHEMAS`) 검증 통과 후 유효한 `sourceId`가 있을 때만 평문 `detail`에 예약 메타 키 `__mfeSourceId`를 첨부해 `window.dispatchEvent`를 호출합니다.
  - `subscribe`는 `Zod` 파싱 전에 `extractSourceId(detail)`로 발신자 ID를 추출해 `ignoreSourceId`와 일치하면 즉시 차단(`return`)합니다. 통과한 이벤트는 `Zod`의 기본 `strip` 동작으로 `__mfeSourceId`가 제거되어 핸들러에 순수 도메인 `payload`만 전달됩니다.
  - `useMfeEvent`는 `savedHandlerRef`와 `ignoreSourceIdRef`를 최신화하여 마운트 중 `ignoreSourceId`가 바뀌어도 `window.addEventListener`를 재등록하지 않습니다.
- **출력 데이터 (`Handler Callback` / `@mf-types`)**:
  - 발신 `sourceId`가 있는 이벤트는 `handler(parsed.data, { sourceId })`로, 없는 이벤트(구버전 발신자·외부 평문 `CustomEvent`)는 기존과 동일하게 `handler(parsed.data)` 1개 인자로 호출합니다.
  - `vite build`로 재생성된 `dist/@mf-types/**/*.d.ts`에 `createMfeEventSourceId`, `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`가 정상 포함되고 `@ark-ui/react` 참조는 `0건`입니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `node ./node_modules/vitest/vitest.mjs run` (`pnpm test` 동일)
- **통과 현황**:
  - **3단계 `Red` 확인**: `remote-shared` `18개 파일 / 43건` 중 신규 4건 의도된 실패 확인 (`TC-01`, `TC-02`, `TC-03`, `TC-04`)
  - **4단계 `Green` (`remote-shared` 단독)**: **`18`개 파일 / `43`건 전원 통과** (`0`건 실패)
  - **워크스페이스 전체 회귀 검증**: **`42`개 파일 / `132`건 전원 통과** (`0`건 실패, 소요 시간: `15.32s` — `remote-shared`, `remote-products`, `remote-cart`, `api-server`, `root-harness` 전수 통과)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` `sourceId` 발행 시 동일 `ignoreSourceId` 구독자 0회 차단, 타 구독자·`MfeInspector`에 순수 `payload`(`__mfeSourceId` 미포함) + `meta: { sourceId }` 전달 통과
  - `[TC-02]` `useMfeEvent(..., { ignoreSourceId })` 자기 에코 차단 및 `rerender`로 옵션 변경 시 `window.addEventListener` 추가 재등록 0회 통과
  - `[TC-03]` `createMfeEventSourceId` 고유성·프리픽스 trim·`exposed/utils` 공개 심볼 검증 통과
  - `[TC-04]` 재생성된 `dist/@mf-types/**/*.d.ts` 내 신규 공개 타입 4종 포함 및 `@ark-ui/react`·폐기 심볼 `0건` 실물 검증 통과
  - `[EC-01 / EC-02]` 기존 2인자 `emit`·외부 평문 `CustomEvent` 1인자 호출 하위 호환, 공백 문자열 `sourceId`/`ignoreSourceId` 및 비정상 타입 `__mfeSourceId` 크래시 방어 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 165 files in 39ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`apps/remote-shared/tsconfig.json` 에러 `0`건)
- **프로덕션 빌드 (`vite build`)**: `통과` (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types.zip`, `dist/@mf-types/` 정상 재생성, `4.77s`)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `shared` (`apps/remote-shared`) 및 전역 허용 학습 문서(`docs/study/04-*`, `docs/study/12-*`, `.agents/active-scope.json`) 외 타 서비스 폴더·기존 머지 완료 세션 문서 수정 `0건` 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음 — api 스코프 SQL 미변경)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 이벤트 발행·수신 경계에서 기존 4종 `Zod` 스키마 검증을 유지하며, `__mfeSourceId` 메타 추출 시 `typeof === 'string'` 및 `trim()` 방어 검증을 수행해 비정상 타입 입력에 의한 예외를 차단했습니다. (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용이 전무하며 DOM 직접 조작이 추가되지 않았습니다. (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: `createMfeEventSourceId`는 `crypto.randomUUID()` 기반 비예측 식별자를 생성하며, 민감 정보나 토큰을 이벤트 메타에 포함하지 않습니다. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: Port `3004`, `strictPort: true`, `cors: true`, React 서브패스 3종 명시 공유 기존 정책을 그대로 유지합니다. (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리(#01), `cors: true` & `strictPort: true`(#03), `@mf-types.zip` 재생성 및 신규 타입 정상 노출·`@ark-ui/react` 누출 `0건`(#04) 통과.
- [x] **DOM·스타일 격리 (#05~#06)**: 기존 `.mfe-ui-*` 프리픽스 및 `--mfe-z-*` 계층 토큰 회귀 없음.
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `useMfeEvent` 자동 리스너 해제 + **`sourceId` / `ignoreSourceId` 자기 에코 차단 패턴(#09, `Study 12`)**을 공통 모듈에 내장하고 `Study 04 #09` 트러블슈팅 문서에도 공식 등재 완료.
- [x] **단독 테스트·장애 복구 (#11~#14)**: 타 서버 기동 없이 `remote-shared` 단독 `43건` 및 워크스페이스 전체 `132건` 전원 통과.

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`)
- [x] **비동기 경합·렌더링·테마·접근성 (#01~#04, #13~#16)**: 기존 13종 UI 컴포넌트 및 4종 시맨틱 테마 회귀 없음.

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **백엔드 스코프 해당 없음 (`N/A`)**

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `./utils` → `./theme` → `./ui` 단방향 의존성(`0건` 역참조)이 정적 테스트로 지속 보장되며, 비브라우저 환경(`window === undefined`) 및 비정상 메타 타입에도 크래시 없이 방어됩니다(#10, #12).
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 [`GEMINI.md`](../../../../../GEMINI.md) 기준)**: 신규 인터페이스 3종(`MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`)의 모든 내부 속성 `/** */` 한글 주석, 함수 헤더 JSDoc, 모듈 상수 주석, 모든 `if` 분기문 의도(`// [분기 설명]`) 주석을 빠짐없이 작성했습니다.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 및 TDD 과정에서 발견·즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **기존 테스트(`expect(handler).toHaveBeenCalledWith(payload)`) 100% 하위 호환성 보장**:
   - `subscribe`가 항상 2번째 인자(`{ sourceId: undefined }`)를 전달하면 기존 1인자 검증 테스트가 깨질 수 있음을 사전 포착해, `sourceId`가 존재할 때만 `handler(parsed.data, { sourceId })`로 호출하고 미지정 시 `handler(parsed.data)` 1인자로 호출하도록 설계·검증했습니다(`EC-01` 통과).
2. **`tsc --noEmit` 엄격 타입 검사로 발견된 인덱스 시그니처 캐스팅 및 테스트 암시적 `any` 즉시 수정**:
   - `parsed.data`에 `__mfeSourceId`를 결합할 때 불필요한 `as Record<string, unknown>` 캐스팅 대신 `Object.assign({}, parsed.data, { [MFE_EVENT_SOURCE_ID_KEY]: normalizedSourceId })`로 개선하고, `UseMfeEvent.test.tsx`의 콜백 인자 타입을 정리해 `tsc --noEmit` 에러 `0건`을 달성했습니다.
3. **승인자 리뷰 피드백 반영 (`createMfeEventSourceId(prefix: string)` 필수 인자 단순화)**:
   - YAGNI 원칙에 따라 실제로 사용하지 않는 `prefix` 생략 분기를 제거하고 `prefix: string`을 필수 인자로 강제하며 빈 문자열·공백 전달 시 명시적 `Error`를 던지도록 단순화했습니다.

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **2단계 로드맵 중 1차 PR 완료 및 2차 PR 연계 안내**:
   - 본 1차 PR(`shared/feat/event-bus-source-id`)이 머지되면, 바로 이어서 2차 PR(`cart/refactor/queryclient-sync-channel`)에서 `apps/remote-cart`가 `createMfeEventSourceId('remote-cart')`와 `{ sourceId }` / `{ ignoreSourceId }`를 사용해 초간단 `QueryClient` 단위 동기화 채널 및 8대 회귀 테스트를 구축하게 됩니다.
2. **5단계-A PR 초안 보고 및 PR 생성 승인 요청**:
   - 본 코드 리뷰서와 아래 PR 초안·커밋 메시지를 확인해 주시고, **커밋·푸시 및 PR 생성(`gh pr create`) 진행 여부**를 승인해 주시면 **PR 생성까지만 수행하고 즉시 멈추어** GitHub PR 확인 및 별도 머지 결정을 대기하겠습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고 진행
