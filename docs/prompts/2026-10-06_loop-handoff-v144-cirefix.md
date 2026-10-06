# 交接书 v144 —— F-UIRES-03 C2·P7 CI 红修复批（N5 提前最小子集·2026-10-06 午场第八场）

> 前承 v143（第五轮裁决落档）。本批=插场批：上场首查发现 v142/v143 两笔
> CI 均 Red（T-P1b e2e 确定性红）→主控亲执诊断→三屋全链修复。runId=
> 20261006-f-uires03-cirefix。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋派发+烤验触发表）；subagent-driven-
development=用（executor 派发）；test-driven-development=用（executor
侧 TDD 先红+变异红证）；verification-before-completion=用（verify/e2e
亲验+probe 独立重跑）；systematic-debugging=用（CI 红根因诊断——主控
亲执）。配置：executor/probe=随宿主（session:host-tier——2026-09-19
用户裁决未绑定形态）；门一 k1（kimi-third $max）+d1（deepseek $max）；
裁决部（kimi-third $max）。

## §1 基线终态（对不上禁提交）

- 基线=0b87fbfde98（v143）。本批 5 文件：src 单 hunk（edge-overlay-geom
  .ts 选择器收窄）+受锁测试同步（lineage-edge-overlay.test.tsx 夹具
  改挂+正锚/负锚 2 新例，2636→2638）+locks/manifest.json+设计稿 v1.16
  三处+invariants.md INV-110+registry 两票注记（F-UIRES-03/F-ROUTE-02
  ）+本档。verify 收口复跑 EXIT=0（258 件/2638 例）；locks 363 持平；
  e2e 亲验=T-P1b 1 passed+lineage 全文件 19 passed+**全量 app project
  81 passed**（CI 面对齐——本批教训直接落地）。
- CI：v142（3f3f81c1057，run 37413058595）+v143（0b87fbfde98，run
  37414689479）两笔 Red=本批事故源；**本批提交推送后 CI 必须复查**（裁
  决部 C6：e2e 作业实际执行且绿+T-P1b 在列 route=band——下场首查项）。

## §2 根因与修复（runId=20261006-f-uires03-cirefix）

- **根因**：C2·P7 把 `.tl-year-head` 容器 rect 并入路由障碍集——容器
  flex+`::after{flex:1}` 横线横贯内容全宽（探针实测 x20→704=684 宽；
  contentBox.w=732 亦探针实测）→跨年边 band 终落竖直线（vClear，PAD=4
  ）几何必然穿年份头→三槽全灭→降级 corridor。T-P1b（批 3 回归锁：首条
  树边 route='band'）CI 两 run 各两跑两红+本地确定性复现。
- **逃逸路径**（教训，事故档已记）：verify 不含 e2e（宪法分工——CI 另
  含）；C2 批 probe 的 e2e 抽样=C2 相关七例，未含走线直证用例 T-P1b。
  **规则化：凡改 routing/走线面的批，probe e2e 抽样必须含走线直证用例
  （T-P1b/T6 族）**。
- **修复**=N5（障碍几何校准，原挂 F-ROUTE-02）提前最小子集：采集选择器
  `.tl-year-head`→`.tl-year-num, .tl-year-meta`（数字+「N 篇」meta 两文
  本区；1px 装饰横线=伪元素天然不可采）。几何复算（裁决部独立复算同）
  ：三槽 x=111.6/143.6/175.6（0-indexed）；月标膨胀盒 [75.6,160.6] 挡
  slot0/1（批 3「月标封堵首选 slot→散开」语义保留）；slot2=175.6>160.6
  净余量 15px 过→band 恢复 ¾ 位。受锁夹具同步+正锚（双 rect 分立
  toEqual）+负锚（容器全宽 684 不采入+`some(w>100)===false`——裁决部
  R3 定性=抗布局漂移的长效主守卫之一，与 toEqual 双锚并列）。
- **可否决呈报（裁决部 C3——用户异议即回滚）**：本校准偏离裁决 13 字面
  选择器（`.tl-year-head`）；意图调和=避让视觉主体（数字/meta 文本）∪
  band 直落批 3 语义。回滚代价=跨年边全绕右 corridor。呈报载体=设计稿
  v1.16 回写块+registry F-UIRES-03 注记+本档。

## §3 三屋门链

- executor（随宿主）：TDD 先红（新增 2 例红 EXIT=1）→选择器+夹具→单测
  15/15→T-P1b 回绿→lineage 19/19→verify EXIT=0→变异红证（回退选择器
  →单测 3 红+T-P1b 红 CI 形）备份法还原 diff 空+临时件删。自裁申报三项
  从严（简报计数 41→实测 19 勘正=my 简报笔误；mockRect 上提 Rule of
  Three；e2e 变异加跑）。
- 门一：k1 语义 PWC B0W2N4（机读尾 FAIL=其二值口径自我映射，语义 PWC
  ——R2 挂账：门一输出契约补 PWC 机读档=治理面后续票）+d1 PWC B0W1N4。
  零 B 级。W 处置：W1（null 年「未知年份」形态）=主控亲核
  TimelineYears.tsx:115-119（「未知年份」在 `.tl-year-num` 三元内+头子
  元素仅 num/meta 两 span=枚举完备）+probe 第 9 项独立复核，销项；W2
  （设计稿 v1.16 落盘+裁定来源）=主控亲笔三处落盘（C2 物证化于本批
  diff），INV-110 登记。d1-N3 槽序项=slot 0-indexed 误读，主控核销；
  164.6 笔误勘正=160.6（月标右缘 156.6+PAD4）。
- 门二 probe（随宿主）：九项矩阵全 PASS GO——verify 258/2638 EXIT=0+
  定向 15/15+T-P1b 1 passed+lineage 19/19+全量 81/81+变异 CI 形复现
  （`Expected:"band"/Received:"corridor"` 逐字一致）+还原 diff 空+产物
  hash 回 verify 态+locks 363+grep 双面零+W1 复核。主控另亲验全量
  e2e 81 passed EXIT=0。
- 裁决部：**GO_WITH_CONDITIONS 九条件**（C1 INV-110/C2 设计稿物证/C3
  可否决呈报可见/C4 registry 双写/C5 [locked-change]+locks 同步/C6 推
  送后 CI 复查/C7 账本四席/C8 本档/C9 hygiene）——九条全兑现（C6=下场
  首查项）；R1 事故档（已记）/R2 门一 PWC 机读档（挂账）/R3 w>100 定性
  升级（已采——INV-110 双锚并列表述）/R4 容器几何口径 684（732=
  contentBox 探针实测非失实，双数并存各有所指）/R5 meta rect 缺节（
  T-P1b 实证覆盖，不补）。裁决部另主动立案#19：受锁测试同步≠放水（
  原 C2·P7 例钉住的细节即缺陷本体；断言本质不变；[locked-change] 合法
  契约细化）——采信。

## §4 挂账与下场首办

- **下场首查**：本批提交 CI run（C6——e2e 绿+T-P1b route=band 在列）。
- **下场首办=B5 派发**（票面=设计稿 §2 B5 v1.15 三件不变：①两钮迁详
  情页头部下操作行②resizer 键盘 ±16+Home/End③锚点显隐收窄搭车）。
- **B5 毕后序**：F-ESC-01→F-ROUTE-02 设计（N5 余量=年份头外障碍几何全
  面校准，registry 已注记防重复交付）→F-LOCATE-01。
- 承前挂账（v142 §4 八项）不动+新增：门一输出契约 PWC 机读档（裁决部
  R2——治理面小票候选）。
- 探针/证据件仓外档案：2026-10-06-tp1b-yearhead-probe.mjs（几何探针）
  +cirefix-registry-read/edit+route02-note 脚本+probe 进度档（probe 报
  告③节指针）。

## §5 新会话开工序

1. CI 首查本批 run（e2e 绿+T-P1b 在列）——C6 兑现点。
2. B5 派发（设计稿 §2 B5 v1.15 三件）。
3. B5 毕后 F-ESC-01→F-ROUTE-02 设计→F-LOCATE-01。

## §6 本场成本（收口登记）

- executor 826,477 tok/31 tools/8.2min（session:host-tier）；门一 k1
  25,486 tok（kimi-third $max）+d1 35,943 tok（deepseek $max）；probe
  435,490 tok/20 tools/9.0min（session:host-tier）；裁决部 33,223 tok
  （kimi-third $max）。逐席入账本。
- 账本 729→734 五笔（dispatch/ruling 类+commit——见账本）。
