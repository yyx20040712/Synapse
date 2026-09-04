# F-A8 门 1 取证票 ·门二终审材料包（deepseek v4flash,零仓库接触）

你是终审官。审 F-A8 门 1 取证票（决策门记录——判据 a 不过→回设计,门 1b 前置修立票）终位。已过门一 Kimi K3 PWW（4W2N）+主控修正（W2/W3/W4/N1 直改落表;W1 归门 1b 探针升级项写入终裁节;N2 纪律行归交接书）。

## 终位三问

①门一处置闭合度（W2 上限表述修正/W4 去预断/W1 转复跑项/W3 阈值出处/N1 措辞——对照下述裁决表内嵌修正标记）。
②决策门终位（门 1 不过→回设计+三动作[ascent 修/口径分层/S6 保留+盲区]——与证据匹配;门 1b 立项边界清晰;取证票自身可收口[探针三件 locks 281+裁决表+数据不入 git 惯例]）。
③机器面（verify 155/1345/exit=0 与票面预期吻合;locks 278+3=281;src/ 零改申报——本票纯取证面）。

## 实现者报告头（报告全文在档）

# F-A8 门 1 取证对照票——实现者报告

> 实现者=GLM5.3flash 子代理（环境统一档欠账披露——派发未显式定档，按主控同源档执行）。
> 票面=scripts/audits/f-a8-gate1-impl-brief.md；裁决表=同目录 f-a8-gate1-forensic-verdict.md
> （三判据数字+根因链+主控终裁栏留空）。本报告=⑤ 报告契约面。

## 1 取证设计摘要

- **双链同页双跑**：同锚点（页内确定性锚点族：页首/页尾/跨行/单行×2，每页 5 条共 35 条）
  上跑 A=DOM 链（真 locateQuote 核+真 mergeLineRects+真 mergeRects+真 bandFromMetrics——
  esbuild bundle Node 侧消费）与 B=项几何链（真 resolveAnnotationRectsItem 整函数；entry
  =Node pdfjs 声明数据+页内 canvas CSS 盒等价组装——handlePageRender 写者契约同形）。
  CSP（script-src 'self'+file:// 源）排除页内注入 → 真函数全走 Node 侧（f-a6 先例架构）。
- **页集**：健康=real3882 p2/p7+real1c2d p4/p9；病理=s1rot/s2crop（f-a6 同款合成）+
  real1c2d p6（库内最稀疏扫描页——Node 侧全 38 页实测无声明几何病理页，选取口径申报）。
- **产物对比**：IoU1D（f-a6 IoU_x 同族=判据主数字）+IoU2D（补充）+块数+band top/bottom
  逐对差；真值=f-a6-diag-lib.baselineRowTruth+真 rectsForOffsetRange/baselineGroupBlocks
  （右溢/outside/零高块口径对齐 f-a6 C4）；G2=真 selectionHealth 三形态（item/dom/span）。
- **纪律执行**：src/tests 零改（git 面核§5）；Electron 单 launch 批量+9s 兜底（采集器
  重页 20s 申报）+失败必关 app+零猴子补丁（无布局读计数面）；探针三件诞生即
  locks:generate+apply（含四轮修改重锁实录）。

## 2 数据文件清单

`scripts/audits/f-a8-gate1-out/`（不入 git）：`<tag>-p<n>-page.json` ×7（页内采集：锚点
族/rawRects/被选 span 明细/domText/页级 span 盒）、`<tag>-p<n>-dual.json` ×7（双链产物+
对比+真值+G2——判据数字全部源此）、`verdict-summary.json`、`s1rot.pdf`/`s2crop.pdf`。
证据 raw：`f-a8-gate1-run.raw.txt`（exit=0）、`f-a8-gate1-verify.raw.txt`（155/1345/
exit=0）、`f-a8-gate1-locksgen{,2,3,4}.raw.txt`+`locksapply{,2,3,4}.raw.txt`（终态 281=
278+3）、`f-a8-gate1-unlock{,2,3,4}.raw.txt`。

## 3 三判据数字（详表见裁决表 §3-§7）

| 判据 | 结果 | 关键数字 |
|---|---|---|
| a 健康页双链 IoU≥0.99 | **不过** | 占比 6/20（30%）/最差 0.6232；分层：1c2d 多行锚 6/6 过（0.9919~0.9998）、3882 多行锚 0/6（0.6232~0.7617）、项内边界单行锚 0/8（0.8816~0.9745） |
| b 病理页项链贴合真值+DOM 失真可示 | **部分成立** | s1rot 双向成立（项链 5/5 贴真值+DOM 2/5 失真：零高伪迹块+右溢 3.2px）；s2crop 项链 5/5 贴合+top 越界=真值一致（内容真越裁剪缘）但 DOM 无失真（T9 已修）；p6 无分叉 |
| c CR2 G2 分离度 | **弱式可复现** | 健康 0/20 误伤（span 口径 max 2.44%<5%）；病理 2/15 触发（s2crop-top 50~100% 三形态、s1rot-top 右溢 3.2px dom/span）；量级不复现 f-a6 25~62.5%（pre-T1/T9 形态）——间隔 20~41x；**3882 ascent-0 膨胀类 G2 盲区** |

**新发现（本轮取证核心增量）**：real3882 健康 pages 存在 styles 声明 `ascent:0` 字体
（p2 27.8%/p7 27.2% 项）——pdf-item-geometry.ts:217 直消费有限值 0 → 项盒顶=基线 →
基线分组行并集膨胀（16px vs 真值 9.5px 实测分解在档）；DOM 链免疫（pdf.js TextLayer
#getAscent 三级兜底 pdf.mjs:11226-11266/10894，消费点 :11079）。可修域=ascent≤0 →0.8
兜底（回门 0 级补丁）。次要：grapheme 比例细分对项内边界锚的近似上限（0.88~0.97）
=路线固有语义，0.99 门对该形态结构性不可达（判据口径需设计书分层）。

实现者建议（非裁决）：门 1 整体不过→回设计（①ascent 兜底补丁+复跑本取证器②判据 a
锚形态分层口径③S6 去留两案证据裁决）。

## 4 locks 实录

新受锁件三：`f-a8-gate1-diag.mjs`（

## 裁决表全文（含主控终裁节+门一审修正内嵌标记）

# F-A8 门 1 取证裁决表（主控已终裁——门 1 不过→回设计，门 1b 前置修立票）

产物根：`scripts/audits/f-a8-gate1-out/`（JSON/合成 PDF——不入 git）。
取证器：`scripts/audits/f-a8-gate1-diag.mjs`（+`-lib.mjs`/`-page.mjs`，已 locks 注册 281 条=278+3）。
运行口径：node 24.20.0（volta 项目锁）；Electron 单 launch 批量 4 文献 7 页；页内 Promise
9s 兜底（页内采集器重页 20s——f-a6 B 段 25s 先例同型申报）；运行证据=
`f-a8-gate1-run.raw.txt`（尾部 `exit=0`）。本表一切数字引自落盘 JSON（文件名随条目标注），
可复算命令：`node scripts/audits/f-a8-gate1-diag.mjs`。

## 1 页集与锚点族（票面 §③-2）

| tag-页 | 集 | view / rotate | items/spans/chars | 页级 span 盒外 | 选取理由 |
|---|---|---|---|---|---|
| real3882-p2 | 健康 | [0,0,612,792] / 0 | 522/501/6044 | 1/501（0.2%） | 真实学术文献（f-a6 样本）代表页之一 |
| real3882-p7 | 健康 | [0,0,612,792] / 0 | 839/829/8651 | 1/829（0.12%） | f-a6 全档 items 最大页（同款 1/829 复现） |
| real1c2d-p4 | 健康 | [0,0,425.52,647.28] / 0 | 502/501/1868 | 0/501 | f-a6 代表页（分数 view 页） |
| real1c2d-p9 | 健康 | [0,0,418.32,641.28] / 0 | 612/612/2121 | 0/612 | 扫描拼合文档密集文本页 |
| real1c2d-p6 | 病理 | [0,0,421.68,645.6] / 0 | 10/9/46 | 0/9 | 库内最稀疏扫描页（中位字高 6px——扫描拼合极端形态；Node 侧全 38 页扫描实测选取：全部 rotate=0、view 原点=0、项盒零越 view 盒——无声明几何病理页，取最稀疏形态） |
| s1rot-p1 | 病理 | [0,0,612,792] / 90 | 8/8/272 | 0/8 | f-a6 同款合成 /Rotate 90 |
| s2crop-p1 | 病理 | [36,36,540,720] / 0 | 8/8/272 | 1/8 | f-a6 同款合成 /CropBox（ROW1 基线 y=720=裁剪盒顶缘——§5 真阳性形态） |

锚点族：每页 5 条确定性形态（页首/页尾/跨行/单行×2——`f-a8-gate1-page.mjs` specs
公式）；单行锚点=单节点内部偏移窗（节点≥6 字符、剔纯空白引文）。合计 35 条，落链
35/35（skipped=0）；**reconcile（剔空串 items 拼接===DOM 全文）7/7 页全真**；**重定位
35/35 条全零（atA=atB=start——构造位即真位，verifyQuote 原位校验通过）**。

## 2 双链形态与守卫声明

- **链 B（项几何）=真整函数**：esbuild bundle（out/f-a8-bundles/ar-bundle.mjs）导出
  `resolveAnnotationRectsItem` 原函数；entry=Node pdfjs 声明数据（items/styles/lang/
  rotate/view——PdfPageCanvas onPageRender 载荷同形）+页内 canvas CSS 盒
  `{w:Math.round(gBCR.w),h:Math.round(gBCR.h)}`（PagesOverlay handlePageRender 写者
  契约同形——等价组装，票面允许口径）。
- **链 A（DOM）=真函数组合**：真 locateQuote 核（verifyQuoteItem 单项数组喂 DOM 全文
  ——与 verifyQuote 同核单源，CR4 oracle 单测锁定等价）→真 mergeLineRects（aa-bundle）
  →归一化→真 mergeRects（am-bundle）；bands=真 bandFromMetrics（ar-bundle）+mergeNear
  复刻（9 行，f-a6 §8 语句级对照先例）。页内采集面（collectSpans/probe/offsetToPoint/
  clientRects 收集）=行号锚定复刻（f-a8-gate1-page.mjs 头注）。**CSP 限制申报**：
  renderer `script-src 'self'`（out/renderer/index.html meta）+file:// 源——页内注入
  bundle 不可行，故真函数全部 Node 侧消费（f-a6 架构先例）。
- **G2/真值=真函数**：pg-bundle 的 rectsForOffsetRange/baselineGroupBlocks/selectionHealth；
  真值行数=f-a6-diag-lib.baselineRowTruth（viewport.transform 经真 viewportTransformFor
  构造同形传入）。
- **mLR 复刻守卫**：3882 p2/p7 `guard=false`——**复刻陈旧非产品缺陷**：f-a6-diag-lib 的
  mergeLineRectsReplica 复刻的是 pre-T3 语义（聚类只与末簇比较），现行真函数已扩全簇
  就近并入（annotation-anchor.ts:260-264 T3 修复注记）→ 该两页逐位对照必然失配。链 A
  全程消费真函数（复刻仅对照非承重），其余 5 页 guard=true。
- **双 IoU 口径**：IoU1D=x 轴区间交/并（f-a6 overlapMetric.iouX 同族——判据 a 主数字，
  y 门配对）；IoU2D=贪心最大交面积聚合（补充口径）。**IoU2D 被系统性行盒-字形盒顶差
  压制**（§3-dy），非链失真主证据——口径发明申报（票面「逐块 IoU」未定维数）。

## 3 判据 a：健康页双链 IoU≥0.99（占比+最差值）

| 分层 | n | IoU1D ≥0.99 占比 | 区间 | 证据 |
|---|---|---|---|---|
| 健康集全量 | 20 | **6/20（30%）** | 最差 **0.6232**（3882-p2-multi），中位 0.9074 | 各 `<tag>-p<n>-dual.json` cmp.io1d |
| ─ 节点对齐多行锚（页首/页尾/跨行）@1c2d-p4/p9 | 6 | **6/6（100%）** | 0.9919~0.9998 | 同上 |
| ─ 节点对齐多行锚@3882-p2/p7 | 6 | **0/6** | 0.6232~0.7617 | 同上+§4 根因 |
| ─ 项内部分选中单行锚（全页集） | 8 | **0/8** | 0.8816~0.9745 | 同上+§4-2 |

- dy（配对块 y 中心差中位，px）：p2=1.82 / p7=0.32 / p4=1.10 / p9=2.56——分解=Range
  行盒顶高于 span 盒顶 ~2.3px+声明 ascent（0.699~0.718）低于 pdf.js 量测值 ~1px
  （f-a6 §2 T9「ascent 口径差 −1.40px@fontH18」同族）。该系统顶差把 IoU2D 压到
  0.17~0.75（同 pitch 同 dx——`real3882-p2-dual.json` a0 逐块 dx=−0.0002/dy=0.004）。
- band 逐对差（counts 相等锚点索引对，归一化域）：1c2d-p4 med/max dTop=0.0010/0.0012、
  dBottom=0.0009/0.0026（≈0.6/1.7px）；p9 0.0009/0.0041；p6 0.0003/0.0012；s2crop
  0.0023（≈1.6px）；3882 中位 0.0055/0.0190 但 max 0.7745=行结构分叉索引错对污染
  （根因§4，申报不作判据）；s1rot N/A（旋转形态 band 语义错位，f-a6 §9-4 盲区同族）。
- **判据 a 裁定：不过**（按票面「占比与最差值都报」口径：30%/0.6232 双失守；子面
  1c2d 干净字体页 100% 过）。

## 4 根因链（判据 a 失守的归因，证据锚定）

1. **ascent=0 声明字体直消费（项链侧，可修域）**：real3882 两页存在 styles 声明
   `ascent:0,descent:0` 的字体（p2：g_d0_f3/f4/f7=145/522 项 27.8%；p7：g_d0_f3=
   228/839 项 27.2%——`getTextContent().styles` 直读在档）。pdf-item-geometry.ts:217
   `Number.isFinite(style.ascent) ? style.ascent : 0.8`——0 为有限值被直消费→该类项
   盒顶=基线（低于正常项 ~0.7×fontH）→基线分组行并集膨胀（实测同行盒顶 126.9 vs
   133.6 双形，行块 16px vs 真值 9.5px——`rectsForOffsetRange` boxes 直读+DOM span
   实测 11.2px 均匀步距对照在案）。**DOM 链免疫**：pdf.js TextLayer 定位不用声明
   ascent——#getAscent 三级兜底（canvas 量测 fontBoundingBox→墨带扫描→
   DEFAULT_FONT_ASCENT=0.8，pdf.mjs:11226-11266/10894；消费点 pdf.mjs:11079）。修复
   方向=ascent≤0 →0.8 兜底（单点修域，非本票面——取证票零改申报）。
2. **grapheme 比例细分边界近似（路线固有语义）**：项内部分选中（单行锚）的边界按
   grapheme 比例细分（pdf-item-geometry.ts:226-237——无逐字形 advance 的构造性近似），
   比例切点 vs 实际字形推进差数字符宽→IoU1D 上限 ~0.88-0.97（8/8 锚 <0.99）。**0.99
   门对该锚形态结构性不可达**——判据口径需设计书裁决（整行边界可达 0.99+，项内边界
   近似上限在档）。
3. dy 系统顶差（§3）：两投影域的行盒/字形盒基准差——量级 0.3~2.6px，不构成块结构
   失真（pitch/dx 逐位一致）。

## 5 判据 b：病理页项链贴合真值+DOM 链失真可示

| 页 | 项链贴合真值 | DOM 链失真可示 | 裁定 |
|---|---|---|---|
| s1rot-p1 | **5/5 锚**（块数=行真值 1/1,1/1,2/2,1/1,1/1；右溢 0；outside 0；零高块 0） | **2/5 锚**：top=domNorm 3 块 vs 真值 1（含 2 零高伪迹块+右溢 3.2px）；multi=3 vs 2（含 2 零高）——f-a6 b1 §10「Range 零量测伪迹=旋转域零高」同族复现 | **成立（双向）** |
| s2crop-p1 | 5/5 锚（块数=真值；右溢全 0）；top 锚 outside=1/1=**真值一致越界**（ROW1 基线 y=720=裁剪盒顶缘，声明 ascent 12.9px 越出——内容真在裁剪缘外，DOM span 同判 1/2 越界） | **不成立**：DOM 链正确（IoU1D 0.9532~0.9999；T1/T9 修复后 DOM 平移形态已消——f-a6 b1 复跑在案） | **单侧成立**（项链贴合侧；失真可示侧由 s2crop-top G2 真阳性替代证据，§6） |
| real1c2d-p6 | 5/5 锚（块数=真值全 1；右溢 0；outside 0） | 无（DOM 同贴合——IoU1D 0.8663~0.9981） | **无分叉**——「扫描拼合病理形态」未证实：该页几何干净（§1 选取口径申报） |

**判据 b 裁定：部分成立**（s1rot 完整成立；s2crop 项链贴合+真阳性越界但 DOM 无失真；
p6 无分叉）。

## 6 判据 c：CR2——selectionHealth 标注域 G2 分离度验收

三 detector 形态（真 selectionHealth）：healthItem（项盒×项链块）、healthDom（项盒×
DOM 块 px 域）、healthSpan（DOM span 盒×DOM 块——f-a6 A2 口径的锚点级形态）。

| 集 | outsideRatio 分布 | unhealthy 触发 |
|---|---|---|
| 健康集 20 锚 | item/dom：全 0；span：18/20 锚 0，p2-bottom=1/41（2.44%）、p7-bottom=1/67（1.49%）——页级 1/501、1/829（与 f-a6 健康口径 0~0.12% 同量级、上沿略超 0.2%[门一审 N1 修正]） | **0/20 误伤（三形态全 healthy）** |
| 病理集 15 锚 | s2crop-top：item/dom=1.0（1/1 盒真越界）、span=0.5；s1rot-top：rightOver 3.2px（dom/span 形态）；其余 13 锚全 0 | **2/15 触发**（s2crop-top 三形态全 unhealthy；s1rot-top dom/span unhealthy、item healthy） |

- **分离度方向保持**：健康侧零误伤（max 2.44%<5% 阈——出处=SELECTION_DEV_RATIO_THRESHOLD=0.05 常量,pdf-item-geometry.ts:399/f-a6 G2 同源[门一审 W3 补注]）+病理侧两形态检出
  （50~100% 越界+3.2px 右溢）。
- **量级不复现 f-a6 口径**：f-a6 的 25~62.5% vs 0~0.12% 分布（间隔 ≥200 倍）是
  **pre-T1/T9 修复**的 DOM 失真页形态；现行代码下病理面仅稀疏残留（15 锚中 2 锚
  触发），锚点级间隔 ≈20~41 倍。
- **盲区在档**：本轮最大健康页失真（3882 ascent-0 行膨胀，§4-1）G2 **不可见**（项盒
  全在盒内、零右溢）——selectionHealth 的盒外/右溢两臂对该失真类无检出面。
- **CR2 裁定：弱式可复现**（方向保持/量级弱化/盲区在档）→ S6 格保留/裁撤=主控终裁：
  保留案证据=真阳性两形态（裁剪缘内容越界+旋转伪迹右溢）确被拦截；裁撤案证据=
  触发面稀疏（2/15）+最大健康页病理不可见+间隔量级缩水 5~10 倍。

## 7 门 1 决策门记录（票面 §③-5）

| 判据 | 状态 | 关键数字 |
|---|---|---|
| a 健康页双链 IoU≥0.99 | **不过** | 占比 6/20（30%）/最差 0.6232；1c2d 子面 6/6 过；根因=ascent-0 直消费（可修域）+边界比例细分（语义固有）+dy 域差（0.3~2.6px） |
| b 病理页项链贴合真值+DOM 失真可示 | **部分成立** | s1rot 双向成立（项链 5/5 贴合+DOM 2/5 失真）；s2crop 单侧；p6 无分叉 |
| c CR2 分离度结论明确 | **弱式** | 方向保持（健康 0/20 误伤+病理 2 形态检出）；量级不复现（间隔 20~41x vs f-a6 ≥200x）；ascent-0 类盲区 |

**实现者建议（供主控终裁，非裁决）**：门 1 整体不过→回设计。回炉面建议：①ascent≤0
→0.8 兜底（pdf.js #appendText 先例——pdf-item-geometry.ts:217 单点修域，回门 0 级
补丁+复跑本取证器）；②判据 a 的 IoU 口径按锚形态分层（整行边界 0.99 门/项内边界
近似上限申报）——设计书 §6 门 1 条款补口径；③S6 去留按 §6 两案证据裁决。**主控终裁（GLM5.3，2026-09-04）**：门 1 **不过→回设计**，三动作：①**ascent≤0→0.8 兜底修立为门 1b 前置票**（pdf-item-geometry.ts:217 单点修——pdf.mjs #getAscent 三级兜底先例 DEFAULT_FONT_ASCENT=0.8 对齐；**双重身份=F-A6-b2 漏网缺陷修复**：selection 链同族消费同缺陷，F-A6 取证锚未覆盖 ascent-0 字体面——3882 即 f-a6 样本，27% 项该形态在档；修后复跑本取证器判据 a）；②**判据 a 口径分层入设计书**（整行边界锚 0.99 门/项内部分选中锚 grapheme 比例细分近似面申报——本轮观测区间 0.8816~0.9745（结构性上限未定,门 1b 复跑再收敛——门一审 W2 修正:0.97 上限已被自家样本 0.9745 越过,禁当立约数字）——§6 门 1 条款补口径，锚形态分层度量非降门）；③**S6 格保留+盲区登记**（保留依据=真阳性两形态确证 DOM 回退层失真存在[s2crop 裁剪缘越界 100%/s1rot 旋转伪迹右溢 3.2px]——S6 价值=回退层最后防线非高频拦截；ascent-0 类 G2 盲区登记为已知边界，修复后盲区面随主链正确性提升而缩）。门 1b 毕后判据 a 复跑重判（b/c 随复跑确认——不预断方向[门一审 W4 修正:ascent 修复改变项盒几何,b/c 输入面同被触及]）；门 1b 复跑探针升级项（门一审 W1）=补 3882 六锚块配对错位计数（错对锚数/块数——钉死 y 域行膨胀→x 轴 IoU1D 错对因果跳步,复跑若仍不过可判修补无效还是配对口径问题）。

## 8 实现者自裁申报（超票面决定/数据缺口/已知限制）

1. **页集 p6 选取口径**：票面「1c2d 扫描拼合页（f-a6 病理形态在档页）」——f-a6 在档
   的 1c2d 特性=扫描拼合/逐页 view 异尺寸/4 纯图页，无 ≥25% 病理形态页；Node 侧全
   38 页实测无声明几何病理（rotate 全 0/view 原点全 0/项盒零越 view 盒），故取最稀疏
   扫描页 p6（10 项/46 字符/中位字高 6px）作病理集第三页——**实测无分叉**（§5），
   「病理」标签未证实，如实记录。
2. **双 IoU 口径发明**：票面「逐块 IoU」未定维数；f-a6 对比口径=IoU_x（1D）——本表
   判据 a 主数字取 IoU1D（同族），IoU2D 补充申报（被 dy 域差压制 0.17~0.75）。
3. **guard 非承重声明**（§2）：f-a6-diag-lib 复刻件对现行真函数在 3882 两页必然失配
   （pre-T3 语义）——链 A 消费真函数，守卫失配不构成链产物疑点。
4. **band 统计口径**：仅 counts 相等锚点索引对；3882 max 0.77/ s1rot 全系=行结构分叉
   或旋转语义的索引错对污染，不作判据（中位数仍小：3882 dTop med 0.0055）。
5. **运行轮次申报**：探针调试三轮（前两轮失败=baselineRowTruth viewport 形参
   /areaIou 返回形——修复过程未分段留 raw；`f-a8-gate1-run.raw.txt` 为终轮成功运行
   全量日志）。采集数据三轮一致（Electron 采集阶段三轮均 7 页×5/5 成功）。
6. **anchor.rects 空数组**：Annotation.rects 传 []（两 resolve 函数均不消费该字段——
   仅失败兜底面；本取证不测兜底路径）。
7. **s2crop-top 真阳性归因**（§5/§6）：f-a6 §11「合成配方 ROW 基线 692 起，非顶缘行」
   表述与 buildSyntheticPdf 实际（i 为 0 基→ROW1 基线=720=裁剪顶缘）不符——本表按
   实测修正申报（该差异不影响 f-a6 结论——其锚点 30%~60% 不含 ROW1）。
8. **数据缺口**：RTL/竖排运行时触发面仍零（f-a6 §9-4 缺口延续）；35 锚 relocate 全零
   （自愈重定位路径未获运行时数据——锚点构造位即真位）；zoom≠1 未测（entry.box 反推
   scale 的 ~1px 残差面[门一 W3 口径]未获数据）。

## 9 数据文件清单（scripts/audits/f-a8-gate1-out/，不入 git）

- `<tag>-p<n>-page.json` ×7：页内采集（锚点族/rawRects/被选 span 明细/domText/页级
  span 盒）。
- `<tag>-p<n>-dual.json` ×7：双链产物+对比+真值+G2（判据数字全部源此）。
- `verdict-summary.json`：汇总（iou1d/iouArea/dyMedianPx/guard/reconcile）。
- `s1rot.pdf`/`s2crop.pdf`：合成样本。
- 运行/锁证据：`../f-a8-gate1-run.raw.txt`（exit=0）、`../f-a8-gate1-locksgen*.raw.txt`、
  `../f-a8-gate1-locksapply*.raw.txt`（281=278+3）、`../f-a8-gate1-unlock*.raw.txt`、
  `../f-a8-gate1-verify.raw.txt`（真退出码）。
