# F-A8 门 1b 前置修票实现者简报——ascent≤0 兜底（pdf.mjs 先例对齐）+staged 复跑

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档,环境统一档欠账披露）。
> 票：F-A8 门 1b（阶段票——门 1 判据 a 不过的前置修;裁决表终裁节动作①+
> staged 验收序）。上游=门 1（ea2b8819e3——裁决表
> scripts/audits/f-a8-gate1-forensic-verdict.md）。

## ① 身份与禁令

禁 git add/commit/push;禁碰 tickets//docs/invariants/ADR/prompts（控制面
归主控——设计书 §6 口径分层增补由主控按你的复跑数字写）;卡点=BLOCKED。

## ② 必读序

1. `AGENTS.md`。
2. `scripts/audits/f-a8-gate1-forensic-verdict.md`——门 1 裁决表（终裁节动作①
   +staged 验收序+探针升级项 W1+N4 待核）。
3. `src/renderer/features/reader/pdf-item-geometry.ts` :205-240（itemBoxOf——
   :217 ascent 消费=修点）+bandsFromItems/baselineGroupBlocks（确认修点唯一
   ——descent 零消费已核,不得顺手改其他）。
4. node_modules/pdfjs-dist/build/pdf.mjs 的 #getAscent/DEFAULT_FONT_ASCENT
   （:10894/:11226-11266 附近——先例对齐面,只读不改）。
5. `scripts/audits/f-a8-gate1-diag.mjs`/`-lib.mjs`/`-page.mjs`——取证器三件
   （复跑+升级项宿主）。
6. `tests/unit/renderer/` 下 selection-evaluate/pdf-item-geometry 相关测试
   （回归面）。

## ③ 主控裁决

1. **修点单行**：:217 `style.ascent` 条件从 `Number.isFinite(style.ascent)`
   改为 `Number.isFinite(style.ascent) && style.ascent > 0`（≤0 或非有限→
   0.8——pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8 先例语义:0=字体未声明,
   非合法度量）。**修面仅此一行+头注一行**;bands/descent/其他零涉及。
2. **单测先红**：pdf-item-geometry 或 selection-evaluate 测试文件**新 it**
   （受锁——unlock→改→apply）：夹具含 ascent:0 字体样式→断言盒顶=
   基线-0.8×fontH（修前=基线-0（膨胀缺失）必红）。再加 ascent 缺省/正常值
   回归 it（0.7 等正常度量逐位不变）。变异红证 1 组（条件翻回 >0 删除→新 it 红）。
3. **staged 第一步（旧口径复跑——归因修补有效性）**：修后 `node scripts/
   audits/f-a8-gate1-diag.mjs` 全量复跑（判据 a 同口径:IoU1D≥0.99 占比/
   最差值——**口径未动,过/不过归于修补**）;3882 两页预期显著改善
   （ascent-0 行膨胀消除）——如实记录终态数字（过/不过都记录,不过=新根因
   待析,非回炉责任）。
4. **探针升级项（裁决表 W1）**：-lib/-page 增 3882 六锚块配对错位计数
   （错对锚数/块数——y 膨胀→x 错对因果钉死;修复后预期错对≈0）。
5. **N4 待核**：f-a6-diag-out/ 在档数据中核验 F-A6 取证锚是否覆盖 ascent-0
   项（3882 的 dual/取证 JSON 查锚点 span 的字体归属——或等价核验路径）;
   结论二值:覆盖（则 f-a6 有假阴,更要申报）/未覆盖（则 b2 漏网坐实）——
   如实记录核验方法与结论。
6. **staged 第二步数字**（供主控写设计书增补——你不改设计书）：分层口径
   数字表（整行边界锚[页首/页尾/跨行] vs 项内部分选中锚[单行×2]分层占比/
   区间——复跑 JSON 直接分层统计）落报告。
7. **门 0 NIT×2 顺带**（门二终位转门 2 面——更正:门 1b 顺带最经济,门 2 票面
   已写「归门 2」,在此一并做并申报）:verifyQuoteItem 入口加空 quote 短路
   （与 verifyQuote 对齐——拼接前返回）+annotation-resolve 注释状态机编号
   统一 S0~S3b。各一行+报告申报。

## ④ 纪律

TDD 先红;变异红证;npm run test/verify 真退出码;证据 .raw.txt;受锁流程
unlock→改→apply;探针 .mjs 改动已受锁（281 在册）照常 unlock/apply;复跑
数据落 f-a8-gate1-out/（不入 git——覆盖或新目录 f-a8-gate1b-out/ 自选并
申报）;Electron 取证纪律照门 1。基线=155 文件/1345 用例/locks 281（修后
+新 it 数实测）。e2e 本票零新增（selection 行为变化=真实文档块贴合改善,
无 e2e 断言面——selection 既有 e2e 全量跑绿即可,若跑请先 npm run build）。

## ⑤ 报告契约

全文落 `scripts/audits/f-a8-gate1b-impl.report.md`:修点 diff/先红证据/变异/
staged 第一步复跑数字（占比/最差值+3882 改善对比）/错位计数终态/N4 核验
结论/分层口径数字表/locks/自裁/疑虑。回复五行内。

## 修改文件清单（超出即 BLOCKED）

1. `src/renderer/features/reader/pdf-item-geometry.ts`——:217 一行+头注。
2. `src/renderer/features/reader/anchor-serialize.ts`——verifyQuoteItem 入口
   短路一行（③-7）。
3. `src/renderer/features/reader/annotation-resolve.ts`——注释编号统一（③-7）。
4. `tests/unit/renderer/<selection-evaluate 或 pdf-item-geometry>.test.tsx`
   （受锁）——新 it。
5. `scripts/audits/f-a8-gate1-diag.mjs`/`-lib.mjs`/`-page.mjs`（受锁）——错位
   计数升级项。
