# 🧪 [TDD 명세서] `remote-shared/ui` 노출 Props 경계 캡슐화 및 Step 1.2 후속 정리 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 캡슐화, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `Vitest`, `Ark UI`, `ComponentPropsWithoutRef`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/ui/components/{Button,Badge,Heading,Skeleton,Select}.test.tsx`, `src/features/ui/layouts/{Splitter,Tabs,Collapsible,StaticLayouts}.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 리팩토링 전 먼저 실패하는 테스트(`Red`)로 구현할 신규·확장 검증 목록입니다.

### TC-01: 기본 4종·정적 레이아웃 5종(`ComponentPropsWithoutRef` 전환) 표준 HTML·ARIA·`data-*` 속성 투과 검증 (`Button.test.tsx`, `StaticLayouts.test.tsx` 외)
- **사전 조건 (`Given`)**: `Button`, `Badge`, `Heading`, `Skeleton`, `Card`, `Container`, `Flex`, `Grid`, `Stack` 9종이 `HTMLArkProps<*>` 상속 대신 `ComponentPropsWithoutRef<*>`를 상속하는 상태
- **실행 동작 (`When`)**:
  1. 각 컴포넌트에 표준 HTML 속성(`id`, `type`, `data-*`, `aria-*`, `title`, `style`, `onClick`)과 커스텀 Props(`variant`, `size`, `isLoading`, `level`, `tone`, `padding`, `elevated`, `columns`, `gap`, `wrap`)를 함께 전달해 렌더링한다.
- **기대 결과 (`Then`)**:
  1. 모든 표준 HTML 속성, 접근성 속성 및 커스텀 변형 클래스가 기존과 100% 동일하게 DOM에 반영되어야 한다.
  2. `Button`의 `isLoading={true}` 중복 클릭 차단(`disabled`, `aria-busy="true"`) 및 `clsx` 재노출 동작이 깨지지 않아야 한다.

### TC-02: `Select` 경계 캡슐화 Props(`name`, `required`, `invalid`, `closeOnSelect`, `aria-*`, `data-*`) 동작 검증 (`Select.test.tsx`)
- **사전 조건 (`Given`)**: `SelectProps`가 `ArkSelect.RootProps` 직접 상속 없이 `Omit<ComponentPropsWithoutRef<'div'>, ...>` + 명시 허용 속성으로 정의된 상태
- **실행 동작 (`When`)**:
  1. `<Select ariaLabel="사용자 전환" name="userId" required invalid value="user-1" options={[...]} onChange={onChange} data-testid="user-select" />`를 렌더링한다.
  2. 트리거를 클릭해 포털 드롭다운을 열고 `'user-2'` 항목을 클릭한다.
- **기대 결과 (`Then`)**:
  1. 루트 엘리먼트에 `data-testid="user-select"`와 `data-invalid` 상태가 정상 반영되고, 내부 `<select>`에 `name="userId"`가 연결되어야 한다.
  2. 항목 선택 시 단일 문자열 `'user-2'`로 `onChange`가 정확히 1회 호출되어야 한다.

### TC-03: `Splitter` 경계 캡슐화 Props(`defaultSize`, `orientation`, `onResize`, `data-*`) 검증 (`Splitter.test.tsx`)
- **사전 조건 (`Given`)**: `SplitterProps`가 `ArkSplitter.RootProps` 직접 상속 없이 `Omit<ComponentPropsWithoutRef<'div'>, ...>` + 명시 허용 속성(`defaultSize`, `size`, `orientation`, `onResize`)으로 정의된 상태
- **실행 동작 (`When`)**:
  1. `<Splitter orientation="vertical" defaultSize={[60, 40]} onResize={onResize} data-testid="vertical-splitter" panels={[...]} />`를 렌더링한다.
- **기대 결과 (`Then`)**:
  1. 루트 컨테이너에 `data-testid="vertical-splitter"` 및 `data-orientation="vertical"` 속성이 정상 적용되어야 한다.
  2. 두 패널 콘텐츠와 패널 사이 리사이즈 핸들(`role="separator"`)이 정상 렌더링되어야 한다.

### TC-04: `Tabs` 경계 캡슐화 Props(`value` 제어 모드, `defaultValue`, `orientation`, `onChange`) 검증 (`Tabs.test.tsx`)
- **사전 조건 (`Given`)**: `TabsProps`가 `ArkTabs.RootProps` 직접 상속 없이 `Omit<ComponentPropsWithoutRef<'div'>, ...>` + 명시 허용 속성으로 정의된 상태
- **실행 동작 (`When`)**:
  1. 제어 모드(`<Tabs value="events" orientation="vertical" onChange={onChange} items={[...]} />`)로 마운트하고 `'schema'` 탭을 클릭한다.
  2. 부모 상태를 `value="schema"`로 리렌더링한다.
- **기대 결과 (`Then`)**:
  1. 루트에 `data-orientation="vertical"`이 적용되고 탭 클릭 시 `onChange('schema')`가 호출되어야 한다.
  2. `value="schema"` 리렌더링 후 두 번째 탭 패널 콘텐츠가 표시되어야 한다.

### TC-05: `Collapsible` 경계 캡슐화 Props(`defaultOpen`, `open` 제어 모드, `onOpenChange`) 검증 (`Collapsible.test.tsx`)
- **사전 조건 (`Given`)**: `CollapsibleProps`가 `ArkCollapsible.RootProps` 직접 상속 없이 `Omit<ComponentPropsWithoutRef<'div'>, ...>` + 명시 허용 속성으로 정의된 상태
- **실행 동작 (`When`)**:
  1. `<Collapsible title="초기 펼침 패널" defaultOpen={true} onOpenChange={onOpenChange}><div>초기 본문</div></Collapsible>`를 마운트하고 트리거를 1회 클릭해 접는다.
- **기대 결과 (`Then`)**:
  1. 초기 마운트 직후 `"초기 본문"`이 화면에 표시되어야 한다.
  2. 트리거 클릭 시 `onOpenChange(false)`가 호출되어야 한다.

### TC-06: 아키텍처 무결성 3대 정적 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: `apps/remote-shared/vite.config.ts`, `apps/remote-shared/src/**` 전체 소스 파일 및 `apps/remote-shared/src/features/ui/{components,layouts}/*.tsx` 13종 컴포넌트 파일이 존재하는 상태
- **실행 동작 (`When`)**:
  1. **WebSocket 힌트 비활성화 설정 검증**: `vite.config.ts`에 `disableDynamicRemoteTypeHints: true`와 `generateTypes: true`가 모두 포함되어 있는지 검사한다.
  2. **`.js` 확장자 0건 검증 (`Study 04 #01`)**: `apps/remote-shared/src/**/*.{ts,tsx}` 전체 파일에서 상대 경로 import(`.js'` 또는 `.js"`) 사용 개수를 검사한다.
  3. **UI 노출 Props 경계 캡슐화 검증 (`Study 09`)**: `src/features/ui/{components,layouts}/*.tsx`(테스트 제외) 13개 파일에서 `HTMLArkProps`, `ArkSelect.RootProps`, `ArkSplitter.RootProps`, `ArkTabs.RootProps`, `ArkCollapsible.RootProps` 참조가 0건인지 검사하고, `vite build` 완료 후 `dist/@mf-types/**/*.d.ts` 전 파일에 `@ark-ui/react` 문자열이 0건임을 추가 검증한다.
- **기대 결과 (`Then`)**:
  1. `vite.config.ts`에 `disableDynamicRemoteTypeHints: true`가 설정되어 있어야 한다.
  2. `apps/remote-shared/src/**` 내부의 `.js` 상대 경로 import가 **정확히 `0건`**이어야 한다.
  3. 13종 UI 컴포넌트의 노출 `Props` 인터페이스와 빌드 산출물 `dist/@mf-types/**/*.d.ts`에 `@ark-ui/react` 타입 누출이 **정확히 `0건`**이어야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: `Select` `disabled={true}` 상태에서 드롭다운 개방 및 선택 차단 검증 (`Select.test.tsx`)
- **사전 조건 (`Given`)**: `<Select disabled={true} ariaLabel="비활성 선택" value="user-1" options={[...]} onChange={onChange} />`가 렌더링된 상태
- **실행 동작 (`When`)**: 비활성화된 콤보박스 트리거를 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 트리거가 `disabled` 상태여야 하며 클릭해도 옵션 목록이 열리지 않고 `onChange`가 `0회` 호출되어야 한다.

### EC-02: `Collapsible` `disabled={true}` 상태에서 펼침 토글 차단 검증 (`Collapsible.test.tsx`)
- **사전 조건 (`Given`)**: `<Collapsible disabled={true} title="잠긴 패널" onOpenChange={onOpenChange}><div>비공개 본문</div></Collapsible>`가 렌더링된 상태
- **실행 동작 (`When`)**: 트리거 버튼을 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 트리거가 `disabled` 상태여야 하며 클릭해도 `onOpenChange`가 호출되지 않고 본문이 열리지 않아야 한다.

### EC-03: `Tabs` `lazyMount={true}` 설정 시 비활성 탭 지연 마운트 경계 검증 (`Tabs.test.tsx`)
- **사전 조건 (`Given`)**: `<Tabs defaultValue="first" lazyMount={true} items={[{ value: 'first', label: '첫 번째', content: <div>첫 번째 본문</div> }, { value: 'second', label: '두 번째', content: <div>지연 마운트 본문</div> }]} />`가 마운트된 상태
- **실행 동작 (`When`)**:
  1. 초기 마운트 직후 `"지연 마운트 본문"`의 DOM 존재 여부를 확인한다.
  2. `"두 번째"` 탭을 클릭한 뒤 `"지연 마운트 본문"`의 DOM 존재 여부를 다시 확인한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 초기 마운트 시 `"지연 마운트 본문"`은 DOM에 존재하지 않아야 한다(`queryByText(...) === null`).
  2. `"두 번째"` 탭 클릭 이후에만 `"지연 마운트 본문"`이 DOM에 마운트되어 표시되어야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A` (`remote-shared`는 최하위 공급자로 타 원격 모듈을 소비하지 않음)
- **브라우저 API 보완 (`src/testing/setup.ts`)**: 기존 `ResizeObserver`, `Element.prototype.scrollTo` 스텁 및 `@testing-library/jest-dom/vitest`를 그대로 활용합니다.
- **정적 파일 시스템 검증**: `SharedShowcase.integration.test.tsx`에서 `node:fs`와 `node:path`로 `vite.config.ts`, `src/**`, 13종 UI 컴포넌트 소스의 아키텍처 무결성을 직접 검증하며, 4단계 빌드 검증 시 `dist/@mf-types/**/*.d.ts`의 `@ark-ui/react` 참조 0건 여부를 실물 검증합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: `.js` 확장자 제거 및 Props 캡슐화 이후에도 `App.tsx` / `bootstrap.tsx` 단독 쇼케이스가 에러 없이 동작하는가?
- [x] **UI 13종 경계 캡슐화 및 `@mf-types` 무누출 검증**: `dist/@mf-types/**/*.d.ts` 전 파일에 `@ark-ui/react` import 및 참조가 `0건`인가?
- [x] **WebSocket 힌트 차단 및 `.js` 확장자 정리 검증**: `vite.config.ts`에 `disableDynamicRemoteTypeHints: true`가 반영되고 `src/**` 내 `.js` 상대 경로 import가 `0건`인가?
- [x] **접근성(A11y) 및 제어/비제어 Props 검증**: `Select`, `Splitter`, `Tabs`, `Collapsible`의 `disabled`, `lazyMount`, `orientation`, `defaultOpen`, `value` 및 `role`/`aria-*` 속성이 정상 동작하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 및 `GEMINI.md` 규칙 동기화)을 준수했는가?
- [x] `Biome` 포맷팅·린트 검사(`LF` 줄바꿈 포함), `typecheck`, `vite build` (`dist/@mf-types` 무누출 검증 포함)를 통과했는가?
- [x] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
