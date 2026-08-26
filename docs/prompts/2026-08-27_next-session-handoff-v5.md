# 任务：P7-G 第二批工单化（AI-06~10）→ 预算内首单 AI-06 → 站间停点

> **⚠️ 闲时连续开发线已开**（2026-08-27 用户裁决）：无人值守会话按
> `docs/prompts/` 编号最大的 idle-handoff-v\*.md 开工（人工卡点已预裁决
> 固化在该系列 §1）；**人工会话开工前先核对 idle 系列是否已推进——若其
> 编号更新（含实况）则以 idle 版为最新基线**，本文任务序列相应后移。

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff-v5.md 开工」。
> 前任会话（2026-08-27 第四段）：**应用面第一批全役收官**（AI-04 5310975
> +AI-05 9fea57e+收官报告 f622281；e2e 首跑抓出 AI-03 两处真缺陷并修复
> ——fileRefById 基名解析/deferOutcome 串行死锁时序入 INV-18 补条）。
> 本文取代 v4（其任务一 AI-04/任务二 AI-05 均已完成）。

## 0. 开工前置（强制，不可跳过）

1. **分级阅读**：
   - 必读：`AGENTS.md` 重点节；本文件；`docs/ROADMAP.md` P7-G 节（含
     2026-08-27 收官注记+第四轮增容节——**AI-06~10 的规约来源**）；`docs/
     invariants.md`（25 条——批二将锚定 INV-19/20/21）；`docs/adr/0015-ai-
     ingest-and-sidecar-protocol.md`（批二全部裁决母本）。
   - 任务首站选读：`docs/reports/2026-08-27_ai-campaign.md`（批一全役
     报告——§2 接缝设计+§6 教训是批二的直接前置）；`tools/ai-sensor/`
     全目录（批二消费的工具侧现状——SKILL.md/queue.mjs/prompts/）；
     ai_notes.repo+ai-note.ts（07 回灌导入器的数据面契约——question 枚举
     七问+divergence 冻结）。
2. 技能清点+配置自查（简报必含）。
3. 全程纪律同前（unlock→全改完→统一 apply+[locked-change]；先红后绿；
   双门齐备；verify 重定向真退出码+**verify 单飞**）。
4. 开工先跑 `npm run verify`（预期 exit 0，**71 文件 432 用例**）+ e2e
   13/13（需先 build——verify 末步即 build）。
5. **摩擦常量（v4 十条全数有效，另加本段实录七条，合并去重后有效集）**：
   ⑨python replace 无 count 全量替换 ⑩长内容禁 heredoc 用 Write/测试
   import 深度按目录层级（tests/unit/X=三级——**本段再实录**）⑧Windows
   rm 挂死 PowerShell 兜底（**本段再实录两次+新增变体：不可见句柄独占
   （杀软/索引器特征）rename 亦不可——残留登记勿硬刚，重启后清**）。
   新增：⑪**pipe 吞退出码**（`cmd | head; echo $?` 取的是 head 的——
   退出码断言直跑或重定向）⑫**提交回显乱码≠存储乱码**（Git Bash GBK
   回显 UTF-8 的显示侧假象——核本体用 `git log --format=%s > 文件`
   +python UTF-8 读）⑬**纯 JS 文件禁 TS 断言语法**（`as` 在 .mjs 是
   SyntaxError——import 探针即拦）⑭**npx vitest 直跑陷阱**（绕过
   `npm run test` 就绕过 `sqlite-abi use node` 前置——NODE_MODULE_VERSION
   错是绑定问题非代码问题，跑完切回 electron 勿忘）⑮**e2e 调试法**
   （临时 _debug spec：console 捕获+状态轮询打印→定位→删——比盲改快
   一个数量级）。

## 1. 背景与当前基线

批一终态（2026-08-27 第四段收官）：**verify 71 文件 432 用例 exit 0、
e2e 13/13、locks 110、工单 94 open 0（全役 ✅）、INV 25 条**（批一锚定
16/17/18/25+扩面 14；**19/20/21 批二锚定**）。审计存档已入库
（scripts/audits/ 37 份，2ccebfb）。战役报告=docs/reports/
2026-08-27_ai-campaign.md。残留：dist_new/ 仅剩单个 7MB app.asar 被
不可见句柄独占（重启后手删，勿硬刚）。

**留用户三件（战役报告 §4 手动视检，未验收前视为待办）**：①设置页
「AI 语料导出」真实目录→进度→toast 全流程视检 ②五件套产物文件管理器
观感 ③zcode 会话按 tools/ai-sensor/SKILL.md 走激活自检。

## 2. 任务序列

### 任务一：SR2-AI-06~10 工单化（五张票面过双门 plan 门）
- 规约来源（全部已裁决，工单化=翻译成五层规约票面）：ADR-0015+
  ROADMAP P7-G 第四轮增容节+蓝图 §4.3。1516a97（批一工单化）同型
  流程：new-ticket.ps1 生成骨架→五层规约填齐→双门 plan 审（净增量
  diff 策略——未跟踪文件 add -N 先行）。
- 增容节要点速记（票面母本）：**06** 伴随进程文件协议（pending job/
  status+心跳/产物 corpus-ai——应用零 LLM 出网保持，E1=B'）/ **07**
  回灌导入器（ai-notes/import+list 通道 [locked-change]，幂等，工具
  永不写 DB——「v1 无生产者」声明就此解除）/ **08** 笔记面板 AI 面
  （[ai:*] 分节+七问分色+只读+「AI 正在读」状态行+「AI 读文献」按钮=
  写 job）/ **09** AI 标注渲染对等（重锚入标注层同管线/存储独立/v1
  只读/三层防线验收条款——INV-19/20 锚定）/ **10** 设置页 zcode 联动
  （发现+一键装技能+心跳三档，**不代启会话**——INV-21 锚定）。
  依赖：06→07→08∥09；10 依赖 06。
- **状态机前置纪律**：06 的 job 状态机（pending→running→done/failed+
  心跳超时态）与 08 的「AI 正在读」状态行都必须先交态空间+跨格序列
  表过 plan 门（宪法硬规则——批一 AI-03 会话状态机同型）。
- 注意 ai_notes.question 枚举已含 divergence 节（ai-note.ts:20——
  AI-01 交付），07 回灌载荷直接消费不扩枚举。

### 任务二：SR2-AI-06 实现（预算内）
票面随任务一定稿即实现要点自明；首单含跨进程文件协议（应用侧写
job 文件+轮询 status），IPC 面=新通道 [locked-change]+locks:generate。

### 站间停点：工单化+首单为一会话（含 e2e/协议面较大）。

### 事件驱动：用户人工验收缺陷 → 双门修复。

## 3. 执行批次

1. §0 前置+双基线绿。
2. AI-06~10 工单化（双门 plan）→ AI-06 实现（TDD+双门+提交）。
3. 收官：ROADMAP 回写+批二战役报告（若五单全完）或站间停点交接书
   v6（若只到首单——一单一会话纪律下大概率此形态）。
4. push 前问询用户（除非明示）。

## 4. 终止条件（沿用战役契约）

- 回炉 ≤2 升级用户；BLOCKING 携机器事实证伪重审一次；测试/契约
  问题→停下 [locked-change]；60% 上下文预告单边界停。

## 5. 基础设施

- 双门审计器：两独立子代理实例（门一对抗深审→处置→门二终审四清单
  ——批一 AI-04/05 实证形态），存档 scripts/audits/（**已入库**——
  新存档直接 commit）。
- 版本口径：Electron 42.9.3+Node 24；`npm run test`（勿裸 npx vitest
  ——摩擦常量⑭）。

## 6. 关键指针

| 对象 | 位置 |
| --- | --- |
| 批二规约母本 | ADR-0015 + ROADMAP P7-G 增容节 + 蓝图 §4.3 |
| 工单化流程先例 | 1516a97（批一五票面 plan 门实录） |
| 批一战役报告 | docs/reports/2026-08-27_ai-campaign.md |
| 工具侧现状 | tools/ai-sensor/（SKILL.md+queue.mjs+prompts/） |
| 07 回灌数据面 | src/main/db/repos/ai_notes.repo.ts + src/shared/models/ai-note.ts |
| INV 待锚定 | 19/20（随 AI-09）/21（随 AI-10）——登记册状态列 |
| 遗留主线位 | P7-F 连续滚动（未工单化——F-aware 接口已冻结：anchor-locate 签名+annotation-order 文档序；与批二零依赖可穿插） |
| 后段战役 | P7-H 脉络图（依赖批二+C N1）/P7-D 玻璃质感/P7-E 预留清扫 12 处 |
