# 交接书 v190 —— DB-3 U3 导入合并面批收官（六闸+导入入口+演练九）（2026-10-15）

> 前承 v189（§1 开工序=DB-3 U3 导入合并面——义务包九项）。
> 本档=**U3 批单源**（实现+回炉一轮+门一三轮〔双席 FAIL→delta 复审〕+门二双部+设计书 r6 勘正）。
> **下场开工序=§1。**

## §0 本场总账（runId=20261015-db3u3；账本 11 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | automation 凌晨 2 点触发（用户 2026-10-14 指令）：空闲检测过（git clean+远端同步+账本 47min 静默）+技能清点 4 用 1 备+调研实照（FK 全景→upsert 父先子后序/闸⑤比较键三表不可达→R-C 预裁/FTS×3/通道 80→81） | session-open 在档 |
| U3 实现 | ops-executor 两轮（13 单元+回炉 R1-R10）：**decodeEnvelope**（R-A 四段原因码+verifyEnvelope 薄包装零行为变化）+**import-snapshot.repo**（274 行：九表 upsert〔TABLE_SPECS 单源全列写面——回炉 R1「出库真值/入写真值」〕+FK 父先子后表序+guard 两法〔UPDATE 单行红线〕+水位 recv_seq/导入日志 import_log/拒收统计三键+FTS×3 重建〔**'delete-all'+显式列映射**——票面 'rebuild' 语法本 schema 炸列被探针推翻，等效替代〕）+**import-snapshot.service**（299 行：六闸编排——R2 重排后主路径序=形状→self_reimport→format→schema_newer→counts 键集→未配对 hmac_fail→decode→③seq 决策表〔noop 先于水位〕→④b 对账；闸⑤逐表矩阵三分支+A7 行级+防复活过滤；闸⑥单事务=guard 1→直执→FTS→水位→日志→复位 0）+**snapshot 域第 6 通道 importFromFile**（80→81）+**ipc openFile 先例**+**SnapshotImportButton**（79 行外提件+十码中文映射）+SyncKeySection 导入钮+guard 多行态定向锁（k3-r1-N1 首任务）+R-B 恒真断言删+R-D 豁免 29→0 regen 清零+R-E NaN throw；+48 用例（3327→3375：service 20+repo 14+codec 4+ipc 3+renderer 6+guard 1） | 两轮 verify EXIT=0（终态 312/3375/437） |
| 门一 | k3 席认证失败（Provider authentication failed——账本实录+换源 k1 替补）→**k1+d1 双席均 FAIL**（**B1 双源互证**：lineage_edges.kind 非死置列〔写面恒 'manual'/DDL 默认 'tree'〕——「死置列不写×全列 A7 比较」=含 edge 库每轮同步永久假冲突，演练⑨ 结构性盲区=主控简报③-4 预裁缺陷）→主控 R1-R10 裁决（R1=甲案全列写面/R2=明文预检前置/R4=decrypt_fail 统一主路径…）→回炉全处置→**k1 delta 复审 PASS（B0/W0/N6）** | 审链在档 |
| 门二 | ops-probe 实证 **9/9**（verify 亲跑+B1 修复独立复演〔真实写面+红组判别力〕+六闸报码 12/12 独立复算〔手写 canonical+HKDF 零 codec import〕+防复活跨卷+guard 直执不落账〔deletion_events 0→0〕+FTS 检索命中+幂等键面+级联超集六面复核+canonical 字节级+治理面）+ops-adjudicator 终裁 **GO_WITH_CONDITIONS**（条件 3=C1 INV-132 回写/C2 设计书 r6/C3 [locked-change]+CI——**三条件随收口全兑**；登记 11=R-01~R-11；独立复算 11 项全中；B1 红证反向坐实+R1 安全边界独立补强） | 终裁在档 |
| 主控亲笔 | 设计书 **§10 r6 行+§13.2 闸⑤比较键逐表矩阵**（三处勘正：闸⑤矩阵/死置列「出库真值入写真值」/闸序实现分叉申报+__main__ position 容忍注）+invariants.md **INV-132 行回写已兑现**（四源同点欠账清偿）+门一/门二六份报告代落+账本 11 行 | 同批在库 |

成本=executor 39,257,924+17,455,069+k1 7,955,922+955,566+d1 6,123,067+probe
3,984,842+adjudicator 2,327,820+主控 host（token=会话统计口径——账本 units 字段）。
**本场一件**（节奏 ≤2 件/场沿承；U4 留下场）。

## §1 下场开工序（单源）

1. **DB-3 U4 协议契约文档**（设计书 §13.8 切分；服务端任务书面 N6）：设备清单/
   幂等键=(owner_id,snapshot_seq)〔§13.5 已定〕/吊销（库级粒度——吊销库 token 即
   吊销其唯一上传端）/E2E 契约（§13.6 全文引用）+§13.9 落定三项回写核对。
   纯文档批（分级烤验候选——门一单审+主控亲验机检矩阵，R5 修订四口径）。
   每场 ≤2 件沿承。
2. DB-4 治理收尾沿承 v169/v184；F-GEOMASSUME-01 低优先顺带窗沿承 v186。
3. kimi-main 源A 认证失败复测（本批 k3 席实录）——下批门一派发前跑
   `node scripts/log-triage.mjs --health` 择席；源A 恢复则回默认席 k3，未恢复
   沿 k1（kimi-third 座）。

## §2 沿承挂账

- v189 §2 全数沿承（k3-N1 ORG-SEG 残句/k3-N2 vestigial 措辞/S5a case 21
  observing——第二现即立案）+v184/v185/v186 沿承面不变；R-F QR 真机扫码观察项沿承。
- 本场新增登记（adjudicator R-01~R-11+delta N 系去重后）：①**R-02** rebuildFts
  服务层调用无行为锁（防御步，repo 层独立锁——触发器自动维护面兜底）；②**R-03**
  graph_meta 含 '|' keyArgs 截断面（键域应用常量不可达）；③**R-04/R-05** 回炉
  锁定锁与捆绑红证形态注记；④**R-06** 边角报码序（payload 非 base64×未配对
  →hmac_fail——fail-closed 不破，不建议动）；⑤**R-07** deletions 条目
  seq/deleted_at/多余键不校验（零行为面）；⑥**R-08** __main__ position 异库
  播种分叉=A7 正常可见性（设计书 r6 已留注）；⑦文书级：R-09 简报前缀集算术
  瑕疵/R-10 派发括注非锁件计数差 1/R-11 probe 探针构造面修正两起（如实申报）。
- 事故档回流状态行（固定段）：本批无新教训入 `AI辅助开发经验教训.md`
  （r6 勘正=设计书事实修正非规程教训；既有规则零改动）——未回流项=无。

## §3 待用户面

无新增待裁项。**观察项一件（非裁决）**：kimi-main 源A（ops-gate1-k3 承载源）
本批派发认证失败——用户方便时检查该源额度/登录态（k1 替补席本批全承载无碍，
门一审链完整性不受影响）。

## §4 基线与治理（本场终态）

- HEAD=本批一件（decodeEnvelope+import-snapshot.repo/service+第 6 通道+
  SnapshotImportButton+SyncKeySection+guard 多行态锁+受锁涟漪 15+2+设计书 r6+
  INV-132 回写+交接书 v190）。
- verify：**收口主控亲验 EXIT=0**（312 文件/3375 用例/locks 437——三通道一致：
  impl 两轮/probe 亲跑/主控终验）。
- CI：push 后按宪法 DoD 挂完成复查回执闭批（账本 ci-receipt 行承载——本档
  落笔时点在 push 前，非 success 按 DoD 处置口径走）。
- registry：零改动（F-DBCAMP-01 伞下单元制沿承）。
- 治理基线行：registry 286 票（open 12/done 274）；locks 437；测试面 312 文件
  3375 用例；通道 81/域 21（实测）；COMPOSITION_ROOT_ALLOW 16 行（未新增例外）；
  baseline 345/3489/11654+exemptions 0（指纹门清零态）。
- ADR/architecture 触及=**如实申报零新 ADR**：DB-3 演进仍由 ADR-0025 既有单源
  指针承载——设计书 §10 r6 修订记即演进记录，architecture §5 引用无漂移。

## §5 证据档指针（仓外档案区）

- 本场=/home/yyx/synapse-archive/scripts-audits/20261015-db3u3/（session-open.md
  /u3-briefing.md〔六段简报单源〕/u3-impl.report.md+u3-rework.report.md〔R1-R10〕/
  gate1-k3 故障实录〔账本行〕+gate1-k1·d1·k1-r1 四报告〔k1/d1 主控代落〕/
  gate2-probe·adjudicator 两报告〔adjudicator 主控代落〕/g2probe-*×9+progress/
  u3-*-red·mutation.raw.txt 红证族/u3-full.diff+u3-full-r2.diff 双 diff 包/
  u3-verify+u3-verify-r2.raw.txt）。
- 账本：runId=20261015-db3u3 十一行（session-open+impl+gate1-audit×3〔k3 故障/
  d1/k1〕+impl-rework+gate1-audit delta+gate2-probe+gate2-adjudication+
  batch-close+ci-receipt〔push 后〕）。
