/**
 * @file inject-context.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [SessionStart / PreInvocation] 루트 todo.md 및 활성 앱의 docs/todo.md 현황과 단계별 모델(Argon High <-> Argon Medium) 전환 알림을 에이전트 컨텍스트에 자동 주입합니다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WORKSPACE_ROOT,
  isDirectExecution,
  loadActiveScope,
  readHookStdin,
  writeHookStdout,
} from './harness-utils.mjs';

/**
 * 워크플로우 단계(currentStep)에 따른 권장 모델 및 전환 안내 문구를 생성합니다.
 *
 * @param {number} currentStep - 현재 진행 중인 워크플로우 단계 번호 (1 ~ 5)
 * @param {boolean} [isDocsOnly=false] - 코드 구현 없는 루트 공통 설계 전용 브랜치 여부
 * @returns {string} 모델 운영 및 전환 안내 메시지
 */
export function getModelGuidanceBanner(currentStep, isDocsOnly = false) {
  // [분기 설명] 코드 구현이 없는 루트 공통 설계 전용 브랜치(isDocsOnly)는 1단계 설계 후 바로 5단계 머지로 이동합니다.
  if (isDocsOnly) {
    return '🔴 [권장 모델: Argon High] 루트 공통 설계(SSOT) 전용 브랜치입니다. 01-plan-and-design.md 승인 후 바로 PR/머지를 진행하세요.';
  }

  switch (currentStep) {
    case 1:
      return '🔴 [현재 1단계 (기획·설계) | 권장 모델: Argon High] "docs/templates/01-plan-and-design.template.md" 및 "docs/study/02-polyrepo-and-architecture-decisions.md"를 참조해 01-plan-and-design.md를 작성하고, 완료 직후 "🟡 Argon Medium" 모델 전환을 안내하세요.';
    case 2:
      return '🟡 [현재 2단계 (TDD 명세 & 승인 게이트) | 권장 모델: Argon Medium] "docs/templates/02-tdd-spec.template.md"를 참조해 02-tdd-spec.md를 작성하세요. 토큰 절감을 위해 2~4단계는 Argon Medium 모델을 권장하며 승인 전까지 본 코드 구현을 금지합니다.';
    case 3:
      return '🟡 [현재 3단계 (Red: 실패 테스트 작성) | 권장 모델: Argon Medium] 본 코드 작성 전 실패하는 Vitest 테스트를 먼저 작성하고 Red 상태를 확인하세요.';
    case 4:
      return '🟡 [현재 4단계 (Green: 본 코드 & 3종 SQL 구현) | 권장 모델: Argon Medium] "docs/study/04-mfe-real-world-pitfalls-and-solutions.md" 및 "docs/study/05-fullstack-service-real-world-issues.md" 방어 설계와 6대 주석 원칙을 준수해 테스트를 통과(Green)시키고, 완료 직후 "🔴 Argon High" 모델 전환을 안내하세요.';
    case 5:
      return '🔴 [현재 5단계 (심층 코드 리뷰 & PR·머지) | 권장 모델: Argon High (리뷰) -> 🟡 Argon Medium (PR/머지)] "docs/templates/03-code-review.template.md" 및 "docs/templates/pull-request.template.md"를 참조해 보안·MFE 14대(Study 04)·서비스 16대(Study 05) 이슈를 정밀 감사하고, 머지 직전에 todo.md를 업데이트하세요.';
    default:
      return '🔴 [권장 모델: Argon High] 현재 스코프와 todo.md, docs/study/* 및 docs/templates/*를 먼저 확인하세요.';
  }
}

/**
 * todo.md 파일에서 '다음 진행 예정 작업 (Next Up)' 또는 핵심 진행 요약 줄을 추출합니다.
 *
 * @param {string} todoFilePath - 읽어들일 todo.md 파일의 절대 경로
 * @returns {string} 추출된 요약 문자열
 */
function extractTodoSummary(todoFilePath) {
  if (!existsSync(todoFilePath)) {
    return '(todo.md 파일 없음)';
  }
  const content = readFileSync(todoFilePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  /** Next Up 섹션 이후 최대 5줄을 추출하기 위한 인덱스 */
  const nextUpIdx = lines.findIndex(
    (line) => line.includes('다음 진행 예정 작업') || line.includes('현재 진행 중인 작업'),
  );
  if (nextUpIdx !== -1) {
    return lines
      .slice(nextUpIdx, nextUpIdx + 5)
      .join(' | ')
      .trim();
  }
  return lines.slice(0, 6).join(' | ').trim();
}

/**
 * SessionStart 또는 PreInvocation 훅이 에이전트에게 주입할 injectSteps 객체를 생성합니다.
 *
 * @param {{
 *   workspaceRoot?: string,
 *   eventType?: 'SessionStart' | 'PreInvocation',
 *   activeScope?: ReturnType<typeof loadActiveScope>
 * }} options - 컨텍스트 주입 생성 옵션
 * @returns {{ injectSteps: Array<Record<string, any>> }} Antigravity 훅 출력 규격 객체
 */
export function buildContextInjection(options = {}) {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const eventType = options.eventType || 'PreInvocation';
  const activeScope = options.activeScope || loadActiveScope(workspaceRoot);

  /** 루트 마스터 todo.md 요약 */
  const rootTodoSummary = extractTodoSummary(resolve(workspaceRoot, 'todo.md'));

  /** 활성 스코프가 개별 마이크로 앱인 경우 해당 앱의 docs/todo.md 요약 */
  let appTodoSummary = 'N/A (Scope: root)';
  if (activeScope.scope !== 'root' && activeScope.path && activeScope.path !== '.') {
    const appTodoPath = resolve(workspaceRoot, activeScope.path, 'docs', 'todo.md');
    appTodoSummary = extractTodoSummary(appTodoPath);
  }

  /** 단계별 모델 전환 가이드 배너 */
  const modelBanner = getModelGuidanceBanner(activeScope.currentStep, activeScope.isDocsOnly);

  /** 주입할 최종 리마인더 메시지 문자열 */
  const messageText = [
    `[MFE Harness Context] 활성 스코프: ${activeScope.scope} (${activeScope.path}) | 브랜치: ${activeScope.branch} | 피처 폴더: ${activeScope.featureDir}`,
    modelBanner,
    `📌 루트 TODO 요약: ${rootTodoSummary}`,
    activeScope.scope !== 'root' ? `📌 앱(${activeScope.scope}) TODO 요약: ${appTodoSummary}` : '',
    '📚 구현된 서비스 명령어·API·노출모듈 정본: docs/service-registry.md (상세 계약 SSOT: docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)',
    '⚠️ 필수 준수: (1) 계획 설명 및 사용자 승인 전 코드 수정 금지 (2) 연계 작업은 루트 정본(SSOT)의 항목(제목)만 참조(복붙 금지) (3) 6대 주석 원칙(인터페이스 내부 속성 /** */ 주석 필수) (4) 머지 직전 todo.md 및 docs/service-registry.md 갱신 필수',
  ]
    .filter(Boolean)
    .join('\n');

  // [분기 설명] SessionStart는 영구 systemMessage로 주입하고,
  // 매 턴 호출되는 PreInvocation은 대화 히스토리 토큰 누적을 막기 위해 단발성 ephemeralMessage로 주입합니다.
  if (eventType === 'SessionStart') {
    return {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: messageText,
          },
        },
      ],
    };
  }

  return {
    injectSteps: [
      {
        ephemeralMessage: messageText,
      },
    ],
  };
}

// CLI 직접 실행 시 표준 입출력 처리
if (isDirectExecution(import.meta.url)) {
  const stdinData = await readHookStdin();
  const isSessionStart = process.argv.includes('--session-start');
  const workspaceRoot = stdinData.workspacePaths?.[0] || WORKSPACE_ROOT;
  const output = buildContextInjection({
    workspaceRoot,
    eventType: isSessionStart ? 'SessionStart' : 'PreInvocation',
  });
  writeHookStdout(output);
}
