# 交接书 v179 —— DB-2 UI U3（renderer 会话面板）收官·迁移恢复场（2026-10-12）

> 前承 v178+中场档（docs/prompts/2026-10-11_loop-progress-u3-midstate.md——会话中断
> 快照）。本档=恢复会话（runId=20261010-dbcamp-db2i 续，Linux/WSL2 迁移后首场）完成
> **U3 收官全链（迁移事实核+门一 delta 双席+R5 回炉+门二 probe/终裁+收口）** 的单源。
> **下场开工序=§1。**

## §0 本场总账（恢复场；账本续 db2i runId——session-open 至 batch-close 全行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 迁移事实核 | 树无损（22 件与中场档 §2 逐件吻合/HEAD=59e0e63b）+locks 417+仓外档案区未随迁（按 §7 预案 B 重建 delta 审包——新址见 §5）+环境补齐（node24.20.0/Linux 平台二进制/electron 44.4.3/.bin exec 位） | session-open 行 |
| 平台修复亲笔×2 | check-quality.mjs:141 分隔符归一+check-tickets.mjs×5 replaceAll 方向反转（Windows 语义零变化——门二代码级等价性亲验）；manifest 经等价 node 复刻同步（ps1 锁工具 Linux 缺位——sha256 原始字节口径同 check-locks；排版重排副作用在案） | 同上 |
| 门一 delta 双席 | 席 A（符合性）B0/W1/N4+席 B（对抗性）B0/W1/N2=**双 PWC**——R1-R4 七落点全核销/恒真全消解/data-anchor 最小性/8 红证自洽；**GLM 同源代偿席（席位降级申报见 §3-1）** | gate1-audit×2+ruling 行 |
| R5 回炉（r1″） | 席 B 发现 aiSessionStore.ts:95 第二道 stale-guard 零可红覆盖→补第 10 用例（三链交错：不复活/不污染/中间态/终态零泄漏）+变异红证（守卫注释→红于复活断言→diff 零还原）→席 B 微确认 **PASS** | impl+gate1-audit 行 |
| 门二 | probe 八项 GREEN（主控亲验：verify 链分步/3 平台红 HEAD 等价两证/E1 3:3 Linux 首跑/e2e 全量 105=100+5 平台红 HEAD 逐条对应/变异复证字节级还原/零蔓延/renderer 消费单源零 repo 行型）+裁决部 **GO_WITH_CONDITIONS（B0/W5/N2，20 笔独立复算全对账）** | probe+adjudication 行 |
| 收口 | 指纹门 regen 323·3256·10683→**326·3272·10773**·skipSites 10+豁免清扫 2→0（retiring 2/added 2；removed 25=旧 exemptionsSnapshot 出账非断言删减）+manifest 复刻再同步+verify 亲验（重定向+echo：七步 0+test 步 3167=3164 绿+3 平台红）+提交 **3ae180b3**（单 [locked-change] 尾注=C1；24 件=11 M+13 新）+本档 | batch-close 行 |

成本=恢复场 subagent ≈3.55M tokens（席 A 612k+席 B 1015k+245k 微确认+R5 executor
591k+裁决席 1088k）+主控 host。席位全 GLM 同源（降级态——§3-1）。

## §1 下场开工序（单源）

1. **席位追认先行**（§3-1——U4 开工前恢复 k3/d1 外席凭据或取得用户对同源代偿的
   追认；未追认前 U4 门一沿用 GLM 双席=继续降级态，须逐批申报）。
2. **U4 实施批**（任务区+审计，依赖 U3；设计 §4.3 序）：aiTasksStore（任务+取消+
   审计行统一 store）+TaskCard 消息区与 Composer 间扩入（AiSessionPanel 为扩展点）
   +E2-E3 随单元落。派发简报显式枚举服务组/测试组清单对账票面（v178 教训沿承）
   +**已知噪声清单随简报**（Linux 基线 3+5 平台红——见 §2-⑤，防误判回归）。
3. **平台移植票立案**（§2-⑤收口为 registry 有形面——现「待挂账」文档形态）。
4. **repos 299/300 压线双件拆件方案前置**（v178 沿承——U3 零 repo 接触，预警仍活）。
5. DB-2 UI 批毕→DB-3 导出快照批（沿承 v176 §1-3）。

## §2 沿承挂账（v178 四条+中场档九条+本场新增，均非阻断）

- v178 四条：①U1 冻结锚 lineage/global 补强 ②schemas.ts 555 行余量观察 ③closure
  describe 组名去数字 churn 机制 ④服务层 limit 硬化不齐+空 patch undefined 键缝。
- 中场档九条（⑤LineageAiPanel 锚绑定单测+MessageItem 非空渲染〔U4 消息卡自然
  覆盖〕⑥seed exit vs close ⑦页签 APG 完备性 ⑧api-client-mock 升级连带 ⑨
  getByDisplayValue 缺位绕行等）沿承。
- **⑤′（本场新增）平台债双面**：unit 3 红（file-store×2 Windows 路径语义+
  zcode-link×1）+e2e 5 红（F-ANCHFIX-01×2+F-ROUTE-02×3 route 分类——Linux/WSLg
  字体度量漂移致走线分支变）；**HEAD 净树等价两证**（probe worktree+裁决席独立
  复跑，同名同计数逐条对应）；CI=e2e/vitest 跑 windows-latest 从未暴露 Linux 面。
  处置=平台移植票（跨平台路径语义参数化+几何断言平台容差或 Windows-only 守卫）。
- **⑥′（本场新增）检查脚本平台债余量**：scripts/*.mjs 经两处修复后 Linux 全绿，
  但 ps1 四件（locks:generate/apply/unlock+ticket:new）Linux 缺位——manifest 维护
  走 node 复刻口径（sha256 原始字节/LF；脚本件=/tmp 内一次性，未入仓——复刻逻辑
  已在账本+本档记载可重建）；回 Windows 工具链时 locks:apply 会再排版重排一次
  manifest（内容不变）。
- **⑦′（本场新增）EdgeHandles.tsx:90 存量 data-anchor 同名异义**（边柄索引——
  e2e 经 testid 限容器零冲突，注记在册）。

## §3 待用户面

1. **席位降级追认**（开门事项）：k3（kimi-main 源A）/d1（deepseek）外部席位在
   WSL2 迁移环境缺位（无 API 凭据+无 ds-call 派发器——org-config 仅存注记）。
   本场门一 delta 双席+门二裁决席均为 **GLM 同源代偿**（隔离上下文+角色分化+
   实证复算对冲，独立性以流程保、异构性损失如实申报）。三选一：①恢复外席凭据
   ②追认同源代偿为迁移期常态 ③外席重跑本场 delta/终裁（审包+probe 包在档可复用）。
2. **C5 推送前清雷裁决**：origin/main..HEAD 现仍 60 笔未推（59+本批 feat 笔），其中
   **9 笔存量带雷**（[test-refactor] 尾注但 diff 出白名单——96bccbf〔U2，22 src
   文件〕/ffc75d3/ed8614a/64c1a18/7ab5d10/835edb3/23a0636〔U1，4〕/23154b4+685fd21
   〔docs 路径〕），推送时 test-refactor 范围闸逐笔回溯必红。处置三选：①reword
   删尾注（10-03 先例 ab9dc26——树哈希不变）②白名单修订 ③接受红补修。**本批
   3ae180b3 已按 C1 单 [locked-change] 不新增雷。**
3. **git 远端配置**：repo-local http.sslBackend=openssl+CA bundle 指向 Windows 路径
   （E:\class\...）——WSL 内 push 前须重配（DEV-SETUP §3 为 Windows 口径，Linux
   侧直接系统 CA 即可，删 sslBackend 覆盖）。
4. Kimi 默认席位=k3（v177 §3-1 修订五——追认后自动恢复；翻案即回 k1）。
5. F-UIRES-04 C/D 呈裁+设计定稿 §7 新呈裁 3 条（v178 沿承）。

## §4 基线与治理（Linux 双列口径——Windows 侧数字为账本历史值）

- HEAD=3ae180b3（U3 单笔 [locked-change]，24 件=11 M+13 新）+本档 docs 笔。
- verify（Linux）：链八步=quality/test-surface/tickets/locks 417/lint/typecheck/
  build 全 0+test 步 **3167=3164 绿+3 平台红**（口径注：禁无限定语「全绿」——
  3 红=存量债 HEAD 同证，见 §2-⑤′）。Windows 时点 r1′ EXIT=0 在账本（同树内容）。
- e2e（Linux）：**E1 3:3**+全量 105=100+5 平台红（HEAD 同 5 红逐条对应）；Windows
  基线 102/102（v176 承接）+E1 3=105 全绿为历史值。
- 指纹门基线：**326·3272·10773·skipSites 10·豁免 0**（retiring 2/added 2/removed
  25=旧 snapshot 出账；断言面 10683→10773 单调增）。
- locks **417**；通道 75 恒定；user_version 20；registry 零改动（伞下单元制）；
  architecture/ADR 无触及如实申报（U3=renderer 功能面消费既有 IPC/服务面，§6
  实体表回写仍归 DB-2 阶段收口统一面）。
- 治理：本场门一 delta=同源双席+R5 回炉+微确认；门二 probe 主控亲验+裁决席独立
  复算 20 笔；裁决部 C1-C4 全核销、C5 登记待裁。F-DBCAMP-01 恒 open（U3 毕/U4 起）。
- 勘误在册：r1′ 报告 R4 新件行数 91→93（wc 实测——C4-①）。

## §5 证据档指针（**新仓外档案区** /home/agent/synapse-archive/scripts-audits/20261010-dbcamp-db2i/）

- gate1-delta-pack-rebuilt.md（重建 delta 审包——原 Windows 档案区未随迁，重建源=
  账本+树实况）/gate2-probe-pack.md（probe 八项）/r0-integration-diffs.patch。
- 原始日志（/tmp 易失，重要数字已录入账本行）：verify-{migration3,r5,closeout}.log/
  e1-linux.log/e2e-full-linux.log/head-e2e.log（HEAD 对照）/head-check worktree。
- 账本：db2i runId 全程 15 行（Windows 7+恢复场 8：session-open/gate1×2/ruling/
  impl r1″/微确认/probe/adjudication/batch-close）。
