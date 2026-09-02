# AGENTS.md —— AI 协作宪法（给所有代理的硬规则）

> 本文档的每条规则都有历史事故对应（事故档见根目录 `AI辅助开发经验教训.md`；
> 工作法原理层见 `docs/methodology.md`）。
> CI 会强制其中可机检的条目；不可机检的靠审查。**规则冲突时以本文为准。**

## 项目一句话

单人使用的本地学术文献管理 + PDF 阅读标注桌面应用（Electron + 纯 TypeScript）。

## 硬规则（违反即返工）

### 会话开工纪律（技能清点——任何工作的第一步）

- **任何工作启动时，先枚举当前环境的可用技能清单，逐项标注「用 / 不用 + 理由」，写入
  开工记录**（当次简报 / 任务台账 / 会话开篇均可，随产物留存备查）**后再动手**。禁止
  裸手搭流程（2026-08-23 前置会话实证：未加载工程技能裸手搭审计流水线，叠加 GLM 思考
  等级配错，整场裁决作废、战役半途终止）。
- 判据：与任务相关的工程技能（系统化调试 / TDD / 完成前验证 / 子代理开发等）默认「用」；
  标「不用」必须给出具体理由（如「纯文档改动，无测试面」），不许空泛带过。
- 配置自查随清点一并完成：确认自身与将派发的子代理处于正确模型 / 思考等级配置（同源事故：
  等级配错的模型签发的一切裁决视为无效）；三屋派发的「正确配置」以 docs/methodology.md
  §4.5 档位表为准。
- 中途发现漏用且已走弯路 → 立即补加载，并把教训记入当次简报。

### 状态与不变量纪律（防屎山三盲区：时序/接缝/未声明假设）

- **状态机前置**：凡「store + 异步 + 用户输入」的工单或修改，行为层规约必须**先**给出
  状态/迁移表（枚举态空间），并按「态空间 + 跨格序列」交审计——单格枚举盖不住跨格
  序列（2026-08-23 U2 五轮回炉实证：18 格单格全过，"合并落地→补存失败→再 load" 跨格
  序列丢稿由 deepseek 门拦截）。
- **不变量登记**：跨模块/跨时间的行为不变量一律登记 `docs/invariants.md`（声明处 +
  强制方式 + 锚定状态）；未登记 = 未定义行为。新增跨模块行为不登记本册视同未完成。
  禁止依赖默认假设（"文档永不滚"曾未声明，用户实锤后才补）。
- **同类缺陷二次触发即重构**：同一模块同类 bug 第二次出现 → 停止增量补丁，先出态
  空间/设计文档再实现（增量守卫每步局部合理，合起来没人能一句话说清——屎山形成机制）。
- **接缝归责**：改动模块 A 时必须核对相邻模块 B 对同一行为的声明（注释/契约）；发现
  两处声明互斥即停下报告裁决，不得顺手改一侧（2026-08-23 tags.store 与 TagEditor
  注释互斥实证）。

### 代码组织

- **文件 ≤500 行**（ESLint `max-lines` error）。repo ≤300 行、组件 ≤250 行。出现第二职责就拆文件。
- **分层单向**：`ipc → services → repos → db`；`renderer → window.api → ipc`。禁止跨层（ESLint 强制）。
- **方案切换 = 删除旧方案**。不允许两套 PDF 方案、两个 ORM 并存（教训 E5/B3）。
- **死代码即删**：孤儿组件、重复资产（pdf.js worker 只允许一份）。提交前确认新文件被引用。
- **类型单一真相源**：一切跨进程类型来自 `src/shared/`；类型变更 = [locked-change] 流程。禁止手写两份等价类型。
- 重复 3 次以上的逻辑抽函数；第 2 次保持重复（Rule of Three）。

### 安全禁令（否定式，一条都不许碰）

- 禁止 `nodeIntegration: true` / `webSecurity: false` / `sandbox: false` / `contextIsolation: false`
- 禁止 renderer 引入任何 Node/Electron API 或绝对文件路径（路径只能来自 main 侧系统对话框）
- 禁止对未过 `shell-guard` 校验的 URL 调 `openExternal`
- 禁止字符串拼接 SQL；一切语句 `db.prepare` 预编译 + 参数绑定；FTS 输入必须经 `escapeFtsQuery`
- 禁止 `eval` / `new Function` / `unsafe-eval`（CSP 已封死）
- 禁止新增出网 host（白名单在 `src/shared/constants.ts`，新增需 ADR + [locked-change]）

### 完成定义（Definition of Done）

- [ ] `npm run verify` 全绿（quality + tickets + locks + lint + typecheck + test + build，与 CI 同口径，不是 README 数字）
- [ ] `grep` 无 `TODO|FIXME|placeholder`（CI quality 关卡）
- [ ] 无乱码：中文内容工具验证可读（CI mojibake 关卡）
- [ ] `git diff --stat` 无范围蔓延
- [ ] 占位实现已删除；工单在 `tickets/registry.ts` 翻状态
- [ ] 新增受锁文件已 `npm run locks:apply`
- [ ] 计数类数字（用例数/文件数/行数/出现次数等快照）落笔前经脚本实测（wc/grep/
  机器输出），禁凭印象——2026-09-02 体检场拼包两条失实实证（INV 计数 43/3/2
  误写 40/4/3、e2e 3 次连跑误写 4 值，下游模型被带偏两轮才被对抗链拦截）

### 测试纪律

- **测试是锁定的合约**：禁止修改 `tests/**`、`**/*.test.ts`、`src/shared/**`（CI sha256 对账）。发现测试本身有错 → 报告人类，走 `[locked-change]`，**不得自行修改让代码通过**。
- **每个测试必须能失败一次**（写完先红再绿；恒真断言 = 假阳性，比没测试更危险）。
- **e2e 非确定失败立案线=同用例 2 次**（通则，2026-09-02 体检场终裁入册）：
  同一 e2e 用例出现 2 次非确定性失败即立案排查（复跑绿不算销项——记录失败
  指纹：差值/同值/序列位置）；禁拖到多场多现（P7-A 七现才行动的教训——前六
  次都在消耗审查者信任带宽）。
- **变异红证的还原安全**（2026-08-23 UBS 实证）：对**未提交**的实现做「临时变异→
  红→还原」时禁用 `git checkout`（会把未提交实现一并抹掉），用文件备份法
  （cp 备份→变异→测→cp 还原→diff 确认空）。
- **受锁 e2e spec 改动后必须全量 verify**（2026-08-23 UBS 实证）：playwright 用
  esbuild 转译不查类型，tsc 关卡才能拦住类型注解缺陷——只跑 playwright 会漏。
- 修核心模块（渲染/数据层）前先跑它的测试；改完再跑。
- e2e 必须断言"渲染出真实文本"（历史：52 测试全绿但文字不可见）。

### 工单工作流（三屋模式默认 + 弱模型领单）

**三屋模式（strong 工单默认，2026-08-27 ADR-0017）**：主控会话派发→实现者
子代理（领票面五层规约，TDD 红→绿→**断言级变异红证**；禁 git/registry）→
门一对抗深审+门二终审（独立子代理）→主控按裁决权限三分法处置回炉（≤2）→
收口单写（亲验 verify 真退出码+locks+diff 范围→翻 registry→[locked-change]
提交）。实现者自裁申报一切超票面决定（含删减面 diff 自查）；新测试
always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）；每单元
子代理 token/时长入成本账本，成本按**模型×供应商×套餐**分列（交接书/
战役报告）。**派发必显式定档**（机型+供应商+思考等级一体写进派发指令；
单一调用者，缺省=继承主控档=最贵档静默浪费，禁静默继承默认）。模型分工
走 docs/methodology.md §4.5 终态：实现者=GLM5.3flash（deepseek 实现面
禁用）/门一=Kimi 链外部派发（零仓库接触）/门二=异构二审/体验额度优先
消费（2026-09-02 用户裁决+同日终态对齐，蓝本=subagent-driven-
development Model Selection+loop-engineering references/06）；**架构与
技术路线层面的设计与优化=Kimi 拟定→deepseek 审核→GLM5.3 主控终裁+指挥
实现；交接场首动作=Kimi 全面体检反馈主控后再定后续开发**（2026-09-02
第四次 Ruling——双源复审实战验证对抗有效性）。派发模板
三件=docs/methodology.md §4。

**弱模型领单（既有流程不变）**：

1. 读 `tickets/registry.ts` 找 `status: 'open'` 且 `owner: 'weak'` 的工单。
2. 打开工单文件，**文件头五层规约就是完整任务书**；先读它对应的锁定测试。
3. 只改这一个文件（+ 必要时新文件）。禁止顺手实现别的工单、禁止改契约、禁止改测试。
4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类翻 registry 状态 → 提交。
5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。

### 闲时连续开发（无人值守场，2026-09-03 立制）

- **停止条件仅三种，此外永不自停**：①任务池清空（最新交接书 §2 全项毕+挂起项
  处理毕）；②真阻塞——逐项处置后**跳次项继续**而非收段（视觉方向级决策挂起留
  在场场次/单票回炉 ≤2 上限后挂起跳次/门链 exhaust 按派发器头注降级/网络断则
  快票面继续三屋票顺延/verify 无从解释的红还原本票 diff 宁停勿烂）；③会话被
  外部终止（下方开场三态兜底）。票收口（verify 绿+门审毕+提交）后**立即取
  交接书 §2 次项**——无事收段=事故。
- **禁自估上下文占用**：代理工具面不暴露该读数，属不可测项，禁落笔自估值、禁以
  「预算 ~N%」「上下文快满」「感觉该收段」等理由停止或收段（2026-09-03 事故：
  自估 40% vs 用户实读 16%，~20 分钟即收段，吞吐损失过半）。上下文摘要=系统
  自动续窗机制，非停止信号——当前票做完提交后继续次票。
- **断点保护=每票独立提交**：任意时刻会话死掉损失≤当前未提交一票；夜间不留半
  门审提交（提交前该票门审完成或整体还原挂起）。
- **开场三态恢复（先于任何新开发）**：A 干净树+HEAD=交接书提交=直接接续 §2
  首项；B 脏树=票中断残留，verify 绿则按票面补完门审收口、红则速修或还原（未
  提交面无门审保护，还原安全；未跟踪新文件删除或移 scripts/audits/ 留档）；
  C HEAD 非交接书提交=查该提交门审在档与否，过=补更新交接书、未过=补审。
- **最新交接书=排程真相源**：`docs/prompts/` 下 vN 最高者（`ls docs/prompts |
  sort | tail -1` 取名），§2 首项=下一票；每票收口顺带滚动交接书（检查点=进度
  记录，非会话终点）；基线数字（verify 文件/用例数、locks、e2e 用例数）段间
  衔接须可解释，对不上禁提交。
- 闲时视觉决策零承担（遇即挂起）；e2e 非确定红立案线照旧（上方通则）；每会话
  首动作=技能清点（上方开工纪律）。

### 依赖与提交

- **禁止新增依赖**，确需新增 → 先 ADR + [dep-change] 尾注。运行时依赖预算 ≤15 个。
- `package.json`/lockfile 变更必须带 `[dep-change]` 尾注（CI 检查）。
- 受锁文件（tests/shared/migrations/CI/lint/构建/测试配置/脚本）变更必须带 `[locked-change]` 尾注。
- 受锁文件修改前先 `npm run locks:unlock` 解除只读，改完即时 `npm run locks:apply` 重锁并
  更新 manifest（新增受锁路径需先 `npm run locks:generate` 再 apply）。
- 触碰锁定文件的提交**即时** `locks:apply`（manifest 与该提交同步），禁止跨提交
  延迟重生成——CI 只查 push head，中间提交锁不同步会造成按提交回溯时的假绿。
- **自产 scripts/*.mjs/*.ps1 工具件写完即时 `locks:generate`+`apply`**：受锁集合
  经 check-locks 的 walk **自动覆盖 scripts 下全部 .mjs/.ps1**——文件一诞生即属
  受锁面，manifest 落后=下次 locks:check/verify 必红；禁延至收口补登
  （2026-09-02 四波场三现实录：两 gen 脚本连续落后于并行锁操作+门二 verify 拦截）。
- 每次 AI 改动一个逻辑单元一个 commit；提交前 `git diff --stat` 自查。
- staging 一律显式列文件（或先 `git status` 核对未跟踪面）——`git add -A <目录>`
  会扫入未跟踪残留（2026-08-26 scripts/audits 误扫实录）；提交后勿复打 log
  （工具已回显，超长 message 双倍上下文成本）。
- 中文一律 UTF-8；Windows 下写文件后验证可读。

### 明确不做（v1 负面清单——防止顺手实现）

知识图谱（指自动引文网络图可视化；人工策展的核心 idea 时间树不在此列——2026-08-25 E5 裁决，指针 ADR-0014）、翻译、PDF 下载管线（CARSI/CDP/Sci-Hub）、Scopus/WoS、插件系统、i18n 多语言、云同步、EPUB、多窗口（OS 级多 BrowserWindow；单窗口内多标签页不在此列——2026-08-23 用户裁决，指针 ROADMAP Phase 7+ B3）、遥测、后台自动网络任务（增强只手动触发）、Markdown 富文本编辑器（textarea 即可）。

## 环境事实

- Windows + Electron 42（42.9.3，2026-08-22 升级门执行，ABI 146）+ Node 24（**本地经
  Volta 项目锁定**——package.json `volta` 字段 pin 24.20.0 随仓库走，clone 后新 shell
  自动生效；CI ci.yml node-version=24 同口径。2026-09-02 起 D:\nodejs 被他应用自动升到
  25.2.1——volta default=25.2.1 镜像系统现状，shim 在 PATH 首位拦截故其他应用零影响、
  本项目拿 24。**volta 布局勘误（2026-09-02 六波场后同日复核，前「shim 失效」
  判断作废）**：volta=全机安装（`C:\Program Files\Volta\` 存 volta.exe+全套
  shim v2.0.2，System PATH 第 1 位即该目录、D:\nodejs 第 15 位——新 shell 恒
  shim 优先）；VOLTA_HOME=`%LOCALAPPDATA%\Volta` 只存镜像/状态，**其 bin 为空
  是本布局常态非损坏**；shim 链路亲验双点通过（项目内 v24.20.0/项目外
  v25.2.1，platform.json default=25.2.1 在位）。此前「shim 失效」系误诊=
  zcode 宿主 bash 环境缺 Volta PATH 条目（宿主会话态，非系统缺陷）——宿主内
  `node` 落 D:\nodejs=25.2.1。**会话绕行**=绝对路径 `/c/Program Files/Volta/
  npm.exe` 或 PATH 前缀该目录；**诊断纪律=判「环境损坏」前先查注册表 PATH+
  绝对路径探针，勿凭本会话 PATH 断系统态**（VOLTA_HOME\log 的 10060 错误日志
  =一次冗余 `volta install node@25.2.1` 网络失败，其目标态本已在位）。
  **Node 25 下 vitest 2.1.9 jsdom localStorage 装载破损**（split-pane 11
  用例结构性假红，node24 对照 11/11 绿实证）——check-quality 版本守卫已拦（非 24 即
  红；CI 豁免；跳过口 SYNAPSE_SKIP_NODE_GUARD=1=vitest 升级票验证场专用）。
  engines 仍 >=20，但 CI 用 20 会因 better-sqlite3 v12.11.1 缺 node-v115
  预编译而源码编译失败——首跑实证，勿改回）
- **升 Electron 前先查 prebuild 矩阵**（教训实证 2026-08-22）：Electron 43（ABI 148）
  在 better-sqlite3 12.11.1 上无 win32 预编译，而带 v148 的 12.11.2/12.12.0 只有
  GitHub release 未发 npm、v13.x 无任何 win 预编译——故落 42（v146 现成）。
  版本→ABI 映射数据源：npm 包 `node-abi`（registry.npmmirror.com 可下）
- **Electron 42 起 npm 包无 postinstall**（41 尚有、42 移除，实证）：二进制改为首次
  require 时同步懒下载（卡在意想不到的位置）——postinstall 已显式串 `install-electron`
  （幂等，dist 在则秒过），把下载失败暴露在 npm install 阶段；bin 由 electron 包提供
- 网络代理 127.0.0.1:7890；GitHub 直连不稳 → `.npmrc` 已配 npmmirror 二进制镜像
  （electron + better-sqlite3），`scripts/sqlite-abi.mjs` 下载 GitHub 优先、镜像兜底
- better-sqlite3 是 V8 直接绑定（随 Node/Electron ABI 变化，**不是** N-API 通用件）；
  双 ABI 由 `scripts/sqlite-abi.mjs` 管理（abi-cache 两份预编译，npm scripts 自动切换）
- 全部命令收敛：`npm run verify` / `npm run dev` / `npm run test:e2e`（需先 build）
- git 位置因设备而异（旧机曾用 `E:\class\智慧水务\tools\MinGit`——**新设备以
  docs/DEV-SETUP.md §3 配置为准**，路径占位符化 2026-08-27 设备迁移）；远端
  origin=github.com/yyx20040712/Synapse。MinGit 默认 schannel 经代理握手失败——
  须配 repo-local `http.sslBackend=openssl` + 自带 CA bundle（配置命令见
  DEV-SETUP §3；.git/config 不随 clone 走，新机必配）
- 行尾纪律：仓库根 `.gitattributes` 强制 LF（locks 的 sha256 以 LF 为准，勿删）
- git geometric-repack「File exists」rename 竞态为 Windows 文件锁族噪声（2026-09-02
  三现+`git gc --prune=now` 同报——gc 不自愈）；提交与仓库完整性无碍（fsck 亲验
  exit=0），忽略即可，勿因此重装或重建仓库
