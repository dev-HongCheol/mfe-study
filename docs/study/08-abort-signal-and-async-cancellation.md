# 📒 Study 08. JavaScript `AbortController` · `AbortSignal`과 React 비동기 취소 패턴

> **문서 목적**: 네트워크 요청이나 비동기 타이머 대기를 도중에 안전하게 중단할 때 사용하는 Web 표준 `AbortController` · `AbortSignal`의 내부 동작 원리를 정리한 독립 학습 가이드입니다. 프로젝트 코드와 별개의 **순수 JavaScript 예제**와 **React · TanStack Query 예제**를 통해 왜 단순 `Promise`가 아닌 `'abort'` 이벤트 리스너를 사용하는지, 그리고 응답 역전(Race Condition)과 메모리 누수를 어떻게 막는지 설명합니다.

---

## 📊 한눈에 보는 핵심 요약

| 핵심 질문 | JavaScript 원리 | 실무 효과 |
| :--- | :--- | :--- |
| **`AbortController`와 `AbortSignal`은 어떻게 다른가요?** | `Controller`는 **취소 버튼(송신기)**, `Signal`은 **취소 상태를 읽는 수신기** | 비동기 함수에 `signal`만 넘겨 권한을 분리(함수 내부에서 임의로 타인의 요청까지 취소 못 하게 캡슐화) |
| **왜 단순 `Promise`가 아니라 `'abort'` 이벤트 리스너를 붙이나요?** | 기본 `Promise`와 `setTimeout`은 외부 중단 기능이 없어 끝까지 기다려야 함 | `signal.addEventListener('abort', ...)`로 취소 순간을 즉시 푸시받아 **타이머를 0ms 만에 정리·탈출** |
| **React / TanStack Query에서는 왜 필수인가요?** | 이전 요청이 늦게 도착해 최신 화면을 덮어쓰는 **응답 역전(Race Condition)** 발생 가능 | `useEffect` cleanup 또는 `queryFn({ signal })` 연동을 통해 구버전 요청을 네트워크 단계에서 즉시 취소 |

---

## Part 1. JavaScript 핵심 원리 (`AbortController` · `AbortSignal`)

### 1.1 `AbortController` vs `AbortSignal` 구조와 역할 분리

JavaScript(Web 표준)는 비동기 작업 취소 책임을 **발신자(`AbortController`)**와 **수신자(`AbortSignal`)** 두 객체로 분리합니다.

```js
const controller = new AbortController();
const { signal } = controller;

console.log(signal.aborted); // false
console.log(signal.reason);  // undefined

// 취소 명령 실행 (선택적으로 사유 문자열이나 Error 전달 가능)
controller.abort('사용자가 검색어를 변경함');

console.log(signal.aborted); // true
console.log(signal.reason);  // '사용자가 검색어를 변경함'
```

#### 왜 하나의 객체로 합치지 않고 둘로 나눴을까요?
- `controller`를 비동기 함수에 통째로 넘기면 함수 내부에서 `controller.abort()`를 호출해 **같은 신호를 공유하는 다른 작업까지 취소해 버릴 위험**이 있습니다.
- 반면 `signal`은 **읽기 전용 수신기**(`aborted`, `reason`, `addEventListener('abort', ...)`)만 노출하므로, 작업 함수는 **"취소되었는지 감시만 할 수 있고, 취소 명령은 바깥 주인(`controller`)만 내릴 수 있는" 안전한 단방향 제어**가 가능합니다.

---

### 1.2 왜 단순 `Promise`가 아니라 `'abort'` 이벤트 리스너를 붙이나요?

JavaScript의 기본 `Promise`는 한 번 생성되면 외부에서 강제로 취소(`cancel`)하는 표준 API가 없습니다.

#### ❌ 단순 `Promise`로 지연을 구현했을 때의 문제

```js
function simpleDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBadTask(signal) {
  console.log('1. 대기 시작 (1500ms)');
  await simpleDelay(1500); // 👈 도중에 signal이 aborted 되어도 무조건 1500ms를 다 기다린다!

  if (signal?.aborted) {
    console.log('2. 1.5초를 다 허비한 뒤에야 취소된 걸 알게 됨!');
    return;
  }
  console.log('3. API 요청 출발');
}

const controller = new AbortController();
runBadTask(controller.signal);

// 0.1초 만에 취소 명령!
setTimeout(() => controller.abort(), 100);
```

- 위 코드에서 사용자는 `100ms` 만에 취소했지만, `simpleDelay(1500)`은 멈출 방법이 없어 **남은 `1400ms` 동안 타이머가 살아있고 실행 흐름도 멈추지 않습니다.**

#### ✅ `'abort'` 이벤트 리스너를 결합한 `delayWithSignal`

`AbortSignal`은 브라우저 표준 `EventTarget`을 상속받기 때문에, `controller.abort()`가 호출되는 **바로 그 즉시** `'abort'` 이벤트를 발생시킵니다.

```js
/**
 * AbortSignal과 연동되어 취소 시 즉시 타이머를 해제하고 탈출하는 지연 함수
 */
function delayWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    // 사용자 정의 문자열 사유(signal.reason)가 있더라도 err.name === 'AbortError'로 일관 처리하도록 정규화 (2.3절 참고)
    const createAbortError = () =>
      new DOMException(
        typeof signal?.reason === 'string' ? signal.reason : 'The operation was aborted.',
        'AbortError',
      );

    // 1. [사전 가드] 호출 시점에 이미 취소된 신호라면 타이머조차 만들지 않고 즉시 거절
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    // 2. 정상 만료 시: 걸어두었던 리스너를 반드시 해제(메모리 누수 방지)한 뒤 resolve
    const timerId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    // 3. 도중 취소 시: 남은 타이머를 즉시 지우고(clearTimeout) AbortError로 즉시 탈출
    function handleAbort() {
      clearTimeout(timerId);
      reject(createAbortError());
    }

    // 4. { once: true }: abort 이벤트는 1회성이므로 한 번 실행 후 자동 정리
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

// --- 실행 테스트 ---
async function runGoodTask() {
  const controller = new AbortController();
  setTimeout(() => {
    console.log('>> 100ms 시점에 취소 버튼 클릭!');
    controller.abort();
  }, 100);

  const startedAt = Date.now();
  try {
    await delayWithSignal(1500, controller.signal);
    console.log('정상 완료');
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    console.log(`에러명: ${err.name}, 소요 시간: 약 ${elapsed}ms`);
    // 출력 예: 에러명: AbortError, 소요 시간: 약 100ms (1.5초를 기다리지 않고 즉시 탈출!)
  }
}

runGoodTask();
```

#### 왜 `removeEventListener`까지 신경 써야 할까요?
- 하나의 `signal` 객체를 여러 비동기 작업이 함께 구독할 수 있습니다.
- 만약 1500ms 타이머가 **취소 없이 정상 완료**되었는데 `removeEventListener`를 안 하면, 끝난 `delayWithSignal`의 `handleAbort` 클로저가 `signal` 내부 리스너 목록에 계속 매달려 **메모리 누수**가 발생할 수 있습니다.

---

### 1.3 `fetch(url, { signal })` 및 최신 표준 유틸리티

브라우저의 `fetch`와 `ky`, `axios` 등 대부분의 HTTP 클라이언트는 `signal` 옵션을 기본 지원합니다.

```js
const controller = new AbortController();

fetch('https://api.example.com/users', {
  signal: controller.signal,
})
  .then((res) => res.json())
  .catch((err) => {
    if (err.name === 'AbortError') {
      console.log('요청이 정상적으로 취소되었습니다.');
      return;
    }
    console.error('실제 네트워크 에러:', err);
  });

// HTTP 통신 도중에 브라우저 레벨에서 즉시 요청 중단 (DevTools Network 탭에 'canceled' 표시)
controller.abort();
```

#### 알아두면 유용한 `AbortSignal` 정적 메서드 (최신 표준)
- **`AbortSignal.timeout(ms)`**: 별도 `AbortController`와 `setTimeout`을 만들지 않고 지정 시간 후 자동 취소되는 시그널을 생성합니다.
  ```js
  // 3초 안에 응답이 없으면 자동 취소
  await fetch('/api/slow-endpoint', { signal: AbortSignal.timeout(3000) });
  ```
- **`AbortSignal.any([signalA, signalB])`**: 여러 취소 조건(예: "사용자 수동 취소 **또는** 5초 타임아웃") 중 하나라도 먼저 발생하면 즉시 취소되도록 합성합니다.
  ```js
  const combinedSignal = AbortSignal.any([
    userController.signal,
    AbortSignal.timeout(5000),
  ]);
  ```

---

## Part 2. React & TanStack Query 비동기 취소 패턴

### 2.1 순수 React `useEffect` 샘플: 연속 입력 시 응답 역전(Race Condition) 방지

사용자가 검색어 입력창에 `"a"` → `"ab"`를 빠르게 입력했을 때, 서버 지연 때문에 `"a"`의 응답이 `"ab"`보다 **늦게 도착**하면 화면에 옛날 `"a"` 결과가 덮어씌워지는 버그가 발생합니다.

```tsx
import { useEffect, useState } from 'react';

interface UserItem {
  id: number;
  name: string;
}

export function UserSearch() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!keyword.trim()) {
      setUsers([]);
      // 이전 요청이 진행 중일 때 검색어를 비우면 cleanup이 AbortError로 무시되므로 로딩 상태를 반드시 해제
      setIsLoading(false);
      return;
    }

    // 1. 이번 effect 실행(검색어) 전용 AbortController 생성
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/users?search=${encodeURIComponent(keyword)}`, {
      signal: controller.signal, // 2. fetch에 시그널 연결
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: UserItem[]) => {
        setUsers(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        // 3. [중요] 취소로 인한 AbortError는 실패가 아니므로 에러 상태로 처리하지 않음
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('검색 실패:', err);
        setIsLoading(false);
      });

    // 4. cleanup: 검색어가 바뀌거나 컴포넌트가 언마운트되면 직전 요청을 즉시 취소!
    return () => {
      controller.abort();
    };
  }, [keyword]);

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="사용자 검색..."
      />
      {isLoading && <p>검색 중...</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### 동작 타임라인
1. `"a"` 입력 → `controller_1` 생성 → `/api/users?search=a` 출발.
2. 50ms 뒤 `"ab"` 입력 → React가 먼저 이전 effect의 `cleanup()`을 실행해 `controller_1.abort()` 호출 → `"a"` 요청 즉시 중단!
3. 이어서 `controller_2` 생성 → `/api/users?search=ab` 출발 → 최신 `"ab"` 결과만 화면에 안전하게 반영.

---

### 2.2 TanStack Query와 `signal` 자동 연동 원리

TanStack Query(`useQuery`)를 사용하면 매번 `new AbortController()`와 `cleanup`을 직접 짤 필요가 없습니다.

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchUsers(keyword: string, signal?: AbortSignal) {
  const res = await fetch(`/api/users?search=${encodeURIComponent(keyword)}`, {
    signal, // TanStack Query가 넘겨준 signal을 그대로 전달
  });
  return res.json();
}

export function UserListWithQuery({ keyword }: { keyword: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['users', keyword],
    // TanStack Query가 queryFn을 실행할 때마다 새 AbortController.signal을 자동 생성해 전달
    queryFn: ({ signal }) => fetchUsers(keyword, signal),
  });

  const handleManualCancel = () => {
    // 진행 중인 쿼리에 연결된 AbortSignal에 즉시 abort() 신호를 보냄
    queryClient.cancelQueries({ queryKey: ['users'] });
  };

  return (
    <div>
      <button type="button" onClick={handleManualCancel}>
        조회 취소
      </button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

#### TanStack Query가 자동으로 취소 신호를 쏘는 순간
*(단, `queryFn` 내부에서 `signal` 속성을 실제로 참조·소비하는 쿼리에 한해 자동 취소가 활성화됩니다.)*
1. **활성 구독자가 모두 사라질 때**: 해당 `queryKey`를 구독하던 **모든 컴포넌트(옵저버)가 언마운트되거나 `queryKey` 변경으로 이전 키의 활성 구독자가 0명이 될 때**
2. **수동 취소(`cancelQueries`) 호출 시**: `queryClient.cancelQueries({ queryKey })` 호출 시 (예: `useMutation`의 `onMutate`에서 구버전 조회 요청을 취소할 때)
3. **쿼리 무효화(`invalidateQueries`) 및 강제 재조회 시**: 진행 중인 이전 요청을 중단하고 최신 요청으로 교체할 때

> **💡 핵심 체크**: `queryFn: ({ signal }) => ...`에서 전달받은 `signal`을 내부의 `fetch`, `ky`, `axios`, 또는 커스텀 `delayWithSignal`까지 끝까지 내려주지 않으면 TanStack Query가 `cancelQueries`를 호출해도 실제 네트워크 요청은 중단되지 않습니다.

---

### 2.3 실무에서 자주 겪는 2가지 실수

| 실수 사례 | 증상 | 해결 방법 |
| :--- | :--- | :--- |
| **`AbortError`를 일반 에러로 처리** | 검색어를 빠르게 바꿨을 뿐인데 `"네트워크 오류가 발생했습니다"` 토스트/배너가 깜빡임 | `err.name === 'AbortError'` 또는 `signal.aborted` 여부를 검사해 취소 에러는 조용히 무시 *(TanStack Query `useQuery` 내부에서는 취소 에러를 자체 필터링해 `error` 상태로 올리지 않음)* |
| **사용자 정의 사유로 `abort('reason')` 호출 후 `err.name`만 검사** | `controller.abort('타임아웃')`처럼 문자열 사유를 넘기면 브라우저가 `DOMException('AbortError')` 대신 `'타임아웃'` 문자열 자체를 던짐 | `signal.aborted` 체크를 병행하거나, 사유를 넘길 때도 `new DOMException('사유', 'AbortError')` 인스턴스로 전달 |
