# 交接书 v187 —— k3 审查席固化（用户裁决）+DB-3 开工面收官（repos 预裁+v1.3 设计落纸四轮闭环）（2026-10-14）

> 前承 v186（§1 开工序=DB-3 导出快照批〔repos 预裁先行〕/DB-4/F-GEOMASSUME-01）。
> 本档=**k3 席固化批+DB-3 设计面（v1.3 落纸+双源复审链四轮）单源**。
> **下场开工序=§1。**

## §0 本场总账（runId=20261014-db3；账本九行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点+配置自查+开工调研（repos 双件 299/300 wc 实测；**pk 形态实测推翻 021 uuid 前提**——文献域全表 id=TEXT+randomUUID()（001/notes:115/annotations:167 实照），自增仅 020 AI 族且 α 裁决恒本地不同步；export_ 目录=既有文献导出面辨析；三审六项落纸条件权威摘录=账本行 836——原档随 10-12 迁移失存） | session-open 在档 |
| 用户中途裁决 | **k3 审查席固化**（逐字=账本 ruling 行）：本项目门一默认席=ops-gate1-k3（kimi-main 源A）——AGENTS 三屋段+methodology §4.5+账本+session-open 四处落笔；k1/k2 退额度兜底、d1 双审第二席沿承；同句清除派发器退役死句 | 固化在库 |
| k3 固化批 | 小批分级烤验=k3 单审（新席首单）**PASS B0W0N2**+verify EXIT=0（303/3262/427 与 v186 零漂移）+commit **33f57f6a**+push；CI attempt1 红=**S5a 挂起型 CI 首现**（1.5m 测试超时+90s teardown 双层挂起非断言红，26/114 中止——与批内容零因果）→attempt2 复跑 **success 全绿**=非确定失败单现闭批；N1=ORG-SEG ds-call 残句与 methodology「已退役」显性互斥（后续技能同步批优先清偿）/N2=「主通道」vestigial 措辞——均登记后续文档批候选 | 闭批在档 |
| DB-3 预裁 | repos 299/300 压线**零接触政策**（账本 ruling 行）：两压线件均 AI 域 repo，DB-3 导出面=文献域自然零接触（diff 审计红线）；新文件承载+迁移面触发器（服务层零侵入）；不可避免须改两件→停手先按 *.rows.ts/*.queries.ts 范式拆件 | BLOCKED 解除在案 |
| v1.3 落纸 | 设计书 §13 全文（v1.2→v1.3+§2/§3/§5.b 三处存史指针注）：A1 删事件日志协议（021 表+UNIQUE 去重+九表 AFTER DELETE 触发器族+WHEN 守卫+append-only 拒写+envelope 全量携带+直执幂等）/六项落纸条件七面对位闭合/021 号改派（uuid 前提被实测推翻）/R4 空键=水位 0 懒初始化+recv_seq 分键/R5 库级 token 定夺（设备级细分不采论证）/A8 E2E（AES-256-GCM+HKDF 三钥+HMAC 全字段+AAD+canonical 规则+blob 密钥化标识+零新依赖）/九表清单（排除 ai_notes+020 族+FTS+app_meta）/六闸接收流程（③内序决策表+⑤键等细分+防复活过滤）/U1-U4 切分/呈裁三项 | §13 定稿 |
| 双源复审链 | ops-auditor 四轮闭环：首审**返工 B2W7N7**（B-1 同库多副本同 seq 第三态/B-2 密码学参数面未落定）→r1 处置→delta 复审**有条件 B0W5N7**（判定载体/身份矩阵/直执重复/REPLACE 覆盖率）→r2 处置+全文直贴→终核**有条件 B0W2N9**（W-1=⑤「全等」字面误伤未变更行=常态假冲突〔v1.2 A7 原文歧义沿承〕/W-2=sha 摘要域漏 pdf_refs 不自洽）→r3 处置（键等细分+sha 域单源+闸③决策表+触发器 DB 时钟勘误+级联收窄+id 不复用不变量+OR REPLACE 机检+guard 开库断言+decrypt_fail 细分+PDF v1 边界）→闭合确认**放行 B0W0N0** | 设计链在档 |

成本=k3 27,869+auditor 四轮 417,869（61,707+61,753+256,541+37,868）+主控 host
（r0 落纸亲笔+r1-r3 处置+四轮组包）。**本场两批均守节奏 ≤2 件**（件1=k3 固化批、
件2=DB-3 设计面）。

## §1 下场开工序（单源）

1. **DB-3 U1 迁移面实施批**（六段简报派发 executor；门一=k3+d1 双席——
   新固化口径）：021 deletion_events+deletion_log_guard+九表 DELETE 触发器族
   （WHEN 守卫）+append-only 拒写防御+UNIQUE(entity,id,deleted_at) 去重；
   元测试（九表↔触发器对位+守卫两态——020 epoch 范式）+逐表删除断言+
   变异红证；**「src/main 禁 OR REPLACE」quality 规则挂卡**（受锁面
   [locked-change]）；guard 开库断言 stop==0（bootstrap）；「id 不复用」
   不变量登记 docs/invariants.md；**repos 压线双件零接触红线**（预裁在案）。
2. U2 导出面→U3 导入合并面（六闸+演练八+1 断言集=W6 收口门）→U4 协议
   契约文档（§13.8 切分逐批；每场 ≤2 件沿承）。
3. DB-4 治理收尾沿承 v169/v184；F-GEOMASSUME-01 低优先顺带窗沿承 v186。

## §2 沿承挂账

- v186 §2 沿承项全数沿承（CI 底色口径/test-surface 基线存量债 3 spec/
  registry 长注回写教训/FLK-01 open 等）+v184/v185 沿承面不变。
- 本场新增：①k3-N1=**ORG-SEG 段 ds-call 残句与 methodology「已退役」
  显性互斥**——技能同步批优先清偿（ORG-SEG ≤600 字符预算机检约束——
  须随 ai-dev-org 技能同步批处理）；②k3-N2=「主通道」vestigial 措辞
  （主备结构已消亡）；③**S5a 挂起型=flake 台账 case 21 observing**
  ——挂起族跨例分布线索（本地白天窗 case20+CI runner case21 两端各一例
  =环境级候选）；任一第二现即立案+族级评估；④「禁 OR REPLACE」机检=
  U1 批挂卡项；⑤v1.3 §13.1 捕获面矩阵的「新删除路径入仓即对账」=
  机检化后自动覆盖。

## §3 待用户面

1. **v1.3 呈裁三项**（§13.9，均有默认不裁即行）：①sync_key 共享形态
   （默认 b=文本串+二维码）；②密钥导入入口（默认 a=设置页单入口）；
   ③**lineage 三表入导出面确认**（默认入=推荐；异议=脉络图不随库同步）。
2. v186 §3 两项沿承（F-GEOMASSUME-01 产品面开放问/「CI 复查回执」条款
   升格宪法工作流段候选）。
3. v185 §3 automation 开工时段沿承（不裁=按 a=06:00+豁免口径）。
4. S5a/E5 挂起族=observing 无需动作（第二现自动触发）。

## §4 基线与治理（本场终态）

- HEAD=两批（33f57f6a k3 固化+本批设计面：设计书 v1.3+flake 台账 case 21）。
- verify：k3 批 EXIT=0 亲验（303/3262/427）；设计批收口终验见批档
  （docs 面 378+/6-，测试面零触碰=基线不动）。
- CI：33f57f6a=run 38550671406（attempt1 红证据+attempt2 绿终态）；
  设计批 CI 回执随收口闭环。
- registry：零改动（DB-3=F-DBCAMP-01 伞下单元制沿承；设计批无票面
  状态变化）。
- ADR/architecture 触及=**如实申报零新 ADR**：DB-3 设计演进由 ADR-0025
  既有单源指针（docs/design/2026-10-08_f-dbcamp01-design.md）承载——
  设计书 v1.3 修订记（§10 r1/r2/r3 行）即演进记录，architecture §5
  ADR-0025 行引用单源指针无漂移。

## §5 证据档指针（仓外档案区）

- 本场=/home/yyx/synapse-archive/scripts-audits/20261014-db3/
  （session-open.md〔技能清点+配置+开工调研〕/k3-seat-fix.diff/
  v13-section-r1.md+v13-section-r2.md〔§13 两轮快照〕/
  s5a-ci-hang-error-context.md〔S5a 首现快照〕/append-ledger-*.mjs
  〔账本工具件五件〕）。
- CI 面：run 38550671406（33f57f6a attempt1 红证据+attempt2 绿终态）。
- 账本：runId=20261014-db3 九行（ruling×2+gate1-audit+design-draft+
  design-audit×4+batch-close）。
