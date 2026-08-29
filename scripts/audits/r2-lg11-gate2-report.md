# R2-LG11 门二终审报告（三屋模式 ADR-0017）

> 审计人：门二终审子代理（独立于实现者与门一）。
> 模型自报：builtin:bigmodel-coding-plan/**GLM-5.3** / 思考等级=**高**（回复首行已自报——项目宪法条款）。
> 铁律遵守：只读审计（唯一可写=本档）；零源码/测试/配置触碰；零 npm test/verify；零 git 写操作。
> 输入（全读）：AGENTS.md+methodology §4.3+handoff-v3 §2/§3+票面+实现者报告+门一报告+gate1.diff（22 文件全量）+五日志（firstraw/mutation-1/2/3/4/verify）+主控处置段。

**技能清点（宪法开工纪律）**：code-review-excellence 用（终审核心=对抗性复核门一与实现面）；verification-before-completion 不用（门二禁跑 npm verify，只核日志与工作区实物）；test-driven-development/systematic-debugging 不用（只读审计、无实现/调试面）；其余技能与本任务无关联面不用。

---

## ① 处置核对（门一 15 findings+主控处置 vs 终态实物——防「说了没做」）

### W 级 6 条逐项

| # | 门一发现 | 主控处置 | 门二对实物核对 | 裁决 |
| --- | --- | --- | --- | --- |
| W1 | 报告 §4 恒等推算「6 字=ceil(0.962)」实为 0.481（0.962 系 12 字值误植） | 收口单申报栏更正，不回炉 | impl.report §4 原文确含笔误；独立复算：6 字=75/156=**0.4807**→ceil=1（12 字=150/156=0.9615——门一指认正确）；结论不受影响（两值 ceil 均=1，auto-fit 恒等成立）。更正承诺在主控处置段在案 | 兑现✓（更正落点=收口单，未写=收口动作） |
| W2 | 票面 §2.4「props 增 survey: boolean」未按字面——卡内自算 | 接受+收口单申报（字面偏离说明） | NodeCard:59 `const survey = !theme && isSurvey(n.title)`（!theme=paperId≠null 前置 ✓）；头注「综述=isSurvey 判定，卡内自算——与 classify 单源」在案；`core` 按 §2.4 字面为 prop（Canvas coreIds 预计算传入）——两判定通道各自单源、行为等价（isSurvey 纯函数双消费无漂移面） | 兑现✓（申报落点=收口单） |
| W3 | 处方第三变异「综述列 GAP 消除」未跑 | **主控已补跑** mutation-4.log | 日志核实：①`Tests 1 failed \| 874 passed (875)`+`exit=1`；②红点=`lineage-layout.test.ts:390 expected 530 to be 610`——数学独立复算吻合：GAP 80→0 → colLeft 440+0=440 → S 中心=440+90=**530**，与断言 610 差恰=GAP 值 80，红点唯一且精确归因；③还原完整性：工作区 `lineage-layout.ts:121` 实读 `SURVEY_COL_GAP = 80` ✓（cp 备份法还原有效，无 git checkout）；④Start at 18:06:23（主控时段，晚于实现者全部日志） | **真实性+还原完整性双确认**✓ |
| W4 | 重试按钮内联 style 恒压 `.lineage-toolbar>button:hover`（B1 同型） | 记遗留池 **B10**，不回炉 | Board.tsx:158-165 内联 `background:var(--accent-soft); color:var(--accent)` 恒压 hover（theme.css hover `color: var(--text)`）——实证旧形态平移（改前 gold-soft/gold-bright 同构内联），非本单引入回归；票面「行为零变」兑现，改它=超面。**遗留池登记载体**：主控承诺在主控处置段在案 ✓；交接书 v3 §6 尚无 B10 条目——落点=收口单（提醒：收口时勿漏） | 承诺在案✓ |
| W5 | 「同层多综述」it 在旧代码亦绿（首红 5/7 可证）——右列语义非独占锁定 | 遗留池候选（U2b 动 layout 时顺带补强精确值） | firstraw.log 13 红逐条清点：canvas 7（[2/14]~[8/14]）+layout 5（it1 :367 NaN+it2 :380 90≠610+nodeHeight 3）+side-panel 1（[14/14]）——**it3 确不在列** ✓非独占证实（it4 覆盖综述旧代码亦绿系覆盖语义合理旧态，非缺陷）。遗留池候选承诺在案 ✓ | 承诺在案✓ |
| W6 | side-panel.test.tsx 499/500 物理行临界 | 遗留池观察项 | `wc -l`=499 实证 ✓。观察项承诺在案 ✓ | 承诺在案✓ |

### 主控预裁 6 项维持核对

门一报告「对主控预裁 6 项的意见」逐条有实物依据（eslint.config 豁免 glob 实引/CSSOM 归一双层锚/theme.test B1 先例/票面字面 y 覆盖/夜 token 消费清零 grep/mutation-3 红点 :377）——**全部维持合理，门二无推翻依据**。

### N 级 9 条抽 3 对实物

| # | 门一结论 | 门二核对 | 裁决 |
| --- | --- | --- | --- |
| N1 | 变异日志视觉 its 驻拆分前 canvas.test；时序自洽 | mutation-1/2/3 FAIL 行确为 `lineage-canvas.test.tsx`（拆分前宿主）；Start at 17:43:33/17:44:11/17:49:20（本地）均早于 manifest generatedAt `2026-08-29T09:52:57Z`（=本地 17:52:57）；变异期文件数 105（拆分前 104+classify.test）与二次 generate 收 163（+visual.test）时序链闭合 | 属实✓ |
| N4 | e2e 零改三重核实 | ①22 文件 diff 清单无 `tests/e2e/lineage.spec.ts`；②`git status --porcelain tests/e2e/lineage.spec.ts` 输出空（工作区实证未改）；③夹具题名恒等推算（全 1 行→nodeHeight=64=NODE_H）门一已独立复算 | 属实✓ |
| N7 | 报告「改（13）」表头 vs 表体 14 行差一 | impl.report §2 表头「改（13）」下表体逐行数=14 行（含 invariants.md）；清单本体与 22 文件 diff 对账一致（14 改+4 增+1 删+registry+manifest=22） | 属实✓（笔误，无实质） |

**①结论：15 findings 处置全兑现或在案；W3 主控补跑真实性与还原完整性双确认。零「说了没做」。**

---

## ② 母本符合度（票面五层 vs handoff-v3 §2 五决+§3 U2a——每决一行）

| 裁决 | 母本原文要点 | 落地证据（diff+工作区） | 裁决 |
| --- | --- | --- | --- |
| 决1 边框矩阵四格 | 类型=实线(文献)/虚线(主题)；重要度=深青蓝 1.5px(核心)/浅灰蓝 1px(普通)；白卡无填充；选中=边框再加粗 | NodeCard：stroke=`core?'var(--accent)':'var(--node-branch)'`（#2c5f8a token 系）/width=`(core?1.5:1)+(sel?0.75:0)`（选中 2.25/1.75）/dash=`(theme\|\|survey)?'6 4'`/rect `fill="#ffffff" rx={8}` 无 filter；visual.test it2 四格逐格断言+mutation-1 红证（accent↔branch 互换恰 1 it 红） | **符合** |
| 决2 isCore 公式 | 被引用数加权=入度≥2；仅开宗立派的研究性论文；综述不得入核心档 | classify.ts:25-33：paperId null 排除（主题）+isSurvey 排除（综述）+入度（toNode===id 计数）≥CORE_MIN_IN_DEGREE(2)+出度不计（被引为主口径）；classify.test 8 it 入度 1↔2 双向边界+综述/主题排除+出度 5 不计逐条锁定 | **符合** |
| 决3 综述最右+很淡灰虚线 | 综述排列于脉络最右侧；用很淡的灰色虚线连接涉及的重要文章 | layout：surveyCol 成员不进树（子提升根/父边断开不剔除）、列左缘=max(非右列右缘)+SURVEY_COL_GAP(80)、y=year 层带、同层输入序错开（layout.test 精确值 610+mutation-3/4 双红证）；Edges：任一端∈surveyIds→`var(--survey-edge)`(#c8cdd6) 1.4 虚 2 3 优先级>推断；多参考边=U2b 已预裁延后（票面 §4 声明，非缺口） | **符合** |
| 决5 衬线清零+token 保留 | --font-display 定义留 theme.css；消费位全回 UI 字体 | theme.css:33 `--font-display` 定义仍在 ✓；脉络域消费清零：NodeCard 年份行/Canvas 层带标（visual it5 负断言 style 不含 font-display）/SidePanel h3·p（diff 实删 fontFamily+letterSpacing）；夜幕 11 token 定义保留（门一 A.1 逐枚核实） | **符合** |
| U2a 既裁项 | 白卡浅色板/foreignObject 换行 ≤3 行+tooltip/卡高自适应/分档宽保持/B1 顺手 | .lineage-host=var(--bg)+LineageNightDecor 整件删除；foreignObject+line-clamp:3+`<title>` 全文（visual it4+源码形态锁 WebkitBoxOrient）；nodeHeight 64/82/100（INV-38 登记+三消费）；nodeWidth 旧断言零碰全绿；BAND_LEFT/BAND_RIGHT/LAYER_LABEL_DY 单源迁 layout 导出 | **符合** |
| （决4） | 课题切换器上移顶栏 | 归 U3 票——本单票面不含此验收面 | 不适用（无违背） |

**②结论：五决+U2a 逐节符合，零方向级偏离。**

---

## ③ 宪法红线终审

| 红线 | 核对 | 裁决 |
| --- | --- | --- |
| 分层单向 | 22 文件清单全量核对：零 main/ipc/services/repos/db 面；渲染件仅引 `@shared` 类型+渲染层（classify/layout 纯函数零 DOM/window import） | ✓ |
| 安全禁令 | diff 零 main 侧文件（无 BrowserWindow/webSecurity/CSP/openExternal 面）；零 SQL/eval/new Function；零新增出网 host；foreignObject/line-clamp/SVG title 全原生零依赖（package.json/lockfile 不在 diff） | ✓ |
| 受锁流程 | unlock→批内改写→generate(162)→apply→lint 红（max-lines）→拆分→unlock→generate(**163**)→apply→verify 复跑绿——时序合规、锁操作与改动同工作段无跨段残留；manifest generatedAt 09:52:57Z 与 163 条 locks:check 对账绿（verify.log 实录） | ✓ |
| 行数 | 门二抽验 wc：layout.ts=382/NodeCard=103/Canvas=198/side-panel.test=499/visual.test=228——与报告值精确一致，全 ≤500（组件 ≤250）；门一 14 文件全量 wc 亦在限 | ✓（499 临界=W6 已入池） |
| UTF-8 | diff 22 文件全文通读中文零乱码；日志/报告可读 | ✓ |
| TDD 证据链四档 | 首红在档（firstraw exit=1，4 文件 13 it 红断言级+classify 文件级）→绿在档（verify 875/875+build 末环+exit=0）→变异红证 **4 处**在档（mutation-1 恰 1 it/2 恰 5 it/3 恰 1 it/4 恰 1 it，各 exit=1 红点精确）→还原安全在档（三处 cp 备份法申报；工作区 SURVEY_COL_GAP=80 实证变异 4 还原完整；全程无 git checkout） | ✓ |

**③结论：宪法红线零违反。**

---

## ④ 机器面核对

- **verify 数理一致**：858 基线−5（canvas 旧 LG9 it）+7（visual）+7（layout）+8（classify）=**875 精确命中**（verify.log `Tests 875 passed (875)`）；文件 106=104+2；链序完整（quality→tickets→locks(163 对账绿)→lint→typecheck→test→build 末环三段 built）+`exit=0`。✓
- **locks manifest 163 口径核实**：manifest 现有 `src/` 条目 18 个**全=main/db/migrations(5)+src/shared(13)**——零 src/renderer 渲染件，即现行受锁口径（tests/shared/migrations/CI/lint/构建/测试配置/脚本，宪法原文）不含渲染件。故本单新 4 件中**实际入锁=classify.test+visual.test（两测试文件）**；`lineage-classify.ts`/`LineageLegend.tsx` 系 src/renderer 实现件，**按现行 manifest 惯例不入锁=口径正确**。161→163 差 2=classify.test（票面预测 162）+visual.test（自裁 1 拆分件）——申报闭环。✓
- **翻 done 推演（写档）**：`check-tickets.mjs` 关键正则实测——`objRe=/\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'...\}/g`（首字母 S 硬性）+B4 防线 `if (!t.id.startsWith('SR2-')) continue`。`R2-LG11` 前缀为 R，**不匹配任何一处**→工单统计与检查面对其零捕获→翻 open→done 前后 check-tickets 输出零变化→**不红**。旁证：当前 open 态下 verify.log tickets:check 已「通过」（R2 条目已在 registry——见 diff:1819）。✓
- **e2e 面申明**：本单未跑 e2e（verify 链不含 e2e；票面 §9 归主控收口段）。**收口清单必含 `npm run test:e2e`（25 passed 基线）+真机复评三放行线（换行在框内/边框编码可辨/整图不回退）——主控已排，门二确认此项不可豁免**。✓

**④结论：机器面四项全一致；e2e 缺口已显式归位收口段。**

---

## ⑤ 成本账本行

| 屋 | token | 工具调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 15,756,120 | 120 | 31.4 分钟 |
| 门一 | 999,905 | 16 | 8.0 分钟 |
| 门二（本审，估计） | ≈450,000（输入 ≈380k：宪法/票面/两报告/22 文件 diff/五日志摘要/工作区抽验+输出 ≈40k+推理） | 12 | ≈13 分钟 |

---

## 终评

### **PASS——可直接收口**

- 六 W 处置全兑现或在案（W3 主控补跑真实+还原双确认；W4/W5/W6 遗留池登记承诺在主控处置段，**落点=收口单，收口时勿漏 B10/W5/W6 三项**）；门一 15 findings+预裁 6 项零推翻。
- 母本五决+U2a 逐节符合；宪法红线零违反；TDD 证据链四档齐备（首红/绿/4 变异红证/还原安全）。
- 机器面：875 精确/163 对账/翻 done 推演不红。

**收口单必含项（放行意见）**：
1. 申报栏：W1 数学笔误更正+W2 survey prop 字面偏离说明+locks 161→163（拆分件）实测值；
2. 遗留池登记：B10（W4 重试按钮 hover 恒压）/W5（同层多综述精确值补强）/W6（side-panel.test 499 临界）；
3. 亲验 `npm run test:e2e`（25 基线）+真机复评三放行线（像素差分+DOM 转储配方，票面 §9）；
4. registry 翻 done 后按 §4.4 顺序铁律**重跑 verify 全链**（verify 永远是收口最后动作）。
