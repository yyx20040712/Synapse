# INV-19 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-19 | AI 锚定段渲染对等、存储独立：AI 笔记经 verifyQuote 重锚入标注层同一几何管线渲染（七问分色单源）；数据永不写 annotations 表；AI 标注 v1 只读（无编辑/删除写路径） | ADR-0015+AnnotationLayer 消费面（2026-08-25 N2 裁决——D3 独立表的渲染面延伸） | 单测+组件测试（SR2-AI-09：tests/unit/renderer/ai-annotation-layer.test.tsx——渲染对等 verifyQuote 真→rects+七问分色/重锚失败零 rects/只读断言无菜单无编辑器/exact 滚动 data-ai-note-id） | 已锚定（2026-09-02 状态升格——工单 done 而册状态滞后，体检场发现+文档群维护场核销；**存储独立=repo 零耦合头注契约+实现 diff 证明（ai_notes.repo「不做：annotations 表任何改动」），无专门断言——写路径唯一性由 repo schema 类型面承载，弱锚注记**） |
