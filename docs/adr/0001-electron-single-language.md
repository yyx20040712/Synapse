# AD-1：Electron + 单语言 TypeScript（放弃 Tauri/Rust）

日期：2026-08-21 · 状态：已接受

## 背景

两次历史失败：aquaresearch（TS+Rust+Python 三进程，类型手工同步漂移、125 编译错误）与 Synapse（TS+Rust，WebView2 中 pdf.js 七轮返工未收尾）。

## 决策

Electron（钉版本）+ 全项目唯一语言 TypeScript。类型经 `src/shared/` 直接 import，无任何代码生成步骤。

## 理由

1. 消灭头号失败根因：跨语言契约漂移在单语言下编译期即暴露。
2. Chromium 是 pdf.js 第一目标环境；WebView2 的 iframe srcdoc 禁令等结构性问题不存在。
3. 社区证据：electron-vite + better-sqlite3 + contextBridge 是 2025-26 成熟组合（调研存档于规划阶段）。

## 代价与缓解

- 安装包 ~100MB：课程工具可接受。
- 内存占用：单实例锁定 + 单窗口缓解。
- better-sqlite3 原生模块：V8 直接绑定（随 Node/Electron ABI 变化，**不是** N-API
  通用件），双 ABI 由 `scripts/sqlite-abi.mjs` 管理（abi-cache 两份预编译，npm scripts
  自动切换）；CI 构建关卡兜底。

## 后果

禁止再引入第三种运行时（Python sidecar/WebAssembly 服务）——新计算需求一律在 TS 内解决或走 ADR。

## 修订记录

- 2026-08-21：修正"代价与缓解"中关于 better-sqlite3 的错误表述。原文声称
  "N-API ABI 稳定，Node/Electron 通用，无需 rebuild"——与事实相反（见
  `AGENTS.md` 环境事实、`scripts/sqlite-abi.mjs` 与 ADR-0005 的钉版理由）。
  本项目在 Windows 上依赖 npmmirror/GitHub 预编译双 ABI 切换，而非源码 rebuild。
  教训：权威文档留两份口径 = 给 AI 的冲突信号（AI辅助开发经验教训 C2）。
