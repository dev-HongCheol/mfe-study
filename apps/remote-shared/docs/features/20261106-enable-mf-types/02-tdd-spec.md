# 🧪 [TDD 명세서] Module Federation 2.0 정식 원격 타입(`@mf-types.zip`) 생성·서빙 활성화 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/**/*.test.ts(x)` (기존 17개 단위 테스트 파일 회귀 검증) |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드(`vite.config.ts`) 수정 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `vite.config.ts`의 Module Federation `@mf-types` 원격 타입 생성(`generateTypes: true`) 설정 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: `apps/remote-shared/vite.config.ts` 설정 파일이 존재하는 상태
- **실행 동작 (`When`)**: 통합 테스트에서 `vite.config.ts`의 Module Federation 설정을 검사한다.
- **기대 결과 (`Then`)**:
  1. `dts: false`가 존재하지 않아야 한다.
  2. `generateTypes: true` 및 `tsConfigPath: './tsconfig.json'` 설정이 포함되어 있어 타 마이크로 앱이 `@mf-types.zip`을 수신할 수 있어야 한다.

### TC-02: 프로덕션 빌드(`pnpm --filter @mfe-study/remote-shared build`) 시 `mf-manifest.json` 및 타입 산출물 생성 검증
- **사전 조건 (`Given`)**: `vite.config.ts`에 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`이 적용된 상태
- **실행 동작 (`When`)**: `pnpm --filter @mfe-study/remote-shared build`를 실행한다.
- **기대 결과 (`Then`)**: 빌드 에러 없이 `dist/remoteEntry.js`, `dist/mf-manifest.json` 및 타입 아카이브 관련 산출물이 정상 생성되어야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 기존 3계층 단방향 의존성(`utils -> theme -> ui`) 및 25건 단위·통합 테스트 회귀 검증
- **사전 조건 (`Given`)**: `dts` 설정이 변경된 상태
- **실행 동작 (`When`)**: `pnpm --filter @mfe-study/remote-shared test` 및 `typecheck`를 실행한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 기존 18개 테스트 파일의 모든 시나리오가 깨짐 없이 100% 통과해야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A (최하위 공급자 모듈)`
- **네트워크 / API / DB 모킹**: 기존 `msw/node` 및 `src/testing/setup.ts` 폴리필 유지
- **테스트 픽스처**: `apps/remote-shared/vite.config.ts`源码 정적 검증 및 쇼케이스 컴포넌트 렌더링 검증

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [ ] **단독 실행(Standalone) 렌더링 검증**: 호스트 없이 단독 엔트리(`bootstrap.tsx`) 마운트 시 화면이 정상 동작하는가?
- [ ] **원격 타입(`@mf-types`) 생성 검증**: `dts: { generateTypes: true }` 활성화 후 빌드가 정상 통과하는가?
- [ ] **이벤트 버스 및 쿼리 캐시 연동**: `CustomEvent` 발행/구독 및 `sharedQueryClient`가 정상 동작하는가?
- [ ] **접근성(A11y) 및 역할 검증**: `Ark UI` 헤드리스 컴포넌트의 `role`, `aria-*` 속성이 정상 렌더링되는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 `docs/service-registry.md`를 최신 상태로 업데이트했는가?
