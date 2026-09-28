# F-R2 票面归档（F-GOV-01）

- id: F-R2
- file: src/renderer/features/reader/state/scroll-converge.ts
- area: reader
- owner: strong
- status: done

## summary 原文

ui-scale≠1 程序滚动落点漂移修复（v18 U1 闭环——H1 根因=gBCR 视觉差值 1:1 加本地 scrollTop，探针三场景三档数值闭合 160-450px；方案 B 算术折算：effectiveZoom 单源+scroll-converge start/center 折算+scroll-progress getPageBoxes 同批修；真机复验 −512.6→−0.6 基线级/next 旁支同根归位；先红 6+变异 M1~M4+verify 126 文件 1081；门一 Kimi 链首战 B:0/W:1/N:6 可收口——换源事件 kimi-main→kimi-backup 实战；INV-34 量纲附注；B-3/H3 证伪备案 v19；票面+报告+门一全套 scripts/audits/f-r2-*）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
