# F-LINT-04 票面归档（F-GOV-01）

- id: F-LINT-04
- file: scripts/check-quality.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

颜色关卡扩展战役 T1（**收口 2026-09-10 三屋全链**）=③COLOR_RE 单源化+⑦url 顺修+②⑥postcss 化（设计链三跳毕——Kimi 拟定 f-lint04-design-kimi.md→deepseek ENDORSE_WITH_CHANGES f-lint04-review-ds.md→GLM5.3 终裁 docs/design/2026-09-10_f-lint04-design-final.md;终裁前当场证伪=eslint.config.js ESM import OK/postcss 8.5.26 树内零新依赖/动态拼名 0/分号面 0/@theme var() 现状零同值）;**T1 范围（终裁 §2 表）**：①新件 scripts/color-re.mjs 驻 COLOR_RE 唯一字面量（禁 g/y 标志——RegExp 共享 lastIndex 污染禁令驻头注）+META_RE（哨兵用 hex 特征形态——第三副本闭合）②check-quality.mjs+eslint.config.js 两消费文件 import 化（双写面物理消失;import 失败 fail-closed 抛错禁 try/catch 回退内联）③哨兵=matchAll(META_RE) 扫两消费文件内联回退（哨兵行自身用 import 的 META_RE 执行不自咬）④⑦顺修=单源正则处 url() 剥离（url(#x)=id 引用非色值）⑤②⑥postcss 化=C-4 CSS 面整体迁 root.walkDecls（decl.prop 以 -- 开头=token 定义天然豁免——行级豁免/单行多声明/引号分号边界三题消解）+色值域 token 同值守卫（value 命中 COLOR_RE 的声明行同值对红——@theme var() 重绑天然出域）;**验收（终裁 §3）**：先红证五支（同值 token 植入红/minified 多声明红/url(#face) 不红+#face 裸写红/内联回退恰一条哨兵红+import 改名 fail-closed 红）+存量零误报（82 声明行等价+全 CSS 零新红）+W3/③注入式并存测试+verify 全链+[locked-change]+locks（check-quality/eslint.config 受锁改+新件诞生即锁）;不做面=终裁 §4 五项明示;T2（AST 扩展）/T4 前置（--warning token 化）/T4（var() 语义锚）=后续候选票（v58 §2）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
