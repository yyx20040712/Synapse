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
| T9 CropBox 原点≠0 | **机理证实+真实库零触发+合成触发证实（x/y 双向平移量化闭合）** | s2crop-fb.json mergedB2Baseline + s2crop-cap.json c1.selected/c2.blocks（门一回炉 W1 复算在档） | 甲（duck 域）span 盒顶相对乙（viewport 域）块顶偏移 **x +36.01px / y −37.40px**（双向同源）。x=duckViewport `pageX:0`（TextLayer.tsx:57）vs view[0]=36；y=duck #transform 第 6 元 `pageY+pageHeight=0+684`（CropBox CSS 高）vs viewport offsetY=view[3]=720 的差 −36，叠加 ascent 口径差 −1.40px（TextLayer 用 canvas 量测 ascent 14.33px=0.796×fontH vs 乙轨用 styles 声明 0.718×18=12.92px）。§4 表中 shift dy=7.9 **非平移量**——y 偏 37.40>行距 28 使配对器错行：paint 行 i 错配乙行 i−1（Δcy=7.93 过门 |Δcy|≤(15+18)/2+2=18.5，成功 2/3），首行 Δ35.9 被门拒——**错行配对残差=T9 垂直错绑的下游病象实证**；outside=2/8；块数口径不敏感（甲 3 块=行数但位置错） |
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
| s2crop | 3/3 | 3 | 3 | 3 | 0/0 | 0.8213 | **−36.02**/7.9 px* | 同净+甲位置错 36px（T9） |
| s3base | 3/3 | 3 | 3 | 3 | 0/0 | 0.9998 | 0.03/−0.06 px | 同净 |

\* s2crop 的 shift 列：**dx=−36.02 为真平移量**；dy=7.9 非平移量——真实双向平移=x +36.01/y −37.40px（§2 T9 行机理分解）；dy=7.9 为配对器错行残差（y 偏 37.40>行距 28 → paint 行 i 错配乙行 i−1 过门、首行被门拒——paired 2/3）。

**量化判据定义（可复算，f-a6-diag-lib.mjs overlapMetric/pairBlocks）**：同行配对=a 在 B 中找 y 中心最近块，|Δcy|≤(ha+hb)/2+2px 且 x 相交>0；覆盖率=配对数/块数；IoU_x=配对块 x 区间交/并；shift=配对块中心差中位数（盒相对 px）。行数真值=被选 items 基线点在行分隔轴（angle 感知 v 轴投影）的聚类唯一值数（strict 2px / loose max(2,0.5×主导字号)）。

**三结局汇总**：真实样本=同净（甲乙等价、迁移无损）；病理样本=乙净甲错（S1）+甲位置错（S2）。

**路线裁定建议：R-迁移为主修（项声明几何+基线分组并块），R-加固降为回退**。依据：
1. 健康页无损：IoU_x 0.9996/0.9999、shift <2px——迁移不劣化现有正确页；
2. 病理页净收益：S1 乙 3 块=行真值 vs 甲 1 块；S2 乙位置对（viewport.transform 天然含 CropBox 旋转/平移）vs 甲平移 36px。**依存声明（门二 W1）**：此收益以 T1/T9 未修为前置条件——T1/T9 前置修复落地后 S1/S2 形态即消失（§6 WARN-5），该依据归零；届时主修的剩余支撑=依据 1（健康页无损）+依据 3（项级盒对拆簇的结构性免疫），此表述随票传给 F-A6-b 实现者，防证据超卖；
3. **口径1 数据反证加固路线的局限**：mLR 系为 DOM 量测噪声设计，项盒直喂会拆簇——迁移不是"换个输入"而是"换并块语义"（基线分组），设计书 §5.1 的行级并块条款被数据证明是必要设计而非可选；
4. **T1/T9 的 TextLayer duckViewport 修复（rotation 通道+rawDims 真值化）是两路线共同前置**——迁移只修矩形半边，划选手势映射/偏移映射仍需 DOM 文本层对齐（设计书 §5.1 明示，本数据 S1/S2 的 outside 5/2 即错位实证）。

**执行顺序（门二 W3 补——阶段化决策门，F-A6-b 票面必须承载）**：阶段 1=T1/T9 前置修复（duckViewport）→阶段 2=复跑本取证器 A/B 对照（确认 S1/S2 形态消除+健康页 IoU 不劣化）→阶段 3=在消除后基线上终裁主链迁移落地（本表「主修」为待决建议，其判别性证据链已按依据 2 依存声明降级，不因前置修复完成而自动失效重议——除非阶段 2 复跑出现新反证）。

**grapheme 细分/RTL/竖排处理代码在位（C2·无运行时验证——缺口见 §9-4）**：`Intl.Segmenter('zh',{granularity:'grapheme'})` 计数+比例细分+RTL 方向翻转+vertical 轴互换+任意角四角包围盒；**本仓样本触发面为零**（perItemStats：partial=0、rtl=0、vertical=0 全样本）——细分逻辑无运行时验证数据，**数据缺口申报**（§9-4），F-A6-b 实现时须以单测夹具补验证。

## 5 修复集裁定建议（F-A6-b 票面输入）

**执行阶段列（门二 W3）**：阶段 1=前置修复→阶段 2=复跑 A/B 对照（决策门）→阶段 3=主链迁移（细节见 §4 执行顺序段）。

| 项 | 阶段 | 修/不修 | 方向 |
|---|---|---|---|
| T1（rotation 通道） | **1** | **修** | TextLayer.tsx duckViewport rotation 通道（真实库零触发但合成实证+用户裁决②「旋转页修复纳入」；deepseek NIT-2 的降级条款在此不满足——触发形态已由 S1 闭合）。**修复后须复跑 A/B 对照确认 S1 形态消除（阶段 2 决策门输入）** |
| T9（rawDims 真值化） | **1** | **修** | duckViewport 改收真实 page.view/pageX/pageY（S2 实证 36px 平移；与 T1 相互独立，rotation=0 也致病——维持 WARN-2 权属）。**同上：修复后复跑对照=阶段 2 输入** |
| T2/T3（聚类判据） | 3 | **修（回退路径）** | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）——3882 的 80 组拆簇直接对症；迁移路线下此函数降为 DOM 量测回退路径的加固 |
| T4（pitch 滤噪） | — | 不修（本轮未触发塌缩） | 观察——若 F-A6-c 后续复现再立案 |
| T5 | 3 | 随迁移构造性消除 | 项几何 width=PDF 声明宽——**构造性消除夹取源错（未实证：无墨带参照，§2 已自承「方向正确性未证」；迁移落地时以 S3 健康样本 IoU 复测补证）** |
| T7 | — | 不修（6 处断段存疑且收口后无残留） | 观察 |
| 主链 | **3**（待阶段 2 决策门放行） | **迁移** | pdf-item-geometry.ts（项几何+grapheme 细分+**基线分组并块**+bands 同源派生 C5）+PdfPageCanvas/装配链 viewport/styles 下钻通道（C1 承重断点） |
| D2 | —（F-A6-c） | 另票 | 见 §7 基线（5Hz 步进 200ms 实测+每 tick 布局读量级） |

**验收条件（门二 W2——修复集证据等级声明，随票流转不得丢失）**：本修复集以**机理+合成证据**裁定，用户实报重形态（锯齿+右溢）未在真实抽样页复现（§3 总结论）；F-A6-b 验收须含**合成 S1/S2 复现-消除证据**（阶段 2 决策门即此口径）；真实重形态复现=新增复现证据时按 §6 WARN-5 口径启用 G2 拒绝门——不存在「修完后无任何闸门核验实报形态」的窗口。

## 6 G2 阈值交付（检测器口径随路线=R-迁移）

- **检测器口径**：「被选 items 合成项盒（或渲染块）相对 textLayer 盒的偏离率」——`outsideCount/spanCount`（A2 形态）+块右溢 px。
- **阈值建议**：偏离率 ≥5%（数据分界：健康页 0~0.12%（3882: 1/829、1c2d: 0/501、s3base: 0/8）vs 病理页 25%~62.5%（s2crop: 2/8、s1rot: 5/8）——**健康/病理间隔 ≥200 倍，5% 阈值有 >4 倍安全边距**）；「或任一块右溢 >2px」支为**占位阈值——本轮全样本右溢=0，无观测支撑，随 WARN-5 一并待实证后启用**。
- **WARN-5 声明**：本轮真实库无异常页（T1/T9 零触发）且 S1/S2 形态在 T1/T9 修复后即消失——**G2 建议实现检测器+阈值但标注「仅新增复现证据时启用」**（防「检测器先写但永远无阈值」空置，也防无实益拒绝）。

## 7 tick 基线（段B，F-A6-c 前后对比用同一口径）

口径：程序化划选→settle 700ms→模拟拖选 20 轮（每轮选区末端 +1 字符+dispatch selectionchange，间隔 50ms）→MutationObserver（childList+subtree+attributes:style）记 selection-rects 变更时刻；tick 端到端=mutation 时刻−距其最近一次 dispatch 时刻。布局读=猴子补丁计数（gBCR/getClientRects/Range.gBCR/getComputedStyle，测后还原）。

| 样本（span/字符） | mutations | delta min(含 0)/med/max (ms) | mutation 间隔中位 (ms) | gBCR | getClientRects | Range.gBCR | getComputedStyle |
|---|---|---|---|---|---|---|---|
| real3882（829/8651） | 7 | 0/22.4/172.3 | **200.2** | 709 | 16 | 8 | 2734 |
| real1c2d（501/1868） | 7 | 1.6/31.4/161.5 | **202.1** | 462 | 16 | 8 | 1747 |
| s2crop（8/272） | 7 | 0.4/30.3/179.9 | **199.8** | 42 | 16 | 8 | 64 |
| s3base（8/272） | 7 | 0/20.2/207.3 | 200.2 | 42 | 16 | 8 | 64 |
| s1rot（8/272） | **0** | — | — | 42 | 16 | 8 | 64 |

- **D2a 5Hz 步进实证**：全部有变更样本的 mutation 间隔 199.8~207.3ms≈节流窗 200ms——拖选期视觉恰 5Hz 的直接实测。
- **mutations=7 成因（门二 W4）**：dispatch 每 50ms×20 轮=总时长 ~1000ms，节流窗 200ms → leading 触发约每 4 轮一次（t≈0/200/400/600/800/1000ms 共 6 次）+末轮 trailing 补 1=7 次——**mutation 次数由节流窗÷dispatch 间隔决定，与样本字符量无关**（故 829 span 与 8 span 同为 7）；间隔数组 [205.4,199.9,199.9,206.1,203.5,200.2]（3882）与 200ms 窗咬合。F-A6-c 前后对比若改用不同 dispatch 节奏须按本式换算预期次数。
- 每 tick 摊销布局读（3882）：gBCR ≈101/tick、getComputedStyle ≈391/tick。
- s1rot mutations=0：旋转错位页上拖选未触发可见层变更（evaluate 有跑、几何未变——counts 有数；非 D2 重点样本，申报）。
- delta 的 min：3882/s3base 含 0 值（mutation 落在 dispatch 同步段——MutationObserver 微任务在 dispatch 返回前即触发）；各样本 all 数组非零最小值 0.4（s2crop/s3base）/1.6（1c2d）/2.8（3882）ms=排队最少时的 dispatch→DOM 变更全链（含 React commit）；max（161~207ms）=trailing 窗尾等待——节流排队主导分布。

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
5. **已知限制**：3882 首轮双击打开偶发丢失（getByText 命中详情面板+重试 .lib-card 定位兜底，5 轮中 2 轮触发重试后成功）；1c2d 代表页弃全档最大 p35（深页懒渲染排队 >40s）取前 8 页内最大 p4；tick 的 evaluate 纯 CPU 时长未直接测（delta 含节流排队——all 非零最小值 0.4~2.8ms 为全链最快参照，min 字段含 0 值见 §7 口径注）；甲轨「现行管线产物」=程序化选区路径（setStart/setEnd 边界=文本节点边界），真实鼠标拖选的边界容器差额形态未覆盖（设计书 §6 已知边界①同族）。
6. **产物纪律**：f-a6-diag-out/ 不入 git；脚本三件本轮多次修改，收工前已 locks:generate+apply 同步 manifest（主控验收时 bundle 落点由数据目录迁 out/f-a6-bundles/——esbuild 再生产物不入受锁面，终态 manifest 272 条=基线 269+脚本三件）。
7. **门一回炉处置档（PASS_WITH_WARNINGS，本节=五条修订记录，仅改本 md 不动脚本/JSON）**：W1=T9 y 向闭合（§2/§4：双向平移 x +36.01/y −37.40 实测分解+dy=7.9 错行残差机理——复算脚本临时件未入产物，数字可由 s2crop-fb.json mergedB2Baseline 与 s2crop-cap.json c1.selected/c2.blocks/tlBox 直接复算）；W2=§7 补 s2crop tick 行（btick.json 有效在档：muts 7/间隔中位 199.8）；W3=min 口径统一（表内 min 含 0 值，全链最快参照改引 all 非零最小 0.4~2.8ms）；N1=§6 右溢支标注占位阈值（全样本右溢 0 无观测支撑）；N2=§5 T5 降「构造性消除（未实证）」。
8. **门二终位处置档（deepseek PASS_WITH_WARNINGS——4W2N，主控直裁落地，仅改本 md）**：W1=S1/S2 迁移判别证据与 T1/T9 修复的依存关系→§4 依据 2 补依存声明（T1/T9 修复后该依据归零，主修剩余支撑=健康页无损+结构性免疫拆簇）；W2=重形态未复现未落入修复集验收条件→§5 补「验收条件」段（阶段 2 决策门=S1/S2 复现-消除证据口径+WARN-5 真实复现联动）；W3=执行顺序缺决策门→§4 补「执行顺序」段+§5 补阶段列（阶段 1 前置修复→阶段 2 复跑对照→阶段 3 主链迁移）；W4=mutations=7 成因未解释+min 列头双轨→§7 补成因式（节流窗÷dispatch 间隔，与字符量无关）+列头改「min(含 0)」；N1=§4 表注 dx/dy 对称标注；N2=C2 标题去「证据」改「代码在位（无运行时验证）」。另：门一回炉的表注曾误插表格中段致 s3base 行脱表，本轮回修（门二 N1 扩注时一并复位）。门二 raw 尾部有模型幻觉垃圾串（「微信用户dummy…」，不影响 findings 主体）在档申报。

## 10 阶段 2 决策门记录（F-A6-b1，2026-09-04）

**背景**：阶段 1 前置修复已落地（T1/T9）——TextLayer.tsx duckViewport 改收真值 `rotation=geometry.rotate`、`rawDims={pageWidth:view[2]−view[0], pageHeight:view[3]−view[1], pageX:view[0], pageY:view[1]}`；**并按 pdf.mjs 4.10.38 源码核对补齐容器旋转半边**：pdf.js TextLayer 的 span 位置恒为未旋转用户空间百分比，页旋转由容器 CSS 变换承担（官方 pdf_viewer.css:3104-3112 通用 `[data-main-rotation]` 规则——repo 的 text-layer.css 未提取该组规则，修复以组件内联等价变换 `rotatedContainerBox` 实现，90/270 并交换容器宽高为未旋转口径）。通道=PdfPageCanvas onPageRender 第三参 `{rotate,view}` 下钻（PdfPageGeometry 类型单源）→PageBox/PageColumn（纯类型扩展）→PagesOverlay 注册表→TextLayer props（geometry 必填，无静默回退）。

**复跑口径**：第一轮产物=本表 §1-§9 数字原件（移存 `f-a6-diag-out-a1/`）；修复后复跑=`f-a6-diag-out/`（`node scripts/audits/f-a6-diag.mjs` 全量同口径）；修复代码 `npm run build` 后经 out/renderer 资产生效（修复面全在渲染层）。两轮对照数字全部脚本提取自对应 JSON（临时对照件已删，可由同名 JSON 复算）。

| 判据 | 第一轮（a1） | 修复后（b1） | 达标 |
|---|---|---|---|
| s1rot outside | 5/8 | **0/8** | ✅ |
| s1rot A_paint 块数（行真值 3） | 1 | **3** | ✅ |
| s1rot fb 配对（B2 口径） | 0/0 结构性失效 | bToA 3/3、aToB 1/3（iouX 0.2433、shift dx 26.57/dy 173.08） | N/A——配对器横排 y/行距假定不适配竖排形态（§9-4 盲区），判据=outside/块数两行（零高块复算见下段） |
| s2crop 双向平移 shift dx | −36.02（真平移 x+36.01/y−37.40） | **0.03 / −0.1** | ✅（\|dx\|<2px） |
| s2crop outside | 2/8 | 1/8 | ✅ 带归因（见下） |
| s2crop IoU_x（B2 口径）/配对 | 0.8213 / 2/3 错行配对 | **0.9998** / 3/3 双向 | ✅ |
| 健康页 A_paint 块数 | 3882=42 / 1c2d=10 / s3base=3 | **42 / 10 / 3** | ✅ 不变 |
| 健康页 IoU_x（B2） | 3882=0.9996 / 1c2d=0.9999 / s3base=0.9998 | 0.9996 / **0.9982** / 0.9998 | 3882/s3base ✅ 逐位不变；1c2d ⏳ 有条件过——0.9982 边际待门二追认（机理见下） |
| 健康页 outside | 1/829 / 0/501 / 0/8 | 1/829 / 0/501 / 0/8 | ✅ 不变 |
| tick mutation 间隔中位 | 200.2 / 202.1 / —(0m) / 199.8 / 200.2 | 200.1 / 200.1 / 1000.8(2m) / 200 / 200.1 | ✅ ~200ms 保持 |
| tick 布局读 gBCR/gCS | 709/2734 · 462/1747 · 42/64 · 42/64 · 42/64 | 709/2734 · 462/1747 · 37/56 · 37/56 · 42/64 | ✅ 同量级（健康页逐位同） |

**s2crop outside 1/8 归因（非 T9 平移残余）**：合成配方（f-a6-diag-lib.mjs:41 `BT /F1 18 Tf 72 ${720−i*28} Td`）把 ROW 1 基线放在 y=720=**CropBox 顶缘本身**——字形 ascent（14.29px≈0.794×18，span 顶实测 720+14.29）天然越出裁剪盒：canvas 渲染按 viewport 裁掉、文本层 span 盒不裁（`overflow:clip` 裁的是容器=同一边界）→ 检出口径差。佐证：同配方无裁剪的 s3base outside=0/8；修复前该 span 越界 50.3px（含 36px 平移分量），修复后 14.29px=纯 ascent。T9 的判据形态（全内容双向平移）已由 shift 0.03/−0.1+IoU 0.9998+3/3 配对闭合。

**s1rot A_paint 零高块复算（门一 W2，数字取自 s1rot-cap.json c1/c2，可复算）**：终块 3 块中 2 块零高**成立**——blk[0]{x=1154.80, y=138.39, w=53.59, h=0}、blk[1]{x=1017.92, y=210.35, w=25.60, h=0}、blk[2]{x=1049.56, y=213.35, w=73.99, h=15}（唯一实心块，锚在实心列行）。源头=段C rawRects 6 条中 2 条零高 rect（y=138.39=tlBox 顶缘、w=21.60，x=1186.80/1170.80——screen x 映射 user y=741.6/725.6，位于首行字形区上缘之外）+4 条实心（w=18~25.60，h=367.10，y=210.35）。归因：程序化选区首末边界的 Range 零量测产物（§3「Range 量测噪声在源头即存在」同族）——未旋转域的零宽边界形态在 90° 旋转域呈零高（门一 W2 措辞「零宽 rect」按实测域修正为「旋转域零高=未旋转域零宽形态之像」）；精确 DOM 机制非判据面不深挖，阶段 3 项几何链（无 DOM 量测面）构造性消除该形态。

**real1c2d IoU 0.9999→0.9982 机理（有条件过项——非劣化机理在档，票面「不劣化（≥0.999−ε）」字面未达）**：该页 view 为分数尺寸（[0,0,425.52,647.28]）。旧 duckViewport 的 rawDims=量测 CSS 盒÷scale=floor 逼近值（425×647）→ span 百分比分母偏离真值 0.12%；新实现用精确 view → span 缩放与 canvas 的 CSS floor 压缩（425.52→425px）同口径=**更忠实于墨带**。整尺寸页（3882 612×792）全部指标逐位不变佐证机理；B2 块按未取整 viewport 域计算，A 与 B2 间因此存 ~0.5px 右缘差→IoU 0.9982（本表不发明阈值——列为有条件过，追认请求随门二材料）。

**s1rot tick 0→2 mutations**：修复前旋转页拖选未触发可见层变更（§7 注）；修复后 span 对齐、selection-rects 产生 2 次变更（间隔 1000.8ms=事件稀疏非节流变化）——改善信号；gBCR 42→37/gCS 64→56 同量级。1c2d/s2crop mutations 7→6=节流窗÷dispatch 间隔的边缘抖动（§7-W4 公式，gap 数组 ~200ms 咬合不变）。

**决策门结论：过。** 理由：①S1/S2 病理形态消除（s1rot outside 5→0+块 1→3=行真值；s2crop 双向平移 36px→0.03+IoU 0.8213→0.9998）；②健康页零回归（块数/outside/tick 计数逐位不变；1c2d IoU 0.9999→0.9982 为唯一数字变动项——机理=更精确而非劣化，见上段）；③唯二未满字面判据项（s2crop outside →1/8、1c2d IoU 0.9982）均有机器实测归因在档且非修复缺陷。**1c2d IoU 项为有条件过，追认请求随门二材料。** **阶段 3（主链迁移 R-迁移路线）按 §4 执行顺序放行**；主修剩余支撑=依据 1（健康页无损）+依据 3（项级盒结构性免疫拆簇），依据 2 已按依存声明归零（本复跑即其终态证据）。

**门二终位（deepseek v4flash，2026-09-04）：PASS（零 findings）+1c2d IoU 追认=ENDORSE**——「0.9999→0.9982 仅发生在分数 view 页且由旧 rawDims 的 CSS÷scale floor 逼近改为精确 view 所致，3882/s3base 全指标逐位不变、A 与未取整 B2 域仅差约 0.5px 右缘，属度量精度改进而非劣化」；门一五项回炉处置闭合且无新矛盾，修复本体维持门一结论。**决策门终位=过，阶段 3（主链迁移）放行**。审查档：f-a6b1-gate1.raw.txt（Kimi PWW）+f-a6b1-gate2.raw.txt/.json（deepseek PASS+ENDORSE）。

**产物与验证状态**：复跑产物 `f-a6-diag-out/`（40 件，不入 git）；第一轮原件 `f-a6-diag-out-a1/`（40 件，同前）。修复面单测=text-layer.test.tsx 新 10 用例（duckViewport 直测+rotatedContainerBox 四旋转态+jsdom 真 pdf.js TextLayer 语义级 3 用例）+pdf-page-canvas.test.tsx 几何下钻断言+pages-overlay.test.tsx 几何透传锚；变异红证 2（rotation→0 恰 2 用例红/pageX→0 恰 2 用例红，文件备份法还原 diff 空）；`npm run verify` 全绿（150 文件/1284 用例，manifest 273 条=272+新测试件）。

**已知边界（门一 N3）**：rotation×CropBox 组合页（旋转+非零原点）本轮单测与合成库均缺席——单测各半边独立锚（text-layer.test.tsx 旋转态与 CropBox 态分列用例），组合面留 F-A6-d e2e 收口时补；userUnit≠1 仅声明边界（PdfPageGeometry 注——官方 rawDims getter 会乘 userUnit 而本通道 view 未乘，真实库全档 userUnit=1），未实现。

**门一回炉处置档（Kimi PASS_WITH_WARNINGS——2W3N，2026-09-04，仅改本节+text-layer.test.tsx）**：W1=1c2d IoU 判据软化（删「≥0.999−ε 边际内」与事后发明的「≥0.998」阈值——改判 ⏳ 有条件过、追认请求随门二材料）；W2=s1rot fb 配对行改 N/A（配对器横排 y/行距假定不适配竖排形态，§9-4 盲区；判据=outside/块数两行）+零高块复算段落（「2 个零高块」实测成立，「零宽」措辞按实测域修正）；N1=text-layer.test.tsx 补 transform-origin 锚断言（组件无内联覆盖半边+text-layer.css:58 注释锚——jsdom 样式表级联不可读限制在测试头注申报）；N2=复跑载体表述改 out/renderer（修复面全在渲染层）；N3=本节补已知边界段+测试头注补自纠记录。

## 11 阶段 3 迁移后第三轮对照（F-A6-b2，2026-09-04）

**迁移落地面**：pdf-item-geometry.ts（项声明几何纯函数件——viewport transform/Util.transform 数学自 pdf.mjs 4.10.38 内联[零 INV-16 面]+偏移表[剔空串项]+grapheme 细分[RTL 翻转/竖排轴互换]+基线分组并块[口径2+bands 同源 C5]+G2 检测器[阈值 5%/2px 常量导出]）；下钻通道=page-items.store（zustand 单源注册表——PagesOverlay pageTexts useState 整体迁入[写者唯三口同构]，SelectionLayer evaluate 时刻 getState 直读[zoom 现读/viewport 现构]）；SelectionLayer evaluate 域拆 selection-evaluate.ts（组件 ≤250 红线触发——票面预判条款）+产链切换（项几何主链+DOM 量测回退双路，回退三因[页项缺失/偏移对账失败/计算异常]不静默 warn）+保存链 rects 同源（INV-58 前半）；G2 挂点 active（拖选期 setPaint(null)+mouseup/settle toast 拒绝）；T2/T3 回退加固（mergeLineRects 聚类比较扩到全部簇——annotation-merge 先例语义）。

**复跑口径**：b1 轮产物移档 `f-a6-diag-out-b1/`；修复代码 build 后经 out/renderer 生效；第三轮=`f-a6-diag-out/`。**过程两事故档（保留为 `f-a6-diag-out-r3a/`、`f-a6-diag-out-r3b/`）**：
- **r3a 项盒域差**：首版归一化减 gBCR 盒原点——viewport.transform 产出=textLayer 盒**本地**域 vs pixelBoxOf 视口绝对域，混用令全部项盒判盒外（偏离率 1）→ **G2 门全抑制（全样本 paint=0 块）**。检测器按设计拦截了错几何（「所见错即拒绝所存」的反向实战验证）；修复=盒本地帧（只消费盒宽高，取证乙轨 normPxR 同式），补域锁单测（基准盒平移 (500,300) 归一化不变+接线夹具 gBCR 非零原点）。
- **r3b 终裁桥接**：产线把 mergeRects 终裁无差别套上——旋转页视觉行（竖排段）共享 y 中心，中心 y 聚类把三行桥接成单块（s1rot paint 3→1，mLR y 盲区经终裁还魂；B2 口径 blockCountB2 数的是 mergeRects **前**基线分组块，本表 §10 该列因此未暴露）。修复=角度门（|sin(行进角)|<0.35 近水平才过 mergeRects；旋转/竖排跳过终裁=已申报边界：INV-D 行间钳制不适用，真实库 rotate=0 全档零触发），补旋转回归单测+M6 变异红证。

**第三轮对照表（判据=票面 D-2：块数不劣化+右溢 0+健康 outside 不增；IoU_x/shift=甲 paint↔乙2[mergeRects 前]对照）**：

| 判据 | b1 轮 | 第三轮（r3c） | 达标 |
|---|---|---|---|
| 健康页 A_paint 块数（行真值 s/l） | 3882=42(43/42) / 1c2d=10(10) / s3base=3(3) | **42 / 10 / 3** | ✅ 逐位不劣化 |
| 健康页右溢 甲/乙2 | 0/0 ×3 | 0/0 ×3 | ✅ |
| 健康页 outside（A2 DOM span 口径） | 1/829 / 0/501 / 0/8 | 1/829 / 0/501 / 0/8 | ✅ 不增（A2 计数域=DOM span，非项盒——见下「s2crop 注」） |
| s1rot A_paint（行真值 3） | 3（含 2 零高伪迹块） | **3（无零高块——项几何链构造性消除 §10 预测兑现）** | ✅ |
| s2crop A_paint（行真值 3） | 3 | 3 | ✅ |
| IoU_x（甲↔乙2 配对中位） | 0.9996 / 0.9982 / — / 0.9998 / 0.9998 | **0.9999 / 1 / 0.9987 / 1 / 1** | ✅ 全样本提升（1c2d 分数 view 页 0.9982→1：甲乙同入未取整 viewport 域） |
| shift dx/dy 中位（px） | 0.02/1.79 · 0.27/0.17 · — · 0.03/−0.1 · 0.03/−0.06 | **≤0.01 全样本**（甲=乙2 同链产物按构造） | ✅ |
| tick mutation 间隔中位（ms） | 200.1 / 200.1 / 1000.8(2m) / 200 / 200.1 | **200.4 / 202 / 201(6m) / 200.5 / 200.1** | ✅ ~200ms 保持（调度未动） |
| tick 布局读 gBCR/gCS（3882） | 709 / 2734 | **18 / 685** | ✅ 大幅降=通道生效（bands 量测链+findRangeAtOffset 消失；残余 gCS=selectionToAnchor 链[红线不动]） |
| outcome2（乙2 口径三结局） | — | **全样本「同净」** | ✅ |

**s2crop outside 1/8 注（票面问项的落定）**：A2 计数器量的是 DOM span 盒（TextLayer 侧，b1 §10 归因的 span ascent 越界——本票不动 TextLayer 数学，1/8 保持）；**项几何侧**该伪迹不存在（声明几何构造不含量测伪迹）：paint 3 块+IoU 1.0+G2 零触发（被选行项盒全部在盒内——合成配方 ROW 基线 692 起，非顶缘行）。

**已知边界与归因**：①real3882 covAB2 0.881（aToB 配对覆盖率）：甲 paint 过 mergeRects 终裁（INV-D 钳制微移 y 中心）vs 乙2=mergeRects 前块，紧行 y 中心门 |Δcy|≤(ha+hb)/2+2px 拒 5/42 对——covB2A=1+配对 IoU 0.9999+同净，非几何劣化（配对器为诊断件非判据）；②s1rot covB2A 0.3333=配对器横排 y 假定对竖排形态的 §9-4 既有盲区（b1 表已 N/A 同款）；③旋转/竖排内容跳过 mergeRects 终裁（r3b 修复面）——行间钳制不适用已申报，真实库零触发；④grapheme 细分/RTL/竖排运行时触发面仍零（单测已补——§9-4 缺口闭合于 tests，运行时数据缺口仍在）。

**结论：阶段 3 主链迁移（R-迁移）落地达标**——健康页零回归（块数/outside/tick 间隔逐位持平）+病理页保持修复态（s1rot 3=行真值、s2crop 平移 0）+甲乙同链（shift≤0.01）+D2 布局读面兑现（gBCR −97%/gCS −75%）。G2 门在 r3a 事故中实证拦截错几何（active 形态有效性佐证）。

**门一回炉修订（2026-09-04，PASS_WITH_WARNINGS 三条处置）**：W2=G2 toast 门改 fromMouseUp（对齐跨页拒绝形态——settle 防抖路径静默防拖选中途刷屏；本节上文「mouseup/settle toast 拒绝」按此口径读作 mouseup 时刻）；N1=归一化越界夹取改端点式（w=clamp 后端点差，x+w≤1 自洽——越界夹具单测锁）；W1=扩簇 y 区间膨胀回归守卫用例入档（绿——机理：区间只喂 yOverlap 分支，该分支仅 pitch 缺省[单视觉行形态]启用，跨行场景 centerOk 门恒为主导矩形口径；行块垂直分离由 mergeSegment pitch 钳制保持）。

**门二终位（deepseek v4flash，2026-09-04）：PASS_WITH_WARNINGS（2W2N，零 BLOCKING）——b2 可收口，F-A6-c 可开工（条件见下）**。终位裁决：
- **seam_ruling（残留风险③定性）**：AnnotationLayer 存量重锚域仍走 DOM 量测几何，与迁移后 selection 保存链项声明几何构成跨层域分裂——但 INV-58 本票禁令只约束 selection 链（快/慢路径）的 rects 落库来源，标注渲染域属 AnnotationLayer 独立票面=**票外边界不阻塞 b2 收口**；**F-A6-c 开工条件必须显式排期 AnnotationLayer 重锚域同族化或域间换算守卫**（否则 INV-37 长期一致性存续缺口）。
- W2（随 c 票）：pitch 缺省+跨行中心距 ≤2px 极限单视觉行形态的守卫夹具（W1 机理结论未覆盖面）——F-A6-c 回归补。
- N1（随 c 票）：viewport 通道 scale [0.5,3] 夹取与 PdfPageCanvas 字面量的共享常量化（防多处漂移）。
- N2：manifest diff 依赖包外核验——主控已核验（第 5 件=locks/manifest.json 测试文件登记，275 条与提交面同步），闭合。
- 审查档：f-a6b2-gate1.raw.txt（Kimi PWW）+f-a6b2-gate2.raw.txt/.json（deepseek PWW——输出经 reasoning 通道，主控提取落盘在案）。

## 12 第四轮对照（F-A6-c D2 调度与快路径落地，2026-09-04——只追加）

**落地面（B 案）**：调度器 rAF 对齐（selection-geometry.ts——视觉路=首事件即排 rAF+帧内合帧去重[60Hz 上限]，取代 B1 200ms leading+trailing 节流[5Hz 步进=D2a 病根]；settle 防抖 200ms 与 mouseup 即时全量逐字保持；cancel 清 rAF+防抖双句柄）；快路径 evaluateVisual（selection-evaluate.ts——四道守卫前置+轻量偏移 probe[Range.toString×2，selectionToAnchor 的 join/quote/prefix/suffix 切片与全量几何量测链全省]+page-items.store 直读+项几何链直取[INV-58 后半：与 settle 同族]+G2 同门拖选期抑制；失败回退=全量视觉评估，全量回退=DOM 量测[b2 在位]——三层快→全量→DOM）；SelectionPaint React.memo；scale [0.5,3] 共享常量 clampScale（门二 N1）。测试配套：selection-geometry.test 新 4 it（C1 帧内合帧去重=改形唯一新逻辑单元/C2 leading ≤16ms/C3 防抖逐字保持/C4 cancel）+selection-evaluate.test 新 3 it（快慢等价/同帧覆盖[mid-drag zoom 差分形态]/快路径跨页守卫）+S1b/S1c 改写 rAF 语义+item-chain G2 帧后断言强化+annotation-anchor W2 pitch 缺省极限守卫夹具（构造后绿=守卫入档非缺陷修复——MUT4[hComparable 删除]红证其牙）。变异红证 4：MUT1 合帧去重删除→C1/C4 红；MUT2 防抖 100ms→C3+S1b 后半红；MUT3 快路径守卫(ii)删除→跨页夹具红；MUT4 hComparable 删除→W2 红（文件备份法，还原 diff 空）。

**复跑口径**：b2 轮产物移档 `f-a6-diag-out-b2/`；修复代码 build 后经 out/renderer 生效；第四轮=`f-a6-diag-out/`（同脚本同节奏：N=20 次 dispatch 间隔 50ms，每轮选区末端 +1 字符）。

| 判据 | b2 轮 | 第四轮（c） | 达标 |
|---|---|---|---|
| mutations（20 次 dispatch 的可见层变更数） | 7 / 7 / 6 / 6 / 7 | **20 / 20 / 20 / 20 / 20** | ✅ 每事件必随动（b2=节流窗÷dispatch 间隔≈7） |
| mutation 间隔中位 (ms) | 200.4 / 202 / 201 / 200.5 / 200.1 | **59.5 / 59.4 / 50 / 50.2 / 50.1**（全列 47.5~62.9——50/60 交替=rAF 帧栅格 16.7ms 对 50ms dispatch 的量化） | ✅ 200ms 步进消灭；间隔上限=dispatch 节奏（50ms），rAF 上限 16.7ms（更密 dispatch 下贴帧栅格）——「5Hz→60Hz」的直接验证=mutations 7→20 全跟随+间隔 200→dispatch 界 |
| delta min(含 0)/med/max (ms)（dispatch→DOM 变更全链含 React commit） | 3882: 2/32.3/161.2 · 1c2d: 1.1/21.6/131.3 · s3base: 0.4/30.3/189.8 | 3882: **6.1/11.9/15.5** · 1c2d: **3/11.1/12** · s3base: **2.9/10.1/10.8** | ✅ med 降 2.5~3×；max 200ms 级 trailing 等待消灭（max≤15.5=rAF 帧点等待上界）；~10ms 恒定段=帧点量化等待（delta 含 dispatch→下一帧边界 ≤16.7ms），链本身亚毫秒 |
| 布局读 gBCR | 18 / 18 / 16 / 18 / 18 | 24 / 24 / 24 / 24 / 24 | ✅ 归一化后降：b2=2.6/mutation，c=1.2/mutation（每快 tick 恰 1 次=pixelBoxOf 基准盒；20 tick+settle） |
| getComputedStyle | 685 / 438 / 14 / 16 / 16 | **87 / 58 / 2 / 2 / 2** | ✅ −87%：快路径每 tick gCS=0（计数归因：b2 685≈8 次全量×~85[选区跨 ~83 节点的 medianFontSizeBetween]；c 87=仅末尾 settle 一次全量——快 tick 零 gCS） |
| getClientRects | 8 / 8 / 7 / 8 / 8 | **1 / 1 / 1 / 1 / 1** | ✅ 快路径每 tick clientRects=0（残余 1=末尾 settle 的 selectionToAnchor 量测批）——clientRects/gCS 链尽消（票面「布局读出链尽消」条款的落地口径；gBCR/Range.gBCR 绝对量随 tick 数上行——1.2~2.3/tick 归一化净面与归因披露见上两行） |
| Range.gBCR | 8 / 8 / 7 / 8 / 8 | 21 / 21 / 21 / 21 / 21 | 与 tick 数同增（守卫(iv) 每快 tick 恰 1 次）——布局读净面仍降（gBCR+clientRects+Range.gBCR 合计：b2≈4.9/mutation→c≈2.3/mutation） |
| D1 面回归检查 | 甲块 42/10/3/3/3 右溢 0 | 42 / 10 / 3 / 3 / 3 右溢 0 | ✅ 逐位不变（调度/快路径不动几何族——INV-58 同族构造保证） |

**快路径预算断言（头注「bands 现算不缓存」决策的实测依据）**：最重样本 real3882（829 span/8651 字符）快路径 20/20 帧全跟随零丢帧；链 CPU 增量 ≈ delta med 差（3882 11.9 − 合成页 10.1[纯帧等待+亚毫秒链]）≈ **<2ms**——「项几何链全程 <2ms 可不缓存」判据成立，bands 项几何链现算（bandsFromItems 纯函数零布局读）无缓存摊销必要；probe×2+对账 join 为残余 O(页文本) 纯 CPU（无布局读），60Hz 帧预算内无观测瓶颈。

**已知边界与申报**：①同帧覆盖断言以 mid-drag zoom 差分形态锚（快=zoom1/全量=zoom2，终态=zoom2）——已知边界②「mid-drag zoom 一帧陈旧由 settle 纠正」的正测试面；②rAF 后台/遮挡暂停=隐藏态程序化选区视觉陈旧（cosmetic——设计书 §5.2 申报，Electron 单窗口+拖选需前台输入不可触发）；③mutation 间隔受 dispatch 节奏 50ms 封顶——16.7ms 量级需更密 dispatch 口径方可观测（本轮口径下 50/60 交替的帧栅格量化已可分辨）；④AnnotationLayer 存量重锚域仍 DOM 量测域（门二 seam_ruling——INV-58 票外边界，独立票，SelectionLayer/selection-evaluate 头注入档）。

**结论：D2 调度与快路径落地达标**——5Hz 步进消灭（mutations 7→20 全跟随、间隔 200→50=dispatch 界）、每 tick clientRects/gCS 链尽消（gCS −87%/clientRects −87%——绝对计数含末尾 settle 单次全量；gBCR/Range.gBCR 绝对量随 tick 数上行、按 mutation 归一 4.9→2.3 次/mutation）、全链 delta med 降 2.5~3×、D1 面逐位零回归。快/慢路径同族（INV-58 后半）由构造保证+selection-evaluate.test 等价 it 锁定。

**门一回炉处置档（Kimi PASS_WITH_WARNINGS，2026-09-04——W1/W2/N1/N2 四条落地，仅追加）**：
- **W1（mouseup cancel-before-evaluate 顺序锚）**：selection-evaluate.test 新增 W1 it——预渲染形态（快路径帧先落 paint 在场→再发 selectionchange 重建在途 rAF→mouseup→改 zoom=3→推进 300ms 越过帧点与防抖点）断言终态=mouseup 时刻全量产物（zoom2 几何 168/792）。红证=临时删除 onMouseUp 内 scheduler.cancel() 调用（文件备份法）：恰 W1 it 红（终态被 zoom3 快路径/防抖全量覆盖为 252/792）其余 3 it 绿，还原 diff 空后全绿。**探针过程发现并申报（live range 语义）**：初版形态（mouseup 前 paint 未在场）下，mouseup 后 toolbar/paint portal 的 DOM 结构插入会诱发浏览器/jsdom 原生 selectionchange（live range 对所在树结构变更的反应——设计书 §1 S8 态同机制，不经 JS dispatchEvent）→ 新 rAF 排程→t+16ms 快路径重渲一次——**生产语义无害**（快/全量同族同产物=INV-58 等价性吸收，visual 不动 pending），属票外已知行为非 cancel 顺序缺陷；W1 终版以预渲染形态隔离该噪声（portal 已在场时全量重渲经 React 节点复用无结构插入→零诱发——探针 trace 实测 mouseup 后 handler 调用 +0）。
- **W2（MUT2 变异落点说明+重跑）**：变异落点=**一处**——selection-geometry.ts 调度器工厂内 settle 防抖窗**消费点**（`window.setTimeout(() => ops.onSettled(), ops.windowMs)` 的 `ops.windowMs`→硬编码 `100`；非 SELECTION_DEBOUNCE_MS 常量）。两测试同红机制：C3 直测显式传 `windowMs: 200`、S1b 组件级经 `SELECTION_DEBOUNCE_MS=200` 注入——**两侧传参均为 200、流经同一被变异消费点**；变异体忽略传参按 100 执行→C3「距末事件 199ms 未 settle」断言红（settle 已于 100ms 发）+S1b「t=150 工具条仍无」断言红（toolbar 已于 100ms 弹出）。一处变异两件红=红证声明属实；门一回炉轮已重跑留档（本轮 vitest 输出：C3+S1b 两红、其余 19 绿；还原 diff 空）。
- **N1（测试件头注笔误）**：selection-evaluate.test「ADR-2017」→ADR-0017；夹具注释「span 盒 y=200」→「视口绝对 y=500=textLayer 盒 y300+盒本地 y200（DOM 回退链归一 top≈25.25%=(500−300)/792）」——注释与代码一致（绝对/本地两域口径写死）。
- **N2（§12 措辞收敛）**：「布局读出链尽消」→「clientRects/gCS 链尽消（gBCR/Range.gBCR 绝对量上行——归因与净面披露已在档）」——§12 两处+selection-evaluate.ts/SelectionLayer.tsx 头注同口径，数据不动。

**门二终位（deepseek v4flash，2026-09-04）：PASS（零 findings）**——调度器 rAF 合帧/leading/settle/cancel 逐字核验通过，快路径四守卫、G2 同门、三层回退、INV-58 快慢等价与同帧覆盖、SelectionPaint memo 均无功能缺陷；门一四条处置闭合，材料口径差由主控核验说明补足。**F-A6-c 可提交收口，F-A6-d 开工条件满足**（d 票面含 live range 诱发链是否入 e2e 断言面的裁量）。审查档：f-a6c-gate1.raw.txt（Kimi PWW）+f-a6c-gate2.raw.txt/.json（deepseek PASS）。
