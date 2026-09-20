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

## 执行记录（2026-08-22，升级门已过）

- **目标选定：Electron 42.9.3**（Chromium M148 / Node 24，支持至 2026-10-20）。
  当期支持线 {41, 42, 43} 中，prebuild 矩阵核查结果：41（ABI 145）与 42（ABI 146）
  在 better-sqlite3 12.11.1 上有现成 win32-x64 预编译；**43（ABI 148）没有**——
  带 v148 资产的 12.11.2/12.12.0 只有 GitHub release 未发 npm registry，
  v13.x 无任何 win 预编译。按本 ADR"prebuild 可用性优先"清单落 42，
  better-sqlite3 维持 12.11.1 不动（无连带升级）。
- 41 当日距 EOL 仅 3 天（2026-08-25），排除；43 的备选路径（GitHub-URL 依赖 /
  源码编译）均破坏 npmmirror 纯 npm 可复现安装策略，排除。
- 执行内容：electron 33.4.11→42.9.3（精确钉版）、`ELECTRON_ABI_MAP` 补表 37~44
  （数据源 node-abi 4.33.0）、`npm run verify` 全绿（132 过/66 按工单跳过）、
  e2e smoke 3 绿（Playwright 1.49 `_electron` 驱动 42 无兼容问题）。
- `npm audit --omit=dev`：运行时 **0 漏洞**（升级前 40+ CVE）。剩余 dev 侧为构建链
  （electron-builder 25→26 属破坏性变更、esbuild dev-server、tar），留 Phase 6 决策。
- Phase 6 打包前复核：版本仍在支持线（42 于 2026-10-20 出线，届时按同清单小步跟）。

## 执行记录（2026-09-19，F-ELE-02：better-sqlite3 12.11.1→13.0.3 N-API 化）

- **升级内容**：better-sqlite3 12.11.1→13.0.3（[dep-change]）。v13.0.0 起为 N-API
  版本（node-addon-api），**同一份绑定跨 Node/Electron ABI 通用**（Node 24.20.0
  ABI 137 / Electron 42.9.3 main ABI 146 双运行时实测加载+读写+FTS5+transaction+
  pragma 全过——产研 docs/reports/2026-09-18_ele-upgrade-prestudy.md §1.3）。
  SQLite 引擎 3.52.x→3.53.4。prebuilt 随 npm 包直发
  （`node_modules/better-sqlite3/prebuilds/win32-x64.node`），npm 正常安装即得，
  无 postinstall 下载步骤。
- **双 ABI 机制退役**（方案切换=删除旧方案）：`scripts/sqlite-abi.mjs` 删除
  （setup/use node/use electron 全链+abi-cache+ELECTRON_ABI_MAP 表整体退役），
  package.json scripts 四处调用点摘除（postinstall/dev/build/test），`.npmrc`
  的 better_sqlite3_binary_host_mirror 镜像行删除（prebuild-install 依赖随 v13
  移除，镜像配置已失效）；`install-electron`（electron 包自带 bin）保留。
  locks manifest 245→244。
- **勘误上文 2026-08-22 执行记录的「v13.x 无任何 win 预编译」句**：该结论失准。
  2026-08-22 时点调查只查了 GitHub release 资产（v13 起 GitHub 零二进制资产——
  这一点属实），漏查 npm 包内 `prebuilds/` 新分发机制（v13.0.0 起 prebuilt
  直接随 npm 包发布，prebuild-install 依赖移除）——2026-09-18 产研 §1.1/§1.2
  反证。「prebuild 可用性确认」核查清单由此补一条：**数据源必须含 npm 包内容
  （tar -tzf 或 npm pack --dry-run），不能只查 GitHub release 资产**。
- 本段仅升 better-sqlite3，Electron 42.9.3 不动（归 F-ELE-03 B 票）。

## 执行记录（2026-09-19，F-ELE-03：Electron 42.9.3→44.4.3）

- **升级内容**：electron 42.9.3→44.4.3（精确钉版，[dep-change]）。44 线当期最新
  （Chromium M152.0.7977.130 / 内嵌 Node 24.21.0 / ABI 149；§6.6 复核 2026-09-19
  当日 44.4.3 仍最新）。engines.node 同批收紧 >=20→>=22（主控预裁 W2——与
  better-sqlite3 v13 engines 口径对齐）。
- **breaking 适配**（产研 §3 核对面兑现，两项）：①clipboard main 侧 writeText
  Promise 化（W3C 对齐）——IpcDeps 剪贴板写口返回类型 void→Promise<void>，
  export_ 写点 await 化+失败 console.error 留痕后重抛（错误传播语义与 42 时代
  等价，不静默吞）；注入面 bootstrap 零改动（结构兼容）。②dialog defaultPath
  行为变化（43 起）——dialogs.ts 三 pick 补模块级 lastDir 内存态+defaultPath
  传参，复刻 42 时代「记住上次目录」体感（主控预裁=内存态不持久化）。
  ANGLE 静态链接面：pdf.js 渲染回归经 e2e 两条探针（划选高亮重开原位/多行
  判别）断言级验证绿；像素级人工视检为欠账（见下）。
- **验证链读数**：vitest 167 文件/1724 用例全绿 EXIT=0；e2e 双通道 42/42+44/44
  全绿 EXIT=0——**@playwright/test 1.49 驱 Electron 44（M152）CDP 零兼容漂移**
  （产研主风险变量消解，无需升级 @playwright/test）；指纹门
  183·1768·5368·skip14 零漂移；locks 244。renderer 产物 index-DW6Z3WXp.js
  1,388.14kB 与升级前同名同尺寸；main/preload 183.64kB/137.93kB（适配面微动）。
- **typecheck 欠账（受锁测试面）**：export-clipboard.test.ts 桩以 void 返回
  形状注入，与 Promise 化后接口静态不兼容（6 处 TS2345；运行时零碰撞——
  vitest 全绿含该文件 6 用例）。处置=呈报主控裁决 [locked-change]（类型面
  同步：注解+5 桩 async 化，逻辑零动），实现者无权自改受锁测试。
- **dist/smoke 冒烟=环境阻塞如实呈报**（非 44 兼容信号）：electron-builder
  25.1.8 已正常进到 packaging electron=44.4.3 段；死点一=旧 dist/win-unpacked
  app.asar 被本机 zcode 宿主进程索引锁持（EBUSY，会话级自愈）；死点二=
  winCodeSign 工具链缓存预置（2026-08-22 同型一次性预置）已蒸发，非管理员
  shell 无 symlink 特权，解压恒红且重试哈希为随机临时名无法预置命中——修法=
  管理员终端跑一次 `npm run dist` 重建缓存（先例同 2026-08-22）。另发现既有
  失配：installer-smoke.mjs APP_EXE 仍按旧 productName「Synapse Remake」找
  exe，与现 productName=Synapse 失配（R2-SH1 漏项，独立于本票）。
  〔2026-09-20 回写：该漏项已经 R2-SH3 清偿——三常量+DEVELOPMENT.md:88
  artifactName 勘误，票档在册；门二另发现无空格变体 UA 漏项
  （http-client.ts SynapseRemake/0.1）呈报用户裁决立票。〕
  〔2026-09-20 二次回写：UA 漏项已经 R2-SH4 清偿（USER_AGENT='Synapse/0.1.0'
  单源常量+三处文档路径/称谓），票档在册。〕
- 回退路径不变：钉版回 42.9.3 即回（v13 绑定在 42 下已实测可跑）。

