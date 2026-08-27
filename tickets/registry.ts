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
  { id: 'SR-RDR-02', file: 'src/renderer/features/reader/PdfCanvas.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'pdf.js canvas 渲染封装（v4 API）' },
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
  { id: 'SR2-AI-08', file: 'src/renderer/features/reader/AiNotesSection.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '笔记面板 AI 面（role×question 分节+ai-note-style 七问分色单源+只读+「AI 正在读」状态行六态机+「AI 读文献」按钮写 job+待导入按钮）' },
  { id: 'SR2-AI-09', file: 'src/renderer/features/reader/AiAnnotationLayer.tsx', area: 'reader', owner: 'strong', status: 'open', summary: 'AI 标注渲染对等（verifyQuote 重锚同几何管线/存储独立 INV-19/v1 只读/点击高亮跳面板/anchor-locate exact 层延展 data-ai-note-id）' },
  { id: 'SR2-AI-10', file: 'src/renderer/features/settings/ZcodeLinkSection.tsx', area: 'settings-ui', owner: 'strong', status: 'open', summary: '设置页 zcode 联动（检测五态三档 fs 纯检测+一键装技能 fs 复制+心跳=06 单源；不代启会话 INV-21 e2e 断言）' }
] as const

export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))

export function isTicketDone(id: string): boolean {
  return TICKET_MAP.get(id)?.status === 'done'
}

export function openTickets(): Ticket[] {
  return TICKETS.filter((t) => t.status === 'open')
}
