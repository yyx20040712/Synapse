# 票 C-2 实现报告（弱锚时序补强搭车票——AUDIT-C 首波）

> 实现者=票面指定实现者子代理（环境限制统一档）；落盘=2026-09-02。
> 性质=补锚票：零行为实现码改动（三份 src 变异均 cp 备份还原、diff 终态空）。
> 开工技能清点：systematic-debugging/TDD/verification-before-completion/
> e2e-testing-patterns/javascript-testing-patterns=用；browser-use/webapp-testing=
> 不用（全程 Playwright _electron 无头脚本，无内置浏览器）；subagent-driven-
> development=不用（本代理即实现者，无再派发面）。

## ① INV-42 N6：选择模式点击 rect 零副作用——真机直测

**产物**：`scripts/audits/f-a3-n6-verify.mjs`（新建，crib f-a3-verify.mjs 运行模式：
真实库副本 freshUserData+Electron launch+真鼠标）+ `scripts/audits/f-a3-out/f-a3-n6-verify.json`
（+尾态截图 f-a3-n6-final-state.png）。

**三场景结果（json 断言摘要，脚本实测）**：

| 场景 | 结果 | 关键数据 |
| --- | --- | --- |
| B-n6 主断言（选择模式真鼠标单击 rect 中心，move→down→60ms→up） | PASS | ariaPressedOk=true；9 块 rect computed pointerEvents 全 `none`（styleNone=true）；hitTest=SPAN·inTextLayer·isRect=false（穿透）；menuAppeared=false；editorAppeared=false；selectionCollapsed=true/selLen=0；唯一 annotationId 计数 1→1 不变；checks a/b/c/d/e 全 true |
| AI 层同测（条件执行） | aiRectsPresent=false（如实记录，不算失败） | 真实库副本无 `[data-testid="ai-note-rect"]` |
| C 对照（切回常规同点位单击） | PASS | ariaPressedOk=false；rect computed pointerEvents=`auto`；annotation-menu 出现（menuShown=true）——非恒真证明成立 |

探针退出码：PASS=exit 0；任一断言失败=exit 2（实测见变异行）；异常=exit 1。
等待纪律：全条件轮询（waitForFunction/waitForSelector/locator waitFor）；60ms 按压驻留与
dragSelect 16ms 插值步进=票面处方的手势时序（evaluate setTimeout 实现，非 waitForTimeout API）。

**变异红证（cp 备份法，备份=scripts/audits/f-n6-mut-backup-AnnotationLayer.tsx）**：

| 步骤 | 结果 |
| --- | --- |
| 变异：AnnotationLayer.tsx 选择模式分支 `pointerEvents: 'none' } : rectStyle` → `'auto'`（needle 唯一性 node 校验） | — |
| **重要**：必须先 `npm run build` 重打包（探针跑 out/ 构建产物，改 src 不重建不生效——首跑假绿实证） | — |
| 重跑探针 | **B-n6 必红达成：exit=2**（styleNone=false：computed=`["auto"]`；e_penetrated=false：hitTest=DIV·testid=annotation-rect；menuAppeared **仍 false**） |
| cp 还原→diff 确认空→重建→重跑 | DIFF_EMPTY 确认；重跑 overall=PASS exit=0 |

**R5 如实报告——票面括注「（菜单将出现）」的预期被证伪**：AnnotationLayer onClick 内
`if (selectionMode) return` 早退守卫（注释「守卫兜程序化派发」）对真鼠标同样生效——
即使 pointer-events 变异为 'auto'，click 事件到达 rect 后仍被守卫拦截，菜单不出现。
a/b/c/d 四件零副作用在变异下保持绿；变异红证由 e（穿透证明）+样式锚（computed
pointer-events===none）承担。这正是把 e 与样式锚计入探针 PASS 面的自裁依据（见自裁清单 1）。

## ② F-ARCH4-M1：root.contains 真浏览器可达性——e2e 反向选区用例（受锁面）

**产物**：`tests/e2e/reader-text.spec.ts` 末尾追加 test「F-ARCH4-M1 跨根选区防线真浏览器
定性：跨页真鼠标=toast 拒绝；同页跨 textLayer 边界=静默不建锚；页内选区=工具条
（三向对照）」+ 内联 fixture 组装器 `createCrossPagePdf()`（依赖 F02_DEPS，配方
seedAndLaunch(title, bytes)）。

- fixture：页1 双行（y=100 P1A=E1/E0 素材 / y=72 P1B=E3 起点）+页2 顶行（y=720=E3 终点）——
  两交界行几何距离 ~220px，滚到页盒交界即同视口（pdf-factory 全高页相邻行距 ~1056px
  做不到；pdf-factory 受锁不可改，组装器内联同款、UTF-8 字节口径一致，正文纯 ASCII）。
- E3：按页盒几何（全长真实占位）滚到交界→条件轮询两交界 span 同视口（P2 懒渲染入窗）→
  真鼠标 12 步插值拖选（crib f-a3 dragSelect 手势时序）→ toast「选区跨页，不支持创建标注」
  可见 + 无 selection-toolbar + **isCollapsed=false（真浏览器不塌缩跨界选区——定性锚）**→
  toast 退场条件轮询（info 3500ms 自动消失，防 E1 的无 toast 断言被残留误红）。
- E1：程序化 `setBaseAndExtent(canvas, 0, textNode, 3)`（同页根过 SelectionLayer 检查、
  range 边界跨 textLayer）→ 断言 isCollapsed=false + 防抖 settled 观察窗（expect.poll
  时间下限 ≥600ms——票面处方原文）+ 无 toast 且无工具条（静默不建锚）。
- E0：程序化 `setBaseAndExtent(textA, 0, textB, 4)`（同 textLayer 两文本节点）→
  selection-toolbar 出现（轮询）——证明 E1 静默是防线拒绝而非夹具失灵。
- 每步选区操作后 removeAllRanges 复位；用例头注落定性结论。

**E2 变异矩阵（cp 备份法；单跑本用例 `npx playwright test -g "F-ARCH4-M1"`）**：

| 变异 | 单点摘除目标 | 结果 | 归属结论 |
| --- | --- | --- | --- |
| A | SelectionLayer.tsx `if (anchorRoot !== focusRoot)` → `if (false)` | **E3 必红（达成）**：exit=1，:886 toast toBeVisible 失败（无 toast） | 跨页拒绝=SelectionLayer 边界检查独担；摘除即 INV-02 静默（跨页选区随后被 root.contains 静默吞掉，无声无 UI） |
| B | anchor-serialize.ts `if (!root.contains(start/end))` → `if (false)` | **E1 红（如实记录）**：exit=1，:924 selection-toolbar toHaveCount(0) 失败（工具条出现） | root.contains=同页跨 textLayer 的**决定性防线**，非仅纵深防御层：canvas 在文档序先于 textLayer，probeTextLength 的 leadLen=0 直通、不拦截——摘除 root.contains 即建锚出工具条 |

两变异后均 cp 还原、diff 确认空（MUT_A_RESTORE_DIFF_EMPTY / MUT_B_RESTORE_DIFF_EMPTY /
ALL_THREE_RESTORED_DIFF_EMPTY——与 ① 的备份三份全对账）。注意：变异须 `npm run build`
重打包后才对 e2e 生效（同 ① 的构建产物教训）。

**受锁 e2e 改动后全量**：`npx playwright test` 首跑 **29 passed / 1 failed**（失败=既有用例
「划选高亮后重开仍在原位；批注编辑与删除可用」:163——:223 y 轴重锚容差断言
toBeLessThanOrEqual(2) 实收 3.4499…；与本票 diff 无因果：新用例隔离 userData、src 变异已
还原、bundle 由同源重建。非确定失败第 1 次＜立案线 2 次，复跑单用例绿 2.9s——失败指纹
在档：同值断言/单现/重跑绿）；重跑全量 **30 passed (1.5m)，exit=0**。

## ③ f-l4-verify.mjs 固定等待轮询化（受锁面）

**验收判据实测**：改造前 `grep -c waitForTimeout` = **15**（行号 114/116/195/197/199/230/246/
251/284/286/301/305/320/324/331——与票面清单一致）；改造后 = **0**（连注释内的字面量也已
规避）。**重跑探针 13/13 PASS 保持**（F-L4 VERIFY: PASS，exit=0）；产物 json 语义 diff：
13 项断言结果序列全同（全 PASS）、nodeCount 4=4、diagnostic.cssZoomTriggersRO true=true、
wrapper 采样一致；仅原始几何浮点随窗口恢复取整微漂（真实库探针的环境噪声，非语义变化）。

**15 处替换对照表（原行号→机制+条件+超时+理由）**：

| 原行 | 原固定值 | 新条件轮询 | 超时 | 理由 |
| --- | --- | --- | --- | --- |
| 114 | 800 | pollUntil(document.readyState==='complete') | 5s | 启动 settle 的正向条件（React 渲染已由脉络按钮 waitFor 保证） |
| 116 | 1500 | lineageReady()：节点>0+transform 非空+**连续两次采样同值** | 15s | 挂载+取数+fit 完成的稳定判据（见下「翻车与修正」） |
| 195 | 600 | locator waitFor「中 110%」可见 | 8s | 设置页渲染完成=档位钮可见 |
| 197 | 900 | pollUntil(--ui-scale==='1.1') | 8s | settings 真实通道终点观测点（save→settings.json→store→CSS 变量落地） |
| 199 | 1200 | lineageReady() | 15s | 重挂载取数+fit effect+RO observe 初始通知 |
| 230 | 900 | pollUntil(transform 串!==t2 值) | 8s | RO refit 生效正向条件（摘 RO 即超时，红由 A-resize 断言承担不崩脚本） |
| 246 | 400 | pollUntil(transform 串!==t3 值) | 8s | wheel 视口更新落地 |
| 251 | 900 | pollUntil(svg clientWidth!==wheel 后值)+twoFrames() | 8s | 负向等待条件化：布局变化落地（正向）+双 rAF 给 RO（帧前派发）与 React 重渲染执行机会，此后「无变化」采样才有效 |
| 284 | 500 | pollUntil([data-viewport]===null) | 8s | 脉络卸载（页面互斥切换完成）——wrapper 就位窗口 |
| 286 | 1200 | pollUntil(__roRec.instances>0)+lineageReady() | 8s/15s | wrapper 实例就位（mount 即注册）+fit 稳定 |
| 301 | 900 | pollUntil(svg clientWidth!==diagBefore)+twoFrames()（窗口上限 900ms 保持） | 900ms | 诊断观察窗：变化落地即提前采样；不变则窗口耗尽后采样（信息项 cssZoomTriggersRO=false 语义保持） |
| 305 | 600 | pollUntil(--ui-scale===cssOriginal) | 8s | 恢复属性回值（票面点名处） |
| 320 | 900 | pollUntil(__roRec.callbackCount>c0) | 8s | RO 派发计数增加=resize 生效正向条件 |
| 324 | 700 | locator waitFor「中 110%」可见 | 8s | 设置页渲染=脉络 unmount（disconnect 采样前提） |
| 331 | 900 | pollUntil(documentElement.clientHeight!==vhPre)+twoFrames() | 8s | 负向等待条件化；此处脉络已卸载 svg 不在场，改用渲染视口高作布局观测点（首版误用 svg clientHeight——必然超时的实现 bug，自查修正） |

辅助机制：`pollUntil`=waitForFunction 包装（120ms 采样，超时返回 false 不抛错——红交给
后续 check 断言，保持探针 FAIL 语义）；`twoFrames`=双 requestAnimationFrame（帧事件驱动，
非固定 sleep）；dragSelect/手势类无（本票 ③ 无 dragSelect）。

**翻车与修正（如实记录）**：首版 lineageReady 仅判「transform 非空+节点>0」——lineage-viewport
的 useState 初值即 identity `translate(0, 0) scale(1)`，异步取数→nodes 提交→fit effect 二次
提交之间存在中间帧窗口，采样落在窗内即放行：首跑 **11/13（A/transform-updated+
A/transform-equals-fitviewport 两红，t1/t2 均采到 identity）**。加「连续两次采样同值」稳定
判据（每调用重置 window.__fitProbe 防跨挂载串扰）后 **13/13 全过**——该竞态本身即
「固定等待侥幸绿」的实证，反向支撑轮询化必须配稳定判据。

**INV-44 备案③销项建议**（实现者不改 invariants.md，主控收口定夺措辞）：f-l4-verify.mjs
15 处固定等待已全量条件轮询化（grep=0+13/13 保持）；建议备案③措辞更新为「已销项
（2026-09-02 票 C-2③）」，并可补记方法论注记：「就绪轮询须区分*条件成立*与*状态稳定*
——初始值与目标值可区分度不足时（如 transform 初值 identity），须用连续采样一致判据，
否则轮询反引入固定等待不曾有的中间帧竞态（首跑两红实证）」。

## 自裁决定清单（超票面决定，报主控知悉）

1. **①探针把 e（穿透证明）与样式锚（选择模式全 rect computed pointer-events==='none'）
   计入 PASS 面**：票面标 e 为「诊断项」，但 AnnotationLayer onClick 的 selectionMode 早退
   守卫使变异下菜单不可能出现（票面括注「菜单将出现」预期证伪），e+样式锚是变异红证的
   唯一可用信号位。无任何断言放宽，只有加强。
2. **①③变异前须 npm run build 重打包**：探针/e2e 跑 out/ 构建产物，票面未写此步——首跑
   假绿实证后补入流程（还原后同样重建，三份 src diff 终态空）。
3. **②fixture 内联 createCrossPagePdf**：pdf-factory 受锁不可改，全高页交界行距 >视口高，
   收窄交界几何是「两交界行同视口」的唯一无缩放实现；组装器 crib 同款字节口径。
4. **②E1 settled 观察窗=expect.poll 时间下限 ≥600ms**：票面处方原文的实现形式
   （「条件轮询 ≥600ms 等 SELECTION_DEBOUNCE_MS=200 settled，禁固定 waitForTimeout」）。
5. **③负向断言条件化等价物=正向轮询布局落地+twoFrames 双 rAF**：纯负向事件无法条件
   轮询，帧事件驱动的「RO 已获派发机会」是可条件化的最强前提。
6. **③lineageReady 稳定判据**：首跑竞态实锤后自裁加入（见③翻车段）。
7. **①②拖选/按压的 16ms/60ms 步进**：票面处方/例外条款的手势时序，经 evaluate
   setTimeout 实现而非 waitForTimeout API。

## verify（全量真退出码）

`npm run verify` **exit=1**，唯一红=locks:check（quality+tickets 已过——&& 链推进到 locks
即证）；其余链组件单独实测全绿：**lint=0 / typecheck=0 / test=0（vitest 126 files·1081
tests 全过）/ build=0**；e2e 全量 30/30（见②）。locks 关卡 4 项违例归因：
- `受锁文件被修改：scripts/audits/f-l4-verify.mjs`＝③本票改动（票面架构层明示重锁+manifest
  由主控收口办理，实现者禁跑 locks:*/git——预期中间态）；
- `受锁文件被修改：tests/e2e/reader-text.spec.ts`＝②本票改动（同上）；
- `新增受锁文件未登记：scripts/audits/f-a3-n6-verify.mjs`＝①本票新探针（同上，待主控
  locks:apply 登记）；
- `新增受锁文件未登记：scripts/audits/f-r3-probe.mjs`＝**非本票产物**（mtime 09:38 早于
  本票任何落盘，R3 族并行工单残留——报主控归因处置）。

verify 尾行（c2-verify-full.log，完整 4 行违例——首读 tail -3 截断致漏一行，已全量复读）：
`locks 检查未通过：…（4 项如上）`。

## 成本与产物清单

- token 估计（GLM 计费口径粗估）：输入 ~150k / 输出 ~30k；时长 ~70min（含两轮全量 e2e
  1.5m×2、verify 链 8m、探针×5 跑、构建×6）。
- 新建：scripts/audits/f-a3-n6-verify.mjs、f-a3-out/f-a3-n6-verify.json、f-a3-out/
  f-a3-n6-final-state.png、三份变异备份（f-n6-mut-backup-AnnotationLayer.tsx /
  f-arch4-mut-backup-SelectionLayer.tsx / f-arch4-mut-backup-anchor-serialize.ts——还原
  对账凭证，留档）、c2-verify-full.log、c2-verify-rest.log、本报告。
- 修改：scripts/audits/f-l4-verify.mjs（③）、tests/e2e/reader-text.spec.ts（②）。
- src/** 零净改动（三份变异备份 diff 全空）；docs/invariants.md 未触碰；未跑任何 git/locks 命令；
  未新增依赖、未改 package.json。
