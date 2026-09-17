# F-AIN-01+F-DEP-01 组合批门一审包（对抗深审——小票组一火，逐票 findings）

## 输入件

- diff 包：`scripts/audits/f-ain-dep-gate1-diff.patch`（425 行；含两票源面+测试+package/lockfile+manifest+relay 勾选行+两份实现报告全文；raw 证据 9 件剔除可按路径自 Read，禁跑）
- 票面：tickets/registry.ts:286（F-AIN-01）/287（F-DEP-01）
- 实现者报告：scripts/audits/f-{ain,dep}-01-impl.report.md（diff 包尾附全文）
- 证据：f-ain-01-{first-red,m1-mutation,verify}.raw.txt 等+f-dep-01-{ci-dryrun,ls,verify}.raw.txt（以实际文件名为准，Glob f-ain-01-*/f-dep-01-*）

## 票面与修法（主控预裁——可攻击）

**F-AIN-01**：ai-notes-import.service.ts:188-189 deleteByPaper+重插无事务→中断半删半插。修法=deps 注入 `withTransaction: <T>(fn: () => T) => T`（lineage.service.ts:77 同型）+两步包事务+services/index.ts 装配注入+头注行为层行。测试 a1（两相：首插中断零行/重灌中断旧数据完整）+a2（跨篇隔离：A 成功 B 中断）。变异 M1=withTransaction 改 IIFE 直调→a1/a2 红。
预裁：①事务边界=单篇非整批（部分成功语义保持——头注+a2 声明）；②archive 判定/readFile/rename 留事务外（fs 非事务面）；③a1/a2 用真 db.transaction+包装 repo 注入中断（failingInsertRepo 探针）。

**F-DEP-01**：scripts/check-quality.mjs:15 `import postcss from 'postcss'` 为传递依赖 import（F-LINT-04 门一 W-4 申报欠账）。修法=package.json devDependencies 增 `"postcss": "^8.5.26"`（字母序）+npm install 同步 lockfile。机检三件=npm ci --dry-run EXIT=0/npm ls postcss 直挂/verify 全链绿。
预裁：④干净环境 npm ci 构建绿=CI 背书（ci.yml:33-34）+本地 dry-run，本地不真跑 npm ci（ABI 重切+耗时）——呈报口径；⑤postcss 非新增依赖=显式化既有传递依赖（裁决 4 语义），版本=lockfile 现值 8.5.26。

## 实现者自裁要点（攻击面）

a1 合并两路径两相（简报「或」并列取全覆盖）；a2 重设（首版 vacuous green——B 无预置数据时无事务也不留半态，重设为预置旧数据+异 sha 重灌中断）；头注去「SR2-LG-01」工单号（tickets:check 规则 2 拦 done 票占位引用→改语义措辞「lineage.service 清面重灌事务先例」）；e2e 默认门补跑 43/43（main bundle 变更自证）。

## 工单 A~E

- A 母本符合度：逐票票面 vs 实现（F-AIN=SR2-LG-01 全有或全无标准对齐+中断注入验收+F-DEP=显式化+[dep-change] 面）。
- B 宪法红线：受锁链（ai-notes-import.test.ts unlock→generate→apply）/禁新依赖条款（postcss=显式化非新增——预裁⑤）/UTF-8/≤500 行。
- C 代码与测试质量：事务边界正确性（单篇边界/异常传播路径——importOne 的 try-catch 对注入错误的折叠是否保持「失败篇留 corpus-ai 不移 archive」语义）；测试区分度（a2 重设后的红绿敏感性）；F-DEP 的 lockfile 同步完整性（root devDependencies 条目+integrity）。
- D 报告诚实性：自裁对 diff/数字（指纹门 1762→1764/vitest 1717→1719/locks 334/断言 5350→5372）核实。
- E 接缝：ai_notes.repo 头注声明行（「v1 无生产者」解除时点=本单——头注是否仍一致）；lineage 先例声明两侧互斥检查；F-SENSOR-01（ai_sensor 域整理票）对本改动的承袭。

## 输出

[B|W|N] 逐条（标注票号）+file:line 证据+统计+总评；报告全文回复（工具面只读时主控代落盘 f-ain-dep-gate1-report.md）；回复精简版。
