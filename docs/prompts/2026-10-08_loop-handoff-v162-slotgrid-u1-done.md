# 交接书 v162 —— F-SLOTGRID-01 U1 布局网格化+瀑布退役·三屋全链毕（2026-10-08）

> 前承 v161（呈裁落定·实施批开窗）。本档=U1 收口单写（registry 注记+账本+
> verify 亲验随附提交）。**下场开工序单源=§1**。

## §0 U1 批结果（runId=20261008-slotgrid-u1）

- **交付**：capacity.ts（149 行纯函数族——N/M 容量/相位 o=100/数组序分行/
  index↔(row,col) 双射/hitTest 卡位契约〔rowCounts 残行钳+空数组/NaN 守卫；
  追加位不属契约=主控终裁，插入语义 U3 接线定〕）+use-capacity-layout.ts
  （72 行——W 状态机 unmeasured→measured；W 源=getComputedStyle 首月框
  width〔非 gBCR=transform 正交〕；RO→rAF 合并+挂载帧首读；routeEpoch
  三源沿承）+TimelineYears 行容器化（.month-frame>.tl-row>.tl-card，奇行
  padding-left 100）+瀑布退役四件+CSS（margin 右 58→46/.tl-row 族/
  tl-measure 两规则删）+INV-SLOTGRID-01 登记（含 zoom 载体句+非 gBCR 句）。
- **首动作锚定两勘误**（入 registry 注记）：①box-sizing=**全局 border-box**
  （tailwind v4 preflight——设计书 N21①「无全局 border-box」**作废**；卡
  128×72=border-box 值实测成立）；②W 探针复现 558.4/1192.8 精确、margin
  载体=.tl-month（非框自身）。**U2 顺带锚**：线宽实测 1.6px（设计书「线宽
  2」注记偏差——L_min=8 公式不变仅注记）、月标注矩形 65.1×21.2 @内容坐标
  (79.6,72.2)、post-U1 W=570.4/1204.8（容量 3/2、6/5 不变）。
- **三屋链**：executor 两轮（交付+回炉轮 1）→门一 k1+d1 双审两轮（首审
  B0/W4+4/N10+9→回炉〔hitTest 契约+奇行拖拽补例+N 修〕→增量复审
  B0/W0+N10+B0/W2+N9→主控微处置〔NaN 守卫+头注措辞+INV 句；变异 A/B
  红证双杀〕）→门二实证 8/8（verify/e2e 独立复跑+数学 12/12 独立复算+
  删除完整性+行数+豁免对账；**抓获主控简报 bond 方向笔误=纵深防御正实证**）
  →裁决部终裁 **PASS**（关键数字独立重算全复现；收口条件两条均已执行=
  INV 计数 21 修正+简报数字纪律立案）。
- **纪律立案（裁决部整改项）**：派单简报凡携带数字/方向性预期须**手算留痕
  或显式标注「未验证预期，以实证为准」」（本批主控 bond 方向笔误根因——
  实证部手算拦截未传播）。
- **数字**：单测 2765/2765（265 文件）+e2e α 两 spec 22/22+豁免 16 条
  （timeline 11/card-drag 2/overlay 1/routing 1/e2e 1）+locks 373+verify
  EXIT=0 亲验。

## §1 下一场开工序（单源）

1. **U2 走线正统化∥U3 拖拽网格联动**（依赖 U1 已毕；文件级不相交——
   capacity.ts 双方只读；并行派发，实测相交则主控串行化兜底）：
   - **U2**（设计书 §8-U2 全条目）：删 corridor/fallback 骨架/
     defaultCorridor/CORRIDOR_* 常量族；detour.ts 段式七步（候选字典序=
     〔被阻段遍历序,拐弯数,|Δx|,x〕——v1.4 用户裁决）+band 段式限域+槽位
     新规则（n=clamp(⌊(域−8)/8⌋,0,5)/封闭<36）+overlap 兜底（L 形先横后
     竖+overlapExempt 透出）+INV-110/119 修订+INV-SLOTGRID-02 登记（坐标
     集封闭）+chain.ts ≤320 行+单测六件处置（126 用例逐件+逐用例豁免）+
     e2e β 批（anchor-consistency/route-slots 重基线）+探针回归三断言。
     **U2 输入锚**：线宽 1.6/标注矩形 65.1×21.2/W=570.4|1204.8/空卡位区=
     通道域非障碍（W18 网格基）；shiftedIds 恒空 prop 面处置（U1 注记）。
   - **U3**（设计书 §8-U3）：INV-111 算术化接线（hitTest padding-box 坐标
     系——capacity.ts 已造函数+21 例锁数学）+F-DRAGVIS-01 阵列网格化（含
     φ_r）+FLIP/settle 回评判据（≤1px×3 帧）+e2e γ 批（drag e2e 用例数首
     动作实测）。**U3 输入项**（U1 注记承载）：拖拽插入**推挤滞回双稳态**
     （网格横排固有——ph 插入后卡位右移致指针带漂移；e2e 插入位多样性例
     已改 1280+行首带瞄准；治理〔粘滞/滞回带〕需求确认）、拖卡双占末行
     语义显式确认、settle 前同帧双 end 窗口补断言、React key 跨父重挂复核
     （卡组件零内态亲验+FLIP rect 重查式——U3 回评判据落地时一并核）。
2. **U4 收口**：全量 verify+test-surface 基线再生成+locks+invariants 完整
   性核验+architecture.md/ADR 回写（SLOTGRID 布局范式=ADR 面）+chain.ts
   行数实测+探针复跑前后对照（仓外）。
3. 治理沿承：F-SNAPHINT-01 挂起待复现条件（v161 §0.4）；F-ANCHFIX-01 P1
   遗留六项沿承（v157 §2）；批 3a-3d（F-UIRES-04）与实施批正交可并行
   （3a 必先）；DB 大票触发条件沿承 v159 §2.5；每单元 [locked-change]+批内
   回炉 ≤2+子代理成本入账本。

## §2 基线与治理

- HEAD=本档随附提交（U1 全部产物+registry 注记+INV+豁免+locks+交接书
  v162）；verify=收口亲验 EXIT=0（265 文件/2765 测试）。
- 成本账本 runId=20261008-slotgrid-u1：executor 两轮 ≈51.9M+门一双审四席
  ≈0.21M（k1/d1 各两轮）+probe ≈0.62M+adjudicator ≈0.03M subagent tokens
  （明细=账本行；executor/probe=随宿主未绑定形态——E3 欠账行在册）。
- 设计链账本（runId=20261007-slotgrid-open）沿承 v161 §2。
- 事故档回流候选新增一条：**派单简报数字预期纪律**（裁决部整改项——同
  2026-09-02 计数失实族）。
- 治理八指标沿承（locks 373→374 随新测试件登记微增——以 manifest 为准）。
