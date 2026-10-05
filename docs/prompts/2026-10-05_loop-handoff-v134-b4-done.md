# 交接书 v134 —— F-UIRES-03 B4 杂项静态批交付（2026-10-05 晚场四）

> 前承 v133（B1 交付）。本档=B4 批三屋全链交付全录（v133 §5 开工序
> 首办=CI 首查+B4 派发，本批一笔）。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋链）；test-driven-development=用（executor
TDD 面+RR1 先红后绿）；verification-before-completion=用（verify 亲验真
退出码×3+e2e 17 例亲跑）；systematic-debugging=不用（无排障——test-surface
红为机检语义核实非排障）。配置：executor/probe=宿主随岗（GLM5.3）；门一
k1（kimi-third $max）+d1（deepseek $max）双审；裁决部 $max。

## §1 基线终态（对不上禁提交）

- 基线=f5abf819a7c（v133 §3 补录，CI success 亲验）。本批=B4 一笔
  （diff 面 14 文件 223+/60-：src lineage/library 域 5 改+use-sidebar-pane.ts
  新+CSS+tests 6 改 2 新+locks/manifest+exemptions+registry+本交接书；
  PaperRow 零改动=裁决部 C3 落档）。verify 终验 EXIT=0（251 件/2591 例）
  +locks 354+test-surface 52/52 hits stale 0（assertionCount 8525/caseCount
  2670——probe 亲跑数）。

## §2 B4 交付摘要

- **三条全落地**：①#→·（U+00B7）短号前缀——src 3 处
  （PaperDetailPanel idBadge/LineageSidePanel cap/LineageTimelineCard
  .c-no——第三处=主控 grep 盘点补全，设计稿锚 2）+tests 断言 8 行；排除面
  （色值族/PaperRow 无前缀序号）零误伤。②YEAR-MO 四分支（yearMoText
  单源重构：有月=YYYY-MM 补零/month null=仅 YYYY/lineage.year null=
  未定年+月段省略/无脉络=单值；monthWord 删除）。③侧栏——use-sidebar-
  pane.ts 新 hook（138 行：clamp 200-480+拖拽会话+localStorage）+
  LineagePage aside 右缘 4px 手柄+48px 窄条（整条 button 竖排「详情」）
  +LineageSidePanel onCollapse 收起钮+e2e lineage-sidebar.spec.ts
  （clamp 两界+reload 持久+收起往返，boundingBox 几何断言）。
- **主控票面定死项**：localStorage 键=`synapse:sidebar:width`/
  `synapse:sidebar:collapsed`（冒号前缀对齐 SplitPane `synapse:splitpane:`
  先例——设计稿点号写法与仓惯例冲突，以仓惯例为准；裁决部 C1 三面 grep
  落档）；默认宽 252=CSS .lg-inspector 保留为无 JS 回退（C2 双源落档）。
- **门链**：executor 基批（12 自裁全追认）→门一 k1 放行 B0/W1/N8+d1
  有条件放行 B0/W2/N7（**双席分歧项=pointer capture**：k1 判 Chromium
  鼠标拖按隐式捕获可兜底/d1 判规范层 mouse pointer 无隐式捕获——RR1
  防御性加固后分歧客体消灭）→RR1 三小修（setPointerCapture+spy 例
  `toHaveBeenCalledWith(7)` 钉实参/未定年第四分支例+变异红证/dragging+
  SIDEBAR_DEFAULT_WIDTH+clampSidebarWidth 死导出收敛）→双席复核双 PWC
  唯一条件=capture spy 例证据补档（**根因=主控复核包组装失误：未跟踪
  测试文件 git diff 为空**，非 executor 缺证——主控点验断言强度+定向
  32/32+补档仓外兑现）→probe 九项矩阵（八绿+9②裁决保留）→裁决部
  GO_WITH_CONDITIONS 三条件全兑现。
- **豁免 12 条**（主控登记，8 MISSING_ASSERT+4 MISSING_CASE；52/52 hits
  stale 0）：机检语义=expect 链源文本含字符串实参字面量——**断言字面量
  改写必红**（B1 批「字面量改写零豁免」预判在本批勘误）；4 CASE=例内
  断言 100% 含改写位致整例签名漂移（例/标题均在非删例）。裁决部全数
  追认（与 B1 批 40 条先例同构，1:1 映射自洽）。
- **probe 九项矩阵**：verify EXIT=0（251 件/2591 例）+test-surface 52/52
  +locks 354+e2e 三 spec 17 passed+四变异红证（A=# 回退→`'#012'≠'·012'`；
  B=去补零→`'2023-6'≠'2023-06'`；C=去 clamp→`'1452'≠'480'`；D=去
  capture→spy 零调用）各自命中票面合同分叉+还原 diff 空×4+grep 矩阵
  （`#${String` src 零命中/死导出零外部 import/三文件码位 U+00B7 精确）。

## §3 操作条款增补（承 v133 §3 全项外）

- **test-surface 豁免预判口径修正**：断言字面量改写（含锁定测试内的
  显示文本同步）**必触 MISSING_ASSERT/MISSING_CASE**——门指纹=expect 链
  源文本含字符串实参。后续单元凡改显示文本面：主控豁免登记随批走，
  禁再预判「零豁免」（B4 实锤：票面预判零豁免→机检 12 红→主控逐条
  登记后过）。
- **复核包组装教训**：未跟踪新文件 git diff 为空——组装审/复核包时
  未跟踪件必须读全文（或 git add -N 后 diff），段头有而内容空=证据链
  缺口，门一必中（本批双席共同条件）。同源防再犯。
- **双席理论分歧的消解范式**：实现层分歧（隐式捕获有无）不必裁对错
  ——防御性加固使分歧客体消灭，成本一行（裁决部认可「工程终态为裁」）。

## §4 挂账与下场首办

- **下场首办=B2 详情面板+AI 评估与建议**（设计稿 §2 B2：三节新序全文
  笔记→片段笔记→AI 评估与建议+三空态文案+加载占位；片段双击跳阅读器
  唯一保留双击链；阅读器左栏 AI 区整删；消费面盘点入 DoD 含 e2e「AI
  笔记」字面量 grep 清单——显示面唯一=脉络详情面板节+INV 候选 5=src
  grep「AI 笔记」零命中锚定 B2 落地；数据零迁移 ai_notes 留库直读）。
- SplitPane 同型「出窗释放」理论面挂账（裁决部加严三要素：触发=真实
  异常观测或下次触碰 SplitPane 即加固；参照实现=use-sidebar-pane.ts
  RR1 capture 模式——修复成本已被本批压至复制级；现时不开新票）。
- B4 N 级备案（全提示级）：it() 标题与断言语义反转 2 例（锁面措辞
  改需流程，后续票顺手对齐）/loadWidth 非数字符串路径无专测/e2e 几何
  断言单发无重试（宪法 2 次立案线兜底）/reload 段 collapsed 持久仅
  单测面（e2e 加一行可闭环）/resizer 键盘不可达（role=separator 无
  tabIndex——APG 键盘建议后续可选）/「未定月」跨面残留=时间线月组头
  lineage.spec:296（票面外措辞一致性，供设计岗知悉）/describe 题名
  「三分支」实容 4 例（cosmetic 后续票对齐）/PaperDetailPanel.tsx:61
  头注「未定月措辞退役」文档句=裁决部保留裁定（单行负向文档防再引入）。
- CI 首查：本批一笔 run。

## §5 新会话开工序

1. CI 首查一笔 run。
2. B2 派发（票面=设计稿 §2 B2 节+§4 不变量候选 5；「AI 笔记」全消费
   面 grep 盘点随票附——B2 毕 src grep 零命中锚定）。
3. B2 毕后 B3→C3（C3 输入=v1.6 机制定位版+T0 双红实锚）→C1→C2。

## §6 本场成本（收口登记）

- executor（GLM5.3 宿主随岗）：基批 7,529,280+RR1 1,285,710。
- 门一 k1（kimi-third $max）：一审 62,533+复核 110,674。
- 门一 d1（deepseek $max）：一审 82,663+复核 82,463。
- probe（GLM5.3 宿主随岗）：1,945,348。
- 裁决部（$max）：27,538。
- 合计 11,126,209 subagent tokens（裁决部复算 executor+probe 子合计
  10,760,338 两轮一致）。账本 654→663（B4 九笔：impl/裁决/k1/d1/
  rework/k1 复核/d1 复核/probe/裁决部）。
