# F-SESS-01 票面归档（F-GOV-01）

- id: F-SESS-01
- file: src/main/services/export_/corpus.export.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

导出会话悬挂修复（2026-09-18 收口：abortActiveSession+advance 终局守卫+bootstrap webContents 双事件接线+INV-65 入册；裁决 2 两运行时风险票之一）：streaming 中 renderer reload→单飞锁永不释放（corpus.export.service.ts:310-313 EXPORT_BUSY 悬挂）；修法方向=session 生命周期与 renderer 存活解耦；**票面含态空间表**（六态 × renderer 存活/死亡/重载跨格序列——宪法「状态机前置」条款，态空间+跨格序列交审计）；验收=悬挂态可恢复+e2e corpus-export 全链不破；排期=TESTREF 收尾后梯队二首票（裁决 2：插 F-DEDUP-01 前）；常规三屋票

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
