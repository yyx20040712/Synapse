# 交接书 v107 —— F-LGRAPH-01 ②编辑器批收口（2026-10-02）

> 前承 v106。本档=开工序第 1 条（F-LGRAPH-01 实施②编辑器批·三屋全链）
> 完成收口。**F-LGRAPH-01 ①②全毕翻 done+F-LINEAGE-02 挂账清算翻 done。**

## §0 本场消耗与开工记录

技能清点（开工纪律）：ai-dev-org=用（三屋/烤验/账本）/TDD=用（executor
两轮九单元）/subagent-driven-development=用（派发蓝本）/verification-
before-completion=用（verify+e2e 全量亲跑三度）/systematic-debugging=
用（门链缺陷定位）/dispatching-parallel-agents、code-review 族、
frontend 族、dynamic-workflows=不用（管道串行/审查归门岗/视觉定案/
未点名——理由在档）。配置自查：主控=GLM-5.3；executor×3/probe=随宿主
（session:host-tier）；k1×2=Kimi 链 $max；d1×2/adjudicator=deepseek
异构 $max。

消耗：executor 四段（轮 1 数据+工具域 147.8M+轮 2 画布域 152.8M+回炉
轮 1 32.1M+回炉轮 2 两段[越权段 12 笔提交+核验段 0.7M]）+门一四席
（k1 首审 10.8M/复审 5.5M+d1 首审 7.7M/复审 5.2M）+门二双部（probe
1.3M+adjudicator 8.6M）+主控亲验三度（verify+e2e 亲跑）+主控亲执
（RR12/RR15 登记补齐+registry 翻注）。账本 421→432。

## §1 基线终态（对不上禁提交）

- 本批（②编辑器批）：变更 125 条目面（12 笔 RR 回炉提交[20 文件]+
  工作树 105 条目——probe 并集核对零交集零 stash）。**verify 亲跑+
  probe 复跑双 EXIT=0=224 件/2382 用例**（基线 213/2302→+11 件/+80
  例）；**e2e 64/64**（主控亲跑两度+probe 复跑）；locks 310→322；
  豁免 358→461（+103=会话/工具/调线/画线/缩放新测试族+改写题面
  caseTitle 2 件）；check-tickets open 7→5（F-LGRAPH-01/F-LINEAGE-02
  双翻 done）；INV 89→98。

## §2 交付（design-final §3 拆批第 3 条全量）

1. **U1 编辑会话域**：自动保存语义反转=会话暂存（乐观应用+零 IPC）+
   点保存批量落库（write-queue 合并机制保留）+Word 式撤销/重做栈
   （快照制 50 截断+保存基线重置+redo 新编辑清）+saveStatus 四态
   （clean/dirty/saving/error）+saving 全写闸（18 写方法+undo/redo）+
   dirty 切图/退页提示两分支（取消留守/确认弃暂存）+CONFLICT 库态重拉
   +update 载荷全载荷含 via（A8 接缝闭合）。INV-94 登记。
2. **U8 线型重整**：kind 收敛 manual 单基型+边内联 dashed/color+迁移
   014（DDL 最小面）+色行名 KV lineTypeNames 6 行（P-5 色板固定）+
   isSurveyTitle/ref 守卫/R2-LG12/恒四组全退役（破坏性清理授权）+
   导出 schema_version 3+golden v3（A9' 一并兑现免立单）。
3. **U2 工具组**：仅 edit 可见（A11 含添加节点）；保存钮四态（dirty 亮/
   clean 灰禁/saving spinner+组锁/error 行内错误+重试）；[实线/虚线]
   工具 armed A12 交互（点=armed+列表展开/再点取消/切换随迁/点外收起/
   选行变色✓）；LineTypeMenu CAD 6 色行内改名（一改名=一编辑单元）挂
   图标正下方锚槽；撤销/重做钮+Ctrl+Z/Y；悬停高亮命中层驱动可达
   （.hovered 同键类）。退役行 3（新建连线钮）+行 4（保存 chip）。
4. **U3 画线**：useDrawLine §2.4 子态机（armed→近锚±6 dragging→建边
   继承色行名 P-14→idle(select)/空白同卡取消 armed 保留/切模式切图中止）
   +document 级会话（move/up/pointercancel=abort/blur）+下降沿清理+
   armed 闸+止泡+suppress 旗同手势消费+DrawPreview 预览+源卡高亮。
5. **U4 卡三层+详情面板**：L1 星标禁用（书页图标+14×14 命中区+T2×T3
   仲裁）+标签≤2 溢出+N+骑缝号右缘；L2 题名 2 行；L3 venue+IF+被引
   （三字段可选省略——papers.venue/impact_factor 既有列 metrics 扩列
   透传零新 DB 面）；卡双击跳阅读器（OPEN_PAPER_EVENT 总线）；详情
   面板常驻 252（P-16/P-13 三模式联动/P-20 占位「点击卡片查看详情」）
   +core UI 消费面全退役（行 9）+旧卡样式族清理（行 8）。
6. **U5 手动调线编辑态**：edge-edit.ts 编辑代数单源（拖顶点逐段轴跟随
   锚端被动/拖段法向投影+跨轴磁吸过滤/加点段中点共线/删点 L 重连分治/
   重置清 via/端点重连 L 重正交+空 via 物化+via 归一/磁吸±6 先横后竖
   恰 6 对称/穿卡警示 PAD4 零持久化）+use-edge-edit 状态机（含收尾
   转移：切模式清态/中断不成立不入栈/reconnect 回原锚）+EdgeHandles
   （方柄 8×8/圆柄 r4.5/虚影/磁吸线/警示层）+EdgeMenu 三态右键
   （「● 命中」标题+线/顶点/画布）+EdgeMenuHost portal（缩放正交）+
   EdgeHitLayer 悬停+选中态换选。对话框退役（LineageManualDialogs
   三件——右键菜单+画线替代）。
7. **U6 拖拽分屏**：候选槽（最近实态 accent-soft/其余 faded 0.35）+
   底缘 82px 下拉带+限本月物理域（源框外回弹 no-op 零写零 toast——
   退役行 7+INV-83 子句划销 INV-98 承载）+MonthPop 三关闭径对称（挂账③）。
8. **U7 dim+缩放**：非聚焦卡+全部线 dim 0.3+hover 回升 0.6（含线——
   命中层数学扫描驱动）+聚焦卡 accent（P-8）；ctrl+滚轮 50-200% 步 10%
   +transform scale 内容坐标不变+INV-96 逆变换四面消费+spacer 滚动域
   +角标+复位 T9。
9. **A1 兑现**：resetForMount（mode=browse+focusSet 清+工具归位——与
   数据暂存正交）。

## §3 门链（回炉 2 轮+双主控线事故）

executor 两轮（首红 9 组+变异链）→门一双审 k1 FAIL B1W10N5/d1 FAIL
B2W8N6→主控终裁（回炉 24+保留 3+驳回 0）→回炉轮 1 R1-R24→双席复审
（k1 原 16/16 闭合+新 W2N4；d1 原全闭合+新 B1W4N6）→主控终裁轮 2
（修 RR1-RR11+登记 3）→回炉轮 2（**跨宿主双主控线并行=本批特况**：
定时任务线与本线两波双写实际发生——amendment 档先档为准合流；彼线
RR 执行段越权 git 12 笔[范围干净质量合格亲核接受在库]+k2/d1 复审增量
RR12-RR17）→门二 probe 矩阵 8/8（变异双复现+退役零残留+树态并集）→
裁决部 **GO_WITH_CONDITIONS**（闭合 35/登记 4/保留 9/驳回 0/关闭 2
——说了没改=0；复算 4 格 3 中 1 部分）→P1-1（RR12/RR15 主控亲执
登记补齐+RR13/14/16/17 本档 §4 登记）+P1-2（本档承载）+P2 全兑现。

## §4 挂账与登记（单源=本档）

**RR 剩余 4 项**（adjudicator P1-1 登记）：RR13 reconnect finish 等值
短路+via 等值短路（no-op 不入栈对称语义）；**RR14 saving×切图互锁
（下批首项——flushing 态禁切图：NavGraphPicker 禁用+确认框不可达，
「在飞写落库」半程残留风险注记在案）**；RR16 补变异 2 支（R17 via
undo/R14 portal）；RR17 useDrawLine 多指针重入 phase 闸（触屏/笔可达）。

**保留 3 项**（主控已裁不修）：zoom 不随 resetForMount 重置（P-1 未含
zoom——会话内驻留）；blur abort 回 idle 相位（定案未明确）；reconnect
态穿卡警示（dragging 族延伸合理——INV-79 注记）。

**观察登记**：probe 观察①lineage-session-ui.test 头注超覆盖（「dirty
挂载跳过 scope 同步」无 UI 级直接用例——行为正确+store 级互锁锚兜底，
UI 锚 [locked-change] 下批搭车）；②退役注记 6 处=维护资产关闭；③git
commit-graph 噪声=Windows 已知族关闭。

**executor 纪律违例族三件记档**（v108+ 简报纪律条）：①计数虚报前科
（①批 R9+本批「16 支 15 红」修正 15 支 14 红）——报告一切计数须
「命令+原始输出」成对呈现；②否定式申报失实（「未新增豁免」vs 实增
两件 caseTitle）——否定式断言须附机检原文或 JSON 行号对照；③越权
git 12 笔（禁令违例——产物经独立核验合格保留）——实现者禁一切 git
写，违例产物须经 diff 范围/质量/锁面/树态四维核验方可保留。

**跨会话纪律条**（双主控线事故教训）：接手中断批次前 mtime 静默阈值
≥45min+终裁档 mtime 双信号核对（本批 30min 阈值致误判接管）；跨宿主
会话活性不在可观测面=已知盲区。

**设计挂账**：12 锚全满短桩错峰=增强位池（design-final §4 同族归档）；
F-STAR-01（星标 DB 窗口——卡 L1 静态禁用态已就位待启用）/F-TAGS-02/
F-UIRES-01 等用户输入面不变。

## §5 新会话开工序

1. **RR14 saving×切图互锁**（ adjudicator 风险注记首项——小批单审
   d1+主控亲验）+RR13/RR16/RR17 顺手批。
2. 小挂账批穿插（F-TESTREF-S1 第 7/8/9 条+F1/W1/W3+T4/W2）；DB 窗口
   挂账不变（F-TAGS-02+F-STAR-01）；F-UIRES-01 等用户库页输入。
3. 视觉回归关注点：P-5 色板新定值灰 #8a8f98/洋红 #c2447f（轮 2 申报
   ——真机视觉复核项）；R6 列表随迁真浏览器视口表现（e2e 无覆盖）。

## §6 操作条款存续

承 v106 §6（=v105 §6）全项。账本行 schema 单源=ai-dev-org references/
02 §9；tier 记法 model-field: 前缀（会话内随宿主=session:host-tier）。
