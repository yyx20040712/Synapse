# SR2-ENR-01 实现者报告(2026-08-28)

工单:含金量抓取缓存(cited_by_count)| 状态:实现完成,待人工审查 git diff + 翻 registry。

## 一、实现摘要

- **citedByPatch 纯函数**(cited-by.service.ts):刷新决策单源,票面六格状态机可执行
  形态。判别 `work === null || work.citedByCount === null` 两形返回 null(缓存保留,
  与元数据结果解耦);非 null(含 0)一律强制刷新 `{ count, fetchedAt, source }`。
  row 参数不参与分支(刷新决策与旧值无关——新旧两格同为覆盖写),保留在签名锚定
  「保留谁的缓存」语义(头注声明)。fetchedAt 经 now 注入。STUB 已删(代码零残留)。
- **providers 双源**:crossref 解析 `is-referenced-by-count` / openalex 解析
  `cited_by_count`,zod 均 `z.number().int().nullable().optional()`——类型脏→整个
  work parse 失败走 'failed'(禁 .catch 宽松化,票面 N-r2d);缺省/显式 null→
  toWork 归一 null(命中仍成立,不写缓存通道)。EnrichedWork 增必填
  `citedByCount: number | null`。arxiv.ts 零改动(W3)。
- **enrich.service 挂点**:瀑布后 `citedByPatch(work === null ? null :
  { citedByCount: work.citedByCount }, source, { cited_by_count: row.cited_by_count },
  now)` → `applyEnrichment(id, {...}, citedBy ?? undefined)`。arxiv 组装点
  `work = { ...ax, venue: '', doi: null, citedByCount: null }`。deps 增可选
  `now?: () => string`(默认 `new Date().toISOString()`——corpus.export deps.now
  同型先例)。
- **papers.repo**:applyEnrichment 增第三参 `citedBy?: CitedByWrite`(三列独立 SET
  子句追加,不进 PATCH_COLS;undefined=不进 SET 缓存保留);PaperRow 三列 `?:`;
  findById/findBySha256 读面 SELECT 扩三列(SELECT_COLS——COLS/INSERT 不动,导入面
  零涟漪);DETAIL_SQL 三列+detailById 配对透出(count 非 null 三字段齐出,null 全
  省略→undefined;countSource 经 `as PaperDetail['citedByCountSource']` 单点收窄
  ——写入面只收 PaperSource 枚举)。
- **shared/models/paper.ts**(受锁):paperDetailSchema 增三 .optional() 字段
  (citedByCount: number.int / citedByFetchedAt: string / citedByCountSource:
  paperSourceSchema——类型与写入面闭环)。paperMetaPatchSchema 零触碰。
- **迁移**:005_cited_by.sql(三条 ALTER TABLE papers ADD COLUMN,全可空,纯 LF
  已验证)+ migrate.ts MIGRATIONS 追加 version 5。
- **零新增**:IPC 通道/依赖/出网白名单(grep ALLOWED_REMOTE_HOSTS 无改动)。

## 二、文件清单(对照票面逐项)

| 票面文件 | 处置 |
| --- | --- |
| src/main/services/enrich/cited-by.service.ts | 改:STUB→citedByPatch 实现,头注(任务书)保留 |
| src/main/services/enrich/enrich.service.ts | 改:挂点+arxiv 组装点补 null+deps.now+头注行为/接口层补行 |
| src/main/services/enrich/providers/crossref.ts | 改:接口+schema+toWork+头注接口层补行 |
| src/main/services/enrich/providers/openalex.ts | 改:schema+toWork(OpenalexWork 继承自动含字段) |
| src/main/services/enrich/providers/arxiv.ts | **零改动**(W3)——git diff 确认不在变更列表 |
| src/shared/models/paper.ts(受锁) | 改:paperDetailSchema 三 optional 字段 |
| src/main/db/repos/papers.repo.ts | 改:三列+第三参+读面扩列+detailById 透出;**另拆出 papers.queries.ts(见自裁申报 2)** |
| src/main/db/migrate.ts(非锁) | 改:import ?raw + MIGRATIONS 追加 005 |
| src/main/db/migrations/005_cited_by.sql(新·入锁) | 新建:三可空列,LF |
| tests/unit/services/cited-by.test.ts(新·入锁) | 新建:裸 describe,六格+0 值边界+跨格序列 10 用例 |
| tests/unit/db/repos/papers.repo.test.ts(受锁扩) | 扩:裸 describe 真库落库 3 用例 |
| tests/unit/services/providers/crossref.test.ts(受锁扩) | 扩:夹具+断言行+裸 describe 缺省形 1 用例;import 补 describe |
| tests/unit/services/providers/openalex.test.ts(受锁扩) | 扩:夹具+断言行+裸 describe 两形 2 用例;import 补 describe |
| tests/unit/services/enrich.service.test.ts(受锁扩) | 扩:work 夹具补 citedByCount(桩形状)+裸 describe 集成 3 用例;import 补 describe |
| tests/unit/db/migrate.test.ts | 改:**仅主控裁决下放的 :10 单行**([1,2,3,4]→[1,2,3,4,5],先例 222962c/06ea570) |
| tickets/registry.ts | **未碰**(主控单写者) |

清单外新增:src/main/db/repos/papers.queries.ts(自裁申报 2);locks/manifest.json
(locks 流程必然产物)。清单外未动任何其他文件(git status 核对)。

## 三、TDD 红证(首红)

- `scripts/audits/enr01-red.log`:**19 failed / 620 passed(639 用例),exit=1**
  ——cited-by.test 10 用例全红(repo 未实现 citedByPatch)+papers.repo.test 3
  用例全红(第三参/三列/透出未实现)+migrate.test 1 红(005 未注册)+providers/
  enrich 断言红。首轮曾因三个既有测试文件 import 未含 describe(裸 describe 块
  ReferenceError)修正 import 行后重跑,修正后零 suite 级错误,全部为断言级红。
- 首红阶段即绿的三个用例(work=null 集成/arxiv 集成为现状回归锁、providers 有值
  形部分断言)由变异轮 1/2/3 补足「能失败一次」红证(见下)。

## 四、测试证据(verify 真退出码)

- `scripts/audits/enr01-impl-verify.log` 末行:**exit=0**(quality/tickets/
  locks 136/lint/typecheck/test/build 七关全过;**88 文件 639 用例**全绿——
  基线 621+新增 18)。
- 绿档留存 `scripts/audits/enr01-green.log`(88 passed, exit=0)。
- verify 期间修复三处(均即时重跑完整 verify):①papers.repo.ts 超 repo 300 行
  上限→拆 papers.queries.ts;②papers.queries.ts 头注误写已 done 工单号触发
  check-tickets;③拆分后 LibrarySort 失用触发 lint。最终 verify 为修复后完整跑。

## 五、变异红证(断言级,cp 备份法,禁 git checkout)

`scripts/audits/enr01-mutation.log` 四轮,每轮:cp 备份→node 单 token 替换(断言
恰一次命中)→`npm run test -- <目标文件>`红→cp 还原→diff 空(restore verified):

1. cited-by.service.ts `work.citedByCount === null`→`=== undefined`:3 用例红
   (格2/格5+enrich arxiv 集成——缺省形被误判为写入);
2. cited-by.service.ts `work === null`→`work === undefined`:6 用例红(格3/格6/
   跨格+既有 SR-SVC-05 两用例+ENR-01 work=null 集成);
3. enrich.service.ts 挂点 `citedByCount: work.citedByCount`→`citedByCount: 0`:
   2 用例红(写入集成 count 5→0+arxiv 集成 undefined→载荷);
4. papers.repo.ts `values.push(citedBy.count,`→`values.push(0,`:2 用例红
   (SET 真库落库 count 5→0+detail 透出 7→0)。

## 六、locks 实录

- 改受锁面前 `npm run locks:unlock`(134 文件解锁)。
- `npm run locks:generate`:"仅生成 manifest(136 条),未设只读"——005_cited_by.sql
  与 cited-by.test.ts 均已入册(node 校验 has 005/has cited-by.test = true)。
- verify(exit=0)后 `npm run locks:apply`:"已锁定 136 个文件(只读)。manifest
  记录 136 条。"——与主控预期 136 一致;`locks:check` 一致(136)。
- 终态:受锁文件只读+manifest 同步(未再触碰任何受锁内容)。

## 七、自裁申报(含删减面 diff 自查)

1. **applyEnrichment 参数形态=第三参**(票面下放项):`applyEnrichment(id, e,
   citedBy?: CitedByWrite)`——e 载荷类型零触碰使「PaperMetaPatch 零触碰」在
   类型面直接可见;CitedByWrite 接口单源声明在 papers.repo.ts(repos 层,services
   →repos 单向,cited-by.service 以 import type 消费,无反向依赖)。
2. **papers.queries.ts 拆分(清单外新文件)**:基线 papers.repo.ts 恰 300 行顶格,
   本单增量后 339 行触发 check-quality「repo ≤300」关卡(宪法红线,verify 必过)。
   关卡提示原文「拆查询/映射子函数」;拆出件=ORDER_BY/AGG_COLS/LIST_SQL/DETAIL_SQL/
   SummaryRow/DetailRow/toSummary/escapeLike/buildFilters(逐字搬移,唯一行为差异
   =buildFilters 由工厂闭包级改模块级——纯函数无闭包依赖,等价)。既有
   searchSummaries 全部用例(FTS/LIKE/过滤/排序)保持绿=零行为漂移实证。**判定为
   宪法 DoD 机械配套而非票面裁决推翻**(票面无任何「不拆」断言;区别于上轮
   BLOCKED 的 migrate.test 票面断言证伪),请主控追认;若不认可可指示回滚方案。
3. **citedByCountSource schema 类型=paperSourceSchema.optional()**(票面未定类型):
   与写入面枚举闭环;DB TEXT 读回在 detailById 单点 `as` 收窄(注释声明依据)。
4. **citedByFetchedAt 透出归一**:`r.cited_by_fetched_at === null ? undefined :
   r.cited_by_fetched_at`——显式三态(非 ??),避开判空铁律字面禁令;语义=count
   非 null 蕴含三列同写的应用层不变量的类型面收尾。
5. **新用例=裸 describe、既有用例的字面扩=原 guardedDescribe 块内**(W4+简报③
   口径):crossref/openalex/enrich/papers.repo 四件的新用例均为文件内新增裸
   describe 块;既有用例只补夹具字段与断言行。
6. **enrich.service deps 增可选 now**(票面接口层未列,先例延伸):corpus.export
   `deps.now ?? (() => new Date().toISOString())` 同型;既有测试调用零涟漪。
7. **头注接缝同步**:papers.repo.ts/enrich.service.ts/crossref.ts 头注的接口层/
   行为层行最小补注(新增字段/挂点/拆分说明),未改历史裁决文本;cited-by.service.ts
   头注(任务书)原样保留。
8. **删减面自查**:票面文件清单 15 项逐一见上表,无删减;arxiv.ts/migrate.test.ts
   (除裁决行)/tickets registry.ts 按票面未碰;MIGRATIONS 与 005 按票面定名。
   票面「migrate.test.ts 零涟漪(不改)」一项经主控裁决推翻(先例 222962c/06ea570),
   实改仅 :10 单行。

## 八、疑虑

1. **不变量登记缺口**:票面文件清单不含 docs/invariants.md,故「被引缓存刷新语义」
   (work=null/字段缺省→旧值保留;非 null 含 0→强制刷新;0 与 NULL 判别 === null)
   未登记 invariants 册——宪法「新增跨模块行为不登记视同未完成」与简报「只改票面
   清单内文件」张力,实现者按票面清单执行,建议主控补登记(或裁定 cited-by.service
   头注状态机+测试锁定已满足锚定要求)。
2. **跨格序列「导出装配仍带 5」末段**属 ENR-02 装配面(票面文化层③同口径),
   本单以 cited-by.test 序列前三段+repo 落库保留断言闭合到「旧值 5 保留于库」。
3. **变异红证运行方式**:变异轮目标文件过滤走 `npm run test -- <files>`(vitest
   过滤参数,仍是 npm run test,未裸 npx vitest);全量 verify 兜底。
4. papers.queries.ts 不入锁(src/ 仅 shared 受锁,锁机制自身规则),按非锁新文件
   常规提交。
