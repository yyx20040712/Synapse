# F-LINT-04-T2 票面归档（F-GOV-01）

- id: F-LINT-04-T2
- file: eslint.config.js
- area: infra
- owner: strong
- status: done

## summary 原文

颜色关卡扩展战役 T2=①B-5 AST 扩展（v58 §2-1 候选——终裁 §2 表 T2 跳，设计链三跳已在 T1 档毕，本票纯实现跳零新设计）：synapse/no-inline-color rule（域=src/renderer/**/*.tsx 不变）扩两条 visitor 路径——(a) VariableDeclarator：init 递归 unwrap（TSAsExpression/TSSatisfiesExpression/Object.freeze CallExpression→arguments[0]，深度上限 4 防御）后两形态判定：ObjectExpression=逐属性判定（deepseek 硬伤①修正——弃「全 Literal 门」：混计算属性/引用值对象不豁免，逐 Property 判 value 为 string Literal 且 stripUrlFunctions 后命中 COLOR_RE 即报；key=Identifier 或 string Literal 均入判[kebab key 形态]；SpreadElement/嵌套对象/模板串/二元式=明示不检残留面与现行 style 面语义对称）+单值 Literal=命中即报（主控裁决扩展：终裁字面=ObjectExpression 色值表，单值常量同绕过通道对称闭合纳入——dry-run B=0 零负担）；(b) JSXAttribute 面扩：属性名域=fill|stroke|color 显式三词 ∪ /Color$ 后缀（camelCase 表 stopColor/floodColor/lightingColor=子集）∪ kebab 同族 stop-color|flood-color|lighting-color（JSX 可解析误用形态——R11 红证实证）→ value 为 string Literal 命中即报（[N2 回炉加码] 含 JSXExpressionContainer 包裹形态 fill={\x27#fff\x27} 同检）；域外属性名（data-x 等）不报。**前置 dry-run 毕（⑤i 口径）**：scripts/audits/f-lint04-t2-dryrun.mjs（eslint Linter API flat 模式+self-check 内证）——77 tsx（全 renderer）四面全 0+.ts 面补盘 0 → 域维持 tsx 不扩张。**收口 2026-09-10 三屋全链**：红证矩阵 R1-R14+NR1-NR5（R12 单对象双属性恰 2 error 逐属性全量证明/R13 container 包裹[改前探针 0 error=TDD 红]/R14 双层嵌套 unwrap）+preimpl 探针+变异三态（visitor 改名 R1 复绿/R8 独立仍红/还原复红）+存量 lint 全绿+dry-run 复跑 0；门一 Kimi kimi-main 两轮（R1 B0/W4/N7 放行附条件——W1 申报失实[门一独立抓到与主控自查吻合]/W2 COLOR_RE 状态性[主控亲证销项=i 标志无 g]/W3 深度 off-by-one/W4 raw 混杂[主控销项=拼包伪影原件纯净]→回炉轮 1 五项=W1 上提 create 级+W3 depth>=4+N2 主控加码+R12-R14 补证+报告更新→R2 定点复核指令 1-4 全 ADDRESSED+零新破坏+收口放行+两非阻断条件主控亲验销项[R12 原件双 error 行完整/345 行实测]）；门二统一档[环境无 model 参数欠账如实记]PASS 无条件（B0/W0/N2——四清单独立复算+机器面亲跑八项+TDD 链 13 件原件抽验；N-G2-1=dryrun.mjs sha 红因系主控回炉期亲改探针头注 kebab 误判修正——归属自证在案）；不做面：哨兵域窄维持入档（v58 §2-6/7）；.ts 面；嵌套对象表深度>1；命名色/十进制（终裁 §4 承袭）；Object[\x27freeze\x27] 计算属性/深度>4 截断=formally 注记残留面（门一 N3/N1③）；theme.test.ts 防漂移锁不加（T4 C-4c 上线后 R−D 锚反向护体——观察注记）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
