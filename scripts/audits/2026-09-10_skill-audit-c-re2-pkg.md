# C 包回炉轮 2 定点复核（Kimi 终审）

> 只核对下述修订段是否 ADDRESSED+新破坏扫描，≤600 字+放行意见。
> 你（Kimi）首轮：B1 tier 口径/B2 红旗语义/W1 双 schema/W2 计数/W3 门二
> 上下文/W4 SRE 升档/W5 回灌越界/W6 R 清单外置/N1 触发词冗长。
> deepseek 同版：B1' 06 §5 退出码与字段名残留/B2' 设计岗档位与 §6 铁律
> 抵触/W3' 07 §4 模板声称不符/W4' §1 档位列层级/N5' SKILL 编制注。

## 处置与修订文本（逐条）

1. **K-B1**：02-§9 改「外部岗取 roles.*.tier（枚举 prime/audit/debt-readonly——
   fallback 删除）；会话内岗与欠账行按 07 §4 记 session:<描述>，欠账行=
   session:环境限制统一档」。
2. **K-B2**：07 红旗与 SKILL 红旗统一为「给门一的包含**任何仓库访问信息**
   （仓库路径、让审计者自读仓库的要求——门一输入只能是自包含包）」。
3. **K-W1**：06 §5 改「运行流水统一行 schema：ts/runId/event/source/model/
   +扩展字段 role_id/role_version/role_sig/dispatcher_version/org_config_hash
   ——项目账本另用 SKILL.md 派发节 schema，两账各用各的勿混」；SKILL.md
   派发节同步分列两账。
4. **K-W2/ds-N5**：06 §1 表注+07 §1 表题+SKILL 速查表下注——三处统一
   「岗位编制=8；人类用户=裁决位不计入编制」。
5. **K-W3**：门二禁令改「禁与实现者同上下文（=必须独立派发全新子代理
   会话，审计输入=净增量 diff 包+门一报告；禁在同一会话先后兼任实现与终审）」。
6. **K-W4**：SRE 行改「升档承载=结论将直接写入票面/裁决链时，由主控改挂
   外部派发器通道（按 §3 新增档案+org-config 条目）或主控亲验复核；默认
   会话内不定档+欠账记账」。
7. **K-W5**：05 §6 改「主控汇总并终裁改写范围；改写案可交拟定者岗以设计书
   形态拟稿（drafter 只拟不改写），主控终裁后落地」。
8. **K-W6**：06 §5 内联 R1~R6 六条完整清单（含 R2 已机检 PASS 96B=96B 注记）。
9. **ds-B1'**：06 §5 源装载校验改「providers.<alias>.uuid_prefix+entry_name
   双校验，不一致即 exit 3（2 保留给 exhaust，1=用法，4=本地 IO）」，与
   SKILL.md「exit 3 无 fallback」一致；v1 遗留「name」措辞清除。
10. **ds-B2'**：设计岗三处（06 §1/07 §1/07 §4/SKILL 速查）统一改「意图档位
    session:multimodal-exp+欠账记账（体验套餐低档=意图声明，实际路由受
    §6 无 model 参数限制，如实记账；图像通道若宿主可配模型则按其配置入口
    执行）」——不再宣称可执行套餐路由。
11. **ds-W3'**：07 §4 口径注记改「实现者/门二的派发模板不在本件内联——
    锚定 references/02（六段简报/门二实证契约）；SRE 与设计岗模板内联」。
12. **ds-W4'**：07 §1 列名改「档位/tier 记法」，外部岗值改
    roles.<id>.tier=<枚举> 形（配置路径与取值合一书写）。
13. **K-N1**：不修（有意设计：触发词面覆盖优先，匹配精度由宿主语义层
    承担——登记不阻塞）。

===== 佐证文本（修订后实际段落） =====
--- SKILL.md 速查+派发节 ---
## 岗位速查（终表见 references/07）

| 岗位 | 通道 | 档位语义 |
|---|---|---|
| 主控（+PM 子模式） | 主会话 | 会话宿主模型；唯一用户对接岗 |
| 拟定者 drafter | 派发器 `--role drafter` | prime（路线级设计拟定，零仓库接触） |
| 实现者 | 会话内子代理 | 意图档位+欠账记账（定档不可强制，见下） |
| 门一 gate1-reviewer | 派发器 `--role gate1-reviewer` | audit（隔离一审，只喂自包含 diff 包） |
| 门二 | 会话内子代理 | 意图档位+欠账记账（异构优先） |
| 审核者 auditor-readonly | 派发器 `--role auditor-readonly` | debt-readonly（兜底/欠账只读审） |
| SRE 诊断岗 sre-diagnostic | 会话内只读子代理 | 取证/冻结提取/e2e 红 triage；禁写禁臆断 |
| 设计岗 design-reviewer | 会话内图像通道 | 意图档位 session:multimodal-exp+欠账记账；方向级决策留用户 |

（岗位编制=8；人类用户=裁决位不计入编制——同 references/06 §1/07 §1 表注。）

供应商事实（源序/端点/套餐/配给）**一律看 org-config**（默认件+
项目覆盖件 `.zcode/org-config.json`），本件零硬编码。会话内子代理无
model 参数=环境限制：意图档位声明+「环境限制统一档」欠账是**账本强制
输出项**，禁伪装已定档。

## 派发与自检（scripts/）

```
node scripts/ds-call-v2.mjs --role <id> [--source <alias>] [--project <名>]
     [--dry-run|--list-roles|--list-sources] [--mock-source <alias>:<status>]
     <prompt文件> [输出文件]        # --role 必填（v1 内嵌提示已废止）
node scripts/org-config.mjs [resolve|hash|validate|--self-test]
node scripts/skill-gc.mjs [--apply --delete-redirects|--delete-invalid]   # 技能目录盘点/清理（默认干跑；删除先归档可回滚；active 技能去留=用户裁决不机删）
node scripts/check-constitution-budget.mjs <AGENTS.md>   # ORG-SEG ≤600 非空白字符
```

无 `--role` 报错；源装载双校验（uuid+name）不符即 exit 3 无 fallback。
运行流水=scripts/model-routing-log.jsonl（字段口径见 references/06 §5）；
项目账本=.zcode/org-ledger.jsonl（行 schema：ts/project/event/role/tier/
source/cfg_hash/usage?/outcome——tier 记法：外部岗取 org-config 枚举，
会话内岗记 session:<描述>，见 references/07 §4）。
（下述 scripts/ 路径相对**技能根**=本文件所在目录，zcode 加载本技能时附基目录。）

## 加载地图（references/，按需读勿全量）
--- 06 §1 表注+设计岗行+§5 ---
| 设计岗 `design-reviewer` | 会话内图像通道 | 意图档位 `session:multimodal-exp`（体验套餐低档为**意图声明**——实际路由受 §6 无 model 参数限制，落环境限制欠账行；图像分析通道若宿主可配模型则按其配置入口执行并如实记档） | 视觉方向级决策（留用户）；通道缺失臆断 |
> 表注：岗位编制=8 岗（主控/拟定者/实现者/门一/门二/审核者/SRE 诊断/设计）；
> 「人类用户」=裁决位，不计入岗位编制。

## 5. 派发器 v2（角色档案化）与记账

- CLI：`node scripts/ds-call-v2.mjs --role <id> [--source <alias>]
  [--project <名>] [--dry-run|--list-roles|--list-sources]
  [--mock-source <alias>:<status>] <prompt文件> [输出文件]`。
- **无 `--role` 即报错**（v1 内嵌系统提示已废止——硬编码缺陷在 v2.0
  归零）；系统提示+DoD 随 `scripts/roles/registry.json` 装载（路径
  相对技能根）；DoD 拼接进 system 消息末尾，user 消息保持纯任务包。
- 每事件记账字段（**运行流水 model-routing-log.jsonl 统一行 schema**：
  ts/runId/event/source/model/+扩展字段 role_id/role_version/role_sig/
  dispatcher_version/org_config_hash——项目账本 org-ledger.jsonl 的行
  schema 见 SKILL.md 派发节与 02 §9，两账各用各的 schema，勿混）；
  输出首行 `[routing]: run=… role=<id>@<sig> cfg=<hash> …`。
- 源装载校验：org-config `providers.<alias>.uuid_prefix`+`entry_name` 与
  宿主 `~/.zcode/v2/config.json` 条目双校验，不一致即 **exit 3**（配置级；
  2 保留给源尽 exhaust，1=用法，4=本地 IO）并输出 alias/期望/实际三元组，
  无任何 fallback。
- 回归前置（R1~R6 全过方启用 drafter 复用与项目切换；清单内联）：
  - [ ] R1 取首个适配场历史门一任务包 3 件（含 1 件曾判 FAIL），v1 与 v2 `--role gate1-reviewer` 各跑一遍
  - [ ] R2 v1 内嵌系统提示与角色档案字节级等价（--dry-run 结构化 JSON 的 sys_prompt 段比对；技能落地时已机检 PASS 96B=96B）
  - [ ] R3 输出判定结论（PASS/FAIL 方向）3/3 一致；措辞差异人工过目不涉结论
  - [ ] R4 routing log 扩展字段齐全且 cfg 哈希与 org-config hash 输出一致
  - [ ] R5 换源演练：mock 注入（--mock-source，全链注入=零成本 exhaust 演练）验证链序走完且事件互斥落账
  - [ ] R6 全部通过后，方允许 `--role drafter` 复用拟定者岗与项目侧切换（locked-change）。

## 6. 会话内子代理定档限制与欠账（诚实记账）
--- 07 §1 表头+门二行+SRE 行+红旗+§4 注记 ---
## 1. 岗位编制终表（编制=8 岗；「人类用户」=裁决位不计入编制，见 06 §1 表注）

| 岗位 | 通道 | 档位/tier 记法 | 职责 | 禁令 | 交接物 |
| 门二 | 会话内子代理 | 意图档位+欠账记账（异构优先） | 终审实证：逐条裁决+独立复算+亲跑矩阵 | 禁只审不跑；禁预设立场；禁与实现者同上下文（=必须独立派发全新子代理会话，审计输入=净增量 diff 包+门一报告；禁在同一会话先后兼任实现与终审） | 裁决报告（含回炉建议） |
升档承载=结论将直接写入票面/裁决链时，由主控改挂外部派发器通道（按 §3 新增角色档案+org-config 条目）或主控亲验复核；默认会话内不定档+欠账记账） 
### 主控自检红旗

- 用户需求未过五问就开工 / 给门一的包含任何仓库访问信息（仓库路径、
  让审计者自读仓库的要求——门一输入只能是自包含包） /
> 口径注记：`scripts/roles/registry.json` 的唯一消费者是外部派发器——**只有
> 派发器岗入注册表与 org-config roles**。会话内岗（实现者/门二/SRE 诊断/
> 设计岗）的边界写在派发简报身份禁令段；**实现者/门二的派发模板不在本件
> 内联**——锚定 references/02（任务书六段/门二实证契约），SRE 诊断与设计岗
> 的系统提示模板内联于下方卡片，派发时由主控置入简报；账本行 tier 记法=
> `session:<档位描述>`（如 `session:multimodal-exp`、`session:host-tier`）。

--- 02 §9 第2条 ---
- **成本入账（步骤 11）按"模型×供应商×套餐"分列**——额度是一等公民资源，烧在哪必须能指认。
- 关键批次（受锁面/安全/数据批）开工前随步骤 2 配置自查确认主会话在 GLM5.3 档；
  flash 档主会话可编排普通批。

### 8.4 体验套餐优先（2026-09 补充）

- **开工盘点**：步骤 2 配置自查一并盘点套餐池——正式套餐（GLM 最高档/Kimi
--- 05 §6 第2条 ---
- 技能下一版本发布前由**主控**汇总该文件并终裁改写范围；改写案可交
  拟定者岗以设计书形态拟稿（drafter 只拟不改写——职责边界照 07 §1），
  主控终裁后落地；账本记 `event=porting-delta`。
- **必记触发线**：①环境差异（派发器可用性/端点形态/源序变化）；
