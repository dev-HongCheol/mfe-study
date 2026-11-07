/**
 * @file verify-todo-before-merge.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [PreToolUse: run_command] PR 생성·머지 동시 실행을 원천 차단하고, 머지(git merge / gh pr merge) 실행 직전에 루트 todo.md 및 활성 앱의 docs/todo.md가 '커밋 완료'되었는지 강제 검증합니다.
 */
import { execSync } from 'node:child_process';
import {
  WORKSPACE_ROOT,
  isDirectExecution,
  loadActiveScope,
  normalizeSlashes,
  readHookStdin,
  writeHookStdout,
} from './harness-utils.mjs';

/**
 * 워킹 트리에 아직 커밋되지 않은 변경 파일 목록(git status --porcelain)을 조회합니다.
 *
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {string[]} 미커밋 파일 상대 경로 배열
 */
function getGitUncommittedFiles(workspaceRoot = WORKSPACE_ROOT) {
  try {
    const statusOut = execSync('git status --porcelain', {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return statusOut
      .split(/\r?\n/)
      .map((line) => line.replace(/^[MADRCU?!\s]+/, '').trim())
      .filter(Boolean)
      .map(normalizeSlashes);
  } catch {
    return [];
  }
}

/**
 * 현재 브랜치에서 main 대비 커밋 완료된 변경 파일 목록을 조회합니다.
 *
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {string[]} 커밋된 변경 파일 상대 경로 배열
 */
function getGitCommittedFiles(workspaceRoot = WORKSPACE_ROOT) {
  try {
    let diffOut = '';
    try {
      diffOut = execSync('git diff --name-only main...HEAD', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      diffOut = execSync('git diff --name-only HEAD~1 HEAD', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    }
    return Array.from(
      new Set(
        diffOut
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map(normalizeSlashes),
      ),
    );
  } catch {
    return [];
  }
}

/**
 * 실행하려는 터미널 명령어에서 PR 생성·머지 동시 시도 및 머지 전 TODO 커밋 여부를 검사합니다.
 *
 * @param {{
 *   commandLine: string,
 *   activeScope?: ReturnType<typeof loadActiveScope>,
 *   committedFiles?: string[],
 *   uncommittedFiles?: string[],
 *   modifiedFiles?: string[]
 * }} params - 명령어 검증 파라미터
 * @returns {{ decision: 'allow' | 'deny', reason?: string }} PreToolUse 판정 결과
 */
export function evaluateTodoBeforeMerge(params) {
  const commandLine = String(params.commandLine || '').trim();
  const activeScope = params.activeScope || loadActiveScope();

  /** git merge 또는 gh pr merge 명령어인지 판별하는 정규식 */
  const isMergeCommand = /\b(git\s+merge|gh\s+pr\s+merge)\b/i.test(commandLine);

  /** gh pr create 명령어인지 판별하는 정규식 */
  const isPrCreateCommand = /\bgh\s+pr\s+create\b/i.test(commandLine);

  // [분기 설명 0] PR 생성과 머지를 한 번의 명령줄로 묶어서 실행하려는 시도를 즉시 원천 차단합니다!
  if (isPrCreateCommand && isMergeCommand) {
    return {
      decision: 'deny',
      reason:
        '[PR Gate 차단] PR 생성(gh pr create)과 머지(gh pr merge / git merge)는 절대 한 번에 실행할 수 없습니다! 반드시 PR 생성까지만 실행한 뒤 즉시 턴을 종료하고, 사용자가 PR을 직접 확인한 후 별도로 머지를 승인할 때까지 대기하세요.',
    };
  }

  // [분기 설명 1] 머지 명령어가 아니라면 이 훅에서는 차단하지 않고 통과시킵니다.
  if (!isMergeCommand) {
    return { decision: 'allow' };
  }

  // [분기 설명 2] 워킹 트리에 아직 커밋되지 않은 변경사항이 남아 있는 상태에서 머지를 시도하면 차단합니다.
  const uncommittedFiles = (
    params.uncommittedFiles !== undefined ? params.uncommittedFiles : getGitUncommittedFiles()
  ).map(normalizeSlashes);

  if (uncommittedFiles.length > 0) {
    return {
      decision: 'deny',
      reason: `[Merge Gate 차단] 워킹 트리에 아직 커밋되지 않은 파일(${uncommittedFiles.join(', ')})이 남아 있습니다. 머지 직전 todo.md 및 docs/service-registry.md 업데이트를 먼저 커밋·푸시한 뒤 머지를 실행하세요.`,
    };
  }

  const committedFiles = (
    params.committedFiles ||
    params.modifiedFiles ||
    getGitCommittedFiles()
  ).map(normalizeSlashes);

  // 1) 루트 todo.md 커밋 포함 여부 확인 (모든 스코프 공통 필수)
  const hasRootTodoUpdated = committedFiles.includes('todo.md');
  if (!hasRootTodoUpdated) {
    return {
      decision: 'deny',
      reason:
        '[Merge Gate 차단] 머지 실행 직전에 반드시 루트 "todo.md"(및 필요 시 "docs/service-registry.md")의 진행 상태를 업데이트하여 커밋·푸시해야 합니다.',
    };
  }

  // 2) 개별 마이크로 앱 스코프(scope !== 'root')인 경우 해당 앱의 docs/todo.md 커밋 포함 여부 추가 확인
  // [분기 설명 3] root 스코프는 루트 /todo.md 하나만 존재하므로 앱별 docs/todo.md 검사를 건너뜁니다.
  if (activeScope.scope !== 'root' && activeScope.path && activeScope.path !== '.') {
    const expectedAppTodo = `${normalizeSlashes(activeScope.path).replace(/\/$/, '')}/docs/todo.md`;
    const hasAppTodoUpdated = committedFiles.includes(expectedAppTodo);
    if (!hasAppTodoUpdated) {
      return {
        decision: 'deny',
        reason: `[Merge Gate 차단] '${activeScope.scope}' 스코프 머지 직전에는 반드시 루트 "todo.md"와 서비스 전용 "${expectedAppTodo}" 두 파일을 모두 업데이트하여 커밋·푸시해야 합니다.`,
      };
    }
  }

  return { decision: 'allow' };
}

// CLI 직접 실행 시 표준 입출력 또는 --check-branch 플래그 처리
if (isDirectExecution(import.meta.url)) {
  if (process.argv.includes('--check-branch')) {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf-8',
    }).trim();
    // [분기 설명] main/master 브랜치에서 직접 git push를 시도할 경우 Lefthook pre-push 단계에서 즉시 차단합니다.
    if (branch === 'main' || branch === 'master') {
      console.error(
        '[Lefthook Blocked] main 브랜치에 직접 push할 수 없습니다. 작업 브랜치에서 PR을 통해 진행하세요.',
      );
      process.exit(1);
    }
    process.exit(0);
  }

  const stdinData = await readHookStdin();
  const commandLine =
    stdinData.toolCall?.args?.CommandLine || stdinData.toolCall?.args?.commandLine || '';
  const result = evaluateTodoBeforeMerge({ commandLine });
  writeHookStdout(result);
}
