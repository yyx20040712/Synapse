# P7D-01 批一 ·门二终审全文报告（四清单+亲跑矩阵）

> 门二=GLM5.3flash（环境统一档政策次选——Agent 工具面无 model 参数；**与实现者
> 同家族（GLM5.3 系）半异构欠账如实记**；与门一实际审者 deepseek v4 flash 跨门
> 异构成立——门一路由 Kimi 8×504 耗尽 deepseek 兜底实录已核）。项目根
> E:\class\智慧水务\Synapse_remake，node v24.20.0（亲验）。
> 输入四件：票面简报 p7d01-b1-brief.md / 实现报告 p7d01-b1-impl.report.md（§1~9
> +§10 回炉）/ 门一包 p7d01-b1-gate1-package.md / 门一审+处置 p7d01-b1-gate1.md。
> 方法：逐条裁决+独立复算+亲跑矩阵（禁只审不跑、禁预设立场）。

---

## ① 处置核对（门一 findings+主控处置表 vs 终态实物——逐条「说了没改/改了没说」）

| 门一 finding / 处置 | 终态实物核验 | 裁决 |
| --- | --- | --- |
| §1.1 间距负锚单形态 → **W1** 字符类扩 | theme.test.ts:276-287：主 regex `['"\`]?[\d-]`（三引号形态全覆盖）+**独立鉴别锚**用例 ：283-287（`"[\d-]` 与 `` `[\d-] `` 各一条断言，防字符类笔误退化）；kebab-case 不加=主控裁定记档于 §10 | ✅ 兑现 |
| §1.2 z 锁漏 arbitrary+消费链 → **W2** | :261-263 新用例 `not.toMatch(/\bz-\[\d+\]/)` 全 arbitrary 禁；消费链面=探针 compiledRules 绝对断言（见下） | ✅ 兑现 |
| §1.3 duration 异形态 → **W3** | :265-274 新用例：`/\b(transition\|animation)[^;{}]*[0-9]ms/` 三 CSS 文件断言；注释记录 2 处注释字样（theme:319/ws:52）不误咬+0.30s 边界裁定记档 | ✅ 兑现 |
| mutation-4/5/6 红证 | raw 逐一亲读：m4=**2 failed**（86P/88，红点=间距主负锚+W1 鉴别锚双红——与变异「双引号注入」因果吻合）/m5=**1 failed**（87P/88，红点=W2 用例名精确命中）/m6=**1 failed**（87P/88，红点=W3 用例名精确命中），全 exit=1 | ✅ 红证在档且归属一致 |
| mutation 4/5/6 还原 | RESTORED-CLEAN-4/5/6 **无独立落盘件**（弱记录点）；还原事实由门二终态独立验证替代：grep 140ms=0（m6 残留）/`padding: "0 4px"`=0（m4 残留）/`z-[50]`=0（m5 残留），三变异注入面终态零残留 | ✅ 事实成立（记录面欠账如实记） |
| 探针 compiledRules 强化 | probe3.raw 亲读：`[ok] compiledRules: 11 项 utility 规则全在场`+`[COMPARE] PASS`+exit=0；探针源 :327-328/:361-365 核实=WANT_RULES 11 项（4 z 简写+7 间距 class）bundle CSS 绝对断言（Tailwind 按需生成=覆盖未渲染件） | ✅ 在档且我亲跑复现（见④） |
| §6(1) 不增键覆盖映射表 | 在档：gate1.md 处置表行（title/footer/year=canvas；tagbox+chip=tagged；AiNotes/ManualNote/Panel/SideTags 四 h4+chip=side）。门二独立核验：探针 8 态清单亲读（lib/ws-panel/settings/lineageToast/lineageCanvas/lineageSide/lineageSideTagged/dialog/reader）与映射逐项吻合——canvas 态渲染节点卡（title/footer/year）、:289 tag 输入→lineage-tag-chip waitFor（tagged）、:281 lineage-side-tags waitFor（side 四 h4） | ✅ 映射在档且独立复核成立 |
| §6(2) 5/9 弹层件未渲染 | 处置三件套齐：compiledRules 绝对断言（上）+Dialog（dialog 态）/Toast（lineageToast 态）/LineageToolbar（canvas 态）在场渲染+e2e 42/42（raw 在档，见④） | ✅ 兑现 |
| §2 在场锚脆性→不处置 / §5.2 INV 空窗→维持 / §5.3 头注→无需 | 终态无对应改动=与处置一致（不处置≠漏改） | ✅ 一致 |

**「改了没说」扫描**：终态 diff 21 文件与票面清单 1:1（3 CSS+9 弹层件+6 间距件+page-layer-z.ts+theme.test.ts+manifest），SelectionToolbar 头注同步=自裁①已申报，无未申报改动。

## ② 母本符合度（票面③裁决 vs 终态 diff——独立复算，全 grep 实测）

- **token 定义 11 条逐字**：theme.css:35-41（7 dur）+:44-47（4 z），值与注释与票面裁决原文逐字一致；插位 --radius-l 后、--font-display 前 ✅
- **32 duration 替换零漏**：`var(--dur-*)` 消费实测 theme=16/ws=7/lib=9=**32**；per-token 分布 press7+tint4+fast10+base4+lazy2+rise4+flow1=32，与票面三文件逐值分布（theme 0.08×4/0.14×6/0.12×3/0.18×2/0.3×1；ws 0.18×2/0.08×2/0.12×1/0.14×2；lib 0.22×4/0.14×2/0.08×1/0.2×2）**逐值吻合**；裸字面量计数 7 值×3 文件=theme 各 1（定义处）/ws 0/lib 0（含回炉后新增声明段边界——grep 子串连续性安全：0.2s 不咬 0.22s）✅
- **12 z class+2 raw**：tailwind class 计 13 行=12 class（Dialog1/Toast1/AnnotationEditor1/AnnotationMenu1/SelectionToolbar1/TagLifecycleMenu2/LineageNodeMenu2/LineageToolbar1/LineageBoard1——票面分布逐件吻合）+SelectionToolbar:6 头注 1 处（自裁①）；raw 2 处=theme.css:106（.app-header）+:566（.lineage-fit-btn）`z-index: var(--z-float)`；9 件无裸 z-10/20/40/50、无 z-[N] 残留 ✅
- **12 间距表逐行**：12 迁移点全在场（NodeCard:133 pt-2/:140 gap-1；NodeMeta:71 px-1/:69 gap-0.75 px-0.75（#4+#5 同元素）/:79 pl-1；SideAiNotes:71/SideManualNote:57/SidePanel:180/SideTags:46 四 pl-1.5；SideTags:51 gap-0.75 px-1（#10+#11 同元素））；6 件数值间距属性 grep=**none**（W1 扩展形态）✅
- **animation 时长零改**：theme:235 `syn-pan-y 5s`/:289 `2.8s`；ws:21 `syn-pan-x 6s`/:72 `ws-pop 0.16s`——四值裸值在场，diff hunk 范围（ws @@ -24,-93；theme @@ -164/-312/-335/-350/-364）不含这些行 ✅
- **marginLeft auto 保留**：NodeMeta:80 `marginLeft: 'auto'` inline 在场 ✅
- **page-layer-z.ts 仅头注**：diff 仅 :17-18 两行注释措辞（z-20/z-10→新 class 名），PAGE_LAYER_Z 常量块在 diff 外=零改 ✅

## ③ 宪法红线终审

- **分层**：改动全在 src/renderer/**（CSS 值替换/className/注释）+tests/**+locks manifest——renderer 层内零跨层 ✅
- **受锁**：theme.test.ts 唯一受锁触碰件；manifest `files.length`=**282** 亲验（node 复核）+verify 前段 locks:check 282 一致亲跑过；两轮 unlock→apply 全程记录在实现报告 §6/§10 ✅
- **安全禁令**：diff 新增行 grep nodeIntegration/webSecurity/sandbox/contextIsolation/eval/new Function/openExternal=**clean** ✅
- **行数**：theme.test.ts 316 行（≤500 ✅）；⚠️ theme.css 631→**645 行**存量超 500（迁移前已超、ESLint max-lines 无 CSS 面、本票 +14 为票面裁决必然后果）——**观察项转主控记档，不否决**
- **UTF-8**：所读全部文件中文可读（theme.test.ts/theme.css/各 tsx/raw）✅
- **TDD 证据链四档**：首红 first-red.raw=31F/54P(85) exit=1 落盘（0.3s 单条恰绿已披露）✅；变异 6 次 raw 全落盘（1:2F/2:1F/3:1F/4:2F/5:1F/6:1F 全 exit=1）+cp 备份法（RESTORED-CLEAN 独立落盘件缺——终态零残留已由门二独立验证补强，弱记录点如实记）✅；绿=全量 verify2/3/4 exit=0 三份在档 ✅；verify 真退出码链完整（首轮 exit=1 红点=determinism-check.cjs lint 环境面→主控删档处置→三绿）✅
- **grep 无 TODO/FIXME/placeholder**（diff 新增行+quality 关卡亲跑过）✅；**禁 git add/commit/registry**：门二全程零 git 写操作 ✅

## ④ 机器面核对（亲跑实测，不信转述）

| 项 | 命令 | 实测 | 预期 | 裁决 |
| --- | --- | --- | --- | --- |
| verify 全量 | `npm run verify`（/tmp/g2-verify.raw） | **Test Files 155 passed (155)/Tests 1398 passed (1398)/locks 282/exit=0**；quality+tickets+lint+typecheck+build 全绿 | 155/1398/282/exit=0 | ✅ 全命中 |
| 用例数复算 | 独立推演 | theme.test.ts 单文件 88（TOKENS 50 it.each+body 1+B1 4+SET1 2+SH2 1+新 describe 30）；1357+41=1398 | 1398 | ✅ 自洽 |
| build | `npm run build` | exit=0 | 0 | ✅ |
| 视觉探针 | `node scripts/audits/p7d01-visual-probe.mjs after`（/tmp/g2-probe.raw） | **[COMPARE] PASS，exit=0**：tokens 11 项精确匹配+compiledRules 11 项 utility 规则全在场+png 8 态逐字节相同+sweeps 全态 windowSize/trans/zi 逐键相同 | [COMPARE] PASS exit=0 | ✅ 全命中 |
| 变异 A（值面计数负锚） | cp 备份→theme.css 一处 `var(--dur-fast)`→裸 `0.14s`→vitest 单文件 | **1 failed exit=1**（红点=「duration 字面量 0.14s 消费后仅存 token 定义处」——计数 1→2 咬中）→cp 还原 **diff 空**（RESTORED-CLEAN-A） | 红+还原净 | ✅ 鉴别力独立复现 |
| 变异 B（W2 arbitrary 锁） | cp 备份→Toast.tsx `z-(--z-pop)`→`z-[50]`→vitest 单文件 | **1 failed exit=1**（红点=「弹层九 tsx 禁 z-[数字] arbitrary class（回炉 W2）」精确命中——`[` 挡词边界证 W2 独立鉴别力）→cp 还原 **diff 空**（RESTORED-CLEAN-B） | 红+还原净 | ✅ 鉴别力独立复现 |
| 变异还原完整性 | git diff --stat+manifest 复核 | 21 files/225+/68-（与开工态逐位一致）、manifest 282 | 零残留 | ✅ |
| e2e 声明核对 | p7d01-b1-e2e.raw.txt 亲读 | **42 passed (2.0m) exit=0** 在档 | 42/exit=0 | ✅ 在档（全量复跑=指令可选项未执行——本票不触 e2e 断言面（票面主控已核查）+verify/probe 亲跑已覆盖机器面；复跑与否不影响终评依据，如实记） |

两变异目标（theme.css/Toast.tsx）经 manifest 亲验均**非受锁件**（src/ 不在锁面），变异流程无需 unlock/apply，全程 cp 备份法（未用 git checkout）。

## 终评

**PASS（无条件）**。

四清单全数通过：①处置全兑现零「说了没改/改了没说」；②母本符合度独立复算逐值逐行吻合（32/12+2/12 全命中、animation 四值零改、marginLeft auto 保留、page-layer-z 仅头注）；③宪法红线合规；④亲跑矩阵四数字全命中（155/1398/282/exit=0+COMPARE PASS exit=0）+两条负锚变异独立复现鉴别力+还原零残留。零视觉差证据链（png 8 态逐字节+sweeps 逐键+tokens/compiledRules 计算值面）经门二独立亲跑复现完整闭环。

**记档观察项（不构成条件，转主控）**：
1. theme.css 645 行存量超 500（迁移前 631 已超；ESLint 无 CSS 面，无机器关卡——非本票引入）；
2. mutation RESTORED-CLEAN 无独立落盘件（还原事实已由终态零残留独立验证补强，流程记录面欠账）；
3. 门二与实现者同家族半异构欠账（环境统一档政策次选；跨门异构由门一 deepseek 承担）。

## ⑤ 成本账本行

- 机型：GLM5.3flash（环境统一档=政策次选，Agent 工具面无 model 参数；与实现者同家族半异构欠账如实记）
- 时长：约 40 分钟（读档+静态核验+verify 全量+build/probe+两条变异抽查+报告）
- token：工具面无读数（不可测项，如实记——不落自估值）
- 亲跑矩阵产物：/tmp/g2-verify.raw（exit=0）/g2-build.raw（exit=0）/g2-probe.raw（COMPARE PASS exit=0）/g2-mutA.raw（1F exit=1）/g2-mutB.raw（1F exit=1）；终态还原 diff 空两验+git diff --stat 与开工态逐位一致
