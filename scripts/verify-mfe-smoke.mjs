/**
 * @file verify-mfe-smoke.mjs
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description [Phase 1 Step 1.6 필수 스모크 검증] 로컬 스텁(Vitest)이 아닌 실제 구동 중인 마이크로 앱 서버들의 Health, CORS 헤더, remoteEntry.js / mf-manifest.json 응답을 검증합니다.
 */
import { isDirectExecution } from './harness-utils.mjs';

/**
 * Phase 1에서 검증할 대상 서버 엔드포인트 목록
 */
export const PHASE1_SMOKE_TARGETS = [
  { name: 'api-server', url: 'http://localhost:4000/api/health', checkCors: true },
  { name: 'remote-shared', url: 'http://localhost:3004/mf-manifest.json', checkCors: true },
  { name: 'remote-products', url: 'http://localhost:3002/mf-manifest.json', checkCors: true },
  { name: 'remote-cart', url: 'http://localhost:3003/mf-manifest.json', checkCors: true },
  { name: 'host-vite', url: 'http://localhost:3000', checkCors: false },
  { name: 'host-rspack', url: 'http://localhost:3001', checkCors: false },
];

/**
 * 단일 엔드포인트에 대해 HTTP 200 응답 및 CORS 허용 헤더 유무를 확인합니다.
 *
 * @param {{ name: string, url: string, checkCors: boolean }} target - 점검할 서버 타겟 정보
 * @returns {Promise<{ name: string, ok: boolean, status?: number, error?: string }>} 점검 결과
 */
export async function checkEndpointSmoke(target) {
  try {
    const response = await fetch(target.url, {
      headers: { Origin: 'http://localhost:3000' },
    });
    if (!response.ok) {
      return {
        name: target.name,
        ok: false,
        status: response.status,
        error: `HTTP ${response.status} 응답`,
      };
    }

    // [분기 설명] 리모트 및 백엔드 서버는 다중 포트 환경에서 호스트(3000/3001)가 모듈을 로드할 수 있도록
    // 반드시 Access-Control-Allow-Origin 헤더가 포함되어야 합니다 (Study 04 #03).
    if (target.checkCors) {
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (!corsHeader) {
        return {
          name: target.name,
          ok: false,
          status: response.status,
          error: 'CORS 헤더(Access-Control-Allow-Origin) 누락',
        };
      }
    }

    return { name: target.name, ok: true, status: response.status };
  } catch (err) {
    return {
      name: target.name,
      ok: false,
      error: err.message,
    };
  }
}

// CLI 직접 실행 시 전체 타겟 스모크 점검 수행
if (isDirectExecution(import.meta.url)) {
  console.log('🔍 [MFE Smoke Test] Phase 1 멀티 서버 런타임 연결 점검을 시작합니다...');
  const results = await Promise.all(PHASE1_SMOKE_TARGETS.map(checkEndpointSmoke));
  const failed = results.filter((r) => !r.ok);

  for (const res of results) {
    if (res.ok) {
      console.log(`  ✅ [${res.name}] 정상 응답 (HTTP ${res.status})`);
    } else {
      console.error(`  ❌ [${res.name}] 실패: ${res.error}`);
    }
  }

  if (failed.length > 0) {
    console.error(
      `\n❌ 총 ${failed.length}개 서버 스모크 검증 실패. (Phase 1 Step 1.6에서 전체 서버 기동 후 실행하세요.)`,
    );
    process.exit(1);
  }
  console.log('\n🎉 모든 MFE 서버 및 매니페스트/CORS 스모크 검증을 통과했습니다!');
}
