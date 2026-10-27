# 🔀 [PR] {{PR_TITLE}} (`pull-request.template.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 설명은 승인자가 빠르고 편하게 읽을 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 흐름 안에서 한국어로 쓰는 것이 자연스러운 외래어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 모킹, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 자연스럽게 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 범용 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 개요 (Overview)
| 항목 | 내용 |
| :--- | :--- |
| **대상 스코프 (Scope ID)** | `{{SCOPE_ID}}` (`root` \| `api` \| `shared` \| `products` \| `cart` \| `host-vite` \| `host-rspack`) |
| **작업 브랜치 (Branch)** | `{{SCOPE_ID}}/{{BRANCH_TYPE}}/{{TASK_SLUG}}` -> `main` |
| **관련 문서 폴더** | `{{DOCS_FEATURE_PATH}}` (`01-plan-and-design.md`, `02-tdd-spec.md`) |

---

## 2. 작업 배경 및 목적 (Why & Goal)
- {{WHY_WE_DID_THIS_WORK}}
- {{CORE_MFE_LEARNING_OR_ARCHITECTURAL_GOAL}}

---

## 3. 주요 변경 및 구현 내용 (Key Changes)
### 3.1 핵심 구현 사항
- **{{CHANGE_CATEGORY_1}}**: {{READABLE_KOREAN_EXPLANATION_1}}
- **{{CHANGE_CATEGORY_2}}**: {{READABLE_KOREAN_EXPLANATION_2}}

### 3.2 변경된 주요 파일 목록
| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 | 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `{{FILE_PATH_1}}` | {{FILE_SUMMARY_1}} |
| `MOD` | `{{FILE_PATH_2}}` | {{FILE_SUMMARY_2}} |

---

## 4. TDD 테스트 및 품질 검증 결과 (Verification)
- **단위 및 통합 테스트 (`Vitest`)**: 총 `{{TOTAL_TESTS}}`건 통과 (`Green`)
  - {{KEY_TEST_CASE_SUMMARY_1}}
  - {{KEY_TEST_CASE_SUMMARY_2}}
- **코드 포맷팅 및 린트 (`Biome`)**: 이상 없음 (`LF` 줄바꿈 및 6대 주석 원칙 준수)
- **추가 검증 (해당 시 기재, 없으면 `N/A`)**:
  - **프론트엔드 / MFE**: {{MFE_STANDALONE_OR_ERROR_BOUNDARY_CHECK}}
  - **백엔드 / DB 3종 SQL**: {{SQL_3_FILES_AND_HASH_SYNC_CHECK}}

---

## 5. 커밋 메시지 초안 (Commit Message Draft)
> 💡 승인 시 복사하여 사용할 수 있도록 마크다운 코드 블록 없이 순수 텍스트 규칙에 맞춰 아래에 함께 제공합니다.

{{COMMIT_TITLE}}

- {{COMMIT_BODY_LINE_1}}
- {{COMMIT_BODY_LINE_2}}
- {{COMMIT_BODY_LINE_3}}

---

## 6. 머지 전 최종 체크리스트 (Pre-Merge Checklist)
- [ ] 작업 스코프(`.agents/active-scope.json`) 외 타 서비스 폴더 수정이 없는지 확인했는가?
- [ ] 코드 변경에 맞춰 관련 JSDoc 주석 및 문서가 최신화되었는가?
- [ ] **(머지 승인 직후 필수)** 실제 머지 실행 직전에 루트 [`todo.md`](../../todo.md) 및 해당 앱의 `docs/todo.md` 진행 상태를 업데이트했는가?
