# 交接书 v235 —— F-LANEGRID-01 B4 收口（e2e 重基线 19 例+布局配套根治+⑥c 升硬+观测面+INV 六条）+CI 绿

> 取代 v234（2026-11-20 B1-B3 收口场）。本场=2026-11-20 B4 收口场
> （runId=20261119-lanegrid 续）：e2e 重基线全量+三项用户裁决（月标骑线
> 布局根治/data-overlap-spans 透出/搜索域窗口备案）+INV 六条重写+tickets
> 关账。**F-LANEGRID-01 整票关闭**。

## §0 本场总账

- **首动作核账**：origin/main 已与本地一致（e7877d77，用户已完成推送）
  ——v234 §1-1 force-push 事项消解。
- **CI 红归因（19 例）**：走线族 11 例=六态→grid 单态化+槽位机制退役的
  预期红面（v234 §1-2 清单兑现）；非走线族 7 例=011b3892 前端二期「详情
  抽屉窄视口首进收起」状态机欠账（export-clipboard/figure-extract/
  meta-year-month/tag×4——CI 1024×768 窄档抽屉默认收起，旧用例未适配；
  该提交 CI run 被取消未暴露）。另 T-P1b/AS-03 红根因升级为产品缺陷
  （下条）。
- **产品缺陷实证与根治（用户裁决·布局方案）**：B2 分配器下月标注（框内
  顶形态）底缘压卡顶 2.5px——tag∪卡死区连体埋掉卡 top ¼/½ 锚 10px 桩，
  自动边（未钉定）首选锚无净空散开机制（旧 bands 终落锚散开随六态删除）
  →**普通三卡跨年链整图 blocked**（T-P1b 实测两条边全 blocked、AS-03
  同根因、R2-C5 压力样本 1 条 blocked 同族）。B2 单测将该态锁定为「端点
  封死族」合约（lineage-routing-outer ③⑤），与旧链行为互斥——设计空白
  （设计稿 §3.4 端点封死族例示钉定锚，§5 删除散开重试未安排自动边承载
  位）。呈裁三轮：用户定向「布局根治」——**月标骑框线（中轴=框上边界，
  top:−10px，DOM 注入位提升 .tl-month 首位）+FRAME_PAD_TOP/BOTTOM
  18/12→38/38（对称）**：帧顶带 28/20 两道存活（tag 死区下缘=框内
  16px），top 锚解封并获 2 条接驳道，自动边首选锚自然可达——B2 合约
  单测零改动，月标障碍地位与净空承诺不变（线永不穿月标）。布局改动
  面=TimelineYears/CSS/capacity 三处+单测字面四件（capacity 常量锁/
  timeline CSS 文本锁三处/drag-grid S11 滚动位移 130→150 几何补偿）。
- **route-stress ⑤ 弦伪影修正**：旧 128 点弦采样在 r=6 圆角弧上「弦穿
  PAD 角区而弧轨迹净空」（实测拐点 (75,63.5)→(69,69.5) 弧距 tag PAD 角
  2.9px、弦穿）——⑤ 判定改 d 折线顶点判交+Q 弧 32 点贝塞尔细采样（对齐
  产品谓词=圆角前折线，弧段按真实渲染几何判定）。
- **⑥c 升硬（设计 §8 定案兑现）**：route-stress-assert 重写——④b/⑥/⑥b
  残余/槽域族断言整体删除（bandCap·maxOff 公式镜像两处核销）+
  SHARED_LEVEL_ROUTES 删除+非豁免对 Δ≥LANE_PITCH−TOL（8−0.6）+豁免仅
  overlapSpans 登记区间对（区间+标记双重校验：data-overlap-spans 解析
  「轴+坐标:起-止」与重叠段正长度相交）。变异验证：阈值 +4 毒化即红
  （违例全为 Δ=8.00 恰边界对——下限锚定实证）+豁免对真实非空（20 个
  overlapSpans 登记对：Δ=0 共线+Δ=8 相邻登记）。⑦ 序列化字段换
  lane/overlapSpans；采集器 ds.slot/ds.slotFallback 恒缺省残留删除。
- **data-overlap-spans 观测面透出（用户批准）**：EdgeOverlay path 挂
  data-overlap-spans（overlapSpans 串列非空时逗号连接）——⑥c 区间豁免
  e2e 数据源；INV-117 观测面域同步（五属性：route/lane/overlap-exempt/
  overlap-spans/anchors；旧 data-slot/data-slot-fallback/data-detour
  退役删除沿承）。
- **e2e 重基线 19 例全绿**：route-slots 5 例重写（值域 grid+车道表直算
  laneUniverse 零镜面+R4 retain 豁免概念退役+变异验证坐标封闭有齿）；
  anchor-consistency（R2/R3/R4 值域 grid+helper 外法线判定改 grid+R1
  重构=月标骑线后原钉定穿月标场景解封，安全网改 manual via 碰障承接
  〔R2-C3 合同〕+via 直写两相位）；T-P1b route=grid（含 resize poll 谓词
  连带）；AS-03 点击改路径中点采样（U 形绕行 bbox 中心空腔——探针实证
  中心点击 false/中点 true）；抽屉 7 例两态兼容展开（.lib-drawer count==0
  才点 .lib-detail-toggle，幂等）；lineage.spec 全量 27/27（线点击/编辑
  手柄族不受空腔影响实证）。
- **文档收口**：设计稿五处（§2.5-⑤ 帧顶带算例新布局数字/§3.2 搜索域
  窗口规则备案段/§5 CELL_EPS 删除→保留/§6.4 旧 via 遗产面登记〔不迁移、
  随重排/编辑消亡、零数据迁移面〕/§10-B4 关账表改文+§11-A 三项追加裁决
  〔骑线+38 对称/overlap-spans 透出/窗口备案〕）；INV 六条重写
  （SLOTGRID-02=锚∪车道表 buildLaneTable 单源/112=分配结果断言 ≥8+
  同道重叠⟹overlapSpans/115 退役〔s 承诺域由全局步长取代〕/79 blocked
  收窄〔端点封死族=钉定锚合法数据态+自动边经布局解封〕/119③ 接驳=外法
  线桩+锚道+EPS 单源改 grid/117 观测面五属性）；tickets F-LANEGRID-01
  →done+summary（B1-B4 全程+关账表）。
- **关账表（核销）**：DFS_BUDGET 触达性挂账（消费者 detour.ts 已删，
  src+tests 零残留负锚）；bandCap·maxOff 公式镜像两处（route-stress-
  assert 断言族删除）；CELL_EPS 保留改文（B2 回炉 m-2 裁决）；C2 缩减项
  =blocked 面由布局根治关闭；SHARED_LEVEL_ROUTES 删除（⑥c 升硬兑现）。
  挂账核销：v233 §5 本票清偿面（⑥c 豁免+INV-115 负面承诺域）兑现；
  F-LINEAGE-02 域内锚错峰挂账随本票兑现（chain stubSeq+carried 预载）。

- **独立审查（reviewer）与回炉**：B4 批 diff 独立审查 R1=FAIL（1B/3W/5N）
  →回炉全清：B-1=.month-frame.stretch 基准 12px 未随 FRAME_PAD_BOTTOM
  38 同步（拖卡下拉瞬间框底上跳 26px 回归+INV-100 互斥）——calc(38px+var)
  五文件同步（CSS/card-drag-session×2 注释/TimelineYears 注释/INV-100+
  live-frame 模型 94→120+card-stretch 传参），stretch 测试 8/8 绿；W-1=
  INV-SLOTGRID-01 三处失真（值/detour 消费/兜底侦测面）随批同步（兜底
  侦测改口=lineage-timeline CSS 交叉锁）；W-2=设计稿 §2 常量清单 18/12→
  38/38；W-3=tickets 计数 11+7→11+8（19 例实测口径）；N-1/N-2/N-3/N-5
  同批清（capacity 头注/INV-112 manual 覆向收窄/设计稿死区 [6,93]/⑤ 注释）；
  N-4（contentH 口径收紧——只能假红方向）备案接受（§4-2 挂账）。审查
  环境干扰披露：审查者误 kill 并发 e2e 进程致首轮全量 53 例中断——最终
  验证轮无干扰复跑承载。审查几何复核=帧顶带 4 道探针（tag x 域 28/20
  全宽活/12,4 死）+旧形态对照（顶带 2 道全灭+桩净距 −16.9）双证在档。

## §1 下场序（新会话清单）

1. **首动作**：核本交接书+CI 回执（B4 提交 push 后 success）。
2. **走线观感复核**（v234 §4-3 沿承+B4 新面）：脉络图跨年链/同列多卡/
   月标骑线视觉——建议截图呈用户（SYNAPSE_SHOT_DIR 或仓外探针）；重点
   =月标骑线观感+38/38 对称框高+跨年边 U 形绕行形态+错峰/溢出叠加区。
3. **dist 测试版进入**（路线序 11）：B4 后视检复核→打包 dist 测试版。
4. 沿承：R5 拖动空槽位设计稿、前端改造第三期（前端会话自主排程）、
   PAD=6 观感复核（v232 §4-3）。

## §2 治理注记（本场增量）

1. **布局常量双源交叉锁生效**：capacity.ts FRAME_PAD_* ↔ CSS padding
   字面双源，timeline.test 交叉锁（常量拼字断言 CSS 含对应值）本次实证
   有效——改值双红引导同步；drag-grid S11 类「隐含几何耦合」（滚动位移
   量隐含 row1 起 y=PAD_TOP+PITCH_Y）无锁，靠用例红暴露——布局常量
   变更时须跑全量单测而非分项。
1b. **布局常量第三源泄漏（reviewer B-1 教训）**：.stretch 的
   calc(12px+var) 基准是 FRAME_PAD_BOTTOM 的第三处镜像（无交叉锁、
   live-frame 模型硬编码 94 假绿）；布局常量改值时全文 grep 旧值字面
   （12px/18px 类）——同型风险=常量裸字面散驻 CSS calc 基准/测试模型
   默认参/comment，单点声明不承载全部镜像。
2. **e2e 采样判定的弦伪影类**：弧段（Q 贝塞尔）以弦近似判交在 PAD 角区
   产生假命中（r=6 弧弦偏差最大 ≈2.5px）——净空类探针一律「折线顶点+
   弧细采样」，禁全长均匀采样直接判交（route-stress ⑤/expectPathAvoids
   两处口径；expectPathAvoids 未改——其 128 点采样在同一弧类场景理论
   可复现，route-slots 五例当前绿=夹具无贴角拐点，挂账观察）。
3. **bbox 中心点击类**：SVG path 元素中心 click（含 force）在 U/N 形
   路径落空腔不可选中——线点击用 getPointAtLength 中点采样（AS-03 先例
   +lineage.spec 既有用例幸存实证=形态依赖，非系统性改写）。

## §3 测试版本路线

| 序 | 票 | 状态 |
|---|---|---|
| 10 | 集中视检轮 | R1/R2-C1~C5 done；R2-C6 车道网格 B1-B4 **done（本票关闭）** |
| 11 | dist 测试版 | **解锁进入**（B4 收口=视检复核后打包） |

## §4 待用户面

1. 走线观感复核（§1-2——附截图建议）。
2. expectPathAvoids 弦采样口径挂账（§2-2）——复现时按 route-stress ⑤
   同型修正。

## §5 沿承挂账

- open 池=5 张（F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-E2EFLK-01/
  F-RECOV-03——F-LANEGRID-01 已关）。
- use-edge-edit 656 raw 行数债（沿承观察）；E5 flake 台账沿承（v233
  §3-2）；R1-B1 沿承。
- 布局变更连带观察面：V67 视口地板/γ 系列几何用例全量绿（实测）；月标
  骑线后 .tl-month.unknown 变体/空态 frame-hift 无影响（单测绿）。

## §6 验证终态与 CI 回执

- 提交=87c1e392（27 文件 +1026/−698）；origin/main=87c1e392（正常推送，
  非强推——v234 修史链已由用户先行推送消解）。
- 本地 verify 全量绿（quality+tickets+lint+typecheck+test+build 退出码 0
  ；quality 449 行 CSS 上限内+零占位/乱码/双常量新增）；本地 test:e2e
  全量 passed（last-run failedTests=[]；首轮六例 electron.launch 竞态
  =审查进程污染 SingletonLock，清锁单跑 6/6 绿——flake 台账第 33 条记
  污染事件）。
- CI run 44681930043（87c1e392）：**failure——唯一红面=T1 断言迁移段**
  （画线 r1→r1 背向边后 path=0，两轮 retry 稳定红；本地 1280/1024 两档
  视口均绿）。**诊断三轮定案链**：轮 1（ddc033e5）T1 加布局稳定双读+
  诊断分流（expect.poll 10s+现场 dump）→CI 44685089959 现场=toasts 空+
  blocked 空+卡位正常（排除 bbox 陈旧/blocked 假设）；轮 2（777e4877）
  down→move 加 300ms 输入竞态窗+诊断增强→CI 44687923917 现场**定案**=
  `drawingCls 在场`（会话未终结）+`previewCount 0`+**`scrollTop 0→55`**
  ——拖拽窗口期 .timeline 被滚动锚定调整（CI 视口 720 内容溢出场景；
  本地 800 视口无溢出不可复现），mouseup 用拖拽前视口坐标随滚动偏移
  55px 未命中目标锚；轮 3（d61fc18d）mouseup 前重取目标 bbox 重新对准
  （自愈式），CI run 44690306163（d61fc18d）：**success**——B4 收口达成
  （T1 修复链三提交 ddc033e5/777e4877/d61fc18d 均随批全量绿）。
