# 门一审包：F-GEOM-01 实施票立案批（G1~G11）——relay batch 12

## 0. 审计任务与你的角色

你是门一对抗审查岗（隔离一审）。审计对象=**立案批**（纯 registry/骨架面，
零业务实现）。产出审查报告，末栏必须含 `FINDINGS: B=n/W=n/N=n/VERDICT=…`
（VERDICT ∈ PASS / PASS_WITH_WARNINGS / FAIL）。审包自包含；你只有 Read
工具，仓库根 E:\class\智慧水务\Synapse_remake 可供交叉核对（设计书=
docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md，
提交 af946a5324）。

## 1. 批次背景

- 上游：F-GEOM-01 设计链三跳毕（Kimi 拟定→deepseek 审核返工 B5/W7/N4→
  GLM 终裁定稿 415 行，全部处置见设计书 §7）。设计书 §5.3 规定实施票
  切分 G1~G11，每票独立提交+门审。
- 本批=板面指令「F-GEOM-01 实现票立案批（G1~G11 骨架件+registry+locks
  立案序）」：11 条 registry 条目+2 件骨架+母票立案注记。**无任何 src
  行为变更**（骨架=export{} 空体/文档载体）。
- 立案执行序（《裁决书》§5）：骨架件（file 必须真实存在）→ registry
  条目 → locks → verify → 提交。本批 locks 步经核对零受锁面（§3/§4③）。

## 2. 审计对象全量

### 2.1 registry 变更（tickets/registry.ts；全量 diff 另存
scripts/audits/geom01-impl-registry.patch，31 行）

母票 F-GEOM-01 行尾注记（唯一改动点，其余母票文字零动）：

- 原：`…排期=F-TESTREF 战役+F-DEDUP-01 后压轴；[locked-change]' },`
- 新：`…后压轴；**实施票已立案（2026-09-18 立案批）：F-GEOM-01-G1~G11
  按设计书 §5.3 切分入册，板行=docs/handoff/relay.md 第四波子项逐票
  勾选，母票随 G11 翻 done**；[locked-change]' },`

新增块=块注释头+11 条目（全文逐字）：

```
  // ── 2026-09-18 F-GEOM-01 实施票立案批（G1~G11——设计书 §5.3 切分；票面
  //    引用 docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
  //    （定稿提交 af946a5324）对应节+复杂度治理裁决书 §3 梯队三；排程=relay
  //    第四波子项按号序串行；迁移票（G4~G10）翻 done 时 file 字段随迁移改写
  //    至子域新址（SR-RDR-02 随迁先例）；G2 受锁面最重（selection-layer.test
  //    改写+豁免清单），大中票一火一票 ──
  { id: 'F-GEOM-01-G1', file: 'src/renderer/features/reader/geometry-types.ts', area: 'reader', owner: 'strong', status: 'open', summary: 'M0 类型下沉切环（设计书 §3.3/§3.4；1/11）：新件=本 file（立案骨架，实现者领票时改写真身）落 PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry（现驻 PdfPageCanvas.tsx:38-77）+PixelBox（annotation-anchor）+RowBand（annotation-resolve）+COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO（pdf-item-geometry——常量与类型同居 anchors 语义位）；PdfPageCanvas 保留 export type 再导出（受锁测试旧路径 import 零触——M0 无受锁面）；切断三处 type-only 环（pdf-item-geometry↔annotation-anchor/annotation-resolve/PdfPageCanvas）+两 store→PdfPageCanvas 边（page-items.store:37/reader-search.store:41 改 import 本件）+annotation-anchor 的 COLUMN_GAP 值 import 改向本件（anchors 域内最终无环）；红线=零文件移动（目录迁移归 G6）；验收=unit 全绿+typecheck+verify 全链（变异红证=删 PdfPageCanvas 再导出→旧路径 import 编译红→还原）' },
  { id: 'F-GEOM-01-G2', file: 'src/renderer/features/reader/selection-evaluate.ts', area: 'reader', owner: 'strong', status: 'open', summary: '保存链单源门+几何死面收敛（设计书 §2.4/§3.5——**战役唯一行为变更票**；2/11）：①保存门=evaluateCore itemChainFor 返 null 时 setPaint 照渲 DOM 回退形状（视觉连续，现状）+setPending(null)（原为 pending=DOM 形状 anchor）+warn 单源（复用 itemChainFor 诊断单源）——「所见≠所存时不给保存入口」（生产影响≈零：item 链失败三因健康页近零发生，主存活面=jsdom 测试环境）；②probeOffsetLen 收敛（selection-evaluate 复刻 anchor-serialize 私有 probeTextLength≈15 行→显式导出面+复刻删除）；③rectsFromRange 死导出面删除（src 零消费+受锁测试 1 用例≈25 行——死代码即删宪法条，候选项经双门裁）；受锁面先行对账义务（§2.4）=tests/unit/renderer/selection-layer.test.tsx 14 用例无 page-items 桩（grep 实测零命中）——立案时先出断言对账表（§5.2 风险 1），保存流用例补页项桩（tests/utils 工厂面 page-items.store 直改先例）+断言面按项族产物更新；指纹门 C 面变更走豁免清单条目（reason=设计书 §2.4+裁决链）+条目数 >10 呈主控复裁（§5.2 风险 2）；INV-58 修订（保存链条款+selection-evaluate:54 stale 自述重写）随本票；[locked-change][test-refactor]；验收=指纹门 C_after ⊇ C_before+锚定回归网+e2e 默认门' },
  { id: 'F-GEOM-01-G3', file: 'docs/invariants.md', area: 'infra', owner: 'strong', status: 'open', summary: 'band 三档绑定+跨族交互点登记（设计书 §2.5/§2.6——纯登记面零行为变更；3/11）：新 INV（暂记 INV-68 号段，落册接续现尾号 67）=几何产链档位绑定——档1 项族 bandsFromItems=selection 快/全量主链+S2/S3a 唯一源/档2 bandsForTextNodes（DOM 节点口径）=S4（Annotation+AI 段）+selection 全量显示回退专用且产物不入库（rects 与 bands 同源——C5 精神）/档3 bandsNearRects（DOM 几何口径）=S3b 存量专用；禁跨档消费+禁新增第四推导；F-A9 calibrateBands=三档之上显示层校准不参与行归属（现状不变）；现状消费面经核已天然档位绑定（设计期 grep 逐一核对）——本票=事实升 INV 登记防未来漂移；跨族交互点登记（§2.6 表：#2 S6 项盒判定边界注/#3 S4 双族同屏显式档/#4 显示回退 transient 声明）+坐标域三处换算域声明头注（selection-geometry localScale/lineage-viewport rootToLocalScale/itemViewportOf）+INV-58 边界注（防 r3a 型域差事故重演）；#1 闭合/#5 头注消除归 G2 落款；INV 册受锁 unlock→改→apply 单链 [locked-change]' },
  { id: 'F-GEOM-01-G4', file: 'src/renderer/features/reader/reader.store.ts', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M1=state/ 域迁移（设计书 §3.2/§3.4；4/11）：10 文件迁 reader/state/——reader.store/tab-dirty/useActiveTab/annotation-undo/page-layer-z/ai-notes.store/ai-notes-phase/PdfDocProvider/CorpusExtractor/scroll-converge（scroll-converge 三消费方 anchor-locate/usePageColumnScroll/scroll-progress 置底避免 anchors→view 反向边——W7 处置；CorpusExtractor=终裁补列件）；受锁面随步同链 unlock→改→apply=CorpusExtractor 相关测试 import（corpus-extractor/corpus-export/pdf-factory）+eslint.config.js INV-16 块 PdfDocProvider/CorpusExtractor 两路径（四路径分步随迁首步）；域内单向核验=state 不依赖任何域（§3.1 置底）；翻 done 时 file 字段随迁改写 state/reader.store.ts（SR-RDR-02 先例）；验收=verify 全链；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G5', file: 'src/renderer/features/reader/reading-time.ts', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M2=time/ 域迁移（设计书 §3.4；5/11）：4 文件迁 reader/time/——reading-time/reading-time-setup/reading-time-outbox/reading-time-outbox-store；受锁面=reading-time 系测试 import 同链 unlock→改→apply；域间单向=time→state 核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G6', file: 'src/renderer/features/reader/annotation-anchor.ts', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M3=anchors/ 域迁移（设计书 §3.4；6/11——受锁面最重迁移步）：13 存量+geometry-types（G1 产物）迁 reader/anchors/——pdf-item-geometry/annotation-anchor/annotation-merge/annotation-resolve/annotation-resolve-layered/annotation-band-calibrate/anchor-serialize/anchor-blank-snap/anchor-locate/page-items.store/open-paper-anchor/annotation-style/ai-note-style+geometry-types；受锁面=anchor-locate 跨特性消费 import 改向（lineage×2+open-paper-bus——§5.2 风险 3 一次改向+check-quality 跨域规则同步核）+锚定回归网 17 件 import（selection-evaluate/selection-layer×2/selection-item-chain/selection-geometry/selection-paint/selection-mode/annotation-anchor/annotation-layer/ai-annotation-layer/annotation-merge/anchor-blank-snap/anchor-item-verify/anchor-locate/band-calibration/pdf-item-geometry/pages-overlay/pdf-page-canvas）+pdf-factory（CorpusExtractor import）；验收=verify 全绿+锚定回归网专项跑；翻 done 时 file 随迁改写；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G7', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M4=interact/ 域迁移（设计书 §3.4；7/11）：7 文件迁 reader/interact/——SelectionLayer/SelectionToolbar/selection-evaluate/selection-geometry/selection-paint/release-affinity/use-annotation-draft；受锁面=selection 系测试 import 同链（G2 已改写面随迁）；域间单向=interact→anchors/state 核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链+selection 回归；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G8', file: 'src/renderer/features/reader/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M5=panels/ 域迁移（设计书 §3.4；8/11）：8 文件迁 reader/panels/——OutlineAside/OutlinePanel/OutlineThumb/ReaderNotesPanel/AiNotesSection/AiNoteGroupList/AiNotesStatus/FragmentNotesList；受锁面=notes/outline 系测试 import+check-quality.mjs:96-97 两路径（ReaderNotesPanel）随步同链；域间单向=panels→anchors/state 核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G9', file: 'src/renderer/features/reader/PdfPageCanvas.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M6a=view 渲染簇迁移（设计书 §3.4——W1 处置拆两步之一；9/11）：14 文件迁 reader/view/——PageColumn/PageBox/PagesOverlay/PdfPageCanvas/TextLayer/text-layer.css/page-column-geometry/usePageColumnScroll/usePageLazyWindow/scroll-progress/AnnotationLayer/AiAnnotationLayer/AnnotationPopups/ReaderPageView；受锁面=对应测试 import+eslint.config.js INV-16 块 PdfPageCanvas/TextLayer 两路径随迁（四路径分步随迁第 3/4 步）；翻 done 时 file 随迁改写；验收=verify 全链；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G10', file: 'src/renderer/features/reader/ReaderPage.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '目录化 M6b=view 工具/搜索/标注 UI 簇迁移（设计书 §3.4；10/11——四路径分步随迁收官步）：13 文件迁 reader/view/=ReaderPage/ReaderToolbar/TabBar/reader-shortcut-handlers/ReaderShortcuts/AnnotationEditor/AnnotationMenu/useReaderSearch/ReaderSearchBox/reader-search/reader-search.store/SearchHighlightLayer/PageColumnView（设计书 M6b 括注「ReaderPage 等」按 §3.2 总表 27=14+13 对账补全）；受锁面=App.tsx（ReaderPage import 改向）+剩余测试 import；翻 done 时 file 随迁改写；验收=verify 全链+e2e 默认门 43+指纹门（view 27 文件迁移收官全量对账）；[locked-change][test-refactor]' },
  { id: 'F-GEOM-01-G11', file: 'docs/reports/2026-09-18_f-geom01-campaign-closeout.md', area: 'infra', owner: 'strong', status: 'open', summary: '战役收官票（设计书 §3.5/§5.1——F-TESTREF-W4 同款收官义务；11/11）：①头注重写扫尾（迁移后 reader 头注「改到哪写到哪」±50 行——selection-evaluate:54 stale 自述消除归 G2，本票全域扫尾）；②净删/交互点记账报告落本 file（git diff --stat 按域分组实测——逐项清单 §3.5 对账+跨族交互点 5→4+1 闭合 §2.6 表——LOC 辅助指标声明承袭）；③验收门全跑=e2e 一键全跑 test:e2e:all 45 全绿+默认门 43+锚定回归网+指纹门；④INV 终册收口（§5.4：INV-68 新增[G3 落]/INV-58 修订[G2 落]核验+INV-47 不修订确认+INV-37/INV-60 相容确认注记）；⑤指纹门基线重冻结（C_after ⊇ C_before 审计+scripts/test-surface.baseline.json+豁免清单全量 diff 审计——战役毕宪法义务）；F-GEOM-01 母票随本票翻 done（registry+relay 父行同步）；骨架=票面载体（标题日期=立案日）；[locked-change]（invariants/baseline/豁免清单受锁）' },
```

### 2.2 未跟踪新件全文（W1B 教训①——新件显式入包）

`src/renderer/features/reader/geometry-types.ts`（G1 骨架）：

```ts
/**
 * [F-GEOM-01-G1] M0 类型下沉切环——立案骨架（票面载体）。
 *
 * 目标：几何类型单源本件（设计书 §3.3——docs/design/
 * 2026-09-18_f-geom01-unification-and-reader-subdomains.md）：
 * 落 PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry（现驻
 * PdfPageCanvas.tsx:38-77）+PixelBox（annotation-anchor）+RowBand
 * （annotation-resolve）+COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO
 * （pdf-item-geometry——常量与类型同居 anchors 语义位）。
 * 红线：零文件移动（目录迁移归 F-GEOM-01-G6）；PdfPageCanvas 保留
 * export type 再导出（受锁测试旧路径 import 零触——M0 无受锁面）；
 * 切断三处 type-only 环+page-items.store/reader-search.store 两
 * store→PdfPageCanvas 边改 import 本件+annotation-anchor 的
 * COLUMN_GAP 值 import 改向本件（anchors 域内最终无环）。
 * 裁决与排程序：设计书 §5.3 切分（G1）+复杂度治理裁决书 §3 梯队三；
 * 排期=docs/handoff/relay.md 第四波子项 G1。
 * 实现者领票时本骨架改写为真实现（验收=unit 全绿+typecheck+verify
 * 全链；变异红证=删 PdfPageCanvas 再导出→旧路径 import 编译红→还原）。
 */
export {}
```

`docs/reports/2026-09-18_f-geom01-campaign-closeout.md`（G11 骨架）：

```md
# [F-GEOM-01-G11] GEOM 战役收官记账——立案骨架（票面载体）

> 收官票（设计书 §3.5/§5.1——F-TESTREF-W4 同款收官义务）：头注重写扫尾+
> 净删/交互点记账+验收门全跑+INV 终册+指纹门基线重冻结；F-GEOM-01 母票
> 随本票翻 done（registry+relay 父行同步）。本件=记账报告载体（标题
> 日期=立案日，内容日期以文内为准）。

## 待落清单

- 净删行数记账：git diff --stat 按域分组实测（reader 69 文件/11,860 行
  基线；逐项清单对账设计书 §3.5——净删目标 −50~−60 行+全域净额 −20~−80）
- 跨族交互点计数表（§2.6：现状 5 点→终态 4 点全显式+1 点闭合）
- 验收门全跑记录：e2e 一键全跑 test:e2e:all 45+默认门 43+锚定回归网+指纹门
- INV 终册状态（§5.4：INV-68/INV-58 修订落款核验+INV-47 不修订确认+
  INV-37/INV-60 相容确认）
- 基线重冻结审计（C_after ⊇ C_before+豁免清单全量 diff 审计）

## 裁决与排程序

docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
§5.3 G11 行+复杂度治理裁决书 §3 梯队三；排期=docs/handoff/relay.md
第四波子项 G11（末位）。
```

## 3. 机检证据（本批实测，raw=scripts/audits/geom01-impl-verify.raw.txt）

- check-tickets 单跑 EXIT=0：`工单统计：共 206 个；open 20（weak 可领 0，
  strong 20）`（基线 195 票 open 9 → +11 全 strong open）
- npm run verify 全链 EXIT=0（标记 `GEOM01_FILING_VERIFY_EXIT=0` 物理在
  raw 尾）：quality（占位/乱码/跨域/同值双常量）过｜test-surface 门过
  （183/1757/5334 base vs 187/1790/5417 cur=F-DEDUP-01 起既有纯增滞后态，
  本批零测试面变更零新增）｜tickets 206/20 过｜**locks 338 一致零变更**｜
  lint/typecheck 过｜test 170 文件 1745 用例全绿（与 batch 11 干树基线
  零漂移）｜build 绿（骨架 export{} 空体过 lint/typecheck/build）
- id 白名单推导：`F-GEOM-01-G1`…`G11` 匹配 check-tickets.mjs
  ID_WHITELIST `^((SR2?|R[123]|F|C)(-[A-Z0-9]+)+|…)$`（F 前缀+多段
  大写数字后缀）
- 受锁集合核对（scripts/get-protected-files.ps1 逐路径类）：tickets/
  registry.ts、src/renderer/**、docs/reports/** 均不在受锁集合 → 本批
  零 [locked-change] 义务、零 locks 操作（batch 8 教训②反向面：无锁面
  变更不跑锁命令，防 generatedAt 时间戳假 diff）

## 4. 主控自裁申报（请逐条拷问）

1. **锚选择**：G1/G11 锚新骨架载体（F-LAYER-01/F-TIME-01 先例）；G2 锚
   selection-evaluate.ts（唯一行为变更落点）；G3 锚 docs/invariants.md
   （纯登记面主产物=INV 落册）；G4~G10 锚各域代表存量件（迁移目标目录
   立案时不存在不可锚；**翻 done 时 file 字段随迁改写新址**——SR-RDR-02
   随迁先例，义务已写入各票 summary 与块注释头）。
2. **板面子项形态**：11 子项将以**顶层** `- [ ]` 行追加于 relay.md
   F-GEOM-01 实现行下（使火协议 `grep -c '^- \[ \]'` 门与勾选计数自然
   兼容；checked_total 24→35；父行由 G11 收官时勾选——G11 票面已声明
   母票同步义务）。
3. **零锁面**：见 §3 末条。
4. **e2e 未跑**：立案批零 src 行为变更，batch 1 立案批同口径未跑。
5. **no_progress 计数 +1 申报**：立案批板面无勾选行可勾（batch 1 立案批
   勾 T0/T1/T2 因板面即任务行）——本批进展以 11 子项上板+registry +11
   为证，计数按规则字面 +1 留痕（连续 3 才 HOLD，下批 G1 起恢复）。

## 5. 建议攻击面（不限于）

- 11 条目 summary 与设计书 §3.2/§3.4/§5.3 事实一致性（各步文件清单与
  计数：M1=10、M2=4、M3=13+1、M4=7、M5=8、M6a=14、M6b=13，合计
  69+1；M6b 设计书括注「ReaderPage 等」的补全=PageColumnView 是否
  正确——27=14+13 对账）
- 设计书 §5.3 尾注表与 registry 尾注声明一致性（G2
  [locked-change][test-refactor]、G3 INV 册受锁 [locked-change]、
  G4~G10 双尾注、G11 [locked-change]）
- 骨架头注：占位词/乱码/五层规约要素（票号/目标/红线/裁决与排程序）
- 母票注记是否引入事实错误（母票仍 open，注记只述立案事实）
- check-tickets 规则推演：新 11 票 id 白名单/owner/status/file 存在性/
  重复 id 哨兵/计数对账哨兵
- 命名一致性：relay 子项行与 registry id 一一对应（收口时落板）

## 6. 输出要求

报告分节：A 事实核对 / B 攻击发现（B=Blocker 必须回炉，W=Warning 建议
处置，N=Note 记录）/ C 结论。末栏必须含：`FINDINGS: B=n/W=n/N=n/VERDICT=…`。
