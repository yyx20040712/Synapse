# F-GEOM-01-G11 门一对抗审计报告（ops-gate1-k2，kimi k3 $max，2026-09-19）

**裁决：FAIL**（B×1 / W×1 / N×5）。B1 为一行级文档缺陷，回炉成本极低（INV-47 行一处路径前缀+locks 重锁），但它落在本票自身义务④的正中心，且伴随三处书面失实，不可放行。

## B（阻断）

**B1. INV-47 声明处全路径漏刷——「11 处平铺旧径已随迁刷新」失实，实际只刷了 10 处，且与同 patch 新增的「路径口径」小节自相矛盾**

- 现行 docs/invariants.md:62（INV-47 声明处列）：`| src/renderer/features/reader/annotation-anchor.ts（estimateLinePitch 导出+mergeLineRects 双门）+anchors/annotation-merge.ts…`——annotation-anchor.ts 仍是无域前缀的平铺旧径。
- 该路径所指文件**不存在**（Read `src/renderer/features/reader/annotation-anchor.ts` 返回 File does not exist）；现行件=`src/renderer/features/reader/anchors/annotation-anchor.ts:1-3`（亲读在档，G6 迁移票 registry:297 亦载明 annotation-anchor 迁 anchors/）。
- patch 内 10 处全路径刷新逐处核对成立（g11-gate1-diff.patch：INV-20 :9-10、INV-34 :18-19、INV-40 :25-26、INV-46 :33/35、INV-55 :44-45、INV-57 :47/49、INV-58 :48/50、INV-59 :52/54、INV-60 :53/55、INV-62 :57-58），其 10 个目标路径全部亲读存在。INV-47 hunk（patch :34/36）只给两个裸名加了 anchors/ 前缀，全路径未动——pre-patch 平铺全路径全集恰为 11 处（上述 10+INV-47），「11 处」计数必然含 INV-47 这条，故漏刷即计数失实。
- 自相矛盾：同 patch 新增小节 docs/invariants.md:97 写「本册 11 处 `features/reader/<平铺>` 旧径已随迁刷新为域前缀现行径」，:101-103 写「锚定件现行径=anchors/annotation-anchor.ts」——同文件 :62 却仍指旧径。closeout 报告 docs/reports/2026-09-18_f-geom01-campaign-closeout.md:117-118 与实现者报告 g11-impl-report.md:14（U4「完成」）重复了同一失实计数。
- 漏网机制：g11-inv-anchor-check.mjs:31-32 把 INV-47 声明处**硬编码**为 `anchors/annotation-anchor.ts`（实现者心里的目标态），log:16 据此报「PASS INV-47 声明处 anchors/annotation-anchor.ts 存在」——探针验的是意图而非册文，未解析 invariants.md 文本，故册面错字零感知。
- 处置建议：INV-47 行路径补 `anchors/` 前缀（一行）+invariants 属受锁件走 unlock→改→apply；探针改从册文提取声明处路径再验存在性（防同型复发，可留后续票）。

## W（警告）

**W1. 头注扫尾漏一同源残句**：PdfPageCanvas.tsx:18-21 仍存「本件 type 再导出保受锁测试旧路径（ai-annotation-layer.test:25 等——F-GEOM-01-G1 M0 切环）」——与 :36-40 新句「现行受锁测试经 reader/view/ 新径消费本件 9 处」并存，「旧路径」框架残留（G9 迁移已把测试 import 改向 view/ 新径，ai-annotation-layer.test.tsx:25 亲读为 `from '../../../src/renderer/features/reader/view/PdfPageCanvas'`）。事实引用（文件：行号）准确，仅定性词陈旧——票面义务①「全域扫尾」语义下应一并收口，随 B1 回炉顺改即可。

## N（注记）

- **N1. closeout §3 已在 patch 生成后回填**（审计基线 patch :207-209 为占位符；现行文件 :99-105 已是实测段）。回填声明经亲读核实：g11-e2e-allgate.log:92-93「45 passed (2.1m)/G11_E2E_ALLGATE_EXIT=0」、g11-e2e-appgate.log:90-91「43 passed/G11_E2E_APPGATE_EXIT=0」，与回填文字（45/45、43/43、2.1m、在册 flake 本轮未发）逐位对合。提交件将与本审 patch 在 §3 有差异——差异=主控收口回填，已验真。
- **N2. netstat wc 口径接缝**：g11-netstat.mjs:46 现值 walk 只计 .ts/.tsx/.css，而 :138 基线 `git ls-tree` 不过滤扩展名——若 reader 下存在非代码文件，11,815 vs 11,791 非严格同口径。包内无此类文件证据（g10-oneway 根纯容器断言+域结构），标不确定、低危。
- **N3. relay.md/b22-recovery-verify.log 工作树侧零触碰**无法由只读门独立复核（无基线可 diff）；patch 面无此两文件✓、registry:302 F-GEOM-01-G11 仍 `status: 'open'`✓（翻票权在主控，未越权）。无相反证据。
- **N4. 构建恒等的逐字节同链**：g11-build-hash.log:5-7/9-11 三产物名（含内容哈希后缀 D3egZtl2/BfpEygSE/yatZIOMy）+字节尺寸与简报基线同；sha256 三件在档。与 G2~G10 链基线的 sha 逐位比对所需前链哈希档不在包内——同名（内容哈希）+同尺寸已构成强证据，前链直比标不确定。
- **N5. §1.2 逐票 numstat 与预测区间本体**（设计书 §3.5 −20~−80 等）在包外/历史提交侧，不可独立复算；包内算术全闭合（G4~G10 七票 56+7+42+21+22+51+39=238 ✓；Σ+428/−424=+4 ✓；1776+13=1789 ✓；11,791+69=11,860 ✓；146=188−42 ✓）。

## 逐项断言裁决（A~H）

- **A 零行为断言=成立**。patch :1678-1685 全 `//` 注释行；现行 PdfPageCanvas.tsx:36-41 亲读一致，:41 `export type…from '../anchors/geometry-types'` 与 :30-34 import 面零改；构建三产物同名同尺寸（g11-build-hash.log，见 N4）。
- **B INV 刷新=部分成立，因 B1 不成立**。10 处映射目标全部亲读存在；INV-68 十三锚抽核 9 处亲读全中（pdf-item-geometry.ts:366/:506、annotation-resolve.ts:209/:237/:277/:302、AnnotationLayer.tsx:98 bandsNearRects 消费、annotation-band-calibrate.ts:77），另 2 处经 anchored-net log 堆栈旁证（:31 annotation-resolve.ts:210、:49 selection-evaluate.ts:296）；selection-evaluate.ts 全 312 行亲读：:43/:130/:207/:292/:296 锚全中且「stale」零命中（closeout §2 行 5 声明兑现）。路径口径小节语义与 b12 P2-2 销项对合——但 :97 的「11 处已刷新」因 B1 失实。
- **C 记账数字=成立**。探针源码逻辑审过（v2 谓词收窄在头注 :12-13 声明，D 态非域=基点根删除单列计入合计——否则与主控独立复核的 71 files +313/−309 无法自洽）；log:4-11 域分组逐域加总=313/309 ✓、:13 域 wc 加总 1445+829+3121+1259+1173+3988=11,815 ✓；报告 §3/§4 与 log 逐位一致。
- **D 基线同值冻结=成立**。现行 baseline.json:26207-26217=187/1789/5411/skip15/eachRows 261，与 baseline-diff.log:7-8 after.stats 逐位一致；diff 体量自洽（+4 文件=patch 内新增 atomic-write/domain-error/sanitize/app-file-url 恰 4 件；+32 用例=1−1+2+4+8+6+9+3 ✓；+77 断言=3−6+22+13+14+16+10+5 ✓；+7 each 行=sanitize test.each 7 行 ✓）；test-surface:check 绿（impl-verify.log:27-29）；exemptions 现行 2 条 G2 旧条目零扩（reason+rulingLink 在位，stale 提示非红，处置留主控=票面授权外不动作，成立）。
- **E 报告诚实性=成立**。净+4 五项构成与包内 numstat 全自洽；简报②「G3 +33/−18」勘正申报在 impl-report §6.4+closeout §1.4 双处如实落笔（四口径并列：+28/−16、+89/−20、+12587/−23 均不得 +33/−18）。
- **F 红线=成立（patch 面）**。patch 仅 6 文件，无 tests/**/registry.ts/relay.md/b22 log；registry:302 亲读未翻票；src 面唯一 hunk 全注释。
- **G 自裁七条=全部成立，零越权**。①判定收窄=合计自洽必需且披露；②共享 unlock 周期批内即时 apply（manifest 单次重锁 generatedAt 22:01，locks:check 370 绿）；③anchors/page-items.store.ts:1-3 亲读存在，后缀补全=指向现行件最小修正；④勘正=计数纪律模范执行；⑤log 重写披露+终态干净；⑥数据依赖先行，披露在档；⑦豁免零动作=未越票面授权。
- **H 头注 9 处清单=成立（9/9 全核，超 ≥3 要求）**。text-layer.test.tsx:41、pdf-item-geometry.test.tsx:18、anchor-item-verify.test.tsx:33、annotation-layer.test.tsx:21、ai-annotation-layer.test.tsx:25、pages-overlay.test.tsx:30、band-calibration.test.tsx:35、reader-search-text.test.tsx:21 八处均为 `import type … from '../../../src/renderer/features/reader/view/PdfPageCanvas'`；pdf-page-canvas.test.tsx:23 为组件本测 import——全部亲读逐位命中。

## 基线数字核验

verify 全链绿（g11-impl-verify.log：quality :18 / test-surface :27-29 / tickets 206+open10 :38-39 / locks 370 :48 / test 170 文件 1744 用例 :3802-3803 / build+EXIT=0 :3841-3843）；锚定回归网 18 文件/211 用例 EXIT=0（g11-anchored-net.log:268-273）；e2e 双门回填验真（见 N1）。

## 总评

工程质量面（探针/记账/基线/恒等链/自裁纪律）全绿且多处超出抽核要求；但本票=战役收官记账票，其核心交付物正是「账实相符」，INV-47 漏刷一处+"11 处"失实写进受锁册与报告共三处——放过即与本票存在理由相悖。回炉面=一行前缀+一句计数口径（或把口径小节改为「10 处刷新+INV-47 声明处本补丁刷」）+W1 残句顺改+invariants 重锁，零行为面，e2e 双门结果不受影響（构建恒等前提不涉）。
