import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * vitest 配置——单测/契约/安全/golden 统一入口（教训 D3：测试入口唯一，CI 为准）。
 * e2e（Playwright）不在 vitest 范围，见 playwright.config.ts。
 * 覆盖率门槛为骨架期基线，随工单完成逐步收紧（DEVELOPMENT.md 有收紧计划表）。
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
      include: ['src/main/**/*.ts', 'src/shared/**/*.ts'],
      exclude: ['src/main/index.ts'],
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 40,
        branches: 30
      }
    }
  }
})
