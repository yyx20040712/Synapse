# F-GEOM-01-G1 门二终审报告（岗无写通道——主控逐字归档）

> 归档说明：门二=ops-adjudicator 绑定子代理（deepseek-flash $max），报告原文
> 逐字如下，无删改。归档时间=2026-09-18 batch 13。

---

# F-GEOM-01-G1 门二终审报告（ops-adjudicator 异构二审）

> 审包=scripts/audits/g1-gate2-brief.md 所列全量材料（impl brief/report、gate1-diff.patch 全量、gate1 报告、五 raw、registry、设计书 §3.3/§3.4、终态 7 源文件）；只读裁决不亲跑（实证部职责），结论以包内材料为限。裁决基准时点=工作区当前终态（我对 patch 声明面与终态源文件逐项做了同一性抽核，无漂移）。

## ① 独立复算结果表

### A. 7 文件 ±行数（patch hunk 逐文件亲算，非采信转述）

方法：对 `E:\class\智慧水务\Synapse_remake\scripts\audits\g1-gate1-diff.patch` 逐 hunk 数 +/- 行并以 hunk 头 old/new 计数自证；再以全文件 grep 对账。

| 文件 | + | − | 净 | 复算依据 |
| --- | --- | --- | --- | --- |
| PdfPageCanvas.tsx | 9 | 50 | −41 | patch:5-18（+4/−3）+ patch:19-78（+5/−47）；raw 自印 numstat 同值（g1-mutation-reexport.log:49-50「9 insertions, 50 deletions」） |
| annotation-anchor.ts | 12 | 13 | −1 | patch:83-135 四 hunk（+3/−1，+3/−3，+6/−1，+0/−8）；raw 自印同值（g1-mutation-pixelbox.log:22-23「12 insertions, 13 deletions」） |
| annotation-resolve.ts | 7 | 14 | −7 | patch:140-176 两 hunk（+3/−1，+4/−13） |
| geometry-types.ts | 100 | 17 | +83 | patch:181-301 单 hunk（−1,20 → +1,103；3 上下文行=旧 1/3/19）；终态文件 103 行亲核（行计数 103，零 import） |
| page-items.store.ts | 4 | 3 | +1 | patch:306-325 |
| pdf-item-geometry.ts | 7 | 12 | −5 | patch:330-371 三 hunk（+3/−3，+2/−3，+2/−6） |
| reader-search.store.ts | 1 | 1 | 0 | patch:375-384 |
| **合计** | **140** | **110** | **+30** | 全文件 grep：`^\+`=147 减 7 个 `+++` 头=140；`^-`=117 减 7 个 `---` 头=110 |

宣称 +140/−110 **成立**；与门一 report:42 逐文件净额 −41/−1/−7/+83/+1/−5/0（合计 +30）独立吻合。

### B. 变异错误行计数（宣称 vs raw vs 自印行三方对账）

| 项 | 宣称 | 我的复算 | 结论 |
| --- | --- | --- | --- |
| 主证 error TS 行 | 32 | 32（reexport.log:12-43） | 一致 |
| 主证 TS2305 | 5 | 5（:24,26,28,31,35）；全文件 TS2305 命中 6=5 错误行+节头 :5 | 一致（6 系旧口径含节头） |
| 主证 TS2459 | 27 | 27（全命中即错误行） | 一致 |
| 副证 error TS / TS2724 | 3 | 3（pixelbox.log:12-14，全为 TS2724）；全文件 TS2724 命中 4=3 错误行+自印行 :18 | 一致（4 系旧口径含自印行） |
| log 自印 count 行 | 「与自印一致」 | 主证 log 仅裸 `6`（:45，TS2305 含节头）；副证「TS2724 count: 3」（:18） | 副证一致；**主证无 32/5 自印行——勘误句尾对主证不成立**（残留见 ④N1） |

### C. 受锁测试消费面枚举（主证 log）

- src 6 件（reexport.log:12-22，11 错误行）= PageBox/PageColumn/PageColumnView/PagesOverlay/reader-search.ts/TextLayer；tests 10 件（:23-43，21 错误行）= ai-annotation-layer/anchor-item-verify/annotation-layer/band-calibration/pages-overlay/pdf-item-geometry/reader-search-text/selection-evaluate/selection-item-chain/text-layer。11+21=32 行分解吻合；src 六件与终态全仓 `from './PdfPageCanvas'` grep 逐一对应（无第七 src 消费者）。副证消费面 3 件（pixelbox.log:12-14）含受锁锚 anchor-item-verify.test:30，与终态测试文件亲核一致。

### D. 基线与环境

unit：g1-unit.log:3912「170 passed (170)」、:3913「1745 passed (1745)」、:3917 UNIT_EXIT=0；与设计书头 :12 基线、relay batch12 记录（relay.md:197）三处一致，零漂移。typecheck EXIT=0（g1-typecheck.log:7）、lint EXIT=0（g1-lint.log:7）。五 raw 尾 EXIT 标记物理在档（typecheck:7 / lint:7 / unit:3917 / reexport:59 BACKUP_REMOVED / pixelbox:32 BACKUP_REMOVED）。

### E. 锁面反证（给面 b）

locks/manifest.json 路径条目 **338**（`"path"` 命中 339 含 `"files"` 键）；22 条 `src/` 受锁全为 src/main/db/migrations/*.sql(8)+src/shared/**(14)（manifest:465-549），**无** src/renderer/features/reader/**；docs 受锁仅 invariants.md（manifest:9）。故 7 源文件+scripts/audits 证据件+tickets/registry.ts+relay.md 均非受锁。.gitignore:13 `*.log` 属实（面 c 依据成立）。

### F. 终态与红线（patch 外的主证复核）

- 定义唯一性：`PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry/PixelBox/RowBand/COLUMN_GAP_*` 定义仅存 geometry-types.ts:33,47,58,72,78,89,102,103；geometry-types 自身零 import。
- 三环+两边切断：pig 仅存 @shared/annotation-merge/geometry-types 四条 import（:68-71），对 Canvas/anchor/resolve 零边；anchor 对 pig 零边（:51-54）；两 store 改向（page-items.store.ts:38 / reader-search.store.ts:41）。
- 再导出三处齐：PdfPageCanvas.tsx:39 / annotation-anchor.ts:58 / annotation-resolve.ts:60；不改面消费者零改（grep 逐一在列，含简报漏列的 TextLayer.tsx:34）。
- patch 无 `--- a/tests/` 头、无 rename 头、无 package.json 头；7 个 `diff --git` 头全在 reader/（patch:1,79,136,177,302,326,371）→ 零 tests 触、零文件移动、零新依赖。
- 头注四锚终态抽验：band-calibration.test.tsx:32,35、pdf-item-geometry.test.tsx:18、anchor-item-verify.test.tsx:30,33、ai-annotation-layer.test.tsx:25 全部逐行吻合。
- reader 目录 TODO/FIXME/placeholder/`export {}` 零命中（quality 关卡预检）。

**包限不可核项（如实点名）**：首跑红档（22 文件/184 用例）无 raw；主控进场前 relay.md 变更指纹；git status 实况——三者无包内佐证，按文字申报采信，不影响本判。

## ② 门一 W1/N1~N3 复核意见

- **W1 处置=计数层面通过**：impl report 主体（§二2 :32-33、§三 :56-57、§四 :66）已全数为 32=5+27 / 3，与我的 error-line 枚举一致；原文 33/4 仅存于勘误段（:36-38），「保留原文+勘误段」形态可接受。**但勘误句尾精度缺陷**：其声称「与 log 自印 count 行一致」，主证 log 自印值实为裸 `6`（旧口径残留），32/5/27 只与 error TS 行枚举一致——见 ④N1（文案级，不改数）。
- **N1（首跑红无 raw）**：认同门一降 N。unit log 为绿档且无命令行回显，ABI 前置不可自 raw 验证；附建议：后续票面 DoD 直接写 `npm run test`（含既有前置口径）。
- **N2（RowBand 再导出无专项变异红证）**：认同不要求补。补强：band-calibration.test:32 旧路径 import 我已终态亲核；若再导出缺失，终态 typecheck 必红——证据强度弱于主/副证属如实记录。
- **N3（.log 与 .gitignore 冲突）**：认同；.gitignore:13 与五件 log 存在均已核，收口 `git add -f` 预批（见 ③c）。
- 门一未见面补记：geometry-types 文化层四锚门一未逐条终态抽验，我已补验，无出入（④N6）。

## ③ 收口预呈逐面裁决

- **a. verify 全链亲跑：批准（例行）**。要求真退出码落 raw；本批零锁面但 verify 含 locks:check（应绿）。
- **b. 零锁面主张：成立**（①E 反证）。零 [locked-change]、零 locks 操作正确。精度注记：scripts/audits 受锁自动面为 *.mjs/*.ps1，本批证据件 .log/.md/.patch 不触发，且 glob 核 g1-* 无 .mjs——无补登义务；收口若临时新增任何 .mjs 探针则必须 locks:generate+apply。
- **c. 证据件入库：批准**。五件 .log 需 `git add -f`（.gitignore:13 已核）；brief/report/gate1 报告/patch 常规列入；变异备份件零残留（无 g1-mutbak-*）；收口后未跟踪面应清零（relay.md 进场前变更与 g1-impl-brief/g1-gate2-brief 一并显式列文件，禁目录扫描）。
- **d. registry 翻 done+relay 勾选+批次日志：批准**。现状核对：registry.ts:292 `status: 'open'`、relay.md:103 `- [ ] F-GEOM-01-G1`——翻/勾即可；批次日志补 batch 13 段（现最后为 batch 12，:152）。提示：relay.md:102 父行验收含「e2e 44 全绿不破」、:125 归 G11，本票不解缴父级 e2e。
- **e. e2e 不跑：批准（附口径修正）**。成立依据=设计书 §3.4 M0 行 :266 验收面「unit 全绿+typecheck」+ :277「e2e 一键全跑 45 于战役收口票」+ 零运行时值变（常量 1.5/0.02 逐字同值亲核 geometry-types.ts:102-103；type-only 导入编译期擦除）。口径修正：(i) 勿以「batch 12 同口径」为据——batch 12 系空体骨架零 import（relay.md:202-203），G1 有模块图边变更（常量位搬迁+两处 import 改向），类比不精确；(ii) 收口文案不得宣称战役 e2e 验收已过。

## ④ 分级发现（口径：B=P0/W=P1/N=P2+注记）

**P0（阻断）=0。P1（条件）=0。**

- **N1（P2，收口文案）**：g1-impl-report.md:38「与 log 自印 count 行一致」对主证不成立——主证 log 自印仅裸 `6`（g1-mutation-reexport.log:45，TS2305 含节头旧口径），32/5/27 仅与 error TS 行枚举一致。建议改述为「32（5+27）与 error TS 行枚举一致；主证 log 裸 6 行为旧口径残留，不采信」。销项=一句话替换。
- **N2（注记）**：impl brief 不改面枚举缺 TextLayer:34（brief:90-97）；零执行影响——再导出承接全覆盖、门一 :34 与主证 raw:21-22 均枚举到、TextLayer 零触由 patch 七文件面可证。
- **N3（注记）**：e2e 口径精确化+父级义务留 G11（见 ③e）。
- **N4（注记）**：首跑红无 raw（承门一 N1）+DoD 命令口径建议（见 ②N1）+包限不可核三项如实点名（①F 尾）。
- **N5（注记）**：收口例行面预批清单（.log×5 add -f / registry:292 / relay:103+批次日志 / verify 真退出码 / 显式列文件）。
- **N6（注记）**：geometry-types 头注文化层四锚（geometry-types.ts:24-26）与终态消费面逐条吻合（见 ①F）；系代表性样本（实测 tests 消费 10 件、src 6 件），非穷举亦非失实——**无出入，不要求改**。架构层六消费方（:15-16）与终态 import 面同样一一吻合。

**回炉建议：无**（无 P0/P1）。优先级：N1=N5（收口一步销）> N2/N3/N4/N6（注记，零动作）。

## ⑤ 终判

**GO**。四项关键数字全部独立复算成立（+140/−110；32/5/27；3；170/1745）；消费面 6+10 与终态吻合；三环+两 store 边+COLUMN_GAP 值边切断经终态全域核验；红线全守（零文件移动/零 tests 触/零新依赖/变异证闭环）；locks 338 反证零锁面；门一 W1 在计数层面已销，仅余 N1 文案级残留。收口按 ③a~e 执行即可。

机读尾栏（B=P0 数/W=P1 数/N=P2+注记数，口径=本节 ④）：

FINDINGS: B=0/W=0/N=6/VERDICT=GO
MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
