# SR2-F-07 门一对抗深审档（划选自绘选区 + AI 层去 multiply）

- 审计代理：门一对抗深审（独立子代理；只读仓库，唯一可写=本档）
- 输入四件：`sr2-f-07-gate1.diff`（505 行）/ `sr2-f-07-brief.md` / `sr2-f-07-impl.report.md` / `sr2-f-07-verify.log`（2025 行完整，非空——证据以日志为准，未缺）
- 技能清点（开工纪律）：code-review-excellence 用（本任务核心）；frontend-ui-engineering 用（C 项层叠/composite/几何推演）；javascript-testing-patterns 用（D 项断言强度评估）；systematic-debugging 不用（不执行调试，证据看日志）；verification-before-completion 不用（禁 npm/禁跑测试，一切以日志+工作区只读核对为据）；其余技能与本审计面无关不用。
- 配置自查：门一子代理由主控派发配置；本会话无等级配错迹象。

---

## A. 母本符合度（diff vs 票面五层规约）

| # | 审项 | 裁决 | 证据 |
|---|---|---|---|
| A1 | 行为层：原生高亮透明+自绘半透区块+AI/标注不再叠乘 | **[B]** | text-layer.css:61-67（::selection/::-moz-selection → transparent，br 规则未动）；SelectionRects.tsx:421（diff 行号，下同）`background: 'color-mix(in srgb, var(--accent) 30%, transparent)'`；AiAnnotationLayer.tsx 现态 :149 `style={{ zIndex: 5, pointerEvents: 'none' }}`（multiply 已摘） |
| A2 | 接口层：三文件主改面+anchor 契约零触碰 | **[B]** | `git status`：M 锁 manifest/AiAnnotationLayer/SelectionLayer/text-layer.css/两 spec，?? 两新组件——与票面清单+申报拆分一一对应；annotation-anchor.ts 不在改动面（selectionToAnchor/rects 契约未触碰） |
| A3 | 架构层：reader 域内+无新依赖+z 序推演入头注 | **[B]** | 两新文件均在 `src/renderer/features/reader/`；diff 无 package.json/lockfile；SelectionLayer.tsx:7-19 头注含完整层叠次推演（票面「门一强制审项」预告兑现） |
| A4 | 生命周期层不做面（动画/跨页自绘/触屏特化）零触碰 | **[B]** | diff 全文无 animation/transition；跨页拒绝逻辑未改（SelectionLayer.tsx:124-129 原样）；无 touch 事件面 |
| A5 | 文化层：TDD 链+报告落档+五行回复 | **[B]** | 首红两枚/变异三枚/全量 verify/全量 e2e 日志齐（见 B/D 节）；impl.report 落 `scripts/audits/` ✓ |
| A6 | 超票面面：无未申报 diff 面 | **[B]** | 逐文件对照 impl.report §2 清单与 `git status`——7 文件（6M+2??）全部在申报面内；申报 9 项逐条核实见 E 节 |
| A7 | 报告行数自述偏差 | **[N]** | impl.report §1 称 SelectionLayer 收敛 246 行，实测 `wc -l`=247（SelectionToolbar 77/SelectionRects 59 与报告一致）——off-by-one，无实质 |

**主控预裁项攻击性复核**：B 案/摘 AI multiply 保单层 multiply/色值/拆两件/e2e 守卫改写——五项预裁在 diff 中均按预裁落地，未发现可推翻预裁的新依据。

## B. 宪法红线

| # | 审项 | 裁决 | 证据 |
|---|---|---|---|
| B1 | 分层单向（renderer→window.api→ipc） | **[B]** | 两新组件纯 DOM/React，无 Node/Electron API、无绝对路径、无新增 api 调用（SelectionToolbar 纯展示+上抛；SelectionRects 零逻辑） |
| B2 | 受锁 unlock→apply 时间序+manifest 同步 | **[B]** | impl.report §5 三轮实录；mtime 链闭合：reader-text.spec.ts 末次编辑 23:11:56 ≤ manifest.json 23:12:08（末次 apply）≤ verify 内 locks:check 绿（verify.log:34「144 个受锁文件与 manifest 一致」）。src 侧 SelectionLayer.tsx mtime 23:12:26 晚于 apply 18 秒——该文件**非受锁**，且早于最终 verify vitest 起点 23:12:51（verify.log:1985），最终 verify 全绿覆盖其终态，无完整性缺口。manifest 144 条数不变（diff 仅 2 哈希+generatedAt） |
| B3 | 安全禁令（eval/webSecurity/SQL/openExternal…） | **[B]** | diff 全文无涉；quality:check「无占位/无乱码/无跨域」过（verify.log:15） |
| B4 | 文件行数（组件 ≤250） | **[B]** | wc -l：SelectionLayer 247 / SelectionRects 59 / SelectionToolbar 77 / AiAnnotationLayer 210 / AnnotationLayer 249（未改）/text-layer.css 90——全数合规；拆分动因（312→超 250 关卡）成立 |
| B5 | UTF-8 | **[B]** | 本席逐文件只读核对中文注释全部可读；quality mojibake 关卡过（verify.log:15） |
| B6 | TDD 首红形态可信度 | **[B]** | unit 首红（firstred-unit.log:12-15）：恰两新 it 红、红位=`expect(layer).not.toBeNull()`（:283/:301）特征缺失红非笔误红，10 旧 it 全绿；e2e 首红（firstred-e2e.log:51）：新守卫 vs 旧实现红在 C 节第一条 `rgb(191, 191, 255)`，B 节页盒断言先行通过=红位准确；两枚 exit=1 落盘 |
| B7 | 变异红证断言级恰中 | **[B]** | M1/M1b（删自绘渲染块/删挂载行）：红在 F-07a/F-07b 本体断言（m1/m1b 日志 2 failed/10 passed，exit=1）；M2（::selection 改回不透明）：红在 transparent-family 断言 :673（m2.log:51，build 产物哈希 index-DfCR63FL=终态+变异，证明跑在最终代码形态上）；三日志时间戳互异（23:03/23:06/23:06/23:09）——`diff` 核对非复制粘贴（m1 vs firstred、m1b vs m1 均有时间/时长差） |
| B8 | 变异面覆盖度 | **[W]** | 三变异均未触及 z-index:2 / pointer-events:none / 禁 mixBlendMode 三项票面钦定机制——任何测试（unit+e2e）对这三项零锁定，回归即无声（详见 D3） |
| B9 | cp 还原 diff 空证据 | **[W]** | 报告 §4 表声称 M1/M1b/M2-RESTORE-DIFF-EMPTY 标记，`grep RESTORE scripts/audits/sr2-f-07-*.log` **0 命中**——红侧可信（独立日志+时间戳），还原侧「diff 空」仅叙述无日志载体。变异对象（SelectionLayer.tsx/text-layer.css）均非受锁文件，cp 法本身合规（未用 git checkout） |

## C. 视觉票面强制审项（渲染层叠次推演——本场核心）

### C0. 层叠上下文链逐层核对（推演成立的前提）

挂载链自内向外：`div.relative.h-fit`（PageColumn.tsx:237，relative 无 z）→ `data-page-root`（PageColumn.tsx:236，absolute inset-0 无 z）→ `data-page-box`（PageColumn.tsx:228-233，relative 无 z，boxShadow **不**建上下文）→ `data-page-column`（PageColumn.tsx:219-223，静态流式）→ N4 挂载盒（ReaderPage.tsx:211，relative 无 z）→ 滚动容器（ReaderPage.tsx:203-205，overflow-auto **不**建上下文）→ PageFrame=纯 fragment（ReaderPage.tsx:56-60）→ PdfDocProvider ready 路径 `return props.children(doc)` 无包裹 DOM（PdfDocProvider.tsx:97）。
**结论：全链无 stacking context 隔离，各 z 层直达公共根比较——头注「挂载盒/页盒/页框均无 z-index」声明（SelectionLayer.tsx:12-13）机制级属实。** 最终序：canvas（PdfPageCanvas.tsx:152，非定位 in-flow，最底）< .textLayer（text-layer.css:34 `z-index:0`）< selection-rects（SelectionRects.tsx zIndex:2）< AnnotationLayer z5 multiply（AnnotationLayer.tsx:198）< AiAnnotationLayer z5 无 multiply（AiAnnotationLayer.tsx:149；与 AnnotationLayer 同值，DOM 后绘在上——ReaderPage.tsx:195-196 装配序 AnnotationLayer→ReaderAiLayer ✓）< 工具条 z-10（SelectionToolbar.tsx:465）。

### C1. 判据①：划选时选区下文字可见吗 —— **可见，机制级成立 [B]**

字形像素来自 canvas（.textLayer span `color:transparent`，text-layer.css:38），canvas 在 z 序最底未被任何不透明层覆盖；选区块 30% alpha 蓝 source-over 覆盖其上：result = 0.3×accent + 0.7×底色。黑字 (0,0,0) → 深蓝 (37,99,235)×0.3≈(11,30,71)，白底 → 浅蓝 ≈(183,203,247)——对比保留、字可读。`--accent:#2563eb` 单源（theme.css:10），e2e 实测 computed=`color(srgb 0.145 0.388 0.922 / 0.3)`（37/255=0.145、99/255=0.388、235/255=0.922——色值算术独立复核一致）。旧缺陷（F-06 不透明近似色遮字）由 transparent+自绘结构性消除。

### C2. 判据②：重叠 span 选区颜色均匀吗 —— **均匀，单层单绘成立 [B]**

原生逐 span 路径已封死（::selection transparent=零绘制）；唯一绘制面=SelectionRects 行级合并矩形：`rectsBetweenPoints` 先 `mergeLineRects` 再归一化（annotation-anchor.ts:321-335）——同一视觉行多 span 竖向重叠矩形聚为一簇（y 重叠率≥25%+高度可比带，:351-354），簇内 x 取并集、y/h 取主导矩形（:368-371），栏断段 x 互斥（间隙阈 :355-357）→ **每个视觉区域恰被一个 rect div 绘制一次**，0.3 alpha 无叠乘路径。F-06 原始缺陷 C（重叠 span 逐层叠绘加重）结构性根除。
边缘残留 [N]：紧行距相邻行盒 1-2px 亚像素 y 重叠不并簇（Y_OVERLAP_RATIO_MIN 防误并，:351-353 注释明示）→ 该亚像素带内两 rect 交叠 alpha 0.3→0.51——1-2px 带人眼不可辨，接受。

### C3. 判据③：AI 高亮与用户标注重叠处还加深吗 —— **层间叠乘活口=0 [B]**

逐路径清点：
- 路径 1：AI 容器 multiply——已摘（AiAnnotationLayer.tsx:149 现态无 mixBlendMode；diff :50-51）✓
- 路径 2：::selection 第三路径——transparent=零绘制，无合成参与 ✓
- 路径 3：AnnotationLayer 单 multiply（:198，票面 P1③保留）与 backdrop 相乘——backdrop=canvas+textLayer+自绘选区块（z2 先绘），**不含** AI 层（AiAnnotationLayer 同值 z5 但 DOM 后绘，不进 AnnotationLayer 的 backdrop）→ 仅单次相乘=荧光笔语义 ✓
- 路径 4：AI rect（opacity 0.45，:169）叠于用户标注上=normal alpha 混合非乘法 ✓
- 全库残留面：`grep mixBlendMode\|mix-blend src/` 代码命中仅 AnnotationLayer.tsx:198 一处（余为注释）✓
**双乘加深无任何存活路径。** 附带语义：AnnotationLayer multiply 的 backdrop 含自绘选区块 → 划选已有标注的文字时选区以「单次乘深」形态透显——头注 :16「与本层相乘为单次合法荧光笔语义」声明在案。

### C4. pointer-events:none 真防吞划选 —— **[B]**

容器 `pointerEvents:'none'`（SelectionRects.tsx:408），rect 块未覆写该属性=继承 none → 命中测试整层跳过，拖选手势直达 .textLayer span（cursor:text，text-layer.css:37-43）；工具条独立组件 z-10 保留完整事件（按钮 click 语义、容器 onMouseDown preventDefault 防坍缩均随迁未变，SelectionToolbar.tsx:473-474）。

### C5. 几何坐标换算与 toolbar 数学同源性 —— **[B]**

overlay=tlBox−mountBox（SelectionLayer.tsx:153-164，viewport 系差值），与 toolbar x/y（:147-150）同在 evaluate 单次求值、同挂载盒参照；rects 归一化 base=`pixelBoxOf(root)`、root=textLayer（annotation-anchor.ts:239，SelectionLayer.tsx:133 传入）= overlay 盒本体 → `%`×overlay 尺寸精确还原 textLayer 像素位。**滚动不变性**：N4 盒与页列同滚（同一滚动容器内），tlBox−mountBox 差值稳定（实现注释 :152-153 声明属实）；zoom→文本层重建→选区坍缩→pending null（既有 P6 机制，selection-layer.test.tsx:241-257 锁）。单测 F-07a 以 textLayer 盒≠页盒的 fixture（test:276）钉死参照系=textLayer 非页盒。

### C6. selectionchange 驱动跟随性（拖选中途）—— **机制成立 [B]，手感面留主控 [N]**

拖选中 selectionchange→200ms 防抖→evaluate(false)→pending 含 rects 更新（SelectionLayer.tsx:168-171）：自绘块以 200ms 节拍跟随（非逐帧），mouseup 即时收敛；程序化选选同走防抖路径且 e2e 实证（selectText→toolbar/rects 可见，spec:677-680）。因 ::selection 已透明，两拍之间反馈为上一拍残影——**拖选中途存在 ≤200ms 滞后/首拍延迟**，此为 B 案结构代价，票面文化层+疑虑 3 双重申报在案（真实拖选手感留主控复测），不构成回炉项。

### C7. impl.report 疑虑 2 措辞复核 —— [N]

疑虑 2 称「划选已存在标注块区域时选区着色被标注块遮盖」——对 highlight 类（不透明+multiply）不准确：选区色经单次 multiply 以加深形态**透显**于标注块内（C3 附带语义），非全遮盖；对 AI rect（45% 透）部分透显。方向保守（实际视觉优于自述），无碍裁定。

## D. 测试质量

| # | 审项 | 裁决 | 证据 |
|---|---|---|---|
| D1 | 新两 it always-active | **[B]** | selection-layer.test.tsx:148 裸 describe（无 guardedDescribe），头注 :12 明示 ADR-0017 裁决 3；verify 全量 743=基线 741+2（verify.log:1984） |
| D2 | 能失败一次（断言强度） | **[B]** | 首红实证两 it 红（firstred-unit.log）；F-07a 强度高——几何四值断言（test:287-290）以 textLayer≠页盒 fixture 钉参照系（若实现误用页盒，left=0/top=812 即红）；F-07b 三段生命周期断言（初始 null→mouseup 在场→Escape 卸载） |
| D3 | e2e 新守卫是否真锁三面 | **[B]（三面齐）/ [W]（机制面缺）** | 三面锁实：transparent 家族（spec:670-673，兼容 `rgba(0,0,0,0)` 序列化形态）+ 自绘层在场三级可见性（toolbar/rects/rect，spec:678-680；rect 计 0 会被 `first().toBeVisible()` 拦）+ alpha 双界 ∈(0,1)（spec:687-694，正则兼容 rgba/color(srgb) 两形态且两形态均要求 0<α<1——M2 不透明变异仍红实证其非放宽）。**缺口**：z-index=2 / pointer-events=none / 容器无 mixBlendMode 三项无任何断言（unit 亦无）——头注推演（SelectionLayer.tsx:12-18）整段零测试锁，F-06 教训（守卫锁了色值算术未锁遮字机制）在本单以同构形态残余：回归加一行 `mixBlendMode:'multiply'` 于 SelectionRects 容器或 zIndex 改 50 将全绿通过。建议主控裁定：收口时补一行 computed style 断言（`getComputedStyle(el).mixBlendMode==='normal'`+zIndex+pointerEvents 三属性一次 evaluate）或明示接受头注单源声明 |
| D4 | 变异红证 3 枚恰中断言本体 | **[B]** | M1/M1b 红=F-07a/b 渲染断言本体（非无关红）；M2 红=transparent-family 断言本体（m2.log:51 :673）；M2 跑在最终形态 build 上（css 产物 22.78kB 与 green-e2e 一致 vs firstred 22.66kB 旧形态）——断言级恰中成立 |
| D5 | 正则兼容 color(srgb) 非断言放宽 | **[B]** | 申报 4 属实：两分支捕获组均喂给 α∈(0,1) 双界断言；NaN 兜底（spec:692）保证形态外同红不伪造通过 |

## E. 报告诚实性 + 接缝

| # | 审项 | 裁决 | 证据 |
|---|---|---|---|
| E1 | 自裁 9 项逐条对 diff 核实 | **[B]** | ①色值 color-mix 30%=SelectionRects.tsx:421 ✓；②两层 testid=容器无背景/rect 带背景 ✓（AiAnnotationLayer annotation-layer/annotation-rect 同构先例属实，AiAnnotationLayer.tsx:147/155）；③拆两件+246→247 行微差见 A7 ✓；④正则兼容见 D5 ✓；⑤F06_DEPS 未追加 'SR2-F-07'（spec:615 现态无）✓；⑥src 内短式 `[F-07 增补]`（AiAnnotationLayer.tsx:25/SelectionRects/SelectionToolbar 头注）、css 长号 `[SR2-F-07]`（text-layer.css:15）——tickets:check 114 一致过（verify.log:24-25）反证无悬空长号 ✓；⑦textLayer 并列收窄（SelectionLayer.tsx:136）纯类型无行为分支 ✓；⑧中程红两次——见 E3 [N]；⑨审计档落位 ✓ |
| E2 | 无未申报 diff 面 | **[B]** | A6 交叉核实；`git status` 未跟踪面中 docs/adr/0018、docs/design/、他 brief 文件为主控会话既有产物（impl.report §2 已声明），非本单产生 |
| E3 | 中程红两次的日志载体 | **[N]** | §5 行 5/7 叙述的守卫正则形态红/tsc 收窄红无独立日志文件（目录内无对应档）；但最终守卫代码形态（color(srgb) 分支+NaN 兜底）与 tsc 修正（:136）即为两次事件的产物佐证，且首绿 green-unit/green-e2e 均在——叙述可信度中上，载体缺 |
| E4 | 头注链完整性（P3 接缝核对） | **[B]** | SelectionLayer F-07 段含完整层叠推演（:7-19）✓；text-layer.css F-07 演进登记（:15-19）✓；AiAnnotationLayer 去 multiply 决策依据（:25-29，含「AnnotationLayer 单层不动=P4」双向声明）✓；SelectionRects/SelectionToolbar 头注指回 SelectionLayer 推演（挂载位所有者）✓。[N] 附注：text-layer.css:11-14 F-06 旧段「fallback 行同步改不透明」描述的两行结构已不存在（现为单值 transparent），紧邻 F-07 段已澄清演进——残留历史句对后世读者有轻微误导，可在 F-06 段尾加一句「（F-07 已再演进，见下）」的余地，非必改 |
| E5 | 相邻模块声明互斥检查（接缝归责） | **[B]** | AnnotationLayer.tsx:6（「整层容器 multiply——荧光笔语义」）与 :198 现码一致且与票面 P1③ 保留决策一致——不与新机制矛盾；AnnotationLayer.tsx:200「multiply 上容器级（stacking context 隔离…）」为既有注释本单未触碰，语义与 F-07 无互斥；annotation-anchor.ts:345-346「同行拆两矩形（multiply 下无叠深…）」声明在无 multiply 的自绘层语境下依然成立（拆段 x 互斥无叠 alpha）。**未发现两处互斥声明——无需停报裁决** |
| E6 | 疑虑 5 项评估 | **[B]** | ①manifest CRLF：locks:check 终态绿（哈希对账目标文件内容），主控提交时 .gitattributes 归一——已知可接受，收口 diff 复核一眼即可；②见 C7 [N]；③票面预告在案；④116 vs 114=主控台账面（check-tickets 对象级解析权威说成立）；⑤registry 注册归主控（实现者未触 tickets/——`git status` 无 tickets/ 改动佐证 ✓）且申报 6 对注册陷阱（check-tickets 规则 4 组件文件 data-ticket 占位）的预警有价值 |
| E7 | verify 真退出码 | **[B]** | verify.log:2024 `exit=0`；95 文件/743 用例（:1983-1984）=95+2 新 it 口径吻合；全量 e2e 24 passed 1.2m exit=0（e2e-full.log 尾）；「tail 假绿」陷阱（票面建议命令形态 `$?` 实为 tail 码）的改用全量重定向落盘——语义忠实 ✓ |

---

## 统计

**B=32 / W=4 / N=7**（W：B8 变异面未覆盖机制三项、B9 还原 diff 空无日志载体、D3 e2e 守卫缺 z/pointer-events/multiply 断言、——D3 与 B8 同根因合并计 1 后实为 **B=32 / W=3 / N=7**；若分立计数则 W=4。取合并口径：**B=32 / W=3 / N=7**）

**总评一句**：五层规约逐节符合、层叠链推演经独立源码级复推全成立（三判据机制级通过、层间叠乘活口清零）、TDD 四档证据链可信且无范围蔓延——实现面无回炉项；三条 W 全部是「守卫/证据载体」类测试面缺口，不构成行为缺陷。

**是否放行门二：放行**（附移交：①D3/B8 机制三项守卫缺口——建议收口时补一行 computed style 断言或主控明示接受头注单源；②B9/E3 两处证据载体缺口记录在案；③C6 拖选手感+疑虑 2 视觉面归主控复测）。
