# R2-LG10 门一联审档（脉络布局收官：auto-fit+题名分档+侧板夜化）

> 三屋模式门一对抗深审。审计人=联审子代理（R2-LG10 gate1）。日期 2026-08-29。
> 输入=gate1.diff（1047 行）+brief+impl.report+六类 log+终态源码亲读。只读审计，
> 本档为唯一写出面。

**统计行：B=0 / W=3 / N=7 —— 门一裁决=PASS（放行收口，三项 W 均为非行为缺陷的边界债/卫生项，附收口建议）**

技能清点（开工纪律）：code-review-excellence（用——本任务本体）/verification-before-completion
（用——四档证据逐 log 核对）/test-driven-development（用——首红变异形态核验）/
javascript-testing-patterns（用——jsdom 桩真实性与断言强度评估）；systematic-debugging、
浏览器/部署类不用（只读审计，铁律禁 npm/禁跑测试）。

---

## A. auto-fit 状态机与数学终审（最高优先）——结论：通过

### A1 状态机逐格核对（对 lineage-viewport.ts 终态亲读）

| 票面/预裁语义 | 实现 | 判定 |
| --- | --- | --- |
| 触发=nodes/edges 引用变化 且 !userInteracted | effect 依赖 [nodes, edges, layout, userInteracted, svgRef]，守卫 userInteracted \|\| nodes.length===0 \|\| rect≤0 | ✓（layout 依赖冗余无害——useMemo 同参产出） |
| userInteracted 置位两源=panbg pointerdown/滚轮 | onDown（命中 data-panbg 即置位）+onWheel（置位）恰两处 | ✓ 与票面 P1 字面精确匹配 |
| 复位按钮=清标记+触发 fit | resetFit=setUserInteracted(false)→effect 依赖 userInteracted 变化重跑→单一 fit 路径（it3 锁定回到 fitted 精确值） | ✓ |
| 用户交互后图变化（导入替换）不抢视口 | it2「不抢用户视口」：pan 后 nodes/edges 全新引用渲染，after===panned 精确断言 | ✓ |
| 空图 idle 态不 fit | nodes.length===0 早退 | ✓ |

**resetFit no-op 边界攻防**：userInteracted=false（从未交互）时点击按钮=setState(false)
无状态变化→React bail out→不重 fit。可达性核查：App.tsx L169
`{view === 'lineage' && <LineagePage />}` 为**条件渲染**——切 tab 即卸载/重挂载，
「挂载时 0 尺寸的隐藏 tab 后变可见」场景不可达（每次进入脉络页 mount effect 时 svg
已在布局流，rect 可量测→fit 正常）。剩余可达角落=挂载 fit 后用户 resize 窗口且从未
pan/zoom，此时点按钮无动作（视口已偏但 userInteracted 仍 false）。票面 P1 对按钮的
语义=「复位该标记」，预裁「清标记+触发 fit」在 true→false 路径完全兑现；false 路径
的 no-op 是 React 状态语义自然结果，非实现错误。评级 **W3**（边界债+resize 不跟随，
v1 生命周期层未承诺 resize 面——建议登记遗留池）。

**实现者疑虑 2 复核**（节点拖拽不置位→写回填后 refit 轻跳）：票面 P1 字面「用户未
手动 pan/zoom 期间」恰只含两源，实现贴票面；e2e T2 落点断言在布局坐标层（node g
transform），refit 只改外层 data-viewport 不影响断言（prerun 红→fixed 绿佐证）。
行为粗糙属**票面规格本身**而非实现偏差，实现者如实披露。N 级，交主控裁量是否收紧。

### A2 包围盒数学终审

- **层带标左缘**：BAND_LEFT=-200 参与 xMin 初值。渲染层实证（LineageCanvas 终态）：
  band line x1=-200、菱形刻度 translate(-197)、年份标 x=-190（text 默认 start 向右
  延伸）——-200 恰为三层元素最左。✓
- **手工覆盖位参与**：layout.positions 含覆盖值原样（「覆盖节点=覆盖值原样」既有
  语义），fitViewport 遍历 nodes 取 positions——覆盖节点照常入包围盒，且远置节点
  （x<-200）会正确扩张 xMin。✓
- **退化防御**：effect 层 nodes.length===0 早退；fitViewport 层 yMin===Infinity 返回
  {0,0,1}（全 undefined 理论不可达防御）。除零不可能：单节点时 x 宽≥290（-200 初值
  到右缘≥90）、y 宽=NODE_H=64，恒正。✓
- **k 钳制**：min(ZOOM.max, max(ZOOM.min, min(容纳比)))——vw<240 时容纳比为负→
  0.25 兜底。图小于视口=**放大**（无 k≤1 钳制）——与主控预裁「包围盒超界取 min、
  钳制既有界内」一致，e2e T1 在真实窗口下 scale>1 实测绿。✓
- **接缝风险（W1）**：BAND_LEFT=-200 是 viewport 拆件内**独立手写常量**，与
  LineageCanvas 层带渲染的字面 -200/-197/-190 为两处声明，无共享单源、无交叉断言
  锁定。viewport 头注有单向口径声明（「band line x1=-200/年份标 x=-190」——接缝
  归责核对过、非互斥，合规），Canvas 侧头注无反向指针。若层带渲染坐标改动，
  fitViewport 不跟随，it1 的 `tx-190k>0` 断言仅在特定 k/tx 组合下红（对「左缘收缩
  到层带标右」的变异有拦截力，对「左缘左移」无）。LG9 N5 验收点（fit 后年份标必
  可见）依赖该耦合而 INV-36 未收录。**建议：登记遗留池或补单源化（BAND 坐标常量
  从渲染层导出共享）**。不阻断（同 feature 目录+头注声明在案+部分测试拦截力）。

### A3 测试真实性——锁的是真数学

it1 手算独立复核：chain() 三节点题名 6/4/4 字全短档 180。层带 y=0/140/280（节点
中心即层 y）→ yMin=-32/yMax=312（H=344）；子块宽 180 归零后父居中 x=90 →
xMin=min(-200, 0)=-200/xMax=180（W=380）。k=min((800−240)/380, (600−160)/344)
=min(1.4737, 1.2791)=**440/344≈1.279070**；tx=120+200k≈375.814；ty=80+32k≈120.930。
与断言 `toBeCloseTo(440/344, 6)` 等逐值吻合——**独立手算精确值（6 位小数），非
stub 形态断言**。stubViewportRect(800,600) 只供 vw/vh 输入（selection-layer.test
同族配方），桩对象与被测数学无共谋面。

**jsdom 0 尺寸防御的真实性**：既有 pan/zoom it 不加桩→mount 时 rect=0→fit 跳过→
transform 保持 identity→既有断言面零红（兼容前提成立，非巧合）；新 it 加桩后锁
fit 精确值。防御是**真实行为分支**（跳过）而非断言 accommodating。✓

## B. T2 scale-aware 受锁改写守卫强度——结论：等强度，无放宽

- 旧=before+120/80（k=1 假设）；新=拖前读 `data-viewport` transform 的 scale(fitK)，
  target=before+120/fitK、80/fitK。**数学等价换算**：屏幕位移÷k=布局位移。
  closeTo(2) 精度、expect.poll、objectContaining、reload 后 |after−target|≤2 持久
  断言**全部原样保持**。
- fitK 读取正则 `/scale\(([\d.]+)\)$/` 与 T1 既有同式（先例面）；`?? '1'` 回退是
  transform 契约（INV-36 逐字符锁定）下的防御分支，正常路径必命中——非放宽。
- reload 后 refit（新页面 mount→fit）不影响 after 断言（布局坐标层）。
- **红形态取证**：r2-lg10-e2e-lineage-prerun.log=1 failed/3 passed，失败恰为 T2
  closeTo 落点偏移（k≠1 导致），非环境噪音；改写后 lineage-fixed 4 passed。
  必然红申报（§6 唯一条）成立且**无第二处既有 it 被修改**（diff 逐 hunk 核对）。

## C. 题名分档——结论：通过

- **三消费单源实证**：lineage-layout place() wOf 映射 / LineageNodeCard
  `w=nodeWidth(n.title)`（rect x/width+cornerPaths(w) 角饰函数化）/ fitViewport
  `hw=nodeWidth(n.title)/2`——全经同一导出纯函数，无第四处手写档值（grep 复核）。
- **既有 20 it 零红抽查两 it**：①「轮廓合并：兄弟放置受孙层轮廓约束」——夹具
  title 全默认 `节点${id}`（≤3 字短档）→ NODE_W/2 断言语义不变；②「缺陷 E1 非
  单调不退化单列」——最长夹具「节点Reynolds」8 字短档，「错开恰 220=NODE_W+
  SIBLING_GAP」恰等值断言在短档下值不变。grep 实证既有夹具 title patch 仅存在于
  新增 describe（'短'/'中'×13/'长'×29）——「夹具全短档」申报属实。
- **分档 it 断言强度**：边界五点（12→180/13→220/28→220/29→260/空→180）值断言；
  兄弟占位 |L−M|≥280（110+40+130 下限，同年层双约束叠加）；异档单链对齐等值
  （===）。均为强断言，无恒真面。
- NODE_W=180 导出保持（自裁 9）→ 既有 import 面语义零变。

## D. 侧板夜化——结论：通过

- **mockup .side 逐值对照**（docs/design/mockups/lineage-constellation.html L98-103）：
  background rgba(40,51,86,.72) ✓ / blur(12px) ✓ / border 1px rgba(207,174,114,.25) ✓
  / radius 12 ✓ / shadow 0 8px 28px rgba(6,10,24,.45) ✓——NIGHT_GLASS 五值全中。
- **.note 逐值**（L110-111）：底 rgba(23,30,51,.45) ✓+描边 rgba(151,160,187,.28) ✓
  ——NOTE_CARD 两值全中（票面 P3 只锁此两值；圆角 Tailwind rounded=4px vs mockup
  8px 微差未锁未申报，N 级）。
- **h4 金条换名复核**：mockup `var(--gold)` 在 mockup 文件内定义=`#cfae72`（L12）；
  app 中该值的既有别名=`--gold-night`（=#cfae72，theme.css L41），app 的 `--gold`=
  #b8935a（亮面值）。实现取 var(--gold-night)=**mockup 字面值等值**——自裁 4 成立
  且实为正确换名（若照抄 var(--gold) 反而是错值）。
- **testid/文案/QUESTION_COLOR 零改实证**：diff 逐行核对——data-testid 面零触碰；
  「已绑定文献」「主题节点无笔记」「暂无 AI 笔记/人工笔记」「AI 笔记加载中…」全
  保留；h5 borderLeft `3px solid ${QUESTION_COLOR[question]}` 与色块 background
  原样，且新增 it 加锚断言（防夜化回退吃掉分色）。✓
- **既有零红**：verify 840/840 全绿佐证；夜化 it 断言真实性=style 属性串匹配+
  backdropFilter 走 DOM 属性（jsdom 不序列化进 style 属性的实证注释在案——自裁 8）。

## E. 宪法红线——结论：通过（收口注意项见门二清单）

- **受锁**：4 测试文件+lineage.spec T2 改动在案，[locked-change] 尾注=收口提交职责
  （未提交态合规）；manifest 152 条不变；**sha 现场复核 4/4 MATCH**（node LF 归一
  后对 manifest 逐一比对）；两次 unlock→apply 时间序申报在案，收口提交须即时同步。
- **行数**：lineage-viewport 166 / Canvas 203（318→203）/ NodeCard 93 / SidePanel 197
  / AiNotes 141 / ManualNote 90——组件 ≤250 全过；layout 309<500（max-lines 界；
  「repo ≤300」指 repos 数据层，不适用渲染纯函数；verify lint 绿佐证）。
- **UTF-8**：新/改文件 file 命令验证全过；TODO/FIXME/placeholder grep 零命中。
- **TDD 四档（LG9 W1 教训兑现核对）**：
  1. 首红 log 落盘=EXIT 非 0，7 failed/60 passed（67）——8 新 it 中 7 红（含
     nodeWidth 导出缺失红、数值差红、style 空串红，红形态真实）+1 绿（异档对齐
     保持型 it，自裁 6 如实申报为非常规首红）。
  2. 变异 M1（删 fit）=3 红；M2（删 userInteracted 置位）=2 红——**恰中性**：M2 下
     首载 fit it 仍绿证明隔离正确（置位只影响抢占面不影响 fit 本体）；红形态=40/50
     px 精确差（pan 后被 refit 抢回 fitted 值），真实拦截。
  3. 还原=cp 备份法（禁 git checkout 宪法条款遵守），「还原 diff 空：OK」×2 落盘
     （拆件前+终态结构重跑两段，mutation.log L82-179 结构核对）。
  4. 终绿：还原后回绿 4/4+全量 verify 840/840 EXIT=0。
- **INV-36 登记质量**：四列完整（值域三档+三消费+抢占门两源+复位唯一口+transform
  契约 / 实现链 nodeWidth+viewport 状态机头注 / 单测+e2e 防线 / 锚定态）——表述
  质量 Good。小瑕疵（N）：第一列消费点写「LineageCanvas fitViewport」而实现驻
  lineage-viewport.ts（第二列文件指对了，第一列沿袭票面预裁文字）。

## F. 母本符合度+报告诚实性——结论：通过

- **10 自裁逐条核实**：①拆件动因真实（不拆则 Canvas≈318>250 触 CI 红线；「禁入
  layout 纯函数」架构红线保持——fitViewport 驻拆件依赖 DOM 量测由调用方注入）；
  ②按钮宿主+空图不渲染（`nodes.length>0 &&` 既有空态零按钮面保持）；③aside 归并
  纯容器（props/接线零动）；④金条换名=等值复核成立；⑤总评包条目卡（mockup .note
  同款两值）；⑥保持型 it 申报与首红 7/8 数字互证；⑦INV-36 在册；⑧backdropFilter
  DOM 属性断言+实证注释；⑨NODE_W=180 语义保持+另名导出；⑩档值未微调如实申报。
- **未申报面扫描**：git status 14 改+1 新增与报告 §2 清单逐一对上；gate1.diff 与
  现场终态抽读一致（Canvas/viewport/测试三处亲读吻合；diff 新文件段含尾部空行
  计 167 行 vs 现场 166 行=文末换行计法差，非内容差）；r3-*-brief.md 为别单未跟踪
  文件不在本 diff 面。
- **pan/zoom「原文搬迁」精确性（N）**：两 effect 依赖数组由 `[]` 变 `[svgRef]`
  （svgRef=useRef 产物 identity 恒定）——行为严格等价但非逐字符搬迁；onWheel 内
  新增 setUserInteracted(true) 为票面新行为。「行为零变」申报成立。
- **报告数字全对账**：首红 7/60、绿 840（基线 832+8）、e2e full2 25 passed、
  prerun 1/3、fixed 4/4、reader-retry 10 passed——逐一在 log 中复核命中。
- **疑虑 3 条复核**：T1 尺寸依赖（真——T1 另有主动 wheel 放大双保险，已披露）；
  拖拽 refit（票面字面语义，N）；剪贴板 flake（两 log 在案可复查，N）。

## G. 成本账本行

- 实现者：≈12.31M tok / 28.2 min（票面给定，随交接书入账）。
- 门一联审（本代理）：≈0.9M tok / ≈12 min（六类证据+终态源码全量亲读，7 轮工具调用）。

---

## 门二四清单（重点复核项）

1. **W1 BAND_LEFT 接缝**：层带左缘 -200 与渲染层字面无单源——裁决登记遗留池（推荐，
   最小改动）或本单补单源化（渲染层导出常量+INV-36 收录锚定关系）。
2. **W2 markUserInteracted 死代码**：导出方法零消费零测试（grep 全仓证实；注释暗示
   「之外的用户视口操作」但实际无第三源）。裁决：收口前删（需重验 verify，5 行内
   零断言面影响）或补注释声明接缝预留意图后保留。
3. **收口纪律**：[locked-change] 尾注（4 测试文件+lineage.spec）+提交即时 locks:apply
   同步+`git diff --stat` 终查（r3-*-brief.md 别单文件勿扫入——staging 显式列文件）。
4. **W3/T1 尺寸依赖披露面**：resize 不跟随+按钮 no-op 角落+T1 scale>1 的窗口尺寸
   耦合——三者同族「视口与窗口尺寸的未声明假设」，建议合并一条遗留池登记。

## 放行提交与否

**PASS——放行收口。** B=0：无行为错误、无数学错误、无守卫放宽、无票面违背、无
报告失实。W=3 均为边界债/卫生项（不触回炉阈值），其中 W2 建议收口顺手处置、
W1/W3 建议遗留池登记。门二按四清单复核后可翻 registry。
