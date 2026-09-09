[routing]: run=20260909122949-bh5h source=deepseek model=deepseek-v4-flash switches=0 usage=in=10352,out=5351 latency=53677ms (by ds-call.mjs 链)

# F-A9 门一对抗审查报告

## 1. 处置核对 — mutation2 删臂形态（B2 门一处置核实）

**与随附终态 diff 形态比对（实施者原文，非主控核销证据）**

M2 水平窗删臂红 / M3 垂直窗删臂红 由随附 f-a9-mutation2.raw.txt 声称；本审未能直接复核该原始文件内容（未随附在审查输入中）。基于现状代码可确认：`calibrateBands` 的 `if (b.x1 <= b.x0) return b`（annotation-band-calibrate.ts:66）与 `if (cy < topPx || cy > bottomPx) continue`（同文件:75）构成两窗删除路径——若突变删除该行红，则 M2/M3 有判别力（**证据形态成立**）。但变异原始输出未在本审输入内，标注**不确定（随附 raw 未附验证）**。

另 M2/M3 是否真锁两窗算式，需审视删除路径的另一种可能：`b.x1 <= b.x0` 与 `cy` 窗若删除其一，另一窗仍拦截部分用例——从测试文件清单看，存在单行零高/零宽回退、垂直域外、水平域外用例，但**不存在两窗同时删除的用例**，**不存在 x0/x1 反向（x1≤x0）时 span 中心落在垂直域且水平重叠的用例**——该形态下若 M2 变异删除水平窗保护而行（x0/x1 在场时 span 恰好水平重叠但 x1≤x0 = 水平区间退化），红线是否被 cal 测试捕获不明确。判定为**观察项：M2 判别力在退化水平窗形态下无测试**（该形态实际需要 [x1≤x0] 与垂直命中同时成立才能区分）。

---

## 2. 票面规约 vs 实现偏差

### 2.1 规约原文（来自 diff 注解与测试）vs 实现

**规约口述**：方案 A 「渲染时刻 DOM span 盒实测共享；量测退化/窗不命中=派生 band 原样」

| 规约点 | 实现 | 偏差 |
|---|---|---|
| 渲染时刻量测 | 全部三链在渲染/刷新当时调用 | 无偏差 |
| 量测退化 → 原样 | spans===null / base 退化 / 零有效 span 均返回 null → 原样 | 无偏差 |
| 窗不命中 → 原样 | hit==false → return b | 无偏差 |
| 校准只动显示带 | rects 派生域未动（annotation-resolve.ts 中 matchBand 返回替换但 rects 域无关）；落库域（selection 保存 y 值）未变 | **发现潜在偏差：selection 链落库 rects 的几何本身经过 itemSelectionGeometry 派生而非 matchBand 替换？需追踪**——经查 selection-evaluate.ts 的落库路径保存的是 `item.rects`，未见其经过 matchBand，标记 'item' 的 rects 与预览 paint 分离，据此可确认落库域不受校准。无偏差 |

### 2.2 核心算法安全审查 — 单位换算

数学上从归一化到 px：
- `topPx = b.top * base.h + spans.base.y`（annotation-band-calibrate.ts:70）
- 从 px 回归一 `calTop = (calTop - spans.base.y) / base.h`（:82）

**域一致风险**：加/减均用 `spans.base.y`（视口 y）。若 base 的域不是「以视口 y 为本地 0 起点」（即消费方代码中 base 若被误解为页内坐标），则量测换算错位。实际调用中 base 为 itemSelectionGeometry 返回的归一盒（w/h 为 CSS px 数），层坐标中 base 无 x/y 使用，加减仅用 `spans.base.y/x` 作为视口偏移，而消费方像素值（top/bottom 与 gBCR y）同一视口系。**正确**。

### 2.3 核心算法安全审查 — 命中窗口边界 vs 受锁 item-chain 形态

测试注称「受锁 item-chain 夹具『span 与项链刻意错开 116px』形态按窗天然不命中」。推论窗口语义确能排除 116px 错位类（将错位 116px 的 span 中心置于 band [top,bottom] 100px 量级域外）。需要检视是否存在错开 < 行程高的 false positive 风险——这是受保护形态,测试文件引用了该夹具但未实证。**观察项:夹具错位=116px，而校准窗垂直域宽度=band 高（小字号下 ~5px）——116px 错位远在窗外，判别力有裕量；但没有最小错位仍不命中的边界测试**。

---

## 3. 边界缺陷挖掘

### 3.1 [严重候选] calTop/calBottom 反序（calTop > 实际 top / calBottom < calTop）无防御

annotation-band-calibrate.ts:83 用 `Math.min(calTop, g.top)` 取最小值。语义上行盒并集 `[min top, max bottom]`。若 span 行高奇异（span 高=band 高 1/10、span 定位在带外一点点但中心在带内），则 calTop/calBottom 的差 < band 高，反而产生一个比派生带更窄的带——**此形态是否比派生带更糟？** 校准的目的假设 span 行盒=行簇真实外观；比带高更窄意味着校准引入新失真。防线上,b 的中心必须在带垂直域内,天然限制 span 在带上下半高的窗的中心。现行为可行。**观察项**。

### 3.2 [候选] spanBoxesOf 的 box 数组与视口 origin 不一致（gBCR 内可能含 transform 缩放 ≠ 1）

pdf.js textLayer span 可能有 transform: scaleX(...) 或 rotate;代码注释声称「span 的 scaleX/rotate transform 不改 bbox 观测」。**经查 bbox 观测用 getBoundingClientRect（轴对齐可含 scale 影响——缩放后 gBCR 尺寸也缩放），而注释声称「不改 bbox 观测」语义其实是「取轴对齐包围盒即可,transform 后的 bbox 就是该 span 的最终渲染盒」。此为正确。gBCR 返回的即渲染后的实数包围盒。若 transform 含旋转,轴对齐 bbox 会比视觉大,但这是可接受保守值。无实际缺陷。

### 3.3 [严重候选] layering 中 `guard: annotate(selector...)` 消费路径是否与 spanBoxesOf 重叠——DOM 只读冲突

spanBoxesOf 只调用 querySelectorAll + gBCR，无 DOM 写入。AnnotationLayer render 也只写入样式。只读不突变，无冲突。**无缺陷**。

### 3.4 [严重候选] selection-evaluate 的 spanBoxesOf(textLayer) 每帧一次量测——但预览渲染后 textLayer 可能被 pdf.js 更新（比如异步分区渲染）

span 盒在拖选期间稳定吗？pdf.js 渲染完成前 span 可能不存在或尺寸变化。当前实现量测时点：selection 触发 evaluate 是事件回调时（mouseup/settle 后），textLayer 已渲染过。但 pdf.js 可能因为首屏优化在 page 可视后才渲染 textLayer——若 evaluate 在 span 未渲染时跑，spanBoxesOf 得到空或部分盒 = 校准缺席 → 回退派生值。有回退语义,不崩溃，但**存在渲染时序窗口内校准不生效——这在 pdf.js 分页 canvas 渲染异步的常态下是否是静默失败？** 真机上 evaluate 通常在 textLayer 完成（用户看到文字后）触发，风险窗口小。标记为**观察项，需真机拖选在 textLayer 未渲染完时机验证（主控已裁性能观察，与此条并看）**。

### 3.5 [严重候选] calibrateBands 的命中窗中心判定用的是「y ∈ [top,bottom]」，但 top/bottom 取的 b.top/b.bottom 是被 replace 前已改过的值吗？

matchBand 返回时经 b.calTop/cb 替换，但行簇解析输出的 band 数据（从 resolveAnnotationRectsItem 来的 v.bands）是派生值，没用 cal 字段。所以「band 中心」永远是派生的，matchBand 匹配键 = 派生 center（如注释说——设计使然）。安全。

### 3.6 [静默失败潜在线索] AnnotationLayer 渲染的属性 `--band-top` / `--band-height` 消费的是 bands 中 matchBand 后的值还是 rects？查 AnnotationLayer 源码需要确认

未提供 AnnotationLayer 完整现行代码。从 SelectionLayer 测试「paint 块垂直=校准行盒」和 annotation 测试「highlight 带 y=行盒顶/高=行盒高」看，实际渲染块来自 matchBand(calBand, r) 输出的 top/bottom。因此消费正确。

### 3.7 [严重缺陷候选] 由 base 的域错配推断：calibrateBands 用 `spans.base.w/h` 核对 `base.w/h`；但 **`spans.base` 是 pixelBoxOf(textLayer)，其中 x/y=视口左上角（gBCR），w/h=盒 CSS 尺寸**。而消费方 entry.box 的 h=792 CSS px（page 高），pixelBoxOf(textLayer) 的 h 也应是 792（textLayer 盒高=CSS 页面高），但视口 y 偏移（页面在文档中的位置）+ 缩放？**pdf.js 页面可以 transform scale？** 若应用缩放（canvas 重渲染应仅替换内层内容，textLayer 元素本身不缩放），pixelBoxOf h 始终不变？实际上 gBCR 在页面 zoom 时（浏览器 chrome 缩放）返回 CSS px 不变；pdf.js 的 scale 渲染只影响 canvas 内容而不影响 div 尺寸——因此 base.h 与 spans.base.h 一致（都=div CSS 高）。但若 pdf.js 的 zoom 改变了外层 CSS 高?需要检视 page-root CSS。**不明——若 textLayer div 高由 CSS 固定=页面高（page 内容区域），则正确**。在 band-calibration 测试中 textLayer gBCR 高=792（页面内容高），entry.box.h=792——一致。**但缺少「缩放态」域测试（scale > 1 时 entry.box 是否变化？）**。查 itemSelectionGeometry 的 viewport 计算可用注释知 scale=item box 比例=当前 scale(zoom)；每次调用均以当前 viewport scale 计算量与量测框差>1px 防错。缩放变化视口 scale 变，canvas 与 item 几何同变。由于校准全程以「同一时刻量测 base 与派生 base」——量测与归一平行使用——缩放不变性靠「同时同步」成立。无缩放针对性测试,但理论上不破。**观察项**。

### 3.8 [严重缺陷候选] gBCR 的 y 坐标包含祖先滚动偏移吗？textLayer 在滚动容器内时，base.y = 当前滚动位置下的 gBCR y；span 盒同受滚动影响——两者相减公式 `(calTop - spans.base.y)` 中 calTop 的偏移与 spans.base.y 的偏移同为滚动偏移,相消。正确。

### 3.9 [边界缺陷] 命中窗对 span 上/下落入**间行间隙**（Band 间 gap）的 span 归属错误

calibrateBands 一芯穿过所有 boxes，按「span 中心在某个 band 垂直域内」独立计入对应 band。若 textLayer span 的高=行盒高（正常行），span 中心必落在行内。若 span 高=0（过滤）+高很大（覆盖多带）则可能命中多带（中心落在某带内但 span 跨带）= 校入多条带的前/后界?「边界缺陷」——如果某 span 因字体奇异高=两倍行高,中心落在 band A,顶跨 band B,calTop 侵入上一行。但此类 span 与 PDF 行簇应对一,极端字重是否产生跨带?不被两条带共计入,只计入 band A。该 span 的高度边界将 band A calTop 抬到上一行之顶→标注带过高。频率低,真机未见。**观察项,无红证据**。

### 3.10 [严重][证据缺口] y 坐标域未做 ± 域防御：`calibrateBands` 无「calBand 归一值 ∈ [0,1]」校验

随 base.h 使用,span 在 textLayer 外(滚出视口后 gBCR y 会变为负/退出视口域)会产生 calTop/calBottom 超 [0,1]——例如一页长文中 textLayer 有多个分段,滚出顶部的 span 的 gBCR y < base.y。命中窗若 span 中心 = 负值 + 相对 base.y 负,但 b.top/b.bottom 是 [0,1];topPx 正,负数中心不会落入正值窗口。若文本滚出一半,上方 gBCR 负 y 除以高得负归一值,视觉上是「行被裁剪」。此情形 pdf.js textLayer 在滚动中是**常驻全量内容**还是重新渲染?若 textLayer 高度=full 页,滚动卷走的行 gBCR y 变为负数;下方新进入的行的 y 增加;spanBoxesOf 无可见性裁剪(全量查询)。若校准发生在滚动中(用户滚至页面中部并拖选),textLayer 顶部 400px 已被滚出视口 → 那些行 gBCR 的 y=负值,span 中心仍可用(spans.boxes 未裁剪) → 顶部行 y 负,但 b.top×h+base.y 也在负域——命中窗的一致性与平移对称性保持(gBCR + base.y 随滚动同变)。故正确性不依赖可见性。**但 rec 值 y 异常:顶部行的 span gBCR y<0 对 base.y 平移不影响公式内差。正确**。

---

## 4. 测试面细瞻

### 4.1 变异判别力 (M1-M4) 无原始 raw 在档

**证据缺口:全部 4 个变异的 raw 文件未随本审输入提供**。实现者文字声称 12/12 绿 M1~M4。从代码可反推具体断言与变异目标匹配,但无 metatest 时确证其红线因该变异而红。**标注为不确定/需主控核销层面看原始文件**。

### 4.2 回退四路径覆盖凭证（测试文件内核对）

测试文件确含：
- 零 span（无 span 盒 map 空）→ 测试「无 span → 原样」——*注意实现时 rects map 空或未设 span 桩返回 0 宽;getBoundingClientRect mock 默认 (0,0,0,0)，jsdom 无布局 fallback 应有「spanBoxesOf 返回 null → bands 原样」的用例——文件 `mountPage(..., undefined)` 情形下 span gBCR=(0,0,0,0)→被零宽跳过→empty→null→原样。*覆盖在「回退零变」it 的零宽形态。但**第二个 variant:「textLayer 全量 span 都零宽但 spanBoxesOf null → 原样」无显式断言**,依赖 fixture 中 span gBCR 默认 (0,0,0,0) 分支。弱配置。

- 零宽/零高 span 覆盖。
- 盒退化 textLayer 高≤1 覆盖。
- 域错配 620 vs 612 覆盖。
- **回退四路径全覆盖的第三条断言「窗不命中含 x0/x1 缺失」**:测试只测水平不重叠(900,414.2 域外)并未显式测 x0/x1 缺席(undefined)的情形——实现 `if (b.x0 === undefined... ) return b` 无对应列出用例。而前面分析:若 x0 缺席时又恰好有 span 垂直命中,b 将走「return b」——安全无错。但**缺失测试 = x0/x1 缺席 + 垂直 span 命中的回退零变未被锁**。

- 回退四路径的第四断言「零命中」垂直域外用例覆盖。

### 4.3 测试盲区枚举

a) **[C3 防御错配] base.w/h 域防御只防宽高差 >1;若同 w/h 但视口偏移不同(spans.base.y≠0 vs base.y 系误用)**——代码将 spans.base.y 用作 px 偏移且 base 不含 y——这在现有接口中不缺偏移;调用域 p 时 base 的 x/y 未被消费。统一 OK。

b) 小字号首行 / 末行的边缘 band(center 位于首/末的 band 与最顶 span 组合)没有针对最上/最下行特殊(offset=0 的最上行 span 部分滚出顶部)的场景测试。band 并集 min 在跨首行时会包含第一条 span 的部分盒。缺失。

c) **calTop 使用率/matchBand 替换没有在「渲染层中混合同页多个带」场景的视觉验证**数据测试全为单行。同页多行(首/末行具引号)显式两带,覆盖的不过量。较弱。

d) mutation raw 无文件确认(M1/M4 尤其)。

e) **视觉回归测试(真机导图 compare)缺失**——该类缺陷本质为视觉偏移;单测证明 item 几何→span 量的换算是否落真机像素正确依赖 gBCR 真值;测试的环境(jSDOM 桩)无法验证「偏移缺省」真机上大字/小字的量测数——现有测试描述了「真机 β 形态」通过预设桩;但桩值即实现者的期望值,非 pdf.js/#getAscent 实测量。因此**视觉导向缺陷的最终验证依赖真机截影比——收口前主控 verify 是否含导图?未见证据**。

### 4.4 集成挂载用例是否恰当断言?「SelectionLayer 落库 rects 不受校准」

测试代码保存前先不 save,检查 y=86/792。但保存回调 `saveMock` 实际调用是否走了校准的 paint 带?断言实为 y 派生域值不变。由于保存域走 `item.rects`;此为码实现保护 INV-58 前半。锁在。正确。

---

## 5. 机器面/成本账本

- 全量 159 文件/1498 用例绿；locks 297 条——本审无法另行运行(ABI 竞态排队),只能核验测试结构。无代码怀疑点。
- 账本数字声明有,mjs 顺登记。成本维度不审查代码正确性。

---

## 6. 架构合规快查

- 依赖单向(引 annotation-anchor/annotation-resolve/types)无环。
- lanes 对 spanBoxesOf 在 textLayer 每次 evaluate 全量 gBCR 量测——**文中自称「零缓存每次现量」——这直接导致拖选帧内全页 span 查询与 gBCR。实测 jsdom 测试量级小;真机对 rAF 每帧评估中,**每次 evaluate 调用 spanBoxesOf(textLayer)** 的 gBCR 可能造成布局抖动强制同步——evaluate 在同一 rAF 内的多次调用会不会重复量测?在 visual 与 settle 两路,评估被 throttle 到每帧;每帧两次(内容若无变动可能仅一次)。评估 rAF 每帧的批量 span gBCR 在页级(spans=文本约 40-400 个)成本与 bandsNearRects 先例同域。**注释声称先例可证。但未做性能基准测量(主控已裁观察)**。

---

## 7. 需确认/声明的主疑点汇总

1. **[观察]** 域错配防御判别力有案例但同 w/h 的「偏移同轴」假设无测试——现有接口 base 不含 x/y 而消费方统一视口系,此假设由调用点保证——风险中低。
2. **[观察]** 校准「并集包围盒」数学不保证 calTop≤calBottom(若某 span 反序 gBCR 数据)无防御;真实 span 数据无此形态。
3. **[观察]** 测试的 β 形态「数值期望」由实现者手算预设而非真机量测捕获——缺陷消除的实证图像对比(截影 diff)缺失。此票性质为视觉缺陷,单测在构上无法证明真实 DOM 的测量比;最可靠保障原应在真机截影——随附文件未见。
4. **[观察]** 使用 setPaint 前「matchBand 调用中最终消费的 b = 已被 replace 的 top/bottom」而 `paint` 的渲染数据引用 rects 与 bands 的原对象数组——calibrateBands 返回新 object 数组但不 mutate 原 items——可 confirm 无 mutate(spread)。

---

## 终评

问题均有防御或测试覆盖;无代码级红证据;若干观察项指向「测试数值为预设而非真机实测量」「mutation raw 未随附本审」及「保形回退路径(x0/x1 缺席)缺一条用例」。按门一纯对抗标准给 N——**可放行收口(verify 由主控统一补)**,不确定性集中在:(a) 真机视觉回归导图证据未见,(b) 变异存活原始文件未在本审输入。

**[N] 可放行收口 - 无红证据;观察项:选帧拖选性能锚已裁、真机截影 diff 未在随附、mutation raw 未随文件验证(主控已声明统一 verify 收口)、span 盒异常序/gBCR 跨带奇异形态未做约束——均中低风险性,不阻塞放行,但真机视觉核查为 F-A9 类缺陷的最终判据,收口前建议至少跑一次真机手工置灰带场景确认。**