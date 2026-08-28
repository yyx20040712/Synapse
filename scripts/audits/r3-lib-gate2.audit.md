# R3-LIB 门二终审档 —— 文献库视觉重制（回炉一轮后）

> 审计人：门二终审子代理（GLM-5.3，三屋模式 R3-LIB）。日期 2026-08-29。
> 铁律遵守：全程只读仓库（唯一可写=本档）；未跑 npm/测试；未做任何 git 写
> （git status/diff/stat、grep、sha256 实算、wc/stat mtime 均为只读对账）。
>
> **开工技能清点**（宪法会话开工纪律）：`code-review-excellence` **用**
> （门二终审=对抗性代码审查本体）/ `verification-before-completion` **用
> （证据口径）**——七项处置逐条对实物非对声明，机器面数字逐行亲读
> （verify :2524/:2564、e2e :72-73、rework1 两 log 全文、manifest sha256
> 实算）/ `frontend-design`/`frontend-ui-engineering` **不用**——真机复评
> ≥8/10 已明示为主控收官段职责，本席仅做代码级终审（CSS 机制/级联/结构
> 可静态判定，无需审美输入）/ `test-driven-development` **不用**（不写实现，
> 仅核验 TDD 证据链形态）/ `systematic-debugging` **不用**（无运行时复现
> 面；W1 归因=CSS 特异性静态推演）/ 其余运维·文档·部署类技能**不用**
> （纯只读审查+单档产出）。配置自查：门二子代理身份，模型/思考等级按主控
> 派发配置运行。
>
> 输入件全读：门一档（335 行全文）、impl.report §1-§10（179 行全文）、
> r3-lib-verify.log（2564 行链路头尾+受关注例 :34/:1355/:2523-2524/:2564）、
> r3-lib-e2e.log（73 行全）、rework1-first-red.log（10 行全）、
> rework1-mutation.log（8 行全）、终态源码 9 文件全文（library.css 208/
> theme.css lib-rule 段/DiamondRule 23/PaperRow 84/PaperDetailPanel 248/
> FilterBar 115/LibraryPage 117/PaperList 112/ImportDropZone 145）、
> library-cards.test.tsx（307 行全）、locks/manifest.json、git diff 现场
> （theme.css+manifest 全量、FilterBar+PaperDetailPanel 全量、--stat 八文件）。

## 统计行

**新发现 B=0 / W=1 / N=6 —— 裁决：PASS（代码级终审通过）；放行提交=有条件
（W1 一行修复 + 真机复评 ≥8/10 两条件并列，见「放行条件」节）。**

---

## 一、处置核对：门一 R1~R5 + W2 + W3 七项 vs 终态实物逐条

| 项 | 门一修法 | 终态实物 | 判 |
| --- | --- | --- | --- |
| R1 | dropzone `background: var(--panel)`→`transparent`（推荐方案） | library.css:167 `background: transparent`；:163 注释「回炉 R1：透明底——虚线金框落纸面材质归一」；dragging 态未动（:170-173） | **兑现**（门一推荐原样） |
| R2a/b/c | 题名 13.5/500→**14/600**（min-height 38→40）；venue 11.5→**11**；meta 11→**10.5** | library.css :102 `font-size: 14px`、:104 `font-weight: 600`、:113 venue 11px、:140 meta 10.5px；it 文本锁四值（test:296-299） | **兑现**（min-height 保持 38px 未随 40——见 N1） |
| R3 | 空年份「—」→9px 淡金 ◆（aria-hidden；year 槽 min-width 44px） | PaperRow:55-61 条件渲染 `<span className="lib-card-year-gem" aria-hidden/>`；CSS :92-99 = 9px 几何菱形（width/height 9px+rotate 45°+var(--gold)+opacity .55）；year 槽 min-width 44px 保持（:86）；it 锁「有年份无 ◆/空年 ◆ 在场+9px+rotate」（test:234-249） | **兑现**（字符 ◆ 方案→几何 span 方案=语义等价：9px 尺寸精确可控不受字体渲染影响，类名 year-gem vs 门一 year-empty 为命名偏移；「空值退装饰不抢戏」意图达成） |
| R4 | 空态 `.lib-detail-empty` 居中+DiamondRule+文案逐字 | PaperDetailPanel:127-136 = `.lib-detail-empty p-6 text-xs`+inline dim 色+DiamondRule×2 夹持+「选中列表中的文献后显示详情」**逐字**；CSS :180-187 flex column 居中 gap 12；it 锁类在场+双 rule+文案逐字（test:251-258） | **兑现**（min-height 160px vs 门一 200px+height:100% 偏移——见 N2） |
| R5 | 选中卡金 hairline：border var(--gold)+inset ring rgba(201,168,106,.45)+shadow-2+角饰常显+渐变保留 | library.css:41-49 = `border-color: var(--gold)`+`box-shadow: var(--shadow-2), inset 0 0 0 1px rgba(201,168,106,0.45), inset 0 1px 0 rgba(255,255,255,0.9)`；:46-49 角饰常显 .9+gold；段内无 background 声明=渐变继承 .lib-card（PaperRow:50 双类同挂，机制成立）；it 锁金描边+ring+shadow-2+不覆盖渐变+角饰（test:260-273）；变异红证恰中本 it（mutation.log） | **兑现，但发现 W1 级联塌缩**（见下）；顶高光显式补回=优于门一字面（门一片段的 box-shadow 整体覆盖会丢顶高光） |
| W2 | chips active=.chip.on（accent-soft 底+accent 描边）落地 | FilterBar:66 搜索（text 非空）/:72 集合（collectionId 有值）/:85 年份（year 有值）条件挂 `lib-chip-on`；:98 排序不挂；CSS :155-159 镜像 mockup .chip.on 三值；it 锁三挂一不挂+CSS 值（test:275-292） | **兑现**（P2 字面缺口补齐） |
| W3 | .lib-rule* 五段迁 theme.css 共享位；DiamondRule 头注由虚转实 | theme.css:213-238 五段迁入（逐值=门一 B 节对照表记录：line-l/-r 渐隐线+gem 6px rotate45+min-width 24px+flex:1）；library.css 零残留（grep exit=1）；theme.css 340→367（+27 纯迁移无夹带，diff 亲读）；DiamondRule.tsx:12 头注「样式全在 theme.css .lib-rule*」**由虚转实**；R3-U4 复用断裂解除（theme.css 全局加载不依赖 library.css 挂载） | **兑现**（接缝声明纪律修复） |

**「说了没改」扫描：零命中。** 七项全部实物落地，且非字面敷衍——R5 顶高光
补回、R3 几何方案均为语义增强而非照抄；每项均有 CSS 文本锁/渲染级 it 背书。

### W1（本席新发现）：选中卡 hover 级联塌缩——R5「两档」在悬停路径失效

**机制**：`.lib-card:hover` 特异性 = 1 类+1 伪类 = **(0,2,0)**；
`.lib-card-selected` = 1 类 = **(0,1,0)**。伪类计入特异性——**不平**，源序
仅平手时裁决。选中卡悬停时（点击选中的瞬间鼠标必在其上）：border-color
取 hover 的 `--border-gold`（#c9a86a 浅金）非 `--gold`（#b8935a 深金）、
box-shadow 整体取 hover 的 `var(--shadow-2)`——**inset 金 ring 与顶高光
消失**。即选中卡悬停期间与普通卡 hover 观感**完全一致**，选中反馈塌缩；
移开后金 ring+深金描边才显示。角饰两路径值相同（.9+gold）无碍。

**声明失实两处**：library.css:40 注释「段序排 :hover 后——叠加时 selected
赢（平特异性后定义胜）」与 test:269 注释「源序在 :hover 之后（叠加时
selected 赢——两档语义的层叠保证）」——机制计算错误（伪类入特异性）。
test:270-272 断言 selectedAt>hoverAt 本身通过（源序为真）且**不阻未来正确
修复**，但给错误机制背书。

**归责**：门一 R5 修法原文（单类 .lib-card-selected）同构此级联盲区——
实现者忠实誊录门一片段并自加错误注释，**非「说了没改」**，是门一+实现
共同的结构盲区，门一审出未逮、本席终审补刀。

**最小修法（一行）**：`.lib-card-selected` → `.lib-card.lib-card-selected`
（两处规则：主段+角饰段提为 (0,2,0)/(0,3,0)，平/超 hover+源序后=真赢）。
现有 R5 it 断言全部仍绿（正则 `\.lib-card-selected\s*\{` 与 indexOf 均为
子串匹配，兼容复合选择器）——零测试红，无需 TDD 新面。两处注释同步改口。

## 二、红线核对

| # | 审项 | 结论 | 证据 |
| --- | --- | --- | --- |
| G1 | 行数上限 | **过** | wc 实测：PaperDetailPanel **248≤250**（未触发拆分）/theme.css **367≤500**/library.css 208/PaperRow 84/FilterBar 115/ImportDropZone 145/LibraryPage 117/PaperList 112/DiamondRule 23/test 307 |
| G2 | manifest 153+时间序 | **过** | 153 条；library-cards.test.tsx 条目 sha256 `124d240f…b540` **node 实算逐字节一致**；mtime 序：源文件终态 07:26:18~07:27:48 < manifest 07:27:58（=generatedAt 23:27:56Z+8h 吻合）< verify.log 07:28:50——locks:apply 于实现终态后、verify 落盘前，即时同步义务达成；manifest diff 纯净（+generatedAt+1 条目无夹带） |
| G3 | 新 it 首红 | **过** | rework1-first-red.log（10 行全）：7 红 it 逐名在列（新 6：R3/R4/R5/W2/R1+R2/W3 共享位+迁移改造 1：菱形窄窗改读 cssTheme）+FAIL 行；无环境红混杂（对比例外初轮的模块缺失红/协议红段——回炉轮直接断言级，物理基础=初轮已建） |
| G4 | 变异恰中+还原 | **过** | rework1-mutation.log（8 行全）：`mutation applied` 行在（初轮 M3 no-op 教训已吸收）→删 `.lib-card-selected border-color: var(--gold)` →R5 it 红→`VITEST_EXIT=1`→`RESTORE diff-empty OK`→POST-MUTATION `VITEST_EXIT=0`。恰中性实核：变异删的正是 it:264 `toContain('border-color: var(--gold)')` 锁值，非恒真。门一「建议变异：删 .lib-detail-empty→空态 it 红」未采纳——措辞为建议，回炉纪律要 ≥1 已达，记 N5 |
| G5 | 856 数理 | **过** | verify:2524 `Tests 856 passed (856)`=850+6；新 it 6 条（回炉组 describe 计数实核）、迁移 it 1 条为既有改造不加数——数理自洽；library-cards 16 tests（:1355）=初轮 10+新 6 |
| G6 | verify 真退出码 | **过** | :2564 `VERIFY_EXIT=0`；链路头 :5 =quality+tickets+locks+lint+typecheck+test+build 全串；:34 locks:check「153 个受锁文件与 manifest 一致」 |
| G7 | e2e 25 | **过** | e2e.log:72-73 `25 passed (1.2m)`+`E2E_EXIT=0`，25 例逐行 ok 亲读（:46-70） |
| G8 | F-04 偶发处置 | **合理（本席裁定）** | 改动面 100% 落 library feature 域（六组件+library.css）+theme.css 纯新增段（不改任何既有规则）；reader-scroll F-04 的 selectText detach=阅读器页列离屏回收与划选的 DOM 竞态，属 reader 域内部时序，与库页 DOM/CSS **零交集**——若库改动破坏打开链路会红在打开步骤而非 detach；单 spec 复跑绿+全量复跑 25 passed双重复核。**reader 域零交集判定成立**。首轮失败 log 被复跑覆盖仅存报告文字记录（N4） |
| G9 | TODO/mojibake | **过** | 八变更文件+两新文件 grep TODO/FIXME/placeholder 零命中（exit=1）；中文注释/文案逐文件亲读可读 |
| G10 | 范围蔓延 | **过** | git diff --stat 八文件 97+/107-；theme.css diff=纯 .lib-rule* 迁移段、manifest diff=纯两条目、FilterBar diff=chips 化+W2 三条件类、PaperDetailPanel diff=初轮衬线皮肤+R4 空态+import——无票面外夹带；LibraryPage/ImportDropZone/PaperList 回炉零改（行数与门一 D2 记录一致） |

## 三、成本账本行

| 单元 | token（≈M） | 时长（min） | 来源 |
| --- | --- | --- | --- |
| 实现者（初轮） | ≈7.92 | ≈17.4 | 主控台账（impl.report §F 佐证） |
| 实现者（回炉一） | ≈3.69 | — | 主控台账 |
| 门一联审 | ≈2.17 | ≈28 | 主控台账（门一自报 ≈2.1） |
| 门二终审（本席） | ≈1.7（自报估算） | ≈25（自报估算） | 本席会话：门一档+报告全文+四证据日志亲读+九源文件终态全文+307 行测试全文+diff 三组全量+sha256/mtime/wc 实算+W1 特异性推演+本档写作 |

真机复评 ≥8/10=主控收官段职责，本档未执行（技能清点已申明不做审美面），
列为放行条件项之一，不阻塞本代码级终审结论。

## 四、N 级清单（不阻塞）

- **N1** R2a 附带值 min-height 38px 未随门一建议升 40px——两行自然高
  1.45×14×2≈40.6px 由内容撑起，min-height 仅短题名兜底（差 2.6px 仅在
  单行短题名场景出现），阶差体系核心（14/600/11/10.5）不受影响；it 未锁
  此值，门一修法亦标注「三处纯 CSS 值」以字号为主。微偏不裁。
- **N2** R4 空态 min-height 160px（门一建议 200px+height:100%）且无
  height:100%——实际形态=aside 顶区 160px 盒内居中而非全栏垂直居中；
  「居中+菱形夹持+文案逐字」核心语义达成，「死白条」改观成立（p-6 内
  padding+居中组替代顶对齐裸小字）。全栏居中的视觉终判留真机复评。
- **N3** 报告 §10 R4 行「+8 行后 248」与实况 244→248（净 +4）毛/净口径
  不清——微瑕，非实质（门一 D2 记录 244、本席 wc 248）。
- **N4** e2e 首轮 F-04 失败 log 被复跑覆盖，仅存报告文字记录
  （reader-scroll.spec.ts:232 known3.selectText）——报告诚实申报覆盖
  事实+失败定位；下不为例：偶发失败的首轮 log 宜另名落盘。
- **N5** 门一建议变异（删 .lib-detail-empty→空态 it 红）未采纳，实做
  R5 金描边变异——措辞为建议、纪律要 ≥1 已达；R5 it 恰中性已实核。
- **N6** 初轮 N6（library.css 头注「禁散落硬编码色值」vs 渐变端点三
  字面）回炉未处置——门一 N 级不阻塞项，R5 复用同渐变未新增字面；
  头注改口或提 token 留后续顺手。

## 五、总裁决与放行条件

**PASS（代码级终审通过）。**

理由：门一七项处置（R1~R5+W2+W3）终态实物逐条兑现、语义等价性成立
（零「说了没改」、零字面敷衍）；TDD 证据链完整真实（7 首红→16/16 绿→
变异恰中→还原 diff 空→复跑绿）；红线十项全过（行数 248/367、manifest
153+sha 一致+时间序成立、856=850+6、verify/e2e 双 EXIT=0、零 TODO、
零范围蔓延）；报告诚实（F-04 偶发处置合理且申报覆盖事实）。

**放行提交=有条件（两条件并列，均为主控收官段核对面）：**

1. **W1 一行修复**：`.lib-card-selected` 两规则提特异性为
   `.lib-card.lib-card-selected`（选中卡悬停时金 ring/深金描边不再被
   hover 覆盖）+library.css:40 与 test:269 两处注释改口（删「平特性
   后定义胜」错误声称）。零测试红（正则子串兼容），主控亲修或微派均可，
   **无需再走整轮回炉**；修复后 verify 复跑一次落盘即可（受锁面零触碰
   则 manifest 无需重生成）。
2. **真机多模态复评 ≥8/10** + 门一真机三问题逐项对照消失（dropzone
   材质归一/层级阶差+空年 ◆/空态菱形静候态）——工单明示的主控收官段
   职责。

两条件齐备方可放行提交（[locked-change] 尾注义务：manifest+
library-cards.test.tsx 两受锁面）。
