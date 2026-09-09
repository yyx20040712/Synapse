[routing]: run=20260909012901-kcow source=kimi-main model=kimi-k3 role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=5505,out=5106 latency=191409ms (by ds-call-v2 链)

# 回炉定点复核结论（08 v1.1 + WP 适配书 v1.1）

## 一、原发现逐条核对

| # | 结论 | 核对依据（定位） |
|---|---|---|
| K-B1/ds-W1 | ADDRESSED | WP 禁令 2「除阶段 0 明列动作（0a~0f）外」+阶段 0 标题「预授权批」；08 §2 步 2 同步加「预授权须逐项列明于任务书」，双侧咬合 |
| K-B2 | ADDRESSED | WP 0e 建 `.zcode/org-config.json` 覆盖件（空对象起步）；§5 模板改「默认件兜底+覆盖件按需」；08 §1 寻址表「默认件+项目覆盖件」口径一致 |
| ds-B1 | ADDRESSED | WP §0.4 双目录显式分工（父=档案根/项目内=运营件）+§7 重申 |
| K-W1 | ADDRESSED | WP 0b 通读 01~04/06/07 标为「阶段 1 比对基准」；§3 必读第 5 项同步 |
| K-W2 | ADDRESSED | 阶段 2 与 DoD 写明 `pnpm gates`，§7 注 scripts.gates=python scripts/run_gates.py（实查口径） |
| K-W3 | ADDRESSED | 阶段 1「开工日实扫为准，快照仅索引」+根 .md 实扫入范围 |
| K-W4 | ADDRESSED | 阶段 0 提交边界明列，阶段 2 diff 以预授权批为 BASE；DoD 同步 |
| K-W5/ds-W4 | ADDRESSED | 08 §1 重构为「唯一真相源（主）｜从属/索引（注记）｜禁止出现处」三列，并列源消除 |
| K-W6/ds-W3 | ADDRESSED | 08 §2 步 1 件级四态（含拆分）+两类登记；WP 阶段 1 映射表「态」列六项逐一对应，无第四态死角 |
| K-W7 | ADDRESSED | 08 §2 步 3「有 grep 门禁的项目加装指针化对照（豁免呈报入 org-delta）」；WP 阶段 2+DoD 双落地 |
| K-W8 | ADDRESSED | 08 §4 末「随战役收口攒批呈报，复用映射表通道，不另设」 |
| K-W9 | ADDRESSED | 08 §2 词汇差异处理「ORG-SEG 标记段之外、不占预算」；WP 阶段 2/§4 同步 |
| ds-W2 | ADDRESSED | 08 §3 机检形态（基线 HEAD+sha256 锚+祖先链形核对）；WP 0c/阶段 2/DoD 三处落地 |
| K-N1/ds-N2 | ADDRESSED | 08 §5 唯一定址规则=起草方项目留档目录；WP 引言注「姊妹项目跨项目证据档」，二选一消除 |
| K-N2 | ADDRESSED | WP 0c「git status 不净先停报」+§7「开工须重验」 |
| K-N3/ds-N1 | ADDRESSED | 08 §1 表后注「描述可写、参数不写」边界清晰 |
| ds-N3 | ADDRESSED | 08 §2 步 4 限定「已插 ORG-SEG 段的项目必跑」 |
| K-N4 | ADDRESSED | WP 0d「仅可裁修饰措辞，条款主句禁删；仍 FAIL=停点呈报」 |
| K-N5 | ADDRESSED | 08 §2 废弃态带范例路径 `_archive/loop-engineering-archive-2026-09/` |
| K-N6 | ADDRESSED | §5 模板切换判据=06 §5 R1~R6 全过 |
| K-N7 | ADDRESSED | DoD 改指 0f（首行+执行批追加行），与 0e 覆盖件分清 |
| K-N8 | ADDRESSED | WP §0.4 注记正斜杠约定，本件内统一 |

**22/22 ADDRESSED，无 NOT ADDRESSED。**

## 二、修订面新发现

- **[W] 新-W1｜08 §2 词汇差异处理 / WP 阶段 2**：「预算脚本只数标记段内」为未经实证的断言。若 check-constitution-budget.mjs 实数全文，阶段 2 挂映射表后复跑必 FAIL，而裁剪处置规则（WP 0d）仅覆盖 ORG-SEG 段，映射表超预算无既定出口。建议：WP 0d 顺带实证脚本计数口径并落档；或为映射表超预算预置处置路径（裁词条/移挂他处）。
- **[N] 新-N1｜WP §6 DoD**：「HEAD 链形与历史件哈希锚零变动」与阶段 0/2 须产生新提交表面相抵，宜对齐 08 §3「祖先链形未变」以免执行者误读为 HEAD 不可动。
- **[N] 新-N2｜08 §5**：WP 留档路径写作反斜杠（`E:\class\...`），与 WP 任务书 §0.4「正斜杠书写」约定跨件分裂。
- **[N] 新-N3｜WP 阶段 0**：`.zcode/` 是否入库未明示——`.workflow/` 有 gitignore 注记而 `.zcode/` 无，预授权批独立提交可能把 org-delta.jsonl 运营件一并入库，建议一句定死。
- **[N] 新-N4｜WP 0c**：「各 handover/briefs 首件」之「首件」歧义（首份？每类最新？），锚对象枚举不清会削弱收口核对。
- **[N] 新-N5｜WP §5 模板**：「首个适配场完整 LOOP 后」系任务书外事件（Synapse 侧），WP 执行方无法自验，建议注明该判据验证责任归主控。

## 三、放行意见

原 22 条全数闭合并交叉一致，修订面未翻动已闭合区域。**有条件放行**：新-W1 不构成回炉阻断——以 WP 0d 开工时实证脚本计数口径并落档为放行附带条件即可闭环；N 类五条随下次修订顺手收，不另设关卡。