# F-V1 实现报告（第一屋·实现者子代理）

- 工单：`scripts/audits/f-v1-ticket.md`（整段多行拖选/标注 band 断位与漂移——rect 管线行簇错联）
- 基线：提交 3afbc3d19 后工作树（含他人未提交的 lineage/F-LG13 并行改动——非本工单面，未触碰）
- 产物：`src/renderer/features/reader/annotation-anchor.ts`（+67）、`annotation-merge.ts`（+40）、
  `tests/unit/renderer/annotation-anchor.test.ts`（+7 用例 a~e）、`annotation-merge.test.ts`（+2 用例 f/g）、
  新建 `scripts/audits/f-v1-verify.mjs`（真机复验）+ 本报告
- 证据目录：`scripts/audits/f-v1-out/`（red.raw / npmtest-1~2 / final-test / f-v1-verify.json /
  verify-sel.png / verify-ann.png / verify-doc2.png / f-v1-dbg-doc2.json / f-v1-build*.txt）

## 1. 根因机制精化（与票面 §0 证据全兼容，方向未变）

票面定位缺陷点=mergeLineRects 行簇判据（盒高>行距时相邻视觉行聚同簇）。实现前对
f-v1-diag.json 的 18 个原生 rect 做了逐数值推演，机制精化为**两层协作破缺**：

1. **簇判据破缺**（票面已证）：紧凑行距下 yOverlap 链并（无 lineH 注入路径，行 1-4
   并成一块）与膨胀 lineH 中心距阈值并簇（行高量测 ~24px 时行 1-2/3-5/6-7 杂交）。
2. **段高度溢出→INV-D 级联→matchBand 错绑**（同证据的更深机制）：正常量测 lineH
   (~12.66px) 下簇本身分得对，但段合并 y/h 取主导矩形（高盒 h=14.4）>行距 11.9，
   相邻行 rect 竖向重叠 2.4px → mergeRects INV-D 累积钳制**级联下推**（行 5/6/7 分别
   +9.8/+12.2/+14.7px）→ matchBand 最近中心带把行 5 的 rect 绑到行 6 的带、行 6 绑到
   行 7 → **丢行 + clampedHorizontal 杂交（[1110.3→1249.2]∩行6 端点=[1122.2→1249.2]）
   + 同行双块**——与探针 sel.rects/ann.rects 逐块吻合（黄链 w138.9 块=行5 几何放行6 带）。

票面判据「跨行选区 rects 计数=视觉行数 / x⊆该行首末片段端点」在两层同时成立才修复。

## 2. 行簇判据选型自裁（票面 §1 候选 a/b/c）

**选 a+c 组合，弃 b**：

- **a 行距自适应（主体）**：新增纯函数 `estimateLinePitch`（像素域导出，票面 §2 点名）
  ——y 中心升序相邻差 → 滤 <2px 行内噪声（tall-short 变体中心差实测 0.2~2.4px）→
  **下中位**。两处消费：
  - 簇判据：pitch 在场时中心距阈值=**min(lineH, pitch, 簇主导 h)/2**（票面原文口径）。
    lineH 单独在场=F-A4 原口径 lh/2 逐位不动（INV-40 语义零变）；两估计均缺席
    （单行选区/量测退化）=旧行为 yOverlap。真机数据支撑：紧凑文档 pitch≈11.8，
    阈值钳到 5.9——lineH 膨胀到 24 也无法跨行并簇；盒高 21.6 的行界盒重叠率 44%
    的 yOverlap 链并同样被中心距拦死。
  - **段高度钳制**（超票面细化，见 §5 申报）：pitch<主导高 且 主导高≤2×pitch
    （HEIGHT_RATIO_MAX 可比带——标题/旋转形态 h 超 2×行距不钳）时输出高钳到 pitch，
    y 保持主导矩形不动（受锁断言锚「y 取主导」）。真机数据：14.4→11.8 后相邻行块
    恰不重叠（底=下行顶−0.1px），INV-D 零驱动、级联下推消失，行 5/6/7 回绑本行带。
- **c mergeRects 终裁补门**：lineH 在场（挂 A/B 实测量测路径）时聚类容差追加归一化
  域行距估计 `estimateNormPitch` → min(hNew, hRowMedian, lineH, pitch)/2。CSS 回退
  行盒膨胀可达行距 ~2 倍（F-A5 在档 1.57~1.83×）时 h/lineH 容差仍并相邻行
  （h=2×行距、lineH 同膨胀时 dist=行距≤旧容差），实测行距为纲拒绝跨行并集。
  **lineH 缺省不启用**——受锁 ⑪ 缺省分支（并入一块）语义存档（M4b 变异红证此门位）。
- **b 基线对齐分拆弃用理由**：分拆只治「已并簇后的拆行」，不治段高度溢出与
  INV-D 级联（本票真机主路径），且引入「层内才许 x 并集」的第二套几何语义——
  与 a 的单一行距基准相比多一个调参面，收益为负。

## 3. 判据对照（票面 §1 不变量 / §5 判据 → 证据）

| 判据 | 结果 | 证据 |
|---|---|---|
| 常规行距行为零变 | ✓ | 既有 19+13 受锁用例逐字未动全绿；新增 e 锚（盒高<行距时 h/y 严格取主导） |
| 跨行选区 rects 计数=视觉行数 | ✓ | 单测 a/c（修前 4 块→修后 7 块）；真机 ①②③④ rectCount=7=rowsCovered 且 onePerRow |
| rects x ⊆[行首片段,行末片段右缘] | ✓ | 单测逐块 x 并集断言；真机 ②/③/④ inBounds（±2px） |
| 两链同源（蓝/黄/AI 同管线） | ✓ | 修复全在 rectsBetweenPoints 公共管线（mergeLineRects+mergeRects 挂 A），真机 ③ 黄链同判据过 |
| 真机①每视觉行恰 1 块 | ✓ | f-v1-verify.json ①②：7 行 7 块 counts 全 1 |
| 真机②x∈行端点±2px | ✓ | inBounds=true，无越出（修前杂交块 [1122.2→1249.2] 消失） |
| 真机③黄链同判据 | ✓ | ③：7 行 7 块 counts 全 1 |
| 真机④常规行距文献回归 | ✓ | 库中第二篇（缩略语表·双栏小字号）④：7 行 7 块（发现并修掉估计器离群脆弱性，见 §4） |
| 真机⑤pageerror 0 | ✓ | count=0 |

## 4. 过程发现与处置（超票面决定申报清单）

1. **估计器离群脆弱性（doc2 实证）→ 改口径**：初版行距估计带「<30%×最大差」相对
   下限；doc2 原生 rect 流含一个 232px 远距零宽盒（center 883.6），单个离群把下限
   抬到 69.6px、真行距差（10~10.5px）全被滤光，pitch 误估 232 → 高度钳制失效 →
   INV-D 级联复现（行 641 丢块/行 652 双块，f-v1-dbg-doc2.json）。改为**纯下中位**
   （对少数离群天然稳健；doc1 11.8/doc2 10.2/全部受锁夹具结果核验不变）。
   一次性诊断脚本 f-v1-verify-debug.mjs 用后已删（超票面新建面，证据 JSON 留档）。
2. **verify 脚本两处不可直 crib diag**（超票面实现自裁）：
   - 行-块归属用**最近中心指派**而非 diag 的宽松 hit 谓词（|Δc|<h——修复后带宽≈行距
     会把邻行块误计入，①判据会假红）；
   - 拖选锚点行只取**视口内** span（diag 的全文档 mid 行在 doc2 落在折叠下方 y≈1431，
     拖选落空 selTextLen=0）。
3. **变异红证加做 M1b/M4b**（票面 M1~M4 之外）：M1b=钳制无条件触发（e 红+受锁 h
   断言红——常规零变锚的失败证明）；M4b=补门无 lineH 也激活（g 红+受锁⑪缺省分支红
   ——门位设计获证）。
4. **INV 登记移交主控**：docs/invariants.md 不在票面解锁面，F-V1 不变量（紧凑行距
   每视觉行恰一块/行内并集/相邻行块不重叠）建议由主控收口时登记（INV-40 邻条）。
5. **ABI 竞错观察**：裸 `npx vitest run` 偶发 better-sqlite3 "compiled against a
   different Node version" 大面积红（131 用例，db/services 域）——与改动无关的换态
   竞错；验收一律带 `sqlite-abi.mjs use node` 前导的 `npm run test`（本文 3 次全绿，
   退出码 0 亲验）。

## 5. 测试与验证记录

- **红**：新增 7 用例先红 5（a=4块丢行 / b=h14.4>12.3 / c=4块杂交 / d=未实现 /
  f=1≠2 并簇），e/g 为回归锚设计为绿；既有 32 用例不受影响（f-v1-impl-red.raw：
  5 failed | 34 passed）。
- **绿**：两文件 39/39；全量 `npm run test` **120 文件/1024 用例三连绿**
  （npmtest-1/2 + final-test，均退出码 0）；`npm run lint`、`npm run typecheck` 净。
- **变异红证**（cp 备份→变异→红→cp 还原→diff 空，未用 git checkout）：
  M1 段高度钳制移除→b 红；M2 簇判据去 pitch→a/c 红；M3 估计器恒
  undefined→a/b/c/d 红；M4 补门移除→f 红；M1b→e+受锁 h 锚红；M4b→g+受锁⑪缺省红。
  全部还原后 diff 确认空、末次 39/39 绿。（注：M1~M4 红证完成于估计器口径微调前；
  该微调仅动 estimateLinePitch 内部滤差口径，M3 变异点仍在且夹具行为核验不变。）
- **真机复验**：ABI electron + build 后 `node scripts/audits/f-v1-verify.mjs`
  退出码 0，五判据全过（§3 表）。产物 verify-sel/ann/doc2.png。
- 行数红线：annotation-anchor.ts 440/500、annotation-merge.ts 172/500 ✓。

## 6. diff 自查

本工单面：`src/renderer/features/reader/annotation-anchor.ts`、`annotation-merge.ts`、
`tests/unit/renderer/annotation-anchor.test.ts`、`annotation-merge.test.ts`（既有断言锚
逐字未动——diff 只含尾部追加用例与 import 扩面）、新建 `scripts/audits/f-v1-verify.mjs`、
本报告。工作树内 lineage/F-LG13 系改动为并行工单所有，未触碰。

## 7. 成本

- 工具调用 ~42 次；会话墙钟约 40 分钟（23:00–23:40）。
- 真机探针 4 次开窗（verify×3 + 诊断×1，取证惯例）；单测全量 6 次。
