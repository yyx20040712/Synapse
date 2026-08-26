# 闲时会话开工卡 v2（取代 v1）

> **用法**（Zcode 自动化闲时任务 prompt 框的一行，不变）：
> 「在 docs/prompts/ 找编号最大的 idle-handoff-v\*.md，按其开工」。
> 本文=v2，由 v1 首会话（2026-08-27 闲时，SR2-AI-06~10 工单化单元）终局自写
> （v1 §6 强制）。**§0~§5 为本会话实况与下一会话任务书；上一版（v1）的
> §0 身份规则/§1 预裁决表/§3 环境纪律/§4 双门纪律/§5 终止条件全数沿用
> （效力不变，本文不重复——冲突时以 AGENTS.md > idle 系列最新版为准）**。
> 人工会话注意：idle 系列本版为最新基线（含批二工单化实况）。

## 0. 实况（本会话做了什么——证据指针化）

**单元**：SR2-AI-06~10 五票面工单化（v1 §7 任务，未做 AI-06 实现——按卡执行）。

**交付**（提交哈希见 git log 本文档前一条 feat(tickets) 提交）：
- 五张五层规约票面（stub 形态，多文件交付面以头注清单为准）：
  `src/main/services/ai_sensor/ai-sensor.service.ts`（06 伴随进程文件协议——
  应用可观测 job 态表+跨格序列①~⑤+**failed 态消解声明**：ADR-0015 §1 字面
  「产物落→移除 job」=移除以产物落盘为前提协议不变量，失败→job 保留→观测
  坍缩 pending+state 自述呈现）/`ai-notes-import.service.ts`（07 回灌导入器
  ——幂等=archive 账本 sha 去重+清面重灌，前提两机器事实登记）/
  `src/renderer/features/reader/AiNotesSection.tsx`（08 笔记面板 AI 面——六态
  状态行机+按钮行常驻+ai-note-style/ai-notes.store 两交付物）/
  `AiAnnotationLayer.tsx`（09 渲染对等——verifyQuote 同几何管线+anchor-locate
  exact 层延展 data-ai-note-id+INV-19 锚定面）/
  `src/renderer/features/settings/ZcodeLinkSection.tsx`（10 zcode 联动——五态
  检测+一键装技能+INV-21 不代启）。
- `tickets/registry.ts` 五条 open（94→99 工单，open 0→5）；执行序定级
  **06→07→08→09→10 串行**（08∥09 经 plan 门细化为定序——09 硬依赖 08 两
  交付物，registry 注释+两票头注三处一致）。
- 双门存档：`scripts/audits/ai-batch2-ticketing.audit.raw.txt`（门一 B3/W9/N6
  18 条全处置无「不采」）+`ai-batch2-ticketing-glm.md`（门二四清单：首轮 FAIL
  =6 文本残留点→返工→复核**终评 PASS**；N-复1 留 AI-10 实现注意）。
- `docs/ROADMAP.md` P7-G 增容节后追加「第二批工单化完成」注记。

**关键决策与先例出处**（逐项）：
1. corpus-ai/archive 落协议根 userData/ai-sensor/——机器事实推导（07 导入须
   不感知用户导出目录；唯一裁决在案 app 可知目录=ADR-0015 §1 协议根）。门一
   专项裁决①通过。
2. companion.mjs 双目录 CLI（`<语料目录> <协议目录>`）——ADR 未规定发现机制，
   依 queue.mjs 单目录 CLI 先例延展为最小发明；门一专项裁决②「原则通过附条件」
   →W06-3 整合形态声明（queue 之上会话壳）已落地票面。
3. 10 撤协议目录路径展示（门一 B10-1 采纳）——renderer 绝对路径展示零先例+
   AGENTS 安全禁令字面「路径只能来自 main 侧系统对话框」不放宽；发现机制改归
   06 SKILL.md 平台惯例路径文档（%APPDATA%/<应用名>/ai-sensor 等）。
4. 06 failed 态消解（门一 B06-1 采纳，门二清单②背书）——v5:75「done/failed」
   为速记，母本正典=ADR-0015；消解声明全文入 06 票面。
5. ai-note-style+ai-notes.store 归 08 交付、09 消费（v5 §2 速记「七问分色」
   在 08 范围行+ADR §3「同族新模块」未指派——工程归位并定序）。
6. SKILL.md「corpus-ai/<paperId>/ 分角色 md」示例 vs ADR-0015 §1「corpus-ai/
   <paperId>.json 行式锚定段数组」接缝——以 ADR 为准，SKILL.md 随 06 实现更新
   （06 票面接缝声明段）。

**验证证据**：基线 verify 71 文件 432 用例 exit 0（=v5 §1 预期）；骨架态与
终态 verify 共四跑（**首跑红**=registry 插条漏逗号被 eslint 拦——修复后三跑
绿，见 §5 摩擦⑰）；check-tickets 99 工单/5 open 绿；locks:check 110 绿
（**本单元零受锁触碰**——registry/五 stub/审计档均非受锁路径）；e2e 未跑
（票化单元无 e2e 面，卡 §1 条件②不适用）；终局三查：ABI=electron v146+
locks 110+树净（仅登记残留 dist_new/）。
**push 实况**：§1 条件授权五项全满足后执行 push——TLS connect error
（代理 127.0.0.1:7890 闲时窗口大概率未运行），按「网络失败=记录后停不重试」
本地停：**f7876fa（工单主体）+本文所在提交两笔在本地待推**（本文经 amend，
哈希以 `git log -2` 现查为准——禁引本文自身哈希，自引用陷阱），下一会话
开工自检通过后直接 `git push origin main`（或用户人工推）。

**技能清点**（宪法开工纪律，随产物存档）：用=verification-before-completion
（终局三查+证据纪律）/subagent-driven-development（取其则：上下文隔离+不信任
子代理报告须亲自核对机器事实；worktree/ledger 模板与仓库双门先例冲突处以仓库
为准）/writing-plans（取其则：无占位符+自审三查）；不用=TDD/systematic-debugging
（纯票化无实现/调试面）、browser/e2e 类（无 e2e 执行面）、git-workflows/
worktrees（宪法 git 纪律完全约束）、brainstorming（设计已裁决照译）、其余
~70 项与本单元无任务相关面。**配置自查**：主会话 GLM-5.3 高思考等级；双门
子代理经 Agent 工具派发默认同级同模型（无降级配置动作——卡 §0.5 实况记录）。

## 0.5 摩擦常量（v5 十五条全数有效+本会话新增两条=十七条有效集）

新增：⑯**后台任务通知的 exit 0 不可信**（run_in_background 包装命令尾带
`tail`/`echo` 时通知的退出码是尾命令的——真退出码必须 `echo "exit=$?" >> 日志`
落盘核对；本会话两次实证，⑪pipe 吞退出码的后台变体）⑰**registry 插条漏
逗号 check-tickets 不拦**（其解析=正则切块不查语法，绿≠编译通过——票化后
必须全量 verify，eslint/tsc 才是语法关卡；本会话首跑实证）。

## 1. 基线（下一会话开工预期数字）

- `npm run verify`：**71 文件 432 用例 exit 0**（五 stub 无测试面——AI-06
  实现将新增受锁测试文件后用例数上调，预期红证先行）；
- e2e：13/13（build 后跑；AI-08/10 实现新增 spec 后上调）；
- locks：**110**（AI-06 实现触碰 schemas/api-surface+新测试=locks:generate
  增数+[locked-change]）；
- 工单：**99 总/open 5**（SR2-AI-06~10 全 open strong）；
- INV：25 条（19/21 未锚定待随 09/10；20 消费方级待随 08）。

## 2. 下一步（基于实际进度的任务指针）

- **首单=SR2-AI-06 实现**（票面已就位：状态机表+跨格序列+failed 消解不变量+
  双目录 CLI+companion 整合形态全入头注；一个逻辑单元=一张实现单一会话——
  卡 §1 预裁决「每会话节奏」条款）。要点：IPC 两通道 [locked-change]（ai-sensor/
  request-read+status——schemas+api-surface 受锁先 `npm run locks:unlock`）；
  新测试文件 tests/unit/services/ai-sensor.service.test.ts [受锁新增]
  locks:generate；companion.mjs+SKILL.md 工具面；e2e 无（06 单无 e2e 面，
  UI 面随 08）。
- 执行序（registry 注释同源）：06→07→08→09→10 串行领取逐单提交。
- AI-10 实现注意项（门二 N-复1 留档）：测试段补 error 态渲染+重试用例+
  service 单测点名 status.json 损坏路径（票面 :66 措辞「四态渲染」实现时
  顺改五态）。
- 批二全部完成后：ROADMAP 回写收官+批二战役报告（docs/reports/ 同型）。
- 母本指针：ADR-0015+ROADMAP P7-G 增容节+新注记+蓝图 §4.3+五票面本体。

## 3. 终止原因与待裁决（本会话无终止——完成形态；待裁决留用户）

本会话按卡 §7 完成工单化单元，未触发 §5 终止。**待裁决（用户回来逐条勾选，
均为一句话是非题）**：
1. 预裁决表（v1 §1 七条）是否批准升格 ADR？□是 □修订（v1 §1 尾注原诺）。
2. companion 双目录 CLI 发现机制是否接受？□接受（门一附条件通过形态）
   □否——改为单目录+应用侧指针文件（需另裁协议增文件）。
3. 两个可调常量值是否认可：HEARTBEAT_FRESH_MS=10min（06）/STATUS_POLL_MS
   =5s（08/10 各持域私有）？□认可 □改值（实现会话 tunable，票面已标）。
4. 批一遗留用户视检三件（v5 §1：①导出全流程视检②五件套观感③zcode 激活
   自检）完成否？完成后批二 AI-06 首单的 pending→reading 联动可一并视检。

## 4. 用户新增视检项

本单元纯票面无 UI——**无新增**。延续 v5 §1 三件+上节待裁决 4（批二实现后
联动视检随战役报告另计）。

## 5. 摩擦常量新增

见 §0.5（⑯⑰两条已合并入有效集）。
