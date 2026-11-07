# 📐 [기획 및 설계] Module Federation 2.0 정식 원격 타입(`@mf-types.zip`) 생성·서빙 활성화 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261106-enable-mf-types` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/feat/enable-mf-types` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite (pluginDts)` |
| **작성일** | `2026-11-06` |
| **작업 규모 평가** | `적정 (단일 PR)` — `remote-shared`의 Module Federation `dts` 타입 자동 생성(`@mf-types.zip` 서빙) 활성화 및 검증 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 1차 루트 계약 개정(`PR #5`)을 통해 물리적 멀티레포 간 수동 `remotes.d.ts` 작성 방식을 폐기하고 **Module Federation 2.0 공식 `@mf-types` 원격 타입 자동 동기화**로 표준을 통일했습니다.
- 이에 따라 최하위 공급자 서비스인 `remote-shared`(`Port 3004`)의 `vite.config.ts`에서 기존 `dts: false` 설정을 제거하고 **`dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`**을 활성화하여, `remote-products`(`3002`), `remote-cart`(`3003`), `host-*`(`3000`, `3001`)가 `http://localhost:3004/@mf-types.zip`을 다운로드해 `./@mf-types/`에 자동으로 압축 해제할 수 있도록 기반을 완성합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **`@module-federation/vite` 내장 `pluginDts`의 타입 아카이브 생성 및 매니페스트 연동 ([Study 04 #04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))**:
  - `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }` 설정 시 빌드(`vite build`) 및 개발 서버(`vite dev`)에서 `exposes`(`./ui`, `./theme`, `./utils`)의 TypeScript 선언 파일들이 추출되어 `@mf-types.zip`과 `@mf-types.d.ts`로 서빙되며, `mf-manifest.json`의 `metaData.types`에 해당 경로가 자동 기록되는 과정을 검증합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
- **참조 항목(섹션 제목)**:
  - `§ 2.2 MFE / 아키텍처 핵심 학습 포인트 (계약 주도 개발 및 @mf-types 정식 원격 타입 동기화)`
  - `§ 5.3 원격 공통 모듈(remote-shared, Port 3004) 노출(exposes) 시그니처 계약`
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약 (#4 Module Federation 2.0 정식 원격 타입 동기화)`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (`/module-federation/vite`, `pluginDts`)
- **핵심 스펙 및 주의사항**:
  - 공급자(Remote) 설정에서 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`을 지정하면 `module-federation-dts-dev`(`serve`) 및 `module-federation-dts-build`(`build`) 플러그인이 활성화되어 `<base>@mf-types.zip` 및 `<base>@mf-types.d.ts` 엔드포인트와 산출물을 생성합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `MOD` | `docs/todo.md` | `20261106-enable-mf-types` 작업 진행 현황 등록 |
| `NEW` | `docs/features/20261106-enable-mf-types/01-plan-and-design.md` | 본 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261106-enable-mf-types/02-tdd-spec.md` | `dts` 설정 및 아키텍처 무결성 TDD 명세서 |
| `MOD` | `docs/features/20261102-ark-ui-and-utils/01-plan-and-design.md` | 초기 설계 문서 내 `dts: false` 문구를 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`으로 정합성 동기화 |
| `MOD` | `vite.config.ts` | `federation` 플러그인의 `dts: false`를 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`으로 변경 |
| `MOD` | `src/__tests__/SharedShowcase.integration.test.tsx` | `vite.config.ts`에 `@mf-types` 원격 타입 생성 옵션(`generateTypes: true`)이 활성화되어 있는지 검증하는 TDD 케이스 추가 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 본 작업은 `vite.config.ts`의 Module Federation `dts` 플러그인 옵션 활성화 작업으로, 기존 `./ui`, `./theme`, `./utils`의 노출 TypeScript 인터페이스는 변경 없이 그대로 `@mf-types.zip`으로 추출·서빙됩니다.

```ts
/**
 * @description [vite.config.ts] @module-federation/vite federation 플러그인의 dts 타입 생성 설정 규격
 */
export interface RemoteSharedDtsConfig {
  /** 노출 모듈(./ui, ./theme, ./utils)의 .d.ts 타입 아카이브(@mf-types.zip) 생성 활성화 여부 */
  generateTypes: true;

  /** 타입 추출 시 참조할 TypeScript 설정 파일 상대 경로 */
  tsConfigPath: './tsconfig.json';
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` / `dts`)**:
  - **노출 모듈 (`exposes`)**: `'./ui': './src/exposed/ui.ts'`, `'./theme': './src/exposed/theme.ts'`, `'./utils': './src/exposed/utils.ts'`
  - **소비 모듈 (`remotes`)**: `없음 ({})`
  - **공유 의존성 (`shared` & `singleton`)**: `react`, `react-dom`, `@tanstack/react-query` (`singleton: true`)
  - **원격 타입 생성 (`dts`)**: `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**: 기존 `main.ts` + `bootstrap.tsx` 2단 분리 유지
- **마이크로 앱 간 통신 및 상태 공유**: 기존 `mfeEventBus` 및 `sharedQueryClient` 유지
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리**: 기존 `.mfe-ui-*` 및 `var(--mfe-*)` 유지

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`
