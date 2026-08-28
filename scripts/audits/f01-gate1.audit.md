# SR2-F-01 门一对抗深审档（页列几何与懒渲染回收）

> 审计人：门一对抗深审子代理（ADR-0017 三屋模式）。基线 diff=scripts/audits/f01-gate1.diff
> （1881 行，已含主控两项处置：registry SR-RDR-02 file 迁移 + PageColumn 头注二次压缩终态 239 行）。
> 审计方式：只读；逐条对实物核实（diff ≠ 事实，实物才是）；禁 npm/test（主控已亲验
> verify exit=0=91 文件 677 用例 + e2e 19 passed 2 skipped）。

## 开工记录（会话开工纪律）

技能清点：`code-review-excellence`（用——本任务即对抗深审）；`test-driven-development` /
`systematic-debugging` / `verification-before-completion`（不用——只读审计禁跑测试，verify
证据由主控亲验落盘，本档不产生完成声明）。配置自查：审计模式，模型/思考等级由主控配置。

## A. 母本符合度（diff vs 票面五段 + p7f 票面完整任务书）

- [N] **五段全落地，实现形态与票面逐段对齐**：
  - 段①就绪管线：PageColumn.tsx:135-159（[doc,totalPages] effect→逐页 getPage→view 尺寸
    数组 state 缓存→占位盒全列→onReady:152）；越界夹取锚=clampPageToColumn（:38-40，
    scrollToPage 前哨 :200——票面 W-A「onReady→scrollToPage 前夹取」满足）。zoom 不入
    依赖（:134 注释+实测 effect 依赖数组 :159），就绪后无 loading=缓存乘法 ✓。
  - 段②占位盒：pageBoxHeight/columnWidth（:43-50，floor 与 canvas CSS 同口径）；列宽
    mx-auto 居中（:214）；未渲染盒空白（:226-233 rendered.has 条件）✓。
  - 段③懒渲染窗口：renderWindow=1（视口±1）/recycleWindow=2（离屏>2）props 默认
    （:121-122）；IO 占位盒驱动（:162-181，引用稳定去抖 :173-174）；windowPages/
    recycledPages 纯函数（:53-80）✓。
  - 段④层分工：TextLayer/AnnotationLayer/ReaderAiLayer 经 renderPage(no) 每渲染页一套
    （ReaderPage.tsx:190-209），props 未改（三文件均不在 git status 修改面）；
    SelectionLayer 单实例=anchorPage===no 条件渲染（ReaderPage.tsx:203-205，任一时刻
    至多一份——单实例语义成立）✓。
  - 段⑤双源：setPage 第三参默认 'to' bump scrollRequest（reader.store.ts:334-359）；
    'none' 只落账不 bump；五消费面默认值兼容（见 D）；PageColumn 段⑤ effect
    （:198-202，INV-27 单口 scrollIntoView block:'start'）✓。
  - ReaderPage :125 越界自愈删除 ✓（diff 中旧 `if (renderedPage - 1 !== page)
    setPage(renderedPage - 1)` 已移除）；:116 每页自量 ✓（handlePageRender 按
    data-page-root 查该页盒内 canvas，ReaderPage.tsx:130-141）；pageText 单份→Record
    ✓（:82 pageTexts state）。
- [N] **PdfCanvas 拆分符合票面**：doc 生命周期上提 PdfDocProvider（getDocument/
  isEvalSupported:false/loadingTask.destroy+catch 逐行原样，PdfDocProvider.tsx:65-89）；
  渲染 effect/取消/DPR 配方原样（PdfPageCanvas.tsx:89-147：cancel→getPage→DPR 背衬
  =CSS×dpr→transform→textContent items 过滤+styles+lang，与旧 PdfCanvas :154-215 逐行
  对比无语义漂移）；pageNo 固定+防御夹取保留（:94）；外层 flex 包装 div 移除=自裁 5
  已申报（居中改由页根承担，ReaderPage 装配链 :227-231 语义等价）。旧文件删除 ✓。
- [W4] **布局态状态机的实现形态偏隐式**：票面「交审计」的每页状态机
  （empty→rendering→rendered→recycling→empty）以「rendered 集 ± IO 回调 ± PdfPageCanvas
  effect 生命周期」三机制组合实现，无显式枚举态。行为面被 14 用例覆盖（窗口展开/快速
  滚动回收/rendering 中滚出→effect 清理 cancel：PdfPageCanvas.tsx:144-146 卸载清理），
  跨格序列（快速滚动/zoom 变化）均有锚。判定：可审、可测，非返工项；但 F-02~04 装配
  扩展时若再叠状态，建议显式化（同「同类缺陷二次触发即重构」预防逻辑）。
- [N] **SelectionLayer 挂载位与预裁 4/9 的口径差**：预裁 4「挂 ReaderPage 级，锚定根
  动态」；实现挂锚定页盒内、锚定根静态（anchorPage=可见首报告，PageColumn onVisibleChange
  →ReaderPage.tsx:85-86）。票面段④本身把「锚定根动态」划归 F-02、本单只留挂载位——
  实现忠于票面；偏差在预裁 9 的乐观话术（「动态锚定天然支持」），非实现缺陷。自裁 4
  如实申报。用户可用度详 E-1。

## B. 宪法红线

- [PASS] **INV-16 白名单迁移封闭**：eslint.config.js 主块 pdfjs 禁令不变（对白名单外
  renderer 文件生效），override 块 files 三→四（PdfCanvas 出、PdfDocProvider+PdfPageCanvas
  入，:78-83），重申的其余 patterns（electron/node/main/preload）与主块逐条同步 ✓。
  实物 grep：pdfjs-dist static import 全仓恰四文件（PdfDocProvider×2/PdfPageCanvas/
  TextLayer；CorpusExtractor 为 lazy dynamic import——INV-16 已知边界声明在册，架构
  评审面覆盖）。封闭集未放宽 ✓。
- [PASS] **PdfCanvas.tsx 真删除**：git status `D`+目录 ls 无此文件 ✓（方案切换红线）。
- [PASS] **行数**：239/98/153/247（PageColumn/PdfDocProvider/PdfPageCanvas/ReaderPage）
  全 ≤250（wc -l 实测）。
- [PASS] **受锁面**：manifest 实物 140 条（grep -c 实测），page-column.test.tsx 入锁
  （manifest:365）；受锁变更三件（eslint.config.js/reader.store.test/reader-text.spec）
  随单待 [locked-change] 尾注（主控提交时）。locks:generate/apply 日志 140/140 落盘。
- [PASS] **e2e 批 1=扩展非放宽**（逐 hunk）：旧用例「渲染出已知文本」→新用例「页列
  渲染出多页文本」：首屏断言 `P1 ${PDF_KNOWN_TEXT}` 超集覆盖旧 `PDF_KNOWN_TEXT` 断言；
  增两跳滚动（P2 中部/P3 底部，reader-text.spec.ts:107-137）；INV-01 三层 overflow
  断言原样保留（:139-150 实物核实）；DEPS→COLUMN_DEPS 增 SR2-F-01 守卫（新单未翻
  done 前 skip=守卫语义正确，非放宽——无守卫正向实跑另证，见 C）。createTinyPdf 仍
  被 :257/:351 既有用例消费，import 合法。「渲染出真实文本」宪法条款满足。
- [PASS] **零新依赖**：package.json/lockfile 不在 diff；零出网/零 SQL/零 eval 面。
- [PASS] **UTF-8**：实物 Read 中文全可读（bash 管道乱码=console 显示层，非文件问题；
  verify mojibake 关卡过）。
- [W1] **INV-27/INV-28 编号撞号（强制收口前置项）**：docs/invariants.md:41-42 新登记
  「INV-27 双源区分/INV-28 canvas 生命周期」与 :43-44 既有「INV-27 lineage 树单父
  （SR2-LG-01）/INV-28 被引缓存（SR2-ENR-01）」**同号并存**（grep 实测 INV-27 ×2、
  INV-28 ×2）。册的编号单源被破坏：后续 F-03 票面引用「INV-27 双源」将歧义。内容、
  声明处、锚定列本身均正确——纯编号缺陷。**处置建议（主控直改，同头注压缩先例）**：
  新条目重编 INV-29/INV-30，同步引用面=invariants :41/:42 + PageColumn.tsx:8,10,18 +
  reader.store.ts 签注区 + page-column.test.tsx 头注 + PdfDocProvider/PdfPageCanvas
  注释中的 INV-28 字样。机械修正、无行为面、改后 locks 面不受影响（invariants 非锁，
  其余为 src 非锁文件）。**不修不放行提交。**
- [N] data-ticket="SR2-F-01" 保留于 PageColumn 两分支根（:206/:212）——AI-08 先例，
  翻 done 时主控收口移除（自裁 6 申报，收口清单已含）。

## C. 代码与测试质量

- [PASS] **双源机制实现**：bump 条件 `opts?.scroll !== 'none'`（reader.store.ts:354）；
  seq 续增 `(s.scrollRequest?.seq ?? 0) + 1`（:355，跨 'none' 不重置——store.test:388-391
  锚定）；'none' 不 bump（引用不变断言 `toBe(before)`，store.test:379——比 toEqual 严）；
  夹取先于信号（:351-353，信号携夹取后页码，store.test:366-369 锚定）。迟发信号
  paperId 过滤=ReaderPage.tsx:80-82（columnScroll 投影）✓。
- [PASS] **回收调度**：卸载哨 PageFrame（ReaderPage.tsx:64-69）删 pageTexts 条目
  （dropPageText :143-151，无条目时返回原引用防无谓重渲）；在途任务取消=PdfPageCanvas
  effect 清理链（PdfPageCanvas.tsx:144-146：cancelled 标+renderTaskRef.cancel）✓。
- [PASS] **初始引导窗口（自裁 2）合理**：空可见=[1..1+renderWindow]（PageColumn:61-63）
  ——首屏不闪空+jsdom 确定性；IO 首报后正常窗口语义（page-column.test「IO 报可见
  {3}」用例锚定过渡：引导 {1,2}∪窗口 {2,3,4} 经 recycle 收敛 {1,2,3,4}，页 1 距 3=2
  ≤recycleWindow 保留——注释与断言一致）。
- [PASS] **onReady 恢复链（自裁 3）与 F-03 衔接**：onReady→setPage(t.page)（默认 'to'
  →bump）→PageColumn 段⑤消费→滚回记忆页盒顶（ReaderPage.tsx:154-156）。F-03 回写
  用 {scroll:'none'} 不 bump——两源经 opts 正交，无回弹环路结构；「早于就绪到达→
  就绪后补滚」用例（page-column.test:302-329）=恢复链几何前置的锚。F-03 状态机
  （loading→restoring）是本链的超集，路径清晰（见 E-3）。
- [PASS] **变异红证三轮真恰中**（日志逐份核实）：store 变异 `!==`→`===` →2 failed|
  19 passed（恰中 2 新用例，f01-mutation-store.log）；column 变异 `renderWindow + 1`→
  `renderWindow`→2 failed|12 passed（恰中 2，f01-mutation-column.log）；e2e 断言变异
  P2→不存在文本→1 failed（f01-mutation-e2e.log，error-context 落盘）。首红亦真
  （store 2 failed|19 passed；column 14 failed——占位骨架无导出）。
- [PASS] **e2e 批 1 无守卫正向实跑**：f01-e2e-newcase.log=1 passed (1.6s)（临时摘守卫
  备份法，报告 §3 轮 3）——「skip 守卫语义+单独正向取证」双证链完整，主控翻 done
  后全量 e2e 将复含此用例（19+1 预期）。
- [W2] **就绪管线 load() 无 catch（错误面缺口）**：PageColumn.tsx:155 `void load()`——
  逐页 getPage reject 时 unhandled rejection+永久 loading，props.onError 在本管线零
  消费（onError 只透传 PdfPageCanvas，:229）。props 特意扩了 onError（自裁 1 理由=
  INV-02 渲染失败可见）却漏了自身管线的失败面，自相矛盾。实际触发概率低（doc 已
  加载成功后逐页 view 失败罕见；44 页 Reynolds 级文档损坏页场景存在）。测试无该
  路径覆盖。**处置建议**：load().catch→onErrorRef（PageColumn 无 onErrorRef——需补
  latest-ref 一行+catch 三行，≤5 行增量，239 行预算内）；或登记 F-02 批次顺手修。
  不阻断本单（渲染单元主失败面 PdfPageCanvas 已有 onError+e2e error tab 先例）。
- [W3] **pageRoots 条目回收不对称**：卸载哨只删 pageTexts（ReaderPage.tsx:143-151），
  pageRoots（:83）条目跨回收残留——持有 detached HTMLElement 引用（轻量、页数上界）；
  且页重入渲染的 onPageRender 回报前窗口内，AnnotationLayer/ReaderAiLayer/
  SelectionLayer 拿到 stale pageRoot（:192-205）挂已脱离 DOM（getBoundingClientRect
  全零→短暂错位/不可见，回报后自愈）。票面/INV-28 只要求「pageText 条目同删」——
  pageRoots 是实现伴生 state，回收语义未对称设计。**处置建议**：dropPageText 内
  同删 pageRoots[no]（+3 行）；F-02 动态锚定将高频消费 pageRoots，宜 F-02 开工前修。
- [N] makeDoc 恒真三元：page-column.test.tsx:56 `792 * (no === 1 ? 1 : 1)`——恒等于
  792 的调试残留（注释意图=全部 612×792）。无害脏码，受锁新文件，F 批次顺手清或
  收口时一并 unlock 修正。
- [N] store 新用例位于 guardedDescribe('SR2-TABS-01') 块内（reader.store.test.ts:356/
  371，块起 :42）——**主控简报裁决 7 明示「既有 reader.store.test 扩在原块内」**，
  授权项非实现者偏差；TABS-01 恒 done→守卫恒放行，K3 静默消失风险仅存于理论回滚。
  page-column.test.tsx 裸 describe always-active ✓（ADR-0017 裁决 3 满足）。

## D. 报告诚实性

- [PASS] **自裁 12 项逐条对 diff 属实**：1 props 扩展（onError/onVisibleChange ✓
  PageColumn:113/:118）/2 引导窗口 ✓/3 恢复链 ✓/4 挂载位 ✓/5 单 canvas ✓/6 data-ticket
  ✓/7 document.querySelector ✓（anchor-locate.ts 同款先例，单窗口单 active tab 全局
  唯一成立）/8 测试形态 ✓（IS_REACT_ACT_ENVIRONMENT+getContext stub 落盘于文件
  :75-82）/9 INV-16 四文件表述 ✓/10 fitWidth ✓/11 头注压缩 ✓（二次压缩为主控直改，
  报告数字 248 为其时点真值）/12 删减面 ✓（git status 12M+1D+3?? 与申报完全一致；
  dev-launch.cmd/dist_new/ 未跟踪残留未纳入 ✓）。
- [W4] **「五消费面零改」断言在 ReaderPage 面不准确且未申报**：语义零改成立（默认参
  +ReaderToolbar onNavigate={setPage} 引用传参零改+OutlineAside getState 零改+
  anchor-locate 两处零改——grep 实测恰五调用面+恢复链新增第六处），但 ReaderPage 的
  prevPage/nextPage 两处被重构为共享 jump(d)（diff hunk :97，ReaderPage.tsx:93-99）——
  「零改」的否定性断言下这一处是实改（行为等价）。此重构未列入自裁。行为无风险，
  扣诚实性小分。
- [PASS] **「props 零改」核实**：TextLayer/AnnotationLayer/AiAnnotationLayer/
  SelectionLayer/OutlineAside/OutlineThumb 六覆盖层组件均不在修改面（TextLayer 仅
  import 源 1 行连带）；SelectionLayer props 签名实物未动（:14/:59 区）✓。
- [PASS] **677=661+16 数理成立**：page-column.test 14 用例+reader.store.test 扩 2=16；
  661+16=677 ✓（f01-impl-verify.log:1934-1935 实测 91 文件 677 passed）。
- [PASS] **verify 链断申报属实**：实现时点 tickets:check exit 1=SR-RDR-02 file 悬空
  （疑虑 1），链断后逐项单独取证（quality/locks/lint/typecheck/test/build 全 exit 0
  落盘）；主控已收口（registry.ts hunk：SR-RDR-02 file→PdfPageCanvas.tsx+summary 注
  拆分史），终态主控亲验 verify exit=0——处置闭环 ✓。
- [W1] **INV-27/28 登记申报了内容未察觉撞号**（详见 B-W1）——报告与 invariants 均写
  「INV-27/INV-28 新登记」，未对照册内既有 LG-01/ENR-01 同号条目。诚实性无隐瞒，
  属核查疏漏。

## E. 接缝与后续单

1. **SelectionLayer 中间态用户可用度**（自裁 4 边角）：锚定页=可见首报告页。单页
   视口（常见 zoom）=锚定页即唯一可见页，划选标注完全正确——预裁 9 验收线「单页内
   划选标注正确」在主用例下成立；多页同视（小 zoom）时非首报告页划选无工具条无
   响应，需滚到该页成为首报告页才可用。既有标注链 e2e 三用例（划选高亮/下划线/
   备注色块）全绿=锚定页内正确性的装配级证明。中间态窗口=F-02 一票之隔（串行
   F-01→F-02），可接受；**建议主控在 F-02 票面显式回写此边角**（预裁 9 话术从
   「天然支持」修正为「锚定页内正确」），防 F-02 验收口径漂移。
2. **F-02 依赖面就绪**：挂载位通道 onVisibleChange（升序可见页上抛）+anchorPage 投影
   在位（ReaderPage.tsx:85-86）；动态锚定改造点=renderPageLayers 内 anchorPage===no
   条件渲染改为选区驱动（SelectionLayer props 本就收 pageRoot——动态喂入即可，其
   props 零改红利保留）；跨页选区拒绝的页盒遍历输入=data-page-box 语义已固化。
   **前置建议**：先修 W3（pageRoots 回收对称）——动态锚定会放大 stale pageRoot 的
   消费频率。
3. **F-03 依赖面**：scrollRequest 双源通道+'none' 不 bump 已锚（store.test 三用例）；
   nearestPage 纯函数已交付（PageColumn:83-95，含盒内/盒外/空数组边界）；回写监听
   挂载位 scrollAreaRef（ReaderPage.tsx:87）就绪；恢复链自裁 3 的 F-03 完整化路径=
   在恢复 bump 前置 restoring 态防「恢复滚动途中回写抢跑」——结构清晰，无阻塞。
4. **fitWidth 单页盒语义保持**（自裁 10）✓：锚定页盒 measured.box.w/zoom（:166-170），
   未渲染兜底 return 不误设 zoom；列宽基准重定义明归 F-04，未提前实现 ✓。
5. **疑虑 2（239 贴线）评估**：F-02 主改 SelectionLayer/anchor-locate、F-03 主改
   reader.store/ReaderPage 侧、F-04 主改 fitWidth/缩放锚——PageColumn 本体的既定
   增量面小（onVisibleChange 已把锚定消费外移）。但 <15 行余量+若收口采纳 W2（+5 行）
   即逼近红线。**建议**：W2 修复若采纳且超线，顺势预裁拆 page-geometry.ts（纯函数
   五件 ~65 行外移，票面外新文件需主控预裁）——F-02 开单前决策，勿留到行数红。
6. **疑虑 3 实锤**：reader.store.ts:3 状态行仍标「[SR2-TABS-01]（工单：open /
   strong）」——TABS-01 实为 done，既有遗留非本单引入；本单改了该头注行为层却未
   顺手正。主控域：收口或 TABS 归档单处置（1 行）。
7. **三连带 import 完整性**：OutlinePanel:22/OutlineThumb:31→PdfDocProvider；
   TextLayer:31→PdfPageCanvas；typecheck exit 0+全仓 grep 无旧 './PdfCanvas' import
   残留（余下 PdfCanvas 字样均为历史描述性注释：CorpusExtractor:171/OutlineAside
   等，自裁 12 申报口径一致）✓。

## 统计

- findings：PASS 14 / B 0 / W 6（W1 INV 撞号[强制收口前置]/W2 load 无 catch/W3
  pageRoots 不对称/W4 状态机隐式+「零改」断言不准合并计/makeDoc 恒真/store 头注
  状态行遗留）/ N 5。
- 证据日志逐份核实：红证 2+变异 3+e2e 无守卫实跑 1+locks 2+verify/e2e 全量 2，
  全部真实、退出码与报告数字一致。
- 主控三项处置核对终态：registry 迁移 ✓（diff hunk+实物）/头注 239 ✓（wc -l）/
  Node24 前缀 ✓（简报铁律+verify log 可信）。

## 总评

**PASS（附 1 项强制收口前置 + 3 项建议）**。

- 核心：母本五段忠实落地、拆分配方原样、宪法红线全过（白名单封闭/真删/行数/受锁
  140/零依赖/UTF-8/e2e 扩展非放宽）、测试证据链完整真实（三轮变异恰中+无守卫实跑
  双证）、报告诚实（自裁 12 项全属实）——无回炉必要。
- **强制收口前置（不修不放行提交）**：W1 INV-27/28 重编号为 INV-29/INV-30+引用面
  同步（主控直改，机械修正）。
- 建议随收口或 F-02 前处置：W2 load().catch（+onErrorRef）、W3 dropPageText 同删
  pageRoots、makeDoc 恒真三元清理；E-1 预裁 9 口径回写、E-5 拆分预裁决策、E-6 状态行。
