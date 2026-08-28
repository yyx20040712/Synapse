# SR2-LG-08 脉络跳转挂载时序竞态修复（缺陷 P3：双击笔记总跳最后打开的文章）——票面 v1

> 来源：2026-08-28 复测三问题 P3（测试 4）。取证定性见
> `docs/prompts/2026-08-28_retest3-handoff.md` §2C + **本场主控复核推翻原假说**：
> ①数据面干净（只读 SQL 实证：真库 `%APPDATA%/Synapse Remake/synapse.db`
> ai_notes 四 paper_id ×22 条均匀分布，lineage_nodes 四节点绑定各异——
> 「库内归属错位」假说不成立；注意 `com.synapse.app` 下另有陈旧库残留，
> 非运行库）。②载荷链七跳逻辑逐跳复核全部正确。③**根因=挂载时序竞态**
> （宪法三盲区之首——时序）：
>
> ```
> 脉络双击笔记 → requestOpenPaperAnchored(A+anchor) 事件①
>   → App handler setView('reader') → React 挂载 ReaderPage
>   → 挂载效应（ReaderPage.tsx:116-123）：
>       :118 takePendingOpenPaper() 消费闩锁（A+anchor）
>       :119 open(pending) → openFromBus → locateAnchor
>            → tab A 不存在 → waitOpen:148-151
>            → requestOpenPaper(A) 同步派发事件②
>       :121 addEventListener(handler)  ← 监听器晚了两行！
> ```
> 事件②在 :121 注册前同步派发——**自丢失**（唯一已注册监听器=App 的
> setView no-op）。无任何角色调 `store.openPaper(A)` → waitOpen 轮询 8s
> 超时 → 停留原 active tab=「最后打开的文章」。丢失请求滞留闩锁，用户
> 下次切走再切回阅读器时才迟到打开（tab 已存在路径无此竞态=「篇内定位
> 正常」自洽）。tab 已开/OutlineAside 页内路径监听器在场，不受影响
> ——e2e 与单测全绿的原因。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 根修=挂载效应内监听器注册提前**（ReaderPage.tsx:116-123）：
  `addEventListener` 移到 `takePendingOpenPaper()` 消费**之前**——事件②
  被自身 handler 接住 → openFromBus 无锚分支 → `store.openPaper(A)` 正常
  打开。清理函数形态保持（return 里 removeEventListener）。**3 行换序，
  零新逻辑**；头注补时序竞态链声明（F-07 同批阅读器域，链声明独立）。
- **P2 防御修=条目自身归属**（交接书原案保留）：
  `LineageSidePanel.tsx:134` `node.paperId`→`n.paperId`（payload 取条目
  自身 paperId——与阅读器侧同链先例 AiNotesSection.tsx:195 对齐；当前
  行为等价（侧板按 node.paperId 过滤取数），未来聚合时防错位）。
- **P3 测试=受锁新增 it×2**（新测试文件
  `tests/unit/renderer/reader-page-open-race.test.tsx`，locks:generate→
  apply；always-active）：
  - ①**竞态红证 it**（先红）：真 open-paper-bus（禁 mock——竞态本体=
    总线时序）+真 reader.store（window.api 按 repo 测试工具先例 mock 到
    openPaper resolve）——`requestOpenPaperAnchored({paperId:'p1',anchor:
    {quoteText:'…≥2字',…}})` 先设闩锁，再 render ReaderPage（子重组件
  PdfDocProvider/PageColumn 等 vi.mock——app-quit-dirty.test.tsx 渲染
    App 的 mock 先例自寻核对）→ 断言 openPaper 被调（spy/store tabs
    ['p1'] 创建）。**现状必红**（事件②丢失=openPaper 永不被调）。定时器
    参考 anchor-locate.test.ts fake timers 先例（waitOpen 8s 轮询不滞留
    测试进程）。
  - ②无锚请求不受时序影响 it：pending 无 anchor → openFromBus 无锚分支
    直接 openPaper（既有行为回归锁）。
  - 夹具注意：notifyAiNoteHighlight（LG-06）在 anchor 分支先行——真
    store 下无碍；断言不涉它（接缝归责：LG-06 面不本单重测）。
- **P4 取证结论归档**：本票面 §引言=终版定性（数据面干净+时序竞态）；
  impl.report 誊录 SQL 实证三行（papers 8/ai_notes 4×22/nodes 4 分布）
  ——**无数据修复项**（重导入/数据订正均不需要）。
- **P5 不做**：waitOpen 直调 store.openPaper 的第二保险（最小修=换序；
  换序后无未注册窗口——ReaderPage 挂载期外监听器恒在场，门一可攻击
  此论断）；open-paper-bus 闩锁过期清理（滞留请求被下次挂载消费=
  迟到打开，换序后语义=「该开的终会开」，不改）。

## 2. 五层规约

**─ 行为层 ──**：脉络侧板双击 AI 笔记条目（目标文献 tab 未开时）→
阅读器打开**该条目所属文献**+定位+面板切笔记 tab（LG-06 面不动）；
tab 已开路径行为不变。

**─ 接口层 ──**：ReaderPage.tsx 挂载效应 3 行换序+头注；
LineageSidePanel.tsx:134 一处取值改写；零新导出/零签名变更。

**─ 架构层 ──**：renderer 内；open-paper-bus/anchor-locate/
open-paper-anchor 零触碰；分层无涉。

**─ 生命周期层 ──**：不做：StrictMode 双挂载特化（换序对双挂载同样
成立——首挂消费+监听器在场，二挂监听器重注册）；闩锁 TTL。

**─ 文化层 ──**：TDD——it① 实现前跑红截图留证（「openPaper 0 次」）→
换序实现→绿→变异红证（还原换序→it① 复红；cp 备份法还原 diff 空）→
受锁新增后全量 verify。报告落 `scripts/audits/sr2-lg-08-impl.report.md`，
回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks:generate（新测试
路径）→apply；verify 真退出码落盘；基线=95 文件 741 用例（本单 +2 it
自报）。
