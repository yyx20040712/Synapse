#!/usr/bin/env node
/**
 * [SR-PKG-01] dist.mjs —— dist 编排：镜像 env → sqlite-abi electron 绑定 → electron-builder
 * （工单：open / strong）
 *
 * ── 行为层 ──
 * - 顺序编排且逐步非零退出（不吞错）：
 *   ① 设置 ELECTRON_BUILDER_BINARIES_MIRROR=npmmirror（NSIS/winCodeSign 工具链下载源）；
 *   ② node scripts/sqlite-abi.mjs use electron（better_sqlite3 切到 electron-v146 绑定）；
 *   ③ electron-vite build（产出 out/ 三段）；
 *   ④ electron-builder --win nsis（读 electron-builder.yml）。
 * - spawn 子进程 stdio 继承，退出码透传。
 *
 * ── 接口层 ──
 * - 直接运行（package.json "dist" script 接线）；无导出。
 *
 * ── 架构层 ──
 * - 依赖：scripts/sqlite-abi.mjs、electron-builder CLI（node_modules/.bin/electron-builder）。
 *
 * ── 生命周期层 ──
 * - 预留：SKIP_MIRROR=1 跳过镜像设置（本地缓存已全时）。
 * - 不做：多目标/多平台编排。
 *
 * ── 文化层 ──
 * - 错误：任一步非零即整体非零并打印失败步骤名；禁止占位实现残留。
 */

console.error('[SR-PKG-01] dist.mjs 未实现（工单 open）')
process.exit(1)
