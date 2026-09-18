[routing]: run=20260918025622-lgzgv9c7 source=deepseek model=deepseek-v4-flash role=auditor-readonly@001e83df cfg=545b6843a147 switches=0 usage=in=16315,out=18244 latency=80362ms (by ds-call-v2 链)

# F-GEOM-01 设计书草案——对抗审核 findings（只读）

**verdict=返工**（5 条 B 级未闭合；修正后可再入终裁）。

---

## B 级（阻塞）

**B1｜维度 D2（事实准确性）｜§3.2 映射表 + §6.3 Q1**
问题：映射表计数三处不自洽。anchors 域标注「（15）」但实列 **16** 项（geometry-types、pdf-item-geometry、annotation-anchor、annotation-merge、annotation-resolve、annotation-resolve-layered、annotation-band-calibrate、anchor-serialize、anchor-blank-snap、anchor-locate、page-items、page-items.store、open-paper-anchor、scroll-converge、annotation-style、ai-note-style）；表头声明「邻接表全量点名=70 项」；括号合计 9+15+4+7+8+27=70，与实列 71 不符。且 §3.2 把 `page-items` 与 `page-items.store` 列为两件——主控回执 Q3 已确证**同一文件**（§5 邻接表「page-items」=正则伪影），故草案存在**幽灵行 page-items**，多计 1 件。
证据：主控回执 Q1/Q3；任务书 §5 邻接表「page-items.store -> PdfPageCanvas」单条。
建议终裁处置：**采纳修正**——删除幽灵行 page-items、令 page-items.store 单列；以主控 `ls` 实测逐项对账 69 存量，锁定后重算括号计数；不得以「口径差」含糊结案。

**B2｜维度 D3/A1（设计矛盾）｜§2.1 S4 行**
问题：S4 触发前提=对账失败（items≠DOM），此时草案令 **rects 走 DOM（rectsBetweenPoints）而 bands 优先 bandsFromItems（项源）**，构成「DOM 源 rect × 项源 band」异源混用。INV-58 C5 明定「rect 与 bands 同由项几何+styles 派生（禁混用）」，C5 精神=同源；草案此举与「单一真相源」总目标自相矛盾。
证据：任务书 §2.6 INV-58；§2.2 bands 表；草案 §2.1 S4「产物 rects 经…+bands 优先 bandsFromItems…项真缺席才 bandsForTextNodes」。
建议终裁处置：**驳回重拟**——若走 DOM 回退层，rect 与 band 须同源（同取 bandsForTextNodes），或明确列为 INV-58 C5 修订提案并给理由，二选一。

**B3｜维度 D3/A3（核心机制不成立/伪权衡风险）｜§0.1、§2.2 序列③、§5.2 T2**
问题：「S4 产物经族管线包装（端点式 clamp01+mergeRects）→形状差降为噪声级」为核心推荐依据，但**增量为空**：DOM 链 rectsBetweenPoints 产物**已经** mergeLineRects→分量 clamp01→mergeRects（任务书 §2.2 表），再套一层 clamp01+mergeRects 不改变上游真实差源——**聚类算法（baselineGroupBlocks vs mergeLineRects）、行高来源（baselineTolPx vs estimateLinePitch）、夹取形态（端点式 vs 分量）**三处上游差异，包装均不触碰。故「噪声级」断言无据，方案甲相对丙的优势不成立（伪权衡嫌疑）。
证据：任务书 §2.2 双族对照表；草案 §0.1「跳变消减=形状差收敛至量测噪声级」。
建议终裁处置：**驳回重拟**——要么提供包装前后产物的量化差（右溢/偏离率分布）证明收敛，要么改判为「接受残余差+S6 抑制」。

**B4｜维度 D3/A6（受理门 5 内部矛盾）｜§3.6**
问题：目标①同族化净删 **−150~−300** 行，与同段自述「S4 函数体零改故净删有限」直接矛盾；且任务书 §2.2 明载 mergeLineRects/estimateLinePitch/rectsFromRange **src 运行面零外部消费**（仅 annotation-anchor 内部+受锁测试直测），既无外部消费，「退役声明」物理上不产生删行。扣除 S4（零改）与新增 geometry-types（+40~80）后，净删来源不明。
证据：任务书 §2.2「零外部消费」；§2.6 INV-47「函数体零改受锁锚」；草案 §3.6。
建议终裁处置：**驳回重拟**——给出逐项删行清单（文件/行区间），不得以区间估算代替证据；无法证实则应下调目标或撤回净删承诺。

**B5｜维度 D3/A2（设计前提缺失）｜§2.1 S0、§6.1-2、§6.3 Q6**
问题：S0「订阅未就绪守卫」以「store 未首次就绪」为判据，但主控 Q6 确证 page-items.store **无 hydrated/ready 态**（pages:{} 初值+三写口）——判据不存在。后果：①竞态与真缺席不可分，守卫退化为超时兜底（草案自认「新时序复杂度」）；②现状 entry null 首渲染走 S4（有定位），挂起后=空白等待条目，「消跳变」同时引入**空白闪现**，而触发频率与视觉代价草案未量化。行为变更+新态+不可判，属新债。
证据：主控 Q6；草案 §2.1 S0、§6.1-2。
建议终裁处置：**采纳修正**——先定 store 就绪信号（T2 增设）再谈挂起守卫，或改判挂起方案；补齐「空白闪现 vs 跳变」的频率×代价对比。

---

## W 级（警告——深度不足/论证薄弱）

**W1｜D3/A4｜§3.5 M6、§5.2 T4**：M6 单步打包「27 文件 git mv + 51 测试 import 改写 + eslint.config.js:89-92 + check-quality.mjs:96-97 + 跨域 3 文件」违「一逻辑单元一 commit」。建议拆 M6a（view 域移动）/M6b（受锁面+测试路径机械改写）两步，各带独立 verify。
**W2｜D1｜§2.2 序列②**：「挂起超时/就绪确认后转 S3b」的超时阈值与判定机制未定义，受理门 2 深度不足。建议给超时值与回退语义。
**W3｜D5 遗漏｜§2.1 快路径**：新增 viewportVersion 帧守卫未评估实现复杂度及其与 INV-37「portal 单层单绘」的交互（作废未落地帧 vs 已绘灰层清除的时序）。
**W4｜D5 遗漏｜§4/§5**：annotation-undo（state）与 S3b 存量回退的交互（undo 后重锚落哪档）未覆盖。
**W5｜D3｜§3.3**：「唯二违规边」含 reader-search.store→PdfPageCanvas，但两者均在 view 域，属**域内边**，非域间违规；分类存疑。且 view 域 27 文件偏大，仅以「域内再分层」回应，粒度均衡未证。
**W6｜D3｜§0.1 vs §6.1-1**：§0.1 称迁移成本「1 张受锁测试双门票」，§6.1 又称 annotation-layer.test.tsx:33-327「可能大范围改写」。受锁面规模前后矛盾，影响 T2 工作量评估。
**W7｜D2｜§3.2 anchors**：scroll-converge 注「首要消费方=anchor-locate」，但任务书 §5 有三个消费方（anchor-locate/usePageColumnScroll/scroll-progress），「首要」无据。

---

## N 级（注记）

**N1｜§6.3 Q2/Q5**：主控回执已闭合（两 store→PdfPageCanvas 均 type-only；warn=console.warn 零通道），草案可将其从待澄清移入已决，删去 [假设]。
**N2｜§3.6**：几何簇「17 文件 4,111 行」与「7 文件 ~2,300 行」两口径并列，建议明确主记账口径。
**N3｜§5.1**：指纹门 C_after ⊇ C_before（187 文件）未给净删面的断言覆盖不降证明，T5 须补。
**N4｜§3.2**：ai-note-style 归 anchors 而 ai-notes/ai-notes-phase 归 state，AI 标注族跨域分散，可读性/内聚度注记（低优先，属 §6.1-4 可异裁决）。

---

## 总评

草案对八件受理门**均在场**，态空间表/五序列/回落档裁决/迁移序结构完整，事实引用大体忠于任务书（几何簇 4,111 行、17 件回归网、e2e 43/45 均核验通过）；但存在 5 条 B 级未闭合：映射表计数失实（B1）、S4 异源混用违 INV-58（B2）、核心「形状差噪声级」机制不成立（B3）、净删记账自相矛盾（B4）、S0 挂起守卫前提不存在（B5）。**按建议修正（尤其 B2/B3 涉及方案甲成立性）后方可进入终裁**；当前不建议放行。

FINDINGS: B=5 W=7 N=4 VERDICT=返工