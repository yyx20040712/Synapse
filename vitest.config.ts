import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * vitest 配置——单测/契约/安全/golden 统一入口（教训 D3：测试入口唯一，CI 为准）。
 * e2e（Playwright）不在 vitest 范围，见 playwright.config.ts。
 * 覆盖率门槛：全局 70 为 Phase 5 完成后按 DEVELOPMENT §4 收紧的水位（实测 ~76 lines），repos 层 85 维持；
 * renderer 逻辑层 60 为 DEVELOPMENT §4 Phase 2 承诺（2026-08-22 兑现，纳入后实测 81.2 lines）。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/**/*.ts', 'src/shared/**/*.ts', 'src/renderer/**/*.ts'],
      // .d.ts 类型垫片是纯声明、永久 0%，不计入覆盖口径（不稀释分母）
      exclude: ['src/main/index.ts', '**/*.d.ts'],
      thresholds: {
        // 全局 70：Phase 5 完成后按 DEVELOPMENT §4 收紧的水位（实测 ~76 lines）
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
        // repos 层 85 维持（DEVELOPMENT §4 分层要求）
        'src/main/db/repos/**/*.ts': {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 85
        },
        // renderer 逻辑层 60（DEVELOPMENT §4 Phase 2 承诺，2026-08-22 兑现；纳入后实测 81.2 lines）。
        // 只纳 *.ts 逻辑文件；*.tsx 组件不纳入——组件由 e2e 真渲染断言覆盖
        'src/renderer/**/*.ts': {
          lines: 60,
          statements: 60,
          functions: 60,
          branches: 60
        }
      }
    }
  }
})
