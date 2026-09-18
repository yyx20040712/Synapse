# 门一裁决书 F-GEOM-01-G7（ops-gate1-k2 承载——用户指令 2026-09-18 调度员转达：k1 周额度封顶本批起 k2；逐字归档自岗回执）

**verdict: PASS_WITH_WARNINGS**（0B/1W/7N；W1=收口前处置项，非阻断——二值尾栏口径归 PASS）

**隔离墙声明**：本次仅 Read 简报授权清单内材料——g7-gate1-brief.md、g7-gate1-diff.patch（全文 484 行）、g7-impl-report.md、g7-recon.log、g7-recon2.log、g7-oneway-check.mjs、g7-impl-verify.log:7695-7718、tickets/registry.ts:293-302、设计书全文。未触碰任何包外路径，未做任何写操作。

---

### B 清单

无。

### W 清单

**W1｜字符串形态旧径扫描盲区同族第三现，且 G10 存在可预期的第四现（有行号铁证）——收口前补一条全扩展名 grep 落档，并将字符串面预扫写入 G8/G9/G10 票面**
- 证据链：①recon §I「e2e/其他字符串面引用」扫描（g7-recon.log:113-117）只命中 4 处注释，**漏过** theme.test.ts:294 的 readFileSync 字符串路径（g7-gate1-diff.patch:351-359），该边最终靠测试 collect 红（169/1564）才暴露——recon 字符串面扫描的完备性已被证伪一次；②「恰 1 活边」声明对**可执行面**由 verify 绿+构建哈希机器背书成立，但对**非执行面**（scripts/audits 活诊断 .mjs、docs）包内无全扩展名补扫证据；③**前瞻铁证**：theme.test 上下文行（patch:353-354）显示其形态锁清单引用 `'../../../src/renderer/features/reader/AnnotationMenu.tsx'` 与 `AnnotationEditor.tsx`，而这两件赫然在 G10 迁移清单内（registry.ts:301：AnnotationEditor/AnnotationMenu 迁 view/）——G10 开工时 theme.test 这两行字符串路径必然再踩同一盲区，而 G10 票面受锁面仅列「App.tsx+剩余测试 import」，未含此面。
- 处置要求：a）本票收口前补一条全仓全扩展名 grep（7 名×`reader/`旧径形态）输出落档销项（一条命令成本）；b）主控在 G8/G9/G10 票面受锁面清单中显式预列 theme.test 类 readFileSync 字符串面（G10 至少含 AnnotationMenu/AnnotationEditor 两行），避免重复「停工申报-裁准」循环。依据宪法「同类缺陷二次触发即重构」精神——同族已三现，第四现路径已可指名。

### N 清单

**N1｜简报 §1 numstat 逐件序列誊录失真（主数字不受影响）**：简报称「numstat 逐件吻合 8/2/6/6/4/0/0=26 边行」，该逐件序列无法从任何包内实据复现——recon §C 出边全表实据=Layer 10/Toolbar 1/evaluate 10/geometry 0/paint 3/affinity 2/draft 0（g7-recon.log:23-55），impl 报告 numstat=4/4,1/1,2/2,9/9,0/0,3/3,0/0。合计 26=19 修正+7 域内零改与 19 行逐件分解（4/1/9/3/2）均精确吻合，唯该序列本身系誊录噪声。
**N2｜简报 wc 口径同句混排**：§1 迁移本体行「238/78/312/143/88/210/192」中 Layer/Toolbar 取自含尾行口径（recon §A 系 238/78），后五件取自 wc -l 口径（impl 实测 312/143/88/210/192），两系混排一句；impl 自裁#4 已登记口径差（尾行无换行），patch 484 行 vs 简报 483 行亦同族可解释。
**N3｜M2 变异点行号不一致**：简报 M2=selection-layer.test:26，impl 报告=:27——同一 import 行，誊录级。
**N4｜仓总数字分桶差 1（不确定）**：仓总 +123/-128 vs 分桶和（实现面 67/112+relay 29/5+manifest 26/10=122/127）各差 1；relay/manifest 系剔除件未随包，无法定位差额归属，标不确定。
**N5｜审包 diff 呈现归一化**：5 件 RM 件 diff 头 a//b/ 双侧均为新径（patch:27-30 等），非 git 原生 `similarity index/rename from/to` 形态；index 行 blob 哈希在（954bbdcae0..3ea4369aa2 等），内容核验不受影响。2 件纯 R 件（selection-geometry/use-annotation-draft）零 hunk 不在包内，其迁移成立经探针③残留 0+typecheck 绿+M1/M2 旧径死亡实证交叉证明。
**N6｜设计书 §3.2 括号行数 3 件 DEV**：evaluate 326/313、geometry 142/144、paint 85/89（recon §A:4-6）=G2 删 ≈15 行+G3 头注域声明/勘正中间票已记账漂移，非 G7 引入。
**N7｜M2 还原 sed 逆操作流程注记**：首试 cp 还原被 locks 只读拦截（RESTORE_EXIT=1 如实在档）后改逆向 sed 恢复，非常规备份还原路径；终态经完整重走规范周期+复锁 355 一致+定向 14/14 绿机器验证等价，双记录保留合规。流程教训：受锁件变异应先 unlock 再 cp。

---

### A1~A6 逐项核验结论

**A1 迁移本体（7 件=5RM+2R）——成立**。5 件 RM 在包内有 hunk（Layer 4/4、Toolbar 1/1、affinity 2/2、evaluate 9/9、paint 3/3，与 impl numstat 逐件吻合）；2 件纯 R 零 hunk 经探针③+typecheck+M1/M2 实证（M1=ReaderPageView:41 回退旧径 TS2307 红，证明旧径物理死亡）。rename 检出与简报「5 RM+2 R」一致。

**A2 A 段 19 行深度修正完备性与深度数学——成立**。逐 hunk 验算：Layer 4（patch:35-47：../../→../../../×2、./state→../state×2）+Toolbar 1（patch:59-60：./anchors→../anchors）+affinity 2（patch:72-75 同型）+evaluate 9（patch:87-104：../../→../../../×1、./anchors→../anchors×7、./state→../state×1）+paint 3（patch:116-121）=**恰 19**。深度数学逐行正确：旧 reader/+../../=新 reader/interact/+../../../=src/renderer/；旧 ./anchors|state=新 ../anchors|state=reader/anchors|state。域内互引 7 行零改（Layer 5+re-export 1+evaluate 1）与 recon §C 全表一一对应。geometry/draft 零相对 import（recon §C:47,55）零修正正确。完备性由 typecheck 绿机器背书（漏改任一边=TS2307 红，M1 红证演示此防线真实咬合）。

**A3 B/C 段+RoT 抽取——成立**。B 段 2 处与 recon §B 入边全表（g7-recon.log:11-12）恰称。C 段 8+1=9 行路径修正逐行对号（8 文件行号与 recon §B:13-20 一致+theme 裁准件）。RoT 逐字性：recon2 实测 mkItem/mkText 四份唯一体数=1 且与 factories 版逐字同构（recon2.log:5-7,13-15 vs patch:397-403）；seedRegistry 两变体（recon2.log:20-42）收敛参数化超集——evaluate 2 参固定版在默认参数下字面等价（rotate:0/view:[0,0,612,792]），且改前 typecheck 绿演绎证明其全部调用 ≤2 参（3 参调用对 2 参签名必编译红），等价论证闭合。anchors 域 2 份 mkItem 不动正确——recon2:8 实测「与 selection 版逐字同 0」（不同构，强抽会引入行为差）。type import 删除：改后 typecheck 绿=零消费机器反证（残留引用必 TS2304 红）；factories 改引 anchors/geometry-types 真身（patch:385）优于原 PdfPageCanvas 再导出。零断言变化：全 484 行 patch 无一行 expect/it/describe 变动+指纹门 187/1789/5411 零漂移。

**A4 D/E/G 零改动声明——成立（附 W1 保留）**。diff 面 18 头零跨特性/零配置/零 e2e 文件。E 段经 recon §F 实查（eslint INV-16 四路径=PdfDocProvider/PdfPageCanvas/TextLayer/CorpusExtractor，无 7 件，g7-recon.log:76-82）+§G 实查（check-quality COMPOSITION_ROOT_ALLOW 七键无 7 件，:93-100）。G 段 recon §I 仅 4 处注释提名（:114-117）。字符串形态完备性保留见 W1。

**A5 registry 8 对恰称性+status 零触碰——成立**。8 对行号 107/210/224/242/257/266/293/298（recon §H 改前态+patch 6 hunk+impl 报告三方互证），每对仅 `file:` 字段单点改 interact/ 路径，-/+ 行逐字比对 summary 全等、status 全保留（done×7+open×1）。G7 自身保持 open 合规（翻 done=主控收口职责，与 G4 先例同型）；check-tickets「206 票 open 14 注册表与代码一致」绿=全表路径存在性机器背书（无第八对漏改）。worktree registry.ts:298 抽核与 patch 吻合。

**A6 证据链与数字——成立**。verify 终态 EXIT=0 物理落档（g7-impl-verify.log:7718）；Test Files 170/Tests 1744 基线精确恢复（theme 红态 169/1564=1744−180 计数自洽）；指纹门 187/1789/5411/skip15 零漂移；构建产物 index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB 终态同名同尺寸在档（:7715-7716，基线侧 hash 引述自 g7-build-hash.log 未随包——旁证级，主证链 typecheck/test/指纹门/探针已独立成立）；M1/M2 红证链 EXIT 全落档含还原 diff 空；locks 354→355=探针单件，locks:check 绿反证 recon2.mjs 不在 walk 面（无第二件漏锁）；selection 回归 82 绿归并于 verify 全量绿覆盖。探针本身经对抗审：①②③ 三表逻辑自洽，import() 动态形态盲区由 typecheck 兜底，反向边 `includes('interact')` 取保守方向（伪阳即红），reader 根入边合法豁免注释明示。

### 自裁 6 条逐条裁决

1. **theme.test.ts:294 裁准——准**。技术必要（不修则 collect 红，169/1564 红证在档）+程序合规（停工申报→主控 2026-09-19 01:54 裁准→G4 受锁面实勘勘正先例同型）+范围最小（单行路径段，断言语义零变，指纹门 5411 零漂移）+受锁链完整（unlock→改→generate+apply 即时复锁 355）。盲区反复本身已列 W1，不归责实现者。
2. **4 件 type import 删除——准**。在简报预设授权内（「核实若全无消费再删」），lint/typecheck 双绿双向机器反证零消费，申报如实。
3. **factories 头注边界句扩面——准**。新增两值依赖不注即头注失真，属真值维护非超面改写，改动最小。
4. **wc 口径差登记——准**。如实登记且与包内观察吻合；但门一简报未沿用统一口径（N2），登记未阻断混排再现。
5. **M2 还原失败处置+探针笔误即改——准**（附 N7 流程注记）。失败如实落档+完整重走+终态机器验证，符合「恒真证据不如实红证」精神。
6. **.log 证据件 add -f 申报——准**。符合 F-AUDIT-01 三桶口径+G6 14 .log 前例，属收口执行项，主控收口 git status 未跟踪面应为零兜底。

### 数字复算表

| 项 | 申报 | 独立复算 | 结论 |
| --- | --- | --- | --- |
| diff 头 | 18 | 18（src 7+tests 9+factories 1+registry 1） | ✓ |
| 文件数 | 20 | 18 hunk 件+2 纯 R 零 hunk 件 | ✓ |
| 实现面 +/- | +67/-112 | 逐 hunk 相加：src 21/21+tests 13/81+factories 25/2+registry 8/8=**67/112** | ✓ 精确 |
| A 段修正 | 19（4/1/9/3/2） | 逐 hunk 数=19，逐件分布一致 | ✓ |
| 域内零改 | 7 | 7（Layer 5+re-export 1+evaluate 1，recon §C 互证） | ✓ |
| 出边合计 | 26 | 26（recon §C 逐件 10/1/10/0/3/2/0） | ✓（简报逐件序列失真→N1） |
| B 段 | 2 处/2 文件 | 2（recon §B:11-12 恰称） | ✓ |
| C 段路径 | 8+1=9 行 | 9（recon §B:13-20+theme 裁准件） | ✓ |
| RoT 四件 | +2/-17、-18、-20、-21 | hunk 头验算（-66,21+66,6 → -15 等）逐件吻合 | ✓ 精确 |
| factories | +25/-2 | 3 头注+3 边界+3 import+16 函数=25/-2 | ✓ |
| registry | +8/-8 | 8 对（行号三方互证），status 零触碰 | ✓ |
| 仓总 | +123/-128 | 分桶和 122/127 各差 1，剔除件未随包 | 不确定（N4） |
| locks | 354→355 | +1=探针；locks:check 绿机器背书 | ✓ |
| 测试 | 170/1744 | :7718 EXIT=0+指纹门 187/1789/5411 零漂移 | ✓ |
| patch 行数 | 483 | cat -n 484（尾行无换行 wc 口径差，自裁#4 同族） | ✓ 口径可解释 |

**总评**：零行为纯迁移断言在所有可机验面成立——19 行深度修正逐行验算无误且由 typecheck 背书完备，RoT 逐字性经 recon2 唯一体数证明+等价演绎闭合，零断言变化由指纹门四值零漂移+全 patch 无断言行变动双证，构建哈希恒等提供零行为旁证，M1/M2 红证链完整。唯一实质发现 W1 属侦察方法论面（字符串形态盲区同族第三现，G10 第四现路径已可指名），处置成本极低且非本票实现缺陷。建议主控按 W1 处置后收口。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=1 N=7 VERDICT=PASS
