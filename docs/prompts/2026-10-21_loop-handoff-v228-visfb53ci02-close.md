# 交接书 v228 —— F-VISFB-53CI-02 选区快慢双几何统一+鼠标投影语义审计收口

> 取代 v227（2026-10-20 深夜 F-TESTLOCK-01 收口笔）。本场=10-20 深夜主会话跨日
> （runId=20261020-visfb53ci02，22:15 开工）：首动作核 v227 三笔 CI 回执全 success
> →按 v227 §1 场次 1 取 F-VISFB-53CI-02 三屋完链。本交接书按 methodology §5 写作
> 规范落笔。

## §0 本场总账

- **F-VISFB-53CI-02 闭批（选区快慢双几何统一+鼠标投影语义审计）**，两工作项：
  1. **快慢几何统一**：原案「snapBlank 纳入 effectiveRangeOf」被实现者探针实证
     **非幂等**（多空白 span 形态 P1-B/B2/D）合规阻断→主控终裁**探针级镜像**替代
     （visual() 探针段对 eff 边界双侧同根同侧同调 snapBlankBoundary 一次+翻转兜底
     复刻=**构造性等价不依幂等性**——裁决部终裁 Q1 成立，等价断言输入全称无需形态
     枚举）+**A2 慢路零重画**（paintedByVisual 先捕获+preservePaint 门控 7 处
     setPaint——同签名 settle/mouseup 不再重画，paint 保持快路帧；pending/工具条/
     G2 toast 恒执行）。机制偏移申报：票面「快路预计算 bands+慢路零形态变更」→落地
     「区间同源+慢路零重画」（bands 现算不缓存=A3 不采用在档）。
  2. **鼠标投影语义新契约**：projectTo 重写——y→行带映射（带内=该带；间隙=距 y
     最近带等距取上带=阅读序保守防外扩；越顶/越底=视觉首带/末带）+带内 x 二值保持
     +rowBandsOf 视觉序单源取代 DOM 序首末项——「把下面一整段选上」结构性外扩根治。
- 拆件=selection-effective-range.ts（121 行——A1/A2 增量使 evaluate 471 超 500
  红线余量不足，eff 边界域整体拆出，终态 447）。
- 三屋完链：门一三轮（双审 k1 PWC B0W4N4/d1 FAIL B1W7N7→复审双 PWC→终确认
  k1 PWC B0W2N2/d1 PWC B0W4N3——B 级零残留）+回炉 2/2 封顶（RR1=e2e 守卫补强
  skips2/selText 非空/WaitQuiescent 复用+测试件瘦身 500→485；RR2=cancel 恒真腿
  定谳〔8 用例全绿实锤双路吸收〕+stale 坐标 lb2/rb2 域统一）+门二 probe 六项矩阵
  全 GO（verify exit=0/e2e 三连绿/变异复抽两枚红证/机理构成对账/行数全符/滚动锚
  纪律）+裁决部 GO_WITH_CONDITIONS（五问全成立+成本复算符+收口五条随批清偿）。
- 主控亲笔处置批（N 级免审口径——组织层 2026-10-05 裁决+本项目 10-20 深夜「维持」
  转正）：INV-63 双标题改实（同帧覆盖/W1 cancel——陈旧已反转义=误导性契约面）+
  S5 宿主陈旧改实（SelectionLayer→selection-events）+防退化句复还+spec 瘦身
  499→478（sel53Verdict 死代码删——诊断结论归档仓外 20261019-sel53ci-probe）+
  INV-58 回写演进（docs/invariants.md:75——同 eff 归一化边界+慢路零重画+已知边界
  点名帧间 store/zoom 族与 fallback/guard→slow success 迁移面）。
- 验证：verify 亲验 EXIT=0（396 文件/4196 用例/locks 515——verify-close.raw.txt
  含 exit 尾注）；e2e selection-twocol 三连绿×多轮（probe 独立复跑同值）。
- 提交：4098b28f（[locked-change][test-refactor] 双尾注——受锁面=3 测试件+
  invariants+exemptions+manifest 同步）。**CI 回执=本档核验对象**（§6）。
- 成本（模型×席位，subagent tok）：**29,658,660** ——kimi 链 2,699,963（k1 三轮
  354,329+adjudicator 2,345,634）/deepseek 链 594,746（d1 三轮）/host-tier 链
  26,364,951（executor 三轮 25,192,689+probe 941,151+自裁剪决链路——E3 欠账形态：
  会话内无 model 参数如实记档；executor RR1/RR2 启动于限时窗生效前快照=按用户裁决
  意图档记 deepseek-flash$max+E3 注记）；主控亲笔随会话。批档=仓外
  20261020-visfb53ci02/（开工/简报/impl-report 十五节/master-touch-rulings/门一
  三包/门二 probe+裁决包/红证 13 支/verify 五轮 raw）。

## §0.5 组织事件（本场增量——2026-10-21 用户裁决）

**实现者=deepseek 限时窗（2026-10-21~10-23 三天）**：推翻 methodology §4.5
「deepseek 实现面禁用」（2026-09-02 Ruling）的**限时例外窗**——常驻规则与文档
不动，窗关 10-24 自动恢复未绑定随宿主形态。落档=org-config.local.json
agent_bindings ops-executor 行+note-2026-10-21 行+模板/部署件双档同步（validate
PASS cfg:7cad99403681）+项目账本 ruling 行（.zcode/org-ledger.jsonl:1576）。生效=
新会话（快照纪律无热加载）；本场在途续作按用户裁决跑完（GLM host-tier）。门一
异构注记：窗内实现者=deepseek 时 d1 与实现者同源=半异构欠账行随批记档（k1 仍
异构在位）。**窗关逆向动作**（删 frontmatter model 行+恢复正文自述+删 org-config
两行）已写入档案正文与 org-config note 行。

## §1 下场序（承 v227 深夜排程裁决——场次 1 已结）

1. 首动作=核本交接书+4098b28f 笔 CI 回执（§6；非 success 按同指纹立案线处置——
   spec 改动面 CI 窄视口首秀为观察位〔裁决部条件 1〕）。
2. **场次 2：F-EVCTX-01+F-DETOURW-01**（两张工程债小票同场——e2e 取证保号/走线
   1.2px 容量输入归一）。**实现者=deepseek 档**（限时窗内）。
3. 场次 3-6 不变（F-REQFP-01→F-TESTLOCK-02→集中视检轮→dist）。
4. 沿承观察不变：F-E2EFLK-01（observing）；sel53WaitQuiescent 复审触发器=CI runner
   换代/停顿窗族再红（spec :286-291 注释在档）。

## §2 测试版本路线

| 序 | 票 | 内容 | 状态 |
|---|---|---|---|
| 1-5 | （前五票） | — | 双 done（v227 在档） |
| 6 | F-VISFB-53CI-02 | 选区快慢双几何+鼠标投影语义 | **done（v228 本场）** |
| 7 | F-EVCTX-01/F-DETOURW-01 | e2e 取证保号/走线 1.2px | 工程债（下场首取=场次 2） |
| 8 | F-REQFP-01 | 指纹门 Req 形状覆盖 | 提序 dist 前（场次 3——用户裁决） |
| 9 | F-TESTLOCK-02 | stale 可见性增强 | 提序 dist 前（场次 4——用户裁决） |
| 10 | 集中视检轮 | 用户面视检 | 新立排程（场次 5——用户裁决） |
| 11 | dist 测试版 | npm run dist 打包+版本号 | 终点（场次 6） |
- F-RECOV-03=随批顺带（场次 2-4 任意场可销，兜底=场次 4）。
- open 池=8 张（53CI-02 翻 done）。

## §3 治理注记（本场增量）

1. **豁免台账**：+5 条（53CI-02 授权改写+INV-63 标题裁决——reason/rulingLink 全档
   引 master-touch-rulings.md）；台账终态 10 条。节奏阈值计数起点=本场（测试面变更
   批 1/5，未冻结 10/100）。
2. **行数余量**：methodology 499/500 不变；spec 478/test 485+402/evaluate 447/
   effective-range 121/drag-controller 331——全 ≤500 有量（spec 余量 22 行）。
3. **机理定性闭环**：机理②（双几何形态真分叉）结构性证实+收口（A1 区间同源消灭）；
   机理①（CI 排空延迟）与几何统一无关，sel53WaitQuiescent 承载保留。
4. **教训二十六回流事故档**（候——主控收尾批随落）：①「探针实证设计闸门」价值
   （原案幂等假设被探针证伪阻断，构造性等价替代不依幂等性=更优解）；②cancel
   判别面随 A2 签名同步弱化=恒真腿二现（k1 推演+RR2 实测双证）——红证声明须随
   语义演进复审。
5. 沿承 v227 §3-5：shared/models 四件头注旧迁移路径引文——下一允许触碰 shared 的
   批次顺带勘正（k1-r1-N6 挂账）。

## §4 待用户面

1. **实现者限时窗已生效**（10-21~10-23——§0.5）；窗关 10-24 自动恢复，逆向动作
   在档。窗内批次异构注记：d1 与实现者同源=半异构欠账随批披露（k1 异构在位）。
2. 沿承未销项：dirty quit 全链 e2e/图表优化候选=未排程呈报项（v227 §4.2 沿承）；
   集中视检轮备料=场次 5（真机截图+沿承视觉项清单+F-SNAPHINT-01 复现采集位）。
3. **follow-up 登记两枚**（裁决部收口条件 4a/4b——本批不实施）：①snapBlankBoundary
   end 侧多空白 walk 行为锚（归 anchor-blank-snap.test F-A10 面）；②INV-58 已知
   边界族（帧间 store/zoom 变化+fast fallback/guard→slow success 迁移面）立项条件
   =真实复现证据。

## §5 沿承挂账

- open 池=8 张（§2）；压着清单+store 拆件候选沿承 v227 §5。
- 锁分级余量迁移：unit CSS 源文本族 ~158 处+e2e 精确像素余量=常规随批应用（v227
  §5 沿承不变）。
- 门一终确认 N 级登记项（不处置在册）：preservePaint fallback/guard 迁移面已知
  边界（d1-W2/k1-W4）；normalizedOffsetsOf try 外=既有模式（d1-N5）；selText 非空
  断言=行为钉（M10 恒真核查披露）。

## §6 CI 回执

- 本批实现笔=07b6f249+docs 笔=b1d02e2c 已推送（075eecb3..b1d02e2c——4098b28f/
  fbf7b0d9 经 amend 重组：范围闸逐提交判定，[test-refactor] 尾注误挂须改提交
  信息清偿，尾注史留痕=仓外批档 closeout.md §四-1）；CI run=39531953369
  **success 亲验**（manifest 尾注检查+六道关卡双 job 全绿——spec 改动面 CI 窄
  视口首秀绿，观察位清零）。
- 本交接书 docs 笔=下场首动作核验对象（本笔推送后随 supersede 形态既定）。
