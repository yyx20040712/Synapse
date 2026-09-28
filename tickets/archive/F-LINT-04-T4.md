# F-LINT-04-T4 票面归档（F-GOV-01）

- id: F-LINT-04-T4
- file: scripts/check-quality.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

颜色关卡扩展战役 T4=④var() 语义锚 C-4c（v58 §2-3 候选/终裁 §2 表 T4 行——设计链三跳已在 T1 档毕；**前置毕=T4PRE 收口同日：R−D−W=∅ 已实证（f-t4pre-rdw 探针 改前差集恰 --warning→token 化后 ∅）**）：check-quality 新段 6c C-4c（B-1 check-dup-constants 独立 pass 先例——跨文件聚合超 eslint 单文件隔离模型故载体=check-quality；312→372 行）；算法=扫 src 全域（**.css+.ts+.tsx，注释剥离后——CSS 只剥 /**/ 块注释不剥 //（CSS 无 // 语法防误伤 url(//host)）+ts/tsx 加剥行首 //；注释叙述不入 R，--gold-night 退役史先例**）matchAll /var\\(\\s*(--[\\w-]+)/g 取引用名集 R（Map<名,Set<相对路径>>红时逐名列引用文件）；D=theme.css 定义名集（**主控追认[门一 A-2]：D 提取=postcss walkDecls AST 化置换票面正则口径——AST 天然剥注释比票面「剥注释+正则」更严（注释内伪定义不进 D=探针 VAR_DEF 差异点加固强化形态）+@theme 块内定义天然入集+第 6 段 postcss 先例零新依赖**；token 定义单源纪律机器锚定——他 css 文件定义 token 被引用即红=防漂移非误报）；R−D−W 非空=红；DYNAMIC_TOKENS 白名单驻段首单源（[\'--ui-scale\',\'--scale-factor\']）+逐条注注入点 file:line（App.tsx:136 setProperty/TextLayer.tsx:151 容器 style 注入——加注后实际坐标自洽）+注入点代码侧注释回指常量名（终裁 §1.5 弃双向手维护改注释单向指——白名单注 file:line 主链+注入点回指辅链）；解析失败 varDefOk flag=violation 红+跳过逐名防刷屏（fail-open 红语义保留）;**收口 2026-09-10 三屋全链**：红证矩阵=preimpl 检测缺失红+R1/R2 代码面/CSS 面红+R3 注释剥离不红+R4 白名单放行+NR1 @theme 重绑自洽+NR2 注入形态不进 R+变异红证（剥离禁用→--ghost-note 翻红→还原复绿 cp 备份法）+回炉补证 D-1（他 css 定义+引用 --ghost-only 红=D 集单源执法实证[门一 W]）/D-2（css 块注释叙述不红=CSS 域唯一剥法正向实证[门一 W]）；存量绿 quality exit=0（R−D−W=∅ 零误报=T4PRE 收口基线）+lint exit=0+verify 断链后四段 exit=0（162/1579=基线）；门一 Kimi kimi-main 两轮（R1 B0/W2/N9 放行附条件→回炉三小项[D-1/D-2 红证+报告 §7.9 补报 postcss 错误截首行]→R2 收口放行+回炉零 diff 变化主控亲核三文件行数一致）；门二统一档[环境欠账]PASS 无条件（B0/W0/N1——四清单+机器面七件亲跑含独立复刻红证 tmp-g2.tsx 红→删件复绿+136/151 行号独立闭合）；探针 f-t4pre-rdw.mjs 留档独立诊断工具;不做面：动态拼名（终裁证伪全仓 0）；node_modules 官方 CSS 消费面（R 只少不多）；tests/ 域外；行尾 // 假阳面（存量 0+保守向——门一 D-4/实现者 §8.1 注记）;**F-LINT-04 战役（T1+T2+T4PRE+T4）全毕**

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
