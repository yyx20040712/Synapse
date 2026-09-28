# R1-WS1 票面归档（F-GOV-01）

- id: R1-WS1
- file: src/main/services/workspaces/workspace.service.ts
- area: workspaces
- owner: strong
- status: done

## summary 原文

课题域主进程·库级隔离地基（ADR-0018 裁决：userData/workspaces/<id>/ 各含 synapse.db+files/，sha256 去重/FTS/备份天然按课题+受锁面最小+「切课题=切库」零跨库泄漏类缺陷面；三候选否决 collections 挂标与 topic_id 外键）——①装配容器化：data-layer.container.ts Proxy facade 稳定壳（ipc/index+register 零 diff 实证）热换 db/repos/services/fileStore；②workspace.service+fs：list/create/rename/switch（busy 串行守卫中文 DomainError+装配失败重试幂等）；③IPC workspaces 四通道受锁扩容（schemas+api-surface+contracts+preload）；④遗留迁移幂等（根 synapse.db+files 整体入 workspaces/default/——L0 态自裁：全新首启库留根不预建目录，门一独立取证裁为 e2e 种子配方（seed-paper 直插无建表+SEED_DB 写死根路径）唯一兼容解非设计缺陷；L0 会话内物化双段链回炉锚定）；⑤INV-35 登记（同时刻至多一课题库+switch 串行+指针损坏降级首课题）。门一 0B/3W/4N（W1/W2 状态机测试缺口回炉 3 it 全绿零实现变更）+门二 PASS（W4 死断言复活+N5 中文防线锚定二轮回炉）——双轮全闭环；新测试 workspace.test 14 it 入锁 145→146；e2e 24 passed=迁移兼容验收）[locked-change]——票面 scripts/audits/r1-ws1-brief.md；依赖 ADR-0018+bootstrap 装配先例

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
