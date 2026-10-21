import { defineConfig } from '@playwright/test'

/**
 * e2e 配置——只跑 Electron（_electron 启动打包产物 out/main/index.js）。
 * 运行前提：先 npm run build。CI-only：本地弱模型不需要跑 e2e（防环境噪音）。
 *
 * [F-TESTREF-W2] 探针分层：z-*-probe.spec.ts 是 flake 捕获仪非产品测试
 * （宪章 §4-W2——已录 flake 2 起发生在探针自身），独立 probe project；
 * 默认门（npm run test:e2e → --project=app）不跑，一键全跑走
 * npm run test:e2e:all（反模式：移出后 flake 复发无捕获面）。forbidOnly
 * 顶层声明对两个 project 均生效（沿用）。
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // .only 溜进 CI 即红；失败重试时抓 trace（配合 CI 的 artifact 上传）
  forbidOnly: !!process.env.CI,
  // [F-EVCTX-01] 失败指纹保号多轮保留（非确定失败立案线「同用例 2 次记失败
  // 指纹」取证面——outputDir 分 run 保号后 error-context.md 不再被后续运行
  // 覆写）：枚举 test-results/run-* 按 mtime 保留最近 10 个目录（**≈5 轮运行
  // 指纹**——单轮产两目录〔globalSetup 进程空目录+主进程产物目录，stamp=每
  // 进程求值一次〕；PW_RUN_STAMP 逃生门两进程共号=单目录——修剪件头注在档）；
  // 清理故障不阻塞运行（件内 try/catch）
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    actionTimeout: 60_000,
    trace: 'on-first-retry'
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
  // CI runner 无 GPU 软渲染慢（run 37095072186 实证 120 处 30s action 超时）：
  // action 30→60s、用例 60→90s 保证慢 action 后仍有断言余量；本地不受影响
  timeout: 90_000,
  // [F-EVCTX-01] outputDir 分 run 保号（stamp=进程级一次——config 顶层模板串
  // 每加载进程各求值一次：globalSetup 进程与主测试进程 stamp 不同→单轮两目录，
  // 在档；PW_RUN_STAMP=复跑者自定保号名逃生门=两进程共号单目录。config 非产品
  // 运行时，Date 红线不涉。CI 兼容：artifact 上传 path=test-results/ 父目录递归
  // 含 run-* 子目录；.gitignore test-results/ 行已全覆盖）
  outputDir: `test-results/run-${process.env.PW_RUN_STAMP ?? new Date().toISOString().replace(/[:.]/g, '-')}`,
  projects: [
    // 产品测试默认门（排除探针）
    { name: 'app', testIgnore: /z-.*-probe\.spec\.ts$/ },
    // flake 捕获仪（探针）——独立通道，默认不跑
    { name: 'probe', testMatch: /z-.*-probe\.spec\.ts$/ }
  ]
})
