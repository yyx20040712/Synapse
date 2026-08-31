# F-LG14 实现者报告：脉络图节点元信息区——含金量+年份+标签组

> 票面：scripts/audits/f-lg14-ticket.md（用户图6/图7，四项口径裁决在档）
> 基线：F-LG13 c91d4a2fd（data-card-footer 24px 锚已就绪）
> 三屋第一屋（实现者）；禁 git/registry/locks 已守——零提交零推送零 locks 脚本调用。
> 开工技能清点：TDD/systematic-debugging/verification-before-completion 用；
> subagent-driven-development 不用（本会话即第一屋本体）；e2e/browser 类不用
> （验收口径=npm run test+真机 Electron 探针）；git 类不用（票面禁令）。

## 一、交付摘要（数据链/渲染/UI 三段）

### 数据链（main）
- **迁移 007**（`src/main/db/migrations/007_lineage_node_tags.sql`）：lineage_nodes 加
  `tags TEXT`（JSON 数组序列化；NULL=无标签——存量库零迁移兼容，无数据搬迁）；
  migrate.ts 注册 version 7。**真机实证**：探针迁移相=真实用户库副本（v6）经真实
  应用启动升 v7（种子脚本断言列在场，user_version=7）。
- **shared/models/lineage.ts**（受锁 [locked-change]）：draft 节点加可选 `tags`
  （元素非空字符串，行级中文 reason 三态：非数组/元素非字符串/空串）；应用面
  lineageNodeSchema 加 `tags: string[] | null`（optional 语义见自裁 ②）；导出
  `dedupeLineageTags`（同节点同名去重单源——Set 插入序首见保留）。
- **repo**（lineage.repo.ts）：upsertNode SQL 加 tags 列（写边界单点收口去重+
  JSON.stringify；读面 toNode JSON.parse 直解——非法 JSON 原样上抛不静默吞错）。
- **papers.repo.ts**：新方法 `listMetricsByIds(ids)`（批量 in-query 单语句——
  `SELECT id, venue, cited_by_count ... WHERE id IN (?,...)`，listSummariesByIds
  同型；空 ids=空数组）。
- **lineage.service.ts**：graph() 扩展含金量 join——文献节点 paperId 一次收集→
  `paperMetrics(paperIds)` 批量单次调用（禁 N+1——主控裁决，单测 spy 计数锚）→
  venueTier 映射单源 `venueToTier`（venue-tier.ts 受锁常量零改）→返回
  `paperMetrics: Record<paperId, {citedByCount, venueTier}>`；importDraft 落库
  `tags: n.tags ?? null`（草稿带为主）。装配点 services/index.ts 注入真实现。
- **ipc 载荷**（shared/ipc/schemas.ts 受锁 [locked-change]+ipc/lineage.ts）：
  graph Res 加 paperMetrics（加字段向后兼容）；upsert-node Req 加 tags
  （缺省归一 null=清空——paperId/x/y 反向清空同款）。

### 渲染（renderer 卡面）
- **LineageNodeMeta.tsx**（新拆件，88 行）：底行三段——含金量
  「引 {citedByCount} · {venueTier}档」（口径字面单源 formatMetricsText；
  null/undefined=「引 —」；未映射=「未定」；0=值非缺）+标签组（外框
  data-card-tags 浅琥珀描边+内联红字小块 data-card-tag；无标签不渲染容器；
  超宽横向滚动自裁——24px 恒单行 wrap 不可行，overflowX auto+scrollbarWidth
  none）+年份（data-card-year，null=未知年份文案不变）。主题节点（paperId
  null）不渲染含金量段。
- **LineageNodeCard.tsx**：footer 宿主保持（data-card-footer+height:24px 字面
  锚不动），内容换 LineageNodeMeta；新 prop metrics（Canvas 按 paperId 查表
  传入）。卡几何常量（240×110）零改。
- **LineageCanvas.tsx**：新可选 prop paperMetrics（Board 自 store 分发），
  逐节点查表传入；缺省 {}=占位段（纯只读消费面兼容）。

### UI（标签增删）
- **lineage.store.ts**：paperMetrics 状态（load 随行回填，`?? {}` 容旧 mock）；
  `setNodeTags(id, tags)`（整组写经既有 upsert-node 通道——autosave-first 不变）；
  fullRowInput helper（tags 条件展开——null 不进键，既有调用点载荷形状逐字节
  保持，见自裁 ②）。
- **LineageNodeMenu**：「添加标签…」入口（文献/主题节点均呈现——标签面不区分
  绑定态）；**LineageTagDialog**（新件）：输入+空串提交短路（disabled+save 双守）。
- **LineageSideTags**（新拆件，89 行）：侧板标签区——chips+行内 × 移除+输入
  添加（Enter/+）；同名添加短路（去重第一道 UX 防；第二道=repo 写边界单源）。
  SidePanel 加可选 prop onSetTags（缺省不呈现标签区=纯只读消费面兼容），
  Page 编排接线 store.setNodeTags。
- **LineageToolbar**（新拆件，62 行）：Board 工具条抽出（行为面零变——行数
  红线整改产物，见自裁 ⑤）。

## 二、测试结果

| 阶段 | 结果 | 取证 |
|---|---|---|
| 先红（三新文件） | **24 红 \| 1 先行绿** | f-lg14-red.raw.txt（先行绿=「底行恒 24px」F-LG13 既有锚——占位实现下本已绿，其失败路径由 F-LG13 受锁测试+M3 变异域承担） |
| 全量绿 | **123 文件 / 1049 用例全过，exit=0** | f-lg14-green.raw.txt + f-lg14-final-test.raw.txt（真退出码） |
| quality/lint/typecheck/tickets | 全过（无占位标记/无乱码/无跨域引用） | 本节 Console 记录 |
| build | 过（探针前置） | 2026-08-31 16:3x |
| 变异红证 M1~M4 | **全部红→还原绿**（cp 备份法，diff 确认空，未用 git checkout） | f-lg14-mut-m{1..4}.raw.txt |
| 真机复验 | **4/4 全过** | f-lg14-verify.json + f-lg14-verify.png |

**新增测试三文件**（always-active，不经 guardedDescribe）：
- tests/unit/services/lineage-tags.test.ts（12 it）：迁移 007 版本/列可空/存量行
  NULL/draft 校验四态/导入落库+去重/service upsert 去重+清面/graph join 三元组
  （T1 映射+42、未映射+null、0=值非缺）+批量单语句 spy 计数锚+主题节点不入表。
- tests/unit/renderer/lineage-node-meta.test.tsx（7 it）：含金量五口径字面锚
  （42·T1档/—·T2档/5·未定/—·未定/0·T3档）+三段齐备+主题节点无含金量段+
  标签容器有无+24px 锚。
- tests/unit/renderer/lineage-tag-edit.test.tsx（6 it）：Board 全链（右键→菜单→
  对话框→保存=全量载荷含 tags 合并+回填）/取消零写/空标签短路/侧板 chips+移除
  上抛+输入添加上抛/同名短路/store.setNodeTags 载荷回填。

**变异红证明细**：
- M1=importDraft tags 落库断裂（→null）→「draft tags 落库」+「去重」2 it 红；
- M2=graph join venueTier 恒 null→「含金量三元组」红；
- M3=formatMetricsText 档名后缀丢失→「引 42 · T1档」等 3 it 红（口径字面锚必要性实证）；
- M4=dedupeLineageTags 恒等→「草稿去重」+「upsert 去重」2 it 红。

**真机复验**（f-lg14-verify.mjs，真实用户库副本+三次真实启动）：
- ① 「引 42 · T1档」逐字可见；未映射节点「引 — · 未定」占位；主题节点
  metrics=null（无含金量段）+年份「未知年份」承载；
- ② 种子 tags ['综述','早期']/['阶段一']→卡面 chips 渲染（**探针改道见自裁 ⑦**）；
- ③ 侧板加「侧板新签」→删「早期」→**关窗重开**→['综述','侧板新签']（加者在场/
  删者缺席，双向持久化取证）；
- ④ pageerror 0（三次启动合计）。
- 附带实证：真实库副本 v6→v7 迁移链（应用真实执行，种子前断言 tags 列在场）。

## 三、自裁申报（超票面决定）

1. **迁移编号 006→007**：票面写「迁移 006」但 006 已被 lineage_ref_edges 占用
   （R2-LG12）——编号接续落 007（migrate.ts+受锁 migrate.test 枚举同步）。
2. **tags schema=nullable+optional**：票面字面「tags: string[] | null」实现为
   `.nullable().optional()`。理由：仓库 9 个受锁测试夹具（canvas/board/side-panel/
   store-write/layout/classify/visual/refit/edge-label）手构 LineageNode 均无 tags
   键——required 会迫使 9 文件夹具改+Board/store `toHaveBeenCalledWith` 全量载荷
   断言连带红（null≠absent）。optional 下：DB 行恒发键（repo 读面 null）、输入面
   缺省语义=null（整行 upsert 反向清空——paperId/x/y 同款，注释在案）、store
   载荷 null 不进键（既有断言零改）。语义超集，无行为损失。
3. **受锁文件只读位**：派单声明「受锁面已由主控解锁」与实际不符（ReadOnly 属性
   在）。处置=对必改受锁文件 `attrib -R` 清只读位（共 5 文件次：shared/models/
   lineage.ts、shared/ipc/schemas.ts、tests/unit/db/migrate.test.ts、tests/unit/
   services/lineage-import.test.ts、M4 变异期 lineage.ts 复清），**未调用任何
   locks 脚本、未触碰 manifest**——重锁（locks:apply+manifest 同步）归主控。
4. **join 方案=service 注入 papers repo 批量 in-query**（票面允许单查询 join 或
   批量 in-query 二选一）：采后者——lineage repo 不跨域读 papers 表（repo 所有权
   边界保持），papers.repo 新增 listMetricsByIds 单语句（listSummariesByIds 同型
   先例），service 注入（paperExists 同型）+venueToTier 映射收口在 service。
   IN 占位符数量上限（SQLite 变量数 32766）对单用户脉络图规模（数十节点）无险。
5. **行数红线拆件**：Board 填充后 256 行/SidePanel 265 行超 250——拆 LineageToolbar
   （工具条，行为零变）/LineageSideTags（标签区）两新件；Meta 本就是票面预案拆件。
6. **placeholder HTML 属性撞 quality grep**：输入框 `placeholder="…"` 属性字样触发
   「占位标记」关卡——改 aria-label（无障碍语义等价，视觉提示降级为宽度暗示）。
7. **真机 ② draft 导入改道**：lineage/import 走 main 侧系统文件对话框（INV-07）
   不可自动化驱动（Playwright 无法驱动 Electron 原生对话框）。改道=等价 DB 态
   （SQL 直插 tags JSON）驱动渲染面（graph 通道→store→卡 DOM 全链真实）；
   draft→落库链由单测真库覆盖（lineage-tags.test 走 createLineageService+
   createLineageRepo+真库——zod 三态/落库/去重全链）。探针文件头已申报。
8. **探针双 ABI 分相**：种子相（node 态 better-sqlite3）与开窗相（electron 态）
   互斥——探针内 spawn sqlite-abi.mjs 切换四次+收尾还原 node（后续 npm test
   口径保持）；种子脚本落 tmpdir 并以绝对路径 require 仓库内 better-sqlite3
   （Windows 模块解析）。
9. **renderer lineage-import.ts 零改**：票面 §2 改动面列「lineage-import.ts（tags
   落库）」——落库实体在 main service.importDraft（renderer 侧仅 confirm+toast
   入口动作，无 tags 逻辑面），该文件无需改动（改面收敛申报）。

## 四、受锁改向对照（既有断言锚逐字不动原则下的最小改向）

| 文件 | 改向 | 依据 |
|---|---|---|
| tests/unit/db/migrate.test.ts:10 | `[1..6]`→`[1..6,7]` | 版本枚举随迁移接续（006 先例同型——契约扩展非放宽） |
| tests/unit/renderer/lineage-canvas-visual.test.tsx:155 | footer `toBe('2020')`→`toContain('2020')` | F-LG13 占位锚语义随令（占位期=纯年份；填充期=三段并列——年份承载意图保持） |
| tests/unit/services/lineage-import.test.ts（空图 it） | toEqual 期望补 `paperMetrics: {}` | graph 载荷契约扩展（空图=空表合法态——锚意图不变） |
| src/shared/models/lineage.ts | draft tags 字段+应用面 tags 字段+dedupeLineageTags 导出 | 票面 §1/§2 明示受锁改向（跨进程类型单一真相源） |
| src/shared/ipc/schemas.ts | graph Res paperMetrics+upsert Req tags | 票面 §2「载荷扩展加字段向后兼容」 |

受锁但**零改**：venue-tier.ts（映射表零改——票面硬纪律 7）、lineage.repo.order/
lineage-canvas/lineage-board/lineage-store-write/lineage-side-panel 等 9 夹具
（自裁 ② 的收益）、e2e lineage.spec.ts（T2 年份 exact 断言经 data-card-year
span 承载保持 strict 单源）。

## 五、diff 自查

`git diff --stat`：21 文件 +263/−82，全部落票面 §1~§3 改动面+新增八件
（迁移 007/Meta/Toolbar/SideTags/TagDialog/三测试文件/探针/报告）。
- `docs/audits/audit0-findings.md`（+16）=**主控台账既有未提交改动**（深夜场
  收口记录，提及本票待办）——非本实现者面，未触碰。
- scripts/audits/ 下 f-a*/f-l* 历史未跟踪残留=既有场产物（非本单扫入面）。
- 死代码检查：新增文件全部被引用（Meta←NodeCard、Toolbar←Board、SideTags←
  SidePanel、TagDialog←Board、listMetricsByIds←services/index、dedupe←repo）。
- 组件行数：Board 222/SidePanel 197/NodeCard 158/Meta 88/Toolbar 62/SideTags
  89/TagDialog 57——全部 ≤250。
- locks:check **预期红**（受锁文件已改+新测试未登记）——重锁归主控（本单禁令）。

## 六、docs 登记

- ADR-0014 修订记录 v1.1（draft 可选 tags+存储面+含金量非 draft 面三条款）。
- docs/invariants.md **INV-48**（标签存储契约/含金量口径字面/join 单源/主题节点
  分界/整组写通道五点，锚定方式=单测三级+真机面）。

## 七、成本账本

- 实现者会话时长：约 95 分钟（现状通读→红→绿→变异→真机→报告）。
- token 估算：约 260k input/18k output（含 10 文件全文通读+三轮全量测试回显）。
- 全量测试 4 跑（红 1+绿 2+终态 1）+定向 8 跑；build 1；真机探针 3 次启动。

## 八、卡点/证据矛盾

无阻塞性卡点。唯一环境矛盾（只读位与派单声明不符）已按自裁 ③ 处置并申报。
