/**
 * @file verify-scope.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [PreToolUse: write_file | edit_file] main 브랜치 직접 파일 수정 차단 및 물리적 멀티레포 격리(.agents/active-scope.json 외 서비스 폴더 수정 차단)를 수행합니다.
 */
import { execSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import {
  WORKSPACE_ROOT,
  isDirectExecution,
  loadActiveScope,
  normalizeSlashes,
  readHookStdin,
  writeHookStdout,
} from './harness-utils.mjs';

/**
 * 어떤 서비스 스코프가 활성화되어 있든(작업 브랜치 위에서) 수정이 항상 허용되는 루트 전역 파일 및 폴더 목록 (Global Whitelist)
 */
const GLOBAL_WHITELIST_PREFIXES = [
  'todo.md',
  'README.md',
  'GEMINI.md',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  'biome.json',
  'lefthook.yml',
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'vitest.config.ts',
  'docs/',
  '.agents/',
  'scripts/',
  'temp/',
];

/**
 * 현재 체크아웃된 Git 브랜치명을 조회합니다.
 *
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {string} 현재 브랜치명 (Git 저장소가 아니거나 조회 실패 시 빈 문자열)
 */
function getCurrentGitBranch(workspaceRoot = WORKSPACE_ROOT) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * 수정하려는 대상 파일 경로가 작업 브랜치 및 승인된 스코프(activeScope) 내에서 허용되는지 판별합니다.
 *
 * @param {{
 *   targetPath: string,
 *   workspaceRoot?: string,
 *   activeScope?: ReturnType<typeof loadActiveScope>,
 *   currentBranch?: string
 * }} params - 스코프 및 브랜치 접근 검증 파라미터
 * @returns {{ decision: 'allow' | 'deny', reason?: string }} PreToolUse 판정 결과
 */
export function evaluateScopeAccess(params) {
  const workspaceRoot = params.workspaceRoot || WORKSPACE_ROOT;
  const activeScope = params.activeScope || loadActiveScope(workspaceRoot);
  const rawTargetPath = params.targetPath || '';

  // [분기 설명] 대상 경로가 비어있는 경우 즉시 허용합니다.
  if (!rawTargetPath) {
    return { decision: 'allow' };
  }

  const normRoot = normalizeSlashes(workspaceRoot).replace(/\/$/, '');
  const normTarget = normalizeSlashes(rawTargetPath);

  /** 워크스페이스 루트 기준 상대 경로 (예: 'apps/remote-products/src/App.tsx') */
  let relPath = '';

  // [분기 설명 1] 대상 경로가 이미 워크스페이스 루트 경로로 시작하는 절대 경로인 경우
  // (Windows 드라이브 문자가 포함된 경로가 macOS/Linux POSIX 환경에서 테스트될 때의 크로스 플랫폼 호환성 보장)
  if (normTarget.startsWith(`${normRoot}/`)) {
    relPath = normTarget.slice(normRoot.length + 1);
  } else if (normTarget === normRoot) {
    relPath = '';
  } else {
    // [분기 설명 2] 상대 경로이거나 일반 절대 경로인 경우 path.resolve로 결합
    const absRoot = normalizeSlashes(resolve(workspaceRoot));
    const absTarget = normalizeSlashes(resolve(workspaceRoot, rawTargetPath));

    // 워크스페이스 외부 경로(예: Antigravity brain 아티팩트 폴더)는 브랜치·스코프 잠금 대상이 아니므로 허용
    if (!absTarget.startsWith(absRoot)) {
      return { decision: 'allow' };
    }
    relPath = normalizeSlashes(relative(absRoot, absTarget));
  }

  // 0) [핵심 방어] 현재 Git 브랜치가 main 또는 master인 경우:
  // 1단계 설계 문서 작성을 포함해 main 브랜치 위에서 직접 파일을 생성·수정하는 실수를 원천 차단합니다.
  const currentBranch =
    params.currentBranch !== undefined ? params.currentBranch : getCurrentGitBranch(workspaceRoot);
  if (currentBranch === 'main' || currentBranch === 'master') {
    return {
      decision: 'deny',
      reason: `[Branch Gate 차단] 현재 Git 브랜치가 '${currentBranch}'입니다! 1단계 설계 문서를 포함한 모든 파일 생성·수정은 반드시 먼저 작업 브랜치(<서비스명>/<작업타입>/<작업내용>)를 생성·전환한 뒤 진행하세요.`,
    };
  }

  // 1) 전역 허용 목록(Global Whitelist)에 해당하는 루트 문서·하네스·컨피그 파일은 항상 허용
  const isWhitelisted = GLOBAL_WHITELIST_PREFIXES.some(
    (prefix) => relPath === prefix || relPath.startsWith(prefix),
  );
  if (isWhitelisted) {
    return { decision: 'allow' };
  }

  // 2) 현재 스코프가 'root'인 경우: apps/* 하위 서비스 본 코드가 아니라면 허용
  if (activeScope.scope === 'root' || activeScope.path === '.') {
    if (!relPath.startsWith('apps/')) {
      return { decision: 'allow' };
    }
    return {
      decision: 'deny',
      reason: `[Scope Lock 차단] 현재 활성 스코프는 'root'입니다. 개별 마이크로 앱 경로(${relPath})를 수정하려면 먼저 .agents/active-scope.json의 스코프를 해당 서비스로 변경하세요.`,
    };
  }

  // 3) 개별 마이크로 앱 스코프(api, shared, products, cart, host-vite, host-rspack)인 경우
  const allowedAppPrefix = `${normalizeSlashes(activeScope.path).replace(/\/$/, '')}/`;
  if (relPath.startsWith(allowedAppPrefix)) {
    return { decision: 'allow' };
  }

  return {
    decision: 'deny',
    reason: `[Scope Lock 차단] 물리적 멀티레포 격리 위반! 현재 승인된 스코프는 '${activeScope.scope}'(${activeScope.path})이므로 타 서비스 경로('${relPath}')는 수정할 수 없습니다. 인터페이스 재협의가 필요하면 현재 브랜치를 홀드하고 root 스코프에서 먼저 진행하세요.`,
  };
}

// CLI 직접 실행 시 표준 입출력 처리
if (isDirectExecution(import.meta.url)) {
  const stdinData = await readHookStdin();
  const targetPath = stdinData.toolCall?.args?.Path || stdinData.toolCall?.args?.path || '';
  const workspaceRoot = stdinData.workspacePaths?.[0] || WORKSPACE_ROOT;
  const result = evaluateScopeAccess({ targetPath, workspaceRoot });
  writeHookStdout(result);
}
