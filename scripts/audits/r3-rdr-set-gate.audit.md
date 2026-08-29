# R3-RDR+SET 门一对抗深审档（阅读器周边+设置页视觉——视觉役收官单元）

> 联审代理：门一（对抗深审）。2026-08-29。**只读仓库**；本档为唯一产物。
> 输入件：gate1.diff（542 行）/brief v1/impl.report/五份 e2e log+first-red+
> mutation+verify log/终态源码 8 文件/设计定稿 §1 浓度表+§2 U3/U4。
> 技能清点：code-review-excellence（用）/verification-before-completion（用）/
> frontend-design+frontend-ui-engineering（参考用——视觉浓度裁决判据）/
> systematic-debugging（不用——只读审查非调试复现）/TDD（不用——仅核证据）/
> git 工作流（不用——铁律禁 git 写）。配置自查：单代理无派发，思考等级适
> 配对抗深审。

## A. 红线零触碰实证（最高优先）——B1/B2/B3

- **机检零出现**（gate1.diff 全文 grep -c，2026-08-29 亲跑）：
  `AiAnnotationLayer`=0 / `AnnotationLayer`=0 / `SelectionRects`=0 /
  `scroll-converge`=0 / `scroll-progress`=0 / `PageColumn`=0 /
  `ReaderPage`=0 / `multiply`=0 / `z-index`=0。F-07 层叠链与选区色
  （reader-text.spec L186/474/505 断言 rgb(253,224,71)）零扰动。✓
- **F-05「Toolbar shrink-0」防线兼容**（ReaderPage.tsx L231-235 渲染结构
  亲核）：TabBar（容器 L90 `flex h-8 shrink-0`）与 ReaderToolbar 均为滚动
  容器（scrollAreaRef，overflow-auto）的 flex-col 固定兄弟。ReaderToolbar
  新根 className=`rdr-toolbar flex shrink-0 flex-wrap items-center gap-2
  px-3 py-2 text-xs`——**shrink-0/flex-wrap/py-2/text-xs 全保留**；旧
  `border-b`（1px）换 CSS `border-bottom: 1px solid var(--border-gold)`
  （等高 1px）；`backdrop-filter`/`box-shadow` 均零占位属性。**几何零变，
  窄窗换行行为不变，无 TabBar 顶出风险回归面。**✓
- **TabBar active inset 金缘**：h-8 在容器（items-stretch 拉满），tab 自身
  `.rdr-tab-active` 只动 `background: var(--panel)`+`box-shadow: inset
  0 -2px 0 0 var(--border-gold)`——inset 零占位、无几何属性；inline style
  仅删 background 行（旧 accent-soft 满铺退役）。tab 高度/布局稳定。✓

## B. e2e 兼容——B5/B6/B8+W1

- **五份 log 亲核**：e2e.log（corpus-export timeout，24+1 failed，2.2m）/
  e2e-serial.log（同 timeout，2.2m）/e2e-retry.log（reader-scroll selectText
  detached，1.2m）/e2e-ab-baseline.log（25 passed，1.2m）/e2e-sample2.log
  （25 passed，1.2m）。**reader-text.spec（107 断言密度面）五次全量从未红。**
- 断言碰撞面核对：选区黄 rgb(253,224,71)/F-06 页盒 panel 底/滚动容器透明/
  selection-toolbar testid/tablist 语义/sr-only 页码文案——全部在零触碰区。
- **间歇红独立裁定（门一自裁，非照抄实现者）**：接受「环境波动」定性。
  三线证据：①时序——五跑连续发生于 07:53–08:04 一小时窗内（verify 后连跑），
  Temp 堆积 1498 个 synapse-* 目录；②复现实验——基线 A/B 两头绿+最小组合
  不复现+单 spec 绿×2；③核心密度面 reader-text 五连绿。corpus-export
  timeout 点在 60s 导出流程等待（IPC/fs 链），与改动面（静态渲染皮肤）无
  因果机制。**但 reader-scroll detached 的 backdrop-filter 边缘贡献不能
  排除 → W1 观察项（见下），不立案、不阻断。**

## C. 母本符合度+自裁逐条+DiamondRule 形态+未申报面——B7/N2/N4

- **U3 逐项**：Toolbar 玻璃浮层（panel-glass+blur10+金 hairline）✓；控件
  ghost ✓；TabBar 纸面 tab+active 金缘 ✓；衬线页码数字（.rdr-num 挂
  ReaderToolbar 页码/缩放——票面措辞挂在 TabBar 后但语义属页码，ReaderToolbar
  落地正确）✓；ReaderNotesPanel h4 节标×2 ✓；SelectionRects 色随 accent
  零改 ✓。**N2**：「OutlineAside……h4 节标」实际落点仅 ReaderNotesPanel
  （片段/AI 两节）——OutlineAside 为 tab 单面板结构无分节可标、本身已 panel
  纸面底；其 active 底缘 accent→金为票外一致性延伸（diff 就地注释申报）。
  非缺件。
- **U4 逐项**：分节卡（panel+radius-l+shadow-1+border）✓；金节标（衬线+
  3px 金左缘条）✓；菱形分隔 DiamondRule×4 ✓；focus=accent 描边+gold-soft
  底（.syn-input:focus）✓；保存按钮 primary（R3-U1 CTA 变体）已消费 ✓。
- **自裁六条逐条裁**：①syn-btn-ghost 类直消费——**核实 Button.tsx props 确
  无 title**，「适应宽度」disabled title 属交互面零变项，同源 theme.css
  单类零漂移，接受；②DiamondRule 组件层复用——核实该组件头注「R3-LIB 与
  R3-U4 复用同一语法」属 **LIB 单元已提交内容（057ea55）**，设置页仅
  import 组件、无双份语法、未动受锁 library-cards.test，接受；③作用域 CSS
  吃自持节——票面 P2「设置页分节卡」意图覆盖全页节，票外文件零触碰的同
  视觉收敛，接受（附 N5 覆盖缺口）；④文档流内玻璃皮肤（非 overlay）——
  P4「仅皮肤」+F-05 零扰动的保守解，接受；⑤分节容器 flex-col——testid/
  aria 无碰撞（106 用例+e2e 全量绿），接受；⑥拆壳后 196>180——预裁「超则
  拆」已执行，余量 16 行=头注+4 DiamondRule 行，无第二职责，接受。
- **未申报面扫描**：`git status`+`git diff --stat HEAD` 亲核=7 文件
  114+/29-，与 diff/报告完全一致；audits 未跟踪文档非实现面。**零未申报。**

## D. 宪法红线——B4/B7

- **行数**（wc -l 亲测）：173/163/156/207/196/25/426/154——全部 ≤500，
  组件 ≤250。✓
- **受锁 manifest 154 时间序**：manifest generatedAt 08-28T23:50（generate
  →apply 于会话中期）→ 之后变异用 cp 备份法（还原 diff 空=回 locked 态，
  全程无 git checkout）→ verify.log（07:51）locks:check「154 个受锁文件与
  manifest 一致」。时间序自洽：落锁后受锁面无净变更。✓
- **UTF-8**：报告/diff 中文注释/本档均可读。✓
- **TDD 四档**：首红 log=3 it 全红且断言失败信息真实（expected className
  not to contain——非恒真）→ 绿 → 变异①删 rdr-toolbar 类恰中浮层 it
  （1 failed/2 passed）→RESTORE-1-OK diff 空 → 变异②删 .syn-settings h2
  金左缘恰中设置 it →RESTORE-2-OK diff 空 → 终态 3/3 绿。**四档完整。**✓
- TODO/FIXME/placeholder：新改文件 grep exit=1（clean）。✓

## E. 机器面——B5

`verify-exit=0`（&&链全过：quality/tickets/locks 154/lint/typecheck/test/
build）；单测 **104 文件 859 用例=856+3** ✓；e2e 最终 **25 passed** ×2
（ab-baseline+sample2，1.2m 与基线时长一致）✓。

## F. 成本账本

- 实现者：≈5.90M tok / 25.4min（主控口径，联审采信）。
- 门一（本档）：只读单轮深审、15 次工具调用、无回炉派生；token 不可自精确
  计量，按会话输入累计估算 **≈1.1M tok / ≈18min**（口径：15 轮×平均上下
  文 ~70K）。

## 统计行

**B=8**（红线机检零出现/F-05 几何零变/TabBar h-8 稳定/TDD 四档完整/
机器面三数全中/107 断言面零碰撞/零未申报面/间歇红环境波动定性接受）
**W=1**（W1 reader-scroll detached 观察项）**N=5**（N1 票面 e2e 笔误 24→25/
N2 OutlineAside h4 措辞映射/N3 ghost 残留无效 border 类与 Button 同构/
N4 ReaderNotesPanel syn-input 票外延伸已申报/N5 自持节吃皮肤路径无渲染级
断言）。

### W/N 明细

- **W1**：reader-scroll「element detached」一次性（retry log，selectText 作用
  P3 文本层）。纯 className 改动不改重渲染时机，但 .rdr-toolbar
  backdrop-filter 新增合成层的边缘贡献不能排除（实现者自认）。**观察项：
  若该 detached 再现 ≥2 次 → 立案，A/B 摘 blur 验证。**本单元不阻断。
- **N1**：票面 §3「e2e 24 保持」与实际 25 不符——票面笔误（主控工单 E 项
  与五份 log、LIB 基线收口均 25）；以 25 为准，brief 历史文档不必回改。
- **N2**：母本「OutlineAside/ReaderNotesPanel=纸面卡+h4 金左缘条节标」的
  h4 落点仅 ReaderNotesPanel；OutlineAside（tab 单面板、已 panel 底）无分节
  结构可标。非缺件。
- **N3**：ReaderToolbar btn className 残留 Tailwind `border` 类，被
  .syn-btn-ghost `border:none` 压制（theme.css 未分层规则压 @layer
  utilities），视觉正确；与 Button 组件 ghost 形态同构（Button 亦带 border
  类），非本单元新引入偏离——如清理应在 Button 统一清。
- **N4**：ReaderNotesPanel 挂 syn-input（focus 金底）为票外延伸，报告 §1
  已申报；阅读器侧与设置侧 focus 语言一致，浓度轻微，白线内。
- **N5**：「自持节经 .syn-settings > section 吃皮肤」路径无渲染级断言（新
  测试 mock 掉两个自持节）；CSS 文本锁+e2e 真实渲染（corpus-export 全链
  经设置页）间接盖。若未来自持节根从 section 改 div 本测试不红——可在
  自持节己测补根元素断言，非本单元义务。

## 门二四清单

1. **W1 观察项登记**：backdrop-filter/reader-scroll detached 入战役报告
   观察池（阈值 ≥2 次再现立案 A/B 摘 blur）。
2. **提交口径**：本单元触锁（manifest+新测试文件入锁）→ 提交须
   [locked-change] 尾注，locks manifest 与该提交同步（宪法即时 apply 条）。
3. **收口亲验**：主控亲跑 verify 真退出码+git diff --stat 范围核对；本票
   无 registry 工单则免翻状态（由主控确认）。
4. **N1 记录**：票面 e2e 笔误在战役报告记一句即可，不回改历史 brief。

## 裁决

**PASS——放行提交。** 主控两项预裁（阅读器装饰浓度最低/设置分节卡+
DiamondRule 复用+作用域 CSS 自持节）均维持，无需更强推翻依据。无返工项、
无阻断缺陷；W1 留观察、N1-N5 记档。
