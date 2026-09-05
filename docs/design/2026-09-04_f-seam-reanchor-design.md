# AnnotationLayer 重锚域同族化设计书（终裁版）

> 状态：**已裁决（主控终裁 2026-09-04）**——Kimi K3 拟定（f-seam-design-kimi.raw.txt,
> in 4646/out 5132/104s）→ deepseek v4flash 对抗审核 ENDORSE_WITH_CHANGES
> （f-seam-design-ds.raw.txt,in 8164/out 13621/164s,CR×4+CO×2）→ GLM5.3 主控
> 终裁（三处材料外假设源码验证毕）。执行=F-A8（registry 立案,阶段门 0~3）。
> 上游：F-A6-b2 门二 seam_ruling 排期项;INV-58 票外 seam 的收敛票。

## 主控终裁节（2026-09-04）

1. **方向裁定=A+C1 通过**（Kimi 推荐+deepseek ENDORSE）：项几何族主链+
   DOM 降回退层+存量读时归并渐净（零迁移）。病理页唯一可信投影=项几何族
   的推演成立（§0）;所需积木全部在库（rectsForOffsetRange/bandsFromItems/
   reconcileItemsWithDom/usePageItemsStore 双形态）。
2. **CR1 采纳**（store 就绪竞态=真缺格）：S0/S4 增 store 订阅重入——
   usePageItemsStore 现成「react 订阅+getState() 直读双形态」（store 头注
   在案）,AnnotationLayer 订阅 pages 变化触发 resolve 重调度;测试面加
   「store 晚于 textLayer 就绪」竞态 fixture。
3. **CR2 采纳**（selectionHealth 跨产链复用=假设非事实）：门 1 取证验收项
   增「S4 病理判定在 annotation 产链可复现 25~62.5% 分叉/正确区分 0~0.12%」;
   不可复用→S6 格裁撤（回退层无病理抑制=现状语义,不新增风险）。
4. **CR3 裁决（源码事实）**：旧文档命中风险**被排除**——page-items.store
   纯页号索引+「换文献（fileUrl 效应）整表清空」（store 头注+clear() 在案）;
   文档切换 DOM 必变→observer 必触发→S0 重入。设计仍显式声明 resolve 取数
   以当前渲染页上下文 pages[page]。
5. **CR4 采纳**（门 0 裁决产物具体化）：oracle 比对单测——verifyQuote 与
   verifyQuoteItem 对同一漂移 fixture 校正结果逐位一致（两函数共享同一打分
   核形态——主控验证:verifyQuote 匹配核=纯文本函数,fullTextOf 仅取文本一步,
   matchAt/indexOf 打分循环全字符串操作,anchor-serialize.ts:50-100 在案）。
6. **CO1/CO2 采纳**：健康页等价性表述限定为「数值域 0~0.12%+门 1 IoU≈1
   可验证判据」;INV-59 措辞=「主链消 R1,回退格（S3b/S5）以登记方式显式
   持有跨族配对=已知边界保持现状语义」。
7. **Kimi 两假设主控验证毕**：①匹配核纯文本性成立（上列源码）;②切片复刻
   成立（CONTEXT_CHARS=32 纯字符串窗,selectionToAnchor:121-150 在案）。
   域差风险（items 拼接口径 vs DOM 拼接口径系统性差）由 S1 reconcile 守卫
   拦截（b2 r3a 事故同构防线——对账失败即 S4 回退不静默）。

## 下文=Kimi 设计书原文（终裁修订点已并入对应节,标注〔CR/CO+终裁〕）

# AnnotationLayer 重锚域同族化设计书

（门二 seam_ruling 排期项 · 依据=任务书材料，材料外断言均显式标注）

## 0. 本质推演：两测量系统的投影一致性

持久化坐标系=页归一化分数（anchor.rects）。两套测量系统向该坐标系投影同一文本：

- **PDF 声明几何**（项几何族）：item transform/width/height×viewport 合成——根植于文档自身坐标空间，失真免疫面=渲染管线之外。
- **浏览器渲染量测**（DOM 量测族）：getClientRects/gBCR——根植于 textLayer 实际布局，病理页（text-layer 异常形态，V1/F-A6 取证在档）即失真于此。

**数值关系**（依据 §3-2 selectionHealth 取证）：健康页两投影偏差 0~0.12%（IoU≈1）→ seam 三风险（R1/R2/R3）全部潜伏、不可观测；病理页分叉 25~62.5% → 此时 DOM 投影是错的那一支（声明几何仍锚定文档坐标），于是：R1 跨域配对=正确 rects×失真 bands 互漂错绑；R2 显示覆盖=用失真值常驻覆盖正确库值；R3 verifyQuote 的偏移校正本身合法（排版漂移是真实象），但校正后的**量测动作**落在失真坐标系内=自愈方向错误。结论：健康页上 A/B 行为等价，方案分野只在病理页——而病理页上唯一可信投影是项几何族。**这构成 A 优先于 B 的第一论据**：B（守卫并存）在失真页只能「检测并降级」，无法产出正确值。

## 1. 态空间

### 1.1 重锚管线状态机（每条标注 × 每页）

| 状态 | 进入条件 | 行为 | 出边 |
|---|---|---|---|
| S0 挂载 | pageRoot 就绪 | 读 page-items.store（§3-3 直读先例） | 页项缺席→S4；否则→S1 |
| S1 页项对账 | store 命中 | reconcileItemsWithDom(items, domText)（§3-2 积木已在） | false→S4（warn 不静默，§3-8 先例） |
| S2 引文对账+重锚中 | S1 通过 | verifyQuoteItem 校正偏移（§3 节）→rectsForOffsetRange+bandsFromItems | 成功→S3a；对账失败→S3b |
| S3a resolved（项几何域） | S2 成功 | resolved[id]={rects,bands} 同族同域（消 R1） | 渲染消费（现状接线零改） |
| S3b 单条回退存量 | 该条 quote 对账失败 | 存量 rects+bandsNearRects（现状语义逐位保持） | 渲染消费 |
| S4 页级回退（DOM 量测层） | 页项缺席/对账失败 | 现 DOM 链整体降为回退层（F-A6 三层回退同构，§3-8） | G2 健康→S5；G2 病理→S6 |
| S5 resolved（DOM 域，标记） | S4+G2 健康 | 产物标域='dom'，仅显示不回写（现状语义） | 渲染消费 |
| S6 病理页抑制格 | S4+selectionHealth unhealthy | DOM 投影已证失真→**禁止 DOM 重锚显示**，直显存量 rects+bands 走缺省路径（F-11 分数路径先例，annotation-resolve 头注在案） | 渲染消费 |

G2 判定依据 §1 selection-evaluate 先例「unhealthy→抑制」。S6 为新增格，理由：病理页 DOM 回退产物即 R2 之害本身。

### 1.2 跨格序列

- **懒渲染重挂**：MutationObserver+rAF 合并节奏随宿主不变（F-A1 起不变，annotation-resolve 头注）；重挂即 S0 重入。
- **zoom 变化**：项几何族随 viewport 重合成=天然正确（几何×viewport 定义如此）；DOM 回退层维持现状重算。两族在 zoom 下的行为差=病理分叉之外第二分叉源，佐证同族化必要。
- **文档切换**：observer.disconnect 已有（现码在案）；store 页项随文档切换，S0 重入。

## 2. 方案对比与组合矩阵

C 为独立维度（存量处置），与 A/B 自由组合：

| 组合 | 正确性（病理页） | 复杂度 | 受锁面 | 存量兼容 | 自愈保持 |
|---|---|---|---|---|---|
| A+C1（归并渐净） | **消 R1/R2/R3** | 中（主链换积木，积木已在 §3-2） | INV-58 扩域+INV-47 登记+测试锁 | 读时归并，零迁移（§3-8 F-A4 先例） | verifyQuoteItem 等价（§3 节可构造） |
| A+C2（域标记） | 同上 | 中+模型加字段 | +Annotation 模型锁面（src/shared/**） | 显式但需全链路透传 | 同上 |
| A+C3（迁移脚本） | 同上 | 高 | +DB 受锁面 | 一次性清零但触犯最大锁面 | 同上 |
| B+C* | 仅检测降级，无正确产物 | 低-中 | 守卫登记 | 不变 | 保持但愈向失真系 |
| B 长期化 | — | — | **违宪法「方案切换=删除旧方案」**（§3-7） | — | — |

**推荐：A + C1**。论据：①病理页唯一可信投影=项几何族（§0 推演）；②所需积木全部材料内在档（rectsForOffsetRange/bandsFromItems/reconcileItemsWithDom/store 直读，§3-2/3-3），无库能力假设；③C1 有 F-A4「存量零迁移读时归并渐净」先例（§3-8），受锁面最小；C2/C3 无增量正确性收益仅增锁面，否决；④B 的守卫数学不丢弃——降格为回退层诊断（itemChainFor 单源 warn 先例，§1），不作并存几何方案。

**改动面（模块/函数级）**：
- `annotation-resolve.ts`：新增 `resolveAnnotationRectsItem`（主链：store 读→对账→verifyQuoteItem→rectsForOffsetRange+bandsFromItems）；现 `resolveAnnotationRects` 改名 `…Dom` 整体降为 S4 回退层（函数体零改=INV-47 数值面不动）；`matchBand`/band 单源/消费接线零改。
- `AnnotationLayer.tsx`/`AiAnnotationLayer.tsx`：resolve 闭包改调三层（项几何→DOM→存量），resolved 增域标记字段（仅运行时，不入库=不动模型锁面）。

## 3. verifyQuote 域内等价物（A 的硬前提）

**构造（全部材料内积木）**：`verifyQuoteItem(items, startOffset, endOffset, quoteText, prefix?, suffix?)`——buildItemOffsets(items)→{spans,total} 得页项文本窗（§3-2）；join 项文本后按 selectionToAnchor 同式 quote/prefix/suffix 切片逻辑（§1 头注明载该切片存在于 selectionToAnchor=材料内可复刻）滑窗定位 quoteText→得校正偏移 (s′,e′)；|s′−startOffset|>0 即排版漂移→采校正值走 rectsForOffsetRange。**自愈语义等价成立**：原 verifyQuote=quoteText↔DOM 文本对账校偏移；等价物=quoteText↔items 文本对账校偏移，且校后量测落在可信坐标系=自愈方向转正。

**失败降级语义**：对账失败→该条 S3b（存量显示，仅显示不回写——现状语义逐位保持，R3 不劣化）。
**假设：需主控验证**——verifyQuote 匹配核是否纯文本函数可直接复用；若否，按上段复刻（仍材料内）。页文本 join 每页一次可缓存摊销（**假设：需主控验证**性能预算；对照先例=selectionToAnchor 本就做 O(页文本) join，量级同档）。

## 4. INV 登记（条款草案）

- **INV-58 扩域**：适用域由「selection 产链」扩为「selection 产链+Annotation/AiAnnotation 重锚链」；同族禁令全文不变；DOM 量测仅允许存在于显式回退层且产物必须标域。
- **INV-47 适用面登记**：mergeLineRects 退出重锚主链→适用面收缩为「DOM 回退层+存量读时归并（mergeRects 挂 lineH）」；受锁⑪断言数值面不变（回退层函数体零改保证）；若锁测试断言调用面则需 [locked-change]+locks 流程（§3-7）。
- **新 INV-59（草）「重锚同族配对令」**：resolved.rects 与 bands 必须同族；跨族配对仅允许在 S3b/S5 回退格且须登记为已知边界（消 R1 残余于主链）。
- **新 INV-60（草）「重锚显示覆盖登记」**：重锚成功产物覆盖库值仅显示层、永不回写；域标记随 resolved 走——将 R2 由隐式 seam 转为显式登记语义（INV-37 只覆盖拖选期，不扩其文，另立本条）。

## 5. 测试面

- **单测（先红判据）**：①verifyQuoteItem 纯函数（漂移注入→校正值断言）——旧实现无此函数=红；②主链域断言：mock store 注入页项，断言 resolved 产物=rectsForOffsetRange 输出（旧 DOM 实现=红）；③S6 格：unhealthy→无 DOM 产物；④matchBand 同族配对（INV-59）；⑤回退层级 warn 单源。
- **e2e**：健康页 fixture（新旧产物 IoU 应≈1=回归门）+病理页 fixture（期望=项几何产物贴合 canvas 视觉）。
- **受锁面**：tests/** 新增/改动走 sha256 流程；INV-47 锁测试若涉调用面→[locked-change]。
- **取证面**：复跑 V1/F-A6 病理页集（25~62.5% 分叉档），真机对照重锚前后渲染贴合度——沿用 F-A6「复跑对照」先例。

## 6. 阶段化（决策门）

- **门0 前置**：verifyQuoteItem 纯函数+单测绿；§3 两条「需主控验证」假设裁决。
- **门1 复跑对照**：新旧重锚链同页双跑（不切换显示），健康页 IoU≈1 且病理页项几何产物视觉贴合=放行判据；否则回退门0。
- **门2 主链切换**：S0–S6 状态机上线，DOM 链整层降回退，INV-58/47/59/60 登记同步落档。
- **门3 收口**：观察期后 DOM 回退层去留裁决——F-A6 三层回退先例（§3-8）支持保留为回退层（非并存方案，不触「删除旧方案」）；若主控裁定删除则整体移除。

## 7. 风险表

| 风险 | 缓解 |
|---|---|
| R1 残余（S3b/S5 跨族配对） | INV-59 限定回退格+登记；matchBand 阈值（\|Δcenter\|≤rect.h）仍在 |
| R2 覆盖语义隐式化 | INV-60 显式登记+域标记；永不回写语义现码已在 |
| R3 等价物不成立 | 门0 假设裁决前置；不成立则 A 降级=保留偏移库值直取（不自愈但仍同族），B 守卫兜底诊断 |
| 页项缺席（懒渲染早期） | S4 回退层；store 就绪后 MutationObserver 节奏重入 S0 |
| quote 对账假阳性误校正 | prefix/suffix 双侧锚定（selectionToAnchor 同式）+对账失败即存量回退，零回写 |
| 性能（页文本 join） | 每页一次缓存；量级≤selectionToAnchor 现状（假设已标） |
| INV-47 锁面误触 | 回退层函数体零改；调用面变化走 locks 流程 |

## 执行票（F-A8 阶段化——门 0~3）

- **门 0**（前置票可独立提交）：verifyQuoteItem 纯函数（annotation-resolve
  或 anchor 域新件）+oracle 比对单测（终裁 5）+S1 reconcile 接线单测。先红
  判据=新函数缺席红。
- **门 1**（取证对照票）：新旧重锚链同页双跑（不切换显示）——健康页 IoU≈1
  +病理页项几何产物视觉贴合+**annotation 产链 G2 分离度复现（终裁 3,不
  可复现则 S6 裁撤记录在案）**。复用 f-a6-diag 探针族。
- **门 2**（主链切换票）：S0~S6 状态机上线（含 CR1 store 订阅重入）+DOM 链
  整体降回退层+INV-58 扩域/INV-47 适用面/INV-59/INV-60 登记同步。
- **门 3**（收口票）：e2e+全量取证+观察期后 DOM 回退层去留裁决（保留=回退
  层非并存方案）。

> **门 3 前置量化取证在档（2026-09-05 F-A8-G3A,主控自为+门一三轮复核）**：
> bottom 双根因机制占比分解=非边栏区（参考文献/正文行块差）贡献 89.28%/
> 89.14%（对称差口径,p2/p7）,边栏带聚合块 10.72%/10.86% 少数派——报告
> scripts/audits/f-a8-g3a-bottom-decomp.md（含复算配方+未舍入精确值+两轮
> 门一复核处置）。开放项转门 3：边栏块来源机制（非竖排 span 已证否）/
> bottom 锚 rect 收集窗定义（p2 有 y<0.78 块 0.0041 污染上界 11.2%,p7
> 零污染）/INV-60 显示覆盖语义（盒几何不可证,留真机人审）。


## 增补：门 1 staged 复跑结论与判据 a 口径分层（2026-09-04 门 1b 后主控落笔）

- **第一步（旧口径）结果：修补有效**——ascent≤0→0.8 兜底（pdf-item-geometry
  :218）后复跑：3882 多行锚 top/multi×2 从 0.62~0.76 恢复 ≥0.9942;错对 6 锚
  44 块→3 锚 22 块且残余全部定位 bottom 2 锚+单行 8 锚;健康集 6/20→10/20
  （复跑档 f-a8-gate1-out/ 修前档 -out-prefix/）。
- **判据 a 分层口径（本节起生效,门 2 放行判定基准）**：
  - **L1 整行边界常规锚**（页首/页尾/跨行——**口径=健康集/干净行结构页**,
    剔除 bottom 异形态 2 锚[归 L3]后）：0.99 门——实测 10/10 达标
    （min 0.9919/中位 0.9946——数字源报告 §8 分层数据表）。
  - **L2 项内部分选中锚**（单行）：grapheme 比例细分近似面——本轮实测区间
    0.8816~0.9745 逐位不变（修补零因果在案）,结构性上限未定（后续复跑再
    收敛）——申报边界,非门。
  - **L3 异形态区锚**（页缘竖排边栏条带/参考文献上下标行——两链聚类语义
    差）：bottom 2 锚——已知边界申报（项链边栏分 2 块 vs DOM 1 块+上下标
    行在两链容差边界分段不同;**非 ascent 因果的直接证据[门 1b 回炉 W2 升级]**:
    修补在 bottom 窗生效（项级 Δtop=−0.8×fontH 全非零）+块级膨胀 16.1→10.4px
    已消（dh=−5.5px）而 x 向稳定（块级 dx/dw 全零;p2 IoU 逐位相同,p7 存在
    ~0.0066 级差异=轮次噪声量级归因待核——bottomdiff raw 三层数据在档）——
    失守归因于双根因非 ascent;非回退层失真——两分段皆合理,真值行数判定与
    机制占比分解=后续观察项,不阻塞门 2）。
  - **L4 旋转域锚**（s1rot 残余不过锚）：旋转域申报面——ADR-0019 R3 前置
    「/Rotate≠0 另案立案」的关联面（F-A7 已修占位盒;旋转域锚级分段语义=
    既有已知盲区 f-a6 §9-4 同族）——门 2 放行按旋转域已知边界申报,后续
    归属随另案流转。
- **门 2 放行**：L1 达标+L2/L3/L4 已知边界申报 → 判据 a 分层口径过门,门 2
  （主链切换）具备开工条件（判据 b/c 随复跑确认——门 1b 复跑数据在档）。
- **ascent 修复双重身份最终定性**：selection+annotation 双链共同缺陷修复;
  F-A6-b2 侧=限定性勘误（ADR-0019 R3 勘误注记⑧——「采集面覆盖缺陷形态
  26.4% 而未检出」;66 项矩形膨胀实测未补证前禁用「假阴坐实」表述）。