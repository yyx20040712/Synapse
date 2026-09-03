# P7E-06 门二终审材料包（标签多选过滤——门一 PWW 终态）

## 0. 材料包构成与审查对象
- 工单=票面 §2；实现=diff（§3——9 改+3 新，其中 3 件受锁配套=票面⑤预扫清单声明+1 件 e2e 配套=实现中申报后主控裁决）；实现者自报=§4。
- 基线：单测 146 文件/1255→**148 文件/1265**（+2 文件+10 用例实测；主控亲复跑 verify exit=0）；locks 265→**268**（+2 unit+1 e2e spec）；e2e 38→**39（全量 39/39 全绿主控亲验**——新 spec 定向 2 passed 后全量复验）。
- **受锁配套四件（[locked-change] 诚实申报）**：①models/paper.ts 契约切换（删 tagId 加 tagIds——票面① Design 裁决）；②papers.repo.test.ts:170-173 单选锚→tagIds:['t-1'] 语义等价迁移（断言值零弱化）；③tag-lifecycle-ui.test.tsx harness 多选形态（selectedTagIds/onFilterChange(ids)——S2/S3 顺序锚 invocationCallOrder 原样保留，null→[]=单元素剔除后空集的等价载荷）；④tag-lifecycle.spec.ts 删除段插一行取消点击（v2 toggle 点新 chip=叠加非换选——先取消改名段选中的「水质监测」恢复换选序列语义，断言面零改）——票面③「e2e 零配套预期」预扫误判，实现者停手申报（禁改 spec 遵守）+快照铁证（pressed=水质监测+列表只甲=叠加交集）后主控裁决配套。
- 实现流程：首轮 DONE（红 9→绿→M1~M4 变异红证还原空）→两项票外申报（tag-lifecycle 红+registry area 笔误——后者=主控建单错误）→主控配套落地→续跑收口（定向双绿+verify 148/1265 exit=0）。
- 审计重点面（主控点名）：①**AND 交集 SQL 正确性**（逐标签 EXISTS 循环+参数绑定——对 diff 推演 [A,B] 交集语义+max(20) 边界）；②**INV-53 剔除语义**（消失 id 剔除非全清+顺序锚不变——T5/T7 推演）；③**受锁配套四件的纯净性**（语义等价迁移论证是否成立——尤其④的换选序列恢复与③的 null→[] 等价性）；④**契约切换删旧的完备性**（tagId 全库残留 grep——UI/类型面零悬挂引用）；⑤T4 单选特例回归面（tag-lifecycle 既有链配套后恢复）。

## 1. 宪法硬规则摘要（AGENTS.md 关键条目）
- 分层单向；跨 feature 互引红线（TagFilter 零 import library.store 既有）；方案切换=删除旧方案（tagId 删——禁双字段并存）；测试是锁定合约（受锁配套=票面/裁决声明最小增量）；文件 ≤500/组件 ≤250；禁新增依赖；禁字符串拼接 SQL（db.prepare+参数绑定）；INV-53 死 id 顺序锚。

## 2. 票面（完整任务书）

# P7E-06 工单票面——标签多选过滤（五层规约）

> registry：`P7E-06` / file `src/renderer/features/tags/TagFilter.tsx` / area renderer / owner strong / open
> 排程真相源=v34 §2 第 1 项（=ROADMAP §P7-E 内序第 6 位——前五项 P7E-01~05 已毕）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging 已加载；门审外链
> gate-call.py 在位——kimi-backup 主用源/deepseek 64k 档直起纪律生效中）。

## ⓪ 出处（无出处默认不工单化——三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：预留点清单
   含「（标签多选过滤）」。
2. ROADMAP §P7-E（docs/ROADMAP.md:387-388）：「阅读时长统计 > 标签多选过滤
   > 智能排序 > 其余……源于代码预留点」。
3. TagFilter.tsx:6 代码预留注记：「选中态变化 → props.onFilterChange
   (tagId | null)（v1 单选标签过滤，多选 v2）」——SR-TAG-02 落地时刻意
   收窄的单选形态，本票兑现 v2。

- **价值**：交叉主题检索是文献库标签系统的核心用法——「机器学习 × 水质」
  两标签交集=精准缩小文献面；单选形态下用户只能反复换选，多选=一次组配。
- **依赖**：tags.store/PaperRow 徽标/library load 链全部既有；INV-53 死 id
  清空链既有（多选形态适配）；零新依赖、零新迁移。
- **风险**：①libraryQuerySchema 契约切换（删 tagId 加 tagIds=「方案切换
  =删除旧方案」红线——受锁 models/paper.ts）；②SQL 多 EXISTS 交集的参数
  绑定形态；③INV-53 顺序锚在多选下的语义适配（消失 id 剔除 vs 全清）；
  ④受锁 golden 三处配套（预扫在档，见⑤）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：AND 交集语义+切换删旧字段+chip toggle

- **采**：多选语义=**AND 交集**（选 [A,B] → 文献须同时挂 A 且挂 B——逐选
  聚焦，与单选「缩小面」意图连续）；chip 左键=toggle 进/出选中集（无选中
  集概念性 UI 新增——选中态视觉沿用单选样式扩展）。
- **否决**（OR 并集）：扩大范围与「过滤=缩小」的用户心智相反（要看全部
  水相关文献时用户会想「换一个更宽的标签」而非「多选并集」）；Zotero 等
  先例同为交集语义。
- **否决**（tagId 保留+tagIds 并行双字段）：两套过滤字段并存=两方案并存
  违反切换红线；tagId 单选=tagIds 单元素特例，UI 面完全覆盖，删旧零功能
  损失。受锁配套三处（预扫清单见⑤）。
- **契约**：libraryQuerySchema **删 `tagId: z.string().optional()`**，
  加 `tagIds: z.array(z.string().min(1)).min(1).max(20).optional()`——
  空选集由 UI 层收敛为 undefined（空数组 schema 级拒收=防歧义）；max(20)
  =单查询爆炸上界（EXISTS 每标签一条，20 条=物理上限级防护）。
- **SQL**（papers.queries.ts buildFilters）：`for (const t of q.tagIds ?? [])
  where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id
  AND pt.tag_id = ?)')`——逐标签 EXISTS AND 交集（既有单条形态的循环
  扩展，预编译参数绑定惯例不变；禁 IN+GROUP BY HAVING 形态——聚合查询
  与既有 where 拼接结构不兼容且语义隐蔽）。
- **UI**：
  - TagFilter props：`selectedTagIds: string[]`（替 selectedTagId）+
    `onFilterChange(ids: string[]): void`（空数组=清除全部选中）；
    onMutated 不变。chip 点击=toggle；再点取消（单选取消语义自然延伸）。
  - FilterBar：`selectedTagIds={query.tagIds ?? []}`+
    `onFilterChange={(ids) => onChange({ tagIds: ids.length > 0 ? ids :
    undefined })}`。
- **INV-53 多选适配**：标签变更（改名/合并/删除）涉及消失 id ∈ 选中集 →
  `onFilterChange(remaining)`（**剔除消失 id**，非全清——其余选中项保持
  有效过滤），剔除后空集→undefined→全列表（自然回退）；顺序锚不变
  （先 onFilterChange 后 onMutated）。
- **申报边界**（票面外不修只记）：①chip 计数静态（选中 A 后 B 的
  paperCount 不显示 A∩B 动态值——既有单选同口径）；②选中集无持久化
  （视图切换丢弃，query 生命周期既有）。

### 态空间跨格序列表（T1~T8——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| T1 | 选 A→选 B（甲挂 A+B/乙挂 A） | 选中集 [A,B]；列表=甲（交集） |
| T2 | T1 后取消 A | 选中集 [B]；列表=挂 B 全部（甲乙） |
| T3 | 全部取消 | onFilterChange([])→FilterBar 收敛 undefined→零过滤全列表 |
| T4 | 单选特例（只选 A） | 行为与 v1 单选等价（回归锚——e2e 既有链不破） |
| T5 | 删除标签 X∈选中集 [X,Y] | onFilterChange([Y]) 先于 onMutated（顺序锚+剔除非全清） |
| T6 | 改名 X∈选中集 [X,Y]（id 不变） | 选中集不变（S5 id 稳定——过滤不动） |
| T7 | 合并 X→Z，X∈选中集 [X,Y] | X 消失→onFilterChange([Y])；Z 不自动入选 |
| T8 | tagIds 超 20 | schema 拒收（zod max(20)——IPC 层防线锚） |

## ② 接口层

一契约字段切换（tagId→tagIds）+一 SQL 循环扩展+TagFilter/FilterBar props
形态；无新通道无新迁移；api-surface/schemas.ts 零动（libraryQuery 在
models/paper.ts——预扫确认）。

## ③ 架构层

- 分层不变；TagFilter 仍零 import library.store（onFilterChange/onMutated
  上抛既有路径）；INV-53 顺序锚保持（先清筛选后通知刷新）。
- 受锁面清单（主控预解锁，配套=票面声明最小增量）：models/paper.ts
  （字段切换）+tests/unit/db/repos/papers.repo.test.ts:170-173（单选过滤
  锚→tagIds: ['t-1'] 语义等价迁移）+tests/unit/renderer/tag-lifecycle-
  ui.test.tsx（harness props 形态适配:46——断言语义零弱化）；新测试收口
  入锁。
- e2e tag-lifecycle.spec 零配套预期（单选交互=多选特例路径——spec 断言
  行为面不断言选中态样式；若实现跑红即停手申报，禁改 spec）。

## ④ 生命周期层

- TagFilter.tsx:6 预留注记兑现修订（「v1 单选，多选 v2」→v2 已兑现+票号）。
- 已知边界（票面外不修只记）：①计数静态（见①申报）；②选中集不持久化。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/repos/papers-multi-tag.test.ts（新） | T1 交集（甲挂 A+B 乙挂 A：[A,B]→只甲）+T4 单元素特例+无 tagIds=零过滤（兼容锚）+T8 max(20) zod 拒收 |
| tests/unit/renderer/tag-filter-multi.test.tsx（新） | T1/T2/T3 toggle 序列+T5/T7 INV-53 剔除与顺序锚（先 onFilterChange 后 onMutated）+T6 id 稳定 |
| tests/e2e/tag-filter-multi.spec.ts（新） | 双文献双标签分化→选两标签交集→取消一个→全清回全列表（真实文本断言） |
| papers.repo.test.ts:170 / tag-lifecycle-ui.test.tsx:46（受锁配套） | 主控派发前已预扫：锚语义等价迁移（['t-1'] 单元素/harness 多选形态）——**主控收口配套或实现者经授权面改**（派发令声明） |

- **变异红证 ≥4 组**（cp 备份法）：M1=SQL 交集改 OR（任一 EXISTS 即命中
  ——T1 乙混入红）；M2=INV-53 全清改剔除反（T5 顺序/值红）；M3=FilterBar
  空数组传 [] 不收敛 undefined（T3 零过滤红——空数组 schema 拒收路径）；
  M4=toggle 只进不出（T2 红）。
- 先红纪律：全量套跑口径先红落盘 scripts/audits/p7e-06-red/；证据
  .raw.txt。
- **锁序纪律**：新测试文件诞生即 locks:generate+apply 先于 verify（预期
  265→268：+2 unit+1 e2e spec；受锁配套三件 hash 变更=预期内）。

## ⑥ 验收

- `npm run verify` 全绿（基线 146 文件 1255 用例滚动，新增数实测申报）。
- e2e 全量（38+1 新 spec=39 预期）全绿（tag-lifecycle 既有链不破=T4 回归锚）。
- 门一 Kimi 外链（backup 源）+门二 deepseek 64k 档异构终审。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- registry P7E-06 翻 done（收口主控单写）；INV-53 多选适配语义在 invariants
  注记补一行（收口主控）。
- 提交尾注：受锁件 [locked-change]（models/paper.ts+两测试配套+新测试件）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（GLM5.3 统一档——环境无 model 参数欠账披露）；门一
  =Kimi K3（backup 源）；门二=deepseek 64k 档直起。
- 实现者禁 git/registry/locks（locks 仅票面⑤锁序纪律明文的 generate+apply
  一次）；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。

## 3. 完整 diff（新文件 add -N 全文）
```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index ee844982b3..580f183410 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-03T12:02:38.0325230Z",
+    "generatedAt":  "2026-09-03T12:31:31.1898257Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -367,7 +367,7 @@
                   },
                   {
                       "path":  "src/shared/models/paper.ts",
-                      "sha256":  "d23abc6e6ebdc04ffa849c1c6fd865d9987574aeafe36cb037b6cb29eb426570"
+                      "sha256":  "9af03c10041f105d569c93f43d9b4debad9106e6062d22324cec313dab174173"
                   },
                   {
                       "path":  "src/shared/models/tag.ts",
@@ -437,9 +437,13 @@
                       "path":  "tests/e2e/smoke.spec.ts",
                       "sha256":  "f36755f6230cec7a2db00d80e8054ea6b60104f46ed4d7f6f28f81be54b54e83"
                   },
+                  {
+                      "path":  "tests/e2e/tag-filter-multi.spec.ts",
+                      "sha256":  "f13292cb36f06e4d00eb5e97694b8514cd8fb2ef585ff91a1ae93b727f8b47fa"
+                  },
                   {
                       "path":  "tests/e2e/tag-lifecycle.spec.ts",
-                      "sha256":  "5a357b431666de0c2a215b3fc6160e09c05e3236c8c2d4eedc1707133c0649c2"
+                      "sha256":  "b5380eaf2d7ff3f6e035f2d390925c0d1ed78684f9a6ff4a2eafbb29873acb37"
                   },
                   {
                       "path":  "tests/e2e/workspaces.spec.ts",
@@ -515,7 +519,11 @@
                   },
                   {
                       "path":  "tests/unit/db/repos/papers.repo.test.ts",
-                      "sha256":  "66a0a103c1c9927e04b79e016933814ca54f7c9a52b9fddf4c5c96ea2e3d8df8"
+                      "sha256":  "330051a81a35893082f2a408cc7544d4b1bc076d5923b3d32dbce9e145b3f05e"
+                  },
+                  {
+                      "path":  "tests/unit/db/repos/papers-multi-tag.test.ts",
+                      "sha256":  "87c684dd66faf6eae741efac898e8b4833ed996f04f17c544c51e989aa5789b7"
                   },
                   {
                       "path":  "tests/unit/db/repos/tags.repo.test.ts",
@@ -849,9 +857,13 @@
                       "path":  "tests/unit/renderer/tab-dirty.test.tsx",
                       "sha256":  "70cc02af0eaae8af638c1bb4ba06d9c7ac777a8acb970edbe6c7fb947abd1e8a"
                   },
+                  {
+                      "path":  "tests/unit/renderer/tag-filter-multi.test.tsx",
+                      "sha256":  "7ab6e2487530901fa915236bb874fbe6d5afd2d6217331b6631ea788f6c558fe"
+                  },
                   {
                       "path":  "tests/unit/renderer/tag-lifecycle-ui.test.tsx",
-                      "sha256":  "7b7b76e6dd0760df108a35c7ee1551bf6affa332abb6bc80b6da2b1c5eaf1766"
+                      "sha256":  "a4857689ba4e8eec813a1cb7d329cbc7fe4a4f2dca0b2a65d293883a09fff736"
                   },
                   {
                       "path":  "tests/unit/renderer/tags.store.test.ts",
diff --git a/src/main/db/repos/papers.queries.ts b/src/main/db/repos/papers.queries.ts
index 948e95e76b..233c524344 100644
--- a/src/main/db/repos/papers.queries.ts
+++ b/src/main/db/repos/papers.queries.ts
@@ -93,9 +93,11 @@ export function buildFilters(q: LibraryQuery): { cond: string; params: unknown[]
     where.push("(p.title LIKE ? ESCAPE '\\' OR p.authors_json LIKE ? ESCAPE '\\')")
     params.push(pat, pat)
   }
-  if (q.tagId !== undefined) {
+  // P7E-06 多选标签过滤：逐标签一条 EXISTS，where 数组 AND 拼接=交集语义
+  // （任一标签缺失即出局；禁 IN+GROUP BY HAVING——与既有拼接结构不兼容）
+  for (const t of q.tagIds ?? []) {
     where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id AND pt.tag_id = ?)')
-    params.push(q.tagId)
+    params.push(t)
   }
   if (q.collectionId !== undefined) {
     where.push(
diff --git a/src/renderer/features/library/FilterBar.tsx b/src/renderer/features/library/FilterBar.tsx
index 482425045d..98fa5bba54 100644
--- a/src/renderer/features/library/FilterBar.tsx
+++ b/src/renderer/features/library/FilterBar.tsx
@@ -4,7 +4,7 @@
  * ── 行为层 ──
  * - FTS 搜索框（useDebounce 300ms 后回写 store.query.search；空串回 undefined 清条件）
  * - 下拉：集合（api.library.collections）、年份（library.store 列表数据推导）、排序三选
- * - TagFilter 组件嵌于此（标签过滤，v1 单选）
+ * - TagFilter 组件嵌于此（标签过滤，P7E-06 多选 AND 交集——空选集收敛 undefined）
  * - P7E-01：TagFilter onMutated 注入 library load（标签改名/合并/删除后行内
  *   tagNames 徽标与筛选计数需重载——跨域回调注入，TagFilter 零 import library.store）
  *
@@ -110,8 +110,8 @@ export function FilterBar(props: {
         </select>
       </div>
       <TagFilter
-        selectedTagId={query.tagId ?? null}
-        onFilterChange={(tagId) => onChange({ tagId: tagId ?? undefined })}
+        selectedTagIds={query.tagIds ?? []}
+        onFilterChange={(ids) => onChange({ tagIds: ids.length > 0 ? ids : undefined })}
         onMutated={() => void loadLibrary()}
       />
     </div>
diff --git a/src/renderer/features/tags/TagFilter.tsx b/src/renderer/features/tags/TagFilter.tsx
index c3bd9d6081..28c93bf7eb 100644
--- a/src/renderer/features/tags/TagFilter.tsx
+++ b/src/renderer/features/tags/TagFilter.tsx
@@ -1,28 +1,32 @@
 /**
- * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak + P7E-01）
+ * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak + P7E-01 + P7E-06）
  *
  * ── 行为层 ──
  * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
- * - 选中态变化 → props.onFilterChange(tagId | null)（v1 单选标签过滤，多选 v2）
+ * - 选中态变化 → props.onFilterChange(ids)（P7E-06 多选 v2 已兑现——v1 单选
+ *   预留注记（TagFilter.tsx:6「多选 v2」）本票落地；AND 交集语义在 SQL 层
+ *   （buildFilters 逐标签 EXISTS），空数组=清除全部选中）
  * - 管理面（P7E-01）：chip 右键 → 菜单（重命名/合并到…/删除）→ 三对话框
  *   （TagLifecycle 拆件承载）；变更成功经 onMutated 上抛（FilterBar 注入
  *   library load——跨域互引红线合规路径，白名单既有）
  *
  * ── 接口层 ──
- * - export function TagFilter(props: { selectedTagId: string | null;
- *     onFilterChange(tagId: string | null): void;
+ * - export function TagFilter(props: { selectedTagIds: string[];
+ *     onFilterChange(ids: string[]): void;
  *     onMutated?: () => void }): JSX.Element
  *
  * ── 架构层 ──
  * - 数据自取：tags.store（挂载 refresh——行为层的"数据 tags.store"为准，建议/
  *   筛选共享单一数据源）；纯展示交互，自身不发其他请求
- * - 死 id 筛选清空顺序（S2/S3）：变更涉及消失 id 且===selectedTagId 时，先
- *   onFilterChange(null)（setQuery 清 tagId→library 自动重载）后 onMutated()
- *   ——顺序反了=死 tagId 查询空列表窗（INV-53）
+ * - 死 id 筛选剔除顺序（S2/S3）：变更涉及消失 id 且∈selectedTagIds 时，先
+ *   onFilterChange(剔除后剩余)（setQuery 清 tagIds→library 自动重载；剔除非
+ *   全清——其余选中项保持有效过滤，INV-53 多选适配）后 onMutated()
+ *   ——顺序反了=死标签 id 查询空列表窗（INV-53）
  *
  * ── 生命周期层 ── / ── 文化层 ──
  * - 空标签库显示引导文案（先在详情侧栏打标签）
- * - 测试：tests/unit/renderer/tag-lifecycle-ui.test.tsx（P7E-01，always-active）
+ * - 测试：tests/unit/renderer/tag-lifecycle-ui.test.tsx（P7E-01）
+ *   +tests/unit/renderer/tag-filter-multi.test.tsx（P7E-06，均 always-active）
  */
 import { useEffect, useRef, useState } from 'react'
 import { showToast } from '../../shared/ui/Toast'
@@ -41,11 +45,11 @@ interface DialogState {
 }
 
 export function TagFilter(props: {
-  selectedTagId: string | null
-  onFilterChange: (tagId: string | null) => void
+  selectedTagIds: string[]
+  onFilterChange: (ids: string[]) => void
   onMutated?: () => void
 }): JSX.Element {
-  const { selectedTagId, onFilterChange, onMutated } = props
+  const { selectedTagIds, onFilterChange, onMutated } = props
   const tags = useTagsStore((s) => s.tags)
   const refresh = useTagsStore((s) => s.refresh)
   const listError = useTagsStore((s) => s.error)
@@ -69,13 +73,14 @@ export function TagFilter(props: {
   }, [listError])
 
   /**
-   * 生命周期变更成功上抛（S2/S3/S4/S5 顺序契约）：
-   * disappearedId=null（rename）或稳定 id（合并目标选中）→筛选不动；
-   * 消失 id===selectedTagId→先 onFilterChange(null) 清死 id，后 onMutated()。
+   * 生命周期变更成功上抛（S2/S3/S4/S5 顺序契约）：disappearedId=null（rename）
+   * 或稳定 id（合并目标选中）→筛选不动；消失 id∈selectedTagIds→先
+   * onFilterChange(剔除后剩余)（剔除非全清——其余选中项保持；空集→UI 层
+   * 收敛 undefined→全列表自然回退），后 onMutated()。
    */
   function handleMutated(disappearedId: string | null): void {
-    if (disappearedId !== null && disappearedId === selectedTagId) {
-      onFilterChange(null)
+    if (disappearedId !== null && selectedTagIds.includes(disappearedId)) {
+      onFilterChange(selectedTagIds.filter((id) => id !== disappearedId))
     }
     onMutated?.()
   }
@@ -90,7 +95,7 @@ export function TagFilter(props: {
   return (
     <div className="flex flex-wrap items-center gap-1" role="group" aria-label="标签筛选">
       {tags.map((t) => {
-        const active = t.id === selectedTagId
+        const active = selectedTagIds.includes(t.id)
         return (
           <button
             key={t.id}
@@ -102,7 +107,11 @@ export function TagFilter(props: {
               background: active ? 'var(--accent-soft)' : 'var(--panel)',
               color: active ? 'var(--accent)' : 'var(--text)'
             }}
-            onClick={() => onFilterChange(active ? null : t.id)}
+            onClick={() =>
+              onFilterChange(
+                active ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
+              )
+            }
             onContextMenu={(e) => {
               e.preventDefault()
               setMenu({ tag: t, anchor: { x: e.clientX, y: e.clientY } })
diff --git a/src/shared/models/paper.ts b/src/shared/models/paper.ts
index 368892b7d8..962d6af1ba 100644
--- a/src/shared/models/paper.ts
+++ b/src/shared/models/paper.ts
@@ -72,7 +72,10 @@ export type LibrarySort = z.infer<typeof librarySortSchema>
 export const libraryQuerySchema = z
   .object({
     search: z.string().max(200).optional(), // FTS：标题/摘要/作者
-    tagId: z.string().optional(),
+    // P7E-06 多选标签过滤（AND 交集）：tagId 单选已删（方案切换=删除旧方案——
+    // 单选=单元素特例，UI 面完全覆盖）；空选集由 UI 层收敛 undefined，空数组
+    // schema 级拒收=防歧义；max(20)=单查询爆炸上界（EXISTS 每标签一条）
+    tagIds: z.array(z.string().min(1)).min(1).max(20).optional(),
     collectionId: z.string().optional(),
     year: z.number().int().optional(),
     sort: librarySortSchema.default('added_desc'),
diff --git a/tests/e2e/tag-filter-multi.spec.ts b/tests/e2e/tag-filter-multi.spec.ts
new file mode 100644
index 0000000000..8beb1e1e98
--- /dev/null
+++ b/tests/e2e/tag-filter-multi.spec.ts
@@ -0,0 +1,80 @@
+import { test, expect } from '@playwright/test'
+import { mkdtemp } from 'node:fs/promises'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { launch, seedPaperRow } from './e2e-env'
+
+/**
+ * [P7E-06] 标签多选过滤 e2e（always-active，无工单门）。
+ *
+ * 链路：种子三篇（甲挂 A+B/乙挂 A/丙无标签——交集分化+全列表对照锚）→
+ * UI 打标签→选两标签（AND 交集→列表只甲）→取消一个（[A]→甲乙）→全清
+ * （空选集收敛 undefined→甲乙丙全回归）。三态列表用 .lib-card 计数锚
+ * （自带重试=load 完成锚，防 loading 空窗误判缺席）+真实文本断言。
+ */
+test('标签多选过滤：两标签交集→取消一个→全清回全列表', async () => {
+  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e6-'))
+
+  // 第一跳：应用自建库表（tag-lifecycle.spec 同配方——不 import src 内部模块）
+  const seedApp = await launch(userData)
+  await (await seedApp.firstWindow()).waitForTimeout(500)
+  await seedApp.close()
+
+  // 三篇种子（甲乙=票面双文献双标签分化主体；丙=全列表对照锚——三态列表可区分）
+  const papers = [
+    { id: 'e2e-p7e6-a', title: 'P7E06 甲文献', sha: 'a'.repeat(64) },
+    { id: 'e2e-p7e6-b', title: 'P7E06 乙文献', sha: 'b'.repeat(64) },
+    { id: 'e2e-p7e6-c', title: 'P7E06 丙文献', sha: 'c'.repeat(64) }
+  ] as const
+  for (const p of papers) {
+    const fileRef = `${p.sha.slice(0, 2)}/${p.sha.slice(2, 4)}/${p.sha}.pdf`
+    await seedPaperRow(userData, fileRef, p.sha, p.title, p.id)
+  }
+
+  const app = await launch(userData)
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+
+  // —— UI 打标签：甲=「多选A」+「多选B」；乙=「多选A」（tag-lifecycle.spec 同法）——
+  const tagInput = win.getByLabel('新增标签')
+  async function tagPaper(title: string, ...names: string[]): Promise<void> {
+    await win.getByText(title).first().click()
+    for (const name of names) {
+      await tagInput.fill(name)
+      await tagInput.press('Enter')
+      await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
+    }
+  }
+  await tagPaper('P7E06 甲文献', '多选A', '多选B')
+  await tagPaper('P7E06 乙文献', '多选A')
+
+  // 视图切换强制 LibraryPage 卸载/重挂→TagFilter refresh（chips 就位——既有契约）
+  await win.getByRole('button', { name: '脉络', exact: true }).click()
+  await win.getByRole('button', { name: '文献库' }).click()
+  await expect(win.getByRole('button', { name: '多选A（2）' })).toBeVisible({ timeout: 10_000 })
+  await expect(win.getByRole('button', { name: '多选B（1）' })).toBeVisible({ timeout: 10_000 })
+
+  // —— 交集 [A,B]：列表只甲（乙=单挂 A 出局、丙=无标签出局）——
+  await win.getByRole('button', { name: '多选A（2）' }).click()
+  await win.getByRole('button', { name: '多选B（1）' }).click()
+  await expect(win.locator('.lib-card')).toHaveCount(1, { timeout: 10_000 })
+  await expect(win.getByText('P7E06 甲文献').first()).toBeVisible()
+  await expect(win.getByText('P7E06 乙文献')).toHaveCount(0)
+  await expect(win.getByText('P7E06 丙文献')).toHaveCount(0)
+
+  // —— 取消 B → [A]：甲乙在场（丙仍出局——与全清态区分的对照锚）——
+  await win.getByRole('button', { name: '多选B（1）' }).click()
+  await expect(win.locator('.lib-card')).toHaveCount(2, { timeout: 10_000 })
+  await expect(win.getByText('P7E06 甲文献').first()).toBeVisible()
+  await expect(win.getByText('P7E06 乙文献').first()).toBeVisible()
+  await expect(win.getByText('P7E06 丙文献')).toHaveCount(0)
+
+  // —— 全清 → 空选集收敛 undefined：甲乙丙全回归（零过滤全列表）——
+  await win.getByRole('button', { name: '多选A（2）' }).click()
+  await expect(win.locator('.lib-card')).toHaveCount(3, { timeout: 10_000 })
+  for (const t of ['P7E06 甲文献', 'P7E06 乙文献', 'P7E06 丙文献']) {
+    await expect(win.getByText(t).first()).toBeVisible({ timeout: 10_000 })
+  }
+
+  await app.close()
+})
diff --git a/tests/e2e/tag-lifecycle.spec.ts b/tests/e2e/tag-lifecycle.spec.ts
index ee2fdaaf04..1a3d57b00a 100644
--- a/tests/e2e/tag-lifecycle.spec.ts
+++ b/tests/e2e/tag-lifecycle.spec.ts
@@ -91,6 +91,10 @@ test('标签生命周期：改名→合并→删除（chip/行徽标真实文本
   await expect(win.getByRole('button', { name: '水质（2）' })).toBeVisible({ timeout: 10_000 })
 
   // —— 删除：选中「水质」→筛选只剩甲乙（丙被滤掉）；删除后死筛选自动清空→全列表 ——
+  // P7E-06 配套：v2 多选 toggle 下「点新 chip」=叠加非换选——先取消改名段
+  // 选中的「水质监测」（:62 点选其前身「水治」，id 稳定延续），恢复本段
+  // 「单选水质」的换选序列语义（选中集=[水质]，甲乙均挂）
+  await win.getByRole('button', { name: '水质监测（1）' }).click()
   await win.getByRole('button', { name: '水质（2）' }).click()
   // 先锚列表加载完成再断缺席（loading 中 rows 为空≠被滤掉——workspaces.spec 回炉教训）
   await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
diff --git a/tests/unit/db/repos/papers-multi-tag.test.ts b/tests/unit/db/repos/papers-multi-tag.test.ts
new file mode 100644
index 0000000000..2143e4fbfc
--- /dev/null
+++ b/tests/unit/db/repos/papers-multi-tag.test.ts
@@ -0,0 +1,85 @@
+import { beforeEach, describe, expect, it } from 'vitest'
+import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
+import { libraryQuerySchema } from '../../../../src/shared/models/paper'
+import type { SqliteDb } from '../../../../src/main/db/connection'
+import { createTestDb } from '../../../utils/fixtures'
+
+/** [P7E-06] 标签多选过滤（tagIds AND 交集）——repo 层态空间锚。
+ *  always-active 裸 describe（SR2-ENR-01 同口径，K3：不经 guardedDescribe 守卫）。
+ *  T1 交集=逐标签 EXISTS AND（任一缺失即出局）；T4 单元素=单选等价特例；
+ *  无 tagIds=零过滤兼容锚；T8 schema 上界（>20 拒收）+空数组拒收
+ *  （min(1)——UI 层收敛 undefined，schema 级防歧义防线，M3 变异锚）。
+ */
+function row(over: Partial<PaperRow> = {}): PaperRow {
+  return {
+    id: over.id ?? 'p-1',
+    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
+    sha256: over.sha256 ?? 'sha-aaa',
+    title: over.title ?? '甲文献',
+    authors_json: over.authors_json ?? '["张三"]',
+    year: over.year ?? 2025,
+    venue: over.venue ?? '水利学报',
+    doi: over.doi ?? '10.1000/demo',
+    arxiv_id: over.arxiv_id ?? null,
+    abstract: over.abstract ?? '摘要',
+    source: over.source ?? 'local',
+    enrich_status: over.enrich_status ?? 'pending',
+    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
+    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
+    last_read_page: over.last_read_page ?? 0
+  }
+}
+
+describe('P7E-06 标签多选过滤（tagIds AND 交集）', () => {
+  let db: SqliteDb
+  let repo: ReturnType<typeof createPapersRepo>
+
+  beforeEach(() => {
+    db = createTestDb()
+    repo = createPapersRepo(db)
+  })
+
+  /** 种子：甲挂 A+B、乙挂 A（票面 T1 分化主体——单挂乙是交集判定的混入探针） */
+  const seedPair = (): void => {
+    repo.insert(row({ id: 'p-1', title: '甲文献', added_at: '2026-01-01T00:00:00Z' }))
+    repo.insert(row({ id: 'p-2', sha256: 'sha-bbb', title: '乙文献', added_at: '2026-01-02T00:00:00Z' }))
+    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-a','水质')`).run()
+    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-b','机器学习')`).run()
+    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-a')`).run()
+    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-b')`).run()
+    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-2','t-a')`).run()
+  }
+
+  it('T1 交集：tagIds=[A,B] 只命中同时双挂的甲（单挂乙不混入）', () => {
+    seedPair()
+    const r = repo.searchSummaries({ tagIds: ['t-a', 't-b'], sort: 'added_desc', offset: 0, limit: 50 })
+    expect(r.items.map((i) => i.id)).toEqual(['p-1'])
+    expect(r.total).toBe(1)
+  })
+
+  it('T4 单元素特例：tagIds=[A] 命中挂 A 全部（甲乙——与 v1 单选行为等价）', () => {
+    seedPair()
+    const r = repo.searchSummaries({ tagIds: ['t-a'], sort: 'added_desc', offset: 0, limit: 50 })
+    expect(r.items.map((i) => i.id)).toEqual(['p-2', 'p-1'])
+    expect(r.total).toBe(2)
+  })
+
+  it('兼容锚：无 tagIds = 零标签过滤（全量返回，既有查询面不受契约切换影响）', () => {
+    seedPair()
+    const r = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
+    expect(r.items.map((i) => i.id)).toEqual(['p-2', 'p-1'])
+  })
+
+  it('T8 schema 上界：tagIds 含 21 个元素拒收（max(20)——单查询爆炸上界）', () => {
+    const ids = Array.from({ length: 21 }, (_, i) => `t-${i + 1}`)
+    expect(() => libraryQuerySchema.parse({ tagIds: ids, sort: 'added_desc', offset: 0, limit: 50 })).toThrow()
+    // 上界内（恰 20）放行——边界两侧各锚一爪
+    expect(() =>
+      libraryQuerySchema.parse({ tagIds: ids.slice(0, 20), sort: 'added_desc', offset: 0, limit: 50 })
+    ).not.toThrow()
+  })
+
+  it('空数组拒收（min(1) 防歧义——空选集由 UI 层收敛 undefined，不得进查询通道）', () => {
+    expect(() => libraryQuerySchema.parse({ tagIds: [], sort: 'added_desc', offset: 0, limit: 50 })).toThrow()
+  })
+})
diff --git a/tests/unit/db/repos/papers.repo.test.ts b/tests/unit/db/repos/papers.repo.test.ts
index 770b6b87bb..4100c570cd 100644
--- a/tests/unit/db/repos/papers.repo.test.ts
+++ b/tests/unit/db/repos/papers.repo.test.ts
@@ -167,10 +167,10 @@ guardedDescribe(
         expect(p1?.noteCount).toBe(1)
       })
 
-      it('tagId 过滤命中挂接文献', () => {
+      it('tagIds 过滤命中挂接文献（P7E-06 契约切换：单元素=单选语义等价）', () => {
         db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1','必读')`).run()
         db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-2','t-1')`).run()
-        const r = repo.searchSummaries({ tagId: 't-1', sort: 'added_desc', offset: 0, limit: 50 })
+        const r = repo.searchSummaries({ tagIds: ['t-1'], sort: 'added_desc', offset: 0, limit: 50 })
         expect(r.items.map((i) => i.id)).toEqual(['p-2'])
       })
     })
diff --git a/tests/unit/renderer/tag-filter-multi.test.tsx b/tests/unit/renderer/tag-filter-multi.test.tsx
new file mode 100644
index 0000000000..b49b4c1d31
--- /dev/null
+++ b/tests/unit/renderer/tag-filter-multi.test.tsx
@@ -0,0 +1,260 @@
+// @vitest-environment jsdom
+/**
+ * [P7E-06] TagFilter 多选过滤（AND 交集 chip toggle）+ FilterBar 装配收敛
+ * （always-active 裸 describe——K3 威胁不经 guardedDescribe）。
+ *
+ * T1/T2/T3 组件级 toggle 序列（受控回流——选中集演化载荷）+ aria-pressed 多选
+ * 视觉锚；T5 删除选中集成员=剔除非全清（onFilterChange(remaining) 先于
+ * onMutated——INV-53 顺序锚多选形态）；T6 改名 id 稳定筛选零动；T7 合并源∈
+ * 选中集=剔除且目标不自动入选；T3 装配级=FilterBar 空数组收敛 undefined
+ * （schema 拒收 [] 的 UI 侧防线——M3 变异锚）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import type * as clientModule from '../../../src/renderer/api/client'
+import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
+
+const { stubApi, toastSpy } = vi.hoisted(() => ({
+  stubApi: {
+    library: { collections: vi.fn() },
+    tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn() }
+  },
+  toastSpy: vi.fn()
+}))
+vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
+  const real = await importOriginal<typeof clientModule>()
+  return { ...real, api: stubApi as unknown as typeof clientModule.api }
+})
+vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
+  const real = await importOriginal<typeof toastModule>()
+  return { ...real, showToast: toastSpy }
+})
+
+import { TagFilter } from '../../../src/renderer/features/tags/TagFilter'
+import { FilterBar } from '../../../src/renderer/features/library/FilterBar'
+import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
+import type { LibraryQuery } from '../../../src/shared/models/paper'
+import type { Tag } from '../../../src/shared/models/tag'
+
+type TagWithCount = Tag & { paperCount: number }
+
+// act() 环境声明（tag-lifecycle-ui 同口径——免 React 警告刷屏）
+;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+let currentTags: TagWithCount[] = []
+
+function tag(id: string, name: string, paperCount: number): TagWithCount {
+  return { id, name, paperCount }
+}
+
+/** 首次挂载建 host/root；后续调用=同 root 受控重渲染（选中集回流） */
+async function renderFilter(
+  selectedTagIds: string[],
+  onFilterChange: (ids: string[]) => void,
+  onMutated?: () => void
+): Promise<void> {
+  if (root === null) {
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+  }
+  await act(async () => {
+    root?.render(
+      <TagFilter selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
+    )
+  })
+}
+
+/** 按精确文本找按钮（chip 与对话框按钮通用；scope 缺省=整树） */
+function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
+  const base: ParentNode = scope ?? host ?? document
+  return [...base.querySelectorAll('button')].find((b) => b.textContent === text)
+}
+
+async function clickChip(chipText: string): Promise<void> {
+  const btn = buttonByText(chipText)
+  expect(btn, `chip 存在：${chipText}`).toBeDefined()
+  await act(async () => {
+    btn?.click()
+  })
+}
+
+/** chip 右键开菜单（React onContextMenu——冒泡 contextmenu 事件） */
+async function rightClick(chipText: string): Promise<void> {
+  const btn = buttonByText(chipText)
+  expect(btn, `chip 存在：${chipText}`).toBeDefined()
+  await act(async () => {
+    btn!.dispatchEvent(
+      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
+    )
+  })
+  expect(host?.querySelector('[data-testid="tag-menu"]'), '右键后菜单在场').not.toBeNull()
+}
+
+function dialog(): HTMLElement | null {
+  return host?.querySelector('[role="dialog"]') ?? null
+}
+
+/** 受控 input 打字（原生 setter+input 事件——React 受控组件 jsdom 标准法） */
+async function setType(input: HTMLInputElement, text: string): Promise<void> {
+  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
+  await act(async () => {
+    setter?.call(input, text)
+    input.dispatchEvent(new Event('input', { bubbles: true }))
+  })
+}
+
+async function renderBar(query: LibraryQuery, onChange: (patch: Partial<LibraryQuery>) => void): Promise<void> {
+  if (root === null) {
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+  }
+  await act(async () => {
+    root?.render(<FilterBar query={query} onChange={onChange} />)
+  })
+}
+
+beforeEach(() => {
+  vi.clearAllMocks()
+  currentTags = []
+})
+
+afterEach(async () => {
+  await act(async () => {
+    root?.unmount()
+  })
+  host?.remove()
+  root = null
+  host = null
+})
+
+describe('P7E-06 TagFilter 多选过滤（toggle/剔除/顺序锚）', () => {
+  it('T1/T2/T3 toggle 序列：进→并集→退出→全清，载荷=选中集演化且 aria-pressed 同步', async () => {
+    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    await renderFilter([], onFilterChange)
+    // T1 前半：选 A → 选中集 [A]
+    await clickChip('水质（2）')
+    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a'])
+    await renderFilter(['t-a'], onFilterChange)
+    // T1 后半：选 B → 选中集 [A,B]（进入序保持）
+    await clickChip('机器学习（1）')
+    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a', 't-b'])
+    await renderFilter(['t-a', 't-b'], onFilterChange)
+    // 多选视觉锚：两 chip 均 pressed
+    expect(buttonByText('水质（2）')?.getAttribute('aria-pressed')).toBe('true')
+    expect(buttonByText('机器学习（1）')?.getAttribute('aria-pressed')).toBe('true')
+    // T2：取消 A → 选中集 [B]
+    await clickChip('水质（2）')
+    expect(onFilterChange).toHaveBeenLastCalledWith(['t-b'])
+    await renderFilter(['t-b'], onFilterChange)
+    expect(buttonByText('水质（2）')?.getAttribute('aria-pressed')).toBe('false')
+    expect(buttonByText('机器学习（1）')?.getAttribute('aria-pressed')).toBe('true')
+    // T3 组件级：再取消 B → onFilterChange([])（空数组=清除全部选中）
+    await clickChip('机器学习（1）')
+    expect(onFilterChange).toHaveBeenLastCalledWith([])
+  })
+
+  it('T5 删除选中集成员：onFilterChange(剔除后剩余) 先于 onMutated（顺序锚多选形态）', async () => {
+    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    const onMutated = vi.fn()
+    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
+    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
+    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [tag('t-y', '乙', 1)] })
+    await rightClick('甲（2）')
+    await act(async () => {
+      buttonByText('删除')?.click()
+    })
+    await act(async () => {
+      buttonByText('确认删除', dialog()!)?.click()
+    })
+    expect(onFilterChange).toHaveBeenCalledTimes(1)
+    // 剔除非全清：消失 id 出局、其余选中项保持（票面① INV-53 多选适配）
+    expect(onFilterChange).toHaveBeenCalledWith(['t-y'])
+    expect(onMutated).toHaveBeenCalledTimes(1)
+    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
+    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
+    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
+    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
+    expect(filterOrder!).toBeLessThan(mutatedOrder!)
+  })
+
+  it('T6 改名选中集成员（id 稳定）：筛选零动（onFilterChange 不调用），仅 onMutated', async () => {
+    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    const onMutated = vi.fn()
+    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
+    stubApi.tags.rename.mockResolvedValue({ ok: true as const, data: { id: 't-x', name: '新甲' } })
+    await rightClick('甲（2）')
+    await act(async () => {
+      buttonByText('重命名')?.click()
+    })
+    const input = dialog()?.querySelector('input') ?? null
+    expect(input, '重命名输入框在场').not.toBeNull()
+    await setType(input!, '新甲')
+    await act(async () => {
+      buttonByText('保存', dialog()!)?.click()
+    })
+    await act(async () => {
+      await new Promise((r) => setTimeout(r, 0))
+    })
+    expect(onFilterChange).not.toHaveBeenCalled()
+    expect(onMutated).toHaveBeenCalledTimes(1)
+  })
+
+  it('T7 合并源∈选中集：源剔除且目标不自动入选（载荷恰=剩余集，顺序锚保持）', async () => {
+    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1), tag('t-z', '丙', 3)]
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    const onFilterChange = vi.fn()
+    const onMutated = vi.fn()
+    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
+    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
+    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [tag('t-y', '乙', 1), tag('t-z', '丙', 5)] })
+    await rightClick('甲（2）')
+    await act(async () => {
+      buttonByText('合并到…')?.click()
+    })
+    await act(async () => {
+      buttonByText('丙（3）', dialog()!)?.click()
+    })
+    expect(onFilterChange).toHaveBeenCalledTimes(1)
+    // 剔除 t-x、t-y 保持、t-z 不自动入选——载荷恰为剩余集
+    expect(onFilterChange).toHaveBeenCalledWith(['t-y'])
+    expect(onMutated).toHaveBeenCalledTimes(1)
+    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
+    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
+    expect(filterOrder!).toBeLessThan(mutatedOrder!)
+  })
+})
+
+describe('P7E-06 FilterBar 装配收敛（tagIds 形态）', () => {
+  it('T3 装配级：点选→onChange({tagIds})；全清→onChange({tagIds: undefined})（空数组不进查询）', async () => {
+    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
+    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
+    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
+    stubApi.library.collections.mockResolvedValue({ ok: true as const, data: [] })
+    const onChange = vi.fn()
+    const base: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }
+    await renderBar(base, onChange)
+    // 点选 A：收敛为数组形态
+    await clickChip('水质（2）')
+    expect(onChange).toHaveBeenLastCalledWith({ tagIds: ['t-a'] })
+    // 受控回流（父 setQuery 后 query.tagIds=['t-a']）
+    await renderBar({ ...base, tagIds: ['t-a'] }, onChange)
+    // 再点 A：toggle 出→空数组→收敛 undefined（零过滤，schema 级拒收 [] 的 UI 侧防线）
+    await clickChip('水质（2）')
+    expect(onChange).toHaveBeenLastCalledWith({ tagIds: undefined })
+  })
+})
diff --git a/tests/unit/renderer/tag-lifecycle-ui.test.tsx b/tests/unit/renderer/tag-lifecycle-ui.test.tsx
index 2b4173ada0..f964a748ab 100644
--- a/tests/unit/renderer/tag-lifecycle-ui.test.tsx
+++ b/tests/unit/renderer/tag-lifecycle-ui.test.tsx
@@ -2,8 +2,8 @@
 /**
  * [P7E-01] TagFilter 管理面（always-active）：chip 右键菜单+三对话框接线。
  *
- * S2/S3：删除/合并源=选中标签时，onFilterChange(null) 必须先于 onMutated()
- * （invocationCallOrder 锚——顺序反了=死 tagId 查询空列表窗）；S4：合并目标=
+ * S2/S3：删除/合并源=选中标签时，onFilterChange(剔除后空集) 必须先于 onMutated()
+ * （invocationCallOrder 锚——顺序反了=死标签 id 查询空列表窗）；S4：合并目标=
  * 选中时筛选不动；S8：对话框提交双击 busy 守卫防重复提交；S9：tags.length===1
  * 时「合并到…」菜单项禁用。
  * [门一回炉补锚] W3：菜单 Esc 关闭（keydown 契约）；N1：delete 提交飞行中
@@ -42,8 +42,8 @@ let host: HTMLDivElement | null = null
 let currentTags: TagWithCount[] = []
 
 async function render(
-  selectedTagId: string | null,
-  onFilterChange: (tagId: string | null) => void,
+  selectedTagIds: string[],
+  onFilterChange: (ids: string[]) => void,
   onMutated?: () => void
 ): Promise<void> {
   useTagsStore.setState({ tags: currentTags, loading: false, error: null })
@@ -53,7 +53,7 @@ async function render(
   root = createRoot(host)
   await act(async () => {
     root?.render(
-      <TagFilter selectedTagId={selectedTagId} onFilterChange={onFilterChange} onMutated={onMutated} />
+      <TagFilter selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
     )
   })
 }
@@ -119,16 +119,17 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     ]
     const onFilterChange = vi.fn()
     const onMutated = vi.fn()
-    await render('t-1', onFilterChange, onMutated)
+    await render(['t-1'], onFilterChange, onMutated)
     stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
     stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
     await rightClick('甲（2）')
     await click(buttonByText('删除'), '菜单·删除')
     await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
     expect(onFilterChange).toHaveBeenCalledTimes(1)
-    expect(onFilterChange).toHaveBeenCalledWith(null)
+    // 单选锚语义等价迁移（P7E-06）：选中集恰 [t-1]→剔除后空集=清除全部（v1 为 null）
+    expect(onFilterChange).toHaveBeenCalledWith([])
     expect(onMutated).toHaveBeenCalledTimes(1)
-    // 顺序锚（S2）：先清筛选（setQuery 清 tagId→library 自动重载）后通知 library 刷新
+    // 顺序锚（S2）：先清筛选（setQuery 清 tagIds→library 自动重载）后通知 library 刷新
     const filterOrder = onFilterChange.mock.invocationCallOrder[0]
     const mutatedOrder = onMutated.mock.invocationCallOrder[0]
     expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
@@ -143,7 +144,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     ]
     const onFilterChange = vi.fn()
     const onMutated = vi.fn()
-    await render('t-2', onFilterChange, onMutated)
+    await render(['t-2'], onFilterChange, onMutated)
     stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
     stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
     await rightClick('甲（2）')
@@ -160,7 +161,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     ]
     const onFilterChange = vi.fn()
     const onMutated = vi.fn()
-    await render('t-1', onFilterChange, onMutated)
+    await render(['t-1'], onFilterChange, onMutated)
     stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
     stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
     await rightClick('甲（2）')
@@ -168,7 +169,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     expect(dialog(), '合并对话框在场').not.toBeNull()
     await click(buttonByText('乙（1）', dialog()!), '对话框·目标 chip 乙（1）')
     expect(stubApi.tags.merge).toHaveBeenCalledWith({ sourceId: 't-1', targetId: 't-2' })
-    expect(onFilterChange).toHaveBeenCalledWith(null)
+    expect(onFilterChange).toHaveBeenCalledWith([])
     const filterOrder = onFilterChange.mock.invocationCallOrder[0]
     const mutatedOrder = onMutated.mock.invocationCallOrder[0]
     expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
@@ -184,7 +185,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     ]
     const onFilterChange = vi.fn()
     const onMutated = vi.fn()
-    await render('t-2', onFilterChange, onMutated)
+    await render(['t-2'], onFilterChange, onMutated)
     stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
     stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
     await rightClick('甲（2）')
@@ -198,7 +199,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
     currentTags = [{ id: 't-1', name: '甲', paperCount: 1 }]
     const onFilterChange = vi.fn()
     const onMutated = vi.fn()
-    await render(null, onFilterChange, onMutated)
+    await render([], onFilterChange, onMutated)
     let resolveRename!: (v: unknown) => void
     stubApi.tags.rename.mockImplementation(
       () => new Promise((r) => { resolveRename = r })
@@ -227,7 +228,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
 
   it('S9 tags.length===1 时菜单「合并到…」禁用（无其他目标）', async () => {
     currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
-    await render(null, vi.fn(), vi.fn())
+    await render([], vi.fn(), vi.fn())
     await rightClick('甲（0）')
     const mergeBtn = buttonByText('合并到…')
     expect(mergeBtn, '菜单项在场').toBeDefined()
@@ -236,7 +237,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
 
   it('W3：菜单开→按 Escape→菜单关闭（keydown 关闭契约，unmount 清理）', async () => {
     currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
-    await render(null, vi.fn(), vi.fn())
+    await render([], vi.fn(), vi.fn())
     await rightClick('甲（0）')
     expect(host?.querySelector('[data-testid="tag-menu"]'), '菜单在场').not.toBeNull()
     await act(async () => {
@@ -247,7 +248,7 @@ describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
 
   it('N1：delete 提交飞行中取消被阻断（按钮禁用+Esc/遮罩 onClose no-op），resolve 成功后才关', async () => {
     currentTags = [{ id: 't-1', name: '甲', paperCount: 2 }]
-    await render(null, vi.fn(), vi.fn())
+    await render([], vi.fn(), vi.fn())
     let resolveDelete!: (v: unknown) => void
     stubApi.tags.delete.mockImplementation(
       () => new Promise((r) => { resolveDelete = r })
diff --git a/tickets/registry.ts b/tickets/registry.ts
index 8a8a7e7c22..b2125e9815 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -237,6 +237,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'P7E-03', file: 'src/renderer/features/reader/ReaderToolbar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页内高亮搜索（P7-E 预留点清扫三票；b3: P7-E+B1 §3 预留 ReaderToolbar.tsx:7,163+ReaderShortcuts.ts:38；Design=索引全文档（逐页 getTextContent 文本域，未渲染页也计数）+高亮仅渲染窗口（TextLayer DOM span 建 Range 取 clientRects——pdfjs 4.10 每项恰一 span 前提，数量不符降级零高亮只计数）+代际守卫（submit 自增/close/reset 失效）+ReaderToolbar searchBox slot 兑现占位（缺席=旧占位兜底——受锁夹具零破坏）+ctrl+f 独立 keymap id reader-search（不经 ReaderShortcuts 受锁面）；新五源文件（reader-search.ts 纯函数域/store/ReaderSearchBox/SearchHighlightLayer/useReaderSearch）+Enter 提交制（再按=下一处/Shift+Enter 上一处/Esc 关）+两段式滚动（pageTurner→setPage scroll:to 页盒顶+active scrollIntoView 居中）；态空间 S1~S12 逐格锚+INV-55 登记；门一 Kimi FAIL 1B/3W/5N→回炉 R1 七修（S11 MO 重算锚+M6 代偿/bindDoc 会话身份记账修重挂漏洞/lastCentered store 记账防滚动劫持/wiring 三测/逐项安全降小写/S2 spy/descriptor 还原）→复核 PWW 新 2W→回炉 R2 三改（Enter trim 比较/IME isComposing 守卫——中文主路径/非保长语料注释诚实化）→定点复核 PASS 零发现+门二 deepseek PASS 零发现（首调 32k 截断 PARSE_ERROR→64k 重试通过）；实现者 GLM5.3 统一档三轮 ~32.0M tok（环境无 model 参数欠账披露）；单测 140 文件 1219（既有实测 136/1163——v31 基线 135 勘误+56 新增）/locks 256（251+5）/e2e 36（35+1）；环境事件=e2e 超时硬杀砸中 seedPaperRow 换绑窗（绑定残留已恢复+md5 亲验 electron-v146——隐患记档属受锁共享面）；票面 scripts/audits/p7e-03-brief.md+报告+三轮门审档在案）' },
   { id: 'P7E-04', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '导出剪贴板（P7-E 预留点清扫四票；b3: P7-E+B1 §3 预留 export.service.ts:27；Design=单通道 export/clipboard（format bibtex|csv 枚举+paperIds schema min(1) 空选集拒）+main 侧构建 main 侧写（内容不过 renderer——deps.clipboard 注入 electron.clipboard）+构建器单源（buildBibtex/buildCsv 直用零改）+先构建后写（失败零剪贴板副作用）+无对话框无 CANCELLED；PaperDetailPanel 248 贴 250 红线→usePaperDetailActions hook 拆件（215 行,受锁 paper-detail-export.test 零改全绿=拆件判据）+复制 BibTeX/复制 CSV 两按钮；态空间 E1~E8+INV-56 登记（构建器单源/剪贴板写单口/先构建后写/可选注入还原项）；门一 Kimi PWW(0B/1W/4N)→回炉 R1 三修（console.error 观测/ClipboardReq 死导出删/头注 C-06 票外叙述回退）→复核 PASS+门二 deepseek PASS 零发现；实现者 GLM5.3 统一档两轮 8.25M tok（环境无 model 参数欠账披露）；诚实申报在档=两受锁件 chmod 编辑（主控派发令误称预解锁——收口 reapply 收账）+IpcDeps.clipboard 可选化（受锁 makeIpcDeps 桩工厂禁改+响亮守卫——还原项登记）；单测 142 文件 1231（+2 文件+12 用例）/locks 259（256+3）/e2e 37（36+1——主进程 clipboard.readText 读回 P7-A 先例+清场竞态防线）；票面 scripts/audits/p7e-04-brief.md+报告+两门审档在案）' },
   { id: 'P7E-05', file: 'src/main/services/reader.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '阅读时长统计（P7-E 预留点清扫五票；Design=搭车 saveProgress 单通道（secondsDelta int 0..3600 optional——旧载荷零兼容）+008 迁移（预留写 002 勘误实落 008）+reading-time.ts 独立模块（deps 注入 crib scroll-progress）+复合 flusher（进度页+时长账单 invoke）+repo 原子累加（reading_seconds=reading_seconds+?）+ready×visible 双计时门+chunkSeconds 3600 分片单源三消费点；态空间 R1~R10+跨格锚（R3×R6/4000 分片/dispose 双 invoke/可见零头结转）+INV-57 登记（含注记面四件：R7 双 invoke/分片级部分丢失/无 24h 钳制/sec<0 不可达）；三屋全程=首轮 BLOCKED（票面×受锁 golden 双死结：migrate.test [1..7] 断言+10 件 PaperDetail 字面量）→主控 [locked-change] 12 件配套（migrate.test [1..8]+lineage-tags 7→8+10 字面量补字段——零断言语义弱化）→TDD 全流程（首红 5/1235→绿→M1~M4）→R1 主控亲验回炉（settle force 不检查 isVisible=hidden 段虚计）→R2 门一 BLOCKING 回炉（3600 上界×收尾口回吐结构冲突——invokeOne 分片+M6）→R3 门二 BLOCKING+WARN 回炉（dispose 尾账未分片同型漏点→chunkSeconds 单源三消费点+M7；settle 吸收/结转绑死→解耦+锚语义随裁决变更）；M2 变异载体失效转移 M5 实录（防线冗余实证）；门一 Kimi（kimi-backup，主源 504 换源）FAIL（1B+3N）→R2→复审 PASS；门二 deepseek 64k 档 FAIL（1B+1W）→R3→复审 PASS_WITH_WARNINGS（落盘静默=既有尽力而为规约归注记）；主控亲验=TagEditor key 修复（e2e tag-lifecycle 确定性红两次复跑+回退 Panel 对照实证=既有竞态被本票加行踩宽——挂接点 key={detail.id} 会话身份语义，挂错文献正确性缺陷非仅测试面）+R3 超回炉上限 ≤2 超额披露（门一/门二各贡献独立轮非同案缠讼，人类复核可否决）；实现者 GLM5.3 统一档五轮 30.4M tok；verify 146 文件 1255（+4 文件+24 用例）/locks 265（259+6：4 unit+1 e2e spec+1 sql）/e2e 38 全绿（37+1——主控亲验三跑）；票面 scripts/audits/p7e-05-brief.md+报告 p7e-05-impl.report.md+两门审档在案）' },
+  { id: 'P7E-06', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'strong', status: 'open', summary: '标签多选过滤（P7-E 预留点清扫六票；b3: P7-E+B1 §3:47 预留+TagFilter.tsx:6「v1 单选，多选 v2」代码预留；Design=AND 交集+切换删旧 tagId 加 tagIds（array min1 max20 optional）+逐标签 EXISTS 循环（参数绑定）+chip toggle+INV-53 多选适配（消失 id 剔除非全清，顺序锚不变）；态空间 T1~T8+受锁配套三处预扫在档（repo:170 单选锚/ui:46 harness/e2e 零配套预期）；票面 scripts/audits/p7e-06-brief.md）' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
```

## 4. 实现者报告（两轮全程）

# P7E-06 实现者报告——标签多选过滤（三屋·实现者子代理）

> 票面 `scripts/audits/p7e-06-brief.md`；派发令=票面执行补充。
> 结论：**DONE**——两项票外申报（e2e spec 配套/registry area 笔误）已由主控配套
> 落地，续跑收口：e2e 双绿（2 passed）+ verify 全链 exit=0（148 文件/1265 用例）。

## 开工记录（技能清点）

- test-driven-development：用（红→绿→变异红证全流程）
- verification-before-completion：用（verify 真退出码 PIPESTATUS 落盘）
- systematic-debugging：用（e2e tag-lifecycle 红的根因定位=快照证据链）
- javascript-testing-patterns / e2e-testing-patterns：不用（票面已给完整测试矩阵与先例池）
- subagent-driven-development / dispatching-parallel-agents：不用（实现者无派发职责）
- git 类：不用（禁 git add/commit；只读 git 用于 diff 范围自查）
- 配置自查：GLM 实现者档（派发令显式定档，无 model 参数欠账——与环境前科一致申报）

## 一、实现摘要

按票面① Design 裁决（AND 交集+切换删旧+chip toggle）完成四件实现：

1. **契约切换**（src/shared/models/paper.ts:72-83）：删 `tagId: z.string().optional()`，
   加 `tagIds: z.array(z.string().min(1)).min(1).max(20).optional()`——空数组 schema 级
   拒收（防歧义），max(20)=单查询爆炸上界。strict() 保留。
2. **SQL 循环 EXISTS**（src/main/db/repos/papers.queries.ts:96-101）：`for (const t of
   q.tagIds ?? [])` 逐标签 push EXISTS + 参数绑定，where 数组 `join(' AND ')`=交集
   （票面①明文形态，未用 IN+GROUP BY）。片段固定进语句缓存惯例不变。
3. **TagFilter 多选**（src/renderer/features/tags/TagFilter.tsx）：props 切换
   `selectedTagIds: string[]` / `onFilterChange(ids: string[])`；chip 点击=toggle
   （active→filter 剔除 / inactive→append）；handleMutated 剔除语义——消失 id∈
   选中集时 `onFilterChange(selectedTagIds.filter(≠disappearedId))`（**剔除非全清**），
   顺序锚不变（先 onFilterChange 后 onMutated）；:6 预留注记兑现修订（v2 已兑现+票号）。
4. **FilterBar 装配**（src/renderer/features/library/FilterBar.tsx:112-116）：
   `selectedTagIds={query.tagIds ?? []}` + `onChange({ tagIds: ids.length > 0 ? ids :
   undefined })`（空选集收敛 undefined）+头注 v1 表述更新。

零新依赖、零新迁移、零新 IPC 通道（api-surface/schemas.ts 零动——预扫确认成立）。

## 二、文件清单

### 实现面（4 件，票面内）

| 文件 | 改动 |
|---|---|
| src/shared/models/paper.ts | tagId→tagIds 契约切换（+4 行净增） |
| src/main/db/repos/papers.queries.ts | buildFilters tagId 单条改 tagIds 循环（6 行） |
| src/renderer/features/tags/TagFilter.tsx | 多选 props/toggle/剔除/头注（45 行差，174 行总量 ≤250 组件红线） |
| src/renderer/features/library/FilterBar.tsx | 装配面 tagIds 收敛（6 行） |

### 新测试（3 件，全部 always-active 裸 describe）

| 文件 | 覆盖 | 行数 |
|---|---|---|
| tests/unit/db/repos/papers-multi-tag.test.ts | T1 交集/T4 单元素特例/无 tagIds 兼容锚/T8 max(20) 双爪/空数组拒收 | 86 |
| tests/unit/renderer/tag-filter-multi.test.tsx | T1/T2/T3 toggle 序列+aria-pressed/T5 剔除+顺序锚/T6 id 稳定/T7 合并剔除+目标不入选/T3 装配收敛（FilterBar） | 261 |
| tests/e2e/tag-filter-multi.spec.ts | 双文献双标签分化→交集→取消一个→全清（三态 .lib-card 计数锚+真实文本断言） | 75 |

### 受锁配套 diff（单列节——授权面=票面⑤预扫清单，[locked-change] 主控收口统一申报）

| 文件 | 改动 | 断言语义说明 |
|---|---|---|
| src/shared/models/paper.ts | 同上（受锁件） | 契约字段切换本体 |
| tests/unit/db/repos/papers.repo.test.ts:170-175 | `searchSummaries({tagId:'t-1'})`→`{tagIds:['t-1']}`；测试名补注记 | **断言值零弱化**：期望命中集 `['p-2']` 不变（语义等价迁移） |
| tests/unit/renderer/tag-lifecycle-ui.test.tsx | harness `render(selectedTagId: string\|null, onFilterChange:(tagId)=>…)`→`render(selectedTagIds: string[], onFilterChange:(ids)=>…)`（:44-59）；8 处调用点 `'t-1'/'t-2'/null`→`['t-1']/['t-2']/[]`；S2/S3 断言 `toHaveBeenCalledWith(null)`→`([])`；:131 注释 tagId→tagIds；头注 :5-6 顺序锚描述同步 | **断言语义零弱化**：S2/S3 顺序锚（invocationCallOrder）与调用次数断言原样保留；null→[] 是「清除死 id 筛选」语义在多选形态下的等价载荷（选中集恰单元素时剔除后=空集） |
| locks/manifest.json | 265→268（+2 unit+1 e2e spec，票面⑤预期值） | locks:generate+apply 产物 |

## 三、红证（先红纪律，scripts/audits/p7e-06-red/）

- `p7e-06-red-targeted.raw.txt`：实现前定向四文件 **9 红 exit=1**——T1 交集、T8
  边界爪（20 放行）、toggle 序列、T5、T7、T3 装配、S2/S3（配套②）、repo tagIds
  锚（配套①）。
- 红阶段天然绿项（等价保持型，如实申报）：T4 单元素/兼容锚/空数组爪（未实现时
  tagIds 被忽略=零过滤，恰好等于期望的全量面）、T6（「零调用」断言未实现时天然
  成立）——其失败能力由 M2/M4 变异与 e2e 回归覆盖。
- T8 双爪说明：21 拒收爪红阶段亦绿（未实现时因 strict() 未知字段抛=巧合通过），
  20 放行爪红——两爪合取保证绿阶段红因必为「长度校验」而非「字段缺席」。

## 四、测试证据

- 绿·定向：四文件 41/41 exit=0。
- 绿·全量 unit（`p7e-06-green-unit.raw.txt`）：**148 文件 / 1265 用例 exit=0**
  （基线 146/1255 +2 文件 +10 用例，与新增 5+5 吻合）。
- 变异红证（cp 备份法，`p7e-06-mutation-m{1..4}.raw.txt`，全部 exit=1+还原 diff 空）：
  - **M1** SQL 交集改 OR（join AND→OR）：T1 红（单挂乙混入）。
  - **M2** INV-53 剔除改全清（filter→[]）：T5/T7 红（期望 ['t-y'] 得 []）。
  - **M3** FilterBar 空数组不收敛（三目→直传）：T3 装配红（onChange 收到 tagIds:[]）。
  - **M4** toggle 只进不出（active 分支→恒 selectedTagIds）：toggle 序列红+T3 装配红。
- e2e 定向（`p7e-06-e2e-targeted.raw.txt`）：**tag-filter-multi.spec 首跑 passed**；
  tag-lifecycle.spec 红（见§六）。

## 五、locks 实录（`p7e-06-locks-apply.raw.txt` + `p7e-06-locks-apply2.raw.txt`）

三新测试文件诞生后 `locks:generate`（268 条 manifest）+`apply`（268 只读）exit=0；
主控 spec 配套（tag-lifecycle.spec）hash 变更后再一轮 generate+apply（268 持平，
spec 原已在锁内）exit=0；verify 内 locks:check 268 一致通过。无 unlock、无手改
manifest。

## 六、申报一：e2e tag-lifecycle.spec 确定性红——票面「零配套预期」预扫误判（已由主控配套落地收口）

- 现象（两次复跑同指纹，`p7e-06-e2e-targeted.raw.txt` + `p7e-06-e2e-taglifecycle-rerun.raw.txt`）：
  :108 `getByText('P7E 乙文献')` 不可见。
- 快照铁证（error-context.md）：标签筛选组 `button "水质监测（1）" [pressed]`、
  列表仅 `P7E 甲文献 水质监测`——选中集=['t-水治']、过滤生效中、剔除链工作正常。
- 根因（**确定性红，非竞态、非实现缺陷**）：spec :62 点选「水治」→:94 点选「水质」
  的序列，v1 单选=**换选**（tagId 替换为 t-水质），v2 多选=**toggle 叠加**（tagIds=
  [t-水治,t-水质] 交集）。随后 :99-102 删除「水质」，按票面① INV-53 多选适配
  （**剔除非全清**）语义→tagIds=['t-水治']→列表=挂「水质监测」的甲 only，乙出局。
  spec :107-109 断言全列表（甲乙丙）锚的是 v1「删除唯一选中→全清」语义。
- 判断：票面③「单选交互=多选特例路径」预扫在**连续点击两个不同 chip** 的序列上
  不成立——单**元素**是特例，单**选换选行为**不是（v1 点击=替换选中，v2 点击=
  加入选中集，两语义在该序列下分歧）。实现按票面 Design（toggle+剔除非全清）是
  正确行为，unit T5/T7+M2 变异红证三重锁定。
- 处置：按派发令③-3「红即停、禁改 spec」——未改 spec 一字；处置权归主控。
- **处置结果（主控配套已落地，续跑收口）**：主控在 spec :94 前插入「点击
  『水质监测（1）』取消」+三行注释（v2 toggle 下点新 chip=叠加非换选——先取消
  改名段选中的「水质监测」恢复「单选水质」换选序列语义，断言面零改），
  [locked-change] 主控配套同批。定向复跑（`p7e-06-e2e-targeted2.raw.txt`）：
  **tag-lifecycle.spec + tag-filter-multi.spec 双绿（2 passed exit=0）**——T4
  回归锚恢复，新 spec 保持绿。

## 七、申报二：verify 票外阻塞——tickets/registry.ts:240 area 类型错（主控已修，verify 全链绿）

- 首跑（`p7e-06-verify.raw.txt` 覆盖前版本）：quality ✓ / tickets:check ✓ /
  locks:check 268 ✓ / lint ✓ → typecheck 红：`tickets/registry.ts(240,69):
  error TS2322: Type '"renderer"' is not assignable to type 'TicketArea'`。
- 根因：主控建单行 `P7E-06 … area: 'renderer'`——TicketArea 枚举无 'renderer'
  （TagFilter 属 'tags-ui'）。该行=工作树中主控建单修改（开工前已存在，git
  status M 亲验），非本票改动。
- **处置结果（主控已修）**：registry.ts:240 `area: 'renderer'`→`'tags-ui'`。
- **续跑 verify 全链（`p7e-06-verify.raw.txt` 终版）**：quality ✓（无占位/无乱码/
  无跨域引用）+ tickets:check ✓（注册表与代码一致）+ locks:check ✓（268 一致，
  spec 配套 hash 变更经 generate+apply 同步，`p7e-06-locks-apply2.raw.txt`）+
  lint ✓ + typecheck ✓ + test ✓（**148 文件/1265 用例**）+ build ✓ →
  **exit=0 全链真退出码落盘**。

## 八、自裁申报

1. **e2e 夹具加丙**：票面⑤ e2e 覆盖描述「双文献双标签分化」——我种了甲乙丙三篇
   （丙无标签）。理由：双文献下「[A] 态列表」与「全清态列表」同为甲乙=断言不可
   区分；丙=全列表对照锚使三态列表（1/2/3 卡）计数可区分。分化主体仍是双文献
   （甲挂 A+B/乙挂 A），与票面描述不冲突（tag-lifecycle.spec 同款丙先例）。
2. **空数组拒收用例**：票面⑤矩阵未单列，但票面①契约声明「空数组 schema 级拒收=
   防歧义」+M3 变异锚=「空数组 schema 拒收路径」——该用例是契约声明的直测，
   属票面内（非新增行为）。
3. **头注注释更新**：TagFilter.tsx 头注（:6 预留注记兑现=票面④明文）+FilterBar.tsx
   头注 v1 表述同步（接缝归责——防两处声明互斥）；tag-lifecycle-ui.test.tsx 头注
   :5-6 顺带同步（票面⑤只明示 :131，头注 S2/S3 描述含 null 表述，不同步=注释与
   断言互斥）。
4. **删减面 diff 自查**：无删减。git diff --stat=8 文件 74+/46-，全部在票面
   （4 实现+2 受锁配套+locks manifest+tickets 建单行[主控]）；未跟踪新增=3 测试
   +p7e-06-red/ 证据目录（审计留存惯例）。
5. 票面①申报边界维持不修：chip 计数静态、选中集不持久化（只记不实现）。

## 九、疑虑

- 无。两项申报（§六/§七）均已由主控配套落地并续跑验证收口（e2e 双绿+verify
  全链 exit=0）。
- e2e 全量（38+1=39 预期）仍归主控收口跑（派发令③-3；两定向 spec 已双绿）。

## 十、成本自述

- 工具调用约 40 次（读件 12+编辑 18+bash 验证 12）。
- 大耗时命令：npm run test 全量 ~60s（两次）；npm run verify ~90s（typecheck 段断）；
  playwright 定向 ~16s×2 + 复跑 ~15s；build ~15s。
- 全部测试/验证命令经 Volta PATH 前缀（node 24.20.0——宿主 25.2.1 jsdom localStorage
  破损规避，AGENTS 环境事实）；退出码一律 PIPESTATUS 取 npm 真值落盘。

## 证据文件索引（scripts/audits/p7e-06-red/）

p7e-06-red-targeted.raw.txt（红 9/exit1）· p7e-06-green-unit.raw.txt（148/1265/exit0）·
p7e-06-mutation-m{1..4}.raw.txt（四变异红证+还原）· p7e-06-locks-apply.raw.txt（268）·
p7e-06-locks-apply2.raw.txt（spec 配套后 268）· p7e-06-e2e-targeted.raw.txt（首跑：
新 spec passed+taglifecycle 红）· p7e-06-e2e-taglifecycle-rerun.raw.txt（复跑同指纹）·
p7e-06-e2e-targeted2.raw.txt（配套后双绿 2 passed/exit0）· p7e-06-verify.raw.txt
（终版全链 exit=0：quality/tickets/locks268/lint/typecheck/test 148-1265/build）

## 5. 门一审轨迹（供终审复核）
- 初审（kimi-backup，in=22588/out=4038）：**PASS_WITH_WARNINGS 零 BLOCKING**——核心面全部合格（AND 交集 SQL 逐标签 EXISTS+参数绑定+M1 变异真实命中/INV-53 剔除非全清+invocationCallOrder 双锁/契约删旧 typecheck 间接证明/T1~T8 逐格锚/受锁配套四件诚实申报且等价可论证/两项票外偏差流程合规）。完整 JSON=scripts/audits/p7e-06-gate1.json（raw 的 \` 非法 JSON 转义系模型输出格式噪声，主控剥离后解析在档）。
- 2 WARN：①新 spec waitForTimeout(500) 建库等待（与 tag-lifecycle.spec 同配方先例——保持现状合规，确定性锚=后续优化候选）；②预扫方法论缺口（「单选交互=多选特例」在连续点击两 chip 的换选序列上被证伪——处置链合规但暴露预扫缺口）→收口 INV-53 注记记录「交互序列等价≠单元素特例等价」教训。3 NIT：btn! 断言风格（既有助手同型）/tagId 残留 grep 直证（**主控已补**：scripts/audits/p7e-06-red/p7e-06-tagid-residue-grep.raw.txt——精确 grep 零悬挂+文件级命中全为 tagIds 子串或 tags 通道独立面）/T4 顺序耦合（双重锚定风险低保持）。
- 终审重点面（主控点名）：①AND 交集 SQL 与 INV-53 剔除语义的终态复核；②受锁配套四件（含 e2e 换选序列恢复）等价性终判；③契约切换删旧完备性（typecheck+grep 双证）；④T4 回归面（tag-lifecycle 既有链配套后恢复——主控亲验 39/39 含该链）；⑤收口就绪度（INV-53 注记面=剔除语义+预扫教训两行）。
