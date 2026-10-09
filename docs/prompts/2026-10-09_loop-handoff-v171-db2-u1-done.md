# 交接书 v171 —— DB-2 020-U1 迁移数据面收官·U2 服务层候场（2026-10-09）

> 前承 v170（取代制）。本档=接棒会话（runId=20261009-dbcamp-db2a，用户 09:05 令
> 「7 项+三轮指令已由兄弟会话裁决完毕，交接指引见 v170」）完成 **020 设计轮首件
> （分类定稿对抗审+主控终裁冻结）+020-U1 迁移数据面全链收官（23154b4b4fd）**的单源。
> **下场开工序=§1。**

## §0 本场总账（runId=20261009-dbcamp-db2a，账本 931-941 行）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 承接 | v170 修订版+三轮裁决链研读；实况亲验（HEAD aeb2697a3e8/树净/账本 930） | 账本 931 |
| 分类定稿审核（v170 §1 首件） | deepseek 对抗审=有条件放行 B1/W3/N5→主控终裁九条全处置（B-1 由 NOT NULL 闭合+W 句随头注+N 分流），**19 值零改动冻结** | 账本 932 |
| U1 实现 r0 | 020_ai_domain.sql（291 行）+migrate.ts v20+3 测试 23 用例+succession 12 件；四自裁主控追认（T3 级联体实证修正——原案 FTS 双删致 SQLITE_CORRUPT；epoch +2；钉 ≤19 口径；autoindex/影子表勘正） | 账本 933 |
| 门一首轮 | k3 面 B0/W2/N5+d1 面 B0/W3/N5（双席独立核过 DDL 逐字+触发器语义+计数算术） | 账本 934-935 |
| 回炉 r1 | W 合并去重五项+顺手两件（papers 插入路径/_au 协议锁/FK 级联 epoch 断言组〔主控探针实证语义〕/跨档穷举 38 拒/头注三句/注释/对称补拒）；25 用例；变异对拍 7 组；方法学发现=papers FTS 触发器终态真源=016 重建文本 | 账本 936 |
| 门一 delta 复审 | k3 面**放行 B0/W0/N2**+d1 面**放行 B0/W0/N4**（W 全闭；断言 +23 逐处手算恰合） | 账本 937-938 |
| 主控实证 | probe-rt-fk（recursive_triggers=0；FK 级联灭失行点火 epoch_ad）+probe-fk2（二段级联面三条链实照）+N 级注释亲笔三件+基线 regen 豁免通道（44 条临时→终态空） | 仓外两探针 |
| 门二 | probe 9/9 GREEN（P1-P9 含独立冒烟 16 断言/级联 35 断言/G2/全量 verify EXIT=0）；裁决部（ops-gate1-k3 承载）=**GO_WITH_CONDITIONS B0/W3/N5**，C1-C3 全落实 | 账本 939-940 |
| 收口 | 提交 23154b4b4fd（[locked-change][test-refactor]）；verify 亲验 EXIT=0（278/2866）+health-scan RED×0 | 账本 941 |

成本 ≈**21.11M subagent tokens**（executor 18.71M+probe 1.70M+审读面 0.70M）+主控
host-max。kimi 路由申报：本场 kimi 面（门一 k3 双轮+裁决部；taxonomy 拟定沿承晨场）
全程 **ops-gate1-k3=kimi-k3 源**（用户 2026-10-09 00:09/00:10 裁决），k1/k2 未用。

## §1 下场开工序（单源）

1. **U2=020 服务层**（设计单源=专项报告 §3 + 补遗 + 020 头注口径句）：
   会话 50 上限（repos `insertWithEviction`+`SESSION_CAP_ALL_PINNED` typed error+5 态
   边界）/检索路由（码点长度前置分流：1-2 LIKE 路〔转义 `\ % _`+ESCAPE〕≥3 MATCH 路
   〔escapeFtsQuery〕+**三档隔离谓词**〔裁定①：本档本锚；global 档=global 行全集〕+
   排序同口径+topK=8）/装配引擎（L1-L3 三级+**lineage 骨架特化〔08:59 三轮终态**：
   标题/星标/连线含名称/标签/笔记标题索引/记忆索引/文件夹名，@30 节点 ~1500/cap
   1800、护栏 120；L3① 检索源扩图内文献域 top-5 单篇 250 tok；L2 收缩图元 2+文件夹
   1；尾段 400/600/200 cap 1200〕+缓存键 (scope,anchor,ctx_ver) 字节相等）/任务系统
   （9 动作 dispatch 三闸对齐+6 态机+SAVEPOINT 超时零副作用+幂等键 UNIQUE+崩溃恢复
   扫描+成功路径拒写分支）/审计写入面（(task_id,seq) 递增+G2 相容——只 INSERT）。
   **U2 前置项（裁决部 C1/R8 升格）**：①graph_meta KV 键约定**运行期探针**（实照=
   图元片源退化判据——无锚约定可过滤则空片+空召回 meta 不阻断）；②跨锚
   source_task_id 不变量登记 invariants（服务层写入约束：任务与目标同锚——+2 算术
   前提）；③invariants 随批登记：INV-J 落地句+大小写折叠偏差句+排序键三型适配句。
   **C3 纪律照旧**（简报预注两现+分项计数亲核——本批全零缺失未触第三现）。
2. 节奏沿承（≤2 件/场）：U2 若超载拆 U2a（会话+检索路由）/U2b（任务+装配）两场。
3. U2 毕后：DB-2 UI 面（会话入口/任务卡/审计抽屉/预算设置页〔裁定③〕——承载形态
   呈裁）+e2e 面恢复。

## §2 沿承挂账（裁决部 R 清单映射+沿承——均非阻断）

- **R4/R7 断言强化三件→U2 顺带**：edges 二段级联断言锁（机制已 probe-fk2 实证推定）
  /空锚级联场景/杜撰值采样 paper·lineage 各 1 枚（现仅 global 1 枚）。
- **R5 核对结论（登记）**：C3 计数失实两现（U2/U3 场）=executor 报告计数申报缺陷
  （非模块代码 bug）——「同类缺陷二次触发即重构」条款对象为代码缺陷，不适用；
  处置=C3 纪律条款在册（预注+亲核），本批零触发。
- **R6 路由偏好（登记）**：同票门一参与座宜回避裁决部终裁座——本场 k3 座双角色
  合规（用户路由令约束+晨场承载先例+d1 面独立覆盖+probe 矩阵实质独立性），后续
  额度允许时回避。
- 沿承沿承：flake :1030 count=2 filed（再现首取 error-context.md 快照）/adjudicator
  R 清单（v169 §2）/N 级卫生票池（v168 §2）/物理命名漂移（后续文本一律物理名）/
  账本 ts 取系统时钟。
- **主控手算教训两条（本场新增，供后续简报基线数字段）**：多重集计数须申明排除
  sqlite_* 隐式件（sqlite_sequence+autoindex——全行口径 57 vs 逻辑 53）；FTS 表对象
  含影子表 4 枚（_config/_data/_docsize/_idx）。

## §3 待用户面

1. F-UIRES-04 C/D 呈裁（沿承——等批 1a 探针时机随批）。
2. DB-2 UI 面承载形态（DB-4 窗或独立票）——U2 毕后呈。
3. 预算设置页（裁定③）落位时机——随 UI 面呈。

## §4 基线与治理

- HEAD=23154b4b4fd（U1 单笔）+v171 本笔。工作树=clean。
- verify：**EXIT=0 亲验**（278 文件/2866 用例；主控收口 11:20-11:23+probe P9 双跑）；
  指纹门 **306·2968·9729·skipSites 10·豁免 0**（基线随批再生成——44 条临时豁免
  reason+rulingLink→regen retiring 44/added 44→终态空 0/0/0；diff 审计恰 15 件预期
  文件 +738/-64 无夹带）；locks **392**；MIGRATIONS/user_version=**20**；e2e 未跑
  （零 UI/服务面变更——基线 102/102 沿承）。
- **数字对账注（裁决部 C2 落实）**：用例 2943（批前）+23（r0 新测试）+2（r1 两新
  用例：_au 协议锁+跨档穷举）=2968；静态断言 9609+97+23=9729；全量 275+3 文件/
  2841+25 用例；020 对象增量 53=11 表类+5 显式索引+37 触发器（排除 sqlite_* 隐式
  4 件——P6 双口径实证）。
- 账本 941 行（931-941=本场 11 行）。成本分列见 §0。
- 治理：020 头注=T1-T5 终裁+裁定链+分类口径句六条+级联/epoch 语义注记**单源**；
  INV 登记面=U2 随批（§1-③）；F-DBCAMP-01 恒 open（DB-2 阶段进行中，无翻面）。

## §5 证据档指针（仓外 scripts-audits/20261009-dbcamp-db2a/）

- 设计：u1-brief.md（六段简报+T1-T5+覆盖矩阵）；taxonomy 审核=会话转档（账本 932）。
- 实现：u1-impl-report.md+r1；executor 探针 4 件+succession 脚本+count-asserts+
  probe-mutate-001（016 真源方法学发现）。
- 门一：u1-gate1-package.md（1291 行）+u1-gate1-r1-package.md（1023 行）；双席四轮
  报告=会话转档（账本 934/935/937/938）。
- 门二：u1-p-matrix.md+u1-p1..p9.raw.txt+u1-p-smoke/cascade/g2.mjs+
  objects.json（57 件全名）+u1-p-verify.raw.txt。
- 主控：probe-rt-fk{.mjs,-out.txt}/probe-fk2/gen-exemptions.mjs；收口
  u1-verify-close.raw.txt；账本写入件 rows-*.json×6+append-ledger.mjs。
