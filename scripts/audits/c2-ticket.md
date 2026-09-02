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
