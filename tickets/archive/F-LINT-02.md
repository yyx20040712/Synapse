# F-LINT-02 票面归档（F-GOV-01）

- id: F-LINT-02
- file: eslint.config.js
- area: infra
- owner: strong
- status: done

## summary 原文

B-1 同值双常量 lint 机器化（F-LINT-01 终裁档 §2 扩展面头票——2026-09-09 用户裁决入批）:**设计链三跳强制**（跨文件聚合=架构问题——eslint 单文件 lint 隔离模型下 B-1 需独立聚合 pass 前置设计:Kimi 拟定三案[独立扫描脚本/eslint 复合 pass/AST 全域收集——含白名单边界:泛值 0/1/-1/空串/true/false+跨文件限定+常量名前缀规则]→deepseek 对抗审核→GLM5.3 终裁）;**设计期存量 dry-run 铁律前置**（⑤i 教训:设计书必须附存量统计输出——跨文件同值双常量实测清单,B-1 假阳面设计期即暴露）;终裁版实现+先红证（植入跨文件同值双常量反例→红→还原）+存量零误报+verify 全链;B-2 常量旁落清单/B-6 同名类型豁免/C-3 重复字面量 warn 随设计一并评估（合派或另立终裁定）;受锁面按终裁（eslint.config.js 或 check-quality）+[locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
