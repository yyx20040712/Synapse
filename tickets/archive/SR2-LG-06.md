# SR2-LG-06 票面归档（F-GOV-01）

- id: SR2-LG-06
- file: src/renderer/features/reader/anchors/open-paper-anchor.ts
- area: reader
- owner: strong
- status: done

## summary 原文

脉络跳转接笔记面板信号（b3: P7-H；验收缺陷 E2 修复——跳转链完整且定位成功但 OutlineAside tab 本地态不切；anchor 分支 locateAnchor 之前 req.aiNoteId 有值先发 notifyAiNoteHighlight（AI-09 全套语义复用：持久 state 切 notes tab+列表滚动高亮，tab 未开早发不丢失挂载后补切）；无锚/裸锚路径零触碰；受锁 lineage-side-panel.test 加 2 it（notify 先于 locateAnchor——invocationCallOrder 三破坏形态全红）+stub 池扩 notifyAiNoteStub）[locked-change]——票面 scripts/audits/sr2-lg-06-brief.md；依赖 LG-04 接缝（bus 载荷 aiNoteId）+AI-09 信号

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
