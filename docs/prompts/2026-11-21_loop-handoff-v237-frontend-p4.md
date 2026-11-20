# 交接书 v237 —— 前端改造第四期收口（暗色主题删除+设置五类归并）

> 取代 v236（2026-11-20 前端三期场）。本场=前端改造第四期
> （docs/design/2026-11-19_frontend-rework-plan.md §4 第四期；用户 2026-11-20
> 指定方向并逐项裁决后授权主控裁量）。两批=主控编排（executor 实现→
> reviewer 独立审查→回炉→主控收尾提交），每批独立 commit+verify 全绿；
> 附带 architecture.md §3.5 lineage 段失真补账。

## §0 本场总账

- **B1 暗色主题删除（提交 6dcc4c1a，34 文件 +272/−336）**：schema theme 枚举
  收窄 light/sepia；settings.service migrateLegacyTheme 在 safeParse 前把存量
  dark/system 都迁 light（同步/异步读共用，contactEmail/uiScale/aiBudgets
  全量保全——迁移测试先红后绿，非默认值防巧合）；theme-boot 只接受
  light/sepia（非法零写 dataset，:root light 兜底）；App normalizeTheme 删
  dark；THEME_LABEL=正常模式/护眼模式；theme.css 删 dark 整块+--canvas-filter
  token（314→283 行）与 theme-reader.css filter 消费；--annotation-blend
  multiply 保留；QR 暗模块未动。测试面三类处理（夹具换值/两主题真实行为/
  删暗色场景——theme-trio 重写两主题+filter=none 零回填锚；theme.test 删
  DARK_TOKENS 32 断言同批新增零残留负锚+越枚举拒）。INV-46/71/74 整条重写；
  architecture.md 主题启动链随批两主题化。审查 PASS B0/W0/N3（三条 CSS
  陈旧三主题注释——主控亲修）；变异验证负锚真实可红（回填 dark 块
  1 failed/233 passed）。
- **B2 设置五类归并（提交 1b30e904，34 文件 +1431/−349）**：用户两项裁决=
  阅读与标注保留五类+空态说明（零新增字段）、主题控件 v2 预览卡两张。
  SettingsPage 重写双栏壳（148 行）+8 新件：settings-category（五类单源+
  模块级会话态——会话内记忆不持久化、重开回「通用」，DrCitation
  preferredFormat 范式第二例）/SettingsNav/ThemeChoices（预览卡 aria-pressed，
  同名 token 局部重绑恒色演示——check-quality 守卫合法形态）/五分类内容件。
  归并：通用=邮箱；外观=主题两卡+缩放+宽屏只读说明；阅读与标注=空态；AI
  助手=五节自持原样迁入；数据与网络=白名单披露+诊断+同步密钥。runSave/
  水合一次/Enter+isComposing 原样；旧分节卡+金节标皮肤删除；菱形分隔
  DiamondRule 全域退役（组件+.lib-rule* 样式+自测删除，正锁换零残留负锚）。
  审查 rework→W1（执行者申报「文献库继续消费」不实——全仓 grep 零生产
  消费，主控亲修删除）/N1（白名单披露补真实文本断言）/N2（两处陈旧注释）。
  申报：check-quality.mjs 跨域白名单行 SettingsPage→AiCategory（同一两
  import 换宿主，审查核实非放宽）；ai-sessions E1③ 平铺序锚随分栏退役
  （h3 节序等强承载）。
- **本地全量 e2e 抓漏**：167 passed/1 failed——lineage-topic-node G④ 进
  设置页直接点「导出语料」，语料节迁「AI 助手」分类后默认「通用」不可见=
  B2 漏适配（未列入受影响清单的 spec）；补导航点击后定向 2/2 绿。executor
  定向 24 用例+审查独立复跑同口径全绿。
- **文档补账（提交 89a54c64，+29/−20）**：architecture.md §3.5 连线层整段
  重写对齐车道网格现状（v236 §4-4 呈报的失真——六态链/槽位表述删除，
  对齐 INV-79/112/SLOTGRID-02）；时间线段补月标骑线布局事实；ADR-0023/
  0024 索引行加走线面接替指针。纯文档，verify 退出码 0。

## §1 下场序（新会话清单）

1. **首动作**：核 docs 批 CI——89a54c64 触发的 run 44782342488（用户
   2026-11-21 裁定本场不等待）；本交接书推送会取代该 run，以推送后最新
   run 为准一并核验（两提交均纯文档）。
2. **下场主任务=分区选中**（用户 2026-11-21 指定；=F-SELBLK-01 选区块间
   净空——用户 11-20 提报：页眉页脚/双栏/不同段块拖选稍有不慎即误卷）。
   票面方向：块几何两级分割（水平带 y 净空聚类+字号簇候选→带内竖栏沿
   既有 detectColumnLayout）+锚块钳制沿 52 栏授权同型；**选区为受锁域
   （INV-37/58/142+F-A6/F-VISFB-52/53 链），实现前须设计稿先行**。
3. **走线观感复核**（v235 §1-2 沿承未做）：脉络图跨年链/月标骑线截图呈
   用户裁决。
4. **dist 测试版进入**（v235 §1-3 沿承，路线序 11）：视检复核后打包。
5. 沿承：R5 拖动空槽位设计稿、PAD=6 观感复核（v232 §4-3）。

## §2 治理注记（本场增量）

1. **申报偏差须审查实证**：B2 执行者申报「DiamondRule 由文献库继续消费」
   与代码不符（grep 零生产消费）——执行者申报的保留理由属可核查断言，
   reviewer 必须实证而非采信；死代码清理最终由该实证驱动。
2. **收尾全量 e2e 的抓漏价值再实证**：受影响清单外的 spec（G④）仍可能
   消费被迁移的 UI 位置——定向清单靠人工枚举不可靠，代码批收尾跑本地
   全量 e2e 是最后一道网（本场第二次实证，先例 v236 三处漏适配）。
3. **模块级会话态第二例**：settings-category 分类选中与 DrCitation
   preferredFormat/researchOpen 同型（应用会话生命周期、不写持久化）——
   该模式已有三例，后续同类 UI 会话态可直接援引。

## §3 测试版本路线

| 序 | 票 | 状态 |
|---|---|---|
| 10 | 集中视检轮 | done（F-LANEGRID-01 关） |
| 11 | dist 测试版 | 解锁待做（视检复核后打包） |
| — | 前端改造 | 一期✅ 41186b2b/二期✅ 011b3892/三期✅ v236/四期✅ 本场 B1+B2/五期✅（F-LANEGRID-01 承载）——全期完成 |

## §4 待用户面

1. 走线观感复核（截图呈裁）。
2. v236 §4-2 三项偏差确认（GB/T 7714 单条不带编号/DrActions 保留复制
   BibTeX 钮/APA 两作者「A, & B」——已呈报未裁定，默认接受中）。
3. 阅读器双栏极窄视口挤压（v236 §4-3）：是否做窄视口自动收起右栏。
4. 本场申报偏差：B2 主题演示画布同名 token 局部重绑（check-quality 合法
   形态）；视觉近似映射三处（字号/圆角/副标采既有 token）。

## §5 沿承挂账

- open 池=6 张：F-SELBLK-01（选区块净空=下场主任务「分区选中」，用户
  2026-11-21 指定，须设计稿先行）/F-E2EFLK-01（E5 detach 亚型
  fix-landed 观察窗）/F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-RECOV-03。
- use-edge-edit 656 raw 行数债、expectPathAvoids 弦采样口径挂账（v235
  §4-2）沿承。

## §6 验证终态与 CI 回执

- 两代码批 verify 全绿：B1 终态 409 文件/4277 用例+build；B2 终态 410
  文件/4285 用例+build（均以退出码 0 判定）。
- 本地全量 e2e：B2 后 167 passed/1 failed（G④ 漏适配）→适配后定向
  2/2 绿；受影响定向 e2e executor 24 用例+reviewer 复跑 24 用例+主控
  复跑 9 用例全绿。
- CI：**run 44779094074（1b30e904）：success**——含全量 e2e，第四期代码
  批完成定义达成。docs 批 89a54c64→run 44782342488 出结论前用户裁定
  收场，与 v237 推送后的最新 run 一并归下场首动作核验。
