# 交接书 v137 —— F-UIRES-03 C3 拖拽域重构+卡钮批交付（2026-10-06 晨场）

> 前承 v136（B3 交付）。本档=C3 批三屋全链交付全录+裁决部三条件兑现
> +设计稿 v1.9 回写。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋链）；test-driven-development=用（executor
两段 TDD+RR1 变异红证）；verification-before-completion=用（verify 亲验
真退出码+probe 独立复验双证）；systematic-debugging=不用（无排障面——
stale 插桩复算属取证非诊断）。配置：executor/probe=宿主随岗（GLM5.3
未绑定——账本记 session:host-tier）；门一 k1（kimi-third $max）+d1
（deepseek $max）双审；裁决部 $max 绑定（实载工具=Read/Glob/Grep 无
Write——审计档主控代录，派发模板「你有 Write 权」表述与实载不符已实测）。

## §1 基线终态（对不上禁提交）

- 基线=2768791bf3e（v136 B3 批，CI success 亲验 run 37337879279）。
  本批=C3 一笔：44 tracked 文件 diff（+1602/−1215）+5 新件（useView
  Bridges.ts/open-library-bus.ts/goto-library-plan.ts/lineage-month
  -single-entry.test.ts/lineage-page-goto.test.tsx）+2 删件（MonthPop
  .tsx/useMonthPop.ts）。verify 收口亲验 **EXIT=0**（252 件/2567 例
  ——registry+design 编辑后含跑）+locks 356+test-surface 豁免 108
  hits 108 stale 0。治理滚动：locks 356/registry open=2（F-UIRES-03
  多单元+C1/C2 未施；F-LOCATE-01 待修）。

## §2 C3 交付摘要

- **六件落地**：①改月链全退役——9 符号族 src 全零命中（MonthPop/
  useMonthPop 整件删+useCardDrag 198→82+lineage.store 动作/
  applyMovePreview/moveTargetLabel/月标 DOM+CSS 三族死样式；undo=会话
  快照栈通用留驻，退役的是改月入栈路径；写链 patch-node→api.lineage
  .patchNode 通道保留=MetaEditDialog 正身）+INV-107 登记（改月单口
  ——守卫=单测 fs 扫描）+INV-98 修订（回弹护栏≠改月判定面）+
  overSourceFrame/PULL_BAND_PX 保留（纯回弹护栏+stretch 服务者——
  executor 呈报主控核准）。②症一候选槽=DragCandidates stableEpoch
  布局稳定信号重捕获（rAF 轮询源框 rect 连续两帧全等→useMemo deps
  重捕获——样板①去包装翻转直陈转绿，64.4px 陈旧几何修复）。③症二
  插入位全部可达（插入位多样性新例两插入区 DOM 序断言绿；「恒 0」
  形态未复现——归因症一视觉投影未证实，用户复测再立案）。④漂移=
  frameOrigin 包含块补偿甲案（激活帧 offsetLeft/offsetTop 导出补偿+
  FlightJob hostOffset 可选缺省零补偿——样板②直陈转绿+两轴残差对账
  X 0.956/Y 0.944 并含；测量口径=transform 中和法）。⑤v1.7 卡双击
  退役+卡面两钮（「去阅读器」=requestOpenPaper 单字段直调；「去文献
  库」=open-library-bus 新建〔零载荷事件切视图，open-lineage-bus 同型
  先例〕+goto-library-plan 单源编排〔先置数后广播；folderId=
  MAIN_GRAPH_ID 常量单源；__main__ 未归夹→清夹全库+选中降级〕；主题
  节点「去阅读器」零渲染/「去文献库」在场不置选中=自裁定稿 v1.9 回写；
  hover 呈现+编辑态 display:none!important 恒隐）。⑥搭车=TimelineYears
  头注「fixed 离流」句改写+geo-probes zoomProbe Ctrl 持键段 try/finally
  加固+EdgeMenu MonthPop 注释清理+timeline-pan PAN_EXCLUDE .c-ym 死
  条目清除（RR1-C 重生成时附带抓出）。drag-hint 画线段=**保现状真
  文案**（「画线＝点线型工具后从卡边拖出」——终态「点两卡连边」系
  C1 交互未落地，C3 先落=明知失实；随 C1 落地换。主控预裁留痕，用户
  可否决）。
- **门链**：executor 基批 46,412,661 tok→门一 k1 B0W2N8+d1 B0W3N9 双
  PWC（W=报告 stale 1 抹 0+__main__ 哨兵双源+DoD grep 中途快照——主控
  仓外插桩点名 stale=本批新登 PDF_KNOWN_TEXT 豁免腐项）→RR1 四件
  （13,871,513 tok：Card 常量化+goto-library-plan 单源+page-goto 3 例+
  变异红证 2 支/腐项删 1/报告更正+grep 终态清单 v2/两句备案；自裁=
  LineagePage 整件 jsdom 挂载超时三案实录→「分支计算+store 写效果+
  事件」三环等价链）→双席复核 PWC（载体缺口=主控复核包组装失误 B4
  同型：报告拷贝未刷新+add -N 漏新测试件——补齐后条件确认轮双 PASS
  k1 B0W0N0/d1 B0W0N1）→probe 九项矩阵全绿（verify EXIT=0 252/2567
  +locks 356+surface 108/108/0+e2e 四件 16+6+18+2 RR1 后独立复跑+
  变异独立复现 offX −2.9 vs 51.2 同型红→diff 空 sha 全等→复绿+grep
  零命中+行数 6/6+未跟踪面 5 A 全引用）→裁决部 GO_WITH_CONDITIONS
  三条件全兑现（C1 对账句入 registry/C2 挂账 10 项点名=本档 §4/C3
  设计稿 v1.9）。
- **裁决部复算**（三链全吻合）：vitest 2573−删 12+增 3=2564→RR1 +3
  =2567 精确闭合——实现报告「对账差 1」系改题例误计删除作废
  （store-reorder 第 3 例=改题非删）；token 前置链 88,725,716 分文
  不差；豁免 89→109→108 闭合。
- **豁免 108 条**（89 基线+20 随票−1 腐项；hits stale 0）。

## §3 操作条款增补（承 v136 §3 全项外）

- **复核包组装纪律强化（B4 后再犯）**：门一复核包组装=①报告拷贝
  必须从 impl 目录现拷（RR 后必刷新——本批双席读到旧版引发假 W）；
  ②git add -N 逐一点名全部新文件（本批漏 RR1 新测试件致 diff 缺源件）。
  组装后自查两项：报告 mtime≥RR 回执时点+diff 文件数=git status 面。
- **stale 豁免条目定位法**：check-test-surface.mjs 无点名面——仓外
  拷贝+插桩复算（import repo extract.mjs 经绝对 file:// URL 解 node_
  modules 依赖）；豁免登记前 grep 现树：断言文本被新例原样复用=豁免
  落空腐项（本批 PDF_KNOWN_TEXT 条实录——登记时点断言已删、终态被
  复用回填）。
- **node -e 隔层坑三踩入档**：双引号内 $ 展开（宪法既有条目）+中文
  参数静默失败——修正类探针一律 Write 直写脚本文件后 node 执行；
  `tail -c N` 字节截断显示乱≠文件乱（切在 UTF-8 多字节序列中——
  整行 tail 验证）。
- **改题≠删除（计数分解口径）**：测试族改写批次计数对账逐例分
  「删/改题/增」三类——改题例计入删除即虚设「对账差 N」（本批裁决
  部复算拦截实录）。

## §4 挂账与下场首办

- **挂账 10 项（裁决部条件 2 点名——全提示级）**：①卡钮 hover-only
  键盘不可达（用户可否决位——:focus-within 兜底可选）；②stableEpoch
  settled 后停轮询边界（stretch 只增 padding-bottom 论证不构成缺陷
  ——真实异常观测再加固）；③插入位多样性例两处序断言裸读（可选
  poll 加固）；④T11 双击负锚 500ms 固定窗（后续换 expect.poll）；
  ⑤INV-107 守卫扫描面不含 CSS/注释 token（4 条 dod-grep-final 登记
  承载）；⑥症二「恒 0」未复现（归因症一投影未证实——用户复测再
  立案，布局指纹随报）；⑦skipSites 12→10=激活向（已备案非收紧）；
  ⑧豁免台账 pretty 整件重排（后续纯追加）；⑨__main__ 真 handler 端
  到端盲区（三环等价链承载——handler 为 4 行组合，真夹路径 e2e 兜底）；
  ⑩报告 §七「三处①②③」措辞歧义（数字面无失配）。另挂 test-surface
  cases −11 残 −3 包内未归因（裁决部 G2——契约面=指纹门 C_after⊇
  C_before+stale 0 四次独立运行绿机器承载）。
- **承前挂账不动**：detectSaveFailed 留驻+C4 陈旧注释（ai-sensor.
  service.ts:15+check-quality.mjs:91）同批清理票；F-LOCATE-01 停驻
  竞争+error-context 取证覆写并票待修。
- **下场首办=C1 线型链+色板换色**（设计稿 §2 C1 v1.9——迁移 015
  挂本单元：`UPDATE lineage_edges SET color='#1e3a8a' WHERE LOWER
  (color)=LOWER('#3a5bd9')`〔F5 核正存量全规范形直接命中；呈裁①
  深蓝 #1e3a8a 用户已亲裁〕+迁移前备库+count 对账探针随票）。C1
  派发前瞻四项：①per-kind currentLineColor 单值→{solid,dashed} 四
  消费面 grep 预核（lineage-view.store/useDrawLine/LineageToolbar/
  LineageTimeline）+shared 类型单源先行；②持久化=localStorage 双键
  synapse.linetype.color.solid/.dashed；③migrations+shared+tests 三
  受锁面 locks 流程+[locked-change] 单尾注；④**drag-hint 画线段换
  终态文案「画线＝点两卡连边」+drag-hint 相关断言随 C1 改写（C3 预
  裁兑现位——设计稿 §2 C1 票面「e2e 线型序列用例重写（豁免登记）」
  并入）**。状态机三维正交迁移全表+跨格序列 e2e 全断言按票面直引。

## §5 新会话开工序

1. CI 首查一笔 run（C3 提交）。
2. C1 派发（票面=设计稿 §2 C1 v1.9 节+§3 数据面〔迁移 015〕+§4
   候选 2 线色双值+前瞻四项）。
3. C1 毕后 C2（锚点+吸附——样板③ r=3.2 断言随「直径 8 画布 px」
   形态更新；B4 字面量冻结后校准障碍几何〔N5〕）。
4. 无待裁阻塞项（v1.9 已回写；hover-only 键盘可达性=用户可否决位
   呈报项——C2 收口或用户复测时一并呈）。

## §6 本场成本（收口登记）

- executor（GLM5.3 宿主随岗）：基批 46,412,661+RR1 13,871,513
  =60,284,174。
- 门一 k1（kimi-third $max）：一审 3,984,967+RR1 复核 6,604,754
  +条件确认 1,522,151=12,111,872。
- 门一 d1（deepseek $max）：一审 4,142,876+RR1 复核 8,692,643
  +条件确认 1,842,260=14,677,779。
- probe（GLM5.3 宿主随岗）：1,651,891。
- 前置链合计 88,725,716（裁决部独立复算分文不差）。
- 裁决部（kimi-third $max）：1,906,124。
- 总计 90,631,840 subagent tokens。账本 692→702 十笔（impl×2/k1×2
  〔含确认轮并入 k1 笔〕/d1×2〔同〕/ruling×2〔RR1 派发+终裁〕/probe
  /commit——ts=链路序补记非事件实时，02 §9 主控补记条款）。
