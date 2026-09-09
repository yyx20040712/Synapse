# Synapse 文档群对齐指引（doc-align brief）· v1（2026-09-10 起草）

> **你（新会话）在 `E:/class/智慧水务/Synapse_remake` 开工。**
> 任务=按用户全局技能 **ai-dev-org** 的 references/08 文档治理件，对本仓
> 文档群做**颗粒度对齐**（08 §2 指针化四步的首次 Synapse 执行）。本件=
> 自包含指引：零考古开工，无需读任何对话历史。与本项目宪法（AGENTS.md）
> 冲突时以宪法为准。
> 起草方=主控会话（GLM5.3，2026-09-10）；用户裁决=「文档群对齐放在新
> 会话进行，当前会话仅制作指引文档」。

## 0. 红线（四条，先读）

1. **历史件禁改写**（08 §3）：`docs/prompts/` 全部交接书（v1~v54）、
   `docs/reports/` 战役报告、`AI辅助开发经验教训.md`、已并入 git 历史
   的任何文档与 commit message——一律原样；发现历史件有错=新增勘误件
   引用原 file:line，禁原地修改。
2. **决策不代行**：**除阶段 0 明列动作（0a~0d）外**，映射表呈报用户逐类
   裁决前禁动任何文档正文——§3 预盘点候选仅为主控建议，不构成裁决。
3. **不绕本仓管线**：每会话首动作=宪法技能清点；改动含 AGENTS.md/
   docs/ 的提交后须 `npm run verify` 全绿（退出码亲验落档）；纯文档面
   不应产生新 `scripts/**/*.mjs`（一旦产生=自动入受锁面，须即时
   locks:generate+apply+[locked-change]）；staging 显式列文件。
4. **供应商数字禁入 .md**（08 §1）：对齐中发现的套餐/额度/窗口数字
   （如「Kimi 5h 窗」）一律下沉 `.zcode/org-config.json`，正文改指针。

## 1. 背景（一段话）

ai-dev-org（loop-engineering 升级替代件）已于 2026-09-10 落地：本仓
AGENTS.md 已插 ORG-SEG 指针段、methodology §4.5 已有组织通用层指针——
但那是**入口对齐**；本任务做**正文颗粒度对齐**：按 08 §1 事实分层寻址
表盘点全文档群，把与技能 references 重复的通用原理段指针化，项目特有
事实留驻，使「通用真相源=技能、项目真相源=宪法/docs」落到实处。技能
实现面已全部经 Kimi+deepseek 双源审查（dispatcher v2.1.0/registry
v1.1.0/正文层闭证在档——scripts/audits/2026-09-10_skill-audit-*）。

## 2. 阶段

**阶段 0 预授权批（0a~0d 为红线 2 的明列例外）**
- a. 技能清点（宪法开工纪律）：`ai-dev-org` 标「用」；显式加载
  （/ai-dev-org），精读 references/08+05。
- b. 基线：`git status` 应干净（不净=先停报）；`git rev-parse HEAD`
  落档；跑 `node C:/Users/Administrator/.zcode/skills/ai-dev-org/scripts/check-constitution-budget.mjs AGENTS.md` 应 PASS。
- c. 建/更新 `.zcode/org-config.json` 项目覆盖件（本仓 gitignore 忽略
  .zcode/）：把「Kimi 额度 5h 窗」等供应商事实写入 ration_redlines 注记。
- d. `.zcode/org-delta.jsonl` 追加一行（日期+「doc-align 启动+基线锚」）。

**阶段 1 映射表起草 → 硬停点呈报**
盘点范围（开工日实扫为准）：`AGENTS.md`、`docs/methodology.md`（逐节）、
`README.md`（若有）、`docs/`（adr/invariants/design（若有）/DEV-SETUP/
ROADMAP（若有））、根目录其他 .md。逐件对照 08 §1 出映射表：
`件/节 | 态（承接/指针化/拆分/废弃/登记·历史归档/登记·配置） | 理由 |
预计动作`；§3 预盘点候选随表一并呈报。**硬停点：用户逐类裁决。**

**阶段 2 裁决后一次执行**
单一提交完成全部处置；宪法内被替换的数字行改指针；评估加装「指针化
对照」检查到 check-quality（受锁面=[locked-change]+locks 流程，若豁免
须呈报理由入 org-delta）；复跑 verify 全绿+预算自检 PASS+diff 零历史件。

**阶段 3（另窗）**：v1.0 冻结复盘（R1~R6 回归窗，见技能 06 §5 内联清单）。

## 3. 预盘点候选（主控预盘，非裁决——呈报时逐条核）

| # | 对象 | 与技能重叠面 | 候选态 | 建议 |
|---|---|---|---|---|
| ① | methodology §1 十二原理 | 技能 01（16+3 条双源合并版）为通用真相源 | **拆分** | §1 头部加指针注记「通用原理真相源=技能 references/01；本节为 Synapse 视角实证锚点档案」；正文保留（Synapse 锚点是项目史，不删） |
| ② | methodology §2 适用边界 | 技能 05 §3 同构 | 指针化注记 | 头部一行指针+差异注记 |
| ③ | methodology §4.1~4.3 模板三件 | 技能 02/07 通用模板 | **承接**（项目实例） | §4 头部已有运行手册定位；加一行「通用版=技能 02/07；本节为 Synapse 实例（含 ⑤a~⑤h 项目条款）」 |
| ④ | AGENTS.md 闲时段「Kimi 额度 5h 窗」数字 | 08 §1 供应商数字禁入 .md | 数字下沉 | 行改「额度窗口与换源纪律以 org-config 为准」（数字移 0c 覆盖件） |
| ⑤ | docs/adr、docs/invariants.md、DEV-SETUP、ROADMAP、tickets/ | 无重叠（项目真相源） | 承接 | 不动 |
| ⑥ | docs/prompts 旧交接书、docs/reports、AI辅助开发经验教训.md | 过程记录 | 登记·历史归档 | 原样，零改动 |

## 4. 必读清单（绝对路径，首序）

1. `E:/class/智慧水务/Synapse_remake/AGENTS.md`（宪法——技能清点/DoD/提交纪律）
2. `C:/Users/Administrator/.zcode/skills/ai-dev-org/SKILL.md`
3. `C:/Users/Administrator/.zcode/skills/ai-dev-org/references/08-doc-governance.md`（精读——操作手册）
4. `C:/Users/Administrator/.zcode/skills/ai-dev-org/references/05-porting-guide.md`
5. `E:/class/智慧水务/Synapse_remake/docs/methodology.md`（对齐主对象之一，全文）

## 5. DoD

映射表全量覆盖实扫闭集+用户裁决逐类在档+阶段 2 单一提交+`npm run verify`
exit=0 亲验落档（基线参照：1466 用例/156 文件/locks 288——docs 面改动
不应变动用例数）+预算自检 PASS+org-delta 追加行+`git diff` 零历史件
（docs/prompts v1~v54 与 docs/reports 逐件核对）。

## 6. 环境事实（2026-09-10 主控在档）

- 技能版本快照：dispatcher v2.1.0（退出码 3=配置/2=源尽/1=用法/4=本地
  IO；--mock-source 支持逗号多点）、registry v1.1.0（base:skill_root）、
  skill-gc v1.1（redirect 判据=status 字段或 description 退役词+字节阈，
  suspect/unknown 恒不自动删）、岗位编制=8+人类用户裁决位、tier 记法
  session:<描述>。
- 本指引排序位于 v54 交接书之前（doc<l），不影响「最新交接书=排程真相源」
  机制；对齐任务完成后本件即历史档。
- 本任务全程零外部模型派发（纯文档面）。

## 7. 主控补记（2026-09-10 优化战役后——事实性增量，未经双源复审）

技能已随「优化战役」（交接书=同目录 `2026-09-10_ai-dev-org-optimize-brief.md`，
证据=`scripts/audits/2026-09-10_w1~w5-*`）升 **v1.1 并冻结 v1.0**
（用户四项裁决在档=`scripts/audits/2026-09-10_w2-freeze-evidence.md` §四）。
对本任务执行的影响：

- **阶段 3 已被优化战役完成大半**：R1~R6 内化回归全过（regression.mjs
  自包含）+冻结证据包在档+冻结已裁——本任务阶段 3 收窄为「引用证据包
  复盘确认」，无需另跑回归窗。
- **阶段 1 盘点基准刷新**：技能 08 §1 寻址表已增「产品文档」行（v1.2）；
  references 新增 09（产品文档编制面）；02 新增 §10 烤验机关；SKILL.md
  增烤验触发表/团队化边界段/修订记节。逐件对照时以**当前技能件**为准
  （技能仓库 git 10+ 提交链可查）。
- **版本快照刷新（替代 §6 旧快照）**：dispatcher v2.1.0（同前）+
  新增 scripts：init-defenses.mjs（防线日脚手架，本仓已有防线体系
  不需要）/regression.mjs（回归）/health-scan.mjs（收口健康扫描，
  本仓收口可选用）；templates/ 11 件（新项目用，本仓不适用）；
  RESIDUALS.md 残留登记册；.gitattributes 全仓 LF。
- **02 §8.6 新增第 0 步「社区实践调研前置」**（用户 Ruling 2026-09-10）：
  较大模块技术路线选择，主控先调研社区实践作 Kimi 拟定参考——对
  本任务无操作影响（纯文档面），知悉即可。
