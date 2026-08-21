# AD-6：Electron 升级延期（修订：提前至 Phase 3 阅读器之前）

日期：2026-08-21 · 状态：已接受（同日修订，见文末）

## 背景

生产级审查（2026-08-21）发现 Electron 33.4.11 已脱离支持线，npm audit 列出
40+ CVE（含 ASAR integrity bypass、context isolation bypass via bind hijack 等）。
其余 audit 发现（tar/node-gyp 链 critical、esbuild dev-server）均为构建期/开发期
依赖，不入运行时产物。

## 决策

**不在骨架期升级 Electron**；升级点是 **Phase 3（阅读器）开始之前**。理由：

1. 威胁模型：单人使用的本地工具，无远程页面加载（will-navigate 全禁 + CSP 封死 +
   出网白名单 3 host），已知的 renderer 侧 CVE 利用面接近于零；构建链漏洞不影响产物。
2. 升级是高风险破坏性变更：`scripts/sqlite-abi.mjs` 的 ABI 映射（33→130）需重标、
   锁定测试基线可能漂移、镜像下载链要重验——在 55 工单未填的骨架期做这些是把
   回归风险放大到整个项目。
3. 分发才是暴露面转折点：只要不分发安装包，EOL 版本的风险是理论性的。

## 后果

- 升级门：**Phase 3 开始前必须完成**——升级至当期支持线（ADR + [dep-change] +
  `ELECTRON_ABI_MAP` 补表 + better-sqlite3 prebuild 可用性确认 + 全量 verify/e2e），
  未完成不得开工阅读器工单；Phase 6 打包前仅需复核版本仍在支持线。
- 在此之前新增依赖/升级一律不动 electron 主版本。

## 修订记录（2026-08-21，经人类定案）

原决策把升级门放在 Phase 6（打包前）。修订提前至 Phase 3 前，依据：

- 阅读器是全项目**唯一重度依赖 Chromium 渲染行为**的模块（pdf.js canvas/TextLayer/
  标注锚定）；在最终 Electron 上构建它，省掉"升级后重验渲染"的环节（e2e 只断言
  文本可见，不覆盖像素级，晚升需要一轮人工视检）。
- 阅读器核心工单 SR-RDR-01/02/03 为 **strong 归属**，ADR-0005 的"新版本训练数据
  稀薄 → 弱模型幻觉风险"在此不适用；其后填充的 weak UI 工单是纯 React 代码，
  不接触 Electron API，受版本影响接近零。

