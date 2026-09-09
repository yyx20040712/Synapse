[routing]: run=20260909000539-q1qy source=kimi-main model=kimi-k3 switches=0 usage=in=2403,out=6695 latency=159834ms (by ds-call.mjs 链)

# AI 软件开发公司组织技能包 v1 架构设计书

身份说明：按任务书指示以组织架构师身份拟定。全文自包含，可直接据此实现。

---

## A 技能命名与定位

**name**：`ai-dev-org`（连字符规范，字母数字）

**description 原文**（仅触发条件，无流程概述，含原 loop-engineering 全部触发词+组织类扩充）：

```
name: ai-dev-org
description: Use when 用户提出开发/实现/修复/重构/批次/战役/开工/简报/工单/派发/审计/收口/交付类请求，或涉及模型路由/额度/换源/供应商/体验套餐决策，或出现组织/岗位/分工/角色卡/部门墙/主控/立案/排程/呈报/成本账本/环境限制欠账等组织协作症状词时加载本技能。
```

（frontmatter 合计约 130 字符，远低于 1024 上限。）

**一句话定位**：跨项目通用的"AI 开发公司"组织操作系统——规定岗位编制、部门墙协议、模型路由与成本纪律，是 loop-engineering 的组织视图+管道视图合并升级件。

**与既有技能分工边界**：

| 技能 | 管什么 | 不管 |
|---|---|---|
| ai-dev-org（本件） | 谁干活、走哪条通道、花多少额度、怎么审计 | 怎么写代码、怎么写技能 |
| subagent-driven-development | 单任务内子代理拆分执行技巧 | 多岗位编制与成本 |
| writing-skills | 技能写作方法论 | 运行时组织纪律 |

禁重叠：本技能正文出现"如何拆任务"只给指针到 subagent-driven-development，不复制其内容。

---

## B 目录结构

```
~/.zcode/skills/ai-dev-org/
├── SKILL.md                        主件：岗位速查+加载地图+红旗清单（约90行/<500词）
├── org-config.default.json         供应商事实默认件（约60行，见E）
├── references/                     按需读取的重参考层
│   ├── 01-org-principles.md        组织16条核心原理（原01改写，约150行）
│   ├── 02-pipeline-templates.md    循环管道+简报/审计包模板全文（原02改写，约200行）
│   ├── 03-machine-enforcement.md   机器强制手段（原03原样搬移+指针修正，约100行）
│   ├── 04-lessons.md               教训库25条+基线失败锚定（原05扩充，约130行）
│   ├── 05-porting-guide.md         移植指南+裁剪矩阵+差异回灌协议（原06改写，约110行）
│   ├── 06-model-routing.md         模型分工调度终态+换源状态机（原07改写，约120行）
│   └── 07-role-cards.md            主控角色卡全文+PM四子模式动作清单（新增，约150行）
└── scripts/
    ├── ds-call-v2.mjs              派发器v2：角色档案化（约400行，见F）
    ├── roles/
    │   ├── registry.json           角色注册表（约50行）
    │   ├── gate1-reviewer.md       门一系统提示+审计包模板+DoD（原硬编码提示档案化）
    │   ├── gate1-reviewer.dod.md   门一DoD细则
    │   ├── drafter.md / drafter.dod.md          拟定者岗
    │   └── auditor-readonly.md / auditor-readonly.dod.md  只读审计岗
    ├── check-constitution-budget.sh 宪法组织段token预算自检（约40行，见D）
    └── org-config-hash.sh          输出org-config规范化sha256前12位（约20行）
```

token 效率依据：SKILL.md 与宪法 stub 是常/高频载件，压在 500 词内；七件 references 每场战役平均只读 2~3 件；脚本不占用上下文。

---

## C 岗位编制终表

| 岗位 | 承载通道 | 模型档位（终态） | 职责 | 禁令 | 交接物 |
|---|---|---|---|---|---|
| 主控（编排者+PM） | 主会话 | 会话宿主模型，不定档 | 唯一用户对接；intake/立案/排程/呈报裁决；账本维护 | 禁直写实现代码；禁跨部门墙喂全文 | 工单、战役简报、呈报包 |
| 拟定者 | 外部派发器 | `roles.drafter`→kimi-main 链（org-config） | 路线/架构拟定 | 零仓库接触，只收自包含任务书 | 设计书 |
| 实现者 | 会话内子代理 | 显式声明意图档位+欠账记账（不可强制，见事实4） | 按六段简报实现 | 禁改锁件/派发模板；禁越简报范围 | diff+自证清单 |
| 门一 | 外部派发器 | `roles.gate1`→kimi-main（org-config） | 对抗式代码审查 | 只喂自包含 diff 包，禁给全仓库 | 审查报告（文件:行号证据制） |
| 门二 | 会话内子代理 | 意图档位+欠账记账 | 终审 DoD 四清单+一 | 禁与实现者同一上下文会话 | 放行/驳回裁决 |
| 审核者 | 外部派发器 | `roles.auditor`→deepseek 兜底档（org-config） | 只读审计、源尽时兜底审 | 禁写；源尽欠账时仅只读审 | 审计意见 |
| 只读排查 | 会话内子代理 | 不定档 | 故障排查取证 | 禁写任何文件 | 排查报告 |

**主控角色卡 PM 子模式动作清单**（references/07 全文，此处为索引级）：

1. **intake 协议**：用户请求→固定五问（目标/范围边界/硬约束/验收标准/时间盒）→缺项即问，不齐不立案。
2. **立案**：生成工单号 `ORG-YYYYMM-NN`；写战役简报（目标/批次/配给预算/DoD）；查成本账本确认额度红线未触。
3. **排程**：批次切分（每批=一次完整 LOOP）；决定各岗走哪条通道；会话内子代理岗在简报首行写意图档位并预留欠账行。
4. **呈报裁决**：汇总 diff+门一报告+门二裁决+账本摘要为呈报包；用户裁决点仅三个（放行/返工/停），主控不得自裁。

**部门墙协议强制形态**：以派发包模板机器强制——门一包=任务书+diff 全文+文件清单，无仓库路径以外信息；拟定者包=自包含任务书（本任务书即实例）；实现者包=六段简报。模板全文在 references/02。

---

## D 三层加载设计

**宪法组织段 stub 全文**（新项目复制进项目根 AGENTS.md）：

```markdown
<!-- ORG-SEG:BEGIN v1 -->
## 组织协作（技能 ai-dev-org 承载，本段仅指针）
- 主控=唯一用户对接岗；需求经 intake 五问立案后才可开工。
- 部门墙：门一只收自包含 diff 包；拟定者零仓库接触；实现者只收六段简报。
- 外部派发走 ds-call-v2 --role；供应商事实以 org-config 为准，正文无硬编码。
- 成本账本每事件必记：源/角色/档位/org-config 哈希；会话内子代理定档
  不可强制，欠账记「环境限制统一档」为强制输出项。
- 细则加载：触发组织类任务时读技能 ai-dev-org，勿凭本段操作。
<!-- ORG-SEG:END -->
```

**token 硬预算**：标记段内正文 ≤600 字符（约 150 词，低于 writing-skills 常载件 200 词线）。

**自检机制具体形态**：

- 工具：`scripts/check-constitution-budget.sh <AGENTS.md路径>`——提取 `ORG-SEG:BEGIN/END` 间字符数，超 600 输出 `FAIL <实际值>` 并以退出码 1 终止。
- 谁在何时：①主控在每场战役**立案动作**时运行（列为立案清单第 0 步）；②写 AGENTS.md 的任何批次收口时复跑。
- 超限行为：主控不得派发，须先裁剪 stub（裁剪只删措辞不删条款）至通过，并将超限事件记账本 `kind=constitution-overrun`。

**单一真相源方向**：stub → 技能（stub 只含指针与铁律一句话，流程细节全在技能；技能 SKILL.md 禁止复述 stub 原文，只写"宪法段为指针，纪律细则以本件 references 为准"）。禁止反向复制，防双源漂移。

---

## E org-config schema

**文件**：`org-config.default.json`（技能默认件）+ 项目覆盖件 `<项目>/.zcode/org-config.json`；优先级=项目件逐字段覆盖默认件（深合并，数组整体替换）。

**字段表**：

| 字段 | 类型 | 含义 |
|---|---|---|
| `version` | string | schema 版本，如 `"1.0.0"` |
| `providers.<alias>.uuid_prefix` | string | 锚定 `~/.zcode/v2/config.json` provider 条目 |
| `providers.<alias>.entry_name` | string | 防错源校验名（kimi-backup 为 `"zipoo"`） |
| `providers.<alias>.billing` | enum | `enterprise / second-quota / payg` |
| `source_chain` | string[] | `["kimi-main","kimi-backup","deepseek"]`（Q5 实证序） |
| `roles.<role>.source` | string | `"chain"` 或固定 alias |
| `roles.<role>.tier_note` | string | 档位说明（文档性） |
| `ration_redlines.<alias>` | object | 配给红线 `{daily_calls, cooldown_min}` |
| `exhaustion_fallback` | string | 固定值 `"readonly-audit-debt"`（源尽回退只读审+欠账） |

**联动**：ds-call-v2 启动时读 org-config→校验 uuid_prefix 与 config.json 条目名一致→`org-config-hash.sh` 产出规范化 JSON 的 sha256 前 12 位（如 `cfg:a3f9c21d04e2`）→该哈希写入 routing log 每事件与成本账本每行，实现"账本可追溯到哪份供应商事实"。

---

## F 派发器 v2 设计

**registry.json schema**：

```json
{
  "registry_version": "1.0.0",
  "roles": {
    "gate1-reviewer": {
      "sys_prompt_file": "roles/gate1-reviewer.md",
      "dod_file": "roles/gate1-reviewer.dod.md",
      "package_template": "self-contained-diff",
      "default_source": "chain",
      "role_version": "1.0.0"
    },
    "drafter": { "...": "同构" },
    "auditor-readonly": { "...": "同构" }
  }
}
```

**CLI**（兼容 v1）：

```
node ds-call-v2.mjs [--role <id>] [--source <alias>]
     [--dry-run|--list-sources|--list-roles]
     <prompt文件> [输出文件]
```

- 带 `--role`：装载注册表系统提示+DoD 尾部拼接。
- 不带 `--role`：走 v1 内嵌门一提示（字节级保留），stderr 打 `[deprecated] 默认角色将于 v2.1 移除`——保证回归可比性，不静默换行为。

**校验摘要机制**：角色文件 sha256 前 8 位为 `role_sig`；routing log 每事件新增字段：`role_id, role_version, role_sig, dispatcher_version:"2.0.0", org_config_hash`。输出文件首行 `[routing]` 头注追加 `role=<id>@<sig> cfg=<hash>`。密钥仍仅内存读取，重试/换源逻辑与 v1 完全一致（429/5xx 退避 3 次换源，4xx 立即换源）。

**前置条件 A：门一链路回归验证清单**（逐项可勾选）：

- [ ] R1 取 Synapse 历史门一任务包 3 件（含 1 件曾判 FAIL 的），v1 与 `v2 --role gate1-reviewer` 各跑一遍
- [ ] R2 比对系统提示字节级一致（`--dry-run` 导出比对）
- [ ] R3 输出判定结论（PASS/FAIL 方向）3/3 一致；措辞差异人工过目不涉结论
- [ ] R4 routing log 新字段五件齐全且 cfg 哈希与 `org-config-hash.sh` 输出一致
- [ ] R5 换源演练：人为置 kimi-main 429，验证链序按 Q5 走完且 exhaust 事件记欠账回退只读审
- [ ] R6 全部通过后，方允许 `--role drafter` 复用拟定者岗

---

## G 迁移计划

**重定向页**（替换 `~/.zcode/skills/loop-engineering/SKILL.md` 全文，references 整体移出，保留一个项目周期）：

```markdown
---
name: loop-engineering
description: 已退役。开发/实现/修复/重构/批次/战役/开工/简报/工单/派发/审计/收口/交付/模型路由/额度/换源/供应商/体验套餐类请求请使用技能 ai-dev-org。
---
# 本技能已退役（v1 归档）
功能由 **ai-dev-org** 整体替代（组织视图+管道视图合并版）。
请勿按本页任何流程操作；历史全文见归档快照
`~/.zcode/skills/_archive/loop-engineering-2025H2/`。
本重定向页保留一个项目周期后删除。
```

description 保留原触发词是为了存量会话仍能命中并跳转。

**归档快照**：`~/.zcode/skills/_archive/loop-engineering-2025H2/`（SKILL.md+references 七件原样+`ARCHIVE-MANIFEST.md` 记归档日期与迁移清单）。

**迁移清单**：

| 旧件 | 处置 | 新去向 | 理由 |
|---|---|---|---|
| SKILL.md 8.6KB | 改写 | 新 SKILL.md | 精简至 500 词内，流程下沉 references |
| README 总览 | 废弃 | — | 与 SKILL.md 职能重复，合并消除 |
| 01 核心原理 16 条 | 改写 | references/01 | 补组织维度 3 条（PM 并入/部门墙/欠账纪律） |
| 02 管道模板全文 | 改写 | references/02 | 模板加 cfg 哈希行与欠账行 |
| 03 机器强制 | 原样搬移 | references/03 | 内容仍成立，仅修文件指针 |
| 04 教训库 25 条 | 扩充 | references/04 | 追加"description 被当捷径"基线实证 |
| 05 移植指南 | 改写 | references/05 | 加差异回灌协议（⑤通道） |
| 06 模型分工终态 | 改写 | references/06 | 供应商事实全部抽出至 org-config |

---

## H Synapse 首适配清单

1. **宪法指针最小改动**：AGENTS.md 三屋段末尾加一行：`- 组织协作段：见下方 ORG-SEG 标记段（技能 ai-dev-org 承载）`，并插入 D 节 stub 全文。无其他改动。
2. **受锁 ds-call.mjs 关系裁决**：技能内 ds-call-v2 与 Synapse 受锁 v1 **并存**；v1 继续服役至 R1~R6 全过；切换=locked-change 流程（工单+门一审查+locks 更新），切换后受锁件替换为 v2 并锁定。未切换期间 Synapse 内禁止混用两版于同一工单。
3. **methodology §4.5 关系**：§4.5 只保留一句指针"岗位分工表以技能 ai-dev-org references/06 为准"，原三件派发模板保留为项目侧实例（引用方向：项目→技能，禁反向）。
4. **回灌通道（⑤落实）**：Synapse 根建 `.zcode/org-delta.jsonl`，每战役收口时主控追加一行 `{date, 工单号, 差异描述, 建议去向}`；技能下一版本发布前由拟定者汇总该文件改写 references/05，账本记 `kind=porting-delta`。

---

## I 验证计划

**基线失败锚定**：references/04 每条教训挂证据链——Synapse 实战事故（门一提示硬编码致拟定者无法复用、会话内子代理误认已定档）与 GREEN 史引用格式 `[Synapse 战役#N 事故 M]`，符合 writing-skills"先见失败再写技能"。

**压力场景复测**：触发时机=新项目按 references/05 完成移植后的首场战役。场景清单：①时间压力下跳过 intake 五问；②门一索要全仓库（部门墙红线）；③源尽时试图直接写代码而非只读审欠账；④stub 超限后试图直接开工。每场记账本 `kind=red-flag-test`。

**v1.0 冻结条件**：Synapse 一个完整 LOOP（intake→立案→实现→门一(v2)→门二→呈报→收口）走通，R1~R6 全过，账本欠账项零遗漏。

---

## J 分期路线

**本窗（拟定期）交付**：stub 全文+自检脚本、SKILL.md、references/01–07、org-config.default.json、registry.json+三角色档案、ds-call-v2.mjs、迁移三件套（重定向页/快照/清单）、Synapse 适配四动作、R1~R6 执行。

**v1.0 冻结后**：回灌首版移植指南（消化 org-delta.jsonl）、图像通道岗接入、v1 默认角色移除（v2.1）、第二适配场试点裁剪矩阵修正。

---

**设计书完。** 待主控终裁后按 J 分期实现。