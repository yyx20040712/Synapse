# 交接书 v167 —— DB-1 契约冻结批·U1 收口单源·U2-U4 移下一批次会话（2026-10-08）

> 前承 v166（取代制）。本档=**DB-1 U1 全链收官（d28d7ea14e9 [locked-change]）+用户令
> 「U2 及以后放在下一批次会话」的下场单源**。**下场开工序=§1。**

## §0 本场总账（runId=20261008-dbcamp-db1，账本 881-890 行）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工纪律 | 技能清点+档位自查+回滚锚亲验（db-drill/ 在位） | 账本 881 行 |
| U1 实现 | 016 真重建+fkOff 模式+投影契约+消费面收紧（executor 三轮：基批+回炉轮1 八项+回炉轮2 门二拦截修复） | 提交 d28d7ea14e9；33.6M tokens |
| U1 门一 | k1 首审 B0W2N9 PWC+复核 PASS／d1 首审 B0W2N11 PWC+内联复核 PASS（路径式包被席位墙拒一次=主控裁改内联重发） | 9.3M tokens |
| U1 门二 | probe 九项矩阵（PASS 7/FAIL 2：A1 主控漏 relock 即时补+A2 e2e 种子器真缺陷→回炉轮2）→裁决部 GO_WITH_CONDITIONS（C1-C3 全兑现） | 5.4M tokens |
| 治理面 | INV-121/122/123 落册+INV-88 子句退役注记+flake 台账 reader-text 立案（count=2 filed）+豁免台账三轮全叙事 | 仓外 u1-exemptions-registry.md |

## §1 下场开工序（单源——用户令 U2-U4 移下一批次会话）

1. **DB-1 U2=017 papers.is_starred+partial index（F-STAR-01 数据面并入）**。简报草稿=
   仓外 20261008-dbcamp-db1/u2-brief-draft.md（基线数字已填：verify 269/2797、locks 378、
   指纹门 297/2899/9445 豁免 0；待定项已决：星标无筛选面——partial index=is_starred
   单列 WHERE is_starred=1；UI 点亮〔PaperRow lib-c-star 占位/P-9/P-10〕=DB-4 面）。
   要点：ADD COLUMN 静态 DEFAULT 合法**无需 fkOff**；paperSummarySchema 全 .strict()
   →夹具随链（U1 S3/S4 先例已立）；IPC=papers 域单通道 set-starred（shared/ipc
   受锁）；服务归 library.service；版本终点随链 16→17（受锁 migrate 族 S1 先例）。
2. **U3=018 app_meta 键值表**（owner uuid+设备 token——A2 已确认）：CREATE TABLE
   同 lineage_graph_meta 形态（应用层写 ISO/弃 DDL DEFAULT）；bootstrap container
   assemble（migrate→createRepos 后幂等 ensure——单路径覆盖默认库+课题库，
   workspace-layout initWorkspaceDb 空建可不动）；键域+token 生成（64-hex 预裁）
   入新 shared 件。DB-3 消费面（envelope owner/seq）不在本批。
3. **U4=019 tags 多域**（一批契约冻结收官）：tags 重建（folder_id NOT NULL+
   UNIQUE(folder_id,name) 替换全局 UNIQUE——**父表重建复用 fkOff 模式**（U1 已立
   先例+INV-123）；存量归主图〔甲裁决〕）；paper_tags 挂接域一致性守卫（INV 新行）；
   服务层限额（域内 20 满禁建/每篇 6 硬禁——预裁默认已生效）；repo 全 API 域化+
   tags.repo.test.ts 契约 succession（U1 S1-S4 先例）。UI 下拉=DB-4。
4. **DB-1 战役收口面**（U4 毕后）：architecture.md §6 实体表回写（papers 20 列+
   016 语义+INV-121-123 指针）+ADR（tags 域化/folder↔graph 契约=结构性投影不建表
   ——裁决原文+探针差异④勘正）+registry 注记（F-STAR-01 数据面完成度/F-TAGS-02
   数据面完成度——两票 UI 面留 DB-4 翻 done）+交接书。
5. **DB-2 起序**（U1 已毕=硬门反哺就绪）：AI 域技术细节专项汇报待用户（开工时呈，
   既定义务——v166 §3-2）。

## §2 沿承挂账（下场携带——均非阻断）

- **flake 排查票待立**：reader-text:1030「跨页真鼠标=toast 拒绝」toast 3s 超时未现
  ——第 2 现已立案（flake-ledger count=2 status=filed，2026-10-08 门二裁决部翻案）；
  排查承载=DB-1 后续批间隙或独立票（指纹/史料指针在台账行内）。
- 裁决部 C4 登记四项：d1-N2 015 终值注记惯例维持备案；d1-N10 二级级联等价性探针
  缺口挂账（低风险）；k1-N8 对象多重集断言不比 sql 文本——加强留后续票；probe A3/
  A4=主控简报预期数字纪律记档（P09 预期 36 vs 实 38+e2e 规模口径「25/25」陈旧未
  实测——DoD 数字条款同族，下场简报必实测）。
- e2e 规模实测口径：**28 spec 文件/102 用例**（旧「25/25」作废——U2 简报基线数字
  段按此口径）。
- U1 会话内技术事实（下场直取）：fkOff 模式=016 重建专用（017 ADD COLUMN 不需）；
  DEFAULT '__main__'=repo.insert 列单无 folder_id 的生产路+夹具兼容面；seed-lineage
  assignFolder 条件={NULL,__main__} 承续映射；meta-year-month spec 已改
  seedLineageGraph 直建。

## §3 待用户面（沿承 v166 §3 未动项+新增）

1. F-UIRES-04 C/D 呈裁（等批 1a 探针——时机随批非即刻）。
2. DB-2 AI 域技术细节专项汇报（DB-2 开工时）。
3. DRAGREMOUNT 时机解读确认（v166 §2-1——如需提前修一句改令即可）。
4. 探针差异 4 项过目（v165 §2-4——**U1 已消 3 项**：folder↔graph 落法已定/is_starred
   与 app_meta 待 U2/U3/tags 域化待 U4）。

## §4 基线与治理

- HEAD=d28d7ea14e9（U1 [locked-change]）；前笔=36fe81b247d（v166）。
- verify：本场收口四跑全 EXIT=0（close1-4）——**269 文件/2797 测试**+locks 378+
  指纹门 297/2899/9445/豁免 0；e2e 102 用例两档（3+99 probe 档/1+101 r2 档——
  唯一红=reader-text 非确定已立案）。
- 账本 890 行（881-890=本场：session-open/executor×3/gate1×3/gate2-probe/
  gate2-final×4/batch-close）。
- 成本：≈48.4M subagent tokens（executor 33.6M+门一 9.3M+门二 probe 1.87M+
  裁决部 3.5M）+主控 host-tier；模型×席位分列在账本各行。
- 治理新增：INV-121/122/123（册 122 行）；宪法 DoD「简报预期数字手算留痕」条
  本场两起失准记档（probe A4——下场简报数学式必附）；证据件唯一命名纪律（d1
  建议③）本场起生效。

## §5 证据档指针（仓外 scripts-audits/20261008-dbcamp-db1/）

- u1-brief.md（六段简报）+u1-impl.report.md（实现者三轮全录）；
- u1-gate1-k1.md/u1-gate1-d1.md（双席首审）+u1-r1-incremental.diff；
- gate2-probe-report.md+gate2-p##-* 18 件（probe 九项矩阵）；
- u1-gate2-adjudicator-full.raw.txt（终裁全文）；
- u1-exemptions-registry.md（豁免台账三轮全叙事）；
- u1-verify-close{,2,3,4}.raw.txt（收口四跑）+u1-first-red/u1-mutation-m1..m8/
  u1-r1-*/u1-r2-*（TDD 证据链）；append-ledger.mjs+rows-*.json（账本写入件）；
  u2-brief-draft.md（下场 U2 简报草稿）。
