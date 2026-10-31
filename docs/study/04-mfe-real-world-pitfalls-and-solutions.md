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
| **영역 A**<br>초기화·번들·경로 | **#04.** 멀티 서버 동시 기동(`turbo dev`) 순서 경합 | 개발 서버 시작 | DB 자동 초기화 + `remotes.d.ts` 안전망 |
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

### #04. 멀티 서버 동시 기동(`turbo dev`) 시 발생하는 기동 순서 경합(Race Condition)
* **왜 안 해본 사람은 모르나요?**
  - 서버가 1개일 때는 순서 문제가 없지만, 6개 서버를 동시에 띄우면 어떤 서버가 0.5초 먼저 뜰지 매번 달라집니다.
* **어떤 증상이 나타나나요?**
  - `api-server(4000)`나 `remote-shared(3004)`보다 `host-vite(3000)`가 먼저 켜지면, 첫 화면 접속 시 DB 테이블이 아직 없거나 원격 타입 폴더(`@mf-types`)를 못 찾아 에러가 날 수 있습니다.
* **실무 해결책**:
  1. `api-server`는 기동 즉시 DB 파일(`mfe_study.db`) 유무를 검사해 테이블이 없으면 자동으로 `01-schema.sql` + `02-reset-seed.sql`을 실행(Auto-bootstrap)합니다.
  2. 각 프론트엔드 앱에는 원격 서버가 꺼져 있어도 TypeScript 컴파일이 절대 깨지지 않도록 기본 타입 선언 파일(`src/remotes.d.ts`)을 안전망으로 함께 유지합니다.

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

### #08. 호스트 라우터와 리모트 라우터의 `window.history` 충돌 문제
* **왜 안 해본 사람은 모르나요?**
  - 브라우저에는 주소창(`window.location` / `window.history`)이 단 하나뿐입니다.
* **어떤 증상이 나타나나요?**
  - 호스트도 최상위에서 `<BrowserRouter>`를 쓰고, 리모트(`products`)도 자기 내부에서 `<BrowserRouter>`를 중복으로 생성하면, 리모트 안에서 상품 상세(`/products/1`)를 클릭했을 때 호스트 라우터가 이를 인식하지 못하거나 브라우저 뒤로가기를 눌렀을 때 두 라우터가 동시에 반응해 히스토리가 꼬입니다.
* **실무 해결책 (Phase 2 라우팅 학습 핵심)**:
  - 앞서 Q8에서 배운 **진입점 분리 원리**를 그대로 적용합니다!
  - 단독 실행 파일(`App.tsx`)에서만 `<BrowserRouter>`로 감싸고, 호스트로 노출되는 알맹이 컴포넌트(`ProductList.tsx`)는 `<BrowserRouter>`를 직접 생성하지 않고 호스트의 라우터 컨텍스트를 이어받거나 상대 경로/메모리 라우터를 사용합니다.

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

### #11. `Vitest` 단독 TDD 실행 시 리모트 네트워크 모듈(`remote_shared/*`) 로딩 실패
* **왜 안 해본 사람은 모르나요?**
  - 물리적 멀티레포에서는 다른 앱 서버(`3004`)를 켜지 않고 내 앱(`3002`) 폴더 안에서만 `pnpm test`를 돌려야 합니다.
* **어떤 증상이 나타나나요?**
  - `Vitest`는 브라우저 런타임이 아니므로 `import { Button } from 'remote_shared/ui'`를 만나는 순간 `Cannot find module 'remote_shared/ui'` 에러를 내며 테스트가 즉시 중단됩니다.
* **실무 해결책 (`vitest.config.ts` 로컬 스텁 Alias 매핑 + Phase 1 런타임 MF 스모크 테스트)**:
  1. **단위·통합 TDD용 로컬 스텁 매핑**: 각 마이크로 앱의 `vitest.config.ts`에 `remote_shared/*`, `remote_products/*` 등의 경로를 해당 앱 내부의 테스트용 경량 스텁(`src/testing/stubs/`)으로 연결하는 `alias` 설정을 기본 탑재합니다.
  2. **스텁 모킹의 맹점을 보완하는 '런타임 Module Federation 스모크 테스트 (`Step 1.6`)'**:
     - `Vitest`는 리모트를 로컬 스텁으로 대체하므로, 만약 실제 번들러 설정(`vite.config.ts` / `rsbuild.config.ts`)에서 `remoteEntry.js` 경로 오타, `CORS` 누락, 싱글톤 협상 에러가 발생하더라도 `Vitest`는 통과(`Green`)해버릴 수 있습니다.
     - 따라서 Phase 3의 본격적인 `Playwright` 멀티 시나리오 E2E 이전이라도, **Phase 1 끝에 실제 6개 서버를 띄워 `Host → remoteEntry.js → Remote → remote-shared → 실제 렌더링` 연결이 깨지지 않았는지 확인하는 얇은 런타임 스모크 테스트(`scripts/verify-mfe-smoke.mjs`)를 필수로 실행**하여 스텁과 실제 런타임 사이의 간극을 완벽히 메웁니다.

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

### #14. 호스트↔리모트 경계에서의 `HMR`(코드 수정 실시간 반영) 메커니즘 이해
* **왜 안 해본 사람은 모르나요?**
  - 단일 앱에서는 코드를 고치면 0.1초 만에 화면이 바뀌지만, MFE에서는 `3002`번(Vite 리모트)이나 `3003`번(Rspack 리모트)의 코드를 고쳤을 때 내가 보고 있는 `3000`번(호스트) 브라우저 화면이 어떻게 그걸 알아채고 갱신하는지 궁금해집니다.
* **동작 원리 및 해결책**:
  - 과거 Module Federation 1.0에서는 리모트 코드를 고치면 호스트 브라우저를 수동으로 새로고침해야 하는 불편함이 있었습니다.
  - 우리가 사용하는 **Module Federation 2.0 (`@module-federation/vite` & `@module-federation/rsbuild-plugin`)**은 `mf-manifest.json`과 개발 서버 간 웹소켓 신호를 통해 리모트 코드가 수정되면 호스트 화면에서도 자동으로 변경을 감지해 리로드해 주며, 단독 개발 시에는 각 리모트 포트(`3002`, `3003`, `3004`)에서 초고속 자체 HMR을 그대로 활용할 수 있습니다.
