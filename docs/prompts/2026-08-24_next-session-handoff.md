# 任务：链条核查前置 → v2 主线续推（P7-B 多标签 / P7-F 连续滚动 / P7-C 笔记结构化）

> 用法：本文件是新会话的完整任务书。开窗口粘贴一行即可：「按 docs/prompts/
> 2026-08-24_next-session-handoff.md 开工」。用户指令（2026-08-24）：
> **接手 AI 必须先检查架构和业务流程链条，核查通过后才继续开发。**

## 0. 开工前置（强制，不可跳过——上下文污染控制规程）

1. **分级阅读，只读清单内文件**：
   - 必读：`AGENTS.md`（重点节：「会话开工纪律」「状态与不变量纪律」「测试纪律」
     「依赖与提交」「工单工作流」）；本文件全文；`docs/ROADMAP.md`（标题行 +「当前基线」
     节 +「Phase 7+」节）。
   - 任务一选读：`docs/reports/2026-08-24_p7a-campaign.md` §2/§5（防线战绩与基础设施
     事故——核查时的已知地形）；`docs/architecture.md`（分层与安全面）；
     `scripts/check-tickets.mjs` 头注（规则编号体系的定义源——任务一第 5 点用）。
   - 任务二选读：`docs/reports/2026-08-23_v2-blueprint-b1.md`（P7-B/F/C 的价值/依赖/风险
     四栏与 B3 裁决记录）；**`docs/reports/2026-08-24_p7a-campaign.md` §4 战役级教训
     （P7-B/C 是重构雷区，其中 §4.1 子树重挂/§4.2 updater 双坑/§4.4 dispatch 包 act
     三条为开工前必读）**。
   - 任务三选读：`docs/invariants.md` + `scripts/check-quality.mjs` + `eslint.config.js`。
   - **禁止**：全库通读；重读历史报告全文（只读指定节）；把 Temp 目录审计 JSON 拉进上下文。
2. 按宪法执行技能清点（枚举+用/不用+理由，写入开工记录）并完成配置自查（确认无思考
   等级降级；子代理只派只读检索且结论须主会话对照源码核实）。
3. 全程纪律：受锁文件 locks:unlock→改→即时 locks:apply+[locked-change]；禁新增依赖
   （走 ADR+[dep-change]）；一逻辑单元一 commit；先红后绿（无红面者记录依据）；
   双门齐备才可提交（deepseek 一审 + GLM 二审，调用例见 §5）；机器事实终裁；
   卡住停下报告；不放宽任何检查。
4. 开工先跑 `npm run verify`（预期 exit 0，55 个测试文件 281 用例——口径=vitest 终行
   统计「Test Files/Tests」）+ `npm run test:e2e`（自带 build，预期 10/10；宪法命令收敛，
   不用裸 playwright CLI）。**若不是——停下报告，不要顺手修**（这正是任务一要捕捉的
   第一信号）。

## 1. 背景与当前基线（一段话，细节全在指针里）

v1 已交付并经三轮治理（2026-08-23 双战役 + 2026-08-24 P7-A 交互基建战役）。P7-A
四工单全部 done 并过 e2e 验收（提交 ec4ab42→fdd83e9；四工单=快捷键+滚轮缩放（含
翻页键位表）/ctrl+c 复制（含剪贴板写权限最小放行修复 permissionPolicy）/标注四选项
菜单/SplitPane 可拖拽分隔条）：当前：verify exit 0（281 用例）、e2e 10/10、工单 78/78 done、
锁 90 文件、INV-14 三面全锚。**本地领先 origin 11 提交未 push（push 决策属用户，
无明示不 push）**。工作树仅两个探针残留 `_esm_probe.mjs`/`_ptr_probe.mjs`（系统
句柄锁删不掉，不阻塞关卡，重启后删）与 `dist_new/` 安装包（2f57653 版，未含 P7-A）。

## 2. 三项任务（顺序强制：一 → 二 → 三穿插）

### 任务一（强制最先，只读核查）：架构与业务流程链条检查

产出：链条核查报告入 `docs/reports/2026-08-24_chain-audit.md`（file:line 级证据）。
任何断链/红 → 停下按双门修复单元处理，修完再继续任务二。核查面：

1. **机器基线**：verify + 全量 e2e 双绿（§0.4 已跑即证据）。
2. **分层单向**：ipc→services→repos→db 与 renderer→window.api→ipc 的方向由
   ESLint/quality 机器化——抽查 2-3 个文件佐证规则在位（如 reader 链四层各一眼）。
3. **业务主链走查**（file:line 级，一条龙到导出）：
   导入（file-store 受管存储）→ 库列表（library.store/FilterBar）→ 打开阅读
   （open-paper-bus→ReaderPage→PdfCanvas/TextLayer）→ 划选标注（SelectionLayer→
   annotation-anchor 锚定→annotations repo）→ 标注菜单（AnnotationMenu 四出口）→
   批注/笔记（AnnotationEditor / 库侧 NotesPanel 总评）→ 导出（export.service→
   markdown.report/BibTeX）。
4. **输入接缝四件**（INV-14 三面锚抽查）：keymap 注册态 / ReaderShortcuts 成对清理 /
   ctrl+滚轮 / SplitPane 拖拽会话——各读实现+对应锁定用例一遍。
5. **防线规则活性**：check-tickets.mjs 的三条新规则各构造一个临时违例样本走一遍
   （文件备份法还原，零残留）——防线自己也要被验证活着。规则定义源=该脚本头注与
   实现（受锁，只读）：跨文件引用已完成工单号（注释中的「规则 2」）/done 骨架残留
   （「规则 4b」）/v2 工单 b3 指针强制（「规则 6」）。
6. **安全面**：WINDOW_SECURITY_FLAGS / permissionPolicy（最小放行=仅
   clipboard-sanitized-write）/ CSP / shell-guard 四件各对一眼测试。

### 任务二：v2 主线续推（P7-B → P7-F → P7-C，逐单工单化→实现→双门）

- **站间停点**：每站收官（提交+verify/e2e 全绿）即天然断点；单会话上下文预算不足时
  在站边界停下，续作直接按本任务书重启（自包含设计）——**禁止压缩验证跨站续跑**。
- 每站先 `npm run ticket:new` 生成五层规约模板（=scripts/new-ticket.ps1 打印器；若
  不可用，按仓库任一 done SR2 工单文件头手写同构骨架）开 SR2 工单（文件头
  `// b3: P7-X` 指针——规则 6 强制），规约含**状态机前置表**（P7-B 的 tab 生命周期
  态空间+跨格序列必须先交 deepseek plan 门审计再实现——U2 五轮回炉教训）。
- **P7-B 多标签页+同步状态投影**：reader.store 单文献→per-tab 字典重构；tab 灰点=
  deriveSaveStatus 投影（α 双层=annotations.comment 与 notes 两写面——B3 裁决）；
  退出拦截走 main 侧 close preventDefault+新 IPC 通道（preload/window.api 分层）。
- **P7-F 连续滚动**：架构级四层（渲染管线/页回收/进度语义/锚定几何）；B4 过渡禁令
  的机制已就位；阈值与状态机先交审计。
- **P7-C 笔记结构化**：阅读器三栏并列（目录/缩略图/笔记——SplitPane 复用）；片段笔记=
  标注锚定（sortKey→createdAt 排序）；每篇 md 语料导出（DB 真相源+md 投影，
  front-matter+引文块+笔记，机器可读结构断言+golden）；库侧 NotesPanel 编辑面下线
  （方案切换=删除旧方案红线）。
- 每站验收含 e2e 断言（P7-A 先例：e2e 是集成缺陷唯一捕手）。

### 任务三（穿插）：C1 防线升级评估

INV-11 单源常量 / INV-07 renderer 路径字面量的 lint 化可行性 → 落 **ADR-0010**
（编号顺延；评估结论无论做不做都落 ADR，「不做」须量化依据，对齐 ADR-0008/0009
风格）；可行则实现（check-quality.mjs 受锁走 [locked-change]+违例样本先红）。

### 事件驱动（最高优先插队）

用户人工验收发现缺陷 → 双门修复单元（取证→态空间表→先红后绿→deepseek+GLM→提交）。
P7-A 随手验清单见战役报告 §6。

## 3. 执行批次

1. 开工前置（§0）→ 双基线绿。
2. 任务一链条核查（报告入库， docs 提交）。
3. 任务二 P7-B 工单化 → plan 门（状态机表）→ 实现 → 双门 → 提交。
4. P7-F → P7-C 同法逐站。
5. 任务三 C1 在等待审计/用户反馈的间隙穿插。
6. 收官：全量 verify+e2e；ROADMAP/登记册回写；报告入库；**push 前问询用户**。

## 4. 终止条件（预声明，沿用战役契约）

- NIT 级存档不回炉；同一单元 deepseek 回炉 ≤2 次仍不收敛 → 停下升级用户。
- 审计输入携带全部前轮裁决（简报累积制）；双门齐备才可提交；机器事实终裁；
  BLOCKING 被机器事实证伪时携核验事实重审一次。
- 发现测试/契约本身有问题 → 停下报告，走 [locked-change]。
- 「不做」是合法结论，但须 ADR+量化依据。
- **无用户明示不 push、不打安装包**（smoke:installer 只在用户要求时跑）。

## 5. 基础设施与历史教训（infra 就绪，直接复用）

- **双门**：deepseek 调用器 `scripts/deepseek_audit.py`（--mode diff|analysis|plan；
  key 运行时读 `C:\Users\<用户>\.zcode\v2\config.json`（即 ~/.zcode/v2/config.json），
  缺失→停下报告不得跳门；api.deepseek.com
  直连 900s；调用例：`python scripts/deepseek_audit.py --name <单元名> --diff-file
  <diff> --brief-file <简报> --mode diff`，产物落 scripts/audits/ 后 **移到 Temp** 保持
  仓库干净）。已知两态故障：SSL 重置（WinError 10054）→重试；完整 JSON 落 reasoning
  通道致脚本报「未找到 JSON」→从 .raw.txt salvage（先例：guard-rule4b/sr2 系列）。
  GLM 二审由执行主会话以结构化清单自审（代码四清单：变更面/态空间-用例/假阳性/兼容；
  plan 三清单：自包含/覆盖/停点硬度），记录写 `%TEMP%\synapse_workflow\audits\`。
- **简报纪律**：每个单元简报必须含技能清点+配置自查节（宪法；deepseek 曾以缺失判 WARN）。
- **2026-08-24 系统瞬时态**（约 20 分钟自愈）：esbuild 服务全链路崩溃+shell 复合命令
  自动后台化+rm 句柄锁。对策：esbuild 崩溃先移新文件对照再疑代码；shell 挂起改单命令
  +timeout 包装；`_esm_probe.mjs`/`_ptr_probe.mjs` 重启后删。
- **打包**：`npm run dist`；dist/ 句柄锁 EBUSY 时 `--config.directories.output=<新目录>`
  重定向（先例 dist_new/）；electron-builder CLI 真实路径
  `node_modules/electron-builder/cli.js`。
- **权限先例**：renderer 需要剪贴板写（复制功能）——permissionPolicy 最小放行清单
  模式（main-window.ts），新权限需求照此办理+安全测试断言收缩面。
- **TDD 纠正程序**：实现先于红证→备份实现→还原骨架→跑红→恢复（SR2-UIK-01 实录）。
- 版本口径：Electron 42.9.3 + Node 24（CI 勿改回 20）；行尾 LF 纪律（locks sha256 以 LF 为准）。
