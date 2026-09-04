# P7X-02 ·门二终审指令（子代理——环境统一档=GLM5.3flash 政策次选,与实现者同家族半异构欠账如实记;与门一实际审者 deepseek 跨门异构;亲跑矩阵）

你是门二终审子代理（四清单+一）。项目根 E:\class\智慧水务\Synapse_remake（Windows Git Bash,node v24.20.0）。**逐条裁决+独立复算+亲跑矩阵——禁只审不跑、禁预设立场。**

## 输入件

票面=scripts/audits/p7x02-impl-brief.md;规约源=docs/design/2026-09-04_p7x02-reading-time-outbox.md（含 §10 门一追记）;实现报告=scripts/audits/p7x02-impl.report.md（§1~8 首发+§9 回炉一轮）;门一审=scripts/audits/p7x02-gate1.md（末节主控处置记录=①核对输入——含主控 C-1/C-2 源码亲证与新边界发现「活卷防抖直发面交叠窗」）。

## ① 处置核对

门一 findings（C-1/C-2/B-1~B-5/A-2/D-1~D-3/E-1~E-3）+主控处置表 vs 终态实物——逐条「说了没改/改了没说」。重点：回炉三 W 落地形态（W1 main.tsx 渲染先行+void 后置/W2 排空闸门全派发阻断[身份快照+活跃标志——不依赖 seq 单调]/W3 e2e+探针 DB 轮询）;主控 C-1/C-2 亲证源码复核（scroll-progress.ts:151/:258/:181 三点）;新边界第 8 条落档（设计书 §10）。

## ② 母本符合度

设计书（态空间 T1~T6+闸门[回炉后全阻断语义]/接口/不变量/失败模式/页码重放四条件/边界申报 8 条）vs 实物 diff（git diff+新件）。重点：R7 spView 排干实现与 C-1 亲证的吻合;INV-57 注记两句（受锁）vs 实现终态;「页码在 enqueue 时点定死」落点。

## ③ 宪法红线终审

受锁两轮（reading-time.test 等价面+INV-57+新四件入锁,283→286 恒定）;禁新依赖;行数（outbox 298+store 87 拆件;W2 后行数复核 ≤300）;UTF-8;TDD 四档（首红[模块诞生前加载红+mutation-4 闸门先红]/变异 4 证 cp 备份法/绿全量/verify 真退出码×4 份在档）。

## ④ 机器面核对（亲跑,不信转述）

1. `npm run verify > /tmp/g2-v.raw 2>&1; echo exit=$?`——预期 156 文件/**1422 用例**/locks 286/exit=0;
2. `npm run build` 后 `node scripts/audits/p7x02-impl-e2e-probe.mjs > /tmp/g2-probe.raw 2>&1; echo exit=$?`——预期 VERDICT PASS（210s/页 1,exit=0;探针禁改）;
3. e2e 全量 `npx playwright test`（spec 守卫 skip=P7X-02 未 done——预期 42 passed+1 skipped;可选）;
4. 变异抽查独立复算：cp 备份法①outbox.ts 删队头阻塞→vitest 单文件预期红→还原;②main.tsx 临时改回 await 前置（W1 逆变异）——**此项无法单测捕获（bootstrap 面）**,改为静态断言:读 main.tsx 确认 render 先于 replayOnStart 调用行序。受锁件走 unlock→改→测→还原→apply,全程实录;禁 git checkout。

## ⑤ 成本账本行

报告末尾报 token/时长/机型（环境统一档如实记）。

## 输出

全文写 scripts/audits/p7x02-gate2-full.md：四清单逐条裁决（亲跑实测数字）+终评（PASS/FAIL+条件）。回复五行内。禁 git commit/registry;探针/受锁测试禁改（抽查变异按 ④ 流程）;卡点 BLOCKED 停手。
