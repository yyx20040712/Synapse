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
- better-sqlite3 原生模块：N-API ABI 稳定，Node/Electron 通用，无需 rebuild；CI 构建关卡兜底。

## 后果

禁止再引入第三种运行时（Python sidecar/WebAssembly 服务）——新计算需求一律在 TS 内解决或走 ADR。
