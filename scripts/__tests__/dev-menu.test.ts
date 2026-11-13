/**
 * @file dev-menu.test.ts
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description 개발 환경 선택기(dev-menu.mjs)의 프리셋 조회 및 Turborepo 인자 생성 로직을 검증하는 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import { DEV_TARGETS, buildTurboArgs, resolvePreset } from '../dev-menu.mjs';

describe('개발 환경 선택기 (dev-menu.mjs) 단위 테스트', () => {
  describe('resolvePreset(): 사용자 입력 해석', () => {
    it('숫자 1 입력 시 products 프리셋을 반환해야 한다', () => {
      const preset = resolvePreset('1');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('products');
      expect(preset?.filters).toContain('@mfe-study/remote-products');
      expect(preset?.filters).toContain('@mfe-study/api-server');
      expect(preset?.filters).toContain('@mfe-study/remote-shared');
    });

    it('ID 문자열 "products" 또는 대소문자 무관하게 올바른 프리셋을 조회해야 한다', () => {
      const preset = resolvePreset('PRODUCTS');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('products');
    });

    it('숫자 7 또는 "all" 입력 시 전체 실행 프리셋을 반환해야 한다', () => {
      const presetByNum = resolvePreset('7');
      const presetById = resolvePreset('all');

      expect(presetByNum).toBeDefined();
      expect(presetByNum?.id).toBe('all');
      expect(presetByNum?.filters).toEqual([]);

      expect(presetById).toBeDefined();
      expect(presetById?.id).toBe('all');
    });

    it('범위를 벗어난 번호나 존재하지 않는 ID 입력 시 undefined를 반환해야 한다', () => {
      expect(resolvePreset('99')).toBeUndefined();
      expect(resolvePreset('invalid-app')).toBeUndefined();
      expect(resolvePreset('')).toBeUndefined();
    });
  });

  describe('buildTurboArgs(): Turborepo 명령어 인자 생성', () => {
    it('products 프리셋의 경우 3개 의존성 앱의 --filter 인자를 올바르게 생성해야 한다', () => {
      const productsPreset = DEV_TARGETS.find((t) => t.id === 'products');
      expect(productsPreset).toBeDefined();
      if (!productsPreset) {
        throw new Error('productsPreset가 정의되지 않았습니다');
      }

      const args = buildTurboArgs(productsPreset);
      expect(args).toEqual([
        'turbo',
        'run',
        'dev',
        '--filter=@mfe-study/api-server',
        '--filter=@mfe-study/remote-shared',
        '--filter=@mfe-study/remote-products',
      ]);
    });

    it('all 프리셋의 경우 --filter 없이 turbo run dev 만 생성해야 한다', () => {
      const allPreset = DEV_TARGETS.find((t) => t.id === 'all');
      expect(allPreset).toBeDefined();
      if (!allPreset) {
        throw new Error('allPreset가 정의되지 않았습니다');
      }

      const args = buildTurboArgs(allPreset);
      expect(args).toEqual(['turbo', 'run', 'dev']);
    });
  });
});
