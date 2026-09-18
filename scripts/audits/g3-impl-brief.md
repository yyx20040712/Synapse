# F-GEOM-01-G3 实现者六段简报（主控派发——batch 15）

> 派发档位声明：实现者=ops-executor 绑定子代理（GLM5.3flash $max）。主控=GLM5.3 max。
> 工作区根：E:\class\智慧水务\Synapse_remake（相对路径以此为基）。

## ① 身份与禁令

- 你是实现者子代理，领单 **F-GEOM-01-G3**（band 三档绑定+跨族交互点登记）。
- 禁 git add/commit/push；禁改 tickets/registry.ts（控制面单写者纪律——主控收口统一翻
  done）；禁动 tests/** 与 src/shared/**（本票零测试面）；禁新建文件除简报指定外。
- 卡点=BLOCKED 停手不自裁（写入报告后终止）。

## ② 必读序（文件清单化）

1. `AGENTS.md` —— 宪法（本票相关：受锁链/计数实测/UTF-8/≤500 行）。
2. 票面：`tickets/registry.ts` 第 294 行起 F-GEOM-01-G3 条目（**只读**）。
3. 设计书（母本）：`docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md`
   - §2.5 band 三档绑定表（160~170 行）
   - §2.6 跨族交互点计数表（172~184 行）
   - §2.3 坐标域三处处置（140~143 行「登记不物理收敛」段）
   - §5.4 INV 清单（362~370 行）
4. INV 册：`docs/invariants.md` —— INV-58 行（73 行，G2 后现态）、INV-67 行（83 行，
   表尾=落号基准）、表头结构（第 1~2 列=INV 号|条文；后列=源码锚|验证锚|状态——以
   实际表列为准对齐）。
5. 改动面源文件五件（头注现状）：
   - `src/renderer/features/reader/selection-geometry.ts`（1~26 行头注+61~66 行 localScale）
   - `src/renderer/features/lineage/lineage-viewport.ts`（26~34 行 INV-43 口径注+80~84 行
     rootToLocalScale）
   - `src/renderer/features/reader/annotation-resolve.ts`（370~379 行 itemViewportOf 头注）
   - `src/renderer/features/reader/selection-paint.tsx`（49 行 bands props 头注——见③-5）
   - `docs/invariants.md`（受锁件）

## ③ 主控裁决（预裁项——实现者照办不再自裁）

1. **TDD 面裁定**：本票=纯登记面零行为变更（INV 落册+头注域声明，零运行时值变、零
   测试面）——红→绿循环与变异红证均无适用对象（无可变异行为差）。验证=verify 全链
   真退出码+locks 链同步+diff 范围自查。此口径同 batch 12 立案批/batch 8 纯调研票先例。
2. **INV-68 落号**：接续现尾号 67 → 新条目=INV-68，追加于 INV-67 行之后（表尾）。
   条文四列风格对齐 INV-66/67：条文列含「登记性质」句（现状消费面经核已天然档位
   绑定——本条=事实升 INV 防未来漂移，非行为变更，设计书 §2.5 原话）。
3. **INV-68 条文要件**（票面+设计书 §2.5/§5.4 逐项）：
   - 档1 项族 bandsFromItems（pdf-item-geometry.ts:366）=selection 快/全量主链
     （selection-evaluate.ts:130/207 经 itemSelectionGeometry:506）+S2/S3a
     （annotation-resolve.ts resolveAnnotationRectsItem）唯一源；
   - 档2 bandsForTextNodes（annotation-resolve.ts:209，DOM 节点口径）=S4
     （annotation-resolve.ts:300 resolveAnnotationRectsDom——Annotation+AI 段经
     annotation-resolve-layered 编排）+selection 全量显示回退（selection-evaluate.ts:296）
     专用且产物不入库（G2 保存门后 transient，rects 与 bands 同源=C5 精神）；
   - 档3 bandsNearRects（annotation-resolve.ts，DOM 几何口径）=S3b 存量专用
     （AnnotationLayer.tsx:98 唯一消费）；
   - **禁跨档消费+禁新增第四推导**；F-A9 calibrateBands（annotation-band-calibrate.ts:77）
     =三档之上显示层校准器（窗匹配+校准不参与行归属——现状不变）；
   - §2.6 表终态收口句：#3 S4 双族同屏=显式档（档2 落款）+同源 bands 绑定；#4 显示
     回退=transient 显式声明「仅显示不入库」（selection-evaluate.ts:43/292 G2 已落——
     本条引用不重复）；#2 S6 项盒判定边界注=INV-58 既有「S6 名实（门一 W1 补注）」
     覆盖（引用，不重复登记）。
   - 源码锚列：pdf-item-geometry.ts+annotation-resolve.ts+annotation-resolve-layered.ts
     （S0~S6 编排）+selection-evaluate.ts+AnnotationLayer.tsx。
   - 验证锚列：既有测试网（annotation-layer.test/ai-annotation-layer.test F-A8 门2
     describe S0~S6+selection 系列）——登记性质=事实升格，行为锚=既有测试（口径同
     INV-67 登记债销项）。状态列=已登记（防漂移性 INV，无独立红证面——机检锚=
     未来跨档消费走 review 拦截位，非 CI 负锚）。
4. **INV-58 修订**=尾部追加**坐标域三处边界注**（不改既有条款文字）：声明三处域间
   换算的域归属——selection-geometry localScale=UI 布局域换算（非 PDF 几何域，不参与
   锚定/归一化数学）；lineage-viewport rootToLocalScale=lineage 域件（INV-43 svg 口径，
   跨域出 reader 几何战役范围）；annotation-resolve itemViewportOf=项族域内换算（entry
   反推，产物 viewport 只入项几何族数学——精度带=门一 W3 口径既有）。防 r3a 型域差
   事故重演（F-A6-b2 实现事故：viewport 产 textLayer 盒本地域 vs gBCR 绝对域混用，
   G2 检测器实战拦截——事故档 f-a6-diag-out-r3a 在案）。格式=条款行内追加
   「**[F-GEOM-01-G3 坐标域边界注，2026-09-18]** …」句段。
5. **额外修正面（主控侦察发现，接缝归责纪律）**：`selection-paint.tsx:49` 头注声称
   bands props=「bandsNearRects 产物」系 F-A5 时代陈旧声明——现 selection 产链实际喂
   入档1 校准版（selection-evaluate.ts:233 calibrateBandsWithSpans(item.bands)）或档2
   产物（:296），bandsNearRects 真实消费仅 AnnotationLayer.tsx:98（S3b）。与本票
   INV-68「档3=S3b 专用」登记互斥，随票修正该头注（零行为变更，纯注释）。同文件
   第 10 行头注「bandsNearRects 产 RowBand——与标注/AI 三消费点同基准」同类陈旧——
   一并对准（改为档位绑定口径或删陈旧句，保持「与标注层渲染同基准」的有效信息）。
6. **三处头注域声明内容口径**（票面「坐标域三处换算域声明头注」）：
   - selection-geometry.ts localScale 前注释：补一句域声明——本换算=UI 布局域
     （视口→挂载盒本地 px），**非 PDF 几何域**，不参与锚定/归一化数学（INV-68 域界；
     r3a 防线参照）。
   - lineage-viewport.ts rootToLocalScale 前注释：补一句域归属——本件=lineage 域
     （INV-43 svg 坐标口径），跨域出 reader 几何战役范围；reader 域 crib 不复用
     （selection-geometry 头注既有 crib 声明互指成立）。
   - annotation-resolve.ts itemViewportOf 头注：补一句域归属——产物 viewport 只入
     项几何族数学（itemSelectionGeometry/rectsForOffsetRange），禁直接混入 DOM 量测
     域比较（r3a 型域差防线）。
   - 头注句式对齐既有风格（[F-GEOM-01-G3] 前缀标注），每处 1~3 行，不重写既有头注段。

## ④ 纪律

- **受锁链**：docs/invariants.md 受锁——改前 `npm run locks:unlock`，改毕即时
  `npm run locks:generate`（若提示新路径无需）+`npm run locks:apply`，manifest 与
  工作树同步（宪法禁跨提交延迟）。四个 src 头注文件先核对锁 manifest
  （scripts/locks.manifest.json 数组 path 逐项比对——batch 9 教训：数组查 path 禁
  Object.keys）——预期均不在锁内（受锁 src 全在 migrations/shared 域），若命中先停
  手报 BLOCKED。
- verify 真退出码物理落盘：
  `npm run verify > scripts/audits/g3-verify-final.log 2>&1; echo "G3_VERIFY_FINAL_EXIT=$?" >> scripts/audits/g3-verify-final.log`
  （.log 受根 .gitignore 拦截——主控收口 `git add -f`，实现者只管落盘；不要改名 .raw.txt）。
- 禁裸 npx vitest（Node ABI 假红——batch 14 教训变体）；测试口径=`npm run verify` 内链。
- 计数落笔前机器实测（行号/消费点 grep 复核简报③的数字——发现偏差如实报，禁照抄）。
- 中文 UTF-8；写后验证可读（check-quality 乱码关卡）。
- 每文件 ≤500 行（五件余量充足——头注净增预计 <40 行/件）。
- 禁新依赖；禁改行为代码（只动注释/INV 条文）。

## ⑤ 基线数字（自检参照——漂移即停手核对）

- verify：206 票 open 18、locks 338、test 170 文件/1744 用例、build 绿
  （G2 收口态=batch 14 日志）；本票收口前数字应零漂移（零测试面零 src 行为变更）。
- 指纹门 cur：187 文件/1789 用例/5411 断言——本票零漂移（不触 tests）。
- e2e 不跑（零行为变更——G1/batch 12 同口径；父级 e2e 验收义务归 G11）。

## ⑥ 报告契约

- 全文落 `scripts/audits/g3-impl-report.md`：实现摘要/文件清单（逐件 ±行数——git
  diff --numstat 实测）/证据（verify raw 尾行 EXIT 标记+locks apply 输出摘录）/locks
  实录（unlock→apply 时序+manifest 变更行数）/自裁申报（超票面决定逐条——含③-5
  额外修正面的处置说明）/疑虑。
- 回复五行内（指向报告文件）。
