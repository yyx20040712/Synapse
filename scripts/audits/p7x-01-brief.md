# P7X-01 票面简报——标签选中上限 UI 感知

> 来源：P7E-06 门二 WARN 立项+用户裁决 2026-09-03 全立项。registry: tickets/registry.ts:244。
> 形态：小票三屋（实现者 TDD 红→绿→变异红证；门一/门二独立审）。

## §0 缺陷陈述

`tagIds` schema 上界 `max(20)`（src/shared/models/paper.ts:79——单查询爆炸上界，EXISTS 每标签一条）仅在提交时拦截：UI toggle 无上界保护，用户第 21 个 chip 选中后**提交才报错**=UX 断层（选中态视觉已反馈、期望已建立，被服务端拒收打回）。

## §1 行为层（五层规约）

- **守卫语义**：toggle 添加方向且 `selectedTagIds.length >= TAG_FILTER_MAX` → **不调用 onFilterChange**（选中态零变）+ `showToast('最多同时筛选 20 个标签', 'info')`（info 级——引导非错误；文案值由常量插值，禁手写 20）。移除方向永不设限。
- **单源**：`TAG_FILTER_MAX = 20` 从 `src/shared/models/paper.ts` 导出，schema `.max(TAG_FILTER_MAX)` 与 TagFilter 同消费——两处任一改值同步，漂移结构性不可能（故不登记 INV：无漂移面）。
- **边界**：第 20 个（length=19 时添加）合法入选；第 21 个（length=20 时添加）拦截。

## §2 接口层

- paper.ts：`export const TAG_FILTER_MAX = 20`（schema 行改引用；注释补「UI 消费同源」一句）。
- TagFilter.tsx：toggle onClick 内联守卫（组件 props 形状零变；173 行余量充足禁拆件）。

## §3 架构层

- 渲染层 import `@shared/models/paper` 先例在档（SelectionLayer 消费 @shared/models/annotation）；分层单向合规。
- 受锁配套两件=[locked-change]：paper.ts（常量提取，schema 语义零变）+ tests/unit/renderer/tag-filter-multi.test.tsx（新 it，见 §5）。

## §4 生命周期层

- 无新状态/异步面（守卫为纯同步分支+toast 既有通道）。

## §5 文化层（测试锚——TDD 先红）

tests/unit/renderer/tag-filter-multi.test.tsx 增两 it（always-active，不经 guardedDescribe）：
- **T8 上界拦截**：夹具 20 选中+点第 21 chip → toast 恰一次（spy）+onFilterChange **零调用**+该 chip aria-pressed=false 保持。
- **T9 边界放行**：夹具 19 选中+点第 20 chip → onFilterChange 恰一次、载荷含新 id（20 项）+零 toast。
- 变异红证（文件备份法，禁 git checkout）：M1 删守卫→T8 红；M2 `>=` 改 `>`（off-by-one）→T8 红（20>20 假→放行被 T8 捉）；M3 常量 20→21（paper.ts）→T8 红。

## 验收

- 新 it 先红（对现行代码）后绿；变异三证还原空 diff。
- `npm run verify` 全绿（受锁两件经 `npm run locks:unlock` 改、改毕即时 `locks:apply`）。
- 诚实申报一切票外决定。
