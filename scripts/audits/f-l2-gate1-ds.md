# 门一对抗深审报告 —— F-L2（lineage 视口量测 zoom 污染修票）

## 统计
- **B：1**
- **W：6**
- **N：4**
- 合计 11 条。审毕源码 diff 与探针/证据 JSON 全文。

---

## B 级

**B-1　e2e 29 未跑，直接违反票面 §5.4 收口面**
- 位置：`实现报告→收口证据→"e2e 29：未单独跑…"`；票面 §5.4「e2e 29 全跑」
- 证据：实现报告明写「未单独跑」，并以「收口主控 verify 全量口径覆盖」作为替代理由；但 `f-l2-closeout-verify.raw.txt` 中补充证据只含 lint/typecheck/test/build，无 e2e 段，`EXIT=1`（locks 结构性红）后 verify 管线被截断，e2e 并未在最终收口被执行。票面把 e2e 29 列为验收项而非可委托项。若主控收口另有 e2e 环节，此为流程交接缺口，需门二在放行前明确确认；否则应回炉补跑。

---

## W 级

**W-1　fit 回退分支 `el.clientWidth || rect.width` 在真机可达性没有被验证，且若真机可达会复发溢出**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:140`（fit effect 内 `const vw = el.clientWidth || rect.width`）
- 证据：预裁 1 认为「真浏览器有布局时 clientWidth 恒>0」，但没有任何真机手段验证该回退分支的死代码性——jsdom 桩面由受锁测试 `lineage-canvas.test.tsx` 的 `stubViewportRect` 覆盖；若未来某种 CSS 布局态（如 `display:contents`、SVG 内联尺寸异常）使 clientWidth=0 而 gBCR>0，回退将直接采用根框口径（含 zoom），F-L2 溢出在退化态复发。回退不劣于修前成立，但「分支不可达」属未证断言。

**W-2　wheel 处理同一帧内 gBCR 读取两次，`rect` 与 `s` 存在跨读自洽性假设**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:165`（`const rect = el.getBoundingClientRect()`）与 `:166`（`const s = rootToLocalScale(el)`，函数内部又读一次 `el.getBoundingClientRect().width`）
- 证据：同一次 wheel 事件内，`rect.left/top` 来自第一次 gBCR，`s` 的分母来自第二次 gBCR；若同帧出现布局抖动（字体加载、子节点回流、容器 resize），两次 gBCR 未必相等，则 `(e.clientX - rect.left) * s` 的两项来源不一致——锚点产生系统性偏差。真机布局稳定时两者相等，但无代码层防御（如 helper 接受已读 rect 作参数）。

**W-3　pan 每 move 触发两次量测读（gBCR+clientWidth），高频拖拽下无缓存**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:208`（`const s = rootToLocalScale(el)` 位于 `onMove` 内，每次 pointermove 执行）
- 证据：每次 mousemove 都重新调 `getBoundingClientRect()` 并读 `clientWidth`；在拖拽中布局为 clean 时走缓存，但若拖拽期间发生任何布局失效（如 node hover 高亮、侧板 resize），会强制同步 layout 两次。票面 §3 声明「瞬态频率可受」——可辩护，但未做节流/缓存，属性能面残留风险。

**W-4　pan 拖拽跨帧的 `s` 与 `dx` 可能来自不同布局状态**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:202-211`
- 证据：`dx = e.clientX - lastX` 中 `lastX` 是上一帧根框坐标，`s` 是当前帧读取；若 SET1 zoom 在两次 move 之间变化（设置面板即时切换或未来加过渡动画），上一次移动的根框差分被当前 s 归一，跨帧比例错配。当前 SET1 缩放非动画（票面 §1.5 备案），风险仅存在于状态切换边界的单帧，但无代码级屏障。

**W-5　探针 B 断言的传递链依赖「fitViewport 纯函数既有锁」，而 fit 消费点在本票无直接 jsdom 锁**
- 位置：`scripts/audits/f-l2-fix-verify.mjs:134-145`（B/small/client-eq-gBCR-w/h 与 no-overflow）；`tests/unit/renderer/lineage-viewport-scale.test.ts:14-16` 头注自述「fit 消费点（M3 型）jsdom 不可达」
- 证据：B 场景实际只验证「量测源一致」（clientW==gBCRw），「fit 输出恒等」依赖 fitViewport 为纯函数且有 `edge-label-layout.test.ts` 既有锁的传递论证；若未来 fitViewport 的输入输出映射被改动但保持既有锁不失效（锁定用例未覆盖所有输入空间），B 无直接信号，仅 A 场景三档能兜底——链条正确但脆弱。

**W-6　嵌套 zoom 复合语义（测试④）无真机证据，仅数学自洽**
- 位置：`tests/unit/renderer/lineage-viewport-scale.test.ts:56-64`（④ 0.64 档用例）
- 证据：测试用 `clientWidth=1000/gBCR.width=1562.5` 直接构造 0.64 比值，但未在任何真机 CSS 嵌套 zoom 环境（如 `.app-content-row` 内再套一层 zoom）下验证「clientWidth/gBCR 真会复合为 0.64」。票面 §0 原理论证成立，但该用例只锁「helper 不查 CSS」的数学属性，锁不住浏览器对嵌套 zoom 的实际复合行为。

---

## N 级

**N-1　探针 A 场景与票面 §5.3 操作序列有偏差（wheel 置位步骤），但必要且自洽**
- 位置：`scripts/audits/f-l2-fix-verify.mjs:102-105`（循环内「wheel 置 userInteracted → 点适应视图」）；票面 §5.3「设 --ui-scale→点「适应视图」」
- 证据：实现报告自裁 2 说明原序列在 `userInteracted=false` 时被 React bail out 无法测到 refit——此修改是绕过票面流程缺陷的必要变通，A 场景修复断言仍有效；但该偏差未被票面批准，属实现者自裁范围，门二需确认接受。

**N-2　真机数据漂移（precheck 15:33Z vs fix-verify 15:47Z）未有独立证据落盘**
- 位置：`实现报告→疑虑`；`f-l2-fix-verify.json` meta.date=15:47:33
- 证据：报告称「基线 k=1.3873 按 1568 视口、本轮 k=1.0552 按 1158」，但探针 JSON 不含 precheck transform 基线字段，无法在单一产物中复算漂移；若漂移源于并发写，则 15:47 探针快照本身也可能不稳定——报告已建议关注，收口主控需确认环境排他。

**N-3　helper 守卫覆盖不对称：未测试 rw=0 且 cw>0 的情况**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:64`（`rw > 0 && cw > 0 ? cw / rw : 1`）；`tests/unit/renderer/lineage-viewport-scale.test.ts:38-46`（③为 0/0，③b 为 0/800）
- 证据：守卫语义「任一量测≤0→1」的边界组合有四种，测试覆盖了 rw=0/cw=0 与 rw=800/cw=0，未覆盖 rw=0/cw>0（该分支应返回 1）——真机不可达但属桩面可测的空缺。

**N-4　挂载早期（布局未稳）fit 量测时序无专门锁定，但风险与修前等同**
- 位置：`src/renderer/features/lineage/lineage-viewport.ts:137-156`（fit effect）
- 证据：useEffect 在 paint 后运行，真机 layout 已稳定，clientWidth 非零可走主路径；jsdom 下 clientWidth/gBCR 均 0 则跳过。若首帧 layout 延迟导致量测为 0，需 nodes/labelBoxes 等依赖变化才能重跑——与修前行为一致，未新增风险，但未显式测试。

---

## 总评

- **最大风险**：e2e 29 未跑使真实渲染管线（含 zoom 缩放后的 pan/wheel 交互）无自动回归面，且 B-1 是票面验收项的直接缺口。
- **门二放行**：有条件放行——主控收口须确认 e2e 29 已在收口环节全跑（或明确降级为本票外备案），且 N-2 数据漂移环境已排除并发写。
- **建议回炉点**：优先补跑 e2e 29；其次将 W-2 的 wheel 双 gBCR 读取重构为单次读取（helper 接受已读 rect 参数），消除同帧自洽假设。