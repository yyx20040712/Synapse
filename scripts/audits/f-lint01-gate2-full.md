# F-LINT-01 门二终审报告（四清单+一）

> 档位声明（如实记）：门二位应为 deepseek v4 flash 优先——环境 Agent 工具无
> model 参数，实际统一档与实现者同源（GLM5.3 系）。欠账披露，禁冒充定档。
> 审计基准面=工作区终态（HEAD=8ce375071d + 3M[check-quality.mjs/invariants.md/
> manifest.json 锁面衍生] + 终裁档/证据件未跟踪）——收口提交前位。
> 方法=逐条裁决+独立复算+亲跑；探针件 f-lint01-g2-*（4 件 raw/json）+本档，
> 临时探针用后即删（哨兵备份驻 /tmp 已删、tmp-probe.css 已删）。

## 清单① 处置核对（门一 0B/5W/9N vs 终态实物）

| # | 门一项 | 主控处置 | 门二独立核验 | 判 |
| --- | --- | --- | --- | --- |
| W1 | INV-11 措辞「逐字」证据缺口（回炉指令不在包内） | 回炉指令=措辞真相源，主控亲核 :25 行一致 | 独立语义覆盖核（diff 实物 vs 终裁档 §5.3 四要素）：字号面已锚（「[字号面已锚]」）✓/颜色顺延 F-CSS-03（「顺延 F-CSS-03 颜色 token 化战役票——清理毕即落」）✓/人审残留三类（「结构等价类型/文案双源/泛化魔法值」）✓/数值面（强制方式列「审查（颜色/数值面）」）✓——语义覆盖独立成立；逐字性采信主控亲核声明 | ✓ |
| W2 | locks apply 证据缺（若受锁即红线） | 已 apply 287 重锁 | 亲跑 `npm run locks:check`＝「287 个受锁文件与 manifest 一致」exit=0；manifest diff 实物=invariants.md sha→88ea5c10…+check-quality.mjs sha→b83dd4b9…+generatedAt（3 行，两件恰为受锁改动面）；哨兵验证全程实测 unlock（EPERM 只读位实证）→apply→287 循环，manifest M 面不扩 | ✓ |
| W3 | 提取正则静默取第一处 FS_DECL（哨兵防 null 不防多处） | 转 F-CSS-03 票面要素（registry 落账时带） | 终裁档 §5.2 立案声明在档 ✓；「票面行带 W3 要素」=收口提交时兑现义务——门二注记：主控落 F-CSS-03 行时须含「多处 FS_DECL=红」哨兵要素（门一 W3 原文建议）。门一已裁「当前文件单处故非现役缺陷」（本门亲测 theme.test.ts FS_DECL 恰 2 处=1 定义+1 引用，`FS_DECL = /` 赋值形态唯一，提取面现役安全） | ✓（附收口兑现注记） |
| W4 | F-CSS-03 立案证据不在包内（INV-11 引用可能悬空） | registry 落账=收口提交一部分 | registry.ts:253 现状 F-LINT-01 open（收口前正常）+F-CSS-03 行未落（预期）；终裁档 §5.2 立案要素在档（token 档位盘点/61+6 迁移/§6.2 三件套/清理毕落 C-4+B-5）；推演收口含新票行后 check-tickets 绿=成立（机理见清单④ registry 推演） | ✓（附收口兑现注记） |
| W5 | 「61+6 真违规」定性偏强（7 注释行+一次性字面量≠INV-11 字面违规） | 终裁档 §5+INV-11 状态列两处改分型 | 两处亲读核对：终裁档 §5「同值多源实锤子集=真 INV-11 违规（#ffffff 11+/rgba(255,255,255,*) 群/#e81123×2）；一次性唯一字面量+7 注释行=严于 INV-11 字面的 token 化未达面」✓；INV-11 状态列「[同值多源=真违规子集+一次性字面量=严于字面的 token 化未达]」✓（7 注释行并入分型简写，语义无损） | ✓ |

门一 9N 抽验：N1 贪婪匹配（本门 node -e 实提取 m[1] 与 :425 逐字一致=保真实证）/N3 第 8 件（本门逐文件计数闭合，见④-4）/N7 行数自洽（wc -l=196 亲测）——抽验全中，无翻案项。

## 清单② 母本符合度（票面 vs 实际达成）

**票面**（registry.ts:253 F-LINT-01 行）：目标含「INV-11 状态『部分』→『已锚定』升格登记」+验收含「存量零误报」。**实际达成**＝「部分→机器面扩展」诚实分级+C-4/B-5 顺延 F-CSS-03。

落差闭合性裁决：**✓ 被完整论证+档案化**——
- 论证在档：终裁档 §5 修正节明记设计前提错误（「存量零误报」验收与 61+6 存量事实互斥——实现者 BLOCKED 实证 f-lint01-impl.report.md §2.1/§2.2：61 行=54 声明+7 注释、B-5 六处）+修正终裁 3「不升已锚定」明文。
- 三处一致性两处已落：终裁档 §5（改向在档）✓/INV-11 状态列（诚实分级落册，「部分→机器面扩展」与 §5.3 语义一致）✓。
- 第三处=registry：票面行原文仍写「已锚定升格」目标——**收口翻 done 时 summary 须补改向注记**（F-CSS-02 收口先例形态），否则三处之一留旧目标措辞。门二注记：主控收口兑现义务，非阻断（终裁档为唯一真相源且已声明冲突以本档为准，票面旧措辞有 §5 明文覆盖）。

## 清单③ 宪法红线终审

| 项 | 核验 | 判 |
| --- | --- | --- |
| 受锁流程 | 两受锁件（scripts/*.mjs walk 面+docs/invariants.md）经预 unlock→改→apply 287（manifest 两件新 sha 亲核+locks:check 亲跑绿）；哨兵验证临时变异亦走正规 unlock→变异→还原→apply，还原后 sha 逐字节回原值 a4d35e39…、apply 后 M 面不扩 | ✓ |
| UTF-8 | node 读检两件：U+FFFD 均 NONE（check-quality 8482 字符/invariants 50638 字符） | ✓ |
| 行数 | check-quality.mjs=196 行（wc -l 亲测）≤500；diff hunk `@@ -164,6 +164,30 @@`=+24，172+24=196 自洽（与门一 N7 一致） | ✓ |
| 证据链四档 | ①red1-c8：`f-lint01-probe.css: CSS 字号字面量 1 处（样例：font-size: 12p）`在档 ✓；④red4-sentinel：`哨兵：theme.test.ts FS_DECL 提取失败（match null）`在档 ✓；作废②red2-c4/③red3-b5 头注保留不删（「[作废 2026-09-09 回炉1——C-4/B-5 顺延 F-CSS-03（终裁档 §5）…见 impl.report §8]」）✓；存量四关 r1-final-{lint,quality,typecheck,test}.raw.txt 尾全 exit=0 ✓ | ✓ |

## 清单④ 机器面核对（亲跑矩阵）

1. **quality:check 存量绿**：exit=0「quality 检查通过」（C-8 段在场=diff 实物+行为双证）✓
2. **哨兵独立验证**（cp 备份法，备份驻 /tmp 用后即删、禁 git checkout 受锁件）：变异=单处替换 `const FS_DECL =`→`const FS_DECL_X =`（:425 定义行；:436 引用保留）→quality:check 红「哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更」+**真退出码 1**（注：首次 tee 管道 `$?` 显示 0=tee 伪影，已识别并单独复测 `REAL_EXIT=1` 落 g2-sentinel-red.raw.txt 头注外——档内保留原样+本行勘误）→cp 还原（sha=a4d35e39… 与 manifest/原值逐字节一致）→locks:apply 287→复跑绿 exit=0。**途中实证变异前 EPERM=受锁只读位在场**（好信号：锁面活着）✓
3. **C-8 红证复算**：新建 src/renderer/tmp-probe.css 含 `font-size: 12px`→quality:check 红「src/renderer/tmp-probe.css: CSS 字号字面量 1 处（单源=--fs-* token；样例：font-size: 12p）」真退出码 1→删探针→复跑绿 exit=0。附注两条：样例「12p」截断=FS_DECL 正则 `[a-z%]` 单字符单位设计（单位首字符即判，F-CSS-02 终态 v2 语义），非缺陷；.css 不入 lint/typecheck 的 ts/tsx 面，删后即净（复跑绿实证）✓
4. **提取保真独立复算**（node -e，与 check-quality 提取同构）：m[1]=`font-size:[^;{}]*[\d.]+\s*[a-z%]`——与 theme.test.ts:425 正则体**逐字一致**（转义保真：`\d`/`\s` 字面反斜杠序列无损，N4 推演+本门实取双证）→对 src 下 8 件 CSS（theme.css/theme-{buttons,lineage,reader,shell}.css/library.css/workspace.css/**text-layer.css**）逐文件 match 计数**全 0、TOTAL=0/FILES=8**——门一 N3 遗留「第 8 件 text-layer 零命中」确认（落 f-lint01-g2-extraction.json）✓
5. **verify 档核对**：f-lint01-verify.raw.txt 尾「exit=0」+「Test Files 156 passed (156)」+「Tests 1466 passed (1466)」真实性抽查 ✓；287=locks:check 本门亲跑 ✓
6. **registry 推演**（读 check-tickets.mjs 逻辑）：objRe=`\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'…`/ticketRefRe=`SR2?-[A-Z]+-\d+`——**均只匹配 SR-/SR2- 前缀，F 系行整体不在解析面**。实证：现状 F-LINT-01=open 而 tickets:check 输出「共 119 个；open 0」exit=0。⇒收口提交翻 F-LINT-01 done+新增 F-CSS-03 行后 S/R 系面零变化→tickets:check **必绿**。机理=F 系盲区（F-CSS-02 门二已注记的既有设计边界，非本票引入；本票接续注记+交接书已知）✓
7. **tickets:check 基线**亲跑绿 exit=0 ✓

## ⑤ 成本账本行

| 环节 | 模型×供应商 | in/out/时长 | 来源核验 |
| --- | --- | --- | --- |
| 设计链跳 1（拟定） | Kimi K3（kimi-main） | in=1361/out=2993/89s | design-call.raw.txt:1 亲核 ✓ |
| 设计链跳 2（审核） | deepseek v4 flash | in=2615/out=10070/92s | review-call.raw.txt:1 亲核 ✓ |
| 门一 | kimi-backup（kimi-k3，switches=1=主源 504 退避耗尽合法兜底） | in=0/out=10247/558s | gate1-call.raw.txt:1 亲核 ✓（in=0=backup 链计数口径，如实照档） |
| 实现者两轮（BLOCKED+回炉1） | GLM5.3flash[环境统一档] | token 计数环境不暴露——如实记，不自估 | impl.report 在档 |
| 门二（本档） | 统一档同源（欠账披露见档头） | token 计数环境不暴露——如实记 | — |

## 终评：**PASS**（无条件，0 blocking）

改向决策（C-8 照落+C-4/B-5 顺延 F-CSS-03）经门二独立复算成立：C-8 关卡红绿双向+哨兵双向+提取保真 8 件全 0+受锁流程闭合全亲验。**三条收口兑现注记**（主控收口提交义务，均非阻断）：
1. registry 落 F-CSS-03 行时须带 W3 要素（「多处 FS_DECL=红」哨兵）+§5.2 立案要素（W3/W4 闭合落点）；
2. F-LINT-01 行翻 done 时 summary 补改向注记（票面「已锚定升格」旧目标措辞与实际「诚实分级」落差的 registry 侧闭环）；
3. 收口提交=受锁两件+manifest+终裁档+audits 证据件显式列名（三桶口径①），[locked-change] 尾注。
