# INV-51 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-51 | e2e 几何断言的稳态采样口径（F-R2e，2026-09-02 三波场）：跨程几何一致断言（「重开仍在原位」类）的输入必须为**稳态几何**——①标注块几何存在双态瞬态（AnnotationLayer 挂载先渲染存量行盒 fallback→resolve 完成跳 band 收边；实测 y 差 4.44px/h 差 4.97px/正常负载窗 ~8ms——AnnotationLayer.tsx:209 双态表达式）；②两次独立测量调用（boundingBox×2）之间的滚动落帧使 rel 恰偏 Δ（注入实验 dy=Δ 线性，平移不变性只在单帧成立）。故几何断言采样=双采样稳定门（非收敛 fail loudly）+零盒可见性守卫（display:none 形态=未就绪）+单 evaluate 同帧取 rect/canvas 两盒（同帧差值对滚动平移不变）；历史 3.45px 归属未定死（排查档 §4 三候选），修法对三候选全免疫为条件命题——新几何断言一律按本口径写 | tests/e2e/stable-rel.ts stableRel 共享助手（头注——F-TESTREF-W4 从 reader-text.spec 内联版下沉）+scripts/audits/f-r2e-investigation.md+tests/e2e/z-r2e-probe.spec.ts 双记录器（复现判别留驻）（F-R2e，2026-09-02 登记） | e2e「划选高亮后重开仍在原位」四断言（稳态原子测量）——注入实验红绿双向实证在档（修前路径+注入=dy=3.2 红/同帧测量注入下稳定） | 已锚定（e2e 级本单） |
