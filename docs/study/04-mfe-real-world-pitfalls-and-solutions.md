# 📕 Study 04. MFE 미경험자는 미리 알 수 없는 14대 실전 이슈와 해결 아키텍처

> **문서 목적**: 단일 프로젝트(모놀리식)만 경험한 개발자는 **어떤 문제가 발생할지조차 미리 예상할 수 없지만(Unknown Unknowns)**, 마이크로 프론트엔드(`MFE`)를 실무에 도입하면 **100% 마주치게 되는 14가지 고유 기술 이슈**를 영역별로 총정리한 핵심 학습 문서입니다.
> 각 이슈마다 **① 왜 단일 앱에선 몰랐는가(원인)**, **② 실제로 겪게 되는 당황스러운 증상**, **③ 실무 정석 해결책과 우리 프로젝트 적용 방식**을 함께 수록했습니다.

---

## 📊 한눈에 보는 14대 MFE 실전 이슈 요약표

| 분류 | 번호 및 이슈명 | 발생 시점 | 핵심 해결 키워드 |
| :---: | :--- | :---: | :--- |
| **영역 A**<br>초기화·번들·경로 | **#01.** 싱글톤 공유 시 `eager consumption` 초기화 에러 | 앱 최초 기동 | `main.tsx` + `bootstrap.tsx` 2단 분리 |
| **영역 A**<br>초기화·번들·경로 | **#02.** 리모트 이미지·폰트·청크 404 깨짐 (`publicPath` 함정) | 리모트 마운트 | `publicPath: 'auto'` / `import.meta.url` |
| **영역 A**<br>초기화·번들·경로 | **#03.** 다중 포트(`3000~3004`) 브라우저 `CORS` 차단 및 포트 밀림 | 네트워크 로드 | 리모트 개발 서버 `cors: true`, `strictPort` |
| **영역 A**<br>초기화·번들·경로 | **#04.** 멀티 서버 동시 기동(`turbo dev`) 순서 경합 및 원격 타입(`@mf-types`) 수신 | 개발 서버 시작 | DB 자동 초기화 + `@mf-types.zip` 원격 서빙·폴더 압축 해제 |
| **영역 B**<br>DOM·스타일·UI | **#05.** 리모트 지연 로드 시 전역 `CSS Reset` 덮어쓰기 참사 | 리모트 지연 로드 | 전역 Reset은 호스트/공통만, 리모트 태그 선택자 금지 |
| **영역 B**<br>DOM·스타일·UI | **#06.** 모달(`Portal`)·드롭다운 `z-index` 전쟁 및 스크롤 잠금 먹통 | 모달/팝업 오픈 | `remote-shared` 표준 `z-index` 토큰 및 단일 포털 |
| **영역 C**<br>상태·라우팅·메모리 | **#07.** 에러 없이 기본값만 나오는 '침묵의 `React Context` 단절' | 상태/테마 구독 | Context 객체 단일 원격 출처(`remote-shared`) 공유 |
| **영역 C**<br>상태·라우팅·메모리 | **#08.** 호스트 라우터와 리모트 라우터의 `window.history` 충돌 | 페이지/탭 이동 | 단독(`BrowserRouter`) vs 결합(서브/메모리 라우터) 분리 |
| **영역 C**<br>상태·라우팅·메모리 | **#09.** 리모트 언마운트 후 살아남은 '좀비 이벤트 리스너'와 중복 API 호출 | 화면 반복 전환 | 수동 리스너 금지, 자동 해제 `useMfeEvent` 훅 제공 |
| **영역 C**<br>상태·라우팅·메모리 | **#10.** 동일 출처(`localhost:3000`) `localStorage` 키 이름 충돌 오염 | 로컬 데이터 저장 | 스코프 프리픽스 강제 스토리지 래퍼(`mfe:<scope>:*`) |
| **영역 D**<br>테스트·환경·배포 | **#11.** `Vitest` 단독 TDD 실행 시 리모트 모듈(`remote_*`) 로딩 실패 | 단위 테스트(`Red/Green`) | `vitest.config.ts` 로컬 테스트 스텁 Alias 매핑 |
| **영역 D**<br>테스트·환경·배포 | **#12.** 빌드 타임 환경 변수(`import.meta.env`)와 런타임 설정 혼동 | 스테이징/운영 배포 | 정적 환경 변수 vs 런타임 주입 설정(`MfeConfig`) 분리 |
| **영역 D**<br>테스트·환경·배포 | **#13.** 리모트 단독 재배포 직후 발생하는 `ChunkLoadError`와 매니페스트 캐싱 | 무중단 독립 배포 | 매니페스트 `no-cache` + `ErrorBoundary` 재시도 복구 |
| **영역 D**<br>테스트·환경·배포 | **#14.** 호스트↔리모트 경계에서 `HMR`(코드 수정 실시간 반영) 제약 | 로컬 개발 중 | Module Federation 2.0 매니페스트 기반 Live Reload |

---

## 영역 A. 초기화 · 번들 · 네트워크 경로 이슈 (#01 ~ #04)

### #01. 싱글톤 공유 시 발생하는 `"Shared module is not available for eager consumption"` 에러
* **왜 안 해본 사람은 모르나요?**
  - 단일 React 앱에서는 진입 파일(`main.tsx`) 첫 줄에 `import React from 'react'`를 쓰는 것이 당연한 상식입니다.
  - 하지만 MFE에서 `react`, `react-dom`, `@tanstack/react-query`를 **`singleton: true`(브라우저 전체에 단 1개만 로드)**로 설정하면, 브라우저가 켜질 때 호스트와 리모트들이 *"누가 가진 React를 대표로 쓸지"* 결정하는 **비동기 협상(Async Negotiation) 시간**이 필요합니다.
* **어떤 증상이 나타나나요?**
  - 앱을 켜자마자 화면이 하얗게 죽고 콘솔에 `Uncaught Error: Shared module is not available for eager consumption` 에러가 찍힙니다.
* **`eager consumption`(성급한 소비)의 정확한 정의와 콜스택(Call Stack) 충돌 메커니즘**:
  - **정적 import (`import React from 'react'`)의 동작**: 번들러가 모든 코드를 단 하나의 `main.js` 파일로 합쳐서 번들링합니다.
  - **동기 콜스택의 폭주**: 브라우저 JS 엔진이 `<script src="main.js">`를 실행할 때 위에서부터 아래로 동기식(Call Stack)으로 한 번에 끝까지 실행합니다.
  - **충돌 원인**: 모듈 페더레이션 런타임이 백그라운드에서 싱글톤 React 협상 Promise(`initSharing`)를 시작했으나, 브라우저는 이 Promise가 완료되기를 기다리지(await) 않고 즉시 다음 줄의 `createRoot` 및 React 코드를 실행합니다. 이때 내부 상태 검사(`if (!sharedModule.isReady) throw Error(...)`)에 걸려 **"비동기 협상도 안 끝났는데 성급하게(eager) 모듈을 소비하려 했다"**면서 런타임 크래시가 발생합니다.
* **실무 해결책: `main.tsx` + `bootstrap.tsx` 2단 비동기 엔트리 분리**:
  - `bootstrap`은 별도의 복잡한 컴포넌트가 아니라, 원래 `main.tsx`에 있던 평범한 DOM 마운트 코드를 파일 이름만 옮겨 담은 것입니다.
  - 진입점(`main.tsx`)에서는 오직 `import('./bootstrap')` 동적 임포트 한 줄만 호출합니다.
  ```ts
  // [1] src/main.tsx — 진입점 (단 한 줄의 비동기 동적 임포트)
  import('./bootstrap');
  ```
  ```tsx
  // [2] src/bootstrap.tsx — 싱글톤 협상이 끝난 뒤 안전하게 React 마운트 수행
  import { createRoot } from 'react-dom/client';
  import App from './App';

  createRoot(document.getElementById('root')!).render(<App />);
  ```
* **'비동기 틈새(Async Boundary)'와 `Promise.all` 체이닝의 기계적 원리**:
  1. **물리적 파일 쪼개기 (Code Splitting)**: 번들러는 AST에서 `import('./bootstrap')` 함수를 만나는 순간 무조건 파일을 2개(`main.js` 엔트리 청크 + `bootstrap_chunk.js` 렌더링 청크)로 물리적 분리합니다.
  2. **콜스택의 비워짐 (비동기 틈새 형성)**: 브라우저가 `main.js`를 실행하고 `import()`를 만나는 순간 네트워크에 다운로드를 위임하며 `main.js`의 동기 실행(Call Stack)이 완전히 종료됩니다. 이로써 이벤트 루프가 돌아갈 수 있는 여유 시간(비동기 틈새)이 확보됩니다.
  3. **`Promise.all` 체이닝 보장**: 번들러는 `bootstrap_chunk.js`를 실행하기 전에 아래와 같은 의존성 체인을 컴파일합니다:
     ```js
     // 번들러가 생성하는 내부 코드 개념도
     Promise.all([
       initSingletonModules(),      // 1. 싱글톤 React 협상 및 메모리 로드 완료 대기
       loadChunkFile('./bootstrap') // 2. bootstrap_chunk.js 파일 다운로드 대기
     ]).then(() => {
       // ★ 두 가지 비동기 작업이 100% 완료된 후에만 실제 React 렌더링 호출!
       runActualReactApp();         // createRoot(...).render(<App />)
     });
     ```
  - 결론적으로 메인은 시작점으로서 싱글톤 준비를 발동시키고, 실제 화면 렌더링 코드는 비동기로 분리해 둠으로써 **이벤트 루프를 통해 싱글톤 React 적재가 100% 완료된 직후에만 화면이 그려지도록 완벽히 보장**됩니다.
* **🔥 [실전 심화] 서버 최초 기동 후 첫 접속에서만 발생하는 `TypeError: createScopedStorage is not a function` (모듈 Top-Level 원격 함수 호출 경합)**:
  - **당황스러운 증상**:
    - `main.ts` + `bootstrap.tsx` 분리를 적용했는데도, `pnpm dev`로 서버들을 처음 띄운 직후 브라우저로 첫 접속을 하면 콘솔에 `Uncaught (in promise) TypeError: createScopedStorage is not a function (at catalog-schema.ts:156)` 에러가 터지며 화면이 멈춥니다.
    - 그런데 **신기하게도 브라우저를 한 번 새로고침(F5)하면 그때부터는 아무 문제 없이 정상 작동**합니다!
  - **근본 원인 (`@module-federation/vite`의 `DeferredRemoteProxy`와 Vite `optimizeDeps` 초회 워밍업 지연)**:
    1. `@module-federation/vite`는 `import { createScopedStorage } from 'remote_shared/utils'` 같은 정적 원격 import를 만났을 때, 원격 컨테이너(`http://localhost:3004/mf-manifest.json`) 다운로드가 완료되기 전까지 임시로 **`DeferredRemoteProxy`(지연 프록시)** 객체를 바인딩합니다.
    2. 개발 서버(`pnpm dev`)를 처음 켜고 최초 접속을 하면, 공급자 서버인 `remote-shared(3004)`의 Vite가 최초 의존성 사전 번들링(`optimizeDeps`)을 수행하느라 원격 모듈 응답이 수백 ms 지연됩니다.
    3. 이때 소비자 앱(`remote-products`)의 모듈 파일 최상단(Top-Level)에 아래와 같이 **파일이 import되는 즉시 원격 함수를 동기 호출하는 코드**가 있으면, React 컴포넌트가 마운트되기도 전(원격 모듈 초기화 완료 전)에 함수가 실행되어 `is not a function` 에러가 터집니다:
       ```ts
       // ❌ 나쁜 예: 모듈 Top-Level(파일 로드 즉시)에서 원격 함수를 동기 호출!
       // 첫 접속 시 remote_shared/utils 초기화보다 먼저 실행되어 TypeError 발생
       export const productsScopedStorage = createScopedStorage('products');
       ```
    4. 두 번째 접속(새로고침)부터는 `remote-shared`의 Vite `.vite/deps` 캐시와 브라우저 캐시가 이미 생성되어 있어 타이밍 경합을 우연히 통과하기 때문에 재현되지 않았던 것입니다.
  - **실무 정석 해결책 (원격 유틸리티·팩토리 함수의 Lazy Initialization 패턴)**:
    - 원격 모듈(`remote_shared/*`)에서 가져온 함수는 **절대 모듈 최상단(Top-Level)에서 즉시 호출하지 않고, 실제 함수가 실행되는 시점(컴포넌트 마운트 이후)에 지연 생성(Lazy Singleton Getter)**하도록 작성해야 합니다:
      ```ts
      // ✅ 좋은 예: 모듈 로드 시점에는 선언만 하고, 실제 호출 시점에 지연 초기화(Lazy Init)
      let cachedProductsStorage: ScopedStorage | null = null;

      export function getProductsScopedStorage(): ScopedStorage {
        if (!cachedProductsStorage) {
          cachedProductsStorage = createScopedStorage('products');
        }
        return cachedProductsStorage;
      }
      ```
    - **② `@module-federation/vite`의 `registerEntryImports` 스캐너 함정(`.js` 확장자 표기 금지) 및 `main.ts` 명시적 리모트 프리로드**:
      - **증상**: 모듈 Top-Level 호출을 제거했음에도 첫 접속 시 `Uncaught Error: Element type is invalid: expected a string ... but got: undefined`가 발생하며 `<ThemeProvider>`나 `<Container>` 등 `remote_shared` 컴포넌트가 `undefined`로 평가되는 현상.
      - **내부 동작 해부 (`DeferredRemoteProxy` 변환과 `registerEntryImports` 스캐너)**:
        1. `@module-federation/vite`는 `import { ThemeProvider } from 'remote_shared/theme'` 같은 정적 Named Import를 내부적으로 아래와 같이 변환합니다:
           ```js
           import { __moduleExports as __mf_ns_0, __mf_remote_pending as __mf_ns_0_pending } from "remote_shared/theme";
           let ThemeProvider;
           if ("ThemeProvider" in __mf_ns_0) { ThemeProvider = __mf_ns_0["ThemeProvider"]; }
           __mf_ns_0_pending.then(() => { ThemeProvider = __mf_ns_0["ThemeProvider"]; });
           ```
           즉, 네트워크를 통해 `http://localhost:3004/remoteEntry.js` 로딩(`__mf_ns_0_pending`)이 끝나기 전까지는 `ThemeProvider`, `Container`, `Button` 등이 모두 `undefined`입니다.
        2. 원래 `@module-federation/vite`는 서버 기동 시 `registerEntryImports`라는 정적 파일 스캐너로 `index.html` → `src/main.ts` → `src/bootstrap.tsx` → `src/App.tsx`를 따라가며 원격 모듈 목록(`preloadRemotes`)을 수집한 뒤, `import('./bootstrap')`이 실행되기 전에 해당 리모트들의 `__mf_remote_pending`을 먼저 기다려 줍니다.
        3. 그런데 로컬 상대 경로를 `import('./bootstrap.js')`처럼 **`.js` 확장자로 작성하면 스캐너(`isFile`)가 디스크에서 `bootstrap.js`만 찾고 실제 파일인 `bootstrap.tsx`를 찾지 못해 하위 트리 스캔을 즉시 중단**합니다! 그 결과 `preloadRemotes`가 빈 배열(`[]`)이 되어 첫 접속 시 리모트 로딩을 기다리지 않고 `bootstrap.tsx`가 곧바로 실행되면서 `undefined` 에러가 터진 것입니다.
      - **실무 정석 해결책 및 엔터프라이즈 표준 패턴 구분**:
        | 구분 | 적용 패턴 | 현업 표준 여부 및 도입 목적 |
        | :--- | :--- | :--- |
        | **1. Lazy Singleton Getter** (`getProductsScopedStorage`) | 모듈 Top-Level에서 원격 팩토리 함수를 즉시 호출하지 않고 함수 호출 시점에 지연 생성 | **100% 엔터프라이즈 표준 정석** (MFE·SSR/CSR·트리셰이킹·단위 테스트 격리 공통 원칙) |
        | **2. 상대 경로 `.js` 확장자 생략** (`import './App'`) | 프론트엔드 번들러(`moduleResolution: "bundler"`)에서 로컬 TS/TSX import 시 `.js` 확장자 생략 | **100% 프론트엔드 번들러 표준** (`NodeNext` 백엔드 전용 규칙과 분리하여 Vite/Webpack 플러그인 정적 분석기 호환성 보장) |
        | **3. `main.ts`의 `Promise.all` 리모트 선행 프리로드** | `bootstrap` 동적 import 전에 필수 원격 서브패스들을 `Promise.all`로 병렬 프리로드 | **`@module-federation/vite` ESM 개발 서버 방어 + 초기 렌더링 Waterfall 단축(Preload) 기법** (Webpack/Rspack에서는 `import('./bootstrap')` 단독 사용만으로도 동작하나, Vite Dev 안정성 및 병렬 네트워크 로딩 최적화를 위해 현업에서도 자주 활용) |
        ```ts
        // src/main.ts — 리모트 병렬 선행 프리로드 후 bootstrap 마운트
        void Promise.all([
          import('remote_shared/utils'),
          import('remote_shared/theme'),
          import('remote_shared/ui'),
        ]).then(() => import('./bootstrap'));
        ```

---

### #02. 리모트 앱의 이미지·폰트·비동기 청크가 404로 깨지는 현상 (`publicPath` / `base` 함정)
* **왜 안 해본 사람은 모르나요?**
  - `remote-products(3002)` 개발자가 자기 서버(`localhost:3002`)에서 `<img src="/images/shoes.png" />`를 넣었을 때는 이미지가 아주 잘 나옵니다.
* **어떤 증상이 나타나나요?**
  - 이 컴포넌트를 호스트(`localhost:3000`)에서 불러와 렌더링하는 순간 이미지가 엑박(404)으로 깨집니다!
  - 이유: 브라우저 주소창이 `localhost:3000`이므로, 상대 경로 `/images/shoes.png`를 **`http://localhost:3002`가 아니라 `http://localhost:3000/images/shoes.png`(호스트 서버)에서 찾으려고 시도**하기 때문입니다.
* **실무 해결책**:
  1. 번들러 설정에서 에셋 기준 경로를 리모트 자신의 출처로 자동 계산하도록 설정합니다 (`Rspack/Rsbuild`의 `output.assetPrefix: 'auto'`, `Vite`의 `base: 'http://localhost:3002/'` 또는 상대 에셋 import).
  2. 리모트 내부 정적 파일은 문자열 경로(`"/logo.svg"`) 대신 반드시 `import logoUrl from './assets/logo.svg'` 또는 `new URL('./assets/logo.svg', import.meta.url).href` 방식으로 참조합니다.

---

### #03. 6개 독립 포트(`3000~3004`, `4000`) 간 브라우저 `CORS` 차단 및 포트 밀림 현상
* **왜 안 해본 사람은 모르나요?**
  - 보통 `CORS`는 *"프론트엔드와 백엔드 API 서버 사이에서만 설정하는 것"*이라고 생각합니다.
* **어떤 증상이 나타나나요?**
  - 호스트(`3000`)가 리모트 프론트엔드 서버(`3002`, `3003`, `3004`)에서 `mf-manifest.json`이나 JS 모듈을 가져올 때도 포트가 다르기 때문에 브라우저가 Cross-Origin으로 판단합니다. 리모트의 개발 서버(`Vite`/`Rsbuild`)에 CORS 허용 헤더가 없으면 모듈 로딩이 차단됩니다.
  - 또한 터미널에서 실수로 서버를 두 번 띄워 `3002`번 포트가 `3005`번으로 자동 변경되어 켜지면, `3002`번만 바라보던 호스트가 연결 실패로 멈춥니다.
* **실무 해결책**:
  - 백엔드(`4000`)뿐만 아니라 **모든 프론트엔드 리모트 개발 서버 설정에 `cors: true`와 `strictPort: true`(포트가 이미 사용 중이면 번호를 바꾸지 말고 즉시 에러로 알려줌)**를 필수로 지정합니다.

---

### #04. 멀티 서버 동시 기동(`turbo dev`) 순서 경합 및 원격 타입(`@mf-types`) 자동 동기화 메커니즘
* **왜 안 해본 사람은 모르나요?**
  - 물리적으로 분리된 멀티레포에서는 다른 앱의 폴더(`../../remote-shared`)를 상대 경로로 참조할 수 없으며, 수동으로 `remotes.d.ts` 타입 파일을 복붙해서 만들면 공급자 인터페이스가 바뀔 때마다 모든 소비자 앱의 타입 파일을 일일이 다시 고쳐야 하는 싱크(동기화) 지옥이 발생합니다.
  - 또한 6개 서버를 동시에 띄울 때 `api-server(4000)`나 `remote-shared(3004)`보다 소비자 앱이 먼저 켜지면 초기 DB 테이블이나 원격 타입 압축 파일(`@mf-types.zip`)을 어떻게 받아오는지 혼동하기 쉽습니다.
* **실무 해결책 (`DB Auto-bootstrap` + Module Federation 2.0 정식 `@mf-types` 2단계 동기화)**:
  1. **백엔드 DB 자동 부트스트랩**: `api-server`는 기동 즉시 DB 파일(`mfe_study.db`) 유무를 검사해 테이블이 없으면 자동으로 `01-schema.sql` + `02-reset-seed.sql`을 실행(Auto-bootstrap)합니다.
  2. **Module Federation 2.0 공식 `dts` 플러그인(`@mf-types.zip` 원격 서빙 & `./@mf-types/` 자동 압축 해제) 채택**:
     - **① 공급자(`remote-shared:3004` 등)의 빌드·서빙 (`dts: { generateTypes: true }`)**:
       - 공급자 앱이 빌드(`vite build`)되거나 개발 서버(`vite dev`)로 실행될 때, `tsconfig.json`을 기반으로 `exposes` 모듈들의 `.d.ts` 타입을 추출하여 **`@mf-types.zip`** 압축 파일로 생성합니다.
       - 생성된 압축 파일을 `http://localhost:3004/@mf-types.zip` (실무에서는 사내 Staging/CDN URL)으로 HTTP 서빙하며, `mf-manifest.json`의 `metaData.types.zip`에 해당 주소를 기록합니다.
     - **② 소비자(`remote-products:3002` 등)의 URL 다운로드 및 `tsconfig.json` 연결 (`dts: { consumeTypes: true }`)**:
       - 소비자 앱의 `vite.config.ts`에는 로컬 파일 경로가 아닌 **실제 원격 URL(`http://localhost:3004/mf-manifest.json`)**을 지정합니다.
       - 소비자 앱을 실행·빌드하면 번들러 플러그인이 해당 URL에서 `@mf-types.zip`을 네트워크로 다운로드하여 소비자 앱 내부의 **`./@mf-types/` 폴더에 자동으로 압축을 풀어놓습니다.**
       - 소비자 앱의 `tsconfig.json`에는 `"paths": { "*": ["./@mf-types/*"] }` 및 `"include": ["src", "@mf-types"]`를 설정하여, 외부 URL에서 다운받아 내 폴더(`./@mf-types/`)에 풀린 타입 정의를 TypeScript 컴파일러(`tsc`)와 VS Code가 정식으로 읽도록 연결합니다.
     - **③ 공급자 서버 실행 시점과 로컬 디스크 캐시 유지 원리**:
       - 최초에 `@mf-types.zip`을 내려받거나 공급자의 타입이 변경되어 새로 갱신할 때는 공급자 서버(`remote-shared:3004`)가 떠 있어야(또는 빌드 산출물이 서빙 중이어야) 합니다.
       - 하지만 **일단 한 번 다운로드되어 `./@mf-types/` 폴더에 `.d.ts` 파일들이 풀리고 나면 해당 파일들은 내 디스크에 그대로 남아있기 때문에**, 이후 공급자 서버(`3004`)를 꺼놓아도 소비자 앱 단독으로 `tsc --noEmit` 타입 검사와 에디터 자동 완성이 100% 정상 동작합니다.
     - **④ [트러블슈팅] 브라우저 콘솔의 `ws://127.0.0.1:xxxxx (dynamic-remote-type-hints-plugin)` WebSocket 연결 실패 오류 해결**:
       - **증상**: `@module-federation/vite`에서 `dts` 옵션을 켜고 개발 서버를 실행하면 브라우저 콘솔에 `WebSocket connection to 'ws://127.0.0.1:16322/?WEB_SOCKET_CONNECT_MAGIC_ID=...' failed (dynamic-remote-type-hints-plugin.mjs)` 에러가 반복 출력되는 현상이 발생합니다.
       - **원인**: `@module-federation/dts-plugin`은 개발 모드에서 원격 타입 힌트를 브라우저 런타임에 전달하기 위해 임시 로컬 포트로 RPC WebSocket 서버를 띄우고 `dynamic-remote-type-hints-plugin`을 Vite `optimizeDeps`에 주입합니다. 그러나 Vite가 이 플러그인을 `.vite/deps`에 사전 번들링할 때 이전 실행의 임시 포트 번호가 캐싱되거나 다중 리모트 기동 시 워커 초기화 타이밍이 어긋나면서 죽은 포트로 WebSocket 접속을 시도하게 됩니다.
       - **해결책**: `vite.config.ts`의 `federation({ ... })` 최상위 옵션에 `dev: { disableDynamicRemoteTypeHints: true }`를 지정하면, 빌드·개발 시점의 `@mf-types.zip` 생성 및 `./@mf-types/` 자동 압축 해제는 100% 그대로 동작하면서 불필요한 브라우저 WebSocket 런타임 플러그인 주입만 깔끔하게 비활성화됩니다. 또한 로컬 진단 캐시 폴더인 `.mf/`는 `.gitignore`에 등록하여 머신별 절대 경로 로그(`.mf/diagnostics/latest.json`)가 Git에 추적되지 않게 격리합니다.

---

## 영역 B. DOM · 스타일 · UI 레이어 충돌 이슈 (#05 ~ #06)

### #05. 리모트 앱이 동적으로 로드될 때 발생하는 '전역 CSS Reset 덮어쓰기 참사'
* **왜 안 해본 사람은 모르나요?**
  - 흔히 CSS 격리라고 하면 `.btn` 같은 클래스명이 겹치는 것만 생각합니다.
  - 하지만 진짜 치명적인 사고는 **나중에 동적으로 로드(`React.lazy`)된 리모트 앱이 자기 번들에 포함된 전역 초기화 스타일(`* { margin: 0 }`, `button { background: none }`, Tailwind `@tailwind base` 등)을 브라우저 `<head>`의 맨 마지막 줄에 뒤늦게 꽂아 넣을 때** 발생합니다.
* **어떤 증상이 나타나나요?**
  - 처음 호스트 화면을 켰을 땐 멀쩡하던 상단 헤더와 버튼 디자인이, **장바구니 위젯이 로딩 완료되는 순간 갑자기 전부 초기 상태로 풀려서 깨져버리는 기괴한 현상**이 발생합니다 (나중에 삽입된 `<style>` 태그가 앞선 스타일을 덮어쓰기 때문).
* **실무 해결책**:
  1. **전역 CSS Reset 및 루트 CSS 변수(`:root`)는 오직 호스트(또는 `remote-shared/theme`) 단 한 곳에서만 최초 1회 로드**합니다.
  2. 개별 도메인 리모트(`products`, `cart`)에서는 전역 태그 선택자(`body`, `button`, `h1`, `*`) 사용을 엄격히 금지하고, CSS Modules 또는 서비스 프리픽스(`.prod-*`, `.cart-*`)만 사용합니다.

---

### #06. 모달(`Portal`)·드롭다운 `z-index` 전쟁 및 `body` 스크롤 잠금 먹통 현상
* **왜 안 해본 사람은 모르나요?**
  - 각 마이크로 앱을 단독으로 개발할 때는 모달이나 드롭다운(`Select`)의 `z-index`를 아무 숫자나 줘도 잘 보입니다.
* **어떤 증상이 나타나나요?**
  - 한 화면에 합쳐놓으면 `상품 앱`의 상세 모달, `장바구니 앱`의 결제 팝업, `호스트`의 유저 선택 드롭다운이 모두 `document.body` 아래에 `Portal`로 붙으면서 **누가 위에 떠야 할지 몰라 모달 위로 헤더나 다른 위젯이 뚫고 나오는 현상**이 발생합니다.
  - 또한 두 마이크로 앱이 동시에 `document.body.style.overflow = 'hidden'`(배경 스크롤 잠금)을 건드려 모달을 닫아도 화면 스크롤이 영구히 멈추는 버그가 터집니다.
* **실무 해결책**:
  - `remote-shared(3004)`의 테마 토큰에서 **전사 표준 `z-index` 계층 상수(`--z-header: 100`, `--z-dropdown: 200`, `--z-drawer: 300`, `--z-modal: 400`, `--z-toast: 500`)**를 정의해 모든 앱이 이 변수만 쓰도록 통제하고, 모달·셀렉트 UI는 `Ark UI` 기반의 `remote-shared/ui` 컴포넌트를 통해 일관되게 처리합니다.

---

## 영역 C. 상태 · 라우팅 · 메모리 · 스토리지 이슈 (#07 ~ #10)

### #07. 에러도 안 나고 기본값만 나오는 '침묵의 `React Context` 단절 현상'
* **왜 안 해본 사람은 모르나요?**
  - 호스트에서 `<ThemeContext.Provider value="dark">`로 감쌌으니 당연히 리모트에서 `useContext(ThemeContext)`를 부르면 `"dark"`가 나올 거라고 믿습니다.
* **어떤 증상이 나타나나요?**
  - 아무런 에러 메시지도 뜨지 않는데 리모트 컴포넌트에서는 항상 초기 기본값(`"indigo"` 또는 `null`)만 나옵니다!
  - 이유: 호스트가 만든 `createContext()` 객체와 리모트가 자체 파일에서 만든 `createContext()` 객체는 이름은 같아도 **브라우저 메모리 주소가 전혀 다른 별개의 객체**이거나, 번들러 `shared` 설정 누락으로 모듈이 두 벌 로드되었기 때문입니다.
* **실무 해결책**:
  - 공유해야 하는 모든 Context(`ThemeContext`, `QueryClientContext` 등)는 각 앱에서 따로 선언하지 않고, **반드시 단일 원격 출처(`remote_shared/theme`)에서 `export`된 동일한 Context 인스턴스**를 가져다 쓰며 라이브러리 자체도 `singleton: true`로 묶어야 합니다.

---

### #08. 호스트 라우터와 리모트 라우터의 `window.history` 충돌 (BrowserHistory vs MemoryHistory 심층 해부)
* **왜 안 해본 사람은 모르나요? (Next.js / TanStack Router 시대에도 MFE에서 이 문제가 터지는 이유)**
  - 최신 웹 개발에서는 `Next.js`의 파일 기반 라우팅이나 `TanStack Router` 같은 완전한 타입 세이프 라우터를 쓰는 것이 일반적입니다.
  - 하지만 엔터프라이즈 MFE(마이크로 프론트엔드) 실무에서는 독립 배포와 번들 런타임 제어권을 위해 **`Vite` 또는 `Rspack` 기반의 순수 CSR(Client-Side Rendering)**을 주로 채택합니다 (`Next.js`는 SSR 하이드레이션 타이밍과 프레임워크 런타임이 너무 무거워 런타임 원격 조립 시 심각한 결합 문제가 발생하기 때문).
  - 그리고 라우팅 라이브러리가 무엇이든 간에(React Router든 최신 TanStack Router든 자체 라우터든), **브라우저 탭 전체에서 실제 주소창과 세션 히스토리(`window.history`, `window.location`, `popstate` 이벤트)는 물리적으로 단 1개뿐**이라는 하드웨어적 제약은 절대 변하지 않습니다.

* **🔬 `BrowserHistory` vs `MemoryHistory` 내부 구조와 동작 메커니즘 심층 해부**:

  | 비교 항목 | `BrowserHistory` (브라우저 주소창 바인딩) | `MemoryHistory` (순수 JS 메모리 격리) |
  | :--- | :--- | :--- |
  | **데이터 저장 위치** | **브라우저(C++) 내부의 탭 네비게이션 세션 스택** | **순수 자바스크립트 힙(Heap) 메모리의 배열 객체** |
  | **내부 자료구조** | 브라우저 엔진 비공개 네이티브 스택 | `{ entries: ['/step1', '/step2'], index: 1 }` |
  | **경로 이동 API** | `window.history.pushState(state, '', url)` 호출 | `entries.push(url); index++;` 단순 배열 연산 |
  | **주소창(URL) 영향** | **실제 주소창 텍스트가 바뀜 (`localhost:3000/orders`)** | **주소창이 단 1글자도 바뀌지 않음 (`localhost:3000` 유지)** |
  | **브라우저 뒤로가기 버튼** | 브라우저 툴바의 [←] 버튼 활성화 및 클릭 시 감지 | 브라우저 [←] 버튼은 반응 안 함 (컴포넌트 내부 버튼으로만 제어) |
  | **전역 이벤트 발생** | **`window.addEventListener('popstate')` 전역 브로드캐스팅** | **전역 이벤트 0% (내부 Pub/Sub 이벤트만 조용히 발생)** |
  | **새로고침(F5) 시 동작** | 변경된 URL로 웹 서버(Nginx)에 실제 HTTP GET 요청<br>*(SPA Rewrite `try_files $uri /index.html` 필수)* | 메모리가 초기화되어 처음 지정한 `initialEntries`('/')로 리셋 |
  | **MFE에서의 역할** | **호스트(Host) 앱이 전체 화면을 조율할 때 독점 사용** | **리모트(Remote) 앱이 호스트 내부에서 위젯/모달/탭 렌더 시 사용** |

* **어떤 증상이 나타나나요? (주소창 쟁탈전과 404 참사 메커니즘)**
  1. **더블 팝스택(Double Popstate) 레이스 컨디션**:
     - 호스트와 리모트가 둘 다 브라우저 주소창을 감시하는 라우터(`createBrowserHistory` / `BrowserRouter`)를 켜두면, 사용자가 브라우저 [뒤로가기]를 누를 때 전역 `popstate` 이벤트를 두 라우터가 동시에 수신합니다.
     - 두 라우터가 각자의 히스토리 스택을 기준으로 동시에 주소를 되돌리면서 **뒤로가기가 2번 연속 실행되어 엉뚱한 페이지로 튕기거나 무한 루프**에 빠집니다.
  2. **호스트 `basename` 무시와 404 Not Found 화면 덮어쓰기 참사**:
     - 리모트 앱(상품 카탈로그) 내부에서 상세 페이지로 이동하려고 `navigate('/products/123')`를 호출해 실제 주소창을 변경합니다.
     - 주소창 변경을 감지한 호스트 라우터는 자기 라우트 테이블에 `/products/123`이 등록되어 있지 않으므로 **"정의되지 않은 경로"로 판단하여 화면 전체를 404 에러 페이지로 덮어써 버립니다.**

* **🏗️ MFE 공존 아키텍처 다이어그램**:
  ```mermaid
  flowchart TD
      subgraph Browser["브라우저 전역 공간 (단 1개만 존재)"]
          AddressBar["🌐 실제 주소창 URL: /dashboard<br/>(window.location / window.history)"]
          PopstateEvt["⚡ window popstate 이벤트"]
      end

      subgraph HostApp["호스트 앱 (Host Dashboard)"]
          HostRouter["🧭 호스트 라우터 (BrowserHistory)<br/>주소창을 독점 제어함"]
      end

      subgraph RemoteApp["리모트 앱 (Remote Products Widget)"]
          RemoteMemory["📦 리모트 가상 라우터 (MemoryHistory)<br/>entries: ['/tab-info', '/tab-reviews']<br/>주소창을 전혀 건드리지 않고 메모리 안에서만 작동!"]
      end

      AddressBar <-->|양방향 동기화| HostRouter
      PopstateEvt -->|호스트만 단독 수신| HostRouter
      HostRouter -.->|Props / Event로 상태 전달| RemoteApp
      RemoteMemory -.->|주소창과 완전 격리 (간섭 0%)| AddressBar
  ```

* **실무 해결책: 엔터프라이즈 MFE 라우팅 3대 아키텍처 패턴**:
  1. **패턴 1. Props 주도형 (No-Router 패턴 — 실무 80% 권장)**:
     - 리모트 앱 알맹이(`ProductList.tsx`)는 내부에 라우터를 일절 두지 않고 **순수 프레젠테이션 컴포넌트**로 유지합니다.
     - 호스트가 주소창 URL 파싱(`/:productId`)을 전담하고, 리모트에는 `productId`를 단순 Props로 전달하며, 리모트의 상세 이동 클릭은 콜백 함수(`onSelectProduct`)로 호스트에 위임합니다.
  2. **패턴 2. 메모리 히스토리 격리 (`createMemoryHistory` / `MemoryRouter` 패턴)**:
     - 리모트가 내부에 복잡한 다단계 폼(1단계 배송지 -> 2단계 결제)이나 상세 탭 이동을 품어야 할 때, 리모트 내부 라우터에는 브라우저 주소창을 전혀 건드리지 않는 **`MemoryHistory`**를 주입합니다.
     - 실제 브라우저 주소창은 변경되지 않고 자바스크립트 메모리 배열(`['/step1', '/step2']`) 안에서만 가상으로 경로가 전환되므로 호스트와의 충돌이 100% 원천 차단됩니다.
     ```tsx
     // 리모트 진입점 분기 패턴 (Standalone vs Hosted)
     export function ProductWidget({ isStandalone }: { isStandalone?: boolean }) {
       // 단독 실행(3002)일 때만 BrowserHistory 사용, 호스트에 들어갈 땐 MemoryHistory 강제!
       const history = isStandalone ? createBrowserHistory() : createMemoryHistory();
       return <Router history={history}><ProductRoutes /></Router>;
     }
     ```
  3. **패턴 3. 양방향 히스토리 동기화 어댑터 (`Bidirectional History Sync` 패턴)**:
     - 리모트가 단독 실행(`Standalone`, Port 3002)될 때는 `BrowserHistory`로 주소창을 직접 움직이고,
     - 호스트에 결합될 때는 `MemoryHistory`로 띄운 뒤, 호스트의 `history.listen` 이벤트와 리모트의 메모리 히스토리를 브릿지 어댑터로 연결하여 필요한 하위 서브패스만 선별적으로 주소창과 맞추는 고급 패턴입니다.

---

### #09. 리모트 언마운트 후 살아남은 '좀비 이벤트 리스너'와 중복 API 호출 (메모리 누수)
* **왜 안 해본 사람은 모르나요?**
  - 단일 앱에서는 이벤트 리스너 해제를 깜빡해도 페이지가 유지되는 동안 큰 티가 안 나기도 합니다.
  - 하지만 MFE에서는 사용자가 메뉴를 바꿀 때마다 리모트 마이크로 앱이 수시로 마운트(`mount`)되었다가 언마운트(`unmount`)됩니다.
* **어떤 증상이 나타나나요?**
  - `remote-cart`가 `window.addEventListener('mfe:cart-updated', refetchCart)`를 등록하고 언마운트 시 `removeEventListener`를 정확히 하지 않으면, 사용자가 장바구니를 5번 열었다 닫은 뒤 상품을 1개 담았을 때 **이미 화면에서 사라진 죽은(좀비) 장바구니 컴포넌트 4개까지 동시에 반응해 백엔드 API를 5번 연속 호출**합니다!
* **실무 해결책 (`useMfeEvent` 자동 클린업 훅 강제)**:
  - 컴포넌트 내부에서 직접 `window.addEventListener`를 쓰는 것을 컨벤션으로 금지하고, `remote-shared/utils`에서 **언마운트 시 100% 자동으로 리스너를 제거해 주는 `useMfeEvent(eventName, handler)` 커스텀 훅**을 제공하여 사용합니다.

---

### #10. 동일 출처(`localhost:3000`) 공유로 인한 `localStorage` / `sessionStorage` 키 이름 충돌
* **왜 안 해본 사람은 모르나요?**
  - `products(3002)`와 `cart(3003)`가 개발 서버 포트는 다르지만, 호스트(`http://localhost:3000`) 안에서 실행될 때는 **두 리모트 모두 `localhost:3000`의 `localStorage` 공간을 함께 사용**합니다.
* **어떤 증상이 나타나나요?**
  - `products` 앱이 `localStorage.setItem('settings', JSON.stringify({ sort: 'price' }))`를 저장했는데, 잠시 후 `cart` 앱이 똑같은 키 이름인 `'settings'`에 다른 구조의 데이터를 덮어써 버려 양쪽 앱 모두 `JSON.parse` 타입 에러로 죽어버립니다.
* **실무 해결책 (스코프 네임스페이스 프리픽스 강제)**:
  - 브라우저 스토리지나 이벤트 이름을 지을 때는 반드시 **`mfe:<서비스스코프>:<키이름>`**(예: `mfe:products:filter`, `mfe:cart:draft`, `mfe:shared:theme`) 형태의 스코프 프리픽스를 붙이는 래퍼 유틸리티를 사용합니다.

---

## 영역 D. 테스트 · 환경 변수 · 무중단 배포 · 개발 경험 이슈 (#11 ~ #14)

### #11. `Vitest` 단독 TDD 실행 vs 브라우저 단독 실행(`#RUNTIME-003`)의 구조적 차이와 MSW 이원화
* **왜 안 해본 사람은 모르나요?**
  - 물리적 멀티레포에서는 다른 앱 서버(`3004`, `4000`)를 켜지 않고 내 앱(`3002`) 폴더 안에서만 `pnpm test`를 돌려야 합니다.
  - 반대로 브라우저에서 `http://localhost:3002`만 단독으로 열었을 때는 왜 `Vitest`처럼 혼자 동작하지 않고 `[Federation Runtime] #RUNTIME-003: Failed to get manifest (http://localhost:3004/mf-manifest.json)` 에러가 발생하는지 혼동하기 쉽습니다.
* **어떤 증상이 나타나나요?**
  1. **`Vitest` 환경**: 브라우저 런타임이 아니므로 `import { Button } from 'remote_shared/ui'`를 만나는 순간 `Cannot find module 'remote_shared/ui'` 에러를 내며 테스트가 중단됩니다.
  2. **브라우저(`localhost:3002`) 단독 접속 환경**: 일반 `npm`이나 `workspace:*` 패키지는 빌드 타임에 코드가 물리적으로 합쳐지지만, **Module Federation은 런타임(페이지 진입·새로고침 시점)마다 브라우저가 `http://localhost:3004/mf-manifest.json`으로 실시간 HTTP 네트워크 요청을 보내 JS 청크를 다운로드**합니다. 따라서 `3004(remote-shared)` 서버가 꺼져 있으면 브라우저가 공통 UI/테마 청크를 가져오지 못해 `#RUNTIME-003 (TypeError: Failed to fetch)` 에러가 발생합니다. (만약 `shared` 빌드 산출물을 각 앱의 `public/`에 복사해 정적 번들링하면 MFE의 최대 목적인 **'리모트 단독 배포 시 전사 즉시 반영(독립 배포)'**이 무너지게 됩니다.)
* **실무 해결책 (`vitest.config.ts` 로컬 스텁 + MSW Node/Browser 역할 분리 + 런타임 스모크 테스트)**:
  1. **`Vitest` 단위·통합 TDD 격리 (`msw/node` + 로컬 스텁 Alias)**:
     - 각 마이크로 앱의 `vitest.config.ts`에 `remote_shared/*` 경로를 앱 내부의 테스트용 경량 스텁(`src/testing/stubs/`)으로 연결하는 `alias`를 설정합니다.
     - API 모킹은 Node.js의 `fetch`/`http` 계층을 가로채는 **`msw/node`(`setupServer`)**를 `src/testing/setup.ts`에서 실행합니다. (브라우저 Service Worker 기반인 `msw/browser`(`setupWorker`)와 달리 Node 테스트 런타임 전용으로 동작하므로 `3004`, `4000` 서버 없이도 100% 독립 테스트가 통과합니다.)
  2. **스텁 모킹의 맹점을 보완하는 '런타임 Module Federation 스모크 테스트 (`Step 1.6`)'**:
     - `Vitest`는 리모트를 로컬 스텁으로 대체하므로, 실제 번들러 설정(`vite.config.ts` / `rsbuild.config.ts`)에서 `remoteEntry.js` 경로 오타, `CORS` 누락, 싱글톤 협상 에러가 발생하더라도 `Vitest`는 통과(`Green`)해버릴 수 있습니다.
     - 따라서 Phase 3의 본격적인 `Playwright` 멀티 시나리오 E2E 이전이라도, **Phase 1 끝에 실제 6개 서버를 띄워 `Host → remoteEntry.js → Remote → remote-shared → 실제 렌더링` 연결이 깨지지 않았는지 확인하는 런타임 스모크 테스트(`scripts/verify-mfe-smoke.mjs`)를 필수로 실행**하여 스텁과 실제 런타임 사이의 간극을 완벽히 메웁니다.

---

### #12. 빌드 타임 환경 변수(`import.meta.env`)와 런타임 호스트 설정의 혼동
* **왜 안 해본 사람은 모르나요?**
  - 리모트 앱을 빌드할 때 `.env`의 값은 JS 코드 안에 고정 문자열로 치환(박제)됩니다.
* **어떤 증상이 나타나나요?**
  - 호스트가 개발 환경인지 스테이징 환경인지에 따라 리모트가 호출할 백엔드 주소나 옵션이 달라져야 하는데, 리모트가 자기 빌드 시점의 환경 변수만 고집하면 호스트 환경과 어긋나게 됩니다.
* **실무 해결책**:
  - 기본값은 환경 변수(`http://localhost:4000`)를 쓰되, 호스트가 리모트를 마운트할 때 `Props`나 공유 컨텍스트를 통해 런타임 설정(`apiBaseUrl`, `hostType` 등)을 주입할 수 있도록 인터페이스를 열어둡니다.

---

### #13. 리모트 앱 단독 재배포 직후 발생하는 `ChunkLoadError`와 매니페스트 캐싱 문제
* **왜 안 해본 사람은 모르나요?**
  - *"MFE는 리모트만 다시 배포하면 호스트 재배포 없이 바로 반영된다"*는 장점만 듣고 배포했다가 겪는 대표적인 운영 이슈입니다.
* **어떤 증상이 나타나나요?**
  1. 브라우저가 `remoteEntry.js`나 `mf-manifest.json` 파일을 캐시해 버리면, 리모트를 아무리 새로 배포해도 사용자는 강제 새로고침(`Ctrl+F5`)을 하기 전까지 옛날 화면을 봅니다.
  2. 반대로 이미 호스트 화면을 켜둔 사용자가 리모트 재배포 직후 탭을 열면, 리모트 서버에서 옛날 해시 파일(`chunk-old123.js`)이 지워져서 `ChunkLoadError`가 발생합니다.
* **실무 해결책**:
  1. **캐시 정책 분리**: 진입점인 `remoteEntry.js`와 `mf-manifest.json`은 절대 캐시하지 않고(`Cache-Control: no-cache, no-store`), 해시가 붙은 내부 JS 청크만 영구 캐시(`immutable`)합니다.
  2. **`RemoteErrorBoundary` 재시도(Retry) 버튼**: 네트워크 일시 단절이나 청크 로드 에러가 발생했을 때 전체 페이지를 새로고침하지 않고도 해당 리모트 영역만 다시 마운트할 수 있는 **[🔄 다시 시도]** 복구 기능을 호스트의 `RemoteErrorBoundary`에 구현합니다.

---

### #14. 호스트↔리모트 경계에서의 `HMR` 메커니즘과 실무 로컬 개발·디버깅 (`Module Federation DevTools`)
* **왜 안 해본 사람은 모르나요?**
  - 단일 앱에서는 코드를 고치면 0.1초 만에 화면이 바뀌지만, MFE에서는 ① 리모트 코드 수정이 호스트 화면에 어떻게 반영되는지, ② 마이크로 앱이 10~20개로 늘어났을 때 내 로컬 PC에서 모든 서버를 다 띄우지 않고 어떻게 개발·디버깅하는지 실무 워크플로우를 알기 어렵습니다.
* **동작 원리 및 실무 해결책**:
  1. **Module Federation 2.0 `mf-manifest.json` 기반 HMR**:
     - 과거 Module Federation 1.0에서는 리모트 코드를 고치면 호스트 브라우저를 수동으로 새로고침해야 하는 불편함이 있었습니다.
     - 우리가 사용하는 **Module Federation 2.0 (`@module-federation/vite` & `@module-federation/rsbuild-plugin`)**은 `mf-manifest.json`과 개발 서버 간 웹소켓 신호를 통해 리모트 코드가 수정되면 호스트 화면에서도 자동으로 변경을 감지해 리로드해 주며, 단독 개발 시에는 각 리모트 포트(`3002`, `3003`, `3004`)에서 초고속 자체 HMR을 그대로 활용할 수 있습니다.
  2. **공식 [Module Federation DevTools (Chrome 확장 프로그램)](https://chromewebstore.google.com/detail/module-federation/aeoilchhomapofiopejjlecddfldpeom)을 활용한 실시간 프록시 및 디버깅**:
     - 우리 프로젝트는 `@module-federation/vite`를 통해 `mf-manifest.json`을 생성하므로, 공식 Chrome 확장 프로그램과 즉시 연동됩니다.
     - **① Live Module Proxying (실시간 URL 오버라이드)**: 실무에서 수십 개의 리모트 앱이 사내 개발 서버(Dev CDN)에 배포되어 있을 때, 내 PC에는 작업 중인 `remote-products(3002)` 딱 1개만 띄우고 Chrome DevTools의 **[Module Federation]** 패널에서 `remote_products`의 매니페스트 주소만 `http://localhost:3002/mf-manifest.json`으로 클릭해 오버라이드(바꿔치기)합니다. 코드 한 줄 바꾸지 않고도 배포된 호스트 화면 위에서 내 로컬 모듈을 실시간으로 조합해 테스트할 수 있습니다.
     - **② Shared Scope 싱글톤 감사**: `react`, `react-dom`, `@tanstack/react-query`가 호스트와 리모트 사이에서 정확히 단 1개의 싱글톤으로 협상되었는지, 버전 불일치로 중복 로드(Dual Instance)가 발생했는지 시각적으로 검증합니다.
     - **③ Hierarchy Graph & Loading Trace**: 호스트-리모트 간 의존성 트리와 매니페스트/청크 네트워크 로딩 타이밍을 추적합니다.
  3. **대규모 엔터프라이즈 MFE 오케스트레이션 생태계 참고 도구**:
     - **Turborepo TUI (`pnpm dev`)**: 로컬에서 4~6개 내외의 서비스를 동시에 띄울 때는 `turbo.json`의 `"ui": "tui"` 모드를 사용해 터미널에서 키보드 방향키(`↑`/`↓`)로 앱별 로그를 섞이지 않게 분리 확인하고 특정 앱만 재시작(`r`)합니다.
     - **Zephyr Cloud / 로컬 미니 CDN 프록시**: 앱이 수십 개 이상인 대규모 조직에서는 Module Federation 전용 엣지 배포·버전 관리 플랫폼인 `Zephyr Cloud`(`zephyr-rspack-plugin`)를 사용하거나, 로컬 Nginx/Node 정적 서버에 빌드 산출물을 모아 서빙하는 로컬 미니 CDN 프록시 패턴, 또는 `Requestly`(브라우저 네트워크 리다이렉트), `import-map-overrides`(Single-SPA 진영) 등을 조합해 로컬 리소스 소모를 최소화합니다.
