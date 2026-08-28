# R2-LG10 实现者报告（脉络布局收官：auto-fit+题名分档宽+侧板夜化）

> 三屋模式实现者子代理交付。票面=scripts/audits/r2-lg10-brief.md v1+主控预裁四点。
> 日期 2026-08-29。禁 git/registry 全程遵守（未 commit；tickets/ 零触碰）。

## 1. 实现摘要

- **P1 auto-fit 视口自适应**：新拆件 `lineage-viewport.ts`（useViewportController
  hook+fitViewport 纯几何+pan/zoom 原文搬迁）。nodes/edges 引用变化且
  !userInteracted 且视口可量测（宽高>0）→ 全节点+层带左缘包围盒适配
  （边距上下 80/左右 120，k=min(容纳比) 钳制 [0.25,4]）。「适应视图」按钮
  （lineage-fit-view，非空图才渲染）=userInteracted 显式复位唯一口。
  transform 串 `translate(x, y) scale(k)` 逐字符保持。
- **P2 题名分档宽**：`nodeWidth(title)` 导出纯函数（≤12 字 180=NODE_W/
  ≤28 字 220/>28 字 260，空题名短档兜底）。布局 place() 占位半宽随档；
  LineageNodeCard rect 宽/角饰 path 随档；fitViewport 包围盒半宽随档——
  三消费单源（INV-36）。
- **P3 侧板夜化**：LineageSidePanel 根=夜色玻璃卡（mockup .side 逐值：
  rgba(40,51,86,.72)+blur12+金 hairline rgba(207,174,114,.25)+r12+夜影）；
  标题衬线+金 sub；分组 h4 金左缘条（--gold-night）；AI/人工条目卡
  rgba(23,30,51,.45)+描边 rgba(151,160,187,.28)；文本系全换 --*-on-night。
  **testid/文案/QUESTION_COLOR 左缘条与色块零改**。
- 主题.css 增 `.lineage-fit-btn`（工具条同族玻璃，画布右下）。

## 2. 文件清单（git diff --stat 全量=14 改+1 新增，范围自查过）

| 文件 | 性质 | 改动 |
| --- | --- | --- |
| src/renderer/features/lineage/lineage-viewport.ts | **新增** | 视口域拆件：fit 几何+useViewportController 状态机+pan/zoom（LG-02 原文搬迁行为零变） |
| src/renderer/features/lineage/LineageCanvas.tsx | 修改 | 消费 viewport 控制器；fit 按钮 JSX；头注指针（318→203 行，quality 250 红线拆件动因） |
| src/renderer/features/lineage/lineage-layout.ts | 修改 | nodeWidth 三档导出+place() 异宽化（wOf 映射）+头注 |
| src/renderer/features/lineage/LineageNodeCard.tsx | 修改 | 卡宽/角饰 cornerPaths(w) 函数化随档 |
| src/renderer/features/lineage/LineageSidePanel.tsx | 修改 | NIGHT_GLASS/H4_GOLD+夜文本系（style 层） |
| src/renderer/features/lineage/LineageSideAiNotes.tsx | 修改 | NOTE_CARD 条目卡+h4 金条+夜文本系 |
| src/renderer/features/lineage/LineageSideManualNote.tsx | 修改 | 同上（总评包条目卡） |
| src/renderer/features/lineage/LineagePage.tsx | 修改 | aside 容器样式归并透明直通（接线零动） |
| src/renderer/shared/theme.css | 修改 | +.lineage-fit-btn 玻璃样式 |
| docs/invariants.md | 修改 | +INV-36（nodeWidth 单源+auto-fit 抢占门+transform 契约） |
| tests/unit/renderer/lineage-canvas.test.tsx | 受锁改 | +parseViewport/stubViewportRect 助手+R2-LG10 describe 4 it |
| tests/unit/renderer/lineage-layout.test.ts | 受锁改 | +nodeWidth import+分档 describe 3 it |
| tests/unit/renderer/lineage-side-panel.test.tsx | 受锁改 | +夜化 style 断言 it |
| tests/e2e/lineage.spec.ts | 受锁改 | T2 拖拽落点 scale-aware 化（必然红申报见 §6） |
| locks/manifest.json | 自动 | locks:apply 同步（152 条不变） |

## 3. auto-fit 状态机表（驻 lineage-viewport.ts 头注——宪法前置）

| 态/标志 | 进入事件 | 行为 |
| --- | --- | --- |
| idle（nodes 空） | 挂载/图清空 | 不 fit，保持现视口 |
| fitting | nodes/edges 引用变化 且 !userInteracted 且视口可量测（宽高>0） | 计算全节点+层带左缘包围盒→setViewport（瞬时，v1 无缓动） |
| fitted | fitting 完成 | 等待下一触发 |
| manual（userInteracted=true） | panbg pointerdown / 滚轮 wheel | 后续 nodes 变化不抢视口（fit 跳过） |
| manual→fitting | 「适应视图」按钮（lineage-fit-view，唯一复位口） | userInteracted 置 false→effect 重触发 fit（单一 fit 路径） |

包围盒=x∈[层带标签左缘 -200, 最右节点右缘]（LG9 N5：年份标初始视口外，
fit 后必入视口——it 断言锚）∪ y∈全节点上下缘；视口宽高 0（jsdom 无布局/
未挂载）=不可量测→跳过（既有 pan/zoom it 面零红的兼容前提，防御性非退化）。

## 4. TDD 证据

- **首红**（scripts/audits/r2-lg10-first-red.log，EXIT=1）：8 个新 it 中 7 红——
  auto-fit 3 it（transform 恒 identity/按钮缺失，断言红）、分档边界+兄弟占位 2 it
  （nodeWidth 未导出→运行时「不是函数」红=导出缺失红）、夜化 1 it（style 无
  rgba 值，断言红）、卡宽 1 it（rect 恒 180，断言红）。既有 60 it 全绿（对账：
  改前树）。
- **绿**：实现后 4 文件 81 it 全绿（含 board 回归面）；全量 840/840。
- **变异红证**（scripts/audits/r2-lg10-mutation.log，**对终态拆件结构重跑**——
  拆件前首证也在同 log 前段，证据与代码同构以终态段为准）：
  - M1 删 fit 计算（setViewport(fitViewport(…))→void rect）：auto-fit 3 it 红；
  - M2 删 userInteracted 置位（wheel+panbg 两处）：「不抢视口」it+「按钮复位」it 红
    （首载 fit it 仍绿——隔离正确）；
  - 还原=cp 备份法（禁 git checkout），M1/M2 还原后 `diff -u 备份 现场` 均
    空（log 内「还原 diff 空：OK」×2），还原后回绿核对 4/4。
- **首红/变异原始日志均落盘**（LG9 W1 教训固化）。

## 5. 既有受锁断言面逐 it 核对结论（P2 必然红核对义务）

- **lineage-layout.test 既有 20 it：零红**。核对法=夹具题名长度分布逐一清点：
  全部夹具 title ≤12 字（最长「节点Reynolds」10 字）→ 全落短档 180=NODE_W
  导出值语义保持，既有 NODE_W 数值断言面（兄弟距/紧凑性恰等值/覆盖根链等）
  逐 it 照旧成立（实现后全量跑实证）。
- **lineage-canvas.test 既有 it：零红**（视口 0 尺寸→fit 跳过→identity 保持，
  pan/zoom/INV-14/W2 转场断言原值通过）。
- **lineage-side-panel.test 既有 it：零红**（纯 style 层；QUESTION_COLOR 色块
  断言 dot.style.background 原样通过）。
- e2e lineage.spec T1/T3/T4 零改零红（T1 pan tx>0 仍真、zoom scale>1 在
  e2e 窗口尺寸下 k_fit>1 实测通过）。

## 6. 受锁必然红申报清单（逐 it——AI-11 口径，[locked-change] 随收口提交）

| # | 文件:用例 | 必然红机理 | 处置 |
| --- | --- | --- | --- |
| 1 | tests/e2e/lineage.spec.ts T2「拖拽位置 reload 持久…」 | 拖拽落点断言原文假设 k=1（`target=before+120/80` 布局坐标）；auto-fit 载入后 k≠1，屏幕位移÷k 落点必然偏移（实测取证 log=r2-lg10-e2e-lineage-prerun.log：1 failed/3 passed） | **scale-aware 化**：拖前读 `data-viewport` transform 的 scale(k)，target=before+120/k、80/k；断言语义不放宽（closeTo(2) 精度保持、reload 持久断言原样）。新增 3 个单测文件 it 属**新增断言面**非改既有（不属必然红申报，属受锁新增） |

其余受锁改动=三个 unit 测试文件新增 it（新增面）+lineage.spec T2 一处既有
断言必然红扩容。**无第三处既有 it 被修改**。

## 7. locks 实录

unlock(152)→批 1 改 3 个 unit 测试→apply(152)→（quality 拆件后）终批
unlock(152)→改 lineage.spec T2→apply(152)。manifest 152 条与提交同步
（收口提交须带 [locked-change] 尾注）。工作副本 CRLF 警告在案
（.gitattributes 归一化，与既往单同型非新增风险）。

## 8. verify / e2e 真退出码

- `npm run verify`（受锁 e2e spec 改动后**终跑**，宪法「只跑 playwright 会漏」
  条款）：**EXIT=0**（log=scripts/audits/r2-lg10-verify.log）——quality/tickets/
  locks/lint/typecheck/test/build 全过，102 文件 **840** 用例（基线 832+新 8）。
- `npm run test:e2e` 全量：**EXIT=0，25 passed**（log=r2-lg10-e2e-full2.log）。
  过程记录：第一次全量 1 failed=reader-text 剪贴板用例（与本单无关面，
  log=r2-lg10-e2e-full.log）→单 spec 重跑 10/10 绿（r2-lg10-e2e-reader-retry.log）
  →二次全量 25/0。lineage.spec 单跑 4/4（r2-lg10-e2e-lineage-fixed.log）。
- 基线对账：开工未动树 102 文件/832 用例全绿+locks 152 与票面⑤一致。

## 9. 自裁申报（超票面/票面自定面决定）

1. **拆件 lineage-viewport.ts**：Canvas 实现 auto-fit 后 318 行触 quality
   组件 ≤250 红线（CI 硬关卡）→ 按 LG9 拆件先例拆视口域；pan/zoom 两 effect
   为 LG-02 原文搬迁（行为零变，INV-14 配对面原样）。票面「auto-fit 逻辑在
   Canvas 组件内聚」的落点=canvas 同 feature 域拆件文件，**未入 lineage-layout
   纯函数**（架构层红线保持）；状态机表随拆件驻新文件头注（INV-36 锚定同步）。
2. **「适应视图」按钮宿主=Canvas 内**（非 Board 工具条）：viewport 状态不出
   组件域免跨件管道；**空图不渲染**（既有锁定 it「空态零按钮」面保持零红）。
3. **LineagePage aside 容器样式归并**（去 border/--panel 底）：玻璃底归
   SidePanel 根（票面 P3 文件清单面）；props/数据接线零动。
4. **h4 金左缘条用 var(--gold-night)**（mockup .side h4 字面为 var(--gold)）
   ——夜面别名一致性微调（LG9 层带/图例同族），申报档值微调面。
5. **人工笔记总评包条目卡**（mockup .note 同款）：票面「条目卡」泛指的
   取义申报（视觉同域，无行为面）。
6. **「异档单链对齐保持」it 实现前后均绿**：不变量保持型 it（防分档破坏
   链对齐的未来回归），非常规首红——TDD 首红由同 describe 另 2 it 承担。
7. **INV-36 登记**（docs/invariants.md）：nodeWidth 三消费单源+auto-fit 抢占
   门+transform 串 e2e 契约——宪法「跨模块不变量不登记视同未完成」。
8. **backdrop-filter 断言走 DOM 属性**（rootEl.style.backdropFilter）：jsdom
   不将其序列化进 style 属性（node 探针实证记录在测试注释）；删实现则
   undefined→红，变异拦截力保持。
9. **NODE_W 导出保持 180=短档常量**：既有断言面语义零变（中/长档另名
   NODE_W_MID/NODE_W_LONG 导出）。
10. 档值 180/220/260 按票面原值采用，**未做 mockup 视觉微调**（mockup 仅
    单宽 180 基样，中/长档无对照面——维持票面数字最稳）。

## 10. 疑虑（供门一/门二复核）

- T1 zoom 断言 `scale>1` 依赖 e2e 窗口默认尺寸下 k_fit>1（本次实测过）；
  若未来窗口尺寸变小 k_fit<1 该断言需 scale-aware 化——本轮未动（最小受锁
  改动原则，已在 §6 披露边界）。
- 节点拖拽（非 panbg/滚轮）不置 userInteracted→拖拽后 nodes 变化会重 fit
  （票面 P1 字面：触发=nodes 变化且未交互；userInteracted 置位仅两源）——
  行为=拖后视口轻跳一次，e2e T2/T3 无断言冲突（落点断言在布局坐标层）。
- e2e 剪贴板 flake 一次（无关面），两 log 在案可复查。

## 11. 联审微回炉（2026-08-29 裁决：PASS 附 W2）

- **W2 markUserInteracted 死代码删除**：ViewportController 导出方法全仓零消费
  零测试（grep 实证=仅接口声明+返回对象两处定义）。**裁决=删除**（非头注
  预留）：该方法系拆件前设计的残留接口——当时 canvas 的 wheel/panbg 事件
  需外部置位抢占门；视口域拆件后两监听已内化 hook，manual 态入口全部在
  hook 内部（setUserInteracted 直调），不存在也不可预见外部置位消费者，
  预留即投机（YAGNY/死代码即删）。改动=接口方法+返回属性共 2 处 4 行，
  零断言面（受锁面零触碰，无需 locks 周期）。
- 回炉后全量 verify：**EXIT=0，102 文件/840 用例**（log=本单 verify log
  「== 回炉 ==」节——含完整原始输出+真退出码）。
- W1（BAND_LEFT 跨文件魔法数）+W3（resize 不跟随边界）按裁决归遗留池，
  本单不回炉。

