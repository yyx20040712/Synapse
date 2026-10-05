# 交接书 v132 —— F-UIRES-03 T0 测试层基建批交付（2026-10-05 晚场二）

> 前承 v131（T0 前置指令）。本档=T0 批三屋全链交付全录：executor
> 基批+RR1→门一双审双 PWC→双席复核双 PASS→probe 八项矩阵→裁决部
> GO_WITH_CONDITIONS（五条件全兑现于本笔）。设计稿随批升 **v1.6**。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋派发链主战场）；test-driven-development=用
（T0 本身=TDD 先红证形态——样板用例预期红/两向变异红证）；
verification-before-completion=用（收口亲验 verify 真退出码）；
systematic-debugging=不用（无排障面——样板红=预期红；RR1 机制定位属
实施探查非排障流程）；subagent-driven-development=不用（三屋已由
ai-dev-org+宪法特化覆盖）。配置：主控=GLM5.3 宿主档；executor/probe=
随宿主未绑定岗（session:host-tier）；门一 k1=ops-gate1-k1（kimi-third
座 $max）+d1（deepseek 座 $max）；裁决部=ops-adjudicator（$max）。

## §1 基线终态（对不上禁提交）

- 基线=9a65b3b0197（v1.5，CI success 亲验）+6614b53ddbc（v131，success）
  ——段内三笔 docs 笔 cancelled=连续推送被新 run 取代的正常形态。
- 本场终态=T0 批一笔（tests 三改两新+manifest+registry 立票+设计稿
  v1.6+交接书 v132+账本）。verify 终验 EXIT=0（251 件/2581 例）+定向
  e2e 15 passed/0 failed/0 skipped+locks 353+test-surface cases 2659/
  assertions 8453/豁免 0。

## §2 T0 交付摘要

- **helper 族**：tests/e2e/geo-probes.ts 五件（expectRectNear/
  expectRectStable[RR1 补 n≥2 守卫]/freezeAnimations/zoomProbe[Ctrl+
  wheel 步进+badge 复位+try-finally]/frameProbe+assertNoJump）——测量
  口径单源=**gBCR 同源 CSS px**（「DPR 取整」表述经实测[385.2 带小数]
  勘误——RR1-5）；双模式边界=冻结优先+采样仅连续性。tests/utils/
  live-frame.ts 随动模型 helper（stubLiveFrame 参数化+stubRowFollowFlow
  流序派生）——stretch 零语义迁移（主控 diff 级亲验定值 200/94/92/600
  逐值对上）+card-drag:210 示范件（绿=几何缺陷不在该单测面，如实申报）。
- **三样板实态**（lineage.spec.ts 1271→~1596 行；T13 zoom 段 zoomProbe
  冒烟迁移）：
  - **样板①=红实锚**：候选槽 DOM 在场（计数 2/宽高>0/落框内全绿）但
    槽位命中红——候选位距最近插入位 **64.4px**（两次独立运行同值=
    确定性缺陷）。图四症一「不显示」正身=**显示在错位**。
  - **样板②=红实锚（RR1 后）**：跟随采样三档绿（跟随不变性真）+
    **绝对锚三档全红**=激活期恒定错位实锤——拖卡 inline 内容坐标数学
    正确但包含块=position:relative 的 .month-frame（theme-lineage.css:55）
    非 .tl-content——frame 原点双计，拖起跳 ≈66,72 内容 px。图四「右下
    漂移」正身=激活期包含块错位，非跟随期漂移。
  - **样板③=绿卫士**：hint 锚（r=3.2 画布 px 随 z 缩放）三档 zoom 几何
    精确——「待连接点离卡远」真域=DrawPreview 端点/预览线渲染链（C2
    调查域）。如实申报未硬造红。
- **预期红承载形态备案（后续单元沿用）**：playwright test.fixme/skip
  字面量被 quality 占位词表+test-surface skipSites **双机检结构性拦死**
  （k1/d1 独立实证）——预期红用例一律以**预期失败包装**承载（内层强
  断言必抛→捕获绿；修复后外层自动转红提醒去包装翻转直陈）。
- **门链**：executor 基批（六自裁全主控追认）→门一 k1 B0/W2/N7+d1
  B0/W3/N5 双 PWC（双席异构共中 W1 偏移自指）→RR1 五小修（绝对锚
  [红→包装]/口径边界/n 守卫/保存步条件式/注释实述）→复核 k1 PASS
  B0/W0/N4+d1 PASS B0/W0/N3→probe 八项矩阵全绿（verify+定向 e2e+
  stats 断言计数机器裁决 8453 对[d1 静态复算漏 :1411 负锚链——
  8427+26=8453 闭环]+**两向变异实证**[容差放大→绊线红消息原文/
  绊线翻转→Expected false Received true=缺陷在场锁定]+diff 面恰六
  文件零 src+locks 双绿+单测 23 passed）→裁决部 GO_WITH_CONDITIONS
  五条件全兑现（A-E 复算全成立；E 账本 35,752,050 tokens 复算两轮一致）。
- **主控亲验**：diff --stat 面/两单测迁移 diff 级/样板②包装形态/
  locks 解锁-改-重锁两行注释勘误（d1-N2 frameProbe 口径矛盾+k1-N-RR1-1
  头注措辞——「本批引入本批清」）/registry F-UIRES-03 立票（open 态
  ——B/C 七单元待施）/设计稿 v1.6 回写。

## §3 操作条款增补（承 v131 §3 全项外）

- **预期失败包装=预期红唯一合规承载形态**（fixme/skip 被双机检拦死
  ——B/C 单元 DoD 写「先红证」时指本形态；转绿=去包装翻转直陈）。
- 测量口径单源边界=geo-probes 头注三类断言（邻近/稳定/无瞬跳）；用例
  侧包含/命中/跟随类容差须在消息或注释标依据出处（W2 处置形态）。

## §4 挂账与下场首办

- **下场首办=B1 标签下拉七条**（实施序 v1.4：B1→B4→B2→B3→C3→C1→C2；
  B/C 各单元 DoD=设计稿 §6+§8 标准+v1.6 回写增项）。
- C3 开工输入（v1.6 机制定位版）：症一=DragCandidates deps 增布局稳定
  信号/稳定后重捕获；漂移=containing-block 对齐；DoD=两轴残差对账
  （X 0.956/Y 0.944）+样板①②去包装销项+TimelineYears.tsx:9 陈旧注释
  搭车清理+geo-probes Ctrl 持键 try/finally 加固。
- C2 开工输入：DrawPreview 端点/预览线渲染链=调查主向；样板③随「直径
  8+stroke 1.5」形态落地同步改写 r=3.2 断言。
- N 级备案归口（不丢）：Ctrl 持键 try/finally/catch TypeError 面/
  expectRectStable NaN 面——C 批消费前处理；expectRectStable/frameProbe/
  assertNoJump 三件消费面=B/C 批。
- CI 首查：本场一笔 run。

## §5 新会话开工序

1. CI 首查一笔 run。
2. B1 派发（票面=设计稿 §2 B1 节+§6 纪律+§8 标准；新测试 always-active
   +先红后绿；退役面四件+四件单测豁免登记 reason=本稿 rulingLink=设计稿）。
3. B1 毕后 B4→B2→B3→C3（C3 输入=§4 机制定位版）→C1→C2。

## §6 本场成本（模型×供应商×套餐分列——收口登记）

- executor（GLM5.3 coding plan 宿主随岗）：基批 18,696,744+RR1
  8,922,855 subagent tokens。
- 门一 k1（kimi-third 座 $max 绑定）：一审 1,325,366+复核 586,634。
- 门一 d1（deepseek 座 $max 绑定）：一审 2,190,804+复核 2,179,210。
- probe（GLM5.3 宿主随岗）：1,850,437。
- 裁决部（$max 绑定）：1,795,160。
- 合计 35,752,050 subagent tokens（裁决部复算两轮一致）。账本 635→
  644（单元七行+commit 行——随收口笔落）。
