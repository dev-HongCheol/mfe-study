# 📗 Study 02. 물리적 멀티레포(Polyrepo) 전환과 아키텍처 의사결정 노트

> **문서 목적**: 초기 설계 이후 아키텍처를 구체화하면서 논의했던 **"모노레포에서 물리적 멀티레포로의 전환 배경"**, **"Git 외에 멀티레포에서만 체득할 수 있는 실무 요소"**, **"서비스별 문서(`docs/`) 응집도 설계"**, 그리고 **"다중 프레임워크·번들러 공통 템플릿 설계"** 등 핵심 질문과 해결책을 기록한 학습 노트입니다.

---

## 1. 핵심 Q&A: 물리적 멀티레포와 프로젝트 구조 설계

### Q1. 실제 서비스를 목표로 물리적 멀티레포(Polyrepo)를 채택할 때, Git 관리 외에 멀티레포를 직접 해봐야만 학습할 수 있는 핵심 요소가 있나요?

단순히 Git 저장소를 여러 개로 쪼개는 것 자체보다, **저장소와 폴더가 물리적으로 격리되었을 때 발생하는 아래 5가지 엔지니어링 과제**가 실제 MFE 실무의 핵심입니다.

1. **로컬 파일 참조(`import '../../shared'`) 불가능에 따른 '원격 타입 계약(Type Contract)' 동기화**:
   - 모노레포에서는 옆 폴더의 타입 파일을 그냥 `import`하면 끝이지만, 멀티레포에서는 다른 앱의 소스 파일이 내 폴더에 존재하지 않습니다.
   - 따라서 Module Federation 2.0의 **`dts` 플러그인(`@mf-types` 원격 타입 자동 다운로드)**이나 API 스키마를 통해 **"코드는 떨어져 있어도 TypeScript 자동완성과 타입 검사는 완벽히 동작하게 만드는 원격 계약"**을 직접 구성해 볼 수 있습니다.
2. **하위 호환성(Backward Compatibility)과 계약 파기(Breaking Change) 방어**:
   - 모노레포에서는 리모트 컴포넌트의 `Props` 이름을 바꾸면 호스트 코드도 한 커밋에 같이 고칠 수 있습니다.
   - 하지만 멀티레포에서는 각 서비스가 따로 배포되므로, 리모트가 함부로 필수 `Props`를 바꾸면 이미 배포된 호스트가 런타임에 깨집니다. 이를 통해 **옵셔널 파라미터 확장, 버전별 엔트리 분리 등 안전한 인터페이스 진화 방법**을 체득하게 됩니다.
3. **작업 스코프(Scope) 격리와 팀 간 경계 체험**:
   - 한 번의 브랜치 작업에서 여러 서비스를 동시에 건드리지 못하고, **오직 승인된 하나의 서비스 폴더(예: `apps/remote-products`) 안에서만 문제를 해결해야 하는 제약**을 경험합니다.
   - 이 제약을 통해 자연스럽게 *"다른 앱의 내부 코드를 직접 고치는 대신, 어떻게 이벤트나 공개 인터페이스로 느슨하게 소통할 것인가?"*를 고민하게 됩니다.
4. **하이브리드 로컬 개발 환경 (내가 맡은 앱 1개만 로컬로 띄우고 나머지는 원격 연결)**:
   - 실무 멀티레포에서는 10개의 마이크로 앱을 내 PC에서 다 띄우지 않고, 내가 작업 중인 `remote-cart` 1개만 로컬로 띄운 채 호스트는 개발 서버(Staging) URL을 바라보게 하거나 `Module Federation DevTools` 프록시로 연결합니다.
5. **독립 빌드 및 배포 파이프라인 분리**:
   - 특정 마이크로 앱 하나만 수정되었을 때 전체 프로젝트를 다시 빌드하지 않고 해당 앱만 독립적으로 테스트·빌드·배포하는 파이프라인 구조를 학습할 수 있습니다.

---

### Q2. 멀티레포로 나누면 레포지토리가 여러 개가 되는데, 공통 문서와 설정 파일들은 각 레포지토리에 다 들어가야 하나요?

문서의 성격에 따라 **① 각 서비스 레포지토리에 속하는 문서**와 **② 중앙에서 동기화하는 공통 거버넌스 문서**로 명확히 나뉩니다.

1. **각 서비스(`apps/<서비스>/docs/`) 내부에 직접 들어가야 하는 문서 (높은 응집도)**:
   - 해당 서비스의 할 일 목록(`docs/todo.md`)과 매 브랜치 작업마다 생성되는 기획·설계서(`01-plan-and-design.md`) 및 TDD 명세서(`02-tdd-spec.md`)는 **그 서비스 코드와 생명주기를 함께하는 문서**입니다.
   - 따라서 루트 한 곳에 몰아넣지 않고 **각 앱 폴더 아래(`apps/<서비스>/docs/features/YYYYMMDD-<작업명>/`)**에 두어야, 나중에 해당 앱 폴더를 별도의 물리적 Git 레포지토리로 그대로 떼어내도 그 서비스의 기획·설계·테스트 히스토리가 유실 없이 100% 함께 이동합니다.
2. **전사 공통 워크플로우·컨벤션·AI 하네스 문서 (중앙 거버넌스 & 자동 동기화)**:
   - 코딩 컨벤션, 5단계 TDD 워크플로우, `GEMINI.md`, `.agents/hooks.json`, 문서 템플릿(`docs/templates/`)은 모든 서비스가 동일하게 따라야 하는 공통 규약입니다.
   - 우리 학습 환경에서는 루트 폴더에서 한 번에 관리하며, 실제 물리적 멀티레포로 쪼갤 때는 **AI CLI가 실행될 때 도는 `SessionStart` 라이프사이클 훅**을 이용해 중앙 거버넌스 레포의 버전을 체크하고 다를 경우 자동으로 `git pull`(또는 스크립트 패치)로 최신 문서를 가져오도록 구성합니다. *(상세 원리는 [Study 03](./03-ai-harness-and-tdd-workflow-guide.md) 참고)*

---

### Q3. 왜 루트에도 `todo.md`가 있고, 각 마이크로 앱(`apps/<서비스>/docs/todo.md`)에도 각각 `todo.md`가 있나요?

* **루트 [`todo.md`](../../todo.md)의 역할**:
  1. 프로젝트 전체(Phase 0 ~ Phase 4)가 현재 어디까지 진행되었는지 한눈에 보여주는 **전체 마스터 현황판** 역할
  2. 루트 워크스페이스 자체(`Scope: root` — 공통 설정, `Turborepo`, `Biome`, AI 하네스 스크립트 등)에서 발생하는 할 일 관리
* **각 마이크로 앱 `apps/<서비스>/docs/todo.md`의 역할**:
  - `api`, `shared`, `products`, `cart`, `host-vite`, `host-rspack` 각 독립 서비스 내부의 세부 기능 백로그와 완료 이력을 독립적으로 추적하는 문서입니다.
* **주의사항**: 루트에는 최상단 `/todo.md` 하나만 두며, `/docs/todo.md`를 중복해서 만들지 않습니다.

---

### Q4. 각 앱의 `docs/features/YYYYMMDD-<작업명>/` 아래에 있는 `01-plan-and-design.md`와 `02-tdd-spec.md`에는 각각 어떤 내용이 들어가나요?

매 브랜치 작업을 시작할 때마다 해당 서비스의 `docs/features/YYYYMMDD-<작업명>/`(날짜는 연월일 사이 대시 없이 8자리 숫자로 표기, 예: `20261022-catalog-list`) 폴더를 만들고 아래 두 문서를 세트로 작성합니다.

| 문서 파일명 | 작성 시점 | 핵심 수록 내용 |
| :--- | :---: | :--- |
| **`01-plan-and-design.md`**<br>*(기획 및 상세 설계서)* | **1단계**<br>(요구사항 분석 직후) | - 작업 메타데이터(스코프 ID, 브랜치명, 기술 스택)<br>- 기획 배경 및 MFE 아키텍처 학습 포인트<br>- `Context7` MCP를 통한 최신 라이브러리 스펙 확인 요약<br>- 생성·수정할 파일 목록 및 인터페이스(`/** */` JSDoc 포함) 설계<br>- **[조건부]** 프론트엔드 MFE(`exposes`/`remotes`/이벤트) 또는 백엔드 3종 SQL 변경 계획 |
| **`02-tdd-spec.md`**<br>*(TDD 테스트 명세서)* | **2단계**<br>(본 코드 구현 전 승인 요청 시) | - 테스트 러너(`Vitest`) 및 실행 명령어<br>- 정상 동작 테스트 시나리오(`Given - When - Then`)<br>- 예외 및 경계값 시나리오(네트워크 에러, 빈 값, 리모트 장애 등)<br>- 모킹(`Mock`) 및 픽스처(시드 데이터) 전략<br>- **[조건부]** MFE 단독 실행·장애 격리 체크리스트 또는 DB 3종 SQL 멱등성·해시 검증 체크리스트 |

---

### Q5. 서비스마다 번들러(Vite, Rspack)와 기술 스택(React, Express/SQLite)이 다른데, 어떻게 하나의 공통 템플릿(`docs/templates/`)으로 사용할 수 있나요?

프레임워크나 번들러가 달라도 소프트웨어 설계와 TDD의 본질적인 뼈대는 같기 때문에, 템플릿을 **`[공통 필수 섹션 (80%)] + [스택별 조건부 섹션 (20%)]`** 하이브리드 구조로 설계했습니다.

1. **공통 필수 섹션**: 작업 메타데이터, 기획 의도, `Context7` 스펙 조회, 변경 파일 목록, 인터페이스 정의, `Given-When-Then` 테스트 시나리오는 프론트엔드든 백엔드든 루트 작업이든 100% 동일하게 작성합니다.
2. **조건부 섹션 (`[조건부 A: 프론트엔드/MFE]` vs `[조건부 B: 백엔드/3종 SQL]`)**:
   - 프론트엔드(`shared`, `products`, `cart`, `host-*`) 작업일 때는 **조건부 A**를 작성하고 **조건부 B**는 `N/A (해당 없음)`으로 표기합니다.
   - 반대로 백엔드(`api`) 작업일 때는 **조건부 B**를 작성하고 **조건부 A**는 `N/A`로 표기합니다.
   - 덕분에 템플릿 파일을 여러 벌로 파편화하지 않고도 모든 서비스에서 일관된 포맷으로 문서를 생성하고 리뷰할 수 있습니다.

---

### Q6. 구체적인 화면 UI 디자인이 확정되지 않았는데, 왜 `remote-shared`의 공통 노출 컴포넌트(Ark UI/레이아웃)를 미리 정의하나요?

화면 디자인 시안(Figma 등)이 아직 완성되지 않은 초기 단계임에도 `remote_shared/ui`의 노출 컴포넌트(`Button`, `Heading`, `Select`, `Skeleton`, `Badge`, 레이아웃 8종)를 미리 규약하는 이유는 **MFE의 '사전 계약(Contract-First)' 특성과 의존성 격리 원칙** 때문입니다.

1. **의존성 격리와 단일 창구 캡슐화 ([Study 05 #09, #11](./05-fullstack-service-real-world-issues.md))**:
   - `remote-products`, `remote-cart`, `host-*` 앱은 `@ark-ui/react`나 `clsx`를 각자 package.json에 직접 설치하지 않고, 오직 `remote_shared/ui`에서만 컴포넌트를 가져다 쓰도록 아키텍처가 통제됩니다.
   - 만약 공통 모듈이 무엇을 노출할지 사전에 계약되어 있지 않으면, 각 리모트 앱 개발자들은 각자 독자적인 UI 라이브러리를 설치하거나 로컬 컴포넌트를 난립시켜 MFE 공통 디자인 시스템이 완전히 무너집니다.
2. **비주얼이 아닌 '기능적 시나리오' 역산 도출**:
   - 지금 정의된 컴포넌트는 픽셀 단위 비주얼이 아니라, **Phase 1의 핵심 시나리오(상품 목록 조회, 장바구니 담기/삭제, 로딩 지연 스켈레톤, 패널 분할 대시보드, MFE 모니터 탭 전환)를 동작시키기 위해 반드시 필요한 최소 기능 프리미티브**를 역산하여 도출한 것입니다.
   - 예: 상품 담기 및 삭제(`Button`), 사용자 전환 드롭다운(`Select`), 1.5초 지연 로딩 시 CLS 방지(`Skeleton`), 대시보드 좌우 분할(`Splitter`), 모니터 화면 전환(`Tabs`).
3. **베이스라인(Baseline) 계약과 인터페이스 점진적 확장**:
   - 이 목록은 결코 고정불변이 아닙니다. Phase 1 구현을 시작하기 위한 **최소한의 출발선 약속(Baseline)**입니다.
   - 추후 화면 구현 중 추가 컴포넌트(예: Dialog, Input 등)가 필요해지거나 속성 확장이 필요해지면, 프로젝트 헌법의 **'인터페이스 재협의 프로토콜'**에 따라 `root` 정본 문서를 업데이트하고 언제든지 유연하게 확장할 수 있습니다.

---

## 2. 확정된 7대 공식 스코프(Scope ID) 및 브랜치 컨벤션 요약

모든 브랜치 작업과 스코프 잠금(`.agents/active-scope.json`)은 아래 **패턴 A (`<서비스명>/<작업타입>/<작업내용>`)** 규칙을 따릅니다.

| 공식 스코프 ID | 브랜치 프리픽스 예시 | 허용 작업 폴더 경로 | 포트 | 기술 스택 요약 |
| :---: | :--- | :--- | :---: | :--- |
| **`root`** | `root/chore/init-harness` | 루트 설정 / `docs/**` / `.agents/**` / `scripts/**` | - | `Turborepo`, `Biome`, `Node.js` |
| **`api`** | `api/feat/sqlite-schema` | `apps/api-server/**` | `4000` | `Express`, `TypeScript`, `SQLite` |
| **`shared`** | `shared/feat/ark-ui-button` | `apps/remote-shared/**` | `3004` | `Vite`, `React`, `Ark UI` |
| **`products`** | `products/feat/catalog-list` | `apps/remote-products/**` | `3002` | `Vite`, `React`, `TanStack Query` |
| **`cart`** | `cart/feat/cart-widget` | `apps/remote-cart/**` | `3003` | `Rspack(Rsbuild)`, `React` |
| **`host-vite`** | `host-vite/feat/dashboard` | `apps/host-vite/**` | `3000` | `Vite`, `React`, `@module-federation/vite` |
| **`host-rspack`** | `host-rspack/feat/dashboard` | `apps/host-rspack/**` | `3001` | `Rspack`, `React`, `@module-federation/rsbuild-plugin` |

---

## 3. 코드 6대 주석 원칙 및 DB 3종 SQL 관리 핵심 요약

1. **코드 6대 주석 원칙 (에디터 인텔리센스 극대화)**:
   - ① 인터페이스·타입 내부의 **모든 속성(Property)마다 `/** ... */` JSDoc 주석** 필수 작성 (마우스 호버 시 한글 설명 표시)
   - ② 모든 함수·컴포넌트·커스텀 훅 상단 JSDoc(`@param`, `@returns`) 필수
   - ③ 주요 상수·상태(`useState`/`useRef`) 용도 주석 필수
   - ④ 주요 분기문(`if/else`, `switch`)에 **"왜(Why) 이 분기가 필요한지"** 의도 주석 필수
   - ⑤ 파일 최상단 헤더(`@file`, `@app`, `@exposed`, `@description`) 필수
   - ⑥ 코드 수정 시 관련 주석 동시 업데이트 필수
2. **내장 SQLite DB 3종 SQL 파일 상시 세트 관리 (`apps/api-server/sql/`)**:
   - 외부 DB 설치 없이 단일 파일(`mfe_study.db`)로 동작하며, 항상 아래 3개 쿼리 파일을 세트로 유지합니다:
     - `01-schema.sql`: 전체 테이블·인덱스 생성 + 인라인 주석 + `_schema_comments` 한글 설명 메타 테이블 등록
     - `02-reset-seed.sql`: 기존 데이터 초기화 및 기본 시드 데이터 재삽입
     - `03-drop-all.sql`: 모든 테이블·인덱스 깔끔 삭제(`DROP ... IF EXISTS`)
   - 3개 파일의 SHA-256 해시를 `.sql-hashes.json`에 기록하고, 훅 스크립트(`verify-sql-sync.mjs`)로 누락 여부와 순차 실행(`03 -> 01 -> 02`) 무결성을 자동 검증합니다.

---

## 4. MFE 미경험자가 실무에서 마주치는 14대 기술적 함정과 해결 아키텍처 안내

단일 프로젝트(모놀리식)에서는 겪지 않지만 MFE와 물리적 멀티레포 구조이기 때문에 발생하는 **14가지 실전 고유 이슈**(싱글톤 `eager` 에러, 에셋 404, 다중 포트 `CORS`, 전역 CSS Reset 덮어쓰기 참사, `z-index` 전쟁, 침묵의 Context 단절, 라우터 히스토리 충돌, 좀비 이벤트 리스너, `localStorage` 키 충돌, `Vitest` 리모트 모킹, `ChunkLoadError` 등)의 상세 원리와 해결 코드는 전용 학습 문서인 **[Study 04. MFE 미경험자는 미리 알 수 없는 14대 실전 이슈와 해결 아키텍처](./04-mfe-real-world-pitfalls-and-solutions.md)**에서 집중적으로 다룹니다.

---

## 5. 서비스 내부 코드 및 테스트 코드 폴더 아키텍처 의사결정 (Step 0.1)

### Q6. 왜 MFE 마이크로 앱 내부에는 정통 6계층 FSD(`Feature-Sliced Design`) 대신 `exposed/` + 경량 FSD 세그먼트(`ui`, `api`, `model`) 하이브리드 구조를 채택했나요?

1. **정통 Full FSD(`app -> pages -> widgets -> features -> entities -> shared`)의 MFE 적용 시 한계**:
   - 정통 FSD는 하나의 거대한 모놀리식 프론트엔드 안에서 수십 개의 도메인이 뒤엉키는 것을 막기 위해 고안된 6계층 구조입니다.
   - 하지만 **MFE 환경에서는 이미 `remote-products`(상품), `remote-cart`(장바구니), `remote-shared`(공통)처럼 마이크로 앱 단위로 도메인 슬라이스가 물리적으로 분리**되어 있습니다. 각 마이크로 앱 내부에 또 6개 레이어를 모두 만들면 폴더 깊이만 깊어지는 오버엔지니어링이 발생합니다.
2. **MFE 맞춤형 하이브리드 폴더 구조 (`exposed/` + `features/{ui,api,model}` + `testing/`)**:
   - **`src/exposed/` (공개 진입점 격리)**: `vite.config.ts` / `rsbuild.config.ts`의 `exposes`에 등록되는 외부 노출 컴포넌트(예: `ProductList.tsx`, `CartWidget.tsx`)를 전용 폴더로 분리하여, 내부 폴더 구조를 리팩터링하더라도 외부 호스트와의 계약(Public Contract)이 절대 깨지지 않도록 보호합니다.
   - **`src/features/<도메인>/` (경량 FSD 세그먼트 응집)**: 기능 폴더 내부를 FSD의 핵심 세그먼트인 **`ui/`**(화면 컴포넌트·스타일), **`api/`**(`TanStack Query` 훅·`ky` 호출), **`model/`**(`Zod` 스키마·타입·도메인 로직)로 나누어 기술적 목적별 응집도를 극대화합니다.
   - **백엔드(`apps/api-server`)의 `app.ts` / `server.ts` 분리 및 도메인 모듈화**:
     - Express 앱 조립(`src/app.ts`)과 실제 포트 리스닝(`src/server.ts`)을 분리하여, `Vitest + Supertest` 실행 시 4000번 포트를 실제로 띄우지 않고도 메모리 상에서 즉시 REST API를 테스트할 수 있게 구성합니다.
     - 라우터·서비스·`Zod` 검증 스키마는 `src/modules/{products,cart,auth}/` 아래에 도메인별로 응집합니다.

### Q7. 테스트 코드(`Vitest`)는 왜 `Co-location`(파일 옆 배치)과 `testing/` · `__tests__/` 분리 방식을 함께 쓰나요?

| 구분 | 배치 위치 | 대상 파일 및 설계 의도 |
| :--- | :--- | :--- |
| **단위·컴포넌트 테스트**<br>(`Co-location`) | **소스 파일 바로 옆**<br>(예: `src/ui/Button.test.tsx`) | - 개별 컴포넌트, 커스텀 훅, 유틸리티 함수의 단위 TDD 테스트<br>- 코드와 테스트가 한 폴더에 붙어 있어 수정 시 누락이 없고 에이전트 탐색 속도가 가장 빠름 |
| **원격 스텁 & API 모킹**<br>(`Testing Infra`) | **`src/testing/`**<br>(`stubs/`, `msw/`) | - 다른 마이크로 앱(`remote_shared/*`, `remote_products/*`)을 대체하는 로컬 테스트 스텁(`vitest.config.ts` alias 연결)<br>- 백엔드 서버 없이 네트워크 레벨에서 API를 가로채는 `MSW` 핸들러 보관 |
| **시나리오 통합 테스트**<br>(`Integration`) | **`src/__tests__/`** | - 여러 슬라이스가 결합된 전체 화면 시나리오 테스트<br>- 백엔드 DB 3종 SQL(`01 -> 02 -> 03 -> 01`) 전체 생명주기·해시·외래키 멱등성 통합 테스트 |

### Q8. 여러 마이크로 앱 간 연계가 필요한 기능은 어떻게 설계하고, 개발 중 인터페이스 변경이 생기면 어떻게 처리하나요? (SSOT 정본 참조 원칙)

물리적 멀티레포처럼 각 앱을 스코프 잠금 상태로 개별 개발할 때 앱 간 인터페이스가 어긋나는 것을 막기 위해 아래 **3단계 정본(SSOT) 거버넌스 프로세스**를 따릅니다.

1. **`root` 브랜치에서 공통 설계 선행 작성 및 머지**:
   - 여러 서비스(`api`, `shared`, `products`, `cart`, `host-*`)가 서로 맞물리는 연계 작업은, 개별 앱 브랜치를 따기 전에 먼저 **`root` 스코프에서 브랜치(예: `root/docs/phase1-service-contracts`)를 생성**합니다.
   - 루트에서 본 코드 구현이 없다면 공통 설계 문서(`docs/features/YYYYMMDD-<작업명>/01-plan-and-design.md`)만 작성하여 승인받고 `main`에 먼저 머지합니다.
2. **각 앱 설계서 작성 시 내용 복붙(재작성) 금지 & '항목(제목)' 참조 원칙**:
   - 이후 각 마이크로 앱 브랜치에서 해당 앱의 `01-plan-and-design.md`를 작성할 때는 루트 공통 설계 문서에 이미 정의된 스펙을 복사해 다시 적지 않고, **상대 경로 링크와 루트 문서의 해당 '항목(섹션 제목)'을 가리키는 참조 형태**로만 작성합니다.
   - **왜 내용을 적지 않고 항목(제목)만 가리키나요?**: 만약 각 앱 문서에 세부 내용을 복사해 적어두면, 나중에 루트 설계 내용이 수정될 때 6개 앱의 문서를 전부 다시 고쳐야 하기 때문입니다. 항목(제목)만 가리키면 루트 정본만 수정해도 모든 앱의 참조 무결성이 그대로 유지됩니다.
3. **앱 작업 중 인터페이스 재협의 발생 시 '앱 브랜치 홀드 → 루트 정본 업데이트 머지 → 재개' 프로토콜**:
   - 특정 앱을 개발하던 도중 인터페이스 재협의가 필요해 루트 공통 설계 문서를 수정해야 한다면, **작업 중이던 앱 브랜치를 즉시 홀드(`git stash` 또는 WIP 커밋 대기)**합니다.
   - 다시 **`root` 스코프에서 브랜치를 재생성하여 루트 정본 설계 문서를 업데이트하고 `main`에 머지**한 뒤, 홀드했던 앱 브랜치에서 최신 `main` 정본을 받아(`merge`/`rebase`) 이어서 작업을 진행합니다.

### Q9. 멀티레포에서 싱글톤 라이브러리 버전 불일치와 Windows/Mac 네이티브 SQLite 빌드 문제는 어떻게 방지하나요?

1. **`pnpm-workspace.yaml`의 `catalog:` 기능을 통한 전사 버전 잠금**:
   - 각 마이크로 앱은 로컬 코드를 공유하지 않지만, `react`, `react-dom`, `@tanstack/react-query`, `@ark-ui/react`, `zod` 등 런타임에 공유되는 패키지의 버전이 앱마다 다르면 싱글톤 협상 경고가 발생합니다.
   - 이를 방지하기 위해 `pnpm-workspace.yaml`의 `catalog:`에 공통 버전을 중앙 선언하고 각 앱의 `package.json`에서는 `"react": "catalog:"`로 참조하여 버전 드리프트(Version Drift)를 원천 차단합니다.
2. **외부 C++ 컴파일(`node-gyp`)이 전혀 필요 없는 Node.js 22 공식 내장 `node:sqlite` (`DatabaseSync`) 채택**:
   - `better-sqlite3` 같은 C++ 네이티브 애드온은 Windows PowerShell 환경에서 Visual Studio C++ Build Tools 유무에 따라 설치 에러가 자주 발생합니다.
   - 반면 **Node.js `v22.5.0+`(현재 환경 `v22.17.0`)에는 공식 내장 모듈인 `node:sqlite` (`DatabaseSync`)가 기본 탑재**되어 있어, 외부 프로그램이나 C++ 바이너리 컴파일이 단 1%도 필요 없이 `apps/api-server/mfe_study.db` 단일 파일과 인메모리(`:memory:`) TDD 테스트를 100% 순수 Node.js만으로 완벽하게 구동할 수 있습니다.

---

## 6. 실무 표준 패칭·폼·날짜·유틸리티·모킹 라이브러리 선정 및 역할 (Step 0.2)

단순히 유명한 라이브러리를 나열하는 것이 아니라, **[Study 04 (MFE 14대 이슈)](./04-mfe-real-world-pitfalls-and-solutions.md)** 및 **[Study 05 (풀스택 16대 이슈)](./05-fullstack-service-real-world-issues.md)**에서 도출한 실전 문제들을 해결하기 위해 아래 표준 라이브러리를 선정했습니다.

| 영역 | 선정 라이브러리 | 핵심 아키텍처 역할 및 프로젝트 내 활용처 |
| :---: | :--- | :--- |
| **서버 상태 관리 &<br>클라이언트 패칭** | **`@tanstack/react-query` (v5)**<br>+ **`ky`** | - **`TanStack Query`**: `useSuspenseQuery`, `useSuspenseQueries`(병렬 호출로 Waterfall 방지), `useMutation`, 그리고 MFE 마이크로 앱 간 싱글톤 캐시 무효화(`invalidateQueries`)를 담당하는 메인 서버 상태 엔진<br>- **`ky` (`axios`의 최신 초경량 대체재)**: 브라우저 표준 `fetch`를 감싼 약 3KB 크기의 모던 HTTP 클라이언트입니다.<br>  1. **기본 `fetch`의 불편함 해소**: 내장 `fetch`는 `404`/`500` 에러 시에도 `catch`로 빠지지 않아 매번 `if (!res.ok)`를 수동 작성해야 하고 `await res.json()`을 두 번 호출해야 하지만, `ky`는 `await ky.get('/api/products').json()` 한 줄로 처리하며 `4xx/5xx` 응답 시 자동으로 `HTTPError` 예외를 던져줍니다.<br>  2. **`axios` 대비 강점**: 구형 `XMLHttpRequest` 기반인 무거운 `axios`와 달리 최신 표준 `fetch` 및 `AbortController` 기반이라 가볍고, `TanStack Query`가 전달하는 `AbortSignal`(`signal`)을 그대로 받아 **[Study 05 #01] 응답 역전(`Race Condition`) 자동 취소**를 완벽히 수행합니다. |
| **폼 상태 관리 &<br>런타임 스키마 검증** | **`react-hook-form`**<br>+ **`@hookform/resolvers`**<br>+ **`zod`** | - **`React Hook Form`**: 비제어 컴포넌트 기반 리렌더링 최적화 및 헤드리스 UI(`Ark UI Select` 등) `<Controller />` 연동 실습<br>- **`Zod`**: 정적 타입 추론(`z.infer`)과 런타임 파싱(`safeParse`)을 동시에 제공하여 **[Study 05 #10] 3대 외부 경계(① 백엔드 API 요청/응답, ② `mfeEventBus` 이벤트 페이로드, ③ `localStorage` 데이터)**의 런타임 오염을 방어하고 `@hookform/resolvers/zod`로 폼 검증과 직결 |
| **날짜·시간 처리** | **`date-fns`** (`ko` 로케일) | - `dayjs`처럼 전역 프로토타입을 `extend`하지 않는 **순수 함수형·불변(Immutable) 구조**라 MFE 다중 앱 환경에서 전역 충돌 위험이 0%이며 트리 쉐이킹이 완벽함<br>- **[Study 05 #04]** 시간대(`UTC` vs `KST`) 일관성 유지 및 `remote-shared/utils`의 공통 날짜 포맷터(`formatDate`, `formatRelativeTime` — `"방금 전"`, `"3분 전"`) 구현 |
| **범용 유틸리티** | **`es-toolkit`** | - `lodash` 대비 2~3배 빠르고 번들 크기가 최대 97% 작은 최신 TypeScript 표준 유틸리티<br>- 호스트 **[🐢 1.5초 로딩 지연 시뮬레이션 토글]**(`delay(1500)`), 검색·수량 입력 제어(`debounce`, `throttle`), 장바구니 카테고리별 그룹핑 및 합산(`groupBy`, `sumBy`, `uniqBy`)에 활용 |
| **헤드리스 UI &<br>조건부 클래스 결합** | **`@ark-ui/react`**<br>+ **`clsx`** | - **[참고 Q&A 1: 호스트 앱(`host-*`)에서도 대시보드 페이지 레이아웃과 스타일을 구성해야 하는데, 왜 `@ark-ui/react`와 `clsx`를 직접 설치하지 않고 `remote-shared/ui`에서 export한 것을 가져다 쓰나요?]**<br>  1. **조립 보일러플레이트 및 스타일 중복 제거**: `Ark UI`는 무스타일(Unstyled) 다중 파츠(`<Select.Root>`, `<Splitter.Root>`, `<Splitter.Panel>` 등) 구조이므로 호스트나 각 앱에서 직접 쓰면 10줄 이상의 조립 코드와 CSS를 앱마다 중복 작성해야 합니다. `remote-shared/ui`에서 테마 변수와 `--z-*` 토큰을 입혀 캡슐화하면 각 앱은 단일 컴포넌트로 즉시 재사용할 수 있습니다.<br>  2. **레이아웃 컴포넌트 및 `clsx` 단일 창구 제공 (`Re-export`)**: `apps/remote-shared/src/exposed/ui.ts`에서 인터랙티브 레이아웃(`Splitter`, `Tabs`, `Collapsible`), 정적 레이아웃(`Container`, `Grid`, `Flex`, `Stack`, `Card`), 기본 컴포넌트(`Button`, `Heading`, `Select`, `Badge`, `Skeleton`)와 함께 **`export { clsx } from 'clsx'`로 `clsx`까지 다시 `export`(재노출)**합니다. 따라서 호스트 앱에서도 `import { Container, Splitter, Flex, clsx } from 'remote_shared/ui'` 한 줄로 레이아웃과 스타일 결합 유틸을 모두 사용할 수 있으며, `@ark-ui/react`와 `clsx`는 오직 `apps/remote-shared/package.json`에만 설치합니다.<br>  3. **실무 트레이드오프 메모 (장애 격리 관점)**: `clsx`를 `remote_shared/ui`에서 재노출해 쓰면 의존성 단일화에는 유리하지만, 만약 `remote-shared` 서버(Port 3004)가 장애로 내려갔을 때 호스트 자체의 `RemoteErrorBoundary` 폴백 화면조차 `remote_shared/ui`의 `clsx`에 의존하면 에러 폴백 렌더링이 실패할 수 있습니다. 따라서 호스트의 `RemoteErrorBoundary` 등 필수 폴백 UI는 외부 원격 모듈 없이 순수 내장 스타일로 동작하도록 작성하거나, 실무에 따라 0.2KB 크기의 `clsx`만 공용 `catalog:`에 두고 각 앱에 직접 설치하는 절충안을 택할 수도 있습니다.<br>- **[참고 Q&A 2: `Ark UI`는 `shadcn/ui`처럼 내부에 `clsx`가 이미 들어있지 않나요?]**<br>  - `shadcn/ui`는 컴포넌트 소스를 복사할 때 Tailwind 병합용 `cn`(`clsx` + `tailwind-merge`)을 함께 생성하지만, **`@ark-ui/react`는 순수 헤드리스 라이브러리로서 내부 상태머신(`@zag-js`)을 통해 DOM에 `data-state="open"`, `data-disabled`, `data-highlighted` 같은 표준 데이터 속성(`data-*`)을 자동 주입**하는 방식을 씁니다.<br>  - 따라서 ① 열림/비활성화 같은 상태 스타일은 `Ark UI`의 `[data-state]` CSS 선택자로 처리하고, ② 커스텀 `Props`(`variant`, `size`, 외부 `className`)를 합성할 때 **`clsx`**를 명시적으로 함께 사용합니다. |
| **TDD 네트워크 &<br>API 모킹** | **`msw`** (FE)<br>+ **`supertest`** (BE) | - **`MSW (Mock Service Worker)`**: 프론트엔드 마이크로 앱이 백엔드(`Port 4000`)를 띄우지 않고도 실제 `ky` + `TanStack Query` + `Suspense` 흐름 그대로 네트워크 레벨에서 API를 가로채어 단독 TDD 수행<br>- **`Supertest`**: 백엔드(`api-server`)의 `app.ts`를 포트 충돌 없이 메모리에서 직접 호출하여 REST API와 3종 SQL 연동을 검증 |



