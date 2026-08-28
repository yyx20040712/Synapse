# SR2-ENR-01 实现者 BLOCKED 上报(2026-08-28)

状态:**BLOCKED——票面断言与仓库事实冲突,无合规通路,停手待主控裁决**。
工作树零写入(本文件除外);受锁文件全部保持 apply(只读)态。

## 卡点(单一,已穷尽扫描)

票面(enr-ticketing-draft.md SR2-ENR-01 架构层 + cited-by.service.ts 头注架构层)断言:

> src/main/db/migrate.ts:MIGRATIONS 数组追加 005(import ?raw)——必改,入清单;
> **migrate.test.ts 断言动态 Math.max 零涟漪(不改)**。

事实:`tests/unit/db/migrate.test.ts:10` 第一个用例硬编码静态数组断言:

```ts
expect(result.appliedVersions).toEqual([1, 2, 3, 4])
```

MIGRATIONS 追加 005(version=5)后,新库全量应用 `appliedVersions=[1,2,3,4,5]`,
该断言必红 → `npm run verify` 无法绿 → 票面验收(verify 绿)不可达。
票面三约束不可同时满足:

1. MIGRATIONS 追加 005(票面必改项;tests/utils/fixtures.ts createTestDb 依赖它
   建出三列——papers.repo.test 新增的"applyEnrichment citedBy 真库落库断言"
   离开该列无法通过,SQL 面唯一锚定点随之落空);
2. migrate.test.ts 不改(票面裁决,B3 处置"动态 Math.max 零涟漪——出清单");
3. verify 全绿(宪法 DoD + 票面验收)。

005 版本号必然为 5:迁移硬规则"已合入迁移不可修改,只能新增",user_version 单调
递增,无并入 001~004 的合法形态;appliedVersions 必含 5,断言无动态化以外的豁免面。

## 根因分析

门一 B3 处置依据"migrate.test.ts 断言动态 Math.max 零涟漪"只核对了
migrate.test.ts:11 的 `currentVersion`(确为 `Math.max(...MIGRATIONS.map(...))`
动态断言,零涟漪成立),漏了同用例上一行 :10 的 appliedVersions **静态数组**
断言。双门(B1~N7 全项处置)未再核对该行,票面终稿带病签发。

## 裁决选项(供主控)

- **A(建议)**:下放 migrate.test.ts:10 单行修改权——`[1, 2, 3, 4]` 改
  `[1, 2, 3, 4, 5]`(或动态化 `MIGRATIONS.map((m) => m.version)` 一劳永逸)。
  属性质判定:锁定测试随契约扩展同步(ENR-02 票面"golden 逐字节口径更新=契约
  扩展非放宽([locked-change])"同型先例),非"改测试让代码通过"。我按受锁流程
  执行:unlock → 改 → verify → locks:generate → locks:apply,提交带 [locked-change]。
- **B**:主控亲改该行(主控自留单写者权限),改后我领补充指令继续。
- 不接受项:我无权自行改 tests/**(宪法测试纪律+简报"只改票面文件清单内的
  文件");亦不得以"不跑 migrate.test/跳过该用例"等绕过(禁删检/禁放宽断言)。

## 已完成的准备(裁决后可直接开工,无需重读)

- 必读序全部读完:AGENTS.md(系统注入)/票面两件/ADR-0011/先例池
  (corpus.export.service deps.now 先例、papers.repo 现签名、enrich.service
  组装点与挂点、crossref/openalex/arxiv providers、shared/models/paper.ts、
  migrate.ts、004_lineage.sql、测试四件)+ 锁机制(lock-protected.ps1 集合
  规则:tests/**+src/shared/**+migrations/**+*.test.* 自动收,新增文件
  locks:generate 即入)。
- 票面逐断言冲突扫描(仅此一处;api-surface/services.index.ts/corpus golden/
  import.service:123 均确认零涟漪)。
- 实现方案已成型,要点:
  - citedByPatch 按票面签名落 cited-by.service.ts(判别 work===null 与
    work.citedByCount===null 两形返回 null 保留缓存;非 null 含 0 一律强制
    刷新;row 参数签名保留但不参与分支——刷新决策与旧值无关,fetchedAt 经
    now 注入);
  - 自裁项预案(**申报**):applyEnrichment 增**第三参**独立可选
    citedBy?: { count; fetchedAt; source }——载荷类型零触碰使"PaperMetaPatch
    零触碰"在类型面直接可见;
  - enrich.service deps 增可选 now?: () => string(corpus.export.service
    `deps.now ?? (() => new Date().toISOString())` 同型先例);
  - providers zod:两源均 `z.number().int().nullable().optional()`,缺省/显式
    null → toWork 归一 null(命中但字段缺省→done 不写缓存的合法通道),
    类型脏 → parse 失败走 failed(禁 .catch);
  - paperDetailSchema 三 .optional() 字段(citedByCountSource 用
    paperSourceSchema.optional(),与写入面类型闭环);PaperRow 三列 `?:`;
    detailById 配对透出(cited_by_count 非 null 三字段齐出,null 全省略);
    findById/findBySha256 的 SELECT 扩三列(COLS/INSERT 不动,import 面零涟漪);
  - 测试布局(W4+简报③口径):既有用例的夹具/断言行扩=原 guardedDescribe 块内;
    新用例(providers 缺省形/enrich 集成两形/repo 真库落库)=所在文件内新增
    **裸 describe**;cited-by.test.ts=全新文件裸 describe,含六格+0 值样本+
    跨格序列(NULL→0→5→异常保留);
  - 迁移 005_cited_by.sql:三条 ALTER TABLE papers ADD COLUMN,全可空,纯 LF。

## 技能清点(开工时已枚举,留痕)

用:test-driven-development(TDD 四档)/verification-before-completion(verify
真退出码落盘)。不用+理由:systematic-debugging(纯票面实现,卡点即上报非自调)、
javascript-testing-patterns/nodejs-backend-patterns(vitest 与分层以仓库先例为准)、
subagent-driven-development(实现者末梢不再派发)、git 类(禁 git 写)。
