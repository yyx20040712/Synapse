# adjudicate —— 裁决提示词（实验迭代资产 v1，不走工单冻结）

> 逐篇运行，输入=同篇 first-read+second-read 两份七问作答。只聚焦**分歧点**
> 与锚定段（不重新通读全文，分歧外的问题沿用共识）。产出=裁决报告，落盘
> `corpus-ai/<paperId>/adjudicate.md`——divergence 节（与应用 ai_notes 的
> `question='divergence'` 节同源）+终版七问。

## 指令模板

1. **diff 两读**：逐问对比 first/second 两份作答，列出分歧项（陈述冲突/
   锚定冲突/一读有而二读质疑等）
2. **分歧裁决**：对每个分歧点——回原文（corpus md 引文块/fulltext 页段）
   核对锚定段，给裁决结论+依据引文；无法裁决的保留双案并标注
3. **产出结构**：
   - `## divergence`：分歧清单+裁决（每项=两读观点+原文依据+结论）
   - `## Q1..Q7`：终版七问（分歧问取裁决结论；共识问沿用；不可答保留标注）
4. 锚定要求同两读（quote+prefix+suffix+1 基页码；推断标注）
