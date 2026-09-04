# 2026-09-04 LOOP 交接 v44——F-A6 战役收官：五票全链完成（a/b1/b2/c/d），D1+D2 双根治落地

> 上段=v43（c 票毕+暂停注记）。本段=用户令「彻底完成 F-A6」：d 收口票
> （e2e 两小票+INV-37/58 登记+ADR R3 落笔）→门一 PWW 回炉 W1 闭合→门二
> PWW「五票在材料层面可宣告完成」——**F-A6 registry 翻 done；票外发现
> 立 F-A7**。战役汇报见 §3（用户要求：F-A6 用什么方式解决了哪些问题）。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| F-A6-d 收口 | e2e 两新小票：组合页（createRotatedCropPdf=/Rotate 90×CropBox [36,36,540,720]——b1 门一 N3 缺口兑现；四断言=span×canvas **包含度 ≥0.5 实测 1.000**+toolbar+块数=行真值 1+块不溢渲染页盒）+拖选随动（3 次 selectionchange×50ms→300ms 窗 ≥2 次块变更=rAF e2e 级）；断言红证 4（块数翻转/随动翻转/包含度翻转[Received 1 vs ≤0.1]/右缘收紧[Received 1116.11 vs ≤549.2]——文件备份法还原 diff 空）；live range 诱发链不锚 e2e（裁量在档） |
| 全量 e2e | **41/41 passed 零 skip**（39 基线+2 新）；F-ARCH4-M1（原 :872）本轮绿=第 2 现未再现——观察清单挂接（再 1 现即按「同用例 2 次」立案线立案——门二 N2 处置） |
| INV/ADR 登记 | INV-37 行更新（调度条款 rAF 化+拖选期「所见≈所存」弱化显式[用户裁决 2026-09-03]+F-A5 band 口径接缝修正——bandsForTextNodes 驻标注域防与 INV-58 互斥+锚列扩容）；**INV-58 新登记**（invariants.md:73——同几何族+C5 同源+适用域=selection 产链+AnnotationLayer 票外[门二 seam_ruling]+三层回退；已锚定 2026-09-04）；**ADR-0019 R3 修订段落笔**（R1/R2 同体例；终态数字按裁决表 §10/§11/§12 校正；R-迁移落地形态替换草案加固形态） |
| 门审链（d 票） | 门一 Kimi **PWW 2W3N**（「收口票整体诚实…走明路而非暗改断言过门」；W1 几何断言红证+判据升级→回炉闭合；W2 立案回执→本提交 F-A7 兑现；N3 观察→挂接）→门二 deepseek **PWW 2W2N**（「**五票在材料层面可宣告完成**：D1 健康页逐位不变+病理页消除、D2 间隔 200→59.5ms+clientRects 8→1+gCS 685→87 构成取证终态闭合」；W2 红证形态=期望翻转红已证断言读真值,主控直裁闭合；N1=材料节选口径非文件缺陷[INV-58 表行唯一亲验]）；外链新教训：ds 24000 预算被推理链吃尽(78KB reasoning 截断)——瘦身包+40000 成功 |
| F-A7 立案 | **票外发现**（d 票组合页首跑红证暴露）：/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高（PageColumn 页尺寸缓存用 page.view 未旋转口径 vs canvas getViewport 旋转口径）——页框与渲染盒错配；selection 几何链不受影响（块与 span 墨带贴合坐标证据）；真实库全档 rotate=0 未显现（低优先）；修法方向=页尺寸缓存按 viewport 旋转口径取（与 b1 PdfPageGeometry 通道同源） |
| F-A6 终态 | **registry 翻 done**（a/b1/b2/c/d 五段注记全链在档）；verify **154 文件/1325 用例/locks 277** 全绿亲验+e2e 41/41；grep TODO/FIXME/placeholder 零命中 |

## 2. 下段执行序

1. **F-A7 旋转页占位盒**（open,低优先——真实库未显现）：PageColumn 页尺寸缓存旋转口径+e2e 复用 createRotatedCropPdf 断言页框与 canvas 盒一致。
2. **AnnotationLayer 重锚域同族化/域间换算守卫**（b2 门二 seam_ruling 排期——独立票立案待开）：存量标注 rects 重锚域（DOM 量测）与迁移后保存域（项几何）的换算或迁移。
3. **P7D-01 批一**（闲时可动）：动效 --dur-*+间距 inline 12 处+层级语义命名——零视觉差（无头截图 diff 验收）；自产 .mjs 诞生即 locks。
4. **P7X-02 时长 outbox**（闲时——service 层非视觉）：设计面=与 saveProgress 单通道关系+重启恢复语义；设计链外链双跳。
5. **P7D-01 批二**（在场轮）：字号语义刻度+mockup 用户逐档裁。
6. 被动观察：F-ARCH4-M1（原 :872）第 1 现在档+本轮绿——再 1 现即立案（同用例 2 次线）。

## 3. F-A6 战役汇报（用户要求：用什么方式解决了哪些问题）

**病根与对策总表**（详见 ADR-0019 R3+裁决表 §1~§12）：

| 问题（用户实报/取证发现） | 解决方式 | 修复票 |
| --- | --- | --- |
| D1-锯齿：划选灰块同行拆多块、y 序交错拆簇 | 几何源迁移：rects 从「Range.getClientRects DOM 量测+mergeLineRects 聚类」改为「**PDF 文本项声明几何直取**（PdfTextItem.transform/width/height×viewport 合成）+**基线分组并块**（v 轴投影聚类——取证证明旧聚类对项盒结构性拆簇 211 vs 行真值 43）」 | b2 |
| D1-右溢：选区块超出文本区右缘 | 项矩形=嵌入字体度量真值（构造无回退字体盒宽误差）+归一化端点式夹取（越界自洽）——右溢四轮取证恒 0px | b2 |
| D1-错绑：matchBand 垂直错位/并集放大 | bands 改由**项几何+styles 同源派生**（C5——禁 rect 项源×band DOM 量测混用） | b2 |
| D1-旋转页整片错位（T1:/Rotate≠0 文本层错位） | duckViewport rotation 真值化+**容器 CSS 变换半边**（pdf.mjs 源码级发现：span 恒未旋转空间百分比,页旋转由容器 transform 承担——官方规则内联等价+宽高交换） | b1 |
| D1-CropBox 原点平移（T9:偏移页整体平移 36px） | duckViewport rawDims 真值化（page.view 直出） | b1 |
| D1-同类回退面：聚类「只与末簇比较」失联拆簇（T2/T3） | 回退路径加固：聚类比较扩到全部簇（主链已迁,此为 DOM 量测回退链的加固）+守卫用例 | b2 |
| D1-异常 PDF 兜底（G2 降级门） | selectionHealth 检测器 active：偏离率 ≥5%（健康 0~0.12% vs 病理 25~62.5%）→拖选期抑制渲染+mouseup 拒绝入库 toast（INV-02）——r3a 事故实战拦截错几何自证有效 | b2 |
| D2-拖选一卡一卡（5Hz 步进） | 调度 rAF 对齐：leading 首事件即排 ≤16ms+**帧内合帧去重**；实测间隔 200ms→59.5ms、mutations 7→20 全跟随 | c |
| D2-每 tick 全量重算冗余（布局读风暴） | **快路径 evaluateVisual**：项几何直取（零 getClientRects/零 gCS/省 quote 构建同族管线）——gCS 685→87、clientRects 8→1、delta 中位 32.3→11.9ms | c |
| D2-portal 全子树重渲染 | SelectionPaint React.memo+props 稳定化 | c |
| 落库一致性（INV-37/58） | 快路径与 settle 全量**同几何族**（同族禁令 INV-58）+松手/保存时刻严格「所见即所存」；拖选期显式弱化「所见≈所存」（用户四点裁决之一） | b2+c+d 登记 |

**验证体系**：四轮 Electron 取证（f-a6-diag 三件探针,数据 5 目录并存）+单测 28+22+11+8 新用例（含变异红证 13 组）+e2e 组合页/拖选随动两小票（41/41）+五票×双门审（Kimi k3+deepseek v4flash 外链,档 10 份）。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：d 票验收（verify/e2e 档抽查/INV-58 唯一性
  亲验）+门二两发（24000 截断→瘦身+40000 成功）+裁决处置（W2 立案 F-A7/
  W2 红证形态直裁/N1 节选口径澄清）+registry 双改（F-A6 done+F-A7 立）+
  交接书 v44+战役汇报
实现者子代理 GLM5.3flash 档两轮：d 票实现（6.8M tok/21min——e2e 两小票+
  INV/ADR+全量 e2e）+门一 W1 回炉（1.7M tok/3.7min——判据升级+双红证）
外链（gate-call 链）：
  Kimi k3 门一：in 15484 / out 4955 / 84s ✓ PWW
  deepseek v4flash 门二 r1（24000）：out 23999 全推理链截断=废（78KB
    reasoning 未见终局——**预算教训:重材料瘦身+40000**）
  deepseek v4flash 门二 r2（瘦身 11KB/40000）：in 4261 / out 1626 / 12s
    ✓ PWW「五票可宣告完成」
```

## 5. 环境事实滚动

- 基线终态：**154 文件/1325 用例/locks 277/e2e 41**（F-A6 战役全程：149/1273/
  269/39 → +5 文件+52 用例+8 锁+2 e2e）。
- 任务池：open 3（**F-A7 新立**旋转页占位盒[低优先]/P7D-01 待批一/P7X-02
  未动）+AnnotationLayer seam 独立票待立（b2 排期项,优先级高于 P7D-01 批一?
  ——按「INV-37 长期一致性」属中优先,与 P7D-01 批一同层,下段主控定序）。
- e2e 观察清单：F-ARCH4-M1（原 :872）1 现在档+本轮绿——再 1 现即立案。
- 外链预算公式修正：deepseek v4flash 的 reasoning 消耗 ∝ 材料复杂度——
  重包（>40KB）预算 24000 不够;瘦身到 <15KB+预算 40000 稳（或直接按
  in×1.5~2 给）。
- createRotatedCropPdf 进 pdf-factory（受锁）——F-A7 的 e2e 直接复用。
- 沿用 v43/v42 各条。
