# 交接书 v166 —— 晨间六项裁决落地+文档批收官·DB-1 开工令在册（2026-10-08 上午）

> 前承 v165（作废——取代制）。本档=07:00 棒终态体检+值守→用户醒后晨间六项裁决
> 全落地+DB-1 前置硬门 3/3 收官+治理文档批三屋链毕 的**下场单源**。**下场开工序=§1。**

## §0 本场总账（runId=20261008-0700-takeover，账本 871-880 行）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 07:00 定时接棒 | 兄弟会话检测两轮全一致（07:00:45/07:10:50）→终态体检：verify EXIT=0（267 文件/2784 测试）+health-scan RED×0+git/registry/locks 对账逐位全绿→值守 | 报告=仓外 20261008-0700-takeover/01-morning-health-report.md |
| 晨间六项裁决（用户在场） | ruling 行逐字入账（873 行）：DRAGREMOUNT=方案 A/DB-1 开工令+一批/TAGS-02 完全隔离/A2 确认+云中继新事实/DoD 升格/ANCHFIX 小批 | §2 映射 |
| DB-1 硬门③ | 备份-恢复演练 PASS（两库 25 表+10 业务表 sha256 逐表全等+quick_check ok+FK 0 行）——硬门 3/3 收官 | 874 行；db-drill/ |
| 治理文档批 | 宪法 DoD 新条+INV-70 快照+INV-120 三销项+头注勘正+教训档三回流——k1 三轮全 PASS+auditor 有条件放行全处置 | 提交 c842c3ab49a [locked-change]；875-879 行 |
| 本档+registry 三票注记 | 排期终态用户确认（§4） | 本档随附提交 |

## §1 下场开工序（单源——新会话首动作照此派发）

1. **DB-1 契约冻结批**（开工令已下，硬门 3/3 毕）：**一批 016-019+folder↔graph 一一
   对应唯一约束+repair 简化**（契约一次冻结）。单元序：U1=016 folder_id NOT NULL
   +folder↔graph 约束（实测 NULL=0 行无行可清/存量违约面零）→U2=017 is_starred+
   partial index（F-STAR-01 并入）→U3=018 app_meta（owner uuid+设备 token——A2 已
   确认）→U4=019 tags 多域（(folder_id,name) 复合唯一替换全局唯一；TAGS-02 意象=
   **完全隔离**+预裁默认：域内 20 满禁建+提示/每篇 6 硬禁/颜色随域独立）+repair。
   每单元三屋全链（实现者 TDD 红→绿→变异红证→门一 k1→门二 probe+裁决部）；
   **回滚锚=仓外 20261008-0700-takeover/db-drill/ 两库备份件**（迁移前主控亲验
   在位）；简报执行宪法 DoD 新条（预期数字手算留痕——本案首例）。收口=test-surface
   基线对齐+architecture.md §6 实体表回写+ADR（tags 域化/folder↔graph 契约）。
2. **DB-2 AI 域**（DB-1 收口后）：020 AI 表族+epoch 触发器+全链（三档含软件层代理
   化——任务模型/权限围栏/审计）+记忆知识库化+按需分级检索+会话 50 上限+入口恢复
   接线；首动作=trigram 实测门；估算器校准。**AI 域技术细节专项汇报待用户（开工
   时呈，既定义务）**。
3. **DB-3 v1.3 落纸**（DB-1 收口后，甲方向已授权）：删事件日志+A8 传输安全专项
   （**云中继不可信假设**——用户裁决④新事实：内网穿透=公网云服务器代理转发、
   IPv6 现不可用，数据先至云服务器再转内网——按端到端保密方向展开，触及部署
   约束呈用户）+设备清单认证+format_version 与 019 绑定。落纸后过对抗链。
4. **DB-4 治理收尾**：papers.delete 文件清理+存量治理+folder 删除路径（app 级拒删
   非空——§5.c N8 推荐口径）+TAGS-02 UI 下拉+verify/locks 全量。
5. **UI 遗留票面（与 DB 文件级正交，可穿插/并行）**：F-UIRES-04 批 3a-3d（设计
   v1.1 定稿；**批 1a 探针后 C/D 两点呈裁待用户**）→F-SETSTYLE-01（批 3d 搭车或
   独立小批——主控自处）；F-DRAGREMOUNT-01=**方案 A 已拍板+挂起穿插**（DB-1/DB-2
   间隙或 UIRES-04 批 3 并行窗；修复落地时三断言同步翻转+头注回填票号）；F-EVCTX-01
   e2e 取证基建独立票（排面自由）；F-SNAPHINT-01 挂起待复现（非排期项）。
6. **5 毕=集中视检轮**（F-SLOTGRID-01 挂的 R3 轮沿承+UIRES-04+DB UI 面 TAGS-02
   下拉/星标标记区一体过目）→视检毕→**AI 模块本体+下载模块本体**（新地基上开发
   ——v93 §2-1 修订口径；下载渠道边界=宪法负面清单 CARSI/CDP/Sci-Hub 禁）。

## §2 晨间六项裁决落定映射（原文=账本 873 行 ruling）

1. DRAGREMOUNT=方案 A（keyed 跨父保育）；时机解读=挂起穿插（用户原文仅「A」，
   主控解读已披露——改令即修）。
2. DB-1=批准开工先演练（已 PASS）；拆批按推荐→因 3 已答=**一批**。
3. TAGS-02=完全隔离（「标签一共也没几个字，完全不需要增加冗余设计」）。
4. A2=确认+新事实：内网穿透=公网云服务器代理转发（IPv6 不可用）→A8 升级输入。
5. DoD 候补条升格=批准（已提交生效——AGENTS.md 完成定义节）。
6. ANCHFIX P1 剩项=批准（四销项已提交；#4 Rule of Three 维持双源+登记）。

## §3 待用户面（新会话首问候选）

1. F-UIRES-04 C/D 呈裁（等批 1a 探针——时机随批非即刻）。
2. DB-2 AI 域技术细节专项汇报（DB-2 开工时）。
3. DRAGREMOUNT 时机解读确认（§2-1——如需提前修一句改令即可）。
4. 探针差异 4 项过目（v165 §2-4——016-019 实施目标面，无冲突，知情即可）。

## §4 排期终态（用户 2026-10-08 晨确认）

**DB 战役（DB-1→DB-4，进行中）+UI 大改遗留票面 → 集中视检轮 → AI 模块本体+下载
模块本体。** 注：DB-2 含 AI 数据域+入口恢复接线（属 DB 战役内、视检前）；「AI 本体」
指其上功能面（评估建议/分层级对话/代理层任务派发）。SNAPHINT 挂起待复现不占排期；
EVCTX-01 排面自由。registry 三票注记已随本档同步（DRAGREMOUNT/TAGS-02/DBCAMP）。

## §5 基线与治理

- HEAD=本档随附提交（v166+registry 三票注记——docs+registry 非受锁面无尾注）；
  前笔=c842c3ab49a（治理文档批 [locked-change]）。
- verify：本场四跑全 EXIT=0（07:13/09:17/09:33/09:41——**267 文件/2784 测试**全程
  不变、locks 375、test-surface 2886/豁免 0、断言 9366）。
- 账本 880 行（871-880=本场：session-open/体检 batch-close/ruling/演练/双审两岗/
  k1 r2+r3/文档批 batch-close/本档终笔）。
- 成本：k1 三轮 618,180+auditor 496,649（subagent tokens 计）+演练 probe 主控亲执
  ≈1.11M+主控 host-tier。
- 治理新增：宪法 DoD「简报预期数字手算留痕」条（本档为首个受其约束交接书——
  本段数字均机器实测：行数 wc -l/退出码重定向捕获/哈希 git log 亲取）；INV-70
  单例快照 14（含 anchor-occupancy）；教训档 22 节三回流。
- DB-1 事实包（简报直取）：pk 全 TEXT 键/collections.id 含 __main__ 哨兵/FK 11 对
  foreign_key_check 0 行/两处 on_delete 不一致（SET NULL vs CASCADE——N8 注意）/
  default user_version=15 次库 12 落后 3（打开自动补跑面）/差异 4 项=待建面。

## §6 证据档指针（仓外 scripts-audits/20261008-0700-takeover/）

- 01-morning-health-report.md+verify-full.log——07:00 体检；
- db-drill/（drill-result.json+两库备份件 default/ws-059434f6+restored 对照件+
  db-backup-drill.cjs）——硬门③+回滚锚；
- docbatch-full.diff/docbatch-r2-incremental.diff/docbatch-r3-final.diff+
  verify-docbatch{,-r2,-r3}.log——治理文档批三轮；
- rows-*.json+append-ledger.mjs——账本写入件；
- 04:00 场证据沿承=v165 §6。
