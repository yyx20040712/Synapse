# F-SPLIT-01 门二终审报告（二审实证位）

> **档位申报**：GLM-5.3（offpeak-idle-plan/GLM-5.3，平台实际执行模型）。
> 政策档位 deepseek v4flash 平台未配置 → 落次选 GLM5.3 系。**与实现者
> （GLM5.3flash）同家族=同源欠账**：二审独立性弱于异构档，本报告以全机器面
> 亲跑（verify/探针/双变异）+静态逐点核对补偿，欠账如实记入成本账本行。
> 日期：2026-09-05。审档包：f-split01-gate2-package.md（门一 Kimi K3 全文+
> 主控处置表+实现者报告终版+全量 diff）。

## 0. 开工技能清点（宪法会话开工纪律）

- **用**：verification-before-completion——门二硬职责=机器面亲跑真退出码
  （verify/探针/变异三面全部落盘原始输出）。
- **用**：code-review-excellence——四清单二审逐项核对面。
- **不用+理由**：systematic-debugging——全程零红唯一非绿=变异 2 的预期探查
  （不红本身是发现，非缺陷定位回环）；test-driven-development——零新代码面
  （变异抽查属验证面）；browser 系——无 UI 交互验证面（探针脚本自含无头跑）。
- 配置自查：Node 24.20.0 会话内 Volta shim 直通亲验（node --version 实测）。

## 1. 清单① 处置核对（门一 findings vs 主控处置表 vs 终态实物）

| 项 | 主控处置 | 门二实物核验 | 结论 |
| --- | --- | --- | --- |
| W1 批次标记 | PageColumn 系 3 件补 `// b3: P7-F`；宿主无标拆出件不补 | head -1 实测十件：PageColumnView/usePageLazyWindow/usePageColumnScroll=`// b3: P7-F` ✓；AiNotesStatus/ai-notes-phase=`// b3: P7-G`、LineageBoardMenu/LineageBoardDialogs=`// b3: P7-H`（原有）✓；AnnotationPopups/reader-shortcut-handlers/ReaderPageView 首行 `/**` 无标=与处置表「宿主无标不带」一致 ✓ | **闭合** |
| N1 效应注册序 | 接受备案 | PageColumn.tsx 89~96 区实测：三 hook 调用确实位于段①就绪管线 useEffect 之前（门一 cited 行点属实）；探针三轮 PASS 佐证无可观察差 | 备案维持 |
| N2 注释指针 | 已回炉修正 | AiNotesSection.tsx:77 实测=`// 分节可见性口径（六态单源在 ai-notes-phase.ts（derivePhase）——hasNotes 事实同帧）`——指向正确本体 | **闭合** |
| N3 27→28 props | 勘误记录 | awk 提取 ReaderPage.tsx 调用面 `<ReaderPageView ...>` 实数 **28**（两种数法均 28）——门一勘误属实 | 收 |
| N4 pdfDoc unknown | 收（typecheck 双绿） | verify 全链 typecheck（node+web 双 tsconfig）绿 EXIT_CODE=0 亲验 | 收 |
| N5 订阅拓扑 | 收（已披露） | LineageBoardMenu:57/LineageBoardDialogs:47 实测 `useLineageStore((s) => s.edges)` 自订阅；宿主 LineageBoard:92 原订阅保留（LineageCanvas 消费） | 收 |
| N6 测试盲区 | 收（纯搬运口径） | 本审变异抽查**细化**其边界：段③渲染窗口有锁（变异 1 红 4 用例）、弹层 busy 守卫无锁（变异 2 不红）——见 §4 | 收+边界实证 |

门一 cited diff 行点抽查 3 处：①PageColumn 三 hook 前置于段①管线（行 92~96）✓；
②AnnotationLayer `useState` import 留存（行 40）+`setBusy={setBusy}` 回传（行 148，
AnnotationPopups 单行调用）✓；③AiNotesSection:77 注释 ✓。三处全中，门一证据可信。

## 2. 清单② 母本符合度（票面条款 vs 终态实物）

- **纯结构零行为差**：五抽块语句级抽查与门一逐字核对交叉验证——
  usePageLazyWindow（IO effect/上抛/回收调度三 effect+latest-ref）、
  usePageColumnScroll（段⑤ INV-29 单口+段⑥镜像）、AnnotationPopups（三动作函数）、
  reader-shortcut-handlers（useMemo 工厂 deps []）均与 diff 终态一致。
- **状态归属（ AnnotationLayer→AnnotationPopups）**：AnnotationPopups 全文
  grep 零 useState/useRef/useEffect=**零本地状态** ✓（票面「弹层可无本地状态」满足）；
  menu/editing/busy 三 state 留守宿主（AnnotationLayer.tsx:66 起 useState 面+行 148
  set 函数回传）✓。
- **state set 回写（LineageBoard→两拆件）**：宿主 8 个 useState 全留守（行 98~105：
  menu/pendingLink/addOpen/ideaNodeId/tagNodeId/manualParentId/manualManageId）；
  两拆件 props 收 set 函数回写（LineageBoardMenu 7 setter/LineageBoardDialogs 6 setter），
  拆件仅 edges store 自订阅（N5 已披露面）✓。
- **ReaderPageView 零 hook**：grep useState/useEffect/useMemo/useRef 零命中 ✓
  （空态早退移入子件不违反 hook 序——门一 ⑤ 论证成立）。
- **头注职责随迁禁删减**：六态表→ai-notes-phase.ts:8~22（含跨格序列指针）；
  段②③⑤⑥→PageColumn 头注+三拆件头注双向指针成对；弹层段→AnnotationPopups；
  快捷键段→reader-shortcut-handlers。抽查未见信息删减（门一 §三 A 同判）。
- **≥80 行余量**：wc -l 实测五宿主终态 164/151/107/155/163，全部 ≤169
  （余量最小 250-164=86 ≥80）✓；十新件最大 158（AiNotesStatus，.tsx ≤250 红线
  余量 92）✓。
- **AnnotationLayer 编排语义零改**：F-A8 门 2 面（S0~S6/CR1）测试文件
  ai-annotation-layer.test.tsx 与 annotation-layer.test.tsx 的 10 个编排用例
  在 verify 全链中全绿（变异轮亦仅 page-column 红——编排面未被本票触碰的
  机器面佐证）✓。

## 3. 清单③ 宪法红线终审

- **分层单向**：新 .ts 件 import 面=react+同域+@shared（ai-notes-phase 仅
  @shared/ipc/schemas，零环）；.tsx 新件=同域+@shared+../../api/client
  （window.api 合法方向）——无越层新边 ✓。
- **行数（wc -l 实测 15 件）**：PageColumn 164/PageColumnView 72/usePageLazyWindow 83/
  usePageColumnScroll 66/AnnotationLayer 151/AnnotationPopups 147/AiNotesSection 107/
  AiNotesStatus 158/ai-notes-phase 37/LineageBoard 155/LineageBoardMenu 106/
  LineageBoardDialogs 103/ReaderPage 163/ReaderPageView 157/reader-shortcut-handlers 42
  ——与实现者报告 §6 终版逐一相符；.tsx 全部 ≤250（最大 164）、.ts 全部 ≤300 ✓。
- **UTF-8**：node fs 读 10 新件全量——中文注释在场（chinese=true）且零
  replacement char（U+FFFD）=无乱码 ✓（quality 关卡同判，verify 内含）。
- **新文件被引用**：10 新件 grep 消费面全中——PageColumnView/usePageLazyWindow/
  usePageColumnScroll←PageColumn（+PageScrollRequest 再导出双出口）；
  AnnotationPopups←AnnotationLayer；AiNotesStatus←AiNotesSection；
  ai-notes-phase←AiNotesStatus+AiNotesSection 双消费；reader-shortcut-handlers/
  ReaderPageView←ReaderPage；LineageBoardMenu/LineageBoardDialogs←LineageBoard ✓。
- **死代码**：宿主三件退役符号 grep 零代码残留（命中均为头注注释/在用
  PageBoxSize 类型再导出）；lint 绿（verify 链内）双佐证 ✓。

## 4. 清单④ 机器面核对（亲跑矩阵，真退出码全部落盘）

| 项 | 结果 | 原始输出 |
| --- | --- | --- |
| `npm run verify` 全链 | **EXIT_CODE=0**；quality+tickets+**locks 286**+lint+typecheck（双 tsconfig）+**test 156 文件/1422 用例全绿**+build ✓（与基线一致，与实现者申报一致） | f-split01-gate2-verify.raw.txt |
| `node scripts/audits/p7d01-visual-probe.mjs after`（第三轮） | **PROBE_EXIT=0，COMPARE PASS**——八态 PNG 逐字节（含 lineage 三态=自裁 4 DOM 兄弟序变化零视觉差再实证）+sweeps 逐键+11 tokens+11 compiledRules | f-split01-gate2-probe3.raw.txt |
| 变异 1（usePageLazyWindow:76 `windowPages(visible, totalPages, renderWindow)`→`0`） | **红**：page-column.test.tsx 4 用例失败（初始引导渲染/IO 报可见窗口±renderWindow/快速滚动回收 INV-30/W3 卸载哨）——`4 failed \| 1418 passed (1422)`，EXIT=1 | f-split01-gate2-mut1.raw.txt |
| 变异 2（AnnotationPopups saveComment `if (busy) { return }` 三行删除） | **不红**：1422 全绿 EXIT=0——busy 守卫在单测面无锁定用例（存量盲区实证，详见下） | f-split01-gate2-mut2.raw.txt |
| 终态复绿（两变异还原后） | **156 文件/1422 用例全绿，FINAL_TEST_EXIT=0**；git status src/ 与终态一致（15 件，零变异/备份残留） | f-split01-gate2-mut-final.raw.txt |

**变异红证还原记录（文件备份法，全程零 git checkout）**：
- 变异 1：cp 备份→node 精确替换（写入后回读校验 MUTATED-OK）→npm run test 红→
  cp 还原→`diff 备份 工作文件` **空**（RESTORE-DIFF-EMPTY）→grep 确认原句在位。
- 变异 2：同法（MUTATED-OK→不红→还原 diff **空** RESTORE2-DIFF-EMPTY→
  `if (busy)` 守卫计数恢复 1）。
- 两轮备份件（/tmp/*.gate2bak）复绿确认后已删除；还原后全量 test 复绿收口。

**变异 2 不红的定性（供主控终裁参考，不构成本票回炉项）**：
AnnotationPopups 的 busy 双击防护守卫拆前（驻 AnnotationLayer 时）同样无单测锁
——本票纯搬运未动测试面，该盲区为**存量**而非本票退化；annotation-menu.test.tsx
锁的是 AnnotationMenu 组件 props busy 呈现面（禁用），非宿主动作守卫。与门一 N6
「覆盖深度包内不可证」相印证：本审将边界划实——段③懒渲染窗口**有锁**（4 用例）、
弹层动作 busy 守卫**无锁**。建议批二字号轴触 reader 域时顺带补弹层动作链用例。

**翻 done 推演**：`grep -rn "F-SPLIT-01" tests/` 零命中（exit=1）；
tests/utils/guard.ts 同零命中——registry 翻 done 不会激活任何守卫测试，
**翻 done 零耦合安全**。registry.ts:249 现状 `status: 'open'`（本审只读未触碰）。

## 5. 成本账本行

- 模型×供应商×套餐：GLM-5.3（offpeak-idle-plan / 平台托管档；套餐细目工具面
  不可见，如实申报）。派发政策首选 deepseek v4flash 平台未配置→次选落地。
- **同源欠账**：与实现者同家族（GLM5.3 系）——二审独立性折扣，已用全机器面
  亲跑+与门一（Kimi K3 异构）结论交叉验证补偿；关键判断（纯搬运逐字面）以
  门一异构审为准锚，本审未推翻其任何 finding。
- token 估计：输入 ~95k（审档包 36k+工具输出+系统面）/输出 ~10k。
- 时长：约 30 分钟（verify ~4min+探针 ~1min+三轮全量 test ~9min+静态核对）。
- 落盘产物：本报告+f-split01-gate2-verify/probe3/mut1/mut2/mut-final 五份 raw。

## 6. 总评

**PASS_WITH_WARNINGS**

- 四清单全过：处置核对闭合（W1/N2 亲验在档）、母本符合度条款全达（零行为差/
  状态归属不变/头注无删减/余量达标）、宪法红线零违（分层/行数/UTF-8/引用/
  死代码）、机器面全绿（verify 1422+locks 286+探针 COMPARE PASS+变异 1 红证）。
- 警告项（均不阻塞收口，备案供主控终裁与批二参考）：
  1. 变异 2 实证弹层 busy 守卫单测无锁——存量盲区（非本票退化），建议批二触
     reader 域时补弹层动作链用例；
  2. 门二与实现者同家族（GLM5.3 系）同源欠账——异构性靠门一 Kimi 链+机器面
     亲跑补偿，本票结论可信度评估时应计入此折扣。
- 收口前置条件已全部满足：verify 真退出码 0+diff 范围 15 件无蔓延+tests/shared
  零触碰（无 [locked-change] 面）+翻 done 零耦合。建议主控按三屋流程翻
  registry F-SPLIT-01 → done 并提交。
