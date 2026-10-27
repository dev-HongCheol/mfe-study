/**
 * @file verify-todo-before-merge.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [PreToolUse: run_command] Git 머지(git merge / gh pr merge) 실행 직전에 루트 todo.md 및 활성 마이크로 앱의 docs/todo.md가 업데이트되었는지 강제 검증합니다.
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
 * 현재 Git 저장소에서 수정되었거나 브랜치에서 변경된 파일 목록을 조회합니다.
 *
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {string[]} 슬래시(/)로 정규화된 변경 파일 상대 경로 배열
 */
function getGitModifiedFiles(workspaceRoot = WORKSPACE_ROOT) {
  try {
    const statusOut = execSync('git status --porcelain', {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const diffOut = execSync('git diff --name-only HEAD~1 HEAD', {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const combined = `${statusOut}\n${diffOut}`
      .split(/\r?\n/)
      .map((line) => line.replace(/^[MADRCU?!\s]+/, '').trim())
      .filter(Boolean)
      .map(normalizeSlashes);

    return Array.from(new Set(combined));
  } catch {
    return [];
  }
}

/**
 * 실행하려는 터미널 명령어가 Git 머지 명령일 때 todo.md 업데이트 여부를 검사합니다.
 *
 * @param {{
 *   commandLine: string,
 *   activeScope?: ReturnType<typeof loadActiveScope>,
 *   modifiedFiles?: string[]
 * }} params - 명령어 검증 파라미터
 * @returns {{ decision: 'allow' | 'deny', reason?: string }} PreToolUse 판정 결과
 */
export function evaluateTodoBeforeMerge(params) {
  const commandLine = String(params.commandLine || '').trim();
  const activeScope = params.activeScope || loadActiveScope();

  /** git merge 또는 gh pr merge 명령어인지 판별하는 정규식 */
  const isMergeCommand = /\b(git\s+merge|gh\s+pr\s+merge)\b/i.test(commandLine);

  // [분기 설명] 머지 명령어가 아니라면 이 훅에서는 차단하지 않고 통과시킵니다.
  if (!isMergeCommand) {
    return { decision: 'allow' };
  }

  const modifiedFiles = (params.modifiedFiles || getGitModifiedFiles()).map(normalizeSlashes);

  // 1) 루트 todo.md 업데이트 여부 확인 (모든 스코프 공통 필수)
  const hasRootTodoUpdated = modifiedFiles.includes('todo.md');
  if (!hasRootTodoUpdated) {
    return {
      decision: 'deny',
      reason:
        '[Merge Gate 차단] 머지 실행 직전에 반드시 루트 "todo.md"의 진행 상태를 업데이트해야 합니다.',
    };
  }

  // 2) 개별 마이크로 앱 스코프(scope !== 'root')인 경우 해당 앱의 docs/todo.md 업데이트 여부 추가 확인
  // [분기 설명] root 스코프는 루트 /todo.md 하나만 존재하므로 앱별 docs/todo.md 검사를 건너뜁니다.
  if (activeScope.scope !== 'root' && activeScope.path && activeScope.path !== '.') {
    const expectedAppTodo = `${normalizeSlashes(activeScope.path).replace(/\/$/, '')}/docs/todo.md`;
    const hasAppTodoUpdated = modifiedFiles.includes(expectedAppTodo);
    if (!hasAppTodoUpdated) {
      return {
        decision: 'deny',
        reason: `[Merge Gate 차단] '${activeScope.scope}' 스코프 머지 직전에는 반드시 루트 "todo.md"와 서비스 전용 "${expectedAppTodo}" 두 파일을 모두 업데이트해야 합니다.`,
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
