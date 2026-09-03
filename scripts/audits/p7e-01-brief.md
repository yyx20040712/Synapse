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
