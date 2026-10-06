# F-ROUTE-02 走线候选位分配·设计书

> **版本 v1.2（2026-10-06 U2 交付回写）**：v1.1=U1 回写；本版=§8 U2 行
> 交付回写（分配主循环+Z 形施加+残余子 pass+单测③-⑪+两验收勾——回炉
> 轮 1 四件：B1 反向段方向无关化/回折事件化/route 白名单/斜段锁定）。
> runId=20261006-froute02-design（设计批）/20261006-froute02-u1（U1）/
> 20261006-froute02-u2（U2）。
> **v1.1 存档（2026-10-06 U1 交付回写）**：v1.0=三段通道终稿（拟定=ops-drafter
> kimi-third $max 四轮 v1→v4；对抗审核=ops-auditor deepseek $max 四轮
> B2/W9/N5→B1/W3/N5→B0/W1/N5→B0/W0/N3 有条件放行，唯一条件 N-1 主控亲核
> 闭合——§12）；终裁=主控（GLM5.3）采纳候选 B。§8 U1 行=交付回写态。
> runId=20261006-froute02-design（设计批）/20261006-froute02-u1（U1 批）。
> **本件=实施单源**（U1-U5 切分见 §8；实施批票面/六段简报自本件节选组装）。
> 用户裁决锚：2026-10-06 第二轮③（间隙六分五候选位语义——原文见 §1）+
> 第三轮②（点两卡径保留+起终点非用户指定适配分析）。
> 社区调研（主控前置）：libavoid/Adaptagrams nudging（GD'09 正交连接器
> 路由——后处理散开思想源）/Eclipse ELK 通道分配/GoJS AvoidsLinksRouter
> 后处理平行化/JointJS A* 网格（量级反参）/drawio 无槽位（反参）。

## ① 背景与目标

现行六态链（direct→h-slip→band→corridor→fallback+manual-override 域）与
被动车道（applyBandLanes 对称偏移/corridor 4 道）。用户 2026-10-06 第二轮③
裁决（逐字）：「同时建议将走线脚本穿过卡片间隙时的走线位置做出调整，即卡片
间隙均分为六份，产生五个线条候选位，后面连线的时候优先从空位走，如果最短
路径间隙的空位满员就扫描左右两侧是否有空位，如果一整排都没有就放弃其他
候选位按照默认路线与其他线条重叠。纵向空隙也是如此。」第三轮②：点两卡径
端点系统选取，适配须入分析。目标：以确定性先占槽位模型替换现行被动散开，
完成 a1-a7 语义定稿、端点适配分析、N5 校准程序、真实避让 e2e 设计、INV
与测试面盘点。

## ② 语义定稿（a1-a7，可否决呈报位随条——异议即回滚/局部回滚）

**a1**：L=W−2·PAD（W=单元槽轴自由宽）；**n=min(5, max(0, ⌊L/6⌋−1))**；
n≥1 时槽位=内缩区间 [l+PAD, r−PAD] 的 k/(n+1) 分点；n=0 单元封闭
（closed）。逐区间验证（pitch=L/(n+1)≥6）：L<12→0 封闭；[12,18)→1，
pitch∈[6,9)；[18,24)→2，∈[6,8)；[24,30)→3，∈[6,7.5)；[30,36)→4，
∈[6,7.2)；≥36→5，≥6。呈报：n<5 ⟺ L<36（窄缝偏离字面五槽）。

**a2**：三级泄压——L1 本单元可用空槽（次序=|槽−ideal|升序→槽索引升序）；
L2 同带邻单元扫描（单元距=索引差绝对值，升序→几何小侧左/上先）；L3 同带
全部同类单元（=「一整排」定稿）无可用槽→重叠。呈报：「扫描左右两侧」
取邻缝读法（L1 穷尽后「邻槽」读法无对象）。

**a3**：消费口径=**轴对齐段×单元相交集**（半开区间判定，见 §5）；非轴对齐
段整体排除（§5-B S1）。closed 单元不产生消费记录：band 态穿越段归残余子
pass 域、非 band 态现状沿承。逐态裁定：band/direct 轴对齐段入槽；h-slip
水平段入槽、斜段排除；corridor 不入（内容域外+旧域外双重一致）；fallback
不消费；manual-override 域外。呈报五项：穿行扩义（水平穿行段占 y 槽）；
fallback 不入槽（放弃避让终态槽位无意义）；corridor 排除；斜段排除
（现状沿承）；closed 消费语义。

**a4**（占用模型）：见③④。**a5**：不引入锚-槽回溯（§5-B），呈报。
**a6**：重叠终态=仅 L1/L2/L3 穷尽后触发；重叠位=ideal=**slotAssign 输入
折线（六态链骨架产出）上该段未偏移位置**（全文唯一定义）；完全重合不错峰；
Δ<1 退化态同标 overlapExempt。呈报：默认位含义漂移（旧=带中心偏移后位→
新=未偏移骨架位）；L3 触发键扩义（全占∨全不可达）。**a7**：跨缝独立分配；
处理序=edgeId 字典序×段自起点向终点序×单元沿段序；无回溯，呈报（补全性）。

## ③ 候选路线（四族权衡）

- **A·全链先占**：anchors/rounding 不动；动 chain 编排+各态占位点+SlotUse
  注册表贯穿 routeOne 全程。复杂度/风险/受锁面最高，估 5-6 实施批。
- **B·后处理槽位分配**：routeOne 循环不动→slotAssign（提取/分配/可用性/
  Z 形施加/残余分离）→finish 既有复检。复杂度中、风险低、估 3-4 批。
- **C·混合**（引用性）：D 于 band 态+B 于余者；双机制并存期触「禁两套
  并存」灰带；留作回退。
- **D·链内槽位候选枚举**：descendCandidates（列缝中线→框外空白）与
  corridor 环探是链内候选枚举先例——把候选从「中线」换「槽位集」+SlotUse
  咨询式预检（AnchorUse.has 同型，胜出才 commit）。改动集中 bands.ts/
  chain.ts；无后处理拐点重接；避让由链内 polylineClearStubs 天然保证。
  短板：①覆盖面——只盖 band 态竖直下降/终落（corridor 环探仅为机制先例
  非槽域），direct/h-slip 水平段无候选枚举钩子，须补第二机制（≈B 残余）；
  ②咨询-提交窗口随六态跌落逐态管理；③受锁面=骨架语义例几何全变+第二波
  direct/h-slip 机制改写。

## ④ 推荐与理由（主控终裁=采纳）

**B**。书面排除 D：①完整性——裁决管「凡穿隙段」，B 单 pass 覆盖全部段×
单元交集；D 只盖 band 态竖直下降/终落，余者仍须 B 类机制兜底，总成本=
D+B 残余>B；②B 的回退复杂度已消解为「槽级不可用标记+继续扫描」，与 D
链内重试同构，D 的「无拐点重接」优势被 B 的 Z 形三段化细则对冲；③AssignRec
天然供观测钩子（data-route-state 族）；④受锁面 B 更集中（车道坐标期望 vs
D 的骨架语义全变）。A 排除：六态耦合+跨态回溯诱惑，用户规则自带泄压阀
（邻缝+重叠终态）无需路由中感知。C 留回退位。

## ⑤ 详细设计（B）

数据结构：`GapCell{id=枚举序索引; bandId; rect; closed}`；
`SlotUse=Map<cellId, Map<slotIdx, edgeId>>`；
`AssignRec{edgeId; segIdx; cellId; axis; ideal; slotIdx?; overlapExempt; residual}`。

**单元提取（确定性锚点清单）**：
- 生成=枚举卡对（A,B）（行隙：A.b<B.t；列缝对称）；投影重叠列=卡对 x
  （或 y）投影重叠区间；判定式 ov=min(A.r,B.r)−max(A.l,B.l)>ε 且无第三卡
  与开区间条带 (max(A.l,B.l), min(A.r,B.r))×(A.b, B.t) 相交（相接=间距≤ε
  不生成；高<2·PAD+1→closed）。
- 极大性语义：单元=该投影重叠列内极大空白竖直段——第三卡入条带即阻隔；
  列内无卡即连续空白=一个间隙（「跨多视觉间隙」不存在）；长间隙六分 pitch
  大、n 钳 5、线取距 ideal 最近槽。
- 去重：多卡对共享同一竖直空白按 (x 区间, y 区间) 双键合并为一单元；
  单元 id=去重后按全排序键（带序，小端坐标，大端坐标，卡 idA，卡 idB）的
  枚举序。
- 相交开闭边界：段×单元相交=半开区间判定 [yA,yB) 沿行进方向半开——段
  端点/顶点恰落边界=归属行进方向后继单元，共享边界单元不双计。
  〔四轮 N-2 批内补：横向开闭一句（要求正宽度重叠或横向同样半开）+一测
  ——U1 落实〕
- 非卡障碍（月标注∪年份头文本区，INV-110 口径）：障碍横贯单元槽轴全域→
  closed；否则槽位静态预过滤（槽线±PAD 走廊与障碍相交→该槽不可用）。
- 浮点：rect÷zoom 后 0.1 步进量化（对齐现行 fmt 先例），ε=0.05 仅用于
  相等判定。单元↔带归属=y（或 x）中点落带区间；列缝列=列缝单元 x 区间
  合并（bandsOf 同型对称算法）。

**可用性谓词（前移 L1）=权威门**：槽可用 ⟺ ①SlotUse 空闲 ②静态预过滤过
③**谓词复检（pre-commit）**：Z 形施加后全子段 segHitsRect 对
allObstacles+PAD 过，且（有桩段）拐点不入桩区。成本界 O(5 槽×≤4 子段×
障碍数)——13 边量级可忽略。**commit 仅于可用确认后落记**（AnchorUse
同型：失败尝试不占槽、无需释放）。
**不可达论证**：commit 后几何仅经圆角化——二次贝塞尔弧恒落拐角三角形
内=相对已检折线单调内收，数学上不可能引入新障碍命中（审核独立复算：弧上
任一点到两腿最小距 ≤ r/4=1.5px<PAD=4，垂足恒落腿段）；故 finish 采样
复检=r 收缩链降级触发器（post-commit），非第二道门。finish 沿承字面
零改：r=6→3→0 尖角；r=0 仍不清=静默返回 r=0 路径（现行终态——主控亲核
chain.ts：onWarn 仅 fallback 态有，本设计不引入新告警行为面）。
术语统一：谓词复检（pre-commit）/finish 采样复检（post-commit 降级触发）。

**分配主循环**：按 a7 序遍历消费记录→L1 逐槽试：谓词复检失败→该槽对本段
标不可用（不 commit）→续 L1 余槽→L2 邻缝→L3；全部穷尽→overlapExempt
落 ideal。L3 触发键=「无可用槽」（全占/全不可达两态合一）。

**几何施加**：竖直段在单元 [yA,yB] 内 x0→x1（Δ 量化后<1：不偏移、几何=
ideal、标 overlapExempt 且槽位占用保留——防后段重取，INV-1XX 由豁免支
承载）：j1=yA+PAD+1，j2=yB−PAD−1（PAD 膨胀净空保证 jog 距两卡≥1px）。
可行条件分层——**全体段：j2−j1≥2（⟺ 单元高 H≥2·PAD+4=12）且谓词复检
过**〔四轮 N-3 批内补：不可用条件显式含「[j1,j2]⊆段∩单元跨度」+部分
穿越段单测——U2 落实〕；**桩区禁入约束仅适用有显式外法线桩顶点的骨架段**
（band 出桩 aS/终落桩/corridor 桩——锚与首转折间 s0=10 桩段，拐点入桩区
破坏桩直线语义）；**direct/h-slip 骨架无桩顶点**（单段直连无 stubEnd 顶点
——chain.ts:144/:160 事实，主控亲核），其拐点仅受 j 区间+谓词复检约束
——贴缝直连段可入槽（谓词权威门兜底）。顶点链=(x0,j1)(x1,j1)(x1,j2)
(x0,j2) 两段水平 jog（水平段对称），随后入 finish 既有 stripCollinear+
r=6→3→0 收缩链+采样复检（1px 级短 jog 钳 0 兜底）。多单元穿越：逐单元
独立分配+独立谓词复检，组合态由 finish 采样复检兜底（与不可达论证一致）。

**残余分离子 pass（旧机制原样承袭）**：域=route==='band' 结果段且未被
任何单元消费（含 closed 单元穿越段）——与旧 applyBandLanes 域一致。
分组=同带同轴投影重叠链在残余域内重算（旧 xLo/xHi 判定原样）：被槽消费
段退出分组后偏移指数按剩余成员重排——对照口径=「旧机制在全残余域的行为」
等价。部分消费段按单元粒度切分：开放单元区间入槽、closed 单元区间归残余。
跨域共线（槽段 vs 残余段同带共线）=备案不治理（slot 轴 vs 残余 s 偏移轴
不同构、概率低；INV-1XX 域=槽域内）。s∈{9,6}（框间带/行隙别）+cap=
⌊(带宽−2·PAD)/s⌋ 容量钳（k≥cap 溢出钳至边界重合=旧语义）+edgeId 字典序
(i−(k−1)/2)·s 偏移，全沿旧式。corridor/fallback/manual-override 排除
（旧域外）。W-4 覆盖等价由构造成立：旧能力=旧机制原样，开阔域共道分离
零丢失。

**接入点**：routeOne 循环→slotAssign（含残余子 pass）→finish。
anchors/bands 骨架/corridor/avoid/rounding 零改动。文件：新增
`src/renderer/features/lineage/routing/slots.ts`（≤300 行；超拆
gap-cells.ts）；chain.ts 删 applyBandLanes 函数体（逻辑迁入 slots.ts 残余
子 pass）+插点。常量：+SLOT_DIV=6/SLOT_MAX=5/SLOT_MIN_PITCH=6/
CELL_EPS=0.05/QUANT=0.1；s/cap 沿旧。

**⑤-B 起终点非用户指定适配（票面指定设计要求）**：
- S1=排除定稿：非轴对齐段（现行唯一形态=h-slip y 异高斜段）整体排除出
  槽域——①用户六分=轴对齐语义，斜段槽轴（垂直行进方向）与六分轴不兼容，
  斜段 Z 形属无裁决依据增配；②现状斜段本无任何分离机制（旧机制仅域 band
  态）→排除=零回归；③INV-109 端点保持下施加成本高收益低。呈报：「斜段
  不入槽=现状沿承」。
- S2（三轮 W1 新口径）：段长不可用线仅由 j 区间与谓词定义、与桩区无关
  ——最小可行施加=单元高 H≥2·PAD+4=12（j2−j1≥2）且谓词复检过；有桩
  顶点段另加桩区禁域。验收例：H∈[9,12) 单元开放但全槽不可用→续扫（断言
  次选槽或 overlapExempt）。
- S3 同锚三边 AnchorUse 散开后 ideal 相邻→按 edgeId 序先占（验收：三边
  槽位坐标断言）。
- 结论：锚-槽不联合选择、槽满压力不由改锚吸收（现链单向不回溯红线+
  用户规则自带泄压阀）；槽位层对系统选取端点（点两卡径）与用户指定端点
  一视同仁（同为几何输入）；「锚选取感知槽占用」留扩展位不实施。呈报同
  a5。拖拽径=manual-override 域外（用户排位主权沿承），预览线不走路由。

## ⑥ 测试面

新单测 slots.test.ts（先红后绿+断言级变异红证）：
①分点+PAD 内缩；②边界八点：L=11.9→0 封闭/12→1/23.9→2/24→3/29.9→3/
30→4/35.9→4/36→5；③先占次序+tie→小索引；④邻缝扫描左/上先；⑤L3 双态
触发（全占/全不可用）→overlapExempt；⑥谓词复检失败流（槽级不可用→续扫
→穷尽→豁免）；⑦跨单元穿越逐单元独立；⑧非卡障碍 closed/预过滤；⑨残余
子 pass 旧式等价（s/cap/偏移式）；⑩确定性双跑序列化全等；⑪r=0 仍不清→
路径仍产出（现行语义锁定；无 onWarn 增配）。

受锁影响面（估，开工 grep 复核——申报）：lineage-routing.test.ts 27 its
——估 band 车道 4-6 例+direct/h-slip 含穿越坐标期望 2-4 例改写；
lineage-routing-parts.test.ts 12 its——估 3-5 例；band-calibration.test.tsx
325 行→槽位口径重写；lineage-edge-overlay.test.tsx 不动。改动一律
[locked-change] 流程。旧/新对照清单六组：带内双下降共道（槽位化）/开阔域
共行（残余=旧行为等价）/容量溢出（旧 cap 钳 vs 新 L3 豁免两域分列）/
框间带 s=9（残余沿旧）/corridor 共道=不迁移（旧域外）负锚/混合组（部分
消费段切分+残余组指数重排）。route 标签=胜出态不变（direct 偏移后仍标
direct，槽位信息入扩展属性）；INV-79 相容=首检（态选择）输入未偏移骨架、
谓词复检与 finish 采样复检分层兜底，「永不穿障碍」语义不变。

e2e：R1 绕卡（三卡+障碍卡挡直连路径→path 采样点避障碍 rect±PAD+
data-route-state≠fallback）；R2 跨年连线不穿 .tl-year-num/.tl-year-meta
两文本区；R3 三平行边同单元槽位两两相异且∈分点集（zoom 1.0/1.5 双跑；
取景=端点相邻缝贴缝直连三线——新口径下可达）；R4 重合态命中层抽查
（整排满员两线重合→断言至少一方 data-overlap-exempt=1+点击重合段中点
不抛错且至少一条可选中）。观测钩子（实现侧渲染层新增——申报）：
data-route-state（胜出态）/data-slot（cellId:slotIdx 逗号分隔）/
data-overlap-exempt/data-slot-fallback。helper 沿 geo-probes.ts 生态
（freezeAnimations 前置+新设 expectPathAvoids）。probe 矩阵必含走线直证
用例（在册教训：改 routing 面的批必含）。

N5 校准程序（障碍几何全面校准+B4 字面量冻结后复扫——年份头面 cirefix
批已毕勿重复）：obstacleAuditProbe 独立 e2e spec——①DOM 枚举
.tl-card/.month-tag/.tl-year-num/.tl-year-meta 实测 rect÷zoom 与
buildSnapshot 双向对账（容差 1px，漏采/幽灵皆红）；②负锚：.month-frame
与 1px 伪元素横线不在 snapshot；③B4 冻结后 .month-tag 文本匹配 YYYY-MM
补零格式且实测宽=采集宽；④.c-no #→·（U+00B7）冻结：断言 .tl-card
offsetWidth 不随序号文本变化。

## ⑦ INV 面

INV-1XX（新候选，实施批登记编号）：「同单元同轴两穿行段几何共线 ⟹
（占异槽）∨（至少一方标 overlapExempt）」；域=槽域内（跨域共线备案
不治理）；Δ<1 退化态由豁免支承载。强制=单测+谓词复检+data-overlap-exempt
e2e 抽查；锚定=路由完成后快照。INV-79/109/110 不修订不得破坏（INV-79
五检降级链受锁锚定；INV-109 锚语义不动；INV-110 年份头口径不动）。

## ⑧ 实施单元切分

- U1 单元提取（含去重/半开区间+四轮 N-2）+可用性谓词+单测①②⑧ —— **〔交付
  2026-10-06，runId=20261006-froute02-u1〕**三屋全链毕：新件 routing/slots.ts
  267 行（GapCell/SlotUse/extractGapCells/slotsOf/segConsumesCell/slotFree/
  zChainClear/jogClearOfStub）+bands.ts 导出扩面+测试件 28 例（260 件/2681 例）。
  门一 k1/d1 双审两轮放行（回炉=列缝判定面 4 例+排序判别双夹具+侧挂第三卡钉死
  +axis 防御+占用端到端，mut5/6/7 红证）；probe 9/9 GO（e2e lineage 定向 20 绿=
  零生产路由行为变更）；裁决部 GO 无条件。**主控补全落位**：GapCell 增
  axis/blockedSlots；N-2 操作化=行进轴严格正测度∧槽轴严格正宽度（退化=坐标
  严格内含）+贴边零测度不消费；侧挂第三卡空白域=未消费段归 U2 残余 pass 域
  （钉死用例在档）。**U2 派发必带**：slotFree 界检/调用侧索引域保证验收勾
  （裁决部挂账 d1-N2）+本设计 §5 N-3 部分穿越段条件；
- U2 分配主循环+Z 形施加（含四轮 N-3 部分穿越段）+残余子 pass+单测③-⑪ —— **〔交付
  2026-10-06，runId=20261006-froute02-u2〕**三屋全链毕：executor 基批+回炉轮 1→门一
  k1/d1 首轮双 FAIL（B1W4N9/B1W4N8：B1=rebuildPts 反向段点链损坏+route 门缺失 a3
  六态+回折分支 segApps 丢弃+连接卫生）→回炉四件（方向无关化/回折事件化/
  ROUTE_ELIGIBLE 白名单/斜段锁定）→增量复审双 PASS（B0W1N6/B0W3N6，残余 W 主控
  亲核不可达证伪全驳回）→probe 10/10 GO→裁决部 GO 无条件。交付=routing/ 拆四件：
  gap-cells.ts 194（U1 提取层机械迁出）+slots.ts 288（slotAssign 主循环：L1
  |槽−ideal| 升序→索引升序/L2 同带〔axis+bandId 键〕索引差升序 tie 几何小侧先/
  L3 两态合一豁免落 ideal；Δ<1 retain 占用保留；ROUTE_ELIGIBLE={band,direct,
  h-slip}）+zapply.ts 175（zInterior S2+N-3+rebuildPts 方向无关化+回折事件化）+
  residual.ts 140（旧 applyBandLanes 字面承袭）+测试 26+7 例（262 件/2714 例）。
  U3 挂账三件：注释 [142,150]→[142,154]+h-slip 正向专例+桥接态组合对照；
- U3 chain 接入+applyBandLanes 退役迁移+受锁改写（[locked-change]，门审
  重点批——受锁 its 清点先行于落刀）；
- U4 e2e R1-R4+观测钩子+obstacleAuditProbe（N5）；
- U5 INV 登记+ADR/architecture 回写+成本账本。
每批单轮对抗可覆盖、verify 可过。

## ⑨ 假设与申报+呈报位汇总（可否决呈报位=用户异议即回滚）

呈报位：a1 窄缝槽数<5（L<36）；a2 邻缝读法；a3 穿行扩义+fallback 不入槽+
corridor 排除+斜段排除（现状沿承）+closed 消费语义；a5 不改锚；a6 默认位
含义漂移+L3 触发键扩义（全占∨全不可达）；a7 处理序补全；**桩区适用域
收窄=direct/h-slip 拐点可近锚（锚旁即转折，CAD 观感权衡，可否决回退全
桩区约束）**。申报：「间隙」局部化为卡对投影重叠区系设计定稿非裁决字面；
受锁 its 清单 grep 复核；观测钩子需渲染层新增；13 边量级外场景未实测。
零新增依赖、零出网、零负面清单触及。

## ⑩ 社区调研附录

libavoid/Adaptagrams（Wybrow/Marriott/Stuckey GD'09「Orthogonal Connector
Routing」+nudging——后处理散开思想源，量级不取）；Eclipse ELK（elkjs）
layered 通道分配（edgeNodeSpacing/edgeEdgeSpacing——思想参）；GoJS
AvoidsLinksRouter（后处理平行化——实践佐证）；JointJS Manhattan A*（量级
超预算反参）；drawio/mxGraph（无真槽位反参）。补充：yFiles channel 段
分布、OGDF 正交压缩、Excalidraw 肘形（反参）。D 族最近先例=仓内
descendCandidates/corridor 环探。

## ⑪ 修订记（对抗审核四轮处置对照）

- 一轮（B2/W9/N5）：B-1→a1 公式修正（+1→−1）+区间表+呈报触发改 L<36；
  B-2→穷尽终态+槽级不可用续扫+INV-1XX 改写+ideal 操作化；W-1→段×单元
  交集；W-2→谓词前移+L3 双态；W-3→非卡障碍+第三卡判定式；W-4→残余子
  pass+对照清单；W-5→候选 D 入围+A 波及面修正+书面排除；W-6→影响面重估+
  标签语义；W-7→枚举序/量化 ε；W-8→Z 形公式+桩区+退化；W-9→fallback
  改呈报等；N-1→S1-S3；N-3→四属性钩子；N-5→R4；N-2 主控销项。
- 二轮（B1/W3/N5）：新B1→S1 斜段排除定稿+纯交集+ideal 唯一化；新W1→
  残余=旧机制原样承袭+corridor 负锚；新W2→谓词权威门+内收不可达论证+
  术语统一+单测⑥⑪；新W3→极大空白段+申报恢复；新N1-N5 随修。
- 三轮（W1/N5）：W1→桩区禁入适用域收窄+S2 阈值新口径（H≥12）+R3 取景
  可达+收窄入呈报；N1→半开区间；N2→去重+枚举序；N3→残余域重算+指数
  重排+跨域备案；N5→删 onWarn 增配（主控亲核 finish r=0 静默返回）；
  N4 主控销项。
- 四轮（N3）：三条件闭合核验（2 实质+1 形式）；改动面零 B/W 新增。
  N-1（direct/h-slip 无桩顶点断言）→主控亲核闭合（§12）；N-2/N-3→
  U1/U2 批内落实（§5 已内嵌标注）。

## ⑫ 主控终裁记录（2026-10-06）

1. **采纳候选 B（后处理槽位分配）**，A/C/D 排除理由经四轮对抗成立。
2. **四轮唯一遗留条件 N-1 亲核闭合**：chain.ts:144 direct 骨架=
   `[aPt, bPt]` 两点、chain.ts:160 h-slip 骨架=`[aH, bH]` 两点——均无
   stubEnd 顶点（桩顶点仅存在于 band〔bands.ts:113 出桩+终落〕/corridor
   〔chain.ts:193-194〕/fallback〔chain.ts:193-194 同型〕骨架）。「桩区
   适用域收窄」的承重事实成立。
3. N-2（横向开闭）/N-3（部分穿越段跨度条件）=U1/U2 批内条件（§5 已
   标注落点位），不设独立门。
4. 呈报位按 §⑨ 呈用户——全部可否决（异议即回滚该条，呈报位间相互
   独立可局部回滚）。
5. 成本：ops-drafter 四轮 210,834 tok/13.4min（34,977+50,684+58,828+
   66,345）；ops-auditor 四轮 378,250 tok/22.9min（80,023+94,977+
   103,592+99,658）；均零工具调用（纯文本岗）。逐笔入账本。
6. 实施序=U1→U5（§8）；受锁面=[tests]（U3 [locked-change] 重点批）。
   下场首查=本批提交 CI（纯文档面，e2e/单测计数不动：259/2653+82）。
