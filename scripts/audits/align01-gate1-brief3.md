# 门一三审包：F-ALIGN-01（二轮 FAIL B=1 W=3 N=4 处置后终审）

你是对抗式审查员。二轮审报收敛至 B1（R2/R5/R7~R10 无随包证据）+W1~W3
+N1~N4；主控已逐项处置且本轮全部证据**真全文随包**。终审任务：核对处置
闭环。只报告有证据支撑的问题；不确定的明确说不确定。用中文。
末行固定输出机读尾栏：`FINDINGS: B=<数> W=<数> N=<数> VERDICT=PASS 或
PASS_WITH_WARNINGS 或 FAIL`。

## 一、二轮发现处置表

| 发现 | 处置 | 证据（本包） |
| --- | --- | --- |
| B1：R2/R5/R7~R10 五项无随包证据；R7~R10 项目定义不在包内 | ①零成本面全量 log **真全文**随包（§四-1：R2a/R2b/R5/R7/R8/R9/R10 七项 PASS 原文+R4 首跑 FAIL 原文）；②R7~R10 项目定义补说明（§四-2：R7=账本 schema 指针唯一指向 02 §9/R8=三脚本自检/R9=scrub 复制体一致/R10=传输层与守卫回归面——定义单源=regression.mjs，其中 R7~R10 为 selfiter 批（2026-09-17）新增项，晚于 v1.0 六项口径，git 7533c3e 起在册） | §四-1/§四-2 |
| W1：§3 修订原文未随包 | §3 修订后**完整原文段**随包（§四-3） | §四-3 |
| W2：patch「全文」声称与节选不符（表头注改动行缺失/旧行下落不全） | 68 行 patch **真全文逐字**随包（§四-4，含表头注 -/+ 行、词汇表上下文完整六个旧行、ORG-SEG v1 全删行） | §四-4 |
| W3：通道定位与追认叙事张力未论证 | 报告 §7 新增「通道张力说明」段（终稿全文随包 §四-5）：裁决 13 定位=切换后常态位；切换前验证义务只能由候任组件 v2 以真实派发承担；ops-gate1-k1/k2 绑定通道本批可用（batch 2~8 门审全程承载），择 v2 非因绑定不可用——特例使用正是呈裁原因 | §四-5 |
| N1：8ae30d3 与 b76efd7^ 两提交关系不可裁决；六项清单只见三项 | 两提交六项清单段 diff 实测=**逐字一致**（唯一差异=清单段之后的下一标题行，§5.7 系中间插入；§四-6 验证输出）；六项清单**全文**随包 | §四-6 |
| N2：ops-diagnostics 仓外路径不可核验 | 补技能 SKILL.md 原文句（§四-7）：「子代理绑定通道（2026-09-16 起，06 §6 补遗+07 §4 补遗）已挂 ~/.zcode/agents/ops-*.md 绑定子代理」——ops-diagnostics 为该绑定集成员，属用户全局环境事实（仓外=设计而非缺陷） | §四-7 |
| N3：R6 两翼只对接切换翼 | 报告 §2 终稿补：R6 两翼=「drafter 复用与项目侧切换」；本批 **drafter 复用翼未启用**（零 drafter 派发，本批仅用 gate1-reviewer 角色），切换翼=§7 呈批执行（§四-5 随包） | §四-5 |
| N4：预算余量 1 字符 | 承认提示性风险，不改本批（599=终态；ORG-SEG v2 已含机检句自锚——后续任何改本段的票触线即红，制度性防护已在位）。批次日志记注意项 | 本行 |

## 二、R1~R10 终态全绿的证据完整性声明（B1 核）

| 项 | 终态 | 证据形态 |
| --- | --- | --- |
| R1（含原 R3 义） | PASS 双源方向 3/3 | r1.log（首轮包 §四-4 已附 usage 合计；本包 §四-1 SKIP 行=同脚本首跑态） |
| R2a/R2b | PASS | §四-1 零成本面 log 原文 |
| R4 | 首跑 FAIL→终态 PASS | 首跑原文在 §四-1；终态 r4-final.log 原文（二轮包 §四-1，R4FINAL_EXIT=0） |
| R5 | PASS | §四-1 |
| R7/R8/R9/R10 | PASS | §四-1 |
| R6 | 非测试项=门禁 | §7 呈批（两翼说明 §四-5） |

## 三、修订后报告段终稿（本批交付件当前态）

报告文件=docs/reports/2026-09-18_align01-org-audit.md；相对二轮包的增量
=§2 R6 两翼句+§7 通道张力说明段（§四-5 全文）；其余段与二轮包 §三 所载
一致。

## 四、独立证据（真全文）

### 1. 零成本面全量 log（scripts/audits/align01-regression-zero.log 逐字）

```
PASS R2a 档案装载 vs golden 字节比对+MANIFEST 一致 gate1-reviewer:= drafter:= auditor-readonly:=
PASS R2b 派发器 dry-run assembled_system vs golden gate1-reviewer:= drafter:= auditor-readonly:=
PASS R5 exit=2(期2) stderr全源尽=true 事件计数 attempt=12/12 switch=2/2 exhaust=1/1（链长3推导）chain=kimi-main→kimi-backup→deepseek 账本exhaust=true
FAIL R4 流水:尾100行坏0行（含未知事件0）跳0行(旧版本)外来0行(他源channel标记) 事件分布={"attempt":80,"exhaust":7,"switch":13}；cfg哈希一致=false（流水 1a93765499cd vs live cfg:545b6843a147）；账本:尾25行全部为旧版本/外来行（校验域真空——若派发器已升版，先更新本脚本 schema）
PASS R7 账本 schema 指针唯一指向 02 §9 SKILL.md:✓ org-seg.snippet:✓
PASS R8 log-triage:exit=0/全过=true/验收断言=true org-config:exit=0/全过=true deploy-check:exit=0/全过=true
PASS R9 scrub 复制体与源字面量一致=true
PASS R10 b1/b2/b6 回归面——①结构断言:非注释行fetch命中=0 node:http(s)import=✓；③向量:splitEndpoint=全过/classify+ensure=全过；②mock往返:glm=✓(exit=0 正文+流水attempt/ok行)/ds=✓(exit=0)；⑤null守卫(mock发现面):✓(exit=5 降级行+其余源续列)；④B1向量(registry错误面):全过 坏JSON→exit=3(期3)/[fatal]=true；roles:null→exit=3(期3)/[fatal]=true；共享件零触碰=true
SKIP R1 未给 --r1——真实派发配给保护，~9k Kimi tokens；冻结裁决前须跑或显式登记欠账（SKIP 不计入通过数——ds-W6）

regression 汇总：7/8 过，FAIL ×1，SKIP ×1（未跑项不计入通过数）（项=R2a/R2b/R5/R4/R7/R8/R9/R10/R1）
REGZERO_EXIT=1
```

（R1 SKIP 行=零成本面首跑态；R1 真跑独立 log=align01-regression-r1.log，
`PASS R1 双源判定方向一致性 S1-断言弱化:FAIL/FAIL(期FAIL)✓ S2-干净样例:PASS/PASS(期PASS)✓ S3-占位残留:FAIL/FAIL(期FAIL)✓ / R1_EXIT=0`——
与零成本面同日同 --project 参数。）

### 2. R7~R10 项目定义（单源=regression.mjs；selfiter 批 2026-09-17 新增）

- R7=账本 schema 指针唯一指向 02 §9（SKILL.md+org-seg.snippet 零内联）；
- R8=log-triage/org-config/deploy-check 三脚本自检子进程全过；
- R9=scrub 复制体与源字面量一致；
- R10=selfiter B1/B2/B6 回归面（传输层 fetch 禁用断言/端点向量/mock
  往返/null 守卫/registry 错误面）。
在册轨迹=技能 git 7533c3e（v1.5 子代理绑定通道批：golden 冻结副本）起，
至 a0ea31a（修复批）现行——R7~R10 晚于 v1.0 六项口径，属清单扩展非缺位。

### 3. 报告 §3 修订后完整原文段

```
## 3. 账本断流核查（票面④）

- **末笔实测**：`.zcode/org-ledger.jsonl` 原断流态 25 行；Synapse_remake 面
  23 行，末笔 `2026-09-09T02:21:05.202Z`（auditor-readonly/kimi-main/ok）——
  断流 9 天。ai-dev-org-optimize 面 2 行 campaign-cost 收尾（09-09T03:55Z）。
  **本批门一实弹落账后=26 行**（新 ok 行 v3 schema，§6）。
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
```

### 4. AGENTS.md diff 真全文（68 行 patch 逐字，git diff AGENTS.md 原始输出）

```diff
diff --git a/AGENTS.md b/AGENTS.md
index 08ab691289..d31ac5ed28 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -4,7 +4,7 @@
 > 工作法原理层见 `docs/methodology.md`）。
 > CI 会强制其中可机检的条目；不可机检的靠审查。**规则冲突时以本文为准。**
 
-### 词汇映射表（Synapse ↔ ai-dev-org，2026-09-10 doc-align 立）
+### 词汇映射表（Synapse ↔ ai-dev-org，2026-09-10 doc-align 立；2026-09-18 F-ALIGN-01 补全）
 
 > 双向桥，供跨项目会话对照；历史原文零改动（ai-dev-org references/08 §2
 > 词汇差异处理）。置于 ORG-SEG 标记段之外，不占段预算。方向=项目→技能引用。
@@ -14,6 +14,12 @@
 | 主控 | 编排者（主会话，唯一用户对接岗） |
 | 三屋模式 | 双门管道（references/02 §2 基准 12 步） |
 | 门一 / 门二 | gate1-reviewer（隔离一审）/ 二审岗（实证终审） |
+| 实现者子代理 | 实现者（会话内子代理） |
+| Kimi 拟定（设计链首跳） | 拟定者 drafter（--role drafter） |
+| deepseek 审核（双源复审） | 审核者 auditor-readonly（--role auditor-readonly） |
+| 诊断/取证只读排查（ops-diagnostics） | SRE 诊断岗 sre-diagnostic |
+| 视觉决策/设计审（glm-look 外呼） | 设计岗 design-reviewer（07 §4 设计岗卡） |
+| 成本账本（.zcode/org-ledger.jsonl） | 项目账本（行 schema 单源=references/02 §9） |
 | 事故档（`AI辅助开发经验教训.md`） | 教训库（references/04） |
 | 交接书（docs/prompts 下 *-handoff 类，取代制） | 取代制交接（references/02 §7） |
 | 工单/票（五层规约头注） | 任务书（references/02 §4 六段） |
@@ -110,7 +116,9 @@ always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）
 战役报告）。**派发必显式定档**（机型+供应商+思考等级一体写进派发指令；
 单一调用者，缺省=继承主控档=最贵档静默浪费，禁静默继承默认）。模型分工
 走 docs/methodology.md §4.5 终态：实现者=GLM5.3flash（deepseek 实现面
-禁用）/门一=Kimi 链外部派发（零仓库接触）/门二=异构二审/体验额度优先
+禁用）/门一=Kimi 链**绑定子代理主通道**（ops-gate1-k1/k2，$max 显式档位
+——2026-09-18 裁决 13 入宪；外部派发器 ds-call=健康探针+后备通道，
+runbook 择路权保留）/门二=异构二审/体验额度优先
 消费（2026-09-02 用户裁决+同日终态对齐，蓝本=subagent-driven-
 development Model Selection+loop-engineering references/06）；**架构与
 技术路线层面的设计与优化=Kimi 拟定→deepseek 审核→GLM5.3 主控终裁+指挥
@@ -163,17 +171,24 @@ development Model Selection+loop-engineering references/06）；**架构与
 - 闲时视觉决策零承担（遇即挂起）；e2e 非确定红立案线照旧（上方通则）；每会话
   首动作=技能清点（上方开工纪律）。
 
-<!-- ORG-SEG:BEGIN v1 -->
-### 组织协作通用层（技能 ai-dev-org——2026-09-10 起）
+<!-- ORG-SEG:BEGIN v2 -->
+### 组织协作通用层（技能 ai-dev-org——2026-09-10 起；v2=2026-09-18）
 
 - 跨项目组织规范（岗位×模型路由×部门墙×成本账本）=用户全局技能
-  **ai-dev-org**（loop-engineering 升级替代件，旧件已归档重定向）；本宪法
+  **ai-dev-org**（loop-engineering 替代件，旧件已归档）；本宪法
   三屋段为 Synapse 特化实例，冲突时以本宪法为准。
-- 派发新形态：ds-call-v2（--role 角色档案化）随技能发布；本仓受锁
-  ds-call.mjs v1 继续服役至回归 R1~R6 全过后按 [locked-change] 切换，
-  两版禁混用于同一工单。
+- **钉版**（2026-09-18 裁决 12）：技能基准=最新版 git 提交号，现钉
+  v2.0.1@2e292bb；org-config 无版本字段，以提交号+本注为准。
+- **门一主通道=绑定子代理**（ops-*，$max 显式档位——2026-09-18 裁决 13
+  入宪，同技能 06 §6 补遗口径）；外部派发器 ds-call=健康探针+后备通道
+  （runbook 择路权保留）。
+- 派发器切换状态：受锁 ds-call.mjs v1 服役中；v2 切换=R1~R6 回归
+  （已真跑，结果=核查报告）+用户呈批后按 [locked-change] 执行，
+  切换后 v1 删除，两版禁混用于同一工单。
 - 供应商事实唯一真相源=org-config（项目覆盖件 .zcode/org-config.json）；
   组织差异回灌=.zcode/org-delta.jsonl（技能 05 移植指南 §6 协议）。
+- 段预算机检：本段 ≤600 非空白字符
+  （技能 scripts/check-constitution-budget.mjs AGENTS.md）。
 <!-- ORG-SEG:END -->
 
 ### 依赖与提交
```

（词汇表六个旧行下落：主控/三屋/门一门二三行在 hunk 上下文行（空格前缀
=未改），事故档/交接书/工单三行在 hunk 尾上下文——全部未改动，仅插入
六个新行+改表头注一行。）

### 5. 报告 §2 R6 两翼句+§7 通道张力说明段（终稿原文）

```
（§2 R3/R6 去向说明段末句——N3 处置）
…R6 原文两翼=「drafter 复用与项目侧切换」，本批 drafter 复用翼未启用
（零 drafter 派发，本批仅用 gate1-reviewer 角色），切换翼由本报告 §7
呈批执行。故票面「R1~R6 真跑」语义=内化四项（R1'3/R2'/R4'/R5'）全过，
本批达成、无缺位。

（§7 通道张力说明——W3 处置）
**通道张力说明（门一二轮 W3 处置）**：同批宪法将 ds-call 降位为
「健康探针+后备通道」（裁决 13）与本批门一走 v2 实弹并存，非矛盾而是
切换窗口期的固有形态——裁决 13 定位的是**切换落定后的常态位**；切换
前的验证义务（呈批前提）只能由候任组件 v2 以真实派发承担，且
ops-gate1-k1/k2 绑定通道在本客户端可用（batch 2~8 门审全程承载），
本批择 v2 非因绑定不可用，而是验证义务专属外部派发器形态——这正是
追认项呈用户裁决的原因（特例使用而非常态使用）。
```

### 6. 六项清单全文+两提交一致性验证（N1 处置）

```
$ git show 8ae30d3:references/06-model-routing.md | grep -A8 "回归前置"
（=b76efd7^ 同命令输出，六项清单段逐字一致）
- 回归前置（R1~R6 全过方启用 drafter 复用与项目切换；清单内联）：
  - [ ] R1 取首个适配场历史门一任务包 3 件（含 1 件曾判 FAIL），v1 与 v2
        `--role gate1-reviewer` 各跑一遍
  - [ ] R2 v1 内嵌系统提示与角色档案字节级等价（--dry-run 结构化 JSON 的
        sys_prompt 段比对；技能落地时已机检 PASS 96B=96B）
  - [ ] R3 输出判定结论（PASS/FAIL 方向）3/3 一致；措辞差异人工过目不涉结论
  - [ ] R4 routing log 扩展字段齐全且 cfg 哈希与 org-config hash 输出一致
  - [ ] R5 换源演练：mock 注入（--mock-source，全链注入=零成本 exhaust
        演练）验证链序走完且事件互斥落账
  - [ ] R6 全部通过后，方允许 `--role drafter` 复用拟定者岗与项目侧切换
        （locked-change）。
$ diff /tmp/rlist-8ae30d3.txt /tmp/rlist-b76efd7^.txt
9c9
< ## 6. 会话内子代理定档限制与欠账（诚实记账）
---
> ### 5.7 传输层与超时（v2.2.1 补遗，2026-09-16…）
（唯一差异=清单段之后的下一标题行——中间版本插入 §5.7 小节，清单本体
 8 行零改动；二轮包所引 b76efd7^ 与 8ae30d3 在清单内容上同一）
```

### 7. ops-diagnostics 依据（N2 处置——技能 SKILL.md 原文）

```
「**子代理绑定通道（2026-09-16 起，06 §6 补遗+07 §4 补遗）**：文本岗/
异构岗/门一双源已挂 `~/.zcode/agents/ops-*.md` 绑定子代理（frontmatter
model=…）」——ops-diagnostics 为该绑定集成员（用户全局目录=技能设计，
非仓库内容；其岗定义=技能 sre-diagnostic）。
```

## 五、终审要点

1. B1 证据完整性（§二 表+§四-1/2）是否支撑「R1~R10 终态全绿」；
2. W1/W2 核验文本（§四-3/4）是否逐字可验；
3. W3/N3 补论证（§四-5）是否消解张力或仍存疑（存疑则如实呈裁）；
4. N1 一致性验证（§四-6）是否闭环。
