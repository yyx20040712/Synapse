# 门一审包：F-ALIGN-01 组织定版对齐（制度+配置复合批）

你是对抗式审查员。审查以下批次的产出与申报之间的偏差。只报告有证据支撑的
问题；每条给出文件/行号或原文摘录；不确定的明确说不确定。用中文。
末行固定输出机读尾栏：`FINDINGS: B=<数> W=<数> N=<数> VERDICT=PASS 或 FAIL`。

## 一、票面（任务书）

> F-ALIGN-01（registry）：组织定版对齐（裁决 12/13）：钉版=执行时取技能当时
> 最新版+记 git 提交号（现基准 v2.0.1）；①R1~R6 回归真跑（销 doc-align
> 阶段 3 悬空承诺）→ds-call v1（scripts/audits/ds-call.mjs，undici 300s
> 已确诊缺陷）→v2 切换呈批，切换后 v1 删除 [locked-change]；②ORG-SEG
> v1→v2 重写（含裁决 13 绑定子代理主通道条文+预算机检）；③词汇映射表补全
> （拟定者/审核者/SRE/设计岗等）；④账本断流核查（org-ledger 末笔 09-09，
> log-triage 通道）；制度+配置复合批单火专注。

裁决 13 原文（《裁决书》§1 行 49）：「**入宪**：绑定子代理通道（ops-*，
$max 显式档位）为门一主通道；外部派发器=健康探针+后备通道（runbook
择路权保留）——与技能 06 §6 补遗同口径；落点=宪法三屋段+ORG-SEG 段双处
随 F-ALIGN-01 更新」。

裁决 12 原文（同 §1 行 48）：「立项 F-ALIGN-01，排 F-DOCGOV-01 前：
R1~R6 回归真跑（销 doc-align 阶段 3 悬空承诺）→ ds-call v1→v2 切换呈批
（[locked-change]，切换后 v1 删除）；ORG-SEG v1→v2 重写；词汇映射表补全；
账本断流核查」。

## 二、产出申报（主控自报）

1. **①R1~R6 真跑**（销悬空承诺）：零成本面 R2a/R2b/R5/R7/R8/R9/R10 七项
   PASS+R1 真实派发 PASS（3 样例×双源方向一致 3/3；~9k Kimi tokens）；
   R4 首跑 FAIL 两子域：cfg 哈希域=R1 `--project tmp` 隔离设计记录纯默认件
   hash（1a93765499cd）vs live 合并 hash（545b6843a147）的口径互斥（流水
   坏 0 行）；账本域=尾 25 行全旧 schema 行合法跳过后校验域真空=断流实锤。
   处置=本批门一实弹走外部派发器（项目根形态）落账后复跑 R4 转绿
   （报告 §6 复跑实测回填）。R1~R10 终态全绿申报。
2. **②ORG-SEG v1→v2**+三屋段门一通道句改（裁决 13 双落点）；预算机检
   599/600 PASS。
3. **③词汇映射表** 6 数据行→12（补：实现者子代理/Kimi 拟定→drafter/
   deepseek 审核→auditor-readonly/诊断排查（ops-diagnostics）→
   sre-diagnostic/视觉决策→design-reviewer/成本账本→references/02 §9）。
4. **④账本断流核查**：25 行/_synapse 23 行/末笔 2026-09-09T02:21:05.202Z
   （auditor-readonly kimi-main）；根因=裁决 13 后绑定子代理不经派发器链
   而账本写入器只挂派发器链（结构性断流）；Synapse 面 outcome 零乱码；
   落法=①门一实弹落首笔 v3 行 ②F-PROC-01 ⑤ 补记规则 ③技能侧写入器欠账。
5. **切换呈批**：报告 §7 选项 a~c（推荐 a 批准切换）——**本批不实际切换**，
   呈批产出即勾项（relay 执行路由「已规划呈裁节点完成产出即勾项」）。
6. **门一通道择路申报**：本批门一走外部派发器（runbook 择路权），理由=
   切换前实弹验证+R4 落账（报告 §4）；门二仍绑定子代理。

## 三、审计证据

### 1. AGENTS.md diff（vs HEAD；另 relay.md 6 行=板面认领非票产物不入审）

```diff
（全文 68 行见 scripts/audits/align01-agents-diff.patch，此处节选关键三处）

三屋段：
- 走 docs/methodology.md §4.5 终态：实现者=GLM5.3flash（deepseek 实现面
- 禁用）/门一=Kimi 链外部派发（零仓库接触）/门二=异构二审/体验额度优先
+ 走 docs/methodology.md §4.5 终态：实现者=GLM5.3flash（deepseek 实现面
+ 禁用）/门一=Kimi 链**绑定子代理主通道**（ops-gate1-k1/k2，$max 显式档位
+ ——2026-09-18 裁决 13 入宪；外部派发器 ds-call=健康探针+后备通道，
+ runbook 择路权保留）/门二=异构二审/体验额度优先

ORG-SEG v2 段（v1 三条→v2 六条，新增：钉版行/裁决 13 主通道条文/切换状态
行/预算机检句；机检 PASS 599/600）

词汇映射表（6 数据行→12，表头注补「2026-09-18 F-ALIGN-01 补全」）
```

### 2. R 矩阵机检输出（节选原文）

```
PASS R1 双源判定方向一致性 S1-断言弱化:FAIL/FAIL(期FAIL)✓ S2-干净样例:PASS/PASS(期PASS)✓ S3-占位残留:FAIL/FAIL(期FAIL)✓
R1_EXIT=0
（零成本面）PASS R2a/R2b/R5/R7/R8/R9/R10；FAIL R4（两子域，报告§2 定性）
REGZERO_EXIT=1（仅 R4 红）
```

### 3. 核查报告全文（新件未跟踪，按 W1B 教训内联全文）

```markdown
# F-ALIGN-01 组织定版对齐核查报告（含 ds-call v1→v2 切换呈批）

> 票面：tickets/registry.ts F-ALIGN-01 ｜ 裁决依据：《裁决书》裁决 12/13
> （docs/design/2026-09-18_complexity-governance-ruling.md §1）
> 执行：2026-09-18 主控会话（relay batch 9）｜本报告=票面四子任务核查结论
> 与切换呈批材料一体件。

## 1. 钉版事实

- 技能基准（执行时实测）：ai-dev-org **v2.0.1**，技能仓 git HEAD=**2e292bb**
  （`docs(DEPLOY+RESIDUALS): volta run 退出码掩码提升+触发器登记+漂移清偿批订`
  ——SKILL.md 版本行与 git log 双源自证）。
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
| R2a/R2b | golden 字节自比对（档案装载路+派发器 dry-run 路） | PASS（三角色 :=） | align01-regression-zero.log |
| R5 | mock 全链 exhaust 演练 | PASS（exit=2 期 2/attempt 12/switch 2/exhaust 1） | 同上 |
| R7 | 账本 schema 指针唯一指向 02 §9 | PASS | 同上 |
| R8 | log-triage/org-config/deploy-check 自检 | PASS | 同上 |
| R9 | scrub 复制体与源字面量一致 | PASS | 同上 |
| R10 | 传输层/向量/守卫回归面 | PASS（mock glm/ds 双✓/null 守卫 exit=5 等） | 同上 |
| R4 | 流水与账本字段完整性 | 首跑 FAIL（两子域，见下），门一实弹落账后复跑=**§6 终态** | align01-regression-r4-recheck.log |

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

- **末笔实测**：`.zcode/org-ledger.jsonl` 共 25 行；Synapse_remake 面 23 行，
  末笔 `2026-09-09T02:21:05.202Z`（auditor-readonly/kimi-main/ok）——
  距今 9 天断流。ai-dev-org-optimize 面 2 行 campaign-cost 收尾（09-09T03:55Z）。
- **根因**：2026-09-10 组织技能化+2026-09-18 裁决 13 生效后，门一/门二/
  实现者全部走**绑定子代理**（ops-*）——绑定子代理不经外部派发器链，
  而账本写入器（safeAppend ledgerPath）只挂在 ds-call 派发器链上 → 结构性
  零新账笔。log-triage 佐证：窗口内 ops-* 会话岗大量「声明=xxx 实际=窗口内
  无请求记录」WARN（无可核对请求=不经派发器）；⑥岗×源用量子代理行 in/out=0
  （数据源缺失）。
- **非乱码确认**：Synapse 面 23 行 outcome 字段 UTF-8 读取零乱码命中
  （此前 tail 显示乱码行属 ai-dev-org-optimize 面 campaign-cost 行的
  GBK 显示层假象+该行 outcome 本身含中文）。
- **落法**：①恢复派发器账笔=本批门一实弹（§4）已落首笔新 v3 行；
  ②绑定子代理时代的成本记账=**主控补记规则**（F-PROC-01 ⑤ 落法，在途票）；
  ③技能侧绑定子代理写入器接线=技能仓欠账登记（本报告 §7 呈批附带项）。

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
| AGENTS.md ORG-SEG 段 | v1→v2 重写：+钉版行（v2.0.1@2e292bb）+裁决 13 主通道条文+切换状态行（呈批待用户）+预算机检句 | **check-constitution-budget PASS 599/600** |
| AGENTS.md 词汇映射表 | 6 数据行→12：补实现者子代理/Kimi 拟定→drafter/deepseek 审核→auditor-readonly/诊断排查→sre-diagnostic/视觉决策→design-reviewer/成本账本→02 §9 | 人工审 |

AGENTS.md 不在 locks manifest 334 项内（实测），无锁义务。

## 6. R4 终态复跑（门一实弹落账后）

> 本段数字=门一派发完成后复跑实测回填（复跑命令同 §2，--only R4）。

- 复跑结果：**[待门一落账后回填]**——R1~R10 全项绿申报达成与否在此定。
- 流水/账本新行指纹：见批次日志（relay.md batch 9）。

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

## 8. 成本账（本票）

- R1 真跑：6 次真实调用（3 样例×双源），流水 usage 逐行在档
  （技能 scripts/model-routing-log.jsonl，runId 关联）——数字见批次日志。
- 门一实弹：1 次审包派发（kimi-main），流水+账本双落。
- 门二/主控/实现零（文书票，主控直做+绑定子代理）。
```
（§6/§8 两处预留回填段已显式声明「待回填」——非占位残留，门一落账后
当日回填闭环。）

## 四、审查要点（对抗拷问面）

1. 申报数字与证据件是否逐字对上（计数纪律）；
2. R4 两子域「结构性口径问题」定性是否成立（有无掩盖真实缺陷）；
3. 裁决 13 落点是否双处齐全、条文是否走样（对照 §一 原文）；
4. 门一择路理由是否正当（是否违反裁决 13 主通道原则）；
5. 切换呈批「产出即勾项不实施切换」是否与票面「切换后 v1 删除」口径矛盾；
6. 词汇表六组映射有无杜撰（对照 ai-dev-org 岗位表：主控/拟定者 drafter/
   实现者/门一 gate1-reviewer/门二/审核者 auditor-readonly/SRE 诊断岗
   sre-diagnostic/设计岗 design-reviewer）；
7. 报告有无占位/未声明假设（如 §6/§8 预留回填段是否已声明）。
