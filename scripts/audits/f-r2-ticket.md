# F-R2 工单票面——ui-scale≠1 程序滚动落点漂移（修票·五层规约=完整任务书）

> registry: `F-R2` / file `src/renderer/features/reader/scroll-converge.ts` / area reader / strong
> 依据链：台账 F-R2 段（audit0-findings 350-358）+ 排查报告 f-r2-explore-report.md + 真机探针 f-r2-out/{f-r2-probe,f-r2-probe2}.json（2026-09-02 本场）
> 主控已裁决项见③——实现者不再自裁这些点。

## ① 现象与根因证据（探针实测，实现者不必重跑）

**现象**：ui-scale≠1（用户 large=1.25）时程序滚动（页码跳转/翻页）落点漂移 160-450px；单页同现；ui-scale=1 完美收敛。

**根因（H1，探针三场景三档数值级闭合）**：`scroll-converge.ts:48-49` 把 gBCR 视觉差值 δv 1:1 加进本地 px 的 scrollTop——「1 gBCR px=1 scrollTop px」仅 Z=1 成立。祖先 `.app-content-row` zoom=Z（theme.css 反向豁免挂内容侧），gBCR=本地×Z，scrollTop 读写皆本地（P1 实证：scrollTop+=100 → Δst=99.84 / 内容视觉位移 Δvis=124.8；zRow=1.25/zSelf=1）。落点视觉过冲=(Z−1)×δv。

**判据数据（fill(4) 场景）**：

| 档 | δv（视觉） | dSt 实测 | 预测(H1: dSt≈δv) | 落点偏移实测 | 预测 −(Z−1)δv |
| --- | --- | --- | --- | --- | --- |
| 1.0 | 2034 | 2034.4 | ✓ | −0.4 | ≈0 ✓ |
| 1.1 | 2047.2 | 2047.27 | ✓ | −204.8 | −204.7 ✓ |
| 1.25 | 2049 | 2049.28 | ✓ | −512.6 | −512.25 ✓ |

fill(1) 向上跳经 clamp 推演同吻合（1.25 档 δv=(12−s_before)×1.25=−3161，实加 Δ=δv 冲负被 clamp 0=页1顶）。overflowAnchor=none 对照组逐位一致（H4 排除）；P1 语义排除 H5；zoom±往返三 cycle 两档 Δst=0（**H3 证伪——anchoredScrollTop 分母错配本批不修，备案 v19**）。

**H2（同根族，P3b 实证可感面）**：`scroll-progress.ts:283-291` getPageBoxes 把视觉盒位（r.top−base.top）与本地 scrollTop 混算——1.25 档实测 fill(2) 真中心页=1、fill(3) 真中心页=4（「页码说 2、画面看页 1」）；1/1.1 档全对。静态机制见排查报告②段。

**已知旁支（本批不修，申报不扩面）**：「下一页」按钮路径 dSt≠δv（1.25 档 293.76 vs 165.4）——独立形态，修复 H1 后真机复验时一并观测记录，不解析不扩面（门审裁归后续）。

## ② 修复方案（主控裁决=方案 B 算术折算，非方案 A 结构归一）

否决 A（豁免上提滚动容器一行 CSS）：连带面大（fitWidth 分母回退+selection-geometry 参照系+自 zoom 容器滚动条语义三处既有修复交互），真机核验面反而更大；B 与既有先例（`ReaderPage.tsx:146-151` fitWidth 同式推导 z）模式一致，单测可锚。

**B-1 主修（H1）**：`scroll-converge.ts` scrollIntoNearestScroller 的 start 分支：`raw = scroller.scrollTop + (elRect.top − scRect.top) / z`；center 分支的 `clientHeight` 项本就本地空间**不动**，其 elRect 侧同样除 z（保持分子同空间）。z 来源=**新单源导出**（见③-1）。:50 clamp 保持本地口径不动。
**B-2 同批（H2）**：`scroll-progress.ts` getPageBoxes：`top = (r.top − base.top) / z + el.scrollTop`，height 同除（保 nearestPage 距离比较同空间）。z 传参或经单源函数取。
**B-3 备案不修**：`PageColumn.tsx:209-214` anchoredScrollTop 分母空间错配——H3 实测证伪（零漂移），无用户可感缺陷，代码债在档 v19。

## ③ 主控裁决（实现者照办，不再自裁）

1. **折算因子单源**：新导出 `effectiveZoom(scroller): number`（或等名）放 scroll-converge.ts 并导出——`z = scroller.getBoundingClientRect().height / scroller.clientHeight`；**guard 除零**（clientHeight=0 的 jsdom/未挂载态返回 1）；Z=1 时恒等 1=零行为变。B-2 从 scroll-progress 引用同一函数（禁两处各写）。语义=「该滚动容器的 gBCR 视觉高 / 本地 client 高」=祖先复合 zoom 总因子。
2. **函数签名/导出面零破坏**：scrollIntoNearestScroller 既有导出签名不动（内部折算）；scroll-converge.test 既有桩接口兼容。
3. **INV 语义不变**：INV-34（最近祖先+夹取唯一收敛）语义原样——本票仅量纲修正；INV-33/45 不触碰。修复落地后在 docs/invariants.md INV-34 条目补一行「视觉/本地空间折算（F-R2）」附注（登记动作归主控收口，实现者不改 invariants.md——受锁）。
4. **「下一页」旁支**：真机复验时记录修复后 next 场景数值（dSt/δv/落点偏移三档）入实现报告，不扩面修。

## ④ 测试规约（TDD 红→绿→断言级变异红证）

- **先红（核心）**：`scroll-converge.test.ts` 增「视觉/本地=1.25 桩」用例——gBCR 桩值按视觉空间（本地×1.25）、clientHeight 桩按本地，断言落点=本地折算期望（现有实现必红：它不除 z）。同型 1.1 档或 z 由桩推出者至少 2 例。
- **先红（B-2）**：`scroll-progress.test.ts` getPageBoxes/centerPage 增混合空间桩用例（视觉盒位+本地 scrollTop），断言 nearestPage 按折算空间判出（现有实现必红）。
- **受锁改写纪律**：两测试文件均为受锁——头注 `[locked-change]` 一行（F-A4/F-N1 先例）+断言锚保持（既有用例语义不放宽）；改后全量 verify 铁律。
- **变异红证清单**（每条先红后还原，备份法禁 git checkout）：M1=去掉 /z（回退 H1 原形态）→新用例红；M2=z guard 恒返 1（折算失效同型）→新用例红；M3=B-2 的 height 不除→nearestPage 距离用例红；M4=clamp 口径误除 z→若可锚则红（不可锚则申报理由）。
- **e2e**：reader-scroll.spec 默认 profile uiScale=1——两案下行为不变=回归护栏，跑全量确认零必然红；若改 e2e 面须另行申报（预期零触碰）。
- **基线数字**：verify=126 文件 1074 用例全绿 / locks=226。

⑤e 合法数据形态可达性推演（公式类票面强制）：z 表达式在既有不变量约束下可达——INV-34 保证 scroller=最近滚动祖先（getBoundingClientRect/.clientHeight 恒可读）；合法 uiScale∈{1,1.1,1.25}×zoom∈[0.5,3] 全组合 z>0；clientHeight=0 仅 jsdom 未挂载/卸载瞬态（guard 返 1=退化旧行为，可测）；jsdom 桩同空间时 z=1 恒等（现有全部既有用例零破坏的数学保证）。单测夹具不得绕过——桩值显式区分视觉/本地两空间即本票红测核心。

## ⑤ 验收与申报

- 收口判据：新用例先红后绿+变异红证+全量 verify exit=0（126 文件，用例数随新增上浮如实报）+报告全文落 `scripts/audits/f-r2-impl.report.md`（实现摘要/文件清单/红证/测试证据/locks 实录/**自裁申报**（含删减面 diff 自查）/疑虑）。
- 真机探针复验与视觉复评归主控（⑤f 同型——几何修复以探针数据复验：修复后 f-r2-probe.mjs 重跑，1.25 档 fill(4) 落点偏移 −512.6 → 与 1 档基线同量级（|偏移|≤5px），三档 dSt≈δv/z）。
- 纪律：npm run test 禁裸 npx vitest；证据 `.raw.txt` 落盘；首红与每次变异原始输出各自落盘；多断言禁与行尾注释同置；禁新依赖；≤500 行；UTF-8；卡点=BLOCKED 停手不自裁。
