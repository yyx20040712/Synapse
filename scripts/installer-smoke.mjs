#!/usr/bin/env node
/**
 * [SR-PKG-02] installer-smoke.mjs —— 安装包冒烟：静默装 → 沙箱启动 → 存活断言 → 静默卸载
 * （工单：open / strong）
 *
 * ── 行为层 ──
 * - 对 dist 产物（默认取最新 .exe，--installer <path> 可覆盖）执行：
 *   ① NSIS 静默安装（/S /D=<临时目录>，等安装进程退出）；
 *   ② 以 SYNAPSE_USER_DATA=<临时用户数据目录> 启动已装 exe；
 *   ③ 存活断言：主进程 ≥8s 采样不退出（崩溃/闪退即 FAIL）；
 *   ④ 结束进程树 → 运行卸载器（/S）→ 清理两个临时目录；
 *   ⑤ 任一步失败：exit 1 并打印步骤名（--keep 保留现场便于排查）。
 * - 冒烟只验「装得上、起得来、卸得掉」；全链路（导入→阅读→标注→导出）由用户在
 *   干净环境人工验收（ROADMAP Phase 6 验收原文）。
 *
 * ── 接口层 ──
 * - 直接运行（package.json "smoke:installer" 接线）；无导出。
 *
 * ── 架构层 ──
 * - 依赖：SR-PKG-01 的 dist 产物；Windows NSIS 安装器约定（/S、/D=、
 *   Uninstall executable 命名）。
 *
 * ── 生命周期层 ──
 * - 预留：--keep；不做：已装应用的功能级 e2e（那是 playwright 层面）。
 *
 * ── 文化层 ──
 * - 错误：步骤级命名报错不吞；所有超时显式常量；禁止占位实现残留。
 */

console.error('[SR-PKG-02] installer-smoke.mjs 未实现（工单 open）')
process.exit(1)
