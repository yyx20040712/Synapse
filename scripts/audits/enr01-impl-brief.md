# SR2-ENR-01 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-ENR-01 含金量抓取缓存(cited_by_count)**。

- 禁 `git add/commit/push`(一切 git 写操作);禁读改 `tickets/registry.ts`
  (控制面单写者=主控)。
- 只改票面文件清单内的文件;卡点=输出 `BLOCKED: <卡点描述>` 停手,不自裁绕过。
- 实现者自裁权:票面明确下放的自裁项(如 applyEnrichment 参数形态)可裁,
  但必须申报;其余歧义一律 BLOCKED 上报。

## ② 必读序(按序读完再动手)

1. `AGENTS.md` —— 硬规则(测试纪律/代码组织/安全禁令/完成定义)。
2. **票面(=完整任务书)**:`src/main/services/enrich/cited-by.service.ts`
   头注五层规约 + `scripts/audits/enr-ticketing-draft.md` 的 SR2-ENR-01 节
   (含刷新语义状态机表——六格全格+0 值边界)。
3. ADR 母本:`docs/adr/0011-md-corpus-interface-contract.md`
   (INTERFACE 契约背景;ENR-01 只供数据面,不动 INTERFACE 文本)。
4. 先例池(逐文件看,收窄阅读面):
   - `src/main/services/export_/corpus.export.service.ts` :182 附近 —— `deps.now`
     注入先例(citedByPatch 的 now 参数照此风格;禁纯函数内取现时)。
   - `src/main/db/repos/papers.repo.ts` :68/:243 —— applyEnrichment 现签名
     (第三参载荷 `{ source, enrichStatus, patch }`;你要扩独立 citedBy 参数,
     **PaperMetaPatch/PATCH_COLS/paperMetaPatchSchema 零触碰**)。
   - `src/main/services/enrich/enrich.service.ts` :99-100 —— arxiv 组装点
     `work = { ...ax, venue: '', doi: null }` 补 `citedByCount: null`;
     瀑布后调 citedByPatch 的挂点在 :124 applyEnrichment 调用处。
   - `src/main/services/enrich/providers/crossref.ts` /
     `providers/openalex.ts` —— EnrichedWork 接口+zod schema 现状
     (各增 citedByCount 解析;**禁 .catch() 宽松化**)。
   - `src/shared/models/paper.ts` —— paperDetailSchema(.strict())与 PaperRow
     (detail 增三 .optional() 字段;Row 三列 `?:` 可空)。
   - `src/main/db/migrate.ts` —— MIGRATIONS 数组 import ?raw 追加模式。
   - `src/main/db/migrations/004_lineage.sql` —— 迁移书写先例(纯 LF)。
   - 测试四件(受锁扩对象):`tests/unit/services/providers/crossref.test.ts`、
     `tests/unit/services/providers/openalex.test.ts`、
     `tests/unit/services/enrich.service.test.ts`(桩形状)、
     `tests/unit/db/repos/papers.repo.test.ts`(applyEnrichment citedBy
     独立参数 SET 子句**真库落库断言**——enrich 测试全用桩,SQL 面唯一锚定点)。

## ③ 主控裁决(票面范围内澄清——实现者不再自裁这些点)

1. **环境铁律(本机新增,最高优先)**:一切 node/npm 命令必须带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`。
   本机默认 node=v25(ABI 141)会造成 split-pane.test.tsx 11 假红
   (jsdom localStorage 污染)。用错版本=全部作废重来。
2. sqlite 绑定现状:abi-cache 已有 node-v137 与 v141 两份;Node24 会自动
   选 v137,无需你操作。`npm run test` 前置的 `use node` 由 package.json
   自动执行。
3. 迁移文件名=`005_cited_by.sql`(票面定名);测试新文件=
   `tests/unit/services/cited-by.test.ts`(票面定名)。
4. 新测试一律 always-active 裸 describe(不经 guardedDescribe——K3 威胁
   结构性缺位);既有受锁测试的扩在原块内合法。
5. STUB 处置:cited-by.service.ts 现有 `CITED_BY_SERVICE_STUB` 导出——
  实现完成后删除(grep 零残留;确认无消费者)。

## ④ 纪律

- **TDD 四档**:先写测试→首红(输出留存)→实现→绿→**断言级变异红证**
  (单 token 变异→恰中目标用例红→`cp` 备份法还原→`diff` 确认空输出入日志;
  禁 `git checkout` 还原——会抹未提交实现)。
- `npm run test` 禁裸 `npx vitest`;完整 `npm run verify` 收口自检,
  **真退出码落盘**:`echo "exit=$?" >> scripts/audits/enr01-impl-verify.log`。
- 禁新依赖;文件 ≤500 行;中文 UTF-8(写后验证可读)。
- 受锁文件流程:改受锁文件(`src/shared/models/paper.ts`、既有测试三件)
  前 `npm run locks:unlock`;**新增受锁路径**(`migrations/005_cited_by.sql`、
  `tests/unit/services/cited-by.test.ts`)先 `npm run locks:generate` 再
  `npm run locks:apply`;每轮改动完成即保持 apply 状态。
- 判空铁律(票面):0 与 NULL 语义不同——`=== null` 判别,禁 `??`/falsy
  照抄 fillEmptyPatch 风格。

## ⑤ 基线数字(自检参照)

- verify:**87 文件 621 用例** exit 0(主控 2026-08-28 亲验,Node24)。
- locks:**134**(你完成后预期 136:+005_cited_by.sql +cited-by.test.ts)。
- 工单:106/open 2(ENR-01/02)。你的测试会让用例数增加——报告实际数。

## ⑥ 报告契约

全文落 `scripts/audits/enr01-impl.report.md`,含:实现摘要/文件清单/
TDD 红证(首红输出)/测试证据(verify 真退出码行)/locks 实录(generate+apply
输出)/**自裁申报**(含删减面 diff 自查——对照票面文件清单逐项列
「改了什么/没改什么」)/疑虑。回复五行内(详细内容在报告文件里)。
