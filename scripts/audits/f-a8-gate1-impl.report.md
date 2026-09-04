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

新受锁件三：`f-a8-gate1-diag.mjs`（389 行）/`f-a8-gate1-lib.mjs`（184 行）/
`f-a8-gate1-page.mjs`（166 行）——全部 ≤500 行红线。四轮 gen/apply（修改即重锁）：
初锁 281=278+3 → 修复轮 2/3/4（viewport 形参/areaIou 返回形/1D 补+规格改进）每轮
unlock→改→generate→apply，终态 manifest 281 条与工作树同步（locksapply4.raw.txt
exit=0）。

## 5 verify 实录

`npm run verify` 真退出码落盘 `f-a8-gate1-verify.raw.txt`：**exit=0**，Test Files
155 passed / Tests 1345 passed——与票面 §④ 预期（155/1345/locks 278+探针件数=281）
逐位吻合。src/ 产品代码零改（git status tracked 面零改动——仅新增本票产物件）。

## 6 自裁申报（超票面决定）

1. 双 IoU 口径（1D 主/2D 补）——票面「逐块 IoU」未定维数，f-a6 口径=1D（申报于裁决表 §2/§8-2）。
2. p6 病理页选取口径+「病理」标签未证实（裁决表 §8-1）。
3. guard 守卫非承重声明（f-a6 复刻件 pre-T3 语义陈旧——链 A 全程真函数，裁决表 §2/§8-3）。
4. band 统计口径=counts 相等索引对，3882/s1rot 污染面申报不作判据（裁决表 §8-4）。
5. baselineRowTruth 传 pdfjs-viewport 同形（真 viewportTransformFor 构造 transform）——
   f-a6 库消费面适配（非签名变更）。
6. 运行轮次：三轮调试（前两轮失败修复过程未分段留 raw——run.raw 为终轮成功全量；
   采集阶段三轮均全成，申报于裁决表 §8-5）。
7. anchor.rects=[]（两 resolve 函数不消费该字段；兜底路径非本票面）。

## 7 疑虑（交门审）

- **判据 a 的口径裁决面**：0.99 门在「项内边界锚」形态结构性不可达（比例细分固有
  近似）——若主控裁定该形态豁免/分层，判据 a 的 1c2d 子面（6/6）+3882 修 ascent 后
  复跑或可过；当前数字如实记录为不过。
- **S6 裁决证据两面性**：真阳性拦截（2 形态）与稀疏触发+ascent-0 盲区并存——裁决表
  §6 两案并列，未预设立场。
- **3882 ascent-0 修复归属**：本票取证票零改；修复域=pdf-item-geometry.ts:217 单点
  （回门 0 级）——是否随门 1 回炉一并处置=主控排程面。
- f-a6 §11「合成配方 ROW 基线 692 起」表述与 buildSyntheticPdf 实际（ROW1=720=裁剪
  顶缘）不符——本票实测修正申报（裁决表 §8-7），不构成 f-a6 结论损伤（其锚点不含 ROW1）。
