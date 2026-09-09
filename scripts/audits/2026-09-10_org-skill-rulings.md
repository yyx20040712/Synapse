# 主控终裁档：ai-dev-org 设计书审核发现处置（2026-09-10）

> 输入=Kimi 设计书（2026-09-10_org-skill-kimi-design-out.md）+ deepseek 对抗审核
> （2026-09-10_org-skill-ds-review-out.md，5B/5W/3N）。逐条裁决如下，实现即按本档执行。

## B 级（全部 ACCEPT）

- **B1 编号错位**：采纳修正——以 G 章迁移表为唯一基准（旧 01~06→新 01~06
  一一对应+新 07；旧 README 废弃）；目录树注释删「原XX」标注。
- **B2 深合并/规范化哈希未闭合**：采纳修正——对象字段递归按覆盖件逐字段
  替换，未提及字段沿用默认件；数组整体替换；显式 null=删除。哈希规范化
  =递归键排序+剔除 null+紧凑 stringify（无多余空白），随 org-config.mjs
  提供自测向量（--self-test）。
- **B3 registry 路径基准**：采纳修正——注册表内相对路径一律相对技能根
  `~/.zcode/skills/ai-dev-org/`，字段值写全 `scripts/roles/<file>`。
- **B4 R2 与 DoD 拼接矛盾**：采纳修正——DoD 拼接进 system 消息末尾
  （system = sys_prompt + "\n\n" + dod，user 消息保持纯任务包）；--dry-run
  输出结构化 JSON（sys_prompt / dod / assembled_system / request 摘要）；
  R2 判据=sys_prompt 段与 v1 内嵌提示字节级一致。
- **B5 账本无 schema**：采纳修正——org-config 增 `ledger_path` 字段，
  默认 `<项目>/.zcode/org-ledger.jsonl`（项目本地自包含，随项目走；是否
  入库由各项目宪法定）；行 schema={ts,project,event,role,tier,source,
  cfg_hash,usage?,outcome}；v2 派发器自动追加 ok/switch/exhaust 事件，
  人工动作类由主控补记。

## W 级（全部 ACCEPT，两处强化）

- **W1 角色 ID 不一致**：统一为 `auditor-readonly`（C 章显示名「审核者」
  注明映射）。
- **W2 档位无机读字段**：增 `roles.<role>.tier` enum
  （prime/fallback/audit/debt-readonly），派发器与账本读写；tier_note 降为注释。
- **W3 R1~R6 排期**：采纳剥离——R1~R6 全量执行独立成验证窗（v1.0 冻结前），
  执行主体=主控（有仓库读权）；ds-call-v2 增 `--mock-source <alias>:<status>`
  故障注入开关（不触真实 API 返回该状态码）；本窗只做 R2 字节比对（离线
  零成本）+冒烟派发一件（验 R4 字段齐全）+mock 换源演练一件（验 R5 链序
  与 switch 事件记账）；R6（drafter 岗启用）留验证窗。
- **W4 v2.0 保留硬编码默认**：强化采纳——v2 无 `--role` 即报错退出（提示
  `--list-roles`），**不内嵌任何系统提示**；v1 硬编码缺陷在 v2.0 即归零
  （Synapse v1 受锁件独立服役，无回归风险）。
- **W5 交叉校验失败行为**：采纳——uuid/name 校验不一致即 exit 2 并输出
  alias/期望/实际三元组，无任何 fallback。

## N 级（全部 ACCEPT）

- **N1 年份**：归档目录=`_archive/loop-engineering-archive-2026-09/`；
  重定向页 description 落库前 wc 实测 <1024 字符。
- **N2 断链普查**：归档内附 REDIRECTS.tsv；迁移后全局 grep
  `loop-engineering/references` 修复存量引用。
- **N3 防双组织段**：Synapse 不整插通用 stub——三屋段末尾加指针行+微型
  ORG-SEG 标记块（≤600 字符，仅指针与铁律，不复述三屋细则；项目宪法与
  技能冲突时以项目宪法为准——宪法既有条款不变）。

## 主控追加裁决（设计书之外）

- **脚本语言**：自检/哈希脚本以 node .mjs 实现（非 .sh）——Windows 下
  bash+JSON 处理脆弱，node 保证规范化算法确定性。
- **Synapse v54 交接书**：本组织技能窗为用户指令在场插入项，v54 文末补
  记一行，防下一会话对 AGENTS.md 中途变更困惑。
