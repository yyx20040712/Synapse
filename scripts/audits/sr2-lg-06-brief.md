# SR2-LG-06 脉络跳转接笔记面板信号（缺陷 E2）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 E2（图六：脉络跳转后左侧面板未切
> 笔记），取证定性见 `docs/prompts/2026-08-28_loop-handoff.md` §2E2。
> **确定级**：跳转链完整且定位成功（PDF 高亮闪烁）；OutlineAside.tsx:58
> tab 是组件本地态（默认 'outline'），AI-09 建的
> notifyAiNoteHighlight→setTab('notes') 信号（reader.store:377-380）现唯一
> 生产者=页内 AI 标注块点击——脉络双击路径（openFromBus→locateAnchor）没接。
> 验收修复役 U3b。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 修法=一行接线**：`open-paper-anchor.ts` anchor 分支（:19-21）在
  `locateAnchor` 之前：
  `if (req.aiNoteId !== undefined) useReaderStore.getState().notifyAiNoteHighlight(req.aiNoteId)`
  （复用 AI-09 全套语义：OutlineAside:98 订阅 aiNoteHighlight state 切
  'notes' tab+列表滚动高亮——**持久 state 非瞬态事件**，tab 未开/loading
  期间早发不丢失，挂载后效应补切；信号全局单值同 AI-09 既有语义，非本票
  新增面）。
- **P2 无锚/无 aiNoteId 路径零触碰**：notify 只在 anchor 分支且
  aiNoteId 有值时发；annotationId 场景（用户标注跳转）不切笔记 tab——
  既有行为保持（标注高亮走 noteHighlight 信号，其生产者链不动）。
- **P3 测试=受锁文件加 it**：`tests/unit/renderer/lineage-side-panel.test.tsx`
  消费方级组（:188+）新增两 it：
  ①带 aiNoteId 锚请求 → notifyAiNoteHighlight('a1') 被调**且顺序先于**
  locateAnchor（invocationCallOrder 断言）+ locateAnchor 照常；
  ②无 aiNoteId 锚请求（annotationId 或裸锚）→ notifyAiNoteHighlight 不调。
  该文件 reader.store 的 stub 结构须先核对（openPaperStub 先例）——stub
  需含 notifyAiNoteHighlight。受锁 [locked-change]（unlock→改→apply）。
- **P4 注册文件=open-paper-anchor.ts**（LG-04 同文件第二票——F-02
  anchor-locate.ts 双裁决链先例：头注追加 LG-06 链声明，LG-04 链不动）。

## 2. 五层规约

**─ 行为层 ──**：脉络侧板双击 AI 笔记条目 → openFromBus(锚+aiNoteId) →
notifyAiNoteHighlight（面板切笔记 tab+列表高亮）→ locateAnchor（打开/
激活/定位/闪烁）。两信号职责正交：面板呈现归前者，PDF 定位归后者。

**─ 接口层 ──**：open-paper-anchor.ts 单文件 +2 行；openFromBus 签名/
OpenPaperRequest 类型零触碰。

**─ 架构层 ──**：零依赖；INV-20 单入口不动（notify 是呈现信号非定位降级，
不违「禁各写降级」）。

**─ 生命周期层 ──**：不做：annotationId 场景切笔记（未裁决——用户未提）；
aiNoteHighlight 信号的 per-paper 化（AI-09 既有语义遗留）。

**─ 文化层 ──**：TDD——新 it 先红（接线前 notify 不被调）→实现→绿→变异
红证 ≥1（删接线→①红；cp 备份法还原）→受锁文件改动后全量 verify。
报告落 `scripts/audits/sr2-lg-06-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→改→apply；
基线 verify 全绿（用例数 +2 自报）。
