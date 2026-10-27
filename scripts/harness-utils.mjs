/**
 * @file harness-utils.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description Antigravity 라이프사이클 훅 스크립트들이 공통으로 사용하는 경로 해석, 설정 로드, 표준 입출력(stdin/stdout) 헬퍼 유틸리티입니다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 현재 유틸리티 파일이 위치한 scripts/ 디렉토리의 절대 경로 */
const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

/** 워크스페이스 최상위 루트 디렉토리의 절대 경로 */
export const WORKSPACE_ROOT = resolve(SCRIPTS_DIR, '..');

/**
 * 경로 구분자를 Windows(\)와 macOS(/) 모두에서 비교 가능하도록 슬래시(/)로 정규화합니다.
 *
 * @param {string} targetPath - 정규화할 파일 또는 디렉토리 경로
 * @returns {string} 슬래시(/)로 통일된 경로 문자열
 */
export function normalizeSlashes(targetPath) {
  return String(targetPath || '').replace(/\\/g, '/');
}

/**
 * .agents/active-scope.json 파일을 읽어 현재 활성화된 작업 스코프 정보를 반환합니다.
 *
 * @param {string} [rootDir=WORKSPACE_ROOT] - 워크스페이스 루트 경로
 * @returns {{
 *   scope: string,
 *   path: string,
 *   branch: string,
 *   featureDir: string,
 *   currentStep: number,
 *   isDocsOnly?: boolean
 * }} 활성 스코프 설정 객체
 */
export function loadActiveScope(rootDir = WORKSPACE_ROOT) {
  /** 스코프 설정 파일 절대 경로 */
  const scopeFilePath = resolve(rootDir, '.agents', 'active-scope.json');

  // [분기 설명] 아직 .agents/active-scope.json 파일이 생성되지 않은 초기 상태라면,
  // 안전하게 루트(root) 스코프 기본값을 반환하여 훅 실행 중 예외를 방지합니다.
  if (!existsSync(scopeFilePath)) {
    return {
      scope: 'root',
      path: '.',
      branch: 'root/chore/init',
      featureDir: 'docs/features/init',
      currentStep: 1,
      isDocsOnly: false,
    };
  }

  try {
    const rawJson = readFileSync(scopeFilePath, 'utf-8');
    return JSON.parse(rawJson);
  } catch {
    return {
      scope: 'root',
      path: '.',
      branch: 'root/chore/init',
      featureDir: 'docs/features/init',
      currentStep: 1,
      isDocsOnly: false,
    };
  }
}

/**
 * 표준 입력(stdin)으로 전달된 Antigravity 훅 JSON 페이로드를 비동기로 읽어들여 파싱합니다.
 *
 * @returns {Promise<Record<string, any>>} 파싱된 JSON 입력 객체 (입력이 없거나 실패 시 빈 객체)
 */
export async function readHookStdin() {
  // [분기 설명] 터미널에서 수동 실행(isTTY)된 경우 stdin 대기로 멈추지 않도록 즉시 빈 객체를 반환합니다.
  if (process.stdin.isTTY) {
    return {};
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const rawInput = Buffer.concat(chunks).toString('utf-8').trim();
  if (!rawInput) {
    return {};
  }

  try {
    return JSON.parse(rawInput);
  } catch {
    return {};
  }
}

/**
 * Antigravity 훅 규격에 맞춰 결과 객체를 표준 출력(stdout) JSON으로 출력합니다.
 *
 * @param {Record<string, any>} payload - 출력할 JSON 결과 객체
 * @returns {void}
 */
export function writeHookStdout(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

/**
 * 현재 모듈이 다른 테스트 파일에서 import된 것이 아니라 Node.js CLI로 직접 실행되었는지 판별합니다.
 *
 * @param {string} metaUrl - 호출 모듈의 import.meta.url
 * @returns {boolean} 직접 실행 여부
 */
export function isDirectExecution(metaUrl) {
  if (!process.argv[1]) {
    return false;
  }
  return normalizeSlashes(fileURLToPath(metaUrl)) === normalizeSlashes(resolve(process.argv[1]));
}
