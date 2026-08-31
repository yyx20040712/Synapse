# F-A4 实现报告——选区视觉并集自绘+标注贴行自适应+工具条定位归一（三屋第一屋·实现者）

> 工单：scripts/audits/f-a4-ticket.md（无探员报告——主控预告按票面 §0 矩阵执行）。
> 实现：2026-08-31，实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数
> 均为 wc/命令实测后落笔。

## 1. 三面×根因×修法对照（票面 §0 逐格交付）

| 面 | 根因（票面行号证据） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
| - | --- | --- | --- | --- |
| a 选区重叠加深 | native ::selection 逐 span 绘制，相邻行盒垂直重叠处 0.20×2≈0.36 叠深（text-layer.css:84-86） | SelectionLayer evaluate 渲染 SelectionPaint（selection-paint.tsx，portal 进选区所在页盒 z2）：数据=mergeLineRects+mergeRects 归并产物（与保存 rects 同源）；::selection→transparent；拖选经 selectionchange 200ms 防抖 | 自绘块 0 个；::selection=rgba(0,0,0,0.2)（叠深通道在场） | [W1 订正] 主场景自绘块 **3 个**（跨 3 行拖选）两两相交面积 0.00px²；zoom150 会话 **4 个**（选择模式重选已存高亮带——见 s6 块数接受域）；::selection=rgba(0,0,0,0)；pageerror 0 |
| b 标注贴行 | ①紧行距跨行并簇成单高块（聚类容差以输入 rect 高为基准）②TRIM 定值收边对行高不匹配 ③重锚同管线放大 | ①mergeRects 可选 lineH 钳制容差+mergeLineRects 像素域 lineH 在场改中心距判据（lineH=选区 span 字号中位数——挂 A rectsBetweenPoints/挂 B AnnotationLayer 两路注入）②rectStyle 可选 band（annotation-resolve 自 span 实测盒+canvas 字体度量推算字形带；缺省回退 F-11 分数）③重锚链经同一 rectsBetweenPoints 同源受益 | 3 行拖选保存渲染 **1 块**（并簇——结构证）；块缘偏差（对整带口径）0.96px（f-a4-baseline.raw.txt 唯一在档量化）。[W5 订正·门一 r2] 分行口径修前**无量化基线**（并簇 1 块无分行可测）——b 面修前强度以结构证（并簇 1→3 块）为准；原「+4~+5px 下偏」系修后初版（半前导钳 0 缺陷态）数值，其 raw/JSON 被后续 after 跑同名覆盖已无磁盘溯源，删除 | **3 块分行**；块顶 vs 行簇顶 max **1.48px**；块底落行簇底 desc 尾界 [−1,+3] 越界 0；块两两相交 0 |
| c 工具条偏远 | 视口差直写 left/top 被 CSS zoom 二次放大（ui-scale×1.25）+无视口夹取/无下翻转 | selection-geometry.ts：localScale（clientWidth/gBCR.width 比值，守卫≤0→1——rootToLocalScale 思想 reader 域新写）÷归一+toolbarViewportPos（近顶下翻转+滚动容器可视区夹取） | 工具条距选区顶 **334.1px**（large 档）/277.5px（medium） | 距选区顶 **9.4px**；bounding 在滚动容器可视区内；medium 档重开同样在界内 |

跨面序列（票面 §0）：S1 拖选防抖自绘跟随 ✓（unit S1）/S2 所见即所存 ✓（unit S2：保存 rects=自绘块同源断言）/S3 保存渲染贴行与自绘对齐 ✓（真机 b 面+unit）/S4 工具条视口内贴选区 ✓/S5 Escape 工具条收+自绘随选区真清 ✓（unit S5，INV-37）/S6 换档/缩放稳定 ✓（真机 zoom 100↔150% 归一化几何漂移 0.67%；medium 重开存量 3 块零迁移）。

## 2. 改动面（git diff --stat 实测；新件另计）

修改 9 文件（+336/−177 中含**非本票** 2 文件，见 §7）：
- src/renderer/features/reader/SelectionLayer.tsx（172 行 diff，终态 **249 行** wc 实测——组件 ≤250 红线内）
- src/renderer/features/reader/annotation-anchor.ts（+68：mergeLineRects lineH+medianFontSizeBetween+rectsBetweenPoints 接线；终态 395 行 ≤500）
- src/renderer/features/reader/annotation-merge.ts（+24：lineH 可选参；终态 140 行）
- src/renderer/features/reader/annotation-style.ts（+34：band 可选参+GlyphBand+pct；终态 91 行）
- src/renderer/features/reader/AnnotationLayer.tsx（51 行 diff：resolve 拆出+lineH+band 匹配；终态 240 行 ≤250）
- src/renderer/features/reader/text-layer.css（::selection transparent+头注 F-A4；终态 116 行）
- docs/invariants.md（INV-37 重写+INV-40 边界修订标注 F-A4）
- docs/adr/0019-selection-feedback-native-route.md（+22：R1 修订节；终态 95 行）
- 受锁三件（见 §5）

新件 4（+1 测试）：
- src/renderer/features/reader/selection-geometry.ts（初版 85 行——localScale/toolbarViewportPos/closestPageRoot/pageIndexOf/常量；回炉 1 后 144 行 wc 实测——+createVisualScheduler/toolbarMountPos，见 §11）
- src/renderer/features/reader/selection-paint.tsx（**62 行**——SelectionPaint portal 组件）
- src/renderer/features/reader/annotation-resolve.ts（**232 行**——resolveAnnotationRects/bandFromMetrics/matchBand/normalizedLineHeight）
- tests/unit/renderer/selection-paint.test.tsx（初版 366 行 11 测：a S1~S5/b band 四测/c 三态；回炉 1 后 391 行 12 测 wc 实测——+S1b 拖选期在场守卫，见 §11）
- scripts/audits/f-a4-verify.mjs（初版 385 行；回炉 1 后 407 行 wc 实测——+W2/W3 判据，见 §11）+f-a4-diag.mjs（一次性诊断，f-r1-dbg 先例留档）

## 3. TDD 凭证

- **先行红**（f-a4-first-red.raw.txt / f-a4-e2e-first-red.raw.txt，对 HEAD 实现）：
  unit 3 断言红+1 模块红——selection-layer P1（归一坐标 8/686.4 vs HEAD 10/858）+
  F-A4 反转守卫（selRects null）+annotation-merge ⑪（lineH 被忽略→1 块）+
  selection-paint（annotation-resolve 缺件）；e2e F-06 C 节断言红
  （Expected "rgba(0, 0, 0, 0)" Received "rgba(0, 0, 0, 0.2)"）。
- **绿**：定向→全量 `npm run test` **118 文件/1000 用例全绿**（基线 989+新增 11）。
- **变异红证 M1~M5**（f-a4-mutation.log+五 raw；cp 备份一次性时间戳目录
  f-a4-mutation-backup-20260831/，8 源文件全量收录）：M1 localScale 恒 1（P1+c1 红）/
  M2 坍缩漏清自绘（S5 红）/M3 lineH 忽略（⑪红）/M4 band 忽略（b1/b2/b5 红）/
  M5 下翻转移除（c1/c2 红）；逐一还原 diff 空+回绿双验；M4 于 b 面半前导修复后
  对新代码重跑红证（追加 raw）。
- **verify 各环真退出码**：quality=0 tickets=0 lint=0 typecheck=0 **test=0（1000）**
  build=0；locks:check 红=**预期**（受锁三件保持解锁态+新受锁路径待登记——票面
  明令禁跑 locks 命令，主控收口职责）。
- **e2e 全量**（受锁 spec 改动后口径）：**28 passed/1 failed**（1.4m）——
  唯一红=R2-SET1 smoke（header 56≠44），§7 归因非本票；P7-A 复制一次抖动
  （剪贴板时序）复跑通过。本票触及的 reader-text.spec 全部 9 用例含改写的
  F-06 小票与 F-A1 多行用例全绿。

## 4. 真机探针（scripts/audits/f-a4-verify.mjs；产物 f-a4-out/）

真实库副本+用户实况 large 档（uiScale 保留不删）+真鼠标跨行拖选；
baseline（修前数值，8 项）/after（修后判据，**12/12 PASS**）两相位：
f-a4-verify-baseline.json / f-a4-verify-after.json + 六截图（{phase}-select/
-saved/-z150/-medium.png）。S2 会话用「选择模式」（INV-42 rect 穿透）重选
S1 已存高亮同一行带做 zoom 100↔150% 同源对比。修后一行结论：
**F-A4 VERIFY: PASS（12/12 项断言全过）**（f-a4-after.raw.txt）；[回炉 1 后] **16/16 全过**（f-a4-rework1-after.raw.txt——新增 W2 双基准/W3 三项，见 §11）。

## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）

- tests/unit/renderer/selection-layer.test.tsx（332 行）：P1 定位断言改归一坐标
  （mount clientWidth 480/gBCR 600 桩→left/top×0.8——c 面红证锚）；F-08 守卫
  **反转**为自绘在场（头注注明 ADR-0019 R1 修订依据=票面 §0a）；selRects 探针
  改 document 级（portal 渲染进页盒）。其余 12 用例零改（P2~P7/F-12a/b/c 全绿）。
- tests/unit/renderer/annotation-merge.test.ts（206 行）：新增 ⑪ INV-40 边界修复
  （lineH 传入紧行距不并簇 2 块+缺省旧行为 1 块存档）+⑫ lineH 恒等钳制/幂等；
  ①~⑩ 零改（缺省参数兼容——零迁移）。
- tests/e2e/reader-text.spec.ts（791 行）：F-06 小票 C 节——::selection 精确值
  断言 transparent+selection-rects 0 计数守卫**反转**为在场+块色
  rgba(0,0,0,0.2)（头注注明 ADR-0019 R1 修订依据=票面 §0a）；标题随改；
  其余 8 用例零改。

## 6. 自裁申报（超票面决定，交门审）

1. **自绘层经 React portal 渲染进选区所在页盒（textLayer 父盒）而非票面 §1a
   字面的「渲染 div absolute 于挂载盒」**：[data-page-column] 的反向 zoom 补偿
   （zoom: calc(1/var(--ui-scale))）在档位≠1 时创建 stacking context——挂载盒
   渲染会使自绘层浮到标注 multiply 层之上，破坏 R2-F-10「灰在黄下」观感；
   portal 进页盒与标注层同 context（z2<z5），且百分比数学与 rects 归一化基准
   （pixelBoxOf(textLayer)）严格同盒零换算。
2. **mergeLineRects（像素域）同修 lineH 感知**（票面 §0b① 只点名 mergeRects）：
   INV-40 登记的并簇发生在上游 25% 重叠率判据（数学上 mergeRects 级跨行误并
   必蕴含上游已并成单块，下游无输入可分）；可选参缺省兼容，受锁 anchor 测试
   （guardedDescribe 8 用例）零改全绿。
3. **b② band 数据源=span 实测盒+canvas measureText 字体度量**（actualBoundingBox
   +fontBoundingBox 推算字形带）：票面两候选（textContent item 高度/textLayer
   span 行盒簇）中 DOM 可达的实现；computed fontSize 不可解析回退 span 盒高。
4. **半前导负值不钳 0**：初版钳 0 致带整体下偏（真机 diag 实锤——CSS 负
   半前导合法，line-height:1 下回退字体内容区溢出行盒；diag 会话输出未落盘
   raw，量级数值不可溯故不引——机制结论可经 f-a4-diag.mjs 复跑复现）；修复后
   块顶偏差 1.48px（f-a4-rework1-after.raw.txt 在档）。
5. **探针 b 判据落点**：块顶贴行簇 span 盒顶 ≤2px+块底落 [−1,+3]px desc 尾界
   ——票面 §5②「与自绘块对齐（同文字行簇 top/height 偏差≤2px）」的实现解读：
   自绘块=行盒并集、标注块=墨带，两有意几何差 1~4px 为 b② 设计本身引入
   （信息项落 JSON）；顶缘判据两几何一致。修前（+4px 下偏/并簇 1 块）仍强判别。
6. SelectionLayer 再导出 closestPageRoot/pageIndexOf（selection-geometry 拆件后
   导出面零变——票面 §2「对外行为零变」）。
7. 判据口径说明：annotation-merge ⑪ 缺省路径断言=旧行为存档（1 块）——非放宽，
   为 lineH 缺省兼容面（旧库/不可量测环境）的行为锁定。

## 7. 接缝报告（报主控裁决——非本票缺陷）

- **theme.css+workspace.css 工作树有非本票的未提交改动**（git status 实测）：
  header 高 44→56px（注释注明「用户裁决 2026-08-31 增高」）+ws-panel
  transform-origin 改 center。**R2-SET1 受锁 smoke 断言仍锚 44 故红**。隔离
  实验实证：仅还这两文件至 HEAD 后 SET1 通过（681ms ok），恢复后仍红——
  归因该单元（其测试面未随改）。本实现者零触碰、工作树原样保留。
- npm run test 与 e2e 的 better-sqlite3 ABI 互斥（F-R1 已知）：verify 全量后跑
  e2e 前须 `node scripts/sqlite-abi.mjs use electron`（本次两次踩中，已按此序）。

## 8. git status 全贴（2026-08-31 实现者收口时点）

```
 M docs/adr/0019-selection-feedback-native-route.md
 M docs/invariants.md
 M src/renderer/features/reader/AnnotationLayer.tsx
 M src/renderer/features/reader/SelectionLayer.tsx
 M src/renderer/features/reader/annotation-anchor.ts
 M src/renderer/features/reader/annotation-merge.ts
 M src/renderer/features/reader/annotation-style.ts
 M src/renderer/features/reader/text-layer.css
 M src/renderer/features/workspaces/workspace.css   ← 非本票（§7）
 M src/renderer/shared/theme.css                    ← 非本票（§7）
 M tests/e2e/reader-text.spec.ts                    ← 受锁改写（§5）
 M tests/unit/renderer/annotation-merge.test.ts     ← 受锁改写（§5）
 M tests/unit/renderer/selection-layer.test.tsx     ← 受锁改写（§5）
?? scripts/audits/f-a4-*（本票产物：探针/诊断/红绿证/变异证/报告/out 截图 JSON/
   mutation-backup-20260831/）+ 3 新源文件 + 1 新测试（§2）
?? scripts/audits/f-l4-*.raw.txt、f1-out/*.png、f-a4-ticket.md ← 会话前已存在的
   未跟踪残留（非本实现者产物，未清理未纳入）
```

## 9. 成本

实现者单会话（GLM 5.3，无子代理派发）：机器时长约 65 分钟（含 baseline/after
两轮真机 Electron 取证各 ~90s+全量 test×4+e2e×3+变异 10 轮定向跑）；
token 估算（按工具回显体量）输入 ~0.9M/输出 ~0.13M——估算值，供成本账本。

## 10. 红线自查

禁 git commit/branch ✓（全程零提交）；禁 registry ✓；禁 locks 命令 ✓（locks:
check 红为预期主控收口面）；禁新依赖 ✓（package.json 零改）；grep 无
TODO/FIXME/placeholder（quality 关）✓；组件 ≤250（SelectionLayer 249/
AnnotationLayer 240，check-quality 口径）✓；卡住停手未触发（两处弯路——探针
拖选落点/ABI 态——均已按 f-r1 在档教训自解并记 §7）。

## 11. 回炉 1 段（门一 deepseek 裁决 B:1/W:5/N:3；主控已处置 W4/N3）

- **B1（行为回归——拖选期零视觉反馈）**：修前 selectionchange 为纯防抖
  （每事件 clearTimeout 重置）——拖选全程持续触发时 evaluate 迟至停顿 200ms
  后才执行，而 ::selection 已 transparent=SR2-F-08 删自绘病根之一复活。**修**
  =拆双路（自裁形态）：自绘层视觉走 **leading+trailing 节流**
  （selection-geometry.createVisualScheduler 工厂——首个 selectionchange
  立即渲染，此后每 200ms 窗口最多一次）；工具条评估**保持防抖**（弹出语义
  零变——门一给的自裁选项之一）。evaluate 增 visualOnly 参（节流路只置
  paint 不动 pending）。**测试**：S1b 拖选期在场守卫（selection-paint.test：
  连发 selectionchange×5 每 30ms 不 mouseup→自绘层立即在场+工具条防抖未弹
  →+210ms 出条）——对修前实现先行红（f-a4-rework1-red.raw.txt）+MB 变异
  红证（节流退化防抖即红）。真机：真鼠标拖选全程自绘块在场
  （f-a4-rework1-after.raw.txt a/paint-present）。
- **W2（判据对齐——双基准正式化）**：主控裁决修订票面 §5② 为双基准——
  黄块（标注）=字形墨带基准（块顶 vs 行簇 span 盒顶 ≤2px+块底 [−1,+3]px
  desc 尾界，既有保持）；灰块（自绘）=行盒并集基准；**新增 b/ann-vs-paint-
  bounded：黄 vs 灰 top/height 差 ≤4px 上界断言**（实测 top 3.88/height
  3.40 入界——防退化）。票面 §5② 文字已同步修订并注明修订依据（门一 W2+
  主控裁决双基准）。
- **W1（数字修正）**：原报告「自绘 0→4 块」混淆主场景与 zoom150 场景——
  订正为**主场景 3 块（跨 3 行拖选）/zoom150 会话 4 块**分列（§1 表已改）。
- **W3（并入）**：探针 s6 补三项——①s6/zoom-block-count 块数一致性
  |Δn|≤1 **接受域**（自裁申报：z150 会话拖选带=S1 已存高亮带四角，与原拖
  选带在行边界处的包含差可四舍五入 ±1 行；实测 3 vs 4 入界；超出=行合并随
  zoom 漂移的真回归即 FAIL）；②s6/z150-toolbar-near 工具条距选区带顶
  <60px（实测 10.7px）；③s6/z150-ann-align 存量标注贴行 ≤2px（实测
  1.96px）——票面 §5④ 字面落地。
- **回炉后验证**：`npm run test` **118 文件/1001 用例全绿**（+S1b）+
  typecheck/lint/build 全 0；探针全场景重跑 **F-A4 VERIFY: PASS（16/16）**；
  MB 变异红证+还原 diff 空+回绿双验（f-a4-mutation-mb.raw.txt）。
- **受锁面新改列明**：本次回炉**零受锁文件改动**（S1b 落在新建未入锁的
  selection-paint.test.tsx——主控收口 locks:generate 时将一并登记）；票面
  §5② 修订=工单文件（非受锁）。
- 组件行数：SelectionLayer 回炉初稿 282 超 250——B1 调度器与 c 面定位装配
  抽入 selection-geometry.ts（createVisualScheduler/toolbarMountPos），
  终态 **243 行**（wc 实测，check-quality 口径过）；selection-geometry.ts 85→**144 行**（wc 实测）。

## 12. 回炉 2 段（门一 r2：W5/W6 轻量两点——第 2 次回炉=最后额度）

- **W5（报告证据契约）**：§1 修前列原「（分行后口径）+4~+5px 下偏」在
  f-a4-baseline.raw.txt 无对应数值——该数实为**修后初版**（半前导钳 0 缺陷
  态）实测，且其 raw/JSON 被后续 after 跑同名覆盖已无磁盘溯源。处置=选 (b)
  如实订正：修前列改为「并簇 1 块（结构证）+对整带口径 0.96px（baseline
  raw 唯一在档量化）+**分行口径修前无量化基线**（并簇 1 块无分行可测），
  b 面修前强度以结构证（并簇 1→3 块）为准」；自裁申报第 4 条的 +4~5px 同步
  去溯（diag 会话输出未落盘——机制结论可经 f-a4-diag.mjs 复跑复现，量级
  数值不引）。
- **W6（S1b trailing 盲区）**：新增 **S1c trailing 随动断言**（selection-
  paint.test.tsx）：首帧行 A（top 0%）→窗口内连发（40ms×3）→t=120 变更
  选区到行 B（不同文字范围+行盒 y=400→top 25%）再发一事件→**停顿**推进
  越过窗口缘（trailing 落地 t=200，不推进到防抖到期点 t=320）→断言 paint
  块随动到 25%（非首帧 0%）——锁「拖选持续触发时周期性推进」语义。
  红证双形：①防抖退化变异（=B1 修前行为等价）S1b+S1c 双红
  （f-a4-rework2-red.raw.txt）→还原绿；②**MC 变异**（scheduler 摘 trailing
  只留 leading）→**仅 S1c 红**（f-a4-mutation-mc.raw.txt——trailing 语义
  与 leading 断言精确隔离）→cp 还原 diff 空+回绿双验。
- **回炉 2 后验证**：`npm run test` **118 文件/1002 用例全绿**（+S1c）+
  typecheck=0+quality 过。行数 wc 实测：selection-paint.test.tsx 391→**427
  行**（13 测）；selection-geometry.ts **144 行**/SelectionLayer.tsx **243
  行**（源零改——W5/W6 均不动实现，纯测试+报告+日志面）。
- **受锁面**：回炉 2 零受锁文件改动（S1c 仍在未入锁新测试文件内）。
