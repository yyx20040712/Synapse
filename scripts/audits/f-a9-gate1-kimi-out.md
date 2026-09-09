[routing]: run=20260909121535-1me9 source=kimi-main model=kimi-k3 switches=0 usage=in=12729,out=5562 latency=185495ms (by ds-call.mjs 链)

# F-A9 门一对抗深审意见

## A 母本符合度

**[B] A1 两形态修复+验收面**：夹具几何断言（band-calibration.test.tsx β 形态 3 用例，判别性差在档：修前 15.0126% vs 修后 15.4293%，toBeCloseTo 精度 3 位可分辨）+真机复测（f-a9-verify-real.raw.txt 16/16 行、0.0125/0.025px 在 0.75px 容差内）均在档；e2e 留主控为票面 §2 明示授权，非漏项。

**[B] A2 G3A②**：自裁 6 申报「与改动面不交→不动」，票面预裁原文「不交则不动并申报」——合规。校准确实只加 cal 显示域，未触 rect 收集窗（diff 无取证面改动），申报与 diff 一致。

## B 宪法红线

**[B] B1 几何推导表/状态迁移表**：报告 §1 窗口径表+§5 态空间表前置，算式与代码一致（抽查 `topPx = b.top * base.h + spans.base.y` 对表第一行，`cy < topPx || cy > bottomPx` 对命中窗——一致）。

**[W] B2 变异证单薄**：仅 M1（matchBand 删 cal 替换→5 红）一个变异点（报告 §3）。窗口算式（`cy > bottomPx` 边界、`g.right > x0Px && g.left < x1Px` 水平窗）、BASE_MISMATCH_PX 域防御、零宽过滤阈值 `<= 1` 四处算式均无变异红证——水平窗若被错写成 `>=`/`<=` 或垂直窗漏判，现有套件是否转红未证。

**[N] B3 行数**：diff 未附行数统计，新域件约 120 行+测试约 300 行（目测），票面行数上限未见——不确定是否越线，请主控核。

## C 代码与测试质量

**[B] C1 cal 缺席回退兼容**：annotation-resolve.ts:132 `calTop ?? best.top` 单点替换，cal 缺席派生值原样——matchBand 'cal 缺席' 用例+纯几何回退用例+受锁夹具全绿三证在档。

**[W] C2 AI 段链接线零测试**：自裁 3 申报 resolveAiNotesLayered item 分支顺带校准（annotation-resolve-layered.ts:213），但测试四面（报告 §文件清单：纯几何 4+matchBand 2+标注链 3+预览链 1）无 AI 链用例。且「AiAnnotationLayer 零改自动获益」依赖其消费 matchBand——diff 与测试均未含 AiAnnotationLayer 源码或挂载证据，若它直取 `band.top` 而非 matchBand，则 AI 校准静默无效（无害回退，但自裁 3 的获益主张不成立）。**不确定**，请实现者出 AiAnnotationLayer 消费面证据或补挂载用例。

**[W] C3 域错配防御分支无测试**：calibrateBands 的 `Math.abs(spans.base.w - base.w) > 1` 回退路径（BASE_MISMATCH_PX）无任何用例触发——四条回退路径（零 span/零宽/盒退化/域错配）只测了前两条。防御代码无判别性覆盖。

**[W] C4 紧排边界带扩张（疑虑 2 属实）**：calBottom 取命中集 `Math.max(g.bottom)`，band 垂直域仅 4.9px（β 形态）而 span 高 8px——行距 <~9.8px 时下行 span 中心可入本 band 域→带并集扩张。实现者已申报且真机页（行距 10.45px）免疫，但「同族偏差量级下不劣于修前」无测试锚——记录在案，建议留主控裁是否补紧排夹具。

**[W] C5 性能无帧耗时锚（疑虑 1 属实）**：selection 快路径每帧 `calibrateBandsWithSpans`（selection-evaluate.ts:250,308）=全页 span querySelectorAll+逐个 gBCR+pixelBoxOf 两次（调用点一次+spanBoxesOf 内部一次，重复量测）。「随动正常」为观感描述非数据锚——申报属实，补锚与否请主控裁。

**[N] C6 真机 0.0125px 复测可信度**：gBCR 亚像素读数自洽，但探针 f-a9-verify-real.mjs 不在 diff 内，「16/16 行」的逐行配对逻辑无法核实——不确定，信任度依赖探针正确性。

**[B] C7 夹具断言语义**：抽查非恒真——'窗口不命中'（y=500 中心域外）若无垂直窗实现会产 cal 域转红；预览链 top 断言 10.8880% vs 修前 10.8586% 差 0.029% >toBeCloseTo(3) 步长，有判别力。

## D 报告诚实性

**[B] D1 自裁 7 项对 diff**：逐项可对应——1（cal 独立域+matchBand 单点，annotation-resolve.ts:132）、2（窗形，calibrateBands 循环体）、3（layered.ts:213）、4（BASE_MISMATCH_PX+g.x/g.y 取法注释在码）、5（INV-58 张力论证与预览链落库断言 y=86/792 互证）、6（G3A 不动）、7（e2e 未触）。无隐改。

**[B] D2 疑虑 1/2 属实**（C4/C5 已验证代码证据）；**疑虑 4 算术自洽**：1482+10+4=1496，F-A11 并发解释合理；**疑虑 3**（预存 lint 红 2 处属并发/主控面）非本 diff 可核——**不确定，请主控收口核**。

**[B] D3 「既有测试零改」**：diff 仅 3 源码文件+2 新文件，无既有测试改动，与 renderer 1028 绿互洽。

## E 接缝

**[B] E1 rectStyle 消费**：underline 条 top=calc(calBottom%−2px) 经 matchBand 流入既有 rectStyle 零改，挂载用例断言 `calc(15.4293% - 2px)`/height 2px——接缝吻合。

**[B] E2 jsdom 无 gBCR 回退**：桩面全 0→`g.width <= 1` 全滤→boxes 空→null→原样，受锁 annotation-layer/ai 夹具天然走此路且全绿——回退语义零变成立。

**[N] E3 span transform 注释**：「scaleX/rotate 不改 bbox 观测」表述含混（scaleX 实际改 gBCR 的 width/left）——但取 gBCR 变换后盒正是所需视口位，横排场景 y 不受 scaleX 影响，行为正确仅注释欠准。

**[W] E4 AiAnnotationLayer 消费路径未证**：同 C2，不重复计。

---

**一行总评**：方案 A 主链（预览+标注）根因修复、回退零变、TDD 三证与诚实申报均扎实可过，但变异证单点、域错配防御与紧排边界无测试、AI 段链「零改获益」主张缺消费面证据——建议 3 项 W（B2/C2/C3）补证后放行，C4/C5 申报在案留主控裁。