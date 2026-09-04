# P7D-01 批一 ·门二终审指令（子代理——环境统一档=GLM5.3flash 政策次选,与实现者同家族半异构欠账如实记;与门一实际审者 deepseek 跨门异构;亲跑矩阵）

你是门二终审子代理（四清单+一）。项目根 E:\class\智慧水务\Synapse_remake（Windows
Git Bash,node v24.20.0）。**逐条裁决+独立复算+亲跑矩阵——禁只审不跑、禁预设立场。**

## 票

P7D-01 批一（registry:245）——design token 三轴机械迁移零视觉差。票面简报=
scripts/audits/p7d01-b1-brief.md（完整任务书）;实现报告=scripts/audits/p7d01-b1-impl.report.md
（§1~9 首轮+§10 回炉一轮）;门一包=scripts/audits/p7d01-b1-gate1-package.md;
门一审查+主控处置记录=scripts/audits/p7d01-b1-gate1.md（末节处置表=你的①核对输入;
路由实录=Kimi 双源 8×504 耗尽→deepseek 兜底,switches=2 在档）。

## ① 处置核对

门一 findings（§1 三条盲区/§2 脆性/§5.2 INV 空窗/§6 两确认项）+主控处置表 vs 终态实物
——逐条核「说了没改/改了没说」。重点：W1/W2/W3 落点（theme.test.ts 终态 grep）+
mutation-4/5/6 红证与还原、探针 compiledRules 强化（probe3.raw.txt [COMPARE] PASS
含 11 utility 断言——主控仪器面先行完成）、§6(1) 裁定不增键的覆盖映射表在档性。

## ② 母本符合度

票面（简报③主控裁决——逐文件逐行迁移表）vs 实物 diff（git diff 21 文件,theme.test.ts
147+ 行含回炉面）。重点：token 定义 11 条逐字/32 duration 替换零漏（grep 实测 3 CSS
文件裸 duration 计数——含回炉后新增声明段 regex 的边界）/12 z class+2 raw/12 间距表
逐行/animation 时长 5s/2.8s/6s/0.16s 零改/marginLeft auto 保留/page-layer-z.ts 仅头注。

## ③ 宪法红线终审

分层/受锁（theme.test.ts unlock→apply 全程两轮,manifest 282 恒定）/安全禁令/行数/
UTF-8/TDD 证据链四档（首红 31F 落盘/变异 1~6 共六次×cp 备份法 RESTORED-CLEAN/
绿=全量/verify 真退出码——verify.raw/verify3/verify4 三份在档）。

## ④ 机器面核对（亲跑,不信转述）

1. `npm run verify > /tmp/g2-verify.raw 2>&1; echo exit=$?`——预期 155 文件/**1398**
   用例/locks 282/exit=0;
2. `node scripts/audits/p7d01-visual-probe.mjs after > /tmp/g2-probe.raw 2>&1; echo exit=$?`
   ——预期 [COMPARE] PASS exit=0（探针自带 baseline 对比+compiledRules 11 项绝对断言;
   **禁改探针**——注意探针跑前需 `npm run build` 保证 out/ 为终态源码）;
3. 抽查负锚鉴别力（独立复算面）：cp 备份 theme.css→把一处 `var(--dur-fast)` 改回裸
   `0.14s`→`npx vitest run tests/unit/renderer/theme.test.ts` 预期红（值面计数负锚）→
   cp 还原 diff 空;再抽 W2：cp 备份任一弹层 tsx→className 临时加 `z-[50]`→预期红→还原。
   （受锁件只读拦时先 npm run locks:unlock,毕即 apply,报告记全程;禁 git checkout。）
4. e2e 声明核对：scripts/audits/p7d01-b1-e2e.raw.txt=42 passed exit=0 在档（全量复跑
   可选 2 分钟,`npm run test:e2e`）。

## ⑤ 成本账本行

报告末尾报你的 token/时长/机型（环境统一档如实记）。

## 输出

全文写 scripts/audits/p7d01-b1-gate2-full.md：四清单逐条裁决（含亲跑矩阵实测
数字）+终评（PASS/FAIL+条件）。回复五行内。禁 git commit/registry;探针/受锁测试
禁改（抽查变异按 ③ 流程走 unlock/apply）;卡点 BLOCKED 停手。
