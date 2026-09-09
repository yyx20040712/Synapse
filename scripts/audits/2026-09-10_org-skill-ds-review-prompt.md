# 审核任务书：对《AI 软件开发公司组织技能包 v1 架构设计书》做对抗审核

> 你是异构对抗审核者（三段通道第二跳：Kimi 拟定→你审核→主控终裁）。
> 纪律：只挑错不改写——发现缺陷给定位+理由+建议修正案，不重新设计。
> 输入两部分：设计任务书（需求与已裁决约束，见下）+ Kimi 设计书全文。
> 审核重点面：①内部一致性（章节间互斥/引用错位）；②可执行性缺口
> （实现者按此落地会卡住或需猜的点）；③与环境事实冲突（技能系统机制/
> 派发器契约/子代理无 model 参数等，见任务书第二节）；④迁移风险
> （loop-engineering 退役三件套与存量引用的断链）；⑤schema 健全性
> （org-config/角色注册表字段遗漏或语义歧义）；⑥分期现实性（本窗交付
> 面与额度/成本现实）。已知需特别核对：归档目录名年份、"R1~R6 全量
> 执行"的成本现实性、深合并语义歧义、宪法 stub 与既有 AGENTS.md 的
> 结构冲突。
> 输出：[B|W|N] 分级逐条发现（B=阻断实施/W=应修/N=提示），每条给
> 设计书章节定位+问题+建议修正案；末尾总评与放行意见。≤2500 字。

================ 设计任务书（输入一） ================

# 设计任务书：AI 软件开发公司组织技能包 v1 架构设计（三段通道第一跳：拟定）

> 性质：路线级架构设计拟定。派发器系统提示为门一审查员身份系现状限制，
> 请以「组织架构师」身份拟定。你的产出=完整设计书，主控（GLM5.3）终裁后
> 按此实现。零仓库接触：本件自包含。
> 输出契约：中文，≤6000 字，全部落到可执行细节（文件路径/字段名/文案
> 原文/表格），不留需要再澄清一轮的占位符。

## 一、已裁决的输入（用户已批准方向，按此设计，不得复议）

- Q1 适用范围=**跨项目通用技能**，放用户全局技能目录（任何项目可加载），
  Synapse 作首个适配场。
- Q2 载体形态=**三层混合**：宪法组织段（常加载，薄）+技能包（按需加载，
  含派发器脚本）+org-config 参数件（供应商事实，技能正文零硬编码）。
- Q3 编制=**PM 职能并入主控**，以主控的角色卡/子模式承载（intake/立案/
  排程/呈报裁决），不设独立 PM 模型岗；主控=唯一用户对接岗。
- Q4 与 loop-engineering 技能关系=**升级替代**（组织视图+管道视图合并
  成一件），旧技能走受控迁移：只读重定向页（保留一个项目周期）+版本
  归档快照+显式迁移清单。
- Q5（事实澄清）Kimi 备源链序=派发器源表实证：kimi-main（K3 企业版
  主源）→kimi-backup（供应商条目名 zipoo，同端点第二配额）→deepseek
  （审计兜底，套餐外按量）→源尽记同源欠账回退只读审。
- 你上轮咨询意见的五条补充已全部转为设计需求：①派发器角色档案注册表
  （角色 ID→系统提示+审计包模板+DoD 细则；改造后先回归门一链路）；
  ②「环境限制统一档」欠账=强制账本输出项；③宪法层厚度=硬性 token
  预算+自检校验；④org-config 版本哈希入成本账本；⑤首适配场差异回灌
  移植指南的明确通道。
- 两条上线前置（你自己提出的，现绑定）：A.角色档案化改造先回归门一
  现有链路再复用拟定者岗；B.旧技能退役=重定向页+归档快照受控迁移。

## 二、环境事实（技能系统与派发器机制——设计必须与之相容）

1. **技能系统**：技能目录=用户全局 `~/.zcode/skills/<name>/`（跨项目）
   或项目内 `.zcode/skills/`。`SKILL.md` 为必选主件，YAML frontmatter
   仅 `name`（字母数字连字符）与 `description` 两必填（合计 ≤1024 字符）。
   description **只能写触发条件**（Use when…+症状+场景词），**禁止概述
   流程**——已实证：流程概述会被代理当作捷径照抄而不读正文。技能可带
   `references/`（重参考，按需读）与 `scripts/`（可执行件，代理经 Bash
   调用）。技能=按需加载；**常加载层**是项目根 `AGENTS.md`（宪法，每
   会话注入）与用户全局 `~/.zcode/AGENTS.md`。
2. **技能写作铁律（writing-skills）**：先见失败（基线实证）再写技能；
   正文 token 效率优先（常载件目标<200 词、其余<500 词量级——重参考
   拆 references）；纪律类内容需合理化对照表+红旗清单防"压力下绕过"。
3. **外部派发器现状（ds-call.mjs，Synapse 受锁件）**：CLI=
   `node ds-call.mjs [--source <alias>] [--dry-run|--list-sources]
   <prompt文件> [输出文件]`；源表三源（见 Q5），uuid 前缀锚定
   `~/.zcode/v2/config.json` 的 provider 条目并校验 name 防错源；anthropic
   /openai 双请求形态；429/5xx 指数退避 3 次换源、400/401/403/404 立即
   换源；事件流水账 `model-routing-log.jsonl`（attempt/ok/switch/exhaust/
   usage 逐事件一行）；输出文件首行附 [routing] 头注；密钥仅内存读取。
   **缺陷（待你改造）**：SYS_PROMPT 硬编码门一审查员身份。
4. **会话内子代理**：Agent 工具**无 model 参数**（实测入册）——会话内
   子代理（实现者/门二/只读排查）无法强制指定机型，只能显式声明意图
   档位+如实记「环境限制统一档」欠账；能真正定档的只有外部派发器链。
5. **loop-engineering 技能现状（被替代件）**：SKILL.md（8.6KB）+
   references/ 七件——README（总览 6.9KB）/01-核心原理 16 条（9.5KB）/
   02-循环管道模板全文（16KB）/03-机器强制（6.6KB）/04-教训库 25 条
   （6.7KB）/05-移植指南裁剪矩阵+首周清单（4.5KB）/06-模型分工调度终态
   （8.1KB）。其 description 触发词：开发/实现/修复/重构/批次/战役/开工/
   简报/工单/派发/审计/收口/交付/模型路由/额度/换源/供应商/体验套餐。
   其角色速查表=六岗位（编排者/实现者/门一/门二/拟定者/审核者）+模型
   路由+配给红线+换源状态机+成本入账纪律。
6. **Synapse 侧现状**：宪法 AGENTS.md 三屋段+methodology §4 派发模板
  三件（实现者简报六段/门一四件输入/门二四清单+一）已固化；受锁件
   ds-call.mjs 与 registry 票制/verify/locks=项目侧 ERP，**不随技能走**。

## 三、请求输出：完整设计书（固定章节 A~J）

- **A 技能命名与定位**：name（连字符规范）+description 原文（触发条件
  口径，覆盖 loop-engineering 原 triggers 并扩充组织类触发词）；一句话
  定位；与 subagent-driven-development/writing-skills 等既有技能的分工
  边界（禁重叠 дубл）。
- **B 目录结构**：完整文件树，每件职责一句话+预计行数；正文/参考/脚本
  三层分配（token 效率依据）。
- **C 岗位编制终表**：岗位×承载通道（主会话/会话内子代理/外部派发器/
  图像通道）×模型档位（终态值，标注哪些落 org-config）×职责×禁令×
  交接物；主控角色卡含 PM 子模式（需求 intake 协议/立案/排程/呈报裁决
  的具体动作清单）；部门墙的协议强制形态逐岗写明（如门一=只喂自包含
  diff 包）。
- **D 三层加载设计**：宪法组织段 stub 模板**全文**（新项目可复制；含
  token 硬预算的量化值与自检机制的具体形态——谁在何时用什么命令校验、
  超限行为）；技能正文与 stub 的单一真相源方向（谁引用谁，防双源）。
- **E org-config schema**：文件格式与字段表（provider 锚/模型档位/源链
  序/配给红线/套餐与额度事实/版本号）；放置位置与优先级（技能默认件
  vs 项目覆盖件）；与派发器/成本账本/版本哈希的联动方式。
- **F 派发器 v2 设计**：角色档案注册表结构（角色 ID→系统提示+包模板
  +DoD 细则，具体 schema）；CLI 形态（兼容 v1 用法+角色装载）；版本号
  与校验摘要机制及入 routing log 的字段；回归门一链路的验证清单
  （前置条件 A 的落实步骤，逐项可勾选）。
- **G 迁移计划**：loop-engineering 退役三件套——重定向页文案原文（保留
  一个项目周期）、归档快照位置、迁移清单表（旧件→新去向逐件列明，
  含 references/01-06 与 README 的处置：原样搬移/改写/废弃+理由）。
- **H Synapse 首适配清单**：宪法指针最小改动（AGENTS.md 一行级）；项目
  受锁 ds-call.mjs 与技能派发器 v2 的关系裁决（何时/是否切换，切换=
  locked-change 流程）；methodology §4.5 与技能分工表的关系（引用方向）；
  回灌通道的具体形态（⑤的落实）。
- **I 验证计划**：本技能的 writing-skills 合规验证——基线失败锚定说明
  （内容已锚定 Synapse 实战事故与 GREEN 史的引用方式）；压力场景复测
  的触发时机（新项目首场战役）与场景清单；v1.0 冻结条件（Synapse 完整
  LOOP 走通）。
- **J 分期路线**：本窗落地件 vs v1.0 冻结后件；每期交付物清单。

## 四、约束提醒

- 技能正文零供应商事实硬编码（全下沉 org-config）。
- 会话内子代理定档不可强制的诚实记账=强制输出项设计。
- 输出≤6000 字；表格优先；引用本任务书章节号而非复述。

================ Kimi 设计书（输入二） ================

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