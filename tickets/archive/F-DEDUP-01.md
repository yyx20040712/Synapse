# F-DEDUP-01 票面归档（F-GOV-01）

- id: F-DEDUP-01
- file: src/main/services/library.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

服务层偶然复杂度收敛（2026-09-18 收口：四收敛面全落+排除面恰好——DomainError 基类 services/shared/domain-error.ts 单源 15 文件一行继承（new.target.name 零样板，HttpFetchError 三参+status 特例，NotImplementedError/ApiClientError 排除）/原子写 atomicWriteFile 三开关 4 文件 6 调用点（manifest 固定名+ai-notes-import 移动语义保持内联）/sanitizePathToken 2 处（safeFileName 展示名家族+db LIKE SQL 家族排除）/app-file URL 单源 src/shared/app-file-url.ts 3 处收编（corpus.export:250 硬编码消灭）；28 文件 +436/-220 修改面净删 108；TDD 首红→全量绿 170 文件/1745 用例+变异红证 4 条；指纹门纯增 183→187/1757→1790；e2e 默认门 43/43；INV-66 原子写单源+INV-67 回灌事务性（batch 7 P2-5 登记债销项）入册；门一 PW B0W3N8 回炉 1 闭+门二 GWC P1 收口序兑现）（原票面：终裁 §3-4 审计 P2 采纳——DomainError 15 文件/原子写 4 文件/清洗多份 Rule of Three 越界+微扩 app-file:// URL 三处收编单源；分层铁律不破共享件=被依赖下游位；[locked-change]）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
