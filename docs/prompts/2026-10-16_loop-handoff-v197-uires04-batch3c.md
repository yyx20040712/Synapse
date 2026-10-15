# 交接书 v197 —— F-UIRES-04 批 3c 毕（文献库详情面板重排，2026-10-16 凌晨定时批）

> 前承 v196（批 3b 毕）。本档=批 3c 单据+**下场开工序单源**。本场=凌晨两点一次性定时任务（runId 会话内两单元：20261016-b3b〔已闭账 v196〕+20261016-b3c）。

## §0 本场批 3c 总账（runId=20261016-b3c；账本 6 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 批 3c 实现 | executor 三轮（r0 5.78M/r1 2.98M/r2 2.82M tok）：E 裁决重排（.lib-dr 全区滚动+标签节上移+元数据区挂载+DrActions 下移随滚）——DrKeyVals 55（零变搬移）+DrPaperInfo 51（库域 M2 连接件=SidePaperInfo 同型第 2 例 Rule of Three 保持重复；零 store 订阅）+宿主 221→195（三守卫零改）+library.css +11/−3+e2e 新 spec 4 例（两域同构 toHaveText 全等/滚动承载/键值行回归锁）+SidePaperInfo.test 4 例（F-PINFO-01 补锁）+theme.test 断言载体迁移+exemptions 首例+INV-139+manifest 455→457 | impl.report §r0-r2 在档 |
| 批 3c 门一 | r0：k3 PWC B0W2N9+d1 PWC B0W6N5——互证真处置=互斥挂载不变量未登记（k3-W1=d1-W6）；主控核销五项（PaperInfoSection 零 store 触点/partial 无重试入口/无定位规则/行数 diff 实测/M2 abortInFlight 同步 markError=第三象限消解）→r2 四件（INV-139+头注措辞+三支变异红证+e2e 同篇终态断言）→增量复审 d1 **PASS B0W0N5**+k3 PWC B0W1N5（W1′=执行绿双源核销：executor 定向复跑+probe P4 复锚） | 双 verdict×2 轮在档 |
| 批 3c 门二 | probe **七项全 PASS**（verify EXIT=0 328/3470+计数零差异〔e2e --list Total 125〕+变异独立复现 sha256 还原+8 passed 含 r2 断言+宿主三守卫行号在档）；adjudicator **GO_WITH_CONDITIONS 零回炉**（C1=INV-139 回指注记〔收口已落——批 3d 顺带销号〕/C2=baseline 再生成窗口〔滞后差 +6/+47/+166 三批累积——批 3d 或战役收口执行 test-surface:baseline+全量 diff 审计〕） | g2probe-report+终裁在档 |
| 收口 | C1 注记落 INV-139 行+F-PINFO-01 翻 done（注记承载形态裁量）+F-UIRES-04 批 3c 注+feat [locked-change] 提交+本档+push 挂 CI 回执 | 见 §4 |

成本：批 3c subagent tokens 合计 13,297,512（executor 11,583,349 三轮/k3+d1 217,022 两轮/probe 734,001/adjudicator 563,727）+主控 host-max。**本场两单元合计≈27.68M**。

## §1 下场开工序（单源）

1. **F-UIRES-04 批 3d（收起钮+SETSTYLE-01 搭车）**：首动作=grep e2e 选择器形态（§4.9 D8——侧板收起钮 testid 已主控亲核）；公共视觉 class .collapse-btn（nav 款）nav/side 双挂+旧视觉属性块 grep 零残留（方案切换=删除旧方案）+视觉证；SETSTYLE-01=设置页 .btn-std 统一（搭 D8 变量）零逻辑行。**顺带销号**：①INV-139 回指（SidePaperInfo 头注一行+DrPaperInfo 补编号——裁决部 C1）；②**test-surface baseline 再生成**（`npm run test-surface:baseline`+全量 diff 审计——裁决部 C2，滞后三批累积；exemptions 首例复核收敛）。
2. 穿插窗四票（2A 裁决承载）：F-DRAGREMOUNT-01（方案 A 拍板）/F-REQFP-01/F-IMPORTGATE-01/B6 候补（触 toast-store 面顺带）→ **F-UIRES-04 翻 done**。
3. **用户集中视检轮**（1A 裁决——清单六面=仓外 20261015-uiinv/visual-inspection-checklist.md；**视检含批 3b/3c 新面**：脉络侧板标签行/信息区/摘要展开/strip 降级与 partial 徽注+库抽屉重排/滚动条 gutter 微移/DrActions 短内容不贴底/head 不吸顶三项视觉观察）→AI 模块+下载模块 B1-B8。

## §2 沿承挂账

- INV-139 锚定状态标签化+dev 断言半机检评估（F-M2SUB-01 附注）；exemptions schema replacedBy 候选票（d1-N2）；d1-N3/k3 两支可选变异（下次触面）。
- F-M2SUB-01（M2 订阅面=error 续轮退出通道）沿承；pdfjs 升级票 checklist+真机提取冒烟沿承（v196 §2）。
- v192 挂账余项+挂起/超时族四例+B6 候补+kimi-main 认证观察沿承；指纹门引用基线口径=自 11915 起算（C4 沿承——**注：3c 后 cur=364/3595/11972 为新对账点**）。
- **账本 ts 纪律**：本场 3b/3c 段共三行 ts 手写偏（裁决部已裁「接受+自愈闭环」）——**下批起账本行 ts 一律 date 实测落笔**（观察项升纪律执行）。

## §3 待用户面

1. **下载模块两项批序**（v195 §6 增补：v1v2 合并乙案+PubMed 升 B8）——B1 开工前一句话（沿承）。
2. 集中视检轮排期（批 3 全毕后由主控提示）。

## §4 基线与治理（批 3c 终态）

- HEAD=本批 2 笔：①feat(ui) 批 3c [locked-change]（12 件=2 新 src+2 编辑 src+2 新测试+3 受锁改写〔theme/exemptions/invariants——含 C1 注记〕+manifest+registry）；②本笔 docs(prompts) v197。
- verify：**收口主控终验 EXIT=0**（328 文件/3470 用例；e2e 125=121+4〔全量 CI 承载〕；locks 457；指纹门 cur **364/3595/11972** 绿 exemptions hits 1 stale 0——对 3b 基线增量 +2/+8/+23=e2e 4 例 12 断言+unit 4 例 11 断言）。
- registry：**290 票（open 11/done 279）**——F-UIRES-04 批 3c 注（票维持 open）+F-PINFO-01 翻 done。
- 治理基线行：INV **139**（+139 互斥挂载）；locks **457**；ADR 触及=**零新 ADR 如实申报**（布局重排=设计书 v1.2 §4.5 E 裁决既有架构面）。
- 受锁改写三件合规链：theme 断言载体迁移（立锁意图亲核=防叠压语义由随滚入流结构性承载）+exemptions 首例（MISSING_CASE 设计通道）+INV-139。

## §5 证据档指针（仓外档案区 /home/yyx/synapse-archive/scripts-audits/20261016-b3c/）

batch3c-brief.md / impl.report.md（§r0 自裁六条+§r1 theme 改写+exemptions 伴生+§r2 四件+wc/diff 实测回执）/ g2probe-report.md+八件证据日志。

> 本批 push 后 CI 回执=会话内复核闭账（F-CIFLK-01 纪律——收口面改动后关卡复跑已应用 3b 教训）。
