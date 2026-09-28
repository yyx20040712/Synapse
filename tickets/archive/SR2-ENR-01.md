# SR2-ENR-01 票面归档（F-GOV-01）

- id: SR2-ENR-01
- file: src/main/services/enrich/cited-by.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

含金量抓取缓存（迁移 005 papers 三可空列+瀑布响应携带零新增请求+citedByPatch 强制刷新纯函数（0 与 NULL 判别 === null）+applyEnrichment 独立 citedBy 参数——PaperMetaPatch/update-meta 契约零触碰+paperDetailSchema 三 optional 字段）——D3-A 档 ADR-0011 契约字段供给；票面双门档 scripts/audits/enr-ticketing-*

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
