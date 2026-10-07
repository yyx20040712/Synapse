# 设计书 v1.2 —— F-UIRES-04 侧板/文献库详情面板论文信息区 + F-ANCHFIX-01 走线锚级一致（2026-10-07 主控终裁定稿；v1.1=用户四项裁决回填；v1.2=批 1a 探针终裁+C/D 二轮裁决回填）

> 三段通道产物：拟定（v0.9→v0.95→v1.0 两轮回炉）→对抗审核（全稿审
> B2/W12/N10 + 增量审 B1/W9/N7，全处置闭环）→主控终裁（v1.0）→用户
> 裁决回填（v1.1）。实施分批单源=本档。上游=用户集中视检 R3 轮反馈五条
> （交接书 v154）。

## 主控终裁记录（2026-10-07）

**v1.2 批 1a 探针终裁+C/D 二轮裁决回填（2026-10-07，runId=20261007-anchfix01-b1a）**：

- **探针终裁（G1 前半）**：正身=**候选 3b 实锤**（P5 六场景分叉 5 起=83%、
  跳锚 32-66.48px、竖向族系统模式「预览恒吸 ½ 锚、松手路由恒落 ¼/¾ 锚」
  ——瀑布错位使目标中心 x 偏移→selectAnchor 投影系统性偏离 ½）；候选 2
  证伪（P1 全 36 样本端点 frameErr 法向/沿框双 0 精确落锚——Z 形/含端
  迁移从未移动端点）；候选 1a/1b/1c 全证伪（P2 badge/matrix/卡宽三源
  恒等；P4 rAF0/1/2+settled 四相位端点逐位全等）。证据档=仓外档案区
  `20261007-anchfix01-b1a/`（probe-anchfix.mjs+四 JSONL+rootcause-report.md）。
- **呈裁 D 已裁=统一为路由规则**：预览吸附改 selectAnchor 同函数同参
  （所见即所得——松手零跳动；手感变化=吸附点不再紧跟光标而按主向规则，
  预览实时显示最终锚位）。批 1b 解闸。
- **呈裁 C 已裁=armed 态 12 锚小型化全显+占用槽高亮**：显示域=可吸附域
  自洽（吸 ¼/¾ 不再落无可见锚处）。批 1c 解闸。
- **随裁实施修正三项（1b 消化面，rootcause-report §二）**：①桩三元组
  d 级断言改形态——stripCollinear 剔共线桩顶点+圆角切点截短首段使「次点
  =stubEnd」结构性不成立，1b e2e 改断「首段方向沿命中边外法线 ±2°」
  （桩长由切点几何反推或 skeleton 级单测承载）；②Oracle 分路由镜像——
  selectAnchor 仅 direct 态选锚（h-slip=sideAnchor 近侧、corridor/fallback
  =sideAnchor 右缘），§3.3 W8 单锚规则假设失准勘正；③direct 态瀑布错位
  下结构性稀缺（同 slot 跨月 x 不对齐——夹具直连意图边实测全落 band），
  §3.5 六态矩阵 e2e 以实测 route 断言为准。

**v1.1 用户裁决回填（2026-10-07 呈裁后）**：
- **呈裁 B 已裁=运行时提取**（附新事实：后续 AI 评估与建议模块将复用
  提取图片——PaperImageExtractor 定位=AI 前置基建，缓存表升级事项
  后续独立讨论）；G4 解闸。
- **呈裁 E 已裁=文献库详情面板（需求面修正）**：用户澄清图五=文献库
  页非阅读器——**阅读器右栏不显示信息区（OutlineAside 零改动）**；
  同构目标改=library/PaperDetailPanel（Zotero 式详情面板）；布局指示
  （用户原话）：「标签上移，论文元数据排在标签下面，论文元数据下面
  才是各个按钮」+「右侧添加滚动条功能」承载。G3 解闸。
- **呈裁 C/D 已裁=等批 1a 探针结果再裁**（批 1c/批 1b 修复面维持挂起）。

1. **采纳 v1.0 终稿为实施单源**。两轮对抗链 findings 全处置核验通过：
   回炉轮 1（B2 状态机前置/W12 INV 强制方式等 22 项）+回炉轮 2
   （B1 接受判据互斥 S7 回流行/W6 句柄三则/W8 预言机绑定等 17 项）。
2. **呈裁点 A 主控裁 (c) 禁用态呈现行**（否决拟定推荐 (b) 纯省略）：理由=
   用户图三点名机构为信息区四件之一，纯省略违背用户可见预期；禁用态
   呈现+「机构信息待数据库升级后开放」提示=在册 UI 模式先例（侧板星标
   P-11「星标功能即将开放」禁用呈现同款）。
3. **v1.1 随 E 裁决的设计修订（主控权限内——props 化不推翻任何已审
   findings 处置，状态机/合规面全保留）**：PaperInfoSection 改纯
   展示组件（props 数据注入，取数归各宿主）——脉络侧板=paperInfoStore
   （S1-S9 状态机沿承）；文献库面板=复用既有 detail 直连链
   （useAsync+stale 守卫 P7E-05 在案，作者/摘要已在 PaperDetail 载荷）
   ——paperInfoStore 服务面从「两域共享」收窄为脉络域（library 域零
   新增取数面）；图片条=两域共用 PaperImageExtractor（注册表+LRU）。
4. 调查结论预登记：预览选锚（nearestAnchor 距离最近）与路由选锚
   （selectAnchor 主向定边）规则不同源=代码级坐实——候选 3b 机理成立，
   正身判别归批 1a 探针（P1/P5）。

---

## 0. 拟定开工记录与回炉处置总表（两轮并入）

拟定岗环境约束：零仓库接触（任务书自包含）、禁派子代理、图像通道不属
拟定岗。技能清点按原则适用（前端设计形态/系统化调试形态/计划单元化
形态；开放发散/成图判读/后端数据族技能不适用）。

**主控核验定案（2026-10-07，效力>本稿任何推演）**：
1. check-quality 跨域检测只扫 features/ 内相对 import——renderer/shared/
   不在检测面=中立合法零登记；INV-16 eslint 无 ignoreTypeImports（类型
   import 同属限制面），pdfjs 类型消费一律经 PdfDocProvider 既有类型
   再导出（`export type { PDFDocumentProxy, RenderTask }`，头注在案），
   零新白名单计数；PaperImageExtractor.ts=第五白名单件（唯一运行时
   import）。
2. INV-A 销项 e2e 取数=纯 DOM 面：解析 path 元素 d 属性（M/L 坐标串）
   +data-slot+卡 getBoundingClientRect÷zoom 独立复算，零 React state
   依赖；zoom=ctrl+wheel 脚本化（timeline-zoom-hook 在案）；等待协议=
   动作后 2 rAF+500ms 窗 50ms 步轮询（对齐 e2e 非确定红 2 次立案线）。
3. buildRoundedPath：n=2 直通首末；n≥3 圆角循环 i:1..n-2 仅中间顶点
   （rounding.ts:80）——首末点双路径均直通；stroke 端帽视觉外溢不计入
   骨架断言（感知面归候选 3a）。

**回炉轮 1 处置（v0.9→v0.95）**：B1→§4.8；B2→§4.11；W1/W9（zoom 机理
核验消解）→§3.1/3.3；W2→§3.3 金标；W3（层位核验）→§3.1；W4→§3.3
阈值块；W5→§4.4；W6→§6 受锁面；W7（观测面核验）→§3.3 夹具；W8→§4.3
缓存；W10/W11→§7-A/E；W12→§9；N4→§4.10；N5→§1.1；N6→§4.9；N7→§5；
N8→§6 视检；N9→§6 闸门；N10→§3.5 矩阵。

**回炉轮 2 处置（v0.95→v1.0）**：

| Findings | 处置 | 落点 |
| --- | --- | --- |
| B1 S1×S5 互斥（A→B→A 回流 stuck loading） | 接受判据改 activeSeq 绑定语义+S7 回流行+终态断言 | §4.11-M1 |
| W1 HIT 行+store 属地 | 补 HIT 行；renderer/shared/paperInfoStore.ts（定案 1 零登记） | §4.3/4.11 |
| W2 幂等/维持/INVALIDATE 全格 | 补格+INVALIDATE 事件源裁定（本批零派发挂 F-TAGS-02）+写穿校验 | §4.11-S6 |
| W3 RETRY 界 | RETRY 仅 error 态；CANCEL/TIMEOUT 不引入（scope 界声明） | §4.11 |
| W4 M2 补格 | I7 UNMOUNT 分策+I8 独立重试+幂等行+immutable 假设 | §4.11-M2/§10 |
| W5 合规清单四件 | eslint+invariants 双受锁流程+新件零 generate 确认+defense-lifecycle 事件行 | §4.8/§6 |
| W6 句柄三则 | destroy 仅自建/stale handle 防护/提取层单点去重 | §4.8/§9 INV-E |
| W7 类型消费 | 定案 1 消解：经 PdfDocProvider 再导出 | §4.8 |
| W8 Oracle 绑定 | P1 期望锚=selectAnchor 规则镜像重实现；预览 nearestAnchor 单列不判红 | §3.3 |
| W9 e2e 通道 | 定案 2 消解：d 属性解析+夹具协议 | §3.3/3.5 |
| N1 rounding 补证 | 定案 3 一句入档 | §3.1 |
| N2 阈值按态参数化 | 无桩族/带桩族两族断言（manual-override 裁入无桩族） | §3.3/3.5 |
| N3 worker 归属 | PaperImageExtractor 模块级自置 GlobalWorkerOptions（同值幂等+头注） | §4.8 |
| N4 I6 微时序+partial 淘汰 | 完成回调同步判定（event loop 无竞态声明）；partial 入淘汰族 | §4.11-M2 |
| N5 error 文案+机构行承载 | UI「信息加载失败」+console 细节；机构行随 M1 态族 | §4.11 |
| N6 事件扇出 | 宿主统一分发 SELECT/UNMOUNT 至两机，M1 不代理 M2 | §4.11 |
| N7 S5 测试通道 | 单测 window.api mock 计数（实施批测试件内） | §4.11 |

---

## 1. 需求重述与术语表

**F-UIRES-04（主票）**：脉络侧板头部操作行与标题之间增标签行（文献库
全局域标签，F-TAGS-02 域化后联动）；头部与笔记三节之间插论文信息区
（作者+摘要+文中图片+机构四件）；信息区与笔记区同滚动承载；笔记三节
下移；侧板收起钮与左侧导航收起钮同款美化；阅读器右侧栏（OutlineAside
域）同构论文信息区。

**F-ANCHFIX-01**：落边线条起止点距文献卡框视觉偏移远超在册契约容差
（每卡 12 锚〔每边 ¼/½/¾〕、短桩 10px 外法线，端点应落锚点±桩长内）。
含 C2 批挂账「落边建立=锚级一致」销项义务。

**搭车小票**：F-DRAGVIS-01 同月拖拽候选槽位阵列可视化缺口；
F-SETSTYLE-01 设置页按钮统一普通圆角矩形。

### 1.1 术语表（统一口径）

| 术语 | 定义 |
| --- | --- |
| 信息区 / PaperInfoSection | 论文信息区组件（作者/摘要/图片 strip/机构位四件） |
| 标签行 / TagsRow | 脉络侧板头部标签行组件（全局域，F-TAGS-02 联动受理面） |
| 落边 | useDrawLine 画线松手建立的边 |
| 预览锚 / 路由锚 | 拖拽预览吸附锚位 / 松手后 routeAll 实际占用锚位（slotMarks 透出） |
| 锚级一致 | 边 path 首末点与 slotMarks 指示锚位几何一致（判据 §3.3 阈值块） |
| 金标 Oracle | 探针/e2e 内按 selectAnchor 规则镜像独立重实现的期望锚位复算（禁 import anchors.ts） |
| activeSeq | 当前选中 pId 的在飞请求序号（接受判据绑定令牌） |

## 2. 现状分析

1. 红线行数：LineageSidePanel 249/250、LineagePage 249/250（零触约束
   ——在册挂账「下票触及先瘦身」）、OutlineAside 189/250、EdgeOverlay
   221/250。
2. zoom 机制（主控亲核）：inline `transform: scale(z)`+origin 0 0+store
   单源+无 transition；候选 1a（scale 双源）/1b（单位域混用）结构性
   排除，1c 窄化为渲染管线帧间隙（低置信）。
3. 绘制层位（主控亲核）：骨架首末点=渲染 M/末点（圆角仅中间顶点，n=2
   直通；stroke 端帽外溢属感知面）；stripCollinear 首末保留语义=实施批
   核验项 V-1。
4. pdfjs 机检面（主控亲核）：INV-16 白名单四件+第五件
   PaperImageExtractor.ts（唯一运行时 import）；类型消费经
   PdfDocProvider 再导出零新增计数。
5. 观测面（主控亲核）：data-slot 在 EdgeOverlay.tsx:184 生产；path d
   属性可解析；zoom e2e（ctrl+wheel）基建在案（lineage.spec/
   route-slots/obstacle-audit 三 spec 含 zoom）。
6. 数据面（主控亲核）：paperDetailSchema 含 authors: string[]/abstract:
   string/tags: [{id,name}]/updatedAt——零 schema 变更；机构无库字段
   （DB 战役窗口在案，用户 2026-10-02 裁决）。
7. 跨域机检面（主控亲核）：check-quality 只扫 features/ 相对 import
   ——renderer/shared/ 中立零登记；跨域互引两方向默认全禁（例外=文件
   级枚举表 COMPOSITION_ROOT_ALLOW）。
8. **预览/路由选锚规则不同源（主控亲核，候选 3b 机理坐实）**：
   useDrawLine nearestAnchor=全图 12 锚**距离最近**命中（≤DRAW_SNAP_R）
   vs routeAll selectAnchor=中心向量**主向定边**+侧内投影最近+AnchorUse
   散开——同一几何态两规则可选出不同锚。
9. 残留任务书不足：U-1 预览锚完整判定链（P5 取证）；U-4 视检图证本体
   未随包（P1/P2 首步机检区分偏移语义）。

## 3. F-ANCHFIX-01 根因调查（定稿）

### 3.1 排除项与层位裁定

- 候选 1a/1b 排除（现状 2）；1c 残余=帧间隙（低置信）；v0.9 原点不变性
  推导前提收窄存档（仅「均匀 scale+两 rect 同帧采集」下成立，排除主柱
  =现状 2 实证）。
- 层位（现状 3）：rounding 两路径首末直通，**骨架级断言=渲染级断言**
  成立；stroke 端帽半线宽外溢不计入骨架断言（归候选 3a 感知面）；V-1
  待核项沿承（实施批首核）。
- 置信度定稿：候选 2（Z 形/桩施加越锚）中-高；候选 3b（预览/路由锚
  分叉——机理已代码坐实）中-高；候选 3a（4 中点 vs 12 锚感知差）中；
  1c 低。非互斥，探针排除法判别。

### 3.2 候选推演

**候选 2：槽位/Z 形施加越锚**。机理：slotAssign+Z 形回写骨架点链若动
首点即离框。「锚端不变性」在案声明锚定 band 态；corridor/fallback/
manual-override 三态构造性保护未在案机检（C2 挂账=该域契约从未机检
销项）；AnchorUse 散开到邻边/对边产生「在框但非预期边/槽」的合法偏移，
叠加用户预期差。反对：锚构造在框+不变性设计意识在案。

**候选 3a：显示层 4 中点 vs 12 锚判定感知差**。线落 ¼/¾ 槽合法而可见
锚仅 ½ 中点；端点恒在框上、沿框偏移 ≤¼ 卡宽、离框=0——单独不解释
「离框」读法。

**候选 3b：预览锚≠路由锚（松手跳锚）**。机理见现状 8（规则不同源代码
坐实）。预览吸附=光标最近锚，松手后 routeAll 按主向规则+散开重选锚
——线「跳锚」，用户参照系=松手时预览落点。显示层仅 4 中点作 affordance
（吸附粒度与可见点若不同族），分叉可感面结构性存在。判别权=P5 分叉率。

### 3.3 诊断探针 P1-P5（定稿）

**金标 Oracle 绑定**：期望锚位=按路由侧 selectAnchor 规则（主向定边
|dx|≥|dy| 取横+侧内投影最近+并列取小序）独立重实现于探针/e2e 断言件
——禁 import anchors.ts 但规则镜像（契约=路由行为契约）；预览侧
nearestAnchor 规则单列分叉率指标，不并入 P1 判红（3b 判别归 P5）。
〔v1.2 勘正（批 1a 实测）：本块单锚规则假设失准——selectAnchor 仅
direct 态选锚，h-slip=sideAnchor 近侧、corridor/fallback=sideAnchor
右缘；1b Oracle 按路由族分规则镜像（终裁记录 v1.2 节修正②）〕

**阈值块（按态参数化）**：STUB_S0=10 内容 px；ε=1 内容 px。
- 无桩族（direct/h-slip/manual-override——端点=锚直落，主控亲核
  chain.ts/manual-override 分支 skel=[a.pt,...via,b.pt]）：首点法向
  ≤ε+沿框与 slotMarks 槽位 ¼/½/¾ 点位差 ≤ε。
- 带桩族（band/corridor/fallback）：首点同无桩族断言+次点 stubEnd 桩
  三元组（桩向与外法向夹角 ≤2°、桩长 ∈[9,11]）。
- 迁移判别：沿框超差但命中同边他槽=槽位迁移（候选 2/3b）；命中他边=
  跨边迁移；法向超差且非桩端=真离框。
- 投诉量级对照：视口偏移 >(10+ε)·s ⇒ 真偏移成立；在框且沿框 ≤¼ 卡宽
  ⇒ 感知层区间。

**P1 数据层金标（主探针）**：纯 DOM 面——解析每边 path 元素 d 属性
M/L 坐标串得首末点+data-slot 读槽位+卡 getBoundingClientRect÷zoom
独立复算内容域卡 rect；金标对照两族断言×六态×zoom {0.75, 1, 1.25}。
零 React state 依赖。红→候选 2 族；绿→P5。

**P2 zoom 扫描（1c 残余专验）**：ctrl+wheel 脚本化扫 {0.5, 0.75, 1,
1.25, 1.5}×pan 两位；每样本带 scaleState（store zoom）/scaleCSS
（computed matrix 分解）双字段。

**P4 相位探针**：zoom/拖拽 settle 后 0/1/2 rAF 三相位+.tl-measure 窗
边界跑 P1 子集。

**P5 预览锚 vs 路由锚对照**：临时透出 data-preview-slot（镜像
slotMarks 模式，常设与否随呈裁 D）；e2e 鼠标画线逐动作记录
{previewSlot, finalSlot} 对；分叉率>0 且呈系统模式（如预览恒中点族、
路由恒 ¼/¾）→3b 实锤。

**夹具协议**：动作后 2 rAF+500ms 窗 50ms 步轮询；同一用例非确定红 2
次即立案（纪律线在案）；双面板夹具=播种已知 tags/authors 论文。探针
一律直写文件（shell 隔层传参四坑纪律），输出 JSONL 入仓外档案区
`E:/zcode_md/synapse-archive/scripts-audits/`。

### 3.4 修复方向（按定正身映射）

| 正身 | 修复 | 要点 |
| --- | --- | --- |
| 2 Z 形/桩越锚 | 端点不可变强化 | chain.ts 出口 dev 断言 points[0]===锚点+六态单测；Z 形只动行进顶点 |
| 3b 预览/路由分叉 | 选锚语义统一 | 预览吸附=selectAnchor 同函数同参（所见即所得）；触呈裁 D+[locked-change] |
| 3a 感知层 | 显示层对齐 | 呈裁 C |
| 1c 帧间隙 | 快照时机收口 | 仅 P4 实锤时执行 |
| 1a 残余 | 防御性单测 | store zoom vs computed matrix 一致性合成单测（防双源回潮） |

### 3.5 销项判据 + 六态两族矩阵（C2 挂账销项）

〔v1.2 勘正（批 1a 实测）：direct 态瀑布错位下结构性稀缺（同 slot 跨月
x 不对齐——夹具直连意图边实测全落 band）；1b 矩阵覆盖以**实测 route**
断言为准（终裁记录 v1.2 节修正③）〕

判据：①P1 常设化 e2e（[locked-change]；纯 DOM 通道；夹具协议入 spec
头注）下矩阵「新增断言」全绿 @ zoom 三档；②P5 断言条件化常设（3b 实锤
且呈裁 D 裁决统一后）；③防御性单测在库；④INV-A 登记；⑤全量 verify 绿。

| RouteTag | 族 | 现有覆盖（实施批对表核验） | 新增断言 |
| --- | --- | --- | --- |
| direct | 无桩 | lineage.spec（待核） | 法向+沿框 @zoom 三档 |
| h-slip | 无桩 | route-slots.spec（待核） | 同上 |
| manual-override | 无桩（终裁裁定） | 待核 | 同上 |
| band | 带桩 | obstacle-audit.spec（待核） | +桩三元组 |
| corridor | 带桩 | 待核 | 同上 |
| fallback | 带桩 | 待核 | 同上 |

## 4. F-UIRES-04 设计（定稿）

### 4.1 目标结构

脉络侧板（滚动承载）：

```
header (shrink-0，不滚动)
  SideCapRow      骑缝号 + 星标禁用钮 + 收起钮(同款化)
  insp-title      标题
  SideBadges      venue/IF/被引/年月/T档 (抽件)
  TagsRow         标签行 【新增】
  side-jumps      去文献库/去阅读器
  主题节点提示
.insp-scroll (flex-1 min-h-0 overflow-auto)
  PaperInfoSection 作者/摘要/图片strip/机构禁用位 【新增】
  LineageSideManualNote / Fragments / AiNotes  (原三节下移)
insp-foot
```

阅读器右栏**零改动**（E 裁决=阅读器不显示信息区）；文献库详情面板
（library/PaperDetailPanel，Zotero 式，用户 E 裁决布局指示）：

```
.lib-dr（316px 抽屉，滚动承载——E 裁决「右侧滚动条」）
  lib-dr-head        短号/入库状态 + 标题（现状保留）
  标签节【上移】      TagEditor（既有可编辑节——自 body 中部上移）
  论文元数据区        PaperInfoSection（props 化共享件：作者/摘要/图片
                     strip/机构禁用位）+ 既有键值行（YEAR-MO/VENUE/DOI）
  DrActions 九钮【下移】 动作面（受锁按钮文本零改）
  MetaEditDialog（不动）
```

数据链：复用面板既有 detail 直连（api.library.detail——作者/摘要已在
载荷，零新增取数面）；图片条=PaperImageExtractor 共用。PaperDetailPanel
220/250 红线——重排增量走拆件（信息区挂载+标签节迁移）。

### 4.2 D1 组件拆分

候选一（定稿）：抽 SideBadges（≤50）+SideCapRow（≤45）两旧件+新增
TagsRow（≤40）/PaperInfoSection（≤160）/paperInfoStore（≤110）/
PaperImageExtractor（≤150）；宿主 ≤205。弃候选二（整头抽
SidePanelHeader）：header 条件渲染族迁移面大回归面广，主题节点分支=
宿主编排职责应留宿主。

### 4.3 D2 取数通道+缓存/去重（定稿）

通道=复用 papers detail IPC（字段全在，零 schema 变更），LineagePage
零触（绕开 249 红线）。〔v1.1 修订：paperInfoStore 服务面收窄=脉络域
单域（E 裁决后 library 域走既有 detail 链）；S1-S9 状态机/缓存/去重
设计沿承不变。〕
- 载体：zustand 微 store，renderer/shared/paperInfoStore.ts（定案 1
  中立零登记），两域共享单例。
- 结构：`Map<paperId, {status, data?, error?, seq?, promise?}>`+当前
  选中指针 {currentPId, activeSeq}。
- SELECT(pId) 三分支：缓存完成态→HIT 同步 ready（无 loading 闪烁）；
  在飞→复用 promise 且 activeSeq 回绑该 seq（S7）；miss→新发 seq。
- 接受判据（B1 定稿）：RESOLVE(pId,seq,data) 恒写缓存（ready(pId)）；
  UI 落 ready 仅当 pId===currentPId 且 seq===activeSeq，否则 UI 不动
  （丢弃=UI 层，缓存层保留）。
- 失效：INVALIDATE 事件驱动（源=文献库元数据/标签编辑回调）；本批
  派发面=空集（TagsRow 只读）——事件定义保留入表，标注「本批零派发，
  挂 F-TAGS-02 域化联动启用」。
- 去重：in-flight promise 共享；测试通道=单测 window.api mock 计数
  （vi.fn 包装，实施批测试件内）。

### 4.4 D3 复用形态+落位（定稿）

形态：单一共享 PaperInfoSection+零域分支硬约束（INV-C），域差异仅 CSS
变量/宿主 class；破约（组件内首个域 if）即拆两域薄壳。

跨域方向矩阵（主控亲核定稿）：

| 方向 | 规则 | 性质 |
| --- | --- | --- |
| lineage→reader 组件/store | 禁 | LineageSidePanel 头注明文+check-quality 例外表 |
| reader→lineage 组件/store | 禁 | check-quality 对称执法（无方向豁免） |
| 两域→renderer/shared | 允许 | check-quality 只扫 features/，shared 中立零登记 |
| shared→两域组件/store | 禁 | 中立区不反向依赖 |
| 两域→window.api | 允许 | 通道无域限 |

落位：renderer/shared/ 三件同驻（PaperInfoSection.tsx、
paperInfoStore.ts、PaperImageExtractor.ts）——全方向安全零治理登记面。

### 4.5 D4 文献库详情面板重排（v1.1=E 裁决改写，原「阅读器落位三案」作废）

用户裁决（2026-10-07）：同构信息区落位=**文献库右侧详情面板**（图五
原立案解读为阅读器右栏系误读——阅读器零改动）；效果对标 Zotero 详情
面板；布局=标签上移→论文元数据（含既有键值行+新增四件）→各按钮；滚动
承载（元数据+图片内容多）。

- 挂载：PaperInfoSection（v1.1 props 化）以 detail 既有载荷 props 注入
  ——library 域零新增取数面（useAsync+stale 守卫 P7E-05+reload 链沿承）。
- 标签节=既有 TagEditor（可编辑）整体上移（key=detail.id 重挂竞态守卫
  不动）；脉络侧板 TagsRow（只读）=两面板形态分立（库=编辑面、脉络=
  展示面——域语义不同非同构破约）。
- DrActions 九钮下移至元数据后（受锁按钮文本/testid 零改）；滚动区内
  随内容滚 vs 底部固定=批 3c 视检时用户看效果定（默认随滚动=用户字面
  顺序）。
- 行数：220/250 红线——重排走拆件（标签节/信息区挂载迁移）；批 3c 首步
  出拆件清单。
- 阅读器 OutlineAside 零改动（v1.0 的 OutlineAside ≤200 预算行作废）。

### 4.6 D5 标签行

落位：badges 行后、操作行前独立行（演进面清晰+满足「操作行与标题之间」
字面）；空标签整行省略（与 badges 缺席省略同模式）；主题节点零渲染。
F-TAGS-02 联动=域化票受理面，改点=paperInfoStore 单处（INVALIDATE
派发面同票启用），不预埋 domain 参数（INV-D）。

### 4.7 D6 信息区内部件与滚动承载

信息区入 .insp-scroll（随笔记同滚动），标签行留 header。摘要=
line-clamp 6 行+展开/收起（本地态零持久化）；作者=全量折行 clamp 2 行
+悬浮 title 全量；图片=横向滚动缩略图 strip；点击放大/跳页交互不属
本批（列后续票候选）。阅读器域同承载（信息区在对应滚动容器内）。

### 4.8 D7 图片提取架构（定稿）

路线=白名单扩第五件 renderer/shared/PaperImageExtractor.ts（中立路径+
唯一运行时 pdfjs import）；类型消费（PDFDocumentProxy 等）一律经
PdfDocProvider 既有再导出（零新白名单计数）。worker 归属=本件模块级
自置 GlobalWorkerOptions.workerSrc（同值幂等，与 PdfDocProvider/
CorpusExtractor 同模式，头注声明）。

句柄三则（定稿）：
1. **destroy 仅自建句柄**；注册表句柄禁销毁（生命周期归 PdfDocProvider，
   两文件头注明文——INV-E）。
2. **stale handle 防护**：提取开始捕获句柄引用；完成后查证注册表仍同
   paperId 在册才写缓存/复用，否则结果弃置（reader 卸载注销竞态防护）。
3. **单点去重**：双域并发 miss=PaperImageExtractor 内 in-flight promise
   共享（提取请求层），注册表层不二次去重。

加载策略：句柄 DI 注册表（renderer/shared 驻 Map<paperId,pdfDoc>；
reader 侧 PdfDocProvider 挂载/卸载注册/注销 +~8 行，reader→shared 方向
合法）命中复用（零双载）→未命中独立 getDocument（fileUrl=app-file://
同 PdfDocProvider 通道，禁新增路径面 INV-07）→自建句柄毕 destroy。
触发=信息区可见（用户动作驱动，非后台自动任务）。LRU 归属=
paperInfoStore 同模块（容量 20 篇，淘汰仅完成态含 partial）。

合规清单四件（批 3a 受锁面）：
①eslint.config.js +1 白名单行，[locked-change]；②docs/invariants.md
INV-16 行四件→五件注记，[locked-change]（invariants 属受锁面）；③
locks 流程=两受锁件 unlock/apply；新件 PaperImageExtractor.ts=src 面
非受锁 glob（check-locks walk 只覆 scripts/*.mjs|*.ps1）零 generate；
④defense-lifecycle 登记表加「INV-16 白名单扩容事件」行（既有防线参数
变更非新防线，评审触发器沿用既设）。renderer/shared 零登记。

呈裁 B 已裁（2026-10-07 用户裁决）=**运行时提取**；附新事实：后续 AI
评估与建议模块将复用提取图片——本件定位=AI 前置基建（shared 中立件
天然可复用）；缓存表升级（查看永久秒出/持久化）=后续独立讨论事项。

### 4.9 D8 收起钮同款化

批 3d 首动作 grep e2e 选择器形态（侧板收起钮=data-testid
"lineage-sidebar-collapse" 已主控亲核——语义 class/testid 一律不动，
e2e 零触）。方案：抽公共视觉 class .collapse-btn（nav 款：transparent+
1px var(--line)+radius 6+padding 3px 7px+hover accent）nav/side 双挂；
旧视觉属性块 grep 零残留验证（方案切换=删除旧方案）+视觉证。

### 4.10 行数预算（分列）

| 文件 | 现状 | 搬移 | 新增 | 目标 |
| --- | --- | --- | --- | --- |
| LineageSidePanel.tsx | 249 | −80 | +35 | ≤205 |
| SideBadges.tsx（新） | — | +45 | +5 | ≤50 |
| SideCapRow.tsx（新） | — | +35 | +10 | ≤45 |
| TagsRow.tsx（新） | — | — | ≤40 | ≤40 |
| PaperInfoSection.tsx（新） | — | — | ≤160 | ≤160 |
| paperInfoStore.ts（新） | — | — | ≤110 | ≤110 |
| PaperImageExtractor.ts（新） | — | — | ≤150 | ≤150 |
| PaperDetailPanel.tsx（v1.1） | 220 | 搬移（标签节/键值行） | +信息区挂载 | 批 3c 拆件清单定 |
| PdfDocProvider.tsx | 在案 | — | ≤8 | 在案+8 |
| eslint.config.js | 在案 | — | +1 | 受锁流程 |
| EdgeOverlay.tsx | 221 | — | ≤15（P5 临时透出可逆） | ≤236 |

新增净量 ≈415 行上限；各件均处组件 250/文件 500 线内。

### 4.11 状态机专节（行为层规约——实施批单源）

**M1 detail 取数机**：态=idle/loading(pId,seq)/ready(pId)/error(pId)；
事件=SELECT/RESOLVE/REJECT/RETRY/UNMOUNT/INVALIDATE；接受判据=§4.3
activeSeq 绑定语义。

| # | 跨格序列 | 规约 | 断言 |
| --- | --- | --- | --- |
| S1 | loading(A,s1)→SELECT(B)→loading(B,s2)→RESOLVE(s1)→RESOLVE(s2) | s1≠activeSeq→弃 UI 写缓存；s2===activeSeq→ready(B) | 永不显 A 于 B 选中态 |
| S2 | error(A)→RETRY→loading(A,新 seq) | RETRY 仅 error 态接受；loading 态 RETRY=零效果幂等 | 单 in-flight |
| S3 | ready(A)→SELECT(B)→loading(B) | 展示即清 skeleton，禁陈旧跨卡 | 切换帧零 A 残留 |
| S4 | loading(A)→UNMOUNT→RESOLVE(s1) | 模块级 store 天然免疫；结果写缓存 | 零卸载后更新 |
| S5 | loading(A) 中同 pId 再触发 | 复用 in-flight promise | IPC 计数=1（mock 计数） |
| S6 | 任意态←INVALIDATE(pId) | 本批零派发挂 F-TAGS-02；loading 中到达→RESOLVE 写穿校验：落缓存即标失效，当前选中则滚动新 seq 重取 | 失效后零陈旧 HIT |
| S7 | loading(A,s1)→SELECT(B)→SELECT(A)〔复用 s1，activeSeq 回绑〕→RESOLVE(s1) | 回绑令牌接受 | A→B→A 终态必非 loading |
| S8 | SELECT(pId) 命中完成态缓存 | HIT 同步 ready 无闪烁 | 零 IPC 零 loading 帧 |
| S9 | ready(A)→SELECT(A) / error(A)→SELECT(A) | 幂等零迁移 / 维持 error（重试钮在） | 无迁移 |

CANCEL/TIMEOUT 不引入（window.api 单结算 IPC 无取消面——本批 scope 界；
超时恢复靠 RETRY）。

**M2 图片提取机**：态=idle/extracting(pId)/ready/partial(pId,k)/error。

| # | 序列 | 规约 | 断言 |
| --- | --- | --- | --- |
| I1 | 可见→extracting | 注册表命中复用 / miss 自建→毕 destroy（仅自建） | 零悬挂 |
| I2 | extracting(A)→SELECT(B) | 同 I7 分策 | 切换零泄漏 |
| I3 | 部分页失败 | partial：成功帧+失败徽注 | 失败不扩散 |
| I4 | 全失败 | error：strip 省略+重试微钮（I8） | 降级不挡主件 |
| I5 | LRU 超容 | 淘汰最旧完成态（含 partial），objectURL revoke（如用） | 淘汰仅完成态 |
| I6 | in-flight×LRU | 完成回调内同步判定键在册（单线程 event loop 无竞态窗口）；已逐→直接释放不入 cache | 零泄漏 |
| I7 | extracting 中 UNMOUNT | 自建句柄→destroy+缓存标 error(stale)；注册表句柄→续跑完成，stale 防护查证后写缓存 | 两策各行其断言 |
| I8 | error(A)→SELECT(A) / ready(A)→SELECT(A) | 维持省略+重试微钮（M2 独立 RETRY 与 M1 分立）/ 幂等 | 无迁移 |

M1×M2 解耦：宿主组件统一扇出 SELECT/UNMOUNT 至两机，M1 不代理 M2；
文本区=M1、strip=M2 各自独立渲染本机态。error 文案=UI「信息加载失败」
+console 细节；机构禁用位随 M1 态族承载（error 态随区失败行）。PDF
替换失效不载（假设 19：本地库文件 immutable）。摘要展开=collapsed⇄
expanded 本地态（M3，无跨格序列）。

### 4.12 验收判据（可机检优先）

e2e 断言渲染真实文本（作者子串/摘要前 N 字/标签名）；空态机检（无标签
→TagsRow 不存在；无摘要→块省略）；滚动承载机检（内容超高
scrollHeight>clientHeight 且 header 不滚）；两域同构机检（脉络与阅读器
同 paperId 渲染同文本）；S7 终态断言+S5 mock 计数+S8 零 IPC+I2/I7
悬挂断言；F-ANCHFIX-01 判据=§3.5。

## 5. 小票浅设计（搭车批）

**F-DRAGVIS-01**：正身三候选（显示条件过窄/样式不显著 faded 0.35 对比
度不足/几何陈旧复发）；实施批首动作=拖拽中无头截图+computed style 探针
取证定正身。修复方向：(a) 显示条件对齐拖相 session 激活态；(b) 显著化
（不透明度+accent 描边+对比度）；(c) 复合。硬约束：跨月拖拽禁引入
（在册用户裁决，INV-111 同月调位恒守）。判据：e2e 拖相中候选槽 DOM
存在+数量=预期插入位个数+computed opacity ≥0.5（修后阈值随修复案定）
+用户视检。

**F-SETSTYLE-01**：盘点设置页按钮形态清单→统一 .btn-std 普通圆角矩形
（搭 D8 公共钮系变量）→替换异形件，零逻辑行。判据：异形 class grep 零
残留+verify+用户视检+diff 范围=设置页样式面。

## 6. 实施分批（定稿）

| 批 | 内容 | 闸门 | 受锁面 | 验证面 |
| --- | --- | --- | --- | --- |
| 1a | F-ANCHFIX-01 探针 P1-P5（仓外件）+根因报告 | G1：主控终裁根因+呈裁 C/D 处置 | 无（探针仓外） | P 输出入档案区 |
| 1b | 修复+销项 e2e 常设化 | G1 已过 | tests 新 spec：unlock→新增→generate→apply→全量 verify+[locked-change] 尾注 | §3.5 全项+用户视检 |
| 1c | 显示层（呈裁 C 落定后） | 呈裁 C | 同上（若动 spec） | 视检 |
| 2 | F-DRAGVIS-01 | 无 | e2e 断言新增同上流程 | §5 判据+视检 |
| 3a | 拆件瘦身+paperInfoStore+PaperImageExtractor 骨架 | G2：eslint 白名单 [locked-change] 批准 | §4.8 合规四件 | verify |
| 3b | TagsRow+PaperInfoSection 脉络集成（文本件先行） | 无（B 已裁——G4 解） | 无（src 面） | verify+e2e 真实文本+视检 |
| 3c | 文献库详情面板重排（E 已裁——G3 解）：拆件+标签节上移+信息区挂载+滚动承载+按钮下移 | 无 | 无（按钮文本受锁断言面零改——核对） | 两面板同构断言+视检 |
| 3d | 收起钮（grep 前置）+F-SETSTYLE-01 搭车 | 无 | 无 | §4.9/§5 判据+视检 |
| 4（可选） | F-SETSTYLE-01 独立 | 无 | 无 | 同上 |

批序理由：批 1 独立（调查性质+销项义务+呈裁 C/D 回填依赖）；批 3a 必先
（宿主 249 不瘦身无增量空间）；批 2 与批 3 零耦合可互换。视检节点：每批
收口=verify 绿+用户实机视检（R3 轮模式沿承）。

## 7. 呈裁点清单（A-E）

**A. 机构位形态（主控已裁 (c)——终裁记录 2）**：禁用态呈现行
（「机构信息待数据库升级后开放」+title 提示）——星标 P-11 禁用呈现
先例同款；用户点名四件之一，纯省略违背可见预期。

**B. 文中图片提取形态（已裁 2026-10-07）**：运行时提取+句柄注册表+
LRU（零迁移）；AI 模块复用=在册新事实，缓存表升级后续独立讨论。

**C. 锚点显示层与走线锚一致性（已裁=等批 1a 探针结果再裁）**：(a) 维持
四边中点；(b) armed 态 12 锚小型化全显+占用槽高亮（主控默认倾向）；
(c)/(d) 已排除。批 1a 正身回填后呈报再裁。

**D. 契约变更触发（已裁=等批 1a 探针结果再裁）**：(i) 根因=选锚语义
本身需改；(ii) 3b 实锤且修复=预览/路由选锚同函数化（画线吸附手感
变化=「不再紧跟光标，但松手后线零跳动」）。批 1a 结果+分叉率数据呈报
后裁；[locked-change]+INV 登记流程不变。

**E. 论文信息区第二落位（已裁 2026-10-07=文献库详情面板）**：阅读器
右栏不显示（OutlineAside 零改动）；目标=library/PaperDetailPanel
（Zotero 式）：标签上移→论文元数据→各按钮+滚动承载（§4.5）。

## 8. 风险清单

| # | 风险 | 缓解 |
| --- | --- | --- |
| R1 | 3b 实锤修复触 useDrawLine+routeAll 两面 | 画线全 e2e 回归+呈裁 D+P5 常设化 |
| R2 | 收起钮选择器形态（已主控亲核=testid，e2e 零触） | 批 3d grep 复核+双方案退路 |
| R3 | 大 PDF 双载内存 | 句柄注册表复用+destroy 仅自建+I2/I7 断言 |
| R4 | 白名单+1 安全面 | 中立路径+头注禁全量 re-export+defense-lifecycle 事件行 |
| R5 | 切卡取数乱序/悬挂 | S1-S9/I1-I8 断言入 e2e+单测 |
| R6 | F-ROUTE-02 槽位族回归 | 批 1b 全量 verify+相关 spec 复跑 |
| R7 | reader 注销×在飞提取竞态 | stale handle 防护+I7 断言 |
| R8 | LineagePage 误触 249 | D2 结构性绕开+diff 范围闸自查 |

## 9. 应登记不变量（实施批登记面）

| INV | 内容 | 强制方式 |
| --- | --- | --- |
| INV-A（新） | 锚级一致（§3.3 两族口径） | 机检：P1 常设 e2e（纯 DOM 通道）+防御单测（[locked-change]） |
| INV-B（新） | 信息区只读 | 类型面机检：props 零函数字段；评审点：禁 input/textarea/contentEditable |
| INV-C（新） | 信息区零域分支 | 机检：组件文件 grep 'lineage\|reader' 负锚+import 仅 shared/相对；破约拆壳 |
| INV-D（新） | 标签行全局域（F-TAGS-02 前） | 类型面：TagsRow 无 domain props；评审点：改点=store 单处 |
| INV-E（新） | pdfDoc 句柄生命周期：注册表句柄归 PdfDocProvider，提取件仅可销毁自建句柄 | 评审点+两文件头注明文；机检：PaperImageExtractor destroy 调用点仅自建分支 |
| INV-16 注记（既有行修订） | 白名单四件→五件（+PaperImageExtractor.ts） | [locked-change] 同步 invariants.md；eslint 机检沿承 |
| 引用在案 | INV-111（跨月拖禁）、pdfjs worker 单资产、INV-07、F-ROUTE-02 锚端不变性（机检化并入 INV-A） | — |

## 10. 假设与不足登记（实施批核验项）

**任务书不足**：U-1 预览锚完整判定链（P5 取证）；U-4 视检图证本体未随
包（P1/P2 区分偏移语义）。

**假设**：13=PdfDocProvider 字节通道可复用（fileUrl=app-file:// 亲核
佐证）；14=收起钮 e2e testid（已亲核证实）；15=e2e 鼠标画线基建；
16=fixture 播种基建；17=六态现有 spec 覆盖面；18=zustand 在栈
（useLineageViewStore 佐证，置信高）；19=本地库 PDF immutable；
V-1=stripCollinear 首末保留语义（低概率待证）。

**已消解核销**：schema 字段（detail 全字段在）/zoom 机制（inline
scale 单源）/STUB 域（内容 px）/reader→lineage 方向（对称执法）/
updatedAt 失效键（改事件驱动）/U-2 manual-override 端点（无桩族）/
U-3 落位依赖（shared 中立）。

---

> 沿革：v0.9（初稿）→审核 B2/W12/N10→v0.95（回炉 1）→增量审
> B1/W9/N7→v1.0（回炉 2 终稿）→主控终裁定稿→**v1.1（用户四项裁决
> 回填：B=运行时提取+AI 前置声明；E=文献库详情面板需求修正——props
> 化修订；C/D=挂批 1a 探针结果）→v1.2（批 1a 探针终裁：3b 实锤
> 83%/32-66px+候选 2/1a/1b/1c 证伪；C/D 二轮裁决=统一路由规则+12 锚
> 全显——批 1b/1c 解闸；1b 实施修正三项随裁入档）**。三段通道完链+
> 用户裁决闭环。
