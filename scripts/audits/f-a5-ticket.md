# F-A5 需求票:自绘选区 band 对齐+标注偏移定向+色块背景板层序(三面)

> 需求源:用户 2026-08-31 第二轮复测(附两图,最高优先级)。原话要点:
> 「选中标记有误差和偏移(图1)/标注也存在偏移,涂色的渲染应该在最下方
> 当背景板而不是影响文字的颜色(图2)」。基线:verify 118 文件 1002 /
> locks 204 / e2e 29(8408911ca)。F-A4 同链续作(band 基准统一+层序语义
> 按用户令重排)。

## 0. 现象×根因×修法矩阵

| 面 | 现象(图证) | 根因假设(待真机实证) | 修法 |
| --- | --- | --- | --- |
| a 选区块偏移超界 | 图1:自绘灰块高 1.5~2 倍行高、垂直上下溢出约半行、水平左右越出文字区、边界阶梯状 | F-A4 band 字形带自适应只挂标注层(rectStyle);**selection-paint 直渲染归并 rects 原样**——rects 高宽=CSS 回退字体行盒(F-11 证据:行盒贴回退墨带远大于 PDF 字形带) | 自绘层与标注层**同 band 基准**(抽公共 helper:行簇字形带推导,自绘+标注+AI 三消费点同源);水平界=行簇 span 实际 x 端点(非行盒宽) |
| b 标注统一下偏半行 | 图2:三色块(绿/橙/紫)统一向下偏移约 0.4~0.7 行高+侵入相邻行 | band 基准=行簇 span 实测盒——**在用户文档字体下失准**(怀疑:该 PDF 行内混排/小字号下 span 盒中心与字形带中心差大;或半前导修正方向错;或该图为存量旧 rects 走回退路径未经 band) | 真机探针**复刻用户文档场景**(小字号+紧行距 PDF,或直接用用户实际库文档)复现实测 band 偏差数字→定向修(基准推导改进);存量 rects 回退路径核对是否经 band |
| c 色块染字/层序 | 图2:被高亮文字染成色系暗色(暗绿/暗橙),非纯黑;用户令「涂色在最下方当背景板」 | AnnotationLayer multiply 混合层在 textLayer 之上(F-07 设计)——multiply 染 DOM 文字 | **层序重排**:canvas < 标注色块(+AI 色块)< textLayer;色块混合 multiply→normal(半透明 alpha);**ADR/F-07 multiply 单乘语义修订**(依据=用户背景板令;文字纯黑由 textLayer DOM 字呈现,canvas 位图字被色块罩淡属预期——DOM 字是视觉主体);自绘选区块/AI 描边 z 序同步梳理(选区交互视觉保持最上) |

跨格序列:S1 拖选(自绘块 band 对齐=所见)→S2 保存(标注渲染 band 对齐=所存,与所见一致)→S3 标注色块垫底文字纯黑→S4 选区叠在标注上(灰块视觉在色块上,选择模式 INV-42 兼容)→S5 缩放/档位三面稳定(F-A4 c 面归一链保持)→S6 Escape 清选区色块不变。

## 1. 行为层

- **a/b**:band helper 单源(自 selection-paint/annotation-style 现有两处推导合一),三消费点(自绘/标注/AI)同基准;b 面以真机复现数字定向(探针先行——修前基线实测用户文档 band 偏差,再修)。
- **c**:AnnotationLayer/AiAnnotationLayer 渲染容器 z 序重排(色块垫 textLayer 下);multiply 移除(色块样式 normal+既有 alpha);选区块保持 textLayer 上(交互层)。
- 既有零变:保存链坐标/归并(INV-40 lineH 已修面)/工具条定位(F-A4 c)/跨页拒绝/选择模式。

## 2. 接口层

组件对外零变;annotation-style/selection-paint 内部 helper 抽取(导出面如增,可选参缺省兼容)。

## 3. 架构层

- band helper 驻 annotation-style.ts 或新拆件(按 ≤250 红线自裁);层序=容器 DOM 顺序/PagesOverlay 装配面(renderPageLayers 内 TextLayer/AnnotationLayer/ReaderAiLayer 挂载顺序或 z-index 显式化——**显式 z-index 层级常量单源**防回归)。
- 受锁改写面(主控已 unlock):reader-text.spec(层级/multiply 断言若锁了 F-07 观感)/selection-paint.test(band 断言扩展)——改向先行红。
- ADR-0019(F-07 multiply 面)修订登记+INV-37/40 联动核对。

## 4. 生命周期层

层序变化对懒渲染回收零涉(层随 PageFrame 卸载);色块垫底后 textLayer 事件面(选中/点击)不受影响(z 高者司交互)。

## 5. 文化层

- 新测试扩 selection-paint.test(band 对齐断言:自绘块高≈字形带高非行盒高)+受锁件改向;变异 M1~M5(cp 一次性备份+还原 diff+回绿)。
- 真机探针 scripts/audits/f-a5-verify.mjs(核撞名):**优先用用户实际库/文档复刻图1/图2 场景**(小字号+用户标注存量);修前基线(band 偏差数字/染色像素采样)→修后:①自绘块高/文字行高比≈字形带比(非 1.5~2 倍);②标注块顶偏差≤2px(用户文档口径);③色块内文字像素=纯黑不被染(像素采样对比修前);④S4~S6;⑤pageerror 0。
- 像素级取证 crib f-a4 diag(CDP screenshot+采样)。

## 6. 证据与报告契约(实现者)

报告 f-a5-impl.report.md:三面对照+自裁申报+**数字 wc/实测落笔**+diff 自查+成本;b 面真机复现数字必须入报告(定向依据)。禁 git/registry/locks;红→绿→变异;卡住停手。
