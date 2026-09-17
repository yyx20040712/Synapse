# F-TESTREF-W4 门一审包简报（六段）

## 1. 任务

战役收官票（registry id=F-TESTREF-W4，file 锚=docs/audits/flake-ledger.json）：
①flake 台账八线历史机件化；②reader-text 内联 stableRel 下沉共享 e2e 助手；
③INV-63/64 入册 docs/invariants.md；④战役收口段（W5：coverage 三档亲跑+e2e
全绿亲跑真退出码+全战役净删总账+基线重冻结）。搭车两项：W3 门二 P2-3（调色板
断言字面量 pin）、W2 门二 P2-2（test:e2e 语义三处回写）。S1 触发检查（零命中
不触发）。[test-refactor][locked-change] 双尾注。

## 2. 交付清单（对照审包 diff）

- **docs/audits/flake-ledger.json**：骨架（5 行 cases:[]）→八线收录（P7-A 7 现
  resolved/F-R2e 2 resolved/z-r2e 2 resolved/tag-lifecycle 2 resolved/F-ARCH4-M1
  1 observing/F-G11 1 observing/settings.png 1 observing/corpus-export 3
  unpursued）。数据源=charter §1.4 审计快照+各线史料档；first_seen 考证口径
  在 note 声明（无法精确到日的线以用例最早存在场次记）。
- **tests/e2e/stable-rel.ts（新，67 行）**：stableRel 配方逐字下沉+INV-51 口径
  单源头注；**tests/e2e/reader-text.spec.ts**：删内联定义（-55 行）+import 挂接
  +留 3 行指针注释；Page 类型随定义迁出（import 摘 type Page——ElectronApplication
  仍有 :416 消费保留）。
- **docs/invariants.md**：INV-63（测试面单调性——指纹门机制锚定）+INV-64（e2e
  禁截图比对——现存 0 处既成事实升格）两行入册，尾号 62→64。
- **scripts/check-quality.mjs**：第 9 段负锚（tests/e2e 下 .ts/.tsx 出现
  toHaveScreenshot 即红）+头部注释同步。
- **tests/contracts/constants.test.ts**：调色板断言 2→3 条——同源构造
  （z.enum(ANNOTATION_COLORS) 反射自反恒真）改两侧字面量五色 pin；**用例标题
  未动**（标题也在 C 面）；该件系 W3 新增未入战役前基线，改写走 NEW delta 形态
  无契约面损失、无需豁免（详见 §5 裁决）。
- **docs/design/2026-09-11_test-system-optimization-charter.md:294**（e2e DoD 行
  语义回写）+**docs/design/2026-09-18_complexity-governance-ruling.md:117**
  （F-GEOM-01 验收底色「e2e 44」→「一键全跑 44（默认门 42）」）+**docs/DEV-SETUP.md:68-69**
  （基线核对块：verify 数字 107/890/166→166/1713/334+test:e2e 26/26→默认门
  42/一键全跑 44；open 数改「随排程浮动」表述）。
- **tickets/registry.ts**：F-TESTREF-W4 open→done（summary 回写收口摘要——
  W2 :276 先例形态）。
- **docs/handoff/relay.md**：批次认领行（板协议面，非票面交付——RUNNING/claim）。
- 工件面（不入代码收益账）：scripts/test-surface.baseline.json 重冻结
  （179→183 文件/1623→1757 用例/4979→5334 断言）、locks/manifest.json
  （333→334，新件 stable-rel.ts 入网）、scripts/audits/w4-* 证据件 6 个。

## 3. 机检结果（全部真退出码）

- verify 全链 EXIT=0（quality+tickets+locks 334+lint+typecheck+test 166 文件
  1713 用例+build；Node 24.20.0；w4-verify-full.log）。
- 指纹门 check EXIT=0（delta 全绿）；**战役毕基线重冻结**（AGENTS [test-refactor]
  段明文义务）：显式 test-surface:baseline+全量 diff 审计
  （w4-baseline-refreeze-audit.md——共有 179 文件排除 line 字段后逐字节全同，
  纯增=W3 四件+W4 一断言；exemptions 零条目）。
- coverage EXIT=0（全局 86.6 lines≥70；repos 85/renderer 60 由 thresholds
  exit 0 背书；w4-coverage.log）。
- e2e 双通道：默认门 42/42（1.9m）+一键全跑 44/44（2.1m）双 EXIT=0
  （w4-e2e-appgate.log/w4-e2e-allgate.log）。
- tickets:check 195 票 open 15；locks:check 334 一致；lint/typecheck EXIT=0。

## 4. 变异红证（每防线能红一次）

- **stableRel 下沉活性**：streak>=2→999（永不收敛）→e2e「划选高亮后重开仍在
  原位」红，红点=stable-rel.ts:65 expect 穷尽分支、调用栈经 reader-text.spec:130
  ——证明消费的是共享版且门在链上；cp 备份还原 diff 空+复绿
  （w4-mutation-stable-rel.log）。
- **INV-64 负锚活性**：stable-rel.ts 注入 toHaveScreenshot 注释行→check-quality
  EXIT=1 红消息精确点名该文件→删注入复绿 EXIT=0（w4-inv64-anchor-red.log）。

## 5. 自裁申报（超票面/口径决定，请对抗拷问）

1. **调色板改写无需豁免**：constants.test.ts 系 W3 新件、未入战役前基线（W3
   纯增不重冻结）——旧断言不在基线即无 MISSING，改写以 NEW delta 形态绿；豁免
   清单零条目。INV-63 行文相应写为一般条款（不写「豁免首例」）。
2. **DEV-SETUP verify 数字行顺手对齐**：搭车裁定面=test:e2e 行；同块 verify 行
   数字（107/890/166）同为 2026-08 期旧数、与本票收官真数（166/1713/334）直接
   冲突，不修=文档继续误导；同文件同段一次写对（W2 P2-2 同型教训）。
3. **z-r2e-probe 的 rectStableGate 保持内联**：票面只令 reader-text stableRel
   下沉；探针版失败消息带末次样本（取证语义）与共享版 return 值语义不同，强行
   统一=改探针失败输出形态（取证面变更超票面）；stable-rel.ts 头注声明该自裁。
4. **flake 台账 first_seen 精度分层**：P7-A/R2e/z-r2e/tag-lifecycle/ARCH4-M1/
   G11/settings.png 七线史料可考到日；corpus-export 一线史料散档未载精确日，
   以用例最早存在场次（2026-08-27）记——note 声明口径，不虚构精度。
5. **基线重冻结时机**：票面原文未明写本票执行，AGENTS [test-refactor] 段
   「战役毕基线再生成」+本票=战役收官票→重冻结义务在本票；审计档留
   w4-baseline-refreeze-audit.md。

## 6. 证据指针（均在 scripts/audits/）

w4-verify-full.log｜w4-coverage.log｜w4-e2e-appgate.log｜w4-e2e-allgate.log｜
w4-mutation-stable-rel.log｜w4-inv64-anchor-red.log｜w4-s1-probe.txt｜
w4-baseline-before-refreeze.json｜w4-baseline-refreeze-audit.md｜
w4-gate1-diff.patch（本审包 diff，剔 manifest/baseline 全量——两者为工件面，
stats 见 §2）。

## S1 触发检查

W12（非白名单 it.each 双层形态）/N11（本地变量别名）/N15（type-only 别名）
三类探针零命中（w4-s1-probe.txt）——搭车票不触发（板面「不触发不阻塞」）。

## 附录 A：新件全文（未跟踪面，git diff 不含）

### tests/e2e/stable-rel.ts（67 行）

```ts
/**
 * [F-TESTREF-W4] e2e 稳态几何采样共享助手（INV-51 口径单源）。
 *
 * 从 reader-text.spec 内联版下沉（F-R2e 修的已验证配方，2026-09-18 随 W4
 * 收官票收敛）：新几何断言一律经本助手取值，禁各写裸 boundingBox 竞速。
 *
 * 稳态原子测量：标注块相对页面 canvas 的归一几何（x/y/w/h）。两源瞬态均能
 * 造成恰 y 轴假红（排查档 scripts/audits/f-r2e-investigation.md）：①重锚双态
 * ——AnnotationLayer 先渲染存量行盒几何（fallback），resolve 完成后跳 band
 * 收边几何（MutationObserver 实测 y 差 4.44px、正常负载窗 ~8ms）；②两次独立
 * boundingBox 调用之间的滚动落帧（注入实验 dy=Δ 线性实证）。故先双采样稳定门
 * 跨过双态瞬态，再以单 evaluate 同帧取 rect/canvas 两盒——同帧差值对滚动平移
 * 不变。断言语义=稳态「原位」（初渲染瞬态位不属断言面——内部时序非缺陷）；
 * 可见性守卫保留（零盒=display:none 形态视为未就绪，穷尽即红——门一 W-4）；
 * 穷尽未收敛=fail loudly（静默返回末值会把假红面留给瞬态——门一 B-1）。相对
 * canvas 归一消窗口几何漂移（窗口状态恢复取整差）；时长代价两程各 ≤3s
 * （门一 N-3 备案）。z-r2e-probe.spec 的 rectStableGate 刻意保持内联（探针
 * 取证语义：失败消息带末次样本——W4 票内自裁，非疏漏）。
 */
import { expect, type Page } from '@playwright/test'

export interface StableRel {
  x: number
  y: number
  w: number
  h: number
}

export async function stableRel(win: Page): Promise<StableRel> {
  const measure = (): Promise<StableRel | null> =>
    win.evaluate(() => {
      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
      if (r === undefined || c === undefined) return null
      // 可见性守卫：零盒（display:none/未渲染形态）=未就绪，不当稳定值（W-4）
      if (r.width <= 0 || r.height <= 0 || c.width <= 0 || c.height <= 0) return null
      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
    })
  // 前置观察窗（400ms＞双态基线窗 8ms×50）——双采样一致不能区分「跳变已结束」
  // 与「跳变未开始」，前置窗给 fallback→resolved 留余量（门二 W-A 加固一）
  await win.waitForTimeout(400)
  let prev = await measure()
  let streak = 0
  for (let i = 0; i < 25; i++) {
    await win.waitForTimeout(120)
    const cur = await measure()
    if (
      cur !== null && prev !== null &&
      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
    ) {
      // 连续 3 采样点（2 对相邻一致≈360ms 平台）才返回——双点一致即返回会在
      // fallback 平台提前收敛（resolve 推迟则假红通道仍开）（门二 W-A 加固二）
      streak += 1
      if (streak >= 2) {
        return cur
      }
    } else {
      streak = 0
    }
    prev = cur
  }
  expect(prev, '标注块 3s 内未出现（元素缺失或恒不可见）').not.toBeNull()
  // B-1：非收敛必须红——穷尽静默返回末值=断言输入不可靠且恰在负载态位形触发
  expect(false, '标注块几何 25 轮（3s）采样未收敛——双态瞬态/漂移超预算，断言输入不可靠').toBe(true)
  throw new Error('unreachable')
}
```

### scripts/audits/w4-s1-probe.txt

```
== W12 命中 0 ==
== N11 命中 0 ==
== N15 命中 0 ==
S1_VERDICT: 零存量命中——搭车票不触发（relay 板 W4 行「不触发不阻塞」）
```
