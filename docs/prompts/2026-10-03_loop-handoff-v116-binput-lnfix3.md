# 交接书 v116 —— B 案输入分族根治性诊断+INV-100 登记+脉络批 3 全链收口档（2026-10-03）

> 前承 v115。本档=同日第三场：CI 终局 run 全量分族（**B 案输入根治性坍缩
> ——35 红中 34 例同单一结构性根因**）+lnfix2-C2/C4 兑现登记+脉络批 3
> （诊断先行→终裁→实现→双审 FAIL→回炉→PASS→GWC 全链）。

## §0 本场消耗与开工记录

用户开场=「继续开发」承 v115 §5。技能清点：ai-dev-org/subagent-driven-
development/verification-before-completion=用；systematic-debugging=用
（CI 分族+批 3 诊断）；test-driven-development=executor 面用；
dispatching-parallel-agents=双审并行派发用；frontend 族/dynamic-workflows=
不用。配置：executor/probe=随宿主（session:host-tier）；k1=Kimi 链 $max；
d1/裁决部=deepseek $max。

消耗：executor 两轮（lnfix3 首轮 4.87M+回炉 3.08M）+门一 6 席（k1×3/
d1×2 含首轮双 FAIL+复审双 PASS+inv100/dataroute 两单审）+probe×1+裁决部×1
+主控亲执（CI 分族+根因探针+用户库副本探针+INV-100/data-route 两单点批
+批 3 诊断终裁/回炉裁决/T-P1b 迁移裁决+提交四笔+推送+账本 551→564[13 行]）。

## §1 基线终态（对不上禁提交）

- **提交四笔（本会话）**：INV-100 eaa7f41870d [locked-change]+data-route
  99eacd5e654+lnfix3 798247c9a35 [locked-change][test-refactor]；推送
  c3c7ea67cd5..798247c9a35（**五笔含 v115 两 docs**）origin/main 同步。
  registry 不立票（脉络战役批=交接书承载先例沿用）。
- **verify 终态 EXIT=0=255 件/2602 例**（+4 例：routing 批 3 例 A/B/C+回炉
  例 D）；**e2e 本地 T-P1b 1.7s 绿**（迁移后）；**locks 355**；bands 206/
  anchors 171 行均达标。
- **CI 新 run（798247c9a35 触发）待首查**（见 §5 首项）。

## §2 B 案输入——CI run 37114688270 全量分族（主控亲执，根治性结论）

- **40 绿/35 红构成**：40 绿=不依赖「点击文献列表行」前置的用例（脉络
  T 系 10 例——**T12b 绿（勘正 v115「T12b 亦红」——lineage 12 例=T1/T4
  红+10 绿，v115 所据为旧 run 数据）**+corpus-export/folders-crud/
  import-drag/S2 等）。35 红=**30 超时型+5 断言型**，35 例全部首发红+重试
  红双红（零 flaky）。
- **超时型 30 例全动作型**（dblclick 24/click 6——非等待型）：全部
  `getByText('<文献标题>').first()` **已 resolve 到
  `<span class="lib-r-title">`** 但恒 `element is not visible`（116×500ms
  恒态非闪态）=元素在 DOM、结构性不可见。
- **断言型 5 例中 4 例同现象**（import-to-folder×2/workspaces/move-paper
  的 toBeVisible 失败对象同为 lib-r-title span，`unexpected value
  "hidden"`）；仅 lineage T1（toBeLessThan 80 实收 96.75=坐标漂移族）独立。
  **→ 35 红中 34 例=同一结构性根因**。
- **根因实证（主控无头探针 probe-librow-vis.mjs）**：`.lib-r-main`
  （flex:1; min-width:0）窗口宽 1024 时塌至 **0 宽**（span 空 box→not
  visible）；1152 时 18px 濒塌；1280/1285 正常（151.6px）。链路=CI runner
  虚拟屏 1024→`window-state.ts` clamp `min(1280, screen.width)`=1024→
  文献库多栏布局下 `.lib-r-main` 被固定宽列（tags 180+year 74+cite 52+id
  46+gaps/padding）挤空。**定性=真产品缺陷**（真实用户窄窗口同样遇标题
  列全灭），非纯测试环境问题。
- **B 案战役输入完备**：从「逐用例适配 35 例」坍缩为「单根因修复+1 坐标
  漂移小族」。修复候选（下场首战裁决）：A 产品修=`.lib-r-main` min-width
  （或 tags 列允许收缩）——治本；B 测试兜底=e2e launch 后 setContentSize
  突破 clamp；坐标漂移族（T1）另列慢机宽容面。
- 证据件（仓外）：`E:/zcode_md/synapse-archive/tmp/`——ci-37114688270-
  failed.log（4705 行）+split-ci.pl/split-ci-out.txt（分族）+red-kind.txt+
  probe-librow-vis.mjs+ci-artifacts/（gh run download 99M 含 35 trace）。

## §3 批次门链与交付

- **INV-100 登记**（eaa7f41870d，纯文档小批 [locked-change]）：lnfix2 裁决
  部 C2（冻结基准时效假设显式化）+C4（94=12+82 值耦合落档）兑现；C3 帧时序
  用例挂账驻条。门链=主控亲执（unlock→改→apply 两轮+verify 0×2）+k1 单审
  有条件放行 B0/W1/N3——**W1「恒不读」措辞与 rAF 校准写路径张力本批即修**
  （改「仅经 guard 四条件下 rAF 单次校准进入冻结字段，其余路径零读」）；
  N2 声明处粒度（:91/:199 未入列）顺下次触册捎带。
- **data-route 观测窗**（99eacd5e654，单点观测窗批 1 行）：EdgeOverlay 可见
  层 path 增 `data-route={p.route}`（RouteTag 六态必有字段纯透传）——供批 3
  诊断探针+e2e 断言锚。**单点观测窗批先例类成立（k1-W1 登记，三要件）**：
  ①零行为变更（data-* 纯透传）②零测试面变更③后续实现批全门链覆盖本行
  消费；=主控亲执+k1 单审（先例援引单点配置批三连）。W2（CSS 属性选择器
  预存疑）亲验消解（全仓 grep 零属性选择器）。
- **lnfix3=脉络批 3 走线绕右修正**（798247c9a35，5 件 238+/63-）：
  - **诊断先行（k1 档前置第 0 步，主控亲执）**：用户库副本探针
    （probe-lineage-routes.mjs——workspaces 副拷，禁直触真实 userData；
    k1-N2 对账 data-edge-id/data-route 计数采纳）→default 课题 8 卡 1 边
    唯一边 corridor 且 **tgtFirstRow=true+tgtXTagOverlap=true**（k1 档
    月标封堵推演用户库实锤）；ws-059434f6 空图；带封闭备选成因排除（月框
    单卡带空间足）→**终裁方向=band 终落锚散开**；样本量 1 边如实申报
    （方向确认级非统计级）。
  - **实现**：bands.ts 终落段单候选→同边三槽候选族循环（基序=sb 几何
    首选；use.has 占用预检〔anchors.ts 新增纯查——几何散开域与占用散开域
    正交〕→vClear+segHitsAny→首成功=picks 落记生效锚）；全失败维持降级
    corridor。lineage-routing.test 18→22 例（A 月标挡首选→散开终落 d 手推/
    B 同边三挡→null 降级/C picks 落记/D use 预 commit 净空槽→has 承重首红
    224≠256）。T-P1b 迁移（主控裁决形态）：corridor 参数族谓词退役→
    **route=band 直证（data-route 消费）**+路径卡锚定几何两档全等+relY
    恒定+128 点折线段×月标 rect Liang-Barsky 段化判交。
  - **门链全折**：executor 首轮（变异四红证+verify 2601+两条 e2e 断言
    改道自裁——bbox 判交假阳性/bbox.x 不动，探针实证支撑）→**门一双审
    k1 B2W2N1+d1 B1W5N3 双 FAIL 一致**（B1=邻边候选校验与 L 形实际路径
    脱节+分支从未真跑；B2=spread 绕过 AnchorUse 占用域）→主控回炉裁决
    （采 k1 方案 B 收窄删邻边+has 预检+基序 sb+段化判交）→executor 回炉
    （例 D 首红实锤 B2 缺陷形态）→**双审复审 k1 B0W1N5+d1 B0W2N4 双
    PASS**（probe 异常「bands:190 活 pb」=corridorSkeleton 独立作用域，
    主控亲验消解）→probe 矩阵 7/7 绿（verify 255 件/2602 例+routing
    22/22+T-P1b/T12b e2e+locks 355+蔓延 grep 零）→**裁决部
    GO_WITH_CONDITIONS**（数字对账全链自洽；B1/B2 完备清偿；tgtAnchorX
    换源仅序变非正确性成立）。

## §4 挂账与登记（带单清单）

- **B 案首修批（下场首战）**：lib-r-main 塌陷修复（§2 修复候选 A/B 裁决
  位）+修复后 CI 验证（预期 34 红族大面转绿——T1 坐标漂移族另列）；与
  timeout-180 回调条件联动（e2e 红≤5 或连续 3 run≤45min→回调 60/90）。
- **lnfix3 裁决部 C1**：tgtAnchorX 三重合盲区（use≠undefined∧首槽让位∧
  跨带下降）测试债——后续覆盖票（P2；k1-W1/d1-W1 双审同款）。
- **lnfix3 裁决部 C2**：邻边逃逸票（同边三槽全挡场景——bands.ts:123 注记
  在案，无用户库/e2e 实证需求，P2）。
- **lnfix3 裁决部 C3**：e2e 判交口径注记（128 段化判交相触=命中 vs avoid.ts
  PAD=4 膨胀的 4px 环差——P3）。
- **lnfix3 裁决部 C4**：thirdParty 排 src 低概率穿源卡+横移段隐式依赖带
  净空（P3 记录在案）。
- **单点观测窗批先例类**（k1-dataroute-W1）：三要件已定格（§3）——后续
  src 面单审须逐条对表，防分级口径棘轮。
- **INV-100 承载挂账**：C3 帧时序用例（rAF guard 跳过分支/高卡离流校准/
  12px 死区收敛）+94 值耦合 CSS 变量化（可选票）+k1-N2 声明处粒度。
- **timeout-180 k1-W2 沿承**：CI cancelled 无报告——报告步 if:always()
  或 e2e 拆独立 job（后续票）。
- 事故档候选（本日新增）：①「window-state clamp 致窄屏布局塌陷」（B 案
  根因——建议随 B 案修复批回流）；②「Playwright electron context 不吃
  use.* 配置」（v115 已列承）。
- 承 v114/v115 挂账：键盘可达性专项断言/正则精确断言/TagDropdown 248 拆件
  预警/FolderNav resizer/NodeMenu 双入口退役知悉/lnfix1 C3 四项
  （恰值边界例/draw-dashed hint 例/helper 复制抽稀 test-refactor 票/
  lineage-drawline 484 头寸）。

## §5 新会话开工序

1. **CI 新 run 首查**（798247c9a35 触发）：核对 T-P1b 迁移后 CI 面（预期
   e2e 红≈34——B 案已知族；T-P1b 本地绿 CI 面观察=窗口 1024 下 T-P1b 是否
   也受布局塌陷影响——**注意：lineage 页布局与文献库不同，T 系 CI 已绿
   面（T2-T13 十例）不受此根因影响，T-P1b 迁移断言 route=band 依赖渲染
   非文献列表，预期仍绿**）；若 T-P1b CI 绿=T-P1b 迁移 CI 验收毕。
2. **B 案首修批派发**（§4 首条——修复候选 A/B 主控裁决后立批；输入=§2
   分族+探针证据链完备）。
3. 用户续视检（v115 §5 承：画线锚点指示/容差 12 体感/下拉扩展 stretch
   动画+**新增批 3 绕右修复观感**——用户库实图跨年边应不再绕右）→功能
   终态冻结→DB 战役设计稿呈裁（v113 §5 不变）。
4. S5 盲形清单搭车（承 v110）。

## §6 操作条款存续

承 v115 §6（=v114 §6）全项。单点配置批=主控亲执+k1 单审+亲验机检矩阵；
**单点观测窗批先例类新立（三要件见 §3）**——src 零行为变更观测面适用。
门一常设双审=k1+d1。测试面提交=[locked-change][test-refactor] 双尾注
（lnfix3 实证）。账本 551→564。
