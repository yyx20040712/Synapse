# F-L1-C 门一对抗深审报告（三屋模式 ADR-0017）

> 审计人：门一对抗深审子代理 · 2026-08-30 · 只读审计（未跑任何 npm/test/git 变更命令）
> 输入：f-l1c-gate1.diff（7 文件 +420/−31）/ f-l1c-ticket.md / f-l1c-impl.report.md / 9 份 raw 证据。
> 开工技能清点：code-review-excellence（用——核心方法论）/ verification-before-completion（用——
> 证据对账收口）；TDD、systematic-debugging（不用——本角色禁写实现禁跑测试，只读+静态复核）。
> 配置自查：审计模型与主控会话同源配置，无思考等级配错迹象（本档为裁决产物）。

## A 母本符合度（diff vs 票面五层）

- **[B]** 变体 C 参数逐项落地：FO 恒 130×37.05（`LineageEdges.tsx:96-100`，EDGE_LABEL_MAX_W/H
  单源）；9.5px 斜体 #6b7280 白晕 text-shadow 四向 2px、break-word、max-height 37.05px+
  overflow hidden（theme.css:580-400 段）；title 全文 tooltip；空串不渲染
  （`LineageEdges.tsx:95`）。与案册 §1 变体 C 定稿（130px/≤3 行/9.5px/1.3/斜体/#6b7280/
  无底色白描边）逐项一致（docs/design/2026-08-30_edge-label-wrap-options.md:41-46）。
- **[B]** 放置器算法与票面逐字吻合：碰撞盒 w=est+gap4/h=37.05+gap4、节点盒外扩 6、严格 <
  判交（edge-label-layout.ts:258-263,275-280）；偏移序 dy 0,+lh,−lh,…±5lh（lh=12.35）×
  同档 dx 0,±(w/2+16)（:281-294 实现序=票面序）；全占位回 anchor+头注 best-effort 声明
  （:295-296）；输出槽位中心 Map 两消费（渲染+fit）。estimateLabelWidth 口径=票面公式
  （CJK 9.5/其余 4.75/padding 合计 4/钳 130/空串 0）。
- **[B]** fitViewport 第 5 参 labelBoxes 缺省 []（lineage-viewport.ts:50-56）参与包围盒
  min/max（:71-76）；Canvas 调用处传 slots 盒 hw=estimateW/2、hh=18.5（LineageCanvas.tsx:
  98-106，hh=18.5 为票面字面值）。
- **[B]** 悬停滚动语义=仅截断阻断：`scrollHeight > clientHeight + 1` 才 stopPropagation
  （LineageEdges.tsx:61），未截断不吞 zoom（主控预裁 4）。
- **[B]** 测试 ①~⑩+M1~M5 全落地；证据链：first-red「Tests 924 passed (924)」精确零破
  （f-l1c-first-red.raw.txt:3019）→ second-red 4 failed|19 passed（:992-993）→ M1~M5 各
  恰 1 failed 且红点正确（M1=⑧ :332；M2=⑨ :330；M3=⑩ :330；M4=① ：expected 289 to be
  130；M5=fit 数值 ：received 1.9310=560/290）→ final-test 935=924+11 全绿 EXIT=0
  （f-l1c-final-test.raw.txt:2977-2982）。
- **[N]** 无缺项。超额两笔均为注释/估算级：①LineageEdges 头注补写「或 kind=ref」
  （diff 行 86-87）——纯注释准确性修正（该判定代码为既有 context 行），零行为改；
  ②theme.css 净增 29 行 vs 票面估 ~14（591→620），无机检关口（见 B）。
- **[N]** M4 实际只红①不红⑥（票面预测「①/⑥红」）——⑥夹具'说明'不涉钳制路径；实现者
  报告如实记 1 failed/6 passed，诚实无粉饰。

## B 宪法红线

- **[B]** always-active：新测试均顶层 describe，无 guardedDescribe 包裹
  （edge-label-layout.test.ts:51 / lineage-canvas.test.tsx 新 describe）。
- **[B]** 受锁面 lineage-canvas.test.tsx 仅增不改：diff 两个 hunk 全 `+` 行零 `-` 行；
  现场核对旧断言 187-195（data-edge-label textContent/空 label null/edge-id 计数）原样；
  first-red 924 全绿+second-red 19 旧绿双重实证旧断言在新实现下零红。
- **[B]** 行数红线核实：eslint.config.js:187-190 对 `tests/**/*.ts` 显式 `max-lines:'off'`
  ——lineage-canvas.test.tsx 529 行豁免属实；其「计费<500」声明亦真（实测物理 530 行，
  空行 40+注释 40=计费 450<500，skipBlankLines/skipComments 口径）。theme.css 620 行不在
  ESLint 域（CSS 不 lint），check-quality.mjs:99-104 仅卡 repo≤300/renderer .tsx≤250；
  且票面自身预估「591+~14」即已超 500——非本票新增违类，属既有 CSS 文件延续。组件面：
  LineageCanvas 232≤250 ✓、LineageEdges 113 ✓、edge-label-layout 93/viewport 186≤500 ✓。
- **[B]** UTF-8 全程工具读取中文可读；分层单向未动（renderer→feature 域内互引）；
  零新依赖（git status 无 package.json/lockfile 变更）；无 TODO/FIXME/placeholder。
- **[B]** CSS 交互态住类：`:hover{overflow-y:auto}` 驻 theme.css:398-400 类内（B1 ✓）；
  FO `pointerEvents:'none'` 为内联静态属性（票面行为层 §1 字面要求），非交互态，不违 B1。
- **[B]** INV-36/38 单源消费：放置器入参经 nodeWidth/nodeHeight 单源构建
  （LineageCanvas.tsx:92），无手写档值。

## C 代码与测试质量（重点攻击面）

- **① [B]** 原生 wheel 委托时序（自裁 1）：论证成立。zoom listener 原生挂 svg
  （lineage-viewport.ts:141），React18 合成 wheel 委托挂 root 容器——root 是 svg 的
  **祖先**，冒泡序 div→fo→g→svg[zoom 先行]→…→root[合成 handler 后至]，
  stopPropagation 在合成层执行时 zoom 状态已变更；g 在 svg **内部**，g 根原生 bubble
  listener 先于 svg 到达，时序成立。挂载/清理：useEffect 空依赖+成对
  add/removeEventListener（LineageEdges.tsx:54-65），卸载无泄漏，StrictMode 双挂亦幂等
  （同引用 listener）。closest 委托判定+`instanceof Element` 防御 ✓。非标签区零扰动：
  listener 无 preventDefault/无状态写，唯一动作是截断标签上 stopPropagation；panbg 上
  的 wheel 不经 g（兄弟节点），g listener 不触发。real-browser 语义复核：截断标签滚轮
  →g 层截停→svg preventDefault 不发生→div 默认滚动保留 ✓；未截断→放行至 svg
  preventDefault+zoom ✓。
- **[N]** 自裁 1「票面字面机制不可达」措辞过强：`onWheelCapture`（捕获期合成，root 处
  捕获先于 svg 后代 listener）技术上可达。但原生委托方案行为等价、不依赖 React 合成
  时序细节、单 listener 不随边数扩张——机制选择更优，不构成回炉依据。
- **[N]** 截断标签滚动到底后继续滚轮仍阻断 zoom（无 overscroll 交接）——票面行为层字面
  语义即如此（「当 scrollHeight>clientHeight+1 时 stopPropagation」无边界例外），与票一致。
- **② [B]** 放置器数学：确定性成立（无排序=无 tie 歧义；items 输入序+固定偏移序+`some`
  线性扫，全确定性操作）。盒/渲染一致：h 恒 37.05+4=41.05>渲染 FO 37.05（高向保守）；
  w=est+4≤134≥130（钳制端保守），窄端残差由票面生命周期层明文容差声明承担。⑤回退
  分支可达性独立复核：夹具节点盒 hw300/hh150 外扩 306/156，候选域 x∈[−150,150]⊂
  [−306,306]、y∈[−82.3,82.3]⊂[−156,156]——全 33 候选位必撞→回 anchor ✓。est 口径：
  `for...of` 码点迭代+`codePointAt(0)`——emoji（>0x1F300）计 9.5 全宽（近似合理）、
  全角标点 U+3000+/全角形式 U+FF00+ 计全宽 ✓；偏窄风险集中在宽拉丁（W/M≈8-9px vs 估
  4.75）——此为票面自定公式固有偏差方向+已声明容差，非实现缺陷。
- **③ [B]** useViewportController 扩参（自裁 2）：EMPTY_LABEL_BOXES 机理成立——effect
  依赖含 labelBoxes（lineage-viewport.ts:118），内联 `?? []` 每渲染新引用→effect 重跑→
  setViewport(fitViewport 新对象)→重渲染→无限循环；模块常量引用稳定消除之 ✓。过度
  refit 复核：labelBoxes 变化⟹deps[edges,slots]变⟹slots 变化⟹其 deps[edges,geom,nodes,
  layout]变⟹fit effect 本就经 nodes/edges/layout 触发——第 6 依赖冗余但无害，无独立
  新增 refit 路径。
- **④ [B]** 测试有效性：⑨ defineProperty 非恒真——M2 变异（去 stopPropagation）实证红
  +second-red ⑨红（transform 实变 scale 1.4333）双向锚均有效；反向锚（未截断
  `not.toBe(before)`）若 zoom 失效即红 ✓。⑧夹具数学独立复核：锚 y=200（y1=0+32/y2=
  400−32），e2 首自由位+4lh：3lh=37.05<41.05（y 半和）仍撞、4lh=49.4≥41.05 分离——
  M1 红证 received 181.475=200−18.525 与本审计手算逐位吻合。fit 数值用例独立复算：
  xMin=−200（BAND_LEFT）/xMax=0+90（NODE_W 180 半宽）→W=290；k=min(560/290,440/64)=
  1.931034…；含盒 yMax=218.5→H=250.5→k=440/250.5=1.756487…——与断言及 M5 红证
  received 1.9310344827586208 三方吻合。⑩正则 `[^}]*` 不跨段+:hover 块因 `:hover`
  前缀无法匹配基类模式，防注释救活 ✓（M3 实证）。
- **[N]** ⑧ y=400 夹具（自裁 8）：预裁 3 已核准；实际断言 `toBeCloseTo(4*12.35,6)` 精确
  锁档距+`toBeGreaterThan` 锁方向，强度未被夹具弱化。

## D 报告诚实性

- **[B]** 8 条自裁逐条对 diff 全部属实（原生委托/EMPTY_LABEL_BOXES/defineProperty/chmod
  声明/fit 用例归档/padding 合计 4/fragment→g/y=400 夹具——每条均在 diff 或测试 diff 中
  有对应实体）。
- **[B]** 「924 既有零破」与 first-red.raw:3019 精确对账；「935=924+11 全绿 EXIT=0」与
  final-test.raw:2977-2982 对账；verify EXIT=1 唯一红段=locks 三处（forensics.mjs 未登记/
  edge-label-layout.test.ts 未登记/lineage-canvas.test.tsx 受锁变更）与 verify.raw:34-37
  逐条一致，均归主控收口——票面预裁路径。
- **[W]** 「verify 链 locks 后各段单独补证：lint EXIT=0/typecheck EXIT=0/build EXIT=0」
  **无 raw 证据档**（证据集内无对应文件）——门一无法复核这三段退出码。lint 面本审计已
  静态独立核实（豁免+计费+tsx 上限全过），typecheck/build 面留待门二或主控收口亲验
  （收口单本就要求亲验 verify 真退出码，缺口在后续链路会被补上）——降级为提示非回炉项。
- **[N]** M4「①红」vs 票面预测「①/⑥红」差异如实呈现，无夸大。

## E 接缝与后续

- **[B]** INV-36/38 单源消费不动：放置器与 fitViewport 均经 nodeWidth/nodeHeight 纯函数
  只读（LineageCanvas.tsx:92 / lineage-viewport.ts:64-69），INV-38 的 geom 半高路径零改。
- **[B]** INV-14 共存：g listener 成对注册/清理；拖拽副作用无涉——pan pointerdown 判
  `data-panbg`（label div 上 target 非 panbg 不起手，票面在档声明的 pan 起手面小损）。
- **[B]** e2e 锚面实证：tests/e2e/lineage.spec.ts 仅锚 `svg path[data-edge-id]`（:230,261,
  371,579,583,589,590）后代选择器+stroke 属性——path 零改、新增 g 嵌套层不影响后代
  匹配；无任何 e2e 锚定 `<text>` 形态或 data-edge-label（grep 零命中），换装零冲突。
- **[B]** 案册变体 C 参数与实现逐项一致（见 A 首条）。
- **[N]** INV-41 未登记——票面 §3 明文归主控收口时办理；建议文案实现者报告 §六已备。
- **[W]** 工作树残留 `scripts/audits/f-l1c-hit-probe.mjs`+`f-l1-out/f-l1c-{full.png,
  hover-scrolled.png,verify.json}` 晚于 verify 运行（locks:check 仅拦 forensics.mjs 未拦
  hit-probe=verify 时点尚不存在），实现者报告 §二残留清单未列及——疑为主控后续真机
  取证产物而非实现者遗漏；收口 staging 须显式列文件防误扫（AGENTS 2026-08-26 教训），
  该批产物归置需主控裁决后入收口清单。

## 统计与总评

**21 B / 2 W / 7 N** —— **PASS**（无回炉项）。

两 W 均非实现缺陷：D-W1=补证段缺 raw 档（lint 面已静态独立核实过，typecheck/build 由
门二/主控亲验覆盖）；E-W1=收口 staging 提示。主控六项预裁经攻击复核全部维持（预裁 1
的「不可达」论证措辞见 C-N1，方向正确）。移交主控：①真机取证（票面 ⑤b，f-l1c-hover-
scrolled.png 似已有产物待认领）②locks:generate+apply+INV-41 登记+[locked-change]
③typecheck/build 段亲验补证。

---

## 复核（回炉 1 定点复核，2026-08-30，只读）

> 输入：回炉后现场 + f-l1c-rework1-{m1,m2,r2}-red / final-test / verify.raw.txt +
> impl.report §八/§九 + f-l1-out/f-l1c-verify.json（主控真机复跑 PASS）。
> 方法：当前 git diff 与门一存档 diff 逐文件比对锁定回炉增量面 + 夹具数学独立复算。

### R1 放置器包络扩容 —— **ADDRESSED**

- **[B]** 现场核实：dy 阶梯 `i<=10`=±10lh（±123.5，21 dy 档）——edge-label-layout.ts:82；
  dx 五档 `[0,±(hw+16),±(hw+16)×2]`（:80），满宽标签（w=134/hw=67）第三档=±166 ✓；
  头注声明包络值+实测依据（f-l1c-verify.json 回炉实证）✓。
- **[B]** 头注依据独立复算成立：nodeHeight 100 档（hh50+pad6）×标签 hh20.525 → 竖向
  分离阈 |dy|≥76.525、首个可达档 7lh=86.45；dx 分离阈=96+67=**163 精确**（第一档 83<
  163 恒撞、第二档 166≥163 分离）——原 ±5lh=61.75/±83 双不足的根因链数学闭合。
- **[B]** ②b 夹具复算（hw90/hh50→外扩 96×56，双满宽标签同锚节点中心）：e1 首自由
  +7lh=86.45；e2 于 dy=+7lh 档 dx=−166（x-sep 166≥134 对 e1 且 ≥163 对节点）或
  dy=−7lh 分离——两解均满足断言（互不相交+移出节点盒+|y|≤10lh），断言位置无关
  设计正确 ✓。③b 复算：单标签首自由=(0,+7lh)（dy≤6lh 恒 y 撞节点，dx 无关），
  「移出+分离+≤10lh」三断言成立 ✓。
- **[B]** ⑤ 重设计复算：满宽标签包络 x±233（=166+67）/y±144.025（=123.5+20.525）；
  环绕大盒 hw250/hh155 外扩 256×161 全覆盖包络，角点候选 (166,123.5) 仍撞
  （166<323 且 123.5<181.525）→ 全 105 候选拒→回 anchor ✓（回炉令口径逐字满足）。
- **[B]** ⑧ 改锁**非弱化**：旧锁「恰 +4lh 竖移」→ 新锁「x 差恰 −166+同 y」——同为
  精确值锁且新锁实证 R1 新增 dx 第二档+dxs 负先正序；y 错开性质由 ②/②b（纯函数级
  disjoint+y 域断言）承接，覆盖面无缺口；M1R 复跑红（expected +0 to be close to
  -166）证明锁仍杀放置器摘除 ✓。
- **[N]** 头注「|dy|≥~85」为近似散文值（精确阈 76.525/首个可达档 86.45）——测试锁
  精确行为，无影响；③b 注释 163=96+67 精确。

### R2 wheel 主动滚动 —— **ADDRESSED**

- **[B]** 现场核实（LineageEdges.tsx:57-78）：截断命中→`stopPropagation`+
  `preventDefault`+主动 `scrollTop=clamp(scrollTop+deltaY, 0, scrollHeight−clientHeight)`
  三连；未截断/非标签 `return` 零扰动路径保持 ✓。
- **[B]** preventDefault+stopPropagation 并用正确性：**preventDefault 不禁后续 listener**
  ——svg 祖先链上的原生 zoom listener 仍会执行，stopPropagation 必须保留，代码两者
  并存（:68-69）且 M2R 复跑红（去 stopPropagation→transform 实变 ⑨红）实证其必要
  性 ✓；主动滚动无双重施加（preventDefault 先取消原生默认滚动，仅手动赋值生效）；
  listener 挂 g 元素默认非 passive（Chrome/jsdom 元素级一致）→preventDefault 有效 ✓。
- **[B]** ⑨ scrollTop 与 deltaY 对账：桩 (999,30)→clamp 上界 969；wheel(Δ240)→240、
  wheel(Δ100)→340 累计精确；未截断标签反向锚 zoom 正常且 scrollTop 恒 0（不主动滚）✓；
  deltaY 改 +240（向下揭示）与真机 scrollTop=16（=sh53−ch37 恰隐藏量，clamp 后）
  语义同向 ✓。R2R 新变异（摘主动滚动→expected +0 to be 240）红证 ✓。

### 新破坏扫描

- **[B]** 回炉增量收敛：LineageCanvas.tsx / theme.css / lineage-viewport.ts 当前 diff 与
  门一存档**逐字节一致**（回炉零触碰）——Edge 三型/INV-36/38 单源/pan-zoom/边渲染块
  （LineageEdges.tsx:80-114 与首审版一致）全部未动 ✓。
- **[B]** 受锁 lineage-canvas.test.tsx 相对 HEAD **0 删除行**（⑧⑨ 改锁改的是本工单
  未提交自增面，既有断言零触碰）✓；回炉全量 937 passed（=924+13：11+②b③b）
  EXIT=0（rework1-final-test.raw:2990,2994）✓。
- **[W]** 收口前置（主控侧，非实现缺陷）：全库 lint 红 5 处全部来自主控探针
  `scripts/audits/f-l1c-scroll-probe.mjs` 未使用变量（实现者 §八如实申报未触碰）——
  不清置则收口 verify 的 lint 段必红；且 locks/manifest.json（00:22 生成）已落后于
  回炉后内容（edge-label-layout.test.ts/lineage-canvas.test.tsx sha 需重生成），
  收口须 locks:generate+apply 连同 hit-probe/scroll-probe 归置一并办理。
- **[N]** §九取证器坐标系勘误（2 压节点=假阳性/1 标签互叠=真缺陷）与 R1 修法自洽：
  布局坐标探针 hits=[]+手算 oy=−22.8+真机复跑 0/0 三重印证，采信。

### 复核裁决

**R1 ADDRESSED / R2 ADDRESSED，回炉 1 复核 PASS（3B+4B 新证 / 1W / 2N），无再回炉项。**
唯一 [W] 为收口链路前置（探针 lint 红+manifest 过期），归主控收口清单，不阻塞门一。
