# AD-6：Electron 33 升级延期至 Phase 6 打包门

日期：2026-08-21 · 状态：已接受

## 背景

生产级审查（2026-08-21）发现 Electron 33.4.11 已脱离支持线，npm audit 列出
40+ CVE（含 ASAR integrity bypass、context isolation bypass via bind hijack 等）。
其余 audit 发现（tar/node-gyp 链 critical、esbuild dev-server）均为构建期/开发期
依赖，不入运行时产物。

## 决策

**不在骨架期升级 Electron**；把「升级到当前支持线 Electron」定为 Phase 6（打包分发）
的强制前置门。理由：

1. 威胁模型：单人使用的本地工具，无远程页面加载（will-navigate 全禁 + CSP 封死 +
   出网白名单 3 host），已知的 renderer 侧 CVE 利用面接近于零；构建链漏洞不影响产物。
2. 升级是高风险破坏性变更：`scripts/sqlite-abi.mjs` 的 ABI 映射（33→130）需重标、
   55 个工单的锁定测试基线可能漂移、镜像下载链要重验——在 55 工单未填的骨架期
   做这些是把回归风险放大到整个项目。
3. 分发才是暴露面转折点：只要不分发安装包，EOL 版本的风险是理论性的。

## 后果

- Phase 6 打包清单新增硬性项：升级 Electron 至当期支持线（ADR + [dep-change] +
  abi 映射更新 + e2e 全绿），未完成不得出安装包。
- 在此之前新增依赖/升级一律不动 electron 主版本。
