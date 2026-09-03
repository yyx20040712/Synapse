# 2026-09-04 LOOP 交接 v41——F-A6-b1 毕：T1/T9 前置修复+阶段 2 决策门过（门二 PASS+ENDORSE），阶段 3 主链迁移放行

> 上段=v40（F-A6-a 取证票收口：R-迁移为主修阶段化裁定）。本段=F-A6-b1
> （阶段 1 T1/T9 前置修复+阶段 2 复跑决策门）：三屋实现→门一 Kimi PWW
> 2W3N 回炉→门二 deepseek **PASS 零 findings+1c2d 追认 ENDORSE**——
> 决策门终位成立，**阶段 3（主链迁移 pdf-item-geometry）放行**。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| 修复面 | TextLayer.tsx（105→174）：duckViewport(scale,rotate,view) 真值化导出（rotation=rotate；rawDims={view 跨度,view[0],view[1]}——T9）+**rotatedContainerBox()**（90/180/270 容器宽高交换+官方 pdf_viewer.css `[data-main-rotation]` 变换内联等价——**pdf.mjs 4.10.38 源码级发现：TextLayer span 恒未旋转用户空间百分比，页旋转由容器 CSS 变换承担**，repo 的 text-layer.css 未提取该组规则——T1 修复的必要半边，超票面自裁申报）；PdfPageCanvas 新 PdfPageGeometry{rotate,view} 类型+onPageRender 第三参下钻（textContent 载荷零改）；PageBox/PageColumn 纯类型扩参（TS 逆变物理必需，超票面申报）；PagesOverlay 注册表存 geometry；TextLayer props geometry 必填（无静默回退） |
| 阶段 2 决策门 | **过（终位）**：s1rot outside 5/8→**0/8**+A_paint 1→**3**（=行真值）；s2crop 双向平移 −36.02→**0.03**/IoU 0.8213→**0.9998**（3/3 配对）；健康页 A_paint 逐位不变（42/10/3）、outside 逐位不变；1c2d IoU 0.9999→0.9982=**ENDORSE**（分数 view 页 rawDims floor 逼近改精确值=度量精度改进；3882/s3base 逐位不变佐证）；tick 间隔 ~200ms/布局读同量级。唯二未满字面项归因在档（s2crop outside 1/8=合成样本 ROW1 基线在 CropBox 顶缘的 ascent 14.29px 越界伪迹——canvas 裁剪/span 盒不裁口径差） |
| 测试 | text-layer.test.tsx 新 11 用例（duckViewport 直测 3[判别值 rotate:90/view:[36,36,540,720] 防硬编码回退]+rotatedContainerBox 四旋转态 4+jsdom 真 pdf.js TextLayer 语义级 3[canvas 2d 桩渲染真 span 断言百分比+data-main-rotation+交换宽高]+transform-origin 锁 1[无内联覆盖+text-layer.css:58 注释锚——jsdom css:false 限制申报]）+pdf-page-canvas 几何下钻断言+pages-overlay 透传锚；先红 12 红→绿；变异红证 2（rotation→0/pageX→0 各恰 2 用例红，文件备份法还原 diff 空）+transform-origin 变异红证 1 |
| 门审链 | 门一 Kimi k3 **PWW**（修复正确性/通道/测试/红线四维放行；2W=1c2d IoU 判据软化[阈值事后发明→有条件过+门二追认]+s1rot 配对行名实不符[N/A+零高块复算坐实 blk[0]/blk[1] h=0]；3N=transform-origin 断言锁/复跑载体表述/组合页缺口）回炉五条全闭合→门二 deepseek **PASS 零 findings**+ENDORSE——处置档裁决表 §10 双档在案 |
| verify/locks | **150 文件/1285 用例/locks 273** 全绿亲验（VERIFY_EXIT=0；+1 文件+12 用例；locks 272→273=新测试件）[locked-change] |
| 数据资产 | 两轮取证数据并存在档：f-a6-diag-out-a1/（第一轮原件 40 件）+f-a6-diag-out/（b1 复跑 40 件）——阶段 3 迁移后的第三轮对照以 b1 轮为基线 |

## 2. 下段执行序

1. **F-A6-b2 阶段 3 主链迁移票**（§2 首项——决策门已放行）：pdf-item-geometry.ts
   （项几何+grapheme 细分[C2——单测夹具补：RTL/竖排/项内部分选中触发面零在档]
   +**基线分组并块**（mLR 对项盒结构性不适用已实证——211/151 vs 43/10）
   +bands 同源派生 C5）+PdfPageCanvas/装配链 viewport/styles 下钻通道（C1
   承重断点）+DOM 量测降级为回退路径+T2/T3 回退路径加固（聚类比较扩到
   全部簇）+G2 门（偏离率≥5%+右溢支占位+仅新增复现证据时启用）。
   **INV-58 双路线贯通（deepseek 终位 WARN-3 遗产）**：evaluateFull/settle
   与快路径同几何族；迁移后第三轮 f-a6-diag 对照（以 b1 轮为基线）。
   TDD 先红（项几何夹具）→绿→变异红证；RTL/竖排单测面必补。
2. **F-A6-c D2 调度与快路径票**（依赖 b2 交付 pdf-item-geometry+下钻通道）：
   selection-evaluate 拆件+rAF 调度+S1b/S1c 改写+「settle 同帧覆盖」断言；
   tick 基线（§7）前后对比。
3. **P7D-01 批一**（闲时可动）+**P7X-02**（闲时）照旧（v40 §2）。
4. **F-A6-d 收口票**：e2e 补断言（含 rotation×CropBox 组合页——b1 已知边界
   申报）+INV-37/58+ADR R3+locks 收账。
5. 被动观察照旧：e2e reader-text:872 第 1 现指纹在档（F-A6-c/d 全量 e2e）。

## 3. 本段方法论资产

- **「机理认定的源码级复核」红利再现**：实现者按票面强制步骤核对 pdf.mjs
  4.10.38 源码，发现 T1 修复不能只改 rotation 字段（span 百分比数学无旋转，
  容器 CSS 变换承担旋转——官方规则 repo 未提取）——避免了一次「改了字段
  决策门却不过」的假修复轮。与 F-A6-a 的 TextLayer 头注「三成员消费」声明
  复核同型：**修复前先读透依赖库源码的消费面**。
- **决策门判据的预注册纪律（门一 W1 教训）**：判据阈值必须在复跑前落笔
  （裁决表 §4/§5 阶段列）；复跑后不得发明阈值兜底——未满字面项=「有条件
  过+追认请求」移交门二裁决，门权不越位。
- **配对器适用域显式化（门一 W2）**：横排假定的量化判据（|Δcy| 行配对）在
  竖排形态（旋转页）语义失效——判据行标 N/A+适用域声明，而非拿「非 null」
  当恢复证据。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：装配链探查+票面拟定+验收（diff 审+两轮
  JSON 对照抽查+verify 两次亲验）+门一五条处置编排+门二追认请求拟定+收口
实现者子代理 GLM5.3flash 档两轮：b1 实现（8.6M tok/23min——先红 12/变异 2/
  决策门复跑+§10）+门一回炉（3.5M tok/6min——五条处置+零高块复算+N1 断言）
外链（gate-call 链）：
  Kimi k3 门一：in 15555 / out 10736 / 298s ✓ PWW
  deepseek v4flash 门二：in 24375 / out 16714 / 136s ✓ PASS+ENDORSE（parsed ok）
```

## 5. 环境事实滚动

- 基线推进：**150 文件 1285 用例/locks 273/e2e 39**（b1 +1 文件+12 用例）。
- f-a6-diag.mjs 复跑会 rm 数据目录——多轮对照先 mv 备份（b1 实操：a1 轮
  移存 f-a6-diag-out-a1/）；第三轮（b2 迁移后）以 b1 轮 f-a6-diag-out/ 为
  基线,复跑前同样 mv。
- vitest 默认 css:false 桩化 CSS import——jsdom 下样式表级联不可断言
  （transform-origin 锁的「无内联覆盖+注释锚」形态=该限制下的断言法）。
- 任务池：open 3（F-A6 b1 毕待 b2 阶段 3/P7D-01 待批一/P7X-02 未动）。
- 沿用 v40/v39 各条（gate-call 推理模型预算/markdown 契约/verify ABI 陷阱）。
