# 交接书 v191 —— DB-3 U4 协议契约文档批收官（DB-3 战役 U1-U4 全毕）（2026-10-15）

> 前承 v190（§1 开工序=DB-3 U4 协议契约文档）。
> 本档=**U4 批单源**（主控亲笔+门一单审有条件放行→回炉→delta 放行）。
> **下场开工序=§1。**

## §0 本场总账（runId=20261015-db3u4；账本六行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | automation 一次性任务触发（用户 2026-10-14 指令，06:00:51 CST）：空闲检测过（index.lock 无+工作区命中仅本会话 MCP〔父进程在自链〕+他项目会话不构成占用）+技能清点 2 用 4 不用+交接文档取运行时最新 v190（基线自 v188 前移两批——U2/U3 昨夜 automation 场落账） | session-open 在档 |
| U4 亲笔 | **docs/design/2026-10-15_f-dbcamp01-db3-protocol-contract.md**（终态 241 行）：§1 范围边界（v1 文件载体/v2 通道载体 envelope 格式不变）/§2 设备清单（库级粒度——owner_id+device_token 018 实照+服务端清单契约要求+定夺项标法）/§3 上传幂等（键=(owner_id,snapshot_seq)/同内容 no-op/同键异内容=建议策略拒收对齐〔定夺=v2〕）/§4 E2E 契约=**§13.6 全文转录**（探针去空白 2718/2718 equal 逐字保真）+实装锚注（envelope 九键表/两段面/HKDF 参数/键面/六闸十码/blob 契约）/§5 吊销（仅断上传通道·与密钥轮换正交）/§6 **§13.9 三项回写核对=全兑现零漂移**/§7 服务端任务书承接清单六项/§8 修订记含同步义务 | 两轮 verify EXIT=0（312/3375——纯文档批零漂移） |
| 门一 | 择席 k1（log-triage 双窗推荐一致——源A 无恢复实证，回席复测留待有实证后）。单审=**有条件放行 B0/W2/N3**（W-1 §4.1「§5 词汇表」悬空指针；W-2 同键异内容策略断言未标定夺项；N-1 修订态口径/N-2 枚举漏卷数量/N-3 八项超事实单面）。审包≈12k tokens 超 ORG-12 目标=纯文档批双件对账结构性必需（申报在包） | 审链在档 |
| 回炉 | 主控四笔修正（W-1 指针→§4.3/W-2 建议策略+定夺标法+§7-2 联动/N-1 头部口径收敛「§13.6 面含至 r5；r6 触及 §10/§13.2」/N-2 补卷数量）+N-3 八项对仓亲验零改动（snapshot.repo 头注/§13.4 空键/v190 applied 面/组件函数名/HEAD/票面中继云/v189 R-F）+§8 回炉注记；转录探针复跑 equal 保持；悬空指针/口径残留 grep=0 | 终态 241 行 |
| delta 复审 | 同席续审（W 级在处置集→免审口径不适用）=**放行 PASS B0/W0/N0**：两 W 修正面逐字核对全清偿、联动互锁无残留、新发现零 | 报告在档 |
| 收口 | 单件=契约文档+本交接书；verify 亲验 EXIT=0；push 后挂 CI 回执闭批（DoD） | 见 §4 |

成本=主控 host+k1 47,813+delta 51,524（token=会话统计口径——账本 units 字段）。
**本场一件**（DB-4 重批不宜搭车——单件收场）。

## §1 下场开工序（单源）

1. **DB-4 治理收尾**（F-DBCAMP-01 末单元，沿承 v169/v184 口径）：papers.delete
   文件清理处置+存量治理+verify/locks 全量+两票 UI 面翻 done+F-TAGS-02 残余
   R1-R3 吸收。实现批（全对抗位：双审 k1+d1+门二）。
2. F-GEOMASSUME-01 低优先顺带窗沿承 v186。
3. ~~源A 认证失败复测~~ **已闭**（2026-10-15 用户裁决：昨夜失败=撞 5h 限额，
   额度已恢复——逐字入账本 ruling 行）→**下场门一回默认席 ops-gate1-k3**；
   派发前 `log-triage --health` 例行照跑（健康择席沿承，非回席前置）。
4. v2 服务端立项（若用户启）＝以
   docs/design/2026-10-15_f-dbcamp01-db3-protocol-contract.md 为契约输入
   （§7 承接清单六项+两定夺项）——战役外任务书（N6）。

## §2 沿承挂账

- v190 §2 全数沿承（k3-N1 ORG-SEG 残句/k3-N2 vestigial 措辞/S5a case 21
  observing——第二现即立案）+v184/v185/v186 沿承面不变；R-F QR 真机扫码
  观察项沿承。
- 本场**零新增登记**（delta 复审 B0/W0/N0；一审 N 系全清偿或采信关闭）。
- 事故档回流状态行（固定段）：本批无新教训入 `AI辅助开发经验教训.md`
  （纯文档批零规程触发；既有规则零改动）——未回流项=无。

## §3 待用户面

本场收口后用户三项裁决（2026-10-15，逐字入账本 ruling 行）：①本场就此
收场；②v2 服务端立项=**维持缓议**（待真实多人聚合需求——协议契约文档已
冻结随时可作任务书输入）；③源A 已恢复（撞 5h 限额）——观察项闭，下场
门一回 k3。**当前无新增待裁项。**

## §4 基线与治理（本场终态）

- HEAD=本批一件（契约文档+交接书 v191——DB-3 战役 U1-U4 四单元全毕）。
- verify：**收口主控亲验 EXIT=0**（312 文件/3375 用例/locks 437——回炉后
  终态复跑）。
- CI：push 后按宪法 DoD 挂完成复查回执闭批（账本 ci-receipt 行承载——本档
  落笔时点在 push 前，非 success 按 DoD 处置口径走）。
- registry：零改动（F-DBCAMP-01 伞下单元制沿承）。
- 治理基线行：registry 286 票（open 12/done 274）；locks 437；测试面 312
  文件 3375 用例；通道 81/域 21；COMPOSITION_ROOT_ALLOW 16 行；baseline
  345/3489/11654+exemptions 0（指纹门清零态）——全场零漂移。
- ADR/architecture 触及=**如实申报零新 ADR**：契约文档为 DB-3 演进交付件，
  ADR-0025 既有单源指针无漂移；architecture §5/§6 无 schema 变更面。

## §5 证据档指针（仓外档案区）

- 本场=/home/yyx/synapse-archive/scripts-audits/20261015-db3u4/（session-open.md
  /gate1-k1.report.md+gate1-k1-delta.report.md〔delta 主控代落〕/
  u4-verify.raw.txt+u4-verify-r2.raw.txt 两轮亲验/探针=会话 /tmp 一次性件
  〔转录保真 verify_transcription.mjs 结果 equal 双跑入 ledger〕）。
- 账本：runId=20261015-db3u4 六行（session-open+impl+gate1-audit+impl-rework
  +gate1-audit delta+batch-close〔+ci-receipt push 后〕）。
