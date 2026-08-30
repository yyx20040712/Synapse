# F-A3 门二终审报告(LOOP 三屋·门二)

> 独立终审子代理产出全文(主控代为落盘;原回复即本档,零改写)。

四清单+一核对完毕，全部证据在手。

## ① 处置核对（防「说了没改」）—— PASS

| 项 | 裁决 | 终态实物证据 | 判定 |
| --- | --- | --- | --- |
| W1 编辑器臂补锁 | 回炉用例⑧+M2' | `tests/unit/renderer/selection-mode.test.tsx`（r2.diff L791-813）⑧ 全流程在档；`f-a3-mutation-m2p.raw.txt` 尾部 `1 failed \| 7 passed (8)` 且唯一 FAIL=⑧——变异点只摘 `setEditing(null)` 保留 `setMenu(null)`，⑤ 绿⑧红精确锁定编辑器臂，红证闭合 | 兑现 |
| N2 paint 前收起 | useLayoutEffect | `AnnotationLayer.tsx` r2.diff L360-363 与 `AiAnnotationLayer.tsx:106-108`（实读）均为 useLayoutEffect；import 行、两层头注「paint 前收起」措辞同步 | 兑现 |
| N4 全 rect 断言 | ③ 强化 | r2.diff L747-755 两段 `for (const r of Array.from(annRects()))` 逐一断言 auto/none；夹具 ann() 产 2 rect（L600），非空集 vacuous | 兑现 |
| 门一 r2 不确定 N（anchorPage:1 vs page=0） | 主控亲验消解 | `AiAnnotationLayer.tsx:87` `n.anchorPage - 1 === page`（1 基→0 基），夹具 `anchorPage:1`+mount `page={0}` 经 1-1===0 通过过滤；且⑥先行 `aiRects().length).toBeGreaterThan(0)` 把守，过滤口径错则红非静默 | 消解正确 |
| 探针死 return 清除 | 主控已清、r2.diff 已含 | `scripts/audits/f-a3-verify.mjs`（工作树）C 场景 debug 段（diff L233-235）仅赋值无 return；全文件 return 均为正常函数返回；且工作树 diff 与 `f-a3-gate1-r2.diff` **逐行一致（modulo index hash）**——diff 未过期、无门一后偷改 | 兑现 |
| N3/N5/N6/N7 备案不回炉 | 备案 | N3 代码仍闭包捕获（r2.diff L408-410）、N5 八用例无 S5、N6 探针场景 B 无点击 rect 直测（仅拖选+hitTest 诊断）、N7 漂移在 JSON 未深究——均维持备案态，无未申报变动 | 与裁决一致 |

## ② 母本符合度 —— PASS

- **五层规约逐条兑现**：1.1 store（字段+动作+头注面③迁移表原文，`reader.store.ts` r2.diff L479-491）；1.2/1.3 两层（自订阅选择器同票面形态、rectStyle 覆盖在消费方、effect、头注改写）；1.4 Toolbar（props+按钮位置=颜色组后/搜索占位前（diff L455-466）+aria-pressed+`borderColor: var(--accent)`+单 title 票面原文）；1.5 装配（`?? false`+toggle 在装配面）。
- **面③ 迁移逐格**：openPaper absent→`makeLoadingTab` 显式 `selectionMode: false`（`reader.store.ts:188`）；error 重试→`{...prev, status:'loading'}` 沿用（`reader.store.ts:171`）；setSelectionMode→①实测；closeOne/close→随 tab 生命周期（最低集未列，票面自身裁剪）。面①②各格由③④⑥⑦+真机 A/B/C 覆盖；S1(⑤⑧)/S3(②)/S4(⑥)；S2 正交零改+真机 B 划选→保存实证。
- **1.6 不做清单零越界**：git status 改动面=恰 5 M+2 新增；SelectionLayer/SelectionToolbar/AnnotationMenu/AnnotationEditor/PagesOverlay/annotation-style.ts **全部不在改动列表**；无 Escape/快捷键/持久化/AI 显隐开关/新 e2e 用例（存量 29 全跑）。
- **自裁申报 1~7 全在案且理由成立**：可选字段×2 是受锁 tests/** 硬禁令下的必要形式（缺席即常规态+消费方一律 `?? false`，语义与票面零差异）；onClick 守卫为 jsdom 程序化派发兜底（浏览器层由 pointerEvents:none 达成，真机 B/C 双验）；行数手术/探针工程化 5 项/e2e 剪贴板噪声三次取证均有 raw 在档。

## ③ 宪法红线终审 —— PASS

- **分层单向**：改动全在 renderer 特性内（store+四组件），无跨层、无新依赖。
- **受锁纪律**：tests/** 既有件零改（唯一 tests 条目=新增 selection-mode.test.tsx）；locks/ 零触（git status 无）；tickets/registry 零触（LOOP 票豁免，票面明示）。
- **安全禁令**：diff 内无 nodeIntegration/webSecurity/eval/new Function/SQL 拼接/出网面。
- **行数**（wc -l 实测）：store 452≤500（超票面预算「约440」12 行，§2 如实申报）；AnnotationLayer **249≤250**；AiAnnotationLayer 231；ReaderToolbar 196；ReaderPage 205；测试 350；探针 267。
- **UTF-8**：10 个关键文件 node 读 FFFD=0。
- **TDD 证据链四档**：首红全量口径（`f-a3-first-red.raw.txt`：7 failed|948 passed、114 文件、exit=1）→绿（r1 955/r2 956、exit=0）→变异（M1~M5 红证与票面 5.2 逐条吻合；M1/M2 行数术后重做等价；M2 实际④⑤红强于票面预期⑤=更强非放宽；M4 连带③~⑥红与「切换不落地」因果一致）→还原（cp 备份法声明+工作树与 r2.diff 一致侧证终态干净）。新测试 always-active（裸 describe/it，无 guardedDescribe）；TODO/FIXME/placeholder 七文件 grep 零命中。

## ④ 机器面核对 —— PASS

- **数理**：956=948+8 ✓；首红 955 总数=948+7 ✓（⑧ 回炉后加入）；e2e 29/29 exit=0（`f-a3-e2e-final.raw.txt` 尾）。
- **verify 链分段闭合**：`f-a3-closeout-verify-r2.raw.txt`=quality✓ tickets✓ → locks:check 红**恰两条**（f-a3-verify.mjs+selection-mode.test.tsx 未登记，exit=1）；`f-a3-closeout-rest-r2.raw.txt`=lint+typecheck+build 全绿 exit=0；test 段由 green-r2 承载。唯一红=结构性预期，与票面 5.4 划归主控收口一致。注：票面预估 locks「188→189」漏算探针脚本，实际两新路径=190——实现报告疑虑 1 已如实申报，属票面估算遗漏非实现偏差。
- **真机 JSON 与报告 §5 逐数吻合**：A selLen=0/present=false；B ariaPressed=true/58 rect 全 none/hitTest=SPAN txt=90/selLen=81/rectCount 1→2/saved=true；B0 selLen=599；C 60 rect 全 auto/menuShown=true（B→C 的 58→60=+2 rect 属新保存标注，数理自洽）；raw 尾 `overall=PASS` exit=0；final-state.png 在档（793KB）。
- **台账/registry**：LOOP 票不在 tickets/registry=票面豁免口径；台账翻状态=主控收口面，现状未翻=预期。
- 小瑕疵（不阻塞）：报告 §2「AiAnnotationLayer 230 行」「selection-mode.test 323 行」为首版数字（§8 已自我修正 AiAnnotationLayer=231；测试实物 350 以 diff 为准）——收口引用行数以 §8/实物为准。

## ⑤ 成本账本行核对 —— PASS（以主控回执为准）

- 实现者 11.27M tokens/119 工具/30.7m+回炉 5.27M/31/4.3m：数字不在任何仓库材料中（宪法定位成本账本=主控交接书/战役报告职责），门二无独立复核源，标注「以主控记录为准」；证据索引面完整（报告含 16 处 raw.txt 引用，全部实物在档）。
- 门一 deepseek 3 调：r1+r2 报告与两份 prompt.txt 在档；首调截断属主控会话内事件，不可仓库复核——以主控记录为准。
- 门二（本代理）：token 由主控从本回执汇出（铁律自报，不自行计）。

## 总评：放行收口

实现与票面五层规约+态空间矩阵+跨格序列高度一致；三屋处置（W1/N2/N4+备案项）全部落地且证据闭合；宪法红线全过；机器面数字与证据日志零出入。**建议主控执行收口**，必做清单：

1. `npm run locks:generate`+`locks:apply`（登记两新路径，188→190）→ 复跑 verify 应全绿（真退出码落盘）。
2. INV-42 写入 `docs/invariants.md`（受锁流程 `[locked-change]`：unlock→改→apply 即时同步）。
3. 台账 `docs/audits/audit0-findings.md` F-A3 翻状态；成本账本行汇入战役报告。
4. 提交 staging **显式列文件**——工作树有 F1 工单遗留未跟踪残留（`scripts/audits/f1-out/*.png` 26 张），勿 `git add -A` 扫入（2026-08-26 误扫实录同型风险）。
5. 提交信息带 `[locked-change]`（新测试文件入受锁面）。

**遗留风险清单**（均已在档备案，不阻塞）：N5 S5 busy 在途切模式无回归用例（幂等语义依赖既有行为）；N6 真机层选择模式点击 rect 零副作用未直测（pointer-events+hitTest+jsdom 守卫三层推断成立）；N7 保存链滚动漂移 2142px 根因未定位（建议另开票）；N3 toggle 闭包同帧连点理论 no-op（仅程序化极速场景）；标注块中心压空 span 需挪起点的边缘体验（非功能断）；报告 §2 两个首版行数过期（以 §8/diff 为准）。
