# F-A9 实现者简报——标注带垂直几何（诊断包+主控预裁）

## 0. 主控诊断结论（你不再重复诊断——直接从此起步）

### 真机复现数据（scripts/audits/f-a9-real6.raw.txt + f-a9-canvas3.raw.txt，用户库白名单副本上量得）

目标文献=《Towards a smart water city》（a9390ef7）第 1 页，行
「A systematic literature review was conducted」（渲染 7.97px sans-serif，
行盒 511.43~519.40）：

- **缺陷②underline**（img3）：标注条 top=514.34~516.34——落在文字行盒
  37% 处（中部），应在≈519.4（底缘）。band.bottom 偏高 ~3px。条=8 条
  （该标注跨 8 行），全部同形态。
- **缺陷①预览带**（img1）：拖选「Sustainable Cities...」（6.375px 行，
  盒 179.55~185.93）→ paint 带 177.05~183.43——整体上移 2.5px（=字号
  39%）；用户 img1 场景（正文行）观感为下移半行——**偏差是字号比例函数，
  不同字号方向可不同**。
- 夹具（f-a9-diag.raw.txt，18px 大字两行 PDF）：预览带/underline 几何
  全对（差 1.4px/贴底）——**大字号下偏差被稀释**。
- canvas 墨带真值扫描 4 轮未隔离单行（该 x 区疑似图表元素干扰）——留你
  在夹具上做（大字好测）。

### 嫌疑算式（两条消费链的公共上游）

- 预览链：SelectionPaint 消费 itemSelectionGeometry→bandsFromItems
  （pdf-item-geometry.ts L365-390：band=行内项盒纵向并集）。
- 标注链：AnnotationLayer 消费 resolveAnnotationRectsLayered bands
  （同走 item 几何，source='item'）。
- **项盒算式**（pdf-item-geometry.ts L219-225）：`ascent = style.ascent
  声明值 ?? 0.8 兜底`；`oy = ty[5] - ascent*fontH`（盒顶）；盒高 h=
  `item.height*scale`（PDF 声明值）。ascent 兜底 0.8 是泛近似——对小
  字号（7~8px 渲染字号）字体族（该文献衬线体）系统性偏差 ~3px。
- DOM 度量链（annotation-resolve.ts bandFromMetrics L88-109）走回退字体
  canvas measureText——回退≠嵌入字体，同类偏差源。

## 1. 主控预裁（不再自裁这些点）

- **修复方向=方案 A「渲染时 DOM 校准」**：band 的垂直几何在渲染时刻用
  textLayer span 盒实测校准（span 的**位置**由 pdf.js 按 transform 定位，
  与 canvas 字形对齐度高于声明几何推导；CSS 行盒高≠字形高但 top 定位可
  信）。具体形态你设计（候选：bandFromItems 产 band 后按同基线行 span 盒
  的 top/bottom 夹取修正；或 underline 条直接用 span 盒底）。
  - 禁方案 B（canvas 墨带像素扫描——运行时太重）。
  - 方案 C（字体名查表修 ascent 兜底）可作为 A 的补充评估，不做主修复。
- 两条链同修（预览 SelectionPaint/标注 underline——公共上游单点修优先，
  消费面零重复逻辑）。
- 兼容面：夹具大字号现有正确行为不得回退（selection-paint/annotation
  系既有测试全绿=回归锁）；band 缺席回退路径（存量 rects/jsdom）语义零变。
- G3A②（rect 收集窗核）如与你改动面相交一并核，不交则不动并申报。

## 2. 验收（票面原文）

- 夹具单测几何断言：带 y=行盒顶/高=行盒高；underline=基线下细线。
- 真机 DOM rect 断言（复用本简报探针配方——白名单拷贝用户库副本，
  scripts/audits/f-a9-real.mjs 可改造；**跑 Electron 探针前必先
  `node scripts/sqlite-abi.mjs use electron`**——并发测试会话会切 ABI，
  两次探针崩溃实录）。
- e2e 渲染真实文本（tests/e2e 受锁——留主控，你申报即可）。
- img1/img3 形态复测消（探针复量对照）。

## 3. 标准纪律

三屋全规约：TDD 红→绿→变异红证（.raw.txt 落盘）；新测试 always-active；
状态机表（如引入）；npm run test 禁裸 npx vitest；≤250 code 行/文件；
禁新依赖；UTF-8；卡点 BLOCKED。报告落 scripts/audits/f-a9-impl.report.md。
工作树有并发残留（F-A11 面两文件+审计件）——勿触碰。
