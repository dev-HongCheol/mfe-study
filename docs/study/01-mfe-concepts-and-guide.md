# 📘 Study 01. 마이크로 프론트엔드(MFE) 개념 및 핵심 원리 학습 가이드

> **문서 목적**: 마이크로 프론트엔드를 처음 학습할 때 반드시 알아야 할 기본 원칙, 아키텍처 통합 패턴 비교, 자주 헷갈리는 핵심 개념(모노레포와의 관계, 다중 프레임워크 통합, 도구별 역할 차이, 브라우저 메모리와 상태 공유), 그리고 실습을 통해 검증할 주요 프로세스를 정리한 영구 학습 노트입니다.

---

## 1. 마이크로 프론트엔드(MFE)란 무엇인가?

### 1.1 기본 개념
백엔드의 마이크로서비스 아키텍처(`MSA`)를 프론트엔드 화면 영역에 적용한 설계 방식입니다.
하나의 거대한 프론트엔드 애플리케이션(모놀리식)을 비즈니스 도메인 단위(예: `공통 껍데기 호스트`, `상품 목록 앱`, `장바구니 앱`, `결제 앱`)로 쪼개어 **각각 별도의 프로젝트(서버)로 개발·빌드·배포**하되, 사용자 브라우저에서는 **하나의 웹사이트처럼 매끄럽게 합쳐서** 보여주는 기술입니다.

### 1.2 반드시 지켜야 할 2대 핵심 원칙
1. **독립적 개발 및 배포**
   - '장바구니 앱'의 코드나 디자인을 수정했을 때, '메인 호스트'나 '상품 앱'을 다시 빌드하지 않고 장바구니 앱만 배포해도 사용자 화면에 즉시 반영되어야 합니다.
2. **장애 격리**
   - 만약 '장바구니 서버'가 다운되거나 런타임 에러가 발생하더라도, 전체 웹사이트가 하얗게 멈추지 않고 장바구니 영역만 안내 화면(폴백 UI)으로 대체되며 나머지 기능(상품 조회 등)은 정상 작동해야 합니다.

---

## 2. 현업에서 가장 범용적으로 쓰는 통합 패턴 4가지 비교

프론트엔드 화면을 쪼개서 다시 합치는 방식은 크게 4가지가 있으며, 현재 업계 표준은 **① Module Federation**입니다.

| 통합 패턴 | 동작 원리 | 장점 | 단점 | 현업 활용도 |
| :--- | :--- | :--- | :--- | :--- |
| **① Module Federation**<br>*(런타임 모듈 통합)* | 메인 앱(**호스트**)이 브라우저에서 실행되는 도중에 하위 앱(**리모트**)의 JS 모듈(`remoteEntry.js`)을 네트워크로 실시간 로드 | - 진정한 독립 배포 가능<br>- React 등 공통 라이브러리 메모리 공유(중복 다운로드 방지)<br>- 한 화면 내 컴포넌트 단위 조합에 최적 | 번들러(Vite, Rspack, Webpack)의 Federation 설정 이해 필요 | ⭐⭐⭐⭐⭐<br>**(업계 표준 / 압도적 1위)** |
| **② Single-SPA**<br>*(메타 라우터 오케스트레이션)* | 최상위 라우터가 URL 경로에 따라 서로 다른 프레임워크 앱을 마운트(`mount`) / 언마운트(`unmount`) | 서로 다른 프레임워크(구형 Angular + 신규 React 등)를 URL 단위로 통합할 때 유리 | 모든 하위 앱에 생명주기 함수를 강제로 구현해야 하며 초기 설정 부담이 큼 | ⭐⭐⭐<br>*(레거시 전환 환경)* |
| **③ Web Components**<br>*(브라우저 표준 캡슐화)* | 각 마이크로 앱을 `<mfe-cart>` 같은 Custom Element와 Shadow DOM으로 감싸서 삽입 | 브라우저 표준이므로 프레임워크 종속성이 전혀 없고 CSS 스타일 격리가 완벽함 | React 등의 `Props`/상태 연동 및 이벤트 처리에 보일러플레이트 코드가 많아짐 | ⭐⭐⭐<br>*(독립 위젯 / 디자인 시스템)* |
| **④ Multi-Zones / Proxy**<br>*(URL 경로 단위 서버 분리)* | `/products`는 A 서버, `/cart`는 B 서버로 리버스 프록시(Nginx, Next.js 등)를 통해 라우팅 분리 | 프로젝트 간 결합도가 0에 수렴하며 구성이 매우 단순함 | **한 화면 안에 여러 마이크로 앱의 컴포넌트를 동시에 배치할 수 없음** | ⭐⭐⭐<br>*(페이지 단위 대형 포털)* |

> **💡 참고 (`<iframe>`을 현대 MFE에서 지양하는 이유)**
> 고전적인 `<iframe>`은 JS와 CSS를 완벽히 격리해주지만, 프레임마다 별도의 브라우저 실행 컨텍스트를 생성해 메모리·성능 오버헤드가 크고, 모달 창이 프레임 영역 밖(화면 중앙)으로 나오지 못하는 UI 제약, 브라우저 뒤로가기 및 URL 동기화 문제 때문에 외부 결제창 삽입 등 특수한 목적 외에는 사용하지 않습니다.

---

## 3. 핵심 Q&A: 아키텍처와 도구에 대한 깊은 이해

설계 과정에서 다룬 중요한 질문과 핵심 원리를 정리했습니다.

### Q1. Vite 기반 호스트와 Rspack 기반 호스트가 동일한 리모트 앱들을 코드 수정 없이 그대로 공유해서 쓸 수 있나요?
* **답변**: **네, 100% 그대로 공유해서 사용할 수 있습니다.**
* **원리**: Vite용 플러그인(`@module-federation/vite`)과 Rspack용 플러그인(`@module-federation/rsbuild-plugin`) 모두 **Module Federation 2.0 표준 규격(`remoteEntry.js` / `mf-manifest.json`)**을 준수합니다.
* 즉, 리모트 앱이 어떤 번들러(Vite든 Rspack이든 Webpack이든)로 만들어졌든 상관없이 표준 규격의 명세서(`remoteEntry.js`)만 네트워크로 열어두면, 어떤 호스트에서든 동일한 URL을 바라보고 컴포넌트를 실시간으로 가져다 쓸 수 있습니다.

---

### Q2. Module Federation은 순수 React끼리만 쓸 수 있나요? React + Vue, React + Angular 조합은 불가능한가요?
* **답변**: **전혀 아닙니다. 서로 다른 프레임워크(React + Vue + Angular + Svelte) 조합에서도 완벽히 사용할 수 있습니다.**
* **원리**: Module Federation은 React 전용 기능이 아니라 **번들러 레벨에서 JavaScript 모듈(함수, 객체)을 원격으로 주고받는 기술**입니다. 다만 같은 프레임워크끼리 쓸 때와 다른 프레임워크를 섞을 때 **노출(`exposes`)하는 코드 형태**에 차이가 있습니다:
  1. **동종 프레임워크 결합 (React 호스트 ↔ React 리모트)**:
     - 양쪽 모두 React 컴포넌트를 이해하므로 `<ProductList />` 컴포넌트 자체를 그대로 `export`하고 `React.lazy()`로 불러와 바로 렌더링합니다.
  2. **이종 프레임워크 결합 (React 호스트 ↔ Vue / Angular 리모트 — `mount` 함수 패턴)**:
     - React는 `.vue` 파일이나 Angular 컴포넌트를 직접 그릴 줄 모릅니다.
     - 따라서 Vue/Angular 리모트 앱은 컴포넌트 대신 **"빈 DOM 태그(`HTMLElement`)를 넘겨주면 그 안에 내 프레임워크로 화면을 그려주는 순수 JS 함수(`mount`)"**를 노출합니다.
     ```ts
     // [Vue 리모트가 외부에 노출하는 mount.ts 예시]
     import { createApp } from 'vue';
     import VueCartWidget from './VueCartWidget.vue';

     export function mount(containerElement: HTMLElement, initialProps: unknown) {
       const app = createApp(VueCartWidget, initialProps);
       app.mount(containerElement); // 전달받은 빈 div 안에 Vue 앱을 마운트!
       return () => app.unmount();  // 컴포넌트가 사라질 때 정리(cleanup)할 함수 반환
     }
     ```
     - 그러면 React 호스트는 빈 `<div ref={containerRef} />`만 하나 만들어 두고, `useEffect` 안에서 리모트의 `mount(containerRef.current)` 함수를 호출하기만 하면 React 화면 한가운데에 Vue나 Angular 앱이 렌더링됩니다. *(Module Federation 2.0은 이를 자동화한 `@module-federation/bridge-react`, `@module-federation/bridge-vue3` 라이브러리도 제공합니다.)*

---

### Q3. 모노레포(Monorepo) vs 멀티레포(Polyrepo / Multi-repo): MFE에는 무엇이 맞나요?
* **용어 정리**:
  - **모노레포 (`Monorepo`)**: 하나의 큰 Git 저장소 안에 여러 프로젝트를 넣어 관리하는 방식
  - **멀티레포 / 폴리레포 (`Multi-repo` / `Polyrepo`)**: 각 마이크로 프론트엔드 앱을 아예 별도의 독립된 Git 저장소로 쪼개서 관리하는 방식
* **모노레포 로컬 참조의 함정과 진짜 독립 MFE 구조**:
  - 만약 모노레포라고 해서 공통 컴포넌트나 타입을 로컬 폴더 참조(`workspace:*`)로 가져다 쓰면, 나중에 특정 앱을 별도의 Git 저장소(멀티레포)로 분리할 때 코드가 깨지고 서로 강하게 묶이게 됩니다.
  - 따라서 **가장 이상적인 MFE 학습 및 실무 구조**는 각 앱(`host-vite`, `host-rspack`, `remote-products`, `remote-cart`, `remote-shared`)이 **로컬 파일로는 서로를 단 1줄도 참조하지 않는 완전 독립(물리적 멀티레포 호환) 구조**를 유지하면서:
    1. **공통 UI(`Ark UI` 기반 컴포넌트·테마)와 유틸리티**조차도 독립된 리모트 서버(**`remote-shared`, 포트 `3004`**)로 띄워 **Module Federation 네트워크 로딩**으로만 공유하고,
    2. **TypeScript 타입**도 로컬 폴더 참조가 아니라 **Module Federation 2.0의 원격 타입 동기화(`dts` / `@mf-types`)**로 주고받는 것입니다.
  - 이렇게 구성하면 관리 편의상 한 폴더 안에 모아두었을 뿐, 내일 당장 6개의 별도 Git 레포지토리로 찢어놓아도 코드 수정 없이 100% 그대로 동작합니다.

---

### Q4. 왜 `pnpm workspaces`와 `Turborepo`를 함께 쓰나요? 그리고 `Biome`은 어떤 역할을 하나요?
* **`pnpm workspaces` + `Turborepo` 역할 분담**:
  - **`pnpm workspaces` (패키지 매니저)**: 하위 폴더들의 패키지를 설치하되, `npm`과 달리 각 앱의 `package.json`에 선언된 패키지만 엄격하게 격리(유령 의존성 차단)해 줍니다.
  - **`Turborepo` (태스크 오케스트레이터)**: 혼자서는 패키지를 설치하지 못하며, 워크스페이스 구조를 읽어들여 6개의 독립 서버(`백엔드 1 + 공통 리모트 1 + 도메인 리모트 2 + 호스트 2`)를 동시에 띄우거나(`turbo dev`) 병렬 빌드·캐싱(`turbo build`)을 지휘합니다.
* **`Biome` (`@biomejs/biome`) 포맷터 & 린터 선정 (`Biome` vs `OXC` 비교)**:
  - 기존의 느린 `ESLint + Prettier`를 대체하는 Rust 기반 초고속 도구는 `Biome`과 `OXC (Oxlint + Oxfmt)` 두 진영이 양분하고 있습니다.

  | 비교 항목 | **① `Biome` (`@biomejs/biome`) [선정 ⭐]** | **② `OXC` (`Oxlint` + `Oxfmt`)** |
  | :--- | :--- | :--- |
  | **핵심 특징** | 린터 + 포맷터 + Import 정렬이 **단 하나의 도구와 설정 파일(`biome.json`)**로 통합된 올인원 툴 | Vite 창시자(Evan You)의 VoidZero 팀이 만든 분리형 초고속 툴체인 (`Oxlint` + `Oxfmt`) |
  | **장점 및 선정 이유** | JS/TS/JSX뿐만 아니라 JSON, CSS까지 `biome.json` 파일 하나로 일괄 통제 가능하여 신규 프로젝트 관리에 최적 | 순수 속도는 더 빠르고 기존 ESLint 규칙 호환성이 높아 대규모 레거시 마이그레이션에 유리 |

---

### Q5. MFE 학습에 백엔드 API와 데이터베이스(DB)가 있으면 왜 좋은가요?
프론트엔드 화면만 합치는 것을 넘어, 백엔드와 DB가 함께 있으면 실무 MFE에서 가장 중요하게 다루는 **3가지 데이터 흐름**을 직접 검증할 수 있습니다:
1. **인증 토큰 공유**: 호스트에서 로그인해 발급받은 토큰을 각 리모트 앱이 어떻게 공유받아 각자 백엔드 API를 호출하는가?
2. **DB 영속성 기반의 앱 간 동기화**: `상품 앱(3002)`에서 [장바구니 담기] 클릭 → 백엔드 API(`POST /api/cart`)로 실제 SQLite DB에 저장 → 이벤트 발송 → `장바구니 앱(3003)`이 백엔드(`GET /api/cart`)에서 최신 DB 데이터를 다시 조회하여 화면 갱신.
3. **다중 호스트 간 데이터 일관성 확인**: DB에 데이터가 저장되므로, **`Vite 호스트(3000)`에서 담은 장바구니 내역이 `Rspack 호스트(3001)`를 열었을 때도 똑같이 유지되는 것**을 눈으로 확인할 수 있습니다.

---

### Q6. 현재 구조에는 서버 사이드 렌더링(SSR)이 없나요? Module Federation에서 SSR이 가능한가요?
* **답변**: 현재 설계한 기본 구조는 브라우저가 직접 리모트 모듈을 받아와 그리는 **100% CSR(Client-Side Rendering)** 방식입니다. 기술적으로 Module Federation 2.0은 Node.js 서버 간 원격 로딩(`@module-federation/node`)을 통한 **SSR도 지원하지만**, 학습 초기에는 CSR로 시작하는 것이 좋습니다.
* **이유 및 실무 패턴**:
  - 컴포넌트 단위 MFE에 SSR을 적용하려면 각 리모트 앱마다 **브라우저용 번들**과 **서버(Node)용 번들** 두 벌을 빌드하고 호스트 서버에서 하이드레이션(Hydration) 타이밍을 맞춰야 하므로 설정 복잡도가 3~4배 증가합니다.
  - 따라서 실무에서도 검색 엔진 최적화(SEO)가 중요한 서비스는 **① 페이지 뼈대(호스트)만 SSR로 그리고 내부 위젯(장바구니 등)은 CSR로 로드하는 하이브리드 방식**이나 **② 경로 단위 서버 분리(Next.js Multi-Zones)**를 주로 채택합니다.

---

### Q7. 공통 컴포넌트(`Ark UI` 기반 Button, H1~H5, Select, 테마)와 유틸리티도 리모트 서버(`remote-shared`)로 분리하나요?
* **답변**: **네! 로컬 폴더 참조(`workspace:*`) 대신, 공통 디자인 시스템과 유틸리티도 독립된 마이크로 앱(`remote-shared`, 포트 `3004`)으로 띄워 Module Federation으로 공유합니다.**
* **최신 React UI 라이브러리 트렌드 비교 및 `Ark UI (@ark-ui/react)` 선정 이유**:

  | 라이브러리 | 현재 위상 및 특징 | MFE 적합도 및 비고 |
  | :--- | :--- | :--- |
  | **`Ark UI` (`@ark-ui/react`)**<br>**[최종 선정 ⭐]** | Chakra UI 창시자 팀이 상태 머신(`Zag.js`) 기반으로 만든 공식 코어 헤드리스 UI (`Park UI`의 기반 코어이며 인기와 유지보수가 압도적) | **최적**: 빌드 타임 CSS 엔진 강제 없이 CSS 변수 테마와 깔끔하게 결합되며, React·Vue·Solid에서 100% 동일한 구조로 동작 |
  | **`shadcn/ui`** | 컴포넌트 소스를 내 프로젝트에 복사해 소유하는 업계 1위 표준 (최근 내부 엔진을 `Base UI`까지 확장) | 각 번들러(Vite, Rspack)마다 Tailwind CSS와 경로 별칭 설정을 중복 구성해야 하는 번거로움 존재 |
  | **`Base UI`** | MUI와 Floating UI 창시자들이 만든 무스타일(Headless) 프리미티브 라이브러리 | 자체 대형 디자인 시스템을 바닥부터 구축할 때 주로 사용 |
  | **`HeroUI` (구 NextUI)** | 처음부터 화려한 애니메이션과 디자인이 완성되어 나오는 Tailwind 기반 라이브러리 | 커스텀 테마 토큰 제어보다 완성형 스타일이 필요할 때 적합 |
  | **`Mantine`** | Tailwind 없이 100개 이상의 완성형 컴포넌트와 훅을 제공하는 올인원 라이브러리 1위 | 패키지 부피가 커서 경량 MFE 공유 예제보다는 단일 대형 앱에 적합 |

* **동작 원리 (`remote-shared`, 포트 `3004`)**:
  - `remote-shared`가 `@ark-ui/react` 기반 `<Button>`, `<Heading>`(`H1`~`H5`), `<Select>`, `ThemeProvider`, 그리고 공통 유틸리티(`mfeEventBus`, `formatCurrency`, `sharedQueryClient`)를 외부로 노출(`exposes`)합니다.
  - 호스트 2종과 도메인 리모트 2종은 로컬 파일 의존성 없이 런타임에 `3004`번 서버로부터 공통 UI와 테마를 받아와 렌더링합니다.

---

### Q8. 호스트와 리모트는 메모리가 따로인가요? 그리고 MFE에서 `TanStack Query`는 실제로 어떻게 사용하나요?

#### 1) 브라우저 메모리 동작 원리: "출발 서버만 다를 뿐, 브라우저에서는 단 하나의 JS 메모리를 공유합니다"
* **`<iframe>`과의 차이**: `<iframe>`은 프레임마다 별도의 브라우저 실행 컨텍스트가 생성되어 메모리가 완전히 격리됩니다(쿠키/스토리지/`postMessage` 필요).
* **Module Federation의 메모리**: 사용자가 `http://localhost:3000`(호스트)에 접속하면 브라우저에는 단 하나의 웹페이지(단 하나의 JS 힙 메모리 공간)만 열립니다. `3002`번(상품)과 `3003`번(장바구니) 서버에서 다운로드된 JS 코드는 이 **동일한 메모리 공간 안으로 로드되어 실행**됩니다. 따라서 쿠키나 세션스토리지를 거치지 않고도 JS 객체(메모리)를 직접 공유할 수 있습니다.

#### 2) 마이크로 프론트엔드에서 `TanStack Query (@tanstack/react-query)`를 사용하는 3가지 실제 방법

현업 MFE에서 `TanStack Query`를 연동할 때는 결합도와 독립성 수준에 따라 아래 **3가지 패턴** 중 하나를 선택해 구현합니다:

##### **패턴 ①: `shared` 싱글톤 설정 + 호스트의 `<QueryClientProvider>` 공유 (React 전용 통합 방식)**
가장 흔히 쓰이는 방식으로, 모든 앱이 단 하나의 `QueryClient` 메모리 캐시를 공유합니다.
1. **번들러 설정 (`vite.config.ts` / `rsbuild.config.ts`)**:
   호스트와 모든 리모트의 Module Federation 설정에 `@tanstack/react-query`를 **`singleton: true`**로 등록합니다. (이를 등록하지 않으면 각 앱이 서로 다른 React Context 인스턴스를 바라보게 되어 `"No QueryClient set"` 에러가 발생합니다.)
   ```ts
   shared: {
     react: { singleton: true },
     'react-dom': { singleton: true },
     '@tanstack/react-query': { singleton: true }, // ★ 브라우저 메모리에 단 1개만 로드!
   }
   ```
2. **호스트 앱 (`App.tsx`)**:
   최상위에서 `<QueryClientProvider client={queryClient}>`로 리모트 컴포넌트들을 감쌉니다.
3. **리모트 앱들 (`remote-products`, `remote-cart`)**:
   - `remote-cart(3003)`는 `useQuery({ queryKey: ['cart'], queryFn: fetchCart })`로 장바구니를 조회합니다.
   - `remote-products(3002)`는 상품 담기 `useMutation` 성공 시 `queryClient.invalidateQueries({ queryKey: ['cart'] })`를 호출합니다.
   - **결과**: 두 앱이 브라우저에서 **동일한 `queryClient` 메모리**를 바라보고 있으므로, `3002`번 앱이 캐시를 무효화하는 즉시 `3003`번 장바구니 앱이 자동으로 백엔드를 재조회하여 화면이 갱신됩니다!

##### **패턴 ②: `remote-shared`에서 `queryClient` 인스턴스 자체를 노출(`exposes`) + 진입점 분리 (단독 실행 완벽 지원 ⭐)**
*"단독으로 테스트할 때도 `<QueryClientProvider>`로 감싸야 하는데, 그럼 단독 실행 플래그(`isStandalone`)를 둬서 분기 처리해야 하나요?"*에 대한 실무 정석 해법입니다. **별도의 플래그(`if`)를 둘 필요가 전혀 없습니다.**

1. **원리 1 — 진입점(Entry Point) 파일 자체가 분리되어 있음**:
   - **호스트가 가져가는 파일 (`exposes: { './CartWidget': './src/exposed/CartWidget.tsx' }`)**: 순수하게 장바구니 UI만 들어있는 `CartWidget.tsx`입니다.
   - **단독 실행(`localhost:3003`)할 때만 열리는 파일 (`src/App.tsx`)**: 브라우저로 `localhost:3003`에 직접 접속했을 때만 실행되는 껍데기 파일이며, 호스트는 이 파일을 절대 부르지 않습니다.
   ```tsx
   // [1] src/exposed/CartWidget.tsx (호스트로 노출되는 알맹이 컴포넌트)
   export function CartWidget() {
     const { data } = useQuery({ queryKey: ['cart'], queryFn: fetchCart });
     return <div>장바구니 목록...</div>;
   }

   // [2] src/App.tsx (localhost:3003 단독 접속 시에만 실행되는 파일 - 플래그 불필요!)
   import { QueryClientProvider } from '@tanstack/react-query';
   import { sharedQueryClient } from 'remote_shared/utils';
   import { CartWidget } from './exposed/CartWidget';

   export default function StandaloneApp() {
     return (
       <QueryClientProvider client={sharedQueryClient}>
         <header>🛠️ 장바구니 단독 개발 모드 (Port 3003)</header>
         <CartWidget />
       </QueryClientProvider>
     );
   }
   ```
2. **원리 2 — 동일 `sharedQueryClient` 인스턴스는 중첩 감싸기도 안전함**:
   - 설령 `CartWidget.tsx` 내부에서 `<QueryClientProvider client={sharedQueryClient}>`를 한 번 더 감싸더라도, `remote-shared(3004)`에서 가져온 **동일한 `sharedQueryClient` 메모리 객체**를 넘기기 때문에 호스트의 프로바이더와 충돌하지 않고 100% 같은 캐시 메모리를 바라봅니다.
   - 또한 `TanStack Query` v5에서는 아예 프로바이더 없이 `useQuery({ queryKey: ['cart'], queryFn }, sharedQueryClient)`처럼 두 번째 인자로 클라이언트 객체를 직접 주입할 수도 있습니다.

##### **패턴 ③: 각 마이크로 앱이 자체 `QueryClient`를 갖되, 앱 간 동기화는 `CustomEvent`로 트리거하는 방식 (완전 독립·약결합 표준 ⭐)**
모놀리식처럼 서로의 내부 쿼리 키(`['cart']`)에 의존하거나 특정 프레임워크(React)에 묶이는 것을 방지하는 **가장 순수한 MFE 방식**입니다.
1. `remote-products`와 `remote-cart`는 각자 자기 내부의 독립된 `QueryClient`(또는 자체 Fetch 상태)를 가집니다.
2. `remote-products`에서 상품 담기 API 성공 시, 상대방의 쿼리 키를 직접 건드리는 대신 브라우저 표준 이벤트(`window.dispatchEvent(new CustomEvent('mfe:cart-updated'))`) 신호만 쏩니다.
3. `remote-cart`는 해당 이벤트 신호를 수신했을 때 **자기 자신의 `queryClient.invalidateQueries({ queryKey: ['cart'] })`**를 스스로 실행합니다.
4. **장점**: 각 앱의 `@tanstack/react-query` 버전이 달라도 충돌하지 않으며, 나중에 한쪽 앱을 Vue나 Angular로 교체해도 100% 그대로 동작합니다.

> 💡 **우리 테스트베드에서의 '비교 학습(A vs B)' 설계**:
> 어느 한 가지 방식만 정답처럼 보이지 않도록, 호스트의 `MfeInspector`(실시간 학습 모니터)에서 아래 두 가지 모드를 스위치로 실시간 전환하며 차이를 직접 관찰하도록 설계합니다:
> - **`Mode A` (약결합·독립형: `Remote별 독립 QueryClient + CustomEvent`)**: 각 리모트가 자체 `QueryClient`를 유지하고 `mfe:cart-updated` 이벤트 신호로 재조회를 트리거 (이종 프레임워크 호환성 및 독립성 극대화)
> - **`Mode B` (강결합·통합형: `remote-shared 싱글톤 sharedQueryClient + invalidateQueries`)**: 단일 `sharedQueryClient` 메모리 캐시를 공유하여 쿼리 키(`['cart']`)를 직접 무효화 (동일 React 생태계 내 코드 간결성 및 캐시 공유 극대화)

---

## 4. 실습에서 하나씩 눈으로 확인하고 학습할 6대 핵심 프로세스

우리가 구축할 테스트베드 화면(대시보드 및 실시간 학습 모니터)에서 직접 버튼을 눌러보며 확인할 6가지 프로세스입니다:

| 순서 | 프로세스명 | 화면 및 코드에서 확인할 핵심 포인트 |
| :---: | :--- | :--- |
| **①** | **리모트 모듈 동적 로딩** | 호스트(`3000`/`3001`)가 실행 중에 리모트(`3002`/`3003`/`3004`)의 `remoteEntry.js`를 네트워크로 불러와 한 화면으로 합치는 과정 확인 |
| **②** | **공통 의존성 싱글톤 공유** | 여러 프론트엔드 앱이 각각 `React`를 쓰더라도 브라우저 메모리에는 **단 1개의 React 인스턴스(`singleton: true`)**만 로드되어 공유되는지 확인 |
| **③** | **상태 동기화 아키텍처 비교 (`Mode A` vs `Mode B`)** | `MfeInspector`에서 스위치를 전환하며 **① `Mode A`: 리모트별 독립 `QueryClient` + `CustomEvent` 신호 방식(약결합)**과 **② `Mode B`: 싱글톤 `sharedQueryClient` + `invalidateQueries` 직접 무효화 방식(강결합)**의 이벤트·캐시·네트워크 흐름 차이를 직접 비교 관찰 |
| **④** | **인증 컨텍스트 공유** | 상단 호스트 헤더에서 로그인/유저 전환 시, 하위 리모트 앱들이 인증 상태와 토큰을 즉시 인식하여 해당 유저의 장바구니 DB를 불러오는 과정 확인 |
| **⑤** | **스타일(CSS) 격리 실험** | 두 리모트 앱이 같은 클래스명(`.mfe-btn`)을 썼을 때 발생하는 CSS 오염 현상과, **CSS Modules / 프리픽스**를 통해 스코프를 격리하는 방법 비교 |
| **⑥** | **장애 격리 & 독립 배포 실험** | 장바구니 서버(`3003`)를 강제로 껐을 때 전체 사이트가 죽지 않고 장바구니 영역만 **폴백 화면(재시도 버튼)**으로 전환되는지, 다시 켜거나 코드 수정 시 호스트 재빌드 없이 반영되는지 확인 |

---

## 5. 마이크로 프론트엔드(MFE) 실무 표준 디버깅 툴 및 동작 원리

마이크로 프론트엔드는 여러 서버에서 조각난 JS 파일들이 런타임에 합쳐지기 때문에 일반 단일 앱보다 디버깅이 까다롭습니다. 현업에서 이를 해결하기 위해 가장 범용적으로 사용하는 **무료(오픈소스 / 무료 티어) 3대 디버깅 도구**와 동작 방식입니다.

| 구분 | 도구 / 서비스명 | 비용 | 핵심 역할 |
| :--- | :--- | :---: | :--- |
| **① 런타임 브라우저 디버깅** | **Module Federation DevTools**<br>*(공식 Chrome 확장 프로그램)* | **무료**<br>(오픈소스) | 브라우저 개발자 도구(F12)에서 호스트↔리모트 연결 그래프, 공유 라이브러리 버전, 실시간 로컬 프록시 전환 제공 |
| **② 빌드 & 번들 진단** | **Rsdoctor**<br>*(`@rsdoctor/rspack-plugin`)* | **무료**<br>(오픈소스) | 번들 크기 분석, 노출(`exposes`)/소비(`remotes`) 모듈 명세 시각화, 중복 패키지 및 버전 충돌 사전 진단 |
| **③ 분산 에러 출처 추적** | **Sentry MFE Error Routing**<br>*(무료 Developer 플랜 / 자체 로거)* | **무료 티어** | 에러 발생 시 호스트 에러인지 특정 리모트(`상품` vs `장바구니`) 에러인지 콜스택 메타데이터(`moduleMetadata`)로 자동 판별·분류 |

### 5.1 ① Module Federation DevTools (런타임 시각화 & 프록시)
* **동작 방식**:
  - Module Federation 2.0은 빌드/실행 시 단순 JS 파일(`remoteEntry.js`) 외에도 전체 모듈 지도 역할을 하는 **`mf-manifest.json`** 파일을 함께 생성합니다.
  - 크롬 확장 프로그램인 **Module Federation DevTools**가 이 매니페스트와 브라우저의 `__FEDERATION__` 전역 객체를 읽어들여 개발자 도구 탭에 **실시간 모듈 의존성 그래프**를 그려줍니다.
* **핵심 기능 (로컬 오버라이드 프록시)**:
  - 예를 들어 배포된 상용 사이트(호스트)를 열어둔 상태에서, 크롬 확장 프로그램 설정만으로 `remote-cart`의 주소만 내 PC의 `http://localhost:3003/mf-manifest.json`으로 실시간 바꿔치기하여 테스트할 수 있습니다.

### 5.2 ② Rsdoctor (빌드 타임 번들 & 공유 의존성 정밀 진단)
* **동작 방식**:
  - Rspack/Rsbuild 및 Module Federation 공식 팀이 제공하는 빌드 분석 도구로, 프로젝트에 플러그인 한 줄만 추가하고 실행하면 로컬 웹 대시보드가 열립니다.
* **핵심 기능**:
  - *"현재 `remote-cart`가 외부에 노출한 컴포넌트의 실제 용량이 얼마인지"*, *"혹시 `react`나 `@tanstack/react-query`가 싱글톤으로 공유되지 않고 중복 번들링되지는 않았는지"*를 시각적인 차트로 진단해 줍니다.

### 5.3 ③ Sentry (또는 커스텀 스택 파서) 기반 분산 에러 출처 추적
* **MFE만의 고유한 문제**:
  - 브라우저에서는 `remote-products(3002)`나 `remote-cart(3003)`에서 발생한 런타임 에러도 결국 최상위 호스트(`3000`)의 전역 에러 핸들러(`window.onerror`)로 잡힙니다. 그래서 그냥 두면 **"어느 마이크로 앱(어느 팀)이 낸 버그인지"** 구분하기 어렵습니다.
* **동작 방식 (`moduleMetadata` & Multiplexed Transport)**:
  - 각 마이크로 앱을 빌드할 때 번들 파일에 출처 메타데이터(예: `appName: 'remote-cart'`, `port: 3003`)를 주입합니다.
  - 런타임에 에러가 발생하면 에러의 호출 스택(Call Stack 파일 URL 및 메타데이터)을 분석해 **"이 에러는 `3003`번 포트(`remote-cart`)에서 시작된 에러입니다"**라고 자동 태깅하여 해당 팀의 대시보드로 라우팅합니다.
