# F-A9 票面归档（F-GOV-01）

- id: F-A9
- file: src/renderer/features/reader/view/AnnotationLayer.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

标注带垂直几何缺陷（2026-09-09 F-A8 门 3 真机测试暴露——用户四图实据,f-a9-img1 灰预览带/f-a11-img3 下划线在档）:①划选预览带下移半行（img1:文字上半露出带外/下半截压带上——预览带 y 偏低约半行高）②underline 标注渲染为低位色带切字（img3:kind=underline 黄带贴基线穿字中部——应为主线盒下方细线;库内实证 09-09 07:16 标注 kind=underline/quote=前导空格 systematic literature review…/comment=我是奶龙 已落盘）;**诊断先行票**:根因候选=预览链与渲染链的矩形 y/高算式（ascent/基线/行盒高换算）;含 G3A 开放项② rect 收集窗定义一并核（f-a8-gate1-lib.mjs 窗口径[p2 y<0.78 污染上界 11.2%/p7 零]）;验收=夹具单测几何断言（带 y=行盒顶/高=行盒高;underline=基线下细线）+真机 DOM rect 断言+e2e 渲染真实文本+img1/img3 缺陷形态复测消

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
