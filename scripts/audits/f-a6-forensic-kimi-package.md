# F-A6-a 取证票·门一对抗深审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。本包=一份「PDF 划选缺陷取证裁决表」+ 其票面规格 + 关键源码摘录 + 脚本摘要 + 主控对账记录。你拿不到仓库与落盘 JSON,只审本包材料。

## 0. 审查任务（五维,输出 JSON）

1. **证据纪律**：裁决表每条结论是否锚定本包可见的证据（数字/表格）?有无无证据断言、超出证据的过度推断?
2. **推理链**（重点,逐项核）:
   - R1: 真实样本「同净」+ 合成 S1「乙净甲错」→ 推出「R-迁移为主修」——真实库 T1/T9 零触发而 S1 是合成病理页,迁移在真实样本上的收益论证是否成立?还是仅「不劣化+构造性消灭病根族」即足够?
   - R2: 乙轨并块口径从票面指定（mergeLineRects 真函数,口径1）改基线分组（口径2,实现者超票面自裁）——是否构成「为偏好结论换口径」?还是数据（211/151 拆簇+旋转页并 1 块）足以证明口径1 对项盒结构性不适用?
   - R3: rowGroups 80 组 vs 行真值 43（T2/T3 拆簇实证）但 mergeRects 收口到 42≈行数——「现行双层归并把拆簇兜住了」与「修复集仍修 T2/T3」是否矛盾（兜住了还修吗?降为回退路径加固是否自洽）?
   - R4: 用户实报重形态（锯齿+右溢）未在真实抽样页复现——裁决表把修复集证据降级为「机理+合成证据」处理是否如实、后续票面风险是否已声明?
   - R5: G2 阈值 5% 的分界数据=健康真实页 0~0.12% vs 病理合成页 25~62.5%——用合成病理页标定阈值+「仅新增复现证据时启用」声明,是否自洽?
   - R6: tick 基线口径变更（票面「连发 20 次 selectionchange」在恒定选区下无 DOM 变更→改每轮 +1 字符拖选模拟）是否合理申报?
3. **数字自洽**:裁决表内部数字互相咬合否（如 829 span/2734 gCS÷7 tick≈391、42 块分 39 行组其中 3 行双块、A3 的 839−829=10 空串项等）?
4. **完整性**:T1~T9 全裁?数据缺口（RTL/竖排/项内部分选中触发面零）是否如实申报且处置（F-A6-b 单测补）合理?
5. **门审立场**:本裁决表将直接驱动 F-A6-b 实现票面（修复集+路线）。若你判 BLOCKING,指出哪条结论必须撤回或补证。

## 1. 票面规格摘录（设计书 docs/design/2026-09-03_f-a6-selection-root-fix.md §2.2）

**形态分类清单**:T1 页旋转/Rotate≠0（机理证实、触发待探针）;T9 viewBox/CropBox 原点≠0（duckViewport rawDims 硬编码 pageX:0/pageY:0）;T2 行内高差≥2×（可比带拆簇）;T3 y 序交错（末簇比较失联）;T4 pitch 污染（centerLimit 塌缩）;T5 span 盒宽溢出（回退度量宽≠墨宽,夹取源错）;T6 零高/零宽盒残余;T7 多栏 gapThreshold 误断/误连;T8 getTextContent 项数据本身异常。

**五段探针**:①环境段（page.rotate 值[注入面三选一]、textLayer 盒、--scale-factor、每 span {text,gBCR,fontSize,fontFamily,transform}+现行 evaluate 单 tick 时长实测）;②原始 clientRects 段;③中间产物段（mergeLineRects 五步逐段落盘+mergeRects 输出）;④band 匹配配对段（bandsForTextNodes 产带+每 rect 的 matchBand 绑定对+clampedHorizontal 前后值）;⑤A/B 对照段——同一选区双落盘:(甲)现行 DOM 量测管线产物;(乙)项声明几何产物（Util.transform(viewport.transform,item.transform) 合成→位置+item.width/height×scale→项内 grapheme 簇比例细分[UTF-16 码元禁用;dir=RTL 翻转;styles.vertical 轴互换]→归一化）。量化判据:乙净=每视觉行块数恰=行数+右溢 0px+与墨带重叠率≥阈;三结局=①乙净甲错→迁移为主修、聚类加固降为回退;②乙错甲对→维持 R-加固+立案 pdf.js 文本层 scaleX 补偿面核查;③同错→T8 立案。前置探针（C3）:items.length vs span 计数对齐+抽项文本比对。

**路线背景**:R-加固=修聚类判据;R-迁移=矩形来源改为 PdfTextItem 声明几何直取（用户提案——width/height/transform 已在渲染载荷,按构造无测量噪声;取舍:项内部分边界需按字符比例细分;偏移映射仍需 DOM 文本层;按行并块逻辑保留但聚类可信输入）。deepseek 终位 WARN-3:双路线贯通 settle 全量权威,禁快路径走新几何族而 settle 留旧族。Kimi 二轮 C5:迁移路线下 bands 亦由项几何+styles 派生,禁 rect 项源×band DOM 量测混用。

## 2. 关键源码摘录（复刻与结论的源码依据）

### 2.1 TextLayer.tsx duckViewport（T1/T9 机理——源码级证实,取证前的行级复核在案）

```ts
function duckViewport(scale, pageWidth, pageHeight): PageViewport {
  return {
    scale,
    rotation: 0,                    // ← T1:硬编码,而 PdfPageCanvas 用 pdfPage.getViewport({scale}) 默认含 page.rotate
    rawDims: {
      pageWidth: pageWidth / scale,
      pageHeight: pageHeight / scale,
      pageX: 0,                     // ← T9:硬编码,真实 viewport rawDims 来自 page.view(CropBox)
      pageY: 0
    }
  } as unknown as PageViewport
}
```

### 2.2 annotation-anchor.ts mergeLineRects 聚类核心（:258-419 摘录——段D 复刻对象）

判据常量:DEDUP_EPSILON_PX=0.5;HEIGHT_RATIO_MIN=0.5/HEIGHT_RATIO_MAX=2（高度可比带）;Y_OVERLAP_RATIO_MIN=0.25;COLUMN_GAP_H_FACTOR=1.5/COLUMN_GAP_PAGE_RATIO=0.02;INTRA_ROW_GAP_PX=2。源码注释自认:「聚类只与末簇比较——高瘦矩形恰排在同一行两碎片之间（y 序插队）时,后碎片与真行簇『失联』另起簇」「修法应是把比较扩到全部簇,而非放宽可比带/重叠率」。聚类循环:sorted 按 y 升序→每 r 只与 rowGroups[末] 比较（dominantOf 主导;yOverlap≥25% 小高 或 centerLimit 内;高可比带 [0.5,2]）→不满足即新簇。centerLimit=pitch 在场时 min(pitch,dom.h[,lh])/2。段合并 mergeSegment:x 取并集,y/h 取段内主导;紧凑行距钳制:pitch<dom.h≤2×pitch 时 h 钳到 pitch。

```ts
for (const r of sorted) {
  const gi = rowGroups.length - 1
  if (gi >= 0) {
    const dom = dominantOf(rowGroups[gi]!)
    const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
    const yOverlap = overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
    const centerLimit = pitch !== undefined ? Math.min(pitch, dom.h, ...(lh !== null ? [lh] : [])) : lh
    const centerOk = Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (centerLimit ?? 0) / 2
    const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
    if ((centerLimit !== null ? centerOk : yOverlap) && hComparable) { /* 入末簇 */ continue }
  }
  rowGroups.push([r])  // 新簇
}
```

### 2.3 pdf.js TextLayer #appendText（乙轨公式参照,node_modules/pdfjs-dist/build/pdf.mjs:11060-11133）——span 定位用 item.transform×viewport.transform 合成+width×scale;乙轨差异=ascent 取 styles 声明值而非 canvas 量测值（实现者申报口径）。

## 3. 脚本摘要（三件,全文在仓库可复核）

- **f-a6-diag.mjs**（429 行,主编排）:A1 全库扫描（pdfjs legacy 直读 rotate/view/items——standardFontDataUrl/cMapUrl 配齐）→Electron 单次 launch 批量 5 文献（seed 配方照抄 e2e 先例;SYNAPSE_USER_DATA 临时目录）→A2/A3 深查→B tick→C 原始→Node 复算阶段（esbuild bundle 四件[anchor/resolve/style/merge]import 真函数;bundle 落 out/ 免受锁面收录）→D 五步双轨→E 配对→F 甲乙对照→落盘 44 文件。双轨守卫:mergeLineRectsReplica 终输出与真函数 mergeLineRects 对同输入逐位 JSON 全等（guardReplicaEqualsReal 必须为 true,否则修到过）。
- **f-a6-diag-lib.mjs**（438 行）:复刻函数（行号锚定 annotation-anchor.ts:258-419/annotation-resolve.ts:77-98,182-190）/乙轨 itemPixelRects（Util.transform 合成+grapheme 细分[Intl.Segmenter granularity:'grapheme']+RTL 翻转+vertical 轴互换+任意角四角包围盒）/baselineGroupBlocks（基线分组并块——超票面口径2）/overlapMetric（同行配对=|Δcy|≤(ha+hb)/2+2px 且 x 相交>0;覆盖率/IoU_x/shift 中位）/合成 PDF 工厂（S1 /Rotate 90、S2 CropBox[36 36 540 720]+MediaBox[0 0 612 792]、S3 基线——手写对象流配方）。
- **f-a6-diag-page.mjs**（339 行,页内 evaluate 采集器）:A2 深查/A3 计数/B tick（MutationObserver+猴子补丁计数,测后还原）/C 原始+paint/E band——页内 Promise 9s 兜底。

## 4. 裁决表全文（scripts/audits/f-a6-forensic-verdict.md——实现者初稿）

<!-- 主控注:以下为原文全文照录 -->

（见随附裁决表正文——本包 §4 即该文件全文,从「# F-A6-a 取证裁决表」起至 §9 末）

## 5. 主控对账记录（验收面）

主控已独立抽查落盘 JSON 与裁决表数字:五样本 blockCountA_paint/B_mLR/B2（42/211/42、10/151/10、1/1/3、3/3/3、3/3/3）✓;overlap IoU 0.9996/0.9999/0.8213/0.9998 与 shift dx −36.02/0.02/0/0.03 ✓;tickDelta 0/22.4/172.3 与 gap 中位 200.2、布局读 gBCR=709/gCS=2734 ✓;dsteps 五步长度 475/475/80/80/86+mathNormalized 42、guard=true、pitch=9.66 ✓。locks 272 一致（bundle 落点由 scripts/audits/f-a6-diag-out/ 迁 out/f-a6-bundles/——主控修正,防数据目录 .mjs 入受锁面而 CI 红）。

## 6. 裁决表正文

【以下为裁决表 §1~§9 全文原样嵌入】

# F-A6-a 取证裁决表（实现者初稿，待门审）

产物根：`scripts/audits/f-a6-diag-out/`（JSON/截图/合成 PDF/bundle，不入 git）。
取证器：`scripts/audits/f-a6-diag.mjs`（+`f-a6-diag-lib.mjs`/`f-a6-diag-page.mjs`，已 locks 注册）。
运行口径：node 24.20.0（volta 项目锁）；Electron 单次 launch 批量 5 文献；页内 Promise 9s 兜底。
本表一切数字均引自落盘 JSON（文件名随条目标注），禁凭印象——可复算命令：`node scripts/audits/f-a6-diag.mjs`。

## 1 环境与样本（a1-scan.json + 各 `<tag>-node.json`）

**全库扫描**（纯 Node 直读 pdfjs legacy，与 renderer 同一 pdf.js 4.10.38）：

| 目录 | 存在 | PDF 数 |
|---|---|---|
| `%APPDATA%\Synapse Remake\user-data\files` | 不存在 | 0 |
| `%APPDATA%\com.synapse.app`（真实 userData 实测位，papers/ UUID 布局） | 在 | 2 |
| `local-state-backup/.import-20260827-2035/user-data/files` | 在 | 2 |

4 个文件=2 份唯一内容（com.synapse.app 两份与备份库两份页级 items 逐页相同）。

**异常页清单（T1/T9 触发面）：0**——全部 46 页（8+8+8+38 去重后 8+38）`rotate=0`、`view[0]=0 && view[1]=0`。**真实库 T1/T9 零触发**。

**代表页选取**：

| tag | 页 | 理由 | rotate | view | items |
|---|---|---|---|---|---|
| real3882 | 7 | 前 8 页内 items 最大（839，全档最大）——密集学术文本页 | 0 | [0,0,612,792] | 839 |
| real1c2d | 4 | 前 8 页内 items 最大（502；全档最大 p35=1107 因 38 页深位懒渲染排队 40s 超时弃用——§9） | 0 | [0,0,425.52,647.28] | 502 |
| s1rot | 1 | 合成 /Rotate 90（T1 闭合） | 90 | [0,0,612,792] | 8 |
| s2crop | 1 | 合成 /CropBox [36 36 540 720]+MediaBox [0 0 612 792]（T9 闭合） | 0 | [36,36,540,720] | 8 |
| s3base | 1 | 同配方不加病理声明（阴性对照） | 0 | [0,0,612,792] | 8 |

1c2d 特性：38 页扫描拼合、逐页 view 尺寸不同、4 页纯图（p2/p10/p34/p38 items=0）。

## 2 T1~T9 逐项裁定

| 项 | 裁定 | 证据 | 关键数字 |
|---|---|---|---|
| T1 页旋转 | **机理证实+真实库零触发+合成触发证实** | a1-scan.json（0 异常页）；s1rot-cap.json A2 | outside=5/8 span 落 textLayer 盒外；甲 paint=1 块 vs 行真值 3（整片并簇错乱）；overlap 配对 0/0（旋转形态块与配对器 y 语义不符，§9） |
| T9 CropBox 原点≠0 | **机理证实+真实库零触发+合成触发证实（平移量化闭合）** | s2crop-fb.json overlapPaintVsB2 | 甲整体偏移 dx=−36.02px=CropBox X 偏移 36×scale(1)；outside=2/8；块数口径不敏感（甲 3 块=行数但位置错 36px） |
| T2 行内高差拆簇 | **触发（中间产物层）** | real3882-dsteps.json | rowGroups=80 vs 行真值 43（strict）/42（loose）——拆簇 +86%；收口依赖 mergeRects 归一层（86→42） |
| T3 y 序交错失联 | **触发（与 T2 同数据面）** | real3882-dsteps.json step3_rowGroups | sizes 序列大量 2/1 小簇与大簇交错（10,26,7,…,2,2,…,13,23,…）——「只与末簇比较」拆簇形态在案 |
| T4 pitch 污染塌缩 | **未触发（本轮样本）** | real3882-dsteps.json | pitch=9.66 vs lineH=8.48（比值 1.14）；centerLimit=min(pitch,domH,lh) 由 lineH 主导，未塌缩 |
| T5 span 盒宽≠墨宽（夹取源错） | **部分证实（夹取行为在案、方向正确性未证——无墨带参照）** | real3882-epairs.json | clampedHorizontal 改写 24/42 块（样本：left 53.8→67.4、width 39.1→25.6） |
| T6 零高/零宽盒残余 | **未触发病形态** | real3882-dsteps.json | rawRects 539→unique 475（64 重复滤除）；最终 42 块全宽 ≥1px |
| T7 多栏误断/误连 | **轻微触发（存疑，低优先）** | real3882-dsteps.json | 步骤④ x 断段 80→86（+6 处）；mergeRects 收口后无残留 |
| T8 项数据本身异常 | **未触发** | real3882/real1c2d-fb.json | items/styles 全可解析；乙几何与甲 IoU_x 0.9996/0.9999 |
| markedContent/endOfContent | **证伪闭合（运行时）** | 各 `<tag>-cap.json` a3 | items−spans=空串项数（3882:839−829=10；1c2d:502−501=1）；剔空串后逐项文本全等（firstMismatch=−1）——一项一 span（非空项）成立，无 markedContent 嵌套征 |

## 3 D1 病灶链定位（段C/D/E 逐段二分，real3882 主样本）

- **段C（原始 clientRects）**：539 块（含 64 同形重复）——**Range 量测噪声在源头即存在**（craw.json rawRects）。
- **段D（mergeLineRects 五步，双轨守卫全等见 §8）**：**首个偏离「每视觉行一块」的步骤=② rowGroups**（475 unique→80 组 vs 行真值 43——T2/T3 拆簇）；步骤④ x 断段再 +6（T7 存疑）；步骤⑤ 输出 86；随后 mergeRects（归一域全簇比较）收口到 42≈行数 42（loose）——**现行双层归并把拆簇兜住了**。paint 落地 42 块分属 39 个 y 行组、其中 3 行各 2 块（bprA maxPerRow=2）=「锯齿」的温和形态（拆簇噪声残余）。
- **段E（band 匹配配对）**：健康域 gate 全过（3882 42/42、1c2d 10/10、s3base 3/3、s2crop 3/3——gateDelta 0.0042~0.0001 < limit 0.0122）；clamped 改写 24/42（夹取活跃）。**b 链在真实样本正常**。
- **合成病理页**：S1/S2 复现「整片错位」形态（outside 5/2、S1 paint 并 1 块、S2 平移 36px）。
- **总结论**：真实库代表页上 D1 为轻形态（3/39 行双块+1 个盒外 span）；**用户实报的重形态（锯齿+右溢）未在抽样页复现**——触发条件推断为更极端字号混排/公式区/双栏或 T1/T9 类异常页（本库当前无）。修复集按机理+合成证据裁定（§5）。

## 4 A/B 对照与路线裁定（核心交付）

**双口径声明**：票面指定乙轨并块=mergeLineRects 真函数（口径1）；实测发现 **mLR 的 y 聚类对项级盒结构性不适用**——项盒 y 微差（各字号 ascent 不同）触发拆簇（real3882 211 块、real1c2d 151 块 vs 行真值 43/10）——故补**口径2=基线分组并块**（设计书 §5.1 pdf-item-geometry「行级并块（基线分组）」的正式形态，s1rot 实证 mLR 把旋转三行并 1 块的 y 盲区免疫）。超票面决定，显式申报（§9-1）。

| 样本 | 行真值 s/l | 甲 paint | 乙 mLR | 乙基线分组 | 右溢 甲/乙2 | IoU_x | shift dx/dy | 三结局（口径2） |
|---|---|---|---|---|---|---|---|---|
| real3882 | 43/42 | 42 | 211 | 42 | 0/0 | 0.9996 | 0.02/1.79 px | **同净** |
| real1c2d | 10/10 | 10 | 151 | 10 | 0/0 | 0.9999 | 0/0.31 px | **同净** |
| s1rot | 3/3 | 1 | 1 | **3** | 0/0 | —（配对器 y 盲区） | — | **乙净甲错→迁移为主修** |
| s2crop | 3/3 | 3 | 3 | 3 | 0/0 | 0.8213 | **−36.02**/7.9 px | 同净+甲位置错 36px（T9） |
| s3base | 3/3 | 3 | 3 | 3 | 0/0 | 0.9998 | 0.03/−0.06 px | 同净 |

**量化判据定义（可复算，f-a6-diag-lib.mjs overlapMetric/pairBlocks）**：同行配对=a 在 B 中找 y 中心最近块，|Δcy|≤(ha+hb)/2+2px 且 x 相交>0；覆盖率=配对数/块数；IoU_x=配对块 x 区间交/并；shift=配对块中心差中位数（盒相对 px）。行数真值=被选 items 基线点在行分隔轴（angle 感知 v 轴投影）的聚类唯一值数（strict 2px / loose max(2,0.5×主导字号)）。

**三结局汇总**：真实样本=同净（甲乙等价、迁移无损）；病理样本=乙净甲错（S1）+甲位置错（S2）。

**路线裁定建议：R-迁移为主修（项声明几何+基线分组并块），R-加固降为回退**。依据：
1. 健康页无损：IoU_x 0.9996/0.9999、shift <2px——迁移不劣化现有正确页；
2. 病理页净收益：S1 乙 3 块=行真值 vs 甲 1 块；S2 乙位置对（viewport.transform 天然含 CropBox 旋转/平移）vs 甲平移 36px；
3. **口径1 数据反证加固路线的局限**：mLR 系为 DOM 量测噪声设计，项盒直喂会拆簇——迁移不是"换个输入"而是"换并块语义"（基线分组），设计书 §5.1 的行级并块条款被数据证明是必要设计而非可选；
4. **T1/T9 的 TextLayer duckViewport 修复（rotation 通道+rawDims 真值化）是两路线共同前置**——迁移只修矩形半边，划选手势映射/偏移映射仍需 DOM 文本层对齐（设计书 §5.1 明示，本数据 S1/S2 的 outside 5/2 即错位实证）。

**grapheme 细分/RTL/竖排处理证据（C2）**：代码在位（`Intl.Segmenter('zh',{granularity:'grapheme'})` 计数+比例细分+RTL 方向翻转+vertical 轴互换+任意角四角包围盒）；**本仓样本触发面为零**（perItemStats：partial=0、rtl=0、vertical=0 全样本）——细分逻辑无运行时验证数据，**数据缺口申报**（§9-4），F-A6-b 实现时须以单测夹具补验证。

## 5 修复集裁定建议（F-A6-b 票面输入）

| 项 | 修/不修 | 方向 |
|---|---|---|
| T1（rotation 通道） | **修** | TextLayer.tsx duckViewport rotation 通道（真实库零触发但合成实证+用户裁决②「旋转页修复纳入」；deepseek NIT-2 的降级条款在此不满足——触发形态已由 S1 闭合） |
| T9（rawDims 真值化） | **修** | duckViewport 改收真实 page.view/pageX/pageY（S2 实证 36px 平移；与 T1 相互独立，rotation=0 也致病——维持 WARN-2 权属） |
| T2/T3（聚类判据） | **修（回退路径）** | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）——3882 的 80 组拆簇直接对症；迁移路线下此函数降为 DOM 量测回退路径的加固 |
| T4（pitch 滤噪） | 不修（本轮未触发塌缩） | 观察——若 F-A6-c 后续复现再立案 |
| T5 | 随迁移消灭 | 项几何 width=PDF 声明宽（构造无回退字体度量误差） |
| T7 | 不修（6 处断段存疑且收口后无残留） | 观察 |
| 主链 | **迁移** | pdf-item-geometry.ts（项几何+grapheme 细分+**基线分组并块**+bands 同源派生 C5）+PdfPageCanvas/装配链 viewport/styles 下钻通道（C1 承重断点） |
| D2 | F-A6-c | 见 §7 基线（5Hz 步进 200ms 实测+每 tick 布局读量级） |

## 6 G2 阈值交付（检测器口径随路线=R-迁移）

- **检测器口径**：「被选 items 合成项盒（或渲染块）相对 textLayer 盒的偏离率」——`outsideCount/spanCount`（A2 形态）+块右溢 px。
- **阈值建议**：偏离率 ≥5% 或任一块右溢 >2px。数据分界：健康页 0~0.12%（3882: 1/829、1c2d: 0/501、s3base: 0/8）vs 病理页 25%~62.5%（s2crop: 2/8、s1rot: 5/8）——**健康/病理间隔 ≥200 倍，5% 阈值有 >4 倍安全边距**。
- **WARN-5 声明**：本轮真实库无异常页（T1/T9 零触发）且 S1/S2 形态在 T1/T9 修复后即消失——**G2 建议实现检测器+阈值但标注「仅新增复现证据时启用」**（防「检测器先写但永远无阈值」空置，也防无实益拒绝）。

## 7 tick 基线（段B，F-A6-c 前后对比用同一口径）

口径：程序化划选→settle 700ms→模拟拖选 20 轮（每轮选区末端 +1 字符+dispatch selectionchange，间隔 50ms）→MutationObserver（childList+subtree+attributes:style）记 selection-rects 变更时刻；tick 端到端=mutation 时刻−距其最近一次 dispatch 时刻。布局读=猴子补丁计数（gBCR/getClientRects/Range.gBCR/getComputedStyle，测后还原）。

| 样本（span/字符） | mutations | delta min/med/max (ms) | mutation 间隔中位 (ms) | gBCR | getClientRects | Range.gBCR | getComputedStyle |
|---|---|---|---|---|---|---|---|
| real3882（829/8651） | 7 | 0/22.4/172.3 | **200.2** | 709 | 16 | 8 | 2734 |
| real1c2d（501/1868） | 7 | 1.6/31.4/161.5 | **202.1** | 462 | 16 | 8 | 1747 |
| s3base（8/272） | 7 | 0/20.2/207.3 | 200.2 | 42 | 16 | 8 | 64 |
| s1rot（8/272） | **0** | — | — | 42 | 16 | 8 | 64 |

- **D2a 5Hz 步进实证**：全部有变更样本的 mutation 间隔 199.8~207.3ms≈节流窗 200ms——拖选期视觉恰 5Hz 的直接实测。
- 每 tick 摊销布局读（3882）：gBCR ≈101/tick、getComputedStyle ≈391/tick。
- s1rot mutations=0：旋转错位页上拖选未触发可见层变更（evaluate 有跑、几何未变——counts 有数；非 D2 重点样本，申报）。
- delta 的 min（0~3.3ms）=排队最少时的 dispatch→DOM 变更全链（含 React commit）；max（161~207ms）=trailing 窗尾等待——节流排队主导分布。

## 8 复刻校验声明（段D/E 双轨）

- **mergeLineRects 五步复刻**：5/5 样本 `guardReplicaEqualsReal=true`（复刻链终输出与真函数 mergeLineRects 对同输入逐位 JSON 全等——`<tag>-dsteps.json`）。
- **bandFromMetrics 双轨**（evaluate 复刻 vs bundle 真函数，3 样本/页）：5/5 全 `same`。**守卫有效性自证**：首轮运行在 s1rot 抓到复刻偏差（源码 center 用未 clamp 原始值，复刻误 clamp——annotation-resolve.ts:93-97），修正后全绿——双轨守卫不是形式主义。
- **matchBand/clampedHorizontal/mergeRects**：无复刻——直接消费 esbuild bundle 真函数导出面（anchor/resolve/style/merge 四 bundle 落盘）。
- **bandsForTextNodes 的 DOM 面**（spanBandOf/metricsOf/fontSizeOf/mergeNear）：evaluate 内复刻（无法在 Node 跑真函数——DOM 依赖）；守卫=bandFromMetrics 双轨样本+mergeNear 复刻逐语句对照源码 :182-190——**全链守卫在 Node 不可闭合，部分申报**。

## 9 实现者自裁申报（超票面决定/数据缺口/已知限制）

1. **乙轨并块补第二口径（基线分组）**：票面 §段F 指定 mergeLineRects 聚类；实测其对项级盒输入结构性拆簇（211/151 块 vs 行真值 43/10）且旋转页并 1 块——按「不许静默改口径」申报：口径1 数据保留落盘，主判据改口径2（设计书 §5.1 既有条款的实证化）。
2. **B 段探针改拖选模拟**：票面原文「连发 20 次 selectionchange」在恒定选区下 React diff 无 DOM 变更（首轮 mutations=0 实证）——改为每轮选区 +1 字符再 dispatch（更贴 D2 真实形态），口径变更申报。
3. **A3 比对剔空串项**：空串项不入 DOM（pdf.js #appendText hasText 门，pdf.mjs:11126）——不剔则从首个空串项起全序列错位假失配（首轮 mismatch=49/493 假象，剔后全 -1）。
4. **数据缺口**：RTL/竖排/项内部分选中（grapheme 细分）触发面全零——代码在位无运行时验证（F-A6-b 须单测补）；s1rot 的 overlap 配对器 y 盲区（旋转块配对 0/0——该样本以块数/行真值/右溢判定）；blocksPerRowB2（乙2 块的 y 行分组）与行块 y 并集语义不符，不作判据（数据保留）。
5. **已知限制**：3882 首轮双击打开偶发丢失（getByText 命中详情面板+重试 .lib-card 定位兜底，5 轮中 2 轮触发重试后成功）；1c2d 代表页弃全档最大 p35（深页懒渲染排队 >40s）取前 8 页内最大 p4；tick 的 evaluate 纯 CPU 时长未直接测（delta 含节流排队——min 值为全链最快参照 0.4~3.3ms）；甲轨「现行管线产物」=程序化选区路径（setStart/setEnd 边界=文本节点边界），真实鼠标拖选的边界容器差额形态未覆盖（设计书 §6 已知边界①同族）。
6. **产物纪律**：f-a6-diag-out/ 不入 git；脚本三件本轮多次修改，收工前已 locks:generate+apply 同步 manifest（272→276 条含本三件）。
