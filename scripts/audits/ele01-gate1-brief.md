=F-ELE-01 门一审包（轻量双审·文档批档位）=

== 票面（registry 行原文）==
id: F-ELE-01 | file: docs/reports/2026-09-18_ele-upgrade-prestudy.md | area: infra | owner: strong | status: open
摘要: Electron 升级预研（裁决 1——出支持线 2026-10-20 应对）：纯调研零 src 变更；产出=prebuild 矩阵+Node 24 兼容+工作量与风险清单→呈用户裁实施时机（呈裁后本票即勾，实施属后续波次）；实施窗口=F-GEOM-01 收口后且实施前强制复核矩阵时效（裁决书 §6.6）。

== 骨架原票面待研清单 ==
1. better-sqlite3 × Electron 43+（ABI 148+）prebuild 矩阵：npm 可得性 / GitHub release-only 形态 / 各版本覆盖面（对照 2026-08-22 升 42 实录）
2. Node 24 兼容矩阵（node-abi 映射数据源；CI node-version=24 同口径约束）
3. 工作量与风险清单（better-sqlite3 V8 直接绑定随 ABI 变化；sqlite-abi.mjs 双 ABI 管理机制的扩面成本）
4. 出支持线暴露窗评估（2026-10-20 security.md:38；梯队序下实施时点推演）
5. 结论与建议实施时机 → 呈用户裁决

== 交付件全文（调研报告）==
# [F-ELE-01] Electron 升级预研报告（调研产出）

> 调研票：纯调研零 src 变更。**产出呈用户裁实施时机——呈裁后本票即勾，
> 实施属后续波次不在本板**（relay.md 第三波头注）。实施窗口=F-GEOM-01
> 收口后（裁决 1）；实施启动前强制复核 prebuild 矩阵时效（裁决书 §6.6）。
> 调研完成日：2026-09-18（本节所有网络数据为当日实测快照；本地实验同日）。

## 0. 结论速览（TL;DR）

1. **僵局已破**：2026-08-22 升 42 时「43 无 win32 prebuild」的卡点已随
   better-sqlite3 **v13.0.0（2026-07-21 发布）N-API 化**而消解——prebuilt
   直接随 npm 包发布（`prebuilds/win32-x64.node`），npm 正常安装即得，
   跨 Node/Electron ABI 通用，ABI 148/149 问题在 v13 上不复存在。
2. **双运行时实测通过**：同一份 v13.0.3 win32-x64 绑定在 Node 24.20.0
   （ABI 137）/Node 25.2.1（ABI 141）/Electron 42.9.3 main 进程（ABI 146）
   下加载+读写+FTS5+transaction+pragma 全部通过（§2.3）。
3. **建议路线**：两票分离——先 better-sqlite3 12.11.1→13.0.3（低风险、
   消解 ABI 约束、sqlite-abi.mjs 双 ABI 机制退役），后 Electron 42.9.3→
   44.4.1（支持窗至 2027-03-02，最一步到位）；43 为中间档不推荐（支持窗
   仅到 2027-01-05 且工作量与升 44 几乎相同）。
4. **实施时机建议**：维持裁决 1（F-GEOM-01 收口后）**不变**；若届时已过
   2026-10-20 出线日，暴露窗风险可控（不分发=理论性，ADR-0006 已论证），
   不建议为赶窗口打断 GEOM 战役。呈裁选项与推荐见 §5。

## 1. prebuild 矩阵现状（2026-09-18 实测）

### 1.1 版本可得性（npm registry，经 npmmirror 同步）

| better-sqlite3 | npm registry | prebuilt 形态 | electron-v146(42) | electron-v148(43) | electron-v149(44) |
| --- | --- | --- | --- | --- | --- |
| 12.11.1（当前钉版） | ✓ | GitHub release 资产+二进制镜像 | ✓ | ✗ | ✗ |
| 12.11.2 / 12.12.0 | **✗（E404 实证）** | GitHub release 资产+二进制镜像 | ✓ | ✓（镜像已同步） | ✗ |
| 13.0.0~13.0.3 | ✓（最新 13.0.3） | **npm 包内 prebuilds/（N-API，跨 ABI）** | ✓（实测） | ✓（机制覆盖） | ✓（机制覆盖） |

- 12.11.2/12.12.0 只发了 GitHub release 未发 npm（`npm view` 双 E404；
  npmmirror 二进制镜像 `/-/binary/better-sqlite3/` 下两版目录均已同步
  electron-v148-win32-x64 资产，GitHub 源头 12.12.0 共 145 资产含
  v148 全平台）——「纯 npm registry 可复现安装」约束下此路径依旧不可走，
  且两版无 v149，对升 44 无用。
- v13.0.x 的 GitHub release **零二进制资产**（v13.0.3 目录仅源码包 2 件）——
  这不是缺失，而是 v13.0.0 起「prebuilt binaries are published directly
  with the better-sqlite3 code itself in the npm package」（官方 release
  notes），`prebuild-install` 依赖已移除。

### 1.2 v13 N-API 化（结构性变化）

v13.0.0 是 better-sqlite3 首个 N-API 版本（node-addon-api ^8.0.0）：

- npm 包（11,402,131 字节，sha512 与 registry dist.integrity 逐字节一致）
  内 `prebuilds/` 共 8 平台：darwin-arm64/x64、linux-arm64/x64、
  linuxmusl-arm64/x64、win32-arm64/**win32-x64**。
- N-API 是 Node 官方 ABI 稳定层——同一份 .node 跨 Node/Electron 版本
  通用，「better-sqlite3 是 V8 直接绑定、随 ABI 变化」的原有认知**对 v13
  失准**（AGENTS 环境事实段与 ADR-0006 的前提均基于 v12）。
- engines：`node >=22`（Node 24 ✓；Electron 42/43/44 均内嵌 Node 24 ✓）。

### 1.3 本地双运行时实测（本票最强证据）

隔离目录 `npm install better-sqlite3@13.0.3`（npmmirror，3 秒完成、
无编译）后，同一份 `prebuilds/win32-x64.node`：

| 运行时 | ABI | 结果 |
| --- | --- | --- |
| Node 24.20.0（Volta 真 24，项目 CI 同口径） | 137 | 加载+建库+读写 ✓ |
| Node 25.2.1（宿主默认，佐证跨 Node 大版本） | 141 | 加载+建库+读写 ✓ |
| Electron 42.9.3 main 进程（项目自身 electron） | 146 | 加载+建库+读写 ✓（sqlite=3.53.4） |

API 面探针（Node 24 下全过，与 src/main/db 同型用法）：pragma
（journal_mode/foreign_keys）、transaction（migrate.ts 同型）、prepare/
get/all/pluck、**FTS5 外部内容表+MATCH 前缀/短语查询**（fts.ts 同型）、
参数绑定（v13.0.1 修复的 cross-realm 回归项基础面）。

证据等级说明：Electron 43/44 下加载 v13 为**机制推断**（N-API 官方 ABI
稳定性+42 实测+42/43/44 同内嵌 Node 24 三重论证），未直接实测——实施票
首步即全量 verify+e2e 覆盖，等效复核。

## 2. Electron 版本与支持线现状

（数据源：endoflife.date/electron 2026-09-17 快照 + npm registry）

| 大版本 | Chromium/内嵌 Node | latest（2026-09-18） | 支持截止 |
| --- | --- | --- | --- |
| 42（当前 42.9.3） | M148 / Node 24 | 42.11.4（09-15） | **2026-10-20（剩 33 天）** |
| 43（ABI 148） | M150 / Node 24 | 43.7.1（09-15） | 2027-01-05 |
| 44（ABI 149） | M152 / Node 24 | 44.4.1（09-16） | 2027-03-02 |
| 45 | — | 未发布（官方 breaking-changes 文档已有 45.0 段；8 周节奏推算 2026-10-20 前后） | ~2027Q1/Q2 |

Node 24 兼容：42/43/44 全部内嵌 Node 24，CI node-version=24 同口径
约束自动满足，volta pin 24.20.0 不动；本地 Node 25 破损项（vitest jsdom）
与升级无交集。

## 3. breaking changes 项目面核对（42→43→44）

对照官方 breaking-changes.md（43.0/44.0 段全文过读）逐项核对本仓 src：

### 43（M150）——影响面：一处体感变化

- **Dialog defaultPath 行为变化**：未显式传 `defaultPath` 时默认开
  Downloads 且不再记住上次目录。`src/main/dialogs.ts` 的 pickPdfFiles/
  pickFolder/pickJsonFile 三处均未传（saveFile 显式传 defaultName 不受
  影响）。处置=实施票决策点：显式传 lastUsedPath 保持体感（约 10 行）或
  接受新默认。风险低。
- 其余（Linux 圆角/WCO、NativeImage.toBitmap 色彩归一——src 零使用、
  chrome.scripting、Linux showHiddenFiles）不涉及。

### 44（M152）——影响面：两处小改+两处回归验证

- **clipboard main 侧重构（W3C 对齐，方法全部 Promise 化）**：项目仅
  main 侧注入 `clipboard.writeText`（bootstrap.ts:175 → ipc-deps.ts:27
  类型 `{ writeText(text): void }` → ipc/export_.ts:88 调用不 await）。
  writeText 仍存在、写入语义不变，但错误面从 throw 变 unhandled
  rejection——适配=类型签名改 `Promise<void>`+调用点补 `.catch` 或
  await（三点小改）。renderer 侧 clipboard 模块移除不涉及（renderer 经
  IPC，宪法分层本就如此）。
- **ANGLE 静态链接**：GPU 管线变化，pdf.js canvas/TextLayer 渲染是全项目
  唯一重度依赖 Chromium 渲染行为的面——实施票必跑 e2e 44 用例+一轮人工
  视检（ADR-0006 修订记录的既定要求）。
- net.request 的 Sec-Fetch 校验：项目仅用 `net.fetch`（bootstrap.ts:88
  单点注入 http-client），不显式设 Sec-Fetch 头，不涉及。
- macOS 12 / win32-ia32 / Linux 32 位移除：不涉及（win-x64）。

### 配套件（devDependencies）

- **@playwright/test ^1.49.1（2024-11 版）驱动 43/44 的 CDP 协议漂移风险
  =实施主要不确定项**：1.49 时代 Chromium ~M131，43/44 为 M150/M152。
  ADR-0006 记录 1.49 驱 42（M148）无问题，但再跨两个大版本需实测；若红
  则升 @playwright/test（已在依赖清单，属升级非新增；升级会牵动 e2e API
  面与指纹门基线，工作量单独计）。
- electron-builder ^25.1.8：仅 Phase 6 打包用（ADR-0006 已留 Phase 6
  决策，25→26 破坏性变更），不阻塞本升级、不随本升级动。

## 4. 工作量与风险清单（按票拆分）

### 票 A：better-sqlite3 12.11.1 → 13.0.3（[dep-change]，低风险）

- package.json 精确钉版+lockfile 同步；`.npmrc` 的
  better_sqlite3_binary_host_mirror 行清理（prebuild-install 已不存在）。
- **sqlite-abi.mjs 双 ABI 机制退役**（方案切换=删除旧方案，宪法）：
  v13 安装即用无 postinstall 下载，`setup/use node/use electron` 全链、
  abi-cache、package.json scripts 调用点、ELECTRON_ABI_MAP 表整体删除；
  `install-electron`（electron 42 起懒下载显式化）保留。check-quality 等
  脚本若引用 `use node/electron` 钩子需同步改。
- documents 面：ADR-0006 增执行记录；AGENTS 环境事实段两处失准描述
  （「V8 直接绑定」「sqlite-abi.mjs 双 ABI 管理」）+ security.md §5 版本行
  修订——可随票或归 F-PROC-01/F-DOCGOV-01（呈裁后实施票定）。
- 验证面：verify 全链（vitest=Node 绑定路径变化为「无需切换」）+e2e
  双通道+FTS 契约面（SQLite 3.52.x→3.53.4，FTS5/pragma/transaction 已
  探针过，全量单测兜底）。
- 工作量估：0.5~1 个会话单元（机制删除面大于代码新增面）。

### 票 B：Electron 42.9.3 → 44.4.1（[dep-change]，中风险）

- 前置：票 A 先行（消解原生绑定约束）。
- package.json+lockfile+install-electron 重验（懒下载+npmmirror 镜像）。
- 代码适配：clipboard 三点小改（§3）+ dialog defaultPath 决策（§3）。
- **回归验证（工作量主体）**：Playwright 驱动兼容首验（红则升级
  @playwright/test=独立工作量+指纹门基线重冻结）；e2e 44 用例双通道；
  pdf.js 渲染人工视检一轮；build/electron-builder 冒烟（打包面 Phase 6
  决策照旧）。
- 回退路径：钉版回 42.9.3+票 A 不受影响（v13 在 42 下已实测可跑——
  两票分离使 Electron 回退零连带）。
- 工作量估：1~2 个会话单元（Playwright 漂移与否是主变量）。

### 43 中间档为何不推荐

支持窗仅至 2027-01-05（4 个月后需再升）；breaking 适配面与升 44 几乎
同集（43 的 dialog 变化 44 同样有，44 的 clipboard 项小）；Playwright
漂移风险 43/44 同在——付出几乎相同的工作量买一半的窗口。

## 5. 出支持线暴露窗与实施时机（呈裁）

- **暴露窗评估**：42 于 2026-10-20 出线。本项目不分发（Phase 6 未到）、
  无远程页面加载（will-navigate 全禁+CSP 封死+出网白名单 3 host）、
  renderer 沙箱——ADR-0006 论证口径下出线后的风险是理论性的；security.md
  已有「Phase 6 打包前复核仍在支持线」的兜底条款。**若实施落在出线后
  数周，实际暴露风险可控**。
- **时机推演**：裁决 1 定实施窗=F-GEOM-01 收口后。当前梯队序剩余
  F-ALIGN-01（第三波）→ 第四波 GEOM 战役（设计链+实现分项）。按近期
  推进节奏推算，GEOM 收口时点大概率落在 2026-10 上中旬——与出线日
  接近或略过。**矩阵时效**：本报告 §1 快照距实施窗口约数周，v13 线已
  稳定（13.0.3=08-05 后无新版），Electron 44 线持续小版本更新（44.4.1
  09-16）——实施前按裁决书 §6.6 复核一次（重跑本报告的镜像目录清单+
  npm view 两探针即可，约 10 分钟）。

**呈裁选项**（实施时机，裁决权在用户）：

| 选项 | 内容 | 评注 |
| --- | --- | --- |
| a（推荐） | 维持裁决 1：F-GEOM-01 收口后两票分离实施（A→B） | 不打断 GEOM；若过 10-20 暴露窗可控；44 支持至 2027-03-02 |
| b | GEOM 前提前实施（ALIGN 后插队） | 消除出线暴露；但 GEOM 动 tests/src 大面与升级回归面重叠，战役中断一次 |
| c | 仅先行票 A（bsq13），Electron 延至 Phase 6 前 | A 独立低风险随时可做；42 出线后继续用至打包前 |
| d | 全部维持现状至 Phase 6 | 最保守；出线后运行时间最长，不建议 |

## 6. 附：实测数据出处

- npm 版本面：`npm view better-sqlite3 versions`（12.11.1 后直接 13.0.0）；
  `npm view better-sqlite3@12.11.2 version` / `@12.12.0` 双 E404。
- 镜像资产面：`registry.npmmirror.com/-/binary/better-sqlite3/` 目录索引
  （132 条目；v12.11.2/v12.12.0/v13.0.0~13.0.3 目录逐个列资产）。
- GitHub 源头：api.github.com releases/tags（v12.12.0=145 资产含
  electron-v148-win32-x64；v13.0.3=0 资产）+ 最近 8 个 release notes
  （v13.0.0 N-API 化声明原文）。
- v13 包内容：cdn.npmmirror.com tarball 下载（sha512 对 registry
  dist.integrity 校验一致）+ `tar -tzf` 列 prebuilds/ 8 平台。
- 支持线：endoflife.date/electron（2026-09-17 快照）。
- breaking changes：electron 官方 docs/breaking-changes.md（43.0/44.0 段
  全文）+ 本仓 src grep 核对（clipboard/dialog/net/toBitmap 四面）。
- 本地实验：隔离目录安装+三运行时加载探针（Node 24.20.0=Volta 路径
  实跑；Node 25.2.1=宿主默认；Electron 42.9.3=项目 node_modules 实跑）。
- 探针脚本与原始输出存档：scripts/audits/ele01-*.log / .txt。

## 裁决与排程序

docs/design/2026-09-18_complexity-governance-ruling.md 裁决 1 / §3 梯队二
F-ELE-01 行 / §6.6。调研产出落本件（标题日期=立案日，内容日期以文内为准）。


== 证据件（探针原始输出全文）==
F-ELE-01 调研证据存档（2026-09-18 本地实测原始输出）
====================================================

[探针 1] tarball 完整性+包内容（ele01-verify-tarball.mjs，探针毕已删）
----------------------------------------------------------------
源码：
  import { createHash } from 'node:crypto' ...（sha512 对 npm dist.integrity 比对 + tar --force-local -tzf 列表）
输出：
  size: 11402131 | integrity ok: true
  entries: 68
  --- prebuild entries ---
  package/prebuilds/darwin-arm64.node
  package/prebuilds/darwin-x64.node
  package/prebuilds/linux-arm64.node
  package/prebuilds/linux-x64.node
  package/prebuilds/linuxmusl-arm64.node
  package/prebuilds/linuxmusl-x64.node
  package/prebuilds/win32-arm64.node
  package/prebuilds/win32-x64.node

[探针 2] 三运行时加载（node-probe.cjs / main-probe.cjs，临时目录 $TEMP/bsq13-test）
----------------------------------------------------------------
node-probe.cjs 源码：
  const Database = require('better-sqlite3')
  const db = new Database(':memory:')
  db.exec('CREATE TABLE t(x INTEGER)')
  db.prepare('INSERT INTO t VALUES (?)').run(42)
  ... SELECT x / sqlite_version()
main-probe.cjs 源码：
  const { app } = require('electron')
  app.whenReady().then(() => { ...同上 run(43)... console.log(..., process.versions.electron, process.versions.modules); app.quit() })

输出（Node 25.2.1 宿主默认，ABI 141）：
  NODE24_LOAD_OK x= 42 sqlite= 3.53.4
输出（Node 24.20.0 Volta 真路径 $LOCALAPPDATA/Volta/tools/image/node/24.20.0/node.exe，ABI 137，项目 CI 同口径）：
  v24.20.0
  NODE24_LOAD_OK x= 42 sqlite= 3.53.4
输出（Electron 42.9.3 = 项目 node_modules/.bin/electron，main 进程，ABI 146）：
  ELECTRON42_LOAD_OK x= 43 sqlite= 3.53.4 electron= 42.9.3 modules= 146

[探针 3] 项目 API 面（api-probe.cjs，Node 24.20.0）
----------------------------------------------------------------
覆盖：pragma(journal_mode/foreign_keys) / transaction(migrate.ts 同型) /
prepare+get+all+pluck / FTS5 外部内容表+MATCH 前缀与短语(fts.ts 同型) /
参数绑定(v13.0.1 cross-realm 修复项基础面)。
输出：
  pragma journal_mode = [ { journal_mode: 'memory' } ]
  pragma foreign_keys = []
  get = {"id":2,"name":"beta"}
  all = 1,2
  fts5 plain = 1
  fts5 phrase = 1
  bind object = true
  PROBE_ALL_OK

[探针 4] npm registry 缺位实证
----------------------------------------------------------------
$ npm view better-sqlite3@12.12.0 version  → 无输出 exit=1（E404）
$ npm view better-sqlite3@12.11.2 version  → 无输出 exit=1（E404）
$ npm view better-sqlite3 version          → 13.0.3
$ npm view better-sqlite3@13.0.3 engines   → { node: '>=22' }
$ npm view better-sqlite3@13.0.3 dependencies → { 'node-addon-api': '^8.0.0' }
$ npm view electron version                → 44.4.1
$ npm view node-abi version                → 4.35.0

[数据源快照说明]
- npmmirror 二进制镜像目录索引全量存档：scripts/audits/ele01-mirror-index.json
  （132 条目；v12.11.2/v12.12.0 目录含 electron-v148-win32-x64；
  v13.0.0/v13.0.3 目录仅源码包 2 件）
- GitHub releases（经代理 api.github.com）：v12.12.0=145 资产
  （electron-v148-win32-x64=1041458 字节，全平台 v145/146/148）；
  v13.0.0~13.0.3 零二进制资产；v13.0.0 release notes 原文关键句：
  "the first version of better-sqlite3 to run on the N-API ... we've
  removed the deprecated prebuild-install dependency, and now prebuilt
  binaries are published directly with the better-sqlite3 code itself
  in the npm package"
- endoflife.date/electron（2026-09-17 快照）：42 EOL 2026-10-20 /
  43 EOL 2027-01-05 / 44 EOL 2027-03-02；latest 42.11.4 / 43.7.1 / 44.4.1
- node-abi 本地 3.94.0 abi_registry：electron 43=148 / 44=149；
  node 24=137 / 25=141（与升 42 时 ADR-0006 数据源 node-abi 4.33.0 一致）


== 机检终态 ==
verify 全链尾部：
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-BfpEygSE.css           [39m[1m[2m   52.49 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-Db9oFj0U.js            [39m[1m[33m1,393.06 kB[39m[22m
[32m✓ built in 1.77s[39m
VERIFY_EXIT=0

（VERIFY_EXIT=0；locks 面零变更——manifest 334 不含 audits/docs-reports 路径，证据件不入锁面）

== 主控显式假设清单（请逐条拷问）==
A1【机制推断】Electron 43/44 下加载 v13 未直接实测，以「N-API 官方 ABI 稳定+42 main 进程实测+42/43/44 同内嵌 Node 24」三重论证覆盖——报告 §1.3 已标证据等级。拷问点：该推断链是否有隐藏缺口（如 Electron 对 N-API 模块的 context-aware 要求、NODE_MODULE_VERSION 元数据校验差异）？
A2【E404 归因】12.11.2/12.12.0 双 E404 归因为「未发 npm registry 而非临时故障」——npmmirror 同步镜像的 dist.tarball 元数据+GitHub release 双源佐证。拷问点：归因是否充分？
A3【EOL 日期】endoflife.date 为二手数据源（42=2026-10-20 与仓内 security.md:38 一致互相印证；43/44 日期仅单源）。拷问点：43/44 的 EOL 日期失准会影响呈裁选项吗？
A4【Playwright 风险等级】1.49 驱动 44 定级「中风险/实施工作项」未实测。拷问点：该级判是否低估（若升级 @playwright/test 会牵动指纹门基线与 e2e API 面——工作量描述是否充分）？
A5【建议面】两票分离（bsq13 先行）+43 中间档不推荐+时机维持裁决 1——推演是否被证据支撑？
A6【零变更边界】本票零 src/tests/CI 变更（仅 docs/reports 重写+scripts/audits 增 3 证据件+relay.md 状态面）——git status 五文件，DoD 口径符合调研票？

== 审计口径 ==
B=阻断（失实/越权/遗漏票面要件）W=警告（口径含糊/证据不足）N=记录级。产出预算：结论 ≤600 字。