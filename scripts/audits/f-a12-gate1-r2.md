[routing]: run=20260910012717-jfm7 source=kimi-main model=kimi-k3 switches=0 usage=in=13807,out=6184 latency=194154ms (by ds-call.mjs 链)

# F-A12 门一 R2 定点复核结论

## W1（x 域判别）——ADDRESSED ✓

代码证据闭合：release-affinity.ts L191-196 `nearestGroupOf(prev, upX)` + `if (upX <= groupRight + 1) return null`。语义核验：

- 域内（含 +1px 容差）→null：W1 用例 x=800∈[748.9,877.7] 与 x=878.7=877.7+1 双点锁定；容差惯例对齐 F-A10 `<= box.left + 1`，成立。
- G2 触发面保持：x=907.7 > 878.7 → 触发（紧间隙复刻用例在档）。
- 正确性关键点：若 upX 落任一组域内，该组 dist=0 必为最近组 → 域内判别无漏。
- 红证闭合：W1 用例对回炉前代码（无 x 判别）必触发→非 null→红，成立；MW1 删判别→x=800 用例红，成立。
- Rule of Three 第 2 次保持重复：可接受，但见下方风险注记 R-1。

## W2（跨多行上界）——ADDRESSED ✓

`if (upY < Math.min(...prev.map(r => r.box.top))) return null`（L180-182），置于 x/y 判据之前。W2 用例 y=75 < r0.top=80，且注释自证「无此界时 |75-90|=15 ≤ max(25,4) 恒触发」——回炉前红证逻辑成立，非装饰性防御。双栏 prev 行取 min(tops) 方向正确（保守）。

## W3（翻转兜底）——ADDRESSED ✓（申报属实）

「对回炉前即绿=回归锁非红证」申报经推演成立：releaseAffinity 在回炉前已存在且 (75,93) 满足旧判据（x 判别缺、y 3≤7 触发），重定向至 r0 尾（全局 8）后 [21,8] 经 C-1 翻转得 start=8/end=21/quote='AB firstCD se'（13 字符逐字核账 ✓）。如实申报为 C-1 面回归网，非冒充红证，予以认可。

## W4（接线三态锁）——ADDRESSED ✓（申报属实+教训可信）

- 三态断言面=selection 终态（focus node/offset），绕开 jsdom evaluate 深链，手法与受锁件同源；Range.prototype.getBoundingClientRect 零盒桩+afterEach 还原，桩卫生合格。
- 「锁面非红面」申报成立：dragged 门与接线为 R1 已放行面。
- 连带修正诚实性：①既有夹具 upX 严谨化 4 处——原 x=60 落域内确与「行尾空白区」票面语义矛盾，W1 落地必红，修正方向正确且声称 red3 档内对旧断言中性；②漏桩被 verify 真退出码拦截、grep 掩蔽两轮自罚申报、证据档重刷——与主控亲验「verify 真退出码=0、green2 零 Unhandled」互证，采信。

## 新破坏扫描

**R-1（风险注记，不阻断）**：nearestGroupOf 与 rowEndOf 内部距离式「同输入同式必然一致」的论断依赖两个未证前提：columnGroups 组内元素按 x 升序（nearestGroupOf 取 `g[0].left`/`g[len-1].right`，而 W1 判别却用 `Math.max(...right)`——两处取右缘手法不一致，若组内无序则距离域错算）；rowEndOf 内部判别式本次未出示 diff，无法亲验同型。**不确定**，建议门二或后续票核对 anchor-blank-snap 源码。

**R-2（覆盖缺口=保守零变，非新破坏）**：upX 落双栏间隙且更近右栏左缘时（如 A=[10,100]/B=[150,240]，upX=135），nearest=B → 135 ≤ 241 → null；左缘外（upX < gLeft）同式 null。两处上一行该 x 实无文本，按票面机制似应重定向，但重定向目标（行尾）对该释放位几何上亦错误，null 为保守零变=缺陷原样存续而非引入新错。建议入档为已知边界，不阻断本票。

**R-3（无问题）**：深点用例 x=60 落域内，y 判据判别力被 x 判别掩蔽的疑虑经排查消除——「大间隙底部刻意释放」用例 x=100 在域外独立锁 y 判据，y 判据变异仍必杀。变异覆盖闭合。

**R-4（无问题）**：SHALLOW_PROBE_MAX_PX 与 W2 交互核验——W2 保证 upY ≥ prevTop，余量仅在 focusTop−upY<4（紧间隙）生效，大间隙形态仍由距离主判据裁决，与头注申报一致。

## 总评：**收口放行**

W1-W4 全部 ADDRESSED，红证/变异/锁面三类证据性质申报均属实且可推演互证；主控亲验（verify 退出码 0、locks 316、162/1579）与实现者证链一致。R-1 不确定项、R-2 保守边界建议随档入录，W5 维持入档。本票门一关闭。