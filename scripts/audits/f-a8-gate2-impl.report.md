# F-A8 门 2 主链切换票——实现者报告（S0~S6 状态机上线+DOM 链降回退+INV 登记）

> 实现者=子代理（GLM5.3flash 定档,环境统一档欠账披露）；票面=本目录
> f-a8-gate2-impl-brief.md；设计书=docs/design/2026-09-04_f-seam-reanchor-design.md。
> 全部退出码为真退出码（`echo exit=$?` 落盘 .raw.txt）。

## 1. 实现摘要

- **三层编排上线**（新件 `src/renderer/features/reader/annotation-resolve-layered.ts`，
  228 行）：
  - `resolveAnnotationRectsLayered`（Annotation 版）：S1 对账门
    （reconcileItemsWithDom×fullTextOf）→通过走 S2/S3a
    （resolveAnnotationRectsItem+source:'item'）；失败/缺席走 S4
    （resolveAnnotationRectsDom+source:'dom'）+S6 逐条病理抑制
    （domProductSuppressed→delete+warn）；S0 缺席（entry=null）无判定材料
    →S4 现状语义（申报见 §8-4）。
  - `resolveAiNotesLayered`（AI 段版，共形）：S1 通过→verifyQuoteItem（start:0
    漂移重定位）+itemSelectionGeometry 主链；S4=原组件 DOM 循环迁入
    （verifyQuote→findRangeAtOffset+bandsForTextNodes，行为零改）；S3b/S6=该段
    不渲染（AI 无存量语义）。
  - `domProductSuppressed`（S6 判定共享单源+warn 单源）：boxes=项几何
    rectsForOffsetRange 该引文区间项盒，blocks=DOM 产物转 px，base=entry 盒
    ——门 1 探针 healthDom 口径（f-a8-gate1-diag.mjs:339）同构。
- **CR1 store 订阅重入**：AnnotationLayer/AiAnnotationLayer 各加
  `usePageItemsStore((s) => s.pages[page + 1]) ?? null` 订阅（键 1 基=page prop+1，
  selection-evaluate:118 先例同式；缺席归一 null=编排器 S0 判定口径），
  effect 依赖加 pageEntry——store 晚于 textLayer 就绪竞态由订阅兜。
- **CR3**：resolve 读数以当前 page prop 为键（pages[page+1]）——文档切换=store
  clear 重填（写者契约在案），无旧文档命中。
- **resolved source 域标记**：ResolvedAnnotation 增可选
  `source?: 'item' | 'dom'`（运行时不入库——模型锁面零触碰）；渲染块加
  data-source 调试属性（色块样式不区分源=INV-60 渲染零差）；AI 缓存
  AnchorCache 增 source 域。
- **改名件**：resolveAnnotationRects→resolveAnnotationRectsDom（函数体零改
  ——只改名+头注一句；INV-47 数值面锚）；itemViewportOf 加 export（AI 编排
  同源消费，函数体零改）。
- **page-items.store 零改**（订阅用现成形态——票面预判兑现）；
  **e2e reader-text.spec.ts 零改**（既有小票回归——票面预判兑现）。

## 2. 修改文件清单（票面范围内）

| 文件 | 改动 |
|---|---|
| src/renderer/features/reader/annotation-resolve-layered.ts | **新件**（简报预案「或同域新件」——annotation-resolve.ts 408 行+编排器会破 500 红线） |
| src/renderer/features/reader/annotation-resolve.ts | 改名 …Dom+ResolvedAnnotation.source+itemViewportOf 导出（215 行三处，函数体零改） |
| src/renderer/features/reader/AnnotationLayer.tsx | 三层编排接线+CR1 订阅+data-source（249 行≤250——check-quality 口径含末行） |
| src/renderer/features/reader/AiAnnotationLayer.tsx | 同构接线（234 行） |
| docs/invariants.md | INV 四条（§6） |
| tests/unit/renderer/annotation-layer.test.tsx | F-A8 门2 describe（6 用例+fixture 族） |
| tests/unit/renderer/ai-annotation-layer.test.tsx | F-A8 门2 describe（3 用例） |

## 3. TDD 首红

- 8 新用例先红（门 2 改造前 data-source 属性/编排器/订阅全部缺席=红），
  既有 13 用例不回归：`f-a8-gate2-first-red.raw.txt` **exit=1**。
- fixture：三段中文文本 DOM（`<p>`×3）+合成 items（transform=[10,0,0,10,72,y]，
  view [0,0,612,792]/scale=1/ascent 0.8）+store setEntry/clear。期望值全部手算
  （quote='正文'@7..9 落 item['中段正文内容'] f0=2/6/f1=4/6 →
  rect={105.3333,112,33.3333,10} → left=17.2113%/top=14.1414%/width=5.4468%/
  height=1.2626%；存量 F-11=25.2%/1.56%；jsdom DOM 兜底=0/100）。

## 4. 变异红证（cp 备份法——还原后 diff 空，M3 还原后 21/21 绿复核）

| 变异 | 内容 | 红证 | 档 |
|---|---|---|---|
| M1 | 删 CR1 store 订阅（pageEntry=null） | CR1 竞态用例红（expected 'dom' to be 'item'）+S1/S2/S6 连带红 | f-a8-gate2-mutM1.raw.txt exit=1 |
| M2 | 删 S6 抑制（判定短路 false） | S6 用例红（expected 'dom' to be null——DOM 产物直显） | f-a8-gate2-mutM2.raw.txt exit=1 |
| M3 | 主链换 DOM（S1 通过跳过项几何） | S2/CR1 域标记断言红（expected 'dom' to be 'item'） | f-a8-gate2-mutM3.raw.txt exit=1 |

## 5. verify / e2e / locks（真退出码）

- 全量单测：**155 文件/1356 用例 passed**（基线 155/1347+新 9），
  `f-a8-gate2-green-unit.raw.txt` exit=0。
- build：`f-a8-gate2-build.raw.txt` exit=0。
- **全量 e2e：42/42 passed（2.0m）**，`f-a8-gate2-e2e-full.raw.txt` exit=0
  ——「划选高亮后重开仍在原位；批注编辑与删除可用」（INV-51 稳态口径）
  绿（reader-text.spec:217，4.2s）；**F-ARCH4-M1 偶红本轮零现**（第 1 现指纹
  记录继续，无第 2 现——非 BLOCKED）。
- locks：unlock（281）→改→apply（**281**，manifest 同步）；
  `npm run verify` 全绿 **exit=0**（quality+tickets+locks+lint+typecheck+
  test 1356+build——`f-a8-gate2-verify.raw.txt`）。

## 6. INV 四条登记摘要（docs/invariants.md）

- **INV-58 扩域**：适用域由 selection 产链扩为「selection 产链+Annotation/
  AiAnnotation 重锚链（门 2 起项几何族=重锚主链）」；DOM 量测仅显式回退层
  （…Dom 函数体零改）+产物必须标域；声明处+强制方式补 layered 域与门 2
  describe（M1/M2/M3 红证在档）。
- **INV-47 适用面收缩注记**：mergeLineRects 退出重锚主链→适用面=「S4 DOM
  回退层（函数体零改=受锁⑪断言数值面不变的结构保证）+存量读时归并」。
- **INV-59 新增（重锚同族配对令）**：resolved.rects 与 bands 必须同几何族；
  跨族配对仅允许 S3b/S5/S6 显式回退格=登记边界（消 R1 于主链）。
- **INV-60 新增（重锚显示覆盖登记）**：重锚产物覆盖库值仅显示层永不回写；
  source 域标记运行时不入库；渲染行为零差。
- 册子完整性：INV 共 60 条，UTF-8 mojibake=0。

## 7. 真机面：f-a8-gate1-diag.mjs 复跑一致性

- 复跑 exit=0（`f-a8-gate2-probe-rerun.raw.txt`）；数据落
  **f-a8-gate2-out/**（17 文件——探针 OUT 硬编码 f-a8-gate1-out，采用
  「备份门 1 档案→跑→移名→恢复」方案，零脚本修改，门 1 档案 17 文件原样在位）。
- **一致性：7 页×5 锚全指标逐位相同**（iou1d maxΔ=0.0000/dyMedianPx Δ=0.000/
  mispair 块数逐页相同/reconcile 全 true）——同代码同数字（确定性管线连轮次
  噪声都为零），远超「轮次噪声内量级」判据。`f-a8-gate2-probe-cmp.raw.txt`。
  病理页（s1rot/s2crop）与 G2 弱式复现形态指标同门 1 档。
- **证据边界（门一 N2 明示）**：7 页×5 锚全健康夹具——maxΔ=0.0000 证**健康面
  接线零漂移**；S1 失败/S6 抑制路径**零鉴别力**（探针直喂 entry 双链对照，
  不经编排器 S1 门/S6 抑制分支——该面由单测 S 格补，见 §3/§4）。

## 8. 自裁申报（超票面/边界决定，全部留痕）

1. **新件拆分**：编排器拆 annotation-resolve-layered.ts（简报明文预案「或同域
   新件」；驱动=annotation-resolve.ts 408 行+编排器必破 500 红线）。
2. **AI 版编排入口**：resolveAiNotesLayered 收编 AiAnnotationLayer 原 resolve
   循环（DOM 段逐语句迁入）——「Ai 同构接线」落地为编排器单源+组件只消费，
   消除两份编排骨架重复。
3. **S6 blocks 口径**：blocks=DOM 产物（归一化 clamp01 后）×entry.box 反推 px
   ——右溢支路弱化为 ≈恒 0（已知边界：s1rot 右溢 3.2px 形态不拦，门 1 档
   在案）；**outsideRatio 支路完整有效**（s2crop 50~100% 盒外形态拦截在档）
   ——代码注释+本报告双申报。
4. **S0 缺席路径无 S6**：entry=null 时无项几何判定材料→不抑制（S4 现状语义
   直出 source:'dom'）——态空间表 S4 出边「G2 病理→S6」隐含判定材料在场
   （=S1 失败路径），边界申报。
5. **AI describe 3 用例中 1 例（S3b）门 2 前即绿**：AI 语义（引文不存在→不
   渲染）改造前后等价=回归守卫性质（未计入首红面；首红面=其余 2 例）。
6. **首红期望值手算修正**：初版 left 期望 17.2228 为手算笔误（105.3333/612
   精确=0.17211329→17.2113%）；实测红后复算修正——数值收紧非放宽（width/
   top/height 原算无误）。同批修测试自身 bug：mountFa8 漏传 pageRoot 实参
   （S0/CR1 全用例 'querySelector' undefined 崩——测试缺陷，与实现无关）。
7. **行数红线回压两轮**：AnnotationLayer 249（255→251→249，check-quality
   口径 251 触红后追加压缩——纯注释压缩零行为面）。
8. **一次性对比工具删除**：f-a8-gate2-cmp.mjs（探针一致性对比）跑完即删
   ——数据已落 probe-cmp.raw.txt，不留未入册 scripts/*.mjs。

## 9. 疑虑与移交主控项

1. **[重要] 门 0 遗留：anchor-item-verify.test.tsx 从未被 git 跟踪**
   （`git ls-files`=0/git log 无提交，但门 0/1b verify 1347 用例与 locks
   manifest 均收录其内容）——主控提交本票时必须 `git add
   tests/unit/renderer/anchor-item-verify.test.tsx`，否则 CI clone 缺文件→
   locks:check 红。本票铁律禁 git add，只能申报。
2. e2e 全量启动后做过两轮纯注释压缩（AnnotationLayer 行数回压）——零行为
   面，最终 `npm run verify` 全绿（含重 build+1356 test）覆盖此点；若主控
   要求绝对同源可重跑 e2e（本轮基线 42/42）。
3. S6 判定的 rightOverflow 支路弱化（§8-3）——若后续病理形态需要右溢拦截，
   需 DOM 链产出归一化前 px 块（现 …Dom 函数体零改约束下不可得）——门 3
   收口时可随回退层去留裁决一并处理。

## 10. 回炉一轮补记（门一 Kimi K3 PWW 5W2N——W2/W3 归主控面不动，本节=W1/W4/W5/N1/N2）

- **W1 S6 名实偏移补注**：annotation-resolve-layered.ts 头注 S6 行+INV-58
  （invariants.md）双落「S6 触发=项盒健康代理——blocks 经 clamp01×base 构造
  恒落盒内，unhealthy 实由 boxes[项几何]越界触发；项盒健康而 DOM 链独立
  病理时 S6 不拦（门 3 随回退层去留复核）」。
- **W4 AI 侧 CR1 竞态用例（补用例路线）**：ai-annotation-layer.test.tsx 新
  describe「F-A8 门2 回炉 W4」——store 空挂载→S4（dom）→注入 entry→订阅
  触发重 resolve=项几何产物（item）+S0 翻转断言（left=17.2113 手算锚）。
  绿面 12/12；**能失败一次红证=M1' 变异**（AI 组件订阅删
  `pageEntry=null`——`f-a8-gate2-rework1-mutM1ai.raw.txt` exit=1：W4 竞态
  用例+S2 用例双红，还原 diff 空+22/22 复绿）——M1 双组件证据行：
  AnnotationLayer=M1 档（§4）、AiAnnotationLayer=M1' 本档，删订阅两组件各红。
- **W5 INV-47 措辞降层**：注记中「函数体零改=受锁⑪断言数值面不变的结构
  保证」→「回退层行为面不变（resolveAnnotationRectsDom 函数体零改——
  mergeLineRects/estimateLinePitch 受锁⑪锚定件[annotation-anchor.ts]行为
  不受本改名影响的间接保证）」。
- **N1 warn 分案**：resolveAiNotesLayered 增 viewportDegraded 案由位——对账
  已通过但 viewport 退化（scale≤0）落 DOM 链的 warn 文案与「对账失败」分案
  （「第 N 页 viewport 退化（scale≤0）——S4 DOM 回退层接管（AI 段）」）；
  注释同时声明行为差（AI 无存量可回退故降 DOM 链兜底；Annotation 版同因
  落 S3b）。
- **N2 证据边界明示**：§7 探针复跑段补「7 页×5 锚全健康夹具——maxΔ=0.0000
  证健康面接线零漂移，S1 失败/S6 抑制路径零鉴别力（该面由单测 S 格补）」。
- **收口数字**：locks unlock→apply 281（`f-a8-gate2-rework1-unlock.raw.txt`）；
  `npm run verify` 全绿 **exit=0**（quality+tickets+locks+lint+typecheck+
  **test 1357**（1356+W4×1）+build——`f-a8-gate2-rework1-verify.raw.txt`）。
  §9 移交主控项不变（anchor-item-verify.test.tsx 补 add=W3 主控面）。
