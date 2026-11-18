# ADR-0019：划选反馈与页内合成

日期：2026-08-29 · 状态：已裁决（2026-11-18 修订层序与标注合成）

## 背景

划选视觉最初使用原生 `::selection`。连续段落的相邻 span 行盒重叠时，逐 span
半透明绘制会在交界叠深，因此划选视觉改为自绘并集层。拖选调度其后改为 rAF
快路径，松手与防抖落定仍走全量评估；几何源迁移到页项声明几何，DOM 量测仅作
回退。

标注色块曾置于 canvas 下，并依赖 pdf.js 的透明底渲染让色块透出。该机制只移除
pdf.js 默认白底，不能移除 PDF 内容流自行绘制的不透明矩形。2026-11-18 确认的
缺陷样本在正文下绘制 RGB(248,248,248) 不透明背景：canvas 覆盖色块，库内标注
和搜索匹配仍在，但页面上完全不可见。

## 裁决

### 划选视觉与调度

1. 划选视觉使用 SelectionPaint 自绘并集层，portal 进入选区所在页盒；
   `.textLayer ::selection` 背景保持 transparent。自绘块与保存 rects 使用同一
   几何管线，避免单层重复绘制造成叠深。
2. 拖选期使用 rAF 对齐的快路径，首事件即排帧并在帧内合帧；mouseup 与 200ms
   防抖落定使用全量评估。拖选期几何是落定结果的瞬态近似，松手与保存时刻的
   所见即所存不变。
3. Escape 只收工具条；自绘视觉保留到浏览器选区真正清除。点击、保存和页卸载
   的既有清理路径不变。
4. 选择模式、3px 真拖选阈值、工具条定位、锚定三元组与保存链不因视觉合成改动。

### 页内层序与标注合成

1. 页内层序固定为 `textLayer < canvas < colorBlocks < selectionPaint`，常量单源
   为 `page-layer-z.ts`，当前值依次为 0、1、2、3。AnnotationLayer 与
   SearchHighlightLayer 共同消费 `colorBlocks`，自绘选区保持最上。
2. canvas 继续使用 `background:'transparent'`，但不再假设 PDF 内容流透明。
   canvas 的 `pointer-events:none`、标注矩形命中和文本划选事件模型不变。
3. 两个色块层的容器均使用 `mix-blend-mode:var(--annotation-blend)`：
   light/sepia 为 `multiply`，在浅色纸上保留黑字并压出标注色；dark 为
   `screen`，在反色 canvas 上保留白字核心并提亮近黑背景。
4. dark 不沿用亮面标注色板。原亮黄色配合 screen 时，像素探针测得高亮文字对比
   仅 1.308:1，不满足 4.5:1。`theme.css` 因此在 dark 族块覆写五色为深色同色相
   token；混合模式不改为 overlay，也不在位设色值。
5. 页盒继续以 `isolation:isolate` 封闭层叠与混合比较域。弹层位于页盒兄弟位，
   其 z 序不受页内四层调整影响。

### 几何与锚定

1. 字形带三档链（annotation-resolve）：选区主链=页项几何 `bandsFromItems`
   （pdf-item-geometry）；页项通道退化走 `bandsForTextNodes` DOM 量测回退；
   存量 rects 重锚失败走 `bandsNearRects` 几何回退；span→带核心=
   `bandFromMetrics`+同行近并（各档共用）。
2. 自绘块水平边界夹取到行簇 span 实际端点。标注读时归并、零宽过滤与相邻行
   边界钳制继续生效，库内 rects 不因显示重锚而回写。
3. 页项声明几何是快路径与落定路径的主链；DOM 回退的原因必须 warn。旋转与
   CropBox 的 viewport 参数继续由 TextLayer 和页项几何通道处理。

## 后果

- PDF 自绘不透明背景上的高亮、下划线和搜索色块现在参与最终合成，不再被
  canvas 整片遮住。普通搜索匹配与 active 描边使用同一主题混合容器。
- light/sepia 的黑字经 multiply 保持可读；dark 的白字核心经 screen 保持可读，
  深色标注色板使文字与标注底达到对比要求。
- 选区工具条、标注点击菜单、文本划选和关重开持久化路径不需要改变。新增不透明
  背景 e2e 分别覆盖高亮/下划线的关重开，以及普通/active 搜索匹配。
- INV-46 记录新层序、主题 token 和像素验收方式；INV-37/58 的划选视觉与几何
  同源性保持不变。

## 风险与验证边界

- 仓外探针 `/home/yyx/synapse-archive/scripts-audits/20261118-visfix-r1/` 使用
  隐藏 Electron 窗口和 `webContents.capturePage` 采集最终合成像素。矩阵覆盖
  light/dark/sepia 的高亮与下划线、dark 150% 缩放，以及三主题普通/active 搜索。
  2026-11-18 终态 11/11 场景通过：文字对比最低 4.80:1，标注区外平均漂移均为
  0.000，下划线相邻带无整条染色，高亮重渲染采样漂移为 0。
- 探针使用固定采样区和容差，不把全图 golden 引入 e2e；INV-64 的截图禁令不变。
  e2e 继续断言真实文本、计算样式和持久化，像素验收证据留在仓外档案区。
- 对比验收以黑色正文、反色后的白色正文和 RGB(248,248,248) 自绘背景为样本。
  彩色文字、复杂半透明图形与多来源图片未承诺相同对比值；出现实际文档时须按
  同一像素口径复验。
- dark 的 `invert(1) hue-rotate(180deg)` 仍会使 PDF 内嵌图片负片化，这是既有
  夜间反色方案的边界，本次不扩展处理。
- OCR/扫描件没有文本层时仍不能建立文本标注；本次修复不改变锚定能力。
