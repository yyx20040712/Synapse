## 定点复核

### W-2 — ADDRESSED

代码证据(净版 diff,lineage-viewport.ts):

```ts
export function rootToLocalScale(el: Element, rect?: DOMRect): number {
  const rw = (rect ?? el.getBoundingClientRect()).width
  const cw = el.clientWidth
  return rw > 0 && cw > 0 ? cw / rw : 1
}
```

`rect` 已为可选参,`??` 短路保证传入 rect 时不自读 gBCR;wheel 消费点:

```ts
const rect = el.getBoundingClientRect()
const s = rootToLocalScale(el, rect)
const mx = (e.clientX - rect.left) * s
```

同一 `rect` 对象同时供 `rect.left`(锚点差值)与 helper 比值分母 `rect.width` 使用,同帧单读的自洽问题已消除。pan 消费点保持 `rootToLocalScale(el)` 缺省自读——pan 增量 `dx = e.clientX - lastX` 不依赖 `gBCR.left`,无同帧自洽需求,不传 rect 合理。W-2 完整落地。

### N-3 — ADDRESSED

测试文件新增 ③c:

```ts
const el = stubMeasured(800, 0)
expect(rootToLocalScale(el)).toBe(1)
```

守卫组合四象限齐全:① cw>0/rw>0;② 恒等;③ 双零;③b cw=0/rw>0;③c cw>0/rw=0。helper 守卫 `rw > 0 && cw > 0` 下 ③c 返回 1,断言正确。「真机不可达」声明成立——clientWidth>0 即存在布局盒,其 gBCR 宽度必 >0(含祖先 zoom 只会放大),rw=0 且 cw>0 仅 jsdom 桩面可构造,作为防御回归锁合理。

### ⑤ 自裁 — 合理,不越界

```ts
const el = stubMeasured(800, 1447.5)
const rect = { width: 1600 } as DOMRect
expect(rootToLocalScale(el, rect)).toBeCloseTo(0.5, 3)
```

⑤ 直接锁 W-2 新签名的 rect 分支——若无此用例,「rect 传入则不自读 gBCR」这一回炉核心语义零测试覆盖,等同 W-2 的测试侧空缺。桩值刻意让 gBCR(width=1447.5)与 rect(width=1600)不同,自读路径即得 0.5526≠0.5 红,检测力有效。属 W-2 的必要配套而非越界新增。

## 新破坏扫描

- **签名变更零破坏**:pan 单参调用兼容;fit 不调用 helper;测试①~④均单参。wheel 是唯一传 rect 的消费点,类型匹配。无破坏。
- **⑤ stub 手法**:实例 `Object.defineProperty(clientWidth)` + 原型 `vi.spyOn(getBoundingClientRect)`,与既有用例同式;afterEach restoreAllMocks 无跨用例污染。且⑤即使原型 mock 失效(jsdom 默认 gBCR 宽 0)也会因守卫返回 1≠0.5 而红,检测不依赖 mock 生效,稳健。
- **963 数理**:961(首轮 5 新用例)+ ③c + ⑤ = 963,与 `f-l2-green-r2.raw.txt` 尾部 `963 passed` 一致;比预估 962 的 +1 偏差来自自裁⑤,已在报告中如实申报,不构成问题。
- 未发现新 B/W 级问题。两点非缺陷观察:pan 每 pointermove 重读一次 gBCR 为修复必需代价(每次事件重新取比值比缓存更准确);⑤型「组件内 wheel 只读一次 gBCR」无组件级测试锁定,但代码评审可见单次调用且该实现细节精确正确,不构成盲区。

## 总评

定点项全数 ADDRESSED,新破坏扫描零 B/W,放行门二。