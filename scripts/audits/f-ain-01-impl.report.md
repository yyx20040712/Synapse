# F-AIN-01 实现者报告（ops-executor）

## 0. 开工技能清点（宪法会话开工纪律）

- test-driven-development：**用**——a1/a2 先红（withTransaction 缺失→中断半删半插）
  →实现绿→M1 变异红证。
- systematic-debugging：**用**——两处中途红（a2 区分度零/tickets 门占位拦截）按
  红因定位→最小修→复验处置。
- verification-before-completion：**用**——verify 全链真退出码落盘+e2e 零回归补跑。
- 其余技能：**不用**——纯 main 服务层票，无 UI/部署/新依赖面（理由如名）。

## 1. 实现摘要

缺陷：importOne 的 deleteByPaper+逐行重插无事务——中断/异常时半删半插
（旧面被清+部分新行落库）。

修法（票面全落）：

- `AiNotesImportDeps` 增必选 `withTransaction: <T>(fn: () => T) => T`
  （lineage.service.ts:77 同型）。
- importOne 两步写入包 `deps.withTransaction(() => { deleteByPaper; for insert })`；
  archive 账本判定/readFile/rename 仍在事务外（fs 非事务面）。
- services/index.ts aiNotesImport 装配注入 `withTransaction: deps.repos.withTransaction`
  （lineage 行同型）。
- 头注行为层补行：回灌写入=withTransaction 全有或全无（中断/异常零半删半插；
  事务边界=单篇非整批——部分成功语义保持；幂等三路径语义不变）。

## 2. 文件清单

| 文件 | 行数 | 增减 | 说明 |
| --- | --- | --- | --- |
| src/main/services/ai_sensor/ai-notes-import.service.ts | 226→236 | +13/-3（净 +10）〔P2-2 勘误：初版误记 227→236/+16/-6〕 | deps 接口+事务包裹+头注行为层行 |
| src/main/services/index.ts | 153（+1） | +1 | 装配注入 withTransaction |
| tests/unit/services/ai-notes-import.test.ts | 193→303 | +112/-2（净 +110）〔P2-2 勘误：初版误记 194→303/+114〕 | a1/a2 两用例+注入探针 helper+harness 注入（[locked-change] 面） |
| locks/manifest.json | — | sha 同步 | 随 unlock→generate→apply 链 |

## 3. 红证

- **首红**（实现前）：`scripts/audits/f-ain-01-first-red.raw.txt`，
  AIN_FIRST_RED_EXIT=1——a1+a2 双红（a1 `expected 1 to be +0`=首插半插残留；
  a2 红在 rPre.imported 断言 `['p-1'] vs ['p-1','p-2']`——夹具幽灵红（自裁 #3
  的 beforeEach 桩不含 p-2），非重灌半删断言本体），存量 10 绿。
  〔勘误（门一 W1，2026-09-18 主控修正）：初版本段误将 M1 指纹 `expected +0
  to be 1`（断言行 300 countByPaper('p-2')）记为 a2 首红指纹——该指纹实出自
  `f-ain-01-m1-mutation.raw.txt:15`；a2 终形态对未实现代码的红证缺失由 M1
  变异红证补位（门一 N1），敏感性闭环不受影响。〕
- **M1**（withTransaction 包裹改 IIFE 直调=fn() 形态）：
  `scripts/audits/f-ain-01-m1-mutation.raw.txt`，AIN_M1_EXIT=1——a1+a2 双红
  （简报要求 a1 红为下限，双红=半插+半删两面均敏感）。还原=cp 备份法：
  diff 空（M1_RESTORE_DIFF_EMPTY），备份即删，复绿 RESTORE_GREEN_EXIT=0。

## 4. 测试证据（真退出码）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| 定向单测（npm run test -- ai-notes-import.test.ts） | 0 | 12/12（存量 10+新 2） |
| npm run typecheck | 0 | 双 tsconfig 过 |
| npx eslint（三改动文件） | 0 | 无违规 |
| npm run verify（全链） | 0 | VERIFY_EXIT=0；指纹门 183 文件/用例 1762→1764（+2）/断言 5372（+22）/skipSites 15；vitest 166 文件/1719 用例（1717+2）；locks 334 一致 |
| npm run test:e2e（默认门，零回归自证） | 0 | 43 passed（2.0m） |

## 5. locks 实录

unlock（334）→ 测试文件两用例+harness 注入落盘 → 首红取证 → 实现四件 → 定向绿
→ M1 变异/还原（src 非锁面，测试文件未再动）→ `npm run locks:generate`（334）→
`npm run locks:apply` → locks:check EXIT=0；verify 内复验 334/334 一致。
（主控提交带 [locked-change] 尾注。）

## 6. 自裁申报

1. **a1 合并简报两路径为一用例两相**：简报「异 sha 重灌路径（或首次导入）」以
   「或」并列——合并为「首插中断零行（字面『零行』断言落此相）+成功导入后异 sha
   重灌中断旧数据完整（deleteByPaper 回滚面）」，两面全覆盖。
2. **a2 重设**：首版（B 首插即断+无预置数据）先绿——无事务下 B 也不留半态，
   区分度为零；按简报「首红=a1/a2 红」预期重设为「B 预置旧数据+异 sha 重灌中断」
   （B 的 deleteByPaper 无事务时已提交=半删面锚点），重设后红绿敏感+M1 双红实证。
3. **首绿途中一次测试自纠红**：a2 前置导入误用 beforeEach svc（paperExists 桩不
   含 p-2→判幽灵），改用例内自建 clean service——测试夹具问题非实现缺陷。
4. **头注/注释去「SR2-LG-01」工单号字样**：tickets:check 机检拦「源文件引用已
   完成工单号=占位残留」（首跑 verify 红×2）——简报措辞「对齐 SR2-LG-01」改
   「lineage.service 清面重灌事务先例」语义措辞，语义零损。
5. **头注行为层新行并入 a2 括号要求**的「事务边界=单篇非整批（部分成功语义
   保持）」声明。
6. **e2e 默认门补跑**：简报未列 e2e 验收项，因 build 面变更（main bundle）补
   43/43 零回归自证。

## 7. 疑虑

- withTransaction 为必选注入（lineage 同型，简报指定）——装配点漏注入由
  typecheck 编译期拦截，无运行时缺省面；测试 harness 注入=db.transaction 同式
  （repos/index.ts:37 单源形态）。
- fs 面（rename/archive 移动）仍在事务外=简报明示非事务面：重灌 DB 提交后
  rename 失败→产物留 corpus-ai，下次导入幂等修复（既有语义未动）。

## 8. 机读尾栏

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=2 outcome=done
