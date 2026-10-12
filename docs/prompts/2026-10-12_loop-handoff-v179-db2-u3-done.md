# 交接书 v179 —— DB-2 UI U3（renderer 会话面板）收官·迁移恢复场（2026-10-12）

> **修订三（2026-10-12 同日，用户三裁落地——下场开工序改写）**：用户裁决①C5=reword
> 推荐案②平台票=立案+U4 前置③推送=平台批毕即刻。已执行：**C5 清雷完毕**——
> filter-branch 对 origin/main..HEAD 全 64 笔 msg-filter（尾注字样三规则清除：
> 复合尾注拆解/独立尾注删/正文引用无括号化），**树零变化亲验（diff 0 行）+范围闸
> 按ci.yml 原式 TR_RE 重放=0 雷**+lock-change-guard 绿（[locked-change] 全保留）+
> 哈希映射表 64 行存档（仓外 c5-hash-remap.tsv——早期无雷笔哈希未动，旧哈希引用
> 以该表为准）；**F-PLATFORM-01 立案**（tickets/registry.ts——Linux/WSL2 平台移植
> 批：8 红清单+修复方向+批毕即推义务全入票面；tickets:check 绿）。**§1 开工序改写
> 为：F-PLATFORM-01 平台批→全量绿→git ssl 重置→立即推送→U4**（原 §1-1 席位项已
> 于修订一闭合；原 §1-3 平台票立案项已执行）。§3 待用户面：1/2/3 全关闭，仅剩
> 沿承呈裁两项（F-UIRES-04 C/D+设计 §7 新呈裁 3 条——非即刻）。

> **修订二（2026-10-12 同日，哈希重映射勘误）**：修订一后主控复核 CI 范围闸代码发现
> **闸按提交消息全文 grep `\[test-refactor\]` 字面（ci.yml:152）——不限于标题尾注**；
> 而 U3 feat 笔（原 3ae180b3）正文第 47 行引用了「9 笔 [test-refactor] 尾注带雷」
> 字样=正文字面触发闸判定+其 diff 含 src → 主控自造第 10 颗雷。已处置：reword 去
> 括号字面（正文改无括号引用+教训注）+cherry-pick 重放后代——**哈希重映射：
> 3ae180b3→38b95d26／50ad61f8→86063dc0／8e468620→d6f229ef／c8ef93e1→df1c4e59**
> （树内容零变化亲验 diff 0 行；闸本地重放按 ci.yml 原式 TR_RE=**恰 9 笔存量雷**，
> 今日 4 笔全净——历史哈希引用以本映射为准）。教训入册：**提交消息正文引用尾注
> 字样一律无括号化**（闸语义=字面串匹配，引用即触发）。C5 裁决面不变（9 笔存量，
> 全部为 2026-10-08~10 批次产物非本批）。

> **修订一（2026-10-12 同日，外席追认链）**：席位恢复（ai-dev-org 技能+ops-* 绑定岗
> 在场）后执行 §3-1 选项③「外席重跑」——门一 delta 外席双席 **k3**（kimi-main 源A，
> B0/W2/N4=PWC，两条件主控核销：E1② 终态断言 spec:71 先于 data-anchor 断言/
> data-scope=授权渲染行对称三件套亲裁保留）+**d1**（deepseek，B0/W1/N5=PWC）真实
> 异构重过；d1-W1 发现真缺口=aiSessionStore catch 首行（101 行）第三道 stale 守卫
> 「晚到失败」零可红覆盖（GLM 全链未发现——异构价值实证）→**R6 回炉**（第 11 用例
> +56 行，变异红证「notFound vs loading」，d1 微确认 PASS B0/W0/N0）→提交
> **8e468620**（单 [locked-change]，2 件）。门二裁决部外席 **ops-adjudicator**
> （kimi-third）终裁 **GO_WITH_CONDITIONS B0/W0/N3**——追认链成立、独立复算九笔
> 全对账（含交叉咬合 326=297+29/3272=3167+105）、C1-C3 全核销（C3 勘误：恢复场
> cfg_hash 非规范行=**9 行**非 8——裁决部亲数采纳）。**§3-1 席位追认窗口就此闭合
> （选项③已执行）**；§4 基线更新：verify test 步 **3168=3165 绿+3 平台红**/指纹门
> 提取侧 caseCount 3273（基线 3272 不 regen=superset 正确处置）/store 单测 11 用例
> /HEAD=8e468620；§1-1「席位追认先行」**已达成**（U4 直接开工，门一沿 v177 §3-1
> 修订五 k3 默认席）；§5 证据档追加 gate1-delta-pack-v2-external.md（外席自包含
> 审包）。health-scan 补跑 RED=0/WARN=3（历史行字段缺口+cfg 漂移=上述勘误同源）。
> 成本追认链≈1.87M subagent tokens（k3 30k+d1 69k+103k+executor 341k+
> adjudicator 1200k）。

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

## §1 下场开工序（单源——修订三改写）

1. **F-PLATFORM-01 平台移植批**（用户三裁 2026-10-12：U4 前置+批毕即刻推送——
   票面=tickets/registry.ts 自含任务书）：单元面 3 红（file-store 双平台绝对判定+
   消息脱敏平台无关化+zcode-link dev 期望参数化）+e2e 面 5 红（F-ANCHFIX×2+
   F-ROUTE-02×3 几何断言——三选方向批内定：容差/字体归一/skipIf+登记）；三屋全链。
   **批毕动作（顺序敏感）：全量 verify Linux EXIT=0（8 红清零，口径含 e2e 全量）→
   git ssl 重置（删 repo-local http.sslBackend=openssl 覆盖——Windows CA 路径失效，
   用系统 CA）→立即推送 origin main（范围闸 0 雷+lock-change-guard 绿已亲验——本
   修订）→F-PLATFORM-01 翻 done。**
2. **U4 实施批**（平台批毕即开——席位已闭合沿 k3 默认席）：aiTasksStore（任务+
   取消+审计行统一 store）+TaskCard 消息区与 Composer 间扩入+E2-E3 随单元落；
   派发简报显式枚举服务组/测试组清单对账票面（v178 教训沿承）。**已知噪声清单
   随简报项随平台批清零而退役**。
3. **repos 299/300 压线双件拆件方案前置**（v178 沿承——U3 零 repo 接触，预警仍活）。
4. DB-2 UI 批毕→DB-3 导出快照批（沿承 v176 §1-3）。

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

## §3 待用户面（修订三更新——前三项已裁已执行）

1. ~~席位降级追认~~ **已闭合**（修订一：选项③外席重跑执行完毕）。
2. ~~C5 推送清雷~~ **已裁已执行**（修订三：reword 64 笔+闸重放 0 雷亲验）。
3. ~~git 远端配置~~ **并入 F-PLATFORM-01 批毕动作**（ssl 重置随推送）。
4. Kimi 默认席位=k3（v177 §3-1 修订五——追认后自动恢复；翻案即回 k1）。
5. F-UIRES-04 C/D 呈裁+设计定稿 §7 新呈裁 3 条复核窗口（v178 沿承——非即刻）。

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
