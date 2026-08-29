# R2-SH2 门一对抗深审报告（三屋·ADR-0017）

> 审者：门一子代理 / 模型 builtin:bigmodel-coding-plan/GLM-5.3（思考等级 default，首行已自报）
> 只读审查，唯一产物=本报告。基线锚 HEAD=5ae8620 / verify 基线 107 文件 888 用例 / locks 166 / e2e 26。

## 开工记录·技能清点（会话开工纪律）

- **code-review-excellence：用**——本单本体（对抗深审 A~E 全工单）。
- **verification-before-completion：用**——报告前对锁 hash/行数/消费面独立复算（非信任日志）。
- **systematic-debugging / TDD：不用**——只读审查无实现/无调试面（证据链已由实现者/主控落盘，门一做交叉验证）。
- **browser 类（devtools/webapp/e2e-patterns）：不用**——铁律禁 npm test/verify 与浏览器操作；e2e 证据以实现者/主控落盘日志+断言面静态推演为审面。
- 其余（DB/云/SRE/Git 工作流）：不用——纯 renderer 壳层+CSS 审查。
- 配置自查：门一无子代理派发；自身模型/思考等级首行自报。

## 0. 统计

| 维度 | 数 |
|---|---|
| 审查输入 | diff 8 文件（manifest/App.tsx/library.css/theme.css/app-shell/r3-rdr-set-visual/theme.test/registry）+票面+实现者报告+日志 5（firstraw/mut-1/2/3/verify）+e2e log |
| 独立复核项 | sha256×3（全 match）/行数×6/grep×8（brand 残留、font-display、gold-night、Synapse 唯一性、祖先组合器、workspaces 断言、Toast 定位、.app-header 族） |
| 判定 | **PASS（无回炉）**，附 1 项收口硬条件（N1）+1 项真机高危提示（W4 升格） |
| 发现 | N×3 / W×4 / B×0 |

时间线（文件 mtime）：firstraw 19:58 → mut-1 20:01 → mut-2 20:02 → **verify 20:03** → e2e 20:04 → 实现者报告 20:06 → **mut-3 20:11（主控 W2 变异态）** → manifest relock 20:11:47 → gate1.diff 20:12。

## A. 母本符合度（决4/决5 逐值）

### 决4 顶栏身份区——5/5 逐值符合

| 母本要求 | 终态实证 | 判 |
|---|---|---|
| h-11=44px 定值 | theme.css:78 `.app-header{height:44px}`（票面预裁1 上限裁量兑现） | ✓ |
| logo+应用名 | App.tsx:138-142 svg（迁自 brand，资源不删）+`.app-header-name`「Synapse」 | ✓ |
| 切换器迁位（本体零改） | App.tsx:145-147 wrapper 迁挂；diff 8 文件无 WorkspaceSwitcher.tsx；props dirty/onManage 原样 | ✓ |
| 侧栏品牌行删+ver 随迁 | `.app-nav-brand` 行整删（App+CSS 双面）；ver v0.1 迁 header 右区（预裁2 margin-left:auto） | ✓ |
| 根布局 | `flex h-full flex-col`+内容行 `flex min-h-0 flex-1`——F-05 面带高度约束 | ✓ |

### 决5 衬线清零——全符合（含票面漏项补做）

- 五类消费位清零：theme.css grep `font-display` 仅余 :34 `:root` 定义行（决5 原文「定义保留」）——**src 全仓消费=0 实测**。
- lib 三处（lib-card-year/lib-detail-title/lib-detail-v-serif）：三块终态直读完整、无 font-family、选择器行无残缺（主控 sed 事故修复后终态完好）。
- token 定义 :root 保留 ✓；gold-night 定义删除（src 零定义，仅 2 处历史注释提及非消费：theme.css:7 退役说明+LineageSidePanel.tsx:95 退役说明——正当历史记录）。
- rdr-num tabular-nums 保留 ✓（diff 只删 font-family 行）。
- 母本清单 vs 票面清单：handoff-v3 §4 决5 明文「lib 衬线年份/页码/设置节标/品牌位/脉络年份」——**lib 三处本就在母本语义内**，票面五类清单（全在 theme.css）为收窄誊录；主控 W2 压缩票补做=向母本收敛，非超面。

票面 §6 预裁 5 条：①44px ✓ ②ver 迁 ✓ ③零触碰+祖先核查 ✓（见 D4）④A4/A6/A7 零做 ✓（diff 无顺手面）⑤workspaces.spec 零改 ✓（见 C⑤）。

## B. 宪法红线——6/6 过

1. **受锁批次**：manifest 166 files（node 独立计数）；3 hash 更新（app-shell/r3-rdr-set-visual/theme.test）**独立 sha256 复算全 match**；无新受锁路径（无 locks:generate 预期兑现）。
2. **行数红线**：实测 App.tsx 183 / theme.css 414 / app-shell 156 / theme.test 147 / r3-rdr 158——全 ≤500（申报偏差见 D2）。
3. **UTF-8**：全部产物中文直读可读无乱码。
4. **Switcher.tsx 零触碰**：diff 8 文件清单无此文件+git status 无此文件——声明属实。
5. **死代码**：`.app-nav-brand`/`.app-nav-brand svg`/`.app-nav-name` 三 CSS 规则删；grep src 零残留（测试负锚断言面引用非消费）；gold-night 定义删零残留。
6. **smoke.spec 零改**：diff 无；getByText('Synapse') 断言面文本唯一在场（见 C⑤）。

## C. 质量攻击

### ① B1/B2 防御必要性推演（WorkspaceSwitcher.tsx:86-181 直读）

**B1（wrapper max-height:44px）——必要性成立，论据半准（N2）**：
- Switcher 根=`flex flex-col gap-1`，**展开面板（open 态 :114-179）是文档流内子项，非 absolute**——trigger(≈36px)+面板(课题列表+新建输入+管理钮，可达 150-250px+)。
- header `height:44px` 为**定值**——CSS 定高盒子不会被流内内容撑高（内容溢出绘制不改变盒子高度），故实现者/注释「防展开面板撑高顶栏（44px 定值被破）」**前半论据不成立**（N2，App.tsx:144 注释+theme.css 同表述）。
- 真支柱=**align-items:center 错位**：无 max-height 时 wrapper 以内容高(~250px)参与 header flex，center 对齐 → wrapper 上溢 ~103px，trigger 被推出窗口顶外（视觉消失）、面板悬空——破坏性成立。max-height 锚 44px 后 wrapper 正常居中、面板向下溢出可见。**结论必要、实现正确、论证表述瑕疵**。替代方案（align-self:flex-start）会致 trigger 贴顶不居中，现实现更优。

**B2（header position:relative+z-index:10）——必要性成立（N3 附注）**：
- 展开面板溢出 header 底边进入 main 区上方。header 先于 main（DOM 源序）——**无定位时后绘制的 main 非定位内容按源序覆盖先绘制的 header 溢出面**（白底 panel 卡/文本盖住面板）。header 建立 stacking context（relative+z:10）后面板整体抬入正 z 层压过 main 全部非定位内容——盖板防御必要。
- N3（理论冲突面，实际不可达）：脉络域 `.lineage-fit-btn`/`.lineage-legend` 为 absolute+z-index:10（theme.css 终态），`.lineage-host` relative 无 z-index 不建上下文 → 它们与 header 同层(z=10)同根上下文，同 z 源序后者胜。但几何上面板 x∈[60,300]/y∈[44,~294]，fit-btn/legend 贴视口底缘（bottom:12/16px）——除非窗口高 <~344px 否则不相交。ToastHost `fixed z-50` 恒压 header 面板，层叠链闭环。

### ② 顶栏三件 it 真红能力
mutation-1（删 header JSX）→ 品牌名 it+三件 it 双红（「header 在场 expected null not to be null」断言级）；负锚 it 同变异下绿（删 header 后 brand 行也不在场——负锚语义正确不误报）。**真红实证 ✓**。

### ③ 负锚 it（theme+lib 双文件）
mutation-2（theme.css .rdr-num 回填）→ theme 负锚第一断言红（44 passed|1 failed，断言级）；mutation-3（library.css 回填一处）→ **第三断言（libCss）红**（889 passed|1 failed，theme.test:143 断言级，全量 890 语境）——主控 W2 扩面断言的真红能力独立实证 ✓。app-shell 负锚 it（brand 0 计数）firstraw 红（旧实现 brand 在场=1 计数）✓。三个负锚全部「能失败一次」兑现。

### ④ 结构攻击：根布局变化对既有视图的布局面推演（INV-34 语境）
- 旧 `div.flex.h-full > nav+main` → 新 `div.flex.h-full.flex-col > header(flex-none 44px) + div.flex.min-h-0.flex-1 > nav+main`。main 可用高度 100%→100%−44px，**main 自身 overflow-auto 与内部 h-full/flex 链不变**，收缩传导正常。
- `min-h-0` 正确防 flex 溢出根；html/body/#root `overflow:hidden`（文档永不滚）未触碰——**INV-34 静态推演无回归**。
- ToastHost（App.tsx:180）从行内移至列内：Toast 容器 `fixed right-4 top-4 z-50`（Toast.tsx:47）**脱离文档流**，flex 布局零影响 ✓。
- ErrorBoundary 包裹面/四视图挂载点（main 内）结构不变 ✓。真机收敛冒烟归主控（票面明文）。

### ⑤ e2e 零改预判核实
smoke.spec:22 `getByText('Synapse')`：renderer 正文 `Synapse` 唯一在场=App.tsx:142 header span（index.html title 在 head，getByText 不命中）——唯一性推演+实测（smoke 4+workspaces 1=5/5，E2E_EXITCODE=0）双证。workspaces.spec grep 零 nav/sidebar/app-header/locator 容器断言——预裁5「断言不含容器位」兑现。注：e2e 跑于 20:04（W2 前），但 W2 只动 css 字体+test 断言，e2e 断言面零涉，结论有效。

## D. 诚实性

- **B1/B2/W1-W4 对 diff**：B1（App.tsx:145 wrapper+theme.css:103 max-height）✓；B2（theme.css:78 relative+z-10）✓；W1（r3-rdr:148-155 负锚改写，金左缘条正断言保留）✓；W2（主控补做三处+第三断言）✓；W3 头注漂移实测在 theme.test:10-11（「夜面值别名 --gold-night（R2 消费预留）」）✓ 属实。
- **行数抽 3**：实测 183/156/147 vs 申报 204/175/155——**申报偏高虚报（W-2）**；theme.css 414 一致。全在红线内，无后果，但「实测申报」口径失实记诚实性瑕疵。
- **firstraw 口径（W-1）**：实现者报告称「首红=4 failed|886 passed (890)」，日志实况=`npm run test` 附两文件参数定向跑 **50 用例 4 failed|46 passed**——红点集合（app-shell 3 it+theme 负锚 it）真实且全在新断言面，但总数口径 890 失实。后续「绿 890/890」有 verify.log（107 文件 890 passed）实证为真。
- **D4 Switcher 零祖先锚定核查独立复核**：grep theme.css `\.app-nav ` 仅命中 `.app-nav {` 自身定义——**零 `.app-nav .xxx` 祖先组合选择器**，13 处全独立类名结论成立；Switcher 样式全内联+tailwind 通用类。零触碰前提成立。
- registry.ts 变更=主控预登记 R2-SH2（open）+R2-SH1 行尾逗号——实现者未翻 registry 声明属实（时间线：预登记先于实现者开工）。
- 用例数构成独立复算：888+app-shell 新 it 2+theme 新 it 1−TOKENS gold-night 行 1=890 ✓ 与 verify 日志精确一致；locks 166 ✓。

## E. 接缝

- **F-05/INV-34 真机复评缺口（归主控）**：推演方案=dev 起真机 → ①顶栏观感（44px/hairline/品牌区）②切换器展开面板遮盖与收合 ③阅读器页码跳转+TabBar 滚动收敛 ④设置 h2/阅读器侧板节标无衬线残留抽查 ⑤**W4 对比度（高危，见下）**。
- **遗留池新候选**：a) `.lib-detail-v-serif` 类名衬线语义已空转（消费在 PaperDetailPanel，最小面不改名成立——遗留池记名实重构候选）；b) W3 头注漂移（theme.test:10-11）；c) N2 注释表述修正（App.tsx:144+theme.css「撑高顶栏」→「center 错位」实因，可并入下张同域票）。

## CSS 皮肤类强制审项（票面类型附加）

1. **特异性/冲突面**：新增 `.app-header .app-nav-ver`(0,2,0) 压 `.app-nav-ver`(0,1,0) 仅补 margin-left:auto，无属性冲突；`.app-header svg`(0,1,1) 与 `.app-nav-item svg`(0,1,1) 同特异性但元素集不相交（header 内 svg 唯一=logo）。hover/selected/disabled 面：header 族无交互态；nav-item hover/active 规则未触碰。Switcher trigger 静态内联+无类 hover——B1 回炉教训（内联恒压类）无触发面 ✓。
2. **下拉面板定位链**：非 absolute——流内向下溢出绘制；header overflow 默认 visible 无裁切；z-index:10 抬层过 main 非定位盖板（B2）；同层 z-10 冲突几何不可达（N3）；Toast z-50 覆盖闭环。
3. **侧栏首行视觉跳变**：nav `padding:14px 10px` 原样、首行直接起导航项——决4 预期行为，无 CSS 残留面。

## 总评与主控预裁 5 项意见

**总评：PASS，无回炉。** 实现面与母本（决4/决5）逐值符合、三负锚+顶栏双 it 变异红证全真、锁 hash 独立复算全 match、Switcher 零触碰前提独立成立。B1/B2 防御经展开态结构直读推演确认必要（论据瑕疵不影响实现正确性）。

1. **W2 主控补做：接受**——lib 三处属决5 母本明文（票面五类清单为收窄誊录），补做=向母本收敛；mutation-3 断言级精确红点+manifest sha256 独立 match。**附收口硬条件（N1）：r2-sh2-verify.log(20:03) 早于 W2 终态(20:11)——quality/lint/typecheck/build 四段在 8 文件终态下无落盘证据（test 段已由 mutation-3 的 889/890 变异语境+还原推定覆盖）；收口单写前必须重跑 `npm run verify` 亲验落盘**（宪法 DoD 硬要求，风险面极低但证据链不可缺）。
2. **W1 接受**——非放宽断言：旧「衬线+金左缘条」形态锁改写为「衬线负锚+金左缘条正断言」双锁，与决5 新形态对齐；授权域=预裁5「必红则受锁改写申报」同构（旧锁与裁决直接互斥，改写是唯一不放宽路径）。
3. **B1/B2 接受**——必要性推演成立（①节）；B1 论据「撑高」表述不成立但修复目标（center 错位）实现正确（N2 记档）；B2 盖板冲突具体=main 非定位内容源序后绘覆盖（N3 同层 z-10 理论共存几何不可达）。
4. **W3 接受**（实测在 :10-11，遗留池）；**W4 归主控真机——升格提示：推演对比度≈1.2:1（#efe9da 米白字 on #fff 白底+rgba 白 5% 微底），trigger 文字大概率近乎不可见**——真机若证实，修复路径建议走 wrapper 容器选择器外挂（B1 先例已开口子，不破组件零触碰红线），不建议本单内顺手改（禁超面）。
5. **`.lib-detail-v-serif` 类名保留：接受**——衬线语义名已无衬线效果，但改名波及 PaperDetailPanel 消费链+潜在断言面，最小面不改正确；遗留池登记（E 节 c 候选）。

**回炉需求：无。** 门二可进。
