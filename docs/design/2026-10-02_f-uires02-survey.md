# F-UIRES-02 全域盘点与批次设计（2026-10-02，主控亲执）

> 票面=registry F-UIRES-02（owner:strong）。主体=输入交互资源管理器化
> （用户第 2 条：「所有用户输入逻辑都要支持 Enter、失焦等文件资源管理器
> 常见操作」）；三批增补=功能类小按钮图标化（原文：「功能类小按钮（保存、
> 收起等操作钮）图标化——不渲染汉字文本、仅图标，鼠标悬停显示汉字提示
> （title/tooltip 形态），目标=简洁美观视觉；零新依赖；aria-label 与悬停
> 提示同源」）。
> 本档=票面前置「全域盘点清单」的落档件+主控裁决注记+批次切分。盘点
> 执行=两会话内 code-explorer 代理（2026-10-02，token 入账本），主控亲验
> 关键接缝（WorkspacesPage/FolderNavRows/EdgeMenu 行号抽核）。

## §1 输入面盘点（22 面→六类分域）

图例：面编号对应盘点底表（代理报告全文存档）。基准形态=FolderNavRows
行内编辑（Enter 提交/失焦提交[过 skipBlur 标记门]/Esc 取消/isComposing
守卫；F-UIRES-01 批 A 落地）。

### 甲类=行内编辑全范式面（三键全套目标态）

| 面 | 现状 | 批 A 目标 |
| --- | --- | --- |
| #1 文件夹重命名（FolderNavRows.tsx:90） | ✅ 基准（F2+右键入口） | 零动 |
| #2 文件夹新建（FolderNavRows.tsx:154） | ✅ 基准 | 零动 |
| #22 课题重命名（WorkspacesPage.tsx:160） | ❌ 全空（仅确定/取消钮） | **补全套**：Enter 提交/失焦提交/Esc 取消/isComposing；空名沿用既有 toast |
| #14 线型名（LineTypeMenu.tsx:83） | 三键达标；入口=单击 span | **单击维持**（批 A 中裁决修订：原拟双击，受锁四用例锁定+dblclick 重置 draft 风险——详见 §2 表） |
| #9 连线命名（EdgeMenu.tsx:104） | Enter/Esc 达标；**失焦=丢弃**；document 级 Esc（:61）**缺 isComposing 守卫**（全域唯一真空） | 失焦改**提交**（序B 补提交范式）+document 监听补 isComposing 守卫；空名维持静默零写（EdgeMenuHost:34 既有契约） |

### 乙类=表单/对话框单行字段（Enter=提交表单；失焦不提交）

裁决依据：对话框内失焦提交=误触源（点「取消」钮先 blur 即误保存）；
Enter 提交+Dialog 壳 Esc（Dialog.tsx:31-39 已含 isComposing）已足。

| 面 | 现状 | 批 A 目标 |
| --- | --- | --- |
| #4 MetaEditDialog 7 单行字段（:83） | ❌ Enter 无效 | Enter=触发保存（与「保存」钮同语义；isComposing 守卫；校验失败链路同按钮） |
| #5 摘要 textarea（:90） | 多行 | **豁免**（Enter=换行） |
| #11 主题节点命名（LineageAddNodeDialog.tsx:136） | ❌ | Enter=添加（空名禁用语义同按钮） |
| #21 设置页邮箱（SettingsPage.tsx:113） | ❌ | Enter=保存设置（校验链路同按钮） |
| #7 标签重命名（TagLifecycle.tsx:82） | Enter/Esc 达标 | 零动（失焦不补——乙类裁决） |
| #13 节点标签对话框（LineageTagDialog.tsx:31） | Enter/Esc 达标 | 零动（同上） |
| #8 标签颜色（TagColorDialog.tsx:79） | 非文本 | 豁免 |

### 丙类=常驻添加输入（TagEditor 三路范式对齐：Enter/失焦/按钮提交+Esc 清空）

| 面 | 现状 | 批 A 目标 |
| --- | --- | --- |
| #6 TagEditor 新增标签（:176） | ✅ 三路提交范式源 | 零动 |
| #12 脉络侧板标签添加（LineageSideTags.tsx:66） | Enter 达标；**失焦丢值**、无 Esc | 失焦改**提交**（序B 补提交）+Esc=清空输入；＋钮 mousedown preventDefault 防双发（TagEditor:213-228 先例） |
| #23 新建课题（WorkspacesPage.tsx:209） | ❌ | Enter=创建并切换+Esc=清空+isComposing（常驻输入，取消语义=清空非卸载） |

### 丁类=长文/连续自动保存面（豁免三键——第三语义组）

#15 核心想法 textarea、#16/17 笔记（1.5s 防抖）、#20 批注（800ms 防抖，
Esc=收起既有）：多行 Enter=换行；自动保存语义与三键范式互斥，**全豁免**
（范式分组注记，非遗漏）。

### 戊类=过滤/搜索/跳转面（豁免——各有既有好范式）

#3 文献库搜索（防抖 300ms 输入即筛）、#18 阅读器搜索（Chrome 式 Enter
驱动+全守卫）、#19 页码跳转（数字面+composition 守卫）。#10 添加节点
文献搜索=每字符直发 IPC 无防抖（性能小瑕疵，**注记观察项，非本票面**）。

### 共享提炼（Rule of Three 触发=3 份拷贝）

- `src/renderer/shared/inline-keys.ts` 新建（**非受锁面**——受锁=src/shared
  跨进程契约）：①`inlineKeyDown`（自 FolderNavRows 模块私有提升导出，
  键面单源）②`useComposingCommit`（composingRef+compositionStart/End+
  序B 补提交[activeElement 判定]——TagEditor:185-195/EdgeMenu:112-122/
  LineTypeMenu:91-102 三份手写拷贝合一）。
- 消费迁移：FolderNavRows（改导入）/TagEditor/EdgeMenu/LineTypeMenu
  （拷贝段换 hook，行为等价迁移，受锁测试=行为锁保活）+WorkspacesPage/
  LineageSideTags（新消费）。
- 不做：全域 useInlineEdit 大一统 hook（各面提交通道/守卫差异大，强统一
  =过度抽象；键面+组词面两件单源已覆盖全部增量面）。

## §2 双击进入编辑（裁决注记）

| 面 | 裁决 | 依据 |
| --- | --- | --- |
| #22 课题卡 | **加双击=进入重命名** | 资源管理器镜像（单击=切换课题已有语义，双击=编辑名——两次单击切换幂等无害）；重命名钮保留 |
| #14 线型名 | **单击维持**（裁决修订 2026-10-02 批 A 中） | 原拟单击→双击；实现卡点=受锁 lineage-toolbar-session.test 四用例锁单击入口（tests/** 禁改），且双击加成方案有编辑态 dblclick 重置 draft 抹输入风险面——单击是既有已验证锁定决策，范式统一由课题卡承载。title 维持「点击重命名」 |
| 文件夹行 | **不加双击**（豁免注记） | 单击=切换 folderScope（导航高频），双击误触编辑破坏导航流畅；F2+右键菜单两入口已足。呈用户视验单（用户可裁加） |
| 文献行 PaperRow | 不动 | 双击=打开阅读器既有语义（非编辑面） |

## §3 小钮图标化盘点（批 B）+共享资产

### 目标面（图标化改造，~30 钮/20 文件）

簇状优先序（共享组件/常量先行）：
1. **重试钮 13 处**（Reader 系 2/Library 3/Lineage 5/Workspaces 1/Settings
   1/ErrorBoundary 1）→共享 `RetryButton`（圆形箭头 SVG+title/aria-label
   同源=「重试」）。
2. **关闭 X 6 处**：Dialog.tsx:76（杠杆最高=覆盖全域 9 对话框）/Toast:64/
   TabBar:144/ReaderSearchBox:119/TagEditor chip:160/LineageSideTags chip:54
   →icons.tsx `ICON_X` 常量。
3. 收起/展开对 3 处（ReaderPageView:148「目录」文本钮→chevron/LineageNavPane
   »«/OutlineAside 已成对标杆）。
4. 撤销/重做 2 对（AnnotationEditor:111/121 文字钮+LineageToolbar:173/183
   ↶↷）→`ICON_UNDO/ICON_REDO` 两域复用。
5. LineageToolbar：✋选择→手掌 SVG；**保存钮去文字**（用户票面点名例——
   SaveIcon+dirty 角点+saving spinner 保留，title/aria-label 随态同源）。
6. WorkspacesPage 确定/取消/重命名→check/X/铅笔；EdgeMenu:130 确定→check。
7. TagEditor:213「添加」→plus；LineageSideTags:80 ＋→plus+**补 aria-label**
   （盘点 #30=可达名缺失，无论图标化与否必补）。
8. AiNoteGroupList:73 ▾▸→SVG chevron（随态旋转，段名文本保留）。
9. SelectionToolbar:64 高亮/下划线/备注→荧光笔/下划线/便签三枚 SVG+title
   同源（划选浮条紧凑场景=行业惯例纯图标；Adobe/Notion/微信读书同形）。
10. AnnotationEditor 保存/删除/取消三钮（:143/152/160）→勾/垃圾桶/X+title
    同源（紧凑弹层底部行）。
11. ReaderSearchBox ‹›→沿用 toolbar-icons ICON_PREV/NEXT+title 补齐。
12. TitleBarControls 补 title（唯一缺 title 的已图标化件，顺手齐）。

### 豁免面（注记+呈用户视验单）

- 对话框主操作钮（取消/删除文献/保存设置/导入 PDF 等 ~45 钮）——确认性
  大钮保文本（可读性+危险动作明示）。
- 菜单项/导航行/文本链接（~26+6）——非按钮类。
- DrActions 九钮——受锁文本断言面（paper-detail-export 等）+导出引用类
  主操作。
- FolderNavRows「+新建文件夹」**保图+文**——INV-87 引导态左栏唯一入口，
  纯图标损可发现性（呈视验单，用户可裁纯图标）。
- TagDropdown「清空已选」保文本——语义专用无图标共识。
- MonthPop/UiScaleSection 等档位钮——设置语义组。

### 共享资产方案

- `src/renderer/shared/icons.tsx` 新建：通用 SVG 常量（X/check/chevron×4/
  plus/undo/redo/retry/铅笔/手掌/垃圾桶/荧光笔/下划线/便签），形态仿
  toolbar-icons.tsx（24×24 viewBox+aria-hidden+stroke 走 CSS 类；10×10
  件沿 TitleBarControls 既有规格）。**零新依赖**。
- `RetryButton` 共享组件住 shared/ui/（自带类+样式入 theme-buttons.css
  小节）。
- 悬停提示=**原生 title 属性**（全域 43 处既有先例，无自定义 tooltip——
  零新依赖约束下不引 tooltip 组件）；同源落法=`const label='重试'` 单变量
  喂 title+aria-label 双属性（LineageNavPane:97-98 先例）。
- **sr-only 保活策略**：受锁测试断言面（tab-bar/annotation-editor/
  tag-editor/workspaces-page 等单测+e2e）靠 `<span className="sr-only">
  文本</span>` 保 textContent/accessible name——受锁测试**零改**；若真有
  断言纯图标破坏→停下报 [locked-change]，不得自行改测试。

## §4 批次切分

- **批 A=输入交互统一**（§1 全表+§2 双击）：新建 shared/inline-keys.ts+
  迁移 3 拷贝+WorkspacesPage 双面三键化+双击+MetaEditDialog/主题名/设置页
  Enter+LineageSideTags 失焦/Esc+EdgeMenu 失焦提交+document Esc 守卫
  （LineTypeMenu 双击入口已裁决撤销——§2 表 R10 行；序B 迁 hook 保留）。
  ~10 文件。**批 A 残余登记（裁决部 C4）**：EdgeMenu renaming 态点其他
  菜单项=改名被提交+菜单关闭+他项动作落空（W 级——无数据损坏，重开可
  重做；EdgeMenu.tsx:111 三元仅替换命名项，:162-196 他项仍在场）——已
  接受语义，批 B/后续票可裁（他项 mousedown preventDefault 或 renaming
  态禁用他项两案候选）。
- **批 B=小按钮图标化**（§3 全表）：icons.tsx+RetryButton+~20 文件逐面
  改造+title/aria-label 同源+受锁断言核对。批 B 收口=**票收口**（用户
  2026-10-02 时序裁决：本票收口后用户集中 UI 视检与完善）。

## §5 测试面

- 批 A：新增键面行为测试（Enter/blur/Esc/isComposing 逐面——isComposing
  用 jsdom composition 事件模拟先例=tag-editor.test）；既有受锁行为锁
  （tag-editor 三路矩阵/workspaces-page/tab-bar）保活=等价迁移的验收线。
- 批 B：受锁断言核对清单（sr-only 保活）+e2e 渲染文本断言面全量跑；
  视觉类条款 ⑤b/⑤f——图标化=纯视觉变更，真机实景验证（无头 Playwright
  截图+DOM 计算样式断言：title 属性存在性+aria-label 同源+svg 存在性）。
- 变异红证：批 A 键面（如 isComposing 守卫变异=红）；批 B（如 title 移除
  变异=断言红）。

## §6 用户视验单候选（本票收口随交接书呈报）

1. 文件夹行双击不进编辑（豁免裁决）——若要求加，一句话改。
2. 「+新建文件夹」保图+文（豁免裁决）。
3. LineageToolbar 保存钮纯图标形态（dirty/spinner/title 随态）。
4. SelectionToolbar 三钮纯图标形态（荧光笔/下划线/便签）。
5. WorkspacesPage 双击进编辑+三键范式体感。
