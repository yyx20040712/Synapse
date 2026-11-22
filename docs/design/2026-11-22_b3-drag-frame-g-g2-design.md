# B3 设计稿——F-b 拖拽帧 + G/G2（设计先行）

- 日期：2026-11-22
- 性质：设计稿+红测试（本批零 src 改动；实现属 B3 实现批）。规划单源=仓外
  `plan-v1.md` §5/§11.1/§11.2/§11.4/§14；业务事实源=同目录 `summary-draft.md`
  §3 路径二①-⑤、§1.G、§8.A、§9.2 裁决 8、§10.6。行数基线=2026-11-22 实测
  （与 plan §5.3 全表一致：card-drag-session 487、useCardDrag 83、
  card-drag-flight 136、TimelineYears 231、LineageTimeline 214、
  LineageTimelineCard 144、timeline-interactions 112、drag-slot-candidates 42、
  card-drag-grid 70、capacity 164、theme-lineage.css 449）。
- 外审回写：2026-11-22 DeepSeek 外审（阻断 7/警告 13/观测 8）经主控逐项
  裁决后回写本稿——各节以 B1-B7/W1-W13 标记标注处置落点，裁决结论汇总见
  §15（全部已决，无待决悬空）。§9 计数与 CSS 清单为 grep/vitest 实测值。
- 二轮修订：2026-11-22 planner 岗复核处置 P1/P2/W1-W5/O1/O2 已回写；布局
  终局屏障、scrollDirty 合批、e2e 样板①公式化 oracle、F3 双 oracle 与新增
  F8/G10/L1-L3 测试以本版为准。
- 三轮修订：2026-11-22 DeepSeek 二轮审核 22 项处置全部回写。F8 夹具按
  insertIndexFromGrid 数学修正；布局屏障补 padding 在途跟踪、会话重叠锁与
  zoom 同步 measure 守卫；新增 L4/L5/G11/G12，实测总数 32=20 红+12 守卫绿。
- 本稿体例：〔事实〕=代码/文档可核对出处（行号）；〔推断〕=由事实推导、
  实现批须核验；〔决定〕=本稿的设计选择。

## 1. 现状事实（行号出处）与推断分列

〔事实〕帧协议缺失面（summary §3 路径二①④的代码落点）：

- `card-drag-session.ts:272-372` onMove 逐事件执行：读（:317 `toOwn`→content
  gBCR）→写（:321-322 卡 inline left/top）→读（:340 `overSourceFrame`→frame
  gBCR；:355 `framePointer`→frame gBCR+getComputedStyle）——上一事件写→本
  事件读=强制全子树同步 relayout 交错循环；无 rAF 合帧。
- `card-drag-session.ts:363-371` pullPx/insertIdx/overFrame/extend 任一变化
  即 `setSlot`（React 顶层瞬态）；`TimelineYears.tsx:138-144` 把 slot.pullPx
  经 React inline style 写 `--lg-pull`——每次 pullPx 变化整树重渲染
  （summary §3 路径二③④）。
- `card-drag-flight.ts:29-30` SETTLE_TRANSITION=left/top .32s；:83-97 飞行
  起终点全写 left/top（布局属性，非合成器通道）。
- `theme-lineage.css:89` .month-frame transition 声明=height .38s
  cubic-bezier(.22,.9,.26,1) + border-color var(--dur-lazy) + background
  var(--dur-lazy)（后两项为月框样式域过渡、与本批无关）——真正变化的
  padding-bottom（:193 `.stretch` calc(38px+var(--lg-pull))）不在声明集内
  =无过渡，逐事件硬跳+松手瞬回（summary §8.A G2 三病灶①③；外审观测改准：
  原稿「只含 height」表述不准，结论不变——padding-bottom 无过渡承载）。
- `drag-slot-candidates.tsx:27-41` 候选=含源网格全体 cell（0..total−1 除
  insertIdx）逐格 faded，多数格被卡占用靠 `.drag-slot.cand` z3 提层
  （theme-lineage.css:180）兜可见；`.drag-slot.faded` opacity .35
  （theme-lineage.css:175）低于 F-DRAGVIS-01 自身验收 0.5（summary §4.1-6）。
- `LineageTimelineCard.tsx:41` 无 memo；`timeline-interactions.ts:68-112`
  createTimelineCardHandlers 每渲染重建闭包；lineage 域 React.memo 计数=0
  （全 renderer 现有 2 处：app/ViewHost.tsx:33、reader/selection-paint.tsx——
  B2 已新增 ViewHost，summary「仅 1 处」为 B2 前口径）。

〔事实〕语义锚（本稿不得破坏面）：INV-83/96/98/100/111/140/144/145④⑤/154/169
（docs/invariants.md:99,112,114,116,130,163,167,168,176,191）；INV-100 帧时序
面登记为「不可下沉」（invariants.md:239）；INV-83 存留「view/edit 双态拖拽」
旧文（:99）而现行代码为 edit 专属（useCardDrag.ts:53 dragEnabled=isEditing、
INV-177）；INV-84 存留 saved 旧词（:100）。

〔推断〕summary §3 路径二⑤「settle 三连击 3+ 次全树 reconcile」中 nodes
乐观替换链属 store 层，本批不改写（onReorderMonthSlots/applyObstacleReroute
零改）；routeEpoch 仅按 §3.5 改触发时点，不改 store 数据结构或重路由算法。
本批可收敛面=拖拽会话帧协议+渲染面；全树 reconcile 收敛的另一来源（瞬态
slot 订阅面）由 §3 React 提交面收窄承载。

## 2. 拖拽会话状态机全枚举

四态 `drag ∈ {idle, pending, dragging, settle}`（与现行 DragPhase 一致，
card-drag-session.ts:43）。迁移表（每行=一个完整迁移，含副作用）：

| # | 起点 | 事件 | 条件 | 终点 | 副作用 |
|---|---|---|---|---|---|
| 1 | idle | pointerdown | edit ∧ ¬picking ∧ ¬pop ∧ button=0 ∧ 节点在档 ∧ frame 在档 ∧ ¬layout.active | pending | 清 click 抑制残旗（R6）；建会话（冻结基准 grab 帧同步取值 frameBottom0/Left0/Right0——INV-100）；setPointerCapture（合成事件失败容错） |
| 2 | idle | pointerdown | 其余（非 edit/拾取中/弹层开/非主键/节点缺席/布局屏障未终局） | idle | 无（pointerdown 即拒——INV-83 edit 专属闸+布局屏障锁；不得清旧 layout/挂起 ref/监听） |
| 3 | pending | pointermove | client 域位移 <5px（DRAG_THRESHOLD，INV-144 屏幕反馈量不换算） | pending | 仅记录 lastClient（零读零写零提交；exceeded latch 不置位） |
| 4 | pending | pointermove | 位移 ≥5px——**纯算术 exceeded latch 先置位**（B2：事件时点 client 域距离算术判定） | pending | 仅置 latch+pointerDirty 并 schedule（零 DOM 读/写/提交）；phase 不提前翻 dragging |
| 4b | pending | rAF flush | exceeded latch 已置位 ∧ 有待处理指针 | dragging | 激活帧批：读（card rect/offsetLeft/offsetTop/content rect/frame rect/card.style.marginLeft）→计算（o=抓取偏移/ghost0/frameOrigin/冻结基准）→写（inline position/width/marginLeft=0/transition none/left 锚/top 锚/translate 初值/will-change；**--lg-pull 同③条件写——激活帧通常 extend=false 零写（F6）；首移即入带时 extend=true 同帧写实际 pullPx 而非 82px fallback（G12 锁）**）→React 提交（slot active+phase=dragging）并开启连续挂起窗 |
| 5 | pending | pointerup | exceeded latch 未置位（无 ≥5px move 记录） | idle | 阈值未过=单击选中既有链（click 事件自然派发；无 slot 无写——INV-83） |
| 6 | pending | pointercancel | exceeded latch 未置位 | idle | 〔决定〕未过阈 cancel=拖拽未发生，同迁移 5 径回 idle（W1 二轮收窄；现行 onUp !moved 分支一致语义，card-drag-session.ts:377-379） |
| 6b | pending | pointercancel | exceeded latch 已置位 ∧ 尚未 flush | settle | 先按 lastClient 同步执行终局批（激活读→算→写→React 提交），再按迁移 11 同式落当前候选槽；禁止经事件 0/0 坐标判回弹（F8 红例） |
| 7 | dragging | pointermove | — | dragging | 仅记录 lastClient+排一个 rAF（每帧至多一批——零即时读写零提交） |
| 8 | dragging | rAF flush | 有记录指针或 scrollDirty | dragging | 帧批段 0（tick 施滚；scrollDirty 时与待处理指针合为一次滚动后读算写）+段 1（仅段 0 未消费的指针；读→纯计算→写 translate/--lg-pull→React 提交仅真变化，见 §3.2） |
| 9 | dragging | pointerup | 指针∈源框∪82px 下拉带（overSourceFrame 实时域） | settle | **终局批次**：读（实时域判定）→计算 settleIdx=insertIdx/finalIds/changed→React 提交（slot active=false+phase=settle）→flightRef→编排层 startFlight |
| 10 | dragging | pointerup | 框外 | settle | 同迁移 9，settleIdx=srcIdx（回弹基准）——序不变时 changed=false，finish 零写（INV-98 回弹 no-op） |
| 11 | dragging | pointercancel | — | settle | 同迁移 9，判定输入=**session.lastClient**（[R5] 系统取消=落当前候选槽，与松手同式清场；W3 行为修正：取消事件坐标常 0/0，现行用事件坐标判 overSourceFrame(0,0)=false 误回弹 srcIdx——与 R5 意图相悖，修正随批申报，红例 F7 锁） |
| 12 | settle | flight transitionend / transitioncancel / 600ms 兜底定时器 | 任一先至 | idle | flight finishOnce 幂等：inline 全清（含 translate）→changed 时 onReorderMonthSlots（时点不变，无乐观写——INV-83）→置 flightDone 并 tryLayoutFinish；padding 未完成时布局回落中屏障继续保持，已完成则同点布局终局（§3.5） |
| 12b | 布局回落中 | 源月框 padding-bottom transitionend/transitioncancel/布局 600ms 兜底 | flight 已完成 ∧ padding 子条件任一先至 | idle（屏障解除） | layoutFinishOnce：恰一次 layoutEpoch 入 recomputeKey 量测+routeEpoch bump；解除挂起。flight 与 padding 双完成才允许执行，详见 §3.5 |
| 13 | settle；或 idle 且布局屏障未终局 | pointerdown | settle ∨ layout.active | 原态 | 忽略（不二次激活——INV-83；方案 A：锁延长至 layout.finished，旧屏障不被新会话清除——新会话根本开不了，G11 红例）。正常拖拽未用 stretch 时布局终局=flight finish，无额外忽略窗；仅 G2 会话在 flight finish 后增加 ≤.38s、事件缺失时至 600ms 兜底的忽略窗，随 INV-83 时点扩展申报 |
| 14 | 任意 | Esc | 任意 | 不变 | 无 Esc 取消（松手恒落当前槽——INV-83） |
| 15 | 任意 | 组件卸载/视图切换 | — | （会话消亡） | effect cleanup：**先 scheduler.cancel 再 auto.stop**+摘 document/布局终局监听与兜底；残存已入队 rAF 回调凭 session 代次/null 守卫=no-op（W1）；blur/lostpointercapture 无退出监听=已知边界（§12.8 登记，不改行为） |

**终局批（up/cancel 共用入口前置段——B2）**：pointerup/pointercancel 入口
先于 click/settle 判定执行——存在未 flush 指针（lastClient 有记录且帧批未
消费）时按 lastClient **同步执行一次完整读→算→提交**：pending 且 exceeded
latch 已置位=先执行激活帧批（读→写→React 提交 active）再落位判定（等效
迁移 4b→迁移 9/10/11 串行——快速拖放不被当单击也不落旧槽）；dragging=按
lastClient 重算 ghost/insertIdx/overFrame/extend/pullPx（与帧批同式）后再判
settleIdx。
无未 flush 指针（静止后松手/帧已 flush）=直接判定。守卫=G8（move≥5px 不
flush 直接 up 仍 settle 非 click）+G10（同径跨槽到组末仍写新序），cancel 域
红例=F7（已激活 cancel）+F8（pending latch 已置位未 flush cancel）。

**布局屏障子态（P1；不是第五种 DragPhase；pointerdown 锁延长至布局终局）**：
每次会话另持 `extendSeen`、`paddingInFlight`、`paddingFinished` 与
`layout={active,flightDone,paddingDone,finished}`。迁移 4b 激活时 active=true、
finished=false，paddingInFlight=false；extend 假变真且 .stretch 挂载时置
extendSeen。**extend 真变假（.stretch 摘除）即启动 padding 跟踪**，不等 up：
置 paddingInFlight=true、paddingFinished=false，监听源月框 padding-bottom 的
transitionend/transitioncancel；此时启动 600ms 布局兜底，且仅在
paddingInFlight ∧ ¬paddingFinished 时启用。end/cancel 任一先至即
paddingFinishOnce：paddingInFlight=false、paddingFinished=true、清监听/兜底。
up/cancel 的 settle 提交若摘除 .stretch，先走同一“真变假”跟踪入口，再计算
`paddingDone=¬extendSeen ∨ ¬paddingInFlight`；因此拖中出带且回落已结束时
paddingDone 立即为真，出带后在途时为假。未挂过 stretch 时 paddingDone=true。
flight finish 只置 flightDone 并保持现行清场/数据写时点；padding 完成只更新
padding 子态。flightDone∧paddingDone∧¬finished 才执行 layoutFinishOnce。
无 stretch 时屏障退化为 flight 终局；零位移 flight 同步 finish，故无 stretch
即时终局，有 stretch 且回落在途仍等 padding。布局回落中=
active ∧ extendSeen ∧ paddingInFlight ∧ ¬paddingFinished；挂起信号从 dragging
激活起连续保持到 layoutFinishOnce，不因 phase 在 flight finish 回 idle 而中断。
phase=idle 且 layout.active 时 pointerdown 仍由迁移 13 拒绝，杜绝旧 padding
事件/终局 bump 与新会话重叠。

cancel/up 双入口时序表（双 end 同帧、settle 期连发、up 抢在帧 flush 前）：

| 时序 | 行为 | 结果 |
|---|---|---|
| up 先至→cancel 后至（同帧） | up 换代会话（sessionRef=null）→cancel 入口 null 守卫退出 | 恰一次 settle，落位=up 时点判定（lineage-drag-session-grid S3 锁） |
| cancel 先至→up 后至（同帧） | 对称 | 恰一次 settle，落位=cancel 时点判定 |
| settle 期 up/cancel 连发 | sessionRef=null 守卫 | no-op（不二次 settle） |
| 末次 move 未 flush→up 先于 rAF 到达 | 终局批按 lastClient 同步读→算→提交 | 恰一次 settle，落位=lastClient 判定（B2——守卫 G8/G10；终局批缺失即红） |
| pending latch 置位后 cancel 先于 flush | 迁移 6b：终局批先激活再按 lastClient 落位 | 恰一次 settle 到当前候选槽；事件 0/0 不参与判定（F8 红例） |
| flight transitionend 先至、padding 仍在回落 | flight finishOnce 写数据；layout 保持 active | routeEpoch 暂不 bump，零重醒缺口（L1） |
| 拖中进带→出带→padding end→up | 出带时启动跟踪；end 在 up 前清 paddingInFlight | 零位移 flight finish 即布局终局，不等 600ms（L4 守卫） |
| 拖中进带→出带→立即 up | 出带时已置 paddingInFlight；up 后仍等待 | flight finish 不 bump，padding end/cancel 后恰一次（L5 红例） |
| flight finish 后、padding end 前第二次 pointerdown | phase=idle 但 layout.active，迁移 13 拒绝 | 第二会话不激活，旧挂起/监听归属不变（G11 红例） |
| padding transitionend/cancel×N + 布局兜底 | paddingFinishOnce+layoutFinishOnce 幂等位 | 恰一次布局终局量测+routeEpoch bump（L2/L3） |
| flight transitionend×N + flight 兜底定时器 | flight finishOnce 幂等位 | 恰一次清场+至多一次数据写（changed 才写） |

〔决定〕仅 exceeded latch 未置位的 pending pointercancel 归 idle；latch 已置位
一律走迁移 6b→settle。两种出口由纯算术 latch 唯一分流，不依赖 rAF 是否已
flush，也不新增第三种出口径。

〔实施注记 2026-11-22 审查回炉批（R1/R2/W2）〕本节落地形态随独立审查处置单
回炉，已实现并锁定（新例先红后绿记录见提交说明）：
- R1（迁移 4b 激活帧坐标域）：激活帧 ghost=pointerdown 时点卡位 toOwn+client
  域指针差 ÷s_eff。grab 偏移冻结语义=INV-100 族（偏移关系冻结于 pointerdown，
  激活帧不因 rect 重排漂移——lineage-card-drag「R1 零位移分支干净」例锁该
  语义）；client 域整数差单次除法=精确 own 差值（审查探针 16px 8px 口径）。
  渲染基线 ghost0=act.ghost（激活时点卡位——锚+translate 恒等式 INV-96 族
  要求基线=当前锚帧位）。旧式激活帧 ghost 用 pointerdown 初始化的 client 域
  偏移直减（未 ÷s_eff）且计算先于激活写段=u/z≠1 档首 flush 差 u 倍（审查探针
  实测 4px 0.8px）。〔与处置单字面取式偏差申报〕处置单取式「改用
  act.ox/act.oy」按激活时点 rect 重导偏移——在 pointerdown→激活间 rect 重排
  场景（上述零位移例）与冻结语义相悖且该例红；本批取冻结基准形，探针与既有
  锁定例两者兼顾，偏差随批申报待主控复核。
- R2（迁移 8 滚动子批）：scrollDirty 分支条件=activated∨pointerDirty——
  pending 期滚动不吞待激活指针（同帧激活批读施滚后 rect）；pointerDirty 仅在
  指针批实际执行后清（runPointerBatch 返回执行与否）。
- W2（迁移 15 卸载清场）：卸载=mount-once effect cleanup 同步递增
  frameGenRef+清 sessionRef——残帧凭代次过期/s null 双守卫 no-op（stub caf
  环境不等下一次 effect 建立）；换代场景（pending→dragging effect 重挂）旧帧
  由主 effect setup 的 ++frameGenRef 过期，会话存活不受影响。

## 3. 帧协议规格

### 3.1 调度器（drag-frame-scheduler.ts，新件 ≤220）

```ts
export interface FrameScheduler {
  schedule(): void   // 记录待处理；保证至多一个 rAF 在飞（幂等）
  cancel(): void     // 摘在飞 rAF（会话清理用）
}
export function createFrameScheduler(opts: {
  onFrame(now: number): void
  raf?: (cb: (t: number) => void) => number      // 可注入（缺省 requestAnimationFrame）
  caf?: (id: number) => void                     // 可注入（缺省 cancelAnimationFrame）
}): FrameScheduler
```

- pointermove 只记录最新指针（session.lastClient）并 schedule()——事件时点
  零 DOM 读、零 DOM 写、零 React 提交。
- 同一帧至多一次 onFrame；flush 排空当帧记录。**调度语义两层（W12）**：
  ①指针批合并——schedule() 幂等，保证至多一个 rAF 在飞；②会话期自续泵——
  激活帧起帧循环自续（每帧末重排下一帧），直至会话终结 cancel()。内部显式
  维护 `inFrame` 与 `pendingInput`：onFrame 入口置 inFrame=true、摘在飞 rAF 标识；
  执行中 schedule()（含 auto.tick→onScrollFrame 重入）只置 pendingInput=true，
  **不再排 rAF**；帧尾置 inFrame=false 后按 pendingInput/活动泵合流排一个下一帧，
  并清 pendingInput。onFrame 外 schedule() 才在无在飞 rAF 时排帧。无记录指针的
  帧=仅段 0 泵 tick 空转（**零拖拽几何读取、零拖影写入、零 React 提交；
  autoscroll 泵自耗〔容器 rect/scrollTop〕另计**——O2，对齐
  drag-autoscroll.ts:219-242 现实）。静止光标自动滚动依赖泵续跑（INV-154；
  AS-02 e2e=回归门，泵不自续即静止光标停滚）。scheduler 直测须另锁“onFrame
  内重入 schedule 不产生双 rAF”与“无输入帧零拖拽几何读”，入 §13 commit B 门。
- 〔决定〕纯模块可注入 rAF/clock：INV-100 登记的「帧时序面不可下沉（jsdom
  模拟失真）」据此收窄——批次逻辑（调度序/排空语义/至多一帧/自续空转）
  注入后可单测判别；easing/真机帧距不可下沉，归 CSS 声明锁+真机验收
  （§7/§12）。

### 3.2 帧内读写批次顺序图

```text
pointermove（事件时点）:
  session.lastClient = {clientX, clientY}; pointerDirty=true; scheduler.schedule()
  （零读 / 零写 / 零 React 提交）
容器 FRAME_EVENT / onWindowScroll（card-drag 的 onScrollFrame 消费点）:
  scrollDirty=true; scheduler.schedule()
  （只标脏；不再直调滚动后读算写——二轮 W2 行为迁移随批申报）

rAF flush（每帧至多一次 onFrame）:
  段0 自动滚动泵+滚动后子批（INV-154；managed:false 保持）:
    auto.tick(dt) → 施 scrollTop/scrollLeft；其 onScrollFrame 回调同样只标脏
    scrollDirty |= tick.scrolled
    scrollDirty ∧ lastClient 有效时，合并消费 lastClient+pointerDirty：
      读（content rect/frame rect/computed/容器 rect 与 scrollTop  spy 面）
      → 纯计算（ghost/insertIdx/over/extend/pullPx）
      → 一次写（translate；--lg-pull 按③ extend 条件写/清）+React 真变化提交
      → scrollDirty=false; pointerDirty=false
  段1 指针批（仅 pointerDirty 仍为 true 时）:
    ① 读（全部先于③）:
       content rect（toOwn 基准）、frame rect（overSourceFrame/framePointer
       实时域输入）、computed border（framePointer 换算——仅命中计算需要时）、
       readFrameContentWidth（frame computed 五值——容量归一化单源，[轮 3 B1]
       与 use-capacity-layout 同源，insertIdx 重算位输入，外审 W2 补全）；
       激活帧追加：card rect、offsetLeft/offsetTop、冻结基准 frame rect、
       card.style.marginLeft（[回炉 R1] 拖前 inline 基准——飞行三点式恢复
       输入，外审 W2 补全）
    ② 纯计算（零 DOM 访问）:
       ghost(own)=toOwn(client)−o；
       insertIdx（over∨extend 门——card-drag-session.ts:341-361 同构，B7）:
         extend→nextIdx=srcIds.length−1（组末）；
         over∧¬extend→nextIdx=insertIndexFromGrid（W=①读取的归一化宽）；
         门外（¬over∧¬extend）→nextIdx=保留旧 insertIdx
         （lineage-card-drag.test.tsx:194-197 锁「框外不更新槽位」）；
       extend=inPullBand（冻结基准带：clientX∈[frameLeft0,frameRight0]∧
       clientY>frameBottom0）；
       pullPx=inPullBand?min((clientY−frameBottom0)/s_eff,PULL_BAND_PX):0
       （现行 card-drag-session.ts:334-338 同式，带外归零）；
       over=overSourceFrame（实时域）
    ③ 写（统一批；prevExtend=本批前会话值）:
       card.style.translate = `${ghost.x−ghost0.x}px ${ghost.y−ghost0.y}px`
       extend=true → frame.style.setProperty('--lg-pull', `${pullPx}px`)
       prevExtend=true ∧ extend=false → frame.style.removeProperty('--lg-pull')
       其余非 extend 帧对 --lg-pull 零写（选式=true→false 时 removeProperty 直清，
       不先写 0px；激活帧通常 extend=false 故变量保持 ''——F6；首移即入带时
       extend=true→同帧写实际 pullPx——G12）
    ④ React 提交（仅真变化，setState 调用在③后，commit=微任务先于 paint）:
       激活 | insertIdx 真变化 | overFrame 真变化 | extend 真变化 | settle | 清理

顺序约束：段0/段1 各自全部读先于写；真实滚动且有待处理指针时只在段0消费
lastClient 一次，段1不得用同一指针再读算写。无滚动帧=段1单批；有滚动帧=
段0子批，必要时段1仅处理段0之后新到的指针——INV-154「滚动帧内重测重算」
语义保持，且消除 tick 直调+指针批的双算（二轮 W2）。F3a 锁非滚动帧全局
firstWrite>lastRead；F3b 锁真实滚动帧施滚→读→写、容器 rect/scrollTop spy
与 content 单次读取。
```

### 3.3 React 提交面收窄清单（commit 不随坐标像素增长）

1. 激活（每会话一次）；2. 目标 insertIdx 真变化；3. overFrame 真变化；
4. extend 真变化（pullPx **不**在内）；5. settle（松手一次）；6. flight 清理
（finish 一次）；7. 布局终局（layoutEpoch 一次）。pullPx/ghost 全部脱离 React
顶层状态。

### 3.4 pullPx 直写与 TimelineYears 接线退役

- `TimelineYears.tsx:142-144` pullStyle（React inline `--lg-pull`）退役——
  帧批段 0/段 1 直写 frame.style。DYNAMIC_TOKENS 白名单不变（--lg-pull 已在册，
  check-quality.mjs:391），消费点注释双向互指保持；**注释写点指向随迁移
  同步**：check-quality.mjs:391 中 --lg-pull 条目的「TimelineYears.tsx
  pullStyle」指向改为帧批直写点（drag-session 帧批段 0/段 1）——注释单源随批
  更新（随批申报，外审观测）。
- `.stretch` 类挂载/摘除仍走 React（slot.extend 真变化——类面是提交面 4）。
  --lg-pull 仅在 extend=true 帧写值；extend 真变假时同批 removeProperty，
  其余非 extend 帧零写。F6 另锁“进带→出带 flush 后变量已清”；settle 的
  摘类后清理仍按 §7 定式，承担无后续 move 帧时的清场。

### 3.5 单一挂起窗与布局终局屏障（P1/二轮 W4）

〔事实〕use-lineage-routes.ts:44-46/:78-85 对 .tl-content 挂 ResizeObserver→
rAF run→buildSnapshot→planRerun（full 档=全图重路由+setPaths）；rerun.ts
snapshotsEqual 比 contentH/帧 rect；timeline-zoom-hook.ts:52-68 自然尺寸量测
RO→宽高变化 force 重渲染；LineageTimeline.tsx:121 以 layoutKey 为 zoom
recomputeKey。G2 拖中 padding 写与松手 .38s 回落都会触发两处；若只挂起
dragging 或 settle 的 flight 段，flight finish 到 padding 终局之间会重醒并逐帧
重算。

〔决定〕挂起窗是**单一连续窗：dragging 激活起→布局终局止**，不按
dragging/settle 分段，也不在 flight finish 提前解除。观测器保持连接，回调与
rAF run 入口读最新挂起位；挂起期不 buildSnapshot、不 setPaths、不 publish、
不做 zoom 自然尺寸量测/force。布局终局由 §2 的 layout 子态承载：

1. padding 监听生命周期绑到 **.stretch 摘除（extend 真变假）**，而非 up 时类是否
   仍在场。拖中出带与 up 摘类共用启动入口：置 paddingInFlight、监听
   padding-bottom transitionend/transitioncancel，并仅对“回落已启动但未收到
   end/cancel”启动布局 600ms 兜底。paddingFinishOnce 置 paddingFinished、清
   paddingInFlight；up 时按 §2 公式求 paddingDone。未挂过 stretch 则无等待；
   出带且回落已完成时无额外等待（L4），出带后立即 up 时继续等终局（L5）。
2. flight 既有 finishOnce 只完成 flightDone、inline 清场与现行数据写；padding
   监听/兜底由独立 paddingFinishOnce 收口。`tryLayoutFinish` 要求
   flightDone∧paddingDone∧¬finished，随后置 finished、active=false、摘监听/清
   布局兜底并执行一次 layoutFinishOnce。flight/padding 事件任意交错、重复
   end/cancel 与兜底合流均恰一次。layout.active 期间 pointerdown 锁不因
   phase=idle 解除（G11），故无需多会话 token 或旧事件归属协议。
3. **布局终局=max(flight finish, 已在途 padding-bottom 的 end/cancel, 有界兜底
   600ms)**；padding 已在 up 前完成时第三项不再造成等待。无 stretch 时退化为
   flight finish；零位移 flight 同步完成，故无 stretch 即时终局、有 stretch
   且回落在途仍等 padding。数据写 onReorderMonthSlots 保持在 flight finish
   后现行时点，不等待也不驱动布局终局。
4. 终局动作选式=**新增 layoutEpoch 并入 LineageTimeline 的 recomputeKey**
   （layoutKey=[groups,uiScaleTier,layoutEpoch]），令 timeline-zoom-hook 在屏障
   解除后的 layout effect 恰一次量测最终自然尺寸；同值 RO 回调不再 force。
   同一 layoutFinishOnce 再 bump routeEpoch 恰一次，触发最终路由重算。
   routeEpoch bump 从 flight finish 移到此处；INV-83 既有「settle
   transitionend 单次重算」锚的时点随批申报迁移。方案 A 同时扩展其
   pointerdown 忽略锚至布局终局：正常会话行为不变，G2 会话额外窗 ≤.38s、
   事件缺失时至布局兜底。代价=边层重算最多延后 flight 与 padding 的约
   .06s 时差、事件缺失时至布局兜底窗；换取消除回落期逐帧重算和会话重叠。
5. 挂起信号接线=LineageTimeline→EdgeOverlay props 传 **`isSuspended(): boolean`
   getter**，再透传 useLineageRoutes；getter 内读 layout ref.current，并以
   useCallback([]) 等稳定引用提供（或不进 effect deps）。RO/effect 不得因每次
   渲染的新 getter 重挂。timeline-zoom-hook 接收同一 getter。禁止 effect 闭包
   捕获渲染时布尔旧值；RO/rAF 每次执行都调 getter，layoutFinishOnce 先写
   ref=false 再 bump 两个 epoch。**timeline-zoom-hook 的 measure() 函数顶部
   统一加 `if (isSuspended()) return`**：useLayoutEffect 的同步 measure() 与
   RO 两路同受守卫（recomputeKey/layoutKey 含 groups，flight finish 数据写即
   触发 effect 重跑），最终量测由 layoutEpoch bump 后、ref 已 false 的 effect
   重跑承载。EdgeOverlay/use-lineage-routes/timeline-zoom-hook/LineageTimeline
   均入 §4 表。

**挂起窗允许的布局读集**：useTimelineNavSync 仍由 groups 数据写驱动执行一次
全帧 gBCR 读+setActiveFrameKey，useCapacityLayout 仍执行 computed width 五值
读取。理由是二者由单次数据写驱动而非逐帧泵，且滚动锚定/导航当前月语义必须
保持；它们不是本 P1 的两个写源。挂起目标仅路由重算（buildSnapshot/setPaths/
publish）与 zoom 量测（measure/force）两域，不把上述允许读误报为违规。

拖中边层 dimmed（.tl-edges.dimmed opacity .18）与连续挂起自洽；挂起期所有路由/
zoom 意图由布局终局的单次量测+bump 归并，无丢失面。§13 commit B 以 L1-L5
锁 .32/.38 交错、零位移+stretch、padding cancel+兜底、出带后已完成/仍在途
两径，并以 G11 锁会话重叠；trace 核验整个挂起窗零 setPaths/零 force，且
**flight finish→布局终局期间 buildSnapshot/publish/measure/force=0**（允许读集
按上段单列，不混入该零写断言）。

〔实施注记 2026-11-22 commit B 子波 2〕本节已落地。屏障工厂=createLayoutBarrier
落驻 card-drag-flight.ts（flightDone 触发点/padding 监听/layoutFinishOnce 同驻——
§4 落点优先项），实例由 useCardDrag ref 持有（跨 phase 重挂存活，组件卸载
dispose=迁移 15）；session 侧接线四点=激活帧 begin/帧批+settle 提交 noteExtend/
finish noteFlightDone/pointerdown isLayoutActive 闸。paddingFinished 与
paddingInFlight 合并为单旗（paddingFinished ≡ 跟踪启动后的 ¬paddingInFlight——
paddingDone=¬extendSeen∨¬paddingInFlight 公式不变）。isSuspended getter=
useCardDrag 返回的屏障稳定闭包（LineageTimeline→EdgeOverlay→useLineageRoutes
与 timeline-zoom-hook 同源透传）；use-lineage-routes run() 顶部与
timeline-zoom-hook measure() 顶部统一守卫（getter 稳定入 effect deps——零重挂）；
layoutEpoch=LineageTimeline state 入 layoutKey（useCardDrag onLayoutSettled 回调
bump），layoutFinishOnce 先置 finished=释放挂起再 bump routeEpoch+layoutEpoch。
routeEpoch bump 已从 flight finish 移除（数据写 onReorderMonthSlots 时点不变——
L1/L2 锁）。

〔实施注记 2026-11-22 审查回炉批 W1〕屏障区分「逻辑 extend 曾计算为真」与
「.stretch 已提交需回落」：noteExtend 真变假分支在启动 padding 跟踪与 600ms
兜底前读调用时点 frame 的已提交类面（classList.contains('stretch')——类挂载/
摘除仍由 slot.extend 真变化 React 提交承载，§3.4 不变）。终局批同任务「激活
入带→settle 出带」时 React 未提交中间 .stretch（无 padding 过渡可监听）→不
启动跟踪，布局终局=flight finish（paddingDone=¬extendSeen∨¬paddingInFlight
公式不变——paddingInFlight 未置位即真）；帧批 true→false 时点上一提交的
.stretch 必已在场（既有 L1-L5/G11 形态不变）。屏障工厂迁驻
drag-layout-barrier.ts（flight ≤220 顶格解除——§4 表补行）。

## 4. 拆件方案与行数预算

| 件 | 现状 | 预算 | 职责 |
|---|---:|---|---|
| card-drag-session.ts | 487 | ≤350 | 会话状态机+事件入口+React 提交面（读取/换算迁出） |
| drag-frame-scheduler.ts（新） | — | ≤220 | rAF 调度纯模块（§3.1） |
| drag-session-geometry.ts（新） | — | ≤220 | 纯读取+换算：toOwn/framePointer/overSourceFrame/激活帧读取集/冻结基准校准读取（PULL_BAND_PX 随迁） |
| drag-layout-barrier.ts（审查回炉新件） | — | ≤220 | 布局终局屏障状态机（自 card-drag-flight 迁驻——flight ≤220 顶格解除；审查 W1 committed-.stretch 判据同驻） |
| drag-session-model.ts（审查回炉新件） | — | ≤220 | 会话域模型单源（DragPhase/DragSlotPreview/DragSession 自 card-drag-session 迁出——session 行数预算回落容纳审查回炉修复；零逻辑类型件，消费方经 card-drag-session re-export 链零改动） |
| card-drag-flight.ts | 136 | ≤220 | translate settle 飞行+幂等清理（§5） |
| useCardDrag.ts | 83 | ≤150 | 编排薄壳（flightRef+settle effect+layoutFinishOnce/onLayoutSettled），不新增第二状态机 |
| TimelineYears.tsx | 231 | 父 ≤120 | 年段 map+月 map 编排+props 透传 |
| TimelineMonthFrame.tsx（新） | — | ≤180 | 单月框：月标+extend 类+foster row 编排+DragCandidates 接线 |
| TimelineCardRow.tsx（新） | — | ≤180 | 卡行渲染（kids 切片+dragTail 挂载+odd 相位类） |
| LineageTimeline.tsx | 214 | ≤240 | 瞬态订阅+画布层隔离+layoutEpoch/recomputeKey 与 isSuspended getter 接线（P1/二轮 W4） |
| LineageTimelineCard.tsx | 144 | ≤180 | memo+稳定 props（§8） |
| timeline-interactions.ts | 112 | ≤180 | 稳定 handlers（§8） |
| use-lineage-routes.ts | 94 | ≤120 | 路由重算编排——isSuspended getter 的 ref-latest 守卫覆盖 RO 回调/rAF run；布局终局 routeEpoch bump 承载重算（P1/二轮 W4） |
| timeline-zoom-hook.ts | 79 | ≤110 | 缩放编排——measure() 顶部统一 isSuspended 守卫，覆盖 useLayoutEffect 同步调用与 RO；稳定 getter 不重挂 effect；layoutEpoch 入 recomputeKey 在布局终局量测一次（P1/二轮 W4/三轮 B5） |
| EdgeOverlay.tsx | 243（二轮实测；一轮「140±」为误记） | ≤250（组件既有硬上限） | isSuspended getter 以无新增 JSDoc 的最小 diff 透传 useLineageRoutes，不捕获 effect 旧值；若迁后超过 250，先拆纯 props/编排辅助件再接守卫，禁止压线堆行（二轮 W4/三轮警告 6） |
| LineageBoard.tsx | 140 | ≤160 | 图宿主接线——onNodeClick/onNodeContextMenu useCallback 稳定化（§8 B6：memo 配套回调链源头） |
| drag-slot-candidates.tsx | 42 | ≤140 | occupancy mask+有限空槽（§6） |
| card-drag-grid.ts | 70 | ≤500（全局口径） | +candidateCells 纯函数（§6——坐标单源保持；capacity.ts 164 零改） |
| theme-lineage.css | 449 | ≤450（check-quality CSS 硬关卡——plan 写 ≤500，取严口径） | 拖拽 CSS 拆出→theme-lineage-drag.css（新，≤450 同关卡）；主文件约 360+拖拽件约 150 |

〔事实〕check-quality.mjs:201-206 CSS 关卡=450 行（plan §5.3 的 ≤500 为全局
口径，quality 硬卡 450）——预算表取严。

〔实施注记 2026-11-22 commit B 子波 2〕布局终局屏障落点=card-drag-flight.ts
（createLayoutBarrier 工厂同驻，未新增源码件——表内「flight finish 是 flightDone
触发点、padding 监听与 layoutFinishOnce 天然同驻」落法）；wc -l 实测
（2026-11-22）：card-drag-session 349（≤350）/card-drag-flight 220（≤220）/
useCardDrag 110（≤150）/use-lineage-routes 99/timeline-zoom-hook 84/
EdgeOverlay 248（≤250）/LineageBoard 151/LineageTimeline 226/
LineageTimelineCard 147/TimelineYears 120（父≤120）/TimelineMonthFrame 147/
timeline-interactions 118/theme-lineage.css 411/theme-lineage-drag.css 64。

〔实施注记 2026-11-22 审查回炉批〕wc -l 实测（屏障/模型两新件迁出+回炉修复
后）：card-drag-session 335（≤350）/card-drag-flight 138（≤220）/
drag-layout-barrier 109（≤220）/drag-session-model 61（≤220）/
drag-session-geometry 210（≤220）/useCardDrag 111/use-lineage-routes 99/
timeline-zoom-hook 84/EdgeOverlay 248/LineageBoard 151/LineageTimeline 226/
LineageTimelineCard 147/TimelineYears 120/TimelineMonthFrame 152/
timeline-interactions 118/theme-lineage.css 411/theme-lineage-drag.css 81
（drag.css 与 §4 拆件注记 64 的差值=commit B/C 工作树既有增量，回炉批零触及
CSS）。

### 拖拽 CSS 拆件清单（theme-lineage-drag.css——B5 grep 实测 2026-11-22）

沿 theme-lineage-card.css 先例（分域拆件+main.tsx 显式 import+文本锁清单
登记）。拟移动规则族=拖拽会话域规则（类名消费方=card-drag-session/
TimelineYears/DragCandidates/LineageTimeline dimmed 传参），grep 实测现行
位置：

| 规则族 | 现行位置（theme-lineage.css） | 消费方 |
|---|---|---|
| `.tl-card.dragging` | :151-158 | 会话激活帧类（提交面 1；rotate/scale 类变换=F4 锚） |
| `.drag-slot` | :162-174 | TimelineYears 占位槽/DragCandidates 候选槽基类 |
| `.drag-slot.faded` | :175 | overFrame=false 淡化（M3/M4 值面锚） |
| `.drag-slot.cand` | :176-180 | 候选 z3 提层（INV-145④ 层级锁保留） |
| `.month-frame.stretch` 段（注释+规则） | :183-193 | --lg-pull 消费（G2；calc 基准注释随迁） |
| `.tl-edges.dimmed` | :416-417 | 拖中连线淡化（LineageTimeline:165 dimmed 传参） |

留守件判据：`.tl-edges.dimmed-focus` 族（:425——聚焦域非拖拽域）、`.pop` 的
--shadow-drag 消费（弹层域）、--shadow-drag token 本体（theme.css :root 单源）
不迁移。

被移动规则的文本锁测试改读**双文件联合**（helper 拼读 theme-lineage.css+
theme-lineage-drag.css 后断言本体零改——机械迁移随批申报）：lineage-slot-
visibility、lineage-b3-css、lineage-b3-frame F4、lineage-edge-overlay-css
（其锁面=.tl-edges/.tl-edge 基础族=留守件，拆件零触及；并入拼读属机械防御）。
theme.test 抽 `lineageCssAll = theme-lineage.css + theme-lineage-drag.css`
联合常量，**全部扫描面统一消费**：:274 SKIN_CSS、:377 衬线负锚、:426-476
DURATION_COUNTS、:487 z-index 裸值负锚、:511 MS_DECL 五处均改用
lineageCssAll；:572-580 FS_CSS 的 lineage 项同用该联合常量。不得只补 SKIN/FS
两清单而漏负锚；theme.test 属检查面测试，本项修改=机械扩面，断言本体零改，
随批申报。main.tsx 补 `import './shared/theme-lineage-drag.css'`（:13-17
皮肤件段序内、theme-lineage.css 之后——层叠语义=拆出规则与主文件零重叠，
序不敏感仍按段序落位）。commit A diff 白名单=上表六族规则文本搬迁+两文件
头注+main.tsx 导入行+theme.test 联合常量与全部扫描面接线+文本锁测试拼读
helper，其余零触碰；四处陈旧注释按 §9/§12 清单同批校正，不作语义搬迁。

### 纯拆件 commit（commit A）行为不变的证明方法

1. 全绿集：9 个受锁单测文件（2026-11-22 实测基线 115 例全绿）+
   lineage-drag-grid.test.ts + lineage-drag-month.test.tsx +
   lineage-timeline.test.ts + lineage-timeline-page.test.tsx 全绿。
2. 计数不变：上述各文件 it 数 before/after 相等（命令实测记录进提交说明）；
   git diff 无断言行变更（diff 白名单=§4 CSS 拆件清单所列搬迁+头注+接线
   ——机械迁移随批申报）。
3. wc -l：拆后各件落在 §4 预算内（实测核对）。
4. e2e 冒烟：lineage.spec T9（真实拖拽全流）绿。

## 5. translate 化语义

- 〔决定〕拖影定位键=CSS 独立 translate 属性（`style.translate` 赋值或
  `setProperty('translate', …)`），值格式契约=`'Xpx Ypx'` 两值形。jsdom
  cssstyle 支持该属性直赋与 getPropertyValue 往返（2026-11-22 探针实测——
  红测试 F 系可直读断言）。
- 〔决定〕.dragging 类的 `transform: rotate(2deg) scale(1.05)`
  （theme-lineage.css:151-158）规则不动；inline 不写 transform（内联
  transform 会覆盖类变换）——translate（individual property）与类 transform
  按规范合成，rotate/scale 视觉保留。**rotate/scale 不被覆盖的断言面仅锁
  拖拽期**（F4：.dragging 在场时类变换保留）；飞行期 .dragging 已摘
  （settle 飞行无微倾放大=现行视觉，零改）——该期不新增类变换断言（外审 W9）。
- 〔决定〕锚语义（Option A）：激活帧一次性写 left/top=流内原位锚
  （offsetLeft/offsetTop），此后逐帧只写 translate=`ghost−ghost0`（grab 帧
  own 域差）。渲染位恒等式：锚+translate=offsetLeft+(ghost−ghost0)=
  ghost−frameOrigin——与现行 left/top 数学逐值恒等；**恒等式声明域=静态
  u/z 档**（会话期内 uiScale/zoom 恒定——拖中 ctrl+滚轮改档不重校准=已知
  边界 §12.9，现行同形，W10）。〔事实〕拖影 absolute 的包含块=.month-frame
  （offsetParent 链——.tl-row static 不变），渲染位=own 域 ghost−frameOrigin
  经 frameOrigin/hostOffset 补偿至 frame padding-box 定位域（INV-96 补句按
  此校正，见 §10）。INV-96/144 换算单源（timeline-zoom.ts）零改。现行受锁
  断言 `post.style.left` 非空（lineage-card-drag.test.tsx:519-520/:529-530/
  :582-583）在锚语义下仍真（left='0px' 非空串）——迁移面收窄。
- settle 飞行（B1 修订序——起点期禁断过渡是正确性前提，非优化）：
  SETTLE_TRANSITION → `translate .32s cubic-bezier(.22,.9,.26,1)`。
  飞行序七步：
  ①清 inline（含 translate）→②flow 态量取 target（量取前恢复 marginLeft0
  ——现行 card-drag-flight.ts:66-71 已有；更新后分布已 commit，量取语义
  零改）→③重挂 absolute+left/top=target 锚+translate=(from−target)，**此时
  transition:none**→④强制回流（起点落定为 before-change style）→⑤赋
  SETTLE_TRANSITION（translate .32s）→⑥双 rAF 写 translate='0px 0px'→
  ⑦transitionend（propertyName==='translate'）/transitioncancel/600ms 兜底
  任一先至幂等清场（清场含 translate 清除——style 属性回归空）。
  避坑依据〔事实〕：现行 left 飞行靠 `left:auto→length` 不可插值+强制回流
  避坑（card-drag-flight.ts:82-91——起点与过渡同周期赋值不启过渡）；translate
  属性 `none→'440px 0px'` **可插值**——按现行同式（起点+过渡同周期赋值）
  会从恒等元起一条过渡，双 rAF 写 0 重定向触发 transitioncancel→onEnd
  finishOnce 提前清场。故③④⑤⑥序强制：起点期 transition:none→回流落定
  before-change style→再赋过渡→再写目标值。onEnd 过滤由 `left|top` 改为
  `propertyName==='translate'`（left/top 过渡面退役，不留死容错）。
  **伴随键集零改/新增清单**（与七步一一对应）：激活帧已写 width、
  marginLeft=0，新增 will-change:translate；②量取前恢复 marginLeft0；③重挂
  absolute 时写 width=target.width、marginLeft=0、zIndex=99、boxShadow=
  var(--shadow-drag)（现行 card-drag-flight.ts:82-117 四键保留），will-change
  持续在场；⑦清场依次清 position/left/top/width/translate/zIndex/boxShadow/
  transition/will-change，并恢复 marginLeft0。零位移分支同步清同一激活键集与
  will-change，不进入③的 zIndex/boxShadow 写入。终态 style 空与 F5 互洽。
  真机验收：飞行首帧拖卡仍在抓取位（无恒等元起跳滑移）——入 §13 commit B
  门（B1；jsdom 不可判别——INV-100 登记面）。
- 零位移分支：<0.5px 纯几何判定+inline 就地清空（含 translate/will-change，
  伴随键按上段清单；现行机制零改，新增仅 will-change 清理）。
- routeEpoch：只在**布局终局** bump 一次（§2/§3.5 layoutFinishOnce；不再由
  flight finish 直调）。flight finish 的数据写时点不变；双 end/双兜底幂等由
  flightFinishOnce+paddingFinishOnce+layoutFinishOnce 共同承载，挂起期路由
  重算由终局 bump 归并。
- contain/will-change：仅拖拽会话期在拖卡写 `will-change: translate`
  （激活帧写、清场清）；.month-frame 是否加 contain 由 commit B trace 量测
  证明后决定（无效不加）；不全局撒 CSS。

## 6. G 空槽 occupancy mask 规格（plan §5.2 逐条落）

语义基线=summary §11 终裁 5「物理空位+有限网格」+§9.2 裁决 3（除被占用部分
外全部画出、当前圈定范围加深）。

1. **有限边界**=当前月框拖拽预览中的网格行集合：`partitionRows(total, W)`
   （total=srcIds.length 含源；kids 序=其余卡+占位@insertIdx——与现行 foster
   行渲染同构）。不画 rows 之外的任何 cell。
2. **被实际卡占 cell 不画 faded**：占用集=cells 0..total−1 除 insertIdx
   （预览中其余卡所在 cell）。
3. **当前插入占位=唯一加深槽**：拖起相位（slot.active=true）的 in-flow
   占位槽类面=`slot.overFrame ? 'drag-slot target' : 'drag-slot faded'`——
   全 DOM 断言统一为：**拖起且 overFrame=true 时恰 1 个 `.drag-slot.target`；
   拖起且 overFrame=false 时 0 个**。settle 时 active=false，不渲染占位槽，
   即使残留 overFrame=true 也恒 0 个 target（O1/三轮警告 11；候选恒零
   target）。占位文案「置 入」保留（e2e/单测锚），M2/G9 与 INV 草案同口径。
4. **当前末行未占 cell 全画**：候选集=末行中 index ≥ total 的 cell
   （=capacityOfRow(末行)−末行实有数）。unmeasured（W≤0）→候选集=∅
   （有限网格降级——jsdom/空图同态，不画无限未来行）。
5. **源卡拖起后空位按预览重排计算**：候选坐标=candidateSlotAt(cell, W)——
   与松手落点（insertIndexFromGrid）同源（card-drag-grid.ts 两函数既有）；
   不用另一套静态 positionOf 估算（candidateSlotAt 内部即 positionOf——
   同一数学单源）。
6. **占位自身撑出的新增行=预览行集合内的末行，其空格属候选集（显示）；
   行集合之外的行零候选**（W7 澄清——与 plan §5.2.4「只有 G2 下拉带触发
   新增行时，才显示该新增行的空槽」语义一致：插入占位使预览行集合末行
   出现的未占 cell=该行的物理追加位，属候选集；G2 下拉带 extend 撑出的
   新行同理由预览行集合承载——extend 时预览行集合仍=partitionRows(total)
   （占位参与分行），下拉带 pull 空间以下零候选；跨月仍禁（INV-98 物理域
   零改）。原稿「只有 extend 才显示空槽」与 M5 注释（行满月组候选=0）的
   表述矛盾随之消除：候选=∅ 是行集合末行无空位的结果，非 extend 门槛）。
7. **faded 槽显著度**：opacity 定值 .55（≥0.5 验收线）；对比面=
   `border-style: solid`（虚线=加深目标专属、实线=空位候选——边界型对比，
   不只靠文字辨认）。红测试 M3/M4 锁。
8. **旧方案整体删除**：DragCandidates 的 0..total−1 全 cell 循环+
   「z3 提层兜被卡覆盖可见」语义退役（候选不再与卡同 cell，覆盖场景不存在）；
   `.drag-slot.cand` z-index:3 层级声明保留（INV-145④ 锁——层级契约不撤，
   仅覆盖病灶描述随方案退役）。

新增纯函数（card-drag-grid.ts 内，坐标单源；预算 70→~110 行）：

```ts
/** 有限空槽 mask（§6.1-4 单源）：rows=partitionRows(total,w)；候选=末行
 *  index≥total 的 cell（=capacityOfRow(末行)−末行实有数）；unmeasured→[]。
 *  occupancy/目标位置/松手落点同源。 */
export function candidateCells(total: number, w: number): number[]
```

insertIdx 参数去除（外审观测——原签名未消费该参）。末行空槽=**物理追加位
提示**（capacityOfRow(末行)−末行实有数）；落点数学恒归组末
（insertIndexFromGrid 钳制返回值恒落 [0,total−1]）——候选槽阵列是「该行
有空位」的提示面，非逐格插入位预告，指向哪格都不改落位算术。

DragCandidates 对外 props 不变（insertIdx/active/frameW/total）——内部改
`for (const cell of candidateCells(total, frameW))`，TimelineYears
接线零变。

## 7. G2 终态规格

- **拖中跟手**：pullPx 帧批直写（§3）——跟随延迟 ≤1 帧，无逐事件硬跳；
  .stretch 挂载/摘除仍 React（extend 真变化）。
- **松手终态量取**：up→React 提交 settle（卡回文档流@insertIdx）→
  startFlight 在 useLayoutEffect 量取 flow 态 gBCR=「预览中的更新后卡槽
  分布」的真实布局（量取时点=commit 后，机制零改）——非恒回旧 38px 字面，
  而是向更新后分布的框形过渡。
- **框形回落（主控审 C1 修正——过渡作用域限定；三轮前置 commit B）**：
  .month-frame 基规则 transition 增加 `padding-bottom .38s
  cubic-bezier(.22,.9,.26,1)`（G2-1 红测试锁声明面）；**拖中抑制**：
  `.month-frame.stretch` 叠加 `transition: none`（活动 stretch 期逐帧
  --lg-pull 写入即时生效=跟手——若拖中保留 .38s 过渡，每帧目标变更重定向
  过渡≈指数追赶，跟手退化为滞后追手，违反裁决 8「跟手延展」）。两条 CSS
  与布局屏障同属 commit B，解除 L1-L3 对 commit C 的依赖；commit C 只保留
  faded/target/mask 视觉面。松手时序：extend=false → .stretch 摘除 → 同一次
  样式重算中 transition-property 恢复（含 padding-bottom）且 padding-bottom
  值由 calc(38px+pull) 回 38px 基准——「摘类回落」标准式，过渡即触发
  （回落目标=更新后分布的基准 padding）。height 过渡字段保留（同行月框高度
  变化的既有承载面）。**--lg-pull 清序定式（外审 W5）**：settle 提交摘
  .stretch（React——slot.extend=false 真变化触发类摘除）→**其后的 layout
  effect 直写清 frame 的 --lg-pull**（commit B 起 pull 为直写，React 不再代摘
  变量）。顺序不可反：先清变量再摘类时 .stretch 仍在场，calc(38px+var(
  --lg-pull,82px)) 走 fallback 82px=padding 瞬跳再跳回=双重瞬跳——**禁止**；
  摘类在先则 var 已无消费无视觉面，随后清变量零视觉。实现批 commit B 新增
  红断言：`.month-frame.stretch` 规则含 transition:none（先红后绿，随批申报）。
  已知边界：活动 stretch 期 transition:none 同时压制 height/border-color/
  background 过渡；拖中无这些状态变化，登记 §12，不另设条件拆属性。
- **store 最终提交不引发第二轮布局**：onReorderMonthSlots 载荷=落位序=
  预览序（settle 预览 DOM 序=新序，既有 R1/R4/S3 锁定）→finish 后提交的
  渲染 diff 行结构零变化。论证锚：守卫 G7（行结构恒定）+R1/R4（零写幂等）
  +S3（双 end 单 settle）。布局终局的 routeEpoch 单 bump（§3.5/§5）不引入
  第二轮路由重算；数据写仍在 flight finish，padding 回落期不提前 bump。
- **INV-100 冻结基准不被破坏**：extend 判定仍读冻结 frameBottom0
  （迁 drag-session-geometry 件，语义零变）；「帧批不读实时框做判定」限定
  为 **extend 判定**不读实时框——overSourceFrame/framePointer 每帧读实时
  rect 属落位/over 判定域，不在限定内（现状即如此，card-drag-session.ts:
  340/:355；外审观测改准）；激活后 rAF 单次校准路径保留；松手落位面仍沿
  实时单源（撑高框内=组末语义自洽）。
- **INV-154 autoscroll 帧协议不被破坏**：四会话统一协议不动；card-drag 自有
  rAF 泵并入统一帧批（泵 tick=帧顶段 0，managed:false 语义保持），card-drag
  的 FRAME_EVENT/onScrollFrame 消费只标 scrollDirty+schedule，滚动后与待处理
  指针合为一次读算写（§3.2 二轮 W2）——lineage-autoscroll 单测与 AS-01/02/03 e2e
  为回归门，S11 迁移为 flush 后断言（§9）。
- **平滑度验收面**〔决定〕：jsdom 不可判别 easing/真帧距（INV-100 登记面）
  ——三层策略：①CSS transition 声明锁（G2-1 红测试）；②调度器纯模块注入
  单测（实现批——批次逻辑判别）；③e2e/真机截图复核（commit C 视觉验收）。

## 8. memo 与 contain

- LineageTimelineCard 包 React.memo。配套稳定 props（B6 亲验补全——memo 必
  被击穿面=三条回调链源头，缺一即每渲染全卡重渲染）：
  - handleCardPointerDown 稳定化：card-drag-session.ts:423 每渲染新建，经
    useCardDrag→TimelineYears:84 传每卡——useCallback（deps 取会话域稳定集）
    或会话 ref 转发，实现批取实现简者（约束=**引用跨渲染恒定**，渲染间
    props diff 恒 false）。
  - LineageBoard 的 onNodeClick/onNodeContextMenu useCallback（现 :107-109
    handleNodeClick 与 :128-131 内联箭头每渲染新建——memo 配套回调链源头
    在 Board 层，B6）。
  - timeline-interactions.createTimelineCardHandlers 改 useMemo 包裹
    （deps=nodes/tool/viewMode/onNodeClick）；consumeDragClick/consumeDrawClick
    稳定化——useCardDrag/useDrawLine 的 consumeClickSuppress 以 useCallback([]) 包
    （读 ref，天然稳定）。
  - pubNoByNode/groups 已 useMemo（LineageTimeline.tsx:62-63）；paperMetrics/
    tagNames/pubNos 来自 props——〔已核实 2026-11-22〕宿主 LineageBoard 经
    useLineageStore selector 订阅（:99-104），store 引用面稳定；不稳定面=
    上两条回调（B6 处置）。
  - slot 瞬态变化只重渲染源月框子树：TimelineMonthFrame memo+isSrc 判定，
    非源框 props 不变即跳过。**render-count 验证（B6）**：拖拽会话期对非源
    月框组件断言渲染计数=0（slot 瞬态变化只重渲染源月框子树）——实现批以
    组件体渲染计数探针承载，入 §13 commit B 门。
- contain/will-change 只在量测证明有效的拖拽表面使用（§5 末条）；拖后清除，
  不全局撒 CSS。验证=commit B trace：同 pointer 风暴下 React commit 数与
  长任务数 before/after 对比。

〔实施注记 2026-11-22 commit B 子波 2〕本节已落地。LineageTimelineCard/
TimelineMonthFrame 包 memo（TimelineMonthFrame 导出 TimelineMonthFrameProps
供 render-count 探针；isSrc 判定前移宿主 TimelineYears——slot 只传源月框、
非源框恒 null，shallow 比较即等价判定）；renderCard=useCallback（deps=构造
闭包全部 props）；handleCardPointerDown=useCallback([])+argsRef/phaseRef
（card-drag-session——引用跨渲染恒定）；LineageBoard onNodeClick/
onNodeContextMenu/onReorderMonthSlots 三回调 useCallback；createTimelineCardHandlers
改名 useTimelineCardHandlers（hook 化+useMemo 包裹——deps=nodes/tool/
viewMode/onNodeClick，consume* 稳定引用不列 deps）；consumeDragClick/
consumeClickSuppress=useCallback([])（useDrawLine 既有）。LineageTimeline 缺省
空表改模块级常量（EMPTY_METRICS/EMPTY_PUBNOS/EMPTY_TAGS——props 缺省面
引用稳定）。render-count 探针=tests/unit/renderer/lineage-b3-render-count.test.tsx
（非源月框计数=0 增量+无输入帧零拖拽几何读——先红后绿：红因=非源月框
计数 4>基线 2）。

## 9. 受锁测试迁移映射（2026-11-22 grep/vitest 实测重测版——B4/W13）

基线计数=2026-11-22 vitest 实跑回写（W13 修正原稿凭印象值：card-drag 19
非 22、capacity 23 非 21、fireEnd 消费广布 8 既有文件非 4）。本表「断言迁移」
（既有断言改写/期望翻转——主控已授权，本表即授权记录）与「新增行」（rAF
stub/flushRaf 机械补行，非断言修改）分列。**统一 flush 规则：凡 pMove/pUp
后即时断言，实现批迁移时一律先 flushRaf；逐文件 grep pMove/pUp 核对并落纸
实际执行数，不得只依赖下列示例行号。**

**fireEnd/propertyName 'left' 消费面=8 个既有单测文件**（grep 实测全列）：
lineage-card-drag、lineage-card-flight（helper 参数化）、lineage-card-stretch、
lineage-drag-month、lineage-drag-session-grid、lineage-mode-canvas、
lineage-pull-follow、lineage-visfb31-ownscale——commit B 一次性迁
'translate'，漏改即测试挂起（finish 不触发、600ms 兜底超时）。

| 文件 | 现状 it | 保留 | 断言迁移（授权记录） | 新增行（rAF stub/flush） | 新增用例 |
|---|---:|---|---|---|---|
| lineage-card-drag.test.tsx | 19 | 5px/单击/跨行判上半/settle 锁/序未变零写/Esc/抑制/R1-R6/保育/奇行 settle | ①fireEnd propertyName 'left'→'translate'（:101 helper 及内联处）②F5 语义下飞行断言随 flight 件迁移面联动 | rAF stub（捕获队列）+指针派发后按需 flushRaf | — |
| lineage-card-flight.test.ts | 4 | card=null/零位移/清场/兜底/cancel 同径 | SETTLE_TRANSITION 值断言（:59）→translate 形；位移分支 left/top 值断言（:57-58/:63-64）→锚+translate 双面；fireEnd 参数 'left'→'translate' | — | —（rotate/scale 用例不置此文件：flight 期 .dragging 已摘；改由 F4/card-drag 保育面在拖拽期承载，二轮 W5） |
| lineage-card-stretch.test.tsx | 3 | 冻结基准/消振荡/组末落位 | fireEnd 'left'→'translate'（:87-91 helper） | 已有 rAF stub；各 pMove 即时断言（:163-169/:177-183 等）前补 flushRaf | **松手终态=更新后分布（现状守卫绿，非新红例）**：以 stubRowFollowFlow 等随动夹具记录 up 后 flow 量取 target，断言等于 settle 更新后卡槽位；防回退到旧位/38px 字面，入 §13/§14 门 |
| lineage-pull-follow.test.tsx | 5 | 连续跟随/82 封顶单调/候选不淡化/x 带外负锚 | fireEnd 'left'→'translate'（:86-90） | 已有 rAF stub；C6①②③④/INV-98 锚各 pMove 后补 flushRaf | pullPx 帧批后单帧跟随值断言 |
| lineage-drag-session-grid.test.tsx | 9（S1-S7+S10/S11） | S1-S5 接线/padding-box 换算/滞回幂等/双 end；S10/S11 滚动帧 | **S6（:237）/S7（:261）期望翻转**：total−1 候选含占用格→mask 集（S6 W=549.8→cap3 单行满→候选=∅；S7 W=293 纵排 cap1→候选=∅——注：W 为 577 地板推导值，夹具实际 injectW 归一化后为 546.4/269，注入宽与归一化宽口径分标，cap 结论不变）——语义翻转申报；fireEnd（:95-99）→'translate'；**S11（:329-334）FRAME_EVENT 后即时插位断言迁移为标脏后 flushRaf 再断言**，松手仍取滚动后插位（W2 flush 时点迁移） | rAF stub+S1-S5/**S6(:243-246)/S7(:267-270)**/S10/S11 指针派发后 flushRaf | candidateCells 直测（或驻 drag-grid 件） |
| lineage-drag-month.test.tsx | 2 | 候选槽族/下拉带两例保留 | :103 `cands.length=2`→mask 值（unmeasured W 下 mask=∅——injectW 注入或期望改 0，实现批申报取式）；:125 propertyName 'left'→'translate' | rAF stub+**:97-103** 激活后候选断言+:119/:121 即时断言（stretch 挂载/插位）前 flushRaf | — |
| lineage-mode-canvas.test.tsx | 12 | 三模式闸/平移族全保留 | :135 propertyName 'left'→'translate' | rAF stub+:131-135 edit 闸例 pMove 后 flushRaf（:133 占位槽即时断言） | — |
| lineage-slot-visibility.test.ts | 3 | z2/z3/基类无 z-index 三例全保留 | 读面改双文件联合（§4 CSS 拆件清单——机械迁移申报，断言本体零改） | — | faded 对比度/边型断言（本批已另立 lineage-b3-css） |
| lineage-autoscroll.test.ts | 34 | 曲线/dt 钳/suspend/R12/R27 全保留 | 无 | — | —（帧批不改 autoscroll 数学） |
| lineage-visfb31-ownscale.test.tsx | 15 | own 域全矩阵 | 激活/移动帧 inline 写断言（:251-252）left/top 值→translate 值域（own 差值）；flight 段（:476-495）left 断言→translate；fireEnd（:115-118）→'translate' | 已有 rAF stub；**:245-252**（激活/移动 position/width/left/top）+:257-267（--lg-pull 即时断言）/:498-509（下拉带松手例）指针派发后 flushRaf | u≠1 档 translate=own px 矩阵例 |
| lineage-capacity.test.ts | 23 | 数学全保留 | 无 | — | — |
| e2e lineage.spec.ts T9 | — | 真实拖拽全流/持久/回弹（断 DOM 序+文本） | 无几何断言改动 | — | — |
| e2e γ1（:1822） | — | 拖中邻位/落位/行分布断言保留 | 夹具零改（四卡 [3,1] 末行天然有空位）；候选断言仅迁 `toHaveCount(3)`→`toHaveCount(1)`。**实际断言集校正**：现例没有候选几何锚集 {0,2,3}，其既有几何是 settle 后 `positionOf(finalIdx,w)`+连续 3 rAF 落位框形断言（:1844-1878），保持零改；候选几何由 γ2/γ4 承载，不在 γ1 虚列或新增重复锚集 | — | — |
| e2e γ2（:1900-1984） | — | 邻位/滞回/落点断言保留 | **夹具与全部联动显式迁移**：①三卡 seed 前先补幽灵 paper 行（γ1/γ4 先例）：`sha4=createHash('sha256').update('lg-ghost-e2e-lg-d').digest('hex')`，`ref4=sha4.slice(0,2)+'/'+sha4.slice(2,4)+'/'+sha4+'.pdf'`，`seedPaperRow(userData,ref4,sha4,'脉络丁文献','e2e-lg-d')`；随后加节点 `{paperId:'e2e-lg-d',title:'脉络丁文献',year:2020,month:5,slot:4}`（paperId FK 必填，缺 paper 行会 fail-fast）；②:1918 行分布守卫 `partitionRows(3,w)=[3]`→`partitionRows(4,w)=[3,1]`，`.tl-row` 1→2；③候选 count 2→1、逐槽 bbox 锚 {0,2}→`{candidateSlotAt(4,w)}`（奇行 append 位）；④:1978-1984 四卡终局 DOM 序标题清单加丁，期望=`[根,乙,甲,丁]` | — | 行满月负锚不在四卡 [3,1] 的 γ2 虚设：由 M5 的 4 卡 W=728→[4] 夹具承载候选=0；γ2 不另加三卡形态 |
| e2e γ4（:2121-2135） | — | 奇行相位直锚保留 | 夹具零改；断言目标：count 3→1；候选集 {1,2,3}→{4}——奇行 cell3→cell4（φ=100 直锚随移：cell4=[3,1] 布局 row1/**col1**，x=12+OFFSET_O+PITCH_X·col1=**312px**——与 lineage-drag-grid.test:154-157 同源 oracle 一致；112px 是 cell3 即预览中被第 4 卡占用格的位置，三轮补录笔误已修正） | — | — |
| e2e 样板①（:1348-1471） | — | 拖拽驱动链/冻结优先保留 | **夹具改动（终裁②）**：视口 1000→1280；第四卡固定为 `paperId='e2e-lg-d'`、标题「脉络丁文献」、slot=4，seed 前按 γ2 同一 sha/ref 公式显式 `seedPaperRow(...,'脉络丁文献','e2e-lg-d')` 再入 nodes。**W 事实校正（公式推导，非本轮真机实测）**：`--tl-frame-min:577px` 是 border-box 地板，内容 W=577−左右 padding 24−左右声明 border 3.2=**549.8px**，容量 N=floor((549.8+72)/200)=3、M=floor((549.8+72−100)/200)=2；故 1000 档三卡=[3] 行满零候选，不是“W≈293 cap1/1”，旧 546.4/558.4 歧义值全部退役。**oracle 整段迁移（P2）**：:1392-1471 的「其余卡位 ∪ last.right+20/frame.x+12 派生位」rect 时代惰性超集、lastBottom/others DOM 采样与相关注释全部删除；1280+4 卡由实测 `w=contentWidthOf(frame)` 驱动 `total=4`、`rows=partitionRows(total,w)=[3,1]`，候选下标不写字面 4：`lastRow=rows.length−1`，`candidateIndexes=Array.from({length:capacityOfRow(lastRow,w)−rows[lastRow].length},(_,i)=>total+i)`，本夹具得 [4]，唯一期望=`candidateSlotAt(candidateIndexes[0],w)`；屏幕期望点=frameBox 原点+border+公式点（±1px），count=1。结论不变：1280+4 卡 [3,1] 候选=1；期望值只由容量数学与框基准计算；迁移时该 spec 文件 import 补 partitionRows/capacityOfRow/candidateSlotAt（与 src 同源——机械项） | — | — |
| e2e T13（:1260-1326） | — | 聚焦 dim/缩放/退役零残留 | **移出迁移表（W8 终裁——零迁移零加卡）**：5 月组实际 2 卡、声明地板口径 W=549.8 cap3→末行空位=cell2（index≥total=2）候选=1——:1326 `.drag-slot.cand.first()` 可见断言仍成立；本注记防误改（勿顺手加卡/改断言） | — | — |
| e2e lineage-route-slots.spec.ts | — | R1-R5 走线几何 | 无断言迁移（routeEpoch 仍恰一次+own 域不变；重算时点从 flight finish 移到布局终局，按 §3.5 等待终局后采样） | — | — |
| e2e lineage-autoscroll.spec.ts | — | AS-01/02/03 | 无 | — | —（§3.5 连续挂起窗不触 autoscroll 数学与泵语义） |
| e2e lineage-visfb67-floor.spec.ts | — | V67-01..07 | 无（W 量测/地板/归一化零改） | — | — |

plan §5.4 注记：T10（改月全流 e2e）已随改月链退役删除（INV-107，
F-UIRES-03 C3 在案）——plan 文本在档未同步，本表不含 T10。

**陈旧注释同批校正清单（三轮观测；测试文件仅注释行，随批申报）**：
①lineage-card-drag.test.tsx:166 标题删「view 态可拖」，改「edit 专属闸」；
②theme-lineage.css:150 `.tl-card.dragging` 注释由「absolute 驻 .tl-content」
改为「包含块=.month-frame，own 域经 frameOrigin/hostOffset 补偿」；
③card-drag-grid.ts:57-63 「每格一候选/1:1 覆盖」改为「candidateSlotAt 只提供
cell 坐标；有限空槽集由 candidateCells 计算，落点与候选显示同源但非逐格插入
预告」；④lineage-slot-visibility.test.ts 头注「候选与卡 1:1 覆盖」改为
「z3 层级契约保留，旧覆盖病灶随 occupancy mask 退役」；⑤lineage.spec.ts γ1 区
注释「候选阵列计数=含源网格全体 cell−插位格」与 γ2 区「拖末卡乙」夹具注释
按 mask/四卡语义改写（三轮 DS 复核补录）。五处不得随拆件原样搬运；源码/
测试注释与头注均入 commit A/C 对应 diff 申报。

INV-111/140 的节点保育（post===pre+键存续）与算术落点断言不动（迁移表中
未列断言即不动）。

## 10. INV 处理清单（逐条结论+修订草案）

| INV | 结论 | 修订草案（实现批随批回写 docs/invariants.md） |
|---|---|---|
| INV-83 | **必修** | 删「拖拽 view/edit 双态无 mode 门槛」旧文→「拖卡=edit 专属（INV-177）」；保留 5px/单击/无 Esc/pointercancel 同径/无乐观写；**「settle transitionend 单次重算」锚改述为「布局终局单次重算」**（P1：flight finish 不再 bump，extendSeen 会话等 padding 终局/兜底；时点迁移随批申报）；**pointerdown 忽略从 settle 扩至 layout.finished**（方案 A：phase=idle 且 layout.active 仍拒，正常无 stretch 会话零额外窗，G2 额外窗 ≤.38s+事件缺失兜底，G11 锁）；帧协议子句移入新条目，本行不双写 |
| INV-84 | 不触及 | B3 零改写队列语义；saved→clean 词汇校正随 B4/文档批（§11.2 预警登记在案，本批不沿用旧词造新文） |
| INV-96 | 保持+补句 | 补「拖影定位键=inline translate（grab 帧 own 域差）+left/top 激活锚；渲染位恒等式 锚+translate=ghost−frameOrigin（声明域=静态 u/z 档）；**拖影 absolute 的包含块=.month-frame**（offsetParent 链——.tl-row static 不变），渲染位=own 域 ghost−frameOrigin 经 frameOrigin/hostOffset 补偿至 frame padding-box 定位域——原「absolute 驻内容层」表述按现行包含块校正（外审观测）」 |
| INV-98 | 保持+改指针 | overSourceFrame 迁 drag-session-geometry.ts；物理域/回弹/下拉带语义逐句零变 |
| INV-100 | 保持+修订 | ①判定读取迁 geometry 件；②帧时序面「不可下沉」修订为「批次逻辑经 drag-frame-scheduler 可注入 rAF/clock 下沉单测；easing/真帧距=CSS 声明锁+真机验收」；③帧批结构=泵顶段 0+scrollDirty 合批+指针段 1，段0消费 lastClient 后段1跳过同指针 |
| INV-111 | 保持+修订候选行 | 落点算术单源零改；候选阵列语义「含源网格全体 cell」→「有限空槽 mask（末行未占 cell）」；S6/S7 期望翻转随批申报 |
| INV-140 | **必修** | ghost inline 键集修订：position/width/marginLeft/transition 四键+left/top 激活锚+translate 差值（left/top 逐帧写退役）；**激活帧 marginLeft0 读取与飞行三点式恢复（flow 量取前恢复/absolute 期压 0/清场恢复）入键集登记**（W2）；保育⇒键存续前提不变（keyed 同父）；断言面=保育例迁移+F4 |
| INV-144 | 保持+补句 | DRAG_THRESHOLD client 域不变；补「translate 值=own 域差（u≠1 档=own px）」 |
| INV-145④ | **必修** | z3 层级锁保留；「faded 候选恒被流内卡整面覆盖」病灶描述随 mask 方案退役，④改述=occupancy mask 语义（有限空槽+**拖起相位 slot.active=true** 且 overFrame=true 恰 1 个/false 0 个 target；settle active=false 恒 0）；⑤补「pullPx=rAF 帧批直写（不经 React）」 |
| INV-154 | 保持+补句 | 四会话协议零改；补「card-drag 自有泵并入统一帧批（tick=帧顶段 0）——managed:false 语义保持；FRAME_EVENT/onScrollFrame 只标 scrollDirty+schedule，滚动后与待处理指针合并为一次读算写」 |
| INV-169 | 保持+改指针 | readFrameContentWidth 两读点→drag-session-geometry 件；五值归一化口径零变 |
| INV-177 | 不触及 | mode 态机零改（edit 专属闸沿承） |
| 新增 INV-17x（建议） | 新登记 | 「拖拽空槽 occupancy mask 不变量」：有限网格=预览行集合；被占格零 faded；末行未占全画；唯一加深=当前 insertIdx 占位槽（**仅拖起相位 slot.active=true：overFrame=true 时 .drag-slot.target 全 DOM 恰 1 个，false 时 0 个；settle active=false 恒 0**；候选零 target）；faded opacity≥0.5；occupancy/目标/落点同源（candidateCells/candidateSlotAt/insertIndexFromGrid 单源）。登记时机=commit C |
| 新增 INV-17y（建议） | 新登记 | 「布局终局挂起重算不变量」：挂起窗=dragging 激活起→布局终局止的单一连续窗（不 disconnect，稳定 getter 读 ref-latest）；padding 跟踪在 extend 真变假时启动，布局终局=max(flight finish, 在途 padding-bottom end/cancel/600ms 兜底)，已完成回落零额外等待；layoutFinishOnce 恰一次 zoom recomputeKey 量测+routeEpoch bump；layout.active 时 pointerdown 拒绝；flight finish 数据写时点不变——边层拖中 dimmed（INV-83 已知限制）自洽。登记时机=commit B |

## 11. 测试策略选择（INV-100 帧时序面显式声明）

〔决定〕双层策略：

1. **本批红测试=DOM 面+全局 rAF stub 口径**：不 import 未存在的调度器模块
   （红测试对当前 src 可运行——typecheck 自洽；实现后测试正文零改转绿）。
   判别原理：帧协议的可观察面=「move 派发不即时写 DOM、单次 rAF flush 落
   一次读→写批」——现行实现逐事件同步写（§1 事实），stub rAF 后该差异恰好
   可判别。
2. **实现批新增 drag-frame-scheduler 直测**：可注入 rAF/clock 的纯模块——
   至多一帧在飞/flush 排空/无指针空转零写/onFrame 内 schedule 重入只置
   pendingInput 不双排 rAF。INV-100 登记的「帧时序面不可下沉（jsdom 模拟即失真）」据此收窄：失真根源=真实调度序依赖，注入后序
   由测试控制，不失真；easing/真帧距仍不可下沉。

## 12. 已知边界与遗留

1. 平滑度/真机帧距：jsdom 不可判别——commit B/C 的 trace 基线+真机截图归
   实现批验证门（plan §5.5）。
2. contain 有效性：量测驱动（trace）——本稿只定「无效不加」原则，不预写
   CSS。
3. Board 层 props 稳定性：〔已核实 2026-11-22〕pubNos/paperMetrics/tagNames
   经 LineageBoard useLineageStore selector 订阅（:99-104），引用随 store 态
   稳定；不稳定面=onNodeClick/onNodeContextMenu 每渲染新建——已入 §8 B6
   处置（useCallback），非遗留。
4. fireEnd/propertyName 'left' 消费广布 **8 个既有单测文件**（W13 修正——
   grep 实测全列见 §9：card-drag/card-flight/card-stretch/drag-month/
   drag-session-grid/mode-canvas/pull-follow/visfb31-ownscale）——commit B
   一次性迁 'translate'，漏改即测试挂起（finish 不触发、600ms 兜底超时）。
5. unmeasured W（jsdom 默认挂载）下 mask 候选=∅——候选可见性只有真机
   W>0 场景承载；单测 mask 断言必须 injectW（本批红测试 M1/M5 已按此写）。
6. --lg-pull 直写脱离 React 后，值面测试（F6）断言 frame.style 读数——
   React style diff 不再触及该变量，测试无需考虑 React 提交时序。
7. settle 期卸载与图身份守卫（外审 W4，登记不改）：flight 600ms 兜底定时器在
   settle 期组件卸载/视图切换时仍保写——现行故意语义「写不丢」（事件被外因
   吞没时兜底收口保证 onReorderMonthSlots 不丢、phase 不永锁，card-drag-
   flight.ts:99-101 注释在案）；图身份守卫（会话跨图失效防写错图）超 B3 面
   ——**B4 store 域遗留登记**，本批不实现不改。
8. card-drag 无 blur/lostpointercapture 退出（登记不改）：监听面仅
   pointermove/up/cancel（card-drag-session.ts:409-411）——capture 失效
   （窗口切换/系统拦截）后窗外释放可能滞留 dragging 态（现行同形）；迁移 15
   注记指向本条，行为零改。
9. 拖中 zoom/uiScale 档变不重校准（W10，登记不改）：ctrl+滚轮/uiScale 档变
   发生在 dragging 期——冻结基准与 ghost 换算不重取（现行同形：会话域 u/z
   恒定假设）；§5 恒等式声明域据此限定为静态 u/z 档。
10. `.month-frame.stretch{transition:none}` 的副作用（三轮登记）：活动 stretch
   期 padding-bottom/height/border-color/background 四类过渡全部压制；拖中
   无后三项状态变化，故不拆属性另造过渡规则。两条 CSS 在 commit B 与布局
   屏障同批落地，C 不再承担 L1-L3 依赖。
11. 陈旧注释（三轮登记，处置非遗留）：lineage-card-drag:166、
   theme-lineage.css:150、card-drag-grid.ts:57-63、lineage-slot-visibility
   头注四处按 §9 清单同批改写；测试文件只动注释行，随批申报。

## 13. 行数预算全表+三逻辑 commit 切分与验证门

预算全表见 §4（新件预算为实施预算非现状）。三 commit 切分界：

| commit | 内容 | 验证门 |
|---|---|---|
| A 纯拆件 | session 拆三件（scheduler/geometry/迁移件）+TimelineYears 拆三件+CSS 拆件（diff 白名单=§4 CSS 拆件清单）——**纯物理拆件、行为零变**（move 仍逐事件写、rAF 泵结构原样搬迁；memo/稳定回调不在本 commit） | §4 证明方法四条（全绿集——**含 theme.test（A 改其扫描面：lineageCssAll 拼读）**+计数不变+wc-l+T9 冒烟） |
| B rAF+translate | 帧批激活/风暴合帧/终局批/scrollDirty 合批/pullPx 条件直写与出带清除/translate 拖影与飞行/单一挂起窗+padding 在途屏障+布局期 pointerdown 锁/measure 统一守卫/受锁测试迁移（fireEnd 8 文件+flight 断言+flush 行+S11）/拖卡 will-change；**memo+三回调链稳定化由 A 后移至此**；**padding-bottom .38s 过渡+.stretch transition:none+--lg-pull 清序由 C 前移至此** | A 门+红测试 F1-F8/L1-L3/L5/G11/G2-1 转绿+L4 及其余守卫保持绿+visfb31-ownscale 全绿+trace 前后对比（React commit 不随像素增长；每 rAF 至多一次集中读段）+**真机首帧锚点验收（B1）**+**挂起窗 trace（dragging→布局终局零 setPaths/force；flight finish→布局终局 buildSnapshot/publish/measure/force=0）**+**render-count（B6——非源月框组件渲染计数=0，实现批探针先红后绿）**+**scheduler 纯模块直测（至多一帧/排空/自续/onFrame 重入不双 rAF/无输入零拖拽几何读；实现批新增先红后绿）**+**布局终局五例：L1 flight 先完等 padding；L2 零位移+stretch 等 padding；L3 cancel+600ms 恰一次；L4 出带回落已完成零额外等待；L5 出带在途等终局**+**G11 布局期第二 pointerdown 拒绝**+**`.stretch{transition:none}` 新增断言先红后绿**+**card-stretch 松手终态=更新后分布现状守卫绿** |
| C G/G2 视觉 | candidateCells+DragCandidates mask+target 类（仅拖起且 overFrame）+faded CSS+G2 视觉终态+受锁测试迁移（S6/S7+e2e γ1/γ2/γ4/样板①——夹具调整与公式 oracle 按 §9 逐条；T13 零迁移；padding 过渡与 .stretch 抑制已在 B，不重复搬移） | B 门+红测试 M1/M2/M3/M4/M5 转绿+**G2 更新后分布真机视觉验收（§7；单测守卫已在 B）**+lineage e2e 全量+`npm run verify` 全绿 |

回滚点=三 commit 各自独立（plan §5.5）；数据写动作与落点数学非预期变化
即停（insertIndexFromGrid/applyObstacleReroute 零改为红线）。

## 14. 红测试清单（2026-11-22 三轮修订实测）

新文件 4 个、用例 **32 个：红 20+守卫绿 12**。三轮新增=L4 出带回落已完成
守卫、L5 出带在途红例、G11 布局期第二 pointerdown 红例、G12 激活首移即入带
同帧条件写守卫（DS 终判补录）；F8 修正为真组末夹具，F6 补出带变量清除断言。显式路径过滤运行核对执行数：
`npx vitest run tests/unit/renderer/lineage-b3-frame.test.tsx tests/unit/renderer/lineage-b3-slots.test.tsx tests/unit/renderer/lineage-b3-css.test.ts tests/unit/renderer/lineage-b3-guard.test.tsx`
→ 分文件实测合计 `Tests 20 failed | 12 passed (32)`。

| 文件 | 用例 | 红因（实测失败输出） | 类型 |
|---|---|---|---|
| lineage-b3-frame.test.tsx | F1 帧批激活门 | `expected <div class="drag-slot"></div> to be null`——现行逐事件激活（三轮按实测校正引文） | 红 |
| 同上 | F2 move 风暴单写批 | `expected '' to be '6px 4px'`——现行不写 translate、逐事件写 left/top | 红 |
| 同上 | F3a 非滚动帧 oracle | `expected 1 to be greater than 6`——帧窗内写先于读 | 红 |
| 同上 | F3b 真实滚动帧 oracle（W2/W3 二轮） | `段0 子批内…expected 7 to be greater than 9`——tick 的 onScrollFrame 直调中 left/top 写后仍读 frame；容器 rect/scrollTop 已在 spy 面，content 单次消费同例锁定 | 红 |
| 同上 | F4 拖影 translate 化+拖拽期内联 transform=='' | `expected '' to be '40px 20px'`——现行写 left/top；transform 空断言与 .dragging 类规则共同防内联覆盖（W5） | 红 |
| 同上 | F5 settle 飞行 translate 化 | `expected 'left .32s cubic-bezier(…' to contain 'translate .32s'` | 红 |
| 同上 | F6 pullPx 帧批+出带清除 | `expected true to be false`——越缘 move 即挂 .stretch；后续绿色路径另锁激活帧 ''、extend=true 写值、出带 flush 后 removeProperty 已清 | 红 |
| 同上 | F7 pointercancel 0/0 按 lastClient 落候选槽 | `expected "spy" to be called 1 times, but got 0 times`——现行事件坐标致回弹零写 | 红 |
| 同上 | F8 pending latch 已置位、未 flush cancel 到组末（三轮夹具修正） | `expected "spy" to be called 1 times, but got 0 times`——修正后红因仍为现行 cancel 用事件坐标，非夹具落点错；pMove(700,140)→fp=(500,40)，末卡中心 476 右侧→p=3→insertIdx=2→[B,C,A] | 红 |
| 同上 | L1 非零位移 .32/.38 交错（P1） | `布局回落中不得提前 bump…actually been called 1 times`——现行 flight finish 即 bump；数据写已先行由同例锁定 | 红 |
| 同上 | L2 零位移+stretch（P1） | `expected "spy" to not be called…actually 1 times`——现行零位移 finish 即 bump，未等 padding | 红 |
| 同上 | L3 padding transitioncancel+600ms 兜底（P1） | `expected "spy" to not be called…actually 1 times`——现行无布局屏障；cancel/重复 end/兜底合流恰一次由后续断言锁定 | 红 |
| 同上 | L4 拖中出带且 padding end 先于 up | —（现状绿）——零位移 flight finish 即时 bump；锁 paddingFinished 后不再等 600ms | 守卫 |
| 同上 | L5 拖中出带后立即 up、padding 在途 | `expected "spy" to not be called…actually 1 times`——现行零位移 finish 即 bump；实现批须等出带回落 end/cancel | 红 |
| lineage-b3-slots.test.tsx | M1 被占格零 faded+末行未占全画 | `expected 2 to be 1`——现行占用格 {0,2} 在画 | 红 |
| 同上 | M2 唯一加深槽 target | `expected false to be true`——现行无加深类；overFrame=true 恰 1 个 | 红 |
| 同上 | M5 下拉带有限网格 | `expected 3 to be +0`——现行 3 个占用格 faded 在画 | 红 |
| lineage-b3-css.test.ts | M3 faded opacity ≥0.5 | `expected false to be true`——现行 .35 | 红 |
| 同上 | M4 faded 实线边 | `expected ' opacity: .35; ' to match /border-style:\s*solid/` | 红 |
| 同上 | G2-1 padding-bottom 过渡承载 | `expected 'border: 1.6px dashed var(--month-…' to match /transition:[^;]*padding-bottom/`——现行基块声明以 border 开头，transition 仅 height（三轮 DS 复核实测引文校正） | 红 |
| lineage-b3-guard.test.tsx | G1 阈值未过=单击链 | —（现状绿） | 守卫 |
| 同上 | G2 settle 期 pointerdown 忽略 | —（现状绿） | 守卫 |
| 同上 | G3 跨月回弹 no-op 零 toast | —（现状绿） | 守卫 |
| 同上 | G4 up+cancel 双入口同帧幂等 | —（现状绿） | 守卫 |
| 同上 | G5 激活帧节点保育+不动键存续 | —（现状绿） | 守卫 |
| 同上 | G6 风暴合帧落点=末位指针 | —（现状绿） | 守卫 |
| 同上 | G7 G2 终态清理缝隙 | —（现状绿） | 守卫 |
| 同上 | G8 终局批：move≥5px 不 flush 直接 up 仍 settle 非 click | —（现状绿——现行同步处理） | 守卫 |
| 同上 | G9 overFrame=false 时 faded 在场且 target 全 DOM=0 | —（现状绿——现行无 target；O1 与 M2 的数量口径闭合） | 守卫 |
| 同上 | G10 过阈跨槽 move 不 flush 直接 up 到组末=写新序（W1 二轮） | —（现状绿；锁终局批跨槽落点） | 守卫 |
| 同上 | G11 flight finish 后 padding end 前第二次 pointerdown 被拒；拒后派发旧 padding end=屏障释放、第三会话可激活 | `旧布局屏障不得被第二会话清除或重叠: expected <div class="drag-slot"></div> to be null`——现行 flight finish 回 idle 后第二会话激活 | 红 |
| 同上 | G12 激活首移即入带：同帧 .stretch 挂载且 --lg-pull=实际 pullPx（非 82px fallback 非 ''——迁移 4b/③ 互斥消除的锁） | —（现状绿——现行同步路径同事件即写） | 守卫 |

coverageGaps 对账：本批已补的可判别面=F3b 容器 rect/scrollTop+滚动合批、
F4 transform、F8/G10、L1-L5（含出带已完成/在途）、G11 会话重叠、M2/G9 数量
统一、F6 出带变量清除。card-stretch“松手终态=更新后分布”为实现批新增
**现状守卫绿**用例，入 §9/§13，不冒充本批已运行。仍属实现批先红后绿的面不
冒充本批已验：①`.stretch{transition:none}` 断言→§7+§13 commit B；
②scheduler 纯模块注入直测（含重入 schedule/无输入帧）→§11+§13 commit B；
③非源月框 render-count=0 探针→§8+§13 commit B；④G2 更新后分布真机视觉
验收→§7+§13 commit C。

〔回炉注记 2026-11-22〕终局批有效锚=G10/F8（变异实测：删终局批→G10/F8 红；
G8/F7 删终局批仍绿=非锚——G8 锁 settle 非 click 链、F7 锁 cancel 判定输入域，
均经 endSession 其余分支承载）。

〔回炉注记 2026-11-22 审查批新增锚清单〕四探针转正=R1 u/z 档首 flush 精确
translate/F9 pending scrollDirty/F10 卸载残帧/G13 未提交 stretch 快速拖放
（R1 两例+F9/F10/L6/F11 集中驻 lineage-b3-recall.test.tsx——既有 B3 族文件
max-lines 顶格；G13/G14 驻 lineage-b3-guard）；守卫补锚=F11 pointermove 事件
域零布局读完整 spy、L6 padding 纯 600ms 兜底释放、G14 INV-140
translate/will-change 跨提交存续、W4a 飞行七步序锚（offsetWidth 读时点
transition——lineage-card-flight）、W4b/W4c 挂起窗守卫锚
（lineage-b3-suspend-anchor 新件）、W3 render-count 探针去遮蔽（仪器化保留
生产件 memo 真实状态）。变异红证（备份法逐次还原 diff 空）：W3 删生产
memo→探针红（计数 4≠2）；W4a 删④强制回流→七步序锚红（reads 缺 'none'）；
W4b 删 measure 守卫→挂起窗量测读红；W4c 删 run 守卫→挂起窗 buildSnapshot 红。

主控亲跑指引（每条核对执行数非零）：

```bash
# 帧协议（13 failed | 1 passed——L4 守卫）
npx vitest run tests/unit/renderer/lineage-b3-frame.test.tsx
# mask/CSS 红（各 3 failed）
npx vitest run tests/unit/renderer/lineage-b3-slots.test.tsx
npx vitest run tests/unit/renderer/lineage-b3-css.test.ts
# 守卫文件（1 failed | 10 passed——G11 为新增红例）
npx vitest run tests/unit/renderer/lineage-b3-guard.test.tsx
# 基线未动（115 passed——9 受锁文件）
npx vitest run tests/unit/renderer/lineage-card-drag.test.tsx tests/unit/renderer/lineage-card-flight.test.ts tests/unit/renderer/lineage-card-stretch.test.tsx tests/unit/renderer/lineage-pull-follow.test.tsx tests/unit/renderer/lineage-drag-session-grid.test.tsx tests/unit/renderer/lineage-slot-visibility.test.ts tests/unit/renderer/lineage-autoscroll.test.ts tests/unit/renderer/lineage-visfb31-ownscale.test.tsx tests/unit/renderer/lineage-capacity.test.ts
```

## 15. 裁决记录（2026-11-22 主控处置——全部已决，无待决悬空）

原稿五项待裁决点、DeepSeek 外审处置单与 planner 二轮处置单的裁决结论，回写
为已决摘要：

1. **既有断言迁移授权**：已裁决=授权。§9 表「断言迁移」列即授权记录——
   S6/S7 期望翻转、flight 值断言、fireEnd 8 个既有文件迁 'translate'、保育例
   left/top 非空断言保留（锚语义下 left='0px' 仍真）。
2. **e2e 候选计数语义翻转（终裁②）**：已裁决=夹具调整优先。γ2/样板① 加卡
   或升档调整为正候选形态（§9 逐条列夹具改动/断言目标）；行满月负锚留档；
   T13 零迁移零加卡（W8——:1326 断言仍成立）。
3. **G2 平滑度验收口径**：已裁决=确认三层策略（CSS 声明锁+调度器注入单测+
   真机截图——jsdom 不判别 easing，INV-100 登记面收窄方案成立）。
4. **mask 在用户主视口的形态**：已裁决=确认接受。声明地板口径 W=549.8
   cap 3/2，行满月组拖拽时只有加深占位槽可见（候选=0=行满无物理空位的
   真实形态，§11.5 终裁「物理空位+有限网格」的直接结果）；动态 e2e oracle
   仍用 contentWidthOf 实测值，不把 549.8 写成所有视口的实测常量。
5. **translate 契约细节**：已裁决=确认。值格式 'Xpx Ypx' 两值形+left/top
   激活锚（§5 Option A）；飞行七步序（B1 修订）与 onEnd
   propertyName==='translate' 随批落地；真机首帧锚点验收入 commit B 门。
6. **新增 INV-17x/17y**：已裁决=编号建议认可。登记时机=commit C（17x mask）
   /commit B（17y 布局终局挂起重算）随批回写 docs/invariants.md。
7. **布局终局屏障（P1+三轮 B3/B4/B5）**：已裁决=采用 extendSeen+
   paddingInFlight/paddingFinished+flight/padding 双条件与 layoutFinishOnce；
   出带即启动 padding 跟踪，已完成回落零额外等待；pointerdown 锁延至布局
   终局（方案 A）；zoom measure() 统一守卫；挂起窗连续覆盖 padding 回落，
   routeEpoch 移到布局终局，zoom 选 layoutEpoch 入 recomputeKey，数据写不动
   （§2/§3.5/§5/§10/§13）。
8. **oracle 与帧批复核（P2/W2/W3/W5）**：已裁决=样板①整段改容量公式 oracle；
   scrollDirty 合批与 S11 flush 迁移；F3a/F3b 双 oracle；F4 内联 transform
   空断言，rotate/scale 不在 flight 文件新增（§3.2/§9/§14）。
9. **会话与规格收窄（W1/W4/O1/O2+三轮）**：已裁决=pending cancel 按 latch 分流、
   清理先 cancel scheduler 后 stop auto；EdgeOverlay 稳定 getter/ref-latest
   接线；target 数量仅在拖起相位按 overFrame 取 1/0，settle 恒 0；无指针帧
   排除 autoscroll 泵自耗（§2-§4/§6/§10）。EdgeOverlay 行数以二轮实测 243、
   既有组件上限 250 为准，最小 diff 透传，超 250 先拆再改。

处置单行为变更申报清单（实现批随批申报）：W3 pointercancel 判定改用
lastClient（迁移 11——修正 R5 意图与实现偏差）、B2 终局批（up/cancel 入口
前置）、二轮 W1 pending latch-cancel 归 settle、二轮 W2 FRAME_EVENT/
onScrollFrame 改标脏合批与 S11 flush 时点、P1 布局终局屏障与 routeEpoch
时点迁移、三轮 padding 出带在途跟踪、三轮方案 A pointerdown 锁延至布局终局
（INV-83 锚扩展）、zoom measure 同步守卫、W6 target 仅拖起且 overFrame 挂、
§3.5 单一连续挂起窗（不 disconnect）与允许布局读集、被移动 CSS 规则文本锁
测试双文件拼读（机械迁移）、theme.test lineageCssAll 全扫描面扩面（检查面
测试，断言本体零改，申报）、check-quality.mjs:391 注释写点同步（申报）、
§9 四处陈旧注释校正（测试仅注释行，申报）。三 commit 依赖调整=padding
过渡/.stretch 抑制前移至 B，memo/稳定回调后移至 B；A 保持纯物理拆件。
