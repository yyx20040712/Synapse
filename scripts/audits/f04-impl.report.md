# SR2-F-04 实现者报告（缩放重定义与收官 e2e）

> 三屋模式实现者子代理产物；主控=收口/双门/registry。审计档前缀 `f04-*`。
> 开工技能清点：TDD/完成前验证/系统化调试/e2e+javascript-testing-patterns=用；
> 派发/门审类=不用（实现者本体）；其余与票面无关=不用。配置按主控派发。

## 1. 实现摘要

- **page-column-geometry.ts 新建（100 行）**：PageColumn 纯函数搬移（PageBoxSize/
  clampPageToColumn/columnWidth/pageBoxHeight/windowPages/recycledPages/
  nearestPage）+F-04 新增 `columnTotalHeight`（盒高合计+PAGE_GAP_PX=12 间隙，
  间隙不随 zoom 缩放）与 `anchoredScrollTop`（(scrollTop+vh/2)/总高 比值保持，
  顶/底夹取，总高非正退化防御）。250 行预裁拆分预案兑现：PageColumn.tsx 内
  旧定义删除（方案切换红线），组件留装配（237 行）。
- **PageColumn.tsx（245→237 行）**：段⑥缩放中心锚——`scrollContainerRef?`
  可选 prop（修正目标；缺省不修正，既有宿主零改）+滚动位置镜像（容器 scroll
  事件被动监听，挂载即读初值）+`useLayoutEffect` 程序修正 scrollTop（zoom 变化
  且就绪后；程序性赋值不经 wheel/keydown/pointerdown 接管链——INV-32 不受扰）；
  `onReady` 载荷化（basisWidth=columnWidth(sizes,1)=最宽页原始宽——fit-width
  分母单源）；再导出 `nearestPage`/`PageBoxSize` 维持 scroll-progress 既有
  import 路径（单实现双出口，非复写）。
- **ReaderPage.tsx（249→249 行）**：fitWidth 重定义——分母=columnBasis（onReady
  上报）替代旧锚定页 canvas 量测值（`measured.box.w/zoom`）；一次性 zoom 语义
  保持；`scrollContainerRef={scrollAreaRef}` 传递；anchorPages/onVisibleChange
  接线删除（fit 重定义后零消费面——死代码即删；PageColumn 的 prop 本体保留）。
- **reader-scroll.spec.ts（45→272 行）**：骨架守卫展开为收官全链单测（一测七段，
  渲染真实文本断言）：①INV-01 三层 overflow 计算样式 ②键位滚动步（PageDown
  0.9 屏+防抖页码不翻）③缩放中心锚+ctrl+wheel 段迁移（zoom-label 100%→110%
  全链+中心最近页保持+scrollTop 前进+P3 真实文本仍在）④fit-width 列宽基准
  （适应后列宽贴合内宽±2px+中心锚一致性）⑤标注原位抽验（划选高亮色块落
  所属页盒内）⑥离屏回收（6 页文档滚底 canvas≤5 上限断言）⑦进度恢复（底部
  中心页记账→关 tab flush（dirty confirm 自动接受）→重开滚回记忆页+页指示）。
  DEPS 双条件守卫保留（F-01~04）。
- **reader-text.spec.ts（620→613 行）批 4**：P7-A 交互测 ctrl+wheel 段删除
  （迁移至 reader-scroll 收官链③——方案切换=旧段删除），该测更名「侧栏分隔条
  拖拽（SplitPane 集成）」保留拖拽面。
- **docs/invariants.md**：INV-33 登记（缩放中心保持+fit-width 列宽基准；单测+
  e2e 锚+M3/M4 变异实证）。
- **docs/reports/2026-08-28_p7f-campaign.md**：战役收官报告骨架（四票链完整
  性+验收四项对照+成本账本框架）——F-04 成本行/门战绩/新教训留主控续填位。

## 2. 文件清单（票面对照）

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/page-column-geometry.ts | 新建 | 拆分预案纯函数件（简报 W3 预裁） |
| src/renderer/features/reader/PageColumn.tsx | 改 | 段⑥锚点+onReady 载荷+纯函数搬出 |
| src/renderer/features/reader/ReaderPage.tsx | 改 | fit-width 重定义+ref 传递+死接线删 |
| tests/e2e/reader-scroll.spec.ts | 改（受锁） | 骨架→收官全链（注册文件） |
| tests/e2e/reader-text.spec.ts | 改（受锁） | 批 4：ctrl+wheel 段迁移删除 |
| tests/unit/renderer/page-column.test.tsx | 改（受锁扩） | +4 用例+import 迁 geometry 直引 |
| docs/invariants.md | 改 | INV-33 登记（非锁） |
| docs/reports/2026-08-28_p7f-campaign.md | 新建 | 收官报告骨架（非锁） |
| locks/manifest.json | 改 | 三受锁文件 sha 重算（142 条不变） |

git diff --stat：7 文件 +426/−129（含 manifest）；无未清单文件蔓延
（dev-launch.cmd/dist_new/ 为前置会话残留，未触碰）。

## 3. TDD 红证+变异日志

- **首红**（f04-red-unit.log）：page-column.test 改 import 指 geometry（尚无）
  →模块解析失败 1 文件红（F-03「首红 26」同型——collection 级）。
- **绿**（f04-green-unit.log）：page-column 20/20（16 既有+4 新）+
  scroll-progress 22/22（nearestPage 再导出链路无损）。
- **单元变异**（f04-mutation-unit.log，cp 备份法，it 名全录）：
  - M1 anchoredScrollTop→return scrollTop：纯函数 it+组件 it 双红，还原 diff 空；
  - M2 段⑥效应不修正（scrollTop 原样回写）：组件装配 it 红，还原 diff 空；
  - M3 onReady 载荷传 0：列宽基准 it 红，还原 diff 空。
- **e2e 变异**（f04-mutation-e2e.log，cp 备份法+spec 备份法）：
  - M3' anchoredScrollTop 失锚（重建后只跑 reader-scroll spec）：收官链 :209
    `expect.poll(centerPageBox).toBe(anchorPage)` 红——中心页保持断言恰中；
  - M4 fitWidth 分母×2：收官链 :221 `适应后列宽贴合滚动区内宽（±2px 容差）`
    红——列宽基准断言恰中；
  - 双向还原 diff 空+spec sha256=0af8fedb…（与激活取证轮一致——双佐证）。
- 意外实录：M4 首次尝试撞 locks:apply 后只读（PermissionError，playwright 未
  跑）→解锁重做全程——受锁编辑先解锁的流程再证实。

## 4. 测试证据（verify+e2e 双真退出码）

- **verify**（f04-impl-verify.log，清洁构建终跑）：`npm run verify` **exit 0**，
  93 文件 **723 用例**全绿（基线 719+4 精确）；含 quality/tickets/locks/lint/
  typecheck/test/build 全链。
- **e2e 激活取证**（f04-e2e-active.log，spec 备份法——守卫临改后全量）：
  **22 passed（1.1m）exit 0**——「翻 done 后终态=22 过+0 skip」推演精确兑现；
  还原 sha 双佐证（diff 空+哈希一致）。
- **e2e 终态**（f04-e2e-final.log，守卫原样全量）：**21 passed+1 skipped
  exit 0**——唯一 skip=收官链（F-04 open 期守卫语义正确）。
- 中间拦截实录：tsc 关卡拦 NodeListOf 迭代器类型缺陷（Array.from 处置——
  bb302b4 同源，playwright esbuild 不查类型）；quality 拦 ReaderPage 251 行
  （F-04 头注单行化→250→终态 249）。

## 5. locks 实录

- unlock（142 文件）→改三受锁文件（reader-scroll.spec/reader-text.spec/
  page-column.test——均在既有 manifest 内，无新增路径）→apply（142 条重锁，
  f04-locks-apply.log）→check-locks 通过。
- M4 变异期间 apply→unlock 一次往返（上述实录），终态 apply 后 verify 全绿
  复核——manifest 与文件同步（宪法即时 apply 纪律）。

## 6. 自裁申报（超票面/接缝决定，含删减面）

1. **ReaderPage.tsx 修改**：draft 文件清单未列，但注册 spec 头注行为层明文
   「fit-width：公式分母改列宽基准（最宽页）」+简报§②.3 直指 ：129-135——
   依票面行为层执行，非扩票。
2. **onReady 载荷化**（basisWidth）：fit 分母单源的接口设计自裁——F-01 锁定
   测试断言（called times 1）零破坏；门审可裁替代方案（如 DOM 量测，未采——
   引入 style.width 解析耦合）。
3. **scrollContainerRef 新 prop**：锚修正目标显式传递（替代 closest('.overflow-auto')
   CSS 耦合——e2e 专用手法不入 src）。
4. **nearestPage/PageBoxSize 再导出**：scroll-progress.ts 不在票面清单，其
   import 路径保持不动——单实现双出口（geometry 唯一定义）。
5. **anchorPages/onVisibleChange 接线删除**：fit 重定义后零消费（最后一消费者
   死亡即删线——死代码纪律）；PageColumn prop 与锁定测试不受影响。
6. **收官链含 fit-width 断言**：票面 e2e 清单七项未列 fit，但行为层明文重
   定义——无断言=行为裸奔，补真实几何断言（±2px）。
7. **一测七段**（非七测）：22+0 推演算术锁定净增 1 测（基线 21+1 skip）。
8. **campaign 报告骨架**：成本账本 F-04 行/双门战绩 F-04 段/新教训主控段=
   留位「（主控续填）」（brief §③.6 分工）。
9. **删减面**：无票面行为删减；骨架占位用例按票面「展开时替换」删除；
   reader-text P7-A ctrl+wheel 旧段按「段迁移」删除（方案切换红线）。

## 7. 疑虑（交门审）

1. **比值公式口径**：总高=盒高+固定间隙（columnTotalHeight 纯函数单源），非
   DOM scrollHeight（含 scroller padding 24px）——票面公式字面按内容高；中心
   点偏差 <12px 级，最近页判定不受扰（e2e 实证），但口径选择可复核。
2. **zoom 链与状态机交互**：程序性 scrollTop 修正会派发 scroll 事件→
   scroll-progress 在 idle/scrolling 态记账——中心内容不变→记账页不变→回写
   幂等（无竞态、无回弹）；restoring 态走到达判定。设计内行为，建议门一
   N4 联测项按此口径审。
3. **e2e 计数上限取 5**：底部稳态实测 3~4，阈值=渲染窗口+缓冲语义上限——
   若门裁更紧（=3）可收紧，现状防「恒 6 不回收」回归面成立。
4. M3 首次尝试的 PermissionError 中断已全程重做取证（第 3 节实录），无残留。
