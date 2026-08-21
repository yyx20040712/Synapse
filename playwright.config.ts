import { defineConfig } from '@playwright/test'

/**
 * e2e 配置——只跑 Electron（_electron 启动打包产物 out/main/index.js）。
 * 运行前提：先 npm run build。CI-only：本地弱模型不需要跑 e2e（防环境噪音）。
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  outputDir: 'test-results'
})
