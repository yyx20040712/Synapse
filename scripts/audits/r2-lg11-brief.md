# R2-LG11 票面——脉络重制浅色严谨板（F2 修正役·零 schema 先行单元）

> 工单：R2-LG11 / area: lineage / owner: strong / 模式：三屋（ADR-0017）
> 裁决母本：`docs/prompts/2026-08-29_loop-handoff-v3.md` §2 五决+§3 U2a
> 案册（已转历史档）：`docs/design/2026-08-29_lineage-reroute-options.md`
> 主控：2026-08-29 LOOP 会话（交接 v3 连续开工）

## 0. 开工记录（AGENTS 会话开工纪律——技能清点+配置自查）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| subagent-driven-development | 用 | 三屋模式派发实现者/门一/门二 |
| test-driven-development | 用 | 实现者单元纪律（首红→绿→变异红证，本票 §8） |
| verification-before-completion | 用 | 收口亲验 verify 真退出码+locks+diff |
| systematic-debugging | 备用 | 真机复评若红→取证压缩路径 |
| code-review-excellence | 用 | 门一对抗深审参照 |
| frontend-design / frontend-ui-engineering | 不用 | 视觉规格已由用户裁决+A 案逐值定死，无设计探索面；引外部方法论=票面外变量 |
| browser-testing-with-devtools / webapp-testing | 不用 | e2e 沿用既有 playwright `_electron` 通道 |
| 其余运维/云/数据栈/安全渗透系 | 不用 | 与 Electron+TS 桌面单无关联面 |

配置自查：主控=GLM-5.3（宿主级配置）；实现者/门一/门二子代理简报①段必须自报
模型+思考等级，未申报或等级不明=产出无效重派（AGENTS 同源事故条款）。
基线锚（2026-08-29 HEAD=12f1a6f 亲验）：verify 全链绿（build=末环到达且成功）；
104 文件 858 用例 / locks 161 / open 0 / e2e 25 passed（交接书 §1.3 口径）。
环境铁律：`export PATH="/d/nodejs24:$PATH"`；视觉取证=无阈值像素差分+DOM 转储
（多模态通道缺失环境配方，f1-forensics5.mjs 系列）。

## 1. 行为层（验收面——用户裁决逐条落点）

### 1.1 视觉规格（浅色严谨板——决1/决5+U2a 既裁项）

**用户反馈逐句转译表（methodology §4.1⑤c——L6 制度面）**：

| 用户原文/裁决 | 设计动作 |
| --- | --- |
| 决1「A 线型×色阶：类型=实线(文献)/虚线(主题)；重要度=深青蓝 1.5px(核心)/浅灰蓝 1px(普通)；白卡无填充；选中=边框再加粗」 | 节点边框编码矩阵（§1.1.2）；卡面白底无渐变无填充纹理；选中=strokeWidth+0.75 |
| 决2「同时考虑被引用数，且仅限于开宗立派的研究性论文；综述不得入核心档」 | `isCore`=研究性论文（排除综述/主题）且**出度**≥2（§2.1）——**口径修正 2026-08-29 真机复评**：「被引≥2 的开宗立派」=≥2 个继承者=出度；初版「入度≥2」在 INV-27 树单父约束下数学恒假（合法图入度≤1，isCore 永不触发——取证器 fixture 造双入边被 service 多父守卫拒，r2-lg11-forensics 实录=单测全绿≠真实数据形态可达） |
| 决3「综述应该排列于脉络最右侧，用很淡的灰色虚线连接涉及的重要的文章」 | `isSurvey` 识别+布局右列（§2.2）+综述关联边淡灰虚线（§1.1.3） |
| 决5「衬线字体保留定义、消费位清零」 | 脉络年份/层带标全回 UI 字体（去 var(--font-display) 消费；token 定义留 theme.css） |
| 交接书 U2a「题名换行=SVG foreignObject 内 HTML div（零依赖）+卡高自适应（≤3 行+省略+tooltip 全文）」 | LineageNodeCard:78 单行 text 缺陷根修（§1.1.2） |
| 交接书 U2a「浅色严谨板（白卡+细边框+去渐变/角饰/外光；圆角 8px）；夜幕系从脉络域摘除消费」 | §1.1.1 宿主/卡面/装饰/工具条浅色化；夜幕 token 定义保留 |

### 1.1.1 宿主与装饰（夜幕摘除）

- 宿主 div 类 `.lineage-night` → **改名 `.lineage-host`**（夜名浅底=语义错位；方案
  切换=删旧，宪法代码组织条）：`background: var(--bg)`，夜幕四层 radial+星空
  +✦ **全删**（LineageNightDecor.tsx 整件删除——「装饰层 ≥3」旧断言随受锁改写）。
- 图例保留但改写：新组件 `LineageLegend.tsx`（浅色白卡圆角、非交互、
  `data-legend`+aria-hidden+pointer-events:none 纪律沿用），四项：
  ①深青蓝实线粗=核心文献 ②浅灰蓝实线=普通文献 ③浅灰蓝虚线=主题分组
  ④淡灰虚线=综述关联。
- 工具条/适应视图按钮：`.lineage-toolbar`/`.lineage-fit-btn` 夜色玻璃→白玻璃
  （`rgba(255,255,255,0.88)`+1px `var(--border)`+`var(--shadow-2)`；文字
  `var(--text-dim)`/hover `var(--text)`+`var(--accent-soft)`；blur 保留）。
- 侧板三件（LineageSidePanel/SideAiNotes/SideManualNote 内联皮肤）同步浅色：
  面板底 `rgba(255,255,255,0.92)`+边 `#e4ded1`+`blur(12px)` 保留；h4 左缘条
  `var(--gold-night)`→`var(--accent)`；AI 条目卡 `#ffffff`+边
  `rgba(151,160,187,0.28)` 沿用淡描边。**QUESTION_COLOR 分色单源零改**。
- theme.css 夜幕 token（--night-bg 等 11 枚 `:root` 声明）**保留定义**（决5 同
  精神——备暗色主题）；脉络样式块内消费清零即可。theme.test.ts 零碰（token
  声明锁继续绿）。

### 1.1.2 节点卡（白卡+边框编码 A+foreignObject 换行）

- rect：`rx=8`、`fill="#ffffff"`（白卡无填充）、无 filter。
- **边框编码矩阵**（决1——测试逐格断言）：

| 节点类 | 判定 | stroke | strokeWidth | strokeDasharray |
| --- | --- | --- | --- | --- |
| 文献·核心 | isCore | `var(--accent)`（#2c5f8a） | 1.5 | 无（实线） |
| 文献·普通 | 其余 paperId≠null | `var(--node-branch)`（#b8c4d4 新 token） | 1 | 无（实线） |
| 主题 | paperId===null | `var(--node-branch)` | 1 | `6 4` |
| 综述 | isSurvey（paperId≠null） | `var(--node-branch)` | 1 | `6 4` |

  - 选中态（任一类）：strokeWidth +0.75（核心 2.25/其余 1.75）+data-selected。
  - `data-kind` 扩第四值 `survey`（既有 theme/paper 值零变——e2e T2/T4 断言面）。
- **题名换行**：`<foreignObject>` 内 HTML div（零依赖红线：禁引任何换行库）；
  题名 `font-size:12.5px; color:var(--text); line-height:18px; display:-webkit-box;
  -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden`；全文
  tooltip=卡内 `<title>{title}</title>`（SVG 原生，零依赖）。
- 年份行：`font-size:12px; color:var(--text-dim)`，**UI 字体**（去
  var(--font-display)+letterSpacing——决5 连带摘除脉络衬线年份）；
  year null 仍渲染「未知年份」。
- L 形金角饰 path、lg-node-face 族渐变、lg-edge-glow 滤器、选中外光：**全删**。
- 卡内几何（foreignObject 骨架）：`x=-w/2+12`、`width=w-24`、`y=-h/2`、
  `height=h`；内 div flex column：题名区（自顶 padding 10px，flex:1）+
  年份行（卡底 padding 12px，text-align:center）。

### 1.1.3 边与层带

- 边样式判定优先级（LineageEdges）：**综述关联（任一端 isSurvey）> 推断
  （label 含「推断」）> 普通**：

| 边型 | 判定 | stroke | strokeWidth | dash |
| --- | --- | --- | --- | --- |
| 普通 tree 边 | 缺省 | `var(--node-branch)` | 1.2 | 无 |
| 推断边 | label 含「推断」 | `#8a94a6` | 1.2 | `5 4` |
| 综述关联边 | from 或 to ∈ surveyIds | `var(--survey-edge)`（#c8cdd6 新 token） | 1.4 | `2 3` |

  - glow filter 全撤；边 label 保留真实文本渲染，halo 胶囊改白底：
    `stroke="#ffffff"`（原夜色 var(--night-bg2)）+文字 `color:#4a5060` 级
    （fill `#4a5060`），paintOrder=stroke 形态保留。
- 层带：横线 `stroke="var(--border)"` 1px 实线（dasharray null 断言保持）；
  菱形刻度 `fill="var(--node-branch)"`；年份标=UI 字体 13px
  `fill="var(--text-dim)"`（去衬线/去金）；**「YYYY 年」/「未知年份」文案
  逐字保留**（e2e getByText 断言面）。

## 2. 接口层（纯函数——新增/扩展）

### 2.1 新文件 `lineage-classify.ts`（渲染+布局双消费，纯函数禁 DOM）

```ts
export function isSurvey(title: string): boolean
// 关键词启发（v1 已裁）：综述|survey|review|概述|评述 子串匹配，
// 大小写不敏感；误判人工修正通道=后续 D2 式字段增强票（不在本单）

export function isCore(node: LineageNode, edges: LineageEdge[]): boolean
// 决2 D1'：node.paperId !== null && !isSurvey(node.title)
//   && 出度（edges 中 fromNode===node.id 计数）>= 2（2026-08-29 真机复评修正：入度版树单父下恒假——「被引≥2」=≥2 继承者=出度）
// 出度不计入（被引为主——用户裁决原文口径）
```

### 2.2 `lineage-layout.ts` 扩展

- **`nodeHeight(title): number`（新增单源，INV-38）**：
  `lines = clamp(ceil(title.length × 12.5 / (nodeWidth(title) − 24)), 1, 3)`；
  `nodeHeight = 46 + 18 × lines` → **1 行 64 / 2 行 82 / 3 行 100**。
  全角 12.5px 计宽：短档(180)恰 12 字/行=1 行、中档(220) 15 字/行、长档(260)
  18 字/行——与 nodeWidth 档界自然咬合；拉丁字符按全角计=行数高估方向安全
  （卡略偏高，不溢出）。已知局限票面声明，不修。
  - NODE_H 常量删除（消费面三改：LineageNodeCard rect 高/LineageEdges 端点
    ±h/2/lineage-viewport fitViewport 包围盒——层带年份标 y 偏移改固定常量 LAYER_LABEL_DY=32（层带级元素不随卡高）
    ——全改引 nodeHeight(title)，**INV-36 宽度姊妹条**）。
- **综述右列**：`layoutLineage` 内——isSurvey 节点（**x/y 均非 null 的覆盖综述
  除外——覆盖优先语义不变**）不进 children/parentOf 树（其子提升为根照常
  布局、其父边断开不剔除——渲染层照常画）；树布局完成后综述列：
  `列左缘 = max(非综述自动节点+覆盖节点 右缘) + SURVEY_COL_GAP(=80 新常量)`；
  综述中心 x=列左缘+自身 nodeWidth/2；y=其 year 层带 y；**同层多综述**按
  nodes 输入序右移错开（相邻中心距 ≥ 半宽和 + SIBLING_GAP）。
  综述节点仍计入层带（year 归属不变——覆盖节点同先例）。
- **B1 顺手（遗留池清账）**：`BAND_LEFT = -200` 从 lineage-viewport.ts 私有
  搬至本文件导出；消费三处=viewport fitViewport 包围盒左界/Canvas 层带线
  x1/年份标 x（=BAND_LEFT+10 派生）。层带线 x2=99999 顺带 `BAND_RIGHT`
  导出单源。

### 2.3 `LineageEdges.tsx` 签名扩展

props 增 `surveyIds: Set<string>`（LineageCanvas 从 nodes 预计算传入）；
边样式按 §1.1.3 矩阵+优先级；端点 y1/y2 改 `nodeHeight(title)/2`（需按
fromNode/toNode 查题名——nodes 或 titleOf map 传入，形状实现定但**禁每边
O(n) 重扫全表**：传 `Map<id, {x,y,half}>` 或等价）。

### 2.4 LineageNodeCard props

增 `core: boolean`（isCore 预计算——卡内不自算）；`survey: boolean`。
（data-kind="survey" 判定=isSurvey(title)。）

## 3. 架构层

- 分层不破：classify/layout 纯函数禁 DOM/window；渲染件禁引 main 侧；
  零新依赖（foreignObject=SVG 原生、line-clamp=CSS 原生——**Electron 42
  Chromium 支持 -webkit-line-clamp 无前缀问题，实测既有 -webkit-box 组合**）。
- 组件行数：NodeCard 重制后预估 ≤160、Canvas ≤190、Edges ≤95——全部
  ≤250 组件红线；layout.ts ≤500 文件红线（现 309+约 60=369）。
- shared/models/lineage.ts **零触碰**（零 schema 单元——U2b 才动数据面）。
- theme.css：脉络样式块重写（.lineage-host/.lineage-legend 族/.lineage-toolbar/
  .lineage-fit-btn）；:root 增 2 token（--node-branch/--survey-edge）+夜幕
  token 11 枚保留。theme.test.ts 不加新 token 断言（锁面最小化——canvas.test
  以 var() 字面断言防漂移）。

## 4. 生命周期层

- 不做（票外）：多参考边数据面（U2b）、isSurvey 字段化+人工修正（D2 票）、
  暗色主题、碰撞避让、缩放参数化、--gold-night 别名去留全局清点（U3 连带）。
- 兼容声明：手工覆盖位（x/y）语义零变；拖拽/选中/右键菜单交互链零变；
  pan/zoom/auto-fit 状态机零变（INV-36 抢占门/复位口/transform 串格式
  逐字符保持）。

## 5. 文化层

- 错误面零新增（无新异步/用户写路径——渲染层纯静态重制）。
- **延迟预算（⑤d/L7）**：本单无新交互路径；边框/换行=纯 SVG/CSS 静态渲染
  脱离 JS 反馈链路（结构性最优形态）。既有 pan/zoom/drag 性能面由既有
  测试守卫，不新增计时锚。
- 测试纪律：新测试 always-active；首红/变异原始输出各自落盘成日志；
  `npm run test` 禁裸 npx vitest；多断言禁与行尾注释同置。

## 6. 受锁必然红清单（[locked-change]——第三次改写先例 F-08）

| 文件 | 改写内容 |
| --- | --- |
| `tests/unit/renderer/lineage-canvas.test.tsx` | R2-LG9 describe 5 it 整块改写为「U2a 浅色严谨板」组：①浅色宿主（.lineage-host 在场+.lineage-night/装饰层不存在的防回归）②白卡边框编码四态（核心/普通/主题/综述 stroke+width+dash 逐格；选中 +0.75）③渐变 defs/角饰/glow 不存在（0 计数防回归）④foreignObject 换行（长题名 div 在场+line-clamp 样式字面）⑤层带浅色（dasharray null+「YYYY 年」保留）⑥边三型色（普通/推断/综述）⑦图例四项真实文本。**R2-LG10 auto-fit 3 it 手算数字不变**（chain 夹具题名全 1 行→nodeHeight=64=旧 NODE_H——fitViewport 改引 nodeHeight 后数值恒等，实现者须给出恒等推算说明）。分档宽 it 零碰 |
| `tests/unit/renderer/lineage-layout.test.ts` | 新增两 describe：综述右列（抽出断链子树成根/右列位置公式/同层多综述错开/覆盖综述不进列）+nodeHeight 三档边界（1/2/3 行题名长度边界 64/82/100）。旧断言零碰 |
| `tests/unit/renderer/lineage-side-panel.test.tsx` | :311「侧板夜化」it 改写为浅色断言（白玻璃底/边/h4 accent 左缘条/条目卡白底淡边）；QUESTION_COLOR 零改锚保留 |
| 新 `tests/unit/renderer/lineage-classify.test.ts` | isSurvey（五关键词/大小写/非综述阴性）+isCore（综述排除/主题排除/出度 1 vs 2 边界/入度不计（树约束现实性注释））≥8 it，随实现 locks:generate 入锁 |
| `tests/e2e/lineage.spec.ts` | **主控预裁：预期零改**（T1~T4 断言面=transform 串/edge 计数/文本可见/data-kind 值——新视觉下全保持）。若实现中实证必然红：停手 BLOCKED 申报，禁自行改 e2e |

## 7. 交付文件清单

改：`LineageNodeCard.tsx`（整件重制）、`LineageEdges.tsx`、`LineageCanvas.tsx`、
`lineage-layout.ts`、`lineage-viewport.ts`（BAND_LEFT 迁出+nodeHeight 引）、
`LineageBoard.tsx`（预期注释面可能零改+pending-link 提示条浅色化，行为零变）、侧板三件（内联皮肤值）、
`src/renderer/shared/theme.css`（脉络样式块+2 token）。
增：`lineage-classify.ts`、`LineageLegend.tsx`、`tests/unit/renderer/lineage-classify.test.ts`。
删：`LineageNightDecor.tsx`（整件）。
登记：`docs/invariants.md` INV-38（卡高单源 nodeHeight 三消费——B1/BAND_LEFT
单源化同条补记）；不受锁但随单提交。

## 8. 实现纪律与 DoD（实现者契约）

1. TDD：受锁改写 it 先红（旧代码上新断言）→实现绿→**断言级变异红证**≥3 处
   （边框色值互换/nodeHeight 档值+1/综述列 GAP 消除各一），首红与每次变异
   原始输出各自落盘 `scripts/audits/r2-lg11-*.log`。
2. `npm run verify` 真退出码落盘（echo exit=$? >> 日志）；目标=858+
   新增 it−删除 5 旧 it±1（预测 **≈875（858−5 旧 it+canvas 7 新+layout 7 新+classify 8 新）±2**，实际数申报）。
3. locks：unlock→批内改写→`locks:generate`（新 classify.test）→apply；
   manifest 数 161→162 申报。
4. 禁 git/禁翻 registry/新依赖；卡点 BLOCKED 停手。
5. 报告全文落 `scripts/audits/r2-lg11-impl.report.md`（六段：摘要/文件清单/
   红证/测试证据/locks 实录/自裁申报含删减面 diff 自查）；回复五行内。

## 9. 真机复评放行线（主控收口段执行）

配方=无阈值像素差分+DOM 转储（f1-forensics5 系列改写：基线态=HEAD 构建、
复评态=新构建，同种子库同视口；差分区色值/面积量化）。放行三线（交接书
§3 原文）：**换行在框内+边框编码可辨+整图不回退**；工具条/适应视图浅色
正常（F-05 面无涉）。L6 复盘位=复评截图留档 scripts/audits/ 供用户真机复核。
