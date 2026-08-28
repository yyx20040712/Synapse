/**
 * 工单注册表 —— 项目的控制面（唯一允许"翻状态"的地方）。
 *
 * 职责：
 * 1. 记录每个待填充模块：工单号 / 文件 / 归属（strong=强模型专属 / weak=弱模型可领）/ 状态（open|done）
 * 2. 驱动测试激活：tests/utils/guard.ts 依据 status 决定单测是否跳过。
 *    翻 open→done 即激活该工单的全部测试；未实现就翻状态，测试立刻红（防作弊 K3）。
 *
 * 规则（由 scripts/check-tickets.mjs 在 CI 强制）：
 * - 代码中每个 NotImplementedError 引用的工单号必须存在且为 open
 * - 每个 open 工单对应的文件必须存在
 * - status=done 的工单，其文件中不得再出现 NotImplementedError
 *
 * 翻状态流程：实现完成 → npm run verify 绿 → 人工审查 git diff → 翻状态 → 提交。
 */

export type TicketOwner = 'strong' | 'weak'
export type TicketStatus = 'open' | 'done'
export type TicketArea =
  | 'ipc'
  | 'db'
  | 'service'
  | 'network'
  | 'reader'
  | 'library-ui'
  | 'notes-ui'
  | 'tags-ui'
  | 'settings-ui'
  | 'ui-kit'
  | 'hooks'
  | 'infra'
  | 'lineage'
  | 'e2e'

export interface Ticket {
  id: string
  file: string
  area: TicketArea
  owner: TicketOwner
  status: TicketStatus
  summary: string
}

export const TICKETS: readonly Ticket[] = [
  // ── infra：强模型已完成（骨架期实现，受锁契约的一部分）──────────────
  { id: 'SR-INFRA-01', file: 'src/main/db/connection.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'SQLite 连接单例与 pragma' },
  { id: 'SR-INFRA-02', file: 'src/main/db/fts.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'FTS5 查询转义工具' },
  { id: 'SR-INFRA-03', file: 'src/main/db/migrate.ts', area: 'infra', owner: 'strong', status: 'done', summary: '追加式迁移执行器' },
  { id: 'SR-INFRA-04', file: 'src/main/services/import_/file-store.ts', area: 'infra', owner: 'strong', status: 'done', summary: '受管文件存储（sha256 去重+路径净化）' },
  { id: 'SR-INFRA-05', file: 'src/main/http/http-client.ts', area: 'infra', owner: 'strong', status: 'done', summary: '出网客户端（host 白名单+超时+退避）' },
  { id: 'SR-INFRA-06', file: 'src/main/security/csp.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'CSP 策略注入' },
  { id: 'SR-INFRA-07', file: 'src/main/security/shell-guard.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'openExternal 外链白名单守卫' },
  { id: 'SR-INFRA-08', file: 'src/main/protocol/app-file.protocol.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'app-file:// 受管文件协议' },
  { id: 'SR-INFRA-09', file: 'src/main/windows/main-window.ts', area: 'infra', owner: 'strong', status: 'done', summary: '主窗口与安全 webPreferences' },
  { id: 'SR-INFRA-10', file: 'src/main/windows/window-state.ts', area: 'infra', owner: 'strong', status: 'done', summary: '窗口位置记忆' },
  { id: 'SR-INFRA-11', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '组装根（依赖注入点）' },
  { id: 'SR-INFRA-12', file: 'src/main/ipc/register.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'IPC 统一注册（zod 校验→service→Result）' },
  { id: 'SR-INFRA-13', file: 'src/preload/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'contextBridge 白名单 API' },
  { id: 'SR-INFRA-14', file: 'src/renderer/api/client.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'renderer 侧 IPC 客户端' },
  { id: 'SR-INFRA-15', file: 'src/main/dialogs.ts', area: 'infra', owner: 'strong', status: 'done', summary: '系统对话框注入（可测试）' },
  { id: 'SR-INFRA-16', file: 'src/main/services/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: '服务装配桶' },
  { id: 'SR-INFRA-17', file: 'src/main/ipc/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'IPC 装配桶（对话框/事件胶水）' },

  // ── ipc 薄分发层（weak）────────────────────────────────────────
  { id: 'SR-IPC-01', file: 'src/main/ipc/library.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '文献库域 handler（list/detail/update-meta/collections）' },
  { id: 'SR-IPC-02', file: 'src/main/ipc/reader.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '阅读器域 handler（open/标注读写/进度）' },
  { id: 'SR-IPC-03', file: 'src/main/ipc/notes.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '笔记域 handler' },
  { id: 'SR-IPC-04', file: 'src/main/ipc/tags.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '标签域 handler' },
  { id: 'SR-IPC-05', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '导入域 handler（对话框令牌）' },
  { id: 'SR-IPC-06', file: 'src/main/ipc/enrich.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '元数据增强 handler（手动触发）' },
  { id: 'SR-IPC-07', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '导出域 handler（BibTeX/CSV/报告）' },
  { id: 'SR-IPC-08', file: 'src/main/ipc/settings.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '设置域 handler（含网络诊断）' },
  { id: 'SR-IPC-09', file: 'src/main/ipc/system.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '系统域 handler（外链守卫打开）' },

  // ── repos 数据访问层（weak）─────────────────────────────────────
  { id: 'SR-DB-01', file: 'src/main/db/repos/papers.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'papers 表仓储（含 FTS 联查）' },
  { id: 'SR-DB-02', file: 'src/main/db/repos/annotations.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'annotations 表仓储' },
  { id: 'SR-DB-03', file: 'src/main/db/repos/notes.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'notes 表仓储（含 FTS）' },
  { id: 'SR-DB-04', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'tags/paper_tags 仓储' },
  { id: 'SR-DB-05', file: 'src/main/db/repos/collections.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'collections/paper_collections 仓储' },

  // ── services 业务层（weak）──────────────────────────────────────
  { id: 'SR-SVC-01', file: 'src/main/services/library.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '文献库用例：列表筛选/详情聚合/元数据编辑' },
  { id: 'SR-SVC-02', file: 'src/main/services/reader.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '阅读用例：取文件引用/标注读写/进度' },
  { id: 'SR-SVC-03', file: 'src/main/services/import_/import.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '导入编排：对话框→file-store→抽取→入库' },
  { id: 'SR-SVC-04', file: 'src/main/services/import_/pdf-meta.extract.ts', area: 'service', owner: 'weak', status: 'done', summary: 'PDF 内嵌元数据与 DOI 抽取（纯函数）' },
  { id: 'SR-SVC-05', file: 'src/main/services/enrich/enrich.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '增强编排：DOI/标题→provider→回写' },
  { id: 'SR-SVC-06', file: 'src/main/services/export_/export.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '导出编排：对话框→序列化→写文件' },
  { id: 'SR-SVC-07', file: 'src/main/services/export_/bibtex.serializer.ts', area: 'service', owner: 'weak', status: 'done', summary: 'BibTeX 转义与序列化（纯函数）' },
  { id: 'SR-SVC-08', file: 'src/main/services/export_/markdown.report.ts', area: 'service', owner: 'weak', status: 'done', summary: '高亮+笔记→Markdown 读书报告（纯函数）' },
  { id: 'SR-SVC-09', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '标签用例（薄透传）' },
  { id: 'SR-SVC-10', file: 'src/main/services/notes.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '笔记用例（含 NOT_FOUND 判定）' },

  // ── 开放 API providers（weak）───────────────────────────────────
  { id: 'SR-NET-01', file: 'src/main/services/enrich/providers/crossref.ts', area: 'network', owner: 'weak', status: 'done', summary: 'CrossRef REST 封装' },
  { id: 'SR-NET-02', file: 'src/main/services/enrich/providers/openalex.ts', area: 'network', owner: 'weak', status: 'done', summary: 'OpenAlex REST 封装' },
  { id: 'SR-NET-03', file: 'src/main/services/enrich/providers/arxiv.ts', area: 'network', owner: 'weak', status: 'done', summary: 'arXiv API 封装' },

  // ── reader 强模型模块（strong-open，Phase 3 决策门后实现）──────────
  { id: 'SR-RDR-01', file: 'src/renderer/features/reader/annotation-anchor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '文本偏移↔DOM 定位纯函数（WADM 思路）' },
  { id: 'SR-RDR-02', file: 'src/renderer/features/reader/PdfPageCanvas.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'pdf.js canvas 渲染封装（v4 API；原 PdfCanvas.tsx 经 SR2-F-01 拆分为 PdfDocProvider+PdfPageCanvas——注册文件随直系继承者迁移，旧文件已删）' },
  { id: 'SR-RDR-03', file: 'src/renderer/features/reader/TextLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '官方 TextLayer CSS 接线' },

  // ── renderer UI（weak）─────────────────────────────────────────
  { id: 'SR-RDR-04', file: 'src/renderer/features/reader/ReaderPage.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器页面组装（多 tab）' },
  { id: 'SR-RDR-05', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '文本选择→定位器交互层' },
  { id: 'SR-RDR-06', file: 'src/renderer/features/reader/AnnotationLayer.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '标注渲染与命中层' },
  { id: 'SR-RDR-07', file: 'src/renderer/features/reader/ReaderToolbar.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器工具栏' },
  { id: 'SR-RDR-08', file: 'src/renderer/features/reader/OutlinePanel.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '目录/缩略图侧栏' },
  { id: 'SR-RDR-09', file: 'src/renderer/features/reader/reader.store.ts', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器状态（打开文档/页码/缩放）' },
  { id: 'SR-LIB-01', file: 'src/renderer/features/library/LibraryPage.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献库页面组装' },
  { id: 'SR-LIB-02', file: 'src/renderer/features/library/PaperList.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献虚拟列表' },
  { id: 'SR-LIB-03', file: 'src/renderer/features/library/PaperRow.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献行组件' },
  { id: 'SR-LIB-04', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献详情侧栏' },
  { id: 'SR-LIB-05', file: 'src/renderer/features/library/FilterBar.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '搜索与筛选栏' },
  { id: 'SR-LIB-06', file: 'src/renderer/features/library/ImportDropZone.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '导入入口（拖拽+按钮）' },
  { id: 'SR-LIB-07', file: 'src/renderer/features/library/library.store.ts', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献库状态（列表/筛选/选中）' },
  { id: 'SR-NOTE-01', file: 'src/renderer/shared/save-status.ts', area: 'notes-ui', owner: 'weak', status: 'done', summary: '笔记保存状态推导（C-03 自库侧面板下沉 shared；面板本体随 C-06 下线——文件登记随契约迁移）' },
  { id: 'SR-NOTE-02', file: 'src/renderer/features/notes/notes.store.ts', area: 'notes-ui', owner: 'weak', status: 'done', summary: '笔记状态' },
  { id: 'SR-TAG-01', file: 'src/renderer/features/tags/TagEditor.tsx', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签编辑器' },
  { id: 'SR-TAG-02', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签筛选器' },
  { id: 'SR-TAG-03', file: 'src/renderer/features/tags/tags.store.ts', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签状态' },
  { id: 'SR-SET-01', file: 'src/renderer/features/settings/SettingsPage.tsx', area: 'settings-ui', owner: 'weak', status: 'done', summary: '设置页（含网络行为披露）' },
  { id: 'SR-SET-02', file: 'src/renderer/features/settings/settings.store.ts', area: 'settings-ui', owner: 'weak', status: 'done', summary: '设置状态' },
  { id: 'SR-UI-01', file: 'src/renderer/shared/ui/Button.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: '按钮组件' },
  { id: 'SR-UI-02', file: 'src/renderer/shared/ui/Dialog.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: '对话框组件' },
  { id: 'SR-UI-03', file: 'src/renderer/shared/ui/Toast.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: 'Toast 通知组件' },
  { id: 'SR-HK-01', file: 'src/renderer/shared/hooks/useAsync.ts', area: 'hooks', owner: 'weak', status: 'done', summary: '异步调用 hook' },
  { id: 'SR-HK-02', file: 'src/renderer/shared/hooks/useDebounce.ts', area: 'hooks', owner: 'weak', status: 'done', summary: '防抖 hook' },

  // ── Phase 6 打包分发（strong，2026-08-22 开单）───────────────────
  { id: 'SR-PKG-01', file: 'electron-builder.yml', area: 'infra', owner: 'strong', status: 'done', summary: 'electron-builder NSIS 打包配置与 dist 编排（绑定预置/electronDist 复用/镜像下载）' },
  { id: 'SR-PKG-02', file: 'scripts/installer-smoke.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '安装包冒烟：静默装→沙箱启动→存活断言→静默卸载' },

  // ── Phase 7 v2（strong，2026-08-23 B3 裁决后开单，b3 指针见各工单文件头）──
  // 领取纪律：按依赖序逐单领取逐单提交（KEY-01→KEY-02→ANNO-01/UIK-01），
  // 每单独立 verify+审查+翻状态；禁同批多单（AGENTS「只改这一个文件」条款）
  { id: 'SR2-KEY-01', file: 'src/renderer/shared/keymap.ts', area: 'hooks', owner: 'strong', status: 'done', summary: 'keymap 键盘快捷键单例（注册/注销成对+editable 避让）' },
  { id: 'SR2-KEY-02', file: 'src/renderer/features/reader/ReaderShortcuts.ts', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器快捷键+ctrl 滚轮缩放（挂 keymap，翻页键位映射表）' },
  { id: 'SR2-ANNO-01', file: 'src/renderer/features/reader/AnnotationMenu.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '标注四选项菜单（复制引文/删除/添加笔记/取消）' },
  { id: 'SR2-UIK-01', file: 'src/renderer/shared/ui/SplitPane.tsx', area: 'ui-kit', owner: 'strong', status: 'done', summary: '可拖拽分隔条容器（宽度持久化 localStorage）' },
  // ── Phase 7-B 多标签+同步状态投影（strong，2026-08-24 链条核查后开单；依赖序
  //    TABS-01→02→03→04，UNDO-01 依赖 TABS-01（closeTab 清理接缝）可与 02/03/04
  //    并行；每单独立 verify+审查+翻状态，禁同批多单）──
  { id: 'SR2-TABS-01', file: 'src/renderer/features/reader/reader.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'reader.store per-tab 多文献字典重构（tab 生命周期状态机+竞态守卫 per-tab 化）' },
  { id: 'SR2-TABS-02', file: 'src/renderer/features/reader/TabBar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器多标签栏（order/activeId 消费，loading/error 态，关闭叉）' },
  { id: 'SR2-TABS-03', file: 'src/renderer/features/reader/tab-dirty.ts', area: 'reader', owner: 'strong', status: 'done', summary: '灰点信号聚合（annotations 失败+notes pending 两写面 → tab dirty 投影）' },
  { id: 'SR2-TABS-04', file: 'src/main/windows/main-window.ts', area: 'infra', owner: 'strong', status: 'done', summary: '退出拦截（close preventDefault+dirty 上报通道+二次确认）' },
  { id: 'SR2-UNDO-01', file: 'src/renderer/features/reader/annotation-undo.ts', area: 'reader', owner: 'strong', status: 'done', summary: '标注操作级撤销栈（create/delete/comment-edit 逆操作，per-tab）' },

  // ── Phase 7-C 笔记结构化重构（strong，2026-08-26 开单；b3 指针=B3 裁决 1（α
  //    双层）/3（DB 真相源+md 投影）+ROADMAP P7-C N1 增补块（蓝图 §4.3）；验收细目
  //    =ADR-0011 v1.1；依赖=偏序（02/03 仅依赖 01；04 依赖 03；05/06 依赖 04），
  //    执行按号序串行领取逐单提交（禁同批多单——AGENTS「只改这一个文件」条款）──
  { id: 'SR2-C-01', file: 'src/shared/annotation-order.ts', area: 'infra', owner: 'strong', status: 'done', summary: '片段序单源纯函数（页→页内偏移→创建序→id 全序；排序禁字符串字典序）' },
  { id: 'SR2-C-02', file: 'src/main/services/export_/corpus.assemble.ts', area: 'service', owner: 'strong', status: 'done', summary: 'corpus md 装配纯函数（ADR-0011 v1.1 口径+R12 装配单源条款）+单篇/全库导出通道与入口' },
  { id: 'SR2-C-03', file: 'src/renderer/features/reader/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器笔记面板（总评层 notes.store 消费+片段层列表；save-status 下沉 shared；ADR-0008 五模块不动）' },
  { id: 'SR2-C-04', file: 'src/renderer/features/reader/OutlineAside.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '侧栏三栏宿主（目录/缩略图/笔记 tablist 上移+OutlinePanel mode 化+ReaderPage props 削减）' },
  { id: 'SR2-C-05', file: 'src/renderer/features/reader/anchor-locate.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'N1 锚点定位服务（INV-20 三层防线 exact/page/paper 单入口+F-aware 滚动接缝+标注单击反向同步）' },
  { id: 'SR2-C-06', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'strong', status: 'done', summary: '库侧笔记编辑面下线（NotesPanel 删除+「去阅读器写笔记」入口——方案切换=删除旧方案红线）' },

  // ── Phase 7-G AI 传感器链条应用面第一批（strong，2026-08-27 开单；b3 指针
  //    =B3 增量裁决 D1-D6+七问 v1+第四轮增容（蓝图 §4.3/ADR-0015）；母本
  //    =ai-module-plan v1.1 §4+ai-plan-review §5/§6（定稿增补+会话状态机表）；
  //    契约=ADR-0011 v1.1 五件套；INV-16/17/18 预登记随 02/03/04 锚定；依赖
  //    =偏序（02 依赖 01；03 依赖 02；04 依赖 03；05 依赖 03——目录契约），
  //    执行按号序串行领取逐单提交（禁同批多单）──
  { id: 'SR2-AI-01', file: 'src/main/db/repos/ai_notes.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: 'ai_notes 数据基座（迁移 003+repo：一行一锚定段×一问 N2 粒度+role CHECK+自持锚定三元组与 annotations 解耦；v1 无生产者声明 R4）' },
  { id: 'SR2-AI-02', file: 'src/renderer/features/reader/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '全文/图提取器（pdfjs 白名单三文件 INV-16+ESLint 机器锚+自持文档生命周期 R2+事件桥单向 R3+逐页背压）' },
  { id: 'SR2-AI-03', file: 'src/main/services/export_/corpus.export.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '五件套导出会话（manifest 终局单写+清空重建+单飞 EXPORT_BUSY INV-18+幂等 sha INV-17+corpus.assemble 延展 R12+通道保留判定）' },
  { id: 'SR2-AI-04', file: 'src/renderer/features/settings/CorpusExportSection.tsx', area: 'settings-ui', owner: 'strong', status: 'done', summary: '设置页 AI 语料导出节（进度行+单飞 disabled+App 层订阅 useExportCorpusEvents INV-14+toast INV-02+e2e 全链含中断重跑）' },
  { id: 'SR2-AI-05', file: 'tools/ai-sensor/queue.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'zcode 工具骨架（SKILL.md+config.template+queue 断点续跑幂等——vitest 宿主 R11+config.json gitignore+tools 入 eslint 覆盖）' },

  // ── Phase 7-G AI 回灌与联动第二批（strong，2026-08-27 开单；b3 指针
  //    =第四轮增容裁决（蓝图 §4.3 E1~E7/N1~N4+ADR-0015）；契约=ADR-0015
  //    五节+queue/SKILL 既有工具面（AI-05 交付）；INV-19（随 09）/21（随 10）
  //    预登记随单锚定+INV-20 消费方级用例随 08 补（exact 层延展用例随 09）；依赖=偏序（06→07→08→09；
  //    10 依赖 06），执行按号序串行领取逐单提交（禁同批多单）；08→09 定序
  //    依据=09 硬依赖 08 两交付物（ai-note-style 分色单源+ai-notes.store
  //    数据单源——v5「08∥09」偏序经 plan 门细化）──
  { id: 'SR2-AI-06', file: 'src/main/services/ai_sensor/ai-sensor.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '伴随进程文件协议（协议根 userData/ai-sensor 四成员：job 原子写幂等/status 心跳新鲜度判活单源/工具侧 companion 拾取+产物 corpus-ai 落盘；应用永不 spawn INV-21）' },
  { id: 'SR2-AI-07', file: 'src/main/services/ai_sensor/ai-notes-import.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '回灌导入器（ai-notes/import+list 通道 [locked-change]；幂等=archive 账本 sha 去重+清面重灌；「v1 无生产者」声明解除；工具永不写 DB）' },
  { id: 'SR2-AI-08', file: 'src/renderer/features/reader/AiNotesSection.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '笔记面板 AI 面（role×question 分节+ai-note-style 七问分色单源+只读+「AI 正在读」状态行六态机+「AI 读文献」按钮写 job+待导入按钮）' },
  { id: 'SR2-AI-09', file: 'src/renderer/features/reader/AiAnnotationLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 标注渲染对等（verifyQuote 重锚同几何管线/存储独立 INV-19/v1 只读/点击高亮跳面板/anchor-locate exact 层延展 data-ai-note-id）' },
  { id: 'SR2-AI-10', file: 'src/renderer/features/settings/ZcodeLinkSection.tsx', area: 'settings-ui', owner: 'strong', status: 'done', summary: '设置页 zcode 联动（检测五态三档 fs 纯检测+一键装技能 fs 复制+心跳=06 单源；不代启会话 INV-21 e2e 断言）' },

  // ── Phase 7-H 发展脉络图（strong，2026-08-27 开单；b3 指针=蓝图 §4.3
  //    第四轮裁决 E3/E4/E5+ADR-0014（lineage 数据模型与图形态边界）；
  //    契约=ADR-0014 §数据模型 DDL 字面+E3 形态（v1 时间树单父/v2 DAG
  //    升版条件）；INV-27（树单父 service 层不变量）随 01 登记；依赖
  //    =P7-G AI-06~10 已清（节点 core idea 数据面）+P7-C N1（INV-20 跳转）
  //    +AI-09 exact 层延展（data-ai-note-id）+P7-F 几何（F-aware 接口
  //    已冻结——anchor-locate 延展面就位，非阻塞）；偏序（02 依赖 01 通道+模型；
  //    03 依赖 02 画布/store；04 依赖 03 选择上抛面；05 依赖全组），执行
  //    按号序串行领取逐单提交（禁同批多单）──
  { id: 'SR2-LG-01', file: 'src/main/db/repos/lineage.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: '脉络数据基座（迁移 004 ADR-0014 DDL+repo+lineage JSON 草稿导入全有或全无替换式+lineage 域立 [locked-change] 十一域穷举；树单父 INV-27 登记）' },
  { id: 'SR2-LG-02', file: 'src/renderer/features/lineage/lineage-layout.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '布局纯函数（y 年份分层+x Reingold-Tilford 零依赖手写+手工覆盖优先）+只读 SVG 画布 pan/zoom INV-14+脉络第四视图 E4+lineage.store 数据单源' },
  { id: 'SR2-LG-03', file: 'src/renderer/features/lineage/LineageBoard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '交互编辑（拖拽 x/y 覆盖 JSON Canvas+加删节点边改父+树约束 UI 守卫 INV-27）+自动保存 INV-04 同型+写四通道接线 [locked-change]+退出聚合扩面（不动 TABS-04）' },
  { id: 'SR2-LG-04', file: 'src/renderer/features/lineage/LineageSidePanel.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '节点侧板（元信息+core idea+AI 笔记分节分色复用 ai-note-style+人工笔记）+笔记双击跳阅读器（OPEN_PAPER_EVENT+INV-20 单入口消费方级用例）' },
  { id: 'SR2-LG-05', file: 'tests/e2e/lineage.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: 'e2e 全链（导入→渲染真实文本→拖拽持久→树拒绝→侧板→双击跳转→保存失败退出拦截→主题节点；guard 占位翻 done 激活）' },
  { id: 'SR2-ENR-01', file: 'src/main/services/enrich/cited-by.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '含金量抓取缓存（迁移 005 papers 三可空列+瀑布响应携带零新增请求+citedByPatch 强制刷新纯函数（0 与 NULL 判别 === null）+applyEnrichment 独立 citedBy 参数——PaperMetaPatch/update-meta 契约零触碰+paperDetailSchema 三 optional 字段）——D3-A 档 ADR-0011 契约字段供给；票面双门档 scripts/audits/enr-ticketing-*' },
  { id: 'SR2-ENR-02', file: 'src/shared/venue-tier.ts', area: 'service', owner: 'strong', status: 'done', summary: 'venueTier 映射与装配（b3: P7-G 裁决链在本头注声明——corpus.assemble.ts 头指针保持 P7-C 不动；三档种子表 venueToTier+front-matter/manifest 可选字段两形装配+citedByFetchedAt 配对省略+INTERFACE sha 消费者提示+ADR-0011 v1.2 补注）——依赖 ENR-01 数据面' },
  { id: 'SR2-F-01', file: 'src/renderer/features/reader/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页列几何与懒渲染回收（b3: P7-F；占位盒+视口±1 渲染+离屏>2 回收 IntersectionObserver+页列就绪管线+层实例化分工（SelectionLayer 单实例）+setPage 双源 scroll:to|none 防回弹+:125/:116 单页假设处遇+PdfCanvas 拆 PdfDocProvider/PdfPageCanvas 旧删+INV-16 白名单迁移 [locked-change]）；实现段预拆五段——票面 scripts/audits/p7f-ticketing-draft.md' },
  { id: 'SR2-F-02', file: 'src/renderer/features/reader/anchor-locate.ts', area: 'reader', owner: 'strong', status: 'done', summary: '四层多页化收口与跳页兼容（b3: P7-F 裁决链在本条声明——anchor-locate.ts 头指针保持 P7-C 不动，一文件双裁决链；verifyWhenReady :153 页限定+SelectionLayer 动态锚定根+跨页选区拒绝 toast+跳页全链 e2e；locateAnchor 签名零触碰=F-aware 冻结面）——依赖 F-01 页列' },
  { id: 'SR2-F-03', file: 'src/renderer/features/reader/scroll-progress.ts', area: 'reader', owner: 'strong', status: 'done', summary: '滚动进度回写恢复与键位迁移（b3: P7-F；六态状态机宪法前置——writing 用 scroll:none 防回弹/用户接管=wheel|keydown|pointerdown 三类非 scroll 信号/per-tab Record 记账+就绪时夹取恢复页顶+PAGE_KEYS 四键滚动步+空格新增；scroll-progress 模块拆分 store 净减；零迁移整数页粒度）——依赖 F-02 串行（ReaderPage 装配共享+受锁 e2e 排他）' },
  { id: 'SR2-F-04', file: 'tests/e2e/reader-scroll.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: '缩放重定义与收官 e2e（b3: P7-F；注册文件=e2e 票 LG-05 先例；zoom 视口中心保持纯函数+fit-width 列宽基准+收官全链 spec——离屏回收/进度恢复/标注原位/键位/缩放锚/INV-01+ctrl+wheel 段迁移批 4+战役收官报告）——依赖 F-01/02/03 全部' },
  { id: 'SR2-F-05', file: 'src/renderer/features/reader/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: '程序滚动单容器收敛（b3: P7-F；验收缺陷 A 修复——TabBar 被 scrollIntoView 祖先传播顶出视口；真泄漏面=viewport scrollingElement 门一/门二双核准；scrollIntoNearestScroller 最近滚动祖先差值法（start/center）替换 PageColumn 段⑤+anchor-locate flashElement 两处原生 scrollIntoView+ReaderPage 根两分支 overflow-hidden+Toolbar shrink-0；INV-34 登记禁祖先传播；e2e 窄视口 TabBar 恒可见回归锁 scrollingElement+main 双零断言）[locked-change]——票面 scripts/audits/sr2-f-05-brief.md；依赖 F-01~04（段⑤/flash 链既有形态）' },
  { id: 'SR2-F-06', file: 'src/renderer/features/reader/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页间分隔与选区不透明（b3: P7-F；验收缺陷 B+C 视觉修复——B 页盒 var(--panel) 底+0 1px 4px rgba(0,0,0,.12) 阴影渲染/占位同底消色差跳动+gap 不动；C ::selection 半透明→不透明近似色（关键实证：Chromium 不解析 ::selection 的 color-mix 行 fallback 行才是生效行故两行都改 rgb(191 191 255)——门一探查快照+变异②双证据核准）+text-layer.css 头注偏离登记；e2e reader-text.spec 新 test 自守卫（B 页盒底色/阴影/与 --bg 可辨+C ::selection 无透明分量）；单测零触碰）[locked-change]——票面 scripts/audits/sr2-f-06-brief.md；依赖 F-01~05（PageColumn 排他）' },
  { id: 'SR2-F-07', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选自绘选区+AI 层去 multiply（b3: P7-F；复测缺陷 P1 修复——F-06 不透明 ::selection 遮 canvas 字形根因推翻：pdfjs 文本层 span color:transparent 字形在下层，半透明才透字，「压白底等效色」只对纯白底成立；B 案=::selection 置 transparent（两行同值死代码收敛单行）+SelectionLayer 按 anchor.rects 自绘 30% accent 半透明选区块（z:2/pointer-events:none/禁 multiply——单层单绘根除重叠 span 逐元素叠绘；247 行触 250 拆 SelectionRects/SelectionToolbar 两件 DOM 零变化）+AiAnnotationLayer 摘容器 multiply 保 opacity:0.45（与 AnnotationLayer 层间叠乘路径清零——AI-09 起既有机制）；门一 C 项层叠链源码级三判据全过+机制三断言锁回炉（e2e computed style mixBlendMode/pointerEvents/zIndex——F-06「审色值没审机制」教训同构残余堵口）；受锁 reader-text.spec F-06 小票 C 节守卫改写（transparent+自绘层+alpha∈(0,1)）+selection-layer.test 2 it）[locked-change]——票面 scripts/audits/sr2-f-07-brief.md；依赖 F-06（推翻其 C 案）+AI-09（层链既有）' },
  { id: 'SR2-ENR-03', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'strong', status: 'done', summary: '详情面板被引数透出（b3: ENR 域；验收缺陷 D 修复——UI 透出面缺位非 bug：数据链全通（迁移 005→detailById 装配→schema optional）唯独 renderer 零引用；「期刊」与「来源」间加一行 Row（citedByCount===undefined 空→Row 自动 —；零值显示 0）；新测试 paper-detail-cited.test.tsx 3 it always-active（124/缺省 —/零值 0 边界）；shared/models 零触碰）[locked-change]（新测试入锁 143→144）——票面 scripts/audits/sr2-enr-03-brief.md；依赖 ENR-01/02 数据面' },
  { id: 'SR2-LG-06', file: 'src/renderer/features/reader/open-paper-anchor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '脉络跳转接笔记面板信号（b3: P7-H；验收缺陷 E2 修复——跳转链完整且定位成功但 OutlineAside tab 本地态不切；anchor 分支 locateAnchor 之前 req.aiNoteId 有值先发 notifyAiNoteHighlight（AI-09 全套语义复用：持久 state 切 notes tab+列表滚动高亮，tab 未开早发不丢失挂载后补切）；无锚/裸锚路径零触碰；受锁 lineage-side-panel.test 加 2 it（notify 先于 locateAnchor——invocationCallOrder 三破坏形态全红）+stub 池扩 notifyAiNoteStub）[locked-change]——票面 scripts/audits/sr2-lg-06-brief.md；依赖 LG-04 接缝（bus 载荷 aiNoteId）+AI-09 信号' },
  { id: 'SR2-LG-07', file: 'src/renderer/features/lineage/lineage-layout.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络布局非单调年份树修复+边 label 渲染（b3: P7-H；验收缺陷 E1 修复——兄弟约束仅共享年份层触发→年份-拓扑错位树（子比父早 119 年）offset 恒 0 全树退化单列；Frame 增根占位 rootLo/rootHi+兄弟约束增补 mergedRootHi+SIBLING_GAP−rootLo 下限（直接兄弟不论层必横向错开，深层不共享层仍可交错紧凑性保留）；M1 夹具四遍独立手推逐位吻合 {Brown=Reynolds=200,Cross=90,水锤史=310} 分叉可见；边 label 沿贝塞尔中点渲染（LineageEdges.tsx 拆件 61 行——Canvas 269 触 250 红线驱动；空串不渲染+data-edge-label 钩）+Board 摘预留声明；受锁 lineage-layout.test +3 it（M1 夹具/紧凑保持/跨夹具）+lineage-canvas.test 边 label it；auto-fit 观察项不做）[locked-change]——票面 scripts/audits/sr2-lg-07-brief.md；依赖 LG-02 布局件' },
  { id: 'SR2-AI-11', file: 'src/renderer/features/reader/AiNoteGroupList.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 笔记呈现轴转置（b3: P7-G；验收缺陷 F 修复——用户口径「问题一+一审:xxx。二审:xxx。裁决:xxx。」：groupNotes 按 AI_NOTE_QUESTIONS 单源序转置（{question,items}，空组剔除）+组头 QUESTION_LABEL 分色条+组内条目头 ROLE_LABEL 分段（QUESTION_LABEL 被顶替防冗余——门一核准贴口径，anchorPage/色点保留）；ROLE_LABEL 单源改值「一审/二审/裁决」（消费方两处=面板+脉络侧板——票面「三消费方」取证误差坐实，AiAnnotationLayer 仅消费 QUESTION_COLOR）；LineageSideAiNotes 同步转置不抽件（Rule of Three 维持）；shared 零触碰；受锁 3→5 扩容（门一核准必然红：lineage-side-panel.test+lineage.spec T4 接缝归责同步）；e2e ai-notes-section 2 test+lineage.spec T4 改写）[locked-change]——票面 scripts/audits/sr2-ai-11-brief.md；依赖 AI-08 分节件+AI-09 高亮' },
  { id: 'SR2-AI-12', file: 'src/renderer/features/reader/ai-note-style.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 笔记组头补原始命题（b3: P7-G；复测缺陷 P2 修复——组头仅「第N问」短标签读者对不上号，七问原始命题仓内零存在唯一源=蓝图 §4.2 表：QUESTION_TEXT 映射新增（七值机器抽取 diff 证逐字誊自蓝图；类型 Record<Exclude<AiNoteQuestion,divergence>,string>——divergence 为角色节非七问成员保持短标签，Exclude=编译器强制两消费位分歧唯一形态）+两消费位组头拼「第N问：原始命题」（AiNoteGroupList h4+LineageSideAiNotes h5——跨域单源自动同达合 INV-11）；纯 renderer 呈现面零 IPC 零 shared；受锁必然红 5 处先行留证（ai-notes-section×3+lineage-side-panel:291+e2e 两 spec）+ai-note-style.test TEXT 键集非空新 it；联审 0B/3W/5N PASS——誊录逐字性联审独立机器重演 diff 空，W3 Q4~Q7 文案持续锁定缺口记遗留池（键集断言拦键漂移不拦值漂移））[locked-change]——票面 scripts/audits/sr2-ai-12-brief.md；依赖 AI-11 转置组头位' }
] as const

export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))

export function isTicketDone(id: string): boolean {
  return TICKET_MAP.get(id)?.status === 'done'
}

export function openTickets(): Ticket[] {
  return TICKETS.filter((t) => t.status === 'open')
}
