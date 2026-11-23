# 🎨 Study 11. 실무 웹 서비스 필수 CSS 폰트 · 타이포그래피 설정 가이드

> **문서 목적**: `font-variant-numeric: tabular-nums` 같은 숫자 고정폭 정렬뿐만 아니라, 실무 웹 서비스와 디자인 시스템에서 **가독성·렌더링 품질·CLS(레이아웃 밀림) 방지·한글 줄바꿈·MFE 폰트 중복 로드 차단**을 위해 기본적으로 세팅해야 하는 핵심 CSS 폰트·타이포그래피 속성을 체계적으로 정리한 실전 레퍼런스입니다.

---

## 📊 한눈에 보는 실무 필수 CSS 폰트 설정 치트시트

| 분류 | 핵심 CSS 속성 | 실무 표준 값 | 적용 목적 |
| :--- | :--- | :--- | :--- |
| **전역 상속** | `font` (`button`, `input`, `select`, `textarea`) | `font: inherit;` | 브라우저가 폼 요소에 강제하는 구형 시스템 폰트를 제거하고 `body` 폰트 통일 상속 |
| **렌더링 품질** | `-webkit-font-smoothing` / `text-size-adjust` | `antialiased` / `100%` | macOS 글자 번짐 완화 및 모바일 가로 회전 시 텍스트 자동 확대 왜곡 차단 |
| **가짜 굵기 방지** | `font-synthesis` | `none` | 폰트 파일에 없는 Bold/Italic을 브라우저가 억지로 뭉개어 그리는 현상 차단 |
| **로딩 최적화** | `font-display` | `swap` (또는 `optional`) | 웹폰트 다운로드 중 글자가 안 보이는 FOIT 현상 차단 |
| **숫자 정렬** | `font-variant-numeric` | `tabular-nums` (`slashed-zero`) | 금액·수량·타이머 변경 시 레이아웃 흔들림 제거 및 코드 문자열 `0`/`O` 구분 |
| **한글 줄바꿈** | `word-break` + `overflow-wrap` | `keep-all` + `break-word` | 한글 단어 중간 쪼개짐 방지 + 긴 URL/영문은 박스 밖으로 넘치지 않게 개행 |
| **행간·자간** | `line-height` / `letter-spacing` | `1.5` (단위 없음) / `-0.01em` | 폰트 크기 변경 시에도 비율 유지(px 상속 함정 차단) |
| **최신 줄 균형** | `text-wrap` | `balance` (제목) / `pretty` (본문) | 제목 줄 길이 균등 분배 및 본문 마지막 줄 1단어 고아(Orphan) 방지 |
| **말줄임** | `min-width: 0` + `text-overflow` | `ellipsis` / `-webkit-line-clamp` | Flexbox/Grid 내부 긴 텍스트 넘침 차단 및 1줄·다중 줄 말줄임 |

---

## Part 1. 전역 폰트 기본 세팅과 렌더링 품질

### 1.1 시스템 UI 폰트 스택과 폴백 설계
웹폰트를 로드하더라도 다운로드 전이나 오프라인 환경을 대비해 OS별 현대 시스템 폰트를 폴백으로 지정합니다.

```css
:root {
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont,
    'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body {
  font-family: var(--font-sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  font-synthesis: none;
}
```

### 1.2 폼 컨트롤(`button`, `input`, `select`, `textarea`)의 `font: inherit` 필수화
- **발생 배경**: 브라우저 기본 스타일시트(User-Agent Stylesheet)는 `<button>`, `<input>`, `<select>`, `<textarea>`에 `body`의 `font-family`와 `font-size`를 상속시키지 않고 자체 기본 폰트(`Arial`, `13.33px` 등)를 강제 적용합니다.
- **해결**: 전역 Reset 단계(MFE에서는 호스트 또는 `remote-shared/theme` 단 한 곳)에 아래 선언을 반드시 포함합니다.
  ```css
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }
  ```

### 1.3 렌더링 품질·보정 3대 속성
1. **`-webkit-font-smoothing: antialiased` & `-moz-osx-font-smoothing: grayscale`**:
   - macOS(Retina)에서 기본 서브픽셀 렌더링으로 인해 어두운 배경 위 밝은 글자나 웹폰트가 과도하게 두꺼워 보이는 현상을 완화해 디자이너의 Figma 시안과 굵기를 맞춥니다.
2. **`text-size-adjust: 100%` (`-webkit-text-size-adjust: 100%`)**:
   - iOS Safari 등 모바일 브라우저에서 화면을 가로로 돌릴 때 텍스트를 임의로 확대해 레이아웃을 망가뜨리는 동작을 막습니다. *(참고: `none`을 쓰면 데스크톱 접근성 확대까지 막힐 수 있어 반드시 `100%` 사용이 표준)*
3. **`font-synthesis: none` (또는 `font-synthesis-weight: none`)**:
   - 웹폰트에 `500`, `700` 웨이트만 불러왔는데 코드에서 `font-weight: 800`이나 `font-style: italic`을 쓰면 브라우저가 글자를 강제로 겹쳐 그리거나 기울여(Faux Bold / Faux Italic) 흐릿하게 뭉갭니다. `font-synthesis: none`으로 가짜 합성을 차단해 의도치 않은 폰트 깨짐을 즉시 발견할 수 있습니다.
4. **⚠️ `text-rendering: optimizeLegibility` 남용 주의**:
   - 자간(Kerning)과 합자(Ligature) 품질을 높여주지만, 긴 본문 전체(`body`)에 걸면 모바일 저사양 기기에서 텍스트 레이아웃 연산 비용이 커지므로 대형 제목(`h1`, `h2`)에만 선별 적용하는 것이 안전합니다.

---

## Part 2. 웹폰트 로딩 최적화와 CLS(`FOIT`/`FOUT`) 방어 (`@font-face`)

### 2.1 `font-display` 전략 비교 (`FOIT` vs `FOUT`)
- **FOIT (Flash of Invisible Text)**: 웹폰트가 내려올 때까지 글자가 아예 안 보이는 현상 (최악의 UX).
- **FOUT (Flash of Unstyled Text)**: 먼저 시스템 폴백 폰트로 글자를 보여준 뒤 웹폰트가 도착하면 교체하는 현상.

| 값 | 동작 방식 | 적합한 용도 |
| :--- | :--- | :--- |
| **`swap`** (실무 기본) | 즉시 폴백 폰트로 텍스트 표시 → 웹폰트 로드 완료 시 교체 | 브랜드 폰트가 중요한 일반 웹 서비스·콘텐츠 페이지 |
| **`fallback`** | 아주 짧은 대기(약 100ms) 후 폴백 표시, 일정 시간(약 3초) 내 도착 시에만 교체 | 느린 3G 환경에서 뒤늦은 깜빡임(FOUT)을 방지하고 싶을 때 |
| **`optional`** | 약 100ms 안에 캐시/로드되면 웹폰트 사용, 아니면 이번 페이지에서는 폴백 유지 (다음 방문 시 캐시 적용) | **CLS `0`과 LCP 최우선**인 랜딩 페이지·검색 서비스 |

### 2.2 `size-adjust` · `ascent-override`로 폰트 교체 시 레이아웃 밀림(CLS) 차단
웹폰트와 시스템 폴백 폰트의 글자 폭·높이가 다르면 `font-display: swap` 교체 순간 화면이 덜컥거립니다. 폴백 전용 `@font-face`에 메트릭 오버라이드를 지정해 크기 차이를 0에 가깝게 맞춥니다.

```css
@font-face {
  font-family: 'Pretendard Fallback';
  src: local('Apple SD Gothic Neo'), local('Malgun Gothic');
  size-adjust: 100%;
  ascent-override: 95%;
  descent-override: 24%;
  line-gap-override: 0%;
}
```

### 2.3 `unicode-range` 구간별 폰트 매핑과 가변 폰트(`Variable Font`)
1. **`unicode-range` 분할 로딩 & 숫자 전용 폰트 합성**:
   - 한글 전체 완성형 폰트를 한 번에 받지 않고 빈도별 서브셋(Dynamic Subset)으로 쪼개거나, **숫자 구간(`U+0030-0039`)만 `tnum`(고정폭 숫자)을 지원하는 영문·숫자 폰트(`Inter`, `Pretendard` 등)로 지정**할 수 있습니다.
   ```css
   @font-face {
     font-family: 'BrandTextWithTabularNums';
     src: url('/fonts/Inter-Variable.woff2') format('woff2');
     unicode-range: U+0030-0039, U+002C, U+002E; /* 0-9, 쉼표(,), 마침표(.) */
     font-display: swap;
   }
   ```
2. **가변 폰트 (`Variable Font`)**:
   - `Regular(400)`, `Medium(500)`, `SemiBold(600)`, `Bold(700)` 파일을 4번 따로 요청하는 대신 `woff2` 파일 1개에 `font-weight: 100 900;` 범위를 선언해 HTTP 요청 수와 총 용량을 줄입니다.

---

## Part 3. 숫자 · OpenType 세부 타이포그래피 (`font-variant-numeric`)

### 3.1 `font-variant-numeric` 주요 값 정리
> **⚠️ 핵심 주의**: `font-variant-numeric` 속성은 브라우저가 글자 폭을 억지로 변형하는 기능이 아니라, **폰트 파일 내부의 OpenType 기능 테이블(`tnum`, `zero`, `lnum` 등)을 활성화하는 스위치**입니다. 폰트가 해당 OpenType 기능을 지원하지 않으면 에러 없이 조용히 무시됩니다. (`Pretendard`, `Inter`, `Roboto`, `Noto Sans KR`, `SF Pro`, `Segoe UI` 등 현대 UI 폰트는 대부분 기본 지원)

| 값 | OpenType 태그 | 설명 및 실무 활용처 |
| :--- | :---: | :--- |
| **`tabular-nums`** | `tnum` | `0`~`9` 모든 숫자의 가로 폭을 동일하게 고정 → **장바구니 금액, 수량, 가격표, 실시간 타이머, 대시보드 KPI** |
| **`proportional-nums`** | `pnum` | 숫자마다 자연스러운 가변 폭 적용 (기본값) → 일반 본문 문장 속 연도·날짜 |
| **`slashed-zero`** | `zero` | 숫자 `0` 가운데에 사선(`Ø`)을 표시해 영문 대문자 `O`와 명확히 구분 → **주문번호, 쿠폰 코드, 인증 코드, API 키** |
| **`lining-nums`** | `lnum` | 모든 숫자의 높이를 대문자 높이에 맞춰 수평 정렬 → 표·카드 숫자 |
| **`oldstyle-nums`** | `onum` | 일부 숫자(`3`, `4`, `5`, `7`, `9`)가 기준선 아래로 내려오는 클래식 서적 스타일 → 에디토리얼·블로그 본문 |

```css
/* 금액·수량·실시간 카운터 (Study 05 #16) */
.price-text {
  font-variant-numeric: tabular-nums lining-nums;
}

/* 주문번호·쿠폰 코드 (0과 O 혼동 방지) */
.order-code {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums slashed-zero;
}
```

### 3.2 `font-kerning` 및 `font-variant-ligatures`
- **`font-kerning: normal` (기본값)**: `AV`, `To` 같은 글자 쌍의 시각적 간격을 폰트 커닝 테이블에 따라 자동 보정합니다.
- **`font-variant-ligatures: none`**: 코드 에디터나 고정폭 식별자 표시 영역에서 `fi`, `fl`, `->`, `!=` 등이 합자(Ligature)로 붙어 복사·판독을 방해하는 현상을 차단할 때 사용합니다.

---

## Part 4. 한글 줄바꿈 · 가독성 · 말줄임 필수 패턴

### 4.1 한글 줄바꿈의 절대 정석 (`word-break: keep-all` + `overflow-wrap: break-word`)
- 기본값(`word-break: normal`)에서는 한글 문장이 어절 중간에서 잘려(`장바구니에 담` / `기`) 가독성이 크게 떨어집니다.
- 그렇다고 `word-break: keep-all`만 단독으로 쓰면 공백 없는 긴 URL이나 영문 에러 코드(`RESPONSE_SCHEMA_INVALID_...`)가 카드 밖으로 뚫고 나갑니다.
- **실무 정석 조합**:
  ```css
  .korean-text {
    word-break: keep-all;       /* 한글은 단어(어절) 단위로 깔끔하게 줄바꿈 */
    overflow-wrap: break-word;  /* 단, 한 줄보다 긴 URL·영문 단어는 넘치지 않게 강제 개행 */
  }
  ```

### 4.2 `line-height` 단위 없는 비율 원칙과 `letter-spacing`
- **❌ 나쁜 예**: `body { line-height: 24px; }` → 자식 요소가 `font-size: 32px`인 큰 제목(`h1`)이 되어도 고정값 `24px`이 그대로 상속되어 위아래 글자가 겹칩니다!
- **✅ 좋은 예**: `body { line-height: 1.5; }` (단위 없는 배수) → 자식 요소의 `font-size`에 비례해 행간이 자동 계산됩니다. (일반 본문 `1.5 ~ 1.6`, 대형 제목 `1.2 ~ 1.3`)
- **`letter-spacing`은 `px`보다 `em` 단위 권장**: 예: `-0.015em`(한글 대형 제목의 살짝 좁은 자간), `0.02em`(대문자 영문 배지). `em`을 써야 폰트 크기가 반응형으로 바뀔 때도 시각적 비율이 유지됩니다.

### 4.3 최신 CSS 표준 `text-wrap: balance` & `text-wrap: pretty`
```css
/* 제목(1~4줄 이내): 각 줄의 글자 길이를 균등하게 분배해 시각적 안정감 확보 */
h1, h2, h3 {
  text-wrap: balance;
}

/* 일반 본문 문단: 마지막 줄에 단어 1개만 외롭게 남는 현상(Orphan) 최소화 */
p {
  text-wrap: pretty;
}
```
- 미지원 구형 브라우저에서는 안전하게 기본 줄바꿈으로 폴백(Progressive Enhancement)되므로 실무에서 부담 없이 적용할 수 있습니다.

### 4.4 1줄 말줄임과 다중 줄 말줄임 (`min-width: 0` 필수)
```css
/* 1줄 말줄임 — Flexbox/Grid 자식이라면 반드시 min-width: 0 필수! (Study 05 #16) */
.truncate-1 {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 2줄 말줄임 (카드 상품 설명 등) */
.truncate-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
```

---

## Part 5. MFE / 디자인 시스템 환경에서의 폰트 관리 원칙

마이크로 프론트엔드(`MFE`) 환경에서는 일반 단일 앱과 달리 폰트 로딩과 전역 타이포그래피 규칙을 한 단계 더 엄격히 통제해야 합니다 ([Study 04 #02, #05](./04-mfe-real-world-pitfalls-and-solutions.md)).

1. **`@font-face` 및 전역 `body` 폰트 선언은 단 1곳에서만 수행**:
   - 호스트(또는 공통 테마 `remote-shared/theme`)에서만 웹폰트 `@font-face`와 전역 `body`, `button/input { font: inherit; }`을 1회 로드합니다.
   - 각 도메인 리모트(`remote-products`, `remote-cart`)가 제각각 `@font-face`를 중복 번들링하면 브라우저가 같은 폰트 파일을 3~4번 중복 다운로드하거나 뒤늦게 로드된 리모트가 호스트의 `body` 폰트를 덮어쓰는 사고가 발생합니다.
2. **시맨틱 CSS 변수 토큰으로만 참조**:
   - 리모트 앱의 CSS에서는 폰트 패밀리를 직접 하드코딩하지 않고 `var(--mfe-font-sans)`, `var(--mfe-font-mono)` 같은 테마 토큰만 참조합니다.
3. **리모트 전용 폰트/아이콘 에셋이 필요한 경우 `assetPrefix: 'auto'` 필수**:
   - 리모트가 자체 폰트 파일(`.woff2`)을 품어야 하는 예외 상황에서는 반드시 `output.assetPrefix: 'auto'`(`Rsbuild/Rspack`) 또는 `base` 절대 URL(`Vite`)과 `CORS` 허용 헤더(`Access-Control-Allow-Origin: *`)를 설정해야 호스트 오리진에서 폰트 404 및 크로스 오리진 폰트 차단 에러가 발생하지 않습니다.
