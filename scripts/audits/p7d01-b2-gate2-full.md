# P7D-01 批二 · 门二终审报告（2026-09-08）

> **档位申报**：政策档位 deepseek v4flash 优先 / GLM5.3flash 次选——**实际执行模型
> = GLM-5.3（builtin:bigmodel-coding-plan/GLM-5.3）**，思考等级=平台默认（子代理面
> 不可读）。与实现者（GLM5.3flash）**同家族=同源欠账**，如实记入本报告与成本账本；
> 异构二审面本场未达成，主控收口时按 methodology §4.5 口径自计。
>
> **技能清点（开工纪律）**：verification-before-completion=用（门二=二审实证位，
> 核心对应：禁只审不跑）；code-review-excellence=用（diff/裁决档逐处审阅）；
> systematic-debugging=备用未触发（变异红证与还原均按预期，无异常需定位）；
> test-driven-development=不用（无新功能实现面，仅变异红证）；browser 系技能=不用
> （DOM 断言走 Electron launch 临时脚本驻 OS temp，非浏览器面）；
> subagent-driven-development=不用（本人即门二终审位，无派发面）。
>
> **审档包**：`scripts/audits/p7d01-b2-gate2-package.md`（门一 Kimi K3 W4/N13
> PASS_WITH_WARNINGS + 主控处置表 + 实现者报告终版含 §7 回炉两轮 + 主控亲验摘要
> + 工作树全量 diff 18 件）。

---

## ① 处置核对——门一 W4 + 主控处置表 vs 工作树终态（逐条亲核）

| 项 | 主控处置 | 门二终态核 | 结论 |
| --- | --- | --- | --- |
| **B-4 裁决档悬空** | 「非悬空——裁决档在工作树，随收口提交入库」 | `git status`：`?? docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md`（未跟踪，3307 字节，mtime 09-08 22:50）+`?? docs/design/mockups/p7d01-b2-fontscale.html`（案册评审载体）——两件在场；INV-61/theme.css:5-6/theme.test.ts:110-111/library-cards 注释四处引用指向真实文件 | **闭合**。收口条件：两未跟踪件随 [locked-change] 提交一并 `git add`（显式列文件） |
| **C-2/C-3 负锚枚举式<登记语义** | 「接受为后续增强单候选（正则全域任意数字 font-size 声明归零）——不阻塞本票；教训入交接书」 | 处置表在档（审档包 §处置表第 2 条）。门二独立评估：门一指出的三形态洞（尾随分号依赖 / `!important` / `font:` 简写）+枚举值外字面量+tsx 仅 4 件——**均为「未来回填」防线宽度问题**，对本票当前 30 处消费面：先红 27 红（3c 前 25 处声明形态即红）+本场变异红证（见 ④c）双向证明枚举锚活着且覆盖全消费面。认同不阻塞 | **认同处置**。交接书滚动=主控收口动作（本审不核交接书正文） |
| **E-3 注释失实** | 「主控顺手清（10px/39）」 | theme-lineage.css:114「10px 斜体灰阶」/:116「3 行×10×1.3=39」终态在场；LineageEdges.tsx:13「130×39」/:15「10px 斜体」终态在场 | **闭合** |
| **第 14 处耦合族迁移完整核**（处置表回炉两轮） | 「全族迁移 8 处成员+估宽基准 9.5/4.75→10/5 随迁」 | 见下 §①-a / §①-b | **闭合，零残留** |
| **回炉二轮红 1 例适配** | 「edge-label-layout.test ③ 夹具 hw 50→52 恢复触发条件，断言面零放宽」 | test:88 `hw: 52`/:93 `hw: 58`（外扩 +6）在场；断言 `not.toBe(0)`+`disjoint(...).toBe(true)` 原样；:82-85 因果链注释在场（估宽 42→44→hw 23→24→dx 第三档 80 对旧盒 79 翻转分离） | **适配合理**：夹具调整恢复「dy=0 全档相撞」前提，断言语义（偏移已发生+分离）不变 |

### ①-a 耦合族残留 grep（指令口径：37.05/12.35 应零残留）

```
grep -rn "37\.05\|12\.35\|41\.05\|123\.5" src/ tests/   → 零匹配（exit=1）
```

连注释面都无残留，无需甄别。

```
grep -rn "9\.5\|4\.75" src/ tests/   → 6 处，逐条甄别：
```

| 位置 | 内容 | 甄别 |
| --- | --- | --- |
| src/renderer/app/TitleBarControls.tsx:57 | SVG path `M9.5 0.5` | 坐标，非字号面，无关 |
| src/renderer/app/App.tsx:156 | SVG rect `x="9.5" y="9.5"` | 坐标，非字号面，无关 |
| src/renderer/features/lineage/edge-label-layout.ts:29 | 注释「字号 9.5→10 耦合族随迁」 | 合法历史迁移描述 |
| tests/unit/renderer/edge-label-layout.test.ts:20 | 注释「字号 9.5→10 耦合族随迁」 | 合法历史迁移描述 |
| tests/unit/renderer/edge-label-layout.test.ts:82 | 注释「基准 9.5→10 使估宽 42→44」 | 合法历史迁移描述（回炉二轮因果链） |
| tests/unit/renderer/theme.test.ts:416 | `FS_LITERALS` 含 `'9.5px'` | 负锚防线本体（防旧字面量回填），必须在场 |

**结论：零规格性残留。**

另一处需甄别（非指令 grep 口径命中，门二扩扫所得）：LineageEdges.tsx:29「pan 起手面小损 130×37 在档声明」——上下文为对某历史预裁声明的**文献引用**（原文本就写 130×37 非 37.05 精确值），非当前渲染规格描述。观察项，不阻断，随下次触碰 LineageEdges 头注顺手更新。

### ①-b 族成员 8 处+估宽 2 处终态逐一在场（grep 亲核）

| 成员 | 终态 | 在场 |
| --- | --- | --- |
| edge-label-layout.ts:30 `EDGE_LABEL_H` | `= 39` | ✓ |
| edge-label-layout.ts:32 `LH` | `= 13` | ✓ |
| edge-label-layout.ts:16 注释 | `lh=13=39/3 行行高，±130/20 档` | ✓ |
| edge-label-layout.ts:29 注释 | `3 行 × 10px × 1.3 行高` | ✓ |
| theme-lineage.css:131 | `max-height: 39px` | ✓ |
| LineageEdges.tsx:13 / :15 注释 | `130×39` / `10px 斜体` | ✓ |
| edge-label-layout.test.ts:21 / :41-42 / :88 / :93 | `LH = 13` / `toBe(24)`+`toBe(19)` / `hw: 52` / `hw: 58` | ✓ |
| lineage-canvas.test.tsx:462 | `toBe('39')` | ✓ |
| **估宽** edge-label-layout.ts:49 | `? 10 : 5` | ✓ |
| **估宽** edge-label-layout.ts:40-41 注释 | `全宽 10px/字` / `半宽 5px/字` | ✓ |

渲染 FO height 由 LineageEdges.tsx import `EDGE_LABEL_H` 单源消费——无第二字面量（实现者 §7.3 对账口径，门二 grep 复核一致）。

### ①-c 门二增量：第 14 处耦合族**唯一性**独立复核（门一未覆盖面）

实现者 §7.1 仅 grep `1.3` 特定值。门二扩大口径至「变化面 13 处选择器块内是否存在比例行高×固定盒高同类派生」：

- 变化面其余 12 处选择器块（app-header-name / app-nav-item / app-nav-ver / app-nav-txt / lib-tag / lib-card-tagmore / lib-card-meta / lib-detail-title / lib-detail-v-serif / rdr-aside-h4 / lineage-legend / LineageNodeCard TITLE_STYLE[lineHeight '18px' 固定像素非比例]）：**零 height/max-height/min-height 声明**；
- 全六 CSS 比例行高仅 3 处：library.css:115（lib-card-title 1.45——14 零变化面）/ library.css:213（lib-detail-title 1.5——块内无固定高，自然流高无截断语义）/ theme-lineage.css:126（edge-label 1.3——已迁）。

**结论：耦合族唯一=edge-label 域，实现者结论在扩大口径下成立。** 主控偶然抓到的第 14 处不是冰山一角。

---

## ② 母本符合度——裁决档映射表 vs 工作树终态（亲读裁决档 §1/§2 对账）

### ②-a 六 token 逐值（裁决档 §1 ↔ theme.css:59-64）

| token | 裁决锚值 | 终态 | DOM 真机 |
| --- | --- | --- | --- |
| --fs-micro | 10px | 10px | 10px ✓ |
| --fs-caption | 11px | 11px | 11px ✓ |
| --fs-body | 12px | 12px | 12px ✓ |
| --fs-strong | 13px | 13px | 13px ✓ |
| --fs-title | 14px | 14px | 14px ✓ |
| --fs-display | 17px | 17px | 17px ✓ |

### ②-b @theme 重绑（裁决档 §2 原文 ↔ theme.css:7-10）

`--text-xs: var(--fs-body)` / `--text-sm: var(--fs-title)` 逐字一致；DOM 真机 `.text-xs`=12px / `.text-sm`=14px（重绑经 tailwind v4 编译链在真机生效——非仅源码在场）。

### ②-c 30 处替换（grep 实测计数 ↔ 裁决档 §2 总账）

- CSS 25：`grep -c "font-size: var(--fs-"` → theme-shell 4 / theme-reader 2 / theme-lineage 5 / library 10 / workspace 4 = **25**（theme.css 0=定义件不消费，正确）；
- tsx inline 4：LineageNodeMeta:32 micro / LineageNodeCard:53+:147 body / LineageSideTags:20 caption；
- arbitrary 1：TabBar:138 `text-[length:var(--fs-micro)]`；
- **合计 30** ✓。
- 变化面 13 = 9.5×3 + 10.5×4 + 11.5×1 + 12.5×1 + 13.5×1 + 15×3 ↔ 裁决档 §2「13 处视觉变化」逐档一致；
- 零变化 17 = 10×3 + 11×3 + 12×5 + 13×4 + 14×1 + 17×1 ↔ 裁决档 §2「17 处零变化仅换载体」逐档一致；
- 映射无错位抽查：15→title（非 display）✓ / 13.5→strong（非 body）✓ / 11.5→caption（非 body）✓ / 12.5→body（非 strong）✓——与门一 A-2「无一处映射错位」独立复核一致。

### ②-d 裁决档 §3 实现约束四条

1. token 驻 theme.css `:root`（批一 z 序段后、--font-display 前）✓；消费面清单=四皮肤件+library+workspace+tsx×4+@theme ✓；
2. §6.2 探针口径切换——主控位亲验（探针 after COMPARE FAIL=预期红 8 态 DIFF+tokens 11 ok）；门二以 DOM 定向断言独立复核变化面 13 处中的 5 处（app-header-name 15→14 / app-nav-item 13.5→13 / app-nav-ver+app-nav-txt 9.5→10 / ws-caret 零变化对照）真机计算值命中裁决值 ✓；
3. INV-61 登记（invariants.md 文末，五列同构 INV-59/60）+theme.test.ts TOKENS 六正锚+FS 负锚 84+tsx 2+@theme 1 ✓；
4. B5 缩放复核结论供档不预改——实现者 §5 在档（--fs-* 不入 zoom/calc 乘算），门一 E-2 核过，门二无异议。

---

## ③ 宪法红线终审

| 项 | 核验 | 结论 |
| --- | --- | --- |
| **受锁件清单+manifest 同步** | 五受锁件（theme.test.ts / library-cards.test.tsx / edge-label-layout.test.ts / lineage-canvas.test.tsx / invariants.md）改动均在票面 3d/3e 明文+主控追认（library-cards §4.2 自裁 / 回炉两测试处置表）内；manifest diff 恰含此五件 sha256+generatedAt；**verify locks:check 亲跑「286 个受锁文件与 manifest 一致」** | ✓ 主控已 apply，同步在案 |
| **UTF-8** | `file` 报告 theme.css / invariants.md / theme.test.ts 均「UTF-8 text」；U+FFFD 替换字符 grep（src/renderer/shared + features + 四受锁测试 + invariants.md）零匹配；verify quality:check「无乱码」过 | ✓ |
| **行数关卡** | theme-lineage.css **140** 行（改后，注释扩写未越界）/ theme.css 133 / theme.test.ts **454**（与实现者声称一致）——均 <500；lineage-canvas.test.tsx 579=既有面（本票 numstat 2/2 零净增；eslint.config :187-189 tests 面 `max-lines: off`）；verify lint 段全绿 | ✓ |
| **安全禁令** | 本票纯 CSS / inline style / 注释 / 测试面——无 IPC / SQL / openExternal / nodeIntegration / 出网 host 触碰面 | ✓ 不适用 |
| **分层单向** | renderer 内 CSS+tsx，无跨层 import 新增（typecheck+lint 绿） | ✓ |
| **范围蔓延** | git status 18 M = 首轮 13 + 回炉 5（edge-label-layout.ts / LineageEdges.tsx / edge-label-layout.test.ts / lineage-canvas.test.tsx / manifest）——与审档包 diff 清单逐件对账；未跟踪面=裁决档+mockup+scripts/audits 审计产物 | ✓ 零蔓延 |
| **门二禁改面** | 本审未 git commit / 未碰 registry / 未改 src 与受锁文件（变异备份还原例外：diff exit=0 空） | ✓ |

---

## ④ 机器面核对——亲跑矩阵

### ④-a `npm run verify` 全链真退出码

raw=`scripts/audits/p7d01-b2-gate2-verify.raw.txt`（门二独立跑，非复用主控 final-verify）

| 段 | 结果 |
| --- | --- |
| quality:check | 通过：无占位标记 / 无乱码 / 无跨域引用 |
| tickets:check | 通过：注册表与代码一致 |
| locks:check | 通过：**286** 个受锁文件与 manifest 一致 |
| lint + typecheck | 通过（链中 && 到达 test） |
| test | **Test Files 156 passed (156) / Tests 1543 passed (1543)**（vitest Duration 47.76s） |
| build | main 182.47 kB / preload 137.96 kB / renderer CSS **51.04 kB**（与实现者 §7.4 一致）|
| **GATE2-VERIFY-EXIT** | **0** |

node=v24.20.0（volta 项目锁生效——check-quality 版本守卫过，无 Node25 jsdom 假红面）。

### ④-b DOM 定向断言（Electron 真机 computed style）

脚本驻 OS temp `/tmp/tmp.f8i5Sofc49/p7d01-b2-gate2-fsassert.mjs`（未入 repo/scripts；createRequire 解析项目 @playwright/test，`_electron.launch({ args: ['out/main/index.js'] })` 复用 e2e-env.ts 配方，SYNAPSE_USER_DATA 隔离 temp）。raw=`scripts/audits/p7d01-b2-gate2-fsassert.raw.txt`。

```
[PASS] :root --fs-micro: want=10px got=10px
[PASS] :root --fs-caption: want=11px got=11px
[PASS] :root --fs-body: want=12px got=12px
[PASS] :root --fs-strong: want=13px got=13px
[PASS] :root --fs-title: want=14px got=14px
[PASS] :root --fs-display: want=17px got=17px
[PASS] .app-header-name: want=14px got=14px     ← 15→14 变化面
[PASS] .app-nav-item: want=13px got=13px        ← 13.5→13 变化面
[PASS] .app-nav-ver: want=10px got=10px         ← 9.5→10 变化面
[PASS] .app-nav-txt: want=10px got=10px         ← 9.5→10 变化面
[PASS] .ws-caret: want=10px got=10px            ← 零变化对照
[PASS] .text-xs: want=12px got=12px             ← @theme 重绑真机生效
[PASS] .text-sm: want=14px got=14px             ← @theme 重绑真机生效
TOTAL=13 PASS=13 FAIL=0
FSASSERT-EXIT=0
```

与主控亲验摘要「DOM 计算样式断言 13/13」**独立复现一致**。

### ④-c 独立变异抽查（cp 备份法，禁 git checkout）

raw=`scripts/audits/p7d01-b2-gate2-mut.raw.txt`（红段+还原分隔行+复绿段同档）

| 步 | 操作 | 结果 |
| --- | --- | --- |
| 备份 | `cp theme.css → /tmp/.../theme.css.gate2bak` | 备份 :61 `--fs-body: 12px` 完好 |
| 变异 | `sed 's/--fs-body: 12px/--fs-body: 13px/'` | :61 `--fs-body: 13px` 落地 |
| 红证 | `npm run test`（全量） | **EXIT=1，1 failed \| 1542 passed (1543)**——恰 1 红 = `R3-TH1 theme token 冒烟 > --fs-body 声明为设计定稿值 12px`（AssertionError: theme.css 应含 "--fs-body: 12px;"） |
| 还原 | `cp 备份 → theme.css`；`diff` | **diff exit=0（空）**；:61 归位 12px；`git diff --stat theme.css` 仍 +17（变异零污染工作树） |
| 复绿 | `npm run test`（全量，同口径） | **EXIT=0，156 passed / 1543 passed** |

**红构成分析**：变异击中 TOKENS 正锚且**零连带**——FS 负锚锚定 `font-size:` 声明形态、不咬 `--fs-body:` 自定义属性定义行；@theme 重绑锁只查 `var(--fs-body)` 在场不查值。此形态精确印证实现者自裁 §4.1「定义正锚+消费负锚」分工设计：定义值漂移由正锚独锁（本证），消费面回填由负锚独锁（实现者先红 27 证）。两证互补，双锚均活。

### ④-d 翻 done 推演（守卫耦合核）

- `tickets/registry.ts:245` P7D-01 `status: 'open'`——未翻（正确：门二禁碰 registry，翻状态=主控收口动作）；
- tests/ 含 P7D-01 引用三件（theme.test.ts / library-cards.test.tsx / edge-label-layout.test.ts）+lineage-canvas.test.tsx——四件**零 `guardedDescribe` / `isTicketDone` 调用**，仅头注声明 always-active（ADR-0017 裁决 3——K3 威胁三屋结构性缺位对策）；翻 done 时测试激活态零变化，1543 基线不漂移；
- `scripts/check-tickets.mjs` 的 `objRe` / `ticketRefRe` 均为 `SR2?-[A-Z]+-\d+` 形态——**P 系工单（P7D-01）不入解析范围**（既有设计面，非本票），src/tests 中的 P7D-01 字样对 tickets:check 不可见；
- **结论**：翻 done = 纯 registry 字段操作，verify 各段零机器面耦合。主控收口翻状态后亲验 verify 即可（宪法收口单流程）。

---

## 观察项（非阻断，门二增量登记）

1. **check-tickets 对 P 系工单零校验**（`objRe` 仅抓 `SR2?-` 形态）——P7D-01 等战役票的 done/open 状态不受 K3 防线约束。既有面非本票缺陷；若主控认为 P 系工单也需「不实现就翻状态」防线，属独立小单（受锁脚本 [locked-change]）。
2. LineageEdges.tsx:29「130×37 在档声明」历史引用注释——随下次触碰该头注顺手更新为 130×39 或改写为「旧 130×37.05 声明」明示历史性。
3. 环境注记：门二两次 `npm run test` 后 better-sqlite3 绑定处于 **node ABI 态**（test script `sqlite-abi use node`）；verify / test:e2e 各段自带切换，主控收口无需手动干预。
4. 门一 C-2/C-3 增强单候选建议的正则形态：`font-size:\s*\d[\d.]*px(?![\d.])`（去分号依赖+防前缀误咬）+ tsx 面扩至 `src/renderer/**/*.tsx` walk——供增强单票面参考。

---

## 终审裁决

**PASS（无条件）**

- 四清单零阻断：处置核对 5 项全闭合（B-4 在场 / C-2C-3 认同不阻塞 / E-3 清毕 / 第 14 处族 10 处终态在场零残留 / 回炉二轮适配合理）；母本符合度六 token+@theme+30 处+13/17 总账逐档对账一致；宪法红线七项全过；
- 机器面四数字亲验命中：verify **156 文件 / 1543 用例 / locks 286 / EXIT=0**；DOM **13/13 PASS**；变异 **1 红→还原空→复绿 156/1543**；翻 done 零耦合；
- 门二增量：第 14 处耦合族唯一性在扩大口径下独立复核成立（非冰山一角）。

**收口条件（主控位）**：
1. 显式列文件 staging：18 M + 2 未跟踪设计件（裁决档+mockup）+ 审计产物按惯例；禁 `git add -A 目录`；
2. 提交尾注 `[locked-change]`（五受锁件+manifest）；
3. registry P7D-01 翻状态+批二注记（含第 14 处耦合教训指针）；
4. 交接书滚动：C-2/C-3 增强单候选+「字号变化→派生几何耦合面票面/门一均漏检」教训行+本场同源欠账（门二 GLM-5.3 与实现者同家族——异构二审面未达成）。

---

## ⑤ 成本账本行

| 项 | 值 |
| --- | --- |
| 角色 | P7D-01 批二门二终审 |
| 模型 × 供应商 × 套餐 | GLM-5.3 × bigmodel × coding-plan（builtin:bigmodel-coding-plan/GLM-5.3） |
| 政策档位 vs 实际 | deepseek v4flash 优先 / GLM5.3flash 次选 → 实际 GLM-5.3（**与实现者同家族=同源欠账**） |
| 思考等级 | 平台默认（子代理面不可读） |
| token | 工具面不暴露读数——由主控侧 usage 回填（宪法：禁自估） |
| 时长 | ≈13 分钟（mtime 链推算：审档包 00:07:10 读入→verify.raw 00:09:14→fsassert.raw 00:11:06→mut.raw 00:14:48→报告落盘 ≈00:20） |
| 机器时 | verify 全链 1 次 + npm run test 全量 2 次（变异红/复绿）+ Electron launch 1 次（DOM 13 断言） |
| 产物 | p7d01-b2-gate2-verify.raw.txt / p7d01-b2-gate2-fsassert.raw.txt / p7d01-b2-gate2-mut.raw.txt / 本报告（均 scripts/audits/，非 .mjs/.ps1 不入受锁 walk） |
