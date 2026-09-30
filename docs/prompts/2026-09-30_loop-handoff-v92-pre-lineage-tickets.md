# 交接书 v92 —— 脉络图前小票清偿批（2026-09-30）

> 前承 v91。本档=用户指令「继续开发，清偿脉络图前小票」执行批：F-LINEAGE-02
> （脉络图结构整理，队尾挂账待用户走线规划）之前的脉络域前置三票按 v90 §4
> W3 排程锚串行清偿。**注意：v90/v91 既定的「下一批次=清偿所有小挂账」清单
> （第 7/8 条/T4/W2/F-TESTREF-S1 等）本批未动**——用户本次指令优先，清单仍挂
> （§3）。

## §0 本场消耗（账本 358→366 行）

executor×4（三票+回炉批）/gate1-k1/gate1-d1/probe/adjudicator/主控亲执两轮
（schema 终裁面+文档回写面）。开工记录（技能清点+配置自查）在本场会话开篇，
要点：三屋模式全对抗位（实现批）；executor/probe=随宿主（session:host-tier），
k1=Kimi 链 $max、d1/adjudicator=deepseek $max。

## §1 基线终态（对不上禁提交）

- **verify：EXIT=0，204 件/2233 用例**（递进对账：2257[v89]→2224[票1]→
  2227[票2]→2230[票3]→2233[回炉批]——净删 24+新增 9，裁决部复算闭合）。
- **e2e：63/64+单 spec 复跑绿**——唯一失败=reader-scroll.spec:54 存量 flake
  （本批 4 现增量，见 §4；非本批引入——三票+回炉零 reader 域）。
- **locks 299→300**（+seed-lineage.mjs）；**豁免 246→294**（F-BAKRET-01 组
  48 条=46 常规+2 主控终裁）；**通道 61→60**（lineage/import 退役，pin 随迁）。
- **open 8→5**（F-BAKRET-01/F-LGCLN-01/F-DELCONF-01 翻 done；余=F-UIRES-01/
  F-UIRES-02/F-TAGS-02/F-LINEAGE-02/F-TESTREF-S1/F-FLAKE-02 排期项——registry
  内 open 四票）。

## §2 三票收口概要

1. **F-BAKRET-01 草稿导入链退役**：删 service 三方法+IPC 通道+契约+renderer
   件+入口+pickJsonFile+clearGraph+**lineageDraftSchema 单源（主控终裁——
   executor 自裁 7 呈报：src 零消费方死代码即删）**；保留红线全绿（assemble
   五件套/INV-77/INV-90/三路种子）；ADR-0022 入档；e2e 种子链全量改造
   （T1=UI 产品路径+T2-T10/T-P1b=seedLineageGraph 直写基建新件）。
2. **F-LGCLN-01 显式跨图删减**：upsertNodeInner 主题分支 existing 优先（更新
   禁搬图）+normalizeMonthSlot sameGroup 去 folderId 面（组键两面化；folderId
   变化唯一合法路径=moveFolder 恒显式 slot）+**防御断言机锚**（k1-N3：folderId
   变不带 slot→throw）；moveFolder（library.service diff=0）/INV-90/文献≠归属
   拒全保留。
3. **F-DELCONF-01 删除警告静默判据**：空图文件夹（nodeCount=0 ∧ edgeCount=0）
   静默直删（useFolderDelete.ts 拆件）；paperCount 不参与；fail-closed；回炉批
   补 W1（在途异目标 info 告知）/W2（getScope 现值判定防误清筛选）。

门链：三票 executor TDD+变异红证→门一 **k1 PASS B0W0N6 / d1 PWC B0W5N6**
→回炉批（W1/W2 实修+k1-N3 机锚+种子加固 FK/slot 补号）+主控亲执文档面
（W3 ADR/W4 INV-75/W5 migrate 注释级例外在档/k1-N1/N2/N4）→probe 7/7
（三变异红数吻合+零写入证明）→裁决部 **GO_WITH_CONDITIONS C1-C5 全落实**。

## §3 小挂账批清单（未动——仍挂）

v90 §3+v91 §3 全项未动：第 7 条（ImportTargetSelect——随「仅入文献库」退役
与 F-UIRES-01 简化合并考虑）/第 8 条（空态导入区按钮描边风格+字号降档）/
F1/W1/W3+T4/W2/F-TESTREF-S1（搭车）/**F-FLAKE-02（C3：不得再顺延——两变体
合计 ≥9 现）**/指纹门基线再生成窗口票（C4 对照清单见 §4）。

## §4 用户知悉/裁决口

- **[C5 呈报·票面范围]** F-DELCONF-01 票面②「删单文献静默判据」实作面不
  存在（papers 域无 delete 通道+无删除文献 UI——主控摸底事实）→本票只实作
  ①；②判据预设挂 F-UIRES-01 承接（registry 承接句已落）；零预留代码=YAGNI。
  此为票面范围缩水，呈报知悉。
- **[C1/C2/C3·flake]** reader-scroll.spec:54 两变体（annotation-rect 等待
  超时 4 现+selectText 脱附 5 现——本批 +4）同族「负载下元素脱附」；台账已
  升格 filed（收官全链条目 count 1→5）+**F-FLAKE-02 排查范围扩面：selectText
  脱附变体显式入清单**（原票面仅 annotation-rect 等待策略）——排期不得再顺延。
- **[C4·指纹门窗口]** 本批退役面含**基线窗口外条目**（F-FOLDER-01 回炉码 1/
  F-FOLDER-02·C2 组——裁决部复算标注），未占指纹门豁免属窗口缺口——「指纹门
  基线再生成窗口票」执行时对照消化。
- **[主控批准面呈报]** ①迁移 004 头注注释级改写（migrate.ts 例外在档——
  纯注释零 SQL 变）②lineageDraftSchema 删除（executor 呈报主控终裁）③ADR-0022
  git 引入指针勘正（548dfda→06ea570——executor 现场核实）。
- **[N6 勘句]** F-DELCONF-01 原票面句首「保护资产=脉络连线唯一」与判据①
  口径不一致（1 节点 0 边应弹窗保护）——registry done 行已勘为「脉络图内容
  两维」口径，实现/e2e 均按判据①落地。
- **[k1-N4 确认性登记]** 静默删除预检→删除两程间存在亚秒 TOCTOU 窗（他页
  新 flush 的节点随级联删）——S1 队列闸已收 pending 子格，残留窗结构性不可
  消除（无 epoch 协议），单人桌面风险近零，不处置。
- **[d1-N5 挂账]** FolderDeleteDialog 自身取数失败=按钮恒禁用+「…」无错误
  文案——fail-closed 成立，体验面挂 F-UIRES-01 形态批。
- 承 v91 §4 全项（F-TAGS-02 两裁决点甲乙丙呈裁待用户+F-LINEAGE-02 队尾挂账
  待用户走线规划）。
- 教训候选累计待批：v84 六+v85 三+v86 四+v88 二+v89 三（本批无新增候选——
  三票+回炉全按既有纪律走通）。

## §5 操作条款存续

承 v91 §5（=v90 §5=v89 §4）全项。
