# 🚀 Study 10. MFE 실서비스 프로덕션 배포 · 정적 서빙 테스트 · 운영 가이드

> **문서 목적**: 개발 서버(`pnpm dev`)를 넘어 **실제 서비스 환경에 MFE 앱을 빌드·배포·운영할 때 알아야 할 아키텍처와 검증 방법**을 정리한 가이드입니다. `@mf-types.zip` 같은 개발·CI 전용 산출물의 보안/유지보수 처리 방식, 단일 정적 서버(VS Code Live Server · S3/CloudFront · Nginx) 통합 서빙과 멀티 도메인 분리 배포의 차이, 그리고 HTTP 캐시·무중단 롤백 전략을 다룹니다.

---

## 📊 한눈에 보는 핵심 요약

| 핵심 질문 | 핵심 결론 |
| :--- | :--- |
| **빌드 후 `@mf-types.zip`을 프로덕션 CDN에 올려야 하나요?** | **아니요.** 브라우저는 런타임에 `@mf-types.zip`을 전혀 읽지 않습니다. 내부 시그니처 노출과 불필요한 파일 관리를 막기 위해 **프로덕션 업로드 대상에서 제외·삭제**하고, 필요 시 사내/개발 환경 전용 스토리지로만 분리합니다. |
| **빌드된 결과물은 단순 정적 파일인데, 웹서버 1개(예: VS Code Live Server)로 묶어서 테스트할 수 있나요?** | **가능합니다.** 다만 현재 `vite.config.ts`의 `base: 'http://localhost:3004/'` 같은 개발용 절대 URL을 **서브패스(`/remotes/shared/`, `/remotes/products/` 등) 또는 런타임 설정**으로 전환해야 단일 서버에서 404 없이 동작합니다. |
| **실무에서는 단일 서버 통합 배포와 멀티 도메인 배포 중 무엇을 쓰나요?** | 소규모~중규모·동일 조직 서비스는 **단일 오리진 서브패스 라우팅(CORS 원천 제거)**을 선호하고, 대규모·독립 팀 조직은 **도메인 분리형 CDN + 환경별 URL 주입(`registerRemotes`)**을 선택합니다. |
| **프로덕션 운영에서 가장 흔한 장애는 무엇인가요?** | `remoteEntry.js` / `mf-manifest.json`에 장기 캐시(`max-age`)가 걸려 **신규 배포 후에도 브라우저가 옛날 청크 해시를 요청하다 `ChunkLoadError`로 깨지는 현상**입니다. 진입점 매니페스트는 `no-cache`, 해시 청크는 `immutable`로 분리해야 합니다. |

---

## Part 1. 빌드 산출물 분류와 `@mf-types.zip` 보안·유지보수 처리

`vite build` 또는 `rspack build`를 실행하면 `dist/` 폴더에 **브라우저 런타임용 파일**과 **개발·CI 빌드 타임용 파일**이 함께 생성됩니다.

### 1.1 `dist/` 산출물 역할 분류표

| 파일 / 폴더 | 생성 주체 | 브라우저 런타임 필요 여부 | 프로덕션 CDN 업로드 여부 | 역할 |
| :--- | :---: | :---: | :---: | :--- |
| `index.html` | 번들러 | **필수** (호스트) / 선택 (리모트 단독) | **업로드** | 앱 진입 HTML 문서 |
| `remoteEntry.js` | MF 플러그인 | **필수** (리모트) | **업로드** | 싱글톤 협상(`init`) 및 노출 모듈(`get`) 진입점 |
| `mf-manifest.json` | MF 플러그인 | **필수** (매니페스트 사용 시) | **업로드** | `remoteEntry.js`와 청크 목록을 가리키는 메타데이터 |
| `assets/*.js`, `*.css`, 이미지 | 번들러 | **필수** | **업로드** | 해시된 실제 컴포넌트·스타일·정적 에셋 청크 |
| **`@mf-types.zip`, `@mf-types.d.ts`, `@mf-types/`** | MF `dts` | **불필요** (요청 안 함) | **제외 / 삭제** | 타 앱의 개발·CI 컴파일용 `.d.ts` 타입 아카이브 |
| **`mf-stats.json`** | MF 플러그인 | **불필요** | **제외 / 삭제** | 번들 크기·청크 통계 진단 메타데이터 |
| **`*.map` (소스맵)** | 번들러 | **불필요** | **제외 / 비공개** | 원본 소스 복원용 (Sentry 등 에러 추적 서버에만 업로드) |

### 1.2 불필요한 산출물 4대 처리 전략 (실무 표준)

1. **CI/CD 업로드 직전 필터링·삭제 (가장 단순하고 표준적인 방법)**
   - 빌드 직후 클린 배포 폴더를 만들거나 업로드 명령에서 제외합니다.
   ```bash
   # 예시 1: 로컬/CI 클린 스테이징
   rm -rf dist/@mf-types* dist/mf-stats.json dist/**/*.map

   # 예시 2: AWS S3 동기화 시 제외 필터
   aws s3 sync dist/ s3://prod-mfe-bucket/ --exclude "@mf-types*" --exclude "mf-stats.json" --exclude "*.map"
   ```
   - `mf-manifest.json` 내부에 `"types": { "zip": "@mf-types.zip" }` 문자열이 남아 있더라도, **브라우저 MF 런타임은 `types` 필드를 전혀 읽지 않으므로** 브라우저 네트워크 탭에서 404가 발생하지 않습니다.

2. **런타임 CDN과 사내 타입 저장소 분리**
   - `remoteEntry.js` + `mf-manifest.json` + `assets/*` → 퍼블릭 프로덕션 CDN
   - `@mf-types.zip` → 사내 전용 아티팩트 저장소(또는 Dev/Staging 내부망 서버)
   - 소비자 앱은 개발·CI 타입 동기화 시에만 사내 주소를 바라보고, 실제 런타임에는 프로덕션 CDN URL을 사용합니다.

3. **프로덕션 전용 빌드에서 `dts: false` 분기**
   - 소비자 앱의 타입 동기화를 Dev/Staging이나 사내 파이프라인으로 완전히 분리한 경우, 프로덕션 빌드 설정에서 `dts: isProd ? false : { ... }`로 꺼서 빌드 시간 자체를 단축할 수 있습니다.

4. **CDN / 웹서버 접근 차단 (2차 방어선)**
   - CloudFront, Cloudflare, Nginx 등에서 `/@mf-types*`, `/mf-stats.json`, `/*.map` 경로에 대한 외부 요청을 `403 Forbidden` 또는 `404 Not Found`로 차단합니다.

---

## Part 2. 프로덕션 배포 토폴로지 2가지와 VS Code Live Server 테스트

빌드된 MFE 프론트엔드 5개(`host-vite`, `host-rspack`, `remote-shared`, `remote-products`, `remote-cart`)는 모두 **순수 정적 리소스(HTML/JS/CSS/JSON)**입니다. 따라서 서버를 구성하는 방식은 크게 2가지로 나뉩니다.

### 2.1 패턴 A: 단일 정적 서버 + 서브패스 통합 서빙 (로컬 Live Server · 단일 S3/CloudFront · Nginx)

```text
단일 정적 서버 (예: http://127.0.0.1:5500 또는 https://shop.example.com)
├── index.html                  ← host-vite (또는 /host-vite/, /host-rspack/)
├── assets/
└── remotes/
    ├── shared/                 ← remote-shared dist (base: '/remotes/shared/')
    │   ├── mf-manifest.json
    │   ├── remoteEntry.js
    │   └── assets/
    ├── products/               ← remote-products dist (base: '/remotes/products/')
    │   ├── mf-manifest.json
    │   ├── remoteEntry.js
    │   └── assets/
    └── cart/                   ← remote-cart dist (base: '/remotes/cart/')
        ├── mf-manifest.json
        ├── remoteEntry.js
        └── assets/
```

- **장점**:
  - 웹서버 **1대(또는 S3 버킷 1개)**만으로 모든 MFE를 서빙할 수 있습니다.
  - 호스트와 리모트가 모두 같은 출처(`Origin`)를 공유하므로 **브라우저 CORS 설정이 아예 필요 없습니다.**
  - 루트 폴더(예: `.deploy-preview/`)에 5개 앱의 클린 `dist/`를 복사한 뒤 **VS Code Live Server**로 띄워 간단히 통합 검증하는 구조와 정확히 일치합니다.
- **주의할 점 (현재 개발 설정 그대로 넣으면 깨지는 이유)**:
  1. **`base` / `assetPrefix` 전환 필수**: 현재 `vite.config.ts`는 개발 서버용 `base: 'http://localhost:3004/'`가 고정되어 있습니다. 단일 서버의 `/remotes/shared/` 하위 폴더에 넣으려면 배포용 빌드 시 `base: '/remotes/shared/'`(또는 `assetPrefix: 'auto'`)로 빌드해야 합니다.
  2. **`remotes` 엔트리 URL 전환 필수**: 호스트의 `remotes`가 `'http://localhost:3004/mf-manifest.json'`을 가리키고 있으면 Live Server(`5500`)에서 열어도 `3004` 포트를 찾아갑니다. 서브패스 배포 시에는 `'/remotes/shared/mf-manifest.json'` 또는 런타임 설정(`config.json` + `registerRemotes`)을 사용해야 합니다.
  3. **Live Server의 2가지 한계**:
     - `api-server(Port 4000)`는 Node.js API 서버이므로 Live Server와 별도로 실행해 두어야 합니다(CORS는 이미 허용됨).
     - Phase 2에서 SPA 라우팅(`/products/:id`)을 도입하면 Live Server는 새로고침 시 `index.html`로 폴백(History API Fallback)해주지 못해 404가 발생합니다. 라우팅 도입 후에는 Nginx `try_files`나 Node 정적 서빙 스크립트를 사용하는 것이 좋습니다.

### 2.2 패턴 B: 도메인 / 포트 분리형 독립 배포 (멀티 CDN · `vite/rspack preview`)

- 각 서비스 팀이 독립된 S3/CDN 도메인(`https://shared.cdn.example.com`, `https://products.cdn.example.com`, `https://cart.cdn.example.com`)에 각자 `dist/`를 배포하는 방식입니다.
- **장점**: 팀별 배포 파이프라인·캐시 무효화·도메인 관리가 완전히 분리됩니다.
- **필수 요구사항**:
  - 각 리모트 CDN 응답 헤더에 **`Access-Control-Allow-Origin`**(CORS) 허용이 반드시 필요합니다.
  - 호스트가 빌드 타임에 리모트 URL을 하드코딩하지 않고, **환경변수 또는 런타임 `remotes-config.json` + `registerRemotes`**(Phase 2.2 학습 대상)로 스테이징/프로덕션 URL을 주입해야 "한 번 빌드한 아티팩트(Build Once, Deploy Anywhere)" 원칙을 지킬 수 있습니다.

---

## Part 3. 로컬 정적 배포 패키지 생성 및 테스트 체크리스트

Phase 1의 **Step 1.7**에서는 아래와 같은 간단한 흐름으로 로컬 프로덕션 검증을 수행합니다.

1. **클린 배포 패키지 조립 (`deploy-preview/` — Git 미추적)**
   - 각 앱을 프로덕션용 `base`/`remotes` 설정으로 빌드합니다.
   - `@mf-types*`, `mf-stats.json`, `*.map`을 모두 제외한 정적 리소스만 `deploy-preview/` 하위 폴더로 모읍니다.
2. **정적 서버 기동 및 API 서버 연동**
   - `api-server(Port 4000)`를 기동합니다.
   - `deploy-preview/`를 단일 정적 서버(VS Code Live Server 또는 경량 Node 정적 서버)로 서빙합니다.
3. **브라우저 DevTools 검증 5대 포인트**
   - **Network 탭 1**: `@mf-types.zip`, `mf-stats.json` 요청이 **0건**인지 확인 (삭제해도 에러 없음 증명)
   - **Network 탭 2**: 모든 `remoteEntry.js`, `mf-manifest.json`, `assets/*.js`, `assets/*.css`, 상품 이미지에서 **404 에러 0건** 확인
   - **Console 탭**: 싱글톤(`react`, `@tanstack/react-query`) 충돌 경고 및 `CORS` 에러 0건 확인
   - **기능 동작**: 상품 목록 조회, 필터링, `Mode A` / `Mode B` 장바구니 동기화 정상 동작 확인
   - **격리 확인**: 한 리모트 서버/리소스를 의도적으로 차단했을 때 호스트의 `RemoteErrorBoundary`가 전체 앱 크래시 없이 폴백 UI를 보여주는지 확인

---

## Part 4. 실서비스 운영: HTTP 캐싱, 버전 불일치(`ChunkLoadError`), 롤백 전략

### 4.1 진입점과 청크의 HTTP `Cache-Control` 분리 원칙 (필수)

MFE 운영 장애의 절반 이상은 **잘못된 CDN 캐시 헤더**에서 발생합니다.

| 대상 파일 | 권장 `Cache-Control` 헤더 | 이유 |
| :--- | :--- | :--- |
| **`index.html`**<br>**`mf-manifest.json`**<br>**`remoteEntry.js`** | `no-cache, no-store, must-revalidate` *(또는 짧은 `max-age=0, must-revalidate`)* | 파일명 자체에 콘텐츠 해시가 없으므로, 배포 즉시 브라우저가 최신 매니페스트와 최신 청크 목록을 받도록 매번 재검증해야 합니다. |
| **`assets/*.[hash].js`**<br>**`assets/*.[hash].css`**<br>해시된 이미지 에셋 | `public, max-age=31536000, immutable` | 파일명에 해시가 포함되어 내용이 바뀌면 파일명도 바뀝니다. 1년 장기 캐싱으로 트래픽과 로딩 속도를 극대화합니다. |

### 4.2 리모트 독립 배포 시 `ChunkLoadError`와 롤백 전략

1. **구버전 청크 보존 기간(Grace Period) 두기**
   - 리모트를 새로 배포할 때 S3/CDN에서 기존 해시 청크(`assets/ProductList-OLDHASH.js`)를 **즉시 지우지 말고 일정 기간(예: 1~7일) 유지**합니다.
   - 이미 화면을 열어두고 있던 사용자가 지연 로드된 청크를 요청할 때 404(`ChunkLoadError`)로 깨지는 것을 막아줍니다.
2. **버전 디렉터리 기반 무중단 롤백 (Atomic Switch)**
   - S3에 덮어쓰기 배포 대신 버전 폴더(`/v1.2.0/`, `/v1.2.1/`)로 올리고, `mf-manifest.json`(또는 CloudFront/게이트웨이 라우팅)이 가리키는 버전 경로만 바꾸면 **1초 만에 이전 버전으로 즉시 롤백**할 수 있습니다.
3. **카나리(Canary) / 점진적 배포**
   - 호스트가 리모트 엔트리를 런타임에 결정(`registerRemotes` + 설정 API)하도록 구성하면, 전체 사용자 중 5%에게만 신규 버전 리모트 URL을 내려보내 오류율을 모니터링한 뒤 전체 확대할 수 있습니다.
