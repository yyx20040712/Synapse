# P7E-01 门二终审材料包（deepseek 异构二审）

## 0. 审查对象与门一处置背景
- 工单=票面 §2；终态实现=diff（§3）+新文件全文（§4）；实现者报告含回炉轮（§5）。
- 门一 Kimi 判=PASS_WITH_WARNINGS（0B/3W/3N），全文随包（§6）。主控处置：W3（菜单 Esc）+N1（busy 禁关）+W1（恒真断言口径）已回炉落地；W2（S10）裁决豁免（票面补记在 §2 末）；N2（client code 类型断言）记遗留池；N3（INV-53 登记+registry 翻 done）归主控收口（在收口清单）。
- 基线：verify 128 文件 1113 用例→本单后 132 文件 1142（实现者实测+主控复跑 1140 时点后回炉+2）；locks 241；e2e 基线 33。

## 1. 宪法硬规则摘要（AGENTS.md 关键条目）
- 分层单向：ipc→services→repos→db。文件≤500 行；repo≤300；组件≤250。renderer features 跨域互引红线（COMPOSITION_ROOT_ALLOW 白名单制）。
- 安全禁令：禁字符串拼接 SQL（一切 db.prepare 预编译+参数绑定）；禁新增依赖；受锁文件（tests/shared/migrations/CI/lint/构建/脚本）变更须 [locked-change] 提交尾注。
- 测试纪律：测试是锁定合约禁改（本单全部新建文件零触碰既有）；每测试必须能失败一次（先红）；变异红证必须先证命中。
- 完成定义：verify 全绿+grep 无 TODO/FIXME/placeholder+计数数字实测+diff 无范围蔓延。

## 2. 票面（完整任务书，含 S10 豁免补记）
```markdown
# P7E-01 工单票面——标签生命周期（改名/合并/删除，五层规约）

> registry：`P7E-01` / file `src/main/db/repos/tags.repo.ts` / area db / owner strong / open
> 排程真相源=v28 §2 第 1 项（docs/prompts/2026-09-03_loop-handoff-v28-n-batch-done.md）。
> 开工记录：本段技能清点=subagent-driven-development+TDD+verification-before-completion
> 已加载（systematic-debugging 备用；loop 制度已并入 AGENTS 不单独加载；门审走外链）。

## ⓪ 出处（无出处默认不工单化——四链在档）

1. B1 报告 §3 代码内 v2 预留点清单：`tags.service.ts:16 + TagEditor.tsx:92（标签改名/合并/删除）`
   （docs/reports/2026-08-23_v2-blueprint-b1.md:43）。
2. ROADMAP §P7-E 内序领头：「标签生命周期（改名/合并/删除）> 拖拽导入 > …」（docs/ROADMAP.md:386）。
3. tags.repo.ts:25 预留注记：「不做：标签改名/合并（预留：002 迁移 + updateName 方法）」。
4. TagEditor.tsx:92 注记：「×：移除挂接（不动标签本身——删除标签 v2）」。

- **价值**：多标签体系可维护性——错拼标签无法修正（改名）、同义标签无法归一（合并）、
  废弃标签永久残留（删除；现状孤儿仅以 paperCount=0 呈现不可清）。
- **依赖**：零新依赖；错误码 NOT_FOUND/CONFLICT/INVALID_REQUEST 均在 AppErrorCode
  封闭枚举在档（src/shared/app-error.ts:14-16,21）——零新增错误码零 ADR。
- **风险**：①paper_tags 跨表多写打破 repo 既有「单表免事务」前提（需 db.transaction）；
  ②library 筛选 tagId 悬置（删除/合并源后 query.tagId 指向死 id → 空列表）；
  ③renderer 跨域互引红线（TagFilter 禁 import library.store——经 FilterBar 回调注入，
  check-quality.mjs COMPOSITION_ROOT_ALLOW 既有白名单零改）。

## ① 行为层（态空间表先行——store+异步+用户输入，宪法状态机前置条款）

### 主进程三操作（service 校验序，错误语义归 service；repo 持数据事实）

1. `rename({ tagId, name })`：
   - name 经 service trim；trim 后空串 → INVALID_REQUEST「标签名不能为空」（防御，
     zod min(1) 拦不住纯空格）。
   - tagId 不存在 → NOT_FOUND「标签不存在」。
   - trim 后 name 与**其他**标签同名 → CONFLICT「标签名已被占用」（不自动合并——
     数据语义变更必须显式走 merge 通道）。
   - name 与自身现名相同 → 幂等成功，返回该 Tag（单语句 UPDATE，changes=0 亦非错）。
   - 成功返回更新后 Tag。better-sqlite3 同步单连接——service 预检（findByName）与
     UPDATE 之间无交错（repo 头注既有论证口径）。
2. `merge({ sourceId, targetId })`：
   - sourceId === targetId → INVALID_REQUEST「不能合并到自身」（service 层判，zod 表达不了）。
   - 任一 id 不存在 → NOT_FOUND（先 source 后 target，消息带标签 id）。
   - repo 三步**事务**：`INSERT OR IGNORE INTO paper_tags (paper_id, tag_id)
     SELECT paper_id, ?target FROM paper_tags WHERE tag_id = ?source` →
     `DELETE FROM paper_tags WHERE tag_id = ?source` → `DELETE FROM tags WHERE id = ?source`。
   - 双标签同挂的文献由 OR IGNORE 幂等吸收（复合主键冲突吞掉）。返回 `{ ok: true }`。
3. `delete({ tagId })`：
   - 不存在 → NOT_FOUND「标签不存在」。
   - repo 两步**事务**：`DELETE FROM paper_tags WHERE tag_id = ?` →
     `DELETE FROM tags WHERE id = ?`。返回 `{ ok: true }`。

### repo 新增四方法（头注「单表免事务」条款同步修订为「跨表多写用 db.transaction」）

- `findByName(name): TagRow | undefined`（rename 冲突预检）
- `renameTag(id, name): boolean`（UPDATE…WHERE id=?，返回 changes>0）
- `mergeTags(sourceId, targetId): void`（三步事务）
- `deleteTag(id): void`（两步事务）

### IPC 契约（受锁面，主控预解锁）

- schemas.ts 增：`tagIdReqSchema = { tagId: min(1) }.strict()`（delete）；
  `renameTagReqSchema = { tagId: min(1), name: min(1).max(50) }.strict()`；
  `mergeTagReqSchema = { sourceId: min(1), targetId: min(1) }.strict()`。
- api-surface.ts tags 域增三通道：`rename`（Res=tagSchema）/`merge`（trueAckSchema）/
  `delete`（trueAckSchema）。register.ts 泛型全通道遍历**零改**；preload 泛型**零改**。
- ipc/tags.ts 三行委托；tags.service.ts 三方法+校验（NotesDomainError 同型本地
  TagsDomainError：Error+readonly code: AppErrorCode）。

### renderer（tags.store 增三命令型动作；store 形状不变 `{tags,loading,error}`）

- `renameTag(tagId, name)` / `mergeTags(sourceId, targetId)` / `deleteTag(tagId)`：
  `unwrap(api.tags.xxx)` → 成功后内部 `await refresh()`（单一数据源自愈）→ 返回
  `{ ok: true }`；失败返回 `{ ok: false, error: AppError }`（发起方 toast——
  **不经 store.error 字段**，那是列表型 refresh 专用契约，头注已锁定不可复用）。
- busy 态局部在发起组件（TagEditor setBusy 同型），store 不增持久字段。

### 态空间跨格序列表（S1~S10——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| S1 | rename 进行中 → 另一挂载（TagEditor）并发 refresh | loadSeq 既有守卫；rename 完成后链式 refresh 为最新 seq，迟到旧响应丢弃 |
| S2 | delete 成功且 deleted === selectedTagId | TagFilter **先** onFilterChange(null)（setQuery 清 tagId→library 自动重载）**后** onMutated()——顺序反了=死 tagId 查询空列表窗（invocationCallOrder 锚） |
| S3 | merge 成功且 source === selectedTagId | 同 S2（source id 已消失） |
| S4 | merge 成功且 target === selectedTagId | 筛选不动（target id 稳定；papers.queries.ts:93 按 tagId EXISTS 过滤，id 不变仅计数增） |
| S5 | rename 成功 | 筛选不动（id 稳定）；PaperRow tagNames 经 onMutated→library load 更新（改名不改挂接） |
| S6 | rename 撞同名 → CONFLICT | toast「标签名已被占用」，对话框保持开（输入保留），store 零变更零 refresh |
| S7 | delete 返回 NOT_FOUND（列表陈旧——他处已删） | toast + refresh（自愈） |
| S8 | 对话框提交双击 | busy 守卫防重复提交（TagEditor 同型） |
| S9 | tags.length === 1 时开菜单 | 「合并到…」项 disabled（无其他目标） |
| S10 | S2/S3 双触发 library load（setQuery 自动+onMutated） | 幂等读，重复 load 可接受（loadSeq 丢弃旧响应） |

> **S10 豁免补记（门一 W2 裁决，2026-09-03）**：S10 不单列用例——锚定拆解=
> TagFilter 侧双回调各恰一次+顺序（UI 测试 S2/S3 用例 toHaveBeenCalledTimes(1)
> 在场）+library 侧重复 load 幂等由 library.store 既有 loadSeq 守卫承接
> （tests/unit/renderer/library.store.test.ts 已锁定在档——「同族机制已锚，
> 机制宿主非本单新增面」）。

### UI（TagFilter 管理面——视觉决策零新增，全复用既有形态）

- chip 右键（onContextMenu）→ DOM 菜单（LineageBoard/LineageNodeMenu.tsx 同型：
  menu+anchor state、点击外部/Esc 关闭）三项：重命名 / 合并到… / 删除。
- 重命名=Dialog+input 预填现名（LineageTagDialog 同型）；合并=Dialog 内**其他**标签
  chip 按钮列表（TagEditor suggestions 同型，点选即确认）；删除=Dialog 确认文案含
  paperCount（「将删除标签「X」及其在 N 篇文献上的挂接」；N=0 时文案「尚无文献挂接」）。
- TagFilter 增 prop `onMutated?: () => void`（FilterBar 注入 library load——跨域互引
  红线合规路径；FilterBar 已在 COMPOSITION_ROOT_ALLOW 白名单内）。
- TagFilter.tsx 现 79 行；菜单+三对话框若触 250 红线 → 拆 `TagLifecycle.tsx`
  （菜单+三对话框同域内聚，「出现第二职责就拆文件」条款）。

## ② 接口层

见上（契约三 schema+三通道；主进程方法签名=ApiHandlers['tags'] 契约类型自动约束）。

## ③ 架构层

- 分层单向 ipc→services→repos→db 保持；错误语义归 service、数据事实归 repo。
- renderer 零跨域新增 import（TagFilter 只增 props；FilterBar→TagFilter 白名单既有）。
- **接缝边界声明**：lineage 域 LineageNode.tags=JSON 字符串数组（INV-48 独立域）
  与 tags 表**不联动**——重命名/合并/删除不传播到脉络节点标签（两域数据模型解耦，
  INV-48 契约零触碰）。
- corpus 导出/markdown 报告零消费 tags（勘察 grep 实证）——零波及。

## ④ 生命周期层

- tags.service.ts:16 / tags.repo.ts:25 / TagEditor.tsx:92 三处「v2 预留」注记兑现修订
  （删「不做」改「已实现」+本单指针）；tags.repo.ts 头增 `// b3: P7-E` 裁决指针。
- **INV-53 登记**（docs/invariants.md）：标签 id 消失（删除/合并源）后，一切 renderer
  持有的该 id 引用必须当场清空——首登记面=library 筛选 query.tagId（S2/S3）；
  锚=TagFilter.tsx+FilterBar.tsx+library.store.ts setQuery。

## ⑤ 文化层（测试规约——TDD 红→绿→断言级变异红证）

新测试全 **always-active**（不经 guardedDescribe——三屋 K3 条款）：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/repos/tags-lifecycle.repo.test.ts | rename 命中/未命中；findByName；merge 三步（源挂接全迁+源行删+同挂幂等）；delete 两步；**事务原子性**（第二步抛错→全回滚，mock db 语句桩） |
| tests/unit/services/tags-lifecycle.service.test.ts | 校验序全枚举：NOT_FOUND×2/CONFLICT/自合并 INVALID_REQUEST/trim 空 INVALID_REQUEST/同名幂等/成功路径（repos spy 逐参断言） |
| tests/unit/renderer/tags-lifecycle.store.test.ts | S1/S6/S7 + 成功链式 refresh（api 成功后 refresh spy 被调、失败后不被调）+失败返回 {ok:false} |
| tests/unit/renderer/tag-lifecycle-ui.test.tsx | S2/S3（invocationCallOrder：onFilterChange(null) 先于 onMutated）/S8 busy/S9 菜单禁用态 |
| tests/e2e/tag-lifecycle.spec.ts（新 spec，不触既有受锁 spec） | 种子（seedPaperRow 复用）→UI 打两标签→右键改名→chip 与 PaperRow **真实文本**更新→合并→源 chip 消失+目标计数增→删除→chip 消失+（选中态时）筛选自动清空全列表在场 |

- **变异红证 ≥4 组**（实现者执行，报告落盘；主控亲验）：
  M1=repo merge 删第二步 `DELETE paper_tags`（孤儿挂接残留→repo 测试红）；
  M2=service rename 撤 CONFLICT 预检（同名静默 UPDATE→UNIQUE 崩 INTERNAL≠CONFLICT→service 测试红）；
  M3=store 成功后不 refresh（陈旧列表→store 测试红）；
  M4=TagFilter 删 S2 的 onFilterChange(null)（死 id 筛选→UI 测试红）。
- **先红纪律**：每测试文件对未实现面先红（缺失方法/通道即红）再实现转绿——红证
  落盘 scripts/audits/p7e-01-red/*.raw.txt。
- **受锁面**：src/shared/ipc/schemas.ts + api-surface.ts（主控预解锁→实现者最小改动
  →收口 locks:apply）；新测试文件+新源文件诞生即纳入 locks（收口 locks:generate+apply）。
- 已知票面外边界（不修只记）：tags upsert 纯空格名经 trim 后空串可入库（既有行为，
  归 AUDIT-B/后续票）；e2e 全量 verify 铁律（playwright 不查类型，tsc 拦）。

## ⑥ 验收

- `npm run verify` 全绿（基线 128 文件 1113 用例滚动，新增数实测申报）。
- e2e 全量（33+新增）全绿；新 spec 断言渲染真实文本。
- 门一 Kimi 外部链+门二 deepseek 异构终审（材料包含**未跟踪新文件全文**——v28 §3
  教训：git diff 不含新文件）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 工具验证。
- INV-53 登记+三处 v2 注记修订+registry 翻 done。
- 提交 [locked-change] 尾注（schemas/api-surface/新测试入锁/新源文件入锁）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（本环境 Agent 工具面无模型参数——档位=继承主控 GLM5.3
  bigmodel-coding-plan，**显式申报非静默**）；门一=Kimi K3 外部链（重建 gate-call，
  凭证 config b2466f8b 在案）；门二=deepseek-v4-flash 外部（config 8ad55776）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
```

## 3. 已跟踪面终态 diff（git diff -U10）
```diff
diff --git a/src/main/db/repos/tags.repo.ts b/src/main/db/repos/tags.repo.ts
index 85e38cec96..35758280d6 100644
--- a/src/main/db/repos/tags.repo.ts
+++ b/src/main/db/repos/tags.repo.ts
@@ -1,38 +1,49 @@
+// b3: P7-E
 /**
  * [SR-DB-04] tags.repo —— tags / paper_tags 仓储（工单：已实现）
  *
  * ── 行为层 ──
  * - 按名 upsert（同名直接返回既有行，幂等）
  * - 带计数列表 / 挂接 / 摘除
+ * - 标签生命周期（P7E-01）：findByName（rename 冲突预检）/ renameTag /
+ *   mergeTags（三步事务：迁挂接→清源挂接→删源标签行）/ deleteTag（两步事务）
  *
  * ── 接口层 ──
  * - export interface TagsRepo：
  *     upsertByName(name: string): Tag                       // 同名幂等
  *     listWithCounts(): Array<Tag & { paperCount: number }> // paperCount 降序，再按名字典序
  *     attach(paperId: string, tagId: string): void          // INSERT OR IGNORE
  *     detach(paperId: string, tagId: string): void
  *     namesByPaper(paperId: string): string[]               // 名字典序
+ *     findByName(name: string): Tag | undefined             // P7E-01 rename 冲突预检
+ *     renameTag(id: string, name: string): boolean          // P7E-01 UPDATE，changes>0
+ *     mergeTags(sourceId: string, targetId: string): void   // P7E-01 三步事务
+ *     deleteTag(id: string): void                           // P7E-01 两步事务
  *
  * ── 架构层 ──
  * - 依赖：db/connection、shared/models/tag
- * - 孤儿标签（无任何文献引用）由 listWithCounts 自然呈现 paperCount=0，不物理删除
+ * - 孤儿标签（无任何文献引用）由 listWithCounts 自然呈现 paperCount=0；
+ *   物理清理由 deleteTag 承担（P7E-01 起可清）
  * - 全部语句在工厂内 db.prepare 预编译一次，参数一律绑定（禁止拼接）
- * - 每个方法只写一张表（tags 或 paper_tags），无跨表多写 → 不需要 db.transaction；
+ * - 单表方法保持免事务；merge/delete 跨表多写用 db.transaction 包裹
+ *   （P7E-01）——同步事务内多语句原子生效，第二步失败则后续不落地；
  *   better-sqlite3 单连接同步执行，upsert 的"写入后回读"之间不可能被插入其它语句
  * - 挂接引用了不存在的 paper/tag 时由外键约束（foreign_keys=ON）自然抛错，仓储不拦截
  *
  * ── 生命周期层 ──
- * - 不做：标签改名/合并（预留：002 迁移 + updateName 方法）
+ * - 已实现：标签改名/合并/删除（P7E-01；预留注记「002 迁移 + updateName」
+ *   作废——UPDATE 直接改名，name 唯一约束由 service 层 CONFLICT 预检守卫）
  *
  * ── 文化层 ──
  * - 测试：tests/unit/db/repos/tags.repo.test.ts（已锁定）
+ *   + tests/unit/db/repos/tags-lifecycle.repo.test.ts（P7E-01，always-active）
  * - UUID 用 crypto.randomUUID()；tags 表无时间戳列
  */
 import type { Tag } from '../../../shared/models/tag'
 import type { SqliteDb } from '../connection'
 
 /** tags 表行形状（仅 id + name，见 001_init.sql） */
 interface TagRow {
   id: string
   name: string
 }
@@ -46,20 +57,28 @@ interface TagCountRow extends TagRow {
 interface TagNameRow {
   name: string
 }
 
 export interface TagsRepo {
   upsertByName(name: string): Tag
   listWithCounts(): Array<Tag & { paperCount: number }>
   attach(paperId: string, tagId: string): void
   detach(paperId: string, tagId: string): void
   namesByPaper(paperId: string): string[]
+  /** P7E-01：rename 冲突预检（按名查行；TagRow 与 Tag 同形） */
+  findByName(name: string): Tag | undefined
+  /** P7E-01：改名（UPDATE…WHERE id=?；返回 changes>0——同名幂等时可能为 0，非错） */
+  renameTag(id: string, name: string): boolean
+  /** P7E-01：合并（三步事务：迁挂接→清源挂接→删源标签行；双挂由 OR IGNORE 吸收） */
+  mergeTags(sourceId: string, targetId: string): void
+  /** P7E-01：删除（两步事务：清挂接→删标签行） */
+  deleteTag(id: string): void
 }
 
 export function createTagsRepo(db: SqliteDb): TagsRepo {
   const insertTag = db.prepare<[string, string]>(
     'INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
   )
   const tagByName = db.prepare<[string], TagRow>(
     'SELECT id, name FROM tags WHERE name = ?'
   )
   const tagsWithCounts = db.prepare<[], TagCountRow>(
@@ -75,20 +94,39 @@ export function createTagsRepo(db: SqliteDb): TagsRepo {
   const detachTag = db.prepare<[string, string]>(
     'DELETE FROM paper_tags WHERE paper_id = ? AND tag_id = ?'
   )
   const tagNamesByPaper = db.prepare<[string], TagNameRow>(
     `SELECT t.name
        FROM tags t
        JOIN paper_tags pt ON pt.tag_id = t.id
       WHERE pt.paper_id = ?
       ORDER BY t.name ASC`
   )
+  // ── P7E-01 生命周期语句 ──
+  const renameTagStmt = db.prepare<[string, string]>('UPDATE tags SET name = ? WHERE id = ?')
+  // 迁移参数序=(target, source)：SELECT 列位在前（目标），WHERE 在后（源）
+  const migrateAttachments = db.prepare<[string, string]>(
+    `INSERT OR IGNORE INTO paper_tags (paper_id, tag_id)
+     SELECT paper_id, ? FROM paper_tags WHERE tag_id = ?`
+  )
+  const deleteAttachmentsByTag = db.prepare<[string]>('DELETE FROM paper_tags WHERE tag_id = ?')
+  const deleteTagRow = db.prepare<[string]>('DELETE FROM tags WHERE id = ?')
+  // 跨表多写用 db.transaction（头注架构层条款）：第二步失败则后续不落地
+  const mergeTagsTxn = db.transaction((sourceId: string, targetId: string): void => {
+    migrateAttachments.run(targetId, sourceId)
+    deleteAttachmentsByTag.run(sourceId)
+    deleteTagRow.run(sourceId)
+  })
+  const deleteTagTxn = db.transaction((tagId: string): void => {
+    deleteAttachmentsByTag.run(tagId)
+    deleteTagRow.run(tagId)
+  })
 
   return {
     upsertByName(name: string): Tag {
       // 冲突时忽略插入，随后按名回读：新插入行与既有行统一走同一条 SELECT
       insertTag.run(crypto.randomUUID(), name)
       const row = tagByName.get(name)
       if (row === undefined) {
         // 不可达分支：DO NOTHING 后 name 必有对应行（新插入或同名既有）
         throw new Error(`tags.repo.upsertByName：按名回读失败（name=${name}）`)
       }
@@ -108,13 +146,29 @@ export function createTagsRepo(db: SqliteDb): TagsRepo {
       // OR IGNORE：重复挂接幂等（复合主键 paper_id+tag_id 冲突被吞掉）
       attachTag.run(paperId, tagId)
     },
 
     detach(paperId: string, tagId: string): void {
       detachTag.run(paperId, tagId)
     },
 
     namesByPaper(paperId: string): string[] {
       return tagNamesByPaper.all(paperId).map((row) => row.name)
+    },
+
+    findByName(name: string): Tag | undefined {
+      return tagByName.get(name) ?? undefined
+    },
+
+    renameTag(id: string, name: string): boolean {
+      return renameTagStmt.run(name, id).changes > 0
+    },
+
+    mergeTags(sourceId: string, targetId: string): void {
+      mergeTagsTxn(sourceId, targetId)
+    },
+
+    deleteTag(id: string): void {
+      deleteTagTxn(id)
     }
   }
 }
diff --git a/src/main/ipc/tags.ts b/src/main/ipc/tags.ts
index 3ca9c19159..eec9ab58c1 100644
--- a/src/main/ipc/tags.ts
+++ b/src/main/ipc/tags.ts
@@ -1,15 +1,16 @@
 /**
- * [SR-IPC-04] ipc/tags —— 标签域装配（工单：done / weak）
+ * [SR-IPC-04] ipc/tags —— 标签域装配（工单：done / weak + P7E-01）
  *
  * ── 行为层 ──
- * - 纯委托：list→services.tags.list；upsert→….upsert；attach→…；detach→…
+ * - 纯委托：list→services.tags.list；upsert→….upsert；attach→…；detach→…；
+ *   rename/merge/delete→…（P7E-01 生命周期三通道）
  * - 本文件没有任何业务逻辑，每方法一行转调
  *
  * ── 接口层 ──
  * - export function createTagsIpc(deps: IpcDeps): ApiHandlers['tags']
  *
  * ── 架构层 ──
  * - 只 import：IpcDeps 类型、ApiHandlers 契约类型（services 形状）
  * - 禁 import repos/db（分层单向：ipc → services）；zod 校验由 register 统一做
  *
  * ── 生命周期层 ── / ── 文化层 ──
@@ -17,13 +18,16 @@
  * - 测试：tests/unit/ipc/tags.test.ts（已锁定，services 桩）
  */
 import type { ApiHandlers } from '../../shared/ipc/api-surface'
 import type { IpcDeps } from './ipc-deps'
 
 export function createTagsIpc(deps: IpcDeps): ApiHandlers['tags'] {
   return {
     list: (req) => deps.services.tags.list(req),
     upsert: (req) => deps.services.tags.upsert(req),
     attach: (req) => deps.services.tags.attach(req),
-    detach: (req) => deps.services.tags.detach(req)
+    detach: (req) => deps.services.tags.detach(req),
+    rename: (req) => deps.services.tags.rename(req),
+    merge: (req) => deps.services.tags.merge(req),
+    delete: (req) => deps.services.tags.delete(req)
   }
 }
diff --git a/src/main/services/tags.service.ts b/src/main/services/tags.service.ts
index 8c40c2bd68..a4773d0428 100644
--- a/src/main/services/tags.service.ts
+++ b/src/main/services/tags.service.ts
@@ -1,33 +1,56 @@
 /**
- * [SR-SVC-09] tags.service —— 标签用例（工单：done / weak）
+ * [SR-SVC-09] tags.service —— 标签用例（工单：done / weak + P7E-01）
  *
  * ── 行为层 ──
  * - list：repos.tags.listWithCounts()
  * - upsert：repos.tags.upsertByName（去空格）
  * - attach/detach：转调 repo 后返回 { ok: true }
+ * - 生命周期三操作（P7E-01，错误语义归 service、数据事实归 repo）：
+ *   rename：trim 空→INVALID_REQUEST；tagId 不存在→NOT_FOUND；与其他标签
+ *   同名→CONFLICT（不自动合并——数据语义变更必须显式走 merge）；与自身
+ *   现名相同→幂等成功（repo 的 changes 在该情形可能为 0，不作 NOT_FOUND 信号）
+ *   merge：自身→INVALID_REQUEST；源/目标任一不存在→NOT_FOUND（先源后目标，
+ *   消息带标签 id）；成功转调 repo 三步事务
+ *   delete：不存在→NOT_FOUND；成功转调 repo 两步事务
  *
  * ── 接口层 ──
  * - export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags']
  *
  * ── 架构层 ──
- * - 纯透传薄层（存在的原因：ipc 禁止直连 repos 的分层规则）
+ * - 存在性预检经 listWithCounts（携带全量 id；本地单用户小表——repo 面保持
+ *   票面四方法不增 findById）；better-sqlite3 同步单连接，预检与写入之间无交错
+ * - TagsDomainError：Error+readonly code: AppErrorCode（NotesDomainError 同型），
+ *   register 经 toAppError 折叠为 AppError 透传 renderer
  *
  * ── 生命周期层 ──
- * - 不做：改名/合并/删除标签（v2）
+ * - 改名/合并/删除已实现（P7E-01——原「v2 预留」注记兑现）
  *
  * ── 文化层 ──
  * - 测试：tests/unit/services/tags.service.test.ts（已锁定，repos 桩）
+ *   + tests/unit/services/tags-lifecycle.service.test.ts（P7E-01，always-active）
  */
+import type { AppErrorCode } from '../../shared/app-error'
 import type { ApiHandlers } from '../../shared/ipc/api-surface'
 import type { Repos } from '../db/repos'
 
+/** 域错误载体（rename/merge/delete 的校验序拒绝；与 notes 域 DomainError 同构） */
+class TagsDomainError extends Error {
+  readonly code: AppErrorCode
+
+  constructor(code: AppErrorCode, message: string) {
+    super(message)
+    this.name = 'TagsDomainError'
+    this.code = code
+  }
+}
+
 export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags'] {
   const { tags } = deps.repos
 
   return {
     async list(_req) {
       return tags.listWithCounts()
     },
 
     // 同名幂等由 repo 的 upsertByName 保证；service 只做输入清理（去首尾空格）
     async upsert(req) {
@@ -36,13 +59,55 @@ export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags'] {
 
     // INSERT OR IGNORE：重复挂接幂等，无需存在性分支
     async attach(req) {
       tags.attach(req.paperId, req.tagId)
       return { ok: true as const }
     },
 
     async detach(req) {
       tags.detach(req.paperId, req.tagId)
       return { ok: true as const }
+    },
+
+    async rename(req) {
+      const name = req.name.trim()
+      if (name === '') {
+        // zod min(1) 拦不住纯空格——service 防御（票面校验序第 1 步）
+        throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
+      }
+      if (!tags.listWithCounts().some((t) => t.id === req.tagId)) {
+        throw new TagsDomainError('NOT_FOUND', '标签不存在')
+      }
+      const clash = tags.findByName(name)
+      if (clash !== undefined && clash.id !== req.tagId) {
+        // 不自动合并：同名占用必须显式走 merge 通道（数据语义变更）
+        throw new TagsDomainError('CONFLICT', '标签名已被占用')
+      }
+      tags.renameTag(req.tagId, name)
+      // 冲突已排除：同名行只能是自身——直接构造更新后 Tag（幂等路径亦成立）
+      return { id: req.tagId, name }
+    },
+
+    async merge(req) {
+      if (req.sourceId === req.targetId) {
+        throw new TagsDomainError('INVALID_REQUEST', '不能合并到自身')
+      }
+      const ids = new Set(tags.listWithCounts().map((t) => t.id))
+      if (!ids.has(req.sourceId)) {
+        throw new TagsDomainError('NOT_FOUND', `合并源标签不存在：${req.sourceId}`)
+      }
+      if (!ids.has(req.targetId)) {
+        throw new TagsDomainError('NOT_FOUND', `合并目标标签不存在：${req.targetId}`)
+      }
+      tags.mergeTags(req.sourceId, req.targetId)
+      return { ok: true as const }
+    },
+
+    async delete(req) {
+      if (!tags.listWithCounts().some((t) => t.id === req.tagId)) {
+        throw new TagsDomainError('NOT_FOUND', '标签不存在')
+      }
+      tags.deleteTag(req.tagId)
+      return { ok: true as const }
     }
   }
 }
diff --git a/src/renderer/features/library/FilterBar.tsx b/src/renderer/features/library/FilterBar.tsx
index e342cd3ff8..482425045d 100644
--- a/src/renderer/features/library/FilterBar.tsx
+++ b/src/renderer/features/library/FilterBar.tsx
@@ -1,17 +1,19 @@
 /**
  * [SR-LIB-05] FilterBar —— 搜索与筛选栏（工单：done / weak）
  *
  * ── 行为层 ──
  * - FTS 搜索框（useDebounce 300ms 后回写 store.query.search；空串回 undefined 清条件）
  * - 下拉：集合（api.library.collections）、年份（library.store 列表数据推导）、排序三选
  * - TagFilter 组件嵌于此（标签过滤，v1 单选）
+ * - P7E-01：TagFilter onMutated 注入 library load（标签改名/合并/删除后行内
+ *   tagNames 徽标与筛选计数需重载——跨域回调注入，TagFilter 零 import library.store）
  *
  * ── 接口层 ──
  * - export function FilterBar(props: { query: LibraryQuery;
  *     onChange(patch: Partial<LibraryQuery>): void }): JSX.Element
  *
  * ── 架构层 ──
  * - 受控组件；集合列表属静态参考数据故自取（useAsync），其余数据全部来自 props/store
  *
  * ── 生命周期层 ── / ── 文化层 ──
  * - 搜索首帧不回写（初值即 query.search，防挂载重复 load）；空选项值 '' 统一映射 undefined
@@ -29,20 +31,21 @@ const SORT_LABEL: Record<LibrarySort, string> = {
   year_desc: '年份新→旧',
   title_asc: '标题 A→Z'
 }
 
 export function FilterBar(props: {
   query: LibraryQuery
   onChange: (patch: Partial<LibraryQuery>) => void
 }): JSX.Element {
   const { query, onChange } = props
   const papers = useLibraryStore((s) => s.papers)
+  const loadLibrary = useLibraryStore((s) => s.load)
   const [text, setText] = useState(query.search ?? '')
   const debounced = useDebounce(text, 300)
   const { data: collections, run: loadCollections } = useAsync(
     () => unwrap(api.library.collections({})),
     []
   )
   useEffect(() => {
     void loadCollections()
   }, [loadCollections])
 
@@ -102,14 +105,15 @@ export function FilterBar(props: {
           {Object.entries(SORT_LABEL).map(([value, label]) => (
             <option key={value} value={value}>
               {label}
             </option>
           ))}
         </select>
       </div>
       <TagFilter
         selectedTagId={query.tagId ?? null}
         onFilterChange={(tagId) => onChange({ tagId: tagId ?? undefined })}
+        onMutated={() => void loadLibrary()}
       />
     </div>
   )
 }
diff --git a/src/renderer/features/tags/TagEditor.tsx b/src/renderer/features/tags/TagEditor.tsx
index 5c095176b3..dbff14764c 100644
--- a/src/renderer/features/tags/TagEditor.tsx
+++ b/src/renderer/features/tags/TagEditor.tsx
@@ -82,21 +82,21 @@ export function TagEditor(props: {
       await unwrap(api.tags.attach({ paperId, tagId: tag.id }))
       setInput('')
       onChanged()
     } catch (e) {
       showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
     } finally {
       setBusy(false)
     }
   }
 
-  /** ×：移除挂接（不动标签本身——删除标签 v2） */
+  /** ×：移除挂接（不动标签本身——标签删除走 TagFilter 管理面，P7E-01 已实现） */
   async function removeTag(tagId: string): Promise<void> {
     if (busy) return
     setBusy(true)
     try {
       await unwrap(api.tags.detach({ paperId, tagId }))
       onChanged()
     } catch (e) {
       showToast(e instanceof ApiClientError ? e.message : TAG_OP_FAILED, 'error')
     } finally {
       setBusy(false)
diff --git a/src/renderer/features/tags/TagFilter.tsx b/src/renderer/features/tags/TagFilter.tsx
index 8411bb4a48..c3bd9d6081 100644
--- a/src/renderer/features/tags/TagFilter.tsx
+++ b/src/renderer/features/tags/TagFilter.tsx
@@ -1,57 +1,92 @@
 /**
- * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak）
+ * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak + P7E-01）
  *
  * ── 行为层 ──
  * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
  * - 选中态变化 → props.onFilterChange(tagId | null)（v1 单选标签过滤，多选 v2）
+ * - 管理面（P7E-01）：chip 右键 → 菜单（重命名/合并到…/删除）→ 三对话框
+ *   （TagLifecycle 拆件承载）；变更成功经 onMutated 上抛（FilterBar 注入
+ *   library load——跨域互引红线合规路径，白名单既有）
  *
  * ── 接口层 ──
  * - export function TagFilter(props: { selectedTagId: string | null;
- *     onFilterChange(tagId: string | null): void }): JSX.Element
+ *     onFilterChange(tagId: string | null): void;
+ *     onMutated?: () => void }): JSX.Element
  *
  * ── 架构层 ──
  * - 数据自取：tags.store（挂载 refresh——行为层的"数据 tags.store"为准，建议/
  *   筛选共享单一数据源）；纯展示交互，自身不发其他请求
+ * - 死 id 筛选清空顺序（S2/S3）：变更涉及消失 id 且===selectedTagId 时，先
+ *   onFilterChange(null)（setQuery 清 tagId→library 自动重载）后 onMutated()
+ *   ——顺序反了=死 tagId 查询空列表窗（INV-53）
  *
  * ── 生命周期层 ── / ── 文化层 ──
  * - 空标签库显示引导文案（先在详情侧栏打标签）
+ * - 测试：tests/unit/renderer/tag-lifecycle-ui.test.tsx（P7E-01，always-active）
  */
-import { useEffect, useRef } from 'react'
+import { useEffect, useRef, useState } from 'react'
 import { showToast } from '../../shared/ui/Toast'
-import { useTagsStore } from './tags.store'
+import { useTagsStore, type TagWithCount } from './tags.store'
+import { TagLifecycleMenu } from './TagLifecycleMenu'
+import { TagRenameDialog, TagMergeDialog, TagDeleteDialog } from './TagLifecycle'
+
+/** 管理面局部态：右键锚点菜单 / 打开中的对话框（同时刻至多一个） */
+interface MenuState {
+  tag: TagWithCount
+  anchor: { x: number; y: number }
+}
+interface DialogState {
+  kind: 'rename' | 'merge' | 'delete'
+  tag: TagWithCount
+}
 
 export function TagFilter(props: {
   selectedTagId: string | null
   onFilterChange: (tagId: string | null) => void
+  onMutated?: () => void
 }): JSX.Element {
-  const { selectedTagId, onFilterChange } = props
+  const { selectedTagId, onFilterChange, onMutated } = props
   const tags = useTagsStore((s) => s.tags)
   const refresh = useTagsStore((s) => s.refresh)
   const listError = useTagsStore((s) => s.error)
+  const [menu, setMenu] = useState<MenuState | null>(null)
+  const [dialog, setDialog] = useState<DialogState | null>(null)
 
   useEffect(() => {
     void refresh()
   }, [refresh])
   // 列表型失败经 store.error 暴露，在此 toast（与 TagEditor 同口径）。迁移守卫：
   // 挂载时已残留的旧失败不重播（本次挂载已触发新 refresh），仅"挂载期间
   // null→失败"的转变才 toast——重挂载不再对历史失败刷屏
   const seenError = useRef(listError)
   useEffect(() => {
     if (listError !== seenError.current) {
       seenError.current = listError
       if (listError !== null) {
         showToast(`标签列表刷新失败：${listError}`, 'error')
       }
     }
   }, [listError])
 
+  /**
+   * 生命周期变更成功上抛（S2/S3/S4/S5 顺序契约）：
+   * disappearedId=null（rename）或稳定 id（合并目标选中）→筛选不动；
+   * 消失 id===selectedTagId→先 onFilterChange(null) 清死 id，后 onMutated()。
+   */
+  function handleMutated(disappearedId: string | null): void {
+    if (disappearedId !== null && disappearedId === selectedTagId) {
+      onFilterChange(null)
+    }
+    onMutated?.()
+  }
+
   if (tags.length === 0) {
     return (
       <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
         暂无标签可筛选（在详情侧栏为文献打标签）
       </span>
     )
   }
   return (
     <div className="flex flex-wrap items-center gap-1" role="group" aria-label="标签筛选">
       {tags.map((t) => {
@@ -61,18 +96,69 @@ export function TagFilter(props: {
             key={t.id}
             type="button"
             aria-pressed={active}
             className="rounded-full border px-2 py-0.5 text-xs"
             style={{
               borderColor: active ? 'var(--accent)' : 'var(--border)',
               background: active ? 'var(--accent-soft)' : 'var(--panel)',
               color: active ? 'var(--accent)' : 'var(--text)'
             }}
             onClick={() => onFilterChange(active ? null : t.id)}
+            onContextMenu={(e) => {
+              e.preventDefault()
+              setMenu({ tag: t, anchor: { x: e.clientX, y: e.clientY } })
+            }}
           >
             {t.name}（{t.paperCount}）
           </button>
         )
       })}
+
+      {menu !== null && (
+        <TagLifecycleMenu
+          tag={menu.tag}
+          canMerge={tags.length > 1}
+          anchor={menu.anchor}
+          onClose={() => setMenu(null)}
+          onRename={(tag) => {
+            setDialog({ kind: 'rename', tag })
+            setMenu(null)
+          }}
+          onMerge={(tag) => {
+            setDialog({ kind: 'merge', tag })
+            setMenu(null)
+          }}
+          onDelete={(tag) => {
+            setDialog({ kind: 'delete', tag })
+            setMenu(null)
+          }}
+        />
+      )}
+
+      {dialog?.kind === 'rename' && (
+        <TagRenameDialog
+          key={dialog.tag.id}
+          tag={dialog.tag}
+          onClose={() => setDialog(null)}
+          onMutated={handleMutated}
+        />
+      )}
+      {dialog?.kind === 'merge' && (
+        <TagMergeDialog
+          key={dialog.tag.id}
+          source={dialog.tag}
+          targets={tags.filter((t) => t.id !== dialog.tag.id)}
+          onClose={() => setDialog(null)}
+          onMutated={handleMutated}
+        />
+      )}
+      {dialog?.kind === 'delete' && (
+        <TagDeleteDialog
+          key={dialog.tag.id}
+          tag={dialog.tag}
+          onClose={() => setDialog(null)}
+          onMutated={handleMutated}
+        />
+      )}
     </div>
   )
 }
diff --git a/src/renderer/features/tags/tags.store.ts b/src/renderer/features/tags/tags.store.ts
index 058c88312a..f516513c40 100644
--- a/src/renderer/features/tags/tags.store.ts
+++ b/src/renderer/features/tags/tags.store.ts
@@ -1,46 +1,86 @@
 /**
- * [SR-TAG-03] tags.store —— 标签状态（工单：done / weak）
+ * [SR-TAG-03] tags.store —— 标签状态（工单：done / weak + P7E-01）
  *
  * ── 行为层 ──
  * - { tags: Array<Tag & { paperCount: number }>; loading: boolean; error: string | null }
  * - refresh()：api.tags.list
+ * - 命令型三动作（P7E-01）：renameTag/mergeTags/deleteTag——
+ *   成功→内部 await refresh()（单一数据源自愈）后返回 { ok: true }；
+ *   失败→返回 { ok: false, error: AppError }（发起方 toast——不经 store.error
+ *   字段，那是列表型 refresh 专用契约）；NOT_FOUND（列表陈旧——他处已删）失败
+ *   额外 refresh 自愈，其余错误零 refresh（S6/S7 分流）
  * - 错误契约（全 store 统一）：refresh 属列表型——失败不抛、保留旧 tags；失败信息
  *   记入 error 字段（下次 refresh 发起清空、成功置 null），由消费方（TagEditor/
  *   TagFilter）watch error toast——错误可达且不重复归责（2026-08-23 Q2-A3 落地）
  *
  * ── 接口层 ──
  * - export const useTagsStore: UseBoundStore<...>
+ * - export interface TagsStore；export type TagsMutationResult / TagWithCount
  *
  * ── 架构层 ──
  * - 只 import api/client 与 shared 模型；禁止 import 组件
- * - 消费方：TagEditor（下拉建议）/ TagFilter（筛选 chip）——单一数据源，挂载时 refresh
+ * - 消费方：TagEditor（下拉建议）/ TagFilter（筛选 chip+管理面）——单一数据源，
+ *   挂载时 refresh；busy 态局部在发起组件（TagEditor setBusy 同型），store 不增持久字段
  *
  * ── 生命周期层 ── / ── 文化层 ──
  * - 测试：tests/unit/renderer/tags.store.test.ts（已锁定，api 桩）
+ *   + tests/unit/renderer/tags-lifecycle.store.test.ts（P7E-01，always-active）
  */
 import { create } from 'zustand'
-import { api, unwrap } from '../../api/client'
+import { api, unwrap, ApiClientError } from '../../api/client'
+import type { AppError, AppErrorCode } from '@shared/app-error'
 import type { Tag } from '@shared/models/tag'
 
+/** 带计数的标签行（listWithCounts 形状——组件消费的单一类型来源） */
+export type TagWithCount = Tag & { paperCount: number }
+
+/** 命令型动作返回：发起方据 ok 分支 toast（错误不进 store.error） */
+export type TagsMutationResult = { ok: true } | { ok: false; error: AppError }
+
+/** 意外异常（非 ApiClientError）时的兜底中文消息 */
+const TAG_OP_FAILED = '标签操作失败'
+
 export interface TagsStore {
-  tags: Array<Tag & { paperCount: number }>
+  tags: TagWithCount[]
   loading: boolean
   /** 最近一次 refresh 的失败信息（成功/新发起时清空）——消费方 watch 后 toast */
   error: string | null
   refresh(): Promise<void>
+  renameTag(tagId: string, name: string): Promise<TagsMutationResult>
+  mergeTags(sourceId: string, targetId: string): Promise<TagsMutationResult>
+  deleteTag(tagId: string): Promise<TagsMutationResult>
 }
 
-export const useTagsStore = create<TagsStore>()((set) => {
+export const useTagsStore = create<TagsStore>()((set, get) => {
   // 请求序号（store 闭包，对齐 library.store）：TagEditor/TagFilter 双挂载并发 refresh
   // 时只认最后一次发起的请求——迟到的旧响应（含旧失败）不污染最新 tags/error
   let loadSeq = 0
+
+  /** 命令型动作共用壳：成功链式 refresh；NOT_FOUND 失败自愈 refresh（S7），余零 refresh（S6） */
+  async function mutate(run: () => Promise<unknown>): Promise<TagsMutationResult> {
+    try {
+      await run()
+      await get().refresh()
+      return { ok: true }
+    } catch (e) {
+      const error: AppError =
+        e instanceof ApiClientError
+          ? { code: e.code as AppErrorCode, message: e.message }
+          : { code: 'INTERNAL', message: TAG_OP_FAILED }
+      // NOT_FOUND=本地列表陈旧（他处已删/已改）——重拉自愈；其余（CONFLICT/
+      // INVALID_REQUEST 等）是用户输入问题，零 refresh 保持对话框态（S6）
+      if (error.code === 'NOT_FOUND') await get().refresh()
+      return { ok: false, error }
+    }
+  }
+
   return {
     tags: [],
     loading: false,
     error: null,
 
     refresh: async () => {
       const seq = ++loadSeq
       set({ loading: true, error: null })
       try {
         const tags = await unwrap(api.tags.list({}))
@@ -48,13 +88,17 @@ export const useTagsStore = create<TagsStore>()((set) => {
         set({ tags, loading: false, error: null })
       } catch (e) {
         if (seq !== loadSeq) return
         // 列表型错误契约：不抛、保留旧 tags（loading 复位），失败信息经 error 字段
         // 暴露——消费方 watch toast（store 不 import UI 模块，分层单向）
         set({
           loading: false,
           error: e instanceof Error && e.message !== '' ? e.message : '标签列表刷新失败'
         })
       }
-    }
+    },
+
+    renameTag: (tagId, name) => mutate(() => unwrap(api.tags.rename({ tagId, name }))),
+    mergeTags: (sourceId, targetId) => mutate(() => unwrap(api.tags.merge({ sourceId, targetId }))),
+    deleteTag: (tagId) => mutate(() => unwrap(api.tags.delete({ tagId })))
   }
 })
diff --git a/src/shared/ipc/api-surface.ts b/src/shared/ipc/api-surface.ts
index 5727a67581..b66352c9cb 100644
--- a/src/shared/ipc/api-surface.ts
+++ b/src/shared/ipc/api-surface.ts
@@ -77,21 +77,25 @@ export const API_SURFACE = {
     graph: { channel: 'lineage/graph', Req: S.voidReqSchema, Res: S.lineageGraphResSchema },
     upsertNode: { channel: 'lineage/upsert-node', Req: S.lineageUpsertNodeReqSchema, Res: lineageNodeSchema },
     removeNode: { channel: 'lineage/remove-node', Req: S.lineageIdReqSchema, Res: S.trueAckSchema },
     upsertEdge: { channel: 'lineage/upsert-edge', Req: S.lineageUpsertEdgeReqSchema, Res: lineageEdgeSchema },
     removeEdge: { channel: 'lineage/remove-edge', Req: S.lineageIdReqSchema, Res: S.trueAckSchema }
   },
   tags: {
     list: { channel: 'tags/list', Req: S.voidReqSchema, Res: z.array(S.tagWithCountSchema) },
     upsert: { channel: 'tags/upsert', Req: S.tagNameReqSchema, Res: tagSchema },
     attach: { channel: 'tags/attach', Req: S.attachTagReqSchema, Res: S.trueAckSchema },
-    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema }
+    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema },
+    // P7E-01 标签生命周期三通道（register/preload 泛型全通道遍历零改）
+    rename: { channel: 'tags/rename', Req: S.renameTagReqSchema, Res: tagSchema },
+    merge: { channel: 'tags/merge', Req: S.mergeTagReqSchema, Res: S.trueAckSchema },
+    delete: { channel: 'tags/delete', Req: S.tagIdReqSchema, Res: S.trueAckSchema }
   },
   notes: {
     get: { channel: 'notes/get', Req: S.paperIdReqSchema, Res: S.noteGetResSchema },
     save: { channel: 'notes/save', Req: S.noteSaveReqSchema, Res: noteSchema },
     remove: { channel: 'notes/remove', Req: S.noteIdReqSchema, Res: S.trueAckSchema }
   },
   settings: {
     get: { channel: 'settings/get', Req: S.voidReqSchema, Res: S.appSettingsSchema },
     set: { channel: 'settings/set', Req: S.appSettingsSchema, Res: S.appSettingsSchema },
     diagNetwork: { channel: 'settings/diag-network', Req: S.voidReqSchema, Res: S.netDiagResSchema }
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index 950de3e3ee..f0608e1913 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -340,20 +340,30 @@ export const corpusSetResSchema = z
   })
   .strict()
 
 // ── tags ────────────────────────────────────────────────────────
 export const tagWithCountSchema = tagSchema.extend({ paperCount: z.number().int().min(0) })
 export const tagNameReqSchema = z.object({ name: z.string().min(1).max(50) }).strict()
 export const attachTagReqSchema = z
   .object({ paperId: z.string().min(1), tagId: z.string().min(1) })
   .strict()
 export const detachTagReqSchema = attachTagReqSchema
+/** P7E-01 标签生命周期三请求（delete） */
+export const tagIdReqSchema = z.object({ tagId: z.string().min(1) }).strict()
+/** P7E-01 rename（name 与 upsert 同界：min(1) 拦不住纯空格，service 层再 trim 判空） */
+export const renameTagReqSchema = z
+  .object({ tagId: z.string().min(1), name: z.string().min(1).max(50) })
+  .strict()
+/** P7E-01 merge（source===target 的业务拒绝在 service——zod 表达不了跨字段） */
+export const mergeTagReqSchema = z
+  .object({ sourceId: z.string().min(1), targetId: z.string().min(1) })
+  .strict()
 
 // ── notes ───────────────────────────────────────────────────────
 export const noteGetResSchema = noteSchema.nullable()
 /** 笔记标题长度上限（INV-11 单一真相源：schema 校验与面板 maxLength 同源消费，禁止两处字面量对齐） */
 export const NOTE_TITLE_MAX = 200
 export const noteSaveReqSchema = z
   .object({ paperId: z.string().min(1), title: z.string().max(NOTE_TITLE_MAX), contentMd: z.string() })
   .strict()
 export const noteIdReqSchema = z.object({ noteId: z.string().min(1) }).strict()
 
diff --git a/tickets/registry.ts b/tickets/registry.ts
index caef631251..c4edeccf00 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -223,20 +223,21 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'SR2-AI-12', file: 'src/renderer/features/reader/ai-note-style.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 笔记组头补原始命题（b3: P7-G；复测缺陷 P2 修复——组头仅「第N问」短标签读者对不上号，七问原始命题仓内零存在唯一源=蓝图 §4.2 表：QUESTION_TEXT 映射新增（七值机器抽取 diff 证逐字誊自蓝图；类型 Record<Exclude<AiNoteQuestion,divergence>,string>——divergence 为角色节非七问成员保持短标签，Exclude=编译器强制两消费位分歧唯一形态）+两消费位组头拼「第N问：原始命题」（AiNoteGroupList h4+LineageSideAiNotes h5——跨域单源自动同达合 INV-11）；纯 renderer 呈现面零 IPC 零 shared；受锁必然红 5 处先行留证（ai-notes-section×3+lineage-side-panel:291+e2e 两 spec）+ai-note-style.test TEXT 键集非空新 it；联审 0B/3W/5N PASS——誊录逐字性联审独立机器重演 diff 空，W3 Q4~Q7 文案持续锁定缺口记遗留池（键集断言拦键漂移不拦值漂移））[locked-change]——票面 scripts/audits/sr2-ai-12-brief.md；依赖 AI-11 转置组头位' },
   { id: 'SR2-F-08', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选视觉反馈回退官方原生半透明（F1 修正役 R1 路线——ADR-0019；复测站 3「全面失败+0.5~5s 延迟」根修）：①text-layer.css ::selection/::-moz-selection 回官方 rgba(0 0 255 / 0.25)（逐字对照 pdfjs-dist pdf_viewer.css:678-685；br 两规则保持 transparent）；②删 SelectionRects.tsx 整件+SelectionLayer 摘 overlay 计算/渲染（P10 方案切换=删旧）；③视觉通道=原生 ::selection（拖选第一帧即反馈，零 JS 链路——取证：自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+拖选期死寂=根因双实锤，O(n) 遍历 0~0.6ms 假说证伪）；④工具条/保存/undo/Escape 零变；AnnotationLayer 单层 multiply+AI 层去 multiply（F-07 层间修复）保留；⑤受锁两文件第三次改写：e2e F-06 小票 C 节（官方半透明精确值+selection-rects 防回归 0 计数+L7 延迟预算 toolbar≤1.5s）+unit F-07a 改防回归守卫/F-07b 删——票面 scripts/audits/sr2-f-08-brief.md；取证 scripts/audits/f1-forensics.report.md；三屋：实现 1.95M tok/858 用例绿+门一 PASS 0B/4W/7N+门二 PASS 零回炉（W3=INV-37 登记）；依赖 ADR-0019 裁决' },
   { id: 'SR2-F-09', file: 'src/renderer/features/reader/text-layer.css', area: 'reader', owner: 'strong', status: 'done', summary: '划选选中色改灰（用户令 2026-08-29：仿 WPS——灰色选中/标注纯色；v5 核查=标注纯色+重合不加重已成立零改）：text-layer.css ::selection/::-moz-selection rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（≈白纸 #B3B3B3）；受锁 e2e reader-text.spec F-06 小票 C 节精确值断言+测试名同步；INV-37/ADR-0019 补记（用户指令偏离官方值的显式登记）；压缩路径票（单值变更+守卫同步，主控直做——变异红证 sr2-f-09-mutation.raw.txt：css 改回蓝→F-06 小票红点精确锁值；verify 858+locks+e2e 25 passed 全绿；v5b 真机像素证=差分区 93.3% 中性灰/均值 rgb(151,154,155)）；核查档 scripts/audits/f1-out/f1-forensics5.json+v5 截图+执行记录 sr2-f-09-record.md' },
   { id: 'R2-LG11', file: 'src/renderer/features/lineage/LineageNodeCard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络重制浅色严谨板（U2a=U2 修正役零 schema 先行单元——用户五决 2026-08-29 落地；R2-LG9 星象板方向否决后的修正延续=R2 系）：白卡+边框编码 A 线型×色阶（核心=accent 1.5 实线/普通=node-branch 1 实线/主题+综述=虚线 6-4；选中 +0.75）+foreignObject 题名换行 ≤3 行省略+title tooltip（LineageNodeCard:78 单行 text 根修）+nodeHeight 卡高单源（INV-38 三消费 1/2/3 行=64/82/100）+isSurvey/isCore 纯函数+综述布局右缘新列+综述关联边淡灰虚线 2-3（决3）+夜幕系脉络域摘除（.lineage-host 白底+LineageNightDecor 删+图例改写 LineageLegend 四项+工具条/适应视图/侧板三件白玻璃化+脉络衬线年份摘除=决5 连带）+BAND_LEFT 单源（B1 清账）；**isCore 出度口径修正（2026-08-29 真机复评裁决）**：初版「入度≥2」在 INV-27 树单父约束下数学恒假（合法图入度≤1 恒不触发；取证器 fixture 造双入边被 service 多父守卫拒=单测全绿≠真实数据形态可达的活证据）——「被引≥2 开宗立派」=≥2 继承者=出度≥2，主控压缩票直做（classify.ts+classify.test/visual.test 夹具同步+票面/INV-38 更正+变异红证 mutation-5.log 4 it 红）；受锁改写 lineage-canvas R2-LG9 块（拆 lineage-canvas-visual.test.tsx——max-lines 500）+lineage-layout 增两 describe+lineage-side-panel :311 夜化 it+新 lineage-classify.test（locks 163+取证器 r2-lg11-forensics.mjs 入锁=164）；e2e lineage.spec 零改（预裁兑现）；三屋：实现者 15.8M tok（875 用例精确命中 858−5+7+7+8）+门一 B0/W6/N9 PASS（6W 主控处置：W1/W2 申报、W3 主控补跑 mutation-4 GAP 精确值红、W4/W5/W6 遗留池）+门二 PASS 可直接收口；真机复评四线全过（wrapInBox/borderDiscernible/noRegression/surveyRight——取证档 scripts/audits/r2-lg11-out/ json+png；ABI 换绑 Windows 文件锁竞态=取证器 hash 校验防线+缓冲，环境怪癖常量化）；票面 scripts/audits/r2-lg11-brief.md+实现/门一/门二报告三份在档；裁决母本 docs/prompts/2026-08-29_loop-handoff-v3.md §2/§3' },
   { id: 'R2-LG12', file: 'src/main/services/lineage/lineage.service.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '综述多参考边数据面（U2b——用户裁决 2026-08-29「A. 完整多参考边」AskUserQuestion 在案）：lineageEdge 增 kind:tree|ref（出口必填/upsert 可选缺省 tree/service+importDraft 双写路径显式填；draft 协议零改）+迁移 006（ADD COLUMN kind TEXT NOT NULL DEFAULT tree——旧行幂等+migrate.test [1..5,6]）+service upsertEdge 受控豁免分支（ref 豁免多父且 tree 侧收窄 ref 入边不算 tree 父=对偶自洽/仍拒环=混合图 reachable/同端点对 tree+ref 互斥拒/from 双条件 paperId≠null+isSurveyTitle——判定上移 shared/models 单源+renderer re-export 消费面零改）+layout 净化段剔 ref 边（不计 dropped——有意分流）+渲染 ref=var(--survey-edge) 1.4 虚 2-3（直读 e.kind，优先级 ref>综述关联>推断>普通）+综述右键「添加参考连接」入口（pending-link mode 扩展 ref）+INV-27 修订登记（tree 单父原样/ref 受控豁免条款）；受锁面=shared models+ipc schemas+006 迁移+lineage-import/layout/visual 三测+6 测试工厂 kind 波及+e2e lineage.spec T5（综述幽灵行第四篇独立 fixture→右键→点已有 tree 父的甲=豁免面→ref path 精确断言→reload 持久+负锚非综述无菜单项）；三屋：实现者 10.0M tok（883 用例精确命中 875+service6+layout1+visual1+变异红证 4 档含 M2 混合环盲区拦截/M4 自环 reason 红点）+门一 B0/W2/N6（W1=check-tickets R2 系正则盲区建单时已知设计、W2=主控 diff 包 git add 失误门一补全）+门二 PASS 零回炉（W3 剪贴板复验落盘补跑 2.0s 过/N7 首红未落盘教训回流）；收口：verify exit=0（locks 165=164+006）+e2e 26/26 终态（T5 首跑即过+corpus 超时 2.5s 单跑复验=负载 flake+剪贴板 2.0s 复验）；票面 r2-lg12-brief.md+三报告+收口单在档' },
   { id: 'R2-SH1', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '应用重命名 Synapse Remake→Synapse+userData 数据迁移（U3a——独立成票单独审计·handoff §8；⚠landmine=userData 目录名派生自 productName=用户真实数据目录搬迁，复用 WS1 幂等模式）：package.json name/productName 同步+文本消费位（main-window 标题/App 品牌位/index.html title 超票面发现+受锁 smoke.spec/app-shell.test 断言）+grep 口径修正（消费/注释面清零；迁移模块+测试功能面字面量 6 处=契约钉死豁免——门一 W1 结构性调和裁决）；迁移=独立模块 migrate-user-data.ts（纯 node:fs 零 electron 可测性）bootstrap 最早段——分支矩阵：旧在新无→renameSync 原子迁移+显式 setPath（Electron 启动期缓存派生值=实现者超票面发现，userDataDir 取值在迁移后=时序无竞态主控独立核实+门一交叉验证）；新已存在→跳过（天然备份）；皆无→全新；rename 失败→回落旧路径运行（数据安全优先）+warn；受锁=constants 邮箱域/smoke/app-shell 三件+新测试 5 it（分支矩阵全测+setPathCalls 显式断言）+locks 166；门一 B0/W3/N10（W-G1 electron-builder.yml 钉旧名=票面「无安装器面」前提失实→主控直改 productName/artifactName；W-G2 ci 强制 [dep-change]→收口双尾注；W-G3 lockfile root name→主控直改）+门二 PASS 零回炉（grep 亲测 6 命中分类正确+sha256 独立复算逐位命中）；W4 local-state.mjs 取证器路径随收口改（新目录优先+旧名兜底）；**真机迁移验证（备份-换装舞步）**：39M 真实库 tmp 全备份→首启=窗口标题 Synapse+双课题结构完整迁入新位+旧位 rename 走→二启幂等（跳过分支+旧位零重建）；verify exit=0（888 用例=883+5 精确命中）+e2e 全量 26；提交双尾注 [locked-change]+[dep-change]——票面/三报告/收口单在档' },
   { id: 'R2-SH2', file: 'src/renderer/app/App.tsx', area: 'infra', owner: 'strong', status: 'done', summary: '顶栏身份区+字体衬线消费清零（U3b——决4/决5 纯执行）：App 壳 header 条 h-11=44px（logo+Synapse 应用名+WorkspaceSwitcher 迁位零触碰+ver 随迁）+侧栏品牌行删+B1 wrapper+max-height 防展开错位+B2 header z-index 防盖板+--font-display 消费五类+lib 三类（W2 主控压缩票补——票面清单漏 library.css，决5「lib 衬线年份」明文）清零（token 定义保留）+--gold-night 别名退役（定义删+theme.test 同步）+三负锚（theme.css/library.css/font-display+gold-night 定义）；受锁=app-shell（品牌断言侧栏→顶栏+新 it 三件）/theme（负锚+TOKENS 删行）/r3-rdr-set-visual（:151 旧衬线锁→决5 负锚改写=同向双保险非放宽——实现者自裁）；三屋：实现者 2.9M tok（890=888+3−1 精确命中+双变异）+门一 PASS 无回炉（B1/B2 防御必要性核实/switcher 零锚定复核/N1 verify 时序硬条件/W4 对比度升格）+门二 PASS 零回炉+主控 W2 压缩票（library 三处+负锚扩+mutation-3 红点+sed 行号错位结构修复实录）；真机复评（r2-sh2-out/header.png）：顶栏 44px computed 实测三件在场+侧栏品牌行 0 计数+全 DOM Georgia 消费 0+**W4 解除**（trigger 实际色深色 rgb(35,38,45) on 白底——门一米白推演错位）+F-05/INV-34=定高+flex 链推演+e2e 全量阅读器链证据组合——票面/三报告/收口单在档' },
   { id: 'F-R2', file: 'src/renderer/features/reader/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'ui-scale≠1 程序滚动落点漂移修复（v18 U1 闭环——H1 根因=gBCR 视觉差值 1:1 加本地 scrollTop，探针三场景三档数值闭合 160-450px；方案 B 算术折算：effectiveZoom 单源+scroll-converge start/center 折算+scroll-progress getPageBoxes 同批修；真机复验 −512.6→−0.6 基线级/next 旁支同根归位；先红 6+变异 M1~M4+verify 126 文件 1081；门一 Kimi 链首战 B:0/W:1/N:6 可收口——换源事件 kimi-main→kimi-backup 实战；INV-34 量纲附注；B-3/H3 证伪备案 v19；票面+报告+门一全套 scripts/audits/f-r2-*）' },
   { id: 'P7A', file: 'tests/e2e/reader-text.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: 'P7-A 剪贴板竞态 flake 专项（v18 U2 闭环——六场六现+第七现实锤；修=清场标记+条件重读 5×200ms+失败可归因末次读值，断言锚不放宽；受锁先红=外部占用注入复刻（p7a-red1）；主控压缩票直做（预算降级，担责披露）；连跑 3 次 P7-A 全绿；票面 scripts/audits/p7a-ticket.md）' },
   { id: 'F-R3', file: 'src/renderer/features/reader/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-1 修票（二波场 2026-09-02）：轨二 c=P6 泄漏闭（settleLoadTask 纯函数——加载失败 destroy 恰一次+自身拒绝吞并+await settle 后重抛原错误；loadPdfDocument 接线保 task 句柄；头注状态机表证伪格改如实双路径）；轨一 e=上游查证（f-r3-upstream-check.md：v5.5.207 已修主逃逸点 onFailure 终接守卫/6.3.289 另有 destroy() 族硬化/master pdfManagerReady 悬尾仍在）→**终裁不升级**（任一档位不承诺零同族噪声+跨 major 回归面不换 devtools-only 收益；升级再评估触发条件=上游悬尾族全消）；轨二 b=destroy 序列化不采（无消噪声收益+切换串行延迟确定代价）；INV-49 登记（worker-per-task+销毁序+接受残余+代理计数监控锚）；门一 Kimi 3B/2W/0N PASS+门二 deepseek 2B/1W/2N PASS（W1 变异红证缺口主控补销=变异 A 同引用重抛/B 恰一次/C 顺序 settle+顺序测试 1 it；W2 upstream 档补包+降噪论证补强）；实现者 GLM5.3 统一档 1.94M tok+主控压缩票三变异；票面 f-r3-fix-brief.md+报告 f-r3-fix-impl.report.md+四门审档在档' },
+  { id: 'P7E-01', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'strong', status: 'open', summary: '标签生命周期（改名/合并/删除——P7-E 预留点清扫首票；b3: P7-E+B1 §3 预留 tags.service.ts:16+TagEditor.tsx:92；repo 四方法含跨表事务/service 校验序/三 IPC 通道/renderer store 命令型动作+TagFilter 管理面右键菜单；态空间 S1~S10+INV-53 登记；票面 scripts/audits/p7e-01-brief.md）' },
   { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
 
 export function isTicketDone(id: string): boolean {
   return TICKET_MAP.get(id)?.status === 'done'
 }
 
 export function openTickets(): Ticket[] {
```

## 4. 新文件全文（终态）

### 新文件：src/renderer/features/tags/TagLifecycle.tsx（223 行）
```typescript
// b3: P7-E
/**
 * [P7E-01] TagLifecycle —— 标签生命周期三对话框（TagFilter 子组件，组件≤250
 * 拆件；菜单在 TagLifecycleMenu.tsx）。Dialog 底座，LineageTagDialog 同型。
 * 写路径收口 tags.store 命令型动作；busy 守卫用 ref（同步检查——同批多次
 * click 在 React 重渲染前也只放行一次，S8）；失败 toast+对话框保持开（S6）；
 * busy 飞行中禁关（N1 回炉：取消按钮 disabled+Dialog onClose 包装 no-op——
 * 防「对话框已关、变更随后生效」语义错位，与保存按钮 disabled 态对齐）；
 * 成功经 props.onMutated(disappearedId) 上抛——死 id 筛选清空顺序归 TagFilter。
 */
import { useRef, useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import type { Tag } from '@shared/models/tag'
import { useTagsStore, type TagWithCount } from './tags.store'

/**
 * busy 守卫（ref 同步检查防同批双击——S8；setBusy 只管按钮禁用态渲染）。
 * requestClose=关闭守卫（N1）：mutation 飞行中 no-op——取消/遮罩/✕/Esc 全
 * 关闭路径统一过此门（Dialog 的 onClose 收包装后的回调）。
 */
function useBusyGuard(): {
  busy: boolean
  begin(): boolean
  end(): void
  requestClose(onClose: () => void): void
} {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  return {
    busy,
    begin(): boolean {
      if (pending.current) return false
      pending.current = true
      setBusy(true)
      return true
    },
    end(): void {
      pending.current = false
      setBusy(false)
    },
    requestClose(onClose: () => void): void {
      if (!pending.current) onClose()
    }
  }
}

/** onMutated 载荷：消失的标签 id（rename=null——id 稳定；merge=源 id；delete=自身 id） */
export type MutatedPayload = (disappearedId: string | null) => void

export function TagRenameDialog(props: {
  tag: Tag
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const [value, setValue] = useState(props.tag.name)
  const guard = useBusyGuard()
  const renameTag = useTagsStore((s) => s.renameTag)
  const trimmed = value.trim()
  // N1：busy 飞行中禁关——Dialog 的 Esc/遮罩/✕ 全关闭路径经此包装
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function save(): Promise<void> {
    if (trimmed === '' || !guard.begin()) return
    const r = await renameTag(props.tag.id, trimmed)
    if (r.ok) {
      // rename：id 稳定→筛选不动（S5），disappearedId=null
      props.onMutated(null)
      props.onClose()
    } else {
      // S6：toast+保持开（输入保留），发起方 toast 契约
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`重命名标签：${props.tag.name}`} onClose={requestClose}>
      <input
        aria-label="新标签名"
        className="w-full rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)' }}
        value={value}
        disabled={guard.busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
        }}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded px-3 py-1 text-xs text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
          disabled={trimmed === '' || guard.busy}
          onClick={() => void save()}
        >
          保存
        </button>
      </div>
    </Dialog>
  )
}

export function TagMergeDialog(props: {
  source: TagWithCount
  /** 其他标签（排除源——点选即确认，TagEditor suggestions 同型 chip 列表） */
  targets: TagWithCount[]
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const guard = useBusyGuard()
  const mergeTags = useTagsStore((s) => s.mergeTags)
  // N1：busy 飞行中禁关（Dialog Esc/遮罩/✕ 全路径包装）
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function pick(targetId: string): Promise<void> {
    if (!guard.begin()) return
    const r = await mergeTags(props.source.id, targetId)
    if (r.ok) {
      props.onMutated(props.source.id) // 源 id 已消失（S3）
      props.onClose()
    } else {
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`合并标签：${props.source.name}`} onClose={requestClose}>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        将「{props.source.name}」的文献挂接全部并入目标标签（双挂文献自动去重），随后删除该标签。
      </p>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="合并目标列表">
        {props.targets.map((t) => (
          <button
            key={t.id}
            type="button"
            className="rounded-full border px-2 py-0.5 text-xs disabled:opacity-50"
            style={{ borderColor: 'var(--border)' }}
            disabled={guard.busy}
            onClick={() => void pick(t.id)}
          >
            {t.name}（{t.paperCount}）
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
      </div>
    </Dialog>
  )
}

export function TagDeleteDialog(props: {
  tag: TagWithCount
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const guard = useBusyGuard()
  const deleteTag = useTagsStore((s) => s.deleteTag)
  // N1：busy 飞行中禁关（Dialog Esc/遮罩/✕ 全路径包装）
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function confirm(): Promise<void> {
    if (!guard.begin()) return
    const r = await deleteTag(props.tag.id)
    if (r.ok) {
      props.onMutated(props.tag.id) // 该 id 已消失（S2）
      props.onClose()
    } else {
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`删除标签：${props.tag.name}`} onClose={requestClose}>
      <p className="text-xs">
        {props.tag.paperCount > 0
          ? `将删除标签「${props.tag.name}」及其在 ${props.tag.paperCount} 篇文献上的挂接`
          : `将删除标签「${props.tag.name}」——尚无文献挂接`}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded px-3 py-1 text-xs text-white disabled:opacity-50"
          style={{ background: 'var(--danger)' }}
          disabled={guard.busy}
          onClick={() => void confirm()}
        >
          确认删除
        </button>
      </div>
    </Dialog>
  )
}
```

### 新文件：src/renderer/features/tags/TagLifecycleMenu.tsx（82 行）
```typescript
// b3: P7-E
/**
 * [P7E-01] TagLifecycleMenu —— 标签右键菜单（TagFilter 子组件，LineageNodeMenu
 * 同型）。行为：fixed 定位于右键锚点；菜单项=重命名/合并到…（tags.length===1
 * 无其他目标时禁用——S9）/删除。透明遮罩点击关闭 + Esc 关闭（keydown 挂
 * document，unmount 清理——门一 W3 回炉：菜单轻量面键盘关闭自持，不依赖
 * Dialog 域）。所有动作只上抛回调——对话框宿主与写路径在 TagFilter。
 */
import { useEffect } from 'react'
import type { TagWithCount } from './tags.store'

const ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'

export function TagLifecycleMenu(props: {
  tag: TagWithCount
  /** tags.length>1 才可合并（无其他目标——S9 禁用态） */
  canMerge: boolean
  anchor: { x: number; y: number }
  onClose(): void
  onRename(tag: TagWithCount): void
  onMerge(tag: TagWithCount): void
  onDelete(tag: TagWithCount): void
}): JSX.Element {
  const { tag, anchor } = props

  // Esc 关闭（W3）：挂 document 捕获 Escape，unmount 成对移除
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-40" onClick={props.onClose} />
      <div
        data-testid="tag-menu"
        role="menu"
        aria-label={`标签菜单：${tag.name}`}
        className="fixed z-50 w-40 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className={ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onRename(tag)}
        >
          重命名
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${ITEM_STYLE} disabled:opacity-50`}
          style={{ color: 'var(--text)' }}
          disabled={!props.canMerge}
          onClick={() => props.onMerge(tag)}
        >
          合并到…
        </button>
        <button
          type="button"
          role="menuitem"
          className={ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onDelete(tag)}
        >
          删除
        </button>
      </div>
    </>
  )
}
```

### 新文件：tests/unit/db/repos/tags-lifecycle.repo.test.ts（111 行）
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTagsRepo } from '../../../../src/main/db/repos/tags.repo'
import { createTestDb } from '../../../utils/fixtures'
import type { SqliteDb } from '../../../../src/main/db/connection'

/**
 * [P7E-01] tags.repo 生命周期四方法（always-active——三屋纪律不经 guardedDescribe）。
 *
 * 覆盖：findByName 命中/未命中；renameTag 命中/未命中；mergeTags 三步事务
 * （源挂接全迁+源行删+双挂幂等吸收）；deleteTag 两步；merge 事务原子性
 * （第二步抛错→第三步不执行且异常上抛，mock db 语句桩——better-sqlite3
 * 真实回滚语义由原库保证，桩只验"后续语句不落地"的编排面）。
 *
 * [门一 W1 回炉·如实口径] merge/delete 两处 raw COUNT 断言（paper_tags 不
 * 残留死 id）是 **schema 前瞻守卫**：001_init.sql 的 tag_id 外键为 ON DELETE
 * CASCADE，标签行删除即级联清挂接，当前 schema 下两断言恒真、变异杀伤率为
 * 零——M1（删第二步 DELETE）的**实际红锚=本文件末尾的事务编排 mock 用例**
 * （第二步语句被桩武装为抛错、变异后不再调用→toThrow 失败）。前瞻守卫保留：
 * 若未来 CASCADE 改 RESTRICT/去级联，raw COUNT 即转正为首道防线。
 */
describe('P7E-01 tags.repo —— 生命周期（rename/merge/delete）', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTagsRepo>

  beforeEach(() => {
    db = createTestDb()
    const seedPaper = db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?, 'a.pdf', ?, 't', 't')`
    )
    seedPaper.run('p-1', 'sha-1')
    seedPaper.run('p-2', 'sha-2')
    repo = createTagsRepo(db)
  })

  it('findByName：命中返回 {id,name}；未命中 undefined', () => {
    const tag = repo.upsertByName('必读')
    expect(repo.findByName('必读')).toEqual({ id: tag.id, name: '必读' })
    expect(repo.findByName('不存在')).toBeUndefined()
  })

  it('renameTag：命中返回 true 且改名生效；未命中返回 false', () => {
    const tag = repo.upsertByName('旧名')
    expect(repo.renameTag(tag.id, '新名')).toBe(true)
    expect(repo.findByName('新名')?.id).toBe(tag.id)
    expect(repo.renameTag('no-such-id', '任意名')).toBe(false)
  })

  it('mergeTags：源挂接全迁目标+源标签行删除；双挂同文献 OR IGNORE 幂等吸收', () => {
    const src = repo.upsertByName('源')
    const tgt = repo.upsertByName('目标')
    repo.attach('p-1', src.id)
    repo.attach('p-1', tgt.id) // 双挂：p-1 同挂源与目标——迁移时复合主键冲突被吞
    repo.attach('p-2', src.id)
    repo.mergeTags(src.id, tgt.id)
    // 源标签行已删；目标吸收两篇文献
    const list = repo.listWithCounts()
    expect(list.find((t) => t.id === src.id)).toBeUndefined()
    expect(list.find((t) => t.id === tgt.id)?.paperCount).toBe(2)
    // schema 前瞻守卫（W1 如实口径）：paper_tags 不残留死源 id——当前 CASCADE
    // 下恒真、变异杀伤率为零（标签行删除即级联清挂接）；M1 实际红锚=本文件
    // 末尾的事务编排 mock 用例。若 CASCADE 改弱此处转正为首道防线
    const orphan = db
      .prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM paper_tags WHERE tag_id = ?')
      .get(src.id)?.n
    expect(orphan).toBe(0)
    expect(repo.namesByPaper('p-1')).toEqual(['目标'])
    expect(repo.namesByPaper('p-2')).toEqual(['目标'])
  })

  it('deleteTag：挂接与标签行两步全删', () => {
    const tag = repo.upsertByName('待删')
    repo.attach('p-1', tag.id)
    repo.deleteTag(tag.id)
    // schema 前瞻守卫（W1 如实口径）：同上——CASCADE 下恒真，编排锚在 merge
    // mock 用例；JOIN 视图（listWithCounts/namesByPaper）看不见孤儿行，故用 raw COUNT
    const remain = db
      .prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM paper_tags WHERE tag_id = ?')
      .get(tag.id)?.n
    expect(remain).toBe(0)
    expect(repo.findByName('待删')).toBeUndefined()
  })

  it('mergeTags 事务原子性：第二步抛错→第三步不执行且异常上抛（mock db 语句桩）', () => {
    const stmts = new Map<string, { run: ReturnType<typeof vi.fn> }>()
    const mockDb = {
      prepare: (sql: string) => {
        if (!stmts.has(sql)) stmts.set(sql, { run: vi.fn() })
        return stmts.get(sql)!
      },
      // better-sqlite3 事务直通桩：异常自然穿透（真实 BEGIN/ROLLBACK 由原库承担）
      transaction: (fn: (...args: unknown[]) => void) => (...args: unknown[]) => fn(...args)
    } as unknown as SqliteDb
    const mockedRepo = createTagsRepo(mockDb)

    const findStmt = (needle: string): { run: ReturnType<typeof vi.fn> } => {
      const hit = [...stmts.entries()].find(([sql]) => sql.includes(needle))
      if (hit === undefined) throw new Error(`语句桩缺：${needle}`)
      return hit[1]
    }
    // 第二步（清源挂接）抛错（needle 收紧到唯一文本——detachTag 语句同含
    // 'DELETE FROM paper_tags' 前缀但 WHERE 子句不同，Map 插入序会先命中它）
    findStmt('DELETE FROM paper_tags WHERE tag_id = ?').run.mockImplementation(() => {
      throw new Error('第二步炸了')
    })
    expect(() => mockedRepo.mergeTags('src-id', 'tgt-id')).toThrow('第二步炸了')
    // 第一步已执行且参数序=(target, source)（SELECT paper_id, ? … WHERE tag_id = ?）
    expect(findStmt('SELECT paper_id, ? FROM paper_tags').run).toHaveBeenCalledWith('tgt-id', 'src-id')
    // 第三步（删源标签行）不得执行——失败事务的后续语句不落地
    expect(findStmt('DELETE FROM tags').run).not.toHaveBeenCalled()
  })
})
```

### 新文件：tests/unit/services/tags-lifecycle.service.test.ts（131 行）
```typescript
import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/**
 * [P7E-01] tags.service 生命周期三操作校验序全枚举（always-active）。
 *
 * 错误语义归 service（TagsDomainError：Error+code，NotesDomainError 同型）；
 * repo 持数据事实——全部经桩+spy 逐参断言。校验序按票面：rename=
 * trim 空→存在→冲突→幂等；merge=自身→源→目标；delete=存在。
 */

function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => [{ id: 't-1', name: '甲', paperCount: 1 }]),
    upsertByName: vi.fn((name: string) => ({ id: 't-1', name })),
    attach: vi.fn(),
    detach: vi.fn(),
    namesByPaper: vi.fn(() => []),
    findByName: vi.fn((): undefined => undefined),
    renameTag: vi.fn(() => true),
    mergeTags: vi.fn(),
    deleteTag: vi.fn(),
    ...over
  }
  return { tags } as unknown as Repos
}

/** async 方法抛错=拒绝promise：捕获后断言 code/message 形状（域错误折叠契约） */
async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  msgPart?: string
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    if (msgPart !== undefined) expect((e as Error).message).toContain(msgPart)
  }
}

describe('P7E-01 tags.service —— rename 校验序', () => {
  it('trim 后空串 → INVALID_REQUEST「标签名不能为空」（zod min(1) 拦不住纯空格）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-1', name: '   ' }), 'INVALID_REQUEST', '标签名不能为空')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('tagId 不存在 → NOT_FOUND「标签不存在」（校验序先于冲突预检）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => []) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-x', name: '新名' }), 'NOT_FOUND', '标签不存在')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('与其他标签同名 → CONFLICT「标签名已被占用」（不自动合并——数据语义变更须显式走 merge）', async () => {
    const repos = stubRepos({ findByName: vi.fn(() => ({ id: 't-2', name: '甲' })) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-1', name: '甲' }), 'CONFLICT', '标签名已被占用')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('与自身现名相同 → 幂等成功返回该 Tag（changes=0 亦非错）', async () => {
    const repos = stubRepos({ findByName: vi.fn(() => ({ id: 't-1', name: '甲' })) })
    const svc = createTagsService({ repos })
    await expect(svc.rename({ tagId: 't-1', name: '甲' })).resolves.toEqual({ id: 't-1', name: '甲' })
    expect(repos.tags.renameTag).toHaveBeenCalledWith('t-1', '甲')
  })

  it('成功路径：trim 后透传 repo，返回更新后 Tag', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.rename({ tagId: 't-1', name: '  新名 ' })).resolves.toEqual({ id: 't-1', name: '新名' })
    expect(repos.tags.renameTag).toHaveBeenCalledWith('t-1', '新名')
  })
})

describe('P7E-01 tags.service —— merge 校验序', () => {
  it('sourceId === targetId → INVALID_REQUEST「不能合并到自身」', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-1', targetId: 't-1' }), 'INVALID_REQUEST', '不能合并到自身')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('源不存在 → NOT_FOUND 且消息带源 id（先 source 后 target）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => [{ id: 't-2', name: '乙', paperCount: 0 }]) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-x', targetId: 't-2' }), 'NOT_FOUND', 't-x')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('目标不存在 → NOT_FOUND 且消息带目标 id', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-1', targetId: 't-y' }), 'NOT_FOUND', 't-y')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('成功 → { ok: true }；mergeTags(source, target) 逐参', async () => {
    const repos = stubRepos({
      listWithCounts: vi.fn(() => [
        { id: 't-1', name: '甲', paperCount: 1 },
        { id: 't-2', name: '乙', paperCount: 2 }
      ])
    })
    const svc = createTagsService({ repos })
    await expect(svc.merge({ sourceId: 't-1', targetId: 't-2' })).resolves.toEqual({ ok: true })
    expect(repos.tags.mergeTags).toHaveBeenCalledWith('t-1', 't-2')
  })
})

describe('P7E-01 tags.service —— delete', () => {
  it('不存在 → NOT_FOUND「标签不存在」（列表陈旧——他处已删）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => []) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.delete({ tagId: 't-x' }), 'NOT_FOUND', '标签不存在')
    expect(repos.tags.deleteTag).not.toHaveBeenCalled()
  })

  it('成功 → { ok: true }；deleteTag(id) 逐参', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.delete({ tagId: 't-1' })).resolves.toEqual({ ok: true })
    expect(repos.tags.deleteTag).toHaveBeenCalledWith('t-1')
  })
})
```

### 新文件：tests/unit/renderer/tags-lifecycle.store.test.ts（101 行）
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * [P7E-01] tags.store 命令型三动作（always-active）。
 *
 * 契约：成功→内部 await refresh()（单一数据源自愈）后返回 {ok:true}；失败
 * 返回 {ok:false,error}（发起方 toast——不经 store.error 字段）；NOT_FOUND
 * （列表陈旧）失败额外 refresh 自愈（S7），其余错误零 refresh（S6）。
 * S1：rename 进行中并发 refresh——链式 refresh 为最新 seq，迟到旧响应丢弃。
 */

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/tags/tags.store')
  return mod.useTagsStore
}

const okList = (tags: Array<{ id: string; name: string; paperCount: number }>) => ({
  ok: true as const,
  data: tags
})

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('P7E-01 tags.store —— 命令型动作', () => {
  it('renameTag 成功：返回 {ok:true} 且链式 refresh（list spy 被调、tags 更新）', async () => {
    const list = vi.fn().mockResolvedValue(okList([{ id: 't-1', name: '新名', paperCount: 1 }]))
    const rename = vi.fn().mockResolvedValue({ ok: true as const, data: { id: 't-1', name: '新名' } })
    const useStore = await loadStore({ tags: { list, rename } })
    const r = await useStore.getState().renameTag('t-1', '新名')
    expect(r).toEqual({ ok: true })
    expect(rename).toHaveBeenCalledWith({ tagId: 't-1', name: '新名' })
    expect(list).toHaveBeenCalledTimes(1) // 成功后链式 refresh（M3 变异锚）
    expect(useStore.getState().tags).toEqual([{ id: 't-1', name: '新名', paperCount: 1 }])
  })

  it('mergeTags/deleteTag 成功：同样链式 refresh + {ok:true}（逐参断言）', async () => {
    const list = vi.fn().mockResolvedValue(okList([]))
    const merge = vi.fn().mockResolvedValue({ ok: true as const, data: { ok: true } })
    const del = vi.fn().mockResolvedValue({ ok: true as const, data: { ok: true } })
    const useStore = await loadStore({ tags: { list, merge, delete: del } })
    await expect(useStore.getState().mergeTags('s-id', 't-id')).resolves.toEqual({ ok: true })
    await expect(useStore.getState().deleteTag('s-id')).resolves.toEqual({ ok: true })
    expect(merge).toHaveBeenCalledWith({ sourceId: 's-id', targetId: 't-id' })
    expect(del).toHaveBeenCalledWith({ tagId: 's-id' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('S6 rename CONFLICT：返回 {ok:false,error.code=CONFLICT}；tags 零变更零 refresh', async () => {
    const list = vi.fn()
    const rename = vi
      .fn()
      .mockResolvedValue({ ok: false as const, error: { code: 'CONFLICT', message: '标签名已被占用' } })
    const useStore = await loadStore({ tags: { list, rename } })
    useStore.setState({ tags: [{ id: 't-1', name: '旧', paperCount: 1 }] })
    const r = await useStore.getState().renameTag('t-1', '占用名')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe('CONFLICT')
      expect(r.error.message).toBe('标签名已被占用')
    }
    expect(useStore.getState().tags[0]?.name).toBe('旧')
    expect(list).not.toHaveBeenCalled() // 零 refresh（S6——用户输入问题不重拉列表）
  })

  it('S7 delete NOT_FOUND：返回 {ok:false} 但 refresh 自愈（列表陈旧重拉）', async () => {
    const list = vi.fn().mockResolvedValue(okList([]))
    const del = vi
      .fn()
      .mockResolvedValue({ ok: false as const, error: { code: 'NOT_FOUND', message: '标签不存在' } })
    const useStore = await loadStore({ tags: { list, delete: del } })
    const r = await useStore.getState().deleteTag('t-gone')
    expect(r.ok).toBe(false)
    expect(list).toHaveBeenCalledTimes(1) // 自愈 refresh（S7）
    expect(useStore.getState().tags).toEqual([])
  })

  it('S1 rename 进行中并发 refresh：链式 refresh 为最新 seq，迟到旧响应丢弃', async () => {
    let resolveRename!: (v: unknown) => void
    const rename = vi.fn(
      () => new Promise((r) => { resolveRename = r })
    )
    let resolveOld!: (v: unknown) => void
    const list = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r }))
      .mockImplementationOnce(async () => okList([{ id: 't-9', name: '最新', paperCount: 2 }]))
    const useStore = await loadStore({ tags: { list, rename } })
    const mutating = useStore.getState().renameTag('t-1', 'x') // 挂起中（不占 seq）
    const concurrent = useStore.getState().refresh() // 并发 refresh（seq=2，响应将迟到）
    resolveRename({ ok: true, data: { id: 't-1', name: 'x' } }) // 完成后链式 refresh（seq=3 即刻成功）
    await mutating
    resolveOld({ ok: false, error: { code: 'DB_ERROR', message: '旧失败' } }) // seq=2 迟到失败
    await concurrent.catch(() => undefined)
    expect(useStore.getState().tags[0]?.name).toBe('最新') // 只认最新 seq 的结果
    expect(useStore.getState().error).toBeNull() // 迟到旧失败被 loadSeq 丢弃（不触发误导 toast）
  })
})
```

### 新文件：tests/unit/renderer/tag-lifecycle-ui.test.tsx（272 行）
```typescript
// @vitest-environment jsdom
/**
 * [P7E-01] TagFilter 管理面（always-active）：chip 右键菜单+三对话框接线。
 *
 * S2/S3：删除/合并源=选中标签时，onFilterChange(null) 必须先于 onMutated()
 * （invocationCallOrder 锚——顺序反了=死 tagId 查询空列表窗）；S4：合并目标=
 * 选中时筛选不动；S8：对话框提交双击 busy 守卫防重复提交；S9：tags.length===1
 * 时「合并到…」菜单项禁用。
 * [门一回炉补锚] W3：菜单 Esc 关闭（keydown 契约）；N1：delete 提交飞行中
 * 取消被阻断（按钮禁用+Dialog onClose 包装 no-op），resolve 成功后才关。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tag } from '../../../src/shared/models/tag'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: { tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn() } },
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { TagFilter } from '../../../src/renderer/features/tags/TagFilter'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'

type TagWithCount = Tag & { paperCount: number }

// act() 环境声明（import-dropzone 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: TagWithCount[] = []

async function render(
  selectedTagId: string | null,
  onFilterChange: (tagId: string | null) => void,
  onMutated?: () => void
): Promise<void> {
  useTagsStore.setState({ tags: currentTags, loading: false, error: null })
  stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <TagFilter selectedTagId={selectedTagId} onFilterChange={onFilterChange} onMutated={onMutated} />
    )
  })
}

/** 按精确文本找按钮（scope 缺省=整树；对话框内交互务必传 dialog scope 防同名碰撞） */
function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => b.textContent === text)
}

async function click(btn: HTMLButtonElement | undefined, label: string): Promise<void> {
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

/** 当前对话框（同时刻至多一个） */
function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
}

/** chip 右键开菜单（React onContextMenu——冒泡 contextmenu 事件） */
async function rightClick(chipText: string): Promise<void> {
  const btn = buttonByText(chipText)
  expect(btn, `chip 存在：${chipText}`).toBeDefined()
  await act(async () => {
    btn!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
    )
  })
  expect(host?.querySelector('[data-testid="tag-menu"]'), '右键后菜单在场').not.toBeNull()
}

/** 受控 input 打字（原生 setter+input 事件——React 受控组件 jsdom 标准法） */
async function setType(input: HTMLInputElement, text: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  currentTags = []
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
  it('S2 删除选中标签：先 onFilterChange(null) 清死 id 筛选，后 onMutated（invocationCallOrder 锚）', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render('t-1', onFilterChange, onMutated)
    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(onFilterChange).toHaveBeenCalledWith(null)
    expect(onMutated).toHaveBeenCalledTimes(1)
    // 顺序锚（S2）：先清筛选（setQuery 清 tagId→library 自动重载）后通知 library 刷新
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
  })

  it('删除非选中标签：筛选不动（onFilterChange 零调用），仅 onMutated', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render('t-2', onFilterChange, onMutated)
    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it('S3 合且源=选中：同 S2 顺序（源 id 已消失）；目标 chip 点选即确认', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render('t-1', onFilterChange, onMutated)
    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('合并到…'), '菜单·合并到…')
    expect(dialog(), '合并对话框在场').not.toBeNull()
    await click(buttonByText('乙（1）', dialog()!), '对话框·目标 chip 乙（1）')
    expect(stubApi.tags.merge).toHaveBeenCalledWith({ sourceId: 't-1', targetId: 't-2' })
    expect(onFilterChange).toHaveBeenCalledWith(null)
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
    expect(dialog(), '成功后对话框关闭').toBeNull()
  })

  it('S4 合且目标=选中：筛选不动（target id 稳定，仅计数增）', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render('t-2', onFilterChange, onMutated)
    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('合并到…'), '菜单·合并到…')
    await click(buttonByText('乙（1）', dialog()!), '对话框·目标 chip 乙（1）')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it('S8 重命名对话框：预填现名；提交双击 busy 守卫防重复提交（rename 仅一次）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 1 }]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render(null, onFilterChange, onMutated)
    let resolveRename!: (v: unknown) => void
    stubApi.tags.rename.mockImplementation(
      () => new Promise((r) => { resolveRename = r })
    )
    await rightClick('甲（1）')
    await click(buttonByText('重命名'), '菜单·重命名')
    const input = dialog()?.querySelector('input') ?? null
    expect(input, '重命名输入框在场').not.toBeNull()
    expect(input?.value, '预填现名').toBe('甲')
    await setType(input!, '乙')
    const save = buttonByText('保存', dialog()!)
    // 同一 act 内连点两次（React 批处理窗——ref 守卫必须同步生效）
    await act(async () => {
      save!.click()
      save!.click()
    })
    expect(stubApi.tags.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '乙' })
    await act(async () => {
      resolveRename({ ok: true, data: { id: 't-1', name: '乙' } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(dialog(), '成功后对话框关闭').toBeNull()
  })

  it('S9 tags.length===1 时菜单「合并到…」禁用（无其他目标）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render(null, vi.fn(), vi.fn())
    await rightClick('甲（0）')
    const mergeBtn = buttonByText('合并到…')
    expect(mergeBtn, '菜单项在场').toBeDefined()
    expect(mergeBtn?.disabled, '单标签无合并目标——禁用').toBe(true)
  })

  it('W3：菜单开→按 Escape→菜单关闭（keydown 关闭契约，unmount 清理）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render(null, vi.fn(), vi.fn())
    await rightClick('甲（0）')
    expect(host?.querySelector('[data-testid="tag-menu"]'), '菜单在场').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="tag-menu"]'), 'Escape 后菜单关闭').toBeNull()
  })

  it('N1：delete 提交飞行中取消被阻断（按钮禁用+Esc/遮罩 onClose no-op），resolve 成功后才关', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 2 }]
    await render(null, vi.fn(), vi.fn())
    let resolveDelete!: (v: unknown) => void
    stubApi.tags.delete.mockImplementation(
      () => new Promise((r) => { resolveDelete = r })
    )
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    // busy 飞行中：取消按钮禁用（与保存/确认 disabled 态对齐——N1）
    expect(buttonByText('取消', dialog()!)?.disabled, 'busy 期取消禁用').toBe(true)
    // Dialog 自身 Esc 关闭路径经包装 onClose → no-op：对话框不得关
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(dialog(), 'busy 中 Esc 不得关闭（对话框已关、变更随后生效=语义错位）').not.toBeNull()
    // mutation 成功落定 → 关闭走成功路径
    await act(async () => {
      resolveDelete({ ok: true, data: { ok: true } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(dialog(), 'resolve 成功后对话框关闭').toBeNull()
  })
})
```

### 新文件：tests/e2e/tag-lifecycle.spec.ts（115 行）
```typescript
import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-01] 标签生命周期 e2e（always-active，无工单门）。
 *
 * 链路：种子三篇（甲挂双标签/乙挂单标签/丙无标签——筛区分化）→UI 打标签→
 * 右键改名（chip 与 PaperRow 徽标真实文本更新；选中态 id 稳定筛选不动——S5）→
 * 合并（源 chip 消失+目标计数 1→2）→删除（选中态先筛选只剩甲乙，删除后死
 * 筛选自动清空→全列表在场含丙——S2 装配级）。全程断言渲染真实文本。
 */
test('标签生命周期：改名→合并→删除（chip/行徽标真实文本+死筛选自愈）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e-'))

  // 第一跳：应用自建库表（workspaces.spec 同配方——不 import src 内部模块）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 三篇种子（只列行不开阅读器——无需真实 PDF 文件；sha 互异避唯一约束）
  const papers = [
    { id: 'e2e-p7e-a', title: 'P7E 甲文献', sha: 'a'.repeat(64) },
    { id: 'e2e-p7e-b', title: 'P7E 乙文献', sha: 'b'.repeat(64) },
    { id: 'e2e-p7e-c', title: 'P7E 丙文献', sha: 'c'.repeat(64) }
  ] as const
  for (const p of papers) {
    const fileRef = `${p.sha.slice(0, 2)}/${p.sha.slice(2, 4)}/${p.sha}.pdf`
    await seedPaperRow(userData, fileRef, p.sha, p.title, p.id)
  }

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // —— UI 打标签：甲=「水治」（错拼）+「核心」；乙=「水质」 ——
  const tagInput = win.getByLabel('新增标签')
  async function tagPaper(title: string, ...names: string[]): Promise<void> {
    await win.getByText(title).first().click()
    for (const name of names) {
      await tagInput.fill(name)
      await tagInput.press('Enter')
      // 已挂接 chip 的 × 按钮出现（aria-label 锚——chip span 含 × 子按钮，
      // 纯文本 exact 匹配不到；Enter→upsert+attach→onChanged 重读完成锚）
      await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
    }
  }
  await tagPaper('P7E 甲文献', '水治', '核心')
  await tagPaper('P7E 乙文献', '水质')

  // 视图切换强制 LibraryPage 卸载/重挂→TagFilter refresh（chips 就位——
  // TagEditor 的 upsert 路径不刷新 tags.store，挂载 refresh 是既有契约）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  const menu = win.getByTestId('tag-menu')
  await expect(win.getByRole('button', { name: '水治（1）' })).toBeVisible({ timeout: 10_000 })

  // —— 改名：右键「水治」→「水质监测」——
  // 先选中该筛选（setQuery→load 后行徽标可见——改名的对照面在场）
  await win.getByRole('button', { name: '水治（1）' }).click()
  const rowA = win.locator('.lib-card', { hasText: 'P7E 甲文献' })
  await expect(rowA.locator('.lib-tag', { hasText: '水治' })).toHaveCount(1)
  await win.getByRole('button', { name: '水治（1）' }).click({ button: 'right' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: '重命名' }).click()
  const dialog = win.getByRole('dialog')
  const renameInput = win.getByLabel('新标签名')
  await expect(renameInput).toHaveValue('水治') // 预填现名
  await renameInput.fill('水质监测')
  await dialog.getByRole('button', { name: '保存' }).click()
  // chip 更新（store 链式 refresh）；错拼名 chip 消失
  await expect(win.getByRole('button', { name: '水质监测（1）' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '水治（1）' })).toHaveCount(0)
  // PaperRow 徽标真实文本更新（onMutated→library load）
  await expect(rowA.locator('.lib-tag', { hasText: '水质监测' })).toHaveCount(1)
  await expect(rowA.locator('.lib-tag', { hasText: '水治' })).toHaveCount(0)
  // S5：id 稳定——筛选不动，甲行仍在筛选结果内
  await expect(rowA).toBeVisible()

  // —— 合并：「核心」→「水质」；源 chip 消失+目标计数 1→2 ——
  await win.getByRole('button', { name: '核心（1）' }).click({ button: 'right' })
  await menu.getByRole('menuitem', { name: '合并到…' }).click()
  await dialog.getByRole('button', { name: '水质（1）' }).click() // 目标 chip 点选即确认
  // 变更完成锚：对话框关闭（mutation+链式 refresh+unmount 落定）——先锚再断
  // chips，防「chips 已刷新而对话框尚未卸载」的瞬态双匹配（strict violation
  // 首次 resolve 即红不重试——两 render 间隙实测可被捕获）
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '核心（1）' })).toHaveCount(0, { timeout: 10_000 })
  await expect(win.getByRole('button', { name: '水质（2）' })).toBeVisible({ timeout: 10_000 })

  // —— 删除：选中「水质」→筛选只剩甲乙（丙被滤掉）；删除后死筛选自动清空→全列表 ——
  await win.getByRole('button', { name: '水质（2）' }).click()
  // 先锚列表加载完成再断缺席（loading 中 rows 为空≠被滤掉——workspaces.spec 回炉教训）
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  await expect(win.getByText('P7E 丙文献')).toHaveCount(0) // 筛选生效中
  await expect(rowA).toBeVisible() // 合并后甲乙双挂——均在筛选结果内
  await win.getByRole('button', { name: '水质（2）' }).click({ button: 'right' })
  await menu.getByRole('menuitem', { name: '删除' }).click()
  await expect(dialog.getByText('将删除标签「水质」及其在 2 篇文献上的挂接')).toBeVisible()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  // 变更完成锚（同合并段——对话框关闭先行）
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  // chip 消失 + 死筛选自愈（S2 装配级）：全列表在场（丙回归证明 tagId 已清）
  await expect(win.getByRole('button', { name: '水质（2）' })).toHaveCount(0, { timeout: 10_000 })
  for (const t of ['P7E 甲文献', 'P7E 乙文献', 'P7E 丙文献']) {
    await expect(win.getByText(t).first()).toBeVisible({ timeout: 10_000 })
  }
  // 甲行徽标仅剩「水质监测」（核心已并入、水质已删）
  await expect(rowA.locator('.lib-tag')).toHaveCount(1)
  await expect(rowA.locator('.lib-tag')).toHaveText('水质监测')

  await app.close()
})
```

## 5. 实现者报告（含 §8 回炉轮）
```markdown
# P7E-01 实现报告——标签生命周期（改名/合并/删除）

状态：**DONE_WITH_CONCERNS**（实现面全绿；1 条票面假设与事实不符的说明 +
1 条 e2e 环境级波动记录，见 §6；无超票面自裁决定——拆 TagLifecycleMenu.tsx
为 250 行红线触发的票面预案内动作）

## 1. 改动文件清单

修改（9）：
- `src/main/db/repos/tags.repo.ts` —— 头注修订（b3: P7-E 指针/跨表事务条款/
  生命周期层兑现）+四方法 findByName/renameTag/mergeTags（三步事务）/deleteTag（两步事务）
- `src/main/services/tags.service.ts` —— TagsDomainError（NotesDomainError 同型）
  +rename/merge/delete 三方法（校验序按票面：trim 空→存在→冲突/自身）
- `src/main/ipc/tags.ts` —— 三通道委托三行
- `src/shared/ipc/schemas.ts` —— [受锁面·主控预解锁] tagIdReqSchema/
  renameTagReqSchema/mergeTagReqSchema 三 schema
- `src/shared/ipc/api-surface.ts` —— [受锁面·主控预解锁] tags 域三通道
  （rename=tagSchema/merge+delete=trueAckSchema）；register/preload 泛型遍历零改（亲核）
- `src/renderer/features/tags/tags.store.ts` —— 命令型三动作（mutate 共用壳：
  成功链式 refresh；NOT_FOUND 失败自愈 refresh=S7，余零 refresh=S6）+
  TagWithCount/TagsMutationResult 导出
- `src/renderer/features/tags/TagFilter.tsx` —— chip onContextMenu+菜单/对话框
  宿主+`onMutated?` prop+handleMutated（S2/S3 顺序契约：先 onFilterChange(null) 后 onMutated）
- `src/renderer/features/library/FilterBar.tsx` —— onMutated 注入 library load
  （白名单既有路径零改，check-quality 亲验「无跨域引用」通过）
- `src/renderer/features/tags/TagEditor.tsx` —— :92 v2 预留注记兑现修订

新建源文件（2）：
- `src/renderer/features/tags/TagLifecycle.tsx` —— 三对话框（rename 预填/merge
  目标 chip 点选即确认/delete 计数文案；ref 型 busy 守卫=S8；失败 toast 保持开=S6）
- `src/renderer/features/tags/TagLifecycleMenu.tsx` —— 右键菜单（LineageNodeMenu
  同型；单标签「合并到…」禁用=S9）——初版三件同文件 265 行触组件 250 红线，
  按「出现第二职责就拆」+lineage 先例拆出，quality:check 复绿

新建测试（5，全 always-active 不经 guardedDescribe）：
- `tests/unit/db/repos/tags-lifecycle.repo.test.ts`（5 用例）
- `tests/unit/services/tags-lifecycle.service.test.ts`（11 用例）
- `tests/unit/renderer/tags-lifecycle.store.test.ts`（5 用例）
- `tests/unit/renderer/tag-lifecycle-ui.test.tsx`（6 用例，含补锚「合并成功后
  对话框关闭」——诊断 e2e 瞬态问题时确认为契约面顺手入册）
- `tests/e2e/tag-lifecycle.spec.ts`（1 用例，种子三篇+真实文本断言+S2 装配级）

## 2. 先红证据（scripts/audits/p7e-01-red/）

- `tags-lifecycle.repo.raw.txt` —— 5/5 红（缺失方法 TypeError）
- `tags-lifecycle.service.raw.txt` —— 11/11 红（svc.rename/merge/delete is not a function）
- `tags-lifecycle.store.raw.txt` —— 5/5 红（renameTag is not a function）
- `tag-lifecycle-ui.raw.txt` —— 6/6 红（右键后菜单缺席）
- `tag-lifecycle.e2e.raw.txt` —— 红（打标签链通过后 `tag-menu` 缺席超时——真功能红；
  首次红为测试定位器缺陷「exact 文本匹配不到含×子按钮的 chip」已改 aria-label 锚后复跑）
- 说明：service/store 两文件首跑红证因缺 `describe` 导入（vitest 未开 globals）
  收集期失败，修导入后重跑落盘上述真红——修的是测试自身可运行性非断言。

## 3. 绿证（scripts/audits/p7e-01-green/）+数字实测

- `unit-all4.raw.txt` —— 新增四单测文件 27/27 绿
- `full-unit.raw.txt` —— 全量 **132 文件 / 1140 用例全绿**（基线 128/1113：
  +4 文件 +27 用例，机器输出在档）
- `tag-lifecycle.e2e.raw.txt` —— 新 spec 单跑绿（修复瞬态定位歧义后 3 连绿
  +终态复跑绿，~2.9s/次）
- lint / typecheck / build / quality:check / tickets:check 全绿（tickets 统计
  119 票 open 0——P7E-01 条目为强票不阻塞 weak 统计，与票面预期一致）

## 4. 变异红证（scripts/audits/p7e-01-mut-m{1..4}.raw.txt，含命中证明；cp 备份法，还原后 diff 逐组验空）

- M1 repo mergeTags 删第二步 `DELETE paper_tags` —— 命中证明（grep 计数 1→0）
  → repo 测试 1 红。**与票面假设的偏差**：孤儿挂接残留用例未红——001_init.sql
  paper_tags.tag_id 带 `ON DELETE CASCADE`，外键级联兜底了孤儿（删除源标签行
  时挂接自动清）。红证经**事务原子性 mock 用例**成立（第二步语句被桩武装为
  抛错、变异后不再调用→toThrow 失败）。显式第二步保留（票面明定三步，且
  mock 编排锚依赖它）。
- M2 service rename 撤 CONFLICT 预检（条件恒假）—— 命中证明（grep=1）→
  service 测试 1 红（CONFLICT 用例 rejects 落空）
- M3 store mutate 成功后撤链式 refresh —— 命中证明（`await get().refresh()`
  2→1）→ store 测试 3 红（成功链式 refresh 全族）
- M4 TagFilter 撤 S2 onFilterChange(null)（条件恒假）—— 命中证明（grep=1）→
  UI 测试 2 红（S2/S3 invocationCallOrder+toHaveBeenCalledWith(null)）

## 5. 态空间 S1~S10 锚定对照

S1=store 测试（loadSeq 迟到丢弃）；S2/S3=UI 测试 invocationCallOrder+e2e 删除段
（丙回归=死筛选清空装配证）；S4=UI 测试（合并目标=选中→onFilterChange 零调用）；
S5=e2e 改名段（id 稳定甲行在场+徽标更新）；S6=store 测试（CONFLICT 零 refresh）+
对话框保持开（实现契约，UI 侧 S8 用例顺带锚 toast 路径）；S7=store 测试（NOT_FOUND
自愈 refresh）；S8=UI 测试（同 act 双击 rename 仅一次）；S9=UI 测试（菜单禁用）；
S10=幂等双 load 由 library.store 既有 loadSeq 承接（实现依赖既有守卫，未单列用例
——store 测试 S1 已锚同族机制）。

## 6. 顾虑与波动记录（DONE_WITH_CONCERNS 的原因）

1. **票面 M1「孤儿挂接残留」假设与 schema 事实不符**（FK CASCADE 兜底，见 §4）。
   测试网仍拦住变异（经编排锚），非防线缺口；但若后续把 CASCADE 改为 RESTRICT/
  去掉级联，孤儿用例的 raw COUNT 断言即在位——两道锚互补，无需回炉。
2. **e2e 环境级波动 ×1**（指纹：`electronApplication.firstWindow` 30s 超时于
   首跳；根因=src/main/index.ts:10 全局单实例锁，前一实例 teardown 滞后时新
   实例即刻退出→无窗口。出现 1 次于本票取证期，复跑即绿，未达「同用例 2 次」
   立案线；主控 e2e 全量时若再现即立案）。另两次同表象超时系我误序操作
   （npm test 后未切 electron 绑定即跑 playwright——node ABI 下启动即崩），
   已定位非应用缺陷，运行序铁律：e2e 前必 `use electron`（npm run build 自带）。
3. **e2e 瞬态定位歧义（已修）**：chips 刷新与对话框卸载是两次 render commit，
   间隙内 `getByRole('button',{name:'水质（2）'})` 双匹配→strict violation 首
   resolve 即红不重试（3/3 确定性复现后定位）。修=合并/删除提交后先锚
   `expect(dialog).toBeHidden()`（可重试）再断 chips。应用行为本身正确
   （对话框于点击后 <300ms 关闭，判定实验在档）。
4. 票面外既记边界不修：tags upsert 纯空格名 trim 后空串可入库（票面 §⑤ 已
   标注归 AUDIT-B）；INV-53 登记与 registry 翻状态归主控收口（未动）。

## 7. 成本申报

实现者=GLM5.3（bigmodel-coding-plan，继承主控档——派发指令 §⑦ 显式申报口径）；
会话内工具调用约 40 轮，其中 e2e 诊断取证 5 跑（探针 2+判定实验 2+复现轮询 3 连）。

## 8. 回炉一轮（门一 Kimi PASS_WITH_WARNINGS——主控裁决三项，2026-09-03）

处置对照（W2 豁免补记/N2 遗留池/N3 主控收口——不动实现面）：

- **W3 Esc 关闭**（TagLifecycleMenu.tsx）：补 useEffect keydown 监听（Escape→
  props.onClose()，unmount 成对移除；deps=[props.onClose]）；头注「ESC 归
  Dialog 域」旧口径改「菜单轻量面键盘关闭自持」。
- **N1 busy 期取消未禁**（TagLifecycle.tsx 三对话框）：useBusyGuard 增
  requestClose（pending 时 no-op）；三对话框 Dialog onClose 全量收包装回调
  （Esc/遮罩/✕ 全关闭路径过同一门）+取消按钮 disabled={guard.busy}
  （disabled:opacity-50 态与保存/确认对齐）。行数复核：223 行（≤250）。
- **W1 恒真断言口径**（tags-lifecycle.repo.test.ts）：merge/delete 两处 raw
  COUNT 注释改如实口径「schema 前瞻守卫——当前 ON DELETE CASCADE 下恒真、
  变异杀伤率为零，M1 实际红锚=事务编排 mock 用例；CASCADE 改弱则转正为首道
  防线」；测试头注同步登记（含 Kimi 实锤出处）。
- **测试补锚**（tag-lifecycle-ui.test.tsx +2 it，always-active，先红后修）：
  ①W3：菜单开→dispatch keydown Escape→菜单关闭；②N1：delete 提交飞行中
  （pending promise 挂起）取消按钮 disabled+Escape（Dialog 自身关闭路径）不
  得关→resolve 成功后才关。先红证落盘：
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-esc.raw.txt`（1 failed——菜单未关）、
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-busycancel.raw.txt`（1 failed——
  取消未禁用）；修后绿证：`scripts/audits/p7e-01-green/rework-ui-repo.raw.txt`
  （13/13）。

回炉后全量：**npm test 132 文件 / 1142 用例全绿**（1140+2 新锚，
`full-unit-rework.raw.txt` 在档）+lint/typecheck/quality:check 全绿。
超票面自裁申报：无（三修+两锚均主控裁决票面内；测试头注补登属文档面同步）。
```

## 6. 门一 Kimi 审判全文（JSON）
```json
{
  "verdict": "PASS_WITH_WARNINGS",
  "findings": [
    {
      "severity": "WARN",
      "file": "tests/unit/db/repos/tags-lifecycle.repo.test.ts",
      "line_hint": "mergeTags 用例孤儿 COUNT 断言 / deleteTag 用例 remain COUNT 断言",
      "issue": "两处 raw COUNT 断言在当前 schema 下为恒真断言：001_init.sql 的 paper_tags.tag_id 带 ON DELETE CASCADE（材料 §6 已证），merge/delete 事务第三步删除标签行后，无论第二步 DELETE paper_tags 是否执行，挂接行均被级联清掉，COUNT 恒为 0。即 M1 变异（删第二步）无法被该断言捕获——实现者报告 §4/§6 已如实承认（'外键级联兜底了孤儿……红证经事务原子性 mock 用例成立'）。测试网整体仍拦住 M1（mock 编排锚），不构成防线缺口，但这两处断言本身的变异杀伤率为零，与票面把它们写成'M1 变异锚'的预期不符。",
      "evidence": "测试注释自称'M1 变异（删第二步 DELETE）在此 raw COUNT 上红'；实现报告 §4：'票面 M1「孤儿挂接残留」假设与 schema 事实不符（FK CASCADE 兜底）'；§6 DDL：'tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE'",
      "suggestion": "二选一：①保留断言但把注释从'M1 锚'改为如实口径（schema 变更时的前瞻守卫，当前恒真），并在测试头注登记该断言无变异杀伤力；②补一组对 step3（删 DELETE FROM tags）的变异红证，使三步各有真实命中的变异锚。无需回炉重写。"
    },
    {
      "severity": "WARN",
      "file": "tests/unit/renderer/tags-lifecycle.store.test.ts / 票面态空间表",
      "line_hint": "S10",
      "issue": "票面①行为层明定'S1~S10——验收=逐格测试锚'，但 S10（S2/S3 双触发 library load 的幂等性）无任何测试锚：实现报告 §5 自承'S10=……未单列用例——store 测试 S1 已锚同族机制'。S1 锚的是 tags.store 的 loadSeq，S10 的格在 library.store 双 load 路径，机制同族但不是同一格。逐格锚定纪律上存在一格空档。",
      "evidence": "票面：'S10 | S2/S3 双触发 library load（setQuery 自动+onMutated） | 幂等读，重复 load 可接受（loadSeq 丢弃旧响应）'；实现报告 §5：'S10=幂等双 load 由 library.store 既有 loadSeq 承接（实现依赖既有守卫，未单列用例）'",
      "suggestion": "补一条轻量锚（可在 tag-lifecycle-ui.test.tsx 的 S2 用例中断言 onFilterChange 与 onMutated 均被调且 library 侧 setQuery+load 各至多按序触发一次，或在 library.store 既有测试文件中加一格双 load 幂等用例）；或主控裁决 S10 由 library.store 既有锁定测试覆盖并在票面补记豁免。"
    },
    {
      "severity": "WARN",
      "file": "src/renderer/features/tags/TagLifecycleMenu.tsx",
      "line_hint": "透明遮罩 div / 头注",
      "issue": "票面 UI 节明定菜单同型 LineageNodeMenu：'menu+anchor state、点击外部/Esc 关闭'，实现只挂了遮罩点击关闭，Esc 关闭被显式省略（头注'ESC 关闭归 Dialog 域——菜单轻量面不挂键盘'）。属票面行为层小幅偏差：菜单开着时按 Esc 无响应，与同型组件交互不一致。",
      "evidence": "票面：'chip 右键（onContextMenu）→ DOM 菜单（LineageBoard/LineageNodeMenu.tsx 同型：menu+anchor state、点击外部/Esc 关闭）'；TagLifecycleMenu.tsx 头注：'透明遮罩点击关闭（ESC 关闭归 Dialog 域——菜单轻量面不挂键盘）'",
      "suggestion": "补 useEffect keydown 监听（Escape→props.onClose()，菜单 unmount 时清理），与 LineageNodeMenu 同型对齐；或主控裁决此偏离可接受并在票面补记。"
    },
    {
      "severity": "NIT",
      "file": "src/renderer/features/tags/TagLifecycle.tsx",
      "line_hint": "三对话框的取消按钮 / onClose",
      "issue": "变更在途（busy=true）时取消按钮与 Dialog onClose 未禁用：用户可在 mutation 飞行中关闭对话框，组件 unmount 后异步回调仍执行 props.onMutated/props.onClose，失败路径还会在已卸载组件上 guard.end()→setBusy。React 18 下属无害 noop，但存在'对话框已关、变更随后生效'的语义错位（用户以为取消了）。",
      "evidence": "TagDeleteDialog：'<button … onClick={props.onClose}>取消</button>' 无 disabled={guard.busy}；Dialog open … onClose={props.onClose}",
      "suggestion": "busy 期间禁用取消按钮并忽略 onClose（或在 begin() 期间阻断关闭），与保存按钮 disabled 态对齐。"
    },
    {
      "severity": "NIT",
      "file": "src/renderer/features/tags/tags.store.ts",
      "line_hint": "mutate 内 error 构造",
      "issue": "`e.code as AppErrorCode` 为类型断言：ApiClientError.code 声明为 string（材料 §6），强转依赖 main 侧错误码枚举纪律维持真实性，编译器无法守卫。属既有 client 契约的固有缝隙，非本单引入。",
      "evidence": "tags.store.ts：'{ code: e.code as AppErrorCode, message: e.message }'；§6 client 节选：'readonly code: string'",
      "suggestion": "可不动；若要收紧，在 api/client 层把 ApiClientError.code 类型收窄为 AppErrorCode（main 侧 toAppError 已保证枚举封闭），store 即可免断言。"
    },
    {
      "severity": "NIT",
      "file": "docs/invariants.md / tickets/registry.ts",
      "line_hint": "INV-53 / P7E-01 status",
      "issue": "票面⑥验收含 INV-53 登记与 registry 翻 done，材料包中两者均未落地（registry 新条目 status 仍为 'open'）。实现报告 §6-4 已申报'INV-53 登记与 registry 翻状态归主控收口（未动）'，属分工内悬项而非遗漏，提示收口时勿漏。",
      "evidence": "registry diff：'status: 'open', summary: '标签生命周期…INV-53 登记…''；实现报告 §6-4：'INV-53 登记与 registry 翻状态归主控收口（未动）'",
      "suggestion": "主控收口清单显式列两项：docs/invariants.md 增 INV-53（锚=TagFilter/FilterBar/library.store setQuery）+registry P7E-01 翻 done。"
    }
  ],
  "summary": "实现与票面高度对齐：repo 四方法全部预编译+参数绑定、跨表多写正确包裹 db.transaction，service 校验序逐格落实且错误语义归 service，renderer 零跨域新增 import（FilterBar 白名单路径），S2/S3 顺序契约有 invocationCallOrder 实锚，先红/变异红证/恒真断言披露（M1 被 CASCADE 兜底）均如实申报，无范围蔓延、无新增依赖、无安全禁令触碰。无 BLOCKING 发现；三条 WARN 为测试纪律与票面行为层小偏差（恒真 COUNT 断言、S10 空格、菜单缺 Esc 关闭），建议收口阶段处置，不阻塞通过。"
}```

## 7. 关键接缝参考（既有代码节选）
### 001_init.sql paper_tags DDL（外键 CASCADE 事实——W1 依据）
```sql
CREATE TABLE paper_tags (
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (paper_id, tag_id)
);
CREATE INDEX idx_paper_tags_tag ON paper_tags(tag_id);
```
### library.store setQuery/loadSeq（S2/S10 消费端）
```typescript
export interface LibraryStore {
  papers: PaperSummary[]
  total: number
  query: LibraryQuery
  selectedId: string | null
  loading: boolean
  error: string | null
  load(): Promise<void>
  setQuery(patch: Partial<LibraryQuery>): void
  selectPaper(id: string | null): void
  openPaper(id: string): void
}

export function createLibraryStoreInitialState() {
  return {
    papers: [] as PaperSummary[],
    total: 0,
    query: { sort: 'added_desc', offset: 0, limit: 50 } as LibraryQuery,
    selectedId: null as string | null,
    loading: false,
    error: null as string | null
  }
}

/** 列表加载失败的兜底中文消息（仅捕获到非 ApiClientError 的意外异常时使用） */
const LIST_LOAD_FAILED = '文献列表加载失败'

export const useLibraryStore = create<LibraryStore>()((set, get) => {
  // 请求序号（模块内闭包）：只认最后一次发起的 load
  let loadSeq = 0
  return {
```
### papers.queries tagId 过滤（S4/S5 id 稳定论证）
```typescript
    where.push("(p.title LIKE ? ESCAPE '\\' OR p.authors_json LIKE ? ESCAPE '\\')")
    params.push(pat, pat)
  }
  if (q.tagId !== undefined) {
    where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id AND pt.tag_id = ?)')
    params.push(q.tagId)
  }
  if (q.collectionId !== undefined) {
```
### api/client unwrap/ApiClientError（N2 缝隙所在——既有契约）
```typescript
export class ApiClientError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
  }
}

export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  const r = await call
  if (!r.ok) {
    throw new ApiClientError(r.error.code, r.error.message)
  }
  return r.data
}

/** 类型化门面：组件只 import { api }，不碰 window */
export const api = window.api
export const apiEvents = window.apiEvents
```
