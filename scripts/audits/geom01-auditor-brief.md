# F-GEOM-01 设计链第二跳简报——对抗审核者（auditor-readonly）

> 派发档位声明：deepseek（deepseek-v4-flash，tier=debt-readonly，max 推理）。
> 你无仓库访问权；三份材料随包：①审核章程+主控核实回执（本件）②拟定者草案全文
> ③拟定者任务书（事实基线——草案引用的「随包数据」即此件的 §2~§9）。
> 你的职责：**只挑错，不改写**。产出=findings 清单+结论，供 GLM 主控终裁。

## 审核章程

对下方草案逐节对抗审核，六个维度：

D1 **受理门完备性**：必备八件（态空间表/跨格序列推演/回落档语义裁决/六子域
   目录重组清单与迁移序/净删行数记账/前史两条款承袭/验收底色/实施票切分）
   ——逐件判定「在场且达门槛」or「在场但深度不足」or「缺席」，缺任一=FAIL。
D2 **事实准确性**：草案一切计数/行号/邻接关系/INV 引述 vs 任务书事实——
   任何失实=B 级。
D3 **设计健全性**：内部矛盾/逻辑漏洞/与既有 INV（58/47/37/60/16/20）冲突/
   方案比较是否伪权衡。特别拷问（终裁位关注点，请独立评判勿照单全收）：
   - A1：草案 §2.1 S4 行「bands 优先 bandsFromItems（项在而偏移疑）」——S4
     触发前提=对账失败（items≠DOM 文本），用失配 items 产 bands 而 rects 用
     DOM=两源混用，是否违反 INV-58 C5 精神（禁 rect×band 异源混用）？
   - A2：S0「挂起守卫」=行为变更——现状 entry null 时首渲染走 S4 DOM 回退
     （有定位），挂起后=空白等待条目；草案声称消跳变，但是否引入更差的
     「空白闪现」？触发频率与视觉代价的论证是否成立？
   - A3：「S4 产物经族管线包装（端点式 clamp01+mergeRects）」——DOM 链
     rectsBetweenPoints 产物**已经**过 mergeLineRects→clamp01→mergeRects
     （任务书 §2.2 表+anchor-serialize 消费面），对已归一化产物再做「包装」
     的实际增量是什么？「形状差降为噪声级」的断言是否有依据（真实差源=
     聚类算法/行高来源/夹取形态三处上游差异，包装不动它们）？
   - A4：迁移序 M6 单步打包 27 文件移动+51 测试件 import 改写+eslint+
     check-quality+跨域 3 文件——「一步一提交」是否超载单个逻辑单元
     （宪法：一个逻辑单元一个 commit）？拆分建议？
   - A5：草案 §3.2 映射表把 page-items 与 page-items.store 列为两件——
     见下方回执 Q3（主控证据脚本正则伪影），映射表需修正否？
   - A6：净删目标 −150~−300 行的依据强度（S4 函数体零改约束下 DOM 几何
     产链物理上删得掉哪些？退役「声明」若无删码=净删从何来？）。
D4 **可实施性**：票切分 T1~T5 的工作量/受锁面现实性/每票 verify 面可达性。
D5 **遗漏面**：设计盲区（你独立发现——例如：快路径 viewportVersion 帧守卫
   的实现复杂度、AiAnnotationLayer 共形消费是否被覆盖、INV-60 source 标记
   在包装后的保持、undo 链 reader.store annotation-undo 与 S3b 存量回退的
   交互……不限于这些）。
D6 **终裁支持度**：每条 finding 给「建议终裁处置」（采纳修正/驳回重拟/呈用户）。

## 输出格式（≤200 行）

- 结论行：verdict=PASS / PASS_WITH_WARNINGS / FAIL（任一 B 级未闭合=FAIL）。
- Findings 分级列表：B（阻塞——事实失实/受理门缺失/设计矛盾）/ W（警告——
  深度不足或论证薄弱）/ N（注记——改进建议）；每条=编号+维度+草案位置引用+
  问题陈述+证据（引任务书或草案原文）+建议终裁处置。
- 末尾一段：对草案总体质量的一句话评估+若按建议修正后可否进入终裁。

## 主控核实回执（草案 §6.3 待澄清 6 项——主控已亲核仓库，审核时以此为事实）

- Q1（69 vs 70）：目录实测 69 存量文件；草案映射表合计=69 存量+1 新增件
  （geometry-types.ts）=70 项，自洽。**但**：映射表 anchors 域把 page-items
  与 page-items.store 列为两件（见 Q3）——实际为同一文件，故映射表实列
  68 存量+1 新增，漏 1 件存量待补（主控注：漏的是 reader-search 域或
  use-annotation-draft 需逐项对账——审核者请指出草案映射表与任务书 §5
  邻接表点名的差异）。
- Q2（两 store→PdfPageCanvas import 形态）：page-items.store.ts:37 与
  reader-search.store.ts:41 均 `import type`——type-only 确证，目录甲
  「0 例外」前提成立。
- Q3（page-items 与 page-items.store 包含关系）：**同一文件**（page-items.
  store.ts 单文件）；任务书 §5 邻接表中「page-items」条目=主控证据脚本
  正则伪影（`./page-items.store` 截断为 `page-items`），非两文件。
- Q4（S6 右溢支路可观测性）：留 T2 实施期实测——设计层面接受。
- Q5（warn 单源是否经 IPC）：**否**——annotation-resolve-layered.ts:63
  warn=console.warn（renderer 本地），零通道触点。契约面零变更论证闭合。
- Q6（store 首次就绪信号）：page-items.store **无** hydrated/ready 态
  （pages:{} 初始+setEntry/drop/clear 三写口）；S0 挂起守卫若采纳=需在
  T2 给 store 增设就绪信号（小改）或改判挂起守卫方案。

---

# 材料一：拟定者草案全文（送审稿，256 行）

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

---

# 材料二：拟定者任务书（事实基线——草案引用的随包数据源）

# F-GEOM-01 设计链第一跳简报——拟定者（drafter）

> 派发档位声明：kimi-main（kimi-k3，reasoning=max 档，tier=prime）。
> 派发通道：外部派发器（你无仓库访问权，一切事实已随包）。
> 主控：GLM5.3（本简报编制+终裁位）。日期：2026-09-18。

## 0. 任务

为单人本地学术文献管理+PDF 阅读标注桌面应用（Electron + 纯 TypeScript，渲染层 React）
拟定 **F-GEOM-01 战役设计书草案**。战役双目标（用户已裁决，不可改）：

- **A. 双几何族同族化**：pdf.js 项声明几何族（pdf-item-geometry.ts，515 行）收编
  DOM 量测几何族（annotation-anchor.ts，454 行）——单一真相源化；重锚三档回落
  S0-S6/band 推导三处/边界归一两机制随族收敛。
- **B. reader 子域目录化**：69 文件平铺目录（11,860 行）重组为六子域
  **anchors/view/interact/panels/time/state**（六域名=用户裁决定死，你只做文件
  归属映射，不改名）+ 域内单向依赖图。

你产出**设计书草案**（不是实现）。GLM 主控终裁后定稿，deepseek 已在你之前/之后
对抗审核（你无需自审合规，但事实错误会被抓——所有计数与行号以本简报随包数据
为准，不得自行虚构）。

## 1. 设计书必备章节（受理门——缺任一即不受理）

1. **锚定簇态空间表**：重锚链 S0~S6 全态枚举（态×入口条件×守卫×产物域标记
   source:'item'/'dom'×缺席语义×消费方回退），加 selection 链双路径态
   （快路径 visual/全量 full/各自回退态）。
2. **跨格序列推演**：至少覆盖以下序列的现状行为与同族化后行为（逐格推演，
   禁只给单格）——①拖选中途 zoom 变更（快路径帧已落地→全量同帧覆盖）；
   ②重锚期 store 条目迟到（CR1 竞态：订阅先于 textLayer 就绪）③对账失败
   整页切 S4 后下一帧对账恢复（跳变风险）④S6 抑制后条目再渲染 ⑤保存链
   rects=项几何族而显示链=S4 DOM 族（同屏双族形状差）。
3. **回落档语义裁决**（前史明文要件）：三档（项几何主链→DOM 量测→存量 rects）
   各自的去留/收缩/语义重定义；三回退因（页项缺失/偏移对账失败/计算异常）
   的处置；S4 与 S6 的命运（既有条款「门 3 随回退层去留复核」待决）。
4. **六子域目录重组清单与迁移序**：69 文件→六子域逐文件映射表+迁移步序
   （每步可独立提交且 verify 全绿）+域内单向依赖图（现状邻接表随包，见 §5）。
5. **净删行数记账**：方法（按域 git diff --stat 实测口径）+基线数字+目标估算
   （各收敛面分别列）。
6. **前史两条款承袭**：①「测试逼生产保形状」五例解耦票池统筹（见 §7——给出
   哪些随本战役、哪些独立票、哪些维持）；②契约面生长评估（selection 通道，
   见 §8）。
7. **验收底色**：e2e 默认门 43/一键全跑 45 全绿不破+锚定回归网（见 §9）+
   净删行数记账（M2 收敛量化证据）。
8. **实施票切分建议**：设计书批准后按此切执行票（每票一个逻辑单元独立提交）。

## 2. 系统现状（证据——你设计的事实基础）

### 2.1 两条消费链（双路结构=同屏维护两套几何族）

**selection 链（拖选→保存）**：
- 快路径 evaluateVisual（rAF 帧点）：四道守卫（选区空/跨页/页外/零宽盒）→
  轻量偏移 probe（Range.toString×2）→page-items.store 直读页项→
  reconcileItemsWithDom 对账→itemSelectionGeometry（项几何族）→G2 健康门
  →setPaint（灰层）。失败→回退全量视觉评估。
- 全量 evaluateFull（mouseup/settle）：selectionToAnchor 三元组
  （anchor-serialize：snapBlankBoundary×2→probeTextLength×2→quote/prefix/
  suffix±32 字符+**DOM 回退 rects**=rectsBetweenPoints）→itemChainFor 项几何
  主链（失败三因回退 DOM 量测链）→pending.anchor.rects=项几何产物（保存链
  与视觉同一来源）。
- 保存：save(kind)→api.reader.saveAnnotation（quote/prefix/suffix/startOffset/
  endOffset/rects 全量落库）。

**重锚链（翻页/缩放后标注重定位）**：S0~S6 状态机（annotation-resolve-layered，
每页一次编排）：
- S0：entry=usePageItemsStore 页项条目（react 订阅传入，CR1 store 晚于
  textLayer 就绪竞态由订阅兜底；CR3 取数以当前 page prop 为键）；
- S1：reconcileItemsWithDom(items, fullTextOf(textLayer)) 对账；失败→warn+S4；
- S2/S3a：对账通过→resolveAnnotationRectsItem（verifyQuoteItem 逐条校偏→
  itemSelectionGeometry）产物标 source:'item'；F-A9 calibrateBands 校准叠加；
- S3b：主链条目缺席（verifyQuoteItem 失败/他页/空引文）→消费方回退存量
  rects+bandsNearRects（语义=接线层现状推导式）；
- S4：页级回退=resolveAnnotationRectsDom（verifyQuote→findRangeAtOffset→
  rectsBetweenPoints[mLR 链]+bandsForTextNodes）产物标 source:'dom'
  （仅显示不回写）；**函数体零改=INV-47 数值面锚定（受锁断言）**；
- S6：S4 产物经 selectionHealth 判定（healthDom 口径）unhealthy→抑制 DOM
  产物显示+warn 单源。已知边界：右溢支路≈恒 0（DOM 产物经 clamp01 反推后
  不可观测）；S6 触发=项盒健康代理，项盒健康而 DOM 链独立病理时不拦。
- AI 段版 resolveAiNotesLayered 共形（S3b=该段不渲染——AI 无存量可回退；
  S4 产物被 S6 抑制=不渲染）。

### 2.2 双几何族对照（收编对象）

| 维度 | 项声明几何族（主链） | DOM 量测几何族（回退） |
| --- | --- | --- |
| 宿主 | pdf-item-geometry.ts（515 行纯函数） | annotation-anchor.ts（454 行）+annotation-resolve.ts（416 行）量测部分 |
| 几何来源 | PdfTextItem 自带 width/height/transform（pdf.js 定位 span 用的同一数据，按构造无测量噪声） | Range.getClientRects/gBCR/getComputedStyle/canvas measureText |
| 偏移映射 | buildItemOffsets（剔空串项逐项累计）+reconcileItemsWithDom 对账 | collectSpans（TreeWalker 文本节点累计） |
| 行级并块 | baselineGroupBlocks（基线 v 轴投影聚类+组内 x 大间隙断段 COLUMN_GAP_*） | mergeLineRects（y 重叠/中心距聚行簇+断段，同 COLUMN_GAP_* 单源 import） |
| 行距 | baselineTolPx（0.5×主导行字高下中位，max(2,·)） | estimateLinePitch（y 中心差滤 <2px 下中位）+annotation-merge estimateNormPitch（第二份） |
| 归一化 | 端点式 clamp01（两轴左右/顶底端点独立夹取后求差） | clamp01 各分量独立（rectsBetweenPoints） |
| 终裁归并 | mergeRects（annotation-merge，INV-A~D）近水平门内应用 | 归一化前 mergeLineRects+归一化后 mergeRects 双层 |
| bands | bandsFromItems（项盒+styles 派生，C5 禁混用） | bandsForTextNodes（节点口径）/bandsNearRects（几何口径）+bandFromMetrics（canvas 字体度量） |
| 健康门 | selectionHealth（G2：偏离率 ≥5%/右溢 >2px） | 无独立门（S6 借项几何盒判定） |
| 量测噪声 | 无（声明几何） | 有（锯齿/右溢病根族——历史修 4 轮） |
| viewport 数学 | viewportTransformFor（pdf.mjs PageViewport 构造器内联，userUnit=1 边界）+matMul（Util.transform 内联） | 无（直接用渲染产物） |

**DOM 几何产链的存活消费面（实测 grep，全仓仅三处，全部是回退层）**：
1. anchor-serialize.ts:230 selectionToAnchor 产 DOM 回退 rects（rectsBetweenPoints）；
2. annotation-resolve.ts:303 resolveAnnotationRectsDom（S4）；
3. annotation-resolve-layered.ts:237 AI 段 S4 + selection-evaluate.ts:311 全量
   DOM 回退（findRangeAtOffset）。
**mergeLineRects/estimateLinePitch/rectsFromRange 在 src 运行面零外部消费**
（仅 annotation-anchor 内部 rectsBetweenPoints 调用+受锁测试直测）。
**注意**：annotation-anchor 的文本遍历面（collectSpans/fullTextOf/offsetToPoint/
pixelBoxOf）不是几何族——它们是偏移系统基础设施，被 anchor-serialize/
anchor-blank-snap/release-affinity/layered S1 对账广泛消费，**不属于收编对象**。

### 2.3 band 推导三处+F-A9 校准叠加

1. bandsFromItems（项几何族，pdf-item-geometry）：每基线行一带，top/bottom=行内
   项盒纵向并集，x0/x1=水平端点，center 用未 clamp 原始值；
2. bandsForTextNodes（DOM 节点口径，annotation-resolve）：引文自身 textNodes→
   span 实测盒+canvas 字体度量→字形带（免疫 CSS 行盒整体偏移错绑上一行——
   真机实锤 ~9px 偏移在案）；matchBand 最近中心带匹配（|Δcenter|≤rect.h）；
3. bandsNearRects（DOM 几何口径，annotation-resolve）：rect 集→gBCR 预筛重叠
   span→行簇带（存量 rects 回退路径专用——重锚失败无节点可依）；
4. F-A9 calibrateBands（annotation-band-calibrate，120 行）：渲染时刻 DOM span
   盒实测校准 calTop/calBottom（项盒=styles 声明 ascent vs pdf.js span=量测
   ascent，小字号差 2.5~3px）；窗=span 中心∈band 垂直域+水平重叠>0；
   matchBand 匹配键仍派生 center（校准不参与行归属）。
RowBand 类型（top/bottom/center/x0?/x1?/calTop?/calBottom?）单源 annotation-resolve。

### 2.4 边界归一两机制（源码明言「互不替代」）

1. snapBlankBoundary（anchor-blank-snap.ts，285 行）：段末空白 affinity 归一
   （br 槽位/空白 span→视觉行行尾，nearestRow/columnGroups/rowEndOf）——
   DOM 亲和口径；
2. releaseAffinity（release-affinity.ts，211 行）：释放点浅探手势几何裁决
   （F-A12 下探下一段）——手势几何口径。
两者作用于不同事件相位（锚定三元组生成前 vs mouseup 释放时），设计需明确
「随族收敛」对这两者的含义（预期：维持两机制但声明其为非几何族域——待你裁决
并给理由）。

### 2.5 已知风险点（前史调研排序，设计应逐一处置）

1. **坐标域混用三处**：selection-geometry.ts:62 localScale / lineage-viewport.ts:80
   rootToLocalScale / annotation-resolve itemViewportOf（:385）——盒本地帧 vs
   视口域 vs svg 本地；历史取证实证减原点域差会令 G2 全抑制。
2. **S6 右溢支路失效**（clamp01 反推后 rightOverflowPx≈恒 0）。
3. **对账切换点跳变**：reconcile 失败整页切 S4，两族产物 rect 形状差=
   缩放/翻页瞬间标注跳变。
4. **双归并口径并存**：mergeLineRects（像素域）vs mergeRects（归一化域）+
   双行距估计（estimateLinePitch/estimateNormPitch，源码自认 Rule of Three
   第 2 次保持）。

### 2.6 相关不变量（既有裁决语义，设计不得违反，只可显式提案修订）

- **INV-58**：快路径与全量必须同一几何族；rect 与 bands 同由项几何+styles 派生
  （禁项源 rect×DOM 量测 band 混用）；适用域=selection 产链+Annotation/
  AiAnnotation 重锚链；**DOM 量测仅允许存在于显式回退层（S4）且产物必须标域
  （source:'dom'，INV-60 不入库）**；回退层允许=快→全量→DOM 三层回退末端，
  warn 不静默。
- **INV-47**：mergeLineRects 紧凑行距双门（pitch 钳制）——适用面已收缩为
  「S4 DOM 回退层+存量读时归并」；S4 函数体零改=受锁断言锚。
- **INV-37**：划选视觉=自绘并集层（选区状态直接函数，拖选期语义弱化显式登记
  「所见≈所存」，松手/保存时刻严格恢复）；selection-paint portal 单层单绘。
- **INV-60**：source 域标记=运行时调试面+单测断言面，不入库（渲染样式零差）。
- **INV-16**：pdfjs-dist import 白名单仅 4 文件（PdfDocProvider/PdfPageCanvas/
  TextLayer/CorpusExtractor——eslint override 块锁死）。
- **INV-20**：锚点定位单入口=anchor-locate（exact/page/paper 三防线+序号守卫）。
- 单窗口单实例=架构前提（渲染层模块级单例合法）。

### 2.7 目录化现状与爆炸半径

- reader 目录=69 文件平铺（.ts/.tsx/.css 合计 11,860 行，实测 wc）。高频耦合
  核心：reader.store.ts 484 行（per-tab 状态机，被 14 文件 import）/pdf-item-
  geometry 515/annotation-anchor 454/annotation-resolve 416/selection-evaluate
  326/anchor-serialize 259/annotation-resolve-layered 252。
- **类型级环（目录化必须切断）**：pdf-item-geometry↔annotation-anchor
  （PixelBox type-only 反向）/↔annotation-resolve（RowBand type-only 反向）/
  ↔PdfPageCanvas（PdfTextItem/PdfTextStyle type-only 反向）——运行时单向
  （type import 编译期擦除），但目录依赖图要求值依赖+类型依赖同向。
- **跨域消费面**：anchor-locate 被 lineage 域 2 文件+shared/open-paper-bus 消费
  （目录化后 import 路径同步更新）；App.tsx import ReaderPage/tab-dirty。
- **受锁面（改路径必触）**：51 个测试文件以相对路径 import features/reader/*
  （tests/** 受锁 sha256——改动=locks:unlock→改→apply 单链+[locked-change]+
  [test-refactor] 尾注）；eslint.config.js:89-92 四路径（INV-16 override 块）；
  scripts/check-quality.mjs:96-97 两路径（跨域规则表）。
- 分层单向宪法：renderer→window.api→ipc；文件 ≤500 行（repo ≤300 组件 ≤250）；
  方案切换=删除旧方案（不允许双方案并存）；死代码即删。

### 2.8 测试基线（验收底色的当前真值）

- vitest 170 文件/1745 用例；指纹门 187 文件/1790 用例/5417 断言/skipSites 15
  （C_after ⊇ C_before 机检在位）；locks manifest 338；registry 195 票 open 9。
- e2e：默认门 test:e2e=43 例（--project=app，不含探针）；一键全跑
  test:e2e:all=45 例。探针 spec（z-r2e/z-wg1）在 all 门。
- 锚定回归网（unit）：selection-evaluate/selection-layer×2/selection-item-chain/
  selection-geometry/selection-paint/selection-mode/annotation-anchor/
  annotation-layer/ai-annotation-layer/annotation-merge/anchor-blank-snap/
  anchor-item-verify/anchor-locate/band-calibration/pdf-item-geometry/
  pages-overlay/pdf-page-canvas（17 件）+e2e reader-text/reader-search/
  ai-notes-section。
- 五层规约头注惯例：GEOM 触及的锚定簇文件头注随票重写（改到哪写到哪）。

## 3. 设计裁决问题清单（草案必须逐项给出裁决+理由）

1. **「收编」的精确语义**：单一真相源的边界画在哪？候选面：①几何产链单源化
   （DOM 族 rects 产链退役/降级为 S4 专用实现细节）②band 三处→几处？
   ③归并器双口径（mergeLineRects/mergeRects）与双行距估计的收敛 ④pixelBoxOf/
   文本遍历面留在共享基础设施。每项给「退役/保留/收缩/迁移」四择一+理由。
2. **S4 去留**（回落档语义核心）：候选——a) 保留原样（INV-47 零改锚定不动）；
   b) 收缩触发面（对账失败才走，其他因走别的处置）；c) 退役（存量 rects 直接
   兜底）。注意受锁断言锚（resolveAnnotationRectsDom 函数体零改）与 INV-58
   「DOM 量测仅允许存在于显式回退层」的既有裁决张力；退役=INV 修订提案
   （需显式列出）。
3. **S6 去留**：右溢支路失效已知；若 S4 收缩/退役，S6 的意义重估。
4. **三回退因的现实处置**：页项缺失（entry undefined——渲染竞态 or 真缺席）/
   偏移对账失败（items≠DOM——pdf.js 版本演进风险）/计算异常（畸形 rotate）。
   各自的守卫/观测（warn 单源）/自愈路径设计。
5. **对账切换点跳变消减**：同族化后回退层产物与主链产物的形状一致性如何
   提升？候选：回退层产物也走项几何族包装（dom rects→同族归一化管线）？
   还是接受形状差+抑制跳变（过渡动画）？还是别的？
6. **六子域映射**：69 文件逐文件归属（anchors/view/interact/panels/time/
   state）+每域职责一句话+域内依赖方向声明+环切断方案（候选：types 下沉
   共享件/域内再分层）。**reader.store 是 state 域还是横切**（它被 14 文件
   import——横切 store 的归属是关键裁决）。
7. **迁移序**：每步一个可独立提交的原子迁移（受锁面单链），步数与顺序——
   先切环/先移低耦合域/先移高耦合 anchors 域？给出依赖驱动的拓扑序+每步
   verify 面。
8. **净删行数记账**：基线（reader 11,860/几何簇 7 文件合计 ~2,300 行）→
   各收敛面目标（同族化净删/目录化纯移动不增删/头注重写）。
9. **五例解耦票池统筹**（§7 五例）：哪些随本战役实现票、哪些独立票、哪些
   维持现状——给票池切分建议。
10. **契约面生长评估**：本战役预期零通道变更（纯 renderer 内部重构）——论证
    或证伪。
11. **实施票切分**：设计批准后的执行票清单（建议 3-6 票，每票独立提交+
    门审）。

## 4. 约束与红线（设计不得触碰）

- 禁止新增依赖；文件 ≤500 行；分层单向；测试是锁定的合约（设计若需改测试
  语义→显式列为 [locked-change][test-refactor] 面并给理由，不许默认可改）。
- 负面清单：不做跨页标注、不做多窗口、不做知识图谱自动引文网络图。
- e2e 验收底色不可降（43/45 全绿不破）；指纹门 C_after ⊇ C_before。
- 新增跨模块行为不变量须登记 docs/invariants.md（设计书列出预计新增/修订的
  INV 清单——如「几何产链单源」本身应升 INV）。
- 禁止为未来预建抽象（总原则：只还债不造新债）。

## 5. reader 域内 import 邻接表（实测，目录化设计输入）

（X -> Y 表示 X import Y；只列 reader 域内相对 import）

```
useActiveTab -> reader
FragmentNotesList -> annotation-style
OutlineThumb -> PdfDocProvider ; OutlinePanel -> OutlineThumb, PdfDocProvider
open-paper-anchor -> anchor-locate, reader
AiNoteGroupList -> ai-note-style
reader-search.store -> PdfPageCanvas, reader-search
useReaderSearch -> ReaderSearchBox, reader, reader-search, useActiveTab
SearchHighlightLayer -> page-layer-z, reader-search ; ReaderSearchBox -> reader-search
reader-search -> PdfPageCanvas
scroll-progress -> PageColumn, reader, scroll-converge
PageBox -> PdfDocProvider, PdfPageCanvas, page-column-geometry
page-items.store -> PdfPageCanvas
PagesOverlay -> AiAnnotationLayer, AnnotationLayer, PageColumn, PdfDocProvider, PdfPageCanvas, SearchHighlightLayer, TextLayer, page-column-geometry, page-items
selection-paint -> annotation-resolve, annotation-style, page-layer-z
AiAnnotationLayer -> ai-note-style, ai-notes, annotation-resolve, annotation-resolve-layered, annotation-style, page-items, page-layer-z, reader
reading-time-outbox-store -> reading-time-outbox
reading-time-setup -> reader, reading-time, reading-time-outbox, reading-time-outbox-store
AnnotationLayer -> AnnotationPopups, annotation-merge, annotation-resolve, annotation-resolve-layered, annotation-style, page-items, page-layer-z, reader
reader-shortcut-handlers -> ReaderShortcuts, ReaderToolbar, reader, useActiveTab
ReaderPage -> PageColumn, ReaderPageView, open-paper-anchor, reader, reader-shortcut-handlers, reading-time, reading-time-setup, scroll-progress, useActiveTab, useReaderSearch
PageColumn -> PageColumnView, PdfDocProvider, PdfPageCanvas, page-column-geometry, usePageColumnScroll, usePageLazyWindow
ReaderPageView -> OutlineAside, PageColumn, PagesOverlay, PdfDocProvider, ReaderToolbar, SelectionLayer, TabBar, page-column-geometry, reader, scroll-progress
PageColumnView -> PageBox, PdfDocProvider, PdfPageCanvas, page-column-geometry
usePageLazyWindow -> page-column-geometry ; usePageColumnScroll -> page-column-geometry, scroll-converge
AiNotesSection -> AiNoteGroupList, AiNotesStatus, ai-notes, ai-notes-phase, anchor-locate, useActiveTab
ReaderToolbar -> annotation-style ; AnnotationPopups -> AnnotationEditor, AnnotationMenu, annotation-undo, reader
annotation-resolve-layered -> anchor-serialize, annotation-anchor, annotation-band-calibrate, annotation-resolve, page-items, pdf-item-geometry
annotation-resolve -> anchor-serialize, annotation-anchor, page-items, pdf-item-geometry
annotation-band-calibrate -> annotation-anchor, annotation-resolve
anchor-serialize -> anchor-blank-snap, annotation-anchor
PdfPageCanvas -> page-layer-z, pdf-item-geometry
pdf-item-geometry -> PdfPageCanvas*, annotation-anchor*, annotation-merge, annotation-resolve*   (*=type-only)
annotation-anchor -> annotation-merge, pdf-item-geometry (COLUMN_GAP 值 import)
AnnotationEditor -> annotation-style, use-annotation-draft ; AnnotationMenu -> annotation-style
AiNotesStatus -> ai-notes, ai-notes-phase
anchor-blank-snap -> annotation-anchor
SelectionLayer -> SelectionToolbar, annotation-undo, reader, release-affinity, selection-evaluate, selection-geometry, selection-paint
release-affinity -> anchor-blank-snap, annotation-anchor
TabBar -> reader, tab-dirty ; tab-dirty -> reader
TextLayer -> PdfPageCanvas, page-layer-z, text-layer.css
OutlineAside -> OutlinePanel, ReaderNotesPanel, anchor-locate, reader, useActiveTab
ReaderNotesPanel -> AiNotesSection, FragmentNotesList, useActiveTab
anchor-locate -> anchor-serialize, reader, scroll-converge
reader.store -> annotation-undo
selection-evaluate -> anchor-serialize, annotation-anchor, annotation-band-calibrate, annotation-resolve, page-items, pdf-item-geometry, reader, selection-geometry
```

reader 域外消费：anchor-locate→lineage 域 2 文件+shared/open-paper-bus；
App.tsx→ReaderPage, tab-dirty。51 个测试文件 import reader 路径（受锁）。

## 6. 几何簇文件行数（净删记账基线，实测 2026-09-18）

pdf-item-geometry 515｜annotation-anchor 454｜annotation-resolve 416｜
selection-evaluate 326｜annotation-resolve-layered 252｜anchor-serialize 259｜
annotation-band-calibrate 120｜annotation-merge 173｜anchor-blank-snap 285｜
release-affinity 211｜anchor-locate 294｜page-items.store 69｜selection-geometry
142｜selection-paint 85（tsx）｜annotation-style 120｜annotation-undo 197｜
use-annotation-draft 193

## 7. 「测试逼生产保形状」五例（前史登记，解耦票池）

| 测试 | 锁住的生产形状 |
| --- | --- |
| tests/unit/services/lineage-tags.test.ts:66,87 | lineage 草稿 tags? 可选字段（旧版草稿零破坏） |
| tests/unit/services/reader-time.test.ts:56 | secondsDelta 第三参缺省=0 |
| tests/unit/renderer/annotation-layer.test.tsx:33-327 | 存量 rects 回退渲染路径 |
| tests/unit/renderer/reader-search-ui.test.tsx:440 | 某可选 prop 旧占位 span 兜底 |
| tests/unit/db/migrate-reading-time.test.ts:27 | v7→v8 迁移默认值 0 |

处置铁律（前史已裁）：解耦票须同时改 src 与对应测试走 [locked-change] 双门；
本战役设计书只做统筹（归属裁决），不放宽任何测试。

## 8. 契约面现状（生长评估对象）

IPC 12 域 55 通道（reader 域 6：saveAnnotation/saveAiNote 相关+打开/跳转族）；
renderer 统一经 api/client 门面。本战役=纯 renderer 内部重构，预期零通道变更、
零 src/shared 变更——设计书须论证此预期（或指出例外）。

## 9. 输出要求

- 中文 Markdown 设计书草案，产出预算 **≤500 行**（超出=截断风险，优先保
  态空间表/跨格序列/回落档裁决/迁移序四件的完备性）。
- 结构：§0 背景与目标→§1 现状诊断（引用本简报事实，禁重新发明）→§2 同族化
  设计（含必备章节 1/2/3）→§3 目录化设计（含必备章节 4/5）→§4 前史承袭
  （必备章节 6）→§5 验收与实施票切分（必备章节 7/8）→§6 风险与开放问题。
- 一切计数引用本简报随包数字；你的新主张如涉及未随包事实，标注
  **[假设]** 并说明需要主控核实什么。
- 对 §3 的 11 个裁决问题逐项编号回答（Q1~Q11），每项给裁决+理由+风险。
- 态空间表用 Markdown 表格；跨格序列用「序列名：格 1→格 2→…」逐格推演格式。
- 你不写实现代码；接口变更给签名级示意即可。

