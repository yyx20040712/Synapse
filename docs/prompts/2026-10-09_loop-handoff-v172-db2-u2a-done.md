# 交接书 v172 —— DB-2 020-U2a 服务层件一（会话上限+检索路由）收官·U2b 候场（2026-10-09）

> 前承 v171（取代制）。本档=接棒会话（runId=20261009-dbcamp-db2b，用户午令
> 「信息更新，请开工 v171」）完成 **020-U2a 服务层件一全链收官**的单源。
> **下场开工序=§1。**

## §0 本场总账（runId=20261009-dbcamp-db2b，账本 942-952 行）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点增量+隔离语义一手裁决核实（ruling 927 逐字：完全隔离无并集）+graph_meta 探针（前置①） | 账本 942 |
| U2a 实现 r0 | 4 新 src（ai-sessions.repo/ai-memory.repo/ai/两 service）+3 测试 Δc=37+INV-127+装配接线；C3 亲核吻合；夹具补桩 3 件裁夺接受（U3 先例同痕） | 账本 943 |
| 门一首轮 | k3 面 B0/W1/N5+d1 面 B0/W3/N4（双 PWC——共识 W1=MATCH 路跨锚断言恒真） | 账本 944-945 |
| 回炉 r1 | 7/7 全办（R10 改造+R17 对偶+M13 先写后炸回滚+R18 label+R19 LIKE topK+m3'/m6/m7 变异红证）；Δc=41；src 零改动 | 账本 946 |
| 门一 delta 复审 | k3=**放行 PASS（B0/W0/N4）**+d1=PWC（W①=打包截断——主控亲验报告 66-68/105-112 在档核销） | 账本 947-948 |
| 门二 probe | 八项矩阵：P1-P7 GREEN（隔离 72/72 含 lineage×LIKE+global×MATCH 缺口格/eviction 34/34/转义排序大小写 18/18=k3-N4 闭合/变异抽现 m3'+m4 独立复现）；**P8 RED→回炉 r2**（6 处动态 it() 标题 UNRESOLVABLE）；A1=派发简报预期笔误（码点数学）；A3=探针 harness 自愈实录 | 账本 949 |
| 回炉 r2 | 六处标题静态化（六例可抽 cases 3009=2968+41 逐字吻合）；vitest 41/41+lint/tsc 0 | 账本 950 |
| 裁决部终裁 | **GO_WITH_CONDITIONS**（六面全成立/说了没改 4 抽属实/复算吻合/残余 9 条全 N 级；唯一条件=主控 verify 亲验落痕——已兑现 EXIT=0 两跑）；R6 注记=k3 座三角色（用户路由令约束+晨场先例+d1/probe 独立对冲） | 账本 951 |
| 收口 | 提交（15 件 +2171/-295 [locked-change][test-refactor]）；指纹门基线 regen（diff 审计=恰 3 新文件+2 夹具行号漂移零增减）；locks 395 | 账本 952 |

成本 ≈**26.9M subagent tokens**（executor 三轮 19.30M〔9.87+6.52+2.92〕+probe 5.86M+审读面
1.14M〔k3 三席 0.34M+d1 两席 0.39M+delta 0.42M〕）+主控 host-max。kimi 路由申报（用户
00:08 令二）：本场 kimi 面（门一 k3 两轮+delta 复审+裁决部）全程 **ops-gate1-k3=kimi-k3
源**，k1/k2 未用；R6 披露=同席三角色，独立对冲=d1 双轮+probe 矩阵。

## §1 下场开工序（单源）

1. **U2b=020 服务层件二：任务系统+装配引擎**（设计单源=专项报告 §3.C/§3.D+08:59
   三轮终态〔aeb2697a3e8——L1 骨架/按需展开/尾段 400-600-200 cap 1200〕+终裁补遗+
   020 头注 T1-T5）。任务系统=9 动作 dispatch 三闸对齐+6 态机+SAVEPOINT 超时零副作用+
   幂等键 UNIQUE+崩溃恢复扫描+成功路径拒写分支；装配引擎=L1-L3 三级+lineage 骨架特化+
   缓存键 (scope,anchor,ctx_ver) 字节相等+审计写入面（(task_id,seq) 递增+G2 相容只 INSERT）。
   **U2b 前置输入包（本场新得，全携带）**：
   - 前置①结论：graph_meta 键面无锚关联（真库实照+代码侧同证——仓外 probe-graph-meta）
     →图元片源按报告 §6 退化空片+空召回 meta，不阻断装配；
   - INV 随批登记三件：INV-J 落地句+排序键三型适配句+**跨锚 source_task_id 不变量**
     （服务层写入约束=任务与目标同锚——+2 算术前提，020 头注 T3 承载）；
   - U2b 呈裁三件套（裁决部 N1-N3）：幽灵会话语义（appendMessage/listMessages 对不存在
     sessionId+同锚重复 openSession）/遗留部分置顶拒写文案失真（55×50 置顶态「全部置顶」
     不实——修则同步 §3.E 模板与 S6 断言单源）/形态校验优先序（缺 session×非法 role）；
   - 测试面预警：ai-memory-search 测试 497/500 行余量 3——U2b 加例必触 max-lines，预筹
     拆文件（k3 复审 N4）；
   - 变异补强候选：scope 换档变异（m3/m3' 均只摘 anchor——k3 复审 N1/裁决部 N4）；
   - R4/R7 断言强化三件顺带：edges 二段级联断言锁/空锚级联场景/杜撰值采样 paper·lineage
     各 1 枚（v171 §2 沿承）。
2. 节奏沿承（≤2 件/场）：U2b 两面（任务/装配）若超载拆两场，下场主控定。
3. U2b 毕后：DB-2 UI 面（会话入口/任务卡/审计抽屉/预算设置页〔裁定③〕——承载形态
   呈裁）+e2e 面恢复。

## §2 沿承挂账（下场携带——均非阻断）

- **C3 计数失实两现（红线沿承）**——本场三轮 executor 申报全吻合亲核（37→41→41 零失实，
  未触第三现）；020-U2b 简报照旧预注+分项计数亲核。
- **简报预期数字手算教训（本场新得，probe A1）**：变异预期涉及码点路由边界时须手算码点
  数学（「R2 应红」预期不成立——1 码点在 <=1 变异下数学上仍走 LIKE）。
- **探针工具面教训（probe A3）**：探针 harness 优先单入口 esbuild 聚合打包（junction
  EISDIR/ESM 动态 require/双包类割裂三坑实录）；node -e 补丁不可靠（shell 四坑重犯一次）。
- 沿承沿承：flake :1030 count=2 filed（再现首取 error-context 快照）/adjudicator R 清单
  （v169 §2；R5 指纹门 Req 形状=F-REQFP-01 已立票 e6458877e2a，时机=数据面完成后）
  /N 级卫生票池（v168 §2）/物理命名漂移（一律物理名）/账本 ts 取系统时钟。
- 会话技术事实（下场直取）：error 码面=CONFLICT 复用（tags 限额先例——禁新增封闭枚举
  除非 ADR）；隔离谓词 PREDICATE 单源双路（ai-memory.repo）；escapeFtsQuery 单源复用
  （禁重写）；MATCH/LIKE 取行=IN 子查询形态（papers.queries.ts:158 先例+SQLITE_ENABLE_
  UPDATE_DELETE_LIMIT 方言规避——两处自裁在档）。

## §3 待用户面（沿承 v171 §3+本场新增——均非即刻）

1. F-UIRES-04 C/D 呈裁（沿承——等批 1a 探针时机随批）。
2. DB-2 UI 面承载形态（DB-4 窗或独立票）——U2b 毕后呈。
3. 预算设置页（裁定③）落位时机——随 UI 面呈。
4. **U2b 呈裁三件套**（§1-1 承载——幽灵会话语义/拒写文案修否/校验优先序，U2b 开工时呈）。

## §4 基线与治理

- HEAD=U2a 单笔（15 件 [locked-change][test-refactor]）+v172 本笔。工作树=clean。
- verify：**EXIT=0 亲验两跑**（regen 前后各一）；**281 文件/2907 用例**；指纹门
  **309·3009·9843·skipSites 10·豁免 0**（基线随批再生成——diff 审计=恰 3 新测试文件
  +2 夹具行号漂移〔cases 8→8/10→10 零增减〕+stats 块，removed=0）；locks **395**；
  MIGRATIONS/user_version=**20** 不变；e2e 未跑（U2a 零 UI/IPC 变更——基线 102/102 沿承）。
- **数字对账注**：Δc=41=13（M1-M13）+8（S1-S8）+20（R1-R19+escapeLike）；cases
  2968+41=3009；断言 9729+114=9843；全量 278+3 文件/2866+41 用例；locks 392+3=395。
- 账本 952 行（942-952=本场 11 行）。成本分列见 §0。
- 治理：INV-127 落册（大小写折叠偏差句——行为锁=R14+probe P6 独立实证）；F-DBCAMP-01
  恒 open（DB-2 阶段进行中，无翻面）；U2a 零 IPC 零 shared 零 migrations（服务层纯新增面）。

## §5 证据档指针（仓外 scripts-audits/20261009-dbcamp-db2b/）

- 简报与报告：u2a-brief.md（六段+冻结案 §3+覆盖矩阵 §4）；u2a-impl-report.md（r0+r1 §9
  +r2 §10+分项计数表）。
- 门一：u2a-gate1-package.md（1844 行自包含）+u2a-gate1-r1-package.md（750 行 delta）；
  双席四轮报告=会话转档（账本 944/945/947/948 行）。
- 门二：u2a-probe-report.md+u2a-p01..p08.raw.txt+p03a/b（变异抽现）+探针四件+进度件；
  裁决部终裁全文=会话转档（账本 951 行）。
- 主控：probe-graph-meta{.mjs,-out.txt}（前置①）+audit-baseline{.mjs,-out.txt}（regen
  审计）+u2a-verify-close{,2}.raw.txt（两跑 EXIT=0）+snapshots 系列沿承 0630-takeover。
- 账本写入件：rows-session-open/rows-u2a-r0/rows-u2a-r1/rows-u2a-r2（json）+复用
  append-ledger.mjs（0630-takeover 座）。
