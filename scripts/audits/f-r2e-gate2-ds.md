[routing]: run=20260902111043-g7zx source=deepseek model=deepseek-v4-flash switches=0 usage=in=9171,out=17503 latency=155950ms (by ds-call.mjs 链)

# 门二独立终审意见(回炉后终态)

## 结论一览

| 编号 | 级别 | 结论 |
|---|---|---|
| 原 B-1 复审 | B 解除 | 穷尽静默返回已堵死,非收敛必红 |
| 原 W-4 复审 | W 闭合 | 零盒假绿面已守卫,恒 display:none 穷尽必红 |
| 门一其余 5W/3N 处置 | — | 处置与报告口径均核实到位 |
| 新发现 A | W | 稳定门可能提前收敛于 fallback 态,resolve 若发生在返回后仍可假红 |
| 新发现 B | N | 穷尽后首条 expect 的错误文案在“间歇性出现且最后为 null”时失真 |

---

## 1. 门一 B-1 复审:真实解除 [B 解除]

修复后循环穷尽时不可能执行到 `return`。路径为:

```ts
expect(prev, '标注块 3s 内未出现（元素缺失或恒不可见）').not.toBeNull()
expect(false, '标注块几何 25 轮（3s）采样未收敛——...').toBe(true)
throw new Error('unreachable')
```

- 若 `prev === null` → 首条 expect 失败,红;
- 若 `prev !== null` → 首条通过,二条 `expect(false).toBe(true)` 必然失败,红;
- `throw new Error('unreachable')` 仅为 TS 控制流收口,运行时不可达或追加兜底。

`expect(false).toBe(true)` 在 Playwright 语义下必然抛 AssertionError,红形态可靠。原先“10 轮采样未收敛却静默返回末值”的路径已不存在,错误信息也不再说谎(在 prev 非空且不收敛时给出真实“未收敛”文案)。

---

## 2. 门一 W-4 复审:零盒假绿面已闭合 [W 闭合]

measure 内显式零盒守卫:

```ts
if (r.width <= 0 || r.height <= 0 || c.width <= 0 || c.height <= 0) return null
```

`display:none` 的 gBCR 全零会返回 null,不进入稳定值候选;若两程均恒 `display:none`,则 prev 恒为 null,循环无法收敛,穷尽后首条 `expect(prev).not.toBeNull()` 先红。红形态正确。

`visibility:hidden` 仍有布局盒,原 `boundingBox()` 同样返回非 null,因此视觉不可见但零盒守卫不拦的面与原语义一致,未引入收窄或放宽。

---

## 3. 修票 diff 其余面评估

- `throw new Error('unreachable')`:补足 TS 对函数必须有返回值的控制流分析,语义正确;
- 时长代价:每程最多 `25×120ms ≈ 3s`,两程合计 ≤6s 额外等待。报告 §6 已作 N-3 备案,13/13 绿在档,可接受;
- 断言语义:四值 `m1.x/y/w/h` 与 `m2.x/y/w/h` 均在各自程内由单 evaluate 同帧取 rect 与 canvas 的 viewport 坐标后做差。与旧实现同坐标系、同差语义;滚动撕裂被同帧性根除;“原位”如实认定为稳态原位而非挂载瞬态位,报告已不称“语义不变”,不再 over-claim。

---

## 4. 门一 5W/3N 处置核实

- W-1:§0/§6 已降级为“负载态短暂重锚的用户可见性未评估”,没有再断言“用户不可感”;
- W-2:§3 已明确标注“此为未证假说”,偶发性解释改列三候选;
- W-3:§0/§3 已改为“暂裁合流,计数保留不销项”,未关闭 W-G1;
- W-4:代码补零盒守卫,注释与 §6 均如实认定语义收窄;
- W-5:§5 已披露探针样式断言链删减,并限定“t0 之前位形等价”;
- N-1~N-3:§0/§6 保留存在性≠归因、三候选免疫为条件命题、时长备案等边界。

报告口径整体与门一裁决一致,未发现隐瞒或降级不实。

---

## 5. 新发现

### [W-A] 稳定门可“提前收敛”于 fallback 态,resolve 若发生在返回后仍存在假红通道

证据(修票代码):

```ts
if (
  cur !== null && prev !== null &&
  Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
  Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
) {
  return cur
}
```

收敛条件仅证明“当前两次采样一致”,不能区分“双态跳变已经结束”和“双态跳变尚未开始”。若 resolve(fallback→resolved)被推迟到 stableRel 已返回之后,且第一程在 fallback 态采样两次即返回、第二程在 resolved 态返回,则 m1/m2 仍差 `4.44px` 量级,假红通道依然存在。

当前 mutLog 显示 resolve 在挂载后 ~5-10ms 完成,而 stableRel 前有多条 Playwright 断言,为 resolve 留出了余量,因此自然态实际触发概率低。但报告 §6 称“任何几何瞬态/滚动形态都会落入稳定门或原子测量的防线之一”属过度保证——本路径不在该防线内。

建议:若存在 `resolved` 态可观测标志,优先改显式等待;否则至少应连续 3 次以上采样稳定再返回,并在报告中明确该残余限定。

### [N-B] 穷尽后首条 expect 的文案在间歇性出现场景下可能失真

若元素曾出现过、但循环结束时最后一次 measure 为 null,则 `prev === null`,首条 expect 报“3s 内未出现”。实际上元素出现过,只是最终缺失。该场景为间歇性 DOM 不稳定,失败本身正确,但文案可更精确为“未稳定呈现/最终未就绪”。不阻塞。

---

## 终审判定

**条件 PASS**

条件:
1. 将 [W-A] 提前收敛于 fallback 态的残余风险如实入档,并补做“连续多次稳定后再返回”或“等待 resolved 显式标志”的加固;
2. 如不改代码,至少需在报告 §6 的“通杀”表述上增加限定:双态瞬态若发生在稳定测量窗口之后,不保证被跨过。