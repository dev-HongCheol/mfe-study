/**
 * @file harness.test.ts
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description AI 워크플로우 하네스 훅 스크립트(스코프 검증, TODO 주입 및 모델 전환 알림, 머지 전 TODO 검증, 3종 SQL 해시/인메모리 검증, 종료 게이트)를 검증하는 TDD 테스트 스위트입니다.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildContextInjection } from '../inject-context.mjs';
import { evaluateScopeAccess } from '../verify-scope.mjs';
import { updateSqlHashes, verifySqlSync } from '../verify-sql-sync.mjs';
import { evaluateStopGate } from '../verify-stop-gate.mjs';
import { evaluateTodoBeforeMerge } from '../verify-todo-before-merge.mjs';

describe('AI 워크플로우 하네스 훅 TDD 검증 스위트', () => {
  /** 임시 테스트 디렉토리 경로 */
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'mfe-harness-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  describe('TC-01 & EC-01: 물리적 멀티레포 작업 스코프 격리 (verify-scope.mjs)', () => {
    /** 테스트용 상품 앱 활성 스코프 설정 */
    const productsScope = {
      scope: 'products' as const,
      path: 'apps/remote-products',
      branch: 'products/feat/catalog-list',
      featureDir: 'apps/remote-products/docs/features/20261022-catalog-list',
      currentStep: 4 as const,
    };

    it('TC-01: 활성 스코프(apps/remote-products) 내부 파일 및 전역 허용 파일 수정은 allow를 반환해야 한다', () => {
      // 1) 활성 앱 폴더 내부 파일 수정
      const appFileResult = evaluateScopeAccess({
        targetPath: 'F:/work/mfe-study/apps/remote-products/src/exposed/ProductList.tsx',
        workspaceRoot: 'F:/work/mfe-study',
        activeScope: productsScope,
      });
      expect(appFileResult.decision).toBe('allow');

      // 2) 전역 허용 파일(루트 todo.md, docs/**, biome.json 등) 수정
      const rootTodoResult = evaluateScopeAccess({
        targetPath: 'F:/work/mfe-study/todo.md',
        workspaceRoot: 'F:/work/mfe-study',
        activeScope: productsScope,
      });
      expect(rootTodoResult.decision).toBe('allow');
    });

    it('EC-01: 활성 스코프가 products일 때 다른 서비스(apps/remote-cart, apps/api-server) 파일 수정은 deny로 차단해야 한다', () => {
      const crossAppResult = evaluateScopeAccess({
        targetPath: 'F:/work/mfe-study/apps/remote-cart/src/exposed/CartWidget.tsx',
        workspaceRoot: 'F:/work/mfe-study',
        activeScope: productsScope,
      });

      expect(crossAppResult.decision).toBe('deny');
      expect(crossAppResult.reason).toContain('products');
      expect(crossAppResult.reason).toContain('apps/remote-cart');
    });
  });

  describe('TC-02: 단계별 모델 전환 알림 및 TODO 컨텍스트 주입 (inject-context.mjs)', () => {
    it('TC-02: currentStep이 2일 때는 Argon Medium 전환 안내를, 5일 때는 Argon High 전환 안내를 포함해야 한다', () => {
      writeFileSync(
        join(tempRoot, 'todo.md'),
        '# 마스터 TODO\n- **다음 진행 예정 작업 (Next Up)**:\n  - Step 0.3 구축',
        'utf-8',
      );

      // Step 2 (TDD 명세 -> Argon Medium 권장)
      const step2Output = buildContextInjection({
        workspaceRoot: tempRoot,
        eventType: 'PreInvocation',
        activeScope: {
          scope: 'root',
          path: '.',
          branch: 'root/chore/init',
          featureDir: 'docs/features/20261022-init',
          currentStep: 2,
        },
      });
      const step2Msg = step2Output.injectSteps?.[0]?.ephemeralMessage ?? '';
      expect(step2Msg).toContain('Argon Medium');
      expect(step2Msg).toContain('Step 0.3 구축');

      // Step 5 (PR 전 심층 코드 리뷰 -> Argon High 권장)
      const step5Output = buildContextInjection({
        workspaceRoot: tempRoot,
        eventType: 'PreInvocation',
        activeScope: {
          scope: 'root',
          path: '.',
          branch: 'root/chore/init',
          featureDir: 'docs/features/20261022-init',
          currentStep: 5,
        },
      });
      const step5Msg = step5Output.injectSteps?.[0]?.ephemeralMessage ?? '';
      expect(step5Msg).toContain('Argon High');
    });
  });

  describe('EC-02: 머지 직전 todo.md 업데이트 검증 및 main 무단 푸시 차단 (verify-todo-before-merge.mjs)', () => {
    it('EC-02: git merge 실행 시 todo.md가 변경 목록에 없으면 deny를 반환하고, 업데이트되었으면 allow를 반환해야 한다', () => {
      // 1) 마이크로 앱(products) 머지 시 루트 todo.md만 수정하고 앱 docs/todo.md를 누락한 경우 -> 차단
      const missingAppTodo = evaluateTodoBeforeMerge({
        commandLine: 'git merge products/feat/catalog-list',
        activeScope: {
          scope: 'products',
          path: 'apps/remote-products',
          branch: 'products/feat/catalog-list',
          featureDir: 'apps/remote-products/docs/features/20261022-catalog-list',
          currentStep: 5,
        },
        modifiedFiles: ['todo.md', 'apps/remote-products/src/exposed/ProductList.tsx'],
      });
      expect(missingAppTodo.decision).toBe('deny');
      expect(missingAppTodo.reason).toContain('apps/remote-products/docs/todo.md');

      // 2) 루트(root) 스코프 머지 시 루트 todo.md 1개만 수정되어 있어도 정상 허용
      const validRootMerge = evaluateTodoBeforeMerge({
        commandLine: 'git merge root/chore/init-workspace-harness',
        activeScope: {
          scope: 'root',
          path: '.',
          branch: 'root/chore/init-workspace-harness',
          featureDir: 'docs/features/20261022-init-workspace-harness',
          currentStep: 5,
        },
        modifiedFiles: ['todo.md', 'GEMINI.md'],
      });
      expect(validRootMerge.decision).toBe('allow');
    });
  });

  describe('TC-03 & EC-03: DB 3종 SQL 해시 및 node:sqlite 인메모리 순차 실행 검증 (verify-sql-sync.mjs)', () => {
    it('TC-03 & EC-03: 3종 SQL 해시 동기화 및 인메모리(01->02->03->01) 순차 실행 무결성을 검증해야 한다', () => {
      const sqlDir = join(tempRoot, 'apps', 'api-server', 'sql');
      mkdirSync(sqlDir, { recursive: true });

      writeFileSync(
        join(sqlDir, '01-schema.sql'),
        `
        CREATE TABLE IF NOT EXISTS _schema_comments (
          table_name TEXT NOT NULL,
          column_name TEXT,
          comment TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price INTEGER NOT NULL
        );
        INSERT INTO _schema_comments (table_name, column_name, comment) VALUES
        ('products', NULL, '상품 카탈로그 테이블'),
        ('products', 'id', '상품 고유 ID');
        `,
        'utf-8',
      );

      writeFileSync(
        join(sqlDir, '02-reset-seed.sql'),
        `
        DELETE FROM products;
        INSERT INTO products (id, name, price) VALUES (1, '테스트 키보드', 129000);
        `,
        'utf-8',
      );

      writeFileSync(
        join(sqlDir, '03-drop-all.sql'),
        `
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS _schema_comments;
        `,
        'utf-8',
      );

      // 1) 해시 파일(.sql-hashes.json) 생성 전 검증 -> 실패(EC-03)
      const beforeHashResult = verifySqlSync(sqlDir);
      expect(beforeHashResult.valid).toBe(false);

      // 2) 해시 업데이트 후 검증 -> 해시 일치 + node:sqlite 인메모리 멱등성 통과(TC-03)
      updateSqlHashes(sqlDir);
      const afterHashResult = verifySqlSync(sqlDir);
      expect(afterHashResult.valid).toBe(true);

      // 3) 01-schema.sql 임의 수정 후 해시 미갱신 시 -> 불일치 감지(EC-03)
      writeFileSync(join(sqlDir, '01-schema.sql'), '-- modified without hash update\n', {
        flag: 'a',
      });
      const tamperedResult = verifySqlSync(sqlDir);
      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.error).toContain('01-schema.sql');
    });
  });

  describe('TC-04: 단계 인식형(currentStep) 종료 게이트 검증 (verify-stop-gate.mjs)', () => {
    it('TC-04: currentStep이 1~3(설계, TDD 명세, Red 테스트 작성)일 때는 데드락 없이 즉시 종료를 허용해야 한다', () => {
      const redStepResult = evaluateStopGate({
        activeScope: {
          scope: 'root',
          path: '.',
          branch: 'root/chore/init-workspace-harness',
          featureDir: 'docs/features/20261022-init-workspace-harness',
          currentStep: 3,
        },
        runChecks: () => ({ biomeOk: false, sqlOk: false, testOk: false }),
      });

      expect(redStepResult.decision).toBe('allow_stop');
    });
  });
});
