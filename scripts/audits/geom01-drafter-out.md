[routing]: run=20260918024405-0ycwv762 source=kimi-main model=kimi-k3 role=drafter@3f094ae9 cfg=545b6843a147 switches=0 usage=in=7035,out=24741 latency=553999ms (by ds-call-v2 链)

# F-GEOM-01 战役设计书草案（拟定者：kimi-k3 / 送审稿）

> 本草案将送异构对抗审核（只挑错不改写）与 GLM 主控终裁。一切计数/行号/邻接关系引用任务书随包数据；新主张涉未随包事实处标 **[假设]** 并集中入 §6 待澄清清单。已知风险不隐藏，见 §6.1。

---

## §0 背景与目标

战役双目标（用户裁决定死）：**A. 双几何族同族化**（pdf.js 项声明几何族收编 DOM 量测几何族，单一真相源化）；**B. reader 子域目录化**（69 文件平铺 → anchors/view/interact/panels/time/state 六子域 + 域内单向依赖图）。本设计书覆盖受理门八件全部。

### 0.1 总体候选方案与权衡（DoD 要求 ≥2 候选）

| 维度 | **方案甲（推荐）：S4 收缩+族管线包装** | 方案乙：S4 退役，存量 rects 直接兜底 | 方案丙：最小同族化（仅目录化+声明） |
| --- | --- | --- | --- |
| 核心动作 | S4 保留但触发面收缩为「对账失败/计算异常且无存量」；产物经族归一化/归并管线包装；S6 口径重定义 | 删除 resolveAnnotationRectsDom 消费面，回退末端=S3b 存量 rects | 不改 S4/S6，仅移动文件+头注声明族属 |
| 复杂度 | 中（包装在调用侧，INV-47 函数体零改不动） | 高（INV-58/INV-47 双修订提案+受锁断言改写） | 低 |
| 风险 | 中：S4 形状变化触 annotation-layer 受锁测试 | 高：对账失败且无存量=整页标注消失，用户可见回退 | 低，但跳变/双族病根保留 |
| 迁移成本 | 1 张受锁测试双门票 | 2 项 INV 修订+多张受锁票 | 0 |
| 额度成本 | 中（同族化 1 票+目录化 1 票） | 高（INV 修订链+回归网重写） | 最低 |
| 跳变消减 | 形状差收敛至量测噪声级 | 无 DOM 族即无族差，但可见性回退代价大 | 无 |

**推荐方案甲**：与 INV-58「DOM 量测仅允许存在于显式回退层」兼容（不修订而强化），INV-47 零改锚不动，跳变风险以工程手段消减而非删除回退能力。方案乙作为 INV 修订提案存档（§6.2），本战役不实施。

---

## §1 现状诊断（引用随包事实，不重新发明）

1. 双消费链同屏维护两套几何族：selection 链（快路径 evaluateVisual/全量 evaluateFull，产物已同族）与重锚链（S0~S6，S2/S3a 产 source:'item'，S4 产 source:'dom'）。跳变病根在 **S4↔主链族差** 与 **对账切换点**（§2.5-3）。
2. DOM 几何产链存活消费面全仓仅三处（anchor-serialize:230 / annotation-resolve:303 / layered:237+selection-evaluate:311），全部是回退层；mergeLineRects/estimateLinePitch/rectsFromRange 运行面零外部消费。
3. band 推导三处+ F-A9 校准叠加，各有绑定档位；边界归一两机制（snapBlankBoundary/releaseAffinity）作用于不同事件相位，非几何族。
4. 类型级环三处（pdf-item-geometry↔annotation-anchor/annotation-resolve/PdfPageCanvas，均 type-only）为目录化必须切断点；坐标域混用三处（selection-geometry:62 / lineage-viewport:80 / itemViewportOf:385）为同族化数值风险点。
5. 受锁面：51 测试文件相对路径 import、eslint.config.js:89-92、check-quality.mjs:96-97、locks manifest 338。

---

## §2 同族化设计（受理门 1/2/3）

### 2.1 锚定簇态空间表（受理门 1）

重锚链 S0~S6（每页一次编排，annotation-resolve-layered；**加粗**=本战役变更点）：

| 态 | 入口条件 | 守卫 | 产物 source | 缺席语义 | 消费方回退 |
| --- | --- | --- | --- | --- | --- |
| S0 | 翻页/缩放/条目到达触发编排 | 页码键=当前 page prop（CR3）；**新增：订阅未就绪守卫——entry undefined 且 store 未首次就绪→编排挂起（pending），不进任何回退档** | 无 | entry undefined=渲染竞态（挂起）或真缺席（转 S3b 判定） | — |
| S1 | entry 就绪 | reconcileItemsWithDom(items, fullTextOf) | 无 | textLayer 未就绪不进入（编排前提） | 失败→warn 单源+S4（**收缩后仅此因入 S4**） |
| S2/S3a | 对账通过 | verifyQuoteItem 逐条校偏；G2 前 F-A9 calibrateBands 叠加 | **'item'** | 条目缺席（校偏失败/他页/空引文）→S3b | S3b |
| S3b | 主链条目缺席 | 存量 rects 存在性检查 | 'item'（存量，族产物历史落库） | 无存量→Annotation 不渲染该条（AI 段原语义：不渲染） | 无（显示链末端之一） |
| S4 | **仅：S1 对账失败 ∨（计算异常 ∧ 无存量）** | INV-47：resolveAnnotationRectsDom **函数体零改**；**新增：调用侧族管线包装——产物 rects 经端点式 clamp01+mergeRects 归并+bands 优先 bandsFromItems（项在而偏移疑），项真缺席才 bandsForTextNodes** | **'dom'（域标记保留，INV-60 不入库）** | 页项缺失→bands 降 nodes 口径 | 仅显示不回写；S6 判定 |
| S6 | S4 产物就绪 | **口径重定义：对族管线包装后产物跑 selectionHealth（不再借项盒代理）；unhealthy→抑制显示+warn 单源（去重）** | 无 | — | 抑制=不渲染；AI 段共形 |

selection 链双路径态：

| 态 | 入口 | 守卫 | 产物 source | 回退 |
| --- | --- | --- | --- | --- |
| 快路径 evaluateVisual | rAF 帧点 | 四道守卫（选区空/跨页/页外/零宽盒）+轻量 probe+对账+G2；**新增：viewportVersion 帧守卫（zoom/翻页即作废未落地帧）** | 'item' | 失败→全量 |
| 全量 evaluateFull | mouseup/settle | selectionToAnchor 三元组→itemChainFor 主链 | 'item' | 三因失败→DOM 量测链（回退末端，warn） |
| 全量 DOM 回退 | 主链三因失败 | findRangeAtOffset→rectsBetweenPoints；**产物同 S4 族管线包装** | 'dom' | 无（末端），warn 不静默 |
| 保存态 | save(kind) | pending.anchor.rects=项族产物（或包装后回退产物，域标记运行时面） | 落库矩形=族形状 | — |

### 2.2 跨格序列推演（受理门 2）

**序列① 拖选中途 zoom 变更（快路径帧已落地→全量同帧覆盖）**
现状：格1 rAF 快路径以旧 viewport 算项族产物→setPaint 灰层落地 → 格2 zoom 变更，textLayer 重排，已落地帧的几何基底失效但视觉仍在屏 → 格3 mouseup/settle 同帧触发全量 → 格4 全量以新 viewport 重算族产物覆盖灰层 → 格5 保存。风险格=格2~格4 之间旧帧残留=闪跳。
同族化后：格1 快路径帧携带 viewportVersion 落地 → 格2 zoom 使 version 递增，未落地帧作废、已落地灰层随 textLayer 重排自然清除（INV-37 拖选期语义弱化已登记） → 格3 全量仅在新 version 上求值 → 格4 同族同 version 产物覆盖，无族差闪跳 → 格5 保存。

**序列② 重锚期 store 条目迟到（CR1 竞态）**
现状：格1 textLayer 就绪触发编排 → 格2 S0 entry=订阅值暂 undefined → 格3 现状无挂起态，编排可能以空 entry 误进 S3b/S4 → 格4 订阅兜底条目到达→重跑编排→S3a 族产物覆盖 → 格5 S3b/S4→S3a 的形状差=跳变。
同族化后：格1 同 → 格2 S0 新守卫判「store 未首次就绪」→ 格3 编排挂起（pending，零产物零回退，warn 观测一次） → 格4 条目到达直接 S1→S3a 一次性产出 → 格5 无中间态即无跳变。真缺席（空引文/他页）在挂起超时/就绪确认后转 S3b 判定，与竞态分流。

**序列③ 对账失败整页切 S4 后下一帧对账恢复**
现状：格1 S1 reconcile 失败→warn+整页 S4 → 格2 S4 产 source:'dom'（mergeLineRects 像素域+分量 clamp01 形状）显示 → 格3 条目更新/下一帧对账恢复→S3a → 格4 族产物（端点 clamp01+mergeRects 形状）覆盖 → 格5 两族形状差=缩放/翻页瞬间标注跳变（已知风险 3）。
同族化后：格1 同（S4 触发面收缩后此序列即 S4 唯一主入口） → 格2 S4 产物经族管线包装：DOM 仅作偏移定位，形状产出=端点式 clamp01+mergeRects+bandsFromItems 优先 → 格3 对账恢复→S3a → 格4 两产物同管线同归并，残余差=DOM 量测噪声级（历史右溢/锯齿病根族的残差） → 格5 差幅落入 G2 偏离门内则视觉无感；超门由 S6 新口径抑制+warn，单帧切换不做过渡动画（理由：单窗口单实例+翻页帧预算，动画引入新时序债）。

**序列④ S6 抑制后条目再渲染**
现状：格1 S4 产物经 selectionHealth（借项盒代理）判 unhealthy → 格2 抑制 DOM 产物+warn → 格3 条目再渲染（返回该页/缩放）触发新编排 → 格4 若仍对账失败且 unhealthy→持续抑制；右溢支路≈恒 0 不可观测（clamp01 反推） → 格5 若恢复 S3a→直接显示。
同族化后：格1 判定对象=包装后产物，口径=selectionHealth 同一门 → 格2 抑制态=渲染态纯函数（不登记持久态），warn 单源按页去重 → 格3 重渲染=重评估，无抑制残留态 → 格4 右溢支路可观测性随端点式 clamp01 统一重估 **[假设]**（§6 待澄清 4） → 格5 同。

**序列⑤ 保存链=项族 rects 而显示链=S4 DOM（同屏双族形状差）**
现状：格1 拖选保存：全量链产族 rects 落库 → 格2 同屏他条标注正走 S4（对账失败页）显示 DOM 族形状 → 格3 翻页返回，新保存条经 S3b 消费存量族 rects 显示 → 格4 与格2 同屏残留 S4 形状并存=双族同屏；单条自身在 S4 显示→落库族形状之间的差=再进入时跳变。INV-58 现状允许（S4 显式回退+域标记）。
同族化后：格1 同 → 格2 S4 产物已族管线包装，同屏两形状差收敛至噪声级 → 格3 同 → 格4 残余差由 S6 新口径兜底；INV-58 语义不变但「族差」从结构性降为噪声性。

### 2.3 回落档语义裁决（受理门 3，前史明文要件）

| 档 | 裁决 | 语义重定义 |
| --- | --- | --- |
| 档1 项几何主链 | **保留+强化** | 升为唯一几何真相源；新增 INV 登记「几何产链单源」（§5.3） |
| 档2 DOM 量测 | **收缩** | 仅存活于：S4（对账失败/计算异常且无存量）+全量链回退末端+anchor-serialize:230 DOM 回退 rects；三处之外禁新消费；产物一律族管线包装+source:'dom' |
| 档3 存量 rects | **保留** | 从「接线层现状推导式」升为显式档：S3b 专用，bands=bandsNearRects 专绑此档 |

三回退因处置：

| 回退因 | 守卫 | 观测（warn 单源） | 自愈路径 |
| --- | --- | --- | --- |
| 页项缺失（entry undefined） | S0 挂起守卫分流竞态 vs 真缺席 | 挂起一次/页；真缺席一次/条 | 订阅到达自愈合（编排重入） |
| 偏移对账失败（items≠DOM） | S1 reconcile 现门 | warn+计数（页码+条目数） | S4 族管线包装产物显示；条目更新/翻页重对账自愈合 |
| 计算异常（畸形 rotate 等） | 主链 try/catch 守卫 | warn+异常类名 | 有存量→S3b；无存量→S4；均无→不渲染 |

**S4 命运**：保留+收缩触发面（方案甲核心）；INV-47 函数体零改维持，包装在调用侧——受锁断言锚不动。
**S6 命运**：保留+口径重定义（对包装后产物跑统一健康门）；「门 3 随回退层去留复核」条款结案=**保留**，因 S4 存续。右溢支路失效问题不在本战役修（支路重估列入待澄清 4，避免为不可观测分支造新抽象）。

---

## §3 目录化设计（受理门 4/5）

### 3.1 目录候选与权衡

| 维度 | **目录甲（推荐）** | 目录乙：语义分层序 panels→interact→view→anchors→state |
| --- | --- | --- |
| 域序（上→下） | view→panels→interact→time→anchors→state | panels→interact→view→anchors→state |
| 冲突边数 | 0（全邻接表核验通过） | 6 处需例外或额外调动（ReaderPageView→OutlineAside、ReaderPage→useReaderSearch、PagesOverlay→SearchHighlightLayer→reader-search 环等） |
| 复杂度/迁移成本 | 7 原子步 | 7 步+6 例外登记 |
| 风险 | 组件装配链全入 view，view 域偏大（27 文件） | 例外破坏「单向」承诺 |

**裁决理由**：React 装配链（父组件 import 子组件）天然自上向下，域序顺从装配链方向则零例外；view 域偏大以「域内再分层 DAG」治理（3.4）。

### 3.2 69+ 文件逐文件映射表（邻接表全量点名文件=70 项；与「69 文件」差 1 列入待澄清 1）

**state/（9）**——全局状态/上下文/共享常量与类型：
reader（类型常量）、reader.store、tab-dirty、useActiveTab、annotation-undo、PdfDocProvider（文档上下文）、page-layer-z（层级常量）、ai-notes、ai-notes-phase（AI 笔记数据/相位服务，叶件）
**anchors/（15）**——锚定真相源（几何族+序列化+定位+配套样式常量）：
geometry-types.ts（**新增**，类型下沉件）、pdf-item-geometry、annotation-anchor、annotation-merge、annotation-resolve、annotation-resolve-layered、annotation-band-calibrate、anchor-serialize、anchor-blank-snap、anchor-locate、page-items、page-items.store、open-paper-anchor、scroll-converge（滚动收敛原语，首要消费方=anchor-locate，边界件注明）、annotation-style、ai-note-style（样式常量随标注族真相源）
**time/（4）**：reading-time、reading-time-setup、reading-time-outbox、reading-time-outbox-store
**interact/（7）**——选择交互链+手势裁决：
SelectionLayer、SelectionToolbar、selection-evaluate、selection-geometry、selection-paint、release-affinity、use-annotation-draft
**panels/（8）**——侧栏面板：
OutlineAside、OutlinePanel、OutlineThumb、ReaderNotesPanel、AiNotesSection、AiNoteGroupList、AiNotesStatus、FragmentNotesList
**view/（27）**——页面渲染与装配：
ReaderPage、ReaderPageView、PageColumn、PageColumnView、PageBox、PagesOverlay、AnnotationLayer、AiAnnotationLayer、AnnotationPopups、AnnotationEditor、AnnotationMenu、ReaderToolbar、TabBar、reader-shortcut-handlers、ReaderShortcuts、PdfPageCanvas、TextLayer、text-layer.css、page-column-geometry、usePageColumnScroll、usePageLazyWindow、scroll-progress、useReaderSearch、ReaderSearchBox、reader-search、reader-search.store、SearchHighlightLayer

**关键归属裁决**：reader.store ∈ state（非横切——14 个 import 方全部位于其上域，单向可达，「被多方 import」不等于横切）；page-items.store ∈ anchors（S0 专用数据源，簇内聚优先于「store 都进 state」的机械归类）；annotation-undo ∈ state（被 state/view/interact 三域消费，置底）；搜索簇（reader-search 族+SearchHighlightLayer）∈ view（页内功能非侧栏）。

### 3.3 域内/域间单向依赖图

```
panels ─┐
interact┤
time ───┤
view ───┴──→ （均允许直下）──→ anchors ──→ state
域间合法方向（甲）：view→panels/interact/time/anchors/state；
panels→anchors/state；interact→anchors/state；time→state；anchors→state
```
邻接表全边核验结果：合法；**唯二违规边** page-items.store→PdfPageCanvas 与 reader-search.store→PdfPageCanvas，裁决=类型下沉切断（PdfTextItem/PdfTextStyle/PixelBox/RowBand 类型+COLUMN_GAP 常量单源迁入 anchors/geometry-types.ts，PdfPageCanvas 改为 view→anchors 正向 import）**[假设：两边均为 type-only，待澄清 2]**。三处既有 type-only 环同此一切断。

### 3.4 view 域内再分层 DAG（域内单向承诺）

装配层（ReaderPage→ReaderPageView→{PagesOverlay, OutlineAside∈panels, SelectionLayer∈interact}）→ 层件层（AnnotationLayer→AnnotationPopups→Editor/Menu；PageColumn→PageColumnView→PageBox→PdfPageCanvas←TextLayer）→ 原语层（page-column-geometry、page-layer-z∈state、scroll-converge∈anchors）。无环（邻接表核验）。

### 3.5 迁移序（每步独立提交+verify 全绿）

| 步 | 动作 | verify 面 |
| --- | --- | --- |
| M0 | geometry-types.ts 落地+三处 type-only 环+两处 store→PdfPageCanvas 边改向（不移动任何文件） | unit 全绿+指纹门 |
| M1 | state/ 9 文件 git mv+import 改写 | 全绿+e2e 43 |
| M2 | anchors/ 迁移（含受锁面单链：locks:unlock→改→apply） | 全绿+锚定回归网 17 件 |
| M3 | time/ 4 文件 | 全绿 |
| M4 | interact/ 7 文件 | 全绿+selection 回归 |
| M5 | panels/ 8 文件 | 全绿 |
| M6 | view/ 27 文件+eslint.config.js:89-92 四路径+check-quality.mjs:96-97 两路径+51 测试文件 import 路径机械改写（[test-refactor] 尾注，零语义变更）+App.tsx/lineage 域 2 文件/shared open-paper-bus 路径同步 | 全绿+e2e 43/45+指纹门 |

顺序理由=依赖驱动拓扑序（自下而上，先切环再移底域，被依赖者先落定，每步 import 改写量最小化）。

### 3.6 净删行数记账（受理门 5）

- **方法**：每票收尾 `git diff --stat <base>..HEAD -- src/renderer/features/reader` 按新域分组实测；受锁测试改动单列不计入生产净删。
- **基线**：reader 11,860 行（实测 wc）；几何簇 17 文件（§6 清单）合计 **4,111 行**（简报「7 文件 ~2,300」为子集口径，两口径并列存档）。
- **目标估算 [估算]**：①同族化净删 **−150~−300**（DOM 几何产链公共面收缩：mergeLineRects/estimateLinePitch/rectsFromRange 外部消费面退役声明+S4 包装带来的重复面合并；S4 函数体零改故净删有限）②目录化 **±0**（纯移动）③头注重写 **+50~+120**（五层规约头注，改到哪写到哪）④geometry-types 新增 **+40~+80**（类型搬迁，源文件等量减少，净额≈0）。净删量化证据=M2 票 diff 实测对账估算区间。

---

## §4 前史承袭（受理门 6）

### 4.1 「测试逼生产保形状」五例票池统筹

| 例 | 与本战役交集 | 归属裁决 |
| --- | --- | --- |
| annotation-layer.test.tsx:33-327 存量 rects 回退渲染路径 | **有**：S3b 升显式档+S4 包装改变渲染产物形状 | **随本战役票 T2**，[locked-change][test-refactor] 双门，src+测试同票改 |
| lineage-tags:66,87 / reader-time:56 / reader-search-ui:440 / migrate-reading-time:27 | 零交集（lineage/time/search UI/db 迁移语义均不动；time/search 文件仅路径迁移，测试 import 改写属 M6 机械 [test-refactor]，非解耦） | **独立票池维持现状**，本战役不触碰、不放宽 |

### 4.2 契约面生长评估（Q10）

**结论：零通道变更、零 src/shared 变更**。论证：改动面 100% 位于 src/renderer/features/reader 内部；saveAnnotation 落库载荷字段（quote/prefix/suffix/offsets/rects）不变，rects 形状语义不变（族产物本就落库）；目录化仅 import 路径；renderer 统一 api/client 门面无触点。**唯一缺口**：warn 单源若为纯 renderer 日志则零通道；若经 IPC 上报则需核 **[假设，待澄清 5]**——核实路径：主控 grep warn 实现是否触 window.api。

---

## §5 验收与实施票切分（受理门 7/8）

### 5.1 验收底色

- e2e 默认门 43 / 一键全跑 45 全绿不破（探针 z-r2e/z-wg1 在 all 门）；
- 锚定回归网 17 件 unit+e2e reader-text/reader-search/ai-notes-section 全绿；
- 指纹门 C_after ⊇ C_before 机检（187 文件基线；净删面须证明断言覆盖不降）；
- 净删记账报告（§3.6 口径）随 T5 提交。

### 5.2 实施票切分（Q11，设计批准后执行）

| 票 | 内容 | 门 |
| --- | --- | --- |
| T1 | geometry-types 类型下沉+三环两边切断（§3.5 M0） | unit+指纹 |
| T2 | 同族化核心：S0 挂起守卫、S4 触发面收缩+族管线包装、S6 口径重定义、三回退因处置、warn 单源、viewportVersion 帧守卫；含 annotation-layer 受锁测试双门 | 回归网 17 件+e2e 43 |
| T3 | 坐标域单源化（selection-geometry:62/lineage-viewport:80/itemViewportOf:385 收敛至 viewportTransformFor 派生，头注登记域标记）；INV 登记（5.3） | unit+G2 相关断言 |
| T4 | 目录化迁移 M1~M6（七原子步，受锁面单链） | 每步全绿+e2e 43/45 |
| T5 | 头注重写收尾+净删记账报告+验收门全跑 | 全门 |

### 5.3 预计新增/修订 INV 清单（登记 docs/invariants.md）

- **新增 INV-GEOM-01**：几何产链单源——rects/bands 形状产出统一族管线，DOM 量测仅为偏移定位手段且限于显式回退层。
- **修订 INV-58**：增补「S4/全量回退产物须经族管线包装；source 域标记语义不变」。
- **INV-47 确认不修订**（函数体零改，适用面现状延续）。
- **备案不实施**：方案乙（S4 退役）=INV-58/47 修订提案存档。

---

## §6 风险与开放问题

### 6.1 已知风险/不确定点（为对抗审核预置）

1. S4 族管线包装改变产物形状→annotation-layer 受锁测试 33-327 行断言面可能大范围改写，[locked-change] 规模或被审核判超票——预案：T2 内形状差逐断言对账表先行。
2. S0 挂起守卫引入「编排 pending」新态，若 store 就绪判定信号不存在/不可靠 **[假设]**，守卫退化为超时兜底=新时序复杂度。
3. view 域 27 文件偏大，与「文件 ≤500 行」文件级约束无冲突，但域粒度均衡性可能被质疑——备选：view 域内再分层（3.4）已前置应答。
4. scroll-converge/annotation-style/ai-note-style/PdfDocProvider 四件归属为职责语义裁决，审核者可持异；切换成本低（映射表行级调整）。

### 6.2 开放问题存档

方案乙（S4 退役）INV 修订提案存档备主控未来启用；mergeLineRects↔mergeRects/estimateLinePitch↔estimateNormPitch 采「语义收敛不物理合并」（各绑其层+禁跨层新消费+头注登记），Rule of Three 第三次出现时再裁物理合并。

### 6.3 待澄清清单（集中，逐条含获取路径）

1. **69 vs 70 文件差 1**：邻接表点名去重=70 项。获取路径：主控 `ls src/renderer/features/reader` 实测，核准映射表是否漏一文件（疑似 css 口径差）。
2. **page-items.store→PdfPageCanvas、reader-search.store→PdfPageCanvas 是否 type-only**：目录甲 0 例外成立的前提。获取路径：主控 grep 两文件 import 语句；若为值依赖，备选=两 store 改归 view/anchors 并局部调序。
3. **page-items 与 page-items.store 的包含关系**（邻接表未见 page-items→page-items.store 边）。获取路径：主控核 page-items 导出面。
4. **S6 右溢支路在端点式 clamp01 统一后的可观测性**：决定该支路修复/删除。获取路径：T2 实施期对包装后产物实测 rightOverflowPx 分布。
5. **warn 单源是否经 IPC 上报**（契约面零变更论证的唯一缺口）。获取路径：主控 grep warn 实现链。
6. **store「首次就绪」信号是否可判定**（S0 挂起守卫前提）。获取路径：主控核 page-items.store 是否暴露 hydrated/ready 态。

---

## 附：Q1~Q11 裁决汇总

| Q | 裁决（详文位置） |
| --- | --- |
| Q1 收编语义 | ①几何产链单源化=**退役公共面/收缩为 S4 专用**；②band 三处=**保留各绑档禁混用**；③归并/行距双口径=**语义收敛不物理合并**；④文本遍历面=**保留共享基础设施不入收编**（§2.3/§6.2） |
| Q2 S4 | **b 收缩触发面+族管线包装**，INV-47/58 不修订（§0.1/§2.3） |
| Q3 S6 | **保留+口径重定义**；门 3 复核结案=保留（§2.3） |
| Q4 三回退因 | 分流守卫+warn 单源+自愈路径表（§2.3） |
| Q5 跳变消减 | **族管线包装使形状差结构性→噪声性**；不做动画；S6 兜底（序列③⑤） |
| Q6 六子域映射 | 目录甲 70 文件映射表；reader.store∈state 非横切；环切断=类型下沉（§3.2/§3.3） |
| Q7 迁移序 | M0~M6 依赖驱动拓扑序，每步独立提交全绿（§3.5） |
| Q8 净删记账 | git diff --stat 按域实测；基线 11,860/4,111；目标 −150~−300（§3.6） |
| Q9 五例票池 | 1 例随战役（T2 双门），4 例维持现状（§4.1） |
| Q10 契约面 | 零通道变更（论证+1 假设待核）（§4.2） |
| Q11 票切分 | T1~T5 五票（§5.2） |

**边界归一两机制裁决**（随 Q1④）：snapBlankBoundary/releaseAffinity **维持两机制**，显式声明为非几何族域（偏移系统/手势几何基础设施），不入收编；理由：作用于不同事件相位且源码明言「互不替代」，收编=为统一而统一的新债；处置=头注登记族属声明。坐标域混用三处：T3 收敛至 viewportTransformFor 单源派生（历史取证「减原点域差令 G2 全抑制」为反例教训，故收敛配 G2 断言对账）。

（草案完，送对抗审核与主控终裁。）