# 同型雷清扫单元实现者派发简报(主控→实现者子代理;无工单号——事件驱动存量缺陷清扫)

## ① 身份与禁令

你是三屋模式的实现者子代理,领任务 **排序雷清扫(五处——缺陷③ 69188e8 同型;
台账=docs/reports/2026-08-27_visual-check-findings.md 发现 3 同型雷清单)**。

- 本单元**无工单号**(事件驱动存量缺陷清扫,同缺陷③先例)——代码/测试注释
  禁引任何 SR2 工单号(引了反而触发 check-tickets 规则),描述用「排序雷清扫/
  决胜键确定化」即可。
- 禁 `git add/commit/push`;禁读改 `tickets/registry.ts`(本单元 registry 零触碰)。
- 卡点=输出 `BLOCKED: <卡点描述>` 停手。

## ② 必读序

1. `AGENTS.md` 硬规则。
2. 母本先例:`git show 69188e8`(缺陷③ ai_notes 排序修复——修法/测试/TDD/审计
   全链先例)与 `tests/unit/db/repos/ai_notes.repo.order.test.ts`(回归锁形态)。
3. 台账:`docs/reports/2026-08-27_visual-check-findings.md` 发现 3(五雷清单)。
4. 现场(ENR-01 后行号,已主控亲核):
   - `src/main/db/repos/lineage.repo.ts:177/178`(listNodes/listEdges
     `ORDER BY created_at, id`)
   - `src/main/db/repos/papers.queries.ts:19-22`(ORDER_BY 三条:added_desc 末级
     p.id DESC/year_desc 无第三键/title_asc 末级 p.id ASC)
   - `src/main/db/repos/notes.repo.ts:91`(selectByLike `ORDER BY updated_at DESC`
     无决胜键;**注**::85 FTS rank 序在清单外,禁动)
   - `src/main/services/export_/corpus.assemble.ts:104`(orderAiNotes 末级
     `a.id < b.id ? -1 : 1`——uuid 字典序彩票)+:94-96 头注「repo 基础序同键
     兜底」声明漂移(随修同步)

## ③ 主控裁决(修法已设计,照做)

1. **环境铁律**:一切 node/npm 命令带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`。
2. 修法(全单元统一口径=**插入序决胜,rowid**;三门先例已核:全部表非
   WITHOUT ROWID/TEXT PK 非别名/零 VACUUM 单调重映射保相对序——缺陷③门审结论):
   - lineage :177/178 → `ORDER BY created_at, rowid`(两处)
   - papers.queries ORDER_BY →
     `added_desc: 'p.added_at DESC, p.rowid DESC'` /
     `year_desc: 'p.year DESC, p.added_at DESC, p.rowid DESC'`(补第三键) /
     `title_asc: 'p.title ASC, p.rowid ASC'`;:17 注释行「附决胜键」语义保持
   - notes.repo :91 → `ORDER BY updated_at DESC, rowid DESC`
   - corpus.assemble orderAiNotes:末级 id 比较整支删除,三键全平 `return 0`
     ——依赖 ES2019+ Array.sort 稳定性保持输入序(输入=repo listByPaper 已修
     rowid 确定序);:94-96 头注同步:「createdAt→(三键全平=0,稳定排序保持
     输入序=repo rowid 确定序;id 字典序决胜已删——uuid 彩票)」
3. 测试回归锁(TDD 首红=对现状必红;全部裸 describe always-active):
   - 新建 `tests/unit/db/repos/lineage.repo.order.test.ts`(缺陷③ ai_notes.
     repo.order.test.ts 同型):直插两行同 created_at 且 id 字典序与插入序
     **相反**(如 id 'zzz' 先插/'aaa' 后插),断言 listNodes/listEdges 按
     插入序返回
   - papers.repo.test.ts(受锁扩):searchSummaries 三键各——同 added_at/同
     year+added_at/title 平局(忽略大小写?title ASC 二进制序即可)两行 id
     反序直插,断言分页序=插入序
   - notes.repo.test.ts(受锁扩):selectByLike 面——同 updated_at 两行 id
     反序,断言序=插入序
   - corpus.assemble.test.ts(受锁扩):orderAiNotes 三键全平两行(id 字典序
     与输入序相反),断言输出保持输入序
4. 决胜语义注:DESC 序配 rowid DESC(后插在前)——与「最新优先」列语义一致;
   title ASC 配 rowid ASC(先插在前)。

## ④ 纪律

- TDD 四档(首红留存→绿→**断言级变异红证**每文件至少一轮——如 lineage 修法
  `rowid`→`id` 单 token 还原即红;cp 备份法还原 diff 空,禁 git checkout)。
- `npm run test` 禁裸 npx vitest;`npm run verify` 收口自检真退出码落盘
  `scripts/audits/sweep-order-impl-verify.log`。
- 受锁文件流程:papers.repo.test/notes.repo.test/corpus.assemble.test 扩前
  `npm run locks:unlock`;新文件 lineage.repo.order.test.ts 先
  `npm run locks:generate` 再 apply。
- 禁新依赖;UTF-8;卡点 BLOCKED。

## ⑤ 基线数字

- verify:**89 文件 652 用例** exit 0(ENR-02 收口后);locks **137**
  (完成后 138:+lineage.repo.order.test.ts);工单 106/open 0(本单元零触碰)。

## ⑥ 报告契约

全文落 `scripts/audits/sweep-order-impl.report.md`:实现摘要/文件清单/TDD 红证/
测试证据(verify 真退出码)/locks 实录/自裁申报(含删减面自查)/疑虑。回复五行内。
