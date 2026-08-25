# 任务：现状复核（重点=新功能面）→ P7-C 工单化（含 N1）→ AI-01~05 续推

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-26_next-session-handoff.md 开工」。
> 前任会话（2026-08-25 全天，五段连续）：AI 模块规划定稿链四役（计划审查 v1.1/
> 重述核实/第四轮 E 裁决落档/骨架细化）+ **P7-B 全役收官**（TABS-04/UNDO-01/
> e2e 三序列）。本文取代 2026-08-25_next-session-handoff.md（其任务一/二已完成）。

## 0. 开工前置（强制，不可跳过——上下文污染控制规程）

1. **分级阅读，只读清单内文件/节**：
   - 必读：`AGENTS.md`（重点节同前：开工纪律/状态与不变量/测试纪律/依赖与提交/
     工单工作流）；本文件全文；`docs/ROADMAP.md`（「Phase 7+」全节——主线链已到
     …C→G→H，P7-B 节带 ✅）；`docs/invariants.md` 全表（**23 条**——15/22/23 三条
     本日变更：15/22 升已锚定、23 新登记）。
   - 任务〇选读：`docs/reports/2026-08-25_p7b-campaign.md`（收官报告全文——
     含 §3 UNDO-01 审计链披露与 §2 新功能发现）。
   - 任务一选读：`docs/adr/0011-md-corpus-interface-contract.md`（含 v1.1 修订
     六项）；ROADMAP `P7-C` 节+N1 增补块；`docs/reports/
     2026-08-25_ai-ingest-lineage-skeleton.md` §1（N1 锚点定位服务骨架）。
   - 任务二选读：`docs/reports/2026-08-25_ai-module-plan.md`（v1.1 工单化母本，
     §4 表已含定稿增补列）；`docs/reports/2026-08-25_ai-plan-review.md` §5/§6
     （骨架+导出会话状态机表=AI-02/03 工单头注母本）。
   - **禁止**：全库通读；重读历史报告全文（只读指定节）；把 git log 长 message
     或 Temp 审计 JSON 拉进上下文（需要复审时只看 campaign 报告 §3 提炼）；
     重读 2026-08-25 上午四份规划文档全文（裁决已浓缩在蓝图 §4.3 与 ADR-0014/
     0015，规划推理过程不需要）。
2. 技能清点+配置自查（宪法开工纪律；简报必含此节，deepseek 缺失判 WARN）。
3. 全程纪律：受锁 unlock→改→即时 apply+[locked-change]；禁新依赖；一单元一
   commit；先红后绿；双门齐备才提交；机器事实终裁；卡住停下报告；不放宽检查。
4. 开工先跑 `npm run verify`（预期 exit 0，**60 文件 337 用例**）+ `npm run
   test:e2e`（预期 **11/11**）。若不是——停下报告，不要顺手修。测试一律走
   `npm run test`（裸 npx vitest 因 ABI 停 electron 态必假红）。

## 0b. 新功能面核对面（本日交付——开工首站逐项过一遍，每项≤5 分钟）

| 面 | 一句话核对法 | 锚 |
| --- | --- | --- |
| 退出拦截（TABS-04） | 有未保存修改点窗口 ✕ → 确认框弹出且**默认焦点在「取消」**；取消后窗口保持 | INV-22 已锚定（单测+装配 e2e） |
| 撤销栈（UNDO-01） | 划选高亮→ctrl+z 消失；菜单删除→ctrl+z 恢复（**新 id 重建**）；批注改错→ctrl+z 回旧值；textarea 内 ctrl+z=原生文本撤销（不接栈） | INV-23 已锚定（15 用例） |
| error tab 补全（markTabError） | 种缺失文件场景仅 e2e 有——手动等价：移动/删除受管文件后打开 → tab 红「打开失败」可关可切 | INV-15 已锚定 |
| 退出 e2e 三序列 | 无需手动——`tests/e2e/reader-text.spec.ts` 末测（换/关含 error/退） | e2e 11/11 |
| 手动随手验清单 | p7b-campaign §5（多开切关/灰点断网/三类撤销/退出确认焦点） | —— |

## 1. 背景与当前基线（一段话，细节在指针里）

2026-08-25 全天五段：上午四役规划（AI 模块技术路线 v1.1 定稿——七项未定义特性
闭合+INV-16~18 预登记；业务重述核实→用户第四轮裁决 E1=B' 伴随进程/E2~E7 推荐
包/N1~N4 新需求→蓝图 §4.3+ADR-0014/0015 落档；骨架细化=AI-06~10+LG-01~05 工单
化母本）；晚场 P7-B 全役收官（TABS-04 `6258e00`/UNDO-01 `3b94009`/e2e 收官
`f79955d`）。当前：**verify 337 用例/60 文件、e2e 11/11、工单 83 open 0、锁 95、
INV 23 条（15/22/23 本日变更）、领先 origin 约 30 提交未 push（决策属用户）**。
工作树残留两处（均不阻塞）：`dist_new/`（Phase 6 产物不动）、`scripts/audits/`
（句柄锁审计残留——重启后删，删不动就留给下下次）。

**升级复审项（任务〇）**：UNDO-01 审计链七轮/回炉 4 次超契约上限——详见
p7b-campaign §3。开工时问用户一句复审结论；无异议→继续；有异议→事件驱动
缺陷单元流程（取证→态空间→红→绿→双门）。

## 2. 任务序列（顺序：〇→一→二穿插三；事件驱动最高）

### 任务〇：复审处置（开工问询，≤一次往返）
用户对 UNDO-01 审计链的复审结论。审计存档=%TEMP%\synapse_workflow\audits\
（undo01-r2~r6.audit.json；r7 raw 因 900s 截止无 verdict——变异红证替代）。
默认（无回复）：视为无异议，主线继续。

### 任务一：P7-C 工单化（含 N1 增补）——下一主站
- 范围=ROADMAP P7-C 节+N1 增补块：阅读器侧栏三栏（目录/缩略图/笔记）；片段
  笔记=标注锚定（α 双层）；sortKey（页码:序号）→createdAt；md 语料导出（
  **验收细目=ADR-0011 v1.1**：front-matter 无 exportedAt/幂等 sha/[ai:*] 装配/
  golden+结构断言）；库侧 NotesPanel 编辑面下线（「方案切换=删除旧方案」红线）；
  **N1**：笔记↔标注双向单击定位（标注单击=方案a 四选项菜单+侧栏同步高亮）+
  共享「锚点定位服务」（三层防线 exact/page/paper=INV-20 单入口，骨架=
  skeleton 文档 §1，F-aware 滚动接口）。
- **装配单源条款**（R12）：corpus md 装配纯函数 corpus.assemble.ts 由 P7-C 建立，
  AI-03 同文件延展——工单头注必须写明，禁两套装配。
- 工单化流程：`npm run ticket:new`+状态机前置表+deepseek plan 门（mode=plan，
  P7-B 先例）；notes.store 五模块（ADR-0008）扩 per-tab 面防状态机坍缩（U2 教训）。

### 任务二：SR2-AI-01~05 逐单（P7-C 后）
母本=ai-module-plan v1.1 §4（含定稿增补列：AI-01 含 question 列 DDL+role CHECK；
AI-02 含 ESLint pdfjs 白名单 [locked-change]+头注修正；AI-03 含 manifest 终局单写
+全页快照+装配单源接续；AI-04 含 App 层订阅+toast；AI-05 vitest 宿主）。状态机
母本=ai-plan-review §6。INV-16/17/18 随单锚定。站间停点：预算不足在单边界停。

### 任务三（穿插）：AI-06~10 与 LG-01~05 工单化（随各自批次）
契约=ADR-0015（B' 协议+回灌+N2 粒度）/ADR-0014（lineage 模型+边界）；骨架=
skeleton 文档 §2/§3（含 job 状态机与 autosave 态空间=工单头注母本）。注意
AI-06~10/LG 组工单头注引用裁决指针须写「蓝图 §4.3」（B4 规则 6 的 decidedScopes
已含 P7-G/P7-H）。

### 任务四（穿插）：C1 防线升级评估
INV-11 单源常量/INV-07 路径字面量 lint 化可行性 → 落 **ADR-0010**（空号预留已
核实；新 ADR 编号下一可用=0016）。在等待审计/用户反馈的间隙穿插。

### 事件驱动（最高插队）
用户人工验收缺陷 → 双门修复单元。随手验清单=§0b+p7b-campaign §5。

## 3. 执行批次

1. §0 前置+双基线绿+§0b 核对面过一遍 → 任务〇问询。
2. P7-C 工单化（plan 门）→ 实现（每单一提交）→ 收官（e2e 扩展+ROADMAP 回写）。
3. SR2-AI-01~05 逐单。4. AI-06~10 → LG-01~05（各自工单化批次）。5. C1 间隙穿插。
6. 每站收官回写 ROADMAP；**push 前问询用户**（现领先约 30 提交）。

## 4. 终止条件（预声明，沿用战役契约）

- 同一单元 deepseek 回炉 ≤2 次仍不收敛 → 停下升级用户（**UNDO-01 先例警示**：
  修复引入新修复面的振荡链——每轮必须配回归用例且 diff 净增量化，见 §5 新教训）。
- 审计输入携带全部前轮裁决（简报累积制）；双门齐备才可提交；BLOCKING 被机器
  事实证伪时携核验事实重审一次；发现测试/契约问题→停下走 [locked-change]。
- 「不做」是合法结论但须 ADR+量化依据；无用户明示不 push、不打安装包。

## 5. 基础设施与历史教训（08-25 版十条全数有效，以下为当日新增/修订）

- **双门**：调用例同前；已知故障现三态：SSL 重置→重试；JSON 落 reasoning→
  raw.txt 打捞（逐位置 raw_decode）；**900s reasoning 截止（无 verdict）→多为
  diff 过大，改用净增量 diff 重试**（见下条）。
- **审计 diff 净增量化（新，UNDO-01 r7 三连败教训）**：多轮回炉时 diff 会累积
  全部中间轮次使审计上下文膨胀→超时截止。每轮重审前从净增量重导（如
  `git diff HEAD` 于未提交态，或对已提交单元 `git diff <单元基线>..HEAD`），
  禁复用首轮 diff 文件。
- **变异红证**：文件备份法（cp→变异→红→还原→diff 空）；受锁文件先 unlock。
- **e2e 四坑（新）**：①种子多篇用 SEED_ID 参数（缺省单篇兼容）；②pdfjs 文本层
  CJK 逐字分项——正文断言用 ASCII 单 run 标记词；③role=tab 域污染（目录/缩略图
  切换器同 role）——查询限定 tablist 容器；④**渲染侧 window.close() 绕过 close
  守卫**——e2e 驱动退出必须 main 侧 close+`app.evaluate((electron)=>…)` 注入式
  （main 为 ESM 无 require）；dirty 上报 IPC 必须 await 落地再触发 close。
- **退出拦截驱动模态**：`electron.dialog.showMessageBox` 在 main mock（注入式
  electron 参数）；aliveWindows 探针=窗口数（evaluate 失败 catch→-1=进程退出）。
- **Toast 拆分事实**：showToast 纯逻辑在 `toast-store.ts`（.ts 消费方可导入），
  Toast.tsx 再导出——新消费方（非组件）一律 import toast-store，勿再撞 jsx 关卡。
- **组件行数守恒**：AnnotationLayer/ReaderPage 均 250 恰满——后续触碰先想好
  守恒预算（注释压缩先例已三次）。
- **shell 瞬时态**：rm/cp 复合命令挂起（scripts/audits 句柄锁复发两次）→停任务+
  单命令+timeout；删不动就留置（未跟踪不阻塞）。
- **质量关卡行数算法**=split('\n').length（尾行+1 已计入）；规则 2 连锁去前缀；
  guardedDescribe 文件必须 import 登记文件（规则 5——新通道测试并入工单测试
  文件先例）。
- 版本口径：Electron 42.9.3+Node 24；测试走 npm run test；三命令收敛不变。

## 6. 关键文档与工单指针（速查）

| 对象 | 位置 |
| --- | --- |
| 本日收官报告（含审计链披露+e2e 四坑） | docs/reports/2026-08-25_p7b-campaign.md |
| AI 工单化母本（01~05） | docs/reports/2026-08-25_ai-module-plan.md（v1.1） |
| 骨架母本（06~10+LG+N1） | docs/reports/2026-08-25_ai-ingest-lineage-skeleton.md |
| 第四轮裁决（E1~E7/N1~N4） | docs/reports/2026-08-25_ai-sensor-blueprint.md §4.3 |
| 契约三件 | docs/adr/0011（v1.1）/0014/0015 |
| 导出会话状态机 | docs/reports/2026-08-25_ai-plan-review.md §6 |
| INV 登记册（23 条） | docs/invariants.md |
| P7-B/P7-C/P7-G/P7-H 编排 | docs/ROADMAP.md Phase 7+ 节 |
| 双门审计存档 | %TEMP%\synapse_workflow\audits\（bibtex/p7b-plan/tabs01~04/undo01 系列） |
| 退出拦截规约 | src/main/windows/main-window.ts 头注（done） |
| 撤销栈规约 | src/renderer/features/reader/annotation-undo.ts 头注（done） |
