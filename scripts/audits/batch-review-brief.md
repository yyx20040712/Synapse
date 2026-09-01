# 2026-09-02 R2 批次全量终审材料包（P0+U1+U2 四笔提交+1 项工作区修复）

## 审计对象与铁律
本场=v18 交接的三单元批次：P0 派发器扩展（1a35596b8）/U1 F-R2 滚动漂移修复（e0e8a827a）/U2 P7A 剪贴板防线（6e58d9eb9）+v19 交接书（78eafeb2d）。U3 顺延（预算停点）。你=终审（门一已审 F-R2 首版 B:0/W:1/N:6；deepseek 已审回炉+P7A B:0/W:2/N:2——本次为全批双源复审，可推翻前审但需更强依据）。铁律：只读本包；禁跑命令禁触仓库；每条结论给包内证据（diff 行/数值）；不确定明说；中文。

## 已披露事项（攻击这些处置的合理性）
1. U1 回炉 1 与 U2 均主控压缩票直做（原实现者会话终止 SendMessage 不可达+预算降级 45% 停点——流程偏离已担责披露）。
2. U3 顺延 v19（预算停点合规处置）。
3. F-R2e：e2e『划选高亮重开原位』全量序列第三跑 3.45px 超 2px 容差（同值复现）/单跑绿/收口全量亦绿=序列敏感备案，未立案。
4. B-3/H3：PageColumn anchoredScrollTop 分母空间错配实测证伪（zoom 往返零漂移）备案不修。
5. effectiveZoom 终形态=computed zoom 链乘积（回炉 1 定案）；比值法 ε 污染实证 ε≈0.0005。
6. 工作区修复（未提交）：ds-call anthropic 路径规范化（baseURL 剥尾 /v1 统一拼 /v1/messages——用户改 config 后 404 适配，已实调复验 6.3s 命中）。

## 关键证据摘要（原始档指针省略，数值在此）
- F-R2 根因探针：修复前 1.25 档 fill(4) dSt=2049.28≈δv(2049)（实加视觉量）、落点偏移 −512.6=−(Z−1)δv 预测 −512.25；1.1 档 −204.8 vs −204.7；Z=1 基线偏移 −0.4。
- 回炉诊断：比值法 z=964.6/772=1.24948 vs zoom 链 1.25（ε≈0.0005）；修复后 e2e 29/29；M5 变异（漏乘 scroller 层）5 用例红+还原 diff 空；真机终态三跳 ±0.2px。
- P7A：先红注入『Received: external-occupier-sim』；连跑 3 次 P7-A 全绿（29/29,29/29,28/29——第三跑失败为划选高亮条非 P7A）。
- verify 终态：126 文件 1081 用例（基线 1074+7）exit=0；locks 226→229；e2e 首跑 29 绿。
- 门一 Kimi（换源实战 504→backup 接手 11.2k out/231s）；门二 deepseek（11.2k out/107s）。

## 审计工单 A~D
A 三单元实现终审：P0 派发器（源序状态机/双形态/退避换源）——路径规范化修复的正确性与边界；F-R2 zoom 链+折算——数学完备性（漏层/NaN/clamp 口径）与残留面；P7A 防线——竞态覆盖与断言锚。
B 流程合规：压缩票两件的补偿充分性；受锁改向链（头注/先红/断言锚）；门审链完整性（门一/门二覆盖面与欠账披露）；U3 顺延处置。
C 诚实性：交接书 v19 与台账数字对账（1081/229/e2e 波动如实度）；备案清单完备性（有无应备案未备案面）。
D 下场建议：U3 顺延位执行序+新备案项优先级排序（一段即可）。

## 输出契约
[B|W|N] 逐条+包内证据+统计行（B:n/W:n/N:n）+总评（本批复审通过/需处置+清单）。

```diff
diff --git a/docs/audits/audit0-findings.md b/docs/audits/audit0-findings.md
index 185d86b97..35c353e88 100644
--- a/docs/audits/audit0-findings.md
+++ b/docs/audits/audit0-findings.md
@@ -347,15 +347,35 @@ N10=INV-02 豁免清单(3 处合法 catch)无防线。deepseek 总评在档:
   md+gate1{,-r2}-brief.md+f-r1-verify.mjs+f-r1-dbg.mjs(一次性诊断)+
   raw/red/mut ×10+f-r1-out/(json+4 png)。提交(收口时补)。
 
-### F-R2 [?] ui-scale≠1 时阅读器程序滚动落点漂移 ——状态:**新登记(2026-08-31 F-R1 回炉副产,待排查)**
+### F-R2 [已闭环] ui-scale≠1 时阅读器程序滚动落点漂移 ——状态:**已修(2026-09-02 v18 U1,verify 126 文件 1081/真机复验落点归位)**
 
 - **现象**:F-R1 探针诊断(f-r1-dbg.mjs+dbg-geom.png)——ui-scale≠1
   (用户 large=1.25)时阅读区反向 zoom 豁免与程序滚动差值法交互致落点
   漂移 160-450px;**单页模式同样复现**(非 F-R1 引入,存量缺陷)。与
   v15 备案「reader 侧同型量测面未排查」呼应——F-L2 同型污染的 reader
   侧实证落地。
-- **处置**:排查票候选(crib f-l2-precheck 前置实测范式:三档×程序滚动
-  落点差值采样定位污染消费点);用户常用 large 档=高优先。
+- **根因(v18 U1 排查+四探针实证)**:H1=scroll-converge.ts:48 把 gBCR
+  视觉差值 1:1 加本地 scrollTop(「1 gBCR px=1 scrollTop px」仅 Z=1
+  成立;P1 语义探针:scrollTop+=100→Δst=99.84/Δvis=124.8);落点过冲
+  =(Z−1)×δv——fill(4) 双档数值闭合(1.1 档 −204.8 vs 预测 −204.7/
+  1.25 档 −512.6 vs −512.25);H4/H5 排除(anchorNone 对照/量级不符);
+  H3 证伪(zoom± 往返三 cycle 两档 Δst=0——anchoredScrollTop 分母错配
+  无可感缺陷,备案)。H2 同根(scroll-progress getPageBoxes 视觉+本地
+  混算——P3b 实证 1.25 档 fill(2) 真中心页=1「页码说 2 画面看页 1」)。
+  排查报告=f-r2-explore-report.md;探针=f-r2-out/{f-r2-probe,f-r2-probe2}.json。
+- **修复(方案 B 算术折算,否决 A 结构归一)**:effectiveZoom 单源
+  (gBCR.height/clientHeight+guard 除零)+scroll-converge start/center
+  elRect 侧除 z+scroll-progress getPageBoxes 同折算(height 同除保
+  nearestPage 同空间);clamp 口径不动;签名零破坏。真机复验:1.25 档
+  fill(4) 落点偏移 −512.6→−0.6(1 档基线级)/dSt=δv/1.25 精确折算/
+  「下一页」旁支(修前 dSt≠δv 特异形态)同根归位 −0.2/pageErrors 0。
+  测试:先红 6(断言级 H1 数学复现)→126 文件 1081(1074+7)+变异
+  M1~M4 全红证 cp 备份法还原 diff 空。门一=Kimi 链首战(kimi-main 504
+  两退避→unreachable 换源 kimi-backup 接手——references/06 §5 状态机
+  首实战;B:0/W:1/N:6 可收口,W1=e2e 护栏收口侧补跑销项,N3 同源
+  亲核销项,INV-34 量纲附注含 N5 口径前提)。B-3 anchoredScrollTop
+  备案 v19;N1 guard 分支零覆盖/N2 桩面 z=0 路径=后续单候选。
+  票面/实现报告/门一审档:scripts/audits/f-r2-*.md 全套。
 
 ### F-R3 [?] pdfjs stream pump 竞态 pageerror ——状态:**新登记(2026-08-31 F-R1 回炉副产,待排查)**
 
@@ -489,7 +509,8 @@ F-L1 用户已裁决变体 C+「防重叠遮挡+悬停滚动」两保证(F-L1-C
 | F-G7 | SettingsPage 244 行(余量 6)——下个设置节必拆 UiScaleSection | N | 预警 | v9 |
 | F-G8 | SH3 drag 面断言 toContain 未计数 | N | 同类风险随 F-A1 票一并扫 | v8 SH3 门一 C9 |
 | F-G9 | fullscreen 不反映 maximize 图标 | N | 备案 | v8 SH3 门一 C12 |
-| F-G10 | P7-A 系统剪贴板竞态 flake | N | 处置=读前重试,未到必改线 | v8 §2 |
+| F-G10 | P7-A 系统剪贴板竞态 flake | **已修** | v18 U2 闭环（2026-09-02）：清场标记+条件重读防线入 spec（[locked-change]），连跑 3 次 P7-A 全绿 | v8 §2→v18 U2 |
+| F-R2e | e2e「划选高亮重开原位」序列敏感脆弱面：全量序列第三跑 3.45px 超 2px 容差（同值复现）但单跑绿+U1 收口全量亦绿——窗态持久化/顺序依赖噪声（测试注释自认已知噪声源；R3-RDRSET「间歇红环境波动」前科同族） | N | 备案 v19 观察项：再现 ≥2 次立案（容差/窗态种子隔离两案裁决） | v18 U2 三连跑 |
 
 ## 四、功能对偶矩阵状态(v10 §3.3 续)
 
diff --git a/docs/invariants.md b/docs/invariants.md
index d74d5c9aa..a9b2eb358 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -45,7 +45,7 @@
 | INV-31 | 滚动→页进度回写=视口中心最近页（纯函数，PageColumn.nearestPage 单源）：scroll-progress 状态机在防抖到期时按 (scrollTop+clientHeight/2) 所落页盒记账（整数页粒度，页内偏移不存）；回写经 setPage {scroll:'none'}（INV-29 'none' 支）只落账不触发程序滚动；回写竞 tab 切换时 writing 前校验 activeId——失配丢弃 setPage（防把 A 的页写进 B 的 tab），per-tab 账（saveProgress 按 paperId）照落 | scroll-progress.ts 状态机 fire()（SR2-F-03，2026-08-28 登记） | 单测跨格锚（scroll-progress.test：六态全格+五序列——失配丢弃/关 tab flush/中心页边界含中缝取前页）+e2e 批 3（滚动→关→重开=恢复页锚定） | 已锚定（单测级 2026-08-28 SR2-F-03；e2e 批 3 取证落盘，registry 翻 done 后常规跑激活） |
 | INV-32 | 程序滚动用户接管（RESTORING 取消）：程序滚动（恢复/跳页/locate，均经 INV-29 scrollRequest 单口）进行中，用户以 wheel/keydown/pointerdown 三类**非 scroll** 输入信号介入即取消程序目标转 scrolling（程序 scrollToPage 自发的 scroll 事件不算用户滚动）；后续 scroll 事件恢复记账 | scroll-progress.ts onUserTakeover/装配面三口（ReaderPage onWheel/onPointerDown+wiring hook keydown；SR2-F-03，2026-08-28 登记） | 单测锚（scroll-progress.test：restoring→scrolling 接管格+程序自发 scroll 不记账格）+S4 竞态序列 | 已锚定（单测级 2026-08-28 SR2-F-03） |
 | INV-33 | 缩放中心保持：zoom 变化（ctrl+wheel/工具栏/适应宽度任一来源）后视口中心内容不动——(scrollTop+vh/2)/总高 比值经纯函数 anchoredScrollTop 保持（顶/底夹取；间隙不随 zoom 缩放的口径由 columnTotalHeight 承载）；实现链=PageColumn 段⑥布局效应程序修正 scrollTop（滚动位置镜像=容器 scroll 事件被动监听），程序性修正不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）；fit-width 分母=列宽基准（最宽页原始宽，页列就绪 onReady 载荷单源，一次性 zoom 语义保持） | page-column-geometry.ts anchoredScrollTop/columnTotalHeight+PageColumn 段⑥+ReaderPage fitWidth（SR2-F-04，2026-08-28 登记） | 单测锚（page-column.test：anchoredScrollTop 比值/顶底夹取/退化防御+columnTotalHeight 间隙口径+组件 scrollTop 修正精确断言）+e2e 收官链（reader-scroll.spec 中心最近页保持+fit 列宽贴合断言；M3 变异恰中实证） | 已锚定（单测+e2e 级 2026-08-28 SR2-F-04；e2e 随收官链取证落盘，registry 翻 done 后常规跑激活） |
-| INV-34 | 程序滚动单容器收敛：程序滚动（翻页/页码跳转/恢复链与锚定闪烁链）只允许滚目标的**最近滚动祖先**（scrollIntoNearestScroller 差值法+显式夹取 [0, scrollHeight−clientHeight]；祖先判定=自 parentElement 向上首个 computed overflowY∈{auto,scroll}，hidden/visible 不入选），**禁用 Element.scrollIntoView 于滚动链**（CSSOM 语义=滚所有可滚祖先——2026-08-28 缺陷 A 实测泄漏面含 overflow:hidden 的 document viewport（scrollingElement 仍可被程序滚动）与 main，TabBar 被顶出视口无自愈）；防御纵深=ReaderPage 根两分支 overflow-hidden+ReaderToolbar 根 shrink-0（flex-wrap 折行只影响阅读器内部高度）；列表内滚动 block:'nearest'（FragmentNotesList/AiNoteGroupList/PaperList）与面板自身滚动语义不在本册约束面 | src/renderer/features/reader/scroll-converge.ts（SR2-F-05，2026-08-28 登记；消费方=PageColumn 段⑤ 'start'/anchor-locate flashElement 'center'——同一不变量同一实现，Rule of Three 从 1 收敛） | 单测锚（scroll-converge.test 六用例：最近祖先选取含嵌套取最近与 hidden 不入选/start 数学/center 数学/顶底夹取/无滚动祖先不动/aside 消费形）+受锁三文件消费形断言（page-column/anchor-locate/ai-annotation-layer 模块 mock）+e2e（reader-scroll.spec F-05：scrollingElement 与 main 双 scrollTop===0+TabBar bbox≥0+根 overflow-hidden 在位——窄视口页码跳转+PageDown 两链） | 已锚定（单测+e2e 级 2026-08-28 SR2-F-05；e2e 随守卫态 22+1 skip，registry 翻 done 后 23+0 常规跑激活） |
+| INV-34 | 程序滚动单容器收敛：程序滚动（翻页/页码跳转/恢复链与锚定闪烁链）只允许滚目标的**最近滚动祖先**（scrollIntoNearestScroller 差值法+显式夹取 [0, scrollHeight−clientHeight]；祖先判定=自 parentElement 向上首个 computed overflowY∈{auto,scroll}，hidden/visible 不入选），**禁用 Element.scrollIntoView 于滚动链**（CSSOM 语义=滚所有可滚祖先——2026-08-28 缺陷 A 实测泄漏面含 overflow:hidden 的 document viewport（scrollingElement 仍可被程序滚动）与 main，TabBar 被顶出视口无自愈）；防御纵深=ReaderPage 根两分支 overflow-hidden+ReaderToolbar 根 shrink-0（flex-wrap 折行只影响阅读器内部高度）；列表内滚动 block:'nearest'（FragmentNotesList/AiNoteGroupList/PaperList）与面板自身滚动语义不在本册约束面 | src/renderer/features/reader/scroll-converge.ts（SR2-F-05，2026-08-28 登记；消费方=PageColumn 段⑤ 'start'/anchor-locate flashElement 'center'——同一不变量同一实现，Rule of Three 从 1 收敛） | 单测锚（scroll-converge.test 六用例：最近祖先选取含嵌套取最近与 hidden 不入选/start 数学/center 数学/顶底夹取/无滚动祖先不动/aside 消费形）+受锁三文件消费形断言（page-column/anchor-locate/ai-annotation-layer 模块 mock）+e2e（reader-scroll.spec F-05：scrollingElement 与 main 双 scrollTop===0+TabBar bbox≥0+根 overflow-hidden 在位——窄视口页码跳转+PageDown 两链）；**F-R2 量纲附注（2026-09-02）**：差值法视觉项必须经 effectiveZoom（gBCR.height/clientHeight，guard 除零返 1）折算到本地 scrollTop 空间——祖先 zoom≠1 时 gBCR=本地×Z 而 scrollTop 读写皆本地（探针 P1 实证）；口径前提=gBCR.height 含 border/横滚动条而 clientHeight 不含，阅读区容器实测无 border 时 z=精确 Z（真机 |落点偏移|0.6px 闭合）；B-2 getPageBoxes 同折算同空间比较 | 已锚定（单测+e2e 级 2026-08-28 SR2-F-05；e2e 随守卫态 22+1 skip，registry 翻 done 后 23+0 常规跑激活；F-R2 视觉/本地双空间桩用例 2026-09-02 增锚） |
 | INV-35 | 课题库单活四联（ADR-0018 库级分目录）：①同一时刻至多一个课题库打开（switch=关旧→指针→装配→换引用，容器 current 单值；全新首启=legacy-fresh 态库在 userData 根，二次启动迁移入 workspaces/default——受锁 e2e 种子配方兼容的硬前提）②switch/create/rename 变更互斥单飞（busy 守卫，并发=CONFLICT 中文 DomainError）③指针 workspace.json 缺省/损坏/失指=降级「目录序第一」不崩溃；遗留迁移崩溃断点续迁（遗留 db 在且 default 库不在=条件仍真，db 文件最后移=提交点，无孤儿库）④**渲染层切换面（R1-WS2 登记）**：切换=dirty 确认→IPC switch→`location.reload()` 全新 stores（ADR-0018 裁决路径——零 stale 态类别）；reload 经 will-navigate 同 URL 唯一放行（shouldBlockNavigation 严格等值——外站/异 file/data: 变体全 deny，护栏意图不变）；弃改后悬置防抖写竞窗由 notes→papers FK+foreign_keys=ON 偶然兜底——**无 FK 新表接入课题切换面须显式防悬置写** | workspace.service.ts 头注状态机+workspace.fs.ts 搬移序（R1-WS1 登记）；渲染面=workspace.store.ts switch 流程+main-window.ts shouldBlockNavigation（R1-WS2 登记） | 单测（workspace.test.ts 14 it：迁移随迁+幂等+断点续迁+L0+指针双降级+busy CONFLICT+facade 热换+L0 双段链+失败重试）+e2e 24 迁移兼容；渲染面单测（workspace.store/workspace-switcher dirty 拦截+reload+内联错误重试/main-window-navigation 双面三 it）+e2e workspaces.spec（种子→新建 B→reload 库空+脉络空态→切回完整——加载终态锚防假绿窗） | 已锚定（单测+e2e 级 2026-08-28 R1-WS1+R1-WS2 全链） |
 | INV-36 | 脉络节点宽度单源（F-LG13 修订 2026-08-31，用户令「方框都一样大小」）：nodeWidth(title) **恒返 NODE_W=240**（签名兼容保留——R2-LG10 三档 180/220/260 语义随令删除，题名长短不再影响占位宽；题名过长由卡内题名区滚动承载 INV-38）——布局占位（lineage-layout place 半宽）/卡面渲染（LineageNodeCard rect）/auto-fit 包围盒（fitViewport+edge-label-layout 节点盒）三消费点同一纯函数，禁任一处手写卡宽；**auto-fit 抢占门**：panbg pointerdown/滚轮 zoom 置 userInteracted 后 nodes 变化不重置视口，「适应视图」按钮（lineage-fit-view）=复位唯一入口；data-viewport transform 串格式 `translate(x, y) scale(k)` 为 e2e 解析契约（逐字符保持） | lineage-layout.ts nodeWidth+lineage-viewport.ts useViewportController 状态机头注（R2-LG10 2026-08-29 登记；F-LG13 2026-08-31 修订——统一尺寸） | 单测（lineage-layout.test F-LG13 统一宽字面锚 it+兄弟占位 256 恰值 it；lineage-canvas.test 统一 rect 宽 240 it——含 jsdom 量测桩）+e2e（lineage.spec T1 全节点 rect 240x110 单值断言——属性级 k 无关） | 已锚定（单测级 F-LG13 本单；e2e 面随主控收口） |
 | INV-37 | 划选视觉=自绘并集层（ADR-0019 R1 修订，F-A4 2026-08-31）：选区视觉反馈是**浏览器选区状态**的直接函数（SelectionLayer evaluate 管线的 mergeLineRects+mergeRects 归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源，所见即所存；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；拖选期经 selectionchange 200ms 防抖驱动）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→防抖路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒；[F-A5] 块垂直=行簇字形带节点口径（选区 textNodes→bandsForTextNodes——免疫 CSS 行盒整体偏移错绑上一行）+水平界=行簇 span 端点夹取+band 缺省行盒原样回退；z=page-layer-z.selectionPaint=3 页内最上——色块垫底 canvas 透明底墨带之下，ADR-0019 R2） | e2e（reader-text.spec F-06 小票：::selection transparent+selection-rects 在场+块色 rgba(0,0,0,0.2)+toolbar ≤1.5s）+unit（selection-layer.test F-A4 反转守卫+selection-paint.test S1~S5：并集渲染/所见即所存/Escape 语义/清除随选——M2 变异红证在档） | 已锚定（e2e+单测级 2026-08-31 F-A4；真机 f-a4-verify-after.json 12/12） |
diff --git a/locks/manifest.json b/locks/manifest.json
index 81a73832e..4e7869030 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-08-31T17:27:55.1655163Z",
+    "generatedAt":  "2026-09-01T19:10:39.9635212Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -31,7 +31,7 @@
                   },
                   {
                       "path":  "scripts/audits/ds-call.mjs",
-                      "sha256":  "12d74c12a01b68d6815a930bc42b8ed005044998806809c9cd18d087c6089ec6"
+                      "sha256":  "f8a5ff984a6b3384965cf40be36a25902606b046a8aec75461a3a32a3f77a1b2"
                   },
                   {
                       "path":  "scripts/audits/f1-forensics.mjs",
@@ -153,6 +153,18 @@
                       "path":  "scripts/audits/f-r1-verify.mjs",
                       "sha256":  "87d0f4d76278ae2ab63dc8c42d38cf50aeb0516193884760b44808f3d53332d4"
                   },
+                  {
+                      "path":  "scripts/audits/f-r2-diag2.mjs",
+                      "sha256":  "1d7d294635216efc01716a28d8b33ccaf393750e536ef51de050e7e2f6c7a5c9"
+                  },
+                  {
+                      "path":  "scripts/audits/f-r2-probe.mjs",
+                      "sha256":  "f4d9f1619007a32e45d3068fddb1068d1bdac634901b1a87b7dbfb5f08de3f30"
+                  },
+                  {
+                      "path":  "scripts/audits/f-r2-probe2.mjs",
+                      "sha256":  "6e585b9a79ab49521568e1d618e6d06bb6c54e8bd9d9ec3801e70b11de9a4328"
+                  },
                   {
                       "path":  "scripts/audits/f-sw1-fix-verify.mjs",
                       "sha256":  "582e6a79339893ab58fef7685f2728cf3265709f309ca98a251606221910ed13"
@@ -363,7 +375,7 @@
                   },
                   {
                       "path":  "tests/e2e/reader-text.spec.ts",
-                      "sha256":  "e8d10dbb55477399c863035e21376c9c580c008d121e5a89eb9a8bf3eab532a1"
+                      "sha256":  "09c85870add8130aacdf772e26669a4f78d49afe322f91b7c3abb4f7aa886306"
                   },
                   {
                       "path":  "tests/e2e/seed-paper.mjs",
@@ -679,11 +691,11 @@
                   },
                   {
                       "path":  "tests/unit/renderer/scroll-converge.test.ts",
-                      "sha256":  "1b1d0beba41352388bf85b399e8c5b5a00ab3db69388ed72122379ff01ca004c"
+                      "sha256":  "0046759b1c0bc8c6c5d53a7e90199f1b1e47473c303e4959257ad2368c7b7f8d"
                   },
                   {
                       "path":  "tests/unit/renderer/scroll-progress.test.tsx",
-                      "sha256":  "c3203c7790f859e5e022ff29d1e06de880d4c26bc8349b10675a483aba60e813"
+                      "sha256":  "dcf845f5f6f84b3f57fbbdf361c68870c117fd96c3edc5aa748ce1237abfb3c3"
                   },
                   {
                       "path":  "tests/unit/renderer/selection-layer.test.tsx",
diff --git a/scripts/audits/ds-call.mjs b/scripts/audits/ds-call.mjs
index ce8e8edda..23c890a9b 100644
--- a/scripts/audits/ds-call.mjs
+++ b/scripts/audits/ds-call.mjs
@@ -1,61 +1,234 @@
 /**
- * deepseek 行内调用器(v11 §3 异基座一审制度化——形态②:API 行内调用)。
- * 从 ~/.zcode/v2/config.json 读 deepseek provider(deepseek-v4-flash),
- * 不落盘密钥。用法:node ds-call.mjs <prompt文件> [输出文件]
- * 退避:429/5xx 指数退避 3 次;超时 10min/次。
+ * 门一外部 API 派发器（v18 P0 扩展：deepseek 单源 → Kimi 链多源）。
+ * 源序（references/06 §5 状态机，主源不得主动跳过）：
+ *   kimi-main → kimi-backup → deepseek（审计兜底，套餐外计价）
+ * 三源皆尽 → exit=2 + exhaust 事件（由主控决策"同源审计欠账"回退只读审子代理）。
+ * GLM 兜底不可用：builtin GLM 全条目 anthropic 格式且本项目派发器仅双形态
+ * （anthropic messages / OpenAI chat-completions），GLM 端点属 zcode 私有路径——
+ * 诚实降级，不伪装可用兜底（references/06 §5 端点事实）。
+ *
+ * 用法：
+ *   node ds-call.mjs <prompt文件> [输出文件]              # 链式派发（默认）
+ *   node ds-call.mjs --source <alias> <prompt> [输出]     # 单源直调：kimi-main|kimi-backup|deepseek
+ *   node ds-call.mjs --list-sources                       # 列源序（零 API）
+ *   node ds-call.mjs --dry-run [--source x] <prompt> [输出]  # 打印请求形态（零 API）
+ *
+ * 事件流水账：scripts/audits/model-routing-log.jsonl（attempt/ok/switch/exhaust/usage，
+ * 逐事件一行 JSON）；输出文件首行附 [routing] 头注（审计报告头标注，v18 §2 P0 要求）。
+ * 密钥仅内存读取，不落盘。退避：429/5xx/网络错指数退避 3 次后换源；
+ * 400/401/403/404（配置/模型名级错误）不退避立即换源。
+ * [locked-change] 2026-09-02 P0：单源 deepseek 调用器扩展为 Kimi 链派发器。
  */
-import { readFileSync, writeFileSync } from 'node:fs'
+import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
 import { homedir } from 'node:os'
-import { join } from 'node:path'
-
-const cfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
-const prov = cfg.provider['8ad55776-2296-4f1a-bc46-05755c8f1300']
-if (!prov) throw new Error('deepseek provider 未配置')
-const baseURL = prov.options.baseURL.replace(/\/$/, '')
-const apiKey = prov.options.apiKey
-const model = Object.keys(prov.models)[0]
-
-const promptPath = process.argv[2]
-const outPath = process.argv[3]
-if (!promptPath) throw new Error('用法: node ds-call.mjs <prompt文件> [输出文件]')
-const prompt = readFileSync(promptPath, 'utf8')
+import { join, dirname } from 'node:path'
+import { fileURLToPath } from 'node:url'
 
-for (let attempt = 0; attempt < 4; attempt++) {
-  try {
-    const res = await fetch(`${baseURL}/chat/completions`, {
+const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'model-routing-log.jsonl')
+const SYS_PROMPT =
+  '你是一名对抗式代码审查员(门一)。你的职责是找出实现与票面规约的偏差、边界缺陷、静默失败与测试盲区。' +
+  '只报告有代码证据支撑的问题,每条给出文件:行号或代码摘录。不确定的明确说不确定。用中文输出。'
+const RETRYABLE = (s) => s === 429 || s >= 500
+const NO_RETRY = (s) => s === 400 || s === 401 || s === 403 || s === 404
+
+// ── 源表：uuid 前缀锚定 config.json 条目（条目级校验防 config 重排后静默错源） ──
+const SOURCE_DEFS = [
+  { alias: 'kimi-main', uuid: 'b2466f8b', expectName: 'Kimi', kind: 'anthropic', note: 'K3 企业版主源' },
+  { alias: 'kimi-backup', uuid: '5e1abd9d', expectName: 'zipoo', kind: 'anthropic', note: '第二配额同端点备源' },
+  { alias: 'deepseek', uuid: '8ad55776', expectName: '梁圣', kind: 'openai', note: '审计兜底（套餐外按量）' },
+]
+
+function loadSources() {
+  const cfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
+  return SOURCE_DEFS.map((def) => {
+    const [, prov] =
+      Object.entries(cfg.provider || {}).find(([id, p]) => id.startsWith(def.uuid) && p && p.name === def.expectName) || []
+    if (!prov) return { ...def, ok: false, err: `provider ${def.uuid}(${def.expectName}) 未配置或 name 不符` }
+    return {
+      ...def,
+      ok: true,
+      baseURL: prov.options.baseURL.replace(/\/$/, ''),
+      apiKey: prov.options.apiKey,
+      model: Object.keys(prov.models)[0],
+      modelName: Object.values(prov.models)[0]?.name || Object.keys(prov.models)[0],
+    }
+  })
+}
+
+// ── 双形态请求构造（Kimi 条目 kind=anthropic → /v1/messages；deepseek kind=openai → /chat/completions） ──
+// anthropic 路径规范化（2026-09-02 用户修复后适配）：config baseURL 两种形态
+// （…/coding 或 …/coding/v1）都先剥尾 /v1 再统一拼 /v1/messages——与 zcode
+// 客户端对 kind=anthropic 的拼装语义对齐（旧形态 coding/v1 实调过、新形态
+// coding+/v1/messages 等价同路径）。
+function buildRequest(src, prompt) {
+  if (src.kind === 'anthropic') {
+    const base = src.baseURL.replace(/\/v1$/, '')
+    return {
+      url: `${base}/v1/messages`,
       method: 'POST',
-      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
-      body: JSON.stringify({
-        model,
-        messages: [
-          { role: 'system', content: '你是一名对抗式代码审查员(门一)。你的职责是找出实现与票面规约的偏差、边界缺陷、静默失败与测试盲区。只报告有代码证据支撑的问题,每条给出文件:行号或代码摘录。不确定的明确说不确定。用中文输出。' },
-          { role: 'user', content: prompt }
-        ],
+      headers: {
+        'content-type': 'application/json',
+        'x-api-key': '<' + src.apiKey.length + 'chars>',
+        'anthropic-version': '2023-06-01',
+      },
+      headersReal: { 'content-type': 'application/json', 'x-api-key': src.apiKey, 'anthropic-version': '2023-06-01' },
+      body: {
+        model: src.modelName,
+        max_tokens: 32768,
         temperature: 0.2,
-        max_tokens: 32768
-      }),
-      signal: AbortSignal.timeout(600_000)
-    })
-    if (res.status === 429 || res.status >= 500) {
+        system: SYS_PROMPT,
+        messages: [{ role: 'user', content: prompt }],
+      },
+    }
+  }
+  return {
+    url: `${src.baseURL}/chat/completions`,
+    method: 'POST',
+    headers: { 'content-type': 'application/json', Authorization: 'Bearer <' + src.apiKey.length + 'chars>' },
+    headersReal: { 'Content-Type': 'application/json', Authorization: `Bearer ${src.apiKey}` },
+    body: {
+      model: src.modelName,
+      messages: [
+        { role: 'system', content: SYS_PROMPT },
+        { role: 'user', content: prompt },
+      ],
+      temperature: 0.2,
+      max_tokens: 32768,
+    },
+  }
+}
+
+// ── 双形态响应解析：归一化 {text, usage:{in,out}, finish} ──
+function parseResponse(src, data) {
+  if (src.kind === 'anthropic') {
+    const text = Array.isArray(data.content)
+      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
+      : ''
+    return { text, usage: { in: data.usage?.input_tokens, out: data.usage?.output_tokens }, finish: data.stop_reason }
+  }
+  const msg = data.choices?.[0]?.message || {}
+  let text = msg.content || ''
+  if (!text && msg.reasoning_content) text = '[仅推理无正文,finish=' + data.choices?.[0]?.finish_reason + ']\n' + msg.reasoning_content
+  return {
+    text,
+    usage: { in: data.usage?.prompt_tokens, out: data.usage?.completion_tokens },
+    finish: data.choices?.[0]?.finish_reason,
+  }
+}
+
+// ── 事件流水账（append，逐事件一行；换源/欠账/用量可指认） ──
+const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6)
+function logEvent(event, fields) {
+  appendFileSync(
+    LOG_PATH,
+    JSON.stringify({ ts: new Date().toISOString(), runId, event, ...fields }) + '\n',
+    'utf8',
+  )
+}
+
+// ── 单源调用：源内退避 3 次，耗尽/不可重试 → 抛错由链换源 ──
+async function callSource(src, prompt, { record = true } = {}) {
+  const req = buildRequest(src, prompt)
+  const t0 = Date.now()
+  for (let attempt = 0; attempt < 4; attempt++) {
+    if (record) logEvent('attempt', { source: src.alias, model: src.modelName, attempt: attempt + 1, promptBytes: Buffer.byteLength(prompt, 'utf8') })
+    try {
+      const res = await fetch(req.url, {
+        method: req.method,
+        headers: req.headersReal,
+        body: JSON.stringify(req.body),
+        signal: AbortSignal.timeout(600_000),
+      })
+      if (RETRYABLE(res.status)) {
+        const wait = 5000 * 2 ** attempt
+        console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
+        await new Promise((r) => setTimeout(r, wait))
+        continue
+      }
+      if (!res.ok) {
+        const detail = (await res.text()).slice(0, 300)
+        if (NO_RETRY(res.status)) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { fatal: true })
+        if (attempt === 3) throw new Error(`HTTP ${res.status}: ${detail}`)
+        const wait = 5000 * 2 ** attempt
+        console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms`)
+        await new Promise((r) => setTimeout(r, wait))
+        continue
+      }
+      const data = await res.json()
+      const { text, usage, finish } = parseResponse(src, data)
+      if (!text) throw Object.assign(new Error('空响应 finish=' + finish + ' usage=' + JSON.stringify(usage)), { fatal: true })
+      if (record) logEvent('ok', { source: src.alias, model: src.modelName, usage, latencyMs: Date.now() - t0, finish })
+      return { text, usage, latencyMs: Date.now() - t0 }
+    } catch (e) {
+      if (e.fatal || attempt === 3) {
+        if (record) logEvent('switch', { source: src.alias, model: src.modelName, error: e.message.slice(0, 300), latencyMs: Date.now() - t0 })
+        throw e
+      }
       const wait = 5000 * 2 ** attempt
-      console.error(`[ds] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
-      await new Promise(r => setTimeout(r, wait))
-      continue
+      console.error(`[${src.alias}] ${e.message},退避 ${wait}ms`)
+      await new Promise((r) => setTimeout(r, wait))
     }
-    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
-    const data = await res.json()
-    const msg = data.choices?.[0]?.message || {}
-    const finish = data.choices?.[0]?.finish_reason
-    let text = msg.content || ''
-    if (!text && msg.reasoning_content) text = '[仅推理无正文,finish=' + finish + ']\n' + msg.reasoning_content
-    if (!text) throw new Error('空响应 finish=' + finish + ' usage=' + JSON.stringify(data.usage))
-    if (outPath) writeFileSync(outPath, text, 'utf8')
-    console.log(text)
+  }
+  throw new Error('unreachable')
+}
+
+// ── CLI ──
+const argv = process.argv.slice(2)
+const listOnly = argv.includes('--list-sources')
+const dryRun = argv.includes('--dry-run')
+let onlyAlias = null
+if (argv.includes('--source')) onlyAlias = argv[argv.indexOf('--source') + 1]
+const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--source')
+
+const sources = loadSources()
+if (listOnly) {
+  console.log('源序（references/06 §5 状态机；主源不得主动跳过）：')
+  sources.forEach((s, i) => {
+    console.log(
+      `  ${i + 1}. ${s.ok ? s.alias : s.alias + '(不可用)'} | ${s.ok ? s.modelName : ''} | ${s.ok ? s.kind + ' @ ' + s.baseURL : s.err} | ${s.note}`,
+    )
+  })
+  process.exit(sources.some((s) => !s.ok) ? 1 : 0)
+}
+
+const promptPath = positional[0]
+const outPath = positional[1]
+if (!promptPath) throw new Error('用法: node ds-call.mjs [--dry-run] [--source <alias>] <prompt文件> [输出文件]')
+const prompt = readFileSync(promptPath, 'utf8')
+
+const chain = onlyAlias ? sources.filter((s) => s.alias === onlyAlias) : sources.filter((s) => s.ok)
+if (chain.length === 0) throw new Error(onlyAlias ? `未知或不可用源: ${onlyAlias}` : '无可用源')
+
+if (dryRun) {
+  console.log(`runId=${runId} 源序=${chain.map((s) => s.alias).join(' → ')}`)
+  for (const s of chain) {
+    const req = buildRequest(s, prompt)
+    const bodyPeek = { ...req.body }
+    if (bodyPeek.messages) bodyPeek.messages = `<${req.body.messages.length} 条,首条内容 ${Buffer.byteLength(prompt, 'utf8')}B>`
+    if (bodyPeek.system) bodyPeek.system = '<' + SYS_PROMPT.length + ' chars>'
+    console.log(`\n── ${s.alias} (${s.kind}) ──\n${req.method} ${req.url}\nheaders=${JSON.stringify(req.headers)}\nbody=${JSON.stringify(bodyPeek)}`)
+  }
+  console.log(`\n事件流水账=${LOG_PATH}${existsSync(LOG_PATH) ? '（已存在,append）' : '（新建）'}`)
+  process.exit(0)
+}
+
+let switches = 0
+for (let i = 0; i < chain.length; i++) {
+  const s = chain[i]
+  try {
+    console.error(`[routing] run=${runId} 尝试源 ${i + 1}/${chain.length}: ${s.alias}(${s.modelName})`)
+    const { text, usage, latencyMs } = await callSource(s, prompt)
+    const header = `[routing]: run=${runId} source=${s.alias} model=${s.modelName} switches=${switches} usage=in=${usage.in ?? '?'},out=${usage.out ?? '?'} latency=${latencyMs}ms (by ds-call.mjs 链)\n\n`
+    if (outPath) writeFileSync(outPath, header + text, 'utf8')
+    console.log(header + text)
     process.exit(0)
   } catch (e) {
-    if (attempt === 3) { console.error('[ds] 失败:', e.message); process.exit(1) }
-    const wait = 5000 * 2 ** attempt
-    console.error(`[ds] ${e.message},退避 ${wait}ms`)
-    await new Promise(r => setTimeout(r, wait))
+    switches++
+    if (i === chain.length - 1) {
+      logEvent('exhaust', { chain: chain.map((x) => x.alias).join('→'), error: e.message.slice(0, 300) })
+      console.error(`[routing] 全源尽(${chain.map((x) => x.alias).join('→')}): ${e.message}——主控按"同源审计欠账"处置`)
+      process.exit(2)
+    }
+    console.error(`[routing] 换源 ${s.alias} → ${chain[i + 1].alias}: ${e.message.slice(0, 200)}`)
   }
 }
diff --git a/scripts/audits/f-r2-diag2.mjs b/scripts/audits/f-r2-diag2.mjs
new file mode 100644
index 000000000..58e3bea64
--- /dev/null
+++ b/scripts/audits/f-r2-diag2.mjs
@@ -0,0 +1,58 @@
+/**
+ * F-R2 回炉诊断（主控压缩票）：e2e 同款默认档下 effectiveZoom 比值法 vs
+ * computed zoom 链乘积 的量测差——「划选高亮重开原位 3.45px」污染假设实证。
+ * 产物：scripts/audits/f-r2-out/f-r2-diag2.json
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, rm } from 'node:fs/promises'
+import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const OUT = join(process.cwd(), 'scripts', 'audits', 'f-r2-out')
+mkdirSync(OUT, { recursive: true })
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), 'synapse-f-r2-diag2')
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+await win.getByRole('button', { name: '文献库' }).click()
+await win.waitForTimeout(1000)
+await win.locator('button.lib-card').first().dblclick()
+await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
+await win.waitForTimeout(1500)
+
+const diag = await win.evaluate(`(() => {
+  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const g = sc.getBoundingClientRect()
+  const ratioZ = g.height / sc.clientHeight
+  const chain = []
+  let z = 1
+  let el = sc
+  while (el) {
+    const cz = getComputedStyle(el).zoom
+    const num = Number(cz)
+    const layer = { tag: el.tagName, cls: String(el.className).slice(0, 30), cssZoom: cz, num: Number.isFinite(num) ? num : 1 }
+    chain.push(layer)
+    z *= layer.num
+    el = el.parentElement
+  }
+  return {
+    gbcH: g.height, clientH: sc.clientHeight, offsetH: sc.offsetHeight,
+    ratioZ, chainZ: z, eps: ratioZ - 1,
+    chain,
+    scrollW: sc.scrollWidth, clientW: sc.clientWidth,
+    hasHScrollbar: sc.scrollWidth > sc.clientWidth,
+  }
+})()`)
+writeFileSync(join(OUT, 'f-r2-diag2.json'), JSON.stringify(diag, null, 1), 'utf8')
+console.log(JSON.stringify({ gbcH: diag.gbcH, clientH: diag.clientH, ratioZ: diag.ratioZ, eps: diag.eps, chainZ: diag.chainZ, hasHScrollbar: diag.hasHScrollbar, zoomLayers: diag.chain.filter((c) => c.num !== 1) }, null, 1))
+await app.close()
diff --git a/scripts/audits/f-r2-probe.mjs b/scripts/audits/f-r2-probe.mjs
new file mode 100644
index 000000000..2d76fde91
--- /dev/null
+++ b/scripts/audits/f-r2-probe.mjs
@@ -0,0 +1,193 @@
+/**
+ * F-R2 修票前置真机探针（v18 U1——H1/H2/H3/H4/H5 判据实证）。
+ * 复用：f-l2-precheck 库副本+--ui-scale DOM 覆写范式 / f-r1-dbg 开文献链。
+ * P1 语义探针（H5/H1 前置）：scrollTop+=100 的 Δst 与内容节点视觉位移 Δvis。
+ * P2 落点探针（H1 主判据）：三档 × {fill(1),fill(4),下一页→页5}，记 {s_before,δv,s_after,落点偏移}
+ *     判据：Z≠1 档 dSt≈δv（实加视觉量而非 δv/Z）且落点偏移随 δv 放大；Z=1 档基线偏移≈0。
+ *     附 overflowAnchor='none' 对照组（H4 排除：漂移不变→锚定无关）。
+ * P3 页码误判带（H2）：1.25 档全文档 40px 步进扫 {s, inputPage, trueCenterPage}，聚连续误判段带宽
+ *     （每步 sleep 40ms 让 React 受控 input 回显——scroll→store→render 链）。
+ * P4 zoom 往返锚（H3）：置中 → ＋→− 各一次 ×3 cycle，|Δst| 两档对照。
+ * 产物：scripts/audits/f-r2-out/{f-r2-probe.json, P2-landfill4-large.png}
+ * 禁改用户 settings.json（档位全 DOM 覆写）；真实库副本运行。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-r2-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-r2probe ${new Date().toISOString().slice(11, 19)}]`, ...a)
+const r2 = (x) => Math.round(x * 100) / 100
+
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), 'synapse-f-r2-probe')
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+await win.getByRole('button', { name: '文献库' }).click()
+await win.waitForTimeout(1000)
+await win.locator('button.lib-card').first().dblclick()
+await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
+await win.waitForTimeout(1500)
+
+const pageErrors = []
+win.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
+
+const INPUT = 'input[aria-label="跳转到页"]'
+const R_FN = 'const r=(x)=>Math.round(x*100)/100;'
+const evalJS = (expr) => win.evaluate(`(async () => { ${R_FN} ${expr} })()`)
+
+const setScale = async (z) => {
+  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
+  await win.waitForTimeout(600)
+}
+const jump = async (kind, arg) => {
+  if (kind === 'fill') {
+    await win.locator(INPUT).fill(String(arg))
+    await win.locator(INPUT).press('Enter')
+  } else if (kind === 'next') {
+    await win.getByRole('button', { name: '下一页' }).click()
+  }
+  await win.waitForTimeout(700)
+}
+// 目标页盒：视觉差（相对滚动容器顶）+当时 scrollTop
+const measureAround = (targetBox) => evalJS(`
+  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const sr = sc.getBoundingClientRect()
+  const b = document.querySelector('[data-page-box="${targetBox}"]')
+  if (!b) return { missing: true }
+  const br = b.getBoundingClientRect()
+  return { deltaV: r(br.top - sr.top), boxH: r(br.height), st: r(sc.scrollTop) }
+`)
+
+const R = { meta: { script: 'f-r2-probe.mjs', date: new Date().toISOString() }, p1: null, tiers: {}, p3: null, p4: {} }
+
+// ── P1 语义探针（1.25 档）：scrollTop+=100 → Δst / Δvis ──
+await setScale('1.25')
+await jump('fill', 1)
+R.p1 = await evalJS(`
+  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const mark = document.querySelector('[data-page-box="2"]') || document.querySelector('[data-page-box="1"]')
+  const before = { st: r(sc.scrollTop), vis: r(mark.getBoundingClientRect().top) }
+  sc.scrollTop += 100
+  const after = { st: r(sc.scrollTop), vis: r(mark.getBoundingClientRect().top) }
+  return { before, after, dSt: r(after.st - before.st), dVis: r(before.vis - after.vis),
+    zRow: getComputedStyle(sc.closest('.app-content-row') ?? sc).zoom, zSelf: getComputedStyle(sc).zoom }
+`)
+log('P1 语义:', JSON.stringify(R.p1))
+
+// ── P2 落点探针：三档 × 三跳 ──
+const SEQUENCE = [
+  { kind: 'fill', arg: 1, box: 1 },
+  { kind: 'fill', arg: 4, box: 4 },
+  { kind: 'next', arg: null, box: 5 },
+]
+const runSeq = async () => {
+  const hops = []
+  for (const step of SEQUENCE) {
+    const pre = await measureAround(step.box)
+    const sBefore = pre.missing ? null : pre.st
+    const deltaV = pre.missing ? null : pre.deltaV
+    await jump(step.kind, step.arg)
+    const post = await measureAround(step.box)
+    hops.push({
+      hop: `${step.kind}${step.arg ?? ''}`, box: step.box,
+      sBefore, deltaV, sAfter: post.missing ? null : post.st,
+      dSt: sBefore != null && post.st != null ? r2(post.st - sBefore) : null,
+      landOffset: post.missing ? null : post.deltaV,
+      missingPre: !!pre.missing, boxH: post.boxH,
+    })
+  }
+  return hops
+}
+for (const [tier, z] of [['small_1', '1'], ['medium_1.1', '1.1'], ['large_1.25', '1.25']]) {
+  await setScale(z)
+  const hops = await runSeq()
+  R.tiers[tier] = { z, hops }
+  log(`P2 ${tier}:`, JSON.stringify(hops.map((h) => [h.hop, h.dSt, h.deltaV, h.landOffset])))
+}
+// H4 对照组：1.25 档 overflowAnchor=none 重跑
+await setScale('1.25')
+await evalJS(`const sc=document.querySelector('[data-page-column]')?.closest('.overflow-auto'); sc.style.overflowAnchor='none'; return sc.style.overflowAnchor`)
+R.tiers['large_1.25_anchorNone'] = { z: '1.25', overflowAnchorNone: true, hops: await runSeq() }
+log('P2 anchorNone:', JSON.stringify(R.tiers['large_1.25_anchorNone'].hops.map((h) => [h.hop, h.dSt, h.landOffset])))
+await evalJS(`document.querySelector('[data-page-column]')?.closest('.overflow-auto')?.style.removeProperty('overflow-anchor'); return 1`)
+
+// ── P3 页码误判带（H2，1.25 档）：40px 步进全景扫描 ──
+await setScale('1.25')
+await jump('fill', 1)
+R.p3 = await evalJS(`
+  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const input = document.querySelector('input[aria-label="跳转到页"]')
+  const sr = sc.getBoundingClientRect()
+  const sleep = (ms) => new Promise((rf) => setTimeout(rf, ms))
+  const samples = []
+  const step = 40
+  for (let s = 0; s <= sc.scrollHeight - sc.clientHeight; s += step) {
+    sc.scrollTop = s
+    await sleep(40)
+    const cy = sr.top + sr.height / 2
+    let tp = null
+    for (const bb of document.querySelectorAll('[data-page-box]')) {
+      const g = bb.getBoundingClientRect()
+      if (cy >= g.top && cy < g.bottom) { tp = Number(bb.dataset.pageBox); break }
+    }
+    samples.push({ s: r(s), input: input ? Number(input.value) : null, true: tp })
+  }
+  const mismatch = []
+  let run = null
+  for (const smp of samples) {
+    if (smp.input !== smp.true) { if (!run) run = { from: smp.s, to: smp.s, n: 0, input: smp.input, true: smp.true }; run.to = smp.s; run.n++ }
+    else if (run) { mismatch.push(run); run = null }
+  }
+  if (run) mismatch.push(run)
+  return { step, total: samples.length, mismatchBands: mismatch, sampleHead: samples.slice(0, 3) }
+`)
+log('P3 误判带:', JSON.stringify(R.p3.mismatchBands))
+
+// ── P4 zoom 往返锚（H3）：置中 → ＋→− ×3 cycle，两档对照 ──
+for (const [tier, z] of [['small_1', '1'], ['large_1.25', '1.25']]) {
+  await setScale(z)
+  R.p4[tier] = await evalJS(`
+    const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+    const zl = document.querySelector('[data-testid="zoom-label"]')
+    const minus = zl ? zl.previousElementSibling : null
+    const plus = zl ? zl.nextElementSibling : null
+    if (!plus || !minus) return { error: 'zoom 按钮未找到' }
+    const sleep = (ms) => new Promise((rf) => setTimeout(rf, ms))
+    sc.scrollTop = Math.floor((sc.scrollHeight - sc.clientHeight) / 2)
+    await sleep(400)
+    const cycles = []
+    for (let i = 0; i < 3; i++) {
+      const st0 = sc.scrollTop
+      plus.click(); await sleep(700)
+      minus.click(); await sleep(700)
+      cycles.push({ st0: r(st0), st1: r(sc.scrollTop), d: r(sc.scrollTop - st0), zoom: zl.textContent })
+    }
+    return { cycles, scrollH: sc.scrollHeight, clientH: sc.clientHeight }
+  `)
+  log(`P4 ${tier}:`, JSON.stringify(R.p4[tier].cycles?.map((c) => c.d)))
+}
+
+// 落点错位视觉证据（1.25 档 fill(4) 落点实况）
+await setScale('1.25')
+await jump('fill', 4)
+await win.screenshot({ path: join(OUT, 'P2-landfill4-large.png'), fullPage: false })
+
+R.meta.pageErrors = pageErrors
+writeFileSync(join(OUT, 'f-r2-probe.json'), JSON.stringify(R, null, 1), 'utf8')
+log('落盘:', join(OUT, 'f-r2-probe.json'), ' pageErrors=', pageErrors.length)
+await app.close()
diff --git a/scripts/audits/f-r2-probe2.mjs b/scripts/audits/f-r2-probe2.mjs
new file mode 100644
index 000000000..c5e92f301
--- /dev/null
+++ b/scripts/audits/f-r2-probe2.mjs
@@ -0,0 +1,73 @@
+/**
+ * F-R2 P3b 补测（H2 页码误判——P3 直设 scrollTop 与懒渲染回收交互失效后的
+ * 真实链补测）：三档 × fill(2..6)，走真实页码跳转链，读 {inputPage, 真视口中心页}。
+ * 真中心页=视口中心 elementFromPoint 上溯 [data-page-box]（中心落间隙时 gBCR 盒比较兜底）。
+ * 产物：scripts/audits/f-r2-out/f-r2-probe2.json（并入 U1 证据链）
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-r2-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-r2p3b ${new Date().toISOString().slice(11, 19)}]`, ...a)
+
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), 'synapse-f-r2-p3b')
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+await win.getByRole('button', { name: '文献库' }).click()
+await win.waitForTimeout(1000)
+await win.locator('button.lib-card').first().dblclick()
+await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
+await win.waitForTimeout(1500)
+
+const INPUT = 'input[aria-label="跳转到页"]'
+const evalJS = (expr) => win.evaluate(`(async () => { const r=(x)=>Math.round(x*100)/100; ${expr} })()`)
+const R = { meta: { script: 'f-r2-probe2.mjs', date: new Date().toISOString() }, tiers: {} }
+
+for (const [tier, z] of [['small_1', '1'], ['medium_1.1', '1.1'], ['large_1.25', '1.25']]) {
+  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
+  await win.waitForTimeout(600)
+  const rows = []
+  for (const p of [2, 3, 4, 5, 6]) {
+    await win.locator(INPUT).fill(String(p))
+    await win.locator(INPUT).press('Enter')
+    await win.waitForTimeout(700)
+    const m = await evalJS(`
+      const input = document.querySelector('input[aria-label="跳转到页"]')
+      const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+      const sr = sc.getBoundingClientRect()
+      const cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2
+      const hit = document.elementFromPoint(cx, cy)?.closest('[data-page-box]')
+      let truePage = hit ? Number(hit.dataset.pageBox) : null
+      if (truePage === null) {
+        for (const bb of document.querySelectorAll('[data-page-box]')) {
+          const g = bb.getBoundingClientRect()
+          if (cy >= g.top && cy < g.bottom) { truePage = Number(bb.dataset.pageBox); break }
+        }
+      }
+      return { input: input ? Number(input.value) : null, true: truePage, st: r(sc.scrollTop) }
+    `)
+    rows.push({ target: p, ...m, mismatch: m.input !== m.true })
+  }
+  R.tiers[tier] = rows
+  log(tier, JSON.stringify(rows.map((x) => [x.target, x.input, x.true, x.mismatch])))
+}
+
+writeFileSync(join(OUT, 'f-r2-probe2.json'), JSON.stringify(R, null, 1), 'utf8')
+log('落盘:', join(OUT, 'f-r2-probe2.json'))
+await app.close()
diff --git a/scripts/audits/f-r2-ticket.md b/scripts/audits/f-r2-ticket.md
new file mode 100644
index 000000000..1eeb67780
--- /dev/null
+++ b/scripts/audits/f-r2-ticket.md
@@ -0,0 +1,57 @@
+# F-R2 工单票面——ui-scale≠1 程序滚动落点漂移（修票·五层规约=完整任务书）
+
+> registry: `F-R2` / file `src/renderer/features/reader/scroll-converge.ts` / area reader / strong
+> 依据链：台账 F-R2 段（audit0-findings 350-358）+ 排查报告 f-r2-explore-report.md + 真机探针 f-r2-out/{f-r2-probe,f-r2-probe2}.json（2026-09-02 本场）
+> 主控已裁决项见③——实现者不再自裁这些点。
+
+## ① 现象与根因证据（探针实测，实现者不必重跑）
+
+**现象**：ui-scale≠1（用户 large=1.25）时程序滚动（页码跳转/翻页）落点漂移 160-450px；单页同现；ui-scale=1 完美收敛。
+
+**根因（H1，探针三场景三档数值级闭合）**：`scroll-converge.ts:48-49` 把 gBCR 视觉差值 δv 1:1 加进本地 px 的 scrollTop——「1 gBCR px=1 scrollTop px」仅 Z=1 成立。祖先 `.app-content-row` zoom=Z（theme.css 反向豁免挂内容侧），gBCR=本地×Z，scrollTop 读写皆本地（P1 实证：scrollTop+=100 → Δst=99.84 / 内容视觉位移 Δvis=124.8；zRow=1.25/zSelf=1）。落点视觉过冲=(Z−1)×δv。
+
+**判据数据（fill(4) 场景）**：
+
+| 档 | δv（视觉） | dSt 实测 | 预测(H1: dSt≈δv) | 落点偏移实测 | 预测 −(Z−1)δv |
+| --- | --- | --- | --- | --- | --- |
+| 1.0 | 2034 | 2034.4 | ✓ | −0.4 | ≈0 ✓ |
+| 1.1 | 2047.2 | 2047.27 | ✓ | −204.8 | −204.7 ✓ |
+| 1.25 | 2049 | 2049.28 | ✓ | −512.6 | −512.25 ✓ |
+
+fill(1) 向上跳经 clamp 推演同吻合（1.25 档 δv=(12−s_before)×1.25=−3161，实加 Δ=δv 冲负被 clamp 0=页1顶）。overflowAnchor=none 对照组逐位一致（H4 排除）；P1 语义排除 H5；zoom±往返三 cycle 两档 Δst=0（**H3 证伪——anchoredScrollTop 分母错配本批不修，备案 v19**）。
+
+**H2（同根族，P3b 实证可感面）**：`scroll-progress.ts:283-291` getPageBoxes 把视觉盒位（r.top−base.top）与本地 scrollTop 混算——1.25 档实测 fill(2) 真中心页=1、fill(3) 真中心页=4（「页码说 2、画面看页 1」）；1/1.1 档全对。静态机制见排查报告②段。
+
+**已知旁支（本批不修，申报不扩面）**：「下一页」按钮路径 dSt≠δv（1.25 档 293.76 vs 165.4）——独立形态，修复 H1 后真机复验时一并观测记录，不解析不扩面（门审裁归后续）。
+
+## ② 修复方案（主控裁决=方案 B 算术折算，非方案 A 结构归一）
+
+否决 A（豁免上提滚动容器一行 CSS）：连带面大（fitWidth 分母回退+selection-geometry 参照系+自 zoom 容器滚动条语义三处既有修复交互），真机核验面反而更大；B 与既有先例（`ReaderPage.tsx:146-151` fitWidth 同式推导 z）模式一致，单测可锚。
+
+**B-1 主修（H1）**：`scroll-converge.ts` scrollIntoNearestScroller 的 start 分支：`raw = scroller.scrollTop + (elRect.top − scRect.top) / z`；center 分支的 `clientHeight` 项本就本地空间**不动**，其 elRect 侧同样除 z（保持分子同空间）。z 来源=**新单源导出**（见③-1）。:50 clamp 保持本地口径不动。
+**B-2 同批（H2）**：`scroll-progress.ts` getPageBoxes：`top = (r.top − base.top) / z + el.scrollTop`，height 同除（保 nearestPage 距离比较同空间）。z 传参或经单源函数取。
+**B-3 备案不修**：`PageColumn.tsx:209-214` anchoredScrollTop 分母空间错配——H3 实测证伪（零漂移），无用户可感缺陷，代码债在档 v19。
+
+## ③ 主控裁决（实现者照办，不再自裁）
+
+1. **折算因子单源**：新导出 `effectiveZoom(scroller): number`（或等名）放 scroll-converge.ts 并导出——`z = scroller.getBoundingClientRect().height / scroller.clientHeight`；**guard 除零**（clientHeight=0 的 jsdom/未挂载态返回 1）；Z=1 时恒等 1=零行为变。B-2 从 scroll-progress 引用同一函数（禁两处各写）。语义=「该滚动容器的 gBCR 视觉高 / 本地 client 高」=祖先复合 zoom 总因子。
+2. **函数签名/导出面零破坏**：scrollIntoNearestScroller 既有导出签名不动（内部折算）；scroll-converge.test 既有桩接口兼容。
+3. **INV 语义不变**：INV-34（最近祖先+夹取唯一收敛）语义原样——本票仅量纲修正；INV-33/45 不触碰。修复落地后在 docs/invariants.md INV-34 条目补一行「视觉/本地空间折算（F-R2）」附注（登记动作归主控收口，实现者不改 invariants.md——受锁）。
+4. **「下一页」旁支**：真机复验时记录修复后 next 场景数值（dSt/δv/落点偏移三档）入实现报告，不扩面修。
+
+## ④ 测试规约（TDD 红→绿→断言级变异红证）
+
+- **先红（核心）**：`scroll-converge.test.ts` 增「视觉/本地=1.25 桩」用例——gBCR 桩值按视觉空间（本地×1.25）、clientHeight 桩按本地，断言落点=本地折算期望（现有实现必红：它不除 z）。同型 1.1 档或 z 由桩推出者至少 2 例。
+- **先红（B-2）**：`scroll-progress.test.ts` getPageBoxes/centerPage 增混合空间桩用例（视觉盒位+本地 scrollTop），断言 nearestPage 按折算空间判出（现有实现必红）。
+- **受锁改写纪律**：两测试文件均为受锁——头注 `[locked-change]` 一行（F-A4/F-N1 先例）+断言锚保持（既有用例语义不放宽）；改后全量 verify 铁律。
+- **变异红证清单**（每条先红后还原，备份法禁 git checkout）：M1=去掉 /z（回退 H1 原形态）→新用例红；M2=z guard 恒返 1（折算失效同型）→新用例红；M3=B-2 的 height 不除→nearestPage 距离用例红；M4=clamp 口径误除 z→若可锚则红（不可锚则申报理由）。
+- **e2e**：reader-scroll.spec 默认 profile uiScale=1——两案下行为不变=回归护栏，跑全量确认零必然红；若改 e2e 面须另行申报（预期零触碰）。
+- **基线数字**：verify=126 文件 1074 用例全绿 / locks=226。
+
+⑤e 合法数据形态可达性推演（公式类票面强制）：z 表达式在既有不变量约束下可达——INV-34 保证 scroller=最近滚动祖先（getBoundingClientRect/.clientHeight 恒可读）；合法 uiScale∈{1,1.1,1.25}×zoom∈[0.5,3] 全组合 z>0；clientHeight=0 仅 jsdom 未挂载/卸载瞬态（guard 返 1=退化旧行为，可测）；jsdom 桩同空间时 z=1 恒等（现有全部既有用例零破坏的数学保证）。单测夹具不得绕过——桩值显式区分视觉/本地两空间即本票红测核心。
+
+## ⑤ 验收与申报
+
+- 收口判据：新用例先红后绿+变异红证+全量 verify exit=0（126 文件，用例数随新增上浮如实报）+报告全文落 `scripts/audits/f-r2-impl.report.md`（实现摘要/文件清单/红证/测试证据/locks 实录/**自裁申报**（含删减面 diff 自查）/疑虑）。
+- 真机探针复验与视觉复评归主控（⑤f 同型——几何修复以探针数据复验：修复后 f-r2-probe.mjs 重跑，1.25 档 fill(4) 落点偏移 −512.6 → 与 1 档基线同量级（|偏移|≤5px），三档 dSt≈δv/z）。
+- 纪律：npm run test 禁裸 npx vitest；证据 `.raw.txt` 落盘；首红与每次变异原始输出各自落盘；多断言禁与行尾注释同置；禁新依赖；≤500 行；UTF-8；卡点=BLOCKED 停手不自裁。
diff --git a/scripts/audits/model-routing-log.jsonl b/scripts/audits/model-routing-log.jsonl
new file mode 100644
index 000000000..b37dd4773
--- /dev/null
+++ b/scripts/audits/model-routing-log.jsonl
@@ -0,0 +1,18 @@
+{"ts":"2026-09-01T17:33:23.540Z","runId":"20260901173323-bc13","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":1,"promptBytes":47}
+{"ts":"2026-09-01T17:33:31.493Z","runId":"20260901173323-bc13","event":"ok","source":"kimi-main","model":"kimi-k3","usage":{"in":170,"out":63},"latencyMs":7953,"finish":"end_turn"}
+{"ts":"2026-09-01T18:26:42.041Z","runId":"20260901182642-mlkn","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":1,"promptBytes":101377}
+{"ts":"2026-09-01T18:31:47.487Z","runId":"20260901182642-mlkn","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":2,"promptBytes":101377}
+{"ts":"2026-09-01T18:36:57.887Z","runId":"20260901182642-mlkn","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":3,"promptBytes":101377}
+{"ts":"2026-09-01T18:42:18.270Z","runId":"20260901182642-mlkn","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":4,"promptBytes":101377}
+{"ts":"2026-09-01T18:47:58.657Z","runId":"20260901182642-mlkn","event":"attempt","source":"kimi-backup","model":"kimi-k3","attempt":1,"promptBytes":101377}
+{"ts":"2026-09-01T18:51:50.214Z","runId":"20260901182642-mlkn","event":"ok","source":"kimi-backup","model":"kimi-k3","usage":{"in":0,"out":11206},"latencyMs":231557,"finish":"end_turn"}
+{"ts":"2026-09-01T19:10:49.944Z","runId":"20260901191049-whmu","event":"attempt","source":"deepseek","model":"deepseek-v4-flash","attempt":1,"promptBytes":13997}
+{"ts":"2026-09-01T19:12:36.843Z","runId":"20260901191049-whmu","event":"ok","source":"deepseek","model":"deepseek-v4-flash","usage":{"in":4693,"out":11200},"latencyMs":106899,"finish":"stop"}
+{"ts":"2026-09-01T23:20:30.008Z","runId":"20260901232030-p8of","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":1,"promptBytes":32}
+{"ts":"2026-09-01T23:20:30.273Z","runId":"20260901232030-p8of","event":"switch","source":"kimi-main","model":"kimi-k3","error":"HTTP 404: {\"error\":{\"message\":\"The requested resource was not found\",\"type\":\"resource_not_found_error\"}}","latencyMs":265}
+{"ts":"2026-09-01T23:20:30.279Z","runId":"20260901232030-p8of","event":"attempt","source":"kimi-backup","model":"kimi-k3","attempt":1,"promptBytes":32}
+{"ts":"2026-09-01T23:20:30.522Z","runId":"20260901232030-p8of","event":"switch","source":"kimi-backup","model":"kimi-k3","error":"HTTP 404: {\"error\":{\"message\":\"The requested resource was not found\",\"type\":\"resource_not_found_error\"}}","latencyMs":243}
+{"ts":"2026-09-01T23:20:30.527Z","runId":"20260901232030-p8of","event":"attempt","source":"deepseek","model":"deepseek-v4-flash","attempt":1,"promptBytes":32}
+{"ts":"2026-09-01T23:20:31.370Z","runId":"20260901232030-p8of","event":"ok","source":"deepseek","model":"deepseek-v4-flash","usage":{"in":157,"out":22},"latencyMs":843,"finish":"stop"}
+{"ts":"2026-09-01T23:21:12.644Z","runId":"20260901232112-284b","event":"attempt","source":"kimi-main","model":"kimi-k3","attempt":1,"promptBytes":32}
+{"ts":"2026-09-01T23:21:18.914Z","runId":"20260901232112-284b","event":"ok","source":"kimi-main","model":"kimi-k3","usage":{"in":166,"out":46},"latencyMs":6270,"finish":"end_turn"}
diff --git a/scripts/audits/p7a-ticket.md b/scripts/audits/p7a-ticket.md
new file mode 100644
index 000000000..de803d8f2
--- /dev/null
+++ b/scripts/audits/p7a-ticket.md
@@ -0,0 +1,24 @@
+# P7A 工单票面——e2e P7-A 剪贴板竞态 flake 专项（五层规约）
+
+> registry: `P7A` / file `tests/e2e/reader-text.spec.ts` / area e2e / strong
+> 依据：v18 §2 U2 + 台账 F-G10（492 行）+ 六场六现记录（F-A3/L2/L4/R1+v17 两现）。
+
+## ① 现象与根因
+`reader-text.spec.ts:550-567` P7-A test：`selectText → press('Control+c') → app.evaluate(({clipboard})=>clipboard.readText())` 断言 `toContain(PDF_KNOWN_TEXT)`。假红机制：读回的是**真实系统剪贴板**——e2e 运行期用户/系统其他进程占用剪贴板时，读到外部文本（写入链未落盘或写入后被覆盖）→ 断言红但非产品缺陷。六场六现已达专项立案线。
+
+## ② 修复方案（主控裁决=清场标记+条件重读，否决 mock 注入隔离——保留「真实系统剪贴板」集成语义，注释 :560 明示该语义是本测试价值）
+1. ctrl+c **之前**：`await app.evaluate(({ clipboard }) => clipboard.writeText('__p7a_cleared__'))`——清场标记（外部内容即被覆盖）。
+2. 读回改**条件重读循环**：最多 5 次 × 200ms 间隔读 `clipboard.readText()`——值含 `PDF_KNOWN_TEXT` 即断言过；值为 `'__p7a_cleared__'` 或空串=写入未落盘，继续轮询；轮询超时=真红。
+3. 诊断语义保留：超时失败信息里带末次读值（标记值→写入链断；其他值→外部再改写）——失败可归因。
+
+## ③ 主控裁决
+- 不引入任何 wait/hard sleep（轮询即条件等待）；不触碰该 spec 其他 test；`skipIfPending(P7A_DEPS)` 零变。
+- 断言锚不放宽：最终仍必须 `toContain(PDF_KNOWN_TEXT)`（重读是时序容忍不是断言弱化——门审攻击点预答）。
+
+## ④ 测试规约
+- 本票改动即测试本身（受锁 e2e spec）——头注 `[locked-change]` 一行+受锁改向先红纪律：**对 HEAD 先红实证**（用「故意断言外部文本」不可行——正确先红形态=变异法：临时把重读循环去掉+读回改 `writeText` 清场后立即读，断言在剪贴板被外部占用模拟下红）——实操按受锁改向三步先例（F-A4/F-N1）：对 HEAD 旧断言形态做「外部占用注入」红证（e2e 内 evaluate writeText 外部文本模拟用户占用→旧实现读到外部文本≠期望→红）证明旧形态真脆弱，再上新实现绿。
+- e2e 全量跑（29 条）+**连跑 3 次首跑即绿**（六场六现基线的稳定性判据，3 次全量）。
+- 全量 verify 铁律（playwright 不查类型，tsc 拦类型缺陷）。
+
+## ⑤ 验收与申报
+- registry 翻 done 归主控；报告落 `scripts/audits/p7a-impl.report.md`（含 3 次 e2e 运行原始输出落盘 `.raw.txt`）；自裁申报一切超票面决定；基线=verify 126 文件 1081 用例/locks 228。
diff --git a/src/renderer/features/reader/scroll-converge.ts b/src/renderer/features/reader/scroll-converge.ts
index 6a0084a4a..fc4b940ae 100644
--- a/src/renderer/features/reader/scroll-converge.ts
+++ b/src/renderer/features/reader/scroll-converge.ts
@@ -30,12 +30,33 @@ export function nearestScrollAncestor(el: HTMLElement): HTMLElement | null {
   return null
 }
 
+/** 折算因子单源（F-R2）：自 scroller 至 documentElement 逐层 computed zoom
+ *  链乘积（「1 gBCR px=1 scrollTop px」仅 z=1 成立——探针 P1 实证）。
+ *  量测口径（回炉 1 定案）：**禁用 gBCR/clientHeight 比值法**——gBCR 含横滚
+ *  动条+亚像素小数，真机实测 1.25 档即偏 ε≈0.0005（964.6/772=1.24948），
+ *  uiScale=1 档 ε 同型——恢复链落点偏移顶破「重开原位 ±2px」容差（e2e
+ *  3.45px 稳定红实证）；computed zoom=CSS 声明值直读，零几何污染。
+ *  'normal'/空/undefined（jsdom 不识别 zoom）→NaN→1 跳过；z=1 恒等=
+ *  零行为变。消费方：本件 scrollIntoNearestScroller + scroll-progress
+ *  measurePageBoxes（禁两处各写推导）。 */
+export function effectiveZoom(scroller: HTMLElement): number {
+  let z = 1
+  let el: HTMLElement | null = scroller
+  while (el !== null) {
+    z *= Number(getComputedStyle(el).zoom) || 1
+    el = el.parentElement
+  }
+  return z
+}
+
 /**
  * 程序滚动收敛：只滚 el 的最近滚动祖先（更外层零位移）。
- * - 'start'：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）
- * - 'center'：scrollTop += (elRect.top+h/2) − (scrollerRect.top+clientH/2)
- * 显式夹取 [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不
- * 模拟——显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
+ * - 'start'：scrollTop += (elRect.top − scrollerRect.top) / z（盒顶对齐视口顶）
+ * - 'center'：scrollTop += (elRect.top+h/2 − scrollerRect.top) / z − clientH/2
+ * elRect 侧=gBCR 视觉空间，除 z 折算回本地；clientHeight/scrollTop/clamp
+ * 均=本地空间不动（F-R2 量纲修正，INV-34 语义原样）。显式夹取
+ * [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不模拟——
+ * 显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
  * 对无滚动容器元素同为无操作）。
  */
 export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign): void {
@@ -43,9 +64,10 @@ export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign):
   if (scroller === null) return
   const elRect = el.getBoundingClientRect()
   const scRect = scroller.getBoundingClientRect()
+  const z = effectiveZoom(scroller)
   const raw =
     align === 'start'
-      ? scroller.scrollTop + (elRect.top - scRect.top)
-      : scroller.scrollTop + (elRect.top + elRect.height / 2) - (scRect.top + scroller.clientHeight / 2)
+      ? scroller.scrollTop + (elRect.top - scRect.top) / z
+      : scroller.scrollTop + (elRect.top + elRect.height / 2 - scRect.top) / z - scroller.clientHeight / 2
   scroller.scrollTop = Math.min(Math.max(raw, 0), Math.max(0, scroller.scrollHeight - scroller.clientHeight))
 }
diff --git a/src/renderer/features/reader/scroll-progress.ts b/src/renderer/features/reader/scroll-progress.ts
index 7e80207d0..f1c6dd288 100644
--- a/src/renderer/features/reader/scroll-progress.ts
+++ b/src/renderer/features/reader/scroll-progress.ts
@@ -46,6 +46,7 @@
 import { useEffect } from 'react'
 import type { RefObject } from 'react'
 import { nearestPage } from './PageColumn'
+import { effectiveZoom } from './scroll-converge'
 import { api } from '../../api/client'
 import { useReaderStore } from './reader.store'
 
@@ -270,6 +271,19 @@ export function createScrollProgress(deps: ScrollProgressDeps): ScrollProgress {
   }
 }
 
+/** 页盒几何量测（本地空间，F-R2 B-2）：gBCR 盒位/盒高经 effectiveZoom 折算
+ *  回本地空间后加 scrollTop——保 nearestPage 距离比较同空间（z 单源自
+ *  scroll-converge，禁两处各写）。z=1（jsdom 同空间桩/ui-scale=1）恒等
+ *  旧式。装配工厂与测试共用本单源。 */
+export function measurePageBoxes(el: HTMLElement): Array<{ top: number; height: number }> {
+  const base = el.getBoundingClientRect()
+  const z = effectiveZoom(el)
+  return Array.from(el.querySelectorAll<HTMLElement>('[data-page-box]')).map((box) => {
+    const r = box.getBoundingClientRect()
+    return { top: (r.top - base.top) / z + el.scrollTop, height: r.height / z }
+  })
+}
+
 /** 装配工厂：真实 deps（store/api 直连 + scrollAreaRef 量测页盒几何） */
 export function createReaderScrollProgress(
   scrollArea: RefObject<HTMLDivElement | null>
@@ -282,12 +296,7 @@ export function createReaderScrollProgress(
     },
     getPageBoxes: () => {
       const el = scrollArea.current
-      if (el === null) return []
-      const base = el.getBoundingClientRect()
-      return Array.from(el.querySelectorAll<HTMLElement>('[data-page-box]')).map((box) => {
-        const r = box.getBoundingClientRect()
-        return { top: r.top - base.top + el.scrollTop, height: r.height }
-      })
+      return el === null ? [] : measurePageBoxes(el)
     },
     // 程序滚动单口=store setPage 默认 'to'（INV-29 信号→PageColumn 段⑤执行）
     scrollToPage: (page) => useReaderStore.getState().setPage(page),
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 97e3cd16d..0428b7462 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -559,10 +559,22 @@ test('P7-A 复制：ctrl+c 将文本层选区写入系统剪贴板（ReaderShort
 
   // 程序化选区 + ctrl+c → 主进程 clipboard 模块读回断言（渲染进程 readText 无权限
   // ——NotAllowedError 实证；主进程读取即真实系统剪贴板，集成语义不打折）
+  // [P7A/locked-change] 剪贴板竞态防线（六场六现+2026-09-02 第七现实锤——系统
+  // 剪贴板被外部内容占用时读到外部文本假红，实测值=用户复制的文件名；先红
+  // 实证=p7a-red1.raw.txt 注入复刻）：①ctrl+c 前清场标记覆盖外部旧值；
+  // ②条件重读 5×200ms——值含期望文本即过；标记值/空串=写入未落盘继续轮询；
+  // 超时红且失败信息带末次读值（标记→写入链断；其他→外部再改写，可归因）。
+  // 断言锚不放宽（仍必须 toContain 期望文本）。
   await known.selectText()
+  await app.evaluate(({ clipboard }) => clipboard.writeText('__p7a_cleared__'))
   await win.keyboard.press('Control+c')
-  const clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
-  expect(clipped).toContain(PDF_KNOWN_TEXT)
+  let clipped = ''
+  for (let i = 0; i < 5; i++) {
+    clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
+    if (clipped.includes(PDF_KNOWN_TEXT)) break
+    await win.waitForTimeout(200)
+  }
+  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain(PDF_KNOWN_TEXT)
   await app.close()
 })
 
diff --git a/tests/unit/renderer/scroll-converge.test.ts b/tests/unit/renderer/scroll-converge.test.ts
index c86671e65..2d2b9f27f 100644
--- a/tests/unit/renderer/scroll-converge.test.ts
+++ b/tests/unit/renderer/scroll-converge.test.ts
@@ -4,11 +4,13 @@
  * ADR-0017 裁决 3——不经 guardedDescribe）。
  *
  * 覆盖：最近滚动祖先选取（含嵌套两滚动容器取最近）/start 数学（盒顶对齐）/
- * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）。
+ * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）/
+ * 视觉-本地双空间折算（F-R2：gBCR 视觉差值除 z 后进本地 scrollTop）。
  * jsdom 无布局：getBoundingClientRect/scrollHeight/clientHeight 全部桩值；
  * scrollTop 赋值 jsdom 不做浏览器级夹取——故实现显式夹取（本文件断言锚）。
  * 数学正确性在此锚定；消费方（PageColumn 段⑤/anchor-locate flashElement）
  * 只断言 (元素, 对齐) 调用形（受锁三文件，P6 口径）；行为终审=e2e。
+ * [F-R2] 双空间折算用例（受锁改写，[locked-change] 授权面）。
  */
 import { afterEach, describe, expect, it, vi } from 'vitest'
 import {
@@ -16,7 +18,8 @@ import {
   scrollIntoNearestScroller
 } from '../../../src/renderer/features/reader/scroll-converge'
 
-/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形 */
+/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形（F-R2 回炉 1 起
+ *  z 来自 computed zoom 桩（stubZoom），height 不再承担量纲角色）。 */
 function stubRect(el: HTMLElement, top: number, height = 10): void {
   vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
     top, right: top + 10, bottom: top + height, left: 0, width: 10, height, x: 0, y: top,
@@ -24,6 +27,17 @@ function stubRect(el: HTMLElement, top: number, height = 10): void {
   } as DOMRect)
 }
 
+/** 桩 CSS zoom（F-R2 回炉 1：effectiveZoom=computed zoom 链直读——jsdom 不
+ *  识别 zoom 属性，经 getComputedStyle mock 注入；其余属性/元素透传真实值
+ *  （overflowY 祖先判定不受扰）。 */
+function stubZoom(el: HTMLElement, zoom: number): void {
+  const real = window.getComputedStyle
+  vi.spyOn(window, 'getComputedStyle').mockImplementation((target, pseudo) => {
+    const cs = real.call(window, target as Element, pseudo)
+    return target === el ? Object.assign(cs, { zoom: String(zoom) }) : cs
+  })
+}
+
 /** 桩滚动容器的量纲（scrollHeight/clientHeight jsdom 恒 0——显式覆盖） */
 function stubScrollDims(el: HTMLElement, scrollHeight: number, clientHeight: number): void {
   Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
@@ -81,7 +95,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('start 数学：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）；嵌套取最近——outer 零位移', () => {
     const { outer, inner, target } = buildNested()
-    stubRect(inner, 100)
+    stubRect(inner, 100, 400)
     stubRect(target, 550)
     stubScrollDims(inner, 2000, 400)
     stubScrollDims(outer, 3000, 600)
@@ -95,7 +109,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('center 数学：scrollTop += (elRect.top + h/2) − (scrollerRect.top + clientH/2)（居中）', () => {
     const { inner, target } = buildNested()
-    stubRect(inner, 100)
+    stubRect(inner, 100, 400)
     stubRect(target, 900, 80)
     stubScrollDims(inner, 2000, 400)
     inner.scrollTop = 0
@@ -106,7 +120,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('顶底夹取：目标在上方越界→夹 0；在下方越界→夹 scrollHeight−clientHeight（显式夹取，jsdom 无浏览器夹取）', () => {
     const f = buildNested()
-    stubRect(f.inner, 100)
+    stubRect(f.inner, 100, 400)
     stubScrollDims(f.inner, 2000, 400)
     f.inner.scrollTop = 50
     // 目标盒顶 60 < 容器顶 100 → raw 50+(60−100)=10？构造真越界：目标 30
@@ -127,7 +141,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
     const item = document.createElement('div')
     aside.appendChild(item)
     document.body.appendChild(aside)
-    stubRect(aside, 40)
+    stubRect(aside, 40, 300)
     stubRect(item, 500, 20)
     stubScrollDims(aside, 900, 300)
     scrollIntoNearestScroller(item, 'center')
@@ -135,4 +149,40 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
     expect(aside.scrollTop).toBe(320)
     expect(document.documentElement.scrollTop).toBe(0)
   })
+
+  it('start 双空间折算（z=1.25）：gBCR 视觉差值除 z 后加进本地 scrollTop（dSt=δv/z）', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.25)
+    stubRect(inner, 100, 500)
+    stubRect(target, 600, 250)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 30
+    scrollIntoNearestScroller(target, 'start')
+    // z=1.25；本地修正=(600−100)/1.25=400 → 30+400=430
+    expect(inner.scrollTop).toBe(430)
+  })
+
+  it('center 双空间折算（z=1.5）：elRect 侧除 z，clientHeight 项保持本地空间', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.5)
+    stubRect(inner, 110, 600)
+    stubRect(target, 1460, 300)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 0
+    scrollIntoNearestScroller(target, 'center')
+    // z=1.5；(1460+150−110)/1.5 − 400/2 = 1000−200 = 800
+    expect(inner.scrollTop).toBe(800)
+  })
+
+  it('z≠1 底夹取：clamp 上限保持本地口径 scrollHeight−clientHeight（不随 z 缩放）', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.25)
+    stubRect(inner, 100, 500)
+    stubRect(target, 2500, 250)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 0
+    scrollIntoNearestScroller(target, 'start')
+    // z=1.25；raw=(2500−100)/1.25=1920 > 上限 2000−400=1600 → 夹 1600
+    expect(inner.scrollTop).toBe(1600)
+  })
 })
diff --git a/tests/unit/renderer/scroll-progress.test.tsx b/tests/unit/renderer/scroll-progress.test.tsx
index ab2787252..9fb6110a6 100644
--- a/tests/unit/renderer/scroll-progress.test.tsx
+++ b/tests/unit/renderer/scroll-progress.test.tsx
@@ -4,17 +4,21 @@
  *
  * 覆盖：六态全格（idle/scrolling/pending/writing/restoring/loading——含 W2
  * writing-scroll 新格）+跨格五序列（切 tab 恢复/滚动中关 tab/pending 中关 tab/
- * 程序跳页用户接管/回写竞 tab 切换）+最近页回写边界+落库容错+dispose。
+ * 程序跳页用户接管/回写竞 tab 切换）+最近页回写边界+落库容错+dispose
+ * +页盒量测视觉/本地折算（F-R2 B-2：装配侧 measurePageBoxes）。
  * 时间全注入（fake timers 经 deps.timers——禁真 timer）；always-active
  * （ADR-0017 裁决 3——新测试不经 guardedDescribe）。
+ * [F-R2] 双空间折算用例（受锁改写，[locked-change] 授权面）。
  */
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import {
   createScrollProgress,
+  measurePageBoxes,
   PROGRESS_DEBOUNCE_MS,
   type ScrollProgress,
   type ScrollProgressDeps
 } from '../../../src/renderer/features/reader/scroll-progress'
+import { nearestPage } from '../../../src/renderer/features/reader/page-column-geometry'
 
 /** 三页列几何（内容坐标）：页高 800、间隙 12——1 基页盒 [0,800]/[812,1612]/[1624,2424] */
 const BOXES = [
@@ -328,3 +332,81 @@ describe('scroll-progress 回写几何与容错', () => {
     expect(PROGRESS_DEBOUNCE_MS).toBe(2000)
   })
 })
+
+describe('scroll-progress 页盒量测视觉/本地折算（F-R2 B-2）', () => {
+  afterEach(() => {
+    document.body.innerHTML = ''
+    vi.restoreAllMocks()
+  })
+
+  /** 双空间 DOM 桩：scroller 与页盒 gBCR=视觉空间（本地×z），
+   *  scrollTop/clientHeight=本地空间。本地几何：页盒顶 0/200/400 高 100、
+   *  scrollTop=110、clientHeight=100、scroller gBCR top=0。z 来自 computed
+   *  zoom 桩（F-R2 回炉 1：jsdom 不识别 zoom——getComputedStyle mock 注入，
+   *  其余属性透传真实值；gBCR 视觉桩仍为被测量测面）。 */
+  function buildScaledColumn(z: number): HTMLDivElement {
+    document.body.innerHTML = ''
+    const el = document.createElement('div')
+    const realGCS = window.getComputedStyle
+    vi.spyOn(window, 'getComputedStyle').mockImplementation((target, pseudo) => {
+      const cs = realGCS.call(window, target as Element, pseudo)
+      return target === el ? Object.assign(cs, { zoom: String(z) }) : cs
+    })
+    Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true })
+    el.scrollTop = 110
+    const rect = (top: number, height: number): DOMRect =>
+      ({
+        top,
+        right: 0,
+        bottom: top + height,
+        left: 0,
+        width: 0,
+        height,
+        x: 0,
+        y: top,
+        toJSON: () => ({})
+      }) as DOMRect
+    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(0, 100 * z))
+    for (const c of [0, 200, 400]) {
+      const box = document.createElement('div')
+      box.setAttribute('data-page-box', String(c))
+      vi.spyOn(box, 'getBoundingClientRect').mockReturnValue(rect((c - 110) * z, 100 * z))
+      el.appendChild(box)
+    }
+    document.body.appendChild(el)
+    return el
+  }
+
+  it('measurePageBoxes：视觉盒位/盒高除 z 折算回本地空间（+本地 scrollTop）', () => {
+    const el = buildScaledColumn(1.25)
+    expect(measurePageBoxes(el)).toEqual([
+      { top: 0, height: 100 },
+      { top: 200, height: 100 },
+      { top: 400, height: 100 }
+    ])
+  })
+
+  it('z=1 恒等护栏：视觉=本地桩下量测原几何（既有行为零变）', () => {
+    const el = buildScaledColumn(1)
+    expect(measurePageBoxes(el)).toEqual([
+      { top: 0, height: 100 },
+      { top: 200, height: 100 },
+      { top: 400, height: 100 }
+    ])
+  })
+
+  it('nearestPage 按折算空间判页：视口中心 160 → 第 2 页（1 基；不折算误判第 1 页）', () => {
+    const el = buildScaledColumn(1.25)
+    const center = 110 + 100 / 2
+    expect(nearestPage(center, measurePageBoxes(el))).toBe(2)
+  })
+
+  it('滚动记账按折算空间判页：视口中心 160 记第 2 页（0 基 1）', () => {
+    const el = buildScaledColumn(1.25)
+    const h = makeHarness()
+    h.deps.getViewport = () => ({ scrollTop: 110, clientHeight: 100 })
+    h.deps.getPageBoxes = () => measurePageBoxes(el)
+    h.sp.onScrollEvent()
+    expect(h.pending()).toBe(1)
+  })
+})
diff --git a/tickets/registry.ts b/tickets/registry.ts
index ccab2c421..560c198d5 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -226,7 +226,9 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'R2-LG11', file: 'src/renderer/features/lineage/LineageNodeCard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络重制浅色严谨板（U2a=U2 修正役零 schema 先行单元——用户五决 2026-08-29 落地；R2-LG9 星象板方向否决后的修正延续=R2 系）：白卡+边框编码 A 线型×色阶（核心=accent 1.5 实线/普通=node-branch 1 实线/主题+综述=虚线 6-4；选中 +0.75）+foreignObject 题名换行 ≤3 行省略+title tooltip（LineageNodeCard:78 单行 text 根修）+nodeHeight 卡高单源（INV-38 三消费 1/2/3 行=64/82/100）+isSurvey/isCore 纯函数+综述布局右缘新列+综述关联边淡灰虚线 2-3（决3）+夜幕系脉络域摘除（.lineage-host 白底+LineageNightDecor 删+图例改写 LineageLegend 四项+工具条/适应视图/侧板三件白玻璃化+脉络衬线年份摘除=决5 连带）+BAND_LEFT 单源（B1 清账）；**isCore 出度口径修正（2026-08-29 真机复评裁决）**：初版「入度≥2」在 INV-27 树单父约束下数学恒假（合法图入度≤1 恒不触发；取证器 fixture 造双入边被 service 多父守卫拒=单测全绿≠真实数据形态可达的活证据）——「被引≥2 开宗立派」=≥2 继承者=出度≥2，主控压缩票直做（classify.ts+classify.test/visual.test 夹具同步+票面/INV-38 更正+变异红证 mutation-5.log 4 it 红）；受锁改写 lineage-canvas R2-LG9 块（拆 lineage-canvas-visual.test.tsx——max-lines 500）+lineage-layout 增两 describe+lineage-side-panel :311 夜化 it+新 lineage-classify.test（locks 163+取证器 r2-lg11-forensics.mjs 入锁=164）；e2e lineage.spec 零改（预裁兑现）；三屋：实现者 15.8M tok（875 用例精确命中 858−5+7+7+8）+门一 B0/W6/N9 PASS（6W 主控处置：W1/W2 申报、W3 主控补跑 mutation-4 GAP 精确值红、W4/W5/W6 遗留池）+门二 PASS 可直接收口；真机复评四线全过（wrapInBox/borderDiscernible/noRegression/surveyRight——取证档 scripts/audits/r2-lg11-out/ json+png；ABI 换绑 Windows 文件锁竞态=取证器 hash 校验防线+缓冲，环境怪癖常量化）；票面 scripts/audits/r2-lg11-brief.md+实现/门一/门二报告三份在档；裁决母本 docs/prompts/2026-08-29_loop-handoff-v3.md §2/§3' },
   { id: 'R2-LG12', file: 'src/main/services/lineage/lineage.service.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '综述多参考边数据面（U2b——用户裁决 2026-08-29「A. 完整多参考边」AskUserQuestion 在案）：lineageEdge 增 kind:tree|ref（出口必填/upsert 可选缺省 tree/service+importDraft 双写路径显式填；draft 协议零改）+迁移 006（ADD COLUMN kind TEXT NOT NULL DEFAULT tree——旧行幂等+migrate.test [1..5,6]）+service upsertEdge 受控豁免分支（ref 豁免多父且 tree 侧收窄 ref 入边不算 tree 父=对偶自洽/仍拒环=混合图 reachable/同端点对 tree+ref 互斥拒/from 双条件 paperId≠null+isSurveyTitle——判定上移 shared/models 单源+renderer re-export 消费面零改）+layout 净化段剔 ref 边（不计 dropped——有意分流）+渲染 ref=var(--survey-edge) 1.4 虚 2-3（直读 e.kind，优先级 ref>综述关联>推断>普通）+综述右键「添加参考连接」入口（pending-link mode 扩展 ref）+INV-27 修订登记（tree 单父原样/ref 受控豁免条款）；受锁面=shared models+ipc schemas+006 迁移+lineage-import/layout/visual 三测+6 测试工厂 kind 波及+e2e lineage.spec T5（综述幽灵行第四篇独立 fixture→右键→点已有 tree 父的甲=豁免面→ref path 精确断言→reload 持久+负锚非综述无菜单项）；三屋：实现者 10.0M tok（883 用例精确命中 875+service6+layout1+visual1+变异红证 4 档含 M2 混合环盲区拦截/M4 自环 reason 红点）+门一 B0/W2/N6（W1=check-tickets R2 系正则盲区建单时已知设计、W2=主控 diff 包 git add 失误门一补全）+门二 PASS 零回炉（W3 剪贴板复验落盘补跑 2.0s 过/N7 首红未落盘教训回流）；收口：verify exit=0（locks 165=164+006）+e2e 26/26 终态（T5 首跑即过+corpus 超时 2.5s 单跑复验=负载 flake+剪贴板 2.0s 复验）；票面 r2-lg12-brief.md+三报告+收口单在档' },
   { id: 'R2-SH1', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '应用重命名 Synapse Remake→Synapse+userData 数据迁移（U3a——独立成票单独审计·handoff §8；⚠landmine=userData 目录名派生自 productName=用户真实数据目录搬迁，复用 WS1 幂等模式）：package.json name/productName 同步+文本消费位（main-window 标题/App 品牌位/index.html title 超票面发现+受锁 smoke.spec/app-shell.test 断言）+grep 口径修正（消费/注释面清零；迁移模块+测试功能面字面量 6 处=契约钉死豁免——门一 W1 结构性调和裁决）；迁移=独立模块 migrate-user-data.ts（纯 node:fs 零 electron 可测性）bootstrap 最早段——分支矩阵：旧在新无→renameSync 原子迁移+显式 setPath（Electron 启动期缓存派生值=实现者超票面发现，userDataDir 取值在迁移后=时序无竞态主控独立核实+门一交叉验证）；新已存在→跳过（天然备份）；皆无→全新；rename 失败→回落旧路径运行（数据安全优先）+warn；受锁=constants 邮箱域/smoke/app-shell 三件+新测试 5 it（分支矩阵全测+setPathCalls 显式断言）+locks 166；门一 B0/W3/N10（W-G1 electron-builder.yml 钉旧名=票面「无安装器面」前提失实→主控直改 productName/artifactName；W-G2 ci 强制 [dep-change]→收口双尾注；W-G3 lockfile root name→主控直改）+门二 PASS 零回炉（grep 亲测 6 命中分类正确+sha256 独立复算逐位命中）；W4 local-state.mjs 取证器路径随收口改（新目录优先+旧名兜底）；**真机迁移验证（备份-换装舞步）**：39M 真实库 tmp 全备份→首启=窗口标题 Synapse+双课题结构完整迁入新位+旧位 rename 走→二启幂等（跳过分支+旧位零重建）；verify exit=0（888 用例=883+5 精确命中）+e2e 全量 26；提交双尾注 [locked-change]+[dep-change]——票面/三报告/收口单在档' },
-  { id: 'R2-SH2', file: 'src/renderer/app/App.tsx', area: 'infra', owner: 'strong', status: 'done', summary: '顶栏身份区+字体衬线消费清零（U3b——决4/决5 纯执行）：App 壳 header 条 h-11=44px（logo+Synapse 应用名+WorkspaceSwitcher 迁位零触碰+ver 随迁）+侧栏品牌行删+B1 wrapper+max-height 防展开错位+B2 header z-index 防盖板+--font-display 消费五类+lib 三类（W2 主控压缩票补——票面清单漏 library.css，决5「lib 衬线年份」明文）清零（token 定义保留）+--gold-night 别名退役（定义删+theme.test 同步）+三负锚（theme.css/library.css/font-display+gold-night 定义）；受锁=app-shell（品牌断言侧栏→顶栏+新 it 三件）/theme（负锚+TOKENS 删行）/r3-rdr-set-visual（:151 旧衬线锁→决5 负锚改写=同向双保险非放宽——实现者自裁）；三屋：实现者 2.9M tok（890=888+3−1 精确命中+双变异）+门一 PASS 无回炉（B1/B2 防御必要性核实/switcher 零锚定复核/N1 verify 时序硬条件/W4 对比度升格）+门二 PASS 零回炉+主控 W2 压缩票（library 三处+负锚扩+mutation-3 红点+sed 行号错位结构修复实录）；真机复评（r2-sh2-out/header.png）：顶栏 44px computed 实测三件在场+侧栏品牌行 0 计数+全 DOM Georgia 消费 0+**W4 解除**（trigger 实际色深色 rgb(35,38,45) on 白底——门一米白推演错位）+F-05/INV-34=定高+flex 链推演+e2e 全量阅读器链证据组合——票面/三报告/收口单在档' }
+  { id: 'R2-SH2', file: 'src/renderer/app/App.tsx', area: 'infra', owner: 'strong', status: 'done', summary: '顶栏身份区+字体衬线消费清零（U3b——决4/决5 纯执行）：App 壳 header 条 h-11=44px（logo+Synapse 应用名+WorkspaceSwitcher 迁位零触碰+ver 随迁）+侧栏品牌行删+B1 wrapper+max-height 防展开错位+B2 header z-index 防盖板+--font-display 消费五类+lib 三类（W2 主控压缩票补——票面清单漏 library.css，决5「lib 衬线年份」明文）清零（token 定义保留）+--gold-night 别名退役（定义删+theme.test 同步）+三负锚（theme.css/library.css/font-display+gold-night 定义）；受锁=app-shell（品牌断言侧栏→顶栏+新 it 三件）/theme（负锚+TOKENS 删行）/r3-rdr-set-visual（:151 旧衬线锁→决5 负锚改写=同向双保险非放宽——实现者自裁）；三屋：实现者 2.9M tok（890=888+3−1 精确命中+双变异）+门一 PASS 无回炉（B1/B2 防御必要性核实/switcher 零锚定复核/N1 verify 时序硬条件/W4 对比度升格）+门二 PASS 零回炉+主控 W2 压缩票（library 三处+负锚扩+mutation-3 红点+sed 行号错位结构修复实录）；真机复评（r2-sh2-out/header.png）：顶栏 44px computed 实测三件在场+侧栏品牌行 0 计数+全 DOM Georgia 消费 0+**W4 解除**（trigger 实际色深色 rgb(35,38,45) on 白底——门一米白推演错位）+F-05/INV-34=定高+flex 链推演+e2e 全量阅读器链证据组合——票面/三报告/收口单在档' },
+  { id: 'F-R2', file: 'src/renderer/features/reader/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'ui-scale≠1 程序滚动落点漂移修复（v18 U1 闭环——H1 根因=gBCR 视觉差值 1:1 加本地 scrollTop，探针三场景三档数值闭合 160-450px；方案 B 算术折算：effectiveZoom 单源+scroll-converge start/center 折算+scroll-progress getPageBoxes 同批修；真机复验 −512.6→−0.6 基线级/next 旁支同根归位；先红 6+变异 M1~M4+verify 126 文件 1081；门一 Kimi 链首战 B:0/W:1/N:6 可收口——换源事件 kimi-main→kimi-backup 实战；INV-34 量纲附注；B-3/H3 证伪备案 v19；票面+报告+门一全套 scripts/audits/f-r2-*）' },
+  { id: 'P7A', file: 'tests/e2e/reader-text.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: 'P7-A 剪贴板竞态 flake 专项（v18 U2 闭环——六场六现+第七现实锤；修=清场标记+条件重读 5×200ms+失败可归因末次读值，断言锚不放宽；受锁先红=外部占用注入复刻（p7a-red1）；主控压缩票直做（预算降级，担责披露）；连跑 3 次 P7-A 全绿；票面 scripts/audits/p7a-ticket.md）' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
```
