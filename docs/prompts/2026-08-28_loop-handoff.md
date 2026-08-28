# 2026-08-28 LOOP 交接文档——验收反馈六项修复与后续开发

> 定位:上一会话(交接书 v3,`docs/prompts/2026-08-28_next-session-handoff.md`)完成
> P7-F 全役四票 + ENR 组 + 六雷清扫 + M1 收档并全量推送(c26bc92),随后用户完成
> 三包真机验收并反馈六项问题。本会话(验收分析会话)已对六项**逐项完成代码级
> 取证与根因定性**(只读,零代码改动),本文档=修复规划书 + 下一会话开工书。
> 新会话从 §1 开工自检开始,按 §3 顺序执行修复单元。
> 纪律总纲:**不引入新 bug = 全部走三屋模式**(实现者 TDD 四档 + 门一/门二),
> 每单元独立提交;本会话分析结论是假设的高置信形态,票面化时实现者仍须自证。

## 1. 开工自检(新会话第一动作)

1. **技能清点**(宪法硬规则):systematic-debugging / test-driven-development /
   verification-before-completion / subagent-driven-development 按单元加载;
   纯文档环节标「不用+理由」。配置自查随清点(模型/思考等级)。
2. **环境铁律**:本机默认 node v25.2.1 是假红源(ABI 141 缺 + webstorage 污染
   jsdom)——一切 node/npm 命令必须前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`(Node 24.9.0)。
   dev 应用上一会话末已退出,重启 `npm run dev` 即可。
3. **基线**(开工自检锚):HEAD=本文档提交;`npm run verify` 应为 **93 文件
   723 用例 / locks 142 / 工单 110 open 0**;e2e(build 后 `npm run test:e2e`)
   = **22 passed + 0 skip**。任何偏差先对账再开工。
4. **工作区残留**:`dev-launch.cmd`、`dist_new/` 两项未跟踪(环境残留,非仓库
   内容)——处置:确认无用后删除,或加 `.gitignore`;**勿入库**。

## 2. 验收反馈台账(六项已取证定性)

| 编号 | 现象(用户图) | 定性 | 根因置信 | 阻断 |
| --- | --- | --- | --- | --- |
| A | 阅读器标签页被遮挡看不见(图一) | P7-F 回归·机制级 | 高(scrollIntoView 祖先传播) | 是(卡住包1④⑤) |
| B | PDF 页间无分隔间隙(图二) | 视觉缺陷 | 高(gap 存在但无边界强化) | 否 |
| C | 划选区域部分加重(图三) | 视觉缺陷 | 高(原生 selection 半透明叠绘) | 否 |
| D | 被引数未显示(图四) | UI 透出面缺位 | **确定**(renderer 零引用) | 否 |
| E1 | 脉络图渲染不对(图五) | 布局算法退化 + 预留面未做 | **确定**(代码推演闭合) | 否 |
| E2 | 跳转后左侧面板未切笔记(图六) | 联动缺失 | **确定**(信号未接线) | 否 |
| F | AI 笔记要「问题N+一审/二审/裁决」分段 | 呈现轴转置增强 | 确定(role 轴↔question 轴) | 否 |

已同步完成的验收核查(本会话,无需重做):

- **ENR 真机抽查通过**:用户导出
  `C:\Users\Administrator\Desktop\Henry_Darcy_and_the_making_of_a_law.md`
  front-matter 实测 `citedByCount: 124`(d2c1bee5 Brown 2002)——**ENR-01 数据链
  + ENR-02 front-matter 装配链真机验证通过**。`venueTier` 省略=venue
  'Water Resources Research' 未命中种子表 5 条,合规(种子表扩充走受锁常量
  修订制,遗留池)。`citedByFetchedAt` 不在 front-matter 属规约设计(仅 manifest 装配)。
- **manifest 两字段成对真机抽查**:待办(低优先——单测已锚定;用户下次导出完整
  目录时顺带抽查,见 §5)。
- 包1 的 ④(进度恢复)⑤(标注兼容)因 A 无法测试——A 修复后补测(§3 步骤 4)。

### 2A. 标签页被遮挡(图一)——P7-F 回归,阻断级

- **取证**:高度链静态健全(theme.css `html,body,#root height:100%` → App
  `main.min-w-0.flex-1.overflow-auto` → ReaderPage `div.flex.h-full.flex-col`
  → TabBar `flex h-8 shrink-0`);e2e 视口下 TabBar 一直可点。
- **根因(高)**:App.tsx:109 `main.overflow-auto` 是滚动区之上的可滚祖先;
  PageColumn.tsx:167 与 anchor-locate.ts:231 的 `scrollIntoView` 会滚**所有**
  可滚祖先——一旦 main 存在溢出/已滚状态,程序滚页或脉络跳转就把整个
  ReaderPage 连同 TabBar 顶出视口,且无自愈路径。辅因(中):ReaderToolbar.tsx:66
  根缺 `shrink-0` 且 `flex-wrap`,窄窗口折行增高 + `pageBoxHeight` floor 与
  pdfjs 取整的 1px 级溢出可激活主因。
- **修法草案**:①ReaderPage.tsx:227 根加 `overflow-hidden`(切断向 main 泄漏);
  ②两处 `scrollIntoView` 改为对滚动容器的手写 scrollTop 数学(单容器语义,
  PageColumn 已有 geometry 纯函数可复用);③ReaderToolbar 根补 `shrink-0`。
- **受锁面**:`tests/e2e/reader-scroll.spec.ts`、`tests/unit/renderer/page-column.test.tsx`
  (程序滚动实现变更时断言同步,[locked-change])。
- **e2e 未拦原因 → 断言设计**:既有 e2e 视口宽裕不触发溢出;新用例应构造窄视口
  或预滚 main 后断言 TabBar 仍可见(`getByRole` 可命中)。
- **验收判据**:任何滚页/跳转/缩放操作后 TabBar 恒可见;重启应用打开多标签复测。

### 2B. 页间无分隔间隙(图二)——视觉缺陷

- **取证**:gap-3(12px)在 DOM 真实存在(PageColumn.tsx:212 + geometry
  PAGE_GAP_PX=12 单源对齐);但页盒与 canvas 无任何背景/边框/阴影,分隔全靠
  `#f7f8fa`(阅读区)vs `#ffffff`(页)的色彩差——视觉不可感知。
- **修法草案**:页占位盒(PageColumn.tsx:218-232)加 `background: var(--panel)` +
  `box-shadow`(或 outline 1px var(--border))——顺带消掉未渲染占位盒与渲染后
  的色差跳动。可选 gap-3→gap-4,但必须同改 `page-column-geometry.ts:36`
  PAGE_GAP_PX(注释明言勿单改,否则 INV-33 缩放锚比值算错)。
- **受锁面**:纯样式零锁;改 GAP 常量则 page-column.test 断言同步([locked-change])。

### 2C. 划选区域重叠加深(图三)——视觉缺陷

- **取证**:SelectionLayer **不绘制任何选区高亮**(只做锚定与工具条定位);划选
  视觉=原生 `::selection`(text-layer.css:52-60,25% 半透明蓝)在 pdfjs 文本层
  **重叠 span** 上逐元素叠绘——重叠区两层 25% 叠加即「加深」。
- **修法两案(渐进,先小后大)**:
  - 方案一(最小):`::selection` 背景改不透明近似色(如
    `color-mix(in srgb, AccentColor 25%, white)`),不透明色叠加不变深。
    注意 text-layer.css 头注声明「官方 CSS 逐字提取」——改动须头注登记偏离。
  - 方案二(对齐标注层,改动面大):SelectionLayer 自绘选区矩形
    (`mix-blend-mode: multiply` + 行级矩形合并,与 AnnotationLayer.tsx:198 /
    annotation-anchor.ts:373 同构),同时压掉原生 selection 背景。
- **建议**:先方案一验收;用户不满意再升方案二(方案二触碰
  `selection-layer.test.tsx` / `reader-text.spec.ts` 受锁面)。

### 2D. 被引数未显示(图四)——UI 透出面缺位(确定)

- **取证**:数据链全通(迁移 005 → papers.repo detailById 装配 → schema optional
  → enrich 成功后 setReloadKey 重拉);唯独 `citedByCount` 在 `src/renderer`
  **零引用**——PaperDetailPanel.tsx:179-188 键值行区没有被引行。非 bug,是
  ENR-01/02 票面范围未含 UI 透出(其生命周期层明言不做 FTS/排序消费面,UI 行漏列)。
- **修法草案**:PaperDetailPanel.tsx:185 附近加
  `被引:{detail.citedByCount ?? '—'}` 行;可选拼 citedByFetchedAt 相对时间
  与 `SOURCE_LABEL[detail.citedByCountSource]`(SOURCE_LABEL 已在 :42-48)。
  **不动** `src/shared/models/paper.ts`(锁内且字段已够)。
- **受锁面**:预期零锁(`paper-detail-export.test.tsx` mock 链核对即可)。

### 2E1. 脉络图渲染不对(图五)——布局算法退化 + 预留面

- **现象**:四节点(Reynolds 1883 / Cross 1936 / Brown 2002 / 水锤史 2007)被
  渲染成**单列垂直线**,分支结构完全不可见,右侧大片空白;边上无任何标注。
- **根因(实锤,代码推演闭合)**:草稿树拓扑=Brown(根,2002)→Reynolds(子,
  1883)→Cross(1936)+水锤史(2007)孙;四节点年份层**互不共享**。而
  lineage-layout.ts:198-207 的兄弟约束=「仅在共享年份层上拉开」(轮廓紧凑性
  设计)——年份-拓扑错位的树(子比父早 119 年)兄弟 offset 恒 0,**全树退化
  为单列**。这是「y=年份分层 + x=树形展开」两正交轴在非单调年份树上的算法缺陷。
- **修法草案**:place() 兄弟约束增补「**直接兄弟节点对不论层必横向错开**」
  (子树根节点占位参与 offset 下限计算),深层不共享层仍可交错(紧凑性保留)。
  受锁:`tests/unit/renderer/lineage-layout.test.ts`([locked-change],新增
  年份-拓扑错位夹具断言兄弟 x 错开)。
- **次要子项**:
  ①**边 label 未渲染**——草稿三条边带详实 label(实链/谱系推断/平行推断),
  LineageBoard.tsx:60 头注明言「边 label 富化=预留」。本单元一并实现(边渲染
  LineageCanvas.tsx:183-201 加 text;先查 `src/shared/models/lineage.ts`(锁内)
  LineageEdge 是否已有 label 字段——有则渲染面零锁,无则规划最小契约扩展)。
  ②**初始视口无 auto-fit**(LineageCanvas.tsx:50 硬编码 {0,0,1};年份标签
  x=-190 有出画风险)——实测图五标签可见,降级为观察项,单元内顺带核。
  ③**草稿 title 质量**(两篇为文件名形态 `Reynolds_1883` /
  `2007-johannes-von-kries-...`)——**数据面问题非代码**:M1 草稿
  (桌面 lineage-draft-m1.json)title 用规范题名重写后重新导入即可,主控直接
  做,不占工单。

### 2E2. 跳转后左侧面板未切笔记(图六)——联动缺失(确定)

- **取证**:跳转链完整且定位成功(PDF 高亮闪烁);但阅读器左侧面板 tab 是
  OutlineAside.tsx:58 组件本地态(默认 'outline'),AI-09 建的
  `notifyAiNoteHighlight → setTab('notes')` 信号(reader.store.ts:377-380)
  现唯一生产者=页内 AI 标注块点击——脉络双击路径(openFromBus→locateAnchor)
  没接它。
- **修法草案**:open-paper-anchor.ts:19-21 在 `req.aiNoteId !== undefined` 时
  先 `useReaderStore.getState().notifyAiNoteHighlight(req.aiNoteId)` 再
  locateAnchor——复用 AI-09 全套语义(切 tab + 列表滚动高亮),一处改动。
- **受锁面**:预期零锁(`outline-aside.test.tsx` 核对即可;新增用例入锁)。

### 2F. AI 笔记格式增强——呈现轴转置

- **用户口径**:「问题一 + 问题内容:一审:xxx。二审:xxx。裁决:xxx。」
- **取证**:现渲染=**role 优先**分组(AiNoteGroupList.tsx:18-22 groupNotes:
  一读/二读/裁决三组,组内平铺 question 条目);用户要 **question 优先**分组、
  组内按 role 分段——正好转置。ROLE_LABEL 现为「一读/二读/裁决」
  (ai-note-style.ts:40-47 单源),用户口径「一审/二审」。数据模型零改
  (AiNote.question 天然分组键 / role 组内段键;`src/shared/models/ai-note.ts`
  锁内**不动**——枚举不变)。
- **修法草案**:①groupNotes 按 `AI_NOTE_QUESTIONS` 序分组,组头=QUESTION_LABEL+
  QUESTION_COLOR 色条(两映射已在 ai-note-style.ts:16-37);②组内条目头加
  ROLE_LABEL 小标签,ROLE_LABEL 改「一审/二审/裁决」(单源改一处,reader 面板
  +脉络侧板+标注层 tooltip 三消费方同步生效);③脉络侧板
  LineageSideAiNotes.tsx:79-107 自写的 role 分组(Rule of Three 第 2 次重复)
  同步改格式,保持两处一致(第 3 次出现时再抽公共件)。
- **受锁面**:`tests/unit/renderer/ai-note-style.test.ts`、`ai-notes-section.test.tsx`、
  `tests/e2e/ai-notes-section.spec.ts` **必然触碰**(断言分组结构与标签文案,
  [locked-change])。

## 3. 执行顺序与单元划分

原则:A 先行(阻断验收);受锁面大的单元排后;每单元三屋全流程(TDD 四档+
双门)独立提交;工单化时 b3 指针按域查 `docs/ROADMAP.md` 已裁决候选集
(A/B/C→P7-F 域;D→ENR 所在域;E1/E2→脉络域;F→AI 笔记域——具体 P7-X 以
ROADMAP `### P7-X:` 标题行实查为准,勿臆造)。

1. **U1 = 缺陷 A**(SR2-F-0N,机制修复+受锁面大,单独一票)。
2. **U2 = 缺陷 B + C**(视觉层小票;C 先方案一,CSS 级)。
3. **U3 = 缺陷 D + E2**(两处一行级接线,可各开小票或合一票「验收快修」——
   域不同(library/reader),建议两票)。
4. **验收补测点**:U1 完成后重启 dev,指引用户复测包1 ④(跨标签进度恢复)
   ⑤(标注兼容)+ 全包复验(A/B/C/D/E2 目测)。
5. **U4 = E1 布局修 + 边 label**(受锁大票,含 layout 夹具扩展)。
6. **U5 = F 格式转置**(受锁断言面大)。
7. **M1 草稿 title 重写**(主控直接改桌面草稿+重新导入验证,随 U4 验收一起)。

每个单元的「不引入新 bug」检查单:票面五层规约先行(状态机前置——A/E1 必须
交状态/迁移表)+ 首红留存 + 变异红证(cp 备份法)+ 门一/门二 + 收口亲验 verify
真退出码 + e2e 全量(受锁 spec 改动后必须全量 verify,tsc 关卡不可跳)。

## 4. 后续开发准备(修复役之后)

- **M1 试点收尾**:四篇语料 synthesize 已出
  (`%APPDATA%/Synapse Remake/ai-sensor/corpus-ai/synthesize.md`,含元数据勘误
  两处/交叉点四条/开放问题池)——待用户策展定稿脉络成品(导入修复后的图渲染
  应呈现「转捩谱系」分叉树,即 E1 修法的最佳验收样本)。
- **P7-D UI 风格战役**:需求锚已入档(崩铁玻璃质感+aquaresearch 简笔画图标/
  切换动画;发现 5 分类视觉编码待用户裁决)。注意 U2/U4/U5 的视觉改动保持
  最小克制,勿与 P7-D 大役抢设计面。
- **P8 池**:ROADMAP P8 工单化起步注记已存在;ENR 消费面(综述引用 venueTier/
  citedByCount)等 M1 之后的增强按需入池。

## 5. 遗留池(继承交接书 v3 §3 + 本会话新增)

继承:第七雷两处(lineage/papers order 决胜)/sqlite-abi.mjs:103 顺手单元/
脉络打磨(发现 4 视图态保持·发现 6 节点标题换行)/P7-D 立项/DEV-SETUP Node
条目/onVisibleChange 生产零消费(canvas≤5 收紧 ≤4 一并)。

新增:①manifest 两字段成对真机抽查(用户下次完整导出时顺带);②VENUE_TIER_MAP
种子表扩充(受锁常量修订制,'Water Resources Research' 等水领域刊补入);
③dev-launch.cmd/dist_new 工作区残留处置;④M1 草稿 title 重写(§3 步骤 7)。

## 6. 成本账本(本会话·验收分析)

- Explore 取证代理 1 个:≈2.64M tok / 15.1min(六项问题代码定位,65 次工具调用)。
- 主控:图片分析 7 次(6 图+1 次 URL 损坏重试)+ 桌面导出物/草稿 JSON 抽查 +
  本文档撰写。子代理口径合计 ≈2.6M+;本会话为纯分析+文档,零代码改动。
- 下一会话开工引用:本文档 + 交接书 v3(成本与战役史) + 战役报告
  `docs/reports/2026-08-28_p7f-campaign.md`。
