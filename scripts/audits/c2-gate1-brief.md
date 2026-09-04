# C-2 弱锚时序补强票——门一审简报（Kimi 链必保位：受锁面改动）

你是门一对抗审查员。审查对象=票 C-2（补锚票：只补测试/探针锚，不改行为实现）
的实现产物。三子项：
① 新探针 f-a3-n6-verify.mjs（INV-42 N6 选择模式点击 rect 零副作用真机直测）
② tests/e2e/reader-text.spec.ts 追加 e2e 用例（F-ARCH4-M1 root.contains 真浏览器可达性——三向对照+变异矩阵）
③ f-l4-verify.mjs 固定 waitForTimeout 轮询化（15 处→grep 0，INV-44 备案③）

审查要点：实现与票面偏差/断言恒真风险/变异红证有效性/受锁面改动纪律（e2e
改动后全量）/探针先红后绿与还原 diff 空/自裁申报合理性。特别两处：
A. ①的变异红证：票面预判「变异后菜单将出现」被实测证伪（onClick 守卫
   `if(selectionMode) return` 对真鼠标同样拦截）——实现者改以 styleNone+
   e_penetrated 两断言承载红证。请裁：这是否构成有效变异红证（断言级归属）；
   顺带裁「票面预判证伪」的处置是否妥当（INV-42 册面「onClick 守卫兜程序
   派发」的表述是否需要随案修正——守卫实际兜一切点击）。
B. ②变异矩阵 B（摘 root.contains→E1 红=工具条出现）得出「root.contains=
   同页跨 textLayer 的决定性防线」——请核 E1 场景构造（setBaseAndExtent
   (canvas,0,textNode,3)）是否真到达该防线（而非其他路径副作用），与
   「E0 对照/E3 真鼠标跨页」三向逻辑是否闭合。

输出：B/W/N 三级+每条证据（文件:行号或代码摘录）；总裁决「放行/有条件放行/
回炉」。用中文。不确定的明说不确定。

━━━ 票面全文 ━━━

# 票 C-2：弱锚时序补强搭车票（AUDIT-C 首波——同族搭车一次派发）

> 派发=主控（GLM5.3）；实现者子代理（环境限制统一档，欠账在册）；门一=Kimi 链
> 必保（受锁面）；门二=deepseek 亲跑。来源票面=auditc-ticket-kimi.md §4 C-2+
> auditc-final-ruling.md §2 修订（N-2 同族搭车/C-2③ 全部固定等待轮询化/
> N-3 顺带核 INV-44 备案③）。
> **性质=补锚票：只补测试/探针锚点，不改任何行为实现码**（R5 纪律：直测若
> 推翻既有推断→停手如实报告，不修）。

## 行为层（三个子项的预期行为——全部是**锁定既有行为**，非新行为）

### ① INV-42 N6：选择模式点击 rect 零副作用——真机直测（当前=三层推断）

INV-42 在档语义（docs/invariants.md）：选择模式下用户标注层与 AI 标注层一切
渲染 rect `pointer-events:none`——点击穿透零副作用；常规模式点击标注=出
菜单。弱锚=真机层「选择模式点击 rect 零副作用」未直测。

**新探针** `scripts/audits/f-a3-n6-verify.mjs`（crib 同目录 f-a3-verify.mjs
的运行模式：真实库副本 freshUserData+Electron launch+真鼠标），场景：

1. 前置：打开一篇有文本的文献（f-a3 同法）→ 真鼠标拖选干净面→点「高亮」
   制造一条既有标注（f-a3 场景前置同款，程序化兜底亦可）。
2. **B-n6 主断言**：点「选择模式」按钮（`button:has-text("选择模式")`，
   aria-pressed=true 前提锚）→ 在视口内可见的 `[data-testid="annotation-rect"]`
   （宽>20 整块在视口内，f-a3 qA 采样法）中心**真鼠标单击**（move→down→
   60ms→up，无拖移）→ 断言四件零副作用：
   - a. `[data-testid="annotation-menu"]` 不出现
   - b. `[data-testid="annotation-editor"]` 不出现
   - c. `getSelection()` 无选区（isCollapsed——点击不得成选）
   - d. 唯一 annotationId 计数不变（`[data-testid="annotation-rect"]` 按
     `data-annotation-id` 去重计数前后相等）
   - e. 诊断项：click 点 `document.elementFromPoint` 非 rect 元素（穿透证明）
3. **对照（非恒真证明）**：切回常规模式（aria-pressed=false 前提锚）→ 同点位
   真鼠标单击 → `[data-testid="annotation-menu"]` **出现**——证明点击本身
   有效、零副作用是模式导致而非点击落空。
4. **AI 层同测（如实条件执行）**：若真实库副本中存在 `[data-testid="ai-note-rect"]`
   则同法直测并断言；不存在则 json 里如实记 `aiRectsPresent:false`（不算失败）。
5. 产物：`scripts/audits/f-a3-out/f-a3-n6-verify.json`（三场景数据+断言结果）；
   全过打 PASS，任一断言失败 exit=2。
6. 变异红证（证明探针非恒真）：cp 备份
   `src/renderer/features/reader/AnnotationLayer.tsx`（备份到
   scripts/audits/f-n6-mut-backup-AnnotationLayer.tsx，**禁 git checkout**）→
   临时把选择模式分支的 pointer-events 值改为 'auto'（定位：grep
   pointerEvents/selectionMode 于该文件）→ 重跑探针 → **B-n6 必须红**
   （菜单将出现）→ cp 还原 → diff 确认空 → 重跑回绿。变异只许经备份还原法。

### ② F-ARCH4-M1：root.contains 真浏览器可达性——e2e 反向选区用例（受锁面）

在档背景（docs/audits/audit0-findings.md F-ARCH4 条 + anchor-serialize.ts
头注）：`selectionToAnchor`（src/renderer/features/reader/anchor-serialize.ts:121，
防线行 :129 `root.contains(range.startContainer/endContainer)`）的跨 root
防线在 jsdom 单测层不可达（反向 range 被 jsdom 规范化为 collapsed，由
isCollapsed 先兜）；真浏览器按规范 swap 双边界——**可达性未锚**。SelectionLayer
（SelectionLayer.tsx:107-116）在 selectionToAnchor **之前**有自己的
`closestPageRoot(anchorNode)!==closestPageRoot(focusNode)` 边界检查（跨页/
跨出页盒→toast `选区跨页，不支持创建标注`，toast DOM=右上角 span 文本）。

**新 e2e 用例**（加到 `tests/e2e/reader-text.spec.ts` 末尾，沿用文件内既有
seedAndLaunch/launch/seedPaperRow 配方与既有用例风格）：

test('F-ARCH4-M1 跨根选区防线真浏览器定性：跨页真鼠标=toast 拒绝；同页跨
textLayer 边界=静默不建锚；页内选区=工具条（三向对照）')

1. **E3 真鼠标跨页**（真用户路径+INV-02 锁）：seed 文献打开（连续滚动多页可
   见）→ 滚到两页交界（页1 底部文本 span+页2 顶部文本 span 同视口）→ 真鼠标
   从页1 span 拖到页2 span（move→down→插值 move→up）→ 断言 toast 文本
   `选区跨页，不支持创建标注` 可见 + 无 `[data-testid="selection-toolbar"]`。
   （拖选插值手法 crib f-a3-verify.mjs dragSelect。）
2. **E1 程序化同页跨 textLayer 边界**（真 Chromium 语义实验——setBaseAndExtent
   反向/跨界构造，jsdom 做不到的形态）：`win.evaluate` 里对**同一**可见页的
   canvas 元素（`[data-page-root] canvas`）设 anchor（offset 0）、textLayer
   文本节点设 focus（offset>0）：`sel.setBaseAndExtent(canvasEl,0,textNode,k)`
   ——closestPageRoot 两者同页根（过 SelectionLayer 检查）但 range 边界跨
   textLayer → selectionToAnchor 内被拒 → 断言：**无 toast 且无工具条**
   （条件轮询 ≥600ms 等 SELECTION_DEBOUNCE_MS=200 防抖 settled，禁固定
   waitForTimeout）。
3. **E0 对照页内有效选区**：程序化 `sel.setBaseAndExtent(textA,k1,textB,k2)`
   （同 textLayer 两文本节点）→ 断言 `[data-testid="selection-toolbar"]`
   **出现**（轮询）——证明 E1 的静默是防线拒绝而非夹具失灵。
4. 每步选区操作后 `sel.removeAllRanges()` 复位。
5. **定性结论落测试注释**（E1/E2/E3 结果决定，写进用例头注）：
   - 真浏览器不塌缩跨界选区（isCollapsed 不先兜——jsdom 才塌缩）✓实证
   - 拒绝由谁承担：见 E2 变异矩阵。

**E2 变异矩阵（断言级归属——cp 备份法，禁 git checkout）**，对
`SelectionLayer.tsx`（anchorRoot!==focusRoot 检查）与
`anchor-serialize.ts`（root.contains 检查）各做一次单点摘除变异：
- 变异 A（摘 SelectionLayer 边界检查）→ E3 必红（无 toast）；
- 变异 B（摘 root.contains）→ E1 红与否**如实记录**：红=root.contains 决定
  性可达；不红=更深的 probeTextLength 守卫先拒（root.contains=纵深防御层，
  非唯一防线）——两种结果都是合法机器结论，写入用例头注定性注记+实现报告。
- 每次变异：cp 备份→变异→单跑本用例→cp 还原→diff 空。矩阵结果表入实现报告。

### ③ f-l4-verify.mjs 固定 waitForTimeout 轮询化（受锁面；最低优先——预算触顶先裁）

INV-44 备案③（docs/invariants.md INV-44 锚定栏）：「探针固定 waitForTimeout
脆性（CI 慢机误报风险）」。实测 `scripts/audits/f-l4-verify.mjs` 固定等待
**15 处**（grep 实测行号：114/116/195/197/199/230/246/251/284/286/301/305/
320/324/331——终裁书作废的「6 处」口径已修正）。

- 逐处替换为**条件轮询**（`await win.waitForFunction(条件, null, {timeout,
  polling})` 或 locator waitFor/expect 轮询），条件按各等待点的语义自裁并
  在实现报告逐处列表（条件+超时值+理由）。例：197 行等 settings save 落地
  →轮询按钮 aria-pressed/档位 class 生效；199 行等重挂载取数+fit →轮询
  DUMP 可取且 nodeCount>0；探针尾部恢复 --ui-scale 的 305 行→轮询属性回值。
- **验收判据**：`grep -c "waitForTimeout" scripts/audits/f-l4-verify.mjs` = 0
  （dragSelect 插值步进 16ms 类微延迟若属动作序列而非等待语义，可改
  waitForTimeout→for 循环 sleep 同值保留——在报告说明）+ 重跑探针 13/13
  PASS 全保持（产物 json diff 语义不变）。
- 顺带核 INV-44 备案③：轮询化完成后在实现报告写「备案③销项建议」一段
  （主控收口时定夺 INV 册措辞更新，实现者不改 invariants.md）。

## 接口层

- 新文件：`scripts/audits/f-a3-n6-verify.mjs`（探针①）。
- 修改：`tests/e2e/reader-text.spec.ts`（追加一个 test，②）。
- 修改：`scripts/audits/f-l4-verify.mjs`（轮询化，③）。
- 不改：任何 `src/**` 实现码（变异是临时备份还原，diff 终态空）；
  `docs/invariants.md`；`scripts/audits/f-a3-verify.mjs`（① crib 只读参照）。

## 架构层

- 两处修改文件在 locks 受锁集合内——主控已解锁，实现者直接改；重锁+manifest
  由主控收口办理（实现者禁跑 locks:*/git 任何命令）。
- e2e 遵循 tests/e2e 既有风格（真实文本断言、launch/seed 配方复用、无
  固定 sleep——新用例内一律条件轮询）。
- 探针 crib 声明写在文件头注（f-a3-verify.mjs 同款头注风格）。

## 生命周期层（TDD/验证纪律）

- ②新用例：先写用例→跑（对既有行为应绿）→E2 变异矩阵逐变异红证→还原
  diff 空。受锁 e2e 改动后**必须全量 e2e**（`npm run test:e2e`，esbuild
  不查类型，类型面交给 typecheck——本票不改 ts 但纪律不变）。
- ①探针：PASS 三场景+变异红证+还原 diff 空。
- ③：grep 判据=0+重跑 13/13。
- 全部完成跑 `npm run verify` 全绿（真退出码），报告 verify 尾行输出。
- **环境陷阱（必守）**：本机 PATH 前导 /d/nodejs 是 node v25（ABI 不符）——
  每条命令前 `export PATH=/d/nodejs24:$PATH`；探针/e2e（Electron 面）前
  确认 `node scripts/sqlite-abi.mjs use electron`；裸跑 vitest 前要
  `use node`（一律走 npm run test 兜底）。
- 卡住/推断不成立（如 E1 出工具条、变异不红、探针前置失败）→**停手如实
  报告**，不放宽断言不改实现（R5）。

## 文化层

- 实现报告：三子项逐项结果（含 E2 矩阵表+③的 15 处替换表+①的 json 摘要）
  +自裁决定清单+token/时长；落 `scripts/audits/c2-impl.report.md`
  （主控代存亦可，报告正文随消息返回）。
- 计数类数字（grep 处数/断言数）落笔前脚本实测。
- 不新增依赖；不改 package.json。

━━━ 实现报告全文（scripts/audits/c2-impl.report.md）━━━
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

━━━ 产物 ①：新探针 f-a3-n6-verify.mjs 全文 ━━━
/**
 * F-A3 N6 真机取证——INV-42 选择模式点击 rect 零副作用（票 C-2①；crib
 * scripts/audits/f-a3-verify.mjs 运行模式：真实库副本 freshUserData+Electron
 * launch+真鼠标 CDP）。
 * 场景：
 * - 前置：打开有文本文献（f-a3 同法）→ 干净面真鼠标拖选→「高亮」制造一条
 *   既有标注（不出条则程序化兜底——f-a3 场景前置同款）。
 * - B-n6 主断言：点「选择模式」（aria-pressed=true 前提锚）→ 视口内可见
 *   annotation-rect（宽>20 整块在视口内——f-a3 qA 采样法）中心真鼠标单击
 *   （move→down→60ms→up 无拖移，票面处方）→ 断言零副作用：
 *   a. annotation-menu 不出现；b. annotation-editor 不出现；
 *   c. getSelection() isCollapsed（点击不得成选）；
 *   d. 唯一 annotationId 计数（data-annotation-id 去重）前后不变；
 *   e. 穿透证明：click 点 elementFromPoint 非 rect 元素。
 *   另含样式前提锚：选择模式下全 rect 计算样式 pointer-events:none（INV-42
 *   在档语义的声明面）。实现者自裁（票面括注「菜单将出现」的预期修正）：
 *   AnnotationLayer onClick 内有 `if (selectionMode) return` 早退守卫
 *   （守卫兜程序化派发的同时也拦真鼠标），变异 pointer-events→'auto' 时
 *   a/b 仍绿——变异红证由 e+样式锚承担（详见 scripts/audits/c2-impl.report.md）。
 * - 对照（非恒真证明）：切回常规（aria-pressed=false 前提锚）→ 同点位真鼠标
 *   单击 → annotation-menu 出现——证明点击本身有效、零副作用是模式导致。
 * - AI 层同测（如实条件执行）：真实库副本存在 ai-note-rect 则同法直测；
 *   不存在则记 aiRectsPresent:false（不算失败）。
 * 等待纪律（票 C-2 关键纪律 3）：状态等待一律条件轮询（waitForFunction/
 * waitForSelector/locator waitFor），禁固定 waitForTimeout；60ms 按压驻留与
 * dragSelect 16ms 插值步进=手势时序（票面处方的动作序列，非状态等待）。
 * 产物：scripts/audits/f-a3-out/f-a3-n6-verify.json；全过打 PASS，任一断言
 * 失败 exit=2；异常 exit=1。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a3-out')
const R = { meta: { script: 'f-a3-n6-verify.mjs', date: new Date().toISOString() }, scenarios: {} }
const log = (...a) => console.log(`[f-a3-n6 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 手势驻留（票面处方 60ms 按压——动作序列时序，非状态等待） */
const hold = (win, ms) => win.evaluate((m) => new Promise((r) => setTimeout(r, m)), ms)

/** 真鼠标单击：move→down→60ms→up，无拖移（票面处方） */
async function realClick(win, x, y) {
  await win.mouse.move(x, y)
  await win.mouse.down()
  await hold(win, 60)
  await win.mouse.up()
}

/** 真鼠标拖选（12 步插值——crib f-a3 dragSelect；16ms 步进=动作序列时序） */
async function dragSelect(win, x1, y1, x2, y2) {
  await win.mouse.move(x1, y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await hold(win, 16)
    await win.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12)
  }
  await win.mouse.up()
}

/** 条件轮询：选择器在场（attached）——出现即真，窗口耗尽即假（负向断言的
 *  有界观察窗：出现短路、缺席等满窗——非固定 sleep） */
async function pollAttached(win, selector, timeout) {
  try {
    await win.waitForSelector(selector, { timeout, state: 'attached' })
    return true
  } catch {
    return false
  }
}

/** 条件轮询：「选择模式」按钮 aria-pressed 到达期望值 */
async function pollPressed(win, value, timeout = 5000) {
  try {
    await win.waitForFunction(
      (v) =>
        [...document.querySelectorAll('button')]
          .find((b) => (b.textContent || '').includes('选择模式'))
          ?.getAttribute('aria-pressed') === v,
      value,
      { timeout, polling: 100 }
    )
    return true
  } catch {
    return false
  }
}

/** 唯一 annotationId 计数（一条标注跨多行渲染多块——按 data-annotation-id 去重） */
const uniqueAnnotationCount = (win) =>
  win.evaluate(`new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.getAttribute('data-annotation-id'))).size`)

/** click 点命中诊断（穿透证明素材）：elementFromPoint + 是否标注 rect */
const hitTestAt = (win, x, y) =>
  win.evaluate(`(() => {
    const el = document.elementFromPoint(${x}, ${y})
    if (el === null) return null
    const tid = el.getAttribute('data-testid')
    return { tag: el.tagName, testid: tid, cls: typeof el.className === 'string' ? el.className : '', inTextLayer: !!el.closest('.textLayer'), isRect: tid === 'annotation-rect' || tid === 'ai-note-rect' }
  })()`)

/** 全 rect 计算样式 pointer-events 采样（INV-42 声明面） */
const rectPointerEvents = (win, selector) =>
  win.evaluate(`(() => {
    const els = [...document.querySelectorAll('${selector}')]
    return { total: els.length, computed: [...new Set(els.map(e => getComputedStyle(e).pointerEvents))] }
  })()`)

/** 零副作用五件套（a-e）+样式锚外的采集体：给定 selector 的 rect 中心真鼠标单击 */
async function clickZeroSideEffects(win, pt) {
  const hit = await hitTestAt(win, pt.x, pt.y)
  const idBefore = await uniqueAnnotationCount(win)
  await realClick(win, pt.x, pt.y)
  const menuAppeared = await pollAttached(win, '[data-testid="annotation-menu"]', 1200)
  const editorAppeared = await pollAttached(win, '[data-testid="annotation-editor"]', 1200)
  const sel = await win.evaluate(`(() => { const s = getSelection(); return { collapsed: s.isCollapsed, selLen: s && !s.isCollapsed ? s.toString().length : 0 } })()`)
  const idAfter = await uniqueAnnotationCount(win)
  return {
    hitTest: hit,
    menuAppeared,
    editorAppeared,
    selectionCollapsed: sel.collapsed,
    selLen: sel.selLen,
    idCount: { before: idBefore, after: idAfter },
    checks: {
      a_noMenu: !menuAppeared,
      b_noEditor: !editorAppeared,
      c_collapsed: sel.collapsed === true,
      d_idCountUnchanged: idAfter === idBefore,
      e_penetrated: hit !== null && hit.isRect === false
    }
  }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-a3-n6-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  if (!(await win.evaluate(() => !!document.querySelector('[data-page-root]')))) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.locator('.lib-card').first().dblclick()
  }
  // 条件轮询：文本层 span 就绪且可量测（≥4 个宽>5 的非空 span——替代 crib 固定 800）
  await win.waitForFunction(
    () => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
        (s) => s.firstChild !== null && s.firstChild.nodeType === 3 && (s.textContent || '').length > 0
      )
      return spans.filter((s) => s.getBoundingClientRect().width > 5).length >= 4
    },
    undefined,
    { timeout: 20_000, polling: 200 }
  )

  // ── 前置：制造一条既有标注（干净面真鼠标拖选→高亮；不出条则程序化兜底）──
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    spans[8]?.scrollIntoView({ block: 'center' })
  })()`)
  // 条件轮询：滚定目标（span[8]）入视口（替代 crib 固定 400）
  await win.waitForFunction(
    () => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
        (s) => s.firstChild !== null && s.firstChild.nodeType === 3 && (s.textContent || '').length > 0
      )
      const r = spans[8]?.getBoundingClientRect()
      return r !== undefined && r.y > 120 && r.bottom < 700
    },
    undefined,
    { timeout: 8_000, polling: 100 }
  )
  const inView = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const vis = spans.map((s, i) => ({ i, r: s.getBoundingClientRect() })).filter(o => o.r.y > 120 && o.r.y < 700 && o.r.width > 5)
    return { n: vis.length, first: vis[0]?.i, last: vis[Math.min(vis.length - 1, 9)]?.i }
  })()`)
  log('可见 span 采样', JSON.stringify(inView))
  const a = Math.max(0, inView.first ?? 4)
  const b = inView.last ?? Math.min(a + 8, Math.max(inView.n - 1, a))
  const cleanPts = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
    const r1 = spans[${a}].getBoundingClientRect(), r2 = spans[${b}].getBoundingClientRect()
    return { x1: r1.x + r1.width / 2, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.3, y2: r2.y + r2.height / 2 }
  })()`)
  await dragSelect(win, cleanPts.x1, cleanPts.y1, cleanPts.x2, cleanPts.y2)
  let toolbar = await pollAttached(win, '[data-testid="selection-toolbar"]', 8000)
  R.prep = { drag: cleanPts, toolbarByRealMouse: toolbar }
  if (toolbar) {
    await win.getByRole('button', { name: '高亮' }).click()
  } else {
    await win.evaluate(`(() => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
      const r = document.createRange()
      r.setStart(spans[${a}].firstChild, 2); r.setEnd(spans[${b}].firstChild, 4)
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    toolbar = await pollAttached(win, '[data-testid="selection-toolbar"]', 8000)
    if (!toolbar) throw new Error('前置失败：程序化兜底后工具条仍未出现')
    await win.getByRole('button', { name: '高亮' }).click()
  }
  // 条件轮询：标注块渲染落地（宽>5——AnnotationLayer rAF 重锚后可见，替代固定 900）
  await win.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="annotation-rect"]')].some((e) => e.getBoundingClientRect().width > 5),
    undefined,
    { timeout: 10_000, polling: 150 }
  )
  log('前置标注已建', JSON.stringify(R.prep))

  // ── qA 采样：整块在视口内的标注块（宽>20——f-a3 同法）中心作 click 点 ──
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-testid="annotation-rect"]')].some((e) => {
        const r = e.getBoundingClientRect()
        return r.width > 20 && r.y > 140 && r.bottom < 680
      }),
    undefined,
    { timeout: 8_000, polling: 100 }
  )
  const qA = await win.evaluate(`(() => {
    const boxes = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
      .map(e => e.getBoundingClientRect())
      .filter(r => r.y > 140 && r.bottom < 680 && r.width > 20 && r.width < 400)
    if (boxes.length === 0) return null
    const r = boxes[0]
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }
  })()`)
  if (qA === null) throw new Error('无可测标注块（场景前提不成立）')
  log('qA click 点', JSON.stringify(qA))

  // ── B-n6 主断言：选择模式点击 rect 零副作用 ──
  const modeBtn = win.locator('button:has-text("选择模式")')
  await modeBtn.click()
  const pressedTrue = await pollPressed(win, 'true')
  R.scenarios.B_n6 = { ariaPressedOk: pressedTrue, click: qA }
  R.scenarios.B_n6.rectPointerEvents = await rectPointerEvents(win, '[data-testid="annotation-rect"]')
  Object.assign(R.scenarios.B_n6, await clickZeroSideEffects(win, qA))
  R.scenarios.B_n6.styleNone =
    R.scenarios.B_n6.rectPointerEvents.total > 0 && R.scenarios.B_n6.rectPointerEvents.computed.every((v) => v === 'none')
  log('场景 B-n6 选择模式点击', JSON.stringify(R.scenarios.B_n6))

  // ── AI 层同测（如实条件执行——仍处选择模式）──
  R.scenarios.AI_n6 = { aiRectsPresent: await win.evaluate(`!!document.querySelector('[data-testid="ai-note-rect"]')`) }
  if (R.scenarios.AI_n6.aiRectsPresent) {
    const aiQ = await win.evaluate(`(() => {
      const boxes = [...document.querySelectorAll('[data-testid="ai-note-rect"]')]
        .map(e => e.getBoundingClientRect())
        .filter(r => r.y > 140 && r.bottom < 680 && r.width > 20)
      if (boxes.length === 0) return null
      const r = boxes[0]
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }
    })()`)
    if (aiQ === null) {
      R.scenarios.AI_n6.skipped = 'ai-note-rect 在场但无整块入视口者'
    } else {
      R.scenarios.AI_n6.click = aiQ
      R.scenarios.AI_n6.rectPointerEvents = await rectPointerEvents(win, '[data-testid="ai-note-rect"]')
      Object.assign(R.scenarios.AI_n6, await clickZeroSideEffects(win, aiQ))
      R.scenarios.AI_n6.styleNone =
        R.scenarios.AI_n6.rectPointerEvents.computed.every((v) => v === 'none')
    }
    log('场景 AI_n6 AI 层点击', JSON.stringify(R.scenarios.AI_n6))
  } else {
    log('场景 AI_n6：真实库副本无 ai-note-rect——aiRectsPresent:false（不算失败）')
  }

  // ── 对照（非恒真证明）：切回常规→同点位单击→菜单出现 ──
  await modeBtn.click()
  R.scenarios.C_contrast = { ariaPressedOk: await pollPressed(win, 'false') }
  R.scenarios.C_contrast.rectPointerEvents = await rectPointerEvents(win, '[data-testid="annotation-rect"]')
  await realClick(win, qA.x, qA.y)
  R.scenarios.C_contrast.menuShown = await pollAttached(win, '[data-testid="annotation-menu"]', 5000)
  log('场景 C 对照常规点击', JSON.stringify(R.scenarios.C_contrast))

  await win.screenshot({ path: join(OUT, 'f-a3-n6-final-state.png') })
  await app.close()
  writeFileSync(join(OUT, 'f-a3-n6-verify.json'), JSON.stringify(R, null, 2))

  // ── 判定 ──
  const B = R.scenarios.B_n6
  const bChecks = Object.values(B.checks)
  const bOk = B.ariaPressedOk && B.styleNone && bChecks.every(Boolean)
  const AI = R.scenarios.AI_n6
  const aiOk = !AI.aiRectsPresent || AI.skipped !== undefined || (AI.styleNone && Object.values(AI.checks).every(Boolean))
  const C = R.scenarios.C_contrast
  const cOk = C.ariaPressedOk && C.menuShown === true
  console.log(
    `F-A3-N6 VERIFY: B-n6(零副作用+穿透)=${bOk ? 'PASS' : 'FAIL'} AI=${!AI.aiRectsPresent ? 'absent' : aiOk ? 'PASS' : 'FAIL'} C(对照菜单出现)=${cOk ? 'PASS' : 'FAIL'} overall=${bOk && aiOk && cOk ? 'PASS' : 'FAIL'}`
  )
  if (!(bOk && aiOk && cOk)) process.exit(2)
}

await main().catch((e) => {
  R.error = String(e)
  try {
    writeFileSync(join(OUT, 'f-a3-n6-verify.json'), JSON.stringify(R, null, 2))
  } catch {
    // 产物目录缺失等——原始错误优先报告
  }
  console.error(e)
  process.exit(1)
})

━━━ 产物 ②：tests/e2e/reader-text.spec.ts 新增用例（git diff）━━━
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 0428b7462..c41799a87 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -806,3 +806,191 @@ test('F-A1 多行划选归并：块=行、零宽 0、行块两两垂直分离（
   }
   await app.close()
 })
+
+/**
+ * [C-2②/F-ARCH4-M1] 跨根选区防线真浏览器定性（三向对照）：
+ * - E3 真鼠标跨页拖选（真用户路径+INV-02 锁）→ toast `选区跨页，不支持创建
+ *   标注` 可见 + 无 selection-toolbar；
+ * - E1 程序化同页跨 textLayer 边界（anchor=页 canvas offset0 / focus=textLayer
+ *   文本节点 offset>0——closestPageRoot 同页根、过 SelectionLayer 边界检查；
+ *   真 Chromium 语义实验，jsdom 做不到的形态）→ 静默不建锚（无 toast 且无
+ *   工具条——selectionToAnchor 内 root.contains 防线拒）；
+ * - E0 对照页内有效选区（同 textLayer 两文本节点）→ selection-toolbar 出现
+ *   ——证明 E1 的静默是防线拒绝而非夹具失灵。
+ * 定性结论（实证落 scripts/audits/c2-impl.report.md E2 变异矩阵）：
+ * - 真浏览器不塌缩跨界选区（E1/E3 断言 isCollapsed=false——jsdom 才塌缩，
+ *   isCollapsed 先兜在真机不可达）；
+ * - 跨页拒绝由 SelectionLayer 的 closestPageRoot 边界检查承担（变异 A 单点
+ *   摘除→E3 红：无 toast）；同页跨 textLayer 拒绝归属见变异 B 实测。
+ */
+test('F-ARCH4-M1 跨根选区防线真浏览器定性：跨页真鼠标=toast 拒绝；同页跨 textLayer 边界=静默不建锚；页内选区=工具条（三向对照）', async () => {
+  skipIfPending(F02_DEPS)
+  const title = '智慧水务 e2e 跨根防线文献'
+  const { app } = await seedAndLaunch(title, createCrossPagePdf())
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+  await win.getByText(title).first().dblclick()
+  await expect(win.getByText('P1A SMART WATER TEST DOC').first()).toBeVisible({ timeout: 20_000 })
+
+  // 滚到两页交界：按页盒几何（全长真实占位——P2 文本层未渲染也可算）把
+  // 页1 盒底×页2 盒顶的中点对到视口中心
+  await win.evaluate(() => {
+    const boxes = Array.from(document.querySelectorAll('[data-page-box]'))
+    const col = document.querySelector('[data-page-column="ready"]')
+    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
+    if (boxes.length < 2 || scroller === null) {
+      throw new Error(`交界前提不成立: pageBoxes=${boxes.length} scroller=${scroller !== null}`)
+    }
+    const r1 = boxes[0]!.getBoundingClientRect()
+    const r2 = boxes[1]!.getBoundingClientRect()
+    const mid = (Math.min(r1.bottom, r2.bottom) + Math.max(r1.top, r2.top)) / 2
+    scroller.scrollTop += mid - scroller.clientHeight / 2
+  })
+  // 条件轮询：两交界行同视口（P2 页懒渲染入窗即就绪——占位盒驱动）
+  await win.waitForFunction(
+    () => {
+      const vis = (prefix: string): boolean => {
+        const s = Array.from(document.querySelectorAll('.textLayer span')).find((el) =>
+          (el.textContent ?? '').startsWith(prefix)
+        )
+        if (s === undefined) return false
+        const r = s.getBoundingClientRect()
+        return r.top > 0 && r.bottom < window.innerHeight - 4 && r.width > 5
+      }
+      return vis('P1B ') && vis('P2 ')
+    },
+    undefined,
+    { timeout: 10_000, polling: 200 }
+  )
+
+  // —— E3：真鼠标跨页拖选（P1B 行→P2 行；crib f-a3-verify dragSelect 的
+  //    12 步插值+16ms 步进=手势时序）→ toast 拒绝可见+无工具条 ——
+  const e3 = await win.evaluate(() => {
+    const spans = Array.from(document.querySelectorAll('.textLayer span'))
+    const p1b = spans.find((s) => (s.textContent ?? '').startsWith('P1B '))
+    const p2 = spans.find((s) => (s.textContent ?? '').startsWith('P2 '))
+    if (p1b === undefined || p2 === undefined) throw new Error('E3 前提不成立（交界 span 缺失）')
+    const r1 = p1b.getBoundingClientRect()
+    const r2 = p2.getBoundingClientRect()
+    return { x1: r1.x + r1.width * 0.3, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.7, y2: r2.y + r2.height / 2 }
+  })
+  await win.mouse.move(e3.x1, e3.y1)
+  await win.mouse.down()
+  for (let i = 1; i <= 12; i += 1) {
+    await win.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 16)))
+    await win.mouse.move(e3.x1 + ((e3.x2 - e3.x1) * i) / 12, e3.y1 + ((e3.y2 - e3.y1) * i) / 12)
+  }
+  await win.mouse.up()
+  // toast 可见=mouseup 评估已完成的正向锚（同次 evaluate 内 pending 已清——
+  // 工具条缺席断言自此即刻有效，无需观察窗）
+  await expect(win.getByText('选区跨页，不支持创建标注')).toBeVisible({ timeout: 3_000 })
+  await expect(win.getByTestId('selection-toolbar')).toHaveCount(0)
+  // 定性锚：真浏览器不塌缩跨界选区（jsdom 才塌缩——isCollapsed 先兜不可达）
+  const e3sel = await win.evaluate(() => {
+    const s = window.getSelection()
+    return { collapsed: s?.isCollapsed ?? true, len: s !== null && !s.isCollapsed ? s.toString().length : 0 }
+  })
+  expect(e3sel.collapsed, 'E3 跨页选区在真浏览器不塌缩').toBe(false)
+  expect(e3sel.len).toBeGreaterThan(0)
+  await win.evaluate(() => window.getSelection()?.removeAllRanges())
+  // toast 退场（info 档 3500ms 自动消失——条件轮询等隐；防 E1 的无 toast
+  // 断言被 E3 残留卡片误红）
+  await expect(win.getByText('选区跨页，不支持创建标注')).toBeHidden({ timeout: 8_000 })
+
+  // —— E1：程序化同页跨 textLayer 边界（canvas anchor×textLayer focus）→
+  //    静默不建锚：无 toast 且无工具条 ——
+  const e1collapsed = await win.evaluate(() => {
+    const root = document.querySelector('[data-page-root]')
+    const canvas = root?.querySelector('canvas') ?? null
+    const span = Array.from(root?.querySelectorAll('.textLayer span') ?? []).find((s) =>
+      (s.textContent ?? '').startsWith('P1A ')
+    )
+    if (root === null || canvas === null || span === undefined || span.firstChild === null) {
+      throw new Error('E1 前提不成立（页根/canvas/P1A span 缺失）')
+    }
+    const sel = window.getSelection()
+    sel?.removeAllRanges()
+    sel?.setBaseAndExtent(canvas, 0, span.firstChild, 3)
+    document.dispatchEvent(new Event('selectionchange'))
+    return sel?.isCollapsed ?? true
+  })
+  expect(e1collapsed, 'E1 跨 textLayer 选区在真浏览器不塌缩（jsdom 才塌缩）').toBe(false)
+  // 防抖 settled 观察窗（票面处方：≥600ms 条件轮询——SELECTION_DEBOUNCE_MS
+  // =200 的 trailing 评估余量；时间下限经 poll 表达，非固定 sleep）
+  const t0 = await win.evaluate(() => performance.now())
+  await expect
+    .poll(() => win.evaluate(() => performance.now()), { timeout: 5_000 })
+    .toBeGreaterThanOrEqual(t0 + 600)
+  await expect(win.getByTestId('selection-toolbar')).toHaveCount(0)
+  await expect(win.getByText('选区跨页，不支持创建标注')).toHaveCount(0)
+  await win.evaluate(() => window.getSelection()?.removeAllRanges())
+
+  // —— E0 对照：同 textLayer 两文本节点（P1A 行首×P1B 行内）→ 工具条出现 ——
+  await win.evaluate(() => {
+    const spans = Array.from(document.querySelectorAll('[data-page-root] .textLayer span'))
+    const a = spans.find((s) => (s.textContent ?? '').startsWith('P1A '))
+    const b = spans.find((s) => (s.textContent ?? '').startsWith('P1B '))
+    if (a === undefined || b === undefined || a.firstChild === null || b.firstChild === null) {
+      throw new Error('E0 前提不成立（P1A/P1B span 缺失）')
+    }
+    const sel = window.getSelection()
+    sel?.removeAllRanges()
+    sel?.setBaseAndExtent(a.firstChild, 0, b.firstChild, 4)
+    document.dispatchEvent(new Event('selectionchange'))
+  })
+  await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 3_000 })
+  await win.evaluate(() => window.getSelection()?.removeAllRanges())
+  await app.close()
+})
+
+/**
+ * [C-2②] 跨页交界 fixture：页1 双行（y=100 上行 P1A=E1/E0 素材/y=72 底行
+ * P1B=E3 起点）+页2 顶行（y=720=E3 终点）——两交界行几何距离 ~220px < 视口
+ * 高，滚到交界即可同视口（pdf-factory 全高页相邻行距 ~1056px 做不到）。
+ * 组装器 crib tests/utils/pdf-factory.ts assemblePdf（受锁不可改——本文件
+ * 内联同款，UTF-8 字节口径一致；正文纯 ASCII 无需 esc）。对象布局：
+ * 1=Catalog 2=Pages 3/4=Page 5/6=Contents 7=Font。
+ */
+function createCrossPagePdf(): Uint8Array {
+  const stream1 = [
+    'BT /F1 18 Tf 72 100 Td (P1A SMART WATER TEST DOC) Tj ET',
+    'BT /F1 18 Tf 72 72 Td (P1B SMART WATER TEST DOC) Tj ET'
+  ].join('\n')
+  const stream2 = 'BT /F1 18 Tf 72 720 Td (P2 SMART WATER TEST DOC) Tj ET'
+  const enc = new TextEncoder()
+  const objects = [
+    '<< /Type /Catalog /Pages 2 0 R >>',
+    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
+    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
+    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
+    `<< /Length ${enc.encode(stream1).length} >>\nstream\n${stream1}\nendstream`,
+    `<< /Length ${enc.encode(stream2).length} >>\nstream\n${stream2}\nendstream`,
+    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
+  ]
+  const parts: Uint8Array[] = []
+  let byteLen = 0
+  const push = (s: string): void => {
+    const b = enc.encode(s)
+    parts.push(b)
+    byteLen += b.length
+  }
+  push('%PDF-1.4\n')
+  const offsets: number[] = []
+  objects.forEach((body, i) => {
+    offsets.push(byteLen)
+    push(`${i + 1} 0 obj\n${body}\nendobj\n`)
+  })
+  const xrefStart = byteLen
+  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
+  for (const off of offsets) {
+    push(`${String(off).padStart(10, '0')} 00000 n \n`)
+  }
+  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
+  const out = new Uint8Array(byteLen)
+  let cursor = 0
+  for (const part of parts) {
+    out.set(part, cursor)
+    cursor += part.length
+  }
+  return out
+}

━━━ 产物 ③：f-l4-verify.mjs 轮询化 diff ━━━
diff --git a/scripts/audits/f-l4-verify.mjs b/scripts/audits/f-l4-verify.mjs
index 0155dcbfb..340ae0164 100644
--- a/scripts/audits/f-l4-verify.mjs
+++ b/scripts/audits/f-l4-verify.mjs
@@ -110,10 +110,58 @@ async function freshUserData() {
 const userData = await freshUserData()
 const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
 const win = await app.firstWindow()
+
+// [C-2③ INV-44 备案③] 固定等待（waitFor Timeout 族）→条件轮询（CI 慢机误报防线）：
+// - pollUntil：waitForFunction 条件轮询（120ms 采样）；超时不抛错返回 false——
+//   红由后续 check 断言承担（保持探针 FAIL 语义而非脚本崩溃）；
+// - twoFrames：双 rAF——布局变化经 paint 两帧，RO（帧前派发）与 React 重渲染
+//   均已获执行机会，负向断言（「无变化」类）自此采样才有效（等待语义的条件化
+//   等价物，非固定 sleep——由帧事件驱动）。
+async function pollUntil(pageFn, arg, timeout) {
+  try {
+    await win.waitForFunction(pageFn, arg, { timeout, polling: 120 })
+    return true
+  } catch {
+    return false
+  }
+}
+const twoFrames = () =>
+  win.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))))
+/** 脉络图挂载 fit 完成且已稳定：节点>0+transform 非空+连续两次采样同值
+ *  （120ms 间隔——初始态 transform=identity（useState 初值）与 nodes 提交
+ *  →fit effect→二次提交之间存在中间帧窗口，「非空」条件会在 fit 落地前
+ *  放行（2026-09-02 本票实测翻车：t1/t2 采到 identity——A/transform 两红）；
+ *  稳定性判据消除该竞态：fit 值一旦提交即不再变（除非用户交互/resize） */
+const lineageReady = async () => {
+  await win.evaluate(() => {
+    delete window.__fitProbe
+  })
+  return pollUntil(
+    () => {
+      const vp = document.querySelector('[data-viewport]')
+      const t = vp === null ? '' : vp.getAttribute('transform') || ''
+      const s = window.__fitProbe === undefined ? (window.__fitProbe = {}) : window.__fitProbe
+      if (t === '' || document.querySelectorAll('[data-node-id]').length === 0) {
+        s.last = null
+        return false
+      }
+      if (s.last === t) {
+        return true
+      }
+      s.last = t
+      return false
+    },
+    undefined,
+    15_000
+  )
+}
+
 await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
-await win.waitForTimeout(800)
+// [C-2③] 启动 settle 条件化：页面 load 完成（React 渲染已由按钮 waitFor 保证）
+await pollUntil(() => document.readyState === 'complete', undefined, 5_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1500)
+// [C-2③] 固定 1500→轮询脉络挂载 fit 完成
+await lineageReady()
 
 const pageErrors = []
 win.on('pageerror', (e) => pageErrors.push(String(e)))
@@ -192,11 +240,15 @@ const brief = (m) =>
 const t1 = await win.evaluate(DUMP) // small 档挂载 fit
 log('A/small 挂载 fit：', brief(t1))
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(600)
+// [C-2③] 固定 600→locator waitFor 条件轮询：档位钮可见=设置页已渲染
+await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
 await win.getByRole('button', { name: '中 110%' }).click()
-await win.waitForTimeout(900) // save 落地→store→--ui-scale（真实通道全程）
+// [C-2③] 固定 900→轮询 settings 真实通道终点（save→settings.json→store→
+// --ui-scale：small=1→medium=1.1——属性值即通道落地观测点）
+await pollUntil(() => document.documentElement.style.getPropertyValue('--ui-scale') === '1.1', undefined, 8_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1200) // 重挂载：取数+fit effect+RO observe 初始通知
+// [C-2③] 固定 1200→轮询重挂载（取数+fit effect+RO observe 初始通知）
+await lineageReady()
 const t2 = await win.evaluate(DUMP)
 log('A/medium 换档后：', brief(t2))
 
@@ -227,7 +279,9 @@ check(
 // ── A-resize（RO 端到端裁决点）：挂载中窗口 resize——fit effect deps 未变，refit 只能来自 RO ──
 const bounds0 = await winBounds()
 await resizeBy(-240, -160)
-await win.waitForTimeout(900)
+// [C-2③] 固定 900→轮询 RO refit 生效（transform 离开 t2 值——摘 RO 即超时，
+// 由 A-resize 断言红，不在此崩）
+await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t2.transform, 8_000)
 const t3 = await win.evaluate(DUMP)
 log('A-resize/缩窗后：', brief(t3))
 const v3 = parseTransform(t3.transform)
@@ -243,12 +297,17 @@ const bx = t3.gBCR.x + t3.gBCR.w / 2
 const by = t3.gBCR.y + t3.gBCR.h / 2
 await win.mouse.move(bx, by)
 await win.mouse.wheel(0, -240) // 用户接管视口（userInteracted=true）
-await win.waitForTimeout(400)
+// [C-2③] 固定 400→轮询 wheel 视口更新（transform 离开 t3 值）
+await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t3.transform, 8_000)
 const wb = await win.evaluate(DUMP)
 const wv = parseTransform(wb.transform)
 check('B/pre/wheel-changed', wv !== null && viewportChanged(wv, v3), `wheel 后视口已变（${JSON.stringify(wv)}≠fit 值——前提锚）`)
 await resizeBy(-200, 0)
-await win.waitForTimeout(900)
+// [C-2③] 负向等待条件化：先正向轮询布局变化落地（svg clientWidth 离开
+// wheel 后值），再双 rAF 给 RO（帧前派发）+React 重渲染执行机会——此刻
+// 采样 transform 不变才构成有效负向断言
+await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, wb.client.w, 8_000)
+await twoFrames()
 const wa = await win.evaluate(DUMP)
 const wv2 = parseTransform(wa.transform)
 check('B/viewport-frozen', wv2 !== null && !viewportChanged(wv2, wv), `resize 后视口保持 wheel 值（${JSON.stringify(wv2)}==${JSON.stringify(wv)}——门语义不抢）`)
@@ -281,9 +340,13 @@ await win.evaluate(() => {
 })
 // 重挂载使新实例经 wrapper（patch 时挂载中的旧实例仍原生——不可观察，无妨）
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(500)
+// [C-2③] 固定 500→轮询脉络卸载（viewport 不在场=页面互斥切换完成）
+await pollUntil(() => document.querySelector('[data-viewport]') === null, undefined, 8_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1200)
+// [C-2③] 固定 1200→两段条件轮询：wrapper 实例就位（mount 即注册）→
+// 脉络 fit 稳定（lineageReady 稳定性判据——同 t1 竞态防护）
+await pollUntil(() => window.__roRec !== undefined && window.__roRec.instances.length > 0, undefined, 8_000)
+await lineageReady()
 const ro0 = await win.evaluate(() => ({
   instanceCount: window.__roRec.instances.length,
   callbackCount: window.__roRec.callbackCount,
@@ -298,11 +361,16 @@ const countBefore = await win.evaluate(() => window.__roRec.callbackCount)
 const cssOriginal = await win.evaluate(() => document.documentElement.style.getPropertyValue('--ui-scale') || '1')
 const cssFlipped = cssOriginal === '1' ? '1.1' : '1'
 await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssFlipped}')`)
-await win.waitForTimeout(900)
+// [C-2③] 诊断观察窗条件化（900ms 上限保持）：轮询布局盒变化落地
+// （clientWidth 离开前值）即提前采样；不变则窗口耗尽后采样
+// （cssZoomTriggersRO=false 语义保持——信息项不断言）
+await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, diagBefore.client.w, 900)
+await twoFrames()
 const diagAfter = await win.evaluate(DUMP)
 const countAfter = await win.evaluate(() => window.__roRec.callbackCount)
 await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssOriginal}')`) // 恢复
-await win.waitForTimeout(600)
+// [C-2③] 固定 600→轮询 --ui-scale 恢复回值
+await pollUntil((orig) => (document.documentElement.style.getPropertyValue('--ui-scale') || '1') === orig, cssOriginal, 8_000)
 const diagnostic = {
   method: '挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）',
   cssFlipped,
@@ -317,18 +385,26 @@ log('diagnostic（信息项）：', JSON.stringify(diagnostic))
 //    再 resize→计数不增（回调不再生效）──
 const c0 = await win.evaluate(() => window.__roRec.callbackCount)
 await resizeBy(0, -140)
-await win.waitForTimeout(900)
+// [C-2③] 固定 900→轮询 RO 派发计数增加（resize 生效的正向条件）
+await pollUntil((c0v) => window.__roRec.callbackCount > c0v, c0, 8_000)
 const c1 = await win.evaluate(() => window.__roRec.callbackCount)
 check('C/resize-callback-fired', c1 > c0, `resize 后 RO 派发计数 ${c0}→${c1}（浏览器真派发——sanity 前提锚）`)
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(700)
+// [C-2③] 固定 700→locator waitFor 条件轮询：设置页渲染=脉络 unmount
+// （页面互斥）——disconnect 采样前提
+await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
 const roUnmounted = await win.evaluate(() => ({
   disconnected: window.__roRec.instances.every((i) => i.disconnected),
   instanceCount: window.__roRec.instances.length
 }))
 check('C/disconnect-on-unmount', roUnmounted.disconnected, `unmount 后全部 ${roUnmounted.instanceCount} 个 wrapper 实例 disconnect 被调（成对清理）`)
+// [C-2③] 负向等待条件化：resize 前取渲染视口高（脉络已 unmount、svg 不在
+// 场——用 documentElement.clientHeight 作布局观测点），正向轮询视口变化
+// 落地（离开前值）+双 rAF——此后采样计数不增才构成有效负向断言
+const vhPre = await win.evaluate(() => document.documentElement.clientHeight)
 await resizeBy(0, 100)
-await win.waitForTimeout(900)
+await pollUntil((h) => document.documentElement.clientHeight !== h, vhPre, 8_000)
+await twoFrames()
 const c2 = await win.evaluate(() => window.__roRec.callbackCount)
 check('C/no-callback-after-disconnect', c2 === c1, `disconnect 后再 resize 派发计数不增（${c1}→${c2}——回调不再生效，无泄漏）`)
 
