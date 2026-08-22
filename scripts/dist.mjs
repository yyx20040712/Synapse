#!/usr/bin/env node
/**
 * [SR-PKG-01] dist.mjs —— dist 编排：镜像 env → npm run build → electron-builder
 * （工单：done / strong）
 *
 * ── 行为层 ──
 * - 顺序编排且逐步非零退出（不吞错）：
 *   ① 设置 ELECTRON_BUILDER_BINARIES_MIRROR=npmmirror（NSIS/winCodeSign 工具链下载源），
 *      附带 ELECTRON_MIRROR 作 electronDist 失效兜底；SKIP_MIRROR=1 跳过（本地缓存已全时）；
 *   ② npm run build（内含 sqlite-abi use electron + electron-vite build，产出 out/ 三段）；
 *   ③ electron-builder --win nsis（读 electron-builder.yml）。
 * - spawn 子进程 stdio 继承，退出码透传。
 *
 * ── 接口层 ──
 * - 直接运行（package.json "dist" script 接线）；无导出。
 *
 * ── 架构层 ──
 * - 依赖：npm scripts（build）、electron-builder CLI（node_modules/electron-builder/cli.js，
 *   经 package.json bin 字段定位）。
 *
 * ── 生命周期层 ──
 * - 预留：SKIP_MIRROR=1 跳过镜像设置。
 * - 不做：多目标/多平台编排。
 *
 * ── 文化层 ──
 * - 错误：任一步非零即整体非零并打印失败步骤名。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.env.SKIP_MIRROR !== '1') {
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
  process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
}

const ebRoot = join(root, 'node_modules', 'electron-builder')
const binField = JSON.parse(readFileSync(join(ebRoot, 'package.json'), 'utf8')).bin?.['electron-builder']
const cli = [
  join(ebRoot, 'out', 'cli.js'),
  binField ? join(ebRoot, binField) : null
].find((p) => p !== null && existsSync(p))
if (cli === undefined) {
  console.error('[SR-PKG-01] 找不到 electron-builder CLI（node_modules/electron-builder）')
  process.exit(1)
}

const steps = [
  // Windows 下 npm 是 npm.cmd，必须经 shell 调用（参数为固定字面量，无注入面）
  { name: 'build', cmd: 'npm', args: ['run', 'build'], shell: true },
  { name: 'electron-builder', cmd: process.execPath, args: [cli, '--win', 'nsis'], shell: false }
]

for (const step of steps) {
  const r = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
    shell: step.shell
  })
  if (r.status !== 0) {
    console.error(`[SR-PKG-01] dist 步骤失败：${step.name}（exit ${r.status}）`)
    process.exit(r.status ?? 1)
  }
}
