# F-TESTREF-W3 票面归档（F-GOV-01）

- id: F-TESTREF-W3
- file: src/shared/ipc/schemas.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W3=src/shared 直接契约测试补齐（前置 W2 毕——纯增票）：覆盖倒挂最薄面 src/shared 1403 行（schemas.ts 467+api-surface.ts 227 两契约真相源文件现仅间接覆盖/直接契约测试 316 行，比值 0.32 全仓最薄且装最大源文件）→直接契约测试：zod 边界（schemas 逐 schema 边界值/非法态）、api-surface 通道完整性（55 invoke 通道接线表闭合性/隐藏通道/ComposedHandlerDomains 域）、app-error 错误码封闭性；目标 ≥0.8（终裁承袭宪章建议——具体阈值设计裁决）；纯增不受 C 面禁删约束但受先红后绿纪律（每测试必须能失败一次）；新测试 always-active 不经 guardedDescribe（K3 威胁在三屋结构性缺位）；[test-refactor][locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
