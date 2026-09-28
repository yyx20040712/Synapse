# F-LAYER-01 票面归档（F-GOV-01）

- id: F-LAYER-01
- file: src/main/services/settings.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

settings 下沉 services（裁决 6 域归位四项之一）：消掉全仓唯一分层破口——ipc/settings.ts 在 ipc 层写业务；业务下沉本件 ipc 回归薄分发；**随票落 L1 锁线**——eslint 新红线 src/main/services、src/main/db、src/shared 禁 import \'electron\'（「core 可抽包」事实升机检；eslint.config.js 受锁 unlock→改→apply 单链 [locked-change]）；小票；排期=梯队四（GEOM 后）；骨架=票面载体

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
