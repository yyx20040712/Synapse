[routing]: run=20260909000912-hju4 source=deepseek model=deepseek-v4-flash switches=0 usage=in=7171,out=17168 latency=154739ms (by ds-call.mjs 链)

# 对抗审核报告：ai-dev-org 架构设计书（门一）

## B 级（阻断实施，须先修正）

**B1｜章节 B 与任务书/G 章的旧件编号引用错位，实现者无法映射素材**
- 定位：B 章 references/ 文件树注释；对照任务书事实 5、G 章迁移表。
- 问题：任务书事实 5 明确旧 references=README + 01~06 共七件；但 B 章将 `04-lessons` 注为“原05扩充”、`05-porting-guide` 注为“原06改写”、`06-model-routing` 注为“原07改写”。“原07”在旧件中不存在；同时 G 章迁移表正确按旧 01→新 ref/01、旧 04→新 ref/04 排列。B、G 两章对同一素材的编号标注互斥，实现者将不确定旧 04（教训库）与旧 05（移植指南）各自落到哪个新文件。
- 修正案：以 G 章迁移表为唯一基准，删去 B 章每行括号中的“原XX改写/扩充”标注，或改为不标旧编号，仅写职责。

**B2｜org-config「深合并」语义与「规范化哈希」算法均未闭合**
- 定位：E 章“深合并，数组整体替换”；`org-config-hash.sh`“规范化 JSON”。
- 问题：只声明“数组整体替换”，未定义对象级规则：项目覆盖件省略某字段时默认件保留还是清空？项目件想删除 providers 下某 alias 如何表达？null 语义？更不能实现 `org-config-hash.sh`——`sha256(规范化JSON)` 的前提是“规范化”有确定算法（键排序? 空白? null 剔除? escape?）。否则同一 org-config 因键序/空白不同会产生不同哈希，E/F 章“账本可追溯”承诺落空。
- 修正案：补一句“对象字段递归按覆盖件替换，未提及字段沿用默认件；数组整体替换；显式 null 视为删除；哈希前做递归键排序、去 null、无多余空白的规范化，输出测试向量”。

**B3｜角色注册表文件路径基准未定义，装载器会找不到文件**
- 定位：F 章 registry.json schema：`"sys_prompt_file": "roles/gate1-reviewer.md"`；对照 B 章文件树，registry.json 位于 `scripts/roles/registry.json`，角色文件位于 `scripts/roles/gate1-reviewer.md`。
- 问题：若基准目录记为 registry.json 所在目录（通常实现惯例），实际文件名应是不带 `roles/` 前缀的 `gate1-reviewer.md`；若基准是技能根 `~/.zcode/skills/ai-dev-org/`，则应为 `scripts/roles/gate1-reviewer.md`。设计书均未声明。按字面路径装载必然 File Not Found。
- 修正案：在 F 章注明“registry 内相对路径一律相对技能根 `~/.zcode/skills/ai-dev-org/`”，并将字段改为 `scripts/roles/gate1-reviewer.md`。

**B4｜R2 回归判据与“DoD 尾部拼接”设计自相矛盾**
- 定位：F 章“CLI”与“回归清单 R2”。
- 问题：R2 要求“比对系统提示字节级一致（`--dry-run` 导出比对）”，但同一设计写明 `--role gate1-reviewer` 会“装载注册表系统提示+DoD 尾部拼接”。若比较对象是“最终发给模型的消息”，v1 与 v2 永远不一致（v2 多了 DoD 拼接段）；若只比较“系统提示前半段”，设计书未定义 dry-run 输出如何切分 sys_prompt 与 DoD 拼接段。回归步骤在此必然卡住。
- 修正案：明确 `--dry-run` 输出为结构化 JSON（`sys_prompt`、`dod`、`assembled` 三分段），R2 改为只比 `sys_prompt` 段字节一致，并另立一项校验“DoD 拼接位置与 v1 审计包输入项等价”。

**B5｜“成本账本”只以铁律方式出现，无文件路径、无行 schema**
- 定位：D 章 stub“成本账本每事件必记：源/角色/档位/org-config 哈希”；C 章主控职责“账本维护”；F/E 均只定义 hash 入账。
- 问题：新项目按 D 章复制 stub 后，会计主控没有账本文件路径、字段格式、轮转策略可依；org-config 也没有 `ledger_path` 字段。实现者只能自创账本结构，各项目间账本形态必然发散，违反“强制账本输出项/可追溯”目标。
- 修正案：org-config 增补 `ledger_path`（默认如 `~/.zcode/ledger/<project>.jsonl`），并给一行 JSON Lines schema：`{ts, project, event, role, tier, source, cfg_hash, usage?, outcome}`；v2 派发器成功/失败/exhaust 事件自动追加，主控只补人工动作类事件。

## W 级（应修）

**W1｜模型档位列“roles.auditor”与注册表/档案实际 ID“auditor-readonly”不一致**
- 定位：C 章岗位表“审核者”档位列；F 章 registry 与 B 章 `scripts/roles/` 文件。
- 问题：C 章写 `roles.auditor→deepseek 兜底档`，但 registry 与目录中角色 ID 为 `auditor-readonly`。按 C 章实现会在 registry 查无此角色；按注册表实现则 C 章档位列是死链。
- 修正案：统一为 `auditor-readonly`；或 C 章明确“审核者=auditor-readonly 的显示名”。

**W2｜`roles.<role>.tier_note` 标注“文档性”，模型档位无可机读字段**
- 定位：C 章“模型档位（终态值）”：E 章字段表 `tier_note` 注明文档性。
- 问题：任务书要求档位终态值落 org-config 且供派发器/账本消费；当前 schema 中派发器只消费 `source`/`source_chain`，档位是给人看的串。账本若记档位，记什么值没有枚举来源。
- 修正案：增加 `roles.<role>.tier` enum（如 `prime / fallback / audit / debt-readonly`），派发器与账本均读写该字段，`tier_note` 仅作注释。

**W3｜R1/R5/R6 执行主体、仓库访问与故障注入手段未定义**
- 定位：F 章回归清单；J 章“本窗交付=含 R1~R6 执行”。
- 问题：拟定者“零仓库接触”前提下，R1 取 Synapse 历史门一任务包 3 件由谁执行？R5“人为置 kimi-main 429”在真实源表上无法无副作用模拟，需代理桩/测试开关，设计书未给；J 章把组件实现+七份 references+迁移+R1~R6 全部塞入本窗，额度与排期张力未交代。
- 修正案：明确执行主体（主控或门一回归专员）及其仓库读取授权；在 ds-call-v2 加 `--mock-source <alias>:429` 故障注入开关；R1~R6 建议拆到 v1.0 冻结前独立窗口，不并入本窗交付面。

**W4｜v2.0 仍保留 v1 内嵌硬编码门一提示作默认路径**
- 定位：F 章“不带 `--role`：走 v1 内嵌门一提示（字节级保留）”。
- 问题：任务书将“SYS_PROMPT 硬编码门一审查员身份”列为待改造缺陷；v2 默认路径原样保留该硬编码，等于硬编码缺陷在 v2.0 仍活跃，只是新增了逃生门，直到 v2.1 才移除。若 v2.0 服役周期长，缺陷滞留时间长。
- 修正案：v2.0 默认路径改为“无 `--role` 即报错并提示 `--role`”，或至少启动时 stderr 打印红色弃用警告并建议迁移；将“默认角色移除”提前到 v2.0 内完成。

**W5｜org-config 与 config.json 交叉校验的失败行为未定义**
- 定位：F 章“校验 uuid_prefix 与 config.json 条目名一致”。
- 问题：若不一致或条目缺失，是 fail-fast 还是跳过该源继续？未定义将造成静默换源或静默绕过错源保护。
- 修正案：明确“不一致即 exit 2 并输出具体 alias/期望 pfx/实际 config 内容”，不做任何 fallback。

## N 级（提示）

**N1｜归档目录年份“2025H2”与时间基线不符**
- 定位：G 章归档路径。
- 问题：任务书 routing 头时间戳 `run=20260909…` 指向 2026 年；归档名 `loop-engineering-2025H2` 既不是当前年份也不是任何已声明版本标签，易被误读为“归档 2025 年 H2 版”。不确定是否存在未言明的 H2 版本语义，请确认；若否应改为 `loop-engineering-archive-<归档日期>`。另：重定向页 description 叠加“已退役”语句后可能逼近 1024 字符上限，落库前需实测。

**N2｜迁移后旧 references 外部链接断链无普查**
- 定位：G 章迁移清单。
- 问题：旧 `references/` 作为目录已不存在，若任一处（AGENTS.md、旧工单、项目 notes）直接引用了旧绝对路径，迁移即断链。设计书未含存量引用普查动作。
- 修正案：归档快照内附 `REDIRECTS.tsv`（旧路径→新路径或“废弃”），并加一步“迁移后全局 grep `loop-engineering/references` 断链修复”。

**N3｜宪法 stub 插入既有 Synapse AGENTS.md 前需防重复组织段**
- 定位：H 章“三屋段末尾加一行+插入 stub 全文”。
- 问题：若 Synapse AGENTS.md 三屋段内已含“组织协作/岗位分工”内容，插入后将出现双组织段。因零仓库接触无法核实，需在适配动作中显式加人工预检步骤，确认无同类段落再插入。

## 总评与放行意见

架构方向与任务书裁决一致度高：三层加载、角色档案化、诚实记账、迁移三件套与回灌通道均有落实。但**材料映射（B1）、配置语义（B2）、运行路径（B3/B5）和回归判据（B4）存在根因级定义缺口**，直接落地会出现“找不到文件”“哈希对不上”“回归必失败”等硬卡点；W 类问题则影响账本可信度与 v2 实际去硬编码程度。

**放行意见：有条件放行。** 建议先完成 B1~B5 五处修订（预计 1~2 轮微修）再进入 J 章本窗实现；R1~R6 建议从本窗交付面剥离为独立验证窗，并按 W3 补齐执行主体与故障注入手段后执行。