# P7X-01 门二终审材料包（自包含——零仓库接触，一切事实以下文为准）

## 一、票面全文

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

## 二、完整 diff（4 文件）
```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 9c8c6bd5e3..c3b8329102 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-03T13:37:55.7441396Z",
+    "generatedAt":  "2026-09-03T14:26:08.7157538Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -367,7 +367,7 @@
                   },
                   {
                       "path":  "src/shared/models/paper.ts",
-                      "sha256":  "938e592f5105310dc685a7d1ab5dc0affae9930ecb1d3aaf169c9375498ed5dd"
+                      "sha256":  "2c05ef33575c5de6879d212849ac7effb4f0b3a4fa4c6f2f6e4fa8dcd9b9f604"
                   },
                   {
                       "path":  "src/shared/models/tag.ts",
@@ -863,7 +863,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/tag-filter-multi.test.tsx",
-                      "sha256":  "7ab6e2487530901fa915236bb874fbe6d5afd2d6217331b6631ea788f6c558fe"
+                      "sha256":  "1ea39ad7da28fe3cf0cbc53630fd1055ac1a9e502449763be6243e1f04c64106"
                   },
                   {
                       "path":  "tests/unit/renderer/tag-lifecycle-ui.test.tsx",
diff --git a/src/renderer/features/tags/TagFilter.tsx b/src/renderer/features/tags/TagFilter.tsx
index 28c93bf7eb..7bc419db15 100644
--- a/src/renderer/features/tags/TagFilter.tsx
+++ b/src/renderer/features/tags/TagFilter.tsx
@@ -3,6 +3,8 @@
  *
  * ── 行为层 ──
  * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
+ * - P7X-01 上界守卫：添加方向且选中数 ≥ TAG_FILTER_MAX（@shared/models/paper
+ *   同源）→ 零变更 + info toast「最多同时筛选 N 个标签」（N 常量插值）
  * - 选中态变化 → props.onFilterChange(ids)（P7E-06 多选 v2 已兑现——v1 单选
  *   预留注记（TagFilter.tsx:6「多选 v2」）本票落地；AND 交集语义在 SQL 层
  *   （buildFilters 逐标签 EXISTS），空数组=清除全部选中）
@@ -29,6 +31,7 @@
  *   +tests/unit/renderer/tag-filter-multi.test.tsx（P7E-06，均 always-active）
  */
 import { useEffect, useRef, useState } from 'react'
+import { TAG_FILTER_MAX } from '@shared/models/paper'
 import { showToast } from '../../shared/ui/Toast'
 import { useTagsStore, type TagWithCount } from './tags.store'
 import { TagLifecycleMenu } from './TagLifecycleMenu'
@@ -107,11 +110,18 @@ export function TagFilter(props: {
               background: active ? 'var(--accent-soft)' : 'var(--panel)',
               color: active ? 'var(--accent)' : 'var(--text)'
             }}
-            onClick={() =>
+            onClick={() => {
+              // P7X-01 上界守卫（添加方向；移除方向永不设限）：选中数已达
+              // TAG_FILTER_MAX（与 schema 同源）→ 零变更 + info 级引导 toast
+              // ——第 21 个 chip 不再等到提交才被 schema 打回（UX 断层消除）
+              if (!active && selectedTagIds.length >= TAG_FILTER_MAX) {
+                showToast(`最多同时筛选 ${TAG_FILTER_MAX} 个标签`, 'info')
+                return
+              }
               onFilterChange(
                 active ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
               )
-            }
+            }}
             onContextMenu={(e) => {
               e.preventDefault()
               setMenu({ tag: t, anchor: { x: e.clientX, y: e.clientY } })
diff --git a/src/shared/models/paper.ts b/src/shared/models/paper.ts
index f00ee530b9..8307f879d7 100644
--- a/src/shared/models/paper.ts
+++ b/src/shared/models/paper.ts
@@ -70,13 +70,19 @@ export type PaperMetaPatch = z.infer<typeof paperMetaPatchSchema>
 export const librarySortSchema = z.enum(['added_desc', 'year_desc', 'title_asc', 'cited_desc'])
 export type LibrarySort = z.infer<typeof librarySortSchema>
 
+/**
+ * [P7X-01] 标签筛选选中上界：schema 与渲染层 TagFilter toggle 守卫同源消费
+ * （单查询爆炸上界——EXISTS 每标签一条；UI 侧提前拦截=提交期报错的 UX 断层消除）。
+ */
+export const TAG_FILTER_MAX = 20
+
 export const libraryQuerySchema = z
   .object({
     search: z.string().max(200).optional(), // FTS：标题/摘要/作者
     // P7E-06 多选标签过滤（AND 交集）：tagId 单选已删（方案切换=删除旧方案——
     // 单选=单元素特例，UI 面完全覆盖）；空选集由 UI 层收敛 undefined，空数组
-    // schema 级拒收=防歧义；max(20)=单查询爆炸上界（EXISTS 每标签一条）
-    tagIds: z.array(z.string().min(1)).min(1).max(20).optional(),
+    // schema 级拒收=防歧义；上界经 TAG_FILTER_MAX 同源（UI 消费同源——P7X-01）
+    tagIds: z.array(z.string().min(1)).min(1).max(TAG_FILTER_MAX).optional(),
     collectionId: z.string().optional(),
     year: z.number().int().optional(),
     sort: librarySortSchema.default('added_desc'),
diff --git a/tests/unit/renderer/tag-filter-multi.test.tsx b/tests/unit/renderer/tag-filter-multi.test.tsx
index b49b4c1d31..eb38d99674 100644
--- a/tests/unit/renderer/tag-filter-multi.test.tsx
+++ b/tests/unit/renderer/tag-filter-multi.test.tsx
@@ -8,6 +8,8 @@
  * onMutated——INV-53 顺序锚多选形态）；T6 改名 id 稳定筛选零动；T7 合并源∈
  * 选中集=剔除且目标不自动入选；T3 装配级=FilterBar 空数组收敛 undefined
  * （schema 拒收 [] 的 UI 侧防线——M3 变异锚）。
+ * P7X-01：T8/T9 选中上界 UI 感知（20 选中点 21 拦截 / 19 选中点 20 放行，
+ * 夹具与文案断言用字面量——常量变异必须红）。
  */
 import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
@@ -258,3 +260,43 @@ describe('P7E-06 FilterBar 装配收敛（tagIds 形态）', () => {
     expect(onChange).toHaveBeenLastCalledWith({ tagIds: undefined })
   })
 })
+
+describe('P7X-01 标签选中上限 UI 感知（添加方向守卫，移除方向永不设限）', () => {
+  it('T8 上界拦截：20 选中点第 21 chip → toast 恰一次 + onFilterChange 零调用 + chip 保持未选', async () => {
+    currentTags = Array.from({ length: 21 }, (_, i) =>
+      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
+    )
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    const selected = currentTags.slice(0, 20).map((t) => t.id)
+    await renderFilter(selected, onFilterChange)
+    await clickChip('标签21（0）')
+    // 引导 toast 恰一次、info 级、文案含上界值（字面量锁定——常量变异必红）
+    expect(toastSpy).toHaveBeenCalledTimes(1)
+    expect(toastSpy).toHaveBeenCalledWith('最多同时筛选 20 个标签', 'info')
+    // 选中态零变：onFilterChange 零调用（选中集不进第 21 个）
+    expect(onFilterChange).not.toHaveBeenCalled()
+    // 被拦 chip 视觉保持未选
+    expect(buttonByText('标签21（0）')?.getAttribute('aria-pressed')).toBe('false')
+  })
+
+  it('T9 边界放行：19 选中点第 20 chip → onFilterChange 恰一次、载荷 20 项含新 id + 零 toast', async () => {
+    currentTags = Array.from({ length: 20 }, (_, i) =>
+      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
+    )
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    const selected = currentTags.slice(0, 19).map((t) => t.id)
+    await renderFilter(selected, onFilterChange)
+    await clickChip('标签20（0）')
+    // 第 20 个合法入选（length=19 时添加）
+    expect(onFilterChange).toHaveBeenCalledTimes(1)
+    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
+    expect(payload).toHaveLength(20)
+    expect(payload).toContain('t-20')
+    // 边界内不引导
+    expect(toastSpy).not.toHaveBeenCalled()
+  })
+})
```

## 三、证据链（全部在档产物）
1. TDD 先红：T8 红（toast 0 次）/T9 结构性先绿（放行断言本性，票面「先红」字面不可达——Kimi 门一 NIT-1 认定非实现者偷工）。
2. 变异四证（文件备份法，还原 diff 空）：M1 删守卫→T8 红；M2 >=改>→T8 红；M3 常量 20→21→T8 红；M4 过严 >=TAG_FILTER_MAX-1→恰 T9 红 T8 绿（主控补验销 T9 无红证欠账）。
3. npm run verify 退出码 0（PIPESTATUS 亲验）：149 文件/1272 用例全绿+locks 269+lint+typecheck+build 全过。
4. 门二复算（GLM 同源预审档，欠账披露）：tag-filter-multi 7/7 独立复跑绿+两受锁件 sha256 与 manifest 逐字符比对一致+manifest generatedAt 先于 verify test 段（无锁后改文件时序窗）。
5. 门一（Kimi K3 正式档）：PASS_WITH_WARNINGS——零 BLOCKING/零 WARN/4 NIT（①T9 先红本性=票面打包设计后果 ②aria-pressed 断言弱冗余（真实锁定=toast+零调用双断言）③死 id 占名额与 schema 同口径非缺陷票外深化面 ④sha256 零仓库接触不可复算依赖门二在档复算）。

## 四、门二终审三问
1. 正确性终裁：守卫逻辑全部交互路径（添加 19→20 放行/20→21 拦截/移除永不限/handleMutated 剔除外）语义完备否？单源常量漂移面消除的论证有无漏洞？
2. 测试真实性与证据链：T8 三向变异+T9 过严变异是否覆盖全部失败方向？恒真风险残余？证据链有无伪造空间/逻辑断点？
3. 收口就绪：以门二身份给终审裁决（PASS/PASS_WITH_WARNINGS/FAIL）+收口前置条件（若有）+给主控的提交面建议（提交信息要素一句话）。对 Kimi 门一 4 NIT 逐条表态（接受/异议）。输出 JSON：{verdict, findings:[{severity,file,line_hint,issue,evidence,suggestion}], summary}。
