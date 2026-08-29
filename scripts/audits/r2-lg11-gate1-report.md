# R2-LG11 门一对抗深审报告（三屋模式 ADR-0017）

> 审计人：门一对抗深审子代理（独立于实现者）。
> 模型自报：builtin:bigmodel-coding-plan/GLM-5.3 / 思考等级=默认档（开工首行已自报——项目宪法条款）。
> 输入：diff 包 `scripts/audits/r2-lg11-gate1.diff`（1822 行/22 文件，全读）+ 票面 `r2-lg11-brief.md`
> + 实现者报告 `r2-lg11-impl.report.md` + 五日志（firstraw/mutation-1/2/3/verify）。
> 立场=攻击者：找「说了没做」「做了没说」「测试假锁」「票面违背」。只读审计，零源码触碰。

**统计：B_0 / W_6 / N_9 —— 总评 PASS（B>0 则 FAIL；本单零阻断项）**

---

## A. 母本符合度（票面 §1.1 视觉规格逐值 + §2 接口逐条）

### A.1 视觉规格逐值核对（对 diff + 工作区现状）

| 票面项 | 实测 | 裁决 |
| --- | --- | --- |
| 边框矩阵·核心 | `strokeWidth=(core?1.5:1)+(sel?0.75:0)`（LineageNodeCard.tsx:63）+stroke `var(--accent)`（:80）实线 | 符合 |
| 边框矩阵·普通 | branch 1 实线（同上，dasharray undefined） | 符合 |
| 边框矩阵·主题 | `dashed=theme\|\|survey`→`'6 4'`（:64,:83） | 符合 |
| 边框矩阵·综述 | `survey=!theme&&isSurvey(n.title)`（:59）→branch 1 虚线 6 4 | 符合（paperId≠null 前置 ✓） |
| 选中 +0.75 | 核心 2.25/其余 1.75+data-selected（visual.test 断言 '2.25'/'1'+'true'/'false' 逐格） | 符合 |
| data-kind 第四值 survey | NodeCard:74 三元；既有 theme/paper 零变（e2e T4 断言面保持） | 符合 |
| foreignObject 换行 ≤3 行 | `foreignObject x=-w/2+12 width=w-24 y=-h/2 height=h`（:86）+TITLE_STYLE（12.5px/18px/-webkit-box/line-clamp 3/box-orient/overflow hidden 全六件） | 符合 |
| title tooltip | `<title>{n.title}</title>` 卡内首子（:73，SVG 原生零依赖） | 符合 |
| rect 白卡 | rx=8+fill #ffffff+无 filter（:77-82） | 符合 |
| 年份行 | 12px var(--text-dim) UI 字体（无 fontFamily style）+「未知年份」兜底（:92-101） | 符合 |
| 三型边色+优先级 | Edges:44-48：survey>`var(--survey-edge)`1.4 虚 2 3＞推断 `#8a94a6`1.2 虚 5 4＞普通 branch 1.2 实；glow 全撤 | 符合 |
| 边 label halo | 白底 stroke #ffffff+fill #4a5060+paintOrder 保留（Edges:66-68） | 符合 |
| 层带三件 | 线 var(--border) 1px 实线+菱形 fill branch+年份标 13px text-dim（Canvas diff:250-253）；「YYYY 年」/「未知年份」逐字保留（visual.test:435 断言 '2020 年'） | 符合 |
| 图例四项文本 | LineageLegend.tsx:26-40 核心文献/普通文献/主题分组/综述关联+data-legend+aria-hidden；CSS pointer-events:none 保留（theme.css .lineage-legend 块尾） | 符合 |
| token 2 新增 | theme.css:1087-1088 `--node-branch:#b8c4d4`/`--survey-edge:#c8cdd6`（:root） | 符合 |
| 夜幕 11 枚保留 | :root 现存 --gold-soft/--gold-bright/--gold-line/--night-bg/--night-bg2/--gold-night/--star/--text-on-night/--text-mid/--text-dim-on-night/--edge-glow=11 枚定义俱在 | 符合 |
| 工具条/fit 白玻璃 | toolbar rgba(255,255,255,0.88)+1px var(--border)+var(--shadow-2)+文字 text-dim/hover text+accent-soft+blur10（theme.css diff:1187-1222）；fit-btn 同族（:1224-1248） | 符合 |
| 侧板白玻璃 | SIDE_GLASS rgba(255,255,255,0.92)+#e4ded1+blur12+var(--shadow-2)（SidePanel:97-104） | 符合 |
| 宿主 .lineage-host | var(--bg)+var(--text)（theme.css:1102-1146）；夜幕四层 radial+星空+✦ 全删 | 符合 |

### A.2 §2 接口逐条

| 接口 | 实测 | 裁决 |
| --- | --- | --- |
| isSurvey 五关键词 | 综述/survey/review/概述/评述 子串+toLowerCase（classify.ts:15,20-23） | 符合 |
| isCore 公式 | paperId≠null∧¬isSurvey∧入度（toNode===id 计数）≥2；出度不计（classify.ts:25-33） | 符合 |
| nodeHeight 公式 | `46+18×clamp(ceil(len×12.5/(nodeWidth−24)),1,3)`（layout.ts:152-156）；三档边界独立复算：12 字=ceil(150/156)=1→64、13 字（220 档 usable196）=ceil(162.5/196)=1→64、16 字=ceil(200/196)=2→82、28 字=2→82、29 字（260 档 usable236）=ceil(362.5/236)=2→82、37 字=2→82、38 字=ceil(475/236)=3→100、空串=1→64——**全八边界数学吻合** | 符合 |
| 综述右列公式 | 列左缘=max(非 surveyCol 节点右缘)+GAP（layout.ts:363-368，surveyCol 排除=树自动+x 覆盖含双覆盖综述）；中心=左缘+半宽（:371）；y=层带强制（:236）；同层错开=cursor 半宽和+SIBLING_GAP（:372-376） | 符合 |
| SURVEY_COL_GAP=80 | layout.ts:121 | 符合 |
| BAND 三常量 | BAND_LEFT=-200（:123）/BAND_RIGHT=99999（:125）/LAYER_LABEL_DY=32（:127）导出，四消费同源 | 符合 |
| Edges props | geom Map+surveyIds（Edges:26-30）；禁每边重扫=Map.get O(1)（:35-36） | 符合 |
| NodeCard props | core ✓；**survey 未作 prop、卡内自算**——见 W2 | 轻偏差 |

**A 节结论：票面 §1.1/§2 逐值零缺项零错值。**

---

## B. 宪法红线

- **分层单向** [N]：classify/layout 纯函数零 DOM/window import（classify.ts 仅 @shared 类型；layout.ts 同）；渲染件仅引渲染层+shared 类型。✓
- **禁 renderer 引 Node API** [N]：生产面 12 件零 node: import；`node:fs/node:path` 仅 tests（vitest Node 侧，theme.test:16-18 同先例）。✓
- **文件 ≤500/组件 ≤250** [N]：wc -l 实测——NodeCard 103/Edges 79/Canvas 198/SidePanel 192/layout **382**（报告值一致）/viewport 165/theme.css 398/canvas.test 457/visual.test 228/layout.test 438/side-panel.test 499/classify.test 94/classify 34/Legend 33——全在限内（side-panel.test 499 见 W6）。✓
- **禁新依赖** [N]：diff 无 package.json/lockfile；foreignObject/line-clamp/SVG title 全原生。✓
- **UTF-8 中文可读** [N]：diff 全文中文无乱码。✓
- **死代码即删** [N]：grep 全仓 `lineage-night|LineageNightDecor|data-night-decor|lg-node-face|lg-edge-glow|NODE_H|lineage-stars|lineage-sparks`——src/tests 命中仅三类合法残留：①注释（theme.css:304/Legend:3/layout:95/viewport:39/SidePanel:95）②visual.test:80-81 **防回归断言**（querySelector('.lineage-night')===null+decor 0 计数——守卫非消费）③无任何代码消费。✓
- **shared 零触碰** [N]：diff 无 src/shared 文件；`src/shared/models/lineage.ts` 原样。✓
- **行数表报告值核实** [D 节并入]：14 文件 wc -l 与报告 §2 逐行**精确一致**（含 382）。✓

**B 节结论：宪法红线零违反。**

---

## C. 代码与测试质量

### C.① 测试假锁攻击（visual 7 it / layout 7 it / classify 8 it 逐个推演）

- **visual.test 7 it 全部具备真红能力**：it1 宿主（回退 .lineage-night→classList 断言红）；it2 四态矩阵（stroke/width/dasharray/data-selected 逐格字面——变异①实证红，mutation-1.log exit=1 恰 1 it 红）；it3 残留 0 计数（defs/corner/filter/`[filter]` 四查询——重引入任一即红）；it4 foreignObject（在场+textContent+三样式字面+源码锁 WebkitBoxOrient+高 100+title——变异②实证卡高红，mutation-2.log 含 canvas:388 height '101'≠'100'）；it5 层带（border/dasharray null/tick fill/label fill+**style 不含 font-display 负断言**+'2020 年'）；it6 边三型（精确 stroke/width/dash+filter null×2+优先级用例 label「综述关联（推断）」锁 survey>inferred——优先级翻转变 stroke='#8a94a6' 即红）；it7 图例四文本+aria-hidden（回旧文案「实链/推断」即红）。
- **layout 7 it**：nodeHeight 3 it（八边界双向断言——变异②实证 3 it 红）；综述右列 it1（列左缘不等式+**变异③锚 P.x===C1.x**——mutation-3.log 实证 expected 90 received 200 红）+it2 **精确值 610**（=treeRight440+GAP80+半宽90，手算独立复算吻合——GAP 变异必红点，见 W3）+it4 覆盖综述 toEqual({50,60})；it3「同层多综述」**在旧代码上亦绿**（首红日志 layout 仅 5/7 红、it3 不在列）——间距不等式+输入序两断言旧树布局巧合满足，对「右列语义」非独占锁定（W5）。
- **classify 8 it**：五关键词逐词+大小写三态+阴性三例（含空串）；isCore 入度 1↔2 双向边界+综述/主题排除+出度 5 不计+toNode 精确匹配——断言面完备；首红形态=文件级（N2）。
- **rgb() 断言弱于原 hex？**——不弱：side-panel.test:319-327 锚 `rgb(228, 222, 209)`/`rgb(255, 255, 255)` 为 jsdom CSSOM 对源码 hex `#e4ded1`/`#ffffff` 的**确定性归一**（同值异形），且源码侧 SIDE_GLASS/NOTE_CARD 保留 hex 字面——运行时锚+源码锚双层，变异（改 hex）必红。✓
- **源码形态锁路径解析可靠性**：`join(process.cwd(),'src/.../LineageNodeCard.tsx')`（visual.test:150）——`npm run test`（vitest root=repo 根）恒成立；若 cwd 漂移→readFileSync 抛错→it 红（**fail-closed 失效模式**，不会假绿）。可接受（N3）。

### C.② auto-fit 3 it 恒等推算独立复算

chain 夹具三题名「扩散模型起点」6 字/「主题分组」4 字/「最新进展」4 字——全 ≤12 字→nodeWidth=180、usable=156：
- 6 字：75/156=**0.481**→ceil=1；
- 4 字：50/156=0.3205→ceil=1；
三题名全 1 行→nodeHeight=46+18=64=旧 NODE_H、半高 32 恒等→fitViewport y 包围盒逐位不变→transform 数值不变。**恒等结论成立**。但实现者报告 §4 写「6 字=ceil(0.962)=1」——0.962 系 12 字情形（150/156）误植，6 字实值 0.481；结论侥幸同向（均 ceil=1），报告数学笔误记 **W1**。

### C.③ 综述右列实现 vs 票面四要素

分流断链（layout.ts:212 survey 触及边 continue 先于 broken 判定→不计 dropped 不 warn ✓）/列左缘 max（:363-368 排除面=非综述自动+覆盖节点含双覆盖综述 ✓）/同层错开（:372-376 cursor=前中心+半宽+SIBLING_GAP，相邻中心距≥半宽和+SIBLING_GAP ✓）/双覆盖分支（:196-198 x∧y 均非 null 不入 surveyCol→:243-244 覆盖值原样，it4 toEqual 实证 ✓）。单 x 或单 y 覆盖综述→强制入列（y 覆盖被层带覆盖吸收）——票面字面（「x/y **均**非 null 除外」）逐字实现，自裁 4 已申报。**四要素全符合。**

### C.④ geom Map O(n) 声明核实

Canvas:61-69 布局后一次遍历 nodes 建 `Map<id,{x,y,halfH}>`（O(n)）；Edges:35-36 每边 Map.get O(1)——「禁每边 O(n) 重扫」达标。三 useMemo（geom:61/surveyIds:71/coreIds:76）依赖数组正确（[nodes,layout]/[nodes]/[nodes,edges]）。coreIds 构建为 O(n×E)（isCore 逐节点扫边）——票面红线仅约束 Edges 端点面，非违例（画布规模无虞）。✓

### C.⑤ INV-38 登记与实现一致性

invariants.md INV-38 行（diff:9）：卡高公式/三消费（NodeCard rect/Edges 经 geom/viewport fitViewport）/NODE_H 已删/BAND 三常量单源/综述右列四要素/classify 公式——与 layout.ts:152/viewport.ts:55-59/NodeCard:86/Canvas:61 逐点对得上；「禁任一处手写档值」当前全仓无第二处卡高档值（grep NODE_H 仅注释）。✓

---

## D. 报告诚实性（自裁 11 项逐条对 diff）

| # | 自裁项 | 核实 | 裁决 |
| --- | --- | --- | --- |
| 1 | 拆 visual.test（locks 163） | eslint.config.js:29-32 max-lines 500 error+skipBlank/skipComments；:188 豁免 glob `tests/**/*.ts`+`**/*.test.ts` **确不含 .test.tsx**；manifest grep '"path"'=163 ✓ | 属实 |
| 2 | hex→rgb 等价断言 | side-panel.test:319-327；视觉值零变 | 属实 |
| 3 | 源码形态锁+process.cwd | visual.test:148-153；theme.test:110-121 B1 形态锁先例在（但其路径为 import.meta.url——技法先例成立、路径构造系 jsdom 正当偏离，注释已声明） | 属实（先例措辞略宽，N3） |
| 4 | 综述 y 覆盖边缘 | layout.ts:236 `!surveyCol.has(n.id)` 守卫实测；未单测申报在案 | 属实 |
| 5 | h3/p 衬线连带摘除 | SidePanel:165-172（h3/p 无 fontFamily/letterSpacing） | 属实 |
| 6 | Board 重试按钮浅色化 | Board:159-165 accent-soft/accent；pending-link 条实测已是 var(--panel)/var(--accent) 浅色零改 ✓ | 属实 |
| 7 | fillOpacity 0.5 保留 | Canvas diff:240 | 属实 |
| 8 | 变异③假阴性→补强 | mutation-3.log 红点=layout.test:377（补强锚本身）；夹具「唯一非综述子」事故记述与 it1 注释（:369-370）互证 | 属实 |
| 9 | Canvas 198 vs 预估 190 | wc=198 ≤250 硬线 | 属实 |
| 10 | 非本人改动声明 | git status：registry.ts M（工单条目 open+SR2-F-09 行尾逗号——diff:1817-1819 佐证）+f1-out 未跟踪遗留 | 属实 |
| 11 | 删减面自查 18 文件 | 22 diff 文件−4 新增（Legend/classify/classify.test/visual.test）=18 tracked 变更，git status 佐证（17 M+1 D+4 A） | 属实 |

- **行数表**：14 文件 wc -l 逐行精确一致（含 layout.ts=382——票面预估 369、实际 382 仍在 ≤500 内且报告如实申报实际值）。
- **locks 163**：manifest 计数 163=报告；票面预测 162 差 1 由自裁 1 解释闭环。
- **「e2e 零改」**：tests/e2e/lineage.spec.ts **不在 22 文件 diff 中** ✓；进一步攻击——e2e 夹具题名「脉络根文献/脉络甲文献/脉络乙文献/阶段分组」**均不含综述五关键词**→新布局不迁移其节点；全 1 行题名→nodeHeight=64=NODE_H→T1/T2 transform 数值断言面数学恒等（N4）。e2e 未在本单跑（verify 不含 e2e，票面归主控收口段真机复评——非缺口）。
- **未申报项 1 处（W2）**：票面 §2.4 字面「props 增 survey: boolean」——实现在卡内自算（NodeCard:59），代码头注有说明但报告自裁段未列。
- **报告小瑕 2 处（W1/N7）**：恒等推算 0.962 笔误；「改（13）」表头 vs 表体 14 行差一。

---

## E. 接缝与后续单

- **E.① 兼容声明核实** [N]：拖拽（dragRef/offset 链 diff 零触碰）/选中（selected prop+data-selected 原样）/右键（onContextMenu 原样）/pan-zoom（viewport 控制器仅换 BAND_LEFT import 源）/auto-fit（唯一行为面=半高 nodeHeight 化，INV-38 第三消费既定）/transform 串 `translate(${tx}, ${ty}) scale(${k})` 逐字符保持（Canvas diff:225）。手工覆盖位语义：非综述路径零变；综述双覆盖零变；单轴覆盖综述入列=票面新定义面。✓
- **E.② U2b 接缝** [N]：geom Map（id→中心+半高）为泛化边几何面，任何新边型（ref 边）可直接消费免重扫；综述关联边样式（淡灰虚线 2 3）与 ref 边「很淡的灰虚线」语义同族——渲染层无需再动。预留充分。
- **E.③ 遗留池新候选** [N6]：a) `-webkit-line-clamp/-webkit-box` 前缀组合仅源码形态锁守（运行时 jsdom 不可断言）——标准无前缀 line-clamp 落地时迁移；b) jsdom 序列化两盲区（WebkitBoxOrient 静默丢弃+hex→rgb 归一）宜固化为测试基建先例档（现仅散在两测试注释）；c) isSurvey 否定语境误判（「唯一非综述子」活证据）已由 D2 票预留——建议 D2 票面引用本事故；d) side-panel.test.tsx 499/500（W6）；e) W4 重试按钮内联压 hover；f) W5「同层多综述」精确值补强。

---

## 票面类型附加审项（CSS 皮肤类——methodology §4.2）

- **① 内联恒压类**：
  - [W4] **Board 重试按钮**（LineageBoard.tsx:158-165，.lineage-toolbar 直子 button）内联 `style={{background:'var(--accent-soft)',color:'var(--accent)'}}` 恒压 `.lineage-toolbar > button:hover`（theme.css:1213-1217 color text+background accent-soft）——内联样式特异性高于任何类选择器（含伪类），hover 换色静默失效（背景值恰同 accent-soft，仅 color 不响应）。**形态=B1 教训同型**，但系旧形态平移（改前 gold-soft/gold-bright 内联同样压死 hover），非本单引入的回归；票面「行为零变」兑现。登记供后续清账（候选：皮肤迁类或显式接受）。
  - **fit 按钮**（Canvas:186-194）：纯 className="lineage-fit-btn" 无内联——`:hover` 有效，无恒压问题。✓
  - **pending-link 条**（Board:174-181）：内联 style 但不处任何类 hover 域；取消按钮仅 underline 类——无冲突。✓
  - **Legend**：pointer-events:none+aria-hidden 非交互——无态可言。✓
- **② selected 态** [N9]：NodeCard 的 stroke/strokeWidth/strokeDasharray 为 **SVG 展示属性**（attribute 非 CSS）+data-selected 标记；全仓无 CSS 规则靶向节点 rect——CSS 级联不参与，**无特异性问题，证实**。选中视觉变更全在属性层（+0.75 矩阵），测试以 getAttribute 字面锁定。
- **③ disabled 态遗漏扫描** [N8]：fit 按钮空图不渲染（无 disabled 语义面）；工具条三按钮（添加/导入/重置）无 disabled 属性消费；重试按钮仅条件渲染；侧板三件静态展示——本单零新增 disabled 面，无遗漏。

---

## 对主控预裁 6 项的意见

1. **自裁 1（拆 visual.test）——维持**。豁免 glob 实证不含 .test.tsx+max-lines 500 error 配置在案；拆分为唯一不放宽红线的处置；locks 163 对账绿。
2. **自裁 2（rgb() 等价）——维持**。CSSOM 归一确定性映射，源码 hex+运行时 rgb 双层锚，弱化不成立。
3. **自裁 3（源码形态锁+process.cwd）——维持**。theme.test B1 形态锁先例实证（theme.test:110-121）；路径偏离有因有注；失效模式 fail-closed（cwd 漂移→抛错红，非假绿）。
4. **自裁 4（综述 y 覆盖边缘）——维持**。票面字面实现+拖拽写路径 x/y 同写实证不受影响；未单测=票面测试面亦未列（与 W5 同域，可随 W5 一并补强）。
5. **自裁 5/6（衬线连带+重试浅色化）——维持**。「脉络域夜色消费清零」grep 实证：lineage 目录夜 token 消费=0（仅 SidePanel:95 注释提及「退役」）；h3/p 金字/衬线在白底功能性不可见的连带摘除与重试按钮同范围解释成立，均申报在案。
6. **变异③处置——维持**。补强断言（layout.test:377 P.x===C1.x）红证在 mutation-3.log 精确落点；属受锁改写范围内加固正当。**附带 W3**：票面 §8.1 处方第三变异「综述列 GAP 消除」未执行（替换为分流行删除）——处方变异的红点由 it2 精确值 610（colLeft=440+**80**）数学锁定，检视级信心高，但变异级证据缺该处方项。

---

## 发现明细汇总

| # | 级 | 摘要 | 证据 |
| --- | --- | --- | --- |
| W1 | W | 实现者报告恒等推算数学笔误：「6 字=ceil(0.962)」实为 0.481（0.962 系 12 字值误植）；结论不受影响，独立复算恒等成立 | impl.report §4 vs layout.ts:152-156 手算 |
| W2 | W | 票面 §2.4「props 增 survey: boolean」未按字面实现——卡内自算（单源保持、行为等价、代码头注有说明），但自裁申报段未列该接口偏离 | brief §2.4 vs LineageNodeCard.tsx:59 |
| W3 | W | 票面 §8.1 处方第三变异「综述列 GAP 消除」未跑（替换为综述分流行删除且申报了假阴性处置，但未申报替换处方本身）；处方红点由 layout.test:390 精确值 610 数学锁定 | brief §8.1 vs impl.report §3/自裁 8 |
| W4 | W | 重试按钮内联 style 恒压 .lineage-toolbar>button:hover（hover 换色静默失效，B1 同型）；旧形态平移非本单回归，登记后续清账 | LineageBoard.tsx:158-165 vs theme.css hover 规则 |
| W5 | W | layout.test「同层多综述」it 在旧代码亦绿（首红 5/7 可证）——对右列语义非独占锁定；候选精确 x 值补强 | firstraw.log FAIL 清单（it3 不在） |
| W6 | W | side-panel.test.tsx 499/500 物理行——距拆分红线 1 行，下次受锁改写大概率触发自裁 1 同型拆分 | wc -l=499；eslint max-lines 500 |
| N1 | N | 变异日志中视觉 its 驻拆分前 canvas.test 位置——it 内容原样迁移，证据有效；时序（变异 17:43-17:49→拆分→manifest 09:52Z）自洽 | mutation-*.log vs manifest generatedAt |
| N2 | N | classify.test 首红=文件级导入红（867=875−8 可证整文件未收集），非断言级——纯函数边界断言双向完备，检视级强度足 | firstraw.log 汇总行+classify FAIL 行 |
| N3 | N | theme.test B1 先例实为 import.meta.url 构造——「先例」指源码形态锁技法成立，process.cwd 系 jsdom 环境正当偏离（有注、fail-closed） | theme.test:20-23,110-121 vs visual.test:148-153 |
| N4 | N | 「e2e 零改」三重核实：不在 diff+夹具题名无综述关键词+全 1 行题名 nodeHeight 恒等→transform 断言面数学不变 | lineage.spec.ts:82-84+本报告 C.② |
| N5 | N | U2b 接缝：geom Map 泛化边几何面+综述关联边样式与 ref 边语义同族——预留充分 | LineageCanvas.tsx:61-69 |
| N6 | N | 遗留池候选五项：前缀组合无运行时锁/jsdom 两盲区固化/isSurvey 否定语境（引「唯一非综述子」事故）/W4/W5 | E.③ |
| N7 | N | 报告「改（13）」表头与表体 14 行差一（笔误）；清单本体与 22 文件 diff 对账一致 | impl.report §2 vs diff 文件清单 |
| N8 | N | disabled 态扫描：本单零新增 disabled 面，无遗漏 | 附加审项③ |
| N9 | N | selected 态=SVG 展示属性层，无 CSS 级联参与——特异性免疫证实 | NodeCard:76-84 |

---

## 总评

**PASS（B_0 / W_6 / N_9）**。票面 §1.1 视觉规格与 §2 接口逐值零缺项零错值；宪法红线（分层/行数/依赖/死代码/shared 零触碰/UTF-8）全绿；测试锁面经三变异红证+独立复算（nodeHeight 八边界、auto-fit 恒等、右列精确值 610）攻击后无假锁；报告诚实性高（行数表/locks/自裁 10.5/11 项核实属实，2 处小瑕+1 处未申报接口偏离均为 W 级）。六项 W 均不阻断收口：W1/N7 报告笔误类、W2/W3 票面字面偏离但行为等价且有等价强度锁定、W4-W6 遗留池清账候选。建议主控收口时将 W2/W3 补入收口单申报栏，W4/W5/W6 记遗留池。
