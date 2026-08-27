# 任务：P7-G 第二批续推（SR2-AI-07 起·三屋模式默认）→ 批二收官

> **⚠️ 闲时连续开发线仍在**：idle 会话按编号最大 idle-handoff 开工；人工会话
> 以 idle 版与本文孰新为准（写作时 idle=v2——其 §2 已追记 AI-06 完成、§3
> 八条裁决已标记收口）。本文取代 v7。

> 用法：新会话粘贴「按 docs/prompts/2026-08-27_next-session-handoff-v8.md 开工」。
> 前任=v6 会话（三屋试点 SR2-AI-06 c2bfc4f+八条待裁决全数裁定并成文化：
> **ADR-0016 预裁决表升格 / ADR-0017 三屋模式推广为默认** / AGENTS 工单工作流
> 增补 / methodology §4 派发模板三件）。

## 0. 开工前置（强制）

1. **第一动作=核对/执行 push**（`git log origin/main..HEAD` 现查——若前任
   已推净则跳过）。
2. 分级阅读：AGENTS.md 重点节（**含新「工单工作流（三屋模式默认+弱模型领单）」
   节**）；本文；ADR-0016+**ADR-0017**（三屋职权/DoD 补强/成本账本）；docs/
   methodology.md **§4 三件派发模板**（复制改空即用）；idle-handoff-v2 §0.5
   （摩擦 17 条）；ROADMAP P7-G 节；**下一单票面**（07=
   src/main/services/ai_sensor/ai-notes-import.service.ts 头注）；试点档案
   scripts/audits/ai06-impl.*（07 简报的先例池）。
3. 技能清点+配置自查；实现者/门一/门二子代理与主控同级配置。
4. 开工自检：verify **73 文件 452 用例** exit 0；e2e 13/13；locks:check
   **112**；check-tickets 99 工单/**open 4**；并发检测。
5. 会话节奏：多单元连续（60% 边界+终止条件内）；逐单提交不变。

## 1. 基线（2026-08-27 八条裁决成文化后）

verify 73 文件 452 用例/e2e 13/13/locks 112/工单 99 open 4（07/08/09/10）/
INV 26 条（INV-26 已随 06 锚定+用户追认）。八条裁决原文与出处：ADR-0016
（第 1 条）/ADR-0015 追认行（第 2/3 条）/ADR-0017（第 5/6/7 条+后果节）/
INV-26 登记册（第 8 条追认）——**待裁决队列当前为空**。

## 2. 任务序列（三屋模式默认——ADR-0017）

1. **SR2-AI-07 回灌导入器**（三屋：按 methodology §4.1 简报模板派发）。
   本单含**前置步=域迁移**（票面接口层已注明）：新立 ai_sensor 域
   （[locked-change] 扩 tests/contracts/api-surface.test.ts 九域穷举——契约
   扩展非放宽）+迁移 06 两通道自 export_ 域（api-surface 两行+ipc 委托行
   换文件+契约测试一行——消费者未建=最后便宜窗口）；主控简报须含此步与
   unlock→批内改→generate→apply 流程。其余要点：archive 账本幂等（前提
   两机器事实在票面）；repo 头注「v1 无生产者」声明行随单修订；markDone
   outputs=信息态路径基不约定（queue.mjs:19-20 已收口）。
2. 08→09→10 依号序三屋（09 硬依赖 08 两交付物；10 注意=门二 N-复1 error 态
   用例+status.json 损坏路径单测+writeStatusProtocol 失败面幂等自愈声明
   补进 08 简报）；AI-08 接线注意调用面=**新 ai_sensor 域**（迁移后）。
3. 每单元成本账本行强制（ADR-0017 裁决 5）；双门照常存档 scripts/audits/。
4. 收官：五单 done → ROADMAP 回写+批二战役报告（§4 试点数据并入+各单
   账本汇总）。
5. 事件驱动：用户验收缺陷→双门修复。

## 3. 用户视检项（累计挂账）

- 批一①设置页导出全流程视检、②五件套观感——**挂账**；
- ③zcode 激活自检——**并入 08 联动验**（届时与 06 pending→reading→done
  状态行一起走，一次覆盖两单）。

## 4. 成本账本（ADR-0017 裁决 5——逐单续记）

| 单元 | 实现者 | 门一（含复核） | 门二 | 合计 |
| --- | --- | --- | --- | --- |
| AI-06（试点） | 9.96M tok/30.2min | 1.49M/7.7min | 1.07M/3.6min | **≈12.53M tok/41.5min** |
| AI-07 | （随单填） | | | |

## 5. 基础设施

- 三屋模板三件=docs/methodology.md §4（勿即兴改结构——模板偏差=回炉主源）；
  宪法入口=AGENTS 工单工作流节；职权三分法=ADR-0017 裁决 2。
- 版本口径/Windows 摩擦/verify 单飞/e2e 隔离：同 v6 §5 不变。

## 6. 关键指针

| 对象 | 位置 |
| --- | --- |
| 三屋模式全套 | ADR-0017+AGENTS 工单工作流节+methodology §4 |
| 闲时规则 | ADR-0016（升格）+idle-handoff-v2（操作载体） |
| 07 票面（含域迁移注） | src/main/services/ai_sensor/ai-notes-import.service.ts 头注 |
| 07 数据面 | ai_notes.repo.ts+shared/models/ai-note.ts+迁移 003 |
| 试点全链档案 | scripts/audits/ai06-impl.{report.md,audit.raw.txt,glm.md}+ai06-*.log |
| 08/09 消费面 | anchor-locate.ts/annotation-anchor.ts/ReaderNotesPanel C-03 预留位 |
| 批一战报同型 | docs/reports/2026-08-27_ai-campaign.md |
