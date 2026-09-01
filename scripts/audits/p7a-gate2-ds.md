[routing]: run=20260901191049-whmu source=deepseek model=deepseek-v4-flash switches=0 usage=in=4693,out=11200 latency=106906ms (by ds-call.mjs 链)

# F-R2+P7A 门二合并审材料包 — 异构二审结论

## 逐条审计结论

---

### 工单 1：F-R2 回炉修法正确性独立复算（zoom 链乘积 / mock 桩强度）

**评级：[N] 通过（附建议）**

**证据与复算：**

- `scroll-converge.ts` 中 `effectiveZoom` 实现：
  ```ts
  let z = 1
  let el: HTMLElement | null = scroller
  while (el !== null) {
    z *= Number(getComputedStyle(el).zoom) || 1
    el = el.parentElement
  }
  return z
  ```
  循环从 scroller 起向上至 documentElement，逐层乘 `computed zoom`，数学上等于 `∏ zoom(ancestor)`。CSS zoom 不具继承性，祖先层各自显式 zoom 的视觉叠乘正是链乘积，漏层/重复不会发生。

- 对 `NaN`/`undefined`/空串路径：`Number(...)||1` 将 `NaN`、`0`、`''` 一律归一为 1，安全。`zoom` 合法值均为有限正数，不存在负值风险（负值浏览器忽略，如出现 `-1` 则 `-1||1` 返回 `-1`，但 `zoom` 负值非法，非实际路径）。

- `scrollIntoNearestScroller` 公式复算（diff 中 `start`/`center` 两式）：
  - `start`: `scrollTop + (elRect.top - scRect.top) / z` → 视觉差值除 z 回本地空间，与 `elRect` 同源，正确。
  - `center`: `scrollTop + (elRect.top + elRect.height/2 - scRect.top) / z - clientHeight/2` → elRect 项在视觉空间除 z，clientHeight 本地空间不除 z，同时公式中 `elRect.height` 已在除 z 之前包含，正确。
  - 单测期望值复算：start 用例 `(600-100)/1.25=400`、center 用例 `(1460+150-110)/1.5-400/2=800`、底夹取用例 `raw=1920>1600`，均与实现一致。

- mock 桩 `stubZoom` 用 `vi.spyOn(window, 'getComputedStyle')`，但委托真实 `getComputedStyle` 再覆盖目标元素 `zoom` 字段，其余元素、`overflowY` 等属性透传真实值——不弱化祖先判定，也不污染其它元素。jsdom 不识别 zoom 导致 `Number(undefined)=NaN→1`，符合设计意图。

- **不足（非阻断）**：单测仅覆盖 scroller 单层 zoom（1.25/1.5），未覆盖「祖先复合 zoom」（如 outer zoom 1.25 × inner zoom 1.5）和「目标元素自身 zoom 不参与折算」的用例。链乘积逻辑简单但缺复合场景锚定。建议补一条双祖先 zoom 用例。

---

### 工单 2：ε 污染 → 3.45px 因果链强度评估

**评级：[W] 警告（证据方向正确，但定量因果未完全闭合）**

**证据：**

- 事实链列出：e2e 稳定红 `3.4499969482421875`（两次全量），诊断探针比值法 `z=964.6/772=1.24948` vs `computed zoom=1.25`，ε≈0.0005。
- 修复后 e2e 29/29 绿，真机探针偏移从 −0.6px 收窄至 ±0.2px。这一结果支持「比值法不可靠、computed zoom 正确」的结论。

**未闭合点：**

- 数学上若仅由 ε=0.0005 误折算，则所需视觉差值 ≈ `3.45 / (1/1.24948 − 1/1.25) ≈ 10,360px`，但材料未给出 e2e 场景的滚动距离或元素位移量，无法独立确认。
- 比值法 `gBCR.height/clientHeight` 还受 border/padding/滚动条宽度影响，其偏差在不同元素上可能大于 ε 本身；材料未给出该偏差的跨度数据。
- 因此，ε→3.45px 的定量因果未被直接证明；但「比值法含几何污染、computed zoom 径读 CSS 声明值」是更优口径，且修复后回归全绿，作为现象级修复可接受。

**建议**：若能补充 e2e 场景的 δ_visual 或 scrollTop 预期值，计算 `δ_visual*(1/z_meas − 1/z_true)` = 3.45 的验证，则因果链完全闭合。

---

### 工单 3：P7A 防线完备性

**评级：[N] 通过**

**证据：**

- diff 中清场标记：`clipboard.writeText('__p7a_cleared__')` 在 `ctrl+c` 前执行，从根上覆盖「旧值残留」——若 ctrl+c 写入失败，读到的是标记而非外部旧值，可归因。
- 条件重读：`for (i<5) { read; if includes expected break; wait 200ms }` 覆盖「写入未落盘」延迟，最多 1s；超时失败信息带末次读值，可区分「标记=写入未落盘」「其他=外部再改写」。
- 断言锚未放宽：仍 `toContain(PDF_KNOWN_TEXT)`；`expect(clipped, message).toContain` 第二个参数仅为诊断消息，实现合法。
- 「读前外部再改写」残余窗：轮询最多 5 次，若外部改写发生在最后一次 read 与断言之间，理论上有假绿（外部写入恰好含期望文本）/假红（断言前最后被改）的概率。鉴于这是系统剪贴板竞争的本征风险，且测试在受控 CI 下运行，可接受。
- 潜在风险（非缺陷）：新增 `writeText` 依赖剪贴板可写权限，若受限环境不允许写入会直接报错；但 Electron `clipboard` 模块在 e2e 框架内通常可用。

---

### 工单 4：主控压缩票流程合规面

**评级：[W] 警告（已补偿但流程偏离存在）**

**证据：**

- 材料明确记载：F-R2「原实现者会话终止+预算降级，担责披露」后主控直做；P7A 亦主控直做。这破坏了「实现与审查分离」的常规约束。
- 补偿措施：先红证据（p7a-red1.raw.txt 注入复刻）、还原 diff 空、单测 126 文件 1081 绿、M5 变异 5 用例红、e2e 全量 3 次连跑（P7-A 全绿）、门一独立审查已给结论、本门二异构二审。整体补偿较充分。
- 但流程偏离本身仍应记录；压缩票直做模式若常态化会弱化审查独立性。建议在收口记录中标注「主控直做授权面」及本审查为补偿性审查。

---

## 统计

| 评级 | 数量 | 工单编号 |
|------|------|----------|
| B    | 0    | —        |
| W    | 2    | #2, #4   |
| N    | 2    | #1, #3   |

## 总评

**可收口。**

- 无阻断缺陷：F-R2 修法数学正确、mock 桩合理；P7A 防线覆盖两大竞态面并保留可归因性。
- 两处警告不构成回炉条件，但需在记录中保留：
  1. ε→3.45px 定量因果未彻底闭合（可补充 δ_visual 计算）；
  2. 主控直做流程偏离已由独立审查补偿，后续应避免常态化。

建议收口时附上本审查的 W 项处理说明（如补算验证或明确接受残余窗）。