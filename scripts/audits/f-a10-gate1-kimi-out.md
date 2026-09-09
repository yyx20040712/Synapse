[routing]: run=20260909134544-e6h2 source=kimi-main model=kimi-k3 switches=0 usage=in=9727,out=9217 latency=265301ms (by ds-call.mjs 链)

# F-A10 门一审查结论

## A 母本符合度 —— [B]

票面三支验收：夹具 range 终点=本行行尾（测试 1/2/9 锁 end=17/8/13）✓；e2e 依票面留主控 ✓；img2 形态真机复测消（end=1465、paint 540.3<542.8）✓。预裁证伪后的转向有三轮真机 raw 证据链支撑（段间零空白→跨行空白串判据空操作的论证自洽），非私改。唯 G3 起点面无真机证据（报告 §6.3 已申报），不构成拦阻。

## B 宪法红线 —— [B]

新域件 code ~133 行 ≤250 ✓；头注含行为/接口/架构/生命周期分层与三分语义表前置 ✓；UTF-8 中文 ✓；仅 import 既有 `collectSpans`（annotation-anchor），零新依赖、零环 ✓；无 TODO/FIXME 申报与 diff 一致。

## C 代码与测试质量 —— [W]（三条，按严重度排序）

**C-1（实质缺陷）起点命中 br 槽位时吸附方向错误，可致 start>end → quote 空 → 静默丢标注。**
anchor-blank-snap.ts br 分支（约 L168–186，注释自证「双边界同目标」）：

```ts
if (marker.tagName === 'BR') {
  // …双边界同目标：空白在阅读序上位于本行行尾之后
  …
  return { node: tail.span.node, offset: tail.span.node.data.length }
}
```

br 槽位**恒吸附行尾**，对终点正确，但对**起点**无区分。场景：用户在 row2 行尾空白**起笔**、向左回拖选到 row2 中段——浏览器解析 anchor=(textLayer, br 槽)（测试 1 自证 DOM 序 br 在 s2 前，槽位偏移 8 < row2 内偏移 11，range 不翻转）。归一化后 start=17 > end=11；selectionToAnchor diff（anchor-serialize.ts L195–204）归一化后**无 start≤end 再校验**，`fullText.slice(17,11)` 为空→按本文件头注「quote 为空返回 null」→有效划选静默丢弃。9 用例中 br 仅作终点（测试 1/2/9），起点-br 路径**零覆盖**——测试盲区与缺陷同根。

**C-2（边界风险）sameRow 容差可同纳两行，br 跨行时吸附错行。**
L110–114：

```ts
const refH = markerH > 0 ? Math.min(textH, markerH) : textH
return Math.abs(... - markerCy) <= Math.max(2, refH * 0.75)
```

br 盒高=2×行高 → refH=textH → 容差 0.75×行高 > 行距之半（0.5×行高）。若 br 盒居跨两相邻行（紧凑行距），两行中心差均 ≤0.5×行高 < 容差 → `rowOf` 同纳两行 → `tail` 取 rightmost 可能落到下一行=重新引入过达。三支 br 用例的 br 盒均建模为与单行近似对齐（top=row.top−2），**未测跨行居中形态**；报告 §7「其他 PDF 的 br 布局未扫面」部分覆盖此虑但未量化。

**C-3（潜伏）`markerAt` 用 `Element.children`（纯元素索引）承接 Range 元素槽位 offset。**
L99：`const kids = (node as Element).children` —— DOM Range 的 offset 计 **childNodes**（含文本/注释节点）。当前 pdf.js textLayer 子节点全为元素，索引巧合一致；一旦 textLayer 混入裸文本节点（pdf.js 版本演进/其他渲染器），offset 错位→错认或漏认标记。建议改 `childNodes` + nodeType 过滤。现形态下不发作，列为潜伏。

其余核查：空白 span 盒定向双向对称（left 优先→right 兜底，测试 3/5 锁定）✓；jsdom 桩（逐元素 getBoundingClientRect 打桩、br 零宽×2 行高×栏左缘）与真机 diag3 形态声明一致 ✓；三变异（M1/M2/M3）各死 3/6/3 用例，判别力非恒真 ✓；断言均为具体数值（end=17/8/13、quote 全串比对）非恒真 ✓。另注：词间空格若在某 PDF 中以**独立纯空白 item span** 形态出现（非测试 4 的「空格在非空白 span 内」），会被判为标记并吸附左端——该形态是否存在于真实 PDF 我**不确定**，报告未给反证，仅提示。

## D 报告诚实性 —— [B]

自裁与 diff 一致：预裁证伪转向有机制论证（§1）+边界语义表三分（§5）与代码三分支一一对应；G2 不可修论证（DOM 态零信号）成立且未越权私修；G3 仅单测、行容差/栏距判据未扫全库、F-A9 locks 需重同步均如实申报。红 6failed→绿 9/9→三变异红→还原 diff 空的证链结构完整。**不确定项**：raw.txt 各数字（6/9/1507 等）与真机复测数值无法从本审包 diff 独立核验，仅能确认 1496+9+2=1507 算术自洽。

## E 接缝 —— [B]

- selectionToAnchor 消费方：归一化发生在 probeTextLength 之前（anchor-serialize.ts L198–204），快/慢路径最终锚定同源、save 落库吃归一化后偏移，推演成立；快路径瞬态带不归一化属 INV-58 同族已申报。
- F-A9 干扰面：文件清单声明确认未触碰 F-A9 任何文件，本 diff 亦无交叉；collectSpans 只读复用，matchBand/band 域零接触。
- quote 前导空格指纹零迁移：测试 4 锁死词间空格 quote=`' bar baz'` 原样 ✓；但「存量零迁移」依赖「唯一指纹实例=词间空格类」这一诊断结论本身，该结论的证据（pdfjs-dist 布局导出）不在本 diff 内，**不确定**，建议收口时以对库实查对账。

---

**一行总评**：机制转向有据、结构合规、证链诚实，但 br 分支「双边界同行尾」对起点构成 start>end→静默丢标注的实质缺陷且零测试覆盖（C-1），**建议退修：起点 br 槽位应吸附行首（或下一视觉行首）并补回拖起笔用例后放行**。