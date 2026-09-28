# C-A3 票面归档（F-GOV-01）

- id: C-A3
- file: src/renderer/features/notes/notes.store.ts
- area: reader
- owner: strong
- status: done

## summary 原文

AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
