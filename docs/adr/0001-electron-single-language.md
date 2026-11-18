# ADR-0001：Electron 单语言（纯 TypeScript 全栈）

日期：2026-08-21 · 状态：已接受

## 背景

两个前身项目的失败都与跨语言契约有关：

- aquaresearch：TypeScript+Rust+Python 三进程，类型手工同步漂移，累积 125 个编译错误；
- Synapse 早期版：TypeScript+Rust，WebView2 环境下 pdf.js 长期返工未完成。

## 候选

- Tauri/Rust 路线：后端 Rust，跨语言契约需手工同步——与两次历史失败同根。
- Electron + 纯 TypeScript 路线：全栈单语言，类型直接共享。

## 裁决

Electron + 全项目唯一语言 TypeScript。Electron 版本精确固定（钉选策略见 ADR-0005）。类型经 `src/shared/` 直接 import，无任何代码生成步骤。

依据：

1. 单语言下，跨语言契约漂移在编译期即暴露——消灭头号失败根因。
2. Chromium 是 pdf.js 第一目标环境；WebView2 的 iframe srcdoc 禁令等结构性问题不存在。
3. 社区证据：electron-vite + better-sqlite3 + contextBridge 是 2025–26 年的成熟组合。

## 后果

- 安装包约 100MB：课程工具场景可接受。
- 内存占用：单实例锁定 + 单窗口缓解。
- better-sqlite3 是原生模块，绑定随 Node/Electron ABI 变化。早期（v12 线）靠双 ABI 切换机制管理；自 v13 起为 N-API 版本，同一份绑定跨 Node/Electron ABI 通用，双 ABI 机制已随升级退役（见 ADR-0006）。
- 禁止再引入第三种运行时（Python sidecar/WebAssembly 服务）——新计算需求一律在 TypeScript 内解决，或另立 ADR。
