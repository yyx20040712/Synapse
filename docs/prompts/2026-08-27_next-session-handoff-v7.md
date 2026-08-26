# 任务：P7-G 第二批续推（SR2-AI-07 起）+ 三屋模式推广裁决

> **⚠️ 闲时连续开发线仍在**：idle 会话按 `docs/prompts/` 编号最大 idle-handoff
> 开工；人工会话以 idle 版与本文孰新为准（写作时 idle=v2，其 §2 已追记
> AI-06 完成实况）。本文取代 v6。

> 用法：新会话粘贴「按 docs/prompts/2026-08-27_next-session-handoff-v7.md 开工」。
> 前任：v6 会话=**三屋模式试点单元**（SR2-AI-06 全链：主控派发→实现者子代理
> TDD→双门孙代理→回炉 1→门二 PASS→主控收口 c2bfc4f）。试点数据见 §4，
> 模式推广待用户裁决（§3-5）。

## 0. 开工前置（强制）

1. **第一动作=核对/执行 push**：本地待推=c2bfc4f（AI-06 主体）+本文档提交
   （`git log origin/main..HEAD` 现查）；网络通则推，不通记录后继续。
2. 分级阅读：AGENTS 重点节；本文；idle-handoff-v2（§0.5 摩擦 17 条）；ROADMAP
   P7-G 节（含 AI-06 ✅ 注记）；ADR-0015；**下一单票面本体**（07=
   src/main/services/ai_sensor/ai-notes-import.service.ts 头注五层规约）；
   scripts/audits/ai06-impl.report.md（§6 自裁申报——07 的先例池）。
3. 技能清点+配置自查；双门/实现者子代理与主控同级配置。
4. 开工自检：verify **73 文件 452 用例** exit 0；e2e 13/13；locks:check
   **112**；check-tickets 99 工单/**open 4**；并发检测。
5. 会话节奏：多单元连续允许（60% 边界+终止条件内）；工单逐单提交纪律不变。

## 1. 基线（2026-08-27 试点后）

verify 73 文件 452 用例/e2e 13/13（AI-06 无 e2e 面，specs 零改动）/locks
112（+两新测试）/工单 99 open 4（07/08/09/10）/**INV 26 条**（INV-26 新入：
移除 job 以产物落盘为前提/判活单源/协议原子写——实现者代登记，待用户过目）。

## 2. 任务序列

1. **SR2-AI-07 回灌导入器**（票面=任务书；执行模式=三屋或旧模式——随 §3-5
   用户裁决定，未裁决前默认旧模式保守）。要点：ai-notes/import+list 通道
   **[locked-change]**（域归属先看 §3-6 预裁决）；archive 账本幂等（前提两
   机器事实在票面）；ai_notes.repo.ts 头注「v1 无生产者」声明行随单修订；
   markDone outputs 语义=信息态路径基不约定（queue.mjs:19-20 注释已收口）。
2. 08→09→10 依号序（09 硬依赖 08 两交付物；10 注意=N-复1 error 态用例+
   status.json 损坏路径单测+§7.4 类比：writeStatusProtocol 失败面幂等自愈
   声明补进 08 交接）。
3. 每单双门照常；收官=ROADMAP 回写+批二战役报告（含 §4 试点数据并入）。
4. AI-08 消费面就绪确认：window.api.**export_**.requestAiRead/aiStatus
   （自裁#1 副作用——06 已定型，08 按此接线）。

## 3. 待裁决（用户在场——逐条勾选）

1. 闲时预裁决表七条升格 ADR？□是 □修订
2. companion 双目录 CLI 接受？□接受 □否（改单目录+指针文件需另裁）
3. HEARTBEAT_FRESH_MS=10min/STATUS_POLL_MS=5s 认可？□认可 □改值
4. 批一视检三件完成否？□完成 □未
5. **三屋模式推广为默认运行模式？**□推广（试点 PASS+§4 数据+门二三行评估）
   □暂缓（继续旧模式）□修订后推广（见 §4 缺陷清单）
6. **AI-07 IPC 域归属口径**（06 先例=新通道挂既有域避免改受锁契约测试穷举）：
   □循先例（import 通道挂 import_ 域或 export_ 域，开单时按受锁面最小定）
   □新立 ai_sensor 域（需 [locked-change] 改契约测试 9 域穷举——更干净的
   域语义，一次性付清）
7. **新测试 always-active 模式**（06 试点=不经 guardedDescribe，K3 威胁模型
   在三屋下结构性缺位）：□认可为三屋标准 □恢复 guard 包裹（翻状态后包裹）
8. INV-26 登记册文本过目认可？□认可 □修订

## 4. 试点数据（成本账本首录——度量短板补齐第一步）

| 项 | 值 |
| --- | --- |
| 实现者子代理 | 两轮共 9,960,782 tok/112 工具调用/约 30.2 分钟（轮 1 实现 6.40M/21 分钟+轮 2 回炉 3.56M/9.2 分钟） |
| 门一（含复核） | 1,490,926 tok/约 7.7 分钟 |
| 门二 | 1,074,547 tok/约 3.6 分钟 |
| 子代理合计 | **约 12.53M tokens/约 41.5 分钟** |
| 主控上下文消耗 | 轻量（派发简报+回执+裁决——未读实现全文，吃报告不吃产物） |
| 质量面 | 门一 0B/3W/13N；回炉 1 轮；13 自裁=12 真+1 漏报（synthesize 删减——被门一拦截后回滚）；变异红证补强后 TDD 四档齐 |
| vs AI-05（旧模式） | 旧模式无 token 账（本账本即补此洞）；可比值：门审密度相当（AI-05 门一 0B+1W+4N vs 06 门一 0B/3W）、回炉轮次相当（各 1）；不可比值留待 07 同模式对照 |
| 模式缺陷清单（推广前修） | ①断言级变异红证应直接入实现者 DoD（省一轮回炉——门二建议）②自裁申报增「删减面 diff 级自查」项③实现者首轮 6.4M tok 偏重——简报可再收窄（先例池文件清单化） |

门二试点三行评估（档=scripts/audits/ai06-impl-glm.md §⑤）：实现者报告诚实度高；
自裁申报制度有效（两项结构性预裁被独立证实）；主控-审计分工无漏面。

## 5. 基础设施（同 v6）+ 三屋模式件

- 若 §3-5 裁决推广：派发模板三件（实现者简报/门一指令/门二指令）从本会话
  实战稿固化为 docs/methodology.md 增节（§6 成文化步骤）；宪法「工单工作流」
  节增补三层条款（§6 步骤 3，需用户裁）。
- 版本口径/Windows 摩擦/verify 单飞/e2e 隔离：同 v6 §5 不变。

## 6. 关键指针

| 对象 | 位置 |
| --- | --- |
| AI-06 全链档案 | 报告 scripts/audits/ai06-impl.report.md+门一 ai06-impl.audit.raw.txt+门二 ai06-impl-glm.md+证据 ai06-{red,green,mutation,verify}.log（gitignore 本地） |
| 07 票面 | src/main/services/ai_sensor/ai-notes-import.service.ts 头注 |
| 07 数据面 | ai_notes.repo.ts+shared/models/ai-note.ts+迁移 003 |
| 08/09 消费面 | anchor-locate.ts/annotation-anchor.ts(annotation-style 同族)/ReaderNotesPanel C-03 预留位/**window.api.export_.requestAiRead** |
| INV-26 | docs/invariants.md（实现者代登记——§3-8 用户过目） |
| 闲时线 | idle-handoff-v2（§2 已追记防重锁行） |
| 批一战报同型 | docs/reports/2026-08-27_ai-campaign.md |
