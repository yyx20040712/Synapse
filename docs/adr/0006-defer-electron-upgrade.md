# ADR-0006：Electron 升级门（prebuild 矩阵核查先行）

日期：2026-08-21 · 状态：已裁决——已执行（33→42→44，现行 44.4.3）

## 背景

生产级审查（2026-08-21）发现 Electron 33.4.11 已脱离支持线，npm audit 列出 40+ CVE（含 ASAR integrity bypass、context isolation bypass via bind hijack 等）。其余 audit 发现（tar/node-gyp 链 critical、esbuild dev-server）均为构建期/开发期依赖，不入运行时产物。

## 候选

- 骨架期立即升级：升级是高风险破坏性变更——`ELECTRON_ABI_MAP` 的 ABI 映射（33→130）需重标、锁定测试基线可能漂移、镜像下载链要重验，在工单大量未填的骨架期做这些是把回归风险放大到整个项目。
- Phase 6（打包前）升级：原决策位置；阅读器建成后才升级，需补一轮渲染重验（e2e 只断言文本可见，不覆盖像素级）。
- Phase 3（阅读器）开始前升级：阅读器是全项目唯一重度依赖 Chromium 渲染行为的模块（pdf.js canvas/TextLayer/标注锚定），在最终 Electron 上构建它，省掉「升级后重验渲染」环节。

延后（不在骨架期升级）的依据：

- 威胁模型：单人使用的本地工具，无远程页面加载（will-navigate 全禁+CSP 封死+出网白名单 3 host），已知的 renderer 侧 CVE 利用面接近于零；构建链漏洞不影响产物。
- 分发才是暴露面转折点：只要不分发安装包，EOL 版本的风险是理论性的。

## 裁决

裁决=第三项（立项同日修订，原决策为第二项）。

升级门：Phase 3 阅读器开始前必须完成升级——升级至当期支持线，清单=ADR + [dep-change] + `ELECTRON_ABI_MAP` 补表 + better-sqlite3 prebuild 可用性确认 + 全量 verify/e2e；未完成不得开工阅读器工单；Phase 6 打包前仅需复核版本仍在支持线。在此之前新增依赖/升级一律不动 electron 主版本。

补充依据：阅读器核心工单为 strong 归属，ADR-0005 的「新版本训练数据稀薄→弱模型幻觉风险」顾虑在此不适用；其后填充的弱模型 UI 工单是纯 React 代码，不接触 Electron API，受版本影响接近零。

### 执行记录（三段，均已落地）

| 段 | 变更 | 关键锚点 |
| --- | --- | --- |
| 一 2026-08-22 | Electron 33.4.11→42.9.3（Chromium M148/Node 24，42 线支持至 2026-10-20）；better-sqlite3 维持 12.11.1 不动 | prebuild 矩阵：当期支持线 {41, 42, 43} 中 41（ABI 145）/42（ABI 146）有现成 win32-x64 预编译；43（ABI 148）没有——带 v148 资产的 12.11.2/12.12.0 只发 GitHub release 未发 npm registry。41 当日距 EOL 仅 3 天排除；43 备选路径（GitHub-URL 依赖/源码编译）破坏 npmmirror 纯 npm 可复现安装策略，排除。`ELECTRON_ABI_MAP` 补表 37~44（数据源 node-abi 4.33.0）。升级后运行时 `npm audit --omit=dev` 0 漏洞（升级前 40+ CVE）；Playwright 1.49 `_electron` 驱动 42 无兼容问题 |
| 二 2026-09-19 | better-sqlite3 12.11.1→13.0.3（N-API 化） | v13.0.0 起 N-API 版本（node-addon-api）：同一份绑定跨 ABI 通用——Node 24.20.0（ABI 137）/Electron 42.9.3 main（ABI 146）双运行时实测加载+读写+FTS5+transaction+pragma 全过（预研记录：/home/yyx/synapse-archive/docs-2026-10-28/reports/2026-09-18_ele-upgrade-prestudy.md）。SQLite 引擎 3.52.x→3.53.4；prebuilt 随 npm 包直发（`node_modules/better-sqlite3/prebuilds/win32-x64.node` 等），无 postinstall 下载。双 ABI 机制退役（方案切换=删除旧方案）：`scripts/sqlite-abi.mjs` 删除（abi-cache+`ELECTRON_ABI_MAP` 表整体退役）、package.json scripts 四处调用点摘除、`.npmrc` 镜像行删除；`install-electron` 保留。勘误段一「v13.x 无 win 预编译」失准（只查 GitHub release 资产，漏查 npm 包内 `prebuilds/` 新分发机制）——核查清单补一条：**数据源必须含 npm 包内容（tar -tzf 或 npm pack --dry-run），不能只查 GitHub release 资产** |
| 三 2026-09-19 | Electron 42.9.3→44.4.3；engines.node >=20→>=22（与 better-sqlite3 v13 engines 口径对齐） | 44 线当期最新（Chromium M152.0.7977.130/内嵌 Node 24.21.0/ABI 149）。breaking 适配两项：①clipboard main 侧 writeText Promise 化（W3C 对齐）——IpcDeps 剪贴板写口 void→Promise<void>，export_ 写点 await 化+失败 console.error 留痕后重抛（错误传播语义与 42 等价，不静默吞）；受锁测试 export-clipboard.test.ts 桩的类型面欠账已清偿（[locked-change] 同步）。②dialog defaultPath 行为变化（43 起）——dialogs.ts 三 pick 补模块级 lastDir 内存态+defaultPath 传参（内存态不持久化）。ANGLE 静态链接面：pdf.js 渲染回归经 e2e 两条探针（划选高亮重开原位/多行判别）验证绿；@playwright/test 1.49 驱 Electron 44（M152）CDP 零兼容漂移，无需升级 @playwright/test |

## 后果

- 现行 Electron 44.4.3；运行时依赖 0 漏洞。
- dev 侧构建链漏洞（electron-builder 25→26 属破坏性变更、esbuild dev-server、tar）留打包期决策。
- 回退路径：版本回退 42.9.3 即回（better-sqlite3 v13 绑定在 42 下已实测可跑）。
