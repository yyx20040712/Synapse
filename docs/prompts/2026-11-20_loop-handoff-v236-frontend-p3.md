# 交接书 v236 —— 前端改造第三期收口（阅读器双侧栏+右栏会话记忆+引用落位双面板）B1-B3 三批全绿

> 取代 v235（2026-11-20 F-LANEGRID-01 B4 收口场）。本场=前端改造第三期
> （docs/design/2026-11-19_frontend-rework-plan.md §4 第三期；用户 2026-11-20
> 选定方向）。三批=主控编排（executor 实现→reviewer 独立审查→回炉→主控
> 收尾提交），每批独立 commit+verify 全绿。

## §0 本场总账

- **B1 结构迁移（提交 59a3262a，27 文件 +1167/−511）**：右栏研究面板
  ResearchAside（SplitPane side=right，paneId=reader-research，页签 AI 对话/
  笔记条件挂载互斥——保 INV-106 卸载 flush）；PaperAiPanel/ReaderNotesPanel
  自左栏迁入；locateFragment（INV-20 单入口）随迁；OutlineAside 瘦身只剩
  目录/缩略图（210→124 行）；左右栏开合收口 ReaderToolbar 两端 aria-pressed
  开关（收起钮/浮动 chevron 退役）；reader.store 拆 state/tab-state.ts 后增
  researchTab?（per-tab 缺省 ai）+researchOpen（顶层会话态默认 true）；
  SplitPane 增可选 paneTestId（防 e2e strict-mode 多命中，缺省行为零变）。
  审查 1B/0W/2N→回炉全清：B-1=noteHighlight 订阅驻组件内则面板收起时无
  订阅者（点标注无反应）——副作用提升常挂载层 ReaderPageView（单一展开
  责任点），新增生产装配测试 reader-research-assembly.test 先红后绿。
- **B2 右栏滚动会话记忆（提交 b0537475，9 文件 +1032/−10）**：TabState
  researchScroll?（per-paper per-tab 分槽）+saveResearchScroll（显式
  paperId/不 bump scrollRequest——INV-29/118 双源分离）；use-research-scroll
  收账三点（页签点击前预读/activeId·tab 变化消费 store 订阅快照/卸载
  cleanup）+恢复（面板内部有效滚动容器 scrollTop 直写+rAF 逐帧重试帧上限
  120，INV-34 登记例外）+noteHighlight 让位（到达登记+点击清除+新信号即
  作废在途循环）。审查 2B/1W/1N→回炉全修（探针实证三缺陷：切换收账读新
  DOM 存 0→store 订阅 set 同步时刻快照；同页签新信号不作废在途恢复→到达
  即 token++；重复点击当前页签遗留 skip 漏存→onClick 守卫+每渲染收尾清
  除；rAF 生命周期四用例入库）。审查探针配方转仓内常驻回归
  （seedReadyAiPanel 直播态夹具）。INV-34 例外登记+INV-20 消费方校正随批。
- **B3 引用落位双详情面板（提交 1f1504f6，22 文件 +883/−24）**：新 IPC
  通道 export/citation（三格式单篇取内容 Res={text}——预览按设计回传
  renderer，序列化单源 main，通道 93→94 域数 23 不变）；citation.serializer
  纯函数（GB/T 7714 顺序编码制单条**不带 [1] 编号**——单条复制场景编号
  无意义；APA 第 7 版含空格作者姓-缩写启发式/CJK 原样）+golden 8 例；
  buildCitation 三格式分派（bibtexEntryOf 与 buildBibtex 单源共用）；
  DrCitation 共用件（三格式分段钮+预览迟到回包 seq 守卫+复制
  writeText+toast「引用已复制」）落位 PaperDetailPanel（DrKeyVals 后
  「引用」节）与 LineageSidePanel（信息区后）；DrActions 九钮零触碰
  （快捷批量复制与引用预览=两种交互并存，重复性接受）。审查 1B/3W/1N→
  主控亲修全清：B-1=格式偏好驻组件态，宿主换篇加载期卸载即丢（真实宿主
  探针实证重置回默认）→会话级模块态 preferredFormat+卸载重挂回归（变异
  验证组件态即红）；W-1 两乱序回包 deferred 用例入库；W-2 e2e 补
  citation-text 本体 toBeVisible；W-3 bibtex 分派改完整单条 golden+
  buildBibtex 对账；N-1 两处通道计数注释陈旧同步。
- **验收用例（随收尾提交）**：research-scroll.spec 增「B1 双侧栏开关：
  1280 宽度双钮可点击+双栏开合+PDF 正文可见」（e2e 默认窗口=DEFAULT_BOUNDS
  1280×800——直接承载计划验收条款）。
- **flake 台账（B1 批，主控亲笔）**：E5 场景一 detach 循环亚型跨场次第二现
  →立案线触发；同批机制识别（E5a 种子占位 fileRef→tab error→空态整树
  卸载→页签反复重挂载——对 :83 click detach 族为上游共同机制候选）+
  结构性消除（种子改真实 tiny PDF，断言零变）→idx23 status=fix-landed
  （历史计数保留，观察窗达标转 resolved）；主立案条 idx29 追加机制呈报
  （计数不动，F-E2EFLK-01 承接不变）。

## §1 下场序（新会话清单）

1. **首动作**：核本交接书+CI 回执（B1-B3+收尾提交 push 后 success）。
2. **走线观感复核**（v235 §1-2 沿承未做）：脉络图跨年链/月标骑线截图呈
   用户裁决。
3. **dist 测试版进入**（v235 §1-3 沿承，路线序 11）：视检复核后打包。
4. **前端改造第四期**（设置五类归并+暗色主题删除——计划 §4 第四期，含
   存量迁移与受锁测试面，规模与第三期相当）。
5. 沿承：R5 拖动空槽位设计稿、PAD=6 观感复核（v232 §4-3）。

## §2 治理注记（本场增量）

1. **模块级会话态模式**：DrCitation preferredFormat 与 reader.store
   researchOpen 同型（模块态=应用会话生命周期，不写持久化）——与组件态
   的边界判据=「宿主卸载边界是否会吞掉用户选择」；文献库详情面板换篇
   加载期整体卸载子树是隐蔽卸载面（审查 B-1 教训：组件级直挂测试测不出，
   须真实装配/卸载序列用例）。
2. **审查探针转仓内回归**：B2（seedReadyAiPanel 直播态夹具）与 B3（真实
   宿主换篇探针→卸载重挂用例）两轮均把审查者仓外探针配方吸收为常驻回归
   ——审查发现的行为缺陷必须以仓内用例落地，不许只修代码不留锁。
3. **新 IPC 通道决策先例**：export/citation 是「内容按设计回传 renderer」
   的首例展示型通道（与 clipboard「内容不过 renderer」分工注释写明
   api-surface）——后续同类需求（预览型取内容）沿此先例，序列化单源留
   main。

## §3 测试版本路线

| 序 | 票 | 状态 |
|---|---|---|
| 10 | 集中视检轮 | done（F-LANEGRID-01 关） |
| 11 | dist 测试版 | 解锁待做（视检复核后打包） |
| — | 前端改造 | 一期✅ 41186b2b/二期✅ 011b3892/三期✅ 本场 B1-B3/四期待做/五期✅（F-LANEGRID-01 承载） |

## §4 待用户面

1. 走线观感复核（截图呈裁）。
2. 本场申报偏差：GB/T 7714 单条不带 [1] 编号（mockup 字面含 [1]——单条
   复制场景编号无意义，golden 锁定）；DrActions 保留「复制 BibTeX」钮
   （与引用区 BibTeX 格式并存=快捷批量/预览单条两种交互）；两作者 APA
   连接符取「A, & B」。
3. **阅读器双栏极窄视口挤压（本场新行为）**：双侧栏默认同开，视口宽
   <824px（224+300+主列最小值）时主列被挤至零宽（阅读器根 overflow-hidden
   兜底无外滚，正文不可见）。CI 1024/桌面验收 1280 均不受影响；F-05 e2e
   480 压力段已收右栏还原单栏受试形态（INV-34 断言面零变）。是否做「窄
   视口自动收起右栏」（仿二期文献库详情抽屉状态机）待用户裁决；窗口无
   minWidth 约束为同域背景事实。
4. **architecture.md §3.5 lineage 段既有失真（非本场引入）**：仍描述六态
   链走线（direct→h-slip→detour→band→outer-ring）与槽位机制，F-LANEGRID-01
   已整体替换为车道网格统一分配（B4 收口未回写此处）——按宪法「文档与
   代码不一致报告差异」呈报，回写归 F-LANEGRID-01 补账或下场顺批。

## §5 沿承挂账

- open 池=5 张（F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-E2EFLK-01/
  F-RECOV-03）。F-E2EFLK-01 输入事件族排查面新增机制呈报（§0 flake 条）。
- use-edge-edit 656 raw 行数债、E5 flake 台账观察窗（fix-landed→resolved
  转换条件=后续 CI/本地全量无同指纹再现）、expectPathAvoids 弦采样口径
  挂账（v235 §4-2）沿承。

## §6 验证终态与 CI 回执

- 三批提交：59a3262a（B1）/b0537475（B2）/1f1504f6（B3）+收尾提交
  （验收 e2e 用例+本交接书）。每批 npm run verify 全绿（B3 终态 409 文件/
  4309 用例+build）。
- 受影响 e2e 分批全绿：reader-text 20/lineage 27/ai 三件 9（B1）；research-
  scroll 2/2+repeat-each 4/4（B2）；library-detail-info+lineage-side-info
  10/10（B3）；research-scroll 3/3 含双开关验收例（收尾）。
- 本地 e2e 全量：首轮 163 passed/3 failed——三红面全数定性=B3 漏适配的
  旧节序断言×2（library-density .lib-dr-sec 唯一性→两节数组；lineage T4
  三节 h4 序→四节序含前置「引用」）+F-05 480 压力段双栏挤压（§4-3 裁决：
  收右栏还原单栏受试形态，INV-34 断言面零变）；适配后定向复跑 4/4 绿
  （library-density 整文件+T4+F-05）。
- **CI run 44745409574（b8f9ba36 首推）：failure**——两红面：①T1 断言
  迁移段 attempt1 红/retry 绿（既有 flake 族复发，台账 idx29 追记计数
  10→11，非本批引入）；②research-scroll B2 笔记用例双跑全红（CI 1024×720
  特有）。②根因链（本地注入同视口复现+三轮几何探针实证）：种子 14 条
  标注 sort 键全同（page/startOffset/endOffset 一致）→sortByDocumentOrder
  落 id 字符串序（'b2-frag-14'<'b2-frag-2'）→「第14条」实排第 6 位（深处
  前提坍塌）；自校准滚动用 li.offsetTop（相对静态布局链的 offsetParent
  高估目标位 609 vs 真实 282）→scrollTop 夹取到 max 351 直接把目标滚进
  容器上方裁剪区（Playwright toBeInViewport 按祖先裁剪计 ratio=0）。修复
  （纯测试面）：种子 startOffset 逐条递增（文档序=种子序，末条真深处）+
  自校准改 boundingRect 差值增量（视口无关）；笔记/AI 两用例同修。验证：
  本地默认视口（1280×800）3/3 绿+CI 视口（1024×720 注入）笔记用例绿。
- CI：**run 44750938753（ab595cf2 修复推送）：success**——全量 e2e（含
  research-scroll 双用例与 T1）绿，前端三期收口达成（完成定义达成）。首推
  44745409574（b8f9ba36）failure 的两红面处置见上（T1=flake 族复发台账
  追记；research-scroll=夹具缺陷根治）。
