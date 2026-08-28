# R2-LG9 门一对抗深审 —— 脉络「命之座星象板」视觉重制

> 联审代理（GLM-5.3）。只读仓库；输入=gate1.diff(675行)+母本三件+impl.report+三日志+终态源码五件。
> 统计行：**B:0 / W:1 / N:6 —— 放行提交（附 W1 交门二裁决）**

## 0. 会话开工纪律（技能清点）

- `code-review-excellence` 用（门一对抗深审核心）；`frontend-design`/`frontend-ui-engineering`/`canvas-design` 用（视觉规范逐值对照+SVG 渐变/滤镜语义）；`e2e-testing-patterns` 用（lineage.spec 结构断言复核）；`verification-before-completion` 用（TDD 证据链/退出码核验）。`systematic-debugging` 不用（纯审查无调试面，不跑命令）；`test-driven-development` 不用为流程（不写实现），其知识用于核验首红/变异证据形态自洽性。配置自查：只读审计角色，无子代理派发。

## A. 视觉规范符合度终验（diff vs mockup v2 逐元素）

逐值对照 `docs/design/mockups/lineage-constellation.html`（v2）与实现（diff+终态源码+theme.css 213-320 段）：

| 元素 | mockup v2 | 实现 | 裁决 |
| --- | --- | --- | --- |
| 夜幕渐变+星云 | body 4 层背景（1150px 520px at 72% -8% rgba(86,108,178,.30) 62% / 880px 460px at 8% 112% rgba(64,84,148,.26) 62% / 600px 300px at 50% 55% rgba(120,96,60,.07) 70% / linear 180deg night-bg→night-bg2） | `.lineage-night` 四层逐值誊录 | ✓ 逐值 |
| 星空层一（细星） | 5 点 radial（1.1/0.9/1.2/0.8/1.1px）720×260 tile opacity .55 | `.lineage-stars` 五点逐值+同 tile+0.55 | ✓ 逐值 |
| 星空层二（亮星） | 4 点（金 227,201,143 .8/.75 + 蓝 222,230,255 .9/.85）820×300 opacity .6 | `.lineage-stars2` 四点逐值 | ✓ 逐值 |
| ✦ 四芒星 | 4 枚（180,120 / 920,90 8px / 1080,420 9px / 260,660 8px）1280×800 px 位 | 百分比（14%,15% / 72%,11% / 84%,52% / 20%,82%）+8/9px | ✓ 等值换算（180/1280=14.1%、120/800=15% 等，响应式适配优于固定 px） |
| 节点渐变三停+165° | linear-gradient(165deg, node-face-hi 0%, node-face 58%, #1e2745 100%) | `#lg-node-face` x/y=(0,0)→(0.26,1) 三停 0/58/100% | ✓（向量 (0.26,1) 归一化 (0.253,0.971) vs CSS 165° (0.259,0.966)——数学等价，注释已自证） |
| 主题节点面 | linear-gradient(165deg, rgba(43,55,96,.6), rgba(30,39,69,.5)) dashed | `#lg-node-face-theme` 两停逐值+dasharray 6 4 | ✓（描边色见 N2） |
| 角饰 L 形 | ::before/::after 12×12 border 1.5px rgba(207,174,114,.55)，左上/右下，外角 14px 圆角 | CORNER_TL/BR path 臂长 12 骑 ±0.5px 外缘，stroke 1.5 opacity .55 | ✓ 形状/臂长/位逐值（直角 L 近似圆角 L——N4） |
| 题名色 | .t=var(--text-on-night)=#e9e6db | **#f5f3ea** | ✓ 票面 P2/v2 评审要点明文优先（N3 记录） |
| 年份衬线金 | Georgia 15px gold-bright ls1.5px | --font-display 15px --gold-bright ls1.5px y=16 | ✓ 逐值 |
| 描边金系 | border rgba(207,174,114,.42) | stroke --gold-night strokeOpacity .42 | ✓ 等值（token=同色） |
| 选中态 | border gold+0 0 30px edge-glow | strokeWidth 2.5+strokeOpacity 1+filter lg-edge-glow | ✓ 滤器复用（票面明文） |
| 层带线 | .band --band-line 1px（rgba .12） | line stroke --band-line strokeWidth 1 无 dasharray | ✓ 逐值（票面 P3 写「--gold-line 12%」为笔误——gold-line=.10，band-line=.12，实现取 band-line=mockup 逐值，正确） |
| 菱形刻度 | ::before 6×6 rotate45 rgba(207,174,114,.5) | rect 6×6 rotate45 --gold-night fillOpacity .5 translate(-197, y-3) | ✓ 等值（中心对齐线） |
| 层带年份标 | .yr 衬线 14px ls2px gold-bright，置于线左 | text -190 衬线 14px ls2px --gold-bright | ✓ 逐值（可见性见 N5） |
| 实链边 | #cfae72 opacity .8 width 1.7 + glow | --gold-night .8 / 1.7 / url(#lg-edge-glow) | ✓ 逐值 |
| 推断边 | #9aa3c0 opacity .6 width 1.3 dasharray 5 4 无辉 | 逐值+label 含「推断」判定 | ✓ 逐值（判定语义=mockup 边型归类等价） |
| glow 滤器 | stdDeviation 2.6，x/y -40% w/h 180% | 逐值 | ✓ |
| 边 label | .edge-label 玻璃胶囊（bg .88+金边+blur6） | paintOrder halo（--night-bg2 3.5px round）近似 | ✓ 票面「可被胶囊替代」字面（N4，已申报） |
| 图例两型 | 实链金 1.6px / 推断虚线 #9aa3c0；胶囊底 rgba(34,44,77,.6)+blur8+边 .22 | `.lineage-legend` 全逐值+两型文本逐字 | ✓（位置 96px vs 110px——N1） |
| 工具条 | rgba(34,44,77,.78) blur10 边 rgba(207,174,114,.28) shadow 0 6px 24px .4 圆角 12 | `.lineage-toolbar` 逐值 | ✓ 票面 P1 要求的 blur+金 hairline 达成（位置——N1） |
| badge 文本 | .badge「已绑定文献」 | **不落画布** | ✓ 主控预裁（T4 strict 单源） |

**A 结论：主控预裁清单（三层星空/层带金线刻度/L 角饰/渐变/glow/图例/工具条玻璃/badge 不落画布）全数达成，逐值面无缺项。**

## B. e2e 兼容性独立复核（结构相关断言逐处）

独立重读 `tests/e2e/lineage.spec.ts`（513 行）+`workspaces.spec.ts:56`，逐断言核：

- T1:197/199+workspaces:56 空态文案：`<text>` 元素保留（仅 fill 换 token）✓；T1:165 `svg g[data-node-id]`+hasText：g 结构/题名 text 保留（拆件后仍在 svg 内）✓
- T1:204-205 `getByText('2022',{exact:true})`：纯数字年份 text 单源=节点卡（层带「2022 年」整文≠「2022」不撞 exact）✓；T1:206 `getByText('2020 年')`：层带标单源（节点卡纯「2020」不含「年」）✓ 文案逐字
- T1:208/239、T3:344 `svg path[data-edge-id]` count 2：每边恒一 path（label 空串只省 text）；defs/filter 元素不带该钩 ✓
- T1:213-225 svg boundingBox+pan 起点：宿主 div 包裹不改 svg 盒（h-full w-full 同区）；**落点命中链独立推演**——装饰四容器（stars/stars2/sparks/legend）全 `pointer-events:none`（sparks 子 span 靠继承覆盖）→ 穿透至 svg → target=`rect[data-panbg]`（fill="transparent" 非 none，visiblePainted 可命中——原机制保留）✓；pan 点 (30, height-40) 不落图例区（left≥96px）且图例本就穿透 ✓
- T1:222/233 `g[data-viewport]` transform 正则：模板逐字未动 ✓；T2:263-274 parseTranslate `^translate\((-?[\d.]+), (-?[\d.]+)\)$`：节点 g transform 模板逐字未动 ✓
- T2:265-270 rootG.boundingBox() 中心拖拽：角饰 tl/br 对称外扩（±0.5+stroke 0.75），盒中心偏移 ≤1px，tolerance closeTo(2)/≤2 内容纳 ✓
- T2:290/308 data-kind=theme：属性保留 ✓；T3:342/370-373 save-status/retry：Board 工具条仅样式类替换，testid/条件渲染/role=alert/文案零变（终态源码核对）✓
- T4:483 `getByText('已绑定文献')` strict：画布五件 grep 无此文本（NodeCard 头注明示预裁）✓ 单源在侧板（本单零触碰）

**B 结论：实现者「零必然红」成立——独立验证与 e2e-full.log 25 passed（lineage T1-T4 全 ok：2.3s/2.6s/3.3s/8.0s）+baseline 4 passed（改前亲跑，CSS 26.06kB→30.37kB 证为旧构建）三源互证。**

## C. 渲染性能与正确性

- **defs 重复/id 冲突**：defs 在 LineageCanvas svg 顶层单份（lg-node-face/lg-node-face-theme/lg-edge-glow），LineageNodeCard 仅 `url(#id)` 引用不自带 defs——无每节点重复定义、无多节点同 id 冲突；单窗口单画布实例无跨 svg 冲突面 ✓
- **星空在 zoom/pan 下行为**：装饰层驻宿主 div（viewport 外），pan/zoom 只动 `g[data-viewport]` transform → 装饰不随图移动=「夜空背景」语义，与 mockup（stars 驻 body 级）一致、与注意事项⑥「装饰不参与布局」自洽 ✓
- **✦ pointer-events:none 落实**：CSS `.lineage-stars,.lineage-stars2,.lineage-sparks{pointer-events:none}`+.lineage-legend 同；组件面 data-night-decor+aria-hidden=true 四容器齐（unit it 1 锁定）；sparks/legend 子元素经继承覆盖 ✓（B 节命中链推演+e2e pan/拖拽全绿双证）
- **性能**：静态 CSS 多层背景一次合成；backdrop-filter 仅工具条+图例两处小面；无动画/无每帧重排 ✓
- **绘制顺序**：decor（absolute）→svg（relative，DOM 序在后）——svg 透明底，星空透出；层带线与图例无同 y 重叠（图例 bottom 16px，层带在布局系 y≤~300）✓

## D. 宪法红线

- **行数**（wc -l 实测）：Canvas 245≤250 ✓ / NodeCard 83 ✓ / NightDecor 35 ✓ / Edges 73 ✓ / Board 229≤250 ✓ / theme.css 320≤500 ✓——报告数字与实测全符
- **受锁**：lineage-canvas.test.tsx sha256 实测 `57ee768f…25143` == locks/manifest.json 登记值 ✓（工作区与 manifest 同步）；verify.log `locks:check 152 一致` ✓；时间序 unlock→改→apply（manifest generatedAt 18:54:50 晚于改动，verify 在后全绿佐证）✓。**[locked-change] 尾注=主控收口提交时落**（门二清单②）
- **UTF-8**：五源码件+测试中文/✦ 全可读；quality 关卡「无乱码」过 ✓
- **TODO/FIXME/placeholder**：quality 关卡过+本审计 grep 抽验无匹配 ✓
- **TDD 四档**：①绿=verify 832 passed/102 文件（基线 827+5 新 it 对账吻合）VERIFY-EXIT=0 ✓；②退出码落盘 ✓（verify/e2e-baseline/e2e-full 三档真退出码）；③首红（5 failed|15 passed）与④变异红证 ×2（1 failed|19 passed×2+RESTORE-DIFF-EMPTY）——**形态自洽性独立验通过**（五新 it 对旧实现逐条推演必红：旧无 .lineage-night 父/无 defs/无 corner/层带 dasharray '4 6' 非 null/stroke accent 非 gold-night；变异 1 删 defs→querySelector null 红、变异 2 删 tick→length 0≠3 红，均为唯一红且不伤及他 it——数目自洽），但**原始日志未落盘** → **[W1]**（见下）
- **e2e 基线**：改前 4 passed 亲跑留证 ✓（先基线后实现时序成立）

## E. 母本符合度+报告诚实性（8 项自裁逐条裁）

| # | 自裁 | 独立裁决 |
| --- | --- | --- |
| 1 | badge 不落画布（票面字面 vs e2e 红线） | ✓ 正确取舍=主控预裁，画布无「已绑定文献」文本实证 |
| 2 | 色值字面直引+token 全消费 | ✓ 逐一核：字面值均 mockup 逐值；消费的 8 个 token 全在 theme.css :root（R3-TH1 铺）存在，无复写 |
| 3 | 尺寸微调清单 | ✓ 逐项与 diff 符；「e2e 无 rect 尺寸/rx 断言」经 spec 重读证实 |
| 4 | 胶囊以 halo 近似 | ✓ 票面「可被」字面+理由成立（SVG 无文本测量原语，getBBox 破纯渲染）；data-edge-label 保留 |
| 5 | Board 触碰（主裁优先） | ✓ 终态核对=纯样式级，行为/testid/文案/状态机零变；报告诚实（含「重试按钮 accent-soft→gold-soft」） |
| 6 | 图例 svg 前渲染 | ✓ 绘制序推演无视觉损（svg 透明底） |
| 7 | typecheck 修正 decor?.length | ✓ 非断言放宽（null 安全修正，断言语义不变） |
| 8 | 两拆件 | ✓ 行数红线强制+先例援引正确 |

**未申报面扫描**：git status 6 修改+2 新建源码与 gate1.diff 完全一致；audits 新增均为本单合法产物（brief/report/diff），r2-lg10/r3-*-brief 系主控预备票非本单产物——**零未申报源码面** ✓。报告行数声明（245/83/35/73/229/320）与实测全符 ✓。

## 发现清单

- **W1（唯一 W）**：TDD 首红与变异红证的**原始控制台输出未落盘**——本单 audits 仅有 verify/e2e-baseline/e2e-full 三日志，无 r2-lg9-red.log/r2-lg9-mutation.log；先例（lg01~05/ai06~10/f01~04）均落。报告为文字自述，门一无法复核原始形态（自洽性推演已由本审计补做并通过，但「每个测试必须能失败一次」的举证责任在实现者）。票面文化层「cp 备份还原落盘」字面含糊是缺口成因之一。**处置建议：门二裁量——(a) 主控低成本亲验重现（临时删 defs 跑单测一条即证）或 (b) 接受本审计的形态自洽推演+全量绿，收口单记录证据缺口教训（后续票面明写「首红/变异日志落盘」）。**
- **N1**：图例 left 96px vs mockup 110px、工具条保持左上 vs mockup 顶中居中（padding 6/10 vs 8/14）——票面只裁「玻璃化（blur+hairline）」未裁位置，实现取最小改动；差异未在自裁中点名。视觉等价级，交用户验收面裁量。
- **N2**：主题节点描边银 #9aa3c0 虚线=票面 P2 明文「虚线银」，mockup 字面为金 rgba(207,174,114,.42) 虚线——票面优先于 mockup 字面（且与推断边银语义呼应），合规记录非缺陷。
- **N3**：题名 #f5f3ea=票面 P2/v2 评审要点明文，mockup .t 字面 --text-on-night——同上票面优先，合规。
- **N4**：角饰直角 L 近似 mockup 外角 14px 圆角 L；边 label halo 近似玻璃胶囊（自裁 4 已申报）——SVG 原语边界内的合理近似。
- **N5**：**层带年份标（x=-190）与菱形刻度（x=-197）在初始视口（tx=0）位于屏幕左侧外，不可见**——既有布局行为（原实现 text x=-190 同位），根因=无 auto-fit（LG-10 票面 P6 明确单独票）。后果：P3「衬线年份标/刻度」的视觉交付在当前视口语义下需 pan 左移或待 LG-10 auto-fit 才可见；层带金线本身横贯可见。**明示主控：用户验收「星象板」时年份标不可见属视口问题非本单实现缺陷，勿在收口叙述中承诺「年份带仪式感立现」。**
- **N6**：pending-link 提示条（LineageBoard:170-179）与保存失败条仍亮面板色（--panel 底/--danger 边）——夜幕上观感突兀；票面未涵盖（P1 只裁工具条），建议 R2 第二票（侧板夜化）顺带统一，本单不算缺项。

## 门二四清单

1. W1 处置裁决（亲验重现 or 接受推演+记录缺口——见上）
2. 提交须带 `[locked-change]` 尾注（lineage-canvas.test.tsx+locks/manifest.json 两件受锁）
3. staging 显式列文件：`src/renderer/features/lineage/{LineageCanvas,LineageNodeCard,LineageNightDecor,LineageEdges,LineageBoard}.tsx`+`src/renderer/shared/theme.css`+`tests/unit/renderer/lineage-canvas.test.tsx`+`locks/manifest.json`+本单 audits 产物（brief/report/gate1.diff/本档/三日志）——**勿混入 r2-lg10-brief.md/r3-lib-brief.md/r3-rdr-set-brief.md（主控预备票，非本单）**
4. N5 用户预期管理（验收叙述勿含「年份带即可见」）+N1 位置差异是否转 LG-10/第二票顺带

## 成本账本行

- 实现者：≈3.84M tok / 10.4 min（主控口径）
- 门一联审（本代理，GLM-5.3）：≈0.35M tok / ≈12 min（自报粗估：五输入件+spec/test 全文+三日志+逐值对照推演）

## 放行裁决

**PASS——放行提交（附条件：W1 交门二按上述 (a)/(b) 裁决；其余 N 项均非阻断）。**
视觉规范符合度（A）逐值无缺项、e2e 零必然红独立证实（B）、渲染正确性（C）无缺陷、宪法红线（D）除 W1 证据链外全过、报告诚实性（E）8/8 属实+零未申报面。
