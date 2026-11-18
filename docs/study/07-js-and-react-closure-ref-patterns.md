# 📙 Study 07. JavaScript 클로저·참조 동일성과 React `useRef` 최신 핸들러 패턴

> **문서 목적**: React 커스텀 훅이나 이벤트 리스너를 작성할 때 자주 마주치는 `savedHandlerRef = useRef(handler)` 패턴(Latest Ref Pattern)을 완벽하게 이해하기 위한 독립 학습 가이드입니다. 프로젝트 코드와 무관하게 독립 실행·해석이 가능한 **순수 JavaScript 예제**와 **React 예제**를 통해 **참조 동일성, 클로저(Stale Closure), `useRef`의 내부 동작 원리**까지 단계별로 다룹니다.

---

## 📊 한눈에 보는 핵심 요약

| 핵심 질문 | JavaScript 원리 | React 적용 결과 |
| :--- | :--- | :--- |
| **왜 매번 리스너가 재등록되나요?** | 함수 리터럴(`() => {}`)은 실행될 때마다 **새 메모리 주소**를 가짐 (`fn1 !== fn2`) | 리렌더링마다 새 콜백 함수가 만들어져 `useEffect` 의존성 비교(`Object.is`)가 항상 "변경됨"으로 판정 |
| **그럼 의존성에서 함수를 빼면 안 되나요?** | 함수가 선언된 시점의 지역 변수를 **클로저**가 가두기 때문 | 최초 마운트 시점의 `state`/`props`만 기억해 옛날 값이 실행되는 **Stale Closure** 버그 발생 |
| **`useRef`는 어떻게 둘 다 해결하나요?** | 껍데기 객체(`{ current }`)의 **주소는 고정**하고 내부 속성 `.current`만 교체 | `useEffect`는 재실행하지 않으면서(`.current` 객체 주소 고정), 실행 시점에는 항상 **최신 함수** 호출 |

---

## Part 1. JavaScript 핵심 기초

React의 `useRef`와 `useEffect`를 깊이 이해하려면 먼저 JavaScript 엔진이 **값, 참조, 클로저**를 다루는 3가지 규칙을 정확히 알아야 합니다.

### 1.1 원시 값(Primitive) vs 참조 값(Object / Function Reference)

JavaScript에서 숫자·문자열·불리언 같은 **원시 값**은 "값 자체"를 비교하지만, 객체와 **함수는 "메모리 주소(참조)"를 비교**합니다.

```js
// 1. 원시 값: 내용이 같으면 같다.
console.log(10 === 10); // true
console.log('hello' === 'hello'); // true

// 2. 객체 및 함수: 모양과 코드가 똑같아도 새로 만들면 다른 메모리 주소를 가진다.
const objA = { count: 0 };
const objB = { count: 0 };
console.log(objA === objB); // false

function createHandler() {
  return () => console.log('클릭됨');
}

const fn1 = createHandler();
const fn2 = createHandler();
console.log(fn1 === fn2); // false (서로 다른 함수 인스턴스)
```

#### 핵심 포인트
- 함수가 호출될 때마다 내부에서 선언한 `() => ...` 화살표 함수는 **매번 새로운 메모리 주소에 새로 할당**됩니다.
- React 함수 컴포넌트도 결국 하나의 JavaScript 함수이므로, **리렌더링 = 컴포넌트 함수 재호출**이며 그 안의 인라인 콜백은 매번 새 참조(`fn1 !== fn2`)를 갖게 됩니다.

---

### 1.2 렉시컬 스코프와 클로저(Closure)

**클로저**란 "함수가 선언된 시점의 주변 환경(Lexical Environment, 지역 변수 등)을 함수가 기억하여, 외부 함수가 종료된 뒤에도 그 변수에 접근할 수 있는 현상"입니다.

```js
function createCounterLogger(label) {
  let count = 0;

  return function log() {
    count += 1;
    console.log(`[${label}] 현재 카운트: ${count}`);
  };
}

const loggerA = createCounterLogger('A');
loggerA(); // [A] 현재 카운트: 1
loggerA(); // [A] 현재 카운트: 2
```

여기까지는 유용하지만, **매 실행마다 새로운 변수가 만들어지는 환경(예: React 렌더 스냅샷)**과 만나면 **Stale Closure(오래된 클로저)**라는 함정이 됩니다.

---

### 1.3 순수 JS로 재현하는 Stale Closure (오래된 클로저)

아래 순수 JavaScript 코드는 React 없이도 Stale Closure가 왜 발생하는지 그대로 재현합니다.

```js
// 가상의 전역 이벤트 저장소
let registeredListener = null;

function subscribeOnce(listener) {
  if (!registeredListener) {
    console.log('>> 리스너 최초 1회 등록!');
    registeredListener = listener;
  }
}

function triggerEvent() {
  registeredListener?.();
}

// 가상의 UI 상태와 렌더링 함수 시뮬레이션
let stateCount = 0;

function renderComponent() {
  // 매 렌더링(함수 호출)마다 그 시점의 stateCount를 복사한 상수가 만들어진다.
  const snapshotCount = stateCount;

  // 이 함수는 자신이 태어난 렌더링 시점의 snapshotCount를 클로저로 기억한다.
  const handleEvent = () => {
    console.log(`이벤트 시점의 count = ${snapshotCount} (실제 최신 stateCount = ${stateCount})`);
  };

  // 최초 1회만 리스너를 등록하고 이후에는 재등록하지 않는다.
  subscribeOnce(handleEvent);
}

// [1회차 렌더링] stateCount = 0
renderComponent(); // 출력: >> 리스너 최초 1회 등록!

// [사용자 클릭으로 상태 변경]
stateCount = 1;
renderComponent(); // 재등록 안 함

stateCount = 2;
renderComponent(); // 재등록 안 함

// [이벤트 발생!]
triggerEvent();
// 출력: 이벤트 시점의 count = 0 (실제 최신 stateCount = 2)
```

#### 왜 `0`이 출력될까요?
- `renderComponent()`가 1회차에 호출될 때 만들어진 `snapshotCount = 0`과 2회차에 만들어진 `snapshotCount = 1`은 **서로 다른 호출 스택의 별개 변수**입니다.
- `registeredListener`는 **1회차에 만들어진 `handleEvent`만 계속 붙잡고** 있기 때문에, 2회차·3회차에 새로 만들어진 `handleEvent`를 알지 못합니다.

---

### 1.4 순수 JS로 이해하는 박스 객체(`{ current }`) 우회 패턴

위 문제를 해결하면서도 `subscribeOnce`를 매번 다시 호출하지 않으려면 어떻게 해야 할까요?  
해답은 **"바깥 껍데기 객체의 메모리 주소는 고정하고, 그 안의 `.current` 속성만 갈아끼우는 것"**입니다.

```js
let registeredListener = null;

function subscribeOnce(listener) {
  if (!registeredListener) {
    console.log('>> 리스너 최초 1회 등록!');
    registeredListener = listener;
  }
}

function triggerEvent() {
  registeredListener?.();
}

// 껍데기 박스 객체는 컴포넌트 생애주기 동안 단 한 번만 생성된다. (참조 주소 고정)
const savedHandlerBox = { current: null };

let stateCount = 0;

function renderComponent() {
  const snapshotCount = stateCount;

  const handleEvent = () => {
    console.log(`최신 count = ${snapshotCount}`);
  };

  // [핵심] 매 렌더링마다 껍데기(savedHandlerBox)는 그대로 두고 내용물(.current)만 최신 함수로 교체!
  savedHandlerBox.current = handleEvent;

  // 등록하는 래퍼 함수는 savedHandlerBox.current를 "실행 시점에" 조회한다.
  subscribeOnce(() => {
    savedHandlerBox.current();
  });
}

// [1회차 렌더링]
renderComponent(); // 출력: >> 리스너 최초 1회 등록!

// [상태 변경 및 리렌더링]
stateCount = 1;
renderComponent();

stateCount = 2;
renderComponent();

// [이벤트 발생!]
triggerEvent();
// 출력: 최신 count = 2
```

#### 핵심 원리
1. `savedHandlerBox` 객체의 주소는 변하지 않습니다.
2. 래퍼 함수 `() => savedHandlerBox.current()`는 `snapshotCount` 같은 옛날 값을 직접 가두지 않고 **고정된 `savedHandlerBox` 주소**만 기억합니다.
3. 이벤트가 실제 발생하는 순간 `savedHandlerBox.current`를 꺼내 실행하므로, 리스너를 재등록하지 않고도 항상 최신 `handleEvent`를 호출할 수 있습니다.
4. **React의 `useRef(initialValue)`가 반환하는 것이 바로 이 `{ current: initialValue }` 평범한 자바스크립트 객체입니다.**

---

## Part 2. React 핵심 원리

### 2.1 React 함수 컴포넌트의 리렌더링 본질

React에서 상태가 바뀌어 리렌더링이 발생하면 다음과 같은 일이 일어납니다.

1. React가 **컴포넌트 함수를 처음부터 끝까지 다시 호출**합니다.
2. 그 호출 시점의 `props`와 `state`는 해당 렌더링만의 **독립된 스냅샷(상수)**입니다.
3. 컴포넌트 본문 안에 선언된 **모든 일반 함수·객체·배열 리터럴은 새로 생성**됩니다.
4. 렌더링이 화면(DOM)에 반영된 후, `useEffect`는 **의존성 배열(`[...]`)의 각 항목을 이전 렌더링과 `Object.is`로 비교**하여 하나라도 달라졌을 때만 `cleanup` → `setup`을 다시 실행합니다.

---

### 2.2 컴포넌트 내부 3가지 저장소 비교

| 구분 | 일반 지역 변수 (`let x = ...`) | `useState` | `useRef` |
| :--- | :---: | :---: | :---: |
| **리렌더링 간 값 유지** | ❌ (렌더링마다 초기화) | ✅ (React가 외부에 보관) | ✅ (React가 동일 객체 유지) |
| **값 변경 시 리렌더링 유발** | ❌ | ✅ (`setState` 호출 시 예약) | ❌ (조용히 `.current`만 변경) |
| **값 변경 반영 시점** | 즉시 | **다음 렌더링**부터 반영 | **즉시** (동기적으로 변경됨) |
| **주된 용도** | 렌더 중 계산용 임시 값 | UI에 그려야 하는 상태 | DOM 참조, 타이머 ID, 최신 콜백 참조 |

---

### 2.3 실전 독립 샘플: `ShortcutCounter`로 보는 3단계 진화

키보드 `Enter` 키를 누를 때마다 현재 `step`(증가 폭)만큼 카운트를 증가시키거나 현재 `count`를 알림으로 출력하는 간단한 독립 컴포넌트를 예로 들어보겠습니다.

#### ❌ 안티패턴 A: `useEffect` 의존성에 `handler`를 그대로 넣기

```tsx
import { useEffect, useState } from 'react';

function useWindowKeydownBadA(key: string, handler: () => void) {
  useEffect(() => {
    console.log(`[A] '${key}' 리스너 등록`);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) handler();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      console.log(`[A] '${key}' 리스너 해제`);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [key, handler]); // 👈 매 렌더마다 바뀌는 handler를 의존성에 넣음
}

export function ShortcutCounterA() {
  const [count, setCount] = useState(0);

  // 리렌더링될 때마다 이 화살표 함수는 새로운 메모리 주소로 생성된다.
  useWindowKeydownBadA('Enter', () => {
    console.log(`현재 count: ${count}`);
  });

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      카운트 증가 ({count})
    </button>
  );
}
```

- **무슨 문제가 생기나요?**  
  버튼을 1번 클릭해 `count`가 바뀔 때마다 콘솔에 다음 로그가 매번 찍힙니다.
  ```text
  [A] 'Enter' 리스너 해제
  [A] 'Enter' 리스너 등록
  ```
- **단점**: `count`가 바뀔 뿐인데 `window.removeEventListener` → `window.addEventListener`가 계속 반복됩니다. 만약 이 안이 `WebSocket` 연결이나 `ResizeObserver`, 애니메이션 프레임 구독이었다면 성능 저하·연결 끊김이 발생합니다.

---

#### ❌ 안티패턴 B: 재등록을 막겠다고 의존성에서 `handler`만 빼버리기

```tsx
import { useEffect, useState } from 'react';

function useWindowKeydownBadB(key: string, handler: () => void) {
  useEffect(() => {
    console.log(`[B] '${key}' 리스너 등록`);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) handler(); // 👈 최초 마운트 시점의 handler를 클로저로 가둠!
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: Stale Closure 문제 시연용
  }, [key]);
}

export function ShortcutCounterB() {
  const [count, setCount] = useState(0);

  useWindowKeydownBadB('Enter', () => {
    console.log(`현재 count: ${count}`);
  });

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      카운트 증가 ({count})
    </button>
  );
}
```

- **무슨 문제가 생기나요?**  
  버튼을 5번 클릭해 화면에는 `카운트 증가 (5)`라고 떠 있는데, `Enter` 키를 누르면 콘솔에는 다음처럼 출력됩니다.
  ```text
  현재 count: 0   <-- 버그! 화면은 5인데 계속 0만 출력됨
  ```
- **원인**: `useEffect`가 마운트 시점(1회차 렌더, `count === 0`)의 `handler`만 기억하고 있기 때문입니다(**Stale Closure**).

---

#### ✅ 해결책: Latest Ref Pattern (`useRef`로 최신 핸들러 유지)

```tsx
import { useEffect, useRef, useState } from 'react';

/**
 * window 키보드 이벤트를 구독하되, 리스너 재등록 없이 항상 최신 handler를 실행하는 커스텀 훅
 */
export function useWindowKeydown(key: string, handler: () => void) {
  // 1. 컴포넌트 생애주기 동안 변하지 않는 { current: handler } 박스를 만든다.
  const savedHandlerRef = useRef(handler);

  // 2. 최신 핸들러 참조로 갱신한다.
  //    (참고: 동시성 모드 안전성까지 고려하려면 useLayoutEffect/useEffect 내부에서 갱신하는 방식도 사용합니다. 아래 2.4절 참고)
  savedHandlerRef.current = handler;

  // 3. key가 바뀌지 않는 한 리스너 등록/해제는 마운트·언마운트 시 딱 1회만 실행된다.
  useEffect(() => {
    console.log(`[OK] '${key}' 리스너 등록 (최초 1회)`);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) {
        // 4. 이벤트가 실제 발생한 시점에 박스 안의 최신 함수를 꺼내 실행한다.
        savedHandlerRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      console.log(`[OK] '${key}' 리스너 해제 (언마운트 시)`);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [key]);
}

export function ShortcutCounter() {
  const [count, setCount] = useState(0);

  // 매 렌더마다 인라인 함수를 넘겨도 리스너가 재등록되지 않으며, 항상 최신 count를 읽는다!
  useWindowKeydown('Enter', () => {
    console.log(`현재 count: ${count}`);
  });

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      카운트 증가 ({count})
    </button>
  );
}
```

#### 실행 타임라인 추적 (단계별 동작)
1. **최초 마운트 (`count = 0`)**
   - `savedHandlerRef` 객체 생성 (`{ current: fn_count_0 }`).
   - `useEffect` 실행 → `window.addEventListener('keydown', onKeyDown)` 1회 등록.
2. **사용자가 버튼 3번 클릭 (`count = 3`)**
   - 컴포넌트 3번 리렌더링 → 매번 `savedHandlerRef.current = fn_count_3`으로 `.current`만 조용히 교체.
   - `key`는 여전히 `'Enter'`이므로 `useEffect`는 재실행되지 않음(리스너 재등록 없음!).
3. **사용자가 `Enter` 키 입력**
   - 등록되어 있던 `onKeyDown` 실행 → `savedHandlerRef.current()` 호출 → `fn_count_3()` 실행.
   - 콘솔 출력: `현재 count: 3` ✅

---

### 2.4 심화: 실무에서 알아두면 좋은 3가지 포인트

#### ① `.current = handler` 대입 위치: 렌더 본문 vs `useInsertionEffect` / `useEffect`
- **렌더 본문 대입 (`savedHandlerRef.current = handler`)**:
  - 가장 간결하고 직관적이어서 많은 코드베이스에서 널리 사용됩니다.
  - 단, React 공식 규칙상 엄격한 동시성 렌더링(Concurrent Rendering)에서 렌더가 중단·폐기될 경우 커밋되지 않은 렌더의 `handler`가 일시적으로 `ref`에 기록될 여지가 있어, 최근에는 **`useLayoutEffect` 또는 `useEffect` 안에서 `.current`를 갱신**하는 방식이 더욱 엄격한 표준으로 권장되기도 합니다.
  ```tsx
  const savedHandlerRef = useRef(handler);
  useEffect(() => {
    savedHandlerRef.current = handler;
  }); // 의존성 배열 생략 시 커밋 직후마다 안전하게 최신화
  ```
- **주의**: 만약 `useEffect` 안에서(마운트 직후가 아니라) 다른 `useLayoutEffect`가 즉시 그 콜백을 호출해야 한다면 `useLayoutEffect`에 넣거나 `useInsertionEffect`를 사용합니다. (일반 DOM/브라우저 이벤트 리스너는 커밋 이후 사용자 조작으로 발생하므로 `useEffect`로도 충분합니다.)

#### ② 그럼 `useCallback`은 언제 쓰나요?
| 상황 | 권장 도구 | 이유 |
| :--- | :--- | :--- |
| **자식 컴포넌트(`React.memo`)에 props로 내려줄 때** | `useCallback` | 자식에게 넘기는 함수 참조 자체를 고정해야 자식의 불필요한 리렌더링을 막을 수 있음 |
| **커스텀 훅 내부에서 외부 콜백을 `useEffect`로 구독할 때** | **`useRef` (Latest Ref Pattern)** | 훅을 호출하는 쪽에 "`useCallback`으로 꼭 감싸서 넘기세요"라고 강제하지 않아도 안전하게 동작함 (API 사용성 극대화) |
| **타이머(`setInterval`) 내부에서 최신 `state`를 읽어야 할 때** | **`useRef` 또는 `setState(prev => ...)`** | 인터벌을 껐다 켜지 않고도 최신 상태를 읽어 타이머 주기가 깨지지 않음 |

#### ③ React 19의 `useEffectEvent`와의 관계
- React 팀도 이 패턴(`Latest Ref Pattern`)이 너무 자주 쓰이고 실수하기 쉽다는 점을 인지하여, 실험적/차기 훅인 **`useEffectEvent`**를 설계했습니다.
- `useEffectEvent`는 내부적으로 바로 이 **`savedHandlerRef` 패턴을 React 엔진 차원에서 추상화**해 제공하는 기능입니다. 따라서 `useRef` 기반 패턴의 동작 원리를 이해해 두면 React의 이펙트 모델 전체를 꿰뚫어 볼 수 있습니다.
