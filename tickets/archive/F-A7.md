# F-A7 票面归档（F-GOV-01）

- id: F-A7
- file: src/renderer/features/reader/view/PageColumn.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

旋转页占位盒宽高交换缺失（**毕 2026-09-04 三屋全链**）：/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高——PageColumn 页尺寸缓存单源用 page.view 未旋转口径 vs canvas getViewport 旋转口径，页框与渲染盒错配（页框/占位视觉错形）；selection 几何链不受影响（F-A6-d e2e 组合页块与 span 墨带贴合坐标证据在档）；真实库全档 rotate=0 未显现（低优先）；修法方向=页尺寸缓存/占位计算按 viewport 旋转口径取（与 b1 PdfPageGeometry 通道同源），e2e 复用 createRotatedCropPdf 断言页框与 canvas 盒一致；**实现**=PageColumn 段① pageSizes 构造改 viewport 旋转口径（rotate ?? 0 归一化 ((r%360)+360)%360 后 %180===90 交换宽高——与 b1 PdfPageGeometry 通道同源禁 getViewport 调用,mock 面零扩大）；pageSizes 语义=viewport 口径（PageBoxSize 注释声明,basisWidth/锚总高自动受益——rotate=90 单测含 onReady(792) 锚）；头注「不做：旋转页」澄清「手动旋转阅读」（/Rotate 元数据适配非旋转特性,接缝归责在案）；单测 4 it（90 交换 792×612/180 不交换/270 交换/-90 负值归一化——首红 3 红[180 修前绿=数学必然,变异 B 补证]）+变异红证×2（删交换分支 3 红/交换条件翻转 8 红=rotate=0 守卫面被保护）；e2e 新小票（占位盒×canvas 盒宽高差 ≤2px+方向断言宽>高;修前差=180×zoom≈293px 必红）+F-A6-d 参考系注释更新（F-A7 已修复态）；门一 Kimi K3 PWW 2W2N（W1 注释数字 293px 实测口径回炉闭合/W2 248 字符 push 行可读性债务=本票接受登记——**已知债务：PageColumn 压线 250 行上限+248 字符行,后续行增即拆件**）+门二 deepseek v4flash PASS 零 findings（独立复算+可宣告完成）；verify 154/1329/locks 277/e2e 42 零 skip 全绿亲验 [locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
