# P7E-07 门二终审材料包（智能排序——门一 PWW 终态）

## 0. 材料包构成与审查对象
- 工单=票面 §2；实现=diff（§3——6 改+1 新，其中 1 件受锁=models/paper.ts 枚举加值票面声明）；实现者自报=§4。
- 基线：单测 148 文件/1265→**149 文件/1270**（+1 文件+5 用例实测 S1~S5）；locks 268→**269**（+1 unit）；e2e 39 零新 spec——主控亲验全量 **39/39 全绿**（首轮 1 failed=reader-text:872 F-ARCH4-M1 跨根选区防线与本票零交集、定向复跑 7.1s 绿+全量复验 39/39=非确定抖动第 1 现记录指纹不立案：跨页 toast 3s 超时未现，reader 选区面 flake 家族）。
- 实现面四处增量：librarySortSchema +cited_desc（加值向后兼容，旧三值保留——与 P7E-06 切换删旧不同：新增维度非方案替换）/ORDER_BY +COALESCE(p.cited_by_count,0) DESC, rowid DESC（空值显式归零垫底，不依赖 SQLite NULL 排序默认——**探针前置实录**：DESC 下 NULL 虽默认垫底但 0-vs-NULL 相对序由引擎决定，删 COALESCE 变异真实红）/SORT_LABEL +『被引（高到低）』/library.service.ts:20 预留注记兑现（含「经新 repo 方法」→「ORDER_BY 映射扩展」勘误）。
- 双 Record<LibrarySort,...> 全键约束=FilterBar/queries 两处补全的类型强制闭环（M2 变异=漏键 TS2741 typecheck 红证类型兜底）。
- 审计重点面（主控点名）：①COALESCE 语义与 NULL 垫底论证（探针实录+M1 变异 0-vs-NULL 分叉）；②S1~S5 态空间锚完备性（尤其 S3 缺省兼容/S4 旧三值回归/S5 分页决胜）；③受锁面单件最小增量（枚举加值）；④:20 注记勘误形态（照 P7E-05 先例）；⑤Record 类型闭环论证成立性。

## 1. 宪法硬规则摘要
- 方案切换=删除旧方案（本票为**加值非切换**——新增维度旧值全保留，与 P7E-06 对照）；分层单向；测试锁定合约（受锁=票面声明最小增量）；文件行数上限；禁新增依赖；禁字符串拼接 SQL（ORDER_BY 映射常量+stmt 预编译既有形态）。

## 2. 票面

# P7E-07 工单票面——智能排序（引用数排序，五层规约）

> registry：`P7E-07` / file `src/main/services/library.service.ts` / area service / owner strong / open
> 排程真相源=v35 §2 第 1 项（=ROADMAP §P7-E 内序第 7 位末项——前六项 P7E-01~06 已毕）。
> 开工记录：本票段技能清点延续本会话开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging 已加载；gate-call.py 在位
> ——kimi-backup 主用/deepseek 64k 直起）。

## ⓪ 出处（三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:42）：
   `library.service.ts:20（智能过滤/引用数排序）`；:105-106「智能排序系代码
   预留点，归 P7-E 不入 P8+」。
2. ROADMAP §P7-E（docs/ROADMAP.md:387-388）：「… > 标签多选过滤 > 智能排序
   > 其余……智能排序源于代码预留点」。
3. library.service.ts:20 代码预留注记：「预留：智能过滤（引用数排序）在 v2
   经新 repo 方法扩展」。

- **价值**：被引数=学术影响力通行代理——「先读高被引」的文献筛选入口；
  与 year/added/title 三既有排序互补，cited_by_count 缓存列（ENR-01）已就绪。
- **依赖**：cited_by_count 列（005 迁移）+ORDER_BY 映射（queries.ts:17）+
  SORT_LABEL（FilterBar:29）+enrich 引用数抓取链全部既有；零新依赖零迁移。
- **风险**：①cited_by_count nullable（未缓存论文 NULL——排序语义须显式）；
  ②受锁 models/paper.ts 枚举扩展（加值=向后兼容，既有夹具零破坏——预扫
  确认测试面零涟漪：SORT_LABEL/ORDER_BY 测试零命中，类型 Record 全键约束
  强制两处补全=零遗漏）；③同键决胜稳定性（分页偏移）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：枚举加值 cited_desc+COALESCE 空值归零+双 Record 类型闭环

- **采**：librarySortSchema 枚举 +`'cited_desc'`（加值向后兼容——既有三值
  调用方零破坏；与 P7E-06「切换删旧」不同形态：排序是**新增维度**非方案
  替换，旧三值全部保留）。
- **SQL**：ORDER_BY +`cited_desc: 'COALESCE(p.cited_by_count, 0) DESC,
  p.rowid DESC'`——**COALESCE 显式归零**（不依赖 SQLite NULL 排序默认——
  未缓存论文与被引 0 同级垫底=「影响力低在后」语义显式化；决胜键 rowid
  同键分页稳定，循三先例）。
- **UI**：SORT_LABEL +`cited_desc: '被引（高到低）'`（FilterBar 下拉自动
  多一项——Object.entries 驱动零改）。
- **service**：零改（sort 经 query 直传 repo）；library.service.ts:20 预留
  注记兑现修订（「预留」→已兑现+票号——照 P7E-05 :20 修订形态）。

### 态空间跨格序列表（S1~S5）

| # | 序列 | 期望 |
|---|---|---|
| S1 | 三论文 cited=5/NULL/12，sort=cited_desc | 顺序=12,5,NULL（NULL 垫底） |
| S2 | S1 + cited 全 NULL | rowid 决胜稳定序（不崩不随机） |
| S3 | sort 缺省（不传） | added_desc 既有默认（兼容锚） |
| S4 | 旧三值各跑一遍 | 行为与改前全等（回归锚） |
| S5 | 分页：同 cited 两论文跨页界 | rowid 决胜不重不漏 |

## ② 接口层

枚举加一值+ORDER_BY/SORT_LABEL 各加一行+预留注记修订；无新通道无新迁移
无 repo 方法变更（:20 预留写「经新 repo 方法」实落=ORDER_BY 映射扩展——
勘误说明进注记）。

## ③ 架构层

- 受锁面（主控预解锁）：models/paper.ts 一件最小增量（枚举加值）；新测试
  收口入锁。Record<LibrarySort,...> 全键约束=FilterBar/queries 两处补全
  的类型强制闭环（typecheck 兜底零遗漏）。
- IPC/契约透传零改（sort 在 libraryQuery 既有字段）。

## ④ 生命周期层

- library.service.ts:20 预留注记兑现修订（含「经新 repo 方法」→「ORDER_BY
  映射扩展」勘误）。

## ⑤ 文化层（TDD 红→绿→变异红证）

新测试：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/repos/papers-cited-sort.test.ts（新） | S1 NULL 垫底/S2 决胜稳定/S3 缺省兼容/S4 旧三值回归/S5 分页跨界 |

- 变异红证 ≥3 组（cp 备份法）：M1=删 COALESCE（S1 NULL 序变化红——SQLite
  DESC NULL 垫底默认与 COALESCE 同向时 M1 不红则改用 ASC 探测变异：COALESCE
  改 `-cited` 反序——**实现者先实测 NULL 默认序再选真实红的变异**，红证
  不成立即申报换变异点）；M2=枚举值漏加 ORDER_BY（typecheck 红=类型闭环
  变异）；M3=决胜键 rowid 删除（S5 红）。
- 先红纪律：全量口径落 scripts/audits/p7e-07-red/；.raw.txt。
- 锁序：新测试诞生即 generate+apply 先于 verify（预期 268→269）。

## ⑥ 验收

- verify 全绿（基线 148 文件 1265 用例滚动，新增实测申报）；e2e 全量 39
  复验绿（主控——本票零新 e2e spec：排序链单测全锚+UI 下拉 Object.entries
  驱动无新交互模式；若门审要求 e2e 锚再补）。
- 门一 Kimi（backup 源）+门二 deepseek 64k 档。
- registry P7E-07 翻 done；library.service.ts:20 修订；提交 [locked-change]
  （models/paper.ts+新测试）。

## ⑦ 派发与成本申报

- 三屋照旧（实现者 GLM5.3 统一档；禁 git/registry/locks 除票面⑤锁序一次）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。

## 3. 完整 diff
```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 1dbc5ca063..4a9ac0d716 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-03T12:44:48.2772037Z",
+    "generatedAt":  "2026-09-03T12:57:42.0684491Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -367,7 +367,7 @@
                   },
                   {
                       "path":  "src/shared/models/paper.ts",
-                      "sha256":  "9af03c10041f105d569c93f43d9b4debad9106e6062d22324cec313dab174173"
+                      "sha256":  "938e592f5105310dc685a7d1ab5dc0affae9930ecb1d3aaf169c9375498ed5dd"
                   },
                   {
                       "path":  "src/shared/models/tag.ts",
@@ -521,6 +521,10 @@
                       "path":  "tests/unit/db/repos/papers.repo.test.ts",
                       "sha256":  "330051a81a35893082f2a408cc7544d4b1bc076d5923b3d32dbce9e145b3f05e"
                   },
+                  {
+                      "path":  "tests/unit/db/repos/papers-cited-sort.test.ts",
+                      "sha256":  "15260b0d2a1f7ec71305fd85025b06fd1db1ae88e3427ff9345f732d00615d6b"
+                  },
                   {
                       "path":  "tests/unit/db/repos/papers-multi-tag.test.ts",
                       "sha256":  "87c684dd66faf6eae741efac898e8b4833ed996f04f17c544c51e989aa5789b7"
diff --git a/src/main/db/repos/papers.queries.ts b/src/main/db/repos/papers.queries.ts
index 233c524344..fe77bc43fb 100644
--- a/src/main/db/repos/papers.queries.ts
+++ b/src/main/db/repos/papers.queries.ts
@@ -19,7 +19,11 @@ import type {
 export const ORDER_BY: Readonly<Record<LibrarySort, string>> = {
   added_desc: 'p.added_at DESC, p.rowid DESC',
   year_desc: 'p.year DESC, p.added_at DESC, p.rowid DESC',
-  title_asc: 'p.title ASC, p.rowid ASC'
+  title_asc: 'p.title ASC, p.rowid ASC',
+  // P7E-07：COALESCE 显式归零——未缓存（NULL）与被引 0 同级垫底，不依赖
+  // SQLite NULL 排序默认（探针实录：DESC 下 NULL 虽默认垫底，但 0-vs-NULL
+  // 相对序无 COALESCE 时由引擎决定；决胜键 rowid 同上）
+  cited_desc: 'COALESCE(p.cited_by_count, 0) DESC, p.rowid DESC'
 }
 
 /** 聚合列：标签/集合名用 char(31)（US 分隔符）串接，防名字本身含逗号 */
diff --git a/src/main/services/library.service.ts b/src/main/services/library.service.ts
index 1ba6814346..7e71875f4a 100644
--- a/src/main/services/library.service.ts
+++ b/src/main/services/library.service.ts
@@ -17,7 +17,10 @@
  * - 本服务不做 IO（文件/网络都归别的 service）
  *
  * ── 生命周期层 ──
- * - 预留：智能过滤（引用数排序）在 v2 经新 repo 方法扩展
+ * - P7E-07 已兑现：智能排序（引用数排序）——librarySortSchema 加 cited_desc
+ *   枚举值，sort 经 LibraryQuery 直传 repo 的 ORDER_BY 映射（COALESCE 空值
+ *   归零+rowid 决胜）。勘误：原预留注记写「经新 repo 方法」，实际落位=
+ *   ORDER_BY 映射扩展（加值向后兼容，无新方法无新迁移）
  * - 不做：删除文献（v1 明确不做，防误删；如需清理走 DB 维护工具）
  *
  * ── 文化层 ──
diff --git a/src/renderer/features/library/FilterBar.tsx b/src/renderer/features/library/FilterBar.tsx
index 98fa5bba54..fb47e43e37 100644
--- a/src/renderer/features/library/FilterBar.tsx
+++ b/src/renderer/features/library/FilterBar.tsx
@@ -29,7 +29,8 @@ import { TagFilter } from '../tags/TagFilter'
 const SORT_LABEL: Record<LibrarySort, string> = {
   added_desc: '最近添加',
   year_desc: '年份新→旧',
-  title_asc: '标题 A→Z'
+  title_asc: '标题 A→Z',
+  cited_desc: '被引（高到低）'
 }
 
 export function FilterBar(props: {
diff --git a/src/shared/models/paper.ts b/src/shared/models/paper.ts
index 962d6af1ba..f00ee530b9 100644
--- a/src/shared/models/paper.ts
+++ b/src/shared/models/paper.ts
@@ -66,7 +66,8 @@ export const paperMetaPatchSchema = z
   .strict()
 export type PaperMetaPatch = z.infer<typeof paperMetaPatchSchema>
 
-export const librarySortSchema = z.enum(['added_desc', 'year_desc', 'title_asc'])
+// P7E-07：+cited_desc（被引降序——加值向后兼容，旧三值全部保留）
+export const librarySortSchema = z.enum(['added_desc', 'year_desc', 'title_asc', 'cited_desc'])
 export type LibrarySort = z.infer<typeof librarySortSchema>
 
 export const libraryQuerySchema = z
diff --git a/tests/unit/db/repos/papers-cited-sort.test.ts b/tests/unit/db/repos/papers-cited-sort.test.ts
new file mode 100644
index 0000000000..01ac37eeb9
--- /dev/null
+++ b/tests/unit/db/repos/papers-cited-sort.test.ts
@@ -0,0 +1,111 @@
+import { beforeEach, describe, expect, it } from 'vitest'
+import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
+import { libraryQuerySchema } from '../../../../src/shared/models/paper'
+import type { SqliteDb } from '../../../../src/main/db/connection'
+import { createTestDb } from '../../../utils/fixtures'
+
+/** [P7E-07] 智能排序（引用数 cited_desc）——repo+schema 层态空间锚（S1~S5）。
+ *  always-active 裸 describe（P7E-06 同口径，K3：不经 guardedDescribe 守卫）。
+ *  S1 NULL 垫底且与被引 0 同级（COALESCE 归零——同级相对序 rowid 决胜，M1 变异锚：
+ *  种子布局下 NULL 后插于 cited=0，删 COALESCE 后 0-vs-NULL 相对序翻转即红）；
+ *  S2 全 NULL 决胜稳定；S3 缺省兼容；S4 旧三值回归；S5 同键跨页不重不漏（M3 锚）。
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
+describe('P7E-07 智能排序（引用数 cited_desc）', () => {
+  let db: SqliteDb
+  let repo: ReturnType<typeof createPapersRepo>
+
+  beforeEach(() => {
+    db = createTestDb()
+    repo = createPapersRepo(db)
+  })
+
+  /** cited 落库：insert 面不含 ENR-01 三列（迁移 005 全可空默认 NULL），直 UPDATE 设置 */
+  const setCited = (id: string, v: number): void => {
+    db.prepare('UPDATE papers SET cited_by_count = ? WHERE id = ?').run(v, id)
+  }
+
+  /** 主种子：插入序 p-c5/p-c0/p-c12/p-cN（rowid 1~4），cited=5/0/12/NULL；
+   *  added_at/year/title 三维分化（S4 旧三值回归复用同批种子） */
+  const seedQuad = (): void => {
+    repo.insert(row({ id: 'p-c5', title: 'B文献', year: 2022, added_at: '2026-01-01T00:00:00Z' }))
+    repo.insert(row({ id: 'p-c0', sha256: 'sha-b01', title: 'A文献', year: 2024, added_at: '2026-01-02T00:00:00Z' }))
+    repo.insert(row({ id: 'p-c12', sha256: 'sha-b02', title: 'C文献', year: 2023, added_at: '2026-01-03T00:00:00Z' }))
+    repo.insert(row({ id: 'p-cN', sha256: 'sha-b03', title: 'D文献', year: 2021, added_at: '2026-01-04T00:00:00Z' }))
+    setCited('p-c5', 5)
+    setCited('p-c0', 0)
+    setCited('p-c12', 12)
+  }
+
+  it('S1 NULL 垫底：cited=12/5/NULL/0 全序=[12,5,NULL,0]（NULL 与被引 0 同级=COALESCE 归零，同级 rowid 决胜后插在前）', () => {
+    seedQuad()
+    const r = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 50 })
+    expect(r.items.map((i) => i.id)).toEqual(['p-c12', 'p-c5', 'p-cN', 'p-c0'])
+    expect(r.total).toBe(4)
+  })
+
+  it('S2 全 NULL：三篇全未缓存 → 全同级 rowid 决胜稳定序（后插在前，不崩不随机）', () => {
+    repo.insert(row({ id: 'p-x1', added_at: '2026-01-01T00:00:00Z' }))
+    repo.insert(row({ id: 'p-x2', sha256: 'sha-x02', added_at: '2026-01-02T00:00:00Z' }))
+    repo.insert(row({ id: 'p-x3', sha256: 'sha-x03', added_at: '2026-01-03T00:00:00Z' }))
+    const r = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 50 })
+    expect(r.items.map((i) => i.id)).toEqual(['p-x3', 'p-x2', 'p-x1'])
+    expect(r.total).toBe(3)
+  })
+
+  it('S3 缺省兼容：不传 sort → schema 默认 added_desc，行为与显式 added_desc 全等', () => {
+    seedQuad()
+    const parsed = libraryQuerySchema.parse({})
+    expect(parsed.sort).toBe('added_desc')
+    const byDefault = repo.searchSummaries(parsed)
+    const explicit = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
+    expect(byDefault.items.map((i) => i.id)).toEqual(['p-cN', 'p-c12', 'p-c0', 'p-c5'])
+    expect(byDefault.items.map((i) => i.id)).toEqual(explicit.items.map((i) => i.id))
+  })
+
+  it('S4 旧三值回归：added_desc/year_desc/title_asc 行为与改前全等（同批种子三维分化）', () => {
+    seedQuad()
+    const added = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
+    expect(added.items.map((i) => i.id)).toEqual(['p-cN', 'p-c12', 'p-c0', 'p-c5'])
+    const year = repo.searchSummaries({ sort: 'year_desc', offset: 0, limit: 50 })
+    expect(year.items.map((i) => i.id)).toEqual(['p-c0', 'p-c12', 'p-c5', 'p-cN'])
+    const title = repo.searchSummaries({ sort: 'title_asc', offset: 0, limit: 50 })
+    expect(title.items.map((i) => i.id)).toEqual(['p-c0', 'p-c5', 'p-c12', 'p-cN'])
+  })
+
+  it('S5 分页跨界：同 cited 两篇跨页界 rowid 决胜不重不漏', () => {
+    repo.insert(row({ id: 'p-hi', added_at: '2026-01-01T00:00:00Z' }))
+    repo.insert(row({ id: 'p-a', sha256: 'sha-pa', added_at: '2026-01-02T00:00:00Z' }))
+    repo.insert(row({ id: 'p-b', sha256: 'sha-pb', added_at: '2026-01-03T00:00:00Z' }))
+    setCited('p-hi', 9)
+    setCited('p-a', 7)
+    setCited('p-b', 7)
+    const page1 = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 2 })
+    const page2 = repo.searchSummaries({ sort: 'cited_desc', offset: 2, limit: 2 })
+    expect(page1.items.map((i) => i.id)).toEqual(['p-hi', 'p-b'])
+    expect(page1.total).toBe(3)
+    expect(page2.items.map((i) => i.id)).toEqual(['p-a'])
+    const merged = [...page1.items, ...page2.items].map((i) => i.id)
+    expect(merged).toEqual(['p-hi', 'p-b', 'p-a'])
+    expect(new Set(merged).size).toBe(3)
+  })
+})
diff --git a/tickets/registry.ts b/tickets/registry.ts
index 288c082bcd..a9e0778c6a 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -238,6 +238,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'P7E-04', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '导出剪贴板（P7-E 预留点清扫四票；b3: P7-E+B1 §3 预留 export.service.ts:27；Design=单通道 export/clipboard（format bibtex|csv 枚举+paperIds schema min(1) 空选集拒）+main 侧构建 main 侧写（内容不过 renderer——deps.clipboard 注入 electron.clipboard）+构建器单源（buildBibtex/buildCsv 直用零改）+先构建后写（失败零剪贴板副作用）+无对话框无 CANCELLED；PaperDetailPanel 248 贴 250 红线→usePaperDetailActions hook 拆件（215 行,受锁 paper-detail-export.test 零改全绿=拆件判据）+复制 BibTeX/复制 CSV 两按钮；态空间 E1~E8+INV-56 登记（构建器单源/剪贴板写单口/先构建后写/可选注入还原项）；门一 Kimi PWW(0B/1W/4N)→回炉 R1 三修（console.error 观测/ClipboardReq 死导出删/头注 C-06 票外叙述回退）→复核 PASS+门二 deepseek PASS 零发现；实现者 GLM5.3 统一档两轮 8.25M tok（环境无 model 参数欠账披露）；诚实申报在档=两受锁件 chmod 编辑（主控派发令误称预解锁——收口 reapply 收账）+IpcDeps.clipboard 可选化（受锁 makeIpcDeps 桩工厂禁改+响亮守卫——还原项登记）；单测 142 文件 1231（+2 文件+12 用例）/locks 259（256+3）/e2e 37（36+1——主进程 clipboard.readText 读回 P7-A 先例+清场竞态防线）；票面 scripts/audits/p7e-04-brief.md+报告+两门审档在案）' },
   { id: 'P7E-05', file: 'src/main/services/reader.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '阅读时长统计（P7-E 预留点清扫五票；Design=搭车 saveProgress 单通道（secondsDelta int 0..3600 optional——旧载荷零兼容）+008 迁移（预留写 002 勘误实落 008）+reading-time.ts 独立模块（deps 注入 crib scroll-progress）+复合 flusher（进度页+时长账单 invoke）+repo 原子累加（reading_seconds=reading_seconds+?）+ready×visible 双计时门+chunkSeconds 3600 分片单源三消费点；态空间 R1~R10+跨格锚（R3×R6/4000 分片/dispose 双 invoke/可见零头结转）+INV-57 登记（含注记面四件：R7 双 invoke/分片级部分丢失/无 24h 钳制/sec<0 不可达）；三屋全程=首轮 BLOCKED（票面×受锁 golden 双死结：migrate.test [1..7] 断言+10 件 PaperDetail 字面量）→主控 [locked-change] 12 件配套（migrate.test [1..8]+lineage-tags 7→8+10 字面量补字段——零断言语义弱化）→TDD 全流程（首红 5/1235→绿→M1~M4）→R1 主控亲验回炉（settle force 不检查 isVisible=hidden 段虚计）→R2 门一 BLOCKING 回炉（3600 上界×收尾口回吐结构冲突——invokeOne 分片+M6）→R3 门二 BLOCKING+WARN 回炉（dispose 尾账未分片同型漏点→chunkSeconds 单源三消费点+M7；settle 吸收/结转绑死→解耦+锚语义随裁决变更）；M2 变异载体失效转移 M5 实录（防线冗余实证）；门一 Kimi（kimi-backup，主源 504 换源）FAIL（1B+3N）→R2→复审 PASS；门二 deepseek 64k 档 FAIL（1B+1W）→R3→复审 PASS_WITH_WARNINGS（落盘静默=既有尽力而为规约归注记）；主控亲验=TagEditor key 修复（e2e tag-lifecycle 确定性红两次复跑+回退 Panel 对照实证=既有竞态被本票加行踩宽——挂接点 key={detail.id} 会话身份语义，挂错文献正确性缺陷非仅测试面）+R3 超回炉上限 ≤2 超额披露（门一/门二各贡献独立轮非同案缠讼，人类复核可否决）；实现者 GLM5.3 统一档五轮 30.4M tok；verify 146 文件 1255（+4 文件+24 用例）/locks 265（259+6：4 unit+1 e2e spec+1 sql）/e2e 38 全绿（37+1——主控亲验三跑）；票面 scripts/audits/p7e-05-brief.md+报告 p7e-05-impl.report.md+两门审档在案）' },
   { id: 'P7E-06', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'strong', status: 'done', summary: '标签多选过滤（P7-E 预留点清扫六票；Design=AND 交集+切换删旧 tagId 加 tagIds（array min1 max20 optional 空数组 schema 拒收）+逐标签 EXISTS 循环参数绑定+chip toggle+INV-53 多选适配（消失 id 剔除非全清，顺序锚不变——INV-53 行内注记+预扫教训在档）；态空间 T1~T8 逐格锚+M1~M4 变异红证（M1 交集改 OR/M2 全清改反/M3 空数组不收敛/M4 toggle 只进不出）；受锁配套四件=[locked-change]（models/paper.ts 契约切换+repo:170 单选锚 tagIds:[t-1] 等价迁移+ui harness 多选形态 null→[] 等价载荷+tag-lifecycle.spec 插取消点击恢复换选序列——票面「e2e 零配套」预扫误判，实现者停手申报+快照铁证后主控裁决）；两项票外申报=tag-lifecycle 红（处置如上）+registry area 笔误（主控建单错误 renderer→tags-ui 修）；门一 Kimi（backup 源）PWW 零 BLOCKING（2W=waitForTimeout 先例同配方/预扫方法论缺口→INV-53 注记；3N 不阻塞——tagId 残留 grep 直证主控已补档）+门二 deepseek 64k PWW（2W=同 waitForTimeout/max(20) UI 无感知 UX 断层→后续票候选；1N btn! 风格）——零回炉双 PWW；实现者 GLM5.3 统一档两轮 6.76M tok；verify 148 文件 1265（+2 文件+10 用例）/locks 268（265+3）/e2e 39 全绿（38+1 新 spec——主控亲验）；票面+报告+两门审档在案）' },
+  { id: 'P7E-07', file: 'src/main/services/library.service.ts', area: 'service', owner: 'strong', status: 'open', summary: '智能排序（P7-E 预留点清扫七票末项；b3: P7-E+B1 §3:42 预留「智能过滤/引用数排序」+library.service.ts:20 代码预留；Design=枚举加值 cited_desc（向后兼容）+COALESCE(cited_by_count,0) DESC 空值归零垫底+rowid 决胜+双 Record<LibrarySort> 类型强制闭环；态空间 S1~S5+M1~M3 变异；票面 scripts/audits/p7e-07-brief.md）' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
```

## 4. 实现者报告

# P7E-07 实现报告——智能排序（引用数排序）

> 实现者：三屋模式实现者子代理（GLM5.3 统一档）。票面=scripts/audits/p7e-07-brief.md。
> 证据目录=scripts/audits/p7e-07-red/（.raw.txt 全套）。

## 1. 实现摘要

四处增量改动，零新依赖零迁移零 IPC/repo 方法变更（sort 经 LibraryQuery 既有字段直传）：

1. `src/shared/models/paper.ts`：`librarySortSchema` 枚举 +`'cited_desc'`（加值向后
   兼容，旧三值全保留——与 P7E-06「切换删旧」不同形态：新增维度非方案替换）。
2. `src/main/db/repos/papers.queries.ts`：`ORDER_BY` +`cited_desc:
   'COALESCE(p.cited_by_count, 0) DESC, p.rowid DESC'`（票面① SQL 照抄；COALESCE
   显式归零+rowid 决胜，附注记引用探针实录）。
3. `src/renderer/features/library/FilterBar.tsx`：`SORT_LABEL`
   +`cited_desc: '被引（高到低）'`（下拉 Object.entries 驱动，UI 零逻辑改）。
4. `src/main/services/library.service.ts`：:20 预留注记兑现修订（照 P7E-05
   reader.service.ts:20 修订形态：「预留」→「P7E-07 已兑现」+「经新 repo 方法」→
   「ORDER_BY 映射扩展」勘误，票面④生命周期层）。

双 `Record<LibrarySort,...>` 全键约束=两处补全的类型强制闭环（M2 变异验证）。

## 2. 文件清单

| 文件 | 性质 | 变更 |
|---|---|---|
| src/shared/models/paper.ts | 受锁（主控预解锁） | 枚举加值+1 行注记 |
| src/main/db/repos/papers.queries.ts | 常规 | ORDER_BY +1 行+3 行注记 |
| src/renderer/features/library/FilterBar.tsx | 常规 | SORT_LABEL +1 行 |
| src/main/services/library.service.ts | 常规 | :20 注记修订（+4/-1 行） |
| tests/unit/db/repos/papers-cited-sort.test.ts | 新增（106 行） | S1~S5 五用例 |
| locks/manifest.json | 受锁（locks:apply 产物） | 268→269 |

`git diff --stat`：6 文件 +20/-6（其中 tickets/registry.ts 的 +1=主控建单条目，
开工前已存在，实现者未触碰）。未跟踪新文件仅新测试一件。

## 3. M1 变异前置探针（主控裁决③兑现）

`scripts/audits/p7e-07-red/probe-null-order.raw.txt`（node -e 内联，不落 .mjs
=不扩受锁面；better-sqlite3 12.11.1 / node ABI 137 / :memory:）：

- 种子插入序 a(5), d(0), c(12), b(null)；
- `ORDER BY cited_by_count DESC`（raw）→ `c,a,d,b`：**DESC 下 NULL 默认垫底**
  =与 COALESCE 归零同向（票面预判命中）；
- `COALESCE(,0) DESC, rowid DESC` → `c,a,b,d`：**0-vs-NULL 相对序分叉**——
  COALESCE 形态下两者同级、由 rowid 决胜（后插 NULL 在前）；raw 形态 0 恒在
  NULL 前（NULL 绝对最小）；
- 附带 raw ASC → `b,d,a,c`：ASC 下 NULL 最前。
- **裁决**：M1「删 COALESCE」在「NULL 后插于 cited=0」的种子布局下**真实红**
  （`M1-red-on-order: true`）——未启用 -1/反序备用形态。测试种子据此设计。

## 4. 红证（先红纪律，全量口径）

`red-full.raw.txt`：`npm run test` 全量 149 文件（148+1）/1270 用例（1265+5），
**3 failed | 1267 passed，exit=1**——红在 S1/S2/S5（`SqliteError: no such
column: undefined`=ORDER_BY 缺 cited_desc 键的运行时形态）；S3 缺省/S4 旧三值
回归两用例即绿（既有面零破坏=回归锚自证）。红形态=「新值三用例红、兼容锚绿」，
非恒真断言。

## 5. 绿证与变异红证

- 绿（目标文件）：`green-target.raw.txt` 5/5 passed，exit=0。
- **M1 删 COALESCE**（→`p.cited_by_count DESC, p.rowid DESC`）：
  `mutation-m1.raw.txt` **S1 红**（1 failed | 4 passed，exit=1）——0-vs-NULL
  相对序翻转被 S1 显式断言抓住（探针预判命中）。
- **M2 ORDER_BY 漏加键**（删 cited_desc 行）：`mutation-m2.raw.txt`
  `npm run typecheck` **error TS2741: Property 'cited_desc' is missing in
  type ... but required in type 'Readonly<Record<...>>'`，exit=2——类型闭环
  变异（Record 全键约束）。
- **M3 删决胜键 rowid**（→`COALESCE(p.cited_by_count, 0) DESC`）：
  `mutation-m3.raw.txt` **S1/S2/S5 三用例红**（3 failed | 2 passed，exit=1）——
  同键序翻转为引擎序（实测=rowid ASC 输入序），S5 分页页界断言被抓住。
- 变异还原：全部 cp 备份法（`mut-backup-papers.queries.ts`），三组还原后
  `diff` 均空（M1/M3/M2-restore-clean 回显在案）；未用 git checkout（未提交
  面保护纪律）。
- 变异顺序申报：M1→M3→M2（同载体文件连续变异复用同一备份，语义与票面
  M1~M3 三组要求等价，无减组）。

## 6. 测试证据（新测试形态）

`tests/unit/db/repos/papers-cited-sort.test.ts`（always-active 裸 describe，
P7E-06 papers-multi-tag 同口径，K3：不经 guardedDescribe）：

- 夹具：`row()` 复用 multi-tag 形态；cited 落库经 `db.prepare UPDATE`（insert
  面不含 ENR-01 三列——迁移 005 全可空默认 NULL 的既有事实）。
- 种子 quad：插入序 p-c5/p-c0/p-c12/p-cN（rowid 1~4），cited=5/0/12/NULL，
  added_at/year/title 三维分化（S4 复用同批）。
- S1 全序=[12,5,NULL,0]：**NULL 垫底+与被引 0 同级=COALESCE 归零语义显式锚**
  （票面风险①「排序语义须显式」的落地；种子含 cited=0 论文、NULL 后插——
  探针指导的 M1 红证布局，见 §8 自裁）。
- S2 全 NULL：rowid 决胜稳定序 [x3,x2,x1]。
- S3 缺省：`libraryQuerySchema.parse({}).sort==='added_desc'`+行为与显式全等。
- S4 旧三值：added_desc/year_desc/title_asc 三序断言（改前行为回归锚）。
- S5 分页：同 cited=7 两篇跨页界，limit=2 两页拼接不重不漏+total=3。

## 7. verify 与 locks 实录

- `locks-generate.raw.txt` exit=0 / `locks-apply.raw.txt` exit=0（gen-exit=0
  apply-exit=0）/ `locks-check.raw.txt`：**269 个受锁文件与 manifest 一致**
  （268→269，+1=新测试；锁序=新测试诞生即 generate+apply 先于 verify，票面⑤）。
- `verify.raw.txt`：`npm run verify` 全链（quality+tickets+locks+lint+typecheck+
  test+build）**verify-exit=0**（PIPESTATUS[0] 真码）；test 段 **149 文件
  1270 用例全 passed**（148→149 / 1265→1270，+1 文件+5 用例，实测申报）。
- e2e：本票零新 spec（票面⑥），全量 e2e 39 由主控收口复验。

## 8. 自裁申报（超票面决定）

1. **S1 种子含 cited=0 论文（票面态空间表只列 5/NULL/12）**：为显式锚定
   「未缓存与被引 0 同级垫底」语义+使 M1「删 COALESCE」真实红（探针裁决的
   红证布局）。属票面①「COALESCE 显式归零——未缓存论文与被引 0 同级垫底」
   语义的断言化，非行为偏离。
2. **tickets/registry.ts 开工即 M**：diff 确认=主控建单的 P7E-07 条目
   （status: open），实现者未触碰（禁令遵守）。
3. **manifest.json CRLF warning**：lock-protected.ps1（PowerShell）写出的既有
   行为，git 提交时按 .gitattributes 归一 LF；locks:check 磁盘口径 269 一致
   已过，非本票引入。
4. **探针经 node -e 内联**：不落 .mjs 文件=不扩受锁面（免 locks 滚动）；
   探针前经 `sqlite-abi.mjs use node` 切 ABI（node_modules 原为 electron
   ABI 146——首探针 ERR_DLOPEN_FAILED 后切换，幂等无害）。

## 9. 疑虑

- 无阻塞疑虑。
- 备注（非疑虑）：M3 红证依赖 SQLite 无决胜键时同键行的引擎序（实测=rowid
  ASC 输入序；SQLite 文档层面排序稳定性未定义）——但 S2/S5 断言锚定的是我方
  rowid DESC 决胜语义而非引擎序，实现态下确定性由决胜键保证，安全。

## 10. 成本自述

- 实现者 GLM5.3 统一档（GLM-5.3 思考级 builtin），单轮闭环未回炉。
- 工具调用 18 次（读先例池 7+探针 3+编辑 8）；全程约 20 分钟
  （20:54 全量红起测 ~20:56 verify 完成为主段）。
- token 用量：实现者无自估读数（纪律：禁自估上下文占用）。

## 5. 门一审轨迹（供终审复核）
- 初审（kimi-backup，in=10522/out=7147/132s）：**PASS_WITH_WARNINGS 零 BLOCKING**——「实现与票面高度一致：枚举加值向后兼容形态正确/COALESCE+rowid 经前置探针实证、M1 删 COALESCE 为真实红（0-vs-NULL 相对序翻转被 S1 抓住）/S1~S5 逐格具体断言无恒真/三组变异红证成立还原干净/受锁单件最小增量/禁拼接 SQL 零依赖行数上限均不触」。JSON=scripts/audits/p7e-07-gate1.json。
- 2 NIT：①schema 入参面直断言缺（S1~S5 直传 repo，libraryQuerySchema.parse({sort:'cited_desc'}) 枚举放行无直锚——间接由 e2e/UI 与 typecheck 覆盖，后续合法触碰该测试件时补）；②实现者报告自报新测试 106 行 vs diff 实证 111 行（申报精度瑕疵——计数类数字须机器实测的既有纪律再证）。均不阻塞。
- 终审重点面（主控点名）：①COALESCE/决胜键语义终判；②S1~S5+M1~M3 红证完备性；③受锁单件最小增量；④零新 e2e spec 的论证（单测全锚+UI 无新交互模式）是否成立；⑤收口就绪度（:20 注记勘误形态）。
