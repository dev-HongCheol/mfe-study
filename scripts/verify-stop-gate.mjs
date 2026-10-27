/**
 * @file verify-stop-gate.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [Stop] 에이전트가 턴을 종료하기 직전에 현재 단계(currentStep)를 확인하여, 4~5단계(Green/Review/PR)에서 Biome, 3종 SQL 해시, Vitest 통과 여부를 최종 점검합니다.
 */
import { execSync } from 'node:child_process';
import {
  WORKSPACE_ROOT,
  isDirectExecution,
  loadActiveScope,
  readHookStdin,
  writeHookStdout,
} from './harness-utils.mjs';
import { verifySqlSync } from './verify-sql-sync.mjs';

/**
 * 실제 워크스페이스에서 Biome 체크, 3종 SQL 동기화, Vitest 테스트 통과 여부를 실행해 결과를 반환합니다.
 *
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {{ biomeOk: boolean, sqlOk: boolean, testOk: boolean, details: string[] }} 품질 게이트 실행 결과
 */
function runDefaultQualityChecks(workspaceRoot = WORKSPACE_ROOT) {
  const details = [];
  let biomeOk = true;
  let sqlOk = true;
  let testOk = true;

  // 1) Biome 체크
  try {
    execSync('pnpm biome check .', { cwd: workspaceRoot, stdio: 'pipe' });
  } catch {
    biomeOk = false;
    details.push('Biome 포맷팅/린트 검사 실패 (pnpm format 실행 필요)');
  }

  // 2) 3종 SQL 해시 및 인메모리 검증
  const sqlResult = verifySqlSync();
  if (!sqlResult.valid) {
    sqlOk = false;
    details.push(sqlResult.error || '3종 SQL 동기화 검증 실패');
  }

  // 3) Vitest 단위·통합 테스트 검증
  try {
    execSync('pnpm test', { cwd: workspaceRoot, stdio: 'pipe' });
  } catch {
    testOk = false;
    details.push('Vitest 테스트 실패 (모든 테스트가 Green이어야 함)');
  }

  return { biomeOk, sqlOk, testOk, details };
}

/**
 * 현재 워크플로우 단계(currentStep)에 따라 에이전트 턴 종료 허용 여부를 판정합니다.
 *
 * @param {{
 *   activeScope?: ReturnType<typeof loadActiveScope>,
 *   terminationReason?: string,
 *   runChecks?: () => { biomeOk: boolean, sqlOk: boolean, testOk: boolean, details?: string[] }
 * }} params - 종료 게이트 평가 파라미터
 * @returns {{ decision: 'allow_stop' | 'continue', reason?: string }} Stop 훅 판정 결과
 */
export function evaluateStopGate(params = {}) {
  const activeScope = params.activeScope || loadActiveScope();

  // [분기 설명 1] 사용자 취소나 에러로 종료된 경우 무한 루프 방지를 위해 즉시 종료를 허용합니다.
  if (
    params.terminationReason &&
    params.terminationReason !== 'NO_TOOL_CALL' &&
    params.terminationReason !== 'TERMINAL_STEP_TYPE'
  ) {
    return { decision: 'allow_stop' };
  }

  // [분기 설명 2] 설계 전용 브랜치(isDocsOnly)이거나 1단계(설계), 2단계(TDD 명세), 3단계(Red: 의도적 실패 테스트 작성)일 때는
  // 테스트 실패가 정상이므로 데드락 없이 즉시 턴 종료를 허용합니다.
  if (activeScope.isDocsOnly || activeScope.currentStep <= 3) {
    return { decision: 'allow_stop' };
  }

  // 4~5단계(Green 구현 완료 및 코드 리뷰/PR 단계)에서는 전체 품질 게이트 실행
  const checkRunner = params.runChecks || (() => runDefaultQualityChecks());
  const { biomeOk, sqlOk, testOk, details = [] } = checkRunner();

  if (biomeOk && sqlOk && testOk) {
    return { decision: 'allow_stop' };
  }

  return {
    decision: 'continue',
    reason: `[Stop Gate 보완 요청] 현재 ${activeScope.currentStep}단계(Green/Review)에서 다음 품질 검증이 통과하지 못했습니다: ${details.join(' / ')}. 문제를 수정한 후 턴을 종료하세요.`,
  };
}

// CLI 직접 실행 시 표준 입출력 처리
if (isDirectExecution(import.meta.url)) {
  const stdinData = await readHookStdin();
  const result = evaluateStopGate({
    terminationReason: stdinData.terminationReason,
  });
  writeHookStdout(result);
}
