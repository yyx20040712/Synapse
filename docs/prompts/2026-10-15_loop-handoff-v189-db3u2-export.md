# 交接书 v189 —— DB-3 U2 导出面批收官（envelope E2E+设置页密钥节+QR）（2026-10-15）

> 前承 v188（§1 开工序=DB-3 U2 导出面——票面必携三件首场践行）。
> 本档=**U2 批单源**（实现两轮+门一三轮+门二双部+设计书 r5 勘正）。
> **下场开工序=§1。**

## §0 本场总账（runId=20261015-db3u2；账本 8+2 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点 26 项（用 4/备 1/不用 21）+配置自查+调研**三发现定谳**（①collections/tags/paper_tags 无 updated_at 列——§13.6 行序字面不可达→简报预裁逐表矩阵；②papers.sha256 派生 blob_id=导出零文件读；③零 QR 依赖→仓内纯 TS 编码器定档） | session-open 在档 |
| U2 实现 | ops-executor 两轮：**snapshot 域 5 通道**（getSyncKey/exportToFile/importPeerKey/listPeerKeys/removePeerKey——闭包活锚 75→80/域 20→21/前缀 +snapshot）+**snapshot.repo**（ensureSyncKey〔装配闭包 ensureIdentity 后一行〕/nextSnapshotSeq+commit〔首导 1·取消零耗·commit 后+1〕/peer key 三法/九表读面〔行序矩阵+显式列清单+死置列 tags/kind 入面〕/deletion_events 只读全量）+**envelope.codec**（canonical/HKDF 三钥〔salt=synapse/dbcamp01/v1.3〕/AES-256-GCM/HMAC——**AAD 两段面**）+**export-snapshot.service**+**ipc**（先构建后弹框+CANCELLED+atomicWriteFile 落盘后 commit）+**SyncKeySection**（bundle 文本+复制+QR+导入单入口+对端列表+导出按钮）+**仓内 QR 编码器**（byte/M/v1-10/掩码自动，476 行零依赖）+六测试件（39+新增用例；回放测试族/RS 独立 GF 复刻/PRAGMA table_info 独立源/级联超集行为锁）；受锁涟漪 5 件+check-quality 两处（COMPOSITION_ROOT_ALLOW +AiAssistantSection 行/清理死条目+SAME_VALUE_EXEMPT_PROPS +--qr-bg——判例同型两席+终裁维持）+指纹门豁免 29 条（组名活锚 75→80 旧身份淘汰）+manifest 429→435；**guard 零触+既有九 repo 零触碰红线保持** | 两轮 verify EXIT=0（终态 310/3327/435） |
| 门一 | k3+d1 双席（**FAIL B1/W3/N11+PWC W7/N9**——B-1=QR 格式信息 30 单元未保留=产码不可扫〔主控亲验成立；票面测试策略盲区=主控简报缺陷如实定性〕；d1 最重=exportToFile 零 renderer 入口）→主控 R1-R12 全处置→**k3 delta 复审 PASS（B0/W0/N3）**（新 N1 措辞勘误已清偿/N2N3 挂账） | 审链在档 |
| 门二 | ops-probe 实证 **8/8**（verify 亲跑三数对账+envelope 独立复算六对账〔纯 node:crypto 第三方——AAD 两段面 GCM 解密过〕+确定性 4/4+seq 3/3+级联超集纯 SQL 6/6+peer key 3/3+QR 结构 7/7+治理面）+ops-adjudicator 终裁 **GO_WITH_CONDITIONS**（条件 3=C-1 设计书勘正/C-2 归档/C-3 挂账——**三条件全兑**；登记 7=R-A~R-G；独立复算 15/15 命中；AAD 两段化独立裁=安全性质无净损失、源头=设计书字面循环主控起草缺陷定性） | 终裁在档 |
| 主控亲笔 | 设计书 **§10 r5 行+§13.6 两处勘正**（①AAD 两段面句——原「GCM 以同 canonical envelope 字节为 AAD」含 tag 定点循环物理不可达；②canonical 行序逐表矩阵句）+C-2 delta 档归档补齐+回炉报告勘误补记+账本 8 行 | 同批在库 |

成本=executor 40,399,743+12,880,765+k3 6,827,107+865,937+d1 4,088,120+probe
1,907,870+adjudicator 4,631,513+主控 host（token=会话统计口径——账本 units 字段）。
**本场一件**（节奏 ≤2 件/场沿承；U3 留下场）。

## §1 下场开工序（单源）

1. **DB-3 U3 导入合并面**（六段简报派发 executor；门一=k3+d1 双席）：六闸接收
   流程+A7 冲突登记+拒收可见性（原因码表 self_reimport/struct_invalid/version_
   mismatch/schema_newer/hmac_fail/decrypt_fail/seq_stale/seq_conflict/hash_
   mismatch/counts_mismatch）+防复活过滤（INV-132 硬验收=create 路径复核+行为锁）
   +演练八+⑨断言集（W6 收口门）+FTS×3 重建。
   **票面必携（义务包沿承+本场增补，缺一即简报不合格）**：
   ①r4 勘正前提（级联超集口径——§10 r4 硬句）；②r5 勘正前提（**AAD 两段面
   口径——§10 r5/§13.6 勘正句：MAC 面=去 hmac 键 canonical 全字节、AAD 面=同构
   唯 payload 槽空串占位；U3 闸②④复算必按此同构**）；③guard 写协议=导入事务
   内置 1→直执→复位 0 同事务+「guard 只许 UPDATE 单行」红线句（k3-N3）；④U3
   开 guard 写面**前**先补多行态定向锁（k3-r1-N1）；⑤**R-A：codec 补
   decryptEnvelope 导出+verifyEnvelope 原因码细分**（闸①②④直供——k3-N7/d1-N4
   两席同源+终裁 R-A）；⑥**R-C：种子行处置定夺**（012 `__main__`/010
   `lineTypes` epoch 哨兵随卷导出已锁——闸⑤按 PK 还是 (updated_at,id) 比较+导入
   幂等语义显式化）；⑦**R-G：级联落账序事实注**（P5 实测=FK 级联子表触发器
   先于父表落账，seq 序=edges→nodes→notes→annotations→paper_tags→papers——
   设计未约序，U3 直执序与账面序无耦合依赖但简报须知）；⑧U2 挂账顺手窗：
   **R-B 恒真断言两行清偿**（qr-encode.test.ts:166-167，[locked-change] 随 U3
   测试面）+**R-D 豁免 29 条 regen 清零**（U3 触 test-surface 变更时顺手 baseline
   regen——U1 先例）；⑨**R-E：nextSnapshotSeq NaN 传染收紧**（非数值存量值——
   U3 触 snapshot.repo 时顺手显性 throw）。
2. U4 协议契约文档（§13.8 切分；服务端任务书面 N6——设备清单/幂等键=(owner_id,
   snapshot_seq)/吊销/E2E 契约+§13.9 落定回写；每场 ≤2 件沿承）。
3. DB-4 治理收尾沿承 v169/v184；F-GEOMASSUME-01 低优先顺带窗沿承 v186。

## §2 沿承挂账

- v188 §2 全数沿承（k3-N1 ORG-SEG 残句/k3-N2 vestigial 措辞/S5a case 21
  observing——第二现即立案/⑤⑥已销项）+v184/v185/v186 沿承面不变。
- 本场新增登记：①**R-B** 恒真断言两行残留（qr-encode.test.ts:166-168——
  `dataA & 7` 值域恒 0..7；实质锁已由回放族承载，清偿=删两行走 [locked-change]
  ——触测试面指纹门，随 U3 测试面批）；②**R-F** QR v9/v10 真机扫码+非均匀块
  交错（v8-v10 43/44 型）实扫复核（低危——产能面恒 101B→v6 不可达；v1-8 逐位
  对齐公开表+v10 RS 代数锁在档；留用户实测/U3 演练面）；③**R-E** nextSnapshotSeq
  对非数值存量值 NaN 传染（不可达潜伏——app_meta 键域受控；U3 顺手收紧）；④
  **R-D** 指纹门豁免 29 条台账在册（不清零=注册制语义两席+终裁维持；U3 触面时
  regen 吸收）；⑤流程观察（不追责）：d1-W7 W 级未入回炉 R 表/不做项清单=
  静默降级灰色带——后续批次「W 级不处置必显式入不做项」纪律化（adjudicator
  建议）；⑥PEER_SYNC_KEY_PREFIX 命名沿承（简报③-2 概念名 vs 实现顶层常量——
  零行为面，档面对齐即可）；⑦SQL 标识符 const 白名单拼接维持（d1-N7——语义内
  边缘+注释申报在档）；⑧报告措辞级留档：r1-red 红因=TypeError 缺导出形态红
  （30 位灭失实锤归 r1-mutation——主控勘误补记在档）。
- 事故档回流状态行（固定段）：本批无新教训入 `AI辅助开发经验教训.md`
  （r5 勘正=设计书事实修正非规程教训；既有规则零改动）——未回流项=无。

## §3 待用户面

无新增待裁项（v187 §3 八项已落定沿承；S5a/E5 挂起族=observing 第二现自动触发
无需动作）。**观察项一件（非裁决）**：QR 真机扫码复核（R-F）——设置页同步密钥
节二维码用任意手机扫码器实测可读性=用户方便时反馈即可（数学面已由回放测试族+
RS 代数锁+结构断言三面坐实）。

## §4 基线与治理（本场终态）

- HEAD=本批一件（snapshot 域五件套+六测试件+受锁涟漪+闭包活锚+豁免 29 条+
  check-quality 两处+manifest 435+设计书 r5+交接书 v189）。
- verify：**收口主控亲验 EXIT=0**（310 文件/3327 用例/locks 435——三通道一致：
  impl 两轮/probe 亲跑/主控终验）。
- CI：push 后按宪法 DoD 挂完成复查回执闭批（账本 ci-receipt 行承载——本档
  落笔时点在 push 前，非 success 按 DoD 处置口径走）。
- registry：零改动（F-DBCAMP-01 伞下单元制沿承；U2 无票面状态变化）。
- 治理基线行：registry 286 票（open 12/done 274）；locks 435；测试面 310 文件
  3327 用例；通道 80/域 21（实测）；COMPOSITION_ROOT_ALLOW 16 行（实测）；
  .git 75M。
- ADR/architecture 触及=**如实申报零新 ADR**：DB-3 演进仍由 ADR-0025 既有单源
  指针承载——设计书 §10 r5 修订记即演进记录，architecture §5 引用无漂移。

## §5 证据档指针（仓外档案区）

- 本场=/home/yyx/synapse-archive/scripts-audits/20261015-db3u2/（session-open.md
  〔技能清点+配置+调研三发现〕/u2-briefing.md〔六段简报单源〕/u1 对位 u2-impl.
  report.md+u2-rework.report.md〔含勘误+主控勘误补记〕/gate1-k3·d1·k3-r1 三
  报告/gate2-probe·adjudicator 两报告/g2probe-*×8+progress.md/u2-*-red·
  mutation.raw.txt 红证族/u2-full.diff+u2-full-r2.diff 双 diff 包/u2-verify+
  u2-rework-verify.raw.txt/u2-fingerprint-pre/post.raw.txt）。
- 账本：runId=20261015-db3u2 十行（session-open+impl+gate1-audit×2+impl-rework+
  gate1-audit〔k3 r1 delta〕+gate2-probe+gate2-adjudication+batch-close+
  ci-receipt〔push 后〕）。
