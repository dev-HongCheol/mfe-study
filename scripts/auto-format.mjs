/**
 * @file auto-format.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [PostToolUse: write_file | edit_file] 파일 생성·수정 직후 Biome 포맷터(LF 줄바꿈 및 Import 정렬)를 자동으로 실행합니다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import {
  WORKSPACE_ROOT,
  isDirectExecution,
  readHookStdin,
  writeHookStdout,
} from './harness-utils.mjs';

/** Biome 자동 포맷팅 대상 파일 확장자 목록 */
const FORMATTABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.css']);

/**
 * 지정된 파일에 대해 Biome 포맷팅을 실행합니다.
 *
 * @param {string} targetPath - 포맷팅할 대상 파일 경로
 * @param {string} [workspaceRoot=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {void}
 */
export function runBiomeAutoFormat(targetPath, workspaceRoot = WORKSPACE_ROOT) {
  if (!targetPath) {
    return;
  }

  const absTarget = resolve(workspaceRoot, targetPath);
  const ext = extname(absTarget).toLowerCase();

  // [분기 설명] 포맷팅 지원 확장자가 아니거나 파일이 존재하지 않으면 실행하지 않습니다.
  if (!FORMATTABLE_EXTENSIONS.has(ext) || !existsSync(absTarget)) {
    return;
  }

  try {
    const biomeBin = resolve(workspaceRoot, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
    if (existsSync(biomeBin)) {
      execFileSync(process.execPath, [biomeBin, 'check', '--write', absTarget], {
        cwd: workspaceRoot,
        stdio: 'ignore',
      });
    }
  } catch {
    // PostToolUse 단계에서는 린트 경고가 있더라도 에이전트 루프를 중단시키지 않도록 예외를 무시합니다.
  }
}

// CLI 직접 실행 시 표준 입출력 처리
if (isDirectExecution(import.meta.url)) {
  const stdinData = await readHookStdin();
  const targetPath = stdinData.toolCall?.args?.Path || stdinData.toolCall?.args?.path || '';
  const workspaceRoot = stdinData.workspacePaths?.[0] || WORKSPACE_ROOT;
  runBiomeAutoFormat(targetPath, workspaceRoot);
  writeHookStdout({});
}
