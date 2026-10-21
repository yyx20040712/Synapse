# 交接书 v229 —— F-EVCTX-01 + F-DETOURW-01 工程债同场收口

> 取代 v228（2026-10-21 F-VISFB-53CI-02 收口笔）。本场=2026-10-21 主会话
> （runId=20261021-evctx-detourw）：首动作核 v228 三笔 CI 回执（0b13c722=
> run 39533137155 success 亲验）→按 v228 §1 场次 2 取 F-EVCTX-01+F-DETOURW-01
> 同场一单三屋完链。

## §0 本场总账

- **F-EVCTX-01（e2e 取证保号）+ F-DETOURW-01（走线容量输入归一）双票闭批**：
  1. **F-EVCTX-01**：playwright outputDir 分 run 保号（`test-results/run-<stamp>`——
     PW_RUN_STAMP 环境变量逃生门/ISO 时戳进程级一次；config 顶层常量非产品运行时）
     +globalSetup 修剪（tests/e2e/global-setup.ts 薄壳 17 行+tests/utils/
     e2e-output-prune.ts 纯逻辑 49 行——vitest exclude tests/e2e/** 封锁同文件导出
     实证不可达=独立 helper 归因在档）：run-* 目录 mtime 降序保留 10
     （**≈5 轮运行指纹**——单轮产双 run-<stamp> 目录〔globalSetup 进程空目录+主进程
     产物目录〕双 stamp 现象实证，RR1-2 口径如实化）+并列名升序确定性+stat 竞态
     宁留勿误删+零抛承诺。**票面目标闭环实证=双轮失败指纹保号并存零覆写**（同一
     用例 error-context.md 各落 run-…10-53-41-198Z 与 run-…11-16-09-133Z 两保号
     目录——非确定失败立案线「同用例 2 次记失败指纹」取证面根治）；CI artifact
     path=test-results/ 父目录递归兼容零改动+.gitignore 行已覆盖。
  2. **F-DETOURW-01**：主控终裁形态=LayoutSnapshot.contentW 语义改造（旧值
     content 容器宽系 corridor 时代透出残留、消费侧全仓零命中=死值——grep 双证）
     →新值=首月框内容盒宽（buildSnapshot 经 readFrameContentWidth 单源采集；
     computed 五值天然 own 域不除 sEff——zoom 免疫在档）；detour gridChannelsOf
     消费 snap.contentW+**unmeasured 守卫必置**（`!(w>0)` 零通道早退——
     capacities(0)=∞ 入 k 循环即死循环，jsdom/空图真实可达；守卫与布局 unmeasured
     降级同族）。布局/拖拽/走线三域容量输入单源合流=**INV-169② 回写根治闭账**
     （docs/invariants.md:218）。D4 边界在档：fx0 坐标侧 0.6px 声明/used 连续偏移
     不产档位分叉+高度侧 BORDER_SUBPIX_TOL=1.3 承载（F-PLATFORM-01 先例）。
- **判别仪器设计事件**（教训候选）：首红 v1 暴露 gridFrame 自相似陷阱——旧派生
  W=600「cap=3 满右缘（宽恰 72）」与 W∈[728,800)「cap=4 零右缘」偶行通道集
  **数学全等**（xLo 集 {240,440,640} 同、槽位全同——600=3×200 满右缘 ≡
  728=4×200−72 零右缘自相似点），728/754/755.1 三例期望档恰等于旧实现输出=
  恒真假绿；判别面重构=奇行 m 档零自相似双锚（172≠72 结构性可判别）+偶行
  首槽签名字面锚（728+ 例偶行位如实注记恒真、红由奇行承载）。
- 三屋完链：executor（**deepseek-flash$max 限时窗档**——用户裁决 2026-10-21
  窗 10-21~10-23 首役）基批+RR1（回炉 1/2）→门一双审 k1 PWC B0W4N6/d1 PWC
  B0W4N9（**半异构欠账注记随批**：窗内实现者与 d1 同源——k1 异构在位）→RR1
  三必修（754/755.1 标签域混淆〔k1-W1+d1-W4 合流〕+保留口径如实化〔k1-W2+d1-W1
  合流〕+PRUNE_KEEP 悬空钉〔d1-W2 结构指控〕）→增量复核双 PASS（B0W0N1×2——
  N1 各一：审包形态建议/逃生门口径边界〔主控亲笔补限定句〕）→门二 probe 八项
  矩阵全 GO（verify 398 文件 4206 例〔4196+9+1 对账闭合〕+定向 81 例+变异两枚
  独立复现〔守卫变异 OOM 形态红=capacities(0)=∞ 失控同族实证，裁决部接受红证
  效力；PRUNE_KEEP=9 恰 1 红=钉例捕获闭合 d1-W2 缺口〕+contentW 消费侧 grep
  唯一+行数九件全 ≤500〔routing 791/visfb31 521=ESLint tests 豁免面趋势登记〕
  +删减面零 expect 删除）→裁决部 **GO_WITH_CONDITIONS**（五问全成立+独立复算
  九组全闭合；回炉零建议）。
- 裁决部收口条件清偿面：C1 locks 同步+verify 亲验+C3 flake 台账+C2 INV-169②
  回写（P0 三件套全毕——见下）；C4 test-surface 基线核查+C5 master-rulings 头表
  订正+C6 账本口径订正（P1/P2=批档 08-closeout-annotations.md 一文三注）。
- **提交=7045b3f8（[locked-change] 尾注——受锁面 10 件：playwright.config+三随迁
  测试件+两新测试件+global-setup+prune helper+invariants+test-surface.baseline
  〔regen——吸收 v228 批陈旧指纹 15 条+孤儿豁免 10 条清偿=F-TESTLOCK-01
  b9cc41a6 先例协议同款〕+manifest 515→519）。verify 收口终验 EXIT=0 亲验
  （VERIFY_EXIT=0 尾注落盘 09-verify-close.raw.txt）。推送=§6 待办（宿主机
  代理宕——PROXY_DOWN 实测）。**
- e2e 全量冒烟 154 例 153 绿 1 红（21.6m）：红例=ai-cascade-delete.spec.ts:28
  E5 场景一 element-detached 签名**同指纹 2 现达立案线**——flake 台账既有条目
  （first_seen 2026-10-19 count=3）计数 3→5 追记（docs/audits/flake-ledger.json——
  域外定性三证在档：与本批零共享代码路径+config 不触渲染+同 spec 场景二/三两轮
  全绿；承接 F-E2EFLK-01 排查面不变）；第三跑 exit=0 转绿=非确定族定性支持。
- 成本（模型×席位，subagent tok）：**21,907,344**——deepseek 链 18,213,719
  （executor 基批 14,020,050/3534.9s+RR1 3,910,785/334.4s〔限时窗档〕+d1 两轮
  171,898+120,982）/kimi 链 1,770,149（k1 两轮 91,000+60,890+adjudicator
  1,618,259/931.6s）/host-tier 链 1,399,955（probe/677s——session:host-tier
  欠账形态记档）；主控亲笔随会话。批档=仓外 20261021-evctx-detourw/（开工记录
  00+简报 01+diff 包 02/06+门一指令 03+分流裁决 04+RR1 简报/报告 04/05+probe
  07+收口批注 08+verify 09+红证/冒烟 raw 二十余件）。

## §0.5 组织注记（本场增量）

1. **限时窗首役兑现**：deepseek 实现面窗内首单运行正常（基批 14M tok 大单链
   完整+RR1 续命通道正常）；自裁申报五项全规内（A1 pin-routing 同城延伸+A2
   独立 helper 备选启用+A3 新件选址+A4 守卫补例+A5 命令变体——申报制纪律保持）。
2. **半异构欠账形态**（v228 §0.5 预案首次实际发生）：d1 与实现者同源窗内——
   门一双审仍产出双源独立发现（k1-W1/W2 与 d1-W4/W1 各自独立命中同族问题+
   d1-W2/W3 独有问题面=异源判别力未因同源塌方），欠账注记随批披露如上。
3. **裁决部文书瑕疵三处点名**（报告面计数纪律族——08 批注留档）：
   impl「四例」/probe「六例」失实（实测 selection-evaluate NEW 7 条）+
   master-rulings 头表「域外登记 2/推翻 1」误（实况 1/0）。

## §1 下场序（承 v228 §1——场次 2 已结）

1. 首动作=核本交接书 docs 笔 CI 回执（§6——本笔推送后随 supersede 形态既定）。
2. **场次 3：F-REQFP-01**（指纹门 Req 形状覆盖——用户裁决提序 dist 前）。
3. 场次 4：F-TESTLOCK-02（同域连场——**test-surface 基线再生复核随该场**：
   本批 regen 后新增面入锚，v228 陈旧面已吸收；该场统一复核即可）；F-RECOV-03
   随批顺带（兜底场 4 不变）。
4. 场次 5-6：集中视检轮→dist 不变。
5. 沿承观察：F-E2EFLK-01（ai-cascade-delete E5 场景一计数 5=最活跃条目——
   排查优先级提示）；sel53WaitQuiescent 复审触发器不变；F-EVCTX-02（低优——
   mtime/字典序混序补测+cwd 文档化+capacities 循环外提三增强）。

## §2 测试版本路线

| 序 | 票 | 内容 | 状态 |
|---|---|---|---|
| 1-6 | （前六票） | — | 双 done（v227/v228 在档） |
| 7 | F-EVCTX-01/F-DETOURW-01 | e2e 取证保号/走线 1.2px | **done（v229 本场）** |
| 8 | F-REQFP-01 | 指纹门 Req 形状覆盖 | 下场首取=场次 3 |
| 9 | F-TESTLOCK-02 | stale 可见性增强 | 场次 4（+基线再生复核） |
| 10 | 集中视检轮 | 用户面视检 | 场次 5 |
| 11 | dist 测试版 | npm run dist 打包+版本号 | 终点 |
- open 池=7 张（53CI-02 后 8−EVCTX-01−DETOURW-01+EVCTX-02 立=7）。

## §3 治理注记（本场增量）

1. **豁免台账**：本批零新增（regen 顺带清偿孤儿 10 条=台账 10→0 清零——
   exemptionsSnapshot 随基线入锚 10 条当前活条目；节奏阈值计数=测试面变更批
   2/5〔自 v228 起计〕）。
2. **行数余量**：methodology 499/500 不变；本批件全 ≤500；存量趋势=
   routing.test.ts 791/visfb31 521（ESLint tests 豁免面——lineage 域下一票
   顺带拆分评估，域外登记在册）。
3. **test-surface 基线再生面**（F-TESTLOCK-01 协议第三例）：removed 160
   （v228 陈旧指纹 15 条+孤儿豁免 10 条+基批修订面重置）→regen 后
   442 件/4360 例/14758 断言+豁免 hits 0/stale 10（stale=既有面不变——
   台账 10 条当前活条目零命中系既有观察项非本批新生）；check 复跑全等。
4. **flake 台账累加先例**：同指纹命中既有条目=计数累加+note 追记（本批
   E5 场景一 3→5）——新立案仅用于新用例/新指纹族。
5. 沿承 v228 §3-5：shared/models 四件头注旧迁移路径引文——下一允许触碰
   shared 的批次顺带勘正（k1-r1-N6 挂账不变）。

## §4 待用户面

1. ~~推送待办~~ **已销**（§6——代理自愈后推送成功+CI success 亲验）。
2. 实现者限时窗内批次形态沿承：场次 3-4 实现者=deepseek-flash$max（窗
   10-24 关——逆向动作在档 v228 §0.5）；半异构欠账注记随批。
3. 沿承未销项不变：dirty quit 全链 e2e/图表优化候选=未排程呈报项；集中
   视检轮备料=场次 5。

## §5 沿承挂账

- open 池=7 张（§2）；压着清单+store 拆件候选沿承 v228 §5。
- F-EVCTX-02（低优三增强）+routing.test.ts 791 行趋势+lineage-note-geom
  mountOverlay 死参数（实现者观察②）=lineage/e2e 域后续票顺带面。
- 门一 N 级登记（不处置在册）：合并 diff 审包形态建议（回炉轮随附增量 diff
  单件——k1-N1，流程改进候选）；纯逻辑件逐例变异红证面+probe 预期红例数
  对账纪律（裁决部流程改进建议两条——未来简报面采纳）。

## §6 CI 回执与推送状态

- 本批实现笔=7045b3f8+docs 笔=2c07923b **已推送**（0b13c722..2c07923b——推送
  窗实况：首推 14:XX 宿主机代理 192.168.163.1:7890 宕（PROXY_DOWN 134s 超时
  实测）；重试循环首次探测即恢复，exit=0 推送成功——VMware git 面代理依赖在档，
  本次=瞬时宕机自愈形态）。
- **CI run=39600811281 conclusion=success 亲验**（轮询 13 轮至 completed；
  双 job 全绿=manifest 变更尾注检查 [locked-change] 通过+六道关卡
  lint→typecheck→quality→tickets→unit→build+e2e 全绿——本批受锁面 10 件
  尾注合规+e2e 面含 F-EVCTX-01 分 run 保号首秀绿）。本批闭场。
- 历史回执（本场首动作已核）：v228 三笔=39533137155 success（0b13c722）/
  39531953369 success（b1d02e2c）/39530762771 cancelled（fbf7b0d9=amend
  被取代笔预期）/39529386315 failure（4098b28f=尾注误挂已清偿重组）。
