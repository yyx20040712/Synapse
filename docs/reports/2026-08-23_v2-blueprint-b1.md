# v2 蓝图 B1 素材清点报告（只读核实，2026-08-23）

> 轨道 B 第一步产物。批内零代码改动；所有 file:line 为 HEAD 302e058 实读核实。
> 锚点生命周期：消费方（工单化/审查）使用时须重新核对 HEAD，锚点失效即视为本报告过期。
> 消费方：ROADMAP「Phase 7+（草案）」+ B3 用户裁决。工作副本（含过程注记）：
> %TEMP%\synapse_workflow\analyses\2026-08-23_v2-b1-inventory.md。

## 0. 摘要

用户 2026-08-23 人工验收反馈：**无功能性缺陷**（「高亮与下划线做得很好」，轨道 A 空转），
回报为 v2 特性需求（WPS 范式）+ 北极星愿景（AI 传感器/结构化语料）。本报告完成素材四源
（用户一手/代码预留点/战役暂缓/负面清单甄别）+ 需求-现状映射 + 技术债对策，供蓝图编排。

## 1. 用户一手素材（原意浓缩，六组需求 + 愿景）

- ① 多标签页：多文献快速切换（WPS 范式）
- ② 撤销与保存：修改后标签叉号变灰点、退出时保存提示
- ③ 标注交互：点击已有标注弹「复制/删除/添加笔记/取消」四选项
- ④ 笔记层级化（价值核心）：仅被标注文段可配笔记；每条笔记=标记段落内容+记录内容；
  笔记/目录/缩略图 UI 三者并列；笔记按所引文章内容顺序排列、同段多条按创建序；
  每篇文献笔记存为一份 markdown 便于导出
- ⑤ UI：游戏级玻璃质感、用户行为反馈不足需补、应用内面板边界应可鼠标拖拽
- ⑥ 操作：ctrl+c / ctrl+v / ctrl+鼠标滚轮 等常规操作
- 愿景：PDF 中故事线/工程逻辑/技术债严重失真不利于 AI 阅读；应提炼高质量结构性语料，
  将 读文献→分析文献→串联领域 按合理规制流程固化。好工具=逻辑明确、层次鲜明、
  容易验证、简单易用，充分担任 AI 的传感器。

## 2. 需求-现状映射（file:line 实证）

| # | 需求 | 现状实证 | 缺口性质 |
|---|---|---|---|
| ⑥ | ctrl+c/v、ctrl+滚轮 | 渲染层全库无 ctrlKey/wheel 处理（grep 零命中）；zoom 管线已存在（ReaderToolbar.tsx:105-116，ZOOM_STEP/onZoom）；SelectionLayer.tsx:129 仅 Esc | 输入绑定层：wheel→现有 onZoom；ctrl+c→复制文本层选中文本 |
| ③ | 标注四选项菜单 | AnnotationLayer.tsx:186 点击标注直开 AnnotationEditor（onSave/onDelete/onCancel，AnnotationEditor.tsx:14-21） | 插入菜单层；编辑器改由菜单路径触发 |
| ⑤a | 面板边界拖拽 | 侧栏可折叠宽度固定（ReaderPage.tsx:7）；主窗口标准系统边框（main-window.ts:49-59）——窗口级无缺陷 | 应用内 pane splitter |
| ① | 多标签页 | App 级三固定视图（App.tsx:12），切走卸载 ReaderPage（App.tsx:88，状态在模块级 store 存活）；reader.store 单文献形状 | 阅读视图内 tab 栏 + reader.store per-tab 字典重构（状态机前置） |
| ② | 灰点/退出提示/撤销 | notes 自动保存防抖 1.5s+deriveSaveStatus 四态诚实指示（NotesPanel.tsx:10-13，INV-04）；annotations 即时持久化 | 灰点=同步状态投影到 tab；退出拦截=pending 时提示；撤销=标注操作级 undo 栈 |
| ④ | 笔记层级化 | annotations 已含完整锚定 quote/prefix/suffix/offsets/归一化rects/sortKey/comment（annotation.ts:30-48；001_init.sql:54-72）；notes=论文级独立 md 长笔记（note.ts:2；001_init.sql:74-82）；笔记 UI 在库侧 PaperDetailPanel（NotesPanel.tsx:21），阅读器侧栏仅目录/缩略图两 tab（OutlinePanel.tsx:7）；markdown.report.ts:5-10 已产含高亮+笔记读书报告 | 三栏并列；排序键现成（idx_annotations_paper(paper_id,page,sort_key)，001:72 + createdAt 次级）；**两套笔记概念并存必须裁决（§7-1）**；md 语料导出 |
| ⑤b | 玻璃质感/反馈 | theme.css 变量集已备（SettingsPage.tsx:6 预留注释）；toast 系统已有（shared/ui/Toast） | UX 战役：token 先行+微交互体系 |

## 3. 代码内 v2 预留点全清单（12 处预留 + 1 处负面清单确认）

library.service.ts:20（智能过滤/引用数排序）；enrich/providers/crossref.ts:21（分页/引用关系）；
tags.service.ts:16 + TagEditor.tsx:92（标签改名/合并/删除）；export_/markdown.report.ts:22（Word/PDF 渲染）；
export_/bibtex.serializer.ts:25（RIS/EndNote）；export_/export.service.ts:27（导出剪贴板，ipc 加通道）；
enrich/providers/openalex.ts:19（作者实体/引用网络）；ipc/import_.ts:18 + ImportDropZone.tsx:7（拖拽导入，
webUtils.getPathForFile 经 preload）；SettingsPage.tsx:6,125（主题三选接线 theme.css）；TagFilter.tsx:6
（标签多选过滤）；ReaderToolbar.tsx:7,163（页内高亮搜索，占位禁用态已放）；reader.service.ts 生命周期层
（阅读时长统计，新迁移加列——001 已冻结）；NotesPanel.tsx:24（富文本=负面清单永久不做）。

## 4. 战役暂缓项

连续滚动（架构级四层，缺陷战役 §6）；enrich 交互式重试预算；玻璃质感/切换渐变（本次升级为正式候选⑤）；
安装包体积优化（docs/reports/2026-08-22_SR-PKG-02.md）。

## 5. 防线升级项（与轨道 C 互为表里）

INV-11 单源常量 lint 化、INV-07 renderer 路径字面量补充检测（C1 评估）；INV-02/13 登记册收尾（C2）。
蓝图候选凡新增字面量/接缝（keymap、token、tab 状态）者，规约预登记不变量。
C1/C2 与 P7-D（token 消费）的并行/前置关系随 B3-问4 裁决。

## 6. 负面清单逐项甄别（12 项）

| 条目 | 裁定 | 依据 |
|---|---|---|
| 知识图谱 | 永久 | 串联领域愿景不得滑向图谱 UI；跨文献关联走 标签/集合/md 语料线性结构 |
| 翻译 | 永久 | 无本地翻译管线预算 |
| PDF 下载管线 | 永久 | CARSI/CDP/Sci-Hub 合规与维护风险 |
| Scopus/WoS | 永久 | 增强 provider 三 host 白名单已锁死 |
| 插件系统 | 永久 | 单人应用无生态需求 |
| i18n | 永久 | 单用户中文应用 |
| 云同步 | 永久 | 本地优先；可移植性由 md 语料导出覆盖 |
| EPUB | 永久 | PDF 单格式深做 |
| 多窗口 | 永久（边界声明） | **单窗口多标签≠多窗口**；①属前者，需用户 B3 明示确认解释 |
| 遥测 | 永久 | 隐私 |
| 后台自动网络任务 | 永久 | 增强保持手动触发 |
| Markdown 富文本编辑器 | 永久 | textarea 保持；md 是存储/导出格式非编辑器形态（④不触此条） |

## 7. 技术债风险点与工业级对策

1. **两套笔记概念并存（最高优先裁决）**：annotations.comment（片段批注）与 notes（论文级长笔记）
   语义重叠，宪法禁两套方案并存。α（推荐）：双层正交——片段层（标注锚定，④主体）+总评层
   （notes 保留为论文级读后总评）。依据：001 已冻结（演进只能新增迁移）；ADR-0008 刚裁决
   notes.store 五模块维持（推倒=重付 13 锁定用例+五轮审计成本）；「片段/总评」正交非重复，
   契合「层次鲜明」。β（备选）：统一标注承载，notes 迁移下线——重付审计成本且丧失无锚点
   自由记录面。→ B3 第一问。**α 落地约束**：笔记编辑 UI 收敛到阅读器侧栏，库侧
   NotesPanel 的编辑面随之下线（PaperDetailPanel 保留元信息/标签面）——「方案切换=删除
   旧方案」红线，旧 UI 去留路径随 B3-问1 定案。
2. **多 tab 状态机**：reader.store 单文献→per-tab 字典。宪法状态机前置：tab 生命周期态空间
   （opening/active/loading/error/closing(dirty)/closed；换 tab=暂停非卸载）+ 跨格序列先交审计
   （U2 五轮回炉教训）。ADR-0008 分布式状态机经验复用。
3. **撤销作用域**：标注操作级 undo（create/delete/comment-edit 逆操作）；笔记文本 undo 依赖
   textarea 原生——不自建全文 undo 树。灰点/退出提示不引入手动保存模式（与 autosave-first
   数据安全语义对齐，U2 战役教训：显式指示保可见性，自动保存保安全性）。
4. **玻璃质感 token 先行**：视觉增量一律经 theme.css 变量（与 INV-11 单源同向），禁散落
   hardcoded style；C1 lint 规则若落地正好覆盖此接缝。
5. **快捷键集中注册**：keymap 单例（注册/注销成对），禁组件散落 addEventListener——新接缝
   预登记 invariant。
6. **md 语料双轨**：DB 唯一真相源（事务性/FTS/单写者），md 为投影（按需导出或保存时镜像到
   用户指定语料目录）。md 文件不做真相源（丢 FTS/并发/事务性=新债）。

## 8. 建议编排（蓝图骨架，顺序待 B3 裁决）

P7-A 交互基建（⑥③⑤a）→ P7-B 多标签+同步投影（①②）→ P7-C 笔记结构化（④+愿景，依赖 A/B）；
P7-D 玻璃 UX 战役（⑤b，token 先行可并行）；P7-E 预留点清扫按价值穿插（标签生命周期>拖拽导入>页内搜索>导出剪贴板>阅读时长>
标签多选过滤>智能排序>其余）；P8+ 候选池：连续滚动/enrich
重试预算/体积优化/RIS/EndNote（标签多选过滤/智能排序系代码预留点，归 P7-E 不入 P8+）。

## 9. B3 用户裁决停点（四问）

1. 笔记双层概念：α（推荐）vs β
2. 「多窗口」负面清单边界：单窗口多标签是否确认为合法解释
3. md 存储形态：DB 真相源+md 投影导出（推荐）vs md 文件真相源
4. 排期取舍：P7-A~E 入围与顺序、P7-D 并行度
