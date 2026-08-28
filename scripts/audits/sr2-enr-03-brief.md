# SR2-ENR-03 详情面板被引数透出（缺陷 D）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 D（图四：被引数未显示），取证定性见
> `docs/prompts/2026-08-28_loop-handoff.md` §2D。**确定级**：数据链全通
> （迁移 005→papers.repo detailById 装配→schema optional→enrich 后重拉），
> 唯独 citedByCount 在 src/renderer 零引用——PaperDetailPanel 键值行区无
> 被引行。非 bug，ENR-01/02 票面未含 UI 透出。验收修复役 U3a。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 修法=一行 Row**：`PaperDetailPanel.tsx` 键值区（:180-188）「期刊」行
  与「来源」行之间加：
  `<Row label="被引">{detail.citedByCount === undefined ? '' : String(detail.citedByCount)}</Row>`
  （Row 空串自动渲染 '—'——既有 :64 语义；PaperDetail.citedByCount 为
  optional number，zod 单源 `src/shared/models/paper.ts:46`——**零触碰**）。
- **P2 最小面**：不拼 citedByFetchedAt 相对时间与 SOURCE_LABEL（ENR 消费面
  富化后续按需入池，遗留池已有种子表项同族）；不动 shared/models。
- **P3 测试=新文件** `tests/unit/renderer/paper-detail-cited.test.tsx`
  （always-active；mock 链抄 paper-detail-notes-off.test.tsx 先例）：
  ①citedByCount=124 → 「被引」行渲染「124」（getByText 真实文本断言）；
  ②citedByCount 缺省 → 行渲染 '—'（undefined 分支）；
  ③citedByCount=0 → 渲染「0」（零值非空——`=== undefined` 判空的边界）。
  新文件 locks:generate+apply 入锁（142→143+随 manifest 实况）。
- **P4 受锁面=零改**（不动任何既有受锁文件；仅新增入锁）。

## 2. 五层规约

**─ 行为层 ──**：详情面板文献计量区显示被引数；无数据显示 '—'；零值显示
「0」。

**─ 接口层 ──**：PaperDetailPanel 单文件 +1 行 JSX；props/导出零改。

**─ 架构层 ──**：零依赖零分层；shared 模型零触碰（字段已够）。

**─ 生命周期层 ──**：不做：排序/FTS 消费面/相对时间/source 拼接（遗留池）。

**─ 文化层 ──**：TDD——新测试文件先红（组件无该行）→实现→绿→变异红证
≥1（删被引行→①③红；cp 备份法还原）→全量 verify。报告落
`scripts/audits/sr2-enr-03-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；环境铁律 node24 前缀；基线 verify 全绿
（用例数 +3 自报）。
