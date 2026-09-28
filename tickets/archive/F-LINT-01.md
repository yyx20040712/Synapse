# F-LINT-01 票面归档（F-GOV-01）

- id: F-LINT-01
- file: scripts/check-quality.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

INV-11 lint 机器化（类型/颜色/文案/数值单一真相源禁令的机器锚定——v50/v51 两度留用户裁决优先级,2026-09-09 用户裁决纳入夜间批）;**设计链三跳毕**（methodology §4.5 架构位）:Kimi K3 拟定设计书（九形态可检性矩阵+B+C 组合选型[A 否决]+分期——f-lint01-design-kimi.md）→deepseek 对抗审核 ENDORSE_WITH_CHANGES 3CR+6 增量攻击面（f-lint01-review-ds.md）→GLM5.3 主控终裁（docs/design/2026-09-09_f-lint01-design-final.md——C-4 改简[消费负锚零 token 清单依赖]/B-1 降扩展面[eslint 单文件隔离模型]/哨兵只哨工具失能态厘清）;**实现期暴露设计前提错误→终裁改向**（§5 修正节）:C-4/B-5「存量零误报」验收与存量 61 行 CSS+6 处 tsx inline 颜色真命中互斥——颜色 token 化迁移从未发生（「已知双源残留清零」仅数值域 UBS）,实现者 BLOCKED 正确停手;终裁=C-8 照落（字号面存量绿）+C-4/B-5 顺延 F-CSS-03+INV-11 诚实分级不升已锚定;**C-8 落地**=check-quality.mjs 172→196 行——FS_DECL 正则单源文本提取自受锁 theme.test.ts（零正则复制;读失败/match null/walk 零 CSS=三哨兵硬红——只哨工具失能态）+walk src/**/*.css 全量字号负锚（F-CSS-02 W1 新文件通道闭合;与七件测试锚纵深防御）;红证①新 CSS 探针+④哨兵（FS_DECL 改名→提取失败红）+存量四关绿（quality/lint/typecheck/test 1466）;C-4/B-5 临时实现全文留档实现者报告=F-CSS-03 设计输入,作废红证②③保留头注;INV-11 升格=invariants :25 两列（强制方式=机器锚定[字号面]+审查[颜色/数值面];状态=部分→机器面扩展——字号面已锚/颜色 61+6 命中分型[同值多源真违规子集+一次性字面量严于字面未达——门一 W5 精度修正]顺延 F-CSS-03/人审残留三类）;门一 Kimi kimi-backup 两源 PWW 0B/5W/9N（主源 504 退避 3 次耗尽 switches=1——38KB 包超 ~300s 网关窗实录;五哨兵审项推演全安全[N1-N5]+改向决策对抗推演成立;5W 全处置:W1 回炉指令逐字裁定闭合/W2 apply 287/W3 提取错源面转 F-CSS-03 票面[W3=多处 FS_DECL 静默取第一处——theme.test.ts 受锁变更必过门审=纵深已有]/W4 F-CSS-03 立案随收口/W5 两处措辞修正[终裁档 §5+INV-11 状态列]）;实现者 GLM5.3flash[环境统一档]两轮（BLOCKED 轮零永久改动+四支红证全在档——正确停手示范;回炉 1 终态两文件 25+/1−）;门二统一档同源欠账如实记 PASS 无条件（亲跑 7 项:哨兵变异红→sha 逐字节还原→重锁绿/C-8 探针红删绿/提取保真 8 件全 0[N3 text-layer 闭合——第八件 CSS 零命中]/registry 推演/verify 档 156-1466-287/locks 两件 sha/U+FFFD 零）;**教训（交接书+methodology 候选）**:关卡类规则设计期必须先存量形态 dry-run 实证——「存量零误报」验收项设计链三跳均未前置验证（三方齐漏）,实现期才暴露=一轮实现成本;verify 156 文件/1466 用例/locks 287 exit=0 亲验

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
