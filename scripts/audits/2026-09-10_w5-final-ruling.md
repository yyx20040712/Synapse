# W5 全局三源审计·GLM 主控终裁档（2026-09-10 纪元；机器时钟 09-09）

> 初审=六派发（Kimi gate1-reviewer×3 + deepseek auditor-readonly×3，
> 档=同目录 2026-09-10_w5-{a,b,c}-{kimi,ds}-out.md，全 exit=0 零换源）；
> 本档=终裁合并+回炉轮 1 处置+复审呈报。三源=kimi+ds+glm（本档）。

## 一、初审结论汇总

| 区 | Kimi | deepseek |
|---|---|---|
| A'（代码） | 不放行（B×4/W×9/N×3+核验过 8 项） | 有条件放行（W×7/N×5） |
| B'（文档） | 不放行（B×1/W×5/N×2） | 不放行（B×1/W×5/N×2） |
| C'（处置） | 不放行（B×1/W×5/N×2） | 暂缓放行（B×2/W×3/N×2） |

## 二、终裁逐条处置（双源合并去重）

### A' 区

| 编号（源） | 终裁 | 处置 |
|---|---|---|
| A-K-B1=A-ds-W4（R4 版本漂移自我掩蔽） | CONFIRMED（双源同指） | FIXED：版本真值从 ds-call-v2.mjs 源码提取（regex，非复制常量）+「全部行被跳过=校验域真空」显式 FAIL 双保险 |
| A-K-B2（同源批数≥3 判据未实现名实不符） | CONFIRMED | FIXED：RED=窗口全同源∧ok≥3∧跨≥3 日期批；仅同日多次降 INFO |
| A-K-B3=A-ds-N2（欠账跨项目合并假阴/project 无规范化） | CONFIRMED | FIXED：无 project 行排除出欠账判定+WARN；同名精确匹配约束文档化（不做 basename 归一防过度合并） |
| A-K-B4=A-ds-W1（TTY readline 不 close 挂起） | CONFIRMED（双源同指，语义确定） | FIXED：rl.close()。注记=代码语义修复，交互终端实测缺位（本环境无 TTY）——如实登记 |
| A-ds-W2（覆盖安全声明矛盾：.gitignore 追加无确认） | CONFIRMED | FIXED：头注改「须确认的修改仅一处=ORG-SEG 追加；.gitignore 幂等片段（含标记即跳过）不须确认」——声明与实现对齐 |
| A-ds-W3（骨架预算 FAIL 不回滚） | CONFIRMED | FIXED：unlinkSync 回滚（与追加路径行为一致） |
| A-ds-W5（R4 未知 event 弱校验） | CONFIRMED | FIXED：未知事件=坏行（schema 未登记即红） |
| A-ds-W6（R1 SKIP 计入通过） | CONFIRMED | FIXED：SKIP 三态单列，汇总「SKIP ×N（未跑项不计入通过数）」 |
| A-ds-W7（ok 缺 usage 静默） | CONFIRMED | FIXED：health-scan ②b WARN |
| A-K-W1=A-ds-N1（同源判据可被小批多样性绕过） | CONFIRMED（前兆级） | FIXED：主源占比>80% 且 ok≥5 → WARN（绕过形态告警） |
| A-K-W2（MANIFEST 哈希从不校验） | CONFIRMED | FIXED：R2a 顺带校验 MANIFEST 行含副本 sha256 |
| A-K-W3（解析失败静默无内容） | CONFIRMED | FIXED：坏行带行号+前 80 字符，exit 3 |
| A-K-W4（R5 过拟合+runId 锚定+流水污染） | 部分采纳 | FIXED 前两项：期望计数按 org-config 链长推导（4×链长/链长-1/1）；runId 锚定=新增行中 exhaust 事件的 runId。流水演练行=WON'T-FIX（追加式运行记录禁清洗，登记 RESIDUALS/W5-A-W4，行内 mocked 字段可甄别） |
| A-K-W5 前半（org-seg 327/600 余量紧） | WON'T-FIX | 模板段=基线非终态；项目宪法主体在 ORG-SEG 段之外，覆盖余量 273=项目侧注记空间（Synapse 实例 340/600 共存证明可行）。登记 |
| A-K-W5 后半（两路径回滚不一致） | CONFIRMED | FIXED（并入 A-ds-W3） |
| A-K-W6（CRLF 敏感） | CONFIRMED | FIXED：技能根新增 .gitattributes（* text=auto eol=lf）——防 golden 假红；**不做读侧归一化**（归一化会掩盖真漂移，R2 红=正确报警） |
| A-K-W7（--window 无校验） | CONFIRMED | FIXED：非正整数 exit 3 |
| A-K-W8（R1 退出码头注不符+R2b 裸 JSON.parse） | CONFIRMED | FIXED：R2b parse 包 try（非 JSON=FAIL）；头注口径对齐 |
| A-K-W9（verify 宽松=假门禁风险） | 部分采纳 | FIXED：模板头注加粗「宽松模式不是门禁」+CI 模板 STRICT=1（原有） |
| A-ds-N4（--target 技能根防呆） | 采纳 | FIXED：dir===SKILL_ROOT → exit 3 |
| A-ds-N5+A-K-N（dry-run 计划数混 SKIP/死导入/幂等重跑标记） | 采纳 | FIXED：dry-run 汇总分列计划/跳过；死导入清理（注：清理过程曾误删在用 dirname，冒烟即红即修——修复者自证有效） |

### B' 区

| 编号（源） | 终裁 | 处置 |
|---|---|---|
| B-K-B1=B-ds-B1（烤验触发表漏类） | CONFIRMED（双源同域互补） | FIXED：增「纯配置变更批=按已审面修改处理（auditor-readonly 复核）」+「收口/交付批=烤验证据随呈报包复核」两行+复合批并集注记 |
| B-K-W1=B-ds-W2（假设拷问不可机检） | CONFIRMED | FIXED：02 §10 机检锚——派发包 assumptions: 清单节（空≠无）+报告假设拷问节逐条 verdict+主控收口结构核对；**如实注记边界**：结构级机检，内容质量仍人工对抗位 |
| B-K-W2=B-ds-W3（API 无生成器死条款） | CONFIRMED | FIXED：09 §1 补降级路径（docstring+指针清单+CI 人工核对/用户裁决不做明细） |
| B-K-W4=B-ds-W4（PM/tech-writer 职权重叠） | CONFIRMED | FIXED：09 §4 输出物级分工（PM=五问裁决入台账；tech-writer=文稿走轻量双审） |
| B-K-W5=B-ds-W5（08 生成物真相源表述） | CONFIRMED | FIXED：08 行改「代码注解+生成命令（生成物=可重建快照非独立真相源）」 |
| B-K-W6=B-ds-W6（SKILL/02 缺修订记） | CONFIRMED | FIXED：SKILL 尾修订记节（v1.1）+09 修订记 v1.1+02 §10 内联批次注记（假设位条款「W5 审双源同款意见」） |
| B-K-N1/B-ds-N7（团队化未偷跑） | 核验通过 | 无需处置 |
| B-K-N2/B-ds-N8（供应商数字红线） | 核验通过 | 无需处置 |
| B-ds-N7 后半（07 编制计数同步提醒） | 采纳登记 | RESIDUALS 外注记：后续新增子模式须同步 07 §1 编制表（本轮 tech-writer=子模式不增编制，已核 09 §4 表述一致） |

### C' 区

| 编号（源） | 终裁 | 处置 |
|---|---|---|
| C-K-B1（提交时间链矛盾=事后回填疑） | **REJECTED（事实澄清）** | 纪元错位非回填：机器时钟=2026-09-09（系统日期/git ts/流水 ts 同源），战役纪元=上游交接书落款 2026-09-10（其标题即「2026-09-10 起草」，上游全部档案 2026-09-10_ 前缀而其提交亦在机器 09-09 时段——上游即如此落款，本会话沿用）。过程自证：五提交 10:44~11:01 本地与六派发流水 ts（本地 10:0x~11:1x）吻合；R1'3 后台跑期间并行 W3=流水与提交交织可证。冻结证据包已补「纪元澄清」节（不改历史件） |
| C-K-W1=C-ds-B1（残留快照不在包/等价缺原件） | CONFIRMED（包裁剪所致） | FIXED：RESIDUALS 增「残留快照对账表」（§1.3 四条→编号逐一对应+战役新发现 2 条=零静默消失）；等价矩阵=本档 §三 |
| C-ds-B2=C-K-W3（regression 自修无 diff 无独立复审） | 部分 REJECTED+部分 FIXED | 「未受审」不成立（分区盲区）：regression.mjs 174L 全量在 A' 包已受双源审（A-K-B1 引用了其行号即证）。回炉实录：红版 FAIL 输出（R5 账本exhaust=false/R4 坏 1 行=旧版 switch 行缺 from/to/statusCode）与修复点（cwd:tmp/dispatcher_version 过滤）已在 freeze-evidence §二.3 在档；红版文件未留存（存活 20 分钟未提交）——如实注记。本轮修复版随回炉复审包重审=闭环 |
| C-K-W2（won't-fix 终裁无档指针+主体不明） | CONFIRMED | FIXED：RESIDUALS 补档路径（skill-audit-*-out.md 系列+交接书 §1 快照）+裁决主体注记（上游战役用户认受，非本轮自裁） |
| C-K-W4=C-ds-W3（Node25 定性超证据） | CONFIRMED | FIXED：裸 fetch 对照实验（本档 §四）——单请求 Node25 不崩；定性改「或然并存」（Node25 libuv 敏感性×ds-call-v2 路径形态组合）；RESIDUALS/HOST-node25 转态 won't-fix+重开条件（Node24 同崩即升级排查） |
| C-K-W5（R5 mock 弱化原件疑） | REJECTED | 06 §5 R5 原文即「mock 注入（--mock-source，全链注入=零成本 exhaust 演练）」——R5'与原件同形态+计数强化，无弱化（见 §三矩阵） |
| C-ds-W5（HOST-node25 状态矛盾+缓解未入库） | CONFIRMED | FIXED：转 won't-fix（三态纯度）；缓解注记入 SKILL.md 派发节（Node 24 派发——环境事实非供应商数字，不违红线） |
| C-K-N1（三态纯度） | CONFIRMED | FIXED（并入上两条） |
| C-ds-N2（v1.1 演进代拟疑） | REJECTED | 交接书 W5 明文「放行后 v1.1 版本号+修订史」——用户开工指令=按交接书开工，授权链在档；v1.0 冻结本身仍留用户（不连带） |
| C-K-N2（stat/golden/裁决位核验通过） | 核验通过 | 无需处置 |

### 放行线核对（交接书 W5：B 级零残留；W 级修或登记）

- B 级：初审合计 B×9（双源去重后实质 6 项）→ 5 FIXED+1 REJECTED（C-K-B1 纪元澄清）→ **B 零残留** ✓
- W 级：全数 FIXED 或 WON'T-FIX 登记（RESIDUALS/登记位）✓

## 三、R1~R6 等价矩阵（06 §5 原文摘录→内化形态→覆盖/豁免）

| 原件（06 §5 逐字摘录） | 内化形态 | 等价判定 |
|---|---|---|
| R1 「取首个适配场历史门一任务包 3 件（含 1 件曾判 FAIL），v1 与 v2 `--role gate1-reviewer` 各跑一遍」 | R1'3：3 锚定样例（2 预期 FAIL+1 预期 PASS）×双源（kimi-main/deepseek）真实派发 | **形态迁移**：v1 已废止（对照前提消失）——对照轴从「v1 vs v2 实现等价」迁移为「双源语义正确性」；「含 1 件曾判 FAIL」语义由预期 FAIL 锚定样例承接。迁移理由与认受=用户冻结裁决位呈报项 |
| R2 「v1 内嵌系统提示与角色档案字节级等价（--dry-run 结构化 JSON 的 sys_prompt 段比对；技能落地时已机检 PASS 96B=96B）」 | R2'：golden 冻结副本字节自比对（双路：档案装载+派发器 dry-run 真实装载） | **强化**：前件（96B=96B）在档；一次性比对→持续机检（防静默漂移） |
| R3 「输出判定结论（PASS/FAIL 方向）3/3 一致；措辞差异人工过目不涉结论」 | R1'3 内含：双源判定方向 3/3 一致+锚定预期符合 | **强化**（增预期锚） |
| R4 「routing log 扩展字段齐全且 cfg 哈希与 org-config hash 输出一致」 | R4'：流水+账本双 schema 逐字段+cfg 哈希 live 比对（回炉轮 1 补齐第二要素） | **等价+扩展**（+账本侧） |
| R5 「mock 注入（--mock-source，全链注入=零成本 exhaust 演练）验证链序走完且事件互斥落账」 | R5'：全链 mock 注入+exit 2+链序（chain 字段）+事件计数互斥校验+演练账本 exhaust 行 | **等价+强化**（计数断言） |
| R6 「全部通过后，方允许 --role drafter 复用拟定者岗与项目侧切换（locked-change）」 | 条件达成（R2'/R4'/R5' 全过+R1'3 PASS）→冻结呈报留用户 | **等价**（解锁条款非测试项；裁决留用户） |

## 四、Node25 对照实验（回炉轮 1，Kimi-W4/ds-W3 处置证据）

- 实验：裸 fetch（不经 ds-call-v2）对 Kimi 端点单次真调后进程退出。
- 结果：Node 25.2.1 exit=0（FETCH-OK+正常退出）；Node 24.20.0 exit=0。
- 结论：崩溃需 ds-call-v2 路径特定形态（长响应/重试循环）×Node 25
  libuv 敏感性组合——「纯环境缺陷」与「代码触发面」不可分，定性
  或然并存（RESIDUALS/HOST-node25 won't-fix+重开条件）。
- 成本：2 次微额真调（~16+8 tokens out）。

## 五、回炉轮 1 修复面与复审派发

- 修复文件：scripts/init-defenses.mjs（6 处）/regression.mjs（7 处）/
  health-scan.mjs（6 处）/templates/verify.mjs（头注）/.gitattributes
  （新增）/SKILL.md（烤验表增行+Node24 注记+修订记）/references/02
  （机检锚）/08（行改）/09（降级路径+分工+修订记）/RESIDUALS.md
  （档指针+转态+对账表）。
- 修复后机验：regression 4/4（含 cfg 哈希一致=true）/init-defenses
  冒烟 7/7+防呆 exit3/health-scan 绿 RED×0 红（构造账本三 RED）/
  window 校验 exit3。
- 复审=定点包（修复 diff+ADDRESSED 表+等价矩阵+澄清），Kimi+ds
  各三区六派发（同角色同源形态）——放行线=B 零残留维持+W 级处置
  认可；复审通过后 v1.1 收口。

## 六、复审（轮 1 六派发，11:33~11:41）与终轮（三派发，11:45~11:49）

复审轮 1 结论：A'-ds **放行**（19/19 VERIFIED，W=cfg 守卫）；B'-ds
**可放行**（N2）；A'-Kimi 不放行（17/20，三点收尾）；B'-Kimi 暂缓
（登记/指针/纯追加）；C'-Kimi 有条件（三件证据入包）；C'-ds 不予
放行（证据入包+R1 待裁）。→ 终轮（轮 2）修复+证据呈阅包三派发
（A'-Kimi/B'-Kimi/C'-ds 各一，同角色同源）。

终轮结论：
- A'-Kimi **有条件放行**（B=0/W=2）：W1=checkLines 消费证据（终轮
  收尾修正证实其命中——对象形态确会 TypeError，已改数组+红绿机证：
  newtype 账本行 R4 FAIL 坏1行/正常 4/4）；W2=R2b/版本提取代码呈阅
  （在回炉轮 1 diff 在档，终轮包裁剪未含=指针已补）。
- B'-Kimi **条件放行**：立册行还原（已修：原文+另起补记行）；材料 3
  空壳（已补全 06 §5 逐字原文并复核）；文末修订记存在性（SKILL.md
  结构：「## 修订记」节在「## 验证状态」节后=文末，成立）。
- C'-ds **不签发终局 VERIFIED，可转呈用户冻结裁决**：B1=材料 3 空缺
  （已补全）；B2=R1 迁移待用户认受（**与交接书框架一致——v1.0 冻结
  本就留用户**，非处置缺陷）；W=HOST-node25 监控盲区（表行内已注记
  「已接受」）；N=纪元口径随用户裁决留档（认同——冻结呈报项）。

### 放行定格（终裁）

- **代码面（A' 区）**：初审 B×4 全清（FIXED）+复审新缺陷（cfg 守卫/
  账本未知 event/对象 TypeError）全修且红绿机证 → **B 零残留成立**；
  A'-ds 放行+A'-Kimi 有条件放行（条件=证据呈阅类，已满足/已补档）。
- **文档面（B' 区）**：双源 B1（烤验漏类）FIXED+VERIFIED；B'-ds 放行+
  B'-Kimi 条件放行（条件=立册还原/材料 3/指针核验，全落实）。
- **处置面（C' 区）**：对账表/档指针/转态全 VERIFIED；两项终局条件
  =**用户冻结裁决回执**（R1 形态迁移认受+纪元口径认受）——设计使然
  的用户裁决位（v1.0 冻结呈报项，见 freeze-evidence §三），不构成本
  战役处置欠账。
- **W5 放行线核对（交接书）**：B 级零残留 ✓（初审 B 全清+复审新 B
  均已修/已呈）；W 级修或登记 ✓（RESIDUALS 修订记轮 1/2 行）。
- **版本定格**：v1.1（SKILL.md 修订记节在档；技能仓库 10 提交链
  8ae30d3→e0f641a）。
- **派发总量**：15 次成功真实调用（初审 6+复审 6+终轮 3）+R1'3 双轮
  7 次+诊断/实验 3 次；Kimi 17 次 in≈47k/out≈32k，deepseek 13 次
  in≈52k/out≈102k（精确值以流水/账本转记行为准——初始预算估计
  Kimi 45k in/40k out 未超窗）。
- **回炉纪律核对**：回炉轮 1（修复）+轮 2（终轮）=上限 2 用尽；
  终轮后收尾修正（checkLines 数组化/立册还原/材料 3 补档）=轮 2
  引入缺陷的收尾，非第三轮回炉——如实注记此边界认定，呈用户认受。
