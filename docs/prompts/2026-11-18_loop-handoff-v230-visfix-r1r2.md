# 交接书 v230 —— 视检轮缺陷清偿（R1/R3 收口 + R2 前半 C1/C2 收口）

> 取代 v229（2026-10-21 F-EVCTX/F-DETOURW 收口笔，已迁仓外档案区
> ~/synapse-archive/prompts/）。本场=2026-11-18 视检轮主会话
> （runId=20261118-visfix）：用户集中视检报四项一级发现，主控按
> 「排障→规划→用户裁决→实现→独立审查→返工→验收→提交」全链清偿。

## §0 本场总账

- **视检轮四发现与清偿状态**：
  1. **R1 高亮/下划线不渲染**——排障证伪回归：用户新导入 PDF 正文自绘
     不透明背景（RGB 248,248,248），色块层在 canvas 下方被整片遮死
     （8d2b41377 垫底层序已知边界，ADR-0019 在档）。修复（用户裁决
     multiply 族）=层序改 text<canvas<colorBlocks<selectionPaint +
     --annotation-blend 主题 token（light/sepia=multiply、dark=screen+五色
     深色板覆写）；AnnotationLayer/SearchHighlightLayer 同批迁移；仓外隐藏
     窗口像素矩阵验收 11/11（最低文字对比 4.80:1）；INV-46/ADR-0019 整篇
     重写。提交 37458ef2，CI 44295446614 success。
  2. **R2 走线贴卡/穿卡**——四段推进，本场完成前两段：
     - **C1（55d3f7b7，已推送）**：钉定锚终落方向化（stubEnd 外法线）+
       自动路径最终净空门（routing/finalize.ts，r=6→3→0 对最终圆角采样
       逐档复检）+ blocked 显式态（d=''、无命中区、数据保留、按边去重
       提示、布局变化自动重试）+ overlap 拆义（只豁线-线）+ 选中/菜单/
       拖拽态 blocked 迁移（use-blocked-edge-edit.ts）+ EdgeOverlay 装配抽
       use-lineage-routes.ts；占用语义=跟随边数据（blocked 元数据节点
       data-anchors）。INV-79 重写、architecture 连线段重写。
     - **C2（本场提交，待 CI）**：搜索域增强——bandSkeleton 扩「目标行进
       向续侧带∪目标背侧带」（审查 B1 反例锁红：4 卡 right→top 族）+
       新增 routing/outer-ring.ts 外圈四车道末级候选（band 后 overlap 前，
       ringLanesOf 单源，不消费槽位）。30 边压力样本 blocked 4→0/1→0、
       43 节点真实形状 5/5 不变、确定性逐字节全等、性能配对 1.32×/1.10×/
       1.03×（阈 2×）。INV-79 登记 outer-ring、INV-SLOTGRID-02 第四坐标源
       （ringLanesOf）、INV-119 带桩族=detour/band/outer-ring。
     - **T3 CI 窄视口修复（本场提交，待 CI）**：C1 重排 T3 种子后调序
       落点（甲左 1/4）在 1024×768 压在时间线左缘横滚带+nav 覆盖区，横滚
       推框越过指针→INV-98「源月框外回弹」正确触发→零 dirty（CI
       44315413077 failure 本地压视口插桩复现定谳）。修=落点改甲右 1/4
       （真调序 [甲,乙,root]）+测试内固定 1024×768 视口（两平台同布局，
       F-CIFLK-01 先例精神）。
  3. **R3 标签失效**——TagEditor 三写路径共用 finishWrite（已知写入才
     refresh、孤儿标签入列、纯失败不误报）；新增 tag-editor-refresh 9 单测
     +同页不重挂 e2e（含窄视口滚动锚定+veil 关面板交互）。提交 68ca9526，
     CI 44295446614 success。
  4. **R5 拖动空槽位系统**——用户三轮语义+三裁决已锁：①连线时空槽=空白
     ②拖动仅亮**源月框**空槽、月框内动态下延**不跨月框**、只落空槽
     （**移除「占用槽可更换」换位交互**）③落位后 routeAll 重算扫过连线。
     **未实现**——待设计稿（实现面=拖动控制器/槽位 store/TimelineYears
     延展/占用重算挂钩），呈用户过目后开工。
- **组织面**：用户指令「按面板派发子代理体」——面板=~/.config/dev-troupe/
  config.json（dev-troupe 插件 7.1.0），pick 序=research→glmflash、
  planner→yyx、executor→glm、reviewer→zipoo、vision→699。本场 C2 起
  executor=glm（ops-executor-glm）、reviewer=zipoo（ops-reviewer-zipoo）
  已按面板；此前 -699 直派已如实入账。组织账本 .zcode/org-ledger.jsonl
  本场补记 13 行（含 cfg:4c7edc8708aa 面板指纹）。
- **成本（subagent tok 粗计）**：排障 3×~2-10M+规划 1.1M+R3 实现
  1.2M+0.5M+R1 实现 8.6M+审查 2.5M+C1 实现 14.2M+11.8M+审查 4M+C2 实现
  28.2M+7.8M+审查 4.5M+0.9M——明细见账本行。

## §1 下场序（新会话接续清单，按优先级）

1. **首动作=核本交接书 CI 回执**（§6——C2+T3fix 推送笔的 run）。
2. **R2-C3 手动提交门**：拖顶点/拖段/加点/删点统一提交口（edge-via-commit.
   ts ≤200 行建议）——松手即判非法回弹（用户裁决）、零撤销单元零 dirty、
   圆角采样谓词同终门；routeAll 终门承接旧 via/重排后非法 via。INV-80/
   INV-94 随批登记。注意 use-edge-edit.ts 650 行（豁免在案）勿再堆入。
3. **R2-C4 PAD 4→8**（用户裁决）：avoid.ts 单源+Z 形 jog PAD+1 跟随；独立
   commit 观察可布通率（C2 后预期 30 边样本仍 0 blocked；若升回主控）。
4. **R5 拖动空槽位系统**：先出设计稿呈用户（裁决已锁见 §0-4），再实现。
   注意与现行 card-drag-session 的换位交互（「可更换」）是**替换关系**。
5. 视检轮其余清单项（用户面）：核心链路例行全检+退出拦截+导出；选区
   「分板块定优先级」设计讨论（用户提出 PDF 论文排版分板块选区——
   R1 修复后另开讨论，未排期）。
6. F-SNAPHINT-01 复现条件观察沿承（吸附 hint 悬空——四条件到手重开）。

## §2 测试版本路线（沿承 v229 §2，位次推进）

| 序 | 票 | 状态 |
|---|---|---|
| 1-9 | （前九项） | done（v229 在档） |
| 10 | 集中视检轮 | **进行中**（四发现：1/2/3 已修，R5 待做；其余清单未走完） |
| 11 | dist 测试版 | 终点（R2-C3/C4+R5 收口后进入；F-RECOV-03 dist 前清偿沿承） |

## §3 治理注记（本场增量）

1. e2e 新增「视口固定」先例：T3 以 setViewportSize(1024×768) 钉 CI 档
   消两平台布局分叉——后续窄敏感用例可循（非运行时补偿，测试条件化）。
2. 管道假绿教训复现：`cmd | tail` 掩蔽退出码（本场 e2e 首跑 EXIT=0 实为
   1 failed）——判定一律看命令真退出码（宪法在案，本场再犯一次后修正）。
3. 面板派发约定自本场生效：主控派发前 pick 面板（读 ~/.config/dev-troupe/
   config.json slots[0]），回退链按序；账本行 role/tier/source 按实际槽位。
4. INV-79 现行合同=自动路径终门+blocked 显式态+占用随边数据+outer-ring
   末级候选；manual-override 仍免检（提交门=C3 另行登记）。

## §4 待用户面

1. C2+T3fix CI 回执确认后本场闭（主控在推送笔 CI success 后停——若
   failure 沿 §3-2 教训按退出码/失败用例逐项处置）。
2. R5 设计稿呈裁（§1-4）。
3. 选区分板块设计讨论待用户开启（§1-5）。

## §5 沿承挂账

- open 池不变=5 张（F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-E2EFLK-01/
  F-RECOV-03——视检轮未动 registry）。
- C2 实现岗申报缩减：连通图搜索未建（带间跳跃由既有通道承载）、有限
  回溯未做（无残余 blocked）——若 C4 PAD=8 后出现新 blocked 形态，此两项
  是第一候选补强面。
- chain.ts 351 行（超 routing ≤300 建议、500 硬限内）——下次扩展搜索编排
  时优先抽 routeOne（审查 N1 在案）。
- T3 视口钉定后本地默认 1280 档不再被该用例覆盖——窄档由钉定覆盖，
  宽档由其余 lineage 用例默认覆盖（登记备查）。

## §6 CI 回执与推送状态

- 68ca9526+37458ef2：CI 44295446614 **success**（亲验，e2e 158 用例含
  R1 不透明背景新用例+R3 同页用例全绿）。
- 55d3f7b7：CI 44315413077 **failure**——T3 窄视口（§0-2 已定谳修复，
  修复笔随 C2 批推送，见下）。
- C2+T3fix 推送笔：runId 见 GitHub Actions（本交接书提交时一并推送），
  **下场首动作核其结论**。
