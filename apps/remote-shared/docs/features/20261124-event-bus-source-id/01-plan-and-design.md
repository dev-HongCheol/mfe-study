# 📐 [기획 및 설계] `remote-shared/utils` 이벤트 버스 발신자 식별(`sourceId`) 및 자기 에코(Self-Echo) 자동 필터링 추가 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 이벤트 버스, 상태 공유, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `singleton`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261124-event-bus-source-id` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/feat/event-bus-source-id` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + Zod + Vitest` |
| **작성일** | `2026-11-24` |
| **작업 규모 평가** | `적정 (1차 PR — 2단계 로드맵 중 공통 이벤트 버스 확장)` — 최하위 공통 공급자(`remote-shared/utils`)에 현업 표준 `sourceId` 자기 에코 차단 기능을 추가하고, 이어지는 2차 PR(`cart/refactor/queryclient-sync-channel`)과 향후 호스트 2종(`host-vite`, `host-rspack`)에서 1줄로 재사용할 기반을 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 — MFE 양방향 이벤트 발행·구독 시 발생하는 자기 에코(Self-Echo) 중복 호출 문제**:
  - `Mode A (mode-a-event)`에서는 리모트나 호스트가 `window.CustomEvent` 기반 `mfeEventBus`로 상태 변경을 알립니다.
  - 이때 이벤트를 **발행하면서 동시에 구독**하는 앱(예: `remote-cart`의 `[+1]`/`[삭제]` 클릭, 향후 `host-vite`/`host-rspack`의 양방향 상태 동기화)은 자기가 발행한 이벤트를 자기 리스너가 즉시 되받아(Self-Echo) **`GET /api/cart` 중복 호출** 및 **외부 이벤트 수신 카운터 오염**을 일으킵니다.
- **목적 — 현업 MFE 표준 `sourceId` 발신자 식별 패턴을 `remote-shared/utils` 공통 기능으로 내장**:
  - 개별 앱마다 복잡한 동기 전용 트릭(`selfEchoTokens` 스택 등)을 중복 구현하는 대신, 현업 MFE 아키텍처(ThoughtWorks, `mitt`/`RxJS` 래퍼 등)의 표준 패턴인 **`sourceId` 발신자 식별 & 수신 측 `ignoreSourceId` 자동 필터링**을 `mfeEventBus`와 `useMfeEvent`에 선택적 옵션으로 내장합니다.
  - 또한 `crypto.randomUUID()` 기반의 `createMfeEventSourceId(prefix)` 헬퍼를 함께 노출하여, `remote-cart`와 향후 호스트 2종(`host-vite`, `host-rspack`)이 일관된 형식의 발신자 ID로 자기 에코 차단과 `MfeInspector` 출처 추적을 즉시 활용할 수 있게 합니다.
  - 동시에 [`Study 04` (`#09`)](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 트러블슈팅 필독 문서와 [`Study 12`](../../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)를 현업 표준 `sourceId` 패턴으로 현행화하여 이후 호스트 2종 구축·리뷰 시 자동으로 적용되도록 합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **도메인 `Zod` 스키마 무변경 & 양방향 100% 하위 호환 전송 설계 (`__mfeSourceId` 예약 메타 키)**:
  - `CustomEvent.detail`의 최상위 구조를 `{ payload, meta }` 봉투로 완전히 감싸버리면, 아직 구버전 `remote-shared`를 쓰는 리모트나 `event.detail`을 직접 읽는 외부 코드가 깨질 수 있습니다.
  - 대신 `emit(eventName, payload, { sourceId })`는 유효성 검증을 통과한 평문 도메인 객체(`parsed.data`)를 그대로 유지하되, `sourceId`가 비어 있지 않을 때만 예약 메타 키 **`__mfeSourceId`**를 첨부해 디스패치합니다:
    1. **신버전 발신자 → 신버전 수신자**: `subscribe`는 `schema.safeParse(rawDetail)` 실행 **전에** `rawDetail.__mfeSourceId`를 추출해 `ignoreSourceId`와 일치하면 즉시 리턴(자기 에코 1줄 차단)합니다. 통과한 이벤트는 `Zod`의 기본 `strip` 동작으로 `__mfeSourceId`가 자동 제거되어 핸들러에는 **순수 도메인 페이로드(`parsed.data`)**만 전달되고, `sourceId`가 존재할 때만 선택적 두 번째 인자 `meta: { sourceId }`로 전달됩니다.
    2. **신버전 발신자 → 구버전 수신자**: 구버전 `mfeEventBus`의 `z.object(...).safeParse()`는 선언되지 않은 키(`__mfeSourceId`)를 에러 없이 자동 제거(`strip`)하므로 구버전 리모트도 100% 정상 동작합니다.
    3. **구버전 발신자(`remote-products` 등) → 신버전 수신자**: `__mfeSourceId`가 없으므로(`undefined`) 필터링에 걸리지 않고 기존처럼 `handler(parsed.data)` 1개 인자로 호출되어 기존 코드·테스트(`toHaveBeenCalledWith(payload)`)를 단 1건도 깨뜨리지 않습니다.
    4. **동기(`CustomEvent`) & 비동기(`BroadcastChannel`) 무손실 확장**: 순수 JSON 문자열 프로퍼티이므로 구조화 복제(Structured Clone) 및 비동기 이벤트 버스로 확장해도 `sourceId`가 유실되지 않습니다.
- **`useMfeEvent` 리스너 무재등록(Zero Re-subscribe) Ref 패턴**:
  - `savedHandlerRef`와 동일하게 `ignoreSourceIdRef`에 최신 `options?.ignoreSourceId`를 동기화하면, 구독 중 `ignoreSourceId`가 바뀌더라도 `window.removeEventListener` / `addEventListener`를 불필요하게 재실행하지 않습니다.

### 2.3 현행 서비스 정본(`service-registry.md`) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [서비스 레지스트리 (`docs/service-registry.md`)](../../../../../docs/service-registry.md), [Study 12 (`12-mfe-event-self-echo-and-queryclient-sync.md`)](../../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)
- **참조 항목(섹션 제목)**:
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약` (`remote_shared/utils` — 5단계-C 머지 직전 `createMfeEventSourceId`, `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta` 및 `sourceId` 자기 에코 차단 기능 반영)
  - `service-registry.md § 4.3 타 서비스(products, cart, host-vite, host-rspack) 필수 소비 규칙 6대 원칙` (`useMfeEvent` 기반 리스너 자동 해제 및 자기 에코 차단 규칙 연동)

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `Zod` (Context7 `/colinhacks/zod`)
- **핵심 스펙 및 주의사항**:
  1. **`z.object()`의 기본 `strip` 동작 (`safeParse` 동일 적용)**:
     - 공식 문서(`/colinhacks/zod` `api.mdx` & `object.test.ts`)에 따라 `z.object(shape)`는 별도의 `.strict()`나 `.catchall()`을 선언하지 않는 한 **스키마에 정의되지 않은 알 수 없는 키를 에러 없이 결과 객체에서 자동 제거(`strip`)**합니다.
     - `.safeParse()` 역시 동일한 파싱 경로를 타므로, 전송 경계(`CustomEvent.detail`)에 예약 메타 키 `__mfeSourceId`를 실어 보내고 수신 측에서 `safeParse` 전에 추출하면, ① 핸들러에 전달되는 `parsed.data`에는 `__mfeSourceId`가 절대 누출되지 않고, ② 구버전 리모트 수신자도 100% 에러 없이 파싱에 성공합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `shared`) 및 전역 허용 학습 문서(`docs/study/`) 내 변경 파일 목록입니다. `remote-cart` 적용은 본 PR 머지 직후 2차 PR(`cart/refactor/queryclient-sync-channel`)에서 독립 수행합니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261124-event-bus-source-id/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261124-event-bus-source-id/02-tdd-spec.md` | 2단계 TDD 명세서 |
| `NEW` | `docs/features/20261124-event-bus-source-id/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰서 |
| `MOD` | `docs/todo.md` | 본 작업 진행 중 등록 및 5단계-C 머지 직전 완료 이관 |
| `MOD` | `src/features/utils/model/event-bus.ts` | `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`, `createMfeEventSourceId` 추가 및 `mfeEventBus.emit`/`subscribe`, `useMfeEvent`에 `__mfeSourceId` 기반 자기 에코 자동 차단 구현 |
| `MOD` | `src/exposed/utils.ts` | `createMfeEventSourceId` 및 신규 옵션·메타 타입 3종(`MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`) 재노출 추가 |
| `MOD` | `src/features/utils/model/event-bus.test.ts` | `sourceId` 자기 에코 차단, 외부 이벤트 `meta.sourceId` 전달, 구버전 평문 `CustomEvent` 하위 호환, 공백 `sourceId` 정규화, `createMfeEventSourceId` 고유성 단위 테스트 추가 |
| `MOD` | `src/features/utils/model/UseMfeEvent.test.tsx` | `useMfeEvent(..., { ignoreSourceId })` 자기 에코 무시, 외부 이벤트 `meta` 수신 및 `ignoreSourceId` 변경 시 리스너 무재등록 검증 추가 |
| `MOD` | `(루트) docs/study/12-mfe-event-self-echo-and-queryclient-sync.md` | 최종 확정된 현업 표준 `sourceId` 패턴(A안) 및 2단계 구현 로드맵으로 전면 현행화 |
| `MOD` | `(루트) docs/study/04-mfe-real-world-pitfalls-and-solutions.md` | `#09` 항목에 양방향 이벤트 자기 에코(Self-Echo) 차단 패턴 및 `Study 12` 참조 등재 (호스트 2종 구현·리뷰 자동 반영) |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | **(5단계-C 머지 직전 필수 갱신)** `remote-shared/utils` `sourceId` 기능 완료 및 노출 시그니처 반영 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 기존 도메인 `Zod` 스키마(`src/features/utils/model/contracts.ts`)는 변경하지 않습니다. 모든 신규 인터페이스와 속성에는 인텔리센스 한글 설명 주석(`/** ... */`)을 필수로 작성합니다.

```ts
/** CustomEvent.detail에 선택적으로 첨부되는 발신자 식별 예약 메타 키 (Zod strip으로 핸들러 페이로드에서 자동 제거) */
const MFE_EVENT_SOURCE_ID_KEY = '__mfeSourceId';

/**
 * @description 이벤트 발행 시 선택적으로 전달하는 발신자 식별 옵션 인터페이스
 */
export interface MfeEventEmitOptions {
  /** 이벤트를 발행하는 앱·위젯·QueryClient 인스턴스의 고유 발신자 ID (자기 에코 차단 및 MfeInspector 출처 추적용) */
  sourceId?: string;
}

/**
 * @description 이벤트 구독 시 자기 에코(Self-Echo) 필터링을 제어하는 선택 옵션 인터페이스
 */
export interface MfeEventSubscribeOptions {
  /** 이 ID와 일치하는 sourceId로 발행된 자기 이벤트(Self-Echo)를 수신 단계에서 자동 무시합니다. */
  ignoreSourceId?: string;
}

/**
 * @description 이벤트 구독 핸들러의 선택적 두 번째 인자로 전달되는 발신 메타데이터 인터페이스
 */
export interface MfeEventMeta {
  /** 발신 측이 emit 옵션으로 전달한 고유 발신자 ID (구버전 발신자 또는 미지정 시 생략됨) */
  sourceId?: string;
}

/**
 * @description 마이크로 앱 간 약결합(Mode A 등) 이벤트 발행 및 구독을 담당하는 이벤트 버스 인터페이스
 */
export interface MfeEventBus {
  /** 페이로드를 Zod 스키마로 검증한 뒤 유효할 때만 window CustomEvent를 발행합니다. */
  emit: <K extends MfeEventName>(
    eventName: K,
    payload: MfeEventPayloadMap[K],
    options?: MfeEventEmitOptions,
  ) => boolean;

  /** window CustomEvent를 구독하고 자기 에코 필터링 및 Zod 스키마 검증을 통과한 페이로드만 핸들러에 전달합니다. */
  subscribe: <K extends MfeEventName>(
    eventName: K,
    handler: (payload: MfeEventPayloadMap[K], meta?: MfeEventMeta) => void,
    options?: MfeEventSubscribeOptions,
  ) => () => void;
}
```

### 5.1 핵심 동작 규칙 (정규화 및 하위 호환 경계)
1. **`normalizeSourceId(sourceId?: string): string | undefined`**:
   - 앞뒤 공백을 제거(`trim()`)한 뒤 빈 문자열이면 `undefined`를 반환합니다. 공백만 있는 잘못된 `sourceId`가 메타 키나 무시 필터로 오작동하는 것을 방지합니다.
2. **`createMfeEventSourceId(prefix: string): string`**:
   - 브라우저 표준 `globalThis.crypto?.randomUUID?.()`를 우선 사용하고, 구형 브라우저·비보안 HTTP 컨텍스트 등 `randomUUID` 미지원 시 단조 증가 시퀀스 + 타임스탬프 폴백(`fallback-<seq>-<ts>`)을 생성합니다.
   - `prefix`는 `MfeInspector` 출처 추적 일관성을 위해 **필수 문자열**로 강제하며, 빈 문자열·공백 전달 시 예외를 던지고 정상 입력 시 항상 `${normalizedPrefix}:${uuid}` 형태(예: `remote-cart:550e8400-...`)를 반환합니다.
3. **`subscribe` 핸들러 호출 인자 규칙 (기존 테스트·소비자 100% 무깨짐)**:
   - 수신된 이벤트에 유효한 `sourceId`가 있으면 `handler(parsed.data, { sourceId })`로 호출합니다.
   - `sourceId`가 없으면(기존 2인자 `emit` 또는 외부 평문 `CustomEvent`) **`handler(parsed.data)` 1개 인자**로 호출해 기존 소비자 및 테스트의 `toHaveBeenCalledWith(payload)` 계약을 100% 보존합니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 기존 3대 서브패스 유지 (`'./ui'`, `'./theme'`, `'./utils'`). `./utils`에서 `createMfeEventSourceId`, `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`를 추가 재노출합니다.
  - **소비 모듈 (`remotes`)**: `N/A` (최하위 공통 공급자)
  - **공유 의존성 (`shared` & `singleton`)**: 기존 6종 싱글톤 설정(`react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@tanstack/react-query`) 그대로 유지합니다.
  - **원격 타입 생성 (`dts`)**: 4단계 `vite build`로 `dist/@mf-types.zip` 및 `dist/@mf-types/**/*.d.ts`를 재생성해 신규 타입들이 `@ark-ui/react` 누출 없이 정상 포함됨을 검증합니다.
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - 기존 단독 실행 쇼케이스(`App.tsx`, `bootstrap.tsx`, `main.ts`) 동작은 100% 유지됩니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - `./utils` → `./theme` → `./ui` 단방향 의존성 불변식을 그대로 유지합니다.
  - `remote-products`는 기존 2인자 `emit` 호출부를 전혀 수정할 필요가 없으며, `remote-cart`와 향후 호스트 2종(`host-vite`, `host-rspack`)은 `createMfeEventSourceId` + `{ sourceId }` / `{ ignoreSourceId }` 옵션으로 자기 에코를 1줄로 차단합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 변경 없음 (기존 13종 컴포넌트 및 4종 테마 100% 유지).

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 최하위 프론트엔드 공통 모듈 스코프)`
