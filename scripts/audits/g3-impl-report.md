# F-GEOM-01-G3 实现者报告（band 三档绑定+跨族交互点登记——纯登记面零行为变更）

> 档位：ops-executor 绑定子代理（GLM5.3flash $max，batch 15 派发显式定档）。
> 简报=scripts/audits/g3-impl-brief.md；设计书 §2.3/§2.5/§2.6/§5.4。

## 开工技能清点（宪法会话开工纪律）

- verification-before-completion：**用**（verify 真退出码物理落盘+基线数字逐项核对）。
- test-driven-development：**不用**——简报③-1 预裁本票零测试面零行为变更，红绿循环与
  变异红证均无适用对象（无可变异行为差；同 batch 12 立案批先例）。
- systematic-debugging：**不用**——纯登记面，无缺陷排查对象（备用未启用）。
- 其余工程技能（subagent 派发/e2e 等）：不适用——单一调用者铁律下本岗禁派子代理，
  e2e 不跑（简报⑤：零行为变更，父级 e2e 验收义务归 G11）。

## 实现摘要

1. **INV-68 落册**（docs/invariants.md 表尾，接续 INV-67=84 行新行）：几何产链 band
   档位绑定——档1 bandsFromItems（项族）/档2 bandsForTextNodes（DOM 节点口径）/
   档3 bandsNearRects（DOM 几何口径）各绑消费面，禁跨档消费+禁第四推导；F-A9
   calibrateBands=三档之上显示层校准器现状不变；§2.6 跨族交互点终态收口句（#3 显式档/
   #4 transient 引用不重复/#2 引用 INV-58 既有覆盖）；条文含「登记性质」句（事实升 INV
   防漂移非行为变更）。源码锚五件+验证锚（既有测试网=行为锚，口径同 INV-67）。
2. **INV-58 尾部坐标域边界注**（73 行条文列行内追加，既有条款文字零改）：
   「[F-GEOM-01-G3 坐标域边界注，2026-09-18]」——localScale=UI 布局域/rootToLocalScale=
   lineage 域件（INV-43）/itemViewportOf=项族域内换算（门一 W3 精度带）；防 r3a 型域差
   事故重演（F-A6-b2 事故档 f-a6-diag-out-r3a 在案）。
3. **三处源码头注域声明**（[F-GEOM-01-G3] 前缀，各 2~3 行，不重写既有段）：
   selection-geometry.ts localScale（61→61~64 行）/lineage-viewport.ts rootToLocalScale
   头注尾（79 行后）/annotation-resolve.ts itemViewportOf 头注尾（377 行后）。
4. **selection-paint.tsx 两处陈旧声明勘正**（简报③-5 预裁面）：第 10 行头注
   「bandsNearRects 产 RowBand——与标注/AI 三消费点同基准」→档位绑定口径（INV-68），
   「与标注层渲染同基准」有效信息经 matchBand 匹配句保留；49 行 props 注
   「bandsNearRects 产物」→实际喂入档1 校准版（calibrateBandsWithSpans(item.bands)）或
   档2 显示回退，bandsNearRects=档3 仅 AnnotationLayer S3b 消费。第 64 行 matchBand
   注释仍准确未动。

## 文件清单（git diff --numstat 实测，+增/-删）

| 文件 | ±行数 | 内容 |
| --- | --- | --- |
| docs/invariants.md | +2/-1 | INV-58 行内边界注+INV-68 新行（受锁件，unlock→改→apply 链） |
| src/renderer/features/reader/selection-geometry.ts | +3/-1 | localScale 域声明 |
| src/renderer/features/lineage/lineage-viewport.ts | +3/-0 | rootToLocalScale 域归属（reader crib 互指） |
| src/renderer/features/reader/annotation-resolve.ts | +4/-1 | itemViewportOf 域归属 |
| src/renderer/features/reader/selection-paint.tsx | +7/-3 | 两处陈旧声明勘正 |
| locks/manifest.json | +2/-2 | invariants.md sha256 同步（见 locks 实录） |

零行为代码变更（只动注释与 INV 条文）；五文件行数 143/283/411/88/91，均 ≤500。
tickets/registry.ts、tests/**、src/shared/** 零触碰；无新依赖；无新文件（除简报指定的
本报告+verify 日志）。

## 验证证据

- verify 全链真退出码物理落盘 scripts/audits/g3-verify-final.log（3876 行）尾行：
  **G3_VERIFY_FINAL_EXIT=0**（quality+test-surface+tickets+locks+lint+typecheck+test+build）。
- 基线零漂移（对简报⑤）：票 206/open 18 ✓；locks 338 ✓；Test Files 170 passed (170) ✓；
  Tests 1744 passed (1744) ✓；build 绿（✓ built in 1.69s）✓；指纹门
  「检查通过：C_after ⊇ C_before」+exemptions 2 hits 2 stale 0 ✓（零 tests 触碰）。
- UTF-8 可读性：新中文内容 grep 逐件回读命中（INV-68 行首/坐标域边界注/r3a 防线句等），
  check-quality 乱码关卡在 verify 链内绿。
- 简报③引用锚点落笔前机器实测全真：bandsFromItems=pdf-item-geometry.ts:366（:506
  itemSelectionGeometry 内消费）✓；selection-evaluate.ts:130/207 itemSelectionGeometry/
  :233 calibrateBandsWithSpans/:296 bandsForTextNodes ✓（另见自裁 5）；annotation-resolve.ts
  :209 bandsForTextNodes/:275 resolveAnnotationRectsDom（:300=bands 行）/:327
  resolveAnnotationRectsItem ✓；AnnotationLayer.tsx:98 bandsNearRects 唯一消费 ✓；
  annotation-band-calibrate.ts:77 calibrateBands ✓；selection-evaluate.ts:43/292 transient
  声明 ✓；rectsForOffsetRange=pdf-item-geometry.ts:279 ✓。

## locks 实录

- 时序：`npm run locks:unlock`（EXIT=0，解锁 338 文件）→ 编辑 docs/invariants.md →
  `npm run locks:apply`（EXIT=0，「已锁定 338 个文件（只读）。manifest 记录 338 条」）。
  无新受锁路径 → locks:generate 无需（简报④预裁）。
- manifest 变更（git diff 实测，恰 2 行）：generatedAt 时间戳+docs/invariants.md 条目
  sha256 `887c6385…` → `ac9999b5…`——与本票唯一受锁改动同步，无跨提交延迟。
- 四件 src 头注文件比对 locks/manifest.json（数组 path 逐项 grep）：均不在锁内（锁内
  仅其测试文件），无需 unlock——与简报④预期一致。
- locks:check 在 verify 链内绿（338 个受锁文件与 manifest 一致）。

## 自裁申报（超票面决定逐条）

1. **③-6「INV-68 域界」按 INV-58 落笔**：简报③-6 selection-geometry 条要求注
   「（INV-68 域界；r3a 防线参照）」，与③-4（坐标域三处边界注=INV-58 尾部修订）互斥；
   INV-68 条文（③-3）系 band 档位绑定、无 localScale 域界内容，域界登记宿主=INV-58。
   按登记落点写「（INV-58 坐标域边界注；r3a 型域差防线参照）」。
2. **manifest 路径勘正**：简报④写 `scripts/locks.manifest.json`，实际文件=仓库根
   `locks/manifest.json`（package.json locks:* 脚本+find 实测）。比对口径不变，结论同简报
   预期（见 locks 实录）。
3. **档3 行号补充**：简报③-3 档3 未给行号，落册补实测 `annotation-resolve.ts:235`
   （export function bandsNearRects 实测行）——精度补充，非口径变更。
4. **③-5 额外修正面处置说明**：selection-paint.tsx 两处陈旧声明（第 10 行+49 行）均
   勘正为档位绑定口径；「与标注层渲染同基准」有效信息保留（matchBand 匹配句承载）；
   第 64 行既有 matchBand 注释准确未动；勘正句内引用 INV-68 作登记锚（票面 INV 落号
   预裁=68）。
5. **:290 同族喂入点备案**：grep 实测 selection-evaluate.ts:290 为档1 校准版第二喂入
   点（:233 快路径/:290 settle 全量，简报③-5 仅点名 233/296）——与「selection 产链喂
   档1 校准版或档2 产物」口径相容；INV-68 条文行号按简报③-3 原单（130/207/296）未扩，
   行号系佐证非穷举。
6. **头注 INV 指针不对称**：selection-geometry 头注按③-6 含 INV 锚（勘正为 58，见自裁
   1），lineage-viewport/annotation-resolve 两处头注按③-6 原文各自引用既有域锚
   （INV-43/门一 W3）未额外加 INV-58 指针——严格从票面，最小超面。

## 疑虑

1. INV-68 状态列「已登记」非本册「维护规则」三档词表（已锚定/部分/未锚定）成员——
   简报③-3 预裁原文照办；门审如认为需对齐词表属一词之改。
2. 开场树非净：docs/handoff/relay.md 3 行改动=派发方调度器写入、scripts/audits/
   g3-impl-brief.md 未跟踪=简报本体——均非本票残留，未触碰。
3. locks:apply 后 git 提示 locks/manifest.json 工作副本 CRLF 将于提交时按 .gitattributes
   归一 LF——locks:check 已绿无碍，主控收口 add 时留意即可。
