# SR2-AI-07 票面归档（F-GOV-01）

- id: SR2-AI-07
- file: src/main/services/ai_sensor/ai-notes-import.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

回灌导入器（ai-notes/import+list 通道 [locked-change]；幂等=archive 账本 sha 去重+清面重灌；「v1 无生产者」声明解除；工具永不写 DB）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
