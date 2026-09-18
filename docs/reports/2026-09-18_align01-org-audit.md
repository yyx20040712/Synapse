# F-ALIGN-01 组织定版对齐核查报告（含 ds-call v1→v2 切换呈批）

> 票面：tickets/registry.ts F-ALIGN-01 ｜ 裁决依据：《裁决书》裁决 12/13
> （docs/design/2026-09-18_complexity-governance-ruling.md §1）
> 执行：2026-09-18 主控会话（relay batch 9）｜本报告=票面四子任务核查结论
> 与切换呈批材料一体件。

## 1. 钉版事实

- 技能基准（执行时实测）：ai-dev-org **v2.0.1**，技能仓 git HEAD=**2e292bb**
  （`docs(DEPLOY+RESIDUALS): volta run 退出码掩码提示+触发器登记+漂移清偿
  批修订记（门一 k1 审 B=0/W=2/N=3 PASS，回炉全处置）`——SKILL.md 版本行
  与 git log 双源自证；引文按 git 原文校准）。编号澄清（门一三审 W1 处置
  ＋门二 P1-1 修正）：regression.mjs 文件末次代码提交=a0ea31a（修复批），
  系 2e292bb 的祖先（实测 `git merge-base --is-ancestor` 通过）；间隔
  **13 个提交**（距离 14），其中 **5 个为非 docs/RESIDUALS 面**
  （checkers/templates/agents 档位声明等代码提交——初稿「间隔 5 提交全为
  docs 面」系 git log head 截断误读，门二 reflog 实测证伪）——两号并存
  不矛盾（文件末次代码提交≠仓 HEAD），钉版以仓 HEAD 为准。
- org-config 无版本字段（裁决 12 已声明），版本事实以提交号+ORG-SEG 注为准。
- 项目覆盖件 `.zcode/org-config.json` 在案；合并配置 hash=`cfg:545b6843a147`
  （项目根跑 `org-config.mjs hash`），纯默认件 hash=`cfg:1a93765499cd`
  （技能根跑）——两口径差异见 §2 R4 分析。

## 2. R1~R6 回归真跑结果矩阵

背景：doc-align 简报（docs/prompts/2026-09-10_doc-align-brief.md）主控补记
自称阶段 3「收窄为引用证据包复盘确认，无需另跑回归窗」——该自裁未经裁决，
裁决 12 认定承诺悬空，本批真跑销账。执行环境=Node 24.20.0（volta 项目锁），
脚本=技能 `scripts/regression.mjs`，`--project` 指本仓根。

| 项 | 内容 | 结果 | 证据件（scripts/audits/） |
| --- | --- | --- | --- |
| R1 | 语义抽样：3 样例×双源真实派发 | **PASS**（S1 断言弱化双源 FAIL✓/S2 干净双源 PASS✓/S3 占位残留双源 FAIL✓） | align01-regression-r1.log |
| R2a/R2b | golden 字节自比对（档案装载路+派发器 dry-run 路） | PASS（三角色 :=——行尾「:=」=当前装配与 golden 字节相等标记） | align01-regression-zero.log |
| R5 | mock 全链 exhaust 演练 | PASS（exit=2 期 2/attempt 12/switch 2/exhaust 1） | 同上 |
| R7 | 账本 schema 指针唯一指向 02 §9 | PASS | 同上 |
| R8 | log-triage/org-config/deploy-check 自检 | PASS | 同上 |
| R9 | scrub 复制体与源字面量一致 | PASS | 同上 |
| R10 | 传输层/向量/守卫回归面 | PASS（mock glm/ds 双✓/null 守卫 exit=5 等） | 同上 |
| R4 | 流水与账本字段完整性 | 首跑 FAIL（两子域，见下）→终态复跑 **PASS**（§6） | align01-regression-r4-{recheck,final}.log |

### R3/R6 编号去向说明（门一 B2 处置——查证链）

「R1~R6」=技能 v1.0 时代 06 §5 内联六项清单的历史编号口径（git 8ae30d3
首提交原文）。回归内化（1b78cfb）后现行可选项=R1/R2/R4/R5+R7~R10，其中：
**R3（输出判定方向 3/3 一致）并入 R1'3 合并项**——头注「R1'3」标记即
R1+R3 合并证据，本批 R1 PASS（双源方向一致 3/3）=原 R1+R3 双义达成；
**R6（全部通过后方允许切换）是流程门禁条款而非测试项**——不入脚本，
落 06 正文「回归前置」句+项目宪法 ORG-SEG「服役至回归 R1~R6 全过后按
[locked-change] 切换」条文；R6 原文两翼=「drafter 复用与项目侧切换」，
本批 **drafter 复用翼未启用**（零 drafter 派发，本批仅用 gate1-reviewer
角色），切换翼由本报告 §7 呈批执行。故票面「R1~R6 真跑」语义=内化四项
（R1'3/R2'/R4'/R5'）全过，本批达成、无缺位。
（evolve-b8 b76efd7 已把 06 内联数字清单指针化删除——防双源计数腐化，
现行清单单源=regression.mjs --only 集合。）

### R4 首跑两子域红点根因（结构性口径问题，非数据损坏）

1. **流水 cfg 哈希域**：流水尾行 `org_config_hash=1a93765499cd`（R1 派发器
   `--project tmp` 隔离设计→按 cwd 装载纯默认件）vs R4 live hash 子进程在
   项目根算合并配置 `545b6843a147`。根因=**R1 回归隔离设计与项目覆盖件机制
   的口径互斥**（ds-call-v2.mjs:443 `loadOrgConfig(process.cwd())`——正常
   形态在项目根派发时记录合并 hash，两口径届时一致）。流水坏行=0。
2. **账本校验域真空**：ledger 尾 25 行全部为 2026-09-16T12:00Z 纪律时点前
   存量行（合法跳过）→ 全跳=显式 FAIL。根因=**账本断流本身**（§3）——
   该红点即断流的机检面证据。

处置：本批门一审实弹走外部派发器（项目根形态，§4 择路理由）——落账后
流水尾行=合并 hash+ledger 新增 v3 schema 行，R4 复跑两子域转绿=终态
（§6 复跑实测）。R4 在「R1 --project tmp」单跑场景下的口径互斥登记技能侧
欠账（建议：R4 cfg 校验按流水尾行派发装载根取对应 hash；不阻塞本批）。

## 3. 账本断流核查（票面④）

- **末笔实测**：`.zcode/org-ledger.jsonl` 原断流态 25 行；Synapse_remake 面
  23 行，末笔 `2026-09-09T02:21:05.202Z`（auditor-readonly/kimi-main/ok）——
  断流 9 天。ai-dev-org-optimize 面 2 行 campaign-cost 收尾（09-09T03:55Z）。
  **本批门一实弹落账后动态**：门一三轮派发逐轮落 v3 行（首轮+二轮+三审
  共 3 笔），ledger 现值 **28 行**（读数时点=门二终裁时；§6 复跑时点为
  26 行快照）——流水/账本/审报头注三方对账逐字一致（门二复算记录②）。
- **根因**：2026-09-10 组织技能化+2026-09-18 裁决 13 生效后，门一/门二/
  实现者全部走**绑定子代理**（ops-*）——绑定子代理不经外部派发器链，
  而账本写入器（safeAppend ledgerPath）只挂在 ds-call 派发器链上 → 结构性
  零新账笔。log-triage 佐证：窗口内 ops-* 会话岗大量「声明=xxx 实际=窗口内
  无请求记录」WARN（无可核对请求=不经派发器）；⑥岗×源用量子代理行 in/out=0
  （数据源缺失）。
- **非乱码确认**：Synapse 面 23 行 outcome 字段 UTF-8 读取零乱码命中
  （此前 tail 显示乱码行属 ai-dev-org-optimize 面 campaign-cost 行的
  GBK 显示层假象+该行 outcome 本身含中文）。
- **落法**：①恢复派发器账笔=本批门一实弹已落首笔新 v3 行（流水 runId
  20260918001316-vvrkhrqs 关联，ledger 26 行态见 §6）；②绑定子代理时代的
  成本记账=**主控补记规则**（F-PROC-01 ⑤ 落法，在途票）；③技能侧绑定
  子代理写入器接线=技能仓欠账登记（本报告 §7 呈批附带项）。

## 4. 本批门一通道择路申报（runbook 择路权行使）

裁决 13 主通道=绑定子代理；本批门一**走外部派发器 ds-call-v2**（项目根
形态、kimi-main 源、--role gate1-reviewer），理由：

1. **切换前实弹验证义务**（票面①）：v1→v2 切换呈批的依据必须包含 v2 在
   本仓真实环境的一次完整实弹（审包派发→审报回收→流水/账本落账全链），
   R1 的 6 次抽样调用是回归形态（--project tmp），不能替代项目根实弹。
2. **R4 终态达成**（§2）：流水 live-hash+账本 v3 新行只能由项目根形态
   真实派发落账。
3. 门二/裁决位仍走 ops-adjudicator 绑定子代理——门一（Kimi 外部派发）×
  门二（deepseek 绑定）×主控（GLM）三异构不降级。

## 5. 宪法与制度面变更清单（票面②③）

| 落点 | 变更 | 机检 |
| --- | --- | --- |
| AGENTS.md 三屋段 | 门一通道句改「绑定子代理主通道（ops-gate1-k1/k2，$max 显式档位——裁决 13 入宪；外部派发器=健康探针+后备，runbook 择路权保留）」 | 人工审 |
| AGENTS.md ORG-SEG 段 | v1→v2 重写：+钉版行（v2.0.1@2e292bb）+裁决 13 主通道条文+切换状态行（呈批待用户）+预算机检句 | **check-constitution-budget PASS 599/600**（本批两次超限 637/602 被拦后裁剪至过——会话内实弹验证，机检输出未落档系自证口径，门二 P2-3 注明；脚本属技能仓组织面，未接项目 CI） |
| AGENTS.md 词汇映射表 | 6 数据行→12：补实现者子代理/Kimi 拟定→drafter/deepseek 审核→auditor-readonly/诊断排查→sre-diagnostic/视觉决策→design-reviewer/成本账本→02 §9 | 人工审 |

AGENTS.md 不在 locks manifest 334 项内（实测），无锁义务。

## 6. R4 终态复跑（门一实弹落账后——实测回填）

复跑命令=`regression.mjs --only R4 --project <本仓根>`，实测输出原文：

```
PASS R4 流水:尾100行坏0行（含未知事件0）跳0行(旧版本)外来0行(他源channel标记) 事件分布={"switch":12,"attempt":75,"exhaust":6,"ok":7}；cfg哈希一致=true（流水 545b6843a147 vs live cfg:545b6843a147）；账本:尾26行坏0行（含未知事件0）跳25行(旧版本)外来0行(他源channel标记) 事件分布={"ok":1}
R4FINAL_EXIT=0
```

即：流水 cfg 哈希域转绿（门一实弹按 cwd 装载项目覆盖件，记录合并 hash
545b6843a147=live）；账本域真空解除（新 ok 行 v3 schema 校验通过，25 旧
行为纪律时点前合法跳过）。**R1~R10（含原 R1~R6 编号口径全义，见 §2
去向说明）终态全项绿达成**。证据件=scripts/audits/align01-regression-r4-final.log。

## 7. ds-call v1→v2 切换呈批（Rulings 待用户）

**呈批事项**：受锁 `scripts/audits/ds-call.mjs`（v1，Kimi 链派发器，
fetch 传输层带已确诊 undici headersTimeout≈300s 缺陷）切换为技能
`ds-call-v2.mjs`（node:http(s) 直连+signal 唯一超时源+角色档案化）。

**依据链**：①AGENTS ORG-SEG 原文「服役至回归 R1~R6 全过后按
[locked-change] 切换」——R1~R10 全项绿（§2+§6 终态）达成前提；
②doc-align 阶段 3 悬空承诺已销（真跑在档）；③v1 已知缺陷确诊在档
（undici 300s 隐形杀手，技能 06 §5.7）。

**批准后动作**（后续批执行，非本批）：删除 scripts/audits/ds-call.mjs+
model-routing-log.jsonl 迁移核对+AGENTS ORG-SEG 切换状态行改「已切换」+
[locked-change] 提交（含 locks:generate/apply——manifest 需增删该路径）。

**选项**：
- a（推荐）：批准切换——R1~R10 全绿+实弹验证在档，v1 缺陷确诊，继续
  服役无收益；
- b：暂缓——先修 R4 cfg 口径互斥欠账（技能侧）再切；
- c：维持双轨（不推荐——「两版禁混用于同一工单」约束下双轨=纯维护负担）。

**附带欠账登记**（随裁决一并确认）：①技能侧 R4 cfg 口径互斥修复；
②技能侧绑定子代理账本写入器接线（§3 落法③）；③F-PROC-01 ⑤ 补记规则
（在途票，不受本裁决影响）。

**追认项（门一 W1 处置——Rulings 待用户 +1）**：本批门一实弹与重审
走 **ds-call-v2**（v1 依 ORG-SEG 仍为服役件，「未批先用」超自裁面），
理由=切换前实弹验证是呈批依据的组成部分+R4 终态落账只能由项目根形态
真实派发生成；R1~R10 回归（含 v2 传输层/守卫面 R10）已全绿作旁证。
重审保持 v2（ORG-SEG「两版禁混用于同一工单」——首轮 v2 则重审不得
换 v1）。若不追认：本批门一审作废、整体重走 v1（流水/账本 v2 行
标记保留作废档）。

**通道张力说明（门一二轮 W3 处置）**：同批宪法将 ds-call 降位为
「健康探针+后备通道」（裁决 13）与本批门一走 v2 实弹并存，非矛盾而是
切换窗口期的固有形态——裁决 13 定位的是**切换落定后的常态位**；切换
前的验证义务（呈批前提）只能由候任组件 v2 以真实派发承担，且
ops-gate1-k1/k2 绑定通道在本客户端可用（batch 2~8 门审全程承载），
本批择 v2 非因绑定不可用，而是验证义务专属外部派发器形态——这正是
追认项呈用户裁决的原因（特例使用而非常态使用）。

## 8. 成本账（本票——流水实测口径）

- R1 真跑：6 次真实调用 ok 行（3 样例×kimi-main+deepseek 双源），流水
  usage 合计 **in=3065/out=4415**（技能 model-routing-log.jsonl 逐行在档，
  runId 关联）——低于头注 ~9k 估算（估算含系统提示开销上限）。
- 门一实弹（首轮）：1 次（kimi-main），流水 usage **in=5007/out=4692**，
  latency=100413ms（routing 头注原文）；账本新 ok 行 v3 落档。
- 门一重审（B 处置后）：随重审落流水/账本（v2 同版）。
- 门二/主控/实现零外部派发（文书票，主控直做+绑定子代理）。
