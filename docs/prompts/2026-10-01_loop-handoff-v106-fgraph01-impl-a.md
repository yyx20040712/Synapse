# 交接书 v106 —— F-LGRAPH-01 ①框架批收口（2026-10-01）

> 前承 v105。本档=开工序第 2 步（F-LGRAPH-01 实施①框架批·三屋全链）
> 完成收口。

## §0 本场消耗与开工记录

技能清点（开工纪律）：ai-dev-org=用（三屋/烤验/账本）/TDD=用（executor
简报主体）/subagent-driven-development=用（派发蓝本）/verification-
before-completion=用（verify 亲跑真退出码+e2e 两轮亲跑）/systematic-
debugging=用（e2e 6 红根因定位——probe 矩阵+主控亲执）/dispatching-
parallel-agents、code-review 族、frontend 族、dynamic-workflows=不用
（管道串行/审查归门岗/视觉已定案/用户未点名——理由在档）。配置自查：
主控=GLM-5.3；executor/probe=随宿主（session:host-tier）；k1=Kimi 链
绑定 $max；d1/adjudicator=deepseek 异构 $max。

消耗：executor 三轮（五单元 41.5M+回炉 1 11.6M+回炉 2 2.7M）+门一四席
（k1×2+d1×2）+门二双部（probe 2.0M+adjudicator 5.3M）+主控亲执一轮
（e2e 锚迁移修正+9 项亲验）。账本 411→421。

## §1 基线终态（对不上禁提交）

- **本批（①框架批）**：变更 52 条目（新 23/改 27/删 2——git status 实测；
  裁决部口径 50 条目=剔除 manifest/豁免两机械件后数）。**verify 亲跑+
  probe 复跑双 EXIT=0=213 件/2302 用例**（基线 206/2257→+7 件/+45 例）；
  **e2e 64/64**（主控两轮亲跑——首轮 63/1 修正 1 处后全绿）；locks
  303→310；豁免 318→358（+40=受控化标题 22+恒显式 1+graph-switcher
  FILE/rename 1+瀑布锚 2+R8 组题 12+RR2 补登 2）；check-tickets open 7
  （F-LGRAPH-01 保持 open——②未毕；F-LINEAGE-02 注记②兑现三件全毕，
  open 仅为②域挂账承接）。

## §2 交付（design-final §3 拆批第 2 条全量）

1. **模式栏+模式态**：LineageModeBar（三键分段+图名 mono+聚焦计数角标）
   +lineage-view.store（mode/focusSet/navCollapsed/navWidth+P-1 缺省
   browse+P-3 退出清空+T1 再点 no-op）；composer 受控化（editing 注入+
   下降沿归位——mode/toggleEdit 内部态退役）。
2. **导航窗格**：LineageNavPane+nav-graph-picker/nav-timeline-index/
   nav-pane-prefs/timeline-nav-sync 五件——图/文件夹下拉（并集退役·
   folderId 恒有值主图兜底·load 恒显式载荷·S2/S3/S4 行为自 GraphSwitcher
   随迁）+时间线索引（点击定位+视口月 accent·上报 rect 差分——offsetTop
   前提证伪后修正）+P-17 localStorage 随图记忆钳 160-320+T4 收起 40px
   +缺省图=库页 folderScope 挂载同步（接缝双 store 头注锚定）。
3. **退役行 1/2**：LineageGraphSwitcher 删除+「编辑脉络/完成编辑」toggle
   删除；**退役行 3/4/6/7/8/9 归②批**（主控裁决：替代面全在②批清单，
   先删不加=中间态功能残废——门一拷问通过）。
4. **拆分（F-LINEAGE-02 ②条款兑现）**：lineage.store 538→291
   （write-queue 276 抽出）+useCardDrag 546→183（session 254/flight 115/
   geometry 69/useMonthPop 66）+timeline-waterfall 66/pan 87；全 ≤300、
   LineageTimeline 249≤250 组件线；行为零变=既有断言零改全绿（门一双席
   逐行对照确认）。
5. **三模式画布行为闸**：browse/focus 拖闸（pointerdown 拒）+平移小手
   （5px 阈值+grab/grabbing）+focusSet toggle（P-8 accent 边框+切图
   clearFocus 单点驻 setFolder）+drag-hint 三模式文案。

## §3 门链（回炉 2 轮+主控亲执）

executor 五单元（TDD 首红 5 组+变异 5 支）→门一双审 k1 PASS B0W5N8/d1
FAIL B3W7N5→主控终裁（驳回 3：删除证据=审包导出 git add -N 口径缺陷
〔文件已删+rename 在案〕/豁免应红预言=check 实测绿/locks=310 全同步；
回炉 13；保留 4）→回炉轮 1（R1-R13：P-2 锁+变异/folderScope 正路径/
e2e 全域负锚/调宽 cancel+buttons/nav-sync rect 差分+直测/空态两分支/
契约对齐/describe 改题/头注回锚/navScrollTarget 清空/平移阈值/CSS 净面）
→双席复审 B0（k1 W2/d1 W1）→回炉轮 2（RR1-RR3：e2e 负锚两相位落定+
双图 fixture/豁免补登 2 条 358 对账/R4 注释+cancel 坐标+取舍申报）→
门二 probe 矩阵 8 项（7 PASS+e2e 6 红=退役 select 活引用+T9 未 edit
驱动）→**主控亲执**（4 文件 7 处：folders-crud 图名+nav 交互/topic-node
主用例图域隔离重写+S4+G④ 子图过滤双向/lineage.spec T9 edit 驱动/
move-paper nav 交互——首轮 63/1 修正后 64/64）→adjudicator
**GO_WITH_CONDITIONS**（闭合 27/登记 4/保留 9/驳回 3/关闭 2——说了
没改=0；复算 4 格）→P0 兑现（manifest diff 174 行补档+数字口径以
wc/git 实测为准）+P1 入 §4 挂账+P2=executor 回炉报告即核实记录。

**executor 计数违例记档**（回炉轮 1 R9 报「补登 2 条+entries 359」——
实际脚本 found 守卫被同题历史条目短路静默跳过+虚报成功，实测 356→
轮 2 真写入 358；executor 认领。②批开局简报携此纪律条）。

## §4 挂账与登记（②编辑器批携带——单源=本档）

**N 级池 8 项**（裁决部登记/保留）：①豁免 caseTitle「（view 态可拖）」
②批改题同步豁免；②跨月 toast 文案失义（「请进入编辑模式」不可达——
退役行 7 域随批）；③MonthPop 下降沿非对称（click 切模式外点关闭链已
闭合——防御对称性②批统一）；④view.store 跨页驻留（P-1「进页缺省」
二次进页读法——设计仲裁）；⑤setFolder 同值重选清 focusSet（§2.7 未明
——设计仲裁）；⑥page 测试 act 警告（测试卫生）；⑦平移激活 ≤5px 跳变
（打磨）；⑧executor 计数违例记档（②开局简报纪律条）。

**承①a 三挂账不变**（F-LINEAGE-02 design-final §5 补注 1-5）：12 锚
全满短桩错峰（D-L2-11）/导出 via 扩面+store update 载荷清 via→②收口
前立单/预埋 API（anchorId/stubEnd）②消费。

**②批退役行执行清单**：行 3（新建连线按钮→画线工具）/行 4（保存态
chip→保存钮 saving 态）/行 6（ref 综述边体系→manual 单基型+线型重整
——破坏性清理授权在票面③）/行 7（跨月 toast→物理域限本月回弹）/
行 8（旧卡样式族→128×72 三层）/行 9（核 chip→core UI 消费面全退役）。

## §5 新会话开工序（承 v105 §5）

1. **F-LGRAPH-01 实施②（编辑器）**：工具组（P-5 色板/P-14 继制/线型
   列表 CAD 式）+画线（吸附±6/armed T7/P-19）+卡片三层 128×72（P-7
   三层+P-11 星标静态禁用态）+详情面板（P-16/P-13/P-20——现侧板改造
   增强）+拖拽分屏（S6）+手动调线编辑态（S8 全域：手柄/右键反馈/磁吸
   /穿卡警示/端点重连）+聚焦 dim（P-12/P-18）+缩放（P-4 ctrl+滚轮
   50%-200%）+退役行 3/4/6/7/8/9 执行+§4 挂账消化+e2e。星标=F-STAR-01
   窗口前静态样式。
2. 小挂账批穿插（F-TESTREF-S1 第 7/8/9 条+F1/W1/W3+T4/W2）；DB 窗口
   挂账不变（F-TAGS-02+F-STAR-01）；F-UIRES-01 等用户库页输入。
3. ②批开局简报必携：本档 §4 全量+executor 计数纪律条+mockup §2/§3
   规格现行版（design-final §2 指针）。

## §6 操作条款存续

承 v105 §6（=v104 §4）全项。账本行 schema 单源=ai-dev-org references/
02 §9；tier 记法 model-field: 前缀（会话内随宿主=session:host-tier）。
