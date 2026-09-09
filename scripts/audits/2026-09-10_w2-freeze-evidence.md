# ai-dev-org v1.0 冻结证据包（W2 回归内化——2026-09-10）

> 回归执行件=技能 `scripts/regression.mjs`（自包含）；本包=冻结裁决呈报物。
> 原件=06 §5 R1~R6 清单；内化等价形态与结果如下。**v1.0 冻结与
> drafter 复用解锁+项目切换资格=用户裁决位，本包呈报后待裁。**
>
> **纪元澄清（W5 审 C' Kimi-B-1 处置）**：本战役全部档案（含本包）落款
> 沿用上游交接书的战役纪元 **2026-09-10**（交接书标题即「2026-09-10
> 起草」）；而**机器时钟=2026-09-09**（git 提交时间戳/new Date()/流水
> ts 同源）。「9 日提交引用 10 日纪元」非事后回填——时间线自证：五提交
> 10:44~11:01（本地）与六派发流水 ts（02:0x~03:1x UTC=本地 10:0x~11:1x）
> 吻合，过程=随做随交。原件等价对照=R1~R6 逐条矩阵，见 W5 终裁档
> （scripts/audits/2026-09-10_w5-final-ruling.md）。

## 一、回归结果（全过）

| 项 | 内化形态 | 结果 | 原始证据 |
|---|---|---|---|
| R2'（=R2） | 系统提示 golden 字节自比对，**双路**：a) 角色档案装载 vs golden；b) 派发器 `--dry-run` assembled_system vs golden（勾连真实装载路径）。golden 冻结于 `scripts/roles/.golden/`（3 角色+MANIFEST 含 sig/sha256） | **PASS**（gate1-reviewer/drafter/auditor-readonly 三角色双路全 `:=`） | w2-regression-zero-cost.raw.txt |
| R5'（=R5） | mock 全链 exhaust 演练：`--mock-source kimi-main:429,kimi-backup:429,deepseek:500` 零成本注入 | **PASS**（exit=2/stderr 全源尽/attempt 12/switch 2/exhaust 1 互斥落账/chain 三源完整/演练账本 exhaust 行在档） | 同上 |
| R4'（=R4） | 流水+账本字段完整性（当前 dispatcher 版本行逐字段校验；历史版本行按当时 schema 跳过——历史件禁改写） | **PASS**（流水尾 100 行坏 0；账本尾 23 行坏 0，事件分布 ok18/switch4/exhaust1） | 同上 |
| R1'3（=R1+R3 合并） | 语义抽样：3 个锚定样例（断言弱化/干净/占位残留）双源（kimi-main+deepseek）真实派发，判定方向一致性+预期符合 | **PASS**（S1:FAIL/FAIL、S2:PASS/PASS、S3:FAIL/FAIL——双源一致且符合预期 3/3） | w2-r1-semantic.raw.txt |
| R6 | 解锁条款（非测试项）：上述全过 → drafter 复用+项目切换资格成立 | **条件达成，待用户裁决** | 本包呈报 |

补充：技能落地时的 R2 机检（v1 内嵌 vs 角色档案 96B=96B）在档=
`2026-09-10_r2-byte-compare.mjs` 历史 PASS；R2' golden 化后可**持续**
机检（防档案静默漂移），比一次性比对强化。

## 二、执行过程事件（如实记账）

1. R1'3 首轮（宿主 Node 25.2.1）：deepseek 侧 3/3 方向正确；kimi-main 侧
   三次 exit=3221226505（0xC0000409 libuv `uv_handle_closing` 断言，
   async.c:76）——**进程已完成输出与落账后于退出阶段崩溃**（前台单发
   复现：真调成功 usage in=108/out=91 输出正确，崩溃在尾部）→定性=
   宿主 Node 25.2.1 环境缺陷（宪法在档：宿主 bash node 落 D:\nodejs=
   25.2.1），非派发器缺陷。
2. R1'3 二轮（Volta 锁定 Node 24.20.0 实体重跑）：全过（见上表）。
   **行动指引入册**：外部派发一律用 Node 24 跑（`$LOCALAPPDATA/Volta/
   tools/image/node/24.20.0/node.exe`）。
3. R5'/R4' 初轮曾红：R5 账本落点误解（--project 仅条目名，账本随
   派发器 cwd）→修 `cwd: tmp`；R4 历史版本行误判坏行→按
   dispatcher_version 过滤（历史 schema 合法）。修后 4/4——两次红
   均为 regression.mjs 自身实现问题，派发器零改动（修复过程=脚本
   自身回炉，派发器已审面未触碰）。

## 三、冻结呈报（用户裁决位）

- **请裁决**：ai-dev-org 是否按本证据包冻结 v1.0（解锁 drafter 复用
  与项目侧切换——Synapse 的 ds-call.mjs v1→v2 切换走 [locked-change]）。
- 冻结后版本演进=本战役 W5 全局审计通过 → v1.1（版本号+修订史已含
  W1~W4 增量）。
- 成本：R1'3 两轮真实派发（Kimi ×4 小样例+deepseek ×6 小样例+诊断 1
  次）——精确 usage 见 `.zcode/org-ledger.jsonl` 对应行；W5 六派发
  配给预算另列（战役全量 campaign-cost 两行已入账）。

## 四、裁决结果（用户四项裁决——2026-09-10 冻结呈报闭环）

| 裁决位 | 用户裁决 | 生效 |
|---|---|---|
| ①v1.0 冻结 | **冻结**（选「冻结（推荐）」） | v1.0 即时冻结；drafter 复用+项目切换资格生效（Synapse 的 ds-call.mjs v1→v2 切换走 [locked-change] 独立工单） |
| ②R1 形态迁移 | **认受**（选「认受（推荐）」） | 「3 锚定样例×双源语义抽样」=R1 合法等价形态，等价矩阵闭合 |
| ③纪元口径 | **认受**（选「认受（推荐）」） | 档案落款 2026-09-10 纪元维持，零改动 |
| ④W5 放行定格+收尾边界 | **双认可**（选「双认可（推荐）」） | 终裁放行定格生效+v1.1 定格；终轮后收尾修正=「轮 2 缺陷收尾」边界认定成立 |

（裁决载体=会话 AskUserQuestion 四问，用户逐项选择如上；技能侧
SKILL.md「验证状态」节已同步冻结生效声明。）
