# F-REG-01 票面归档（F-GOV-01）

- id: F-REG-01
- file: scripts/check-tickets.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

check-tickets 工单号校验全域化（F-TOOL-01/F-CSS-02 两票门二独立提出的防作弊链盲区——objRe 只捕 SR2?- 前缀工单号,F 系等 38+ 工单翻 done=平凡绿[工单文件存在性不校验]）;扩展=①全工单号格式全域校验（id 前缀白名单枚举[S 系/F 系/P 系——以 registry 现存 158 票实测前缀全集为准]）②done 票 file 字段有效性抽验或全验（三形态兼容:具体文件存在/目录存在[如 scripts/audits/]/前缀说明性字段——形态语义先盘点再定校验强度）;**先红证**:临时把某 done 票 file 指向不存在路径→红→还原;受锁 scripts/*.mjs 即时 locks:generate+apply;存量零误报（158 票全过）+verify 全链

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
