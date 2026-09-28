# F-AUDIT-01 票面归档（F-GOV-01）

- id: F-AUDIT-01
- file: scripts/audits/
- area: infra
- owner: strong
- status: done

## summary 原文

Kimi 体检 v2 P1-2 终裁落地——audits 留档口径三桶清场（主控自为单 2026-09-05 毕,两提交=32ffc6576 入库桶+本注记提交顺带桶）：①入库桶实测 243 件（169 raw txt+41 md+13 patch+4 diff+16 json——终裁 246 差 3=体检后动态变化[backup-path.txt 删除+out 归类漂移],AGENTS.md 计数纪律以当前实测为准）;②数据桶 16 个 *out* 探针数据目录不入 git+.gitignore 增 scripts/audits/*out*/ 目录形态（尾斜杠目录匹配——closeout 文件名免疫,已跟踪历史件不受 gitignore 影响;口径=此后新场证据件随收口提交入库,*out* 数据目录被拦防再犯）;③删除桶 12 项 mutation backup（4 目录+8 单文件,删前抽样核验=源文件历史 cp 副本[SelectionLayer/n6-AnnotationLayer 头一致证]+交接书/registry/体检报告对 backup 路径零引用[引用面=raw 日志非备份本体]）;顺带毕=tsconfig.node.json 加 jsx react-jsx 一行（v46 观察项核销——体验债非盲区定性落地;受锁 unlock→改→typecheck 全链 EXIT=0 亲验→apply manifest 286 同步）;清场毕 git status 未跟踪面=零（out 目录被 ignore 后不显示）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
