// b3: P7-G
/**
 * [SR2-ENR-01] cited-by.service —— 含金量抓取缓存（cited_by_count，工单：open / strong）
 *
 * ── 行为层 ──
 * - enrichPaper(paperId) 扩展：三源瀑布**响应本身**已含被引数（crossref
 *   is-referenced-by-count / openalex cited_by_count）——**零新增网络请求**；
 *   瀑布之后以纯函数求 metrics 写值，经 applyEnrichment 独立参数落库。
 * - 与元数据结果解耦：瀑布未命中/异常（work=null）→无 metrics 源，缓存保留，
 *   enrich_status='failed'（元数据面判定，语义诚实）；命中但
 *   citedByCount=null（arxiv 源/字段缺省）→不写缓存，enrich_status='done'。
 * - 刷新语义状态机（与元数据 fill-empty 刻意不同——被引数单调增长）：
 *   · NULL＋命中且 citedByCount 非 null（含 0）→写入 count+fetched_at+source
 *   · NULL＋命中但 citedByCount=null →保持 NULL（done 态；ENR-02 装配省略）
 *   · NULL＋未命中/异常（work=null）→保持 NULL（enrich_status='failed'）
 *   · 有值（含 0）＋命中且非 null →**强制刷新**=新值+新时间戳+source
 *   · 有值＋命中但 citedByCount=null →旧值保留（enrich_status='done'）
 *   · 有值＋未命中/异常 →旧值保留（enrich_status='failed'）
 * - 判空铁律：**0 与 NULL 语义不同**——判别必须 `=== null`，禁 `??`/falsy
 *   （fillEmptyPatch 的判空风格不得照抄到 metrics 面）。
 * - 跨格序列用例：NULL→命中 0→写入 0→再增强命中 5→刷新 5→瀑布异常→
 *   旧值 5 保留→导出装配仍带 5。
 *
 * ── 接口层 ──
 * - providers：EnrichedWork 增 `citedByCount: number | null`（crossref.ts
 *   解析 is-referenced-by-count / openalex.ts 解析 cited_by_count；zod 同步）。
 *   zod 严格性边界：metrics 字段类型脏→整个 work parse 失败→'failed' 属
 *   诚实语义，**禁 .catch() 宽松化引入「部分信任」分支**。arxiv.ts 零改动
 *   （ArxivWork 独立接口不 extends）；组装点 enrich.service.ts 补
 *   citedByCount: null。
 * - 本模块：citedByPatch(work: { citedByCount: number | null } | null,
 *   source: PaperSource, row: Pick<PaperRow, 'cited_by_count'>,
 *   now: () => string): { count: number; fetchedAt: string;
 *   source: PaperSource } | null——刷新决策单源；fetchedAt 经 now 注入
 *   （corpus.export.service deps.now 先例——禁纯函数内取现时）。
 * - repos/papers：applyEnrichment 增独立可选参数 citedBy（独立 SET 子句，
 *   db.prepare 参数绑定；参数形态=第三参或载荷内字段实现者自裁+申报）；
 *   **PaperMetaPatch / PATCH_COLS / paperMetaPatchSchema 零触碰**
 *   （update-meta 契约面不开洞——paper.ts:48 头注契约保持）。
 * - shared/models/paper.ts：paperDetailSchema（.strict()）增三 .optional()
 *   字段（citedByCount/citedByFetchedAt/citedByCountSource）——ENR-02 装配
 *   数据通道；PaperRow 三列类型=可选（?:）——import.service 显式构造零涟漪。
 * - 迁移 005：ALTER TABLE papers ADD cited_by_count INTEGER /
 *   cited_by_fetched_at TEXT / cited_by_count_source TEXT（全可空）。
 *
 * ── 架构层 ──
 * - 分层不动：ipc→services→repos→db；零新 IPC 通道（api-surface 零涟漪）；
 *   零新依赖；白名单零新增（api.crossref.org/api.openalex.org 既有）。
 * - src/main/db/migrate.ts：MIGRATIONS 数组追加 005（import ?raw）——必改；
 *   migrate.test.ts 断言动态 Math.max 零涟漪（不改）。
 *
 * ── 生命周期层 ──
 * - 不做：metrics 独立重试/单独触发/批量/后台定时（出网仅手动触发红线；
 *   重试预算留 ENR-03/P8+ 池）；自引剔除/领域基线归一（三偏倚归 AI 侧
 *   工具——ADR-0011 口径，INTERFACE.md 声明）。
 *
 * ── 文化层 ──
 * - 测试（always-active 裸 describe）：providers 夹具两形解析（crossref/
 *   openalex 受锁扩）+citedByPatch 状态机全格与跨格序列（含 0 值样本）
 *   +enrich.service 集成（work=null→failed 且缓存保留；arxiv 命中→done
 *   且不写缓存）+papers.repo.test.ts 受锁扩（applyEnrichment citedBy 独立
 *   参数的 SET 子句**真库落库断言**——enrich 测试全用桩，SQL 面唯一锚定点）。
 * - 收口机检项（缺=拒收）：verify 真退出码行（echo exit=$? 落盘）+变异
 *   红证还原记录（cp 备份→变异→红→还原→diff 空输出入日志）。
 * - 受锁面：shared/models/paper.ts+migrations/005（新增入锁）+
 *   providers 双测试+enrich.service.test+papers.repo.test+新测试入锁。
 * - 验收：verify 绿；grep ALLOWED_REMOTE_HOSTS 零新增；真库手动增强一篇
 *   →detailById 透出三字段（ENR-02 联调真值）。
 * - 文件清单：cited-by.service.ts（本文件）/enrich.service.ts/providers/
 *   crossref.ts+openalex.ts（arxiv.ts 零改动）/shared/models/paper.ts
 *   （受锁）/papers.repo.ts/migrate.ts（非锁）/migrations/005_cited_by.sql
 *   （入锁）/tests：cited-by.test.ts（新入锁）+providers 双测试与
 *   enrich.service.test 与 papers.repo.test（受锁扩）。
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const CITED_BY_SERVICE_STUB = 'SR2-ENR-01'
