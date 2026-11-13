/**
 * @file dev-menu.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description 대화형 터미널 메뉴를 통해 실행할 마이크로 프론트엔드 서비스 및 의존성 앱을 선택하고 Turborepo TUI 모드로 기동합니다.
 */
import { spawn } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { WORKSPACE_ROOT } from './harness-utils.mjs';

/**
 * @typedef {Object} DevTargetPreset
 * @property {string} id - 고유 식별자 키
 * @property {string} label - 대화형 콘솔에 출력될 직관적인 표시 이름
 * @property {string} description - 실행되는 서비스 및 포트 설명
 * @property {string[]} filters - Turborepo --filter에 전달할 패키지명 목록 (빈 배열은 전체 실행)
 */

/**
 * 개발 환경 타깃 프리셋 정의 목록 (총 7종)
 * MFE 특성상 원격 리모트 앱 개발 시 필요한 런타임 의존성 서비스를 세트로 묶어 제공합니다.
 * @type {DevTargetPreset[]}
 */
export const DEV_TARGETS = [
  {
    id: 'products',
    label: '[products] 상품 원격 앱 개발 환경',
    description: 'api-server(4000) + remote-shared(3004) + remote-products(3002)',
    filters: ['@mfe-study/api-server', '@mfe-study/remote-shared', '@mfe-study/remote-products'],
  },
  {
    id: 'cart',
    label: '[cart] 장바구니 원격 앱 개발 환경',
    description: 'api-server(4000) + remote-shared(3004) + remote-cart(3003)',
    filters: ['@mfe-study/api-server', '@mfe-study/remote-shared', '@mfe-study/remote-cart'],
  },
  {
    id: 'shared',
    label: '[shared] 공통 모듈 쇼케이스 단독',
    description: 'remote-shared(3004) - Ark UI 컴포넌트·테마·유틸 쇼케이스',
    filters: ['@mfe-study/remote-shared'],
  },
  {
    id: 'api',
    label: '[api] 백엔드 API 서버 단독',
    description: 'api-server(4000) - Express 5 및 SQLite 인메모리/WAL 서버',
    filters: ['@mfe-study/api-server'],
  },
  {
    id: 'host-vite',
    label: '[host-vite] Vite 호스트 전체 통합 개발 환경',
    description: 'api(4000) + shared(3004) + products(3002) + cart(3003) + host-vite(3000)',
    filters: [
      '@mfe-study/api-server',
      '@mfe-study/remote-shared',
      '@mfe-study/remote-products',
      '@mfe-study/remote-cart',
      '@mfe-study/host-vite',
    ],
  },
  {
    id: 'host-rspack',
    label: '[host-rspack] Rspack 호스트 전체 통합 개발 환경',
    description: 'api(4000) + shared(3004) + products(3002) + cart(3003) + host-rspack(3001)',
    filters: [
      '@mfe-study/api-server',
      '@mfe-study/remote-shared',
      '@mfe-study/remote-products',
      '@mfe-study/remote-cart',
      '@mfe-study/host-rspack',
    ],
  },
  {
    id: 'all',
    label: '[all] 전체 6대 서비스 일괄 실행',
    description: '백엔드 API 및 모든 원격 리모트·호스트 앱 동시 기동',
    filters: [],
  },
];

/**
 * 사용자가 입력한 번호 또는 키워드 문자열로부터 일치하는 프리셋 객체를 조회합니다.
 *
 * @param {string} inputStr - 사용자가 콘솔에 입력한 문자열 (예: '1', 'products', 'all')
 * @returns {DevTargetPreset | undefined} 매칭된 프리셋 객체 또는 undefined
 */
export function resolvePreset(inputStr) {
  const trimmed = String(inputStr || '')
    .trim()
    .toLowerCase();

  // [분기 설명 1] 1-based 숫자 인덱스로 입력된 경우 (예: '1' -> 0번 인덱스)
  const num = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= DEV_TARGETS.length) {
    return DEV_TARGETS[num - 1];
  }

  // [분기 설명 2] 타깃 ID(예: 'products', 'cart', 'shared', 'all')로 입력된 경우
  return DEV_TARGETS.find((target) => target.id.toLowerCase() === trimmed);
}

/**
 * Turborepo 실행 명령 인자 배열을 생성합니다.
 *
 * @param {DevTargetPreset} preset - 실행할 개발 환경 프리셋
 * @returns {string[]} pnpm에 전달할 cli args
 */
export function buildTurboArgs(preset) {
  const args = ['turbo', 'run', 'dev'];

  // [분기 설명] 필터 대상 패키지가 명시된 경우 각각 --filter 플래그로 추가합니다.
  // 필터가 비어있는 프리셋(예: 'all')인 경우 전체 실행되도록 필터를 추가하지 않습니다.
  if (preset.filters && preset.filters.length > 0) {
    for (const filterPkg of preset.filters) {
      args.push(`--filter=${filterPkg}`);
    }
  }

  return args;
}

/**
 * Turborepo를 터미널 TUI 모드로 자식 프로세스로 실행합니다.
 *
 * @param {DevTargetPreset} preset - 실행할 프리셋 설정
 * @returns {Promise<number>} 자식 프로세스 종료 코드
 */
export function launchTurbo(preset) {
  const args = buildTurboArgs(preset);
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'pnpm.cmd' : 'pnpm';

  console.log('\n🚀 [Turborepo TUI 기동 중...]');
  console.log(`📌 선택된 타깃: \x1b[36m${preset.label}\x1b[0m`);
  console.log(`📝 의존성 구성: ${preset.description}`);
  console.log(`🔧 실행 명령어: \x1b[90m${command} ${args.join(' ')}\x1b[0m\n`);
  console.log(
    '💡 [TUI 안내] 하나의 터미널 콘솔에서 방향키(↑/↓)로 앱 간 콘솔 탭을 전환할 수 있습니다. (종료: Ctrl+C)\n',
  );

  return new Promise((resolve, reject) => {
    /**
     * stdio: 'inherit'을 전달하여 Turborepo의 대화형 TUI 렌더링 및 키보드 입력 처리를 상속합니다.
     */
    const child = spawn(command, args, {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
      shell: isWindows,
    });

    child.on('error', (err) => {
      // [분기 설명] pnpm 바이너리를 찾지 못하거나 프로세스 생성 실패 시 예외 처리
      reject(err);
    });

    child.on('close', (code) => {
      // [분기 설명] 정상 또는 비정상 종료 시 종료 코드 반환
      resolve(code ?? 0);
    });
  });
}

/**
 * 대화형 메뉴 메인 진입점 함수
 */
async function main() {
  /** CLI 첫 번째 인자 (예: pnpm dev products 로 넘긴 경우 바로 실행) */
  const cliArg = process.argv[2];

  // [분기 설명 1] 명령줄 인자로 미리 타깃이 전달된 경우 메뉴 프롬프트 없이 즉시 실행합니다.
  if (cliArg) {
    const matched = resolvePreset(cliArg);
    if (matched) {
      const exitCode = await launchTurbo(matched);
      process.exit(exitCode);
    }
    console.warn(`⚠️ 알 수 없는 타깃 '${cliArg}'입니다. 대화형 선택 메뉴를 엽니다.\n`);
  }

  // [분기 설명 2] 인자가 없는 경우 번호 선택 메뉴 출력
  console.log('='.repeat(70));
  console.log('  🌐 MFE Study - 마이크로 프론트엔드 개발 환경 선택기');
  console.log('='.repeat(70));
  console.log('실행할 개발 타깃 번호를 선택하세요:\n');

  DEV_TARGETS.forEach((target, index) => {
    const num = String(index + 1).padStart(2, ' ');
    console.log(`  \x1b[32m${num})\x1b[0m \x1b[1m${target.label}\x1b[0m`);
    console.log(`      \x1b[90m└─ ${target.description}\x1b[0m`);
  });

  console.log('='.repeat(70));

  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question('\n👉 실행할 번호를 입력하세요 (기본값: 1): ');
    rl.close();

    // 입력이 비어있으면 기본값 1번(products) 선택
    const selectedInput = answer.trim() === '' ? '1' : answer.trim();
    const preset = resolvePreset(selectedInput);

    if (!preset) {
      console.error(`\n❌ 올바르지 않은 번호 또는 타깃 이름입니다: "${selectedInput}"`);
      process.exit(1);
    }

    const exitCode = await launchTurbo(preset);
    process.exit(exitCode);
  } catch (error) {
    rl.close();
    console.error('\n❌ 개발 서버 실행 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

// [분기 설명] 직접 실행된 경우에만 main() 실행
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
