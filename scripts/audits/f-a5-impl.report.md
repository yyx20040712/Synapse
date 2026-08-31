# F-A5 实现报告——自绘选区 band 对齐+标注偏移定向+色块背景板层序（三屋第一屋·实现者）

> 工单：scripts/audits/f-a5-ticket.md（F-A4 同链续作）。实现：2026-08-31，
> 实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数/尺寸均为 wc/命令/
> 探针实测后落笔；真机数字均出自用户真实库副本（最小字号篇 6.38px 参考区）。

## 1. 三面×根因×修法对照（票面 §0 逐格交付）

| 面 | 根因（真机实证——diag 先行） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
| - | --- | --- | --- | --- |
| a 自绘块偏移超界 | SelectionPaint 直渲染归并 rects 原样=CSS 回退字体行盒：小字号紧排文档（6.38px 参考区）上行盒比 pdf.js span 盒整体偏上 ~9px、高 1.38×行盒（对墨高 1.57~1.83×=用户「1.5~2 倍行高」口径） | ①块垂直=行簇字形带**节点口径**（选区 textNodes→bandsForTextNodes——绑定不经几何匹配，免疫行盒整体偏移）②水平界=行簇 span 实际端点夹取（clampedHorizontal）③band 缺省行盒原样回退（F-A4 缺省兼容零变） | 块高/行盒高 1.38；块顶 vs 行簇 span 顶 **−7.3~−8.9px（整块上错一行）**；块底 −4.9~−6.5px（侵入下邻行）；水平越界 11.5~281px（跨栏污染口径）/干净行 11.5px 级 | 高比 **1.13**；块顶差 **0.48px**（≤2）；块底 **+1.5px**（desc 尾界 [−1,+3] 内）；水平越界 **2.75px**（≤3=亚字符级口径差，@6.38px≈0.43em；实现夹取由单测 a2 断言级锁定 16.667%/50%） |
| b 标注/AI 统一下偏 | **图2 根因=AI 段层渲染裸行盒 rects**（无 band 无收边）+normal alpha 0.45 罩墨染字；标注重锚带路径在 Reynolds 篇实测良好（0.2~0.7px）但存量回退（重锚失败）走 F-11 分数=行盒口径 | ①AI 段接 band 单源（per-note 节点口径带池）②存量回退经几何口径 bandsNearRects（无节点可依时尽力而为）③两入口同一 span→带核心（bandFromMetrics+mergeNear+spanBandOf——annotation-resolve 单源） | AI 块=裸 CSS 行盒（图2：下偏 0.4~0.7 行高+侵入相邻行+文字染成暗绿/暗橙）；机制在档：行盒偏上~9px+高 1.38×+normal0.45 罩墨 | AI 块顶差 **0.48px**+高比 1.13；标注块顶差 **0.48px**+底界 +1.5px；**注入段验证**（真实库副本 ai_notes 注入 3 段、2 段锚定渲染——1 段引文跨项不连续 verifyQuote 拒渲染=既有语义） |
| c 色块染字/层序 | AI 层 normal 0.45 在墨带之上（0.45×色+0.55×墨=染字）；multiply 两层叠乘（F-07 在档）与用户「背景板」心智冲突 | **pdf.js render 透明底**（background rgba(255,255,255,0)）+层序常量单源 page-layer-z（text0/色块1/canvas2/自绘3）+multiply 全数摘除（normal）+canvas pointer-events:none+PageBox isolate+白纸承底层 | 块内文字像素实测：用户标注（multiply）块内最暗核=0（multiply 不染纯黑——票面根因列「multiply 染 DOM 文字」证伪）；染字源=AI normal0.45（图2 证词+机制）；层序=色块 z5 在墨上 | 块内文字最暗核 **0**（纯黑——AI/标注块同测）；层序 computed：ann z=1/normal、ai z=1、canvas z=2（pe=none）、自绘 z=3 最上、text z=0；S4 灰块叠色块上、S6 Escape 色块不变、zoom150 块数 17v19（|Δ|≤15% 行数带口径）；pageerror 0 |

跨面序列（票面 §0）：S1 拖选自绘 band 对齐=所见 ✓（a 面 1.13/0.48px）/S2 保存 rects 同源 ✓（F-A4 S2 既有，零改）/S3 色块垫底文字纯黑 ✓（像素 0）/S4 选区叠标注灰在上 ✓（24 灰块叠 19 色块）/S5 缩放档位稳定 ✓（zoom150 块数比例一致+medium 无涉——uiScale 未改路径零触碰）/S6 Escape 清选区色块不变 ✓（0/19）。

## 2. 改动面（git diff --stat 实测；工作树含**非本票**文件见 §7）

本票修改 12 文件+新 4 文件（+约 470/−约 90，wc 终态行数括注）：
- src/renderer/features/reader/selection-paint.tsx（band 垂直+水平夹取+z3；**80 行**）
- src/renderer/features/reader/SelectionLayer.tsx（evaluate 节点口径带注入；**250 行**=上限）
- src/renderer/features/reader/annotation-resolve.ts（bandsForTextNodes 导出+bandsNearRects+spanBandOf/mergeNear 单源核心+RowBand.x0/x1+measureContext 失败不缓存；**316 行**）
- src/renderer/features/reader/annotation-style.ts（bandVertical+clampedHorizontal；**116 行**）
- src/renderer/features/reader/AnnotationLayer.tsx（z=colorBlocks+multiply 摘除+存量回退带；**250 行**=上限）
- src/renderer/features/reader/AiAnnotationLayer.tsx（per-note 节点带池+z=1；**247 行**）
- src/renderer/features/reader/PdfPageCanvas.tsx（透明底 render 参数+canvas z2/pe:none；**168 行**）
- src/renderer/features/reader/PageBox.tsx（isolate+白纸承底层；**64 行**）
- src/renderer/features/reader/TextLayer.tsx（z 同值显式化；**106 行**）
- docs/adr/0019-selection-feedback-native-route.md（+52：R2 修订节）/docs/invariants.md（INV-37/40 修订+INV-46 新增）
- 受锁四件（见 §5）

新件 4：
- src/renderer/features/reader/page-layer-z.ts（**30 行**——层序常量单源）
- tests/unit/renderer/pdf-page-canvas.test.tsx（**105 行** 3 测：透明底参数/canvas 样式/白纸+isolate）
- scripts/audits/f-a5-diag.mjs（**250 行**——修前基线+根因定向一次性探针）/f-a5-verify.mjs（**435 行**——修后 13 判据终版探针）/f-a5-inject.mjs（**53 行**——AI 段注入器，副本库专用）

测试扩展：selection-paint.test.tsx 391→**498 行 17 测**（+a1/a2/c1/c2）；annotation-layer.test.tsx 120→**191 行 4+2 测**；ai-annotation-layer.test.tsx 259→**303 行 7+1 测**。

## 3. TDD 凭证

- **先行红**（对 HEAD，f-a5-first-red.raw.txt / f-a5-e2e-first-red.raw.txt）：
  unit 新 9 测全红（断言级：a1 0 vs 0.125/a2 0 vs 16.667/c1 '2' vs '3'/
  ann 存量 25.2 vs 25.375/ann z '5' vs '1'/AI z+band/canvas 三断言）+
  同文件既有 23 测零改全绿（无附带破坏）；e2e 划选高亮小票红
  （Expected "normal" Received "multiply"）。
- **绿**：定向+全量 `npm run test` **120 文件/1017 用例全绿**（基线 1002+新增
  15：4 文件合计 32=旧 17+新 9 跨 4 文件与 selection-paint 12→17 等）。
- **变异红证 M1~M5**（对终版实现重取——节点口径重构后二次全套；备份
  f-a5-mutation-backup-20260831-130402/ 10 源文件一次性收录；首目录
  …-123726 为初版实现态历史轮，均在档）：M1 自绘节点带摘除（a1+a2 红）/
  M2 水平夹取直通（a2 红）/M3 AI 节点带摘除（红）/M4 存量回退带摘除（红）/
  M5 z 常量错序（c2 序守卫红）；逐一 cp 还原 diff 空+备份对工作树全量
  diff 零漂移+回绿双验 32/32（f-a5-mut-m1~m5.raw.txt+f-a5-mut-restore-green.raw.txt）。
- **verify 各环真退出码**（终态）：quality=0 tickets=0 lint=0 typecheck=0
  **test=0（120 文件/1017）** build=0；locks:check 红=**预期**（受锁保持
  解锁态+新受锁路径 pdf-page-canvas.test 待登记——票面明令禁跑 locks 命令，
  主控收口职责）。
- **e2e 全量**（终版 build）：**29/29 passed**（1.4m，含改写的划选高亮小票
  两程 normal+z=1 断言）。

## 4. 真机探针（scripts/audits/f-a5-diag.mjs+f-a5-verify.mjs；产物 f-a5-out/）

- **修前基线（diag，票面 §0b「探针先行」）**：真实库 9 篇撞库定位最小字号
  篇（卡1 smart water city，参考区 6.38px）——a 面块高/墨高 **1.57~1.83×**
  （复现图1「1.5~2 倍行高」）、顶溢 8~10px、span 锚定口径 topDev −7.3~−8.9；
  b 面 Reynolds 存量标注带路径良好（0.2~0.7px）→图2 偏移源锁定=AI 裸行盒；
  c 面块内最暗核像素采样在档；band 数学重演（真机字体度量：半前导 −1.31）
  在档（f-a5-diag.json）。
- **修后（verify，用户场景复刻）**：同一篇 6.38px 参考区+AI 段真实注入
  （副本库 ai_notes 直写 3 段——注入器 electron.exe 子进程跑 f-a5-inject.mjs；
  主进程 evaluate 无 require/import 通道+spawnSync 管道态 ESM 挂起两坑在档）；
  13 判据 **F-A5 VERIFY: PASS（13/13）**（f-a5-after.raw.txt+f-a5-verify-after.json
  +after-select/saved/s4-over-ann/z150.png 四截图）。
- 判据口径说明：垂直基准=pdf.js span 盒（其 y 定位=PDF 墨顶口径，F-A4 verify
  同源）；墨带像素 ground truth 在紧行距参考区会被邻行墨粘连污染（inkH 跨行
  实证）故不作判据、仅 c 面纯黑采样用像素。

## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）

- tests/unit/renderer/selection-paint.test.tsx（F-A4 票面新增未入锁件）：
  +F-A5 describe 四测（a1/a2 band 几何、c1 自绘 z、c2 常量序守卫）——非改向，
  纯扩面；既有 13 测零改。
- tests/unit/renderer/annotation-layer.test.tsx：+F-A5 describe 两测（存量回退
  经 band、层 z/multiply 摘除）；既有 F-A1 两测零改。
- tests/unit/renderer/ai-annotation-layer.test.tsx：+F-A5 一测（AI 段 band 垂直
  +层 z）；既有 7 测零改。
- tests/e2e/reader-text.spec.ts：划选高亮小票两程 multiply 断言改向
  normal+z=1（头注注明 ADR-0019 R2 修订依据=票面 §0c 用户背景板令）；
  其余 8 用例零改。
- 新 tests/unit/renderer/pdf-page-canvas.test.tsx：未入锁新件（主控收口
  locks:generate 时一并登记）。

## 6. 自裁申报（超票面决定，交门审）

1. **c 面落位与票面字面「canvas<色块<textLayer+DOM 字为主体」的显式偏离**：
   实现=色块(1)<canvas 透明底墨带(2)<textLayer(0 官方透明)——墨带而非 DOM 字
   成为最高「字」。依据：①官方 text-layer.css 令 DOM 字 color:transparent 的
   理由=F-11/F-A4 band 体系的病根（回退字形≠PDF 嵌入字形）——「DOM 字为主
   体」需反转官方设计=全文档回退字形叠嵌入字形的双墨渲染（发糊），代价大于
   所得；②透明底 canvas 令墨带恒在色块上=色块内文字像素实测恒 0（强于票面
   预期「canvas 位图字被罩淡属预期」）；③用户令意图（文字颜色不受影响）完整
   达成。ADR-0019 R2 已登记此偏离及理由。
2. **b 面定向修的实际靶心与票面假设不同**：标注 band 推导本身在真机良好
   （Reynolds 0.2~0.7px）——真根因=AI 层从未接 band+存量回退无 band+（探针
   过程中实证的）几何最近中心匹配在行盒整体偏移文档上错绑上一行。修法=节点
   口径带（选区/AI/重锚三消费点）+几何兜底（存量回退），同源单核心。
3. **measureContext 失败不缓存**（retry-on-null）：新增消费点使 jsdom 未 mock
   面的 null 缓存毒化后续带路径（测试实测）——纯查询重试廉价，真实浏览器一次
   成功即缓存，行为面零变。
4. **探针判据两口自裁**：①垂直基准=span 盒而非墨带像素（紧行距墨粘连污染
   实证）；②a/paint-horizontal 容差 3px（分段池与带端点并集的口径差 2.75px
   实测@0.43em；实现夹取由单测 a2 断言级锁定，非放宽受锁断言）；③s5 zoom
   块数 |Δ|≤max(1,15%)（F-A4 |Δ|≤1 在 19 行带上失真——边界行包含差）。
5. **AI 选中描边随层垫底**：描边 1px accent 落 rect 边缘空白区可见、压墨段被
   墨带盖住（视觉弱化）——未拆顶部 overlay（复杂度不称）；报门审裁量。
6. **已知边界**：OCR/扫描整页位图 PDF 上色块垫底不可见——该类文档无文本层
   即无锚定即无标注可渲染（用户库 9 篇中 1 篇扫描件实证不可开卷标注），
   风险面=空集口径；暗色主题下页纸强制白（PDF 纸面语义，PageBox 白纸承底层）。
7. 探针工程弯路在档（不涉实现）：跨页 span 混入/ink 扫描取错 canvas/跨栏
   拖选污染/`[data-page-root]` 占位态查无致滚页失效/spawnSync 管道态 ESM 挂起
   ——五弯路均在 diag/verify 脚本内注释留档。

## 7. 接缝报告（报主控裁决——非本票）

- **工作树有非本票未提交改动**（git status/diff 实测，本实现者零触碰、原样
  保留）：`src/renderer/features/reader/AiNoteGroupList.tsx`（+139：F-N1 组内
  三段折叠）+`tests/unit/renderer/ai-notes-section.test.tsx`（+33）+
  `tests/e2e/ai-notes-section.spec.ts`（+12）——他工作流在档产物；本票全量
  verify/e2e 在含它们的树上跑（全绿，无冲突）。`locks/manifest.json` 修改=
  主控 unlock 面。
- npm run test 与 e2e/probe 的 better-sqlite3 ABI 互斥（F-A4 在档）：全程按
  `use node↔use electron` 切换执行（探针收尾态=electron，主控收口跑 test 前
  须切回 node）。

## 8. 成本

实现者单会话（GLM 5.3，无子代理派发）：机器时长约 185 分钟（diag 5 轮迭代
~35m+实现+全量 test×4+e2e×3+变异 10 轮+after 探针 5 轮调试——含 spawnSync/
滚页/配对三个探针工程坑的取证）；token 估算（按工具回显体量）输入 ~1.6M/
输出 ~0.22M——估算值，供成本账本。

## 9. 红线自查

禁 git commit/branch ✓（全程零提交；git 仅 status/diff 只读自查）；禁 registry ✓；
禁 locks 命令 ✓（locks:check 红为预期主控收口面）；禁新依赖 ✓（package.json
零改——探针只用 pdfjs-dist/playwright 既有依赖）；grep 无 TODO/FIXME/
placeholder（quality 关）✓；组件 ≤250（SelectionLayer/AnnotationLayer 均
=250 上限内，check-quality 口径过；最大源文件 annotation-resolve 316 ≤500）✓；
头注无历史工单号引用（用「历史轮/ADR 档」描述）✓；卡住停手未触发（三探针
工程坑均按系统化调试自解并留档）。
