# R3-LIB 文献库视觉重制 —— 实现者收口报告

> 三屋模式实现者子代理 · 2026-08-29 · 工作目录 E:\class\智慧水务\Synapse_remake
> 票面：scripts/audits/r3-lib-brief.md（P1~P5 全采纳 + 主控预裁三点）

## 0. 技能清点（开工纪律）

- **用**：test-driven-development（票面文化层：首红→绿→变异红证）、
  verification-before-completion（verify/e2e 真退出码落盘、完成前亲验）。
- **不用**：frontend-design/frontend-ui-engineering——视觉规范单一来源=
  shell-library.html v2，加载会引入冲突审美输入；git 系技能——实现者禁
  add/commit/push；subagent-driven-development——本人即实现者无派发；
  e2e-testing-patterns——不新写 e2e 仅亲跑既有 25 条；docx/xlsx/pdf 等——
  纯前端 CSS/TSX 改动无测试面交集。
- 配置自查：实现者子代理身份，模型/思考等级按主控派发配置运行。

## 1. 实现摘要（对照票面 P1~P5）

- **P1 文献卡**：PaperRow 行→卡重制——卡根 `.lib-card`（168° 暖白渐变+
  inset 顶高光+`background-clip:padding-box` 亚像素缝隙锁〔注意事项②〕+
  shadow-1）；hover 金 hairline 描边+translateY(-1px)+shadow-2+L 角饰显形；
  衬线年份大字（`--font-display`/金色/44px min-width，空年份「—」）+题名
  两行截断（line-clamp:2+min-height:38px）+venue 斜体独立行（空串条件
  渲染=mockup `.venue:empty` 的 DOM 等价）+标签胶囊 6px 圆角（999→6）+
  meta 行 tabular-nums。列表容器 grid 化
  `repeat(auto-fill,minmax(340px,1fr))`+gap12+align-content:start。
  **双击打开/单击选中/aria-current/title 提示全保留**（e2e 文献行
  getByText.dblclick 断言面零触碰）。
- **P2 FilterBar+菱形分隔**：搜索框/集合/年份/排序四控件统一 `.lib-chip`
  胶囊语法（panel-glass 底+999 圆角+shadow-1），aria-label 与选项文案零改；
  筛选区与列表之间挂 `DiamondRule`（渐隐线+◆+渐隐线；线段 min-width 24px+
  flex:1 窄窗防碰撞〔注意事项③〕，装饰 aria-hidden）。
- **P3 详情栏**：aside 挂 `.lib-detail-aside`（纸面底+border-left hairline）；
  标题衬线化（`.lib-detail-title`）；年份/被引数值行衬线金大字
  （`.lib-detail-v-serif`，ENR-03 被引文本断言面零改——Row 两 span 结构
  保持，paper-detail-cited 三用例绿）；摘要节金 hairline 分节
  （`.lib-detail-abs`）；按钮走 TH1 Button 变体（既有，文案零改）。
  MetaEditDialog 零结构改（共享 Dialog 已带 TH1 玻璃头檐+金 hairline 皮肤，
  核对后无需触碰）。
- **P1 附加 ImportDropZone**：虚线金框（`.lib-dropzone` 1px dashed
  border-gold）+拖入金辉（`.lib-dropzone-dragging` 金描边+gold-soft 外辉）；
  「导入 PDF 文件」改共享 Button primary 变体（CTA 语法：inset 金
  hairline .45→hover .7+6px 切角）、「导入文件夹」secondary；文案/busy/
  进度/拖拽提示行为零改，删除 BTN_PRIMARY/BTN_SECONDARY/disabledStyle
  死代码。
- **P5 不做面**：未做卡片多选/批量操作/密度切换/封面图/右键菜单/拖拽排序。

## 2. 文件清单（diff 范围自查：7 改+3 新增，全在票面）

| 文件 | 动作 | 行数 | 说明 |
| --- | --- | --- | --- |
| src/renderer/features/library/PaperRow.tsx | 改 | 78 | 行→卡重制（≤250 ✓） |
| src/renderer/features/library/PaperList.tsx | 改 | 112 | 容器 grid 化（一行类名） |
| src/renderer/features/library/FilterBar.tsx | 改 | 115 | chips 化（去边框盒） |
| src/renderer/features/library/ImportDropZone.tsx | 改 | 145 | 金虚线框+Button CTA |
| src/renderer/features/library/PaperDetailPanel.tsx | 改 | 244 | 衬线皮肤（未超 250，无需拆 PaperDetailMeta） |
| src/renderer/features/library/LibraryPage.tsx | 改 | 117 | DiamondRule 组装+aside 皮肤+css 挂载 |
| src/renderer/features/library/library.css | 新 | 204 | R3-U2 皮肤单文件（≤500 ✓） |
| src/renderer/shared/ui/DiamondRule.tsx | 新 | 23 | 菱形分隔共享件（R3-U4 复用） |
| tests/unit/renderer/library-cards.test.tsx | 新 | 226 | 10 it（渲染级+CSS 文本锁） |
| locks/manifest.json | 改 | — | locks:apply（152→153） |

`git diff --stat`：7 files changed, 58 insertions(+), 105 deletions(-)。
**theme.css 零改**（见自裁申报 ①）。MetaEditDialog/TagFilter 零改（非票面
皮肤面已合规）。tickets/registry.ts 未触碰；无 git add/commit。

## 3. TDD 首红证据（scripts/audits/r3-lib-first-red.log）

三段全程落盘（诚实序列）：
1. 模块缺失红——DiamondRule 尚不存在，import 解析失败（feature missing）；
2. 环境修复段——jsdom 下 `import.meta.url` 为 http: 协议致 fileURLToPath
   抛错，测试读取 CSS 改 cwd 相对路径（测试面修复，非断言放宽）；
3. **断言级红：10/10 it 全红**（lib-card 类/角饰/空 venue/交互/菱形分隔/
   CSS 材质锁全部缺失所致——失败原因均为 feature missing）。

## 4. 变异红证 + 还原证据（scripts/audits/r3-lib-mutation.log）

cp 备份法（未提交实现禁 git checkout——UBS 教训口径）：

| # | 变异 | 红 it | VITEST_EXIT | 还原 |
| --- | --- | --- | --- | --- |
| 1 | 删卡片渐变（.lib-card background→纯 panel） | 材质文本锁 it 红 | 1 | diff 空 ✓ |
| 2 | LibraryPage 移除 `<DiamondRule />` | 页面级存在性 it 红 | 1 | diff 空 ✓ |
| 3 | PaperRow 移除角饰 span×2 | 角饰存在性 it 红 | 1 | diff 空 ✓ |
| — | 三还原后终态复跑 | 10/10 绿 | 0 | — |

（票面要求 ≥2，实做 3；主控点名的两条——删渐变类→材质 it 红、删菱形
分隔→存在性 it 红——均在列。）

## 5. e2e 兼容性核对（scripts/audits/r3-lib-e2e.log）

- **全量亲跑：25 passed（1.2m），E2E_EXIT=0**——基线 25 保持，零红。
- 文案兼容面逐一核对：文献行 getByText(...).first().dblclick()（ai-notes/
  reader-scroll/workspaces 三处）——题名 span 保留于卡根 button 内，双击
  链路通；「正在加载文献列表…」锚（workspaces W2）——loading 段未动；
  「暂无文献」空态、FilterBar 全部分类/全部年份/排序三选、导入按钮文案、
  详情栏「去阅读器写笔记/编辑元数据/导出三件」全部零改。

## 6. locks 实录

- 新测试文件入受锁集（tests/** walk 规则）→ `npm run locks:generate`
  （153 条）→ `npm run locks:apply`（153 只读）→ `npm run locks:check`
  通过（152→153，+1=library-cards.test.tsx）。
- 中途 typecheck 红（test.tsx:197 `host?.querySelector` undefined 窄化
  缺口）→ 按流程 unlock→改（`?? null` 折叠）→即时 apply→typecheck 绿。
  提交需带 [locked-change] 尾注（manifest+新测试两受锁面）。

## 7. verify 真退出码（scripts/audits/r3-lib-verify.log）

- **VERIFY_EXIT=0**（quality+tickets+locks+lint+typecheck+test+build 全链）。
- 单测 103 文件 / 850 用例全绿（基线 840+新增 10，偏差=+10 即新 it）。
- 既有 library 域断言零红：paper-detail-cited 三用例（被引 124/—/0——Row
  两 span 结构保持）、paper-detail-notes-off 三用例、library.store、
  theme.test token 锁（:root 零改）。
- 日志中 ErrorBoundary 栈行为 tests/contracts/app-error.test.ts 既有噪音
  （故意抛错的契约测试），非本次引入。

## 8. 自裁申报（超票面决定）

1. **皮肤落点拆分**：theme.css 追加 R3-U2 段会到 542 行（>500 违宪）→ 拆
   feature 本地 `library.css`（LibraryPage 唯一挂载 import）；theme.css
   回原 340 行零改。token 单源不破——全部取色仍走 theme.css :root 变量，
   lib-* 仅为组件皮肤非 token（票面措辞「TH1 token 全集在 theme.css」的
   token 面未被触碰）。
2. **新建共享件 DiamondRule.tsx**（shared/ui）：票面架构层只预告了
   PaperCard 拆分；做共享件是为 R3-U4「菱形分隔复用」预铺+获得 jsdom 可
   断言的 DOM 面。mockup 用伪元素+内联样式，jsdom 双盲——改实 span+
   类+aria-hidden，视觉等价。
3. **L 角饰伪元素→实 span**（tl/br 各一，aria-hidden+pointer-events:none）
   ——同上理由：jsdom 可断言（角饰存在性 it 的物理基础），视觉等价。
4. **卡 meta 行重排**：旧「作者 · 年份 · 期刊」单行 → mockup 排版（年份
   升衬线大字位、期刊独立斜体行、meta 行=作者+标注 N+笔记 N）。作者文案
   formatAuthors（含「佚名」回退/et al.）逐字保留；年份空值「—」。
5. **FilterBar 容器去边框盒**（mockup .filterbar 为裸 chips 行）；TagFilter
   未动（非票面文件，chips 视觉本已合规）。
6. **测试环境两补丁**：jsdom scrollIntoView polyfill（PaperList 选中滚入
   effect 的宿主 API 缺位）+ IS_REACT_ACT_ENVIRONMENT 声明
   （selection-layer/page-column 既有同口径）。
7. **选中卡态自定**：mockup 未给选中样式——取「选中唯一性」：accent-soft
   平色底+accent 描边替代渐变（渐变让位防两层材质打架）。

## 9. 疑虑

- 选中卡平色底为无 mockup 依据的自裁（见上 ⑦），门审如认为需保留渐变可
  指定回炉点。——**已被门一 R5 裁决取代（见 §10 回炉一）**
- PaperList 直接渲染的 unit 场景不加载 library.css（挂载点在 LibraryPage）
  ——jsdom 本不渲染样式、CSS 断言直读文件，无影响；仅记录此接缝事实。
- e2e 全绿但**像素级视觉未经多模态核验**（壳+库设计稿 8/10 的落地还原度
  留给门一对抗深审/人工视检；本实现严格逐值誊录 mockup CSS）。

## 10. 回炉一（门一 FAIL 裁决 3B+3W——2026-08-29）

**改动面**（全部 CSS/微 TSX，零文案/零交互变更）：

| 项 | 落点 | 内容 |
| --- | --- | --- |
| R1 | library.css | .lib-dropzone background: var(--panel)→transparent（虚线金框落纸面材质归一） |
| R2 | library.css | 题名 13.5px/500→14px/600；venue 11.5px→11px；meta 11px→10.5px（纯 CSS 阶差） |
| R3 | PaperRow.tsx+library.css | 空年份「—」→9px 淡金 ◆（.lib-card-year-gem，aria-hidden；year 槽 min-width 44px 保对齐） |
| R4 | PaperDetailPanel.tsx+library.css | 空态 .lib-detail-empty 居中+DiamondRule×2 夹持；「选中列表中的文献后显示详情」逐字保留（+8 行后 248≤250，未触发拆分） |
| R5（门一独立裁） | library.css | .lib-card-selected 重写：渐变不覆盖（段内无 background 声明=继承 .lib-card 材质）+border var(--gold)+inset 金 ring rgba(201,168,106,.45)+shadow-2+角饰常显（.lib-card-selected .lib-corner opacity .9）；段序排 :hover 后——叠加时 selected 赢，与 hover 拉开两档 |
| W2 | FilterBar.tsx+library.css | 搜索框（text 非空）/集合（collectionId 有值）/年份（year 有值）条件挂 .lib-chip-on（镜像 mockup .chip.on：accent 色+accent 描边+accent-soft 底）；排序不挂（视图非条件） |
| W3 | library.css→theme.css | .lib-rule* 五段迁 theme.css 共享位（R3-U4 复用依赖；theme.css 367≤500）；DiamondRule 头注「样式全在 theme.css」由虚转实 |

**TDD**：新 it 6 条+迁移旧 it 1 条首红（7 红，r3-lib-rework1-first-red.log）
→实现→16/16 绿→变异红证 1 轮：删选中金描边（.lib-card-selected
border-color）→R5 it 红（VITEST_EXIT=1）→cp 还原 diff 空→终态绿
（r3-lib-rework1-mutation.log）。

**关卡终态**：单测 103 文件 856 用例（+6）；verify VERIFY_EXIT=0 落盘
r3-lib-verify.log；e2e 全量 25 passed / E2E_EXIT=0 落盘 r3-lib-e2e.log。
locks：测试文件改受锁面 unlock→改→即时 apply（153 一致）。

**e2e 偶发记录**：回炉后首轮全量 reader-scroll F-04 红 1（selectText
Element is not attached——页列离屏回收与划选的 DOM detach 竞态，reader 域
时序偶发，与 library 改动零交集）；单 spec 复跑绿+全量复跑 25 passed
双重复核后确认偶发，完整证据链在 r3-lib-e2e.log（首轮失败 log 已被复跑
覆盖，失败详情见本节文字记录：reader-scroll.spec.ts:232 known3.selectText）。
