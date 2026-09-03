# 2026-09-04 LOOP 交接 v42——F-A6-b2 毕：主链几何源迁移落地（项声明几何+基线分组），D1 病根族根治面完成

> 上段=v41（b1 T1/T9 前置+决策门过）。本段=F-A6-b2（阶段 3 主链迁移）：
> 四步交付（纯函数件→单测→通道切换→三轮取证）→门一 Kimi PWW 回炉三闭合
> →门二 deepseek PWW 零 BLOCKING（seam_ruling 定性 AnnotationLayer 票外
> 边界）——**D1 病根族（锯齿/右溢/错绑/旋转）的根治面完成**，F-A6-c 可开工。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| 新件三 | `pdf-item-geometry.ts`（497 行：viewport transform **内联数学**[六元乘——零 pdfjs-dist import，INV-16 白名单未扩]/rectsForOffsetRange+**grapheme 细分**[Intl.Segmenter+RTL 翻转+竖排轴互换+四角包围盒——取证 §9-4 数据缺口的单测补]/baselineGroupBlocks 基线分组并块[v 轴投影+x 断段]/bandsFromItems[C5 同源——bands 由项几何+styles 派生,禁混用]/selectionHealth G2[≥5%+右溢 2px 占位]+偏移表 buildItemOffsets+对账 reconcileItemsWithDom）；`page-items.store.ts`（68 行 zustand 单源注册表——PagesOverlay pageTexts useState 整体迁入,写者唯三口同构）；`selection-evaluate.ts`（183 行——evaluate 域从 SelectionLayer 拆出[组件 ≤250 红线解除,196 行],四道收敛守卫逐字保留） |
| 产链切换 | rects/bands=项几何链（itemSelectionGeometry:rectsForOffsetRange+基线分组+归一化 pixelBoxOf 同盒 INV-37+mergeRects 终裁带角度门[r3b 修复]）；**save() 落库与 paint 同源=INV-58 前半**；DOM 量测链降回退（页项缺失/偏移对账失败/计算异常三因→console.warn+原链兜底,不静默）；T2/T3 回退加固（mergeLineRects 聚类比较扩到全部簇——先红 T3-a/b 2 红→绿 26/26）；G2 active（拖选 setPaint(null) 抑制+setPending(null) 拒入库+fromMouseUp toast[门一回炉对齐跨页「防抖静默」形态]） |
| 第三轮取证 r3c | 健康页 paint 42/10/3 **逐位不变**+右溢 0+outside 不增；**IoU_x 全升**（3882 0.9996→0.9999/1c2d 0.9982→**1**/s3base 0.9998→1）+shift 全样本 ≤0.01；s1rot 3=行真值且**零高伪迹块构造性消除**（§10 预测兑现）；**tick 布局读 gBCR 709→18（−97%）/gCS 2734→685（−75%）=通道生效实证**（间隔 ~200ms 调度未动）；两实现事故 r3a（项盒域差——viewport 产出 textLayer 盒本地域 vs gBCR 绝对域,**G2 全抑制 paint=检测器实战拦截错几何的自证**）/r3b（mergeRects 终裁无角度门→旋转三行桥接 1 块）——事故档 f-a6-diag-out-r3a/-r3b 留档,各补回归单测 |
| 测试 | pdf-item-geometry.test 22 用例（六组:项矩形/细分[CJK+emoji 代理对/RTL/竖排/旋转 v 投影——运行时触发面零的单测闭合]/偏移表/基线分组/bands 同源[zoom 缩放不变断言]/G2）+selection-item-chain.test 6 用例（通道生效[判别性:项链 10.61% vs DOM 25.25%]/保存同源/zoom 现读/回退+warn/G2 抑制+toast）+annotation-anchor.test T3 新 its+W1 守卫；**变异红证 6 组**（M1 RTL/M2 基线容差/M3 G2 阈值/M4 grapheme→UTF-16/M5 通道断链 6/6 红/M6 角度门摘除） |
| 门审链 | 门一 Kimi k3 **PWW**（五维全过:viewport 数学逐行核对与 pdf.mjs PageViewport 构造器一致/通道同构/守卫逐字/事故修复强证据；2W=T3 扩簇 y 膨胀[守卫用例证**结构性惰性**——groupTop/Bottom 只喂 yOverlap 分支,跨行判据恒走 centerOk,零改动交付]/G2 toast 门控;4N）回炉三闭合（W1 守卫/W2 fromMouseUp/N1 归一化端点式——各先红后绿）→门二 deepseek **PWW 2W2N 零 BLOCKING**（**seam_ruling:AnnotationLayer 存量重锚域 DOM 量测域与迁移后 viewport 声明域并存=INV-58 票外边界不阻塞收口,F-A6-c 开工条件必须显式排期同族化或域间换算守卫**;W2=pitch 缺省极限形态夹具随 c 票;N1=scale [0.5,3] 共享常量随 c 票;N2 manifest 已主控核验;**输出经 reasoning 通道——主控提取落盘,调用器新形态在档**） |
| verify/locks | **152 文件/1316 用例/locks 275** 全绿亲验（VERIFY_EXIT=0;b1 基线 150/1285→+2 文件+31 用例）[locked-change] |

## 2. 下段执行序

1. **F-A6-c D2 调度与快路径票**（§2 首项——门二开工条件三件随票：①**AnnotationLayer 重锚域 seam 排期**（同族化或域间换算守卫——至少入档为票面条款/独立票立案）；②pitch 缺省+跨行中心距 ≤2px 极限单视觉行形态守卫夹具；③scale [0.5,3] 共享常量化）：selection-geometry rAF 对齐（leading 首事件排 rAF/帧内合帧/settle 防抖 200ms 零变/cancel 清 rAF）+S1b/S1c 改写（vi.stubGlobal rAF 先例 selection-paint.test:324-327）+「settle 产物落地**同帧覆盖**快路径产物」断言+新单元「帧内合帧去重」至少一锚+INV-58 后半（快路径同族=pdf-item-geometry 链——本票已奠）;tick 基线前后对比（§7 口径:间隔+布局读——b2 后 gBCR 18/gCS 685 起算）。
2. **F-A6-d 收口票**（c 后）：e2e 补断言（rotation×CropBox 组合页 b1 已知边界+reader-text:872 指纹观察）+INV-37/58 登记 docs/invariants.md+ADR-0019 R3 落笔+locks 收账。
3. **P7D-01 批一**（闲时可动）/P7X-02（闲时）照旧。
4. 被动观察：e2e reader-text:872 第 1 现指纹在档（c/d 全量 e2e）。

## 3. 本段方法论资产

- **实现事故=检测器的免费实战验证**：r3a 域差事故让 G2 全抑制 paint（检测器拦截错几何）——「检测器先写+事故后到」的组合把 G2 从「占位疑虑」变成「实战验证过的守卫」;第三轮取证的判据价值随实现迭代滚动。
- **「结构性惰性」守卫法（门一 W1）**：扩簇副作用的机理论证（groupTop/Bottom 只喂单视觉行分支）+守卫用例锚定（不改动交付）——比「顺手加 y 重叠下限」更优:不加没有证据需要的约束。
- **外链调用器新形态**：deepseek v4flash 偶发把完整 JSON 输出路由进 reasoning_content（content 空）——**解析前先查 .reasoning.txt 再判废**,本次门二裁决即从 reasoning 通道完整提取（json 产物主控落盘在案）。
- **INV 适用域的边界裁决（门二 seam_ruling 范式）**：跨模块不变量（INV-58 同族禁令）遇到「本票约束域 vs 邻票独立域」时,终审显式定性适用域边界+残留缺口排期,而非静默扩域或无视。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：票面拟定（四步交付结构）+两轮验收（diff 审/
  三轮 JSON 对照抽查/verify 三次亲验）+门一三条处置编排+门二 seam 追问拟定+
  reasoning 通道提取+收口三件
实现者子代理 GLM5.3flash 档两轮：b2 四步实现（29M tok/42min——22+6 用例/
  变异 6 组/三轮取证+两事故修复）+门一回炉（7.4M tok/6.5min——W1 守卫/
  W2 先红后绿/N1 端点式）
外链（gate-call 链）：
  Kimi k3 门一：in 20325 / out 4380 / 59s ✓ PWW
  deepseek v4flash 门二 r1（22k）：out 22000 全 reasoning=废
  deepseek v4flash 门二 r2（32k）：in 26305 / out 2232 / 19s ✓ PWW
    ——完整 JSON 经 reasoning 通道,content 空;主控提取落盘（包大小影响推理
    预算的经验再加一条:材料越重 reasoning 越深,预算按 in×1.2 给）
```

## 5. 环境事实滚动

- 基线推进：**152 文件 1316 用例/locks 275/e2e 39**（b2 +2 文件+31 用例）。
- 三轮取证数据目录并存在档：f-a6-diag-out-a1/（取证原始）+f-a6-diag-out-b1/（T1/T9 后）+f-a6-diag-out/（迁移后 r3c）+f-a6-diag-out-r3a/-r3b/（事故档）——**F-A6-c 复跑前先 mv 当前 out/**（脚本 rm 重建惯例）。
- page-items.store=新单源注册表（zustand）：SelectionLayer evaluate 经 getState 直读——c 票快路径的会话缓存设计以此为数据源。
- 任务池：open 3（F-A6 b2 毕待 c/P7D-01 待批一/P7X-02 未动）+门二 seam 排期项（AnnotationLayer 同族化——c 票条款或独立票）。
- 沿用 v41/v40 各条。
