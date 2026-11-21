# 选区正确性 A1–A5 设计稿（B1 批·修复单元 1–6）

- 日期：2026-11-21。角色：B1 批单元一（设计稿+合成夹具红测试，修复单元
  1–4）与单元三甲（单元 5/6 设计增补+红测试，同日增补）；本稿不写产品
  实现——修复实现归 U2。红测试：单元 1–4 见 `tests/unit/renderer/selection-b1-*.test.ts`
（先红半场：9 用例在当前产品代码上呈红、7 用例恒绿，实测红因见 §10，
U2 落地后已转绿）；单元 5/6 见 `tests/unit/renderer/selection-b1-u3-*.test.ts`
（3 用例呈红、7 用例恒绿，实测红因见 §10，变异验证=§5 单元 5/6 注；U3
落地后已转绿）。
- 输入：探针定谳 `/home/yyx/synapse-archive/scripts-audits/20261121-visual-review/b1-probe/note.md`
  （事实 F1–F13/推断 C1–C7）+ 同目录场景 JSON；单元 5/6 输入=复探定谳
  `/home/yyx/synapse-archive/scripts-audits/20261121-visual-review/b1-probe2/note.md`
  （干净态重查+机制链 M1–M4 逐数字）+ 同目录 chain-G5f-gutter-end.json/
  chain-A5a-body-down.json（tolPx/行成员/带分配/预测渲染盒）；主控终裁
  （修复单元 1–6 与边界约束）以本稿 §5 规格承载，不自行扩权。
- 术语：**槽位**=Selection 边界的元素节点形态 `(DIV.textLayer, k)`——k 为
  childNodes 索引，其文本位=「第 k 个子节点之前」的全局字符偏移；**元素槽位**
  与文本位（`(Text, offset)`）相对。**锚块**=mousedown 经 authorizeBlockPoint
  授权记入会话的文本块。**缝**=同视觉行内左右栏项盒之间的水平净空。
  **行锚**=基线簇首成员的 vProj（单元 5a 簇界比较基准）。**行主导字高**=一行
  （带）成员 fontH 的最大值。**碎片行**=行内全成员字高 < 全局行主导字高×
  FRAGMENT_HEIGHT_RATIO(0.85) 的基线簇。**vTail 传递链**=旧 groupByBaseline
  与「上一成员 vProj」比距使长行逐步吞并远行的缺陷机制（probe2 §4）。

## 1. 事件时间线（要素一）

S1a 主现场（`scene-S1a-abstract-to-below-right.json`，逐事件读数）：

| 时刻 | 事件 | 状态 |
|---|---|---|
| t0 | mousedown (713,695)=摘要第 5 行 span 内 | hit=SPAN、inTextLayer=true；authorizeBlockPoint 授权；原生 anchor=该 span 文本@0（global 1982）——**正确** |
| t1..t12 | mousemove 12 步至 (905,753)=摘要块右下角外（无 span） | 控制器只写 session.pointer（INV-142③） |
| t13 | 原生 selectionchange（拖选扩展） | focus=**DIV.textLayer 容器槽位 child#166（global 1875）**、direction=backward、selLen=109——Chromium 对无 span 点把 caret 落容器元素槽位，槽位文本位=「某 span 之前」，与视觉落点无几何对应（F2 七类点实测） |
| t14 | 控制器 onSelectionChange→enforce | **零纠正**：itemOf 对容器节点返回 null（仅当 span 父级匹配才解析）→「不可解析边界不判违例」（INV-178③ 现条款）→ 翻转态原样放行 |
| t15 | releaseAffinity 判定 | 未触发（focus 盒=槽位插入符盒，upY≥top——W1/W2/距离门均不中；全部 13 场景零触发，候选③排除） |
| t16 | mouseup→enforce×2+evaluate.full | 同 t14 零纠正；paint=5 块、选中文本=摘要第 4 行尾→第 5 行头（**起点之前的内容**） |
| t17 | 点击「高亮」保存 | 落库 quote 自「A B S T R A C T」起、start=1522<1982（`saved-annotations.json` id 77a7cb4b…）——翻转区间持久化（F4/S1save） |

A1 拦截链（S5/S7）：mousedown 命中 `DIV[data-testid=annotation-rect]`（无
pointer-events:none，参与 elementFromPoint）→ 控制器 `closest('.textLayer')`
不命中→**不启动也不 preventDefault**→原生垃圾选区：S5=矩形槽位↔矩形槽位
（selLen=0/paint=0 静默失败）；S7=矩形槽位在 DOM 序位于整个 textLayer 之后，
docOrder 把 range 拉到页尾（toString 3037 字符+46 块灰底）。隐藏矩形后同手势
S5b/S7 干净（uncovered=0）——拦截是唯一变量。

## 2. 状态迁移（要素二）

控制器态空间（S0 idle/S1 dragging）新增迁移（修复单元 1/2 落点，规格见 §5）：

| 迁移 | 现行为 | 新行为（U2 规格） |
|---|---|---|
| S0→S1（mousedown 授权启动） | 只建会话，不写选区 | **非 span 授权点**（textLayer 容器/图区空白，经最近块回退授权）：程序化 `setBaseAndExtent(投影位, 投影位)` 置坍缩光标（单元 1-①）；span 命中点零变（原生锚已正确） |
| S0（mousedown 未启动） | 非 textLayer 目标一律早退零触 | 命中标注矩形（pageRoot 内）→ preventDefault+不启动（单元 2）；页盒空白等其余非 textLayer 目标保持零触 |
| S1 selectionchange→enforce | 边界 itemOf=null（容器槽位）不判违例 | **textLayer 容器元素槽位=违例**：focus 按 session.pointer、anchor 按 mousedown 原点投影回锚块（单元 1-②）；真不可解析（页外/工具条）保持不判 |
| S1→S0（mouseup 链） | enforce×2（同上盲区） | 同一槽位解析复用（selection-events.ts onMouseUp 两处 enforce 自动继承） |
| 保存链 | 翻转区间进 quote/start/end | 终局边界正确后 effectiveRangeOf→rangeToAnchor 消费正确区间（无需独立改动——由单元 1 覆盖） |

投影语义分支（单元 1 新投影路径 vs 既有二值路径）：**新路径**（槽位违例解析
专用）x 语义=「带内最近盒按 x 距离」（指针与带内各盒的水平距离最小者，取其
最近字符边界）；**既有路径**（projectTo，块尾全选语义 px≥blockX1→行尾/
px≤blockX0→行首）行为零变——受锁 F-SELBLK-01 测试链锁死，U2 不得改其行为。

## 3. 几何域（要素三）

| 域 | 单位/范围 | 载体 | 消费方 |
|---|---|---|---|
| PDF 用户空间 | pt，y-up | item.transform[4]/[5]、pdf-factory 配方坐标 | getTextContent、viewportTransformFor 源 |
| viewport CSS px | px，y-down，textLayer 盒本地 | ItemBox.rect（项声明几何） | baselineGroupBlocks/bandsFromItems/selectionHealth |
| DOM 视口量测 | px（getBoundingClientRect） | LineBox（collectSpans+boxOf） | 控制器量测、snapBlankBoundary、visualRows |
| 归一化 | 0..1（÷textLayer 盒宽/高） | AnnotationRect、RowBand | mergeRects 终裁、paint/保存同源（INV-58） |
| 槽位文本位 | 全局字符偏移（root 起累计） | `(layer, k)`=前 k 个子节点文本长度和 | probeTextLength/docOrderPair/S1save 落库值 |

关键阈值（单源=`geometry-types.ts`）：COLUMN_GAP_H_FACTOR=1.5、
COLUMN_GAP_PAGE_RATIO=0.02——baselineGroupBlocks 断段阈值
=max(1.5×行高, 0.02×页宽)；实测页 4（textLayer 595px）≈16.5px vs 实测缝
17px 临界（F1/F9）。anchor-blank-snap 量测侧断栏阈值
=max(20px, 2.5×盒高)（BLANK_SNAP_* 前缀，用途不同不合并）。

## 4. 真实探针读数引用（要素四）

| 读数 | 值 | 源文件 |
|---|---|---|
| 无 span 点 caret 解析 | 7 类点全部落容器/矩形元素槽位；abs-below-right=child#166@1875（视觉最近文本 1982，差 107 字符） | click-p1-*.json（7 份）、F2 |
| S1a 翻转态 | anchor=span@1982 正确、focus=槽位@1875 backward、enforce 零纠正、paint=5 块 | scene-S1a-*.json、F3 |
| S1save 落库 | quote 自「A B S T R A C T」起、start=1522<down 1982、rects=5 | saved-annotations.json、F4 |
| A1 拦截 | S5 selLen=0/paint=0；S7 toString=3037 字符/46 块；S5b 隐藏矩形 uncovered=0 | scene-S5*/S7-*.json、F6/F8 |
| A2 跨缝 | S4b 57 块中 1 块 (374.3–869.8)×(346.7–358.0) 横贯缝 [622,639] | scene-S4b-*.json、F9 |
| A3 爆炸 | S6b 槽位边界重定向后 147 字符画出 56 块、y 175→863 整页 | scene-S6b-*.json、F10 |
| A5 角标 | 上标 a–f 各成单 span 独立块、微缝 gutter [40.02,41.58]@机构带 | inv-page1.json、F11 |
| 块表失守 | 页 4 blocks=5/gutters=[]、整页正文=1 flow 块 n=334、rotated 伪块 n=265 | inv-page4.json、F1 |
| 文本层对账 | 页 1/4 items 与 DOM 全文逐字符相等（3478/7274 字符）；§2.3 suspectGaps=0 | a1-row-audit.json、F7 |
| DOM 序倒置 | 页 4 倒置对 81924/225456=36%（列序）、页 1=11%（页顶 header） | F12 |

## 5. 修复单元规格与取舍（要素五）

### 单元 1（A4 正身：槽位解析）

①**mousedown 合成锚**：会话从非 span 授权点启动时，控制器在 mousedown 时刻
程序化置坍缩光标于几何投影位。取舍与风险：Chromium 的 mousedown 默认动作
（原生 caret 置位）在监听器返回后执行——若不 preventDefault，程序化写可能
被覆写回槽位；preventDefault 则抑制原生拖选扩展启动（选区扩展须由会话内
selectionchange→enforce 驱动）。**U2 义务：真机验证两路径**（Linux 本地真
输入栈）：(a) 仅写不阻默认——若默认动作覆写则 ① 对拖选期视觉失效，仅剩
② 的 selectionchange 修正（终局仍正确，拖选期首帧可能闪槽位区间）；
(b) preventDefault+写——若原生扩展被抑制，enforce 在每 selectionchange 投
影写（回声经 canonical signature 抑制，幂等）。两路径都不违反 INV-142③
「mousemove 只写 ref」（写发生在 selectionchange/enforce 路径，非 mousemove）。
红测试锚 ①：`selection-b1-a4-slot.test.ts` ①/①b（写断言不锁 preventDefault
——留给 U2 按验证结果定）。

②**enforce 槽位违例判定**：边界节点为 textLayer 容器元素槽位（itemOf=null
且 node 在 textLayer 内）→ 违例；focus 投影用 session.pointer、anchor 用
mousedown 原点（存入会话——现会话已有 originX/Y+pointer，需增 mousedown
本地坐标或复用 pointer 初值）；投影走 §2 新路径（带内最近盒按 x 距离）。
既有二值路径（F-SELBLK-01 受锁）零变。红锚：②（focus 槽位→投影回锚块，
终局 forward 覆盖拖拽内容）。

③**mouseup 链**：selection-events.ts onMouseUp 的 enforce×2 复用同一解析
（零新代码面——enforce 单点改动自动继承）；红锚：③ 保存链装配面
（effectiveRangeOf→rangeToAnchor 的 start=down 点偏移）。

**实施注记（U2，2026-11-21）**：
- 路径取 **a「仅写不阻默认」**（主控终裁 1）：mousedown 授权会话建立后，非
  span 授权点（textLayer 容器命中且不在 span 内）程序化
  `setBaseAndExtent(投影位, 投影位)` 置坍缩光标，不 preventDefault。
- 增补规格落地：enforce 在活动会话内收到**坍缩**选区且边界仍为 textLayer
  容器槽位（mousedown 默认动作覆写形态）→ 按同一新投影路径（`session.pointer`）
  重写坍缩光标；自写回声经 canonical signature 一次性消费抑制。
- 槽位新投影路径拆件 `interact/selection-slot-projection.ts`（`rowBandsOf`
  行带单源迁入，`projectCaretTo`=带内最近盒按 x 距离取最近字符边界）；
  `projectTo` 二值路径留在控制器内且行为零变。
- 会话字段追加 `textLayer`（容器槽位判定宿主）与 `down`（mousedown 本地
  原点——容器槽位 anchor 投影依据）。
- 红测试装配迁移（主控裁决 1(b)）：A4-③ 与 A3 两案改为经
  `createSelectionDragController` 复刻 S6b/S1save 真链——无会话的裸槽位形态
  在单元 1+2 落地后生产不可达（未授权 mousedown 被 preventDefault、授权
  mousedown 必有会话）；断言语义（start=down 点偏移/quote 不含起点前内容/
  区间 ⊆ 公式行字符数/块数 ≤3 且不出 y 带）逐字保持。

### 单元 2（A1 拦截语义恢复）

常规模式 mousedown 命中标注矩形（判别=`target.closest('[data-testid=
"annotation-rect"]')` 命中且 pageRoot 含）→ preventDefault（杀原生垃圾选区
链；Chromium 下 mousedown preventDefault 不取消 click——标注点击开菜单语义
保持，由既有 annotation-menu 测试链承载）+不启动会话。选择模式语义零变
（AnnotationLayer selectionMode 分支 rect pointer-events:none 恒不命中——
S5b 实证几何完美）。「加深不均」=绿标注与灰底叠色，**无代码修复**（非缺
陷，申报）。红锚：`selection-b1-a1-rect.test.ts`（preventDefault+垃圾选区
零改写；对照用例锁「页盒空白不 preventDefault」防过宽）。

**实施注记（U2，2026-11-21）**：
- 落点=**控制器 onMouseDown**（主控裁决 2 准许的偏差）：A1 红测直调
  `ctl.onMouseDown`，且设计 §2 态空间表本就把该行为归控制器；判别在
  textLayer 早退检查之前——`target.closest('[data-testid="annotation-rect"]')`
  命中且 pageRoot 含域 → `preventDefault()+session=null+return`。
  `selection-events.ts` 的事件序、S5 短路窗与 F-12 位移门语义零变。
- 选择模式语义零变（AnnotationLayer selectionMode 分支 rect
  pointer-events:none，本批不触）。

### 单元 3（A2 缝感知归并单源）

mergeRects 行簇内加 x 间隙断段：新语义=**每行每连续段至多一块**——行簇内
按 x 升序，相邻段间隙 > 阈值（与 baselineGroupBlocks 的 COLUMN_GAP 单源：
归一化域=max(COLUMN_GAP_H_FACTOR×段高, COLUMN_GAP_PAGE_RATIO×1)）断段；
交叠/重复/小隙并入语义保持（受锁 ②③⑤⑦⑩⑫⑬ 不冲突，逐案核对见 §7）。
bandsFromItems 的 x0/x1 同步按段分裂（每带=一栏一段）。paint/save 共用
（INV-58 同源保持——pending.anchor.rects 与 paint 同产链，零额外改动）。
红锚：`selection-b1-a2-gutter-merge.test.ts`（真 fixture 12 块+缝无覆盖+
bands 分段；mergeRects 直测大缝 2 块/小缝 1 块）。

**实施注记（U2，2026-11-21）**：
- `pdf-item-geometry.ts` 先拆件再改（设计 §6/主控范围硬边界）：G2 检测器
  `selectionHealth`+`ItemBox` 类型迁 `anchors/pdf-selection-health.ts`，
  原文件再导出保持既有导入路径零变（拆件后 pdf-item-geometry 470 行）；
  拆件零行为变更=pdf-item-geometry.test 24 用例绿。
- 断段单源=`splitRowByXGap`（baselineGroupBlocks 与 bandsFromItems 共用，
  阈值=max(COLUMN_GAP_H_FACTOR×行联合盒高, COLUMN_GAP_PAGE_RATIO×页宽)，
  严格不等号）；`annotation-merge.mergeRects` 行簇内同式断段（归一化域
  页宽=1，阈值行高=行簇中位段高）。行间钳制按行簇分组（同簇多段互不钳制，
  行底取该簇各段最大下缘）——单行单段时与原逐块钳制逐值同。
- annotation-merge.test ①~⑩ 与 F-V1 f/g 全绿（⑩ 间隙恰=阈值保持 1 块
  =严格不等号回归锚）；annotation-layer.test 10 用例绿（INV-E 读时归并
  存量语义继承，无额外改动）。

### 单元 4（A3 覆盖论证）

偏移爆炸由单元 1 覆盖：边界经槽位解析成为正确文本位后，snapBlankBoundary
只处理真空白标记（其既有语义正常——F-A10 受锁链不动）。公式碎片矩形本身
可接受：验收=不漏已选字符（项几何链覆盖选区字符，F10 已证）+无与选区无关
孤块。红锚：`selection-b1-a3-formula.test.ts`（区间 ⊆ 公式行字符数+块数
≤3 且不出公式行 y 带）。**待判点（呈主控）**：若 U2 实测发现仍有槽位之外的
空白标记重定向越界形态（如真空白标记盒距选区极远），再议 snapBlankBoundary
视觉距离钳制——本稿不预置该改动（无独立复现证据）。

**实施注记（U2，2026-11-21）**：
- 无独立代码：A3 的偏移爆炸由单元 1 槽位解析覆盖。真机复放（S6b 形态、
  非 span 起点）终局坍缩零选区、零灰底（修前 147 字符/56 块整页灰底），
  snapBlankBoundary 未触（主控终裁 4：无独立复现证据不预置钳制）。
- A3 两红测试按主控裁决 1(b) 改经 `createSelectionDragController` 装配，
  断言面（区间 ≤12 字符/块 ≤3/不出公式行 y 带）逐字保持。

### A5（无专项代码）

微缝不授权+上标独立块=设计语义（F11）；S7 垃圾链由单元 2 消。回归锚=
`selection-b1-a5-superscript.test.ts`（正/反向拖选与 focus 落上标三案，
现产品代码实测**绿**——如实记录；U2 后必须保持绿）。

### 单元 5（绘制链修复：probe2 定谳 M1 根因双形态+M2 直接画手+M4 放大器）

probe2 干净态复探定谳（note.md §3/§4）：A5a 漏行=M1 拆行+M3 再并+M2 错带
夹杀三段组合；G5f 双绘=M1 链行（根）→ M2 带几何重绘（直接）→ M4 校准放大。
两症状共同根=groupByBaseline 的 vTail 传递链与容差漂移拆行（同件双形态）。
修复面按证据支撑度排序，规格如下。

**5a groupByBaseline 断传递链+碎片并入（M1 两形态共治）**：

- 簇界判据改「行锚」：按 vProj 升序遍历，`box.vProj − 簇首成员 vProj > tolPx`
  即断簇（旧实现与上一成员 vTail 比距——`last.vTail = box.vProj` 传递更新是
  跨行距攀爬的机制本体：链行 vSpread 14.23px>行距 10.44 的成因）。锚取**首
  成员**而非簇内中位：两者对本批两形态判别力逐值等价（probe2 链行第三成员
  484.6−锚 478.66=5.94>tol 3.985 即断，中位锚同断），首成员锚无随簇增长的
  动态基准（中位随每次并入重算，行为更难推理）且为 O(1) 读——取更简者。
- tol 语义零变：仍=max(2, 0.5×被选项 fontH 下中位)。拆行面（A5a）的触发
  开关是 tol 随被选项字高中位漂移——但漂移本身是「同行基线抖动容忍」的合理
  语义，缺陷在比较基准不在阈值：行锚断链后链行消失，拆行形态交给碎片并入
  治理，不另设 vSpread 上界（与碎片并入重复治理且引入新常数，裁否）。
- 碎片行并入（拆行侧治理）：行内**全**成员 fontH < 全局行主导字高（被选项
  fontH 最大值）×FRAGMENT_HEIGHT_RATIO(0.85) 的簇=碎片行；碎片行并入「y 包
  络重叠 >0 且 x 净空最小」的正文行（多候选取 x 净空最小——A5a sup 与正文
  同 x 域 gap 1.5px、G5f 链行碎片与邻行 x 交叠，两形态同判）。无 y 重叠候选
  → 该行保持独立（合法 caption/图注小字行与正文行 y 不重叠=天然豁免）。
  0.85 依据：实测碎片比值簇=G5f 5.58/7.97=0.70、A5a sup 4.46/6.376=0.70、
  R1 夹具 6.5/8=0.8125；正文行恒含主导字高成员（行内最大 fontH=全局主导
  本身）结构性不满足碎片判据——取值区间 (0.8125, 1.0) 内定 0.85（下界=
  实测最大碎片比值×1.046 余量；上界 1.0=正文行结构性排除，合法小字行〔如
  图注〕的零误伤由「无 y 重叠候选不入并」承担而非本阈值）。
- 同源保持（INV-58）：groupByBaseline 同时喂 baselineGroupBlocks（rects）与
  bandsFromItems（bands）——修复后两者同步变，单源条款自动保持，INV-58 无
  需修订（§8 申报确认）。
- 行数政策：5a 重写 groupByBaseline（13→~45 行）+碎片并入使 pdf-item-geometry
  现值 469 行必然越 500——**先拆后改**：碎片行并入判别拆独立件
  `anchors/baseline-fragment-merge.ts`（≤80 行），pdf-item-geometry 保持
  ≤500（与单元 3 拆件先例同款政策）。
- 变异验证（2026-11-21，文件备份法）：行锚断链+碎片并入原型落 src 变异 →
  R1/R2 红测试转绿+受锁面 26 文件 242 用例全绿（含 pdf-item-geometry.test
  24 用例零改全绿——既有夹具全部单基线行，行锚 vs vTail 判别零差异；碎片
  并入门对全部既有夹具零触发）。备份还原 diff 空。

**实施注记（U3，2026-11-21）**：
- 落地形态：groupByBaseline 重写为行锚断簇；碎片并入判别拆件
  `anchors/baseline-fragment-merge.ts`（FRAGMENT_HEIGHT_RATIO=0.85 与并入
  判别随件，wc -l 78≤80）；pdf-item-geometry 469→478。R1/R2 红测试转绿，
  pdf-item-geometry.test 24 用例零改全绿（回归锚兑现）。
- 实现细节两处（规格内细化）：①x 净空=max(0, max(fragX0,bodyX0)−
  min(fragX1,bodyX1))（x 交叠=0；平局取输入序先者=vProj 靠前行）；②并入
  目标评估集=原始正文行（评估先于合并——多碎片互不影响目标选择），输出行
  序=输入行序，碎片成员追加不排序（下游并块/分带均 min/max 聚合，不敏感）。

**5b 异常带护栏（M2 直接画手+M4 放大器）**：

- 判据：**派生**垂直域高 > BAND_GUARD_ROW_RATIO(1.3) × 行主导字高 → 该带
  为异常带（跨行链带/两行并集形态），matchBand 拒用**整条带**（含 calTop/
  calBottom 校准域）→ SelectionPaint 与 rectStyle 两消费点回退 rect 自身
  y/h（INV-D 钳制保证回退几何不重叠）。1.3 依据：合法带派生比值簇实测
  ≤1.08（单行带高≈fontH：A9 β 面 0.61/18px 面 1.0/单元 3 后 A5a 行联合
  8.6/8=1.08），异常面实测 ≥1.73（G5f 链带 21.9/7.97=2.75、R1 夹具两段
  1.94/1.73）——阈值区间 (1.08, 1.73) 取 1.3，两侧余量 ≥1.2×/≥1.3×。
- **判据用派生域而非校准域**（受锁面实证裁决）：校准合法拉伸（A9/D1 面：
  span 盒并集可达派生域 1.6×）不得触发拒带；M4 校准放大以「派生域已跨行」
  为先决条件（校准窗只在带域内收 span——带域跨行才会收进两行 span），派生
  域异常即拒整带 → M4 被传递治理，无需另改 band-calibrate。
- rowFontH 单源：RowBand 增可选 `rowFontH`（bandsFromItems 派生时随带记录=
  行段成员 fontH 最大值/base.h 归一化）；档2 bandsForTextNodes/档3
  bandsNearRects 不记录 → rowFontH 缺席=无此判据（回退语义零变——受锁
  selection-paint a1/a2、band-calibration 手造带逐案核对见 §7）。护栏语义=
  「异常带不驱动任何渲染」：matchBand 是 SelectionPaint（selection-paint.tsx
  :69）与 AnnotationLayer（AnnotationLayer.tsx :136）的共同匹配单点，两消费
  面同门成立。
- 变异验证：同 5a 批次——护栏原型（含派生域判据定稿）落 src → 全绿；中间
  形态（判据用校准后域）实测红 selection-flicker D1 zoom2 校准面（合法拉伸
  1.6×被误拒）→ 判据定稿为派生域。

**实施注记（U3，2026-11-21）**：
- 常量落点：BAND_GUARD_ROW_RATIO=1.3 驻 annotation-resolve（matchBand 唯一
  消费点——§6 预算表 geometry-types 只列 RowBand.rowFontH 字段 +1 行，判据
  常量随消费面单点；5c 的 BAND_CLAMP_SQUEEZE_RATIO=3 同政策驻
  annotation-style）。
- rowFontH 归一化=行段成员 fontH 最大值/base.h（与带 top/bottom 同域，判据
  直接比较 (bottom−top) > 1.3×rowFontH）；判据独立函数 isAbnormalBand
  （rowFontH 缺席或非正=无此判据）；拒带形态=matchBand 返回 undefined（不
  尝试次近带——规格语义=拒用整条带），SelectionPaint/AnnotationLayer 两
  消费面经同一返回值回退 rect 几何，零额外改动。
- 行数实测：annotation-resolve 413→431（判据函数+注面，≤500）；annotation-
  style 120→133（≤220）；geometry-types 103→107（RowBand 字段+注）。
- calibrateBands 以 `{...b, calTop, calBottom}` 展开透传 rowFontH——校准链
  不丢字段，护栏在 matchBand 判据面恒可得档1 rowFontH（零改动实证）。

**5c clampedHorizontal 禁压缩（M2 水平面）**：

- 判据：`r.w > BAND_CLAMP_SQUEEZE_RATIO(3) × (band.x1 − band.x0)` → 带水平
  域不可能是该 rect 本体的文字域，用 rect 自身 x/w 原样（夹取只允许收窄越界
  端，不把宽 rect 压进窄带）；比值 ≤3 → 既有夹取语义零变（部分越界一端收窄
  保持——受锁 selection-paint a2 锁定）。3 的依据：合法比值簇实测 ≤1.5
  （a2 行盒噪声面 1.33、A9 β 面、档1 band 端点与 rect 同源=1.0），错带压缩
  面实测 86×（A5a 261px rect/3px 带域）——区间 (1.5, 86) 取 3，两侧余量
  2×/28×。
- ⊇ 包含判据裁否：初稿「rect ⊇ 带域 → 用 rect 原样」被受锁 a2 实测否定
  （a2 夹具 rect [0,0.667] ⊇ band [0.167,0.667]，⊇ 规则误放行破坏锁定语义）
  ——改比例判据。
- 5c 无独立红形态：R2 的零覆盖由 5a（拆行消失→杂交材料消失）或 5c（夹杀
  被禁）任一修复即转绿——申报 5c 为「同形异因」防线，不另立红测试。
- 变异验证：同批次——比例判据原型落 src → 全绿（⊇ 初稿实测红 a2 → 定稿
  比例判据）。

**实施注记（U3，2026-11-21）**：禁压缩门落 clampedHorizontal 内、端点缺省
判据之后夹取之前（r.w > 3×(band.x1−band.x0) → rect 原样）；受锁 a2 面
（rect/带宽比 1.33）与档1 同源面（比值 1.0）实测零变——selection-paint.test
17 用例零改全绿。A5a 真机复放正文行覆盖出现（见 §10.2 真机段）。

**5d mergeRects 行簇口径（M3 次因）——裁不做**：M3（centerY 再并成杂交
rect）的材料=M1 拆开的 sup/body 两行；5a 治本后拆行消失→无再并材料（R2
夹具变异验证：5a 后每机构行恰一块、杂交形态不复存在）。mergeRects 的
INV-A~D 输出面本就成立（probe2 全部手势 rect 两两不重叠、逐行至多一块）
——再做行簇口径收紧=无缺陷形态的过度工程，裁不做，零代码。申报：M3 的
治理证据由 R2 夹具在 5a 修复后的形态承载（§10）。

**5e matchBand 候选带行一致性门（B-1 回炉：错行绑带治理，2026-11-22 增补）**：

独立审查定谳（b1-review-s4b-coverage.mjs + 修后裁剪图）：S4b 手势修前仅
ri6 未达逐行覆盖门，修后 ri4/ri7/ri50 三行未达（ri7=完整选中正文行零灰底、
下一行「values respectively…」有灰底——本行漏绘+邻行同带双绘）。U3 真机
12 断言只查缝覆盖与分块、未查逐行覆盖=申报与断言双遗漏。机制（rework 诊断
diag-s4b-blocks/trace/gates 实测，仓外 b1-probe2/rework/）：S4b 公式密集区
行块高（11.8px）> 行距（10.4px）→ mergeRects 行间钳制（INV-D 只下推）把
rect 逐行级联下推（实测最大 +27.5px）；matchBand 最近中心窗（|Δcenter| ≤
rect.h——F-A5 既有受锁语义，本批不动）把下推 rect 绑到**邻行带**：
rect13（块[244.07,255.65] 下推至 [271.55,283.13]）距 band15（ri8 带
[276.33,284.3]）中心 2.97px、距本行 band14 中心 5.56px → 绑 band15。同一
机制两症状：本行漏绘+邻行同带双绘。

- **判据（bandRowConsistent，候选过滤——匹配键/窗/护栏次序零变）**：候选带
  须 rect 与带垂直域**正重叠**（全档；零重叠带不得经最近中心窗吸附）**且
  档1（rowFontH 在场）须 rect.top ≥ band.top**。档1 依据=产链结构关系：
  rect 块与带同源（groupByBaseline 同一行簇——baselineGroupBlocks 块垂直域
  与 bandsFromItems 带垂直域逐值同）+mergeRects 行间钳制只下推 → 跨行错绑
  （下推 rect 绑邻行带）的候选带 top 高于 rect.top，被本门排除。已知边界
  （review2 N-1）：mergeRects④ 行内多成员中位归并（同中心混合字高形态）可
  令 rect.top 高于同源带 top 亚像素级（探针实测 0.25px）——该形态同源带被
  过滤后重选同中心满足不变量的带，视觉差亚像素级且无漏绘/双绘（回归锚=
  selection-b1-rw-crossband ⑧）。
  无一致候选 → undefined 回退 rect 自身几何（与 5b 拒带同路径）。
- **为什么不用重叠量阈值**（实测区间）：修后缺陷绑定 rect13→band15 的重叠
  =6.8px=0.85×带高；同区合法绑定 rect16→band16（本行带）重叠=7.12px=
  0.89×带高——任何阈值 t 要拒前者须 t > 6.8px、要留后者须 t ≤ 7.12px，
  区间 (6.8, 7.12] 仅 0.32px 宽且随 zoom/base 尺度漂移，无稳健判别面。结构
  判据（rect.top ≥ band.top）零常数覆盖全部分析形态：rect13（top 271.55 <
  band15.top 276.33）拒、rect16（top 302.86 ≥ band16.top 302.01）留。
- **档2/档3 不启用顶界门**：行盒（rect）与字形带存在结构性偏移（行盒 ⊇
  字形带——selection-paint a1 实测 rect.top 高于带顶 1px@800）不满足该
  不变量；档2/档3 无钳制级联下推形态（无档1 同源钳制链），B-1 形态未在
  该两档观测。垂直重叠门全档适用（a1/a2/档3 面的 rect 与带均正重叠，
  实测零触发）。
- **与 5b 正交**：5b 治异常带（跨行链带不驱动渲染），本门治正常带错行绑带
  （正常带被错配时拒配不拒带——带本身可被其它 rect 合法消费）。
- 红测试：`selection-b1-rw-crossband.test.ts`（链级漏绘+同带双绘 2 用例+
  纯 matchBand 零重叠邻带/顶界高于带顶 2 用例+档2 零变锚 2 用例+夹具
  自证 1 用例）——修前 4 红（①②④⑤），修后 8 绿；M5 删门变异 5 断言红。
- 变异验证（备份法）：M1 恢复 vTail（chain-paint ⑤ 红：带数 1≠2——同段
  跨行桥接夹具判别面）+M2 删碎片并入（chain-paint ④ 红 4≠2+affil W-1 红
  6≠3）+M3 删 5b 护栏（chain-paint ① 红 −3.499848，新门不遮蔽）+M4 删
  origin（slot-column 红）保持红证；M5 删本门（crossband ①②④⑤⑥a 5 红）。
  还原逐文件 diff 空。
- 真机复证（xvfb，rework probe）：S4b 逐行覆盖 oracle（全 fullyIn 行
  rectCount ≥1）+审查者脚本 A/B 终态核验——读数见 §10.4。

**实施注记（RW，2026-11-22）**：落点=annotation-resolve matchBand 候选循环
加 bandRowConsistent 过滤（+29 行 431→460 ≤500）；bandVertical/clamped
Horizontal/合并链零触。INV-180 增补 ④⑤ 条款（同批回写 docs/invariants.md）。
W-1 断言：chain-paint ④（既有夹具产物计数——M2 判别面）+⑤（同段跨行桥接
手造夹具——M1 判别面）+affil-paint 行分组产物锚（M2 判别面 6≠3）；注：
chain-paint 既有夹具左右段 x 分裂使 vTail 产物与行锚逐值同（变异实测），
M1 判别面由 ⑤ 同段桥接夹具承载。

### 单元 6（中缝终点投影同域约束：巨块无栏表时的 A4 中缝条款兜底）

probe2 定谳（note.md §1 注）：G5（左栏 span 起→中缝带终，用户原始手势形状）
在页 4 巨块（F1 已知边界：blocks=5/gutters=[]——detectGutter 塌陷）上，
enforce 槽位投影 `projectCaretTo`（带内最近盒按 x 距离）把 focus 吸到右栏
远端（"MAE"，选区 3582 字符横跨左栏下半+右栏顶部）——违反 plan §3.2-A4
「选区只能向拖拽方向覆盖目标段」中缝条款。巨块形态下授权层的 in-gutter
防线（INV-178④ 依赖块表 gutter 表）失守，投影层承接。

**projectCaretTo 同域约束**：

- 触发门：指针未命中带内任何盒（`xGapTo > 0` 对带内全体成立——缝带悬停/
  栏外空白形态，G5f 释放点 x=631 ∈ 缝 [622,639] 即此形态）**且** origin
  （mousedown 原点）在场 → 候选集收窄。
- 收窄集=带内与「origin 命中盒」x 域重叠 >0 的盒；origin 命中盒=origin.x
  落入其 x 域的带内盒（origin.y 所在带内取——与指针同带；origin 未命中任何
  盒（a4-slot ① 页边形态）→ 取距 origin.x 最近盒为域锚）。收窄集空（指针
  y 所在带内无 origin 同域盒——如拖出锚栏行带末端的下方带）→ 降级=现状全
  带最近盒（巨块极端形态不崩、无选区丢失）。
- 指针命中盒内（xGapTo=0）→ 收窄门不触发，现行为零变——**与 F-VISFB-52
  「跨双栏需指针明确入栏授权」相容**：指针 x 落入对栏盒=明确入栏，合法跨栏
  投影保持（probe2 G2f/G2r 跨栏手势 selLen 313/696 正确、selection-flicker
  D1 跨栏钳制链实证）；指针未落入任何盒（缝带/空白）=未明确入栏 → focus
  不得越过缝带投向对栏——即 A4 中缝条款的投影层表达。
- ε 平局取 down 同侧方案裁否：缺陷形态非平局（最近盒判据把缝带释放点稳定
  送向近栏缘盒，沿带传播成远端区间），ε 只覆盖等距退化且引入跨 zoom 需校准
  的新常数；同域约束以「域」代「距」，零新常数覆盖全部缝带形态——取同域。
- 签名：`projectCaretTo(items, x, y, origin?)` 增可选 origin；控制器
  projectSlot 传 `session.down`（anchor 路径 origin=down 自身，收窄自洽）。
  projectTo 二值路径（F-SELBLK-01 受锁）零触。
- 变异验证（同 5a 批次）：同域约束原型落 src → R3 红测试转绿+对照用例
  （指针入栏合法投影）保持绿+受锁 a4-slot 四用例零改全绿。

**实施注记（U3，2026-11-21）**：
- 签名落地 `projectCaretTo(items, x, y, origin?)`；控制器 projectSlot 单点
  改传 `session.down`（anchor 路径 x/y=down 自身——down 命中盒内 xGapTo=0
  门不触发，收窄自洽行为零变）；projectTo 二值路径零触。
- 实现细节（规格内细化）：①域锚回退（origin 未命中任何盒 → 取距 origin.x
  最近盒）平局取 x 更小盒（阅读序）；②收窄判定域=指针 y 所在带（bandAtY
  单源——origin 命中盒与收窄集均在该带内取，与规格「origin.y 所在带内取
  ——与指针同带」一致）；③收窄集空降级=全带最近盒（候选集引用不变）。
- 行数实测：slot-projection 104→128（≤220）；drag-controller 375→378
  （≤400，仅 projectSlot 一行+注）。
- 真机复放（见 §10.2 真机段）：G5f 终局 focus=左栏行尾、selLen 38（修前
  右栏远端 3582）；指针明确入右栏对照保持绿。

## 6. 行数预算表（plan §3.3 对齐；现值=2026-11-21 实测 wc -l；单元 5/6 增补行按同口径实测）

| 文件 | 现值 | 预算 | 触碰政策 |
|---|---|---|---|
| interact/selection-block-layout.ts | 279 | ≤380 | 单元 1/5/6 不触（授权面零变） |
| interact/selection-drag-controller.ts | 375 | ≤400 | 单元 6 仅 projectSlot 传 origin 一行+注；本件保持 ≤400 |
| interact/selection-slot-projection.ts | 104 | ≤220 | 单元 6 主落点：projectCaretTo 增 origin 可选参+同域收窄（+~14 行） |
| interact/selection-effective-range.ts | 121 | ≤220 | 不触（docOrderPair 语义零变——读序不翻案） |
| interact/release-affinity.ts | 210 | ≤300 | 不触（全场零触发，候选③排除） |
| interact/selection-evaluate.ts | 447 | 拆件 | 不触（保存链由单元 1 覆盖；M4 校准由单元 5b 在 matchBand 传递治理——evaluate 零改） |
| anchors/pdf-item-geometry.ts | 469 | 先拆再改，≤500 | 单元 5a 触 groupByBaseline——重写+碎片并入约 +32 行必越 500：**碎片行并入判别先拆新件**（下行）再改 |
| anchors/baseline-fragment-merge.ts（新件） | — | ≤80 | 单元 5a 拆件承载：碎片行判别（行主导字高/FRAGMENT_HEIGHT_RATIO 0.85）+y 包络重叠 x 净空最近并入 |
| anchors/annotation-merge.ts | 216 | ≤300 | 单元 3 已落（行簇内断段）；单元 5d 裁不做零触 |
| anchors/annotation-resolve.ts | 460 | ≤500 | 单元 5b（护栏 +8）+单元 5e（bandRowConsistent 行一致性门 +19——B1 回炉）：431→460 在 500 内 |
| anchors/annotation-style.ts | 120 | ≤220 | 单元 5c：clampedHorizontal 增禁压缩门（+~6 行） |
| anchors/annotation-band-calibrate.ts | 119 | 不触 | M4 放大由 5b 派生域拒带传递治理——本件零改 |
| anchors/geometry-types.ts | 103 | ≤150 | RowBand 增可选 rowFontH（+1 行——5b 单源字段） |
| anchors/anchor-blank-snap.ts | 372 | 只按证据触碰 | 不触（单元 4 覆盖论证成立） |
| view/TextLayer.tsx | 156 | ≤240 仅漏渲染时改 | **不动**（探针 F7 已证无漏渲染） |
| tests/utils/pdf-factory.ts | 432→517（U3 配方已落） | 新增配方 | 已落三配方（单元 1）+两配方（单元 5/6：createFormulaChainPdf/createSuperscriptSplitPdf） |

## 7. 受锁面迁移清单（单元 1–4 段=U1 交付、U2 已按此迁移落地；单元 5/6 段=U3 增补，后续实现批次触碰时按此迁移）

- INV-37/58/142/170/178 测试链（selection-block-layout 253 行/selection-
  drag-controller 545/release-affinity 253/selection-evaluate 485/
  annotation-merge 231/selection-paint 507/selection-layer-f52 195/
  selection-layer-fa12 130/selection-flicker+item-chain/pdf-item-geometry
  360+e2e selection-twocol 591+reader-text 1299）——本单元全部零改（基线
  171 用例全绿实测）。
- annotation-merge.test 既有断言 vs 新语义逐案核对（单元 3 INV-B 修订的受锁
  冲突清单）：①零宽滤除/⑥单块恒等/⑨排序——无行内多段输入，不冲突；②
  同行两块**交叠**（0.30–0.55 与 0.35–0.55 x 交叠）——连续段，断段阈值不
  裂，不冲突；③同位重复/⑤行 1 五块（x 全交叠成链 0.10–0.55 连续）/⑦⑫
  同夹具幂等/⑪与 F-V1 f·g（紧行距跨行不并——非行内断段面）——不冲突；
  **⑩边界声明**：混排字号同行两块间隙恰=0.02=页宽比阈值（0.22→0.24）——
  断段判据须用严格不等号（gap>阈值才裂），⑩ 保持 1 块输出（U2 实现须以
  ⑩ 为回归锚验证）。**冲突清单=空**。新语义用例落新文件
  `selection-b1-a2-gutter-merge.test.ts`（本单元已落红）+小缝恒 1 块对照
  （锁「连续段」不误裂）。
- e2e：`selection-b1-red.spec.ts` 三案 test.skip（本单元只写不跑；跳过标记选用
  test.skip 以合规 repo 占位标记门禁）——U2
  转绿激活时按 INV-170② 申报 CI 合成输入栈退化形态（A4-①/A1 断言面=
  mousedown 行为本身，与「选区产生程序化写」正交，激活时必要工况本地真
  输入栈承载）。

**实施注记（U2，2026-11-21）**：三案已激活并去掉 test.skip。按主控终裁 5，
mousedown 一律用**合成事件**（page.evaluate 内 dispatchEvent），断言面=
`defaultPrevented` 与随后程序化写出的选区形态；选区状态断言程序化写
（INV-170②）。本地 xvfb 真机复放读数（非合成输入栈）=u2-note §五。
A1 案种入标注的 page 取 0（0 基存储——INV-24）。

**单元 5/6 受锁面逐案核对（U3，2026-11-21；变异原型全绿实证=§5 单元 5/6 注）**：

- `pdf-item-geometry.test`（24 用例，5a 面）：全部夹具为单基线行或行内 vProj
  恒等——行锚 vs vTail 判别逐案零差异；碎片并入门对全部夹具零触发（无
  「全成员字高<0.85×主导」的簇；旋转页三行夹具行内单成员）；tol 断言
  （`toBeCloseTo(5)`）语义未动。变异原型实测 24 用例全绿零改。
- `selection-b1-a2-gutter-merge.test`（5a 面）：gapcol 行内同基线——分组判据
  零差异；断段单源 `splitRowByXGap` 零触。实测绿。
- `band-calibration.test`（5b 面）：手造 RowBand 字面量无 rowFontH → 无护栏
  判据（回退零变）；A9 β 面派生域 4.9/8=0.61、18px 面 1.0、D1 校准面派生
  1.0——全在 1.3 下；**护栏判据用派生域而非校准域正是本文件 D1 zoom2 校准
  面的裁决依据**（校准拉伸 1.6×合法，不判）。实测绿。
- `selection-paint.test`（5b/5c 面）：a1 档2 带（bandsForTextNodes 无
  rowFontH）→ 零变；a2 水平夹取——rect/带宽比 1.33 < 3 → 夹取语义零变
  （⊇ 初稿判据在此红、比例判据定稿后绿——§5 单元 5c 裁决记录）。
- `selection-item-chain.test`（5b 面）：档1 单行带比值 1.0 → 零变。
- `annotation-layer.test`（5b 面）：档3 bandsNearRects 无 rowFontH → 零变。
- `selection-flicker.test` D1（5b/6 面）：控制器钳制走 projectTo 二值路径
  （零触）；paint 面为 A9 校准合法拉伸（派生域 1.0）→ 零变。中间形态
  （校准域判据）在此红——定稿判据的实证依据。
- `selection-drag-controller.test` 20 用例 + `selection-b1-a4-slot.test` 四用例
  （6 面）：③⑧⑩ 等违例钳制走 projectTo 二值路径零触；a4-slot ①/①b down
  点页边零命中盒 → 域锚=最近盒 → 单栏夹具候选=全带（零差异）；②/③ down
  命中盒域=锚块域=全带（零差异）。变异原型实测零改全绿。
- `selection-evaluate.test`/`selection-layer-f52`/`selection-drag-fixture`/
  `anchor-item-verify`/`annotation-anchor`/`annotation-merge.test`：不触上述
  任何判别面（evaluate 零改、anchor 零改、merge 零改）。
- e2e：`selection-twocol`/`reader-text` 的选区面走真页几何——单元 5a/5b 落地
  后公式密集区的 paint 从带几何回退 rect 几何（预期视觉改进），激活时按
  INV-170② 申报并在本地真机复核「双绘条纹消失、正文行覆盖出现」（b1-probe2
  shot/crop 留档为修前基线）；U3 红测试为单测面，e2e 不新增。

**单元 5e 受锁面逐案核对（RW，2026-11-22；变异实测全绿=§5 单元 5e 注）**：

- `band-calibration.test`（5e 面）：matchBand 直测两用例——cal 替换面 rect
  [142,146.9] 与目标带 [142,146.9] 全域重叠（重叠门零触发）；cal 缺席面
  rect [0.2,0.25] 与带 [0.2,0.25] 同域（零触发）。手造带无 rowFontH → 顶界
  门不启用。实测绿。
- `selection-paint.test` a1/a2（5e 面）：档2 带（rowFontH 缺席）→ 顶界门
  不启用；rect 行盒 [200,220] 与字形带 [201,217] 正重叠 16px → 重叠门零
  触发。实测绿。
- `selection-item-chain.test`（5e 面）：档1 同源带——rect 与带同域（重叠
  满窗+rect.top == band.top）→ 零触发。实测绿。
- `selection-flicker.test` D1（5e 面）：A9 校准合法拉伸——rect 与派生带同源
  同界（顶界门 rect.top == band.top 零触发）。实测绿。
- `annotation-layer.test`（5e 面）：档3 bandsNearRects（rowFontH 缺席）→
  顶界门不启用；量测面 span 与 rect 双向重叠预筛（bandsNearRects 只收与
  rect 重叠的 span）→ 重叠门零触发。实测绿。
- `pdf-item-geometry.test`/`selection-b1-a1~a5`/`selection-b1-u3-slot-column`/
  annotation-merge/selection-drag-controller/selection-evaluate 等：不触
  matchBand 判别面（分组/授权/投影/保存链零改）。实测绿（全 renderer
  266 文件 2918 用例）。

## 8. INV 修订清单（同批回写 docs/invariants.md——U2 落地时；单元 5/6 行为 U3 增补）

| INV | 修订 | 依据 |
|---|---|---|
| INV-40（=mergeRects INV-B） | 「每行文字至多一块」→「每行每连续段至多一块」（连续段=行簇内 x 间隙 ≤ COLUMN_GAP 单源阈值；交叠/重复/小隙并入保持） | 单元 3；S4b 实测 1 块盖缝 |
| INV-142③ | 钳制违例判据补「textLayer 容器元素槽位边界=违例（itemOf=null 且 node 在 textLayer 内），focus 按 session.pointer、anchor 按 mousedown 原点投影（新投影路径=带内最近盒按 x 距离；projectTo 二值路径行为零变）」 | 单元 1-②；S1a |
| INV-178③ | 「不可解析边界仍不判违例」收窄为「页外/工具条等真不可解析边界」；textLayer 容器槽位自本批起为可解析违例 | 单元 1-②；F2/F3 |
| INV-178/142 新增（随单元 2） | 常规模式 mousedown 命中标注矩形（pageRoot 内）→ preventDefault+不启动会话；选择模式矩形 pointer-events:none 恒不命中 | 单元 2；F6/S5/S7 |
| INV-179（新增，随单元 5a） | 基线行分组判据=行锚（簇首成员 vProj）比距+碎片行（全成员字高 < 全局主导×0.85）按 y 包络重叠+x 净空最近并入正文行；vTail 传递链判据废除；tol=max(2,0.5×被选项 fontH 下中位) 语义零变 | probe2 §4 链行 vSpread 14.23>行距；§3 拆行 2.835>tol 2.230；变异验证 §5 |
| INV-180（新增，随单元 5b/5c；B1 回炉增补 ④⑤ 条款） | 异常带不驱动任何渲染（matchBand 单点双消费面）：bandsFromItems 随带记录 rowFontH（行段成员 fontH 最大值/base.h）；**派生**域高 > 1.3×rowFontH → 拒用整带（含 cal 域）回退 rect y/h；rowFontH 缺席（档2/档3）无此判据=回退零变；clampedHorizontal 对 r.w > 3×带宽 → rect 原样（禁压缩，部分越界夹取保持）；**④候选带行一致性门（bandRowConsistent）：rect 与带垂直域正重叠（全档）+档1 rect.top ≥ band.top（档1 产链同源同界+钳制只下推的结构不变量；档2/档3 行盒 ⊇ 字形带结构性偏移不启用顶界门）；无一致候选 → undefined 回退 rect 自身几何；⑤过滤后匹配次序（最近中心→窗→护栏）与匹配键零变** | G5f 双绘 7.94px；A5a 夹杀 86×；B-1 错行绑带（S4b ri4/ri7/ri50 漏绘——rect13 绑邻行带重叠 0.85×带高 vs 合法绑定 0.89×，量阈值无判别面）；受锁面逐案核对 §7（单元 5e 段）；变异验证 §5 |
| INV-181（新增，随单元 6） | 槽位投影同域约束：指针未命中带内任何盒且 origin 在场 → 候选收窄为 origin 命中盒 x 域重叠盒（收窄集空降级全带最近盒）；指针命中盒内=明确入栏、现行为零变（F-VISFB-52 授权语义不收紧） | G5f focus 远端投影 3582 字符；plan §3.2-A4 中缝条款；变异验证 §5 |
| INV-58 | **无需修订**（同源条款不动——单元 5a 行分组变化经 rects/bands 共用 groupByBaseline 自动同源；单元 5b/6 不改 rects 产链）；申报确认 | 单元 3/5a |
| INV-68 | 无条款修订；band 派生随带新增可选 rowFontH 字段（档1 独有——档位绑定语义不破，禁第四推导条款不动）随 INV-180 同批申报 | 单元 5b |
| INV-170 | 无修订；e2e 红用例激活时按 ② 申报 | §7 |

## 9. 已知边界（要素六；均另立票建议，不在 B1 范围；8–10 为单元 5/6 增补）

1. **rotated 误判面**：`h > 3×w` 把逗号/连字符/空白 span/斜体 t/w=0 数学帽符
   判竖排（页 1 n=83、页 4 n=265）——从行带/块聚类消失，参与塑造页 4 巨块。
2. **页 4 块表无中缝**：整页双栏正文=1 flow 块 n=334（上下标跨行桥接致
   detectGutter 塌陷）→ F-SELBLK-01 钳制在双栏论文正文失效面（授权/钳制层
   无防线；单元 3 修复面=几何单源不依赖块表，但块表本身失守另立票）。
   **单元 6 增补**：巨块形态下的槽位投影面由同域约束兜底（R3+对照用例），
   块表失守本身仍另立票。
3. **docOrderPair 的 DOM 序 vs 视觉序倒置**（页 4 列序 36%/页 1 header 11%）：
   读序语义正确不翻案；但任何残留槽位/翻转边界经它放大成跨栏/跨页大区间
   （S4b selLen=3492/S7 3037 字符的放大器）。单元 1 消其输入后此边界退化为
   观感项（跨栏拖选 toString 按列序）。
4. **真实页 4 缝临界**：实测缝 17px vs 断段阈值 ~16.5px——单元 3 单源断段
   对真实页 4 是否实际裂缝须 U2 用真文献实测复核；若仍 ≤阈值需阈值校准
   决策（pending ruling，见 u1-note）。
   **U2 实测结论（2026-11-21）**：真实页 4 S4b 复放裂缝成立——同一视觉行
   分为两块（左 374.33–621.63、右 639.59–869.78），缝 [622,639] 覆盖块=0；
   实测缝 17.96px > 实测阈值 max(1.5×7.97, 0.02×595.28)≈11.96px。
   `COLUMN_GAP_*` 常量未改。
5. **A5 微缝与角标独立块**：设计语义（该点不授权=防误锚；独立块=机构行
   与角标分属不同文本块）；无专项代码。
6. **「加深不均」两源分立（probe2 定谳修订）**：①真缺陷源=bandVertical 用
   互不重叠 rect 的**交叠带**渲染（G5f 双绘条纹 7.97px，亮度 163≈0.36 层
   实测）——单元 5a/5b 治（R1）；②非缺陷源=绿标注与灰底叠色（rgba 叠加）
   ——维持无代码修复结论。
7. **公式碎片矩形**：上下标基线/字号分离的碎片块形态可接受（验收=不漏已
   选字符+无孤块）；碎片并块 aesthetics 不在范围。
8. **M4 校准放大的治理边界**：5b 拒带判据在**派生域**——「派生域正常而校准
   后异常」的形态（合法 A9 拉伸 vs 异常拉伸无几何判别面）不设防；观测面
   （probe2 全部手势+A9/D1 受锁面）中该校准异常形态零出现，立案条件=真实
   复现证据。
9. **快慢帧叠影不存在**（probe2 定谳）：13 手势 mouseup 后 paint 帧数=0，
   setPaint 为整层替换非叠涂——结构性排除，不修（勘正旧「快慢两帧叠影」
   假设）。
10. **选区面截断语义（不在本批）**：A5b/A5c 自上标列/微缝带起拖选区坍缩为
    1 字符（槽位解析面行为，paint 链一致跟随）；blank-start 坍缩零选区=
    单元 1 路径 a 已知边界——probe2 记录事实、未下钻，均另立票。

## 10. 红测试清单与实测红因（2026-11-21 实测；单元 1–4 已由 U2 落地转绿，
单元 5/6 三族呈红=先红半场交付态）

### 10.1 单元 1–4（U2 已落地，现全绿——红因留档）

| 文件 | 用例 | 实测（先红半场时点红因；U2 落地后全绿） |
|---|---|---|
| selection-b1-a4-slot.test.ts | ① 容器空白点 mousedown 合成锚 | 红：anchorNode=DIV.textLayer（应=textOf('R3')） |
| 同上 | ①b 图区零文本点（S1c 形态） | 红：anchorNode=DIV.textLayer（应=末带行尾） |
| 同上 | ② drag 中 focus=容器槽位 enforce 投影 | 红：focusNode=DIV.textLayer（应=textOf('R2')@7，终局 forward） |
| 同上 | ③ 保存链 start 不含起点之前内容 | 红：start=33（槽位文本位）≠44（down 点偏移） |
| selection-b1-a1-rect.test.ts | 常规模式矩形 mousedown preventDefault | 红：defaultPrevented=false（应=true）+垃圾选区零改写面 |
| 同上 | 对照：页盒空白不 preventDefault | **绿**（52 号零触语义锁） |
| selection-b1-a2-gutter-merge.test.ts | 真 fixture 每行 2 块+缝无覆盖+bands 分段 | 红：rects=6（应 12）；bands 单带跨缝 |
| 同上 | mergeRects 行内大缝断段/小缝对照 | 红：大缝 1 块（应 2）；小缝对照**绿**（恒 1） |
| selection-b1-a3-formula.test.ts | 终局偏移区间 ⊆ 公式行字符数 | 红：区间 70 字符（应 ≤12；实测 [11,81]） |
| 同上 | 几何块无孤块（≤3 块+不出公式行 y 带） | 红：6 块散布 y 240–312 |
| selection-b1-a5-superscript.test.ts | 角标方向回归锚（正/反/落上标三案） | **绿**（3 用例——探针定谳=角标未破坏阅读序，如实记录；U2 后保持） |
| pdf-factory-b1.test.ts | 三配方几何契约验收（真 pdfjs） | **绿**（3 用例） |

- 配方（tests/utils/pdf-factory.ts 新增）：createTwoColumnGapPdf（A2 双栏
  窄缝页：6 行×左右栏、行内缝 [18,58]pt>阈值 12.24pt；真 pdfjs 实测不插栏
  间补位项）、createFormulaPagePdf（A3 公式页：fs8/fs5 字号分离+±3pt 独立
  基线+行内空隙空白补位项宽 ≥8pt）、createSuperscriptAffilPdf（A5 角标页：
  行首上标 fs5@54+正文 fs8@58.5 同基线微缝 ≈1.7pt）。
- 基线自检：既有选区族 15 文件 171 用例改动前后全绿（零污染）。

### 10.2 单元 5/6（U3 交付，2026-11-21 实测；实现落地后 3 红/7 绿全部转绿——红因留档）

| 文件 | 用例 | 实测红因（先红半场时点；U3 落地后全绿） |
|---|---|---|
| selection-b1-u3-chain-paint.test.ts | ① 渲染盒两两垂直不重叠（bandVertical 带几何不得叠涂） | **红**：`-3.499848 ≥ -1e-6` 失败——链行两 x 段带 [83.8,99.3]/[95.8,109.6] 渲染交叠 3.5px（G5f 7.94px 双绘的合成等价；rect 本身不重叠=缺陷纯在带几何替换） |
| 同上 | 红判别几何自证（tol 3.25/链行相邻差 ≤tol 跨行距 16/x 缝 56.7pt>断段阈值） | **绿**（夹具自证，不随修复变） |
| 同上 | ② 契约锚：终局 rects 两两垂直不重叠（INV-A/D） | **绿**（修复不得经 rects 路线作弊） |
| 同上 | ③ 契约锚：逐正文行覆盖 oracle（垂直 ≥50%×盒高 且 水平 >0） | **绿**（拒带修复不得退化为漏行） |
| selection-b1-u3-affil-paint.test.ts | 红判别几何自证（sup/body vProj 差 3>tol 2.5+ x 缝 1.7<断段阈值） | **绿**（夹具自证） |
| 同上 | 覆盖 oracle：每个机构正文行盒存在渲染盒垂直 ≥50% 且水平 >0 | **红**：expected false to be true——渲染盒=上标列 4.5px 窄条 [54,58.5]，正文行 [58.5,186.1] 水平重叠=0（A5a 零覆盖的合成等价） |
| 同上 | 契约锚：终局 rects 两两垂直不重叠（INV-A/D） | **绿** |
| selection-b1-u3-slot-column.test.ts | 夹具自证：巨块形态（单 flow 块跨两栏/gutters=[]） | **绿**（页 4 块表失守形态同构） |
| 同上 | 中缝带释放 focus 仍在 down 点同栏 | **红**：focusEl.id 以 'R' 起（RA1）——带内最近盒判据把缝带释放点（x=310，左栏右缘 280/右栏左缘 320）送向右栏 |
| 同上 | 对照：指针明确入右栏盒（x=400∈RA1）→ focus 合法投影右栏 | **绿**（F-VISFB-52 入栏授权语义锁，修复后必须保持） |

- 配方（tests/utils/pdf-factory.ts 新增，真 pdfjs 验收同款面）：createFormulaChainPdf
  （R1 链行页：正文 fs8/碎片 fs6.5、行距 16pt、碎片 vProj 台阶 3pt≤tol 3.25、
  链行左右段 x 缝 56.7pt>断段阈值 38.7pt——流序以跨行项隔断 pdfjs 行内补位项，
  防空白项桥接 x 缝〔首版桥接失效的勘正在配方注〕）、createSuperscriptSplitPdf
  （R2 拆行页：上标 fs5 基线抬升 3pt、正文 fs8、x 缝 ≈1.7pt）。
- 渲染盒口径：R1/R2 断言经真产品模块链（itemSelectionGeometry→matchBand→
  bandVertical+clampedHorizontal）逐值计算——probe2 chain.mjs 已证该 Node 侧
  链与页面真实渲染盒差 ≤1px（60/60 rect）。
- **变异验证（红→绿定向证明，文件备份法=AGENTS.md 临时变异条款）**：5a 行锚
  断链+碎片并入 / 5b 派生域拒带（1.3×rowFontH）/ 5c 比例禁压缩（3×带宽）/
  6 同域约束 四原型临时落 src → 3 红测试全转绿+受锁面 26 文件 242 用例全绿
  （含 143 基线零改）→ cp 还原逐文件 diff 空。变异过程中的两处判据定稿
  （5b 派生域 vs 校准域、5c 比例 vs ⊇）已回写 §5 规格与 §7 核对清单。
- 基线自检（U3 改动前后）：既有选区族 15 文件 143 用例全绿（零污染）；
  新增 3 文件 10 用例（3 红/7 绿）。

### 10.3 实现落地与真机复放（U3，2026-11-21）

- 落地面：groupByBaseline 行锚断簇+碎片并入（拆件 baseline-fragment-merge.ts）/
  matchBand 派生域护栏+RowBand.rowFontH（档1 随带）/clampedHorizontal 禁压缩/
  projectCaretTo origin 同域约束（projectSlot 传 session.down）——实施注记见
  §5 相应单元尾。3 红测试转绿；受锁面 26 文件实测 250 用例全绿；全 renderer
  单测 265 文件 2910 用例全绿。
- 真机复放（xvfb-run，真实 PDF 只读复制+mkdtemp userData+零标注；
  `~/.config/Synapse` 零触碰；读数与截图=`b1-probe2/u3-impl-verify/`，
  仓外）：
  - **G5f**（左栏 span 起→中缝带终，gutter=[622,639] 与 probe2 基线同点位）：
    终局 focus=左栏行内（focus 盒右缘 622 < 右栏左缘 639——修前吸至右栏远端
    RA1）、selLen=38（修前 3582）、paint=1 块；覆盖审计无双绘对/无缺行；
    公式密集区裁剪对照基线 crop-G5f-formula.png 零灰底（选区不再覆盖该区）。
  - **A5a**（页 1 机构正文行 down 向下 3 行）：审计正文行 4/4 全覆盖（垂直
    ≥50%×行高）、missingRows=[]、渲染盒交叠对=0；机构块裁剪=全部正文行
    满宽灰带（修前仅上标列 3px 灰条、State Key Laboratory 行零覆盖）。
  - **S1a 回归**：direction=forward、anchor=down 点 span 域内（2039 ∈
    [1982,2097]）、quote 不含起点前内容；**S3 回归**：direction=backward、
    anchor=2039 不动、focus=1647；12/12 断言全过。
  - **S4b 回归**（跨栏行起→跨栏行终）：缝 [622,639] 覆盖块=0、跨栏行分两块
    （左 2+右 2）——u2-verify 口径不回退。**观测申报（非本批规格面，另立票
    候选）**：该手势全域渲染盒交叠对 6（修前基线 A/B 实测）→ 10（本批后）
    ——增量对=相邻行边界 rect 经 matchBand 最近中心窗（|Δcenter| ≤ rect.h，
    既有受锁语义）绑到邻行同带成同条纹重复渲染（公式密集区 4 行满条纹重复，
    rgba(0,0,0,0.2) 双涂加深）；A/B（文件备份法）证实带几何本区零变、该
    重复形态修前已存在（1 对满条纹）——G5f/A5a 两缺陷现场本身零重复。

### 10.4 B-1 回炉（RW，2026-11-22）：S4b 整行漏绘治理与 W-1 隔离锚

- **审查定谳**（b1-review-s4b-coverage.mjs 同口径 A/B）：S4b 修前 ri6 单行
  未达覆盖门、修后 ri4/ri7/ri50 三行未达——U3 真机 12 断言（缝覆盖+分块）
  未查逐行覆盖=申报与断言双遗漏。机制与规格见 §5 单元 5e；W-1（隔离变异
  无红证）由 chain-paint ④⑤+affil-paint 行分组产物锚承接（M1/M2 各 ≥1
  断言红实测）。
- 红测试：`selection-b1-rw-crossband.test.ts` 8 用例（修前 4 红：链级覆盖
  oracle「expected false to be true」/链级双绘「-4.000392 ≥ -1e-6 失败」/
  纯 matchBand ④「返回邻带 {top:0.2,…}」/⑤「返回 0.276 非 0.2659」；
  修后 8 绿）。
- 单测全量：266 文件 2918 用例全绿（新增 1 文件 8 用例+chain/affil 各增
  1 用例；受锁面零改）。
- 变异五针（备份法，还原 diff 全空）：M1 恢复 vTail → chain ⑤「expected
  1 to be 2」红；M2 删碎片并入 → chain ④「expected 4 to be 2」+affil
  W-1「expected 6 to be 3」红（①③⑤ 连带复红）；M3 删 5b 护栏 → chain ①
  「−3.499848」红（新门不遮蔽）；M4 删 origin → slot-column 红；M5 删
  bandRowConsistent → crossband ①②④⑤⑥a 5 红。
- 真机复证：见 probe 记录（b1-probe2/rework/，仓外）——S4b 逐行覆盖
  oracle+审查者脚本 A/B 终态核验+G5f/A5a/S1a/S3 回归。
