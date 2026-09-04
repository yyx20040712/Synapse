# F-A6-d 门二终位审（deepseek,瘦身包）

门一 Kimi PWW（2W3N）,W1 已回炉闭合。你终位三问：①收口完备性 ②W1 处置闭合度 ③战役终位（五票可否宣告+遗留排期）。输出只一个 JSON 对象（{"verdict":"PASS|PASS_WITH_WARNINGS|FAIL","findings":[{"severity","target","issue","evidence","suggestion"}],"summary":"两三句"}）,不要围栏。

## 战役与票（背景压缩）

F-A6 五票全链在档：a 取证（R-迁移裁定）→b1 T1/T9 前置修复（决策门过）→b2 主链项几何迁移（INV-58 前半+G2）→c rAF 调度+快路径（INV-58 后半,门二 PASS 零 findings）→d 本票收口：e2e 两小票+INV-37/58 登记+ADR-0019 R3 落笔。四轮取证终态:D1 面健康页逐位不变+IoU 全升+病理页消除;D2 面间隔 200→59.5ms+clientRects 8→1+gCS 685→87。

## d 票产物摘要

- e2e 组合页小票（/Rotate 90×CropBox [36,36,540,720]——b1 门一 N3 缺口兑现）：4 断言=①span×canvas 包含度 ≥0.5（**实测 1.000**）②toolbar 可见 ③selection-rect 块数=行真值 1 ④块右缘不溢渲染页盒（canvas.right+2）;红证 4（块数 1→2 恒红/随动判据翻转红/包含度翻转 ≥0.5→≤0.1 红[Received 1]/右缘收紧红[Received 1116.11 vs ≤549.2]）。
- e2e 拖选随动小票:3 次 selectionchange×50ms 每轮+1 字符→300ms 窗 ≥2 次块变更（rAF e2e 级;修前 5Hz 至多 1 次）。
- 全量 e2e 41/41 零 skip（F-ARCH4-M1 原:872 本轮绿）;verify 154/1325 exit 0;locks 277。
- INV-37 调度条款改写（rAF 快路径+settle 单一权威+拖选期「所见≈所存」弱化显式[用户裁决 2026-09-03]）+INV-58 新登记（同族+C5+适用域 selection 产链+AnnotationLayer 票外+三层回退）。
- ADR-0019 R3 落笔（终态数字按裁决表校正）。
- 遗留排期:page-box 旋转错配独立票（主控 W2 收口立项——[data-page-box] 占位盒未随旋转交换宽高,paint 链不受影响,真实库 rotate=0 未显现）/AnnotationLayer seam 独立票（b2 门二 seam_ruling）/872 观察清单（N3,第 2 现未再现）。

## 门一 Kimi 全文

```
## 裁决
PASS_WITH_WARNINGS

## 发现（逐条）
- [WARN] A1 组合页几何断言无红证且交集判据偏弱。证据：实现者声明红证仅「组合页块数 1→2 恒红；随动判据翻转……红」——span×canvas 交集与块不溢 canvas（±2px）两条几何断言全程无红证；且判据为 `overlapW/H toBeGreaterThan(0)`，span 大半出盒仍过门。修前形态（§2/§10「s1rot outside 5/8 span 落盒外」=整体出盒）能被零交集捕获，故对已知病理有鉴别力，但中间态失真无锁。建议：补变异红证（如断言域换未旋转盒/阈值翻 IoU）或将交集升级为包含度阈值。
- [WARN] 参考系改判后 page-box 错配缺陷处于「无锚无票」悬置态。证据：测试注释「本断言以渲染页真盒为判据域，页框错配另案申报主控立案」；ADR 边界⑦同文。改判本身合规（本票禁改 src+三处申报+首跑红证非暗改），但主控立案回执不在本包，下游若依赖 [data-page-box] 会踩同一错配。建议：收口前索取另案票号并登记 registry。
- [NIT] 随动红证=判据翻转而非修前代码还原，鉴别力靠旁证。证据：「随动判据翻转（≤1=修前 5Hz 方向）红」。本票范围禁改 src，无法真还原，取证「mutations 7→20/间隔 200→59.5ms」构成旁证链，可接受。
- [NIT] A2 末轮 settle 可能落 300ms 窗内虚增计数。证据：注释自申报「末轮 settle 全量若在窗内落地只增计不改判据」。修前 ≤1 的鉴别力不受影响，处置诚实。
- [NIT] F-ARCH4-M1  flake 未复现即按绿计。证据：「872 本轮绿=第 2 现未再现」。建议挂观察清单而非销案。

## 五维逐条立场
- 修复正确性：本票为测试/文档收口，T1/T9 修复本体在上游已双门在档；组合面 fixture（/Rotate 90×/CropBox [36 36 540 720]、基线避顶缘伪迹）构造合理，对准 §10 已知边界。
- 通道设计：INV-37 改写与 b2/c 声明一致（bands 迁 bandsFromItems、bandsForTextNodes 驻标注域），与 INV-40「节点口径带/bandsNearRects」在 AnnotationLayer 域的表述互斥无冲突，F-A5 接缝自纠成立。
- 测试纪律：块数与随动两红证在档+还原 diff 空，但几何断言红证缺席、交集判据宽松，力度留憾（见 WARN-1）。
- 决策门忠实度：超票面三项全申报（参考系改判/接缝修正/取证产物），ADR R3 终态数字标注单一来源 §10/§11/§12，弱化「所见≈所存」显式登记为显式代价——无私换口径迹象；唯另案立案缺回执。
- 红线：范围 4 文件（adr+invariants+spec+factory）零 src 触碰、断言可失败性部分实证、locks 277 声明在案，无越线。

## 总评
收口票整体诚实：票外发现（page-box 未旋转错配）走的是「申报+改判据域+另案」的明路而非暗改断言过门，INV/ADR 登记与实现互洽。两处 WARN（几何断言无红证+弱判据、悬置缺陷无票号）不伤本票成立，但建议主控在翻 done 前补立案回执，防止前置缺陷随主链迁移放大。
```

## 组合页小票关键段（W1 回炉后）

```ts
 - 1]!.y + byY[i - 1]!.h).toBeLessThanOrEqual(byY[i]!.y + 1e-9)
  }
  await app.close()
})

/**
 * [F-A6-d] 旋转×CropBox 组合页小票（b1 门一 N3 已知边界兑现——单测各半边
 * 独立锚[tests/unit/renderer/text-layer.test.tsx 旋转态/CropBox 态分列用例]，
 * 组合面=/Rotate 90 × /CropBox [36 36 540 720] 双病理叠加，e2e 收口锚定）：
 * - ①文本层对齐墨带：同页 textLayer span gBCR 与 canvas gBCR 包含度 ≥0.5
 *   （交集面积/span 面积——span 至少半身落渲染盒内；单 evaluate 同帧取两盒，
 *   [W1 回炉判据升级]——duckViewport rotation 通道+rawDims 真值化[TextLayer
 *   容器变换]+项几何主链[b2]的端到端对齐验证；修前形态=s1rot outside 5/8
 *   span 落盒外+s2crop 双向平移 36px，scripts/audits/f-a6-forensic-verdict.md §2/§10）；
 * - ②程序化划选（:790-800 配方）→ selection-toolbar 可见+selection-rects
 *   块数=行真值（单行 fixture=1 块）；
 * - ③关键断言：selection-rect 块 gBCR 落渲染页盒（canvas 盒=pixelBoxOf
 *   归一化同盒）内——旋转+非零原点双病理下不溢出（T1/T9+组合面的 D1 右溢
 *   主链 e2e 级闭合；2px 容差吞百分比渲染亚像素取整）。首跑红证申报：/Rotate≠0
 *   页 [data-page-box] 占位盒未随旋转交换宽高（PageColumn 段① page.view 口径）
 *   与 canvas 错配=票外既有布局缺陷（真实库全档 rotate=0 未显现），本断言以
 *   渲染页真盒为判据域，页框错配另案申报主控立案。
 */
test('F-A6-d 组合页（/Rotate 90×/CropBox 非零原点）：文本层对齐墨带+划选块=行真值且不溢页盒（T1/T9 组合面 e2e 闭合）', async () => {
  skipIfPending(F02_DEPS)
  const title = '智慧水务 e2e 组合页文献'
  const { app } = await seedAndLaunch(title, createRotatedCropPdf())
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_ROTATED_CROP_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // —— ① 文本层对齐墨带（同帧取两盒——包含度=交集面积/span 自身面积：span
  //    至少半身落 canvas 渲染盒内；对「整体出盒」（修前 outside 5/8 形态）与
  //    「中间态失真」（部分越缘）均有鉴别力。旋转页 span 为 90° 旋转盒，gBCR
  //    取渲染域轴对齐包围盒，面积比直接可算[W1 回炉判据升级 2026-09-04]）——
  const align = await win.evaluate(() => {
    const root = document.querySelector('[data-page-root]')
    const span = root?.querySelector('.textLayer span') ?? null
    const canvas = root?.querySelector('canvas[data-pdf-canvas]') ?? null
    if (span === null || canvas === null) return null
    const s = span.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    const ow = Math.min(s.right, c.right) - Math.max(s.left, c.left)
    const oh = Math.min(s.bottom, c.bottom) - Math.max(s.top, c.top)
    const inter = ow > 0 && oh > 0 ? ow * oh : 0
    const spanArea = s.width * s.height
    return { ratio: spanArea > 0 ? inter / spanArea : 0, overlapW: ow, overlapH: oh }
  })
  expect(align, '组合页前提成立（span 与 canvas 均在场）').not.toBeNull()
  expect(
    align!.ratio,
    `T1/T9 组合面：文本层 span 与 canvas 墨带包含度 ≥0.5（实测 ${align!.ratio.toFixed(3)}——span 至少半身落渲染盒内）`
  ).toBeGreaterThanOrEqual(0.5)

  // —— ② 程序化划选（单行全选——selectionchange settle 路径产 pending）——
  await win.evaluate(() => {
    const 
```

## INV-37 行（节选）

断言——属性级 k 无关） | 已锚定（单测级 F-LG13 本单；e2e 面随主控收口） |
| INV-37 | 划选视觉=自绘并集层（ADR-0019 R1/R3 修订，F-A4 2026-08-31；R3=F-A6 2026-09-04）：选区视觉反馈是**浏览器选区状态**的直接函数（evaluate 产链归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；**R3 调度双路**：拖选期=rAF 对齐快路径[selection-geometry createVisualScheduler——首事件即排 rAF leading ≤16ms+帧内合帧去重，取代 200ms 节流 5Hz 步进]，settle[mouseup 即时+防抖 200ms]=全量单一权威；**拖选期语义弱化=显式登记（用户裁决 2026-09-03）：所见≈所存**——快路径同族项几何管线的瞬态近似（四道收敛守卫+G2 同门；INV-58 锁同几何族），**松手/保存时刻严格恢复所见即所存**=settle 全量单一权威）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→rAF 快路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒；z=pag

## INV-58 行（节选）

2026-09-03）：所见≈所存**——快路径同族项几何管线的瞬态近似（四道收敛守卫+G2 同门；INV-58 锁同几何族），**松手/保存时刻严格恢复所见即所存**=settle 全量单一权威）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→rAF 快路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒；z=page-layer-z.selectionPaint=3 页内最上——色块垫底 canvas 透明底墨带之下，ADR-0019 R2；[F-A5] 块垂直=行簇字形带+水平界=端点夹取+缺省行盒原样回退——**[F-A6] selection 产链 bands 已迁项几何派生（bandsFromItems，INV-58 同源禁令）；bandsForTextNodes 节点口径驻标注域（AnnotationLayer——票外适用域）**；[F
