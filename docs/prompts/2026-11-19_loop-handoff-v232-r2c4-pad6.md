# 交接书 v232 —— R2-C4 PAD 4→6 契约重基线收口（结构排查+下场序锁定）

> 取代 v231（2026-11-19 R2-C3 手动提交门收口笔）。本场=2026-11-19 R2-C4
> 会话（runId=20261119-r2c4）：用户裁决 §4-1 选项 C（折中 PAD=6），按
> 「契约重基线」规模全链「实现→独立审查→回派修正→e2e 拓扑裁决→提交→
> CI」收口；另完成用户加单的 lineage 域结构排查（.zcode/dev-troupe/
> structural-audit/report.md）与 R2-C5 压力 e2e 设计定案。

## §0 本场总账

- **首动作=v231 §6 CI 回执核验**：44356145067（3ad8db98）success。
- **用户概念求证（本場第 1 问）**：线-线平行间距（s∈{6,9}+SLOT_L_MIN=8）
  与线-卡最小间距（PAD 命中判据+SLOT_STUB=10 落位内缩+RING_MARGIN 外圈
  让距）是**两组独立量**——走线从不把别的线当障碍（障碍集=矩形：卡∪月标
  ∪年份头）。PAD 4→6 不改平行线间距，只改线-卡净空与车道数/封闭阈公式。
- **R2-C4 PAD 4→6（4a7b248f，CI 44430207560 success——首跑 e2e 段
  R1-B1 非确定超时单现，复跑定绿，flake 台账登记 observing）**：
  1. 单源 avoid.ts:13 改值+裁决标注；消费面自动跟随（bands/gap-cells
     车道式与封闭阈、detour 阻挡带、outer-ring RING_MARGIN 14→16、
     zapply jog 阈 12→16、edge-edit 穿卡、chain h-slip 门）。
  2. 重基线量级实证：38 例契约红（先红后绿留档）→ 全量公式手推重推导
     （48 处断言+6 处 PAD 边界夹具平移——平移原则=被锁判别量同值，
     审查岗逐项复核「未削弱」）；pin-routing 金标 17 例零敏感未动。
  3. **拓扑迁移与新契约知识**（随测试注释留档）：h-slip 斜段存活 ⇔
     x 进程占比 dx/(|dx|+|dy|)>PAD/10=0.6（双侧膨胀边距=10·share−PAD）
     ——陡斜直连降 band（T1 左向锁扁平化 share=0.729 承载；T2 陡斜例
     重基线 band+新增扁平承载例锁 anchorMarks；selectAnchor 陡斜分支
     核查=非死分支：direct 门/overlap 兜底/编辑链三面可达）；带宽∈
     (8,12] 带/列带新封闭；阻挡带膨胀合并面前移（BLOCK_MERGE_GAP=28
     不变，膨胀带各 +4）。
  4. **独立审查（reviewer=zipoo）FAIL→全修**：实现与断言本体零缺陷；
     FAIL 项=3 处手推注释算错（cutB.y 722.5/WALL 右缘 706/W2 下缘
     436）+8 处旧口径注释+穿卡用例不区分 4/6——全部回派修正；新增
     穿卡 PAD 边界对 y=178/178.1 带变异验证（PAD 临时回 4 转红=判别力
     实证，cp 备份法还原 diff 空）。
  5. **e2e 拓扑裁决（主控）**：R4 跨年绕行族 route∈{band,detour} 扩
     outer-ring——年头膨胀封死 band 终落三槽→链合法降级（v231 预测面），
     钉定端点不变量 zoom 三档复验通过（重基线定性=拓扑迁移非缺陷）。
     e2e 终局 158/158（本地 19.8m；CI 首跑 157+1 flaky 复跑绿）。
  6. 文档：INV-110「PAD 同源 4→6」随批回写；architecture 公式形态无
     陈旧值零改动。
- **结构排查（用户直接下单，research=startplan）**：零函数级死代码+
  corridor 退役零残留+陡斜死分支疑云探针否证+「use-edge-edit 656 豁免」
  真相=raw 行数债（有效 497，ESLint 未破 500 硬限）+恢复链四件/write-queue
  判定必要。欠账=3 零消费 export+2 处孤儿注释+2 双源合并机会（e2e PAD
  镜面可改 import；detour.ts 月框常量可并入 capacity.ts）。
- **组织面**：面板派发沿承（executor=glm/reviewer=zipoo/research=
  startplan），账本本 runId 4 行+1 收口行。

## §1 下场序（新会话接续清单，按优先级）

1. **首动作=核本交接书 CI 回执**（§6——4a7b248f 的 run 44430207560
   已 success〔复跑〕，核防推送后另有笔）。
2. **卫生批（用户已裁）**：P0=收 3 零消费 export（fullPoints/
   blockingBands/OccupancySource）+清两处孤儿注释（use-edge-edit.ts:
   85-86、EdgeOverlay.tsx lane 退役残段）；P1=e2e route-slots PAD 镜面
   改 import（lineage.spec.ts:71 有 capacity 直引先例）+detour.ts 月框
   常量并入 capacity.ts（INV-SLOTGRID-01 双源收敛）。独立小 commit，
   type export 收回须跑 typecheck。
3. **R2-C5 压力 e2e（用户已同意方案）**：单月 20 文献+固定确定性边表
   30~40 条（UNIQUE(from,to) 全异端点对），七条不变量断言（全覆盖/
   坐标集封闭/占用互斥+豁免清单显式化/容量不超限/第三方净空/平行间距
   ≥s/确定性两次 routeEpoch hash 全等）。三护栏：不加产品观测面、豁免
   清单单源对齐 INV、零镜面常量（PAD/s import 单源）。实现第一步=从
   代码+INV 提取占用豁免面，发现未登记共用形态即停呈报。
4. **R5 拖动空槽位系统**：先出设计稿呈用户（v230 §0-4 裁决锁），与
   card-drag-session 换位交互是替换关系。
5. 视检轮其余清单项（用户面）；F-SNAPHINT-01 观察沿承。

## §2 测试版本路线（位次推进）

| 序 | 票 | 状态 |
|---|---|---|
| 1-9 | （前九项） | done（v229 在档） |
| 10 | 集中视检轮 | 进行中（R1/R2-C1/C2/C3/**C4 done**；R5 待做；压力 e2e=R2-C5 排入） |
| 11 | dist 测试版 | 终点（R5 收口+R2-C5 后进入；F-RECOV-03 dist 前清偿沿承） |

## §3 治理注记（本场增量）

1. h-slip 存活律（PAD/10 阈值+10·share−PAD 边距式）是 PAD 类常量的
   **派生契约**：未来再动 PAD/STUB_PATH 须先重推此律，陡斜族用例会
   集体降 band（T2 教训：按 PAD=4 边界手调的夹具在常量迁移时最先碎）。
2. 重基线类改动的审查价值排序实证：实现岗 48 处断言全对、错的全是
   **注释里的手推数值**（3 处）——「注释推导必须可复算」FAIL 线抓的
   是下轮重基线的推导依据污染，值得沿用。
3. 变异验证（cp 备份法）证明测试判别力：新断言对旧契约转红才算有牙
   ——边界对类新用例（区分两常量口径）的标准工序。
4. e2e route 族断言在契约重基线时的裁决序：先判「测试本体不变量是否
   仍成立」（R4=钉定端点 zoom 三档复验）→ 成立则 route 族扩容=合法
   拓扑迁移；不成立才立案缺陷。
5. R1-B1（ai-tasks-card:99）CI 超时首现（observing）——同 spec E2
   前科在案但不同用例不并案；两次触发立案线沿承。

## §4 待用户面

1. R5 设计稿呈裁（§1-4）。
2. 选区分板块设计讨论待用户开启（沿承 v231）。
3. PAD=6 后实际观感复核：陡斜连线折线增多+阻挡带合并前移是既定代价
   （§0-3），用户使用中若不满可再议（回退窗口=下次契约重基线前）。

## §5 沿承挂账

- open 池不变=5 张（F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-E2EFLK-01/
  F-RECOV-03——本场未动 registry）。
- chain.ts 360 行 routeOne 抽取（审查 N1）沿承；use-edge-edit.ts
  656 raw/497 有效（排查定谳=raw 债非违规，偿还路径=P2 观察项）。
- 结构排查 P2/P3 观察项：三注册表（AnchorUse/ChannelUse/SlotUse）同型
  疑似（给不出后悔反例不立案）、DFS_BUDGET=512 触达性无法静态证实。
- C2 缩减项（连通图搜索/有限回溯）沿承——PAD=6 后如出现新 blocked
  形态仍是第一候选补强面。

## §6 CI 回执与推送状态

- 4a7b248f（R2-C4 PAD 4→6）：CI 44430207560 **success**（亲验；首跑
  e2e 段 R1-B1 非确定超时→Playwright 同 run 重试绿但孤儿错误致退出码
  1→gh rerun --failed 复跑全绿；flake 台账 observing 登记）。
- v231 尾笔 44358509284 success（本场首动作核验）。
