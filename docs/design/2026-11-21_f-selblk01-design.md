# F-SELBLK-01 选区块间净空——PDF 文本分区与拖选钳制设计稿

- 版本 v1（2026-11-21 本场定稿）。依据：tickets/registry.ts F-SELBLK-01 票面方向
  （块几何两级分割+锚块钳制沿 52 栏授权同型泛化）；用户 2026-11-21 授权主控裁量。
- 现状单源：`selection-column-layout.ts`（51 号纯函数，本票零改）、
  `selection-drag-controller.ts`（52 号手势层，本票泛化）、INV-142（栏授权合同，
  本票沿承并增注）。

## §1 问题与验收

用户 2026-11-20 提报：页眉页脚/双栏/不同段块的 PDF 拖选稍有不慎即误卷其他文字
块的部分；用户判断「不同文字块比较容易区分」=几何可分。现状仅竖栏中缝建模
（INV-142），水平带（页眉/正文/页脚/全宽标题）与块间净空（段落块/图注）未建模。

验收：单栏与双栏页上，拖选锚定所在文字块，跨块越界被投影回锚块边界；既有
栏钳制（中缝不授权、paint 域⊆锚栏）行为保持；`npm run verify` 全绿+定向
e2e 绿（含新增块钳制两案）。

## §2 几何模型：三级分割+伪块（新纯函数件 selection-block-layout.ts）

输入=`LineBox[]`（与 51 号同构纯数据；坐标域由调用方定，y 向上/向下均可——
全部判定只依赖排序轴上的间隙与重叠，不依赖方向语义）。

- **L0 旋转分流**：沿 51 号 `ROTATED_ASPECT=3`（h > 3w）。分流盒不再参与
  带聚类；全部旋转盒聚为**一枚 rotated 伪块**（见伪块节）。
- **L1 全局水平带**：对平盒做行带聚类（y 重叠传递链——51 号 rowBands 同式，
  导出复用勿抄两份），得按 y 排序行带序；相邻行带间隙
  `gap = band[i+1].y − (band[i].y + band[i].h)`（排序轴上空带宽度，方向无关）。
  分裂双规则（满足其一即在两带间切水平带）：
  1. 净空分裂：`gap ≥ BAND_CLEARANCE_RATIO × medianH`；
  2. 字号簇分裂：`gap ≥ BAND_FONT_GAP_RATIO × medianH` 且两带主导字号簇不同
     （带主导字号=带内盒高中位数；簇不同=`|h1−h2| ≥ FONT_CLUSTER_TOL × max(h1,h2)`）。
  `medianH`=全部平盒高中位数（全局字号尺度参照——比值阈值对 zoom 不变：
  控制器域 CSS px 与 fixture 域 pt 同比缩放）。
  全局带天然=全宽净空：任何一侧存在连续文本（行距级间隙）时行带链致密，
  交错内容（左栏图注/小标题）不产生全局分裂——其分块由 L3 承载。
- **L2 带内竖栏**：每条全局带独立跑既有 `detectColumnLayout(带内平盒)`
  （零改复用，含带内 fullSpan 判定与中缝投票；单盒带无候选恒单栏）。
- **L3 栏内块**：对每栏盒集独立做行带聚类+§L1 同一双规则（`medianH` 取该栏
  盒高中位数），切出的每段=一枚 flow 块。连续同字号正文（行距间隙
  < 0.75×medianH）恒不分裂；段前距/图注净空/字号变（小标题、图注小字）分裂。
- **伪块**：
  - full-span 伪块：各带内 fullSpan 盒按带聚合为伪块（跨缝行自成块，可锚定）；
  - rotated 伪块：全页旋转盒一枚。
  - 伪块与 flow 块统一进块表，同受授权与钳制（取代 INV-142③「全宽带/旋转盒
    不判违例」注记——该语义由本票升级，见 §9）。
- **块输出合同**：`TextBlock { id, kind:'flow'|'full-span'|'rotated',
  x0,y0,x1,y1, boxes }`；`BlockLayout { blocks, gutters }`，gutters=各带
  `detectColumnLayout` 的中缝带连同其带 y 包络（授权 in-gutter 判定用）。
  块内 boxes=输入（DOM）序、成员=输入引用恒定（52 回映合同沿用）。
  flow 块包络两两无交（带 y 不交+带内栏 x 不交+栏内段 y 不交）；伪块包络
  可与 flow 块相交，命中判定用盒级精确命中（§3）。

## §3 授权合同 authorizeBlockPoint(layout, {x,y})

判定序（先命中先得）：

1. rotated 伪块：任一成员盒矩形含点 → 授权该块；
2. full-span 伪块：任一成员盒矩形含点 → 授权该块；
3. flow 块：包络含点 → 授权该块（flow 包络两两无交，唯一）；
4. 带内中缝带：y 落某带 y 包络且 x∈(gutter.left, gutter.right) → 不授权
   `in-gutter`（保持 52「缝带无指针明确入栏授权」——preventDefault 不启动）；
5. 最近块回退：其余位置（页边距/带间净空/图表区等零文本区）→ 授权距点
   欧氏距离最小的块包络（等距取阅读序在前者：带序→栏左右序→栏内段序）；
6. 零块（空 textLayer/全旋转分流后无平盒且无旋转盒）→ 不授权 `no-blocks`。

与 52 等价性：缝带 mousedown=不启动（今日 cross-gutter）✓；页边/零文本区
mousedown=可启动且锚最近块（今日 x 侧栏授权的保持形）✓；今日「span 跨缝
不授权」语义由 §4 违例钳制承载（mousedown 指针形零宽不再有跨缝形态）。
行为变化枚举（相对 52，均已在 §8 备案）：缝带中点今日 preventDefault→
维持；跨缝行文本上 mousedown 今日按 x 侧授权所在栏→改为授权 full-span 块；
旋转盒文本上 mousedown 今日按平盒布局 x 侧授权→改为授权 rotated 块
（纯旋转页今日 no-columns 不可拖→变为可拖且钳制于旋转块）。

## §4 钳制合同（selection-drag-controller 泛化）

态空间 S0/S1 与事件链零改（mousedown 授权启动/mousemove 只写 ref+重开写窗/
selectionchange 自写回声抑制〔canonical signature 一次性消费〕/mouseup
enforce×2+endSession——selection-events.ts 接线零改，SelectionLayer/
selection-evaluate/release-affinity 零改）。

会话字段迁移（完整枚举）：

| 52 号字段 | 本票字段 | 说明 |
|---|---|---|
| anchorColumn: ColumnId | anchorBlock: number | 锚块 id（blocks 表下标） |
| otherColumn | （删） | 违例判据改为 blockId ≠ anchorBlock |
| twoColumn: boolean | （删） | 单栏会话现在同样执行 enforce（行为变化，见下） |
| member: Map<box, 'left'\|'right'\|'single'\|'full-span'\|'rotated'> | member: Map<box, number> | 全盒入表（flow/伪块统一 id） |
| colItems / colX0 / colX1 | blockItems / blockX0 / blockX1 | 锚块成员与包络 |
| items/originX/originY/pointer/writes | 同名保留 | 零改 |

- 违例判定：anchor/focus 边界项（itemOf 解析）的 `member.get(box)` 存在且
  ≠ anchorBlock → 投影回锚块。今日「full-span/rotated 不判违例」类目取消
  （统一为伪块违例）；不可解析边界（页外/工具条）仍不判。
- 投影：`projectTo` 算法零改泛化——y→锚块内行带映射（带内=该带；间隙=距 y
  最近带等距取上带；越顶/越底=视觉首/末带）、带内 x 二值（px ≥ blockX1 →
  行尾 / px ≤ blockX0 → 行首）；focus 按 pointer.y+pointer.x，anchor 按
  锚盒中心 y+锚盒 x 侧（shift+click 面）。
- 单栏页新钳制（枚举）：今日 single 会话 enforce no-op → 本票起 flow 块
  违例同样投影（单栏页页眉/页脚/段块净空生效——票面主诉场景）。
- 写窗 CAP=3/mousemove 重开/echo 一次性消费/endSession 清零：零改。

## §5 阈值表

| 常量 | 值 | 校准依据 |
|---|---|---|
| BAND_CLEARANCE_RATIO | 0.75 | fixture 行距间隙 6=0.6×10 不分裂（裕 0.15）；常规 leading 间隙 0.2-0.45h 不分裂；段前距/页眉页脚带 ≥0.75h 分裂 |
| BAND_FONT_GAP_RATIO | 0.25 | 字号簇分裂的最小净空：排版上字号变处恒有正间隙；fixture 页眉-标题间隙 6=0.6×10 过线 |
| FONT_CLUSTER_TOL | 0.15 | 图注 8 vs 正文 10=0.2 过线（裕 0.05）；同级字号噪声（10 vs 10.5=0.048）不误判 |
| ROTATED_ASPECT / MIN_GUTTER_BANDS | 3 / 2 | 沿 51 号导出复用，零改 |

## §6 fixture 扩展（tests/utils/pdf-factory.ts createTwoColumnPdf）

在既有配方上增补（页 612×792，PDF 用户空间 y-up，基线 y）：

- 页眉带：`TWOCOL TEST RUNNING HEAD`，font 8，基线 764，水平居中（x 包络
  跨 [160,318] 页级中缝 → 页级 fullSpan）。与标题带（font 18 基线 740，
  盒 [740,758]）间隙 6 ≥ 0.25×10 且簇变（8 vs 18）→ L1 分裂。
- 左栏段块样本：`LCOL CAPTION SAMPLE`，font 8，基线 588，x=54。左栏
  ROW 01-06 基线不动（684..604）；ROW 07-10 下移避让：基线 560/544/528/512。
  caption 盒 [588,596]：与 ROW06 [604,614] 间隙 8 ≥ 7.5（净空分裂）且簇变
  （8 vs 10=0.2 ≥ 0.15）；与 ROW07 [560,570] 间隙 18 分裂。右栏 11 行基线
  不动（700..540，行距 16 间隙 6 不分裂）——**左栏 3 块/右栏 1 块的交错
  不对称样本**（caption 与右栏 ROW07 [588,598] 同全局行带 → 无全局分裂）。
- 页脚带：`TWOCOL TEST PAGE FOOT`，font 8，基线 60，水平居中（页级
  fullSpan）。与正文末行间隙远超阈值 → L1 分裂。
- 导出新哨兵常量：`PDF_TWOCOL_HEADER/FOOTER/CAPTION`。
- 页级 detectColumnLayout 合同影响（fixture 测试随改申报）：左栏 11→12 盒
  （caption x∈[54,139] ≤ 页级缝 left 归左栏）；fullSpan 1→3
  （标题+页眉+页脚）；中缝交集投票不变（caption 带、页眉/脚单盒带不产候选
  或候选包含交集——right 恒 318）。

## §7 测试面（受锁面=[tests] 申报）

- 新增 `tests/unit/renderer/selection-block-layout.test.ts`（always-active）：
  L1 双规则分裂/阈值边界（0.74h 不裂 0.76h 裂；簇变+小间隙裂/同簇+大间隙
  裂）、连续正文不裂、交错 caption 不产生全局分裂但 L3 左栏裂、单栏页
  （页眉/正文/页脚 3 块）、flow 包络无交、伪块聚合、授权判定序六分支
  （含 in-gutter 与最近块回退/等距阅读序）、零盒 no-blocks、y-up 域样本。
- 改 `selection-drag-controller.test.ts`：栏词汇→块词汇；**新增单栏页
  页眉钳制案（先红后绿——今日 no-op 即红）**、full-span 伪块违例案、
  in-gutter preventDefault 保持案、最近块回退锚定案；CAP/echo 面保持。
- 改 `selection-drag-fixture.test.ts`：沿 §6 适配页级计数（12/3）+新增
  块级断言（4 全局带/左 3 右 1/gutter 318 保持）；h 取
  `item.transform[0]`（真字号——18/10/8 簇信号入场）。
- 改 `tests/e2e/selection-twocol.spec.ts`：既有两段（慢拖闪烁+间隙投影）
  保持绿（主拖段纵向 2.2 行高不及 caption）；新增两案：
  A 块钳制——mousedown 左栏 ROW 02（锚=上段块），真实 mouse.move 至
  caption 下方左栏 ROW 08 y，程序化扩展写 focus 至 ROW 08 → enforce 投影
  回上段块行尾：断言选区文本含 `LCOL ROW 06`、不含 `CAPTION`、不含
  `LCOL ROW 07`（真实文本断言）；
  B 流连续——同法右栏 ROW 02→ROW 08：断言含 `RCOL ROW 07` 与 `RCOL ROW 08`
  （同块无中切——与 A 不对称互证）。
  CI 1024×768：沿用 scrollIntoViewIfNeeded+boundingBox 锚定先例。
- 保持绿零改：`selection-column-layout.test.ts`（51 号纯函数零改）、
  `selection-flicker.test.tsx`（echo/签名域零改）、`selection-layer-f52.
  test.tsx`（如断言 reason 词汇则随词汇改并申报）。

## §8 已知边界（v1 不做，备案）

1. 边码 x-邻接：边码与正文同带同侧时并入侧栏包络（L2 单中缝模型限制），
   误卷未防——后续票候选（需栏内 x 净空+字号簇第四级或 N 栏泛化）。
2. 净空 < 0.75×medianH 的段间距不分裂（阈值保守取值，防行距误裂）。
3. 带内紧邻跨缝行（无前置净空、行盒更高与下行重叠成链的全宽标题）：
   为 full-span 伪块可锚定可钳制（今日为所在栏会话+不判——行为变化已在
   §3 枚举）。
4. 最近块回退在带间大净空（如页脚下方底边距）锚最近块——拖入远端文本被
   钳回（保守语义，与缝带同型）。

## §9 文档影响（收尾批回写）

- INV-142 ③注记「全宽带/旋转盒/不可解析边界不判违例」改为指针：全宽带/
  旋转盒=伪块受 INV-178 钳制，不可解析边界仍不判。
- 新增 INV-178：文本块分割合同（L1/L3 双规则+L2 沿 142+伪块统一块表）与
  锚块钳制合同（授权判定序+违例投影+单栏页生效）。
- architecture.md 阅读器选区段落补块分割一节。
- tickets/registry.ts F-SELBLK-01 → done（file 字段改
  selection-block-layout.ts）。

## §10 交付回填（v1.1，2026-11-21 收尾批）

- 交付与 §2-§7 一致；实施差异两处（均自洽，未反向改阈值）：
  1. 页眉/页脚在块级为单盒 flow 块（所在全局带单盒无中缝→单栏→L3 一段），
     「页级 fullSpan」仅指对页级 detectColumnLayout 的投影形态；
  2. selection-drag-controller.test 夹具行距 24→16（行盒净空 14→6）以贴合
     真实排版致密行距——块模型下宽松行距夹具会把每行裂成独立块。
- 审查回炉增量：authorizeColumnSpan/ColumnAuthorization 退役删除（生产消费
  归零——fixture 授权断言迁 authorizeBlockPoint，含缝开区间贴边防线）；
  等距回退/伪块聚合/判定序竞争三类用例变异负锚实证。
- 受锁面适配备案（提交说明同申报）：pdf-factory-twocol 正文过滤排除页眉/
  页脚哨兵；selection-layer-f52/selection-flicker 夹具几何致密化+块模型
  期望值重算（断言强度未削弱——f52 断言逐字未改，flicker D1 zoom 判别改
  36/120 精确值+显式否定 20/120）。
