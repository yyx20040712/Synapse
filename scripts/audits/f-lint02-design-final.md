# F-LINT-02 终裁书（GLM5.3 主控——设计链第三跳）

> 三跳链：Kimi 三案设计（f-lint02-design-kimi-out.md）→ deepseek 对抗审核
> （f-lint02-audit-ds-out.md：2B/多W）→ 本终裁。实现票以此为准。

## 1. 架构终裁：案 A（独立扫描脚本挂 check-quality）

- 案 B 否决（eslint --cache×manifest 交互静默漏报未实测+受锁面大）；
  案 C 否决（ts-morph 新依赖=过度工程）。两源一致，落案 A。
- 形态：`scripts/check-dup-constants.mjs`（单文件，~200 行——A.1 的
  collect/report 拆件取消，A.6「两文件」与 A.1 清单不一致处按本条收敛）；
  npm script `lint:dup-constants`；挂 check-quality 链（eslint 后）。
  **不触 eslint.config.js**。

## 2. 判据终裁（六判据修正版）

1. **红层=同名同值跨 ≥2 文件**（保留）。deepseek「同名≠同一概念」反例
   成立——终裁定性：同名判据是**高置信信号非保证**，残余误报由 baseline
   棘轮吸收（见 §3）。
2. **trivial 集绝对豁免**：{0,1,-1,true,false,'',null}——终裁明确为
   「宁可漏报不加噪音」策略（deepseek 建议采纳：写明策略非「自然合理」）。
3. **文案不豁免**：同名同文案入红层；异名同文案入 warn 层。warn 阈值
   终裁=**字符串值长度≥4 即 warn**（不限 CJK/空格——组 9 'ai-sensor'
   漏收修正）+CI 输出截断 20 行。
4. **同文件豁免**（跨文件限定保留）；口径声明更正：**两处跨文件即红=
   项目约定**，不引用 Rule of Three（Rule of Three=同文件内逻辑）。
5. **常量名前缀规则：终裁不实现**。票面授权项的显式裁决（非默认略过）：
   SHARED_ 前缀=唯一定义点之上的双重约定，无增量收益；红层收敛后
   唯一定义点自然达成。此条对票面授权面做减法，记录在案供用户复核。
6. **AST 值归一化+收集边界矩阵**（deepseek W 采纳）：单双引号/数字分隔
   符（15_000≡15000）归一；无插值 TemplateLiteral 计入（≈Literal）；
   `as const`/`satisfies` 包裹的字面量初值计入；computed key/对象常量/
   插值模板**排除并申报**。实现期以 dry-run 输出对拍（f-lint02-dryrun
   .mjs 已在档=审核 F-2 项实已满足，deepseek 未见到脚本存在）。

## 3. baseline 棘轮终裁

- `scripts/dup-constants.baseline.json` 存 6 组真命中指纹（name+value+
  文件集哈希，不含行号）。运行时：新增命中（∉baseline）→ exit 1；
  baseline 内→打印「待收敛」放行。
- **防绕过**：baseline.json 入受锁面（manifest 自动覆盖 scripts/*.json
  须确认——否则 locks:generate 登记）；**baseline 变更须 [locked-change]
  尾注**——新增指纹=可见提交面+人类审查位（与 check-tickets 白名单
  同机制；机器面不再加码「只减不增」diff 校验——收益/成本比不成立）。

## 4. 存量处置终裁

- 红层 6 组（1.5/0.02/COLUMN_GAP 系、btn×2、STATUS_POLL_MS、
  TAG_OP_FAILED、ITEM_STYLE）→ baseline 棘轮+**收敛子票另立**（F-LINT-03
  候选——6 处 import 重构，不在本票面）。
- 「6 组真命中/误报 0」按 deepseek B 定性=待对拍结论——实现期以对拍
  通过为验收（非默认事实）。
- warn 2 组（'操作失败'×7/'标注保存失败'）→ 打印不追踪。

## 5. B-2/C-3/B-6 随案终裁

- **B-2 半合派**：收集器顺产「未被 export 的字面量 const 清单」只读
  artifact（stderr 或独立输出文件），不卡 CI、不定消费规则。
- **C-3 另立**（deepseek B 采纳：行内字面量=不同数据面需独立假阳控制，
  顺带收口=扩大终裁面）。
- **B-6 另立**（两源一致）。

## 6. 验收终裁

- 先红证：跨文件植入 `const RED_PROOF_SENTINEL = 'red-proof-sentinel'` →
  红 → 还原绿；**阴性对照**：异名同值（RED_A=777/RED_B=777）不红；
  矩阵红证=template literal/as const/同文件/trivial 四边界各一例。
- 存量零误报=对拍 dry-run 18 组（红恰 6 组=baseline、warn≤2 组）。
- verify 全链+check-quality 挂点即绿。

## 7. 实现派发注意

- 受锁面：check-quality.mjs（改）+新脚本+baseline.json+package.json
  scripts 字段——全程 unlock→改→apply 纪律+[locked-change] 提交尾注。
- F-A9/F-A11 并发会话在途——npm run test 的 ABI 竞态：verify 跑前确认
  `node scripts/sqlite-abi.mjs use electron`（build 前置自愈但 vitest 段
  需要 node ABI——verify 链自身管理，勿在并发窗口中途手动切）。
