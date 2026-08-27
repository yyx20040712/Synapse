# SR2-ENR-01/02 工单化票面草案 v3·终稿（2026-08-27 · 双门 PASS）

> 门一 r1=4B/7W/7N（enr-ticketing.audit.raw.txt）→回炉 v2→r2 复核全
> ADDRESSED（新 W-r2a/r2b 已折入）→**门二 PASS 六点全过 0B/0W/6N**
> （enr-ticketing-glm.md）→6 条 N 级已全部吸收进本终稿。双门成本：
> 门一 1.13M/8.0min+复核 0.29M/2.3min+门二 ≈0.6M/7min ≈2.02M tok/17.3min。
> v1 审计处置台账如下：
>
> | 发现 | 处置 |
> | --- | --- |
> | B1 异常语义自相矛盾 | **采纳·设计修正**：citedByCount 由瀑布同一响应携带，**零新增网络调用**——不存在独立 metrics 请求与独立异常面；citedByPatch(work, source, row) 纯函数在瀑布**之后**求值，产物经 applyEnrichment **独立可选参数**写入。「并入既有 try」表述删除；状态机表按新设计重列 |
> | B2 PaperDetail 通道断裂 | **采纳**：paperDetailSchema（.strict()）同步增三 .optional() 字段；PaperRow 三列类型=可选（?:）——import.service.ts:123 零涟漪、既有夹具零涟漪 |
> | B3 受锁/清单错位 | **采纳全项**：摘除多标（corpus.assemble.ts/interface-template.ts/registry.ts 非锁）；补漏（providers 双测试/corpus.export.test.ts/**migrate.ts 必改**）；删错报（migrate.test.ts 动态 Math.max 零涟漪——出清单）；文件名更正 corpus.assemble.test.ts（圆点） |
> | B4 W2/W3 模板义务 | **采纳**：两单文化层入收口机检项（verify 真退出码行+变异还原记录，缺=拒收） |
> | W1 update-meta 开洞 | **采纳强方案**：metrics 独立参数（见 B1），PaperMetaPatch/paperMetaPatchSchema/PATCH_COLS **零触碰**——paper.ts:48 契约头注不动 |
> | W2 0 值格 | **采纳**：表加 0 值边界行+断言「0 是合法缓存值走强制刷新格；判空必须 === null，禁 ??/falsy」；跨格序列用例补 0 值样本 |
> | W3 ArxivWork 口径 | **采纳**：arxiv.ts 零改动；组装点 enrich.service.ts:99-100 补 citedByCount: null |
> | W4 always-active | **采纳**：ENR-02 补声明——新用例裸 describe（不挂 C-02 guardedDescribe 块）；golden 字面量改动在既有块内合法 |
> | W5 venueTier ADR 张力 | **采纳**：随单出 ADR-0011 修订记录 v1.2 补注行（v1 实现档=受锁常量修订制，D3-A 2026-08-27 用户拍板；「允许用户改」UI 面留 D3-B 档） |
> | W6 INTERFACE sha 提示 | **采纳**：口径节补「citedByCount=缓存快照随手动增强刷新；contentSha 幂等以同缓存状态为前提——增量对比消费方须知」 |
> | W7 契约细节未定 | **采纳**：接口层补全部类型签名与表形状（见正文） |
> | N1~N4 | 采纳为票面注记（指针位置规则/头指针保持 P7-C/骨架先建时序/不做边界） |
> | N5~N7 | 证实项，无动作 |

## 主控预裁项 v2（门一可攻击，推翻需更强依据）

1. 工单号 SR2-ENR-01/02、area='service'、b3 指针=P7-G（N5 证实合规）。
2. 缓存宿主=papers 加列（迁移 005 三可空列）；**migrate.ts 必改入清单**（MIGRATIONS 数组 import ?raw 追加——非锁文件）。
3. 触发面=捆绑既有「增强」手动动作；**不做**：metrics 独立重试/单独触发/批量/后台（N4 边界）。
4. metrics 写面=applyEnrichment 独立可选参数 citedBy（W1 强方案）；venueTier v1=受锁常量修订制（W5，随单 ADR-0011 v1.2 补注）。
5. schemaVersion 恒 1（可选字段规则内）；sha 幂等口径「同缓存状态下确定」（N6 证实配套成立，W6 落 INTERFACE）。

---

## SR2-ENR-01 含金量抓取缓存（cited_by_count）

`// b3: P7-G`

**─ 行为层 ──**

- enrichPaper(paperId) 扩展：三源瀑布**响应本身**已含被引数（crossref
  is-referenced-by-count / openalex cited_by_count）——**零新增网络请求**；
  瀑布之后以纯函数求 metrics 写值，经 applyEnrichment 独立参数落库。
- **与元数据结果解耦**：瀑布未命中/异常（work=null）→ 无 metrics 源，
  缓存保留，enrich_status='failed'（元数据面判定，语义诚实）；命中但
  citedByCount=null（arxiv 源/字段缺省）→ 不写缓存，enrich_status='done'。
- **刷新语义状态机**（与元数据 fill-empty 刻意不同——被引数单调增长）：

| papers.cited_by_count | 瀑布结果 | 迁移 | 断言点 |
| --- | --- | --- | --- |
| NULL | 命中且 work.citedByCount 非 null（含 **0**） | 写入 count+fetched_at+source | 三字段齐；0 是合法缓存值 |
| NULL | 命中但 citedByCount=null | 保持 NULL | done 态；ENR-02 装配省略字段 |
| NULL | 未命中/异常（work=null） | 保持 NULL | enrich_status='failed'（元数据面） |
| 有值（含 0） | 命中且非 null | **强制刷新**=新值+新时间戳+source | 旧值被覆盖 |
| 有值 | 命中但 citedByCount=null | 旧值保留 | enrich_status='done'（元数据面） |
| 有值 | 未命中/异常（work=null） | 旧值保留 | enrich_status='failed'（元数据面） |

- 判空铁律：**0 与 NULL 语义不同**——判别必须 `=== null`，禁 `??`/falsy
  （fillEmptyPatch 的判空风格不得照抄到 metrics 面）。
- 跨格序列用例（交审计口径）：NULL→命中 0→写入 0→再增强命中 5→刷新 5
  →瀑布异常→旧值 5 保留→导出装配仍带 5。

**─ 接口层 ──**

- providers：EnrichedWork 增 `citedByCount: number | null`（crossref.ts
  解析 is-referenced-by-count / openalex.ts 解析 cited_by_count；zod 同步）。
  **zod 严格性边界（N-r2d）**：metrics 字段类型脏→整个 work parse 失败→
  enrich_status='failed' 属诚实语义，**禁 .catch() 宽松化引入「部分信任」分支**。
  **arxiv.ts 零改动**（ArxivWork 独立接口不 extends）；组装点
  enrich.service.ts:99-100 补 `citedByCount: null`。
- cited-by.service.ts 新模块：
  `citedByPatch(work: { citedByCount: number | null } | null,
  source: PaperSource, row: Pick<PaperRow, 'cited_by_count'>,
  now: () => string): { count: number; fetchedAt: string;
  source: PaperSource } | null`——刷新决策单源（上表的可执行形态）；
  **fetchedAt 经 now 注入**（corpus.export.service deps.now 先例——W-r2b：
  禁纯函数内取现时，保可测性与确定性）。
- repos/papers：**applyEnrichment 增独立可选参数**
  `citedBy?: { count: number; fetchedAt: string; source: PaperSource }`——
  独立 SET 子句（db.prepare 参数绑定）；参数形态=第三参或载荷内字段由
  实现者自裁+申报（repo 内部接口非契约面——门二轻注）；**PaperMetaPatch /
  PATCH_COLS / paperMetaPatchSchema 零触碰**（update-meta 契约面不开洞
  ——paper.ts:48 头注契约保持）。
- shared/models/paper.ts：**paperDetailSchema（.strict()）增三 .optional()
  字段**（citedByCount/citedByFetchedAt/citedByCountSource）——ENR-02
  装配数据通道；**PaperRow 三列类型=可选（?: number | null 等）**——
  import.service.ts:123 显式构造零涟漪、既有测试夹具零涟漪。
- 迁移 005_cited_by.sql：`ALTER TABLE papers ADD COLUMN cited_by_count
  INTEGER / cited_by_fetched_at TEXT / cited_by_count_source TEXT`（全可空）。

**─ 架构层 ──**

- 分层不动：ipc→services→repos→db；**零新 IPC 通道**（api-surface 契约
  测试零涟漪——N7 证实 Res 字段面不锁）；零新依赖；白名单零新增。
- src/main/db/migrate.ts：MIGRATIONS 数组追加 005（import ?raw）——
  **必改，入清单**；migrate.test.ts 断言动态 Math.max **零涟漪（不改）**。

**─ 生命周期层 ──**

- 不做：metrics 独立重试/单独触发/批量/后台定时（出网仅手动触发红线；
  重试预算留 ENR-03/P8+ 池）；自引剔除/领域基线归一（三偏倚归 AI 侧
  工具——ADR-0011 口径，INTERFACE.md 声明）。

**─ 文化层（测试面/受锁面/验收）──**

- 测试（always-active，裸 describe）：①providers 夹具两形解析
  （crossref.test.ts/openalex.test.ts 受锁扩——现断言逐字段，补新字段行）
  ②citedByPatch 状态机全格+跨格序列（含 0 值样本）③enrich.service 集成
  （work=null→failed 且缓存保留；arxiv 命中→done 且不写缓存）④新测试
  tests/unit/services/cited-by.test.ts。
- 收口机检项（B4 落实，缺=拒收）：verify 真退出码行（echo exit=$? 落盘）
  +变异红证还原记录（cp 备份→变异→红→还原→diff 空输出入日志）。
- 受锁面（对照 manifest 逐条）：shared/models/paper.ts、migrations/005
  （新增入锁 generate→apply）、tests/unit/services/providers/crossref.
  test.ts、tests/unit/services/providers/openalex.test.ts、tests/unit/
  services/enrich.service.test.ts（桩形状扩）、新测试入锁。
- 验收：verify 绿；grep ALLOWED_REMOTE_HOSTS 零新增；真库手动增强一篇
  →detailById 透出三字段（ENR-02 联调真值）。
- **文件清单**（B3 修正后全列）：
  - src/main/services/enrich/cited-by.service.ts（新·骨架先建：b3 指针
    +工单号头注置于首个代码语句前，头注内禁顶格 import/export 词行——
    N1 规则，"- " 前缀防御惯例）
  - src/main/services/enrich/enrich.service.ts（改·组装点补 null+瀑布后
    调 citedByPatch）
  - src/main/services/enrich/providers/crossref.ts、providers/openalex.ts（改）
  - src/main/services/enrich/providers/arxiv.ts（**零改动**——W3 口径）
  - src/shared/models/paper.ts（改·受锁 [locked-change]）
  - src/main/db/repos/papers.repo.ts（改·applyEnrichment 独立参数+detailById
    透出）
  - src/main/db/migrate.ts（改·非锁）+ src/main/db/migrations/005_cited_by.sql
    （新·入锁——N-r2e 全路径）
  - tests/unit/services/cited-by.test.ts（新·入锁）
  - tests/unit/db/repos/papers.repo.test.ts（受锁扩——W-r2a：applyEnrichment
    citedBy 独立参数的 SET 子句**真库落库断言**（enrich 测试全用桩，SQL 面
    唯一锚定点））
  - tests/unit/services/providers/crossref.test.ts、openalex.test.ts（受锁扩）
  - tests/unit/services/enrich.service.test.ts（受锁扩）
  - tickets/registry.ts（改·非锁，常规登记）

registry 条目草案：`{ id: 'SR2-ENR-01', file:
'src/main/services/enrich/cited-by.service.ts', area: 'service', owner:
'strong', status: 'open', summary: '含金量抓取缓存（迁移 005 papers 三可空列
+瀑布响应携带零新增请求+citedByPatch 强制刷新纯函数（0 与 NULL 判别 === null）
+applyEnrichment 独立 citedBy 参数——PaperMetaPatch/update-meta 契约零触碰
+paperDetailSchema 三 optional 字段）' }`

---

## SR2-ENR-02 venueTier 映射与 manifest 装配

`// b3: P7-G`（**注：主文件 corpus.assemble.ts 头指针保持 P7-C 不动**——
一文件双裁决来源，ENR-02 裁决链在 registry summary 声明，防实现者顺手改
头指针丢失 C-02 链——N2）

**─ 行为层 ──**

- front-matter/manifest 装配两可选字段（corpus.assemble.ts:18 预留位
  兑现）：citedByCount（PaperDetail 有值则装配，undefined/null 省略）
  +venueTier（venue→映射表查档；未命中省略——可选语义两形）。
- manifest per-paper 条目带 citedByFetchedAt（sha 幂等口径「同缓存状态
  下确定」自声明配套——manifest 自身只做结构断言，fetchedAt 不破坏既有
  幂等测试——N6）；**配对省略规则（N-r2e）：无 citedByCount 则无
  citedByFetchedAt——两字段成对出现成对省略**。
- INTERFACE.md（interface-template.ts）指标口径节：两字段可选性与消费
  口径（领域基线归一/自引处理归 AI 侧）+ **sha 消费者提示（W6）**：
  「citedByCount=缓存快照随手动增强刷新；contentSha 幂等以同缓存状态为
  前提——增量对比消费方须知」。
- 无状态机新面（装配纯函数）；两形断言=有指标篇字段存在/无指标篇缺省。

**─ 接口层 ──**

- 新模块 `src/shared/venue-tier.ts`（W7 契约全定）：
  - `export type VenueTier = 'T1' | 'T2' | 'T3'`（三档人工先验；T1=领域
    顶刊——档位语义在模块头注声明）；
  - `export const VENUE_TIER_MAP: Readonly<Record<string, VenueTier>>`
    （种子表 3~5 条示例级——机制为主，内容增量走受锁常量修订；
    **键=provider display_name 原形：精确等值、仅 trim，不做 toLowerCase
    归一（N-r2b）**）；
  - `export function venueToTier(venue: string): VenueTier | null`
    （''→null；精确等值匹配，仅 trim 归一；未命中→null）。
- corpus.assemble.ts：frontMatter() 行组装配点（paper: PaperDetail 唯一
  源——B2 通道）+manifest 条目扩展（corpus.export.service.ts 组装处）。

**─ 架构层 ──**

- schemaVersion 恒 1；golden 逐字节口径更新=契约扩展非放宽（[locked-change]
  ——AI-09 断言演进先例）。
- **随单 ADR-0011 修订记录 v1.2 补注行**（W5）：「venueTier v1 实现档=
  受锁常量修订制（D3-A 2026-08-27 用户拍板：最小供给档）；『允许用户改』
  的 UI 面留 D3-B 档」——纯 docs 随单提交。

**─ 生命周期层 ──**

- 不做：venueTier 编辑 UI（D3-B 档）；映射表内容批量扩充（受锁常量修订
  制）；cited_by_count 的 FTS/排序消费面（ADR-0012 条件一未触发）。

**─ 文化层 ──**

- 测试：①golden 更新（夹具含缓存值篇——corpus.export.test.ts 受锁）
  ②结构断言两形（同宿主）③venueToTier 命中/未命中/空串/trim（新测试
  裸 describe **不挂 C-02 guardedDescribe 块**——W4；golden 字面量改动
  在既有块内随 done 激活合法）④INTERFACE 声明存在性。
- 收口机检项（B4）：同 ENR-01（真退出码行+变异还原记录，缺=拒收）。
- 受锁面：tests/unit/services/corpus.export.test.ts、tests/unit/services/
  corpus.assemble.test.ts（圆点命名——B3e 更正）、golden 夹具、src/shared/
  venue-tier.ts（新入锁）。**corpus.assemble.ts 与 interface-template.ts
  均非锁**（B3a 摘除——常规提交）。
- 验收：verify 绿；真库导出抽查 manifest 两字段+时间戳。
- **文件清单**：src/shared/venue-tier.ts（新·骨架先建含 b3 指针——
  N1/N3 规则）/src/main/services/export_/corpus.assemble.ts（改·非锁）/
  corpus.export.service.ts（改·非锁）/interface-template.ts（改·非锁）/
  docs/adr/0011-*.md（修订记录 v1.2 行·非锁）/tests/unit/services/
  corpus.export.test.ts（受锁扩）/tests/unit/services/corpus.assemble.
  test.ts（受锁扩）/golden 夹具（受锁改）/tests/unit/shared/venue-tier.
  test.ts（新入锁——N-r2c 显式落点）/
  tickets/registry.ts（非锁）。

registry 条目草案：`{ id: 'SR2-ENR-02', file:
'src/main/services/export_/corpus.assemble.ts', area: 'service', owner:
'strong', status: 'open', summary: 'venueTier 映射与装配（b3: P7-G 裁决链
在此声明——文件头指针保持 P7-C；shared venue-tier 三档种子表+front-matter/
manifest 可选字段两形装配+citedByFetchedAt 自声明+INTERFACE sha 消费者提示
+ADR-0011 v1.2 补注）——依赖 ENR-01 数据面' }`

---

## 机检兼容自查 v2

- id 正则/b3 指针 P7-G/area 'service'/条目格式（N5 复核维持）。
- 新文件注册时序：骨架（含指针+头注）先建再入 registry（N3）；头注指针
  位置=首个代码语句前（N1）。
- 依赖序：ENR-01→ENR-02 串行。
- e2e corpus-export.spec.ts 断言面大概率零涟漪；若实际触碰，宪法「受锁
  e2e spec 改动后必须全量 verify」适用（N3）。
