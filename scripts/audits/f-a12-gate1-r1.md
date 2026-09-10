[routing]: run=20260910010001-l8c4 source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=9694 latency=568858ms (by ds-call.mjs 链)

# F-A12 门一对抗深审报告

## B（阻断）—— 0 条

逐帧推演事件时间线（mouseup→cancel→F-12 门→dragged→releaseAffinity→setBaseAndExtent→evaluate.full）未发现时序倒置：`dragged=true` 位于 `moved<3` 早退之后（SelectionLayer diff +131~+139），程序化/微位移零触成立；setBaseAndExtent 同步写、selectionchange 异步排队、evaluate.full(true) 同帧消费终态——④⑤⑥ 序成立。`anchorNode!` 有 `rangeCount>0 && !isCollapsed` 前置蕴含，断言安全。

## W（警告）

**W1 判据缺「释放 x 处上一行无文本」判别——紧间隙下可静默截断刻意选区。** 票面缺陷机制明示触发前提=「释放 x 处上一行无文本（行尾空白区）」，但 releaseAffinity 判据（release-affinity.ts 约 L150 `if (Math.abs(upY - prevBottom) > Math.max(focusBox.top - upY, SHALLOW_PROBE_MAX_PX))`）不含 upX vs prev 行文本范围条件。紧间隙（2.5px）排版下：用户刻意选入下段首行、释放在其盒顶上方 0.5~4px 且 x 落在上一行有文本处——G2 实测已证浏览器此时把 focus 送进下行（0.5px<2.0px 就近），判据命中→focus 被拽回上一行**行尾**（rowEndOf 还可能把终点水平外推过释放 x），刻意选中的下段内容被静默吞掉，且与 G2 应修态在判据内不可辨。方案判据本身未含 x 条件（预裁 2 仅授权距离微调），故不定 B；但「浏览器在 x 有文本时是否仍下探」不确定，建议后续票加 upX>最近栏组 right 的廉价判别收紧。

**W2 跨多行释放判据恒真——不可达论证依赖浏览器行为。** 实现者疑虑三成立：upY ≤ prevBottom 时 `prevBottom-upY < top_f-upY` 恒触发重定向（release-affinity.ts L150 数学事实）。「浏览器 caret 就近解析使该形态不可达」未经实测锁定；若某引擎把空白边释放解析到数行之下，重定向只上挪一行=错误终态。prevTop 上界收紧成本极低，建议补防御。

**W3 防误伤主张无测试：重定向后 start>end 翻转兜底零用例。** 头注称「由 selectionToAnchor 翻转兜底（C-1 同族）」，但 208 行测试件中 backward 用例的 anchor 恒在 target 之后，无任何用例使 redirect 后 target 落于 anchor 之前（如 anchor 在 prev 行尾、redirect 目标在其前方→坍缩/翻转）。主张仅推演未锁。

**W4 调用方接线态零测试。** 手势态表六态中「程序化零触（dragged 门）」「位移<3px 走 F-12 早退」两态只在 SelectionLayer 接线层（diff +128~+158），测试件 208 行全部直调 releaseAffinity 纯函数，无组件级 mouseup 用例锁定 dragged 门与 F-12 交互——接线回归无网。

**W5 focusBoxAt 元素槽位分支未实测。** 全部用例 focus 均为文本节点（父 span 盒路径）；元素槽位的折叠 Range 插字符盒路径（release-affinity.ts 约 L106-114）在 jsdom 恒走四零守卫，真机行为（G1 br 槽形态）仅靠推演（实现者 §8 已申报，与 F-A10 双覆盖无害叠加未逐一实测）。入档跟踪即可。

## N（提示）

**N1** focusRowIndex 回退 `overlap===bestOverlap && overlap>0 && dist<bestDist`（约 L134-138）全零重叠返 -1 保守零变，与头注一致；并列等距取阅读序上行语义保持。✓

**N2** red2 证据链自洽：紧间隙复刻用例（test L180 区，|542.3-540.3|=2.0 > max(0.5,0)=0.5）在余量=0 时必红，判据微调（自裁 1）的「红证锁定缺口后微调」形态可由现存用例反推成立；red/red2/mutation 运行时刻无法自包内验证，不确定。

**N3** 几何单源落实：release-affinity 仅 import 复用 boxOf/visualRows/columnGroups(rowEndOf 间接)/rowEndOf（diff import 行），无聚类逻辑复制；anchor-blank-snap 5 处 export 均带接缝注释。✓ 自裁 2/3/4/5 与 diff 逐条对拍一致。

**N4** 行数：release-affinity.ts 166 行 ≤250 ✓；SelectionLayer 全文件总长包内不可见，≤300 红线不确定。

## E 接缝裁决建议

- 不变量登记：建议**新条目**（INV-5x：「mouseup 事件层可改写 focus 几何态——锚定层输入此前仅浏览器原生解析」），非 INV-37/58 修订（两者语义未被削弱）。
- e2e 替代恒真风险：jsdom 复刻锁的是判据数学，锁不住「浏览器是否下探」这一前提（F-A10 档案 1/4 次指纹佐证非确定性）——真机矩阵为唯一兜底，替代合理但须在档注明前提未锁。

## 统计

B=0 / W=5 / N=4

## 总评

**放行**（W1/W2/W3/W4 入档，建议紧随票：upX 空白尾判别收紧+prevTop 防御上界+翻转兜底与 dragged 门接线测试补网）。核心链路时序正确、判据微调有红证反推、几何单源零复制，无静默失败级阻断缺陷。