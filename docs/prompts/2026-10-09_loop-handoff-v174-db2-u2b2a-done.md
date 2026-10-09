# 交接书 v174 —— DB-2 020-U2b-2a 装配引擎（前半）收官·U2b-2b 尾段候场（2026-10-09）

> 前承 v173（取代制）。本档=接棒会话（runId=20261009-dbcamp-db2d，用户令
> 「[$ai-dev-org] v173 交接书」）完成 **020-U2b-2a 装配引擎前半+必接三件收官**
> 的单源。**下场开工序=§1。**

## §0 本场总账（runId=20261009-dbcamp-db2d，账本 972-983）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点+主控拆场预裁（U2b-2 拆两场：本场=U2b-2a 估计器+L1/L2+缓存键+必接三件+INV 两句——v173 §1-2 授权）+开工调研（设计单源+数据面+服务面全走查；两新发现不阻断：notes 单笔记模型〔配额自然吸收〕/edges.kind 恒 manual〔014 退役〕）+账本勘正（v173 申报 974 行实测 971） | 972 |
| 简报 | 六段全量（预裁 P1-P14+基线手算：预期 56 用例/289 文件/locks 403） | 仓外 u2b2a-brief.md |
| 实现 r0 | src 新 5（estimate 71/repo 266→254/service 369→354/recovery 21/handlers 221）+改 4+INV-J/INV-129 落册+测试新 4 改 5=+60 用例+3 桩行；自裁 10 条；变异 M1-M8 | 973 |
| 门一首轮 | k3 B0/W1/N6+d1 B0/W3/N10 双 PWC（k3-W1=幽灵锚 emptySources 重复；d1-W1=noteStmt 无序/W2=INV-129 三处枚举不一致+W 型 4 表计数矛盾〔主控简报措辞传导〕/W3=insertWithEviction 原子性未核） | 974-975 |
| 回炉 r1 | 13 实修+1 不采纳登记（d1-N6 提交期窗口）+5 新用例（X31/X32/C10/G19/R29——3 先红后绿+2 变异注入 M9/M10）；主控亲验三案：d1-W3 销（db.transaction 单事务头注亲核）/d1-N8 升 W（target null TypeError 真实缺口）/d1-W2 责任归简报 | 976-977 |
| delta 复审 | k3 放行 B0/W0/N3+d1 PWC B0/W1/N4（W1=变异证据未落档） | 978-980 |
| r2（N 级免审口径主控亲笔） | 4 项微处置（X15 残余恒真删/idempotencyKey 位序定档注/R29 哨兵注/册句 collections 措辞）+主控亲跑 M9/M10 红证落档（销 d1r1-W1）+DDL 亲核（销 d1r1-N3：tags/collections/paper_tags 均无 updated_at 列）+verify EXIT=0（断言 10303→10302 精确吻合删 1） | 979,981 |
| 门二 probe | 八项全 GREEN（P1 估计器 11/11+探针 18/18/P2 字节相等真库 ===+失效链+集合外写负面同证/P3 INV-J SQL 零泄漏/P4 隔离 42/42+9/9/P5 骨架 32/32+11/11/P6 必接三件/P7 verify 亲跑 EXIT=0 四组数字对账/P8 三异源变异 sha256 还原逐一相同）；异常 4 条全探针侧 | 982 |
| 裁决部终裁 | **GO**（六面全成立+独立复算 65 精确〔estimate 11+repo 10+context 32+recovery 4+submit 4+run 4〕+无回炉项+残余 4 条全登记） | 983 前一 |
| 收口 | 指纹门 regen（两发现：baseline 写入被锁挡=unlock→regen→apply 序收口纪律；v173 M4/M8 豁免快照随 regen 清出终态 0）→diff 审计（恰 4 新+4 改+stats，cases Δ=+65 精确，零标题改写零豁免）→**verify EXIT=0**（base=cur 317·3159·10302 全等）→提交 64c1a18d6be（21 件 +3348/-312） | 983 |

成本 ≈**45.6M subagent tokens**（executor 两轮 40.05M〔25.88+14.17〕+probe 4.05M+审读面
1.47M〔k3 两轮 284k+d1 两轮 355k+裁决部 834k〕）+主控 host-max（含 r2 亲笔+M9/M10 亲跑
+DDL 亲核）。kimi 面沿承 ops-gate1-k3=kimi-k3 源+裁决部 k3 座（R6 同席三角色注记沿承，
独立对冲=d1 四轮+probe 八项异源矩阵）。

## §1 下场开工序（单源）

1. **U2b-2b=020 服务层件三后半：L3 尾段现算+检索源扩展+校准协议**（设计单源=专项
   报告 §3.C L112-116+L135-157——三轮终态段）。面：
   - **L3 尾段**：①系统自动尾段=当前消息经 §2 路由召回 topK=8（检索域=当前档
     隔离可见集；global 档=助手域记忆）；②代理按需检索结果=assistant 行（已有
     ——任务系统面）；③**尾段 1000 tok 内分配=消息窗保底 500+召回上限 300+
     代理结果上限 200**（装入序=消息窗→召回→代理结果）；lineage 档重分配
     400/600/200 cap 1200（含文献按需展开）。
   - **L3① 检索源扩展**：当前消息经 FTS/LIKE 检索**图内文献域**（title+abstract+
     core_idea+notes）→命中 top-K=5 篇展开「摘要+core idea+top 笔记片」单篇 cap
     250 tok。**开工接缝核对（本场新发现遗留）**：core_idea 域已全退役
     （F-CONTRACTA-01 2026-10-04——lineage_nodes 列死置 '' 写面无该列读面不映射）
     ——报告 §3.C L142 检索域四列与其互斥，**接缝归责停报**：呈裁或按「论文
     abstract+notes 实况」裁减列单（预裁倾向=后者，core_idea 退场后 title+
     abstract+notes 三列）。
   - **图元片源**：graph_meta 键面无锚关联（前置①结论）——若 U2b-2b 触及按需
     展开面需再核对。
   - **校准协议**：代表性语料（中英混排笔记/标注/记忆各≥20 样本）对照目标分词器
     偏差>20% 调系数（estimateTokens a/b 初值冻结在 ai-estimate——校准脚本入
     scripts/ 受锁面，结果落 docs；校准输出项含片 cap/配额余量复核）。
   - **代理拉取预算**：单发≤800/轮合计≤2000（独立子预算超出截断+meta 标注）。
2. **沿承挂账评估面**（非阻断）：digest 扩列（k3-N4/d1-N6——审计抽屉消费面定夺）/
   appendAudit·finalizeRunning·listAudit 类型收窄（d1-N2）/d1-N6 提交期窗口
   （U2b-2b 评估外层 catch）。
3. U2b 毕后：DB-2 UI 面（会话入口/任务卡/审计抽屉/预算设置页〔裁定③〕——承载形态
   呈裁）+e2e 面恢复+DB-3 导出快照批。

## §2 沿承挂账（下场携带——均非阻断）

- **C3 计数失实红线**：本场零触发（60/65 三方对账全精确——executor/主控/裁决部
  三源同数）；**简报数字内部不一致两处**（§4 分项 30 vs §5 写 28/头注 7 新 vs §2
  枚举 5 新）被门一双席抓出责任归主控——下场简报落笔前**分项合计自校**。
- **regen 锁序纪律（本场新得）**：test-surface:baseline 写入会被 locks 挡
  （EPERM）——收口序恒为 **unlock→regen→apply→verify**（v173 无此现象系上场在
  unlock 窗内顺带完成，非机制差异）。
- 沿承：flake :1030 count=2 filed/adjudicator R 清单（v169 §2）/R5 指纹门 Req
  形状=F-REQFP-01 已立票/N 级卫生票池（v168 §2）/物理命名漂移（一律物理名）/
  账本 ts 取系统时钟/打包切片纪律（delta 包取段先 grep 定位）/简报 §6 自验清单
  六件全套（quality:check 必列）。
- 会话技术事实：装配引擎接口=createAiContextService({repos,caps?}).
  assemblePrefix({scope,anchorId})→{cacheKey,prefix,meta} 同步纯读；EPOCH_TABLES
  单源=ai-context.repo（service re-export）；caps 注入=测试触发面（生产=冻结常量）；
  L3 消费面=未来对话管线批（物理缓存同批）；AppErrorCode 复用面不变；受锁面=
  tests/shared/migrations/scripts/configs（src repo 件不入 locks）；repo ≤300/
  文件 ≤500 quality 门。

## §3 待用户面（沿承 v173 §3 增量——均非即刻）

1. F-UIRES-04 C/D 呈裁（沿承——等批 1a 探针时机随批）。
2. DB-2 UI 面承载形态（DB-4 窗或独立票）——U2b-2b 毕后呈。
3. 预算设置页（裁定③）落位时机——随 UI 面呈。
4. U2b-2b 开工呈裁候选：core_idea 检索域接缝（§1-1——列单裁减预裁可代行）+估计器
   系数初值确认（a=1.0/b=0.25 已冻结在案——纯预裁可代行）。

## §4 基线与治理

- HEAD=U2b-2a 单笔 64c1a18d6be（21 件 +3348/-312 [locked-change][test-refactor]）+
  v174 本笔。工作树=clean（收口 git status 亲验 0 行）。
- verify：**EXIT=0 亲验**（close1——regen 后 base=cur 全等）；**289 文件/3057 用例**；
  指纹门 **317·3159·10302·skipSites 10·豁免 0**（基线随批再生成——diff 审计=
  baseline-diff-audit.txt：恰 4 新测试文件+4 改+stats；cases Δ=+65 精确；断言
  10121→10302〔+181〕；removed=0 零标题改写零豁免流程）；locks **403**（399+4 新
  测试件）；MIGRATIONS/user_version=**20** 不变；e2e 未跑（U2b-2a 零 UI/IPC 变更
  ——基线 102/102 沿承）。
- 数字对账注：+65=60（r0：estimate 11+repo 9+context 30+recovery 4+submit 3+run 3）
  +5（r1：X31/X32/C10/G19/R29）；cases 3094+65=3159；全量 285+4 文件/2992+65 用例；
  locks 399+4=403（4 新测试件；src 新 5 件不入受锁面）；ai-tasks.service 物理
  501→366（handlers 外移 221 行净减 135——N-1 禁膨胀约束兑现）。
- 账本 983 行（972-983=本场 12 行）。成本分列见 §0。
- 治理：INV-J 落地句+INV-129 排序键三型句已随批登记锚定（r1 勘误+r2 措辞收口——
  三处头注与册句对账一致）；F-DBCAMP-01 恒 open（DB-2 阶段进行中）；U2b-2a 零
  IPC 零 shared 零 migrations（服务层读面批）；architecture/ADR 无触及如实申报
  （无新实体无 DDL——报告 §3.C 前半落地回写归 U2b-2b 收口一并，本场不触及）。

## §5 证据档指针（仓外 scripts-audits/20261009-dbcamp-db2d/）

- 简报与审包：u2b2a-brief.md（六段+预裁 P1-P14+手算）；u2b2a-gate1-package.md
  （2786 行首轮自包含）；u2b2a-gate1-r1-delta.md（267 行 delta）。
- 主控：mc-m9-m10-mutation-record.md（亲跑变异红证——销 d1r1-W1）+baseline-before
  .json+baseline-diff-audit.txt+mc-verify-1/2.raw.txt+u2b2a-verify-close1.raw.txt
  （EXIT=0 全量）+rows-*.json 12 件（open/impl-r0/gate1-r1 双席/remediation-r1/
  gate1-delta-r2 三行/probe/adjudicator/verify+batch-close）+append-ledger.mjs。
- 门二：probe/ 子目录 17 件（p0 桥/p1-p8 探针与输出/p7 verify 全量/p8 变异
  pre-hashes+红绿双态）。
