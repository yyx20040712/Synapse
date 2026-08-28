# SR2-LG-07 门一对抗深审档（脉络布局非单调年份树修复+边 label 渲染——缺陷 E1）

> 审计人：门一对抗深审子代理（2026-08-28）。输入：diff 包 571 行 9 文件
> （sr2-lg-07-gate1.diff）/票面 v1（sr2-lg-07-brief.md）/实现者报告
> （sr2-lg-07-impl.report.md）/源码与测试抽读（lineage-layout.ts、
> LineageCanvas.tsx、LineageEdges.tsx、LineageBoard.tsx 头注、两测试文件、
> check-tickets.mjs、check-quality.mjs、tests/e2e/lineage.spec.ts 断言面）。
> 铁律遵守：只读（本档为唯一产出）；未跑 npm/test/构建（以手推+静态核验替代）。
>
> 开工技能清点：code-review-excellence=用（门一深审直接命中）；
> systematic-debugging/TDD/verification-before-completion=不用（纯审查任务，
> 不产出代码、铁律禁跑测试；TDD 仅作证据判据）。

## 0. 结论速览

**总评：通过（PASS），无回炉项。** B=0 / W=4 / N=14。主控预裁 P1~P5 全部维持。
算法第三遍独立复演逐位吻合；既有 17 it 新约束下数值逐位不变（全部落格 1/3）；
拆件合规；TDD 四档证据齐；受锁面与 tickets:check 推演亲核闭合。

## 1. 主控预裁项复核（可攻击面）

- **P1 维持**。rootLo/rootHi 实现正确且坐标系自洽（详工单 A）。共享层约束
  原样（lineage-layout.ts:212-221 未动比较式）✓。
- **P2 维持**。样式自裁（fontSize 11+var(--text-dim)+halo 底色描边）在票面
  授权域内，可读性处理合理（工单 D）。
- **P3 维持**。M1 修后 finalWidth=400px（复演证实），初始视口 {0,0,1} 够用；
  观察项不做合规。
- **P4 维持**。两受锁测试文件 unlock→改→apply 流程合规，manifest 仅动
  两 sha+generatedAt（diff:12-23），144 条同步自洽。
- **P5 维持，门一裁决不补 docs/invariants.md**。「兄弟根占位分离」是
  layoutLineage 纯函数的单模块布局性质，LineageCanvas 仅整体消费
  positions（不依赖该性质细节），无跨模块行为契约面——模块头注即正确
  锚定处（lineage-layout.ts:12-15 已登记）。

## 2. 工单 A——算法正确性独立复演（最高优先）

### A1 [N] M1 夹具第三遍逐层手推：三源逐位一致

以 diff 后最终代码（lineage-layout.ts:195-282）独立推演
Brown(2002)→Reynolds(1883)→{Cross(1936), SH(2007)}：

- 层序 1883=0/1936=1/2002=2/2007=3；children(Reynolds)=[Cross,SH]（边输入序）。
- place(Cross)：叶，spans={1:[0,180]}，root=[0,180]。
- place(Reynolds)·Cross：首子格 1，offset=0，mergedRootHi=180。
- place(Reynolds)·SH：约束 1 层 3 无共享=0；约束 2=180+40−0=**220**（格 2
  缺陷格闭合）→ offset=220，mergedRootHi=max(180,220+180)=400。
- 归一化 minL=0、width=400；Reynolds 自身 x=400/2=**200**（myLayer 0 无
  占位不右推），root=[110,290]。
- place(Brown)·Reynolds：首子格 1，offset=0；Brown x=200（层 2 无占位）。
- assign：**Brown=200/Reynolds=200/Cross=90/SH=310，y=280/0/140/420**。

与主控票面 {Reynolds=200 居中, Cross=90, 水锤史=310, Brown=200}、实现者
实测 JSON 逐位一致。✓

### A2 [N] rootLo/rootHi 坐标系自洽性（复核重点核心问）

- **定义系**：plo/phi（:255-256）在「子 span 归一化后」坐标系计算，与
  selfRel=x（:265）同系；上层消费 `offset+f.rootLo/rootHi`（:227/:231）
  与 boxOrigin=offsets[i]−minL（:243）配套——即使 minL≠0 假想场景公式
  仍自洽（merged 平移 −minL 与 rootLo 相对归一化原点是同一原点系）。
- **minL 恒 0 不变量（归纳证明）**：叶子 spans.lo=0；内部节点归一化后子
  span 最小 lo=0，而父占位 plo≥0（单子链子块 width≥180 归纳成立→
  x=width/2≥90→plo≥0；多子被约束 2 推开更宽）→ 任何 Frame 的 spans 最小
  lo 恒 0 → 上层 place 的 minL 恒 0。故 M1 及全部既有夹具中 minL 平移为
  恒等——「rootLo/rootHi 是否随 minL 平移同步」的担忧在真实态空间为空集，
  且公式层面亦已自洽。✓
- **x 计算时序**：x=width/2 用父占位并入前的子块 width（:250）——RT 经典
  「父居中于子块」语义保持；W1 右推分支（:252-254）在 plo 取值前生效，
  右推时 rootLo 同步增大反映实际占位。✓

### A3 [N] 紧凑性夹具第二遍手推：逐位一致

P(2020)→{A(2021)→{A1,A2,A3(2022)}, B(2023)→B1(2024)}：
A1/A2/A3 同层逐次 offset=0/220/440（约束 1 主导，约束 2 同值格 3）→
merged={2:[0,620]}，A x=310；place(B)：约束 1 层 3/4 与 A 子树零共享=0，
**约束 2=400(A rootHi)+40−0=440** → offset=440 → B=530；
最终 **P=310, A=310, A1=90, A2=310, A3=530, B=530, B1=530**——与实现者
实测逐位一致。B−A=220 恰下限（A 的 2022 层宽轮廓 [0,620] 未参与推 B——
仅根占位）；B1(层4)与 A3(层2) 同 x=530 异层交错未死。✓ it 两断言均真值锁定。

### A4 [N] 兄弟分离性质归纳证明

`offset+f.rootLo ≥ mergedRootHi+SIBLING_GAP ≥ (归纳) 任意前兄弟
offset'+rootHi'+GAP` → 直接兄弟根占位区间分离 ≥SIBLING_GAP 即中心距
≥NODE_W+SIBLING_GAP。行为层声明成立。森林面：跨树 TREE_GAP 用 f.width
（语义未变——:266 width:finalWidth 原样）不涉 rootLo。✓

### A5 [N]（信息性）「贝塞尔中点近似」实为精确值

控制点 c1=(from.x,mid), c2=(to.x,mid) 下三次贝塞尔 B(0.5)=(P0+3P1+3P2+P3)/8
=(from.x+to.x)/2, y 同理=mid——实现者/票面称「近似」系保守措辞，实为
t=0.5 精确点。无碍（更准）。

## 3. 工单 B——既有 it 回归（新约束下逐字成立？）

### B1 [N] 17 个既有 it 逐一手推：全部落格 1/格 3，数值逐位不变

- 单链（test:48）/INV-27 多父保首条成单链（test:283）/自环悬空剔余单链
  （test:304）：单子格 1，rootLo 约束不触发，全链同 x 不变。
- 兄弟不重叠 C1/C2/C3（test:58）：叶子 span.lo=rootLo=0、共享层
  prev.hi=mergedRootHi → 约束 1=约束 2 同值（格 3），offset 0/220/440
  不变，P 居中 mid=(90+530)/2=310 不变。
- 树序稳定 Z/A（test:95）：同上叶子同层格 3，Z=90<A=310 不变。
- 轮廓合并 A/B（test:74）：约束 1=440 > 约束 2=290+40−0=330（格 3），
  B1 断言 440≥400+40 恰好成立不变；B 根行断言 440−90≥290+40 不变。
- W1 叔侄（test:102）：B offset 约束 1=440>约束 2=330（格 3），
  |B−A2|=|530−310|=220 不变。
- W1 延伸父子同年（test:120）：单子+父右推分支（:252-254 本 diff 未动），
  |P−C|=220 不变。
- 森林（test:217）：树间仅 f.width+TREE_GAP；各树单链 width=180，
  断言两处恰好 260/520 不变。
- 覆盖/半覆盖 4 it（test:240/249/257）+层带 2 it+纯函数 it：place 不触或
  x 覆盖断链面，与 rootLo 无交集。
- **结论**：rootLo 下限对既有夹具「恒弱于或同值于共享层约束」（因叶子
  span.lo≡rootLo、span.hi≡rootHi；内部子树共享层时约束 1 的 prev.hi 与
  约束 2 的 mergedRootHi 在这些夹具中使约束 1 胜出或同值）——不改变任何
  既有断言数值。与报告「既有 17 it 零改全绿」一致。

### B2 [N] 格 4（共享层存在但根占位项胜出）理论存在性

rootLo 与共享层 span.lo 无全序、mergedRootHi 与共享层 prev.hi 亦无全序
→格 4 理论存在（兄弟共享深层且该层 span.lo≫rootLo 时约束 2 胜出）。这是
P1 设计意图（「不论年份层必错开」）的新行为面，分离只增不减，W1 全树
「同年层内 x 区间分离」性质保持。非回归风险。

### B3 [W] 格 4 无专属测试锚（覆盖面小缺口，非缺陷）

两新 it 锚定格 2（缺陷 E1）与格 3（紧凑）；变异①（删约束 2 块）已证两格
可抓公式回退。但「共享层存在且根占位项>共享层项」的排序行为（max 取
约束 2 侧）无 it 直接锁定——若未来实现把约束 2 误写成仅在无共享层时生效
（if 约束 1===0），格 2 it 仍绿、格 4 场景回归无网。属测试完整性 W 级
观察，不阻塞收口（可随下票补格 4 夹具，如「兄弟共享深层但根占位偏左」）。

## 4. 工单 C——拆件自裁（LineageCanvas→LineageEdges）

- **C1 [N]** 行数实算（wc）：Canvas **233** / Edges **61** / Board 232 /
  layout.ts **285**——全部 ≤250（组件红线 check-quality.mjs:103 对
  `src/renderer/*.tsx`）/≤500（ESLint）。拆件必要性坐实：label 段加入后
  Canvas 将超 250（实现者自述 269），Board 头注 :53「组件 ≤250 行红线
  拆分预案」指涉属实。
- **C2 [N]** 拆分边界=边渲染整段（path+label 同 `<g key={e.id}>`）单一
  职责；props 仅 edges+positions 两入参；渲染语义原样搬迁（贝塞尔 d 式、
  stroke/width/opacity 逐属性比对 diff:293-312 vs Edges:34-41 一致）。
- **C3 [N]** 无循环依赖：LineageCanvas→LineageEdges→（lineage-layout 常量
  NODE_H+shared type）单向；positions 用结构类型 `Map<string,{x,y}>` 不引
  LayoutResult（防环声明，实际 layout.ts 也未 import 组件——双保险）。
- **C4 [N]** 钩子完整性：data-edge-id 保留于拆件（Edges:35）；e2e 断言面
  `svg path[data-edge-id]` 计数（lineage.spec.ts:208/239/344）不因组件
  层级变化受影响（DOM 查询），e2e 4/4 加跑佐证可信。
- **C5 [N]** Frame 接口扩展不外泄：`interface Frame`（layout.ts:108）非
  export；LayoutResult（:100-105）与 layoutLineage 签名零改；常量
  NODE_W/NODE_H/LAYER_GAP/SIBLING_GAP/TREE_GAP 零改（:91-98 比对未动）。

## 5. 工单 D——边 label

- **D1 [N]** 空串不渲染 `e.label !== ''`（Edges:52）——票面字面；自裁③
  不扩 trim 合理（shared z.string() 无 trim 语义，空白串属数据面）。
  测试双断言：无钩子 toBeNull + path 计数 2 不受影响（canvas.test:176-177）。
- **D2 [N]** data-edge-label 钩（Edges:53）；真实文本红线：
  `textContent).toBe('方法继承链')` + host.textContent.toContain
  （canvas.test:173-174）——「渲染出真实文本」满足。
- **D3 [N]** 样式自裁合理性：fontSize 11/fill var(--text-dim)/
  paintOrder=stroke+stroke var(--bg) 3px+strokeLinejoin=round——随主题底色
  halo，跨层带横线/连线可读；票面授权「样式实现者自裁申报」且已申报。
- **D4 [W]** label 与节点卡片重叠几何（票面评估项）：单调树边中点 y 落
  两层带间隙中央（层距 140、卡高 64 → 间隙 [32,108] 中点 70）不叠卡；
  **非单调跨层长边**（如 Brown→Reynolds 跨三层）中点 y 落中间层带——M1
  中 x=200 与 Cross 卡 [0,180] 侥幸差 20px 不叠，更密树会叠卡。halo 保证
  文字自身可读，票面生命周期「不做碰撞避让」覆盖此面——观察项（与 P3
  同类：用户验收如报 label 压卡再立小票），非缺陷。

## 6. 工单 E——常规

- **E1 [N]** TDD 四档：首红 log 3 it 红/31 passed（=17 layout+14 canvas
  基线，与疑虑 1 实数吻合）；变异① 删约束 2 块→恰中 2 it（E1 it
  「0≥220」+紧凑 it「−220 to be 220」——后者数值自洽：旧实现 B=90−A=
  310=−220）；变异② 删 label 块→1 it 红，**拆件后对最终形态（LineageEdges）
  补做同枚变异**——P2 落点变更后的必要补证，做法正确；cp 备份法还原
  diff 空。
- **E2 [N]** UTF-8：8 个改动文件 node 解码无 U+FFFD（本审亲验）。
- **E3 [N]** TODO/FIXME/placeholder：lineage 域 src+两测试 grep 零命中
  （本审亲验）。
- **E4 [W]** 行数自报口径偏差：报告 286/234/62 vs 本审 wc 实算
  285/233/61——三处一致 +1（末行/EOF 口径差），实测全部合规，非造假。
- **E5 [N]** 受锁面与范围：diff 9 文件与 git status 吻合（6 改+Edgs 新增
  +brief/report），无范围蔓延。注：工作树另有 `scripts/audits/
  sr2-ai-11-brief.md`（并行工单主控件，非本单产物）——收口 staging 须
  显式列文件（AGENTS 纪律），勿 `git add -A`。
- **E6 [N]** 「缺陷 E1」注释自裁 vs tickets:check（复核重点 5）：本审精读
  check-tickets.mjs:73-105——tests 分支在占位桩检查后 `continue`（:77-97），
  **it 名/注释中的工单号串永不进 ticketRefRe/done 号外引扫描**（仅
  unimplementedObject/NotImplementedError 调用受限）；src 面（:98-104）
  SR2-LG-07 未注册时任何引用即红 → 实现者 src 用「缺陷 E1（2026-08-28
  验收）」规避正确；layout.ts:3 既有 `[SR2-LG-02]` 为自引用规约头豁免
  （t.file===rel）。主控登记 done 后：src 零引用 ✓、tests it 名豁免 ✓
  ——实现者疑虑 4 推演完整闭合，且「不建议回填」的结论正确（回填反而
  触发 :100-101 done 号外引红）。
- **E7 [W]** 票面/派单基线数误差：layout「既有 12 it」实数 17、e2e「7
  用例」实数 4 test 句柄——主控件信息误差，实现者已如实申报（疑虑 1/2），
  总数 734+3=737 对账吻合。记 W 供主控后续派单校数。
- **E8 [N]** e2e 佐证：报告称 lineage.spec 4/4（15.5s）；本审亲核其断言面
  为真实文本/path[data-edge-id] 计数/拖拽 transform，无布局数值断言——
  与报告自裁⑤描述一致，e2e 零改合规。

## 7. 统计与总评

| 工单 | B | W | N |
|---|---|---|---|
| A 算法复演 | 0 | 0 | 5 |
| B 既有回归 | 0 | 1（B3 格 4 无锚） | 2 |
| C 拆件 | 0 | 0 | 5 |
| D 边 label | 0 | 1（D4 压卡观察） | 3 |
| E 常规 | 0 | 2（E4 行数口径/E7 票面基线数） | 8 |
| **合计** | **0** | **4** | **23** |

**总评：通过（PASS），零回炉。** B 级缺失：无。4 个 W 均为观察/口径项，
不阻塞收口：B3 可随下票补格 4 夹具；D4 与 P3 同挂用户验收观察项；
E4/E7 属报告口径与主控件校数问题。主控可径入收口单（登记 SR2-LG-07→
翻状态→[locked-change] 提交；staging 显式列文件，注意工作树并行工单
文件 sr2-ai-11-brief.md 勿扫入）。
