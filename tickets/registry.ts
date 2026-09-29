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
  | 'workspaces'

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
  { id: 'SR-INFRA-01', file: 'src/main/db/connection.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'SQLite 连接单例与 pragma（全案=tickets/archive/SR-INFRA-01.md）' },
  { id: 'SR-INFRA-02', file: 'src/main/db/fts.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'FTS5 查询转义工具（全案=tickets/archive/SR-INFRA-02.md）' },
  { id: 'SR-INFRA-03', file: 'src/main/db/migrate.ts', area: 'infra', owner: 'strong', status: 'done', summary: '追加式迁移执行器（全案=tickets/archive/SR-INFRA-03.md）' },
  { id: 'SR-INFRA-04', file: 'src/main/services/import_/file-store.ts', area: 'infra', owner: 'strong', status: 'done', summary: '受管文件存储（sha256 去重+路径净化）（全案=tickets/archive/SR-INFRA-04.md）' },
  { id: 'SR-INFRA-05', file: 'src/main/http/http-client.ts', area: 'infra', owner: 'strong', status: 'done', summary: '出网客户端（host 白名单+超时+退避）（全案=tickets/archive/SR-INFRA-05.md）' },
  { id: 'SR-INFRA-06', file: 'src/main/security/csp.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'CSP 策略注入（全案=tickets/archive/SR-INFRA-06.md）' },
  { id: 'SR-INFRA-07', file: 'src/main/security/shell-guard.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'openExternal 外链白名单守卫（全案=tickets/archive/SR-INFRA-07.md）' },
  { id: 'SR-INFRA-08', file: 'src/main/protocol/app-file.protocol.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'app-file:// 受管文件协议（全案=tickets/archive/SR-INFRA-08.md）' },
  { id: 'SR-INFRA-09', file: 'src/main/windows/main-window.ts', area: 'infra', owner: 'strong', status: 'done', summary: '主窗口与安全 webPreferences（全案=tickets/archive/SR-INFRA-09.md）' },
  { id: 'SR-INFRA-10', file: 'src/main/windows/window-state.ts', area: 'infra', owner: 'strong', status: 'done', summary: '窗口位置记忆（全案=tickets/archive/SR-INFRA-10.md）' },
  { id: 'SR-INFRA-11', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '组装根（依赖注入点）（全案=tickets/archive/SR-INFRA-11.md）' },
  { id: 'SR-INFRA-12', file: 'src/main/ipc/register.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'IPC 统一注册（zod 校验→service→Result）（全案=tickets/archive/SR-INFRA-12.md）' },
  { id: 'SR-INFRA-13', file: 'src/preload/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'contextBridge 白名单 API（全案=tickets/archive/SR-INFRA-13.md）' },
  { id: 'SR-INFRA-14', file: 'src/renderer/api/client.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'renderer 侧 IPC 客户端（全案=tickets/archive/SR-INFRA-14.md）' },
  { id: 'SR-INFRA-15', file: 'src/main/dialogs.ts', area: 'infra', owner: 'strong', status: 'done', summary: '系统对话框注入（可测试）（全案=tickets/archive/SR-INFRA-15.md）' },
  { id: 'SR-INFRA-16', file: 'src/main/services/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: '服务装配桶（全案=tickets/archive/SR-INFRA-16.md）' },
  { id: 'SR-INFRA-17', file: 'src/main/ipc/index.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'IPC 装配桶（对话框/事件胶水）（全案=tickets/archive/SR-INFRA-17.md）' },

  // ── ipc 薄分发层（weak）────────────────────────────────────────
  { id: 'SR-IPC-01', file: 'src/main/ipc/library.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '文献库域 handler（list/detail/update-meta/collections）（全案=tickets/archive/SR-IPC-01.md）' },
  { id: 'SR-IPC-02', file: 'src/main/ipc/reader.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '阅读器域 handler（open/标注读写/进度）（全案=tickets/archive/SR-IPC-02.md）' },
  { id: 'SR-IPC-03', file: 'src/main/ipc/notes.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '笔记域 handler（全案=tickets/archive/SR-IPC-03.md）' },
  { id: 'SR-IPC-04', file: 'src/main/ipc/tags.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '标签域 handler（全案=tickets/archive/SR-IPC-04.md）' },
  { id: 'SR-IPC-05', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '导入域 handler（对话框令牌）（全案=tickets/archive/SR-IPC-05.md）' },
  { id: 'SR-IPC-06', file: 'src/main/ipc/enrich.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '元数据增强 handler（手动触发）（全案=tickets/archive/SR-IPC-06.md）' },
  { id: 'SR-IPC-07', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '导出域 handler（BibTeX/CSV/报告）（全案=tickets/archive/SR-IPC-07.md）' },
  { id: 'SR-IPC-08', file: 'src/main/ipc/settings.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '设置域 handler（含网络诊断）（全案=tickets/archive/SR-IPC-08.md）' },
  { id: 'SR-IPC-09', file: 'src/main/ipc/system.ts', area: 'ipc', owner: 'weak', status: 'done', summary: '系统域 handler（外链守卫打开）（全案=tickets/archive/SR-IPC-09.md）' },

  // ── repos 数据访问层（weak）─────────────────────────────────────
  { id: 'SR-DB-01', file: 'src/main/db/repos/papers.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'papers 表仓储（含 FTS 联查）（全案=tickets/archive/SR-DB-01.md）' },
  { id: 'SR-DB-02', file: 'src/main/db/repos/annotations.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'annotations 表仓储（全案=tickets/archive/SR-DB-02.md）' },
  { id: 'SR-DB-03', file: 'src/main/db/repos/notes.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'notes 表仓储（含 FTS）（全案=tickets/archive/SR-DB-03.md）' },
  { id: 'SR-DB-04', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'tags/paper_tags 仓储（全案=tickets/archive/SR-DB-04.md）' },
  { id: 'SR-DB-05', file: 'src/main/db/repos/collections.repo.ts', area: 'db', owner: 'weak', status: 'done', summary: 'collections/paper_collections 仓储（全案=tickets/archive/SR-DB-05.md）' },

  // ── services 业务层（weak）──────────────────────────────────────
  { id: 'SR-SVC-01', file: 'src/main/services/library.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '文献库用例：列表筛选/详情聚合/元数据编辑（全案=tickets/archive/SR-SVC-01.md）' },
  { id: 'SR-SVC-02', file: 'src/main/services/reader.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '阅读用例：取文件引用/标注读写/进度（全案=tickets/archive/SR-SVC-02.md）' },
  { id: 'SR-SVC-03', file: 'src/main/services/import_/import.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '导入编排：对话框→file-store→抽取→入库（全案=tickets/archive/SR-SVC-03.md）' },
  { id: 'SR-SVC-04', file: 'src/main/services/import_/pdf-meta.extract.ts', area: 'service', owner: 'weak', status: 'done', summary: 'PDF 内嵌元数据与 DOI 抽取（纯函数）（全案=tickets/archive/SR-SVC-04.md）' },
  { id: 'SR-SVC-05', file: 'src/main/services/enrich/enrich.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '增强编排：DOI/标题→provider→回写（全案=tickets/archive/SR-SVC-05.md）' },
  { id: 'SR-SVC-06', file: 'src/main/services/export_/export.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '导出编排：对话框→序列化→写文件（全案=tickets/archive/SR-SVC-06.md）' },
  { id: 'SR-SVC-07', file: 'src/main/services/export_/bibtex.serializer.ts', area: 'service', owner: 'weak', status: 'done', summary: 'BibTeX 转义与序列化（纯函数）（全案=tickets/archive/SR-SVC-07.md）' },
  { id: 'SR-SVC-08', file: 'src/main/services/export_/markdown.report.ts', area: 'service', owner: 'weak', status: 'done', summary: '高亮+笔记→Markdown 读书报告（纯函数）（全案=tickets/archive/SR-SVC-08.md）' },
  { id: 'SR-SVC-09', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '标签用例（薄透传）（全案=tickets/archive/SR-SVC-09.md）' },
  { id: 'SR-SVC-10', file: 'src/main/services/notes.service.ts', area: 'service', owner: 'weak', status: 'done', summary: '笔记用例（含 NOT_FOUND 判定）（全案=tickets/archive/SR-SVC-10.md）' },

  // ── 开放 API providers（weak）───────────────────────────────────
  { id: 'SR-NET-01', file: 'src/main/services/enrich/providers/crossref.ts', area: 'network', owner: 'weak', status: 'done', summary: 'CrossRef REST 封装（全案=tickets/archive/SR-NET-01.md）' },
  { id: 'SR-NET-02', file: 'src/main/services/enrich/providers/openalex.ts', area: 'network', owner: 'weak', status: 'done', summary: 'OpenAlex REST 封装（全案=tickets/archive/SR-NET-02.md）' },
  { id: 'SR-NET-03', file: 'src/main/services/enrich/providers/arxiv.ts', area: 'network', owner: 'weak', status: 'done', summary: 'arXiv API 封装（全案=tickets/archive/SR-NET-03.md）' },

  // ── reader 强模型模块（strong-open，Phase 3 决策门后实现）──────────
  { id: 'SR-RDR-01', file: 'src/renderer/features/reader/anchors/annotation-anchor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '文本偏移↔DOM 定位纯函数（WADM 思路）（全案=tickets/archive/SR-RDR-01.md）' },
  { id: 'SR-RDR-02', file: 'src/renderer/features/reader/view/PdfPageCanvas.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'pdf.js canvas 渲染封装（原 PdfCanvas 经 SR2-F-01 拆分，注册文件随直系继承者迁移）（全案=tickets/archive/SR-RDR-02.md）' },
  { id: 'SR-RDR-03', file: 'src/renderer/features/reader/view/TextLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '官方 TextLayer CSS 接线（全案=tickets/archive/SR-RDR-03.md）' },

  // ── renderer UI（weak）─────────────────────────────────────────
  { id: 'SR-RDR-04', file: 'src/renderer/features/reader/view/ReaderPage.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器页面组装（多 tab）（全案=tickets/archive/SR-RDR-04.md）' },
  { id: 'SR-RDR-05', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '文本选择→定位器交互层（全案=tickets/archive/SR-RDR-05.md）' },
  { id: 'SR-RDR-06', file: 'src/renderer/features/reader/view/AnnotationLayer.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '标注渲染与命中层（全案=tickets/archive/SR-RDR-06.md）' },
  { id: 'SR-RDR-07', file: 'src/renderer/features/reader/view/ReaderToolbar.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器工具栏（全案=tickets/archive/SR-RDR-07.md）' },
  { id: 'SR-RDR-08', file: 'src/renderer/features/reader/panels/OutlinePanel.tsx', area: 'reader', owner: 'weak', status: 'done', summary: '目录/缩略图侧栏（全案=tickets/archive/SR-RDR-08.md）' },
  { id: 'SR-RDR-09', file: 'src/renderer/features/reader/state/reader.store.ts', area: 'reader', owner: 'weak', status: 'done', summary: '阅读器状态（打开文档/页码/缩放）（全案=tickets/archive/SR-RDR-09.md）' },
  { id: 'SR-LIB-01', file: 'src/renderer/features/library/LibraryPage.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献库页面组装（全案=tickets/archive/SR-LIB-01.md）' },
  { id: 'SR-LIB-02', file: 'src/renderer/features/library/PaperList.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献虚拟列表（全案=tickets/archive/SR-LIB-02.md）' },
  { id: 'SR-LIB-03', file: 'src/renderer/features/library/PaperRow.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献行组件（全案=tickets/archive/SR-LIB-03.md）' },
  { id: 'SR-LIB-04', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献详情侧栏（全案=tickets/archive/SR-LIB-04.md）' },
  { id: 'SR-LIB-05', file: 'src/renderer/features/library/FilterBar.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '搜索与筛选栏（全案=tickets/archive/SR-LIB-05.md）' },
  { id: 'SR-LIB-06', file: 'src/renderer/features/library/ImportDropZone.tsx', area: 'library-ui', owner: 'weak', status: 'done', summary: '导入入口（拖拽+按钮）（全案=tickets/archive/SR-LIB-06.md）' },
  { id: 'SR-LIB-07', file: 'src/renderer/features/library/library.store.ts', area: 'library-ui', owner: 'weak', status: 'done', summary: '文献库状态（列表/筛选/选中）（全案=tickets/archive/SR-LIB-07.md）' },
  { id: 'SR-NOTE-01', file: 'src/renderer/shared/save-status.ts', area: 'notes-ui', owner: 'weak', status: 'done', summary: '笔记保存状态推导（save-status 下沉 shared；面板本体随 C-06 下线——文件登记随契约迁移）（全案=tickets/archive/SR-NOTE-01.md）' },
  { id: 'SR-NOTE-02', file: 'src/renderer/features/notes/notes.store.ts', area: 'notes-ui', owner: 'weak', status: 'done', summary: '笔记状态（全案=tickets/archive/SR-NOTE-02.md）' },
  { id: 'SR-TAG-01', file: 'src/renderer/features/tags/TagEditor.tsx', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签编辑器（全案=tickets/archive/SR-TAG-01.md）' },
  { id: 'SR-TAG-02', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签筛选器（全案=tickets/archive/SR-TAG-02.md）' },
  { id: 'SR-TAG-03', file: 'src/renderer/features/tags/tags.store.ts', area: 'tags-ui', owner: 'weak', status: 'done', summary: '标签状态（全案=tickets/archive/SR-TAG-03.md）' },
  { id: 'SR-SET-01', file: 'src/renderer/features/settings/SettingsPage.tsx', area: 'settings-ui', owner: 'weak', status: 'done', summary: '设置页（含网络行为披露）（全案=tickets/archive/SR-SET-01.md）' },
  { id: 'SR-SET-02', file: 'src/renderer/features/settings/settings.store.ts', area: 'settings-ui', owner: 'weak', status: 'done', summary: '设置状态（全案=tickets/archive/SR-SET-02.md）' },
  { id: 'SR-UI-01', file: 'src/renderer/shared/ui/Button.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: '按钮组件（全案=tickets/archive/SR-UI-01.md）' },
  { id: 'SR-UI-02', file: 'src/renderer/shared/ui/Dialog.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: '对话框组件（全案=tickets/archive/SR-UI-02.md）' },
  { id: 'SR-UI-03', file: 'src/renderer/shared/ui/Toast.tsx', area: 'ui-kit', owner: 'weak', status: 'done', summary: 'Toast 通知组件（全案=tickets/archive/SR-UI-03.md）' },
  { id: 'SR-HK-01', file: 'src/renderer/shared/hooks/useAsync.ts', area: 'hooks', owner: 'weak', status: 'done', summary: '异步调用 hook（全案=tickets/archive/SR-HK-01.md）' },
  { id: 'SR-HK-02', file: 'src/renderer/shared/hooks/useDebounce.ts', area: 'hooks', owner: 'weak', status: 'done', summary: '防抖 hook（全案=tickets/archive/SR-HK-02.md）' },

  // ── Phase 6 打包分发（strong，2026-08-22 开单）───────────────────
  { id: 'SR-PKG-01', file: 'electron-builder.yml', area: 'infra', owner: 'strong', status: 'done', summary: 'electron-builder NSIS 打包配置与 dist 编排（绑定预置/electronDist 复用/镜像下载）（全案=tickets/archive/SR-PKG-01.md）' },
  { id: 'SR-PKG-02', file: 'scripts/installer-smoke.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '安装包冒烟：静默装→沙箱启动→存活断言→静默卸载（全案=tickets/archive/SR-PKG-02.md）' },

  // ── Phase 7 v2（strong，2026-08-23 B3 裁决后开单，b3 指针见各工单文件头）──
  // 领取纪律：按依赖序逐单领取逐单提交（KEY-01→KEY-02→ANNO-01/UIK-01），
  // 每单独立 verify+审查+翻状态；禁同批多单（AGENTS「只改这一个文件」条款）
  { id: 'SR2-KEY-01', file: 'src/renderer/shared/keymap.ts', area: 'hooks', owner: 'strong', status: 'done', summary: 'keymap 键盘快捷键单例（注册/注销成对+editable 避让）（全案=tickets/archive/SR2-KEY-01.md）' },
  { id: 'SR2-KEY-02', file: 'src/renderer/features/reader/view/ReaderShortcuts.ts', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器快捷键+ctrl 滚轮缩放（挂 keymap，翻页键位映射表）（全案=tickets/archive/SR2-KEY-02.md）' },
  { id: 'SR2-ANNO-01', file: 'src/renderer/features/reader/view/AnnotationMenu.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '标注四选项菜单（复制引文/删除/添加笔记/取消）（全案=tickets/archive/SR2-ANNO-01.md）' },
  { id: 'SR2-UIK-01', file: 'src/renderer/shared/ui/SplitPane.tsx', area: 'ui-kit', owner: 'strong', status: 'done', summary: '可拖拽分隔条容器（宽度持久化 localStorage）（全案=tickets/archive/SR2-UIK-01.md）' },
  // ── Phase 7-B 多标签+同步状态投影（strong，2026-08-24 链条核查后开单；依赖序
  //    TABS-01→02→03→04，UNDO-01 依赖 TABS-01（closeTab 清理接缝）可与 02/03/04
  //    并行；每单独立 verify+审查+翻状态，禁同批多单）──
  { id: 'SR2-TABS-01', file: 'src/renderer/features/reader/state/reader.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'reader.store per-tab 多文献字典重构（tab 生命周期状态机+竞态守卫 per-tab 化）（全案=tickets/archive/SR2-TABS-01.md）' },
  { id: 'SR2-TABS-02', file: 'src/renderer/features/reader/view/TabBar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器多标签栏（order/activeId 消费，loading/error 态，关闭叉）（全案=tickets/archive/SR2-TABS-02.md）' },
  { id: 'SR2-TABS-03', file: 'src/renderer/features/reader/state/tab-dirty.ts', area: 'reader', owner: 'strong', status: 'done', summary: '灰点信号聚合（annotations 失败+notes pending 两写面→tab dirty 投影）（全案=tickets/archive/SR2-TABS-03.md）' },
  { id: 'SR2-TABS-04', file: 'src/main/windows/main-window.ts', area: 'infra', owner: 'strong', status: 'done', summary: '退出拦截（close preventDefault+dirty 上报通道+二次确认）（全案=tickets/archive/SR2-TABS-04.md）' },
  { id: 'SR2-UNDO-01', file: 'src/renderer/features/reader/state/annotation-undo.ts', area: 'reader', owner: 'strong', status: 'done', summary: '标注操作级撤销栈（create/delete/comment-edit 逆操作，per-tab）（全案=tickets/archive/SR2-UNDO-01.md）' },

  // ── Phase 7-C 笔记结构化重构（strong，2026-08-26 开单；b3 指针=B3 裁决 1（α
  //    双层）/3（DB 真相源+md 投影）+ROADMAP P7-C N1 增补块（蓝图 §4.3）；验收细目
  //    =ADR-0011 v1.1；依赖=偏序（02/03 仅依赖 01；04 依赖 03；05/06 依赖 04），
  //    执行按号序串行领取逐单提交（禁同批多单——AGENTS「只改这一个文件」条款）──
  { id: 'SR2-C-01', file: 'src/shared/annotation-order.ts', area: 'infra', owner: 'strong', status: 'done', summary: '片段序单源纯函数（页→页内偏移→创建序→id 全序；排序禁字符串字典序）（全案=tickets/archive/SR2-C-01.md）' },
  { id: 'SR2-C-02', file: 'src/main/services/export_/corpus.assemble.ts', area: 'service', owner: 'strong', status: 'done', summary: 'corpus md 装配纯函数（ADR-0011 v1.1 口径）+单篇/全库导出通道与入口（全案=tickets/archive/SR2-C-02.md）' },
  { id: 'SR2-C-03', file: 'src/renderer/features/reader/panels/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器笔记面板（总评层+片段层；save-status 下沉 shared；ADR-0008 五模块不动）（全案=tickets/archive/SR2-C-03.md）' },
  { id: 'SR2-C-04', file: 'src/renderer/features/reader/panels/OutlineAside.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '侧栏三栏宿主（目录/缩略图/笔记 tablist+OutlinePanel mode 化+ReaderPage props 削减）（全案=tickets/archive/SR2-C-04.md）' },
  { id: 'SR2-C-05', file: 'src/renderer/features/reader/anchors/anchor-locate.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'N1 锚点定位服务（INV-20 三层防线 exact/page/paper 单入口+标注单击反向同步）（全案=tickets/archive/SR2-C-05.md）' },
  { id: 'SR2-C-06', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'strong', status: 'done', summary: '库侧笔记编辑面下线（NotesPanel 删除+「去阅读器写笔记」入口——方案切换=删除旧方案）（全案=tickets/archive/SR2-C-06.md）' },

  // ── Phase 7-G AI 传感器链条应用面第一批（strong，2026-08-27 开单；b3 指针
  //    =B3 增量裁决 D1-D6+七问 v1+第四轮增容（蓝图 §4.3/ADR-0015）；母本
  //    =ai-module-plan v1.1 §4+ai-plan-review §5/§6（定稿增补+会话状态机表）；
  //    契约=ADR-0011 v1.1 五件套；INV-16/17/18 预登记随 02/03/04 锚定；依赖
  //    =偏序（02 依赖 01；03 依赖 02；04 依赖 03；05 依赖 03——目录契约），
  //    执行按号序串行领取逐单提交（禁同批多单）──
  { id: 'SR2-AI-01', file: 'src/main/db/repos/ai_notes.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: 'ai_notes 数据基座（迁移 003+repo：一行一锚定段粒度；v1 无生产者声明）（全案=tickets/archive/SR2-AI-01.md）' },
  { id: 'SR2-AI-02', file: 'src/renderer/features/reader/state/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '全文/图提取器（pdfjs 白名单 INV-16+自持文档生命周期+事件桥单向+逐页背压）（全案=tickets/archive/SR2-AI-02.md）' },
  { id: 'SR2-AI-03', file: 'src/main/services/export_/corpus.export.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '五件套导出会话（manifest 终局单写+单飞 EXPORT_BUSY INV-18+幂等 sha INV-17）（全案=tickets/archive/SR2-AI-03.md）' },
  { id: 'SR2-AI-04', file: 'src/renderer/features/settings/CorpusExportSection.tsx', area: 'settings-ui', owner: 'strong', status: 'done', summary: '设置页 AI 语料导出节（进度行+单飞 disabled+App 层事件桥 INV-14+e2e 全链含中断重跑）（全案=tickets/archive/SR2-AI-04.md）' },
  { id: 'SR2-AI-05', file: 'tools/ai-sensor/queue.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'zcode 工具骨架（SKILL.md+config.template+queue 断点续跑幂等；config gitignore）（全案=tickets/archive/SR2-AI-05.md）' },

  // ── Phase 7-G AI 回灌与联动第二批（strong，2026-08-27 开单；b3 指针
  //    =第四轮增容裁决（蓝图 §4.3 E1~E7/N1~N4+ADR-0015）；契约=ADR-0015
  //    五节+queue/SKILL 既有工具面（AI-05 交付）；INV-19（随 09）/21（随 10）
  //    预登记随单锚定+INV-20 消费方级用例随 08 补（exact 层延展用例随 09）；依赖=偏序（06→07→08→09；
  //    10 依赖 06），执行按号序串行领取逐单提交（禁同批多单）；08→09 定序
  //    依据=09 硬依赖 08 两交付物（ai-note-style 分色单源+ai-notes.store
  //    数据单源——v5「08∥09」偏序经 plan 门细化）──
  { id: 'SR2-AI-06', file: 'src/main/services/ai_sensor/ai-sensor.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '伴随进程文件协议（job 原子写幂等+status 心跳判活单源；应用永不 spawn INV-21）（全案=tickets/archive/SR2-AI-06.md）' },
  { id: 'SR2-AI-07', file: 'src/main/services/ai_sensor/ai-notes-import.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '回灌导入器（ai-notes/import+list 通道；幂等=archive 账本 sha 去重；工具永不写 DB）（全案=tickets/archive/SR2-AI-07.md）' },
  { id: 'SR2-AI-08', file: 'src/renderer/features/reader/panels/AiNotesSection.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '笔记面板 AI 面（role×question 分节+七问分色单源+「AI 正在读」六态机）（全案=tickets/archive/SR2-AI-08.md）' },
  { id: 'SR2-AI-09', file: 'src/renderer/features/reader/view/AiAnnotationLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 标注渲染对等（verifyQuote 重锚同几何管线/存储独立 INV-19/v1 只读）（全案=tickets/archive/SR2-AI-09.md）' },
  { id: 'SR2-AI-10', file: 'src/renderer/features/settings/ZcodeLinkSection.tsx', area: 'settings-ui', owner: 'strong', status: 'done', summary: '设置页 zcode 联动（检测五态三档+一键装技能+心跳单源；不代启会话 INV-21 e2e 断言）（全案=tickets/archive/SR2-AI-10.md）' },

  // ── Phase 7-H 发展脉络图（strong，2026-08-27 开单；b3 指针=蓝图 §4.3
  //    第四轮裁决 E3/E4/E5+ADR-0014（lineage 数据模型与图形态边界）；
  //    契约=ADR-0014 §数据模型 DDL 字面+E3 形态（v1 时间树单父/v2 DAG
  //    升版条件）；INV-27（树单父 service 层不变量）随 01 登记；依赖
  //    =P7-G AI-06~10 已清（节点 core idea 数据面）+P7-C N1（INV-20 跳转）
  //    +AI-09 exact 层延展（data-ai-note-id）+P7-F 几何（F-aware 接口
  //    已冻结——anchor-locate 延展面就位，非阻塞）；偏序（02 依赖 01 通道+模型；
  //    03 依赖 02 画布/store；04 依赖 03 选择上抛面；05 依赖全组），执行
  //    按号序串行领取逐单提交（禁同批多单）──
  { id: 'SR2-LG-01', file: 'src/main/db/repos/lineage.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: '脉络数据基座（迁移 004 ADR-0014 DDL+repo+草稿导入全有或全无替换式；树单父 INV-27）（全案=tickets/archive/SR2-LG-01.md）' },
  { id: 'SR2-LG-02', file: 'src/renderer/features/lineage/lineage-timeline.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '布局纯函数+只读 SVG 画布 pan/zoom（y 年份分层+Reingold-Tilford；T3-P6 后指针迁 lineage-timeline.ts）（全案=tickets/archive/SR2-LG-02.md）' },
  { id: 'SR2-LG-03', file: 'src/renderer/features/lineage/LineageBoard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络交互编辑（拖拽 x/y 覆盖+加删节点边改父+树约束 UI 守卫 INV-27+自动保存）（全案=tickets/archive/SR2-LG-03.md）' },
  { id: 'SR2-LG-04', file: 'src/renderer/features/lineage/LineageSidePanel.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '节点侧板（元信息+core idea+AI/人工笔记分节）+笔记双击跳阅读器（OPEN_PAPER_EVENT）（全案=tickets/archive/SR2-LG-04.md）' },
  { id: 'SR2-LG-05', file: 'tests/e2e/lineage.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: '脉络 e2e 全链（导入→渲染真实文本→拖拽持久→树拒绝→侧板→双击跳转→退出拦截）（全案=tickets/archive/SR2-LG-05.md）' },
  { id: 'SR2-ENR-01', file: 'src/main/services/enrich/cited-by.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '含金量抓取缓存（迁移 005 papers 三可空列+citedByPatch 强制刷新纯函数；契约零触碰）（全案=tickets/archive/SR2-ENR-01.md）' },
  { id: 'SR2-ENR-02', file: 'src/shared/venue-tier.ts', area: 'service', owner: 'strong', status: 'done', summary: 'venueTier 映射与装配（三档种子表 venueToTier+可选字段两形装配；依赖 ENR-01 数据面）（全案=tickets/archive/SR2-ENR-02.md）' },
  { id: 'SR2-F-01', file: 'src/renderer/features/reader/view/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页列几何与懒渲染回收（占位盒+视口±1 渲染+离屏回收+PdfCanvas 拆分旧删）（全案=tickets/archive/SR2-F-01.md）' },
  { id: 'SR2-F-02', file: 'src/renderer/features/reader/anchors/anchor-locate.ts', area: 'reader', owner: 'strong', status: 'done', summary: '四层多页化收口与跳页兼容（verifyWhenReady 页限定+跨页选区拒绝；locateAnchor 签名零触碰）（全案=tickets/archive/SR2-F-02.md）' },
  { id: 'SR2-F-03', file: 'src/renderer/features/reader/view/scroll-progress.ts', area: 'reader', owner: 'strong', status: 'done', summary: '滚动进度回写恢复与键位迁移（六态状态机——writing 用 scroll none 防回弹+用户接管三类信号）（全案=tickets/archive/SR2-F-03.md）' },
  { id: 'SR2-F-04', file: 'tests/e2e/reader-scroll.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: '缩放重定义与收官 e2e（zoom 视口中心保持纯函数+收官全链 spec）（全案=tickets/archive/SR2-F-04.md）' },
  { id: 'SR2-F-05', file: 'src/renderer/features/reader/state/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: '程序滚动单容器收敛（scrollIntoNearestScroller 最近滚动祖先差值法替换原生 scrollIntoView）（全案=tickets/archive/SR2-F-05.md）' },
  { id: 'SR2-F-06', file: 'src/renderer/features/reader/view/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页间分隔与选区不透明（页盒 panel 底+阴影渲染；::selection 半透明改不透明近似色）（全案=tickets/archive/SR2-F-06.md）' },
  { id: 'SR2-F-07', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选自绘选区+AI 层去 multiply（::selection 置 transparent+自绘 30% accent 半透明选区块）（全案=tickets/archive/SR2-F-07.md）' },
  { id: 'SR2-ENR-03', file: 'src/renderer/features/library/PaperDetailPanel.tsx', area: 'library-ui', owner: 'strong', status: 'done', summary: '详情面板被引数透出（UI 透出面补位：citedByCount 空显 —/零值显 0；新测试 3 it always-active）（全案=tickets/archive/SR2-ENR-03.md）' },
  { id: 'SR2-LG-06', file: 'src/renderer/features/reader/anchors/open-paper-anchor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '脉络跳转接笔记面板信号（req.aiNoteId 有值先发 notifyAiNoteHighlight——AI-09 语义复用）（全案=tickets/archive/SR2-LG-06.md）' },
  { id: 'SR2-LG-07', file: 'src/renderer/features/lineage/lineage-timeline.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络布局非单调年份树修复+边 label 渲染（Frame 增根占位+兄弟约束增补；T3-P6 后指针迁 lineage-timeline.ts）（全案=tickets/archive/SR2-LG-07.md）' },
  { id: 'SR2-LG-08', file: 'src/renderer/features/lineage/LineageSidePanel.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络跳转挂载时序竞态修复（根因=ReaderPage 挂载效应闩锁消费先于监听器注册——事件自丢失）（全案=tickets/archive/SR2-LG-08.md）' },
  { id: 'R1-WS1', file: 'src/main/services/workspaces/workspace.service.ts', area: 'workspaces', owner: 'strong', status: 'done', summary: '课题域库级隔离地基（ADR-0018：userData/workspaces/<id>/ 各含 synapse.db+files/；装配容器化热换）（全案=tickets/archive/R1-WS1.md）' },
  { id: 'R1-WS2', file: 'src/renderer/features/workspaces/workspace.store.ts', area: 'workspaces', owner: 'strong', status: 'done', summary: '课题切换器渲染层（切课题=dirty 确认→IPC switch→location.reload 全新 stores 零 stale）（全案=tickets/archive/R1-WS2.md）' },
  { id: 'R3-TH1', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: '视觉系统主题基建（theme.css v2 旧 9 键换值+新增 27 键；token 终值单源=mockup :root）（全案=tickets/archive/R3-TH1.md）' },
  { id: 'R2-LG9', file: 'src/renderer/features/lineage/LineageTimeline.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络命之座星象板视觉重制（T3-P6 时间线方案切换整族退役，file 指针仅满足存在性）（全案=tickets/archive/R2-LG9.md）' },
  { id: 'R2-LG10', file: 'src/renderer/features/lineage/LineageTimeline.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络布局收官（auto-fit 观察项转正+层带标可见性；T3-P6 后整族退役指针迁 LineageTimeline.tsx）（全案=tickets/archive/R2-LG10.md）' },
  { id: 'R3-LIB', file: 'src/renderer/features/library/library.css', area: 'library-ui', owner: 'strong', status: 'done', summary: '文献库视觉重制（行→卡片网格+材质三件套+hover 金 hairline+衬线年份）（全案=tickets/archive/R3-LIB.md）' },
  { id: 'R3-RDRSET', file: 'src/renderer/features/settings/SettingsSection.tsx', area: 'settings-ui', owner: 'strong', status: 'done', summary: '阅读器周边+设置页视觉（ReaderToolbar 玻璃浮层+TabBar active 金底缘+金缘 tab）（全案=tickets/archive/R3-RDRSET.md）' },
  { id: 'SR2-AI-11', file: 'src/renderer/features/reader/panels/AiNoteGroupList.tsx', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 笔记呈现轴转置（groupNotes 按七问序转置+组头分色条+ROLE_LABEL「一审/二审/裁决」）（全案=tickets/archive/SR2-AI-11.md）' },
  { id: 'SR2-AI-12', file: 'src/renderer/features/reader/anchors/ai-note-style.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AI 笔记组头补原始命题（QUESTION_TEXT 七值机器抽取誊自蓝图+组头拼「第N问：原始命题」）（全案=tickets/archive/SR2-AI-12.md）' },
  { id: 'SR2-F-08', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选视觉反馈回退官方原生半透明（::selection 回官方 rgba(0 0 255/0.25)+删 SelectionRects 整件）（全案=tickets/archive/SR2-F-08.md）' },
  { id: 'SR2-F-09', file: 'src/renderer/features/reader/view/text-layer.css', area: 'reader', owner: 'strong', status: 'done', summary: '划选选中色改灰（仿 WPS：rgba(0 0 255/0.25)→rgba(0 0 0/0.30)；用户指令偏离官方值显式登记）（全案=tickets/archive/SR2-F-09.md）' },
  { id: 'R2-LG11', file: 'src/renderer/features/lineage/LineageTimeline.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络重制浅色严谨板（星象板方向否决后的修正延续；T3-P6 后指针迁 LineageTimeline.tsx）（全案=tickets/archive/R2-LG11.md）' },
  { id: 'R2-LG12', file: 'src/main/services/lineage/lineage.service.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '综述多参考边数据面（lineageEdge 增 kind 枚举 tree/ref 两值+迁移 006+service 受控豁免分支）（全案=tickets/archive/R2-LG12.md）' },
  { id: 'R2-SH1', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '应用重命名 Synapse Remake→Synapse+userData 数据迁移（productName 派生目录搬迁复用 WS1 幂等模式）（全案=tickets/archive/R2-SH1.md）' },
  { id: 'R2-SH2', file: 'src/renderer/app/App.tsx', area: 'infra', owner: 'strong', status: 'done', summary: '顶栏身份区+字体衬线消费清零（App 壳 header 条 44px+侧栏品牌行删+--font-display 消费清零）（全案=tickets/archive/R2-SH2.md）' },
  { id: 'F-R2', file: 'src/renderer/features/reader/state/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'ui-scale≠1 程序滚动落点漂移修复（gBCR 视觉差值算术折算 effectiveZoom 单源；真机复验基线级）（全案=tickets/archive/F-R2.md）' },
  { id: 'P7A', file: 'tests/e2e/reader-text.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: 'P7-A 剪贴板竞态 flake 专项（清场标记+条件重读 5×200ms；断言锚不放宽；连跑 3 次全绿）（全案=tickets/archive/P7A.md）' },
  { id: 'F-R3', file: 'src/renderer/features/reader/state/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-1 修票（P6 泄漏闭：settleLoadTask 纯函数——加载失败 destroy 恰一次；上游查证在档）（全案=tickets/archive/F-R3.md）' },
  { id: 'P7E-01', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: '标签生命周期（改名/合并/删除——repo 四方法含跨表事务+三 IPC 通道+TagFilter 右键管理面）（全案=tickets/archive/P7E-01.md）' },
  { id: 'P7E-02', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '拖拽导入（fromPaths 通道对 renderer 隐藏+apiDrag 桥 webUtils 解析+planDroppedImports 三滤）（全案=tickets/archive/P7E-02.md）' },
  { id: 'B7', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'tags upsert 纯空格名空判守卫（对齐 rename 先例 trim 空 INVALID_REQUEST；先红 2/绿 3/变异红证）（全案=tickets/archive/B7.md）' },
  { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'notes 防抖悬置写三件套（discard API+in-flight 代际守卫+tab 关闭路径弃改收口接线）（全案=tickets/archive/C-A3.md）' },
  { id: 'P7E-03', file: 'src/renderer/features/reader/view/ReaderToolbar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页内高亮搜索（索引全文档+高亮仅渲染窗口+代际守卫；数量不符降级零高亮只计数）（全案=tickets/archive/P7E-03.md）' },
  { id: 'P7E-04', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '导出剪贴板（单通道 format bibtex/csv+main 侧构建 main 侧写——内容不过 renderer）（全案=tickets/archive/P7E-04.md）' },
  { id: 'P7E-05', file: 'src/main/services/reader.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '阅读时长统计（搭车 saveProgress 单通道+008 迁移+复合 flusher+ready×visible 双计时门）（全案=tickets/archive/P7E-05.md）' },
  { id: 'P7E-06', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'strong', status: 'done', summary: '标签多选过滤（AND 交集+tagIds 数组+逐标签 EXISTS 参数绑定+INV-53 多选适配）（全案=tickets/archive/P7E-06.md）' },
  { id: 'P7E-07', file: 'src/main/services/library.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '智能排序（枚举加值 cited_desc+COALESCE 空值归零垫底+rowid 决胜+双 Record 类型闭环）（全案=tickets/archive/P7E-07.md）' },
  { id: 'F-A6', file: 'src/renderer/features/reader/interact/selection-paint.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选渲染错乱+拖选卡顿根治（五轮方案残留——设计文档先行再实现；涉 ADR-0019 R3 修订）（全案=tickets/archive/F-A6.md）' },
  { id: 'F-A7', file: 'src/renderer/features/reader/view/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '旋转页占位盒宽高交换缺失修复（页尺寸缓存单源未旋转口径 vs canvas 旋转口径错配）（全案=tickets/archive/F-A7.md）' },
  { id: 'F-A8', file: 'src/renderer/features/reader/anchors/annotation-resolve.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AnnotationLayer 重锚域同族化（重锚主链迁项几何族；设计链三跳毕=设计书在档）（全案=tickets/archive/F-A8.md）' },
  { id: 'P7D-01', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: 'P7-D 玻璃 UX 首票 design token 先铺（动效 32 处→七 token+间距 inline 12 处→tailwind class+z 层 token）（全案=tickets/archive/P7D-01.md）' },
  { id: 'P7X-01', file: 'src/renderer/features/tags/TagFilter.tsx', area: 'tags-ui', owner: 'strong', status: 'done', summary: '标签选中上限 UI 感知（toggle 添加方向守卫+TAG_FILTER_MAX=20 单源 schema 与 UI 同消费）（全案=tickets/archive/P7X-01.md）' },
  { id: 'P7X-02', file: 'src/renderer/features/reader/time/reading-time-setup.ts', area: 'reader', owner: 'strong', status: 'done', summary: '时长落盘重试/outbox（renderer localStorage 持久 outbox 兜底使尾账落盘失败可恢复）（全案=tickets/archive/P7X-02.md）' },
  { id: 'F-AUDIT-01', file: 'scripts/audits/', area: 'infra', owner: 'strong', status: 'done', summary: 'audits 留档口径三桶清场（入库桶实测 243 件+数据桶 16 探针目录不入 git+.gitignore 增条）（全案=tickets/archive/F-AUDIT-01.md）' },
  { id: 'F-SPLIT-01', file: 'src/renderer/features/reader/view/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '组件贴线拆件合票（五件贴线态解除——PageColumn 249→164 等五件拆分）（全案=tickets/archive/F-SPLIT-01.md）' },
  { id: 'F-CSS-01', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: 'theme.css 分域拆件（645 行→五件全 ≪450 新关卡+reduced-motion 守卫随域驻件末）（全案=tickets/archive/F-CSS-01.md）' },
  { id: 'F-TOOL-01', file: 'scripts/visual-diff-locate.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '像素差分带定位器工具固化（visual-diff-locate.mjs：差分行带+crop 模式；三坑规避内建）（全案=tickets/archive/F-TOOL-01.md）' },
  { id: 'F-CSS-02', file: 'tests/unit/renderer/theme.test.ts', area: 'ui-kit', owner: 'strong', status: 'done', summary: 'theme.test 负锚升级=正则全域归零（任意数字 font-size 声明七 CSS 文件计数=0）（全案=tickets/archive/F-CSS-02.md）' },
  { id: 'F-LINT-01', file: 'scripts/check-quality.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'INV-11 lint 机器化（类型/颜色/文案/数值单一真相源禁令机器锚定；设计链三跳毕）（全案=tickets/archive/F-LINT-01.md）' },
  { id: 'F-CSS-03', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: '颜色 token 化战役+颜色负锚双关卡（50 值=48 新 token；零视觉差口径+语义命名优先）（全案=tickets/archive/F-CSS-03.md）' },
  { id: 'F-LINT-03', file: 'scripts/dup-constants.baseline.json', area: 'infra', owner: 'strong', status: 'done', summary: 'B-1 baseline 棘轮 8 组真命中收敛（跨域三组驻 ui-constants.ts+同域五组驻域件）（全案=tickets/archive/F-LINT-03.md）' },
  { id: 'F-A9', file: 'src/renderer/features/reader/view/AnnotationLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '标注带垂直几何缺陷修复（划选预览带下移半行+underline 低位色带切字两病）（全案=tickets/archive/F-A9.md）' },
  { id: 'F-A10', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选段末空白 affinity 缺陷（选区把下一段带上——诊断先行：行尾空白节点命中→affinity 归属）（全案=tickets/archive/F-A10.md）' },
  { id: 'F-A11', file: 'src/renderer/features/reader/view/AnnotationEditor.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '笔记编辑 UX 双缺（保存状态反馈「已保存」标记+撤回/恢复按钮对；非丢数据定性在案）（全案=tickets/archive/F-A11.md）' },
  { id: 'F-UI-01', file: 'src/renderer/shared/theme-shell.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: '顶栏左簇垂直居中（用户裁决原话执行；簇中心与顶栏中心垂直差≤1px 验收）（全案=tickets/archive/F-UI-01.md）' },
  { id: 'F-LINT-02', file: 'eslint.config.js', area: 'infra', owner: 'strong', status: 'done', summary: 'B-1 同值双常量 lint 机器化（跨文件聚合=架构问题——设计链三跳强制+存量 dry-run 铁律前置）（全案=tickets/archive/F-LINT-02.md）' },
  { id: 'F-REG-01', file: 'scripts/check-tickets.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'check-tickets 工单号校验全域化（行级解析+id 前缀白名单+file 存在性全域——46 票曾脱检）（全案=tickets/archive/F-REG-01.md）' },
  { id: 'F-DOC-01', file: 'docs/methodology.md', area: 'infra', owner: 'strong', status: 'done', summary: 'methodology 增「设计期存量 dry-run 实证」条款（F-LINT-01 改向教训成文：验收项存在≠已验证）（全案=tickets/archive/F-DOC-01.md）' },
  { id: 'P7X-03', file: 'docs/reports/', area: 'infra', owner: 'strong', status: 'done', summary: 'B6 模态期最小化语义对证（对证成立=结案推演升文档实证，免实现）（全案=tickets/archive/P7X-03.md）' },
  { id: 'F-LOCK-01', file: 'scripts/unlock-protected.ps1', area: 'infra', owner: 'strong', status: 'done', summary: 'unlock/lock 脚本受锁集合不对称修复（新件 get-protected-files.ps1 单一收集函数三处收敛）（全案=tickets/archive/F-LOCK-01.md）' },
  { id: 'F-SNAP-01', file: 'src/renderer/features/reader/anchors/anchor-blank-snap.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'anchor-blank-snap 撞名常量语义化（局部同名不同值易埋雷——COLUMN_GAP 族消歧）（全案=tickets/archive/F-SNAP-01.md）' },
  { id: 'F-A12', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选释放点浅探 affinity 事件层重定向（新件 release-affinity.ts 纯函数——手势几何判别）（全案=tickets/archive/F-A12.md）' },
  { id: 'F-LINT-04', file: 'scripts/check-quality.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展战役 T1（COLOR_RE 单源化+url 顺修+postcss 化；设计链三跳毕）（全案=tickets/archive/F-LINT-04.md）' },
  { id: 'F-LINT-04-T2', file: 'eslint.config.js', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展 T2=B-5 AST 扩展（no-inline-color 扩 VariableDeclarator 等 visitor 路径）（全案=tickets/archive/F-LINT-04-T2.md）' },
  { id: 'F-LINT-04-T4PRE', file: 'src/renderer/shared/theme.css', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展 T4 前置=--warning token 化（fallback orange 悬空=token 体系静默绕过通道）（全案=tickets/archive/F-LINT-04-T4PRE.md）' },
  { id: 'F-LINT-04-T4', file: 'scripts/check-quality.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '颜色关卡扩展 T4=var() 语义锚 C-4c（check-quality 新段——变量消费语义配对扫描）（全案=tickets/archive/F-LINT-04-T4.md）' },
  { id: 'F-TESTREF-00', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '测试面指纹门（check-test-surface.mjs——设计链三跳毕，skipSites 双向红等终裁落法）（全案=tickets/archive/F-TESTREF-00.md）' },
  { id: 'F-TESTREF-S1', file: 'scripts/test-surface/extract.mjs', area: 'infra', owner: 'strong', status: 'open', summary: '指纹门抽取器语法子集补强（门一 R1/R2 登记项收敛——触发条件=零存量命中、随战役任意票搭车或单独小票）：①W12 哨兵 each 双层调用形态失明（非白名单文件 it.each([[1]])(\x27t %i\x27, fn) 外层 callee=CallExpression 双盲——R1 W7 修复的同族残余）②N11 本地变量别名通道（const myIt = it; myIt(\x27t\x27,fn) 静默漏抽——W6 import 面外的同族）③N15 importAliasCheck 未排除 type-only import（import type { it as myIt } 误红——红向误伤非漏报）；三项均 v1 已知残留（门一 R2 N 级注记在档），补强时机=战役期遇真实命中或 W3 票顺带' },
  { id: 'F-TESTREF-S3', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'FILE 级豁免通道——删整测试文件的机检出路（fileScope:true 显式哨兵+schema 两类互斥+轴一/轴二双接入+exemptionHits 结构性隔离[回炉 R1 双席同中 W1]+姊妹件 T1-T8）（全案=tickets/archive/F-TESTREF-S3.md）' },
  { id: 'F-TESTREF-S4', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '指纹门防御面加固四项（S3 备案族兑现：k1-N1 台账元素 null/非对象受控 exit 3+d1-N-1 条目键七键白名单拼错键点名+d1-N-4 快照 fileScope 畸形归 snapshotCorrupt+d1-N-6 FILE_MISSING 磁盘二分 SCAN_MISSING 新 kind[裁决部 P2 补无豁免通道声明面]；d1-N-2 维持设计现状；回炉 T8 锁 check 不读快照契约+M-T8 变异红证；姊妹件 T1-T8 always-active）（全案=tickets/archive/F-TESTREF-S4.md）' },
  { id: 'F-CONSOL-04', file: 'tests/unit/renderer/lineage-timeline-page.test.tsx', area: 'infra', owner: 'strong', status: 'done', summary: 'lineage-canvas.test 名实对齐改名票（v67 起备案销项：Canvas 断言面已随 T3-P6 SVG 方案退役、内容改写为 Timeline/Page 测试但文件名残留 canvas——git mv 改名 lineage-timeline-page.test.tsx+头注 2 行+FILE 级豁免通道首次真实使用[台账 129→130 hits:1]+locks 重生成；内容零改动，NEW_FILE 9 用例 delta 绿；分级烤验小批=k1 单审 PASS[B0/W1 悬空括号修/N6]；立案查重失误一次——票号撞 09-28 旧 F-CONSOL-03，改号 04，教训=立案前 registry+archive 双查重）（全案=tickets/archive/F-CONSOL-04.md）' },
  { id: 'F-CONSOL-05', file: 'tests/unit/renderer/theme-boot.test.ts', area: 'infra', owner: 'strong', status: 'done', summary: '测试面补强批两项备案兑现（T3-U1 module/defer/async 负锚——接缝一用例断言集 3→5 纯超集+回炉正则强化 i/nomodule/无引号/词边界；P7B saveLineTypes 失败路径专测——系统型 DB_ERROR 全链+CONFLICT 拒绝型含回炉补宽 lineTypes 保持+一次即弃断言；主控亲执实现[S3 回炉先例]+k1/d1 双审+probe 9/9+裁决部 GWC[回炉 0]；变异 M-D1/M-D2/M-D3 三层红证含状态层；case 级豁免接缝一旧签名退役[台账 130→131]；遗留候选=CONFLICT 多条目续跑/属性结构化解析/文案锚双轨）（全案=tickets/archive/F-CONSOL-05.md）' },
  { id: 'F-CONSOL-06', file: 'scripts/test-surface.baseline.json', area: 'infra', owner: 'strong', status: 'done', summary: '指纹门基线再生成窗口票（v77 §2.2 遗留兑现：delta 合法积累五项显式滚动——两轴对账 retiring 2[FILE 级旧键+case 级接缝一旧签名恰命中]/added 2/removed 0 EXIT=0；新基线 206 件/2120 例/6553 断言/skipSite12——用例 +10=8[S4]+0[改名净]+2[两用例]、断言 +52=37+2+13+0 过定闭合；改名净 0 标题集铁证+ticketIds 并集 57→57 零差异实测；豁免台账 123→131 全程归因[+6=SR-IPC-10×1+T3-P8×5 于 7a0b 冻结 129，+2=04/05 两票；k1-W1]；k1 单审 PWC[B0/W2/N6] 全处置——W2=delta 审计可复算规格固化票档；烤验分级=数据批轻量路径申报并获 k1 认可；新基线 check 零 delta+verify EXIT=0+locks 275 同步；k1 设计观察留档=消费型豁免滞留面）（勘正 F-CONSOL-08：票内「verify EXIT=0」系管道假绿——真值红=tickets 段误报[首个 file 指基线 done 票]，提交 535417675a2 为带红提交，修复在档）（全案=tickets/archive/F-CONSOL-06.md）' },
  { id: 'F-CONSOL-07', file: 'tests/unit/renderer/theme-boot.test.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'TB:84 注释勘正微票（F-CONSOL-05 遗留备案 P3-3：负锚注释声称「\\btype=防 data-type 类子串误报」失实——\\b 在连字符后恒成立[data-type=module 仍可误中负锚=已知假阳性面]，勘正为「防词字符接缀[xtype= 类]、不防连字符前缀+升级方向=属性结构化解析」；注释 4 行替换 1 行净+3 零逻辑行变更[初报「4 替换 2」计数失实 k1-W1 订正]，正则不动[升级归 P3-1——k1-N2 全支路面[data-defer/data-async/data-nomodule 同族+type=modules 歪打正着真阳]随 P3-1 立项写入依据]；分级小批=k1 单审 PASS[B0/W1 订正毕/N3]；定向 8/8+verify EXIT=0[指纹门 206/2120/6553/12 零 delta——注释不进抽取面]+unlock→改→即时 apply）（勘正 F-CONSOL-08：票内「verify EXIT=0」同 06 系管道假绿，提交 c193c2aa460 为带红提交[红面=06 行误报与本票无关]，修复在档）（全案=tickets/archive/F-CONSOL-07.md）' },
  { id: 'F-CONSOL-08', file: 'scripts/check-tickets.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'check-tickets 占位扫描面窄化事故修复票（F-CONSOL-06 首个 file 指向基线 json 的 done 票触发规则 3 误报——快照镜像历史用例标题含占位桩调用词面属文本镜像非调用；修法=规则 3+4b 同族代码后缀 guard+回炉补非白名单跳过清单可见化 note[30 票全显形——css/docs/配置族历史一直在扫纯内容巧合，eslint.config.js=.js 中间地带实例]；连带勘正 06/07 两票档+registry 行失实终验[管道假绿——真值红仅 tickets 误报段，两笔带红提交在档]；变异 M-R3 天然红样本红证[撤 guard→误报复现]+4b guard=vacuous 预防性如实申报；k1+d1 异构双审 PWC[B0/W3/N7+B0/W6/N5] 回炉 R1 全处置[双席同中静默放行→note 可见化+触发器机检化/4b vacuous 登记/registry 叙述面二次自伤→结构化收敛候选+代称纪律/管道条款化入 v78 §4]；verify 真值重定向亲验 EXIT=0；治理面 defense-lifecycle ②行登记）（全案=tickets/archive/F-CONSOL-08.md）' },
  { id: 'F-CONSOL-09', file: 'tests/unit/tools/check-tickets.test.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'check-tickets 姊妹测试面补强（F-CONSOL-08 池面候选兑现——CLI 探针九用例：规则 3 guard 两向[T1 json 放行+note/T2 代码面拦]+规则 4b guard 两向[T6/T7——从 vacuous 升级有锁]+哨兵红形态[T5 计数失衡 exit1]+存在性[T3/T3b——guard 前移=等价变异体（规则 1 独立兜底 M-3 实证）]+open 豁免[T4]；变异红证四支 M-1 撤 guard→T1 红/M-2 短路 note→T1 红/M-4 掏空扫描→T2 红/M-5 撤 4b guard→T7 红[还原 diff 空三证+M-3 等价变异体如实申报]；票面聚焦=08 修复面行为锁——规则 2 SR 引用/DIR 豁免清单面超票面不锁[申报]；note/错误文案整句断言=行为锁（文案变更走 locked-change）；k1 PWC[B0W3N7]+d1 首轮 FAIL[B1 检材不合规——四件未内联，F-CONSOL-03 先例重派]→回炉 R1[T3b 改标签+4b 两用例+T5+M-4/M-5+maxRetries+头注边界]→d1 补正包重派 PASS[B0W0N6——W1/W2 处置核验充分+N 六项留档]；主控亲执[S3 先例]；定向 9/9+verify 真值 EXIT=0[NEW_FILE 9 用例绿面]+manifest 276；T3/T4 变异以专属 stderr 文本断言推断性申报豁免）（全案=tickets/archive/F-CONSOL-09.md）' },
  { id: 'F-CONSOL-02', file: 'src/shared/ipc/schemas.ts', area: 'ipc', owner: 'strong', status: 'done', summary: 'P5 遗留单源化收敛三件套——两 IPC schema 手写→models 派生（等价收敛零行为变化，差异字段恰=ipc 宽面声明）+恒四组拒绝文案常量单源双消费+INV 册表修复（12 行归位+三断表空行清除，回炉 R1 主控亲执）（全案=tickets/archive/F-CONSOL-02.md）' },
  { id: 'F-TESTREF-S2', file: 'scripts/check-test-surface.mjs', area: 'infra', owner: 'strong', status: 'done', summary: '基线再生成机检对账（再生成输出退役用例清单与豁免 delta 精确匹配——人肉步升机检）（全案=tickets/archive/F-TESTREF-S2.md）' },
  { id: 'F-TESTREF-W1A', file: 'tests/utils/api-client-mock.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'mock 工厂下沉（vi.mock 39 文件+Toast mock 32 文件→tests/utils 共享工厂单源；C 面零变化由指纹门对拍）（全案=tickets/archive/F-TESTREF-W1A.md）' },
  { id: 'F-TESTREF-W1B', file: 'tests/utils/geometry.ts', area: 'infra', owner: 'strong', status: 'done', summary: '几何桩+局部工厂下沉（三族安装对+盒构造→tests/utils/geometry.ts 单源 149 行）（全案=tickets/archive/F-TESTREF-W1B.md）' },
  { id: 'F-TESTREF-W1C', file: 'tests/e2e/e2e-env.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'e2e 脚手架单源（launch 5 副本+seedPaperRow+first-window 配方→e2e-env.ts 单源）（全案=tickets/archive/F-TESTREF-W1C.md）' },
  { id: 'F-TESTREF-W2', file: 'playwright.config.ts', area: 'infra', owner: 'strong', status: 'done', summary: '探针 spec 移出默认门（projects 拆 app/probe——z-.*-probe 式 testIgnore；默认门不含探针）（全案=tickets/archive/F-TESTREF-W2.md）' },
  { id: 'F-TESTREF-W3', file: 'src/shared/ipc/schemas.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'src/shared 直接契约测试补齐（zod 边界+api-surface 通道完整性——覆盖倒挂最薄面）（全案=tickets/archive/F-TESTREF-W3.md）' },
  { id: 'F-TESTREF-W4', file: 'docs/audits/flake-ledger.json', area: 'infra', owner: 'strong', status: 'done', summary: '不确定面机件化（flake 台账八线历史收录+stableRel 下沉 tests/e2e）（全案=tickets/archive/F-TESTREF-W4.md）' },
  { id: 'F-DEDUP-01', file: 'src/main/services/library.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '服务层偶然复杂度收敛（DomainError 基类单源 15 文件继承+atomicWriteFile 三开关等四收敛面）（全案=tickets/archive/F-DEDUP-01.md）' },
  { id: 'F-GEOM-01', file: 'src/renderer/features/reader/anchors/pdf-item-geometry.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'INV-58 双几何族同族化战役（pdf.js 项声明几何族收编 DOM 量测几何族——单一真相源化）（全案=tickets/archive/F-GEOM-01.md）' },

  // ── 2026-09-18 F-GEOM-01 实施票立案批（G1~G11——设计书 §5.3 切分；票面
  //    引用 docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
  //    （定稿提交 af946a5324）对应节+复杂度治理裁决书 §3 梯队三；排程=relay
  //    第四波子项按号序串行；迁移票（G4~G10）翻 done 时 file 字段随迁移改写
  //    至子域新址（SR-RDR-02 随迁先例）；**全域随迁义务（门一 W1 处置）**：
  //    目录化迁移步落盘时 registry 全体 file 指向被迁路径的票（含 done 票
  //    与 G 票自身，波及 40+ 票次）一并随迁改写——check-tickets 规则 1 全票
  //    存在性硬红兜底，属票面声明的批量改写面非票面外静默批改；
  //    G2 受锁面最重（selection-layer.test
  //    改写+豁免清单），大中票一火一票 ──
  { id: 'F-GEOM-01-G1', file: 'src/renderer/features/reader/anchors/geometry-types.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'M0 类型下沉切环（PdfTextItem 族+PixelBox/RowBand 落 geometry-types.ts）（全案=tickets/archive/F-GEOM-01-G1.md）' },
  { id: 'F-GEOM-01-G2', file: 'src/renderer/features/reader/interact/selection-evaluate.ts', area: 'reader', owner: 'strong', status: 'done', summary: '保存链单源门+几何死面收敛（所见≠所存时不给保存入口——战役唯一行为变更票）（全案=tickets/archive/F-GEOM-01-G2.md）' },
  { id: 'F-GEOM-01-G3', file: 'docs/invariants.md', area: 'infra', owner: 'strong', status: 'done', summary: 'band 三档绑定+跨族交互点登记（新 INV 几何产链档位绑定——纯登记面零行为变更）（全案=tickets/archive/F-GEOM-01-G3.md）' },
  { id: 'F-GEOM-01-G4', file: 'src/renderer/features/reader/state/reader.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M1=state/ 域迁移（10 文件迁 reader/state/）（全案=tickets/archive/F-GEOM-01-G4.md）' },
  { id: 'F-GEOM-01-G5', file: 'src/renderer/features/reader/time/reading-time-outbox.ts', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M2=time/ 域迁移（4 文件迁 reader/time/）（全案=tickets/archive/F-GEOM-01-G5.md）' },
  { id: 'F-GEOM-01-G6', file: 'src/renderer/features/reader/anchors/annotation-anchor.ts', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M3=anchors/ 域迁移（13 存量+geometry-types 迁 reader/anchors/——受锁面最重步）（全案=tickets/archive/F-GEOM-01-G6.md）' },
  { id: 'F-GEOM-01-G7', file: 'src/renderer/features/reader/interact/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M4=interact/ 域迁移（7 文件迁 reader/interact/）（全案=tickets/archive/F-GEOM-01-G7.md）' },
  { id: 'F-GEOM-01-G8', file: 'src/renderer/features/reader/panels/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M5=panels/ 域迁移（8 文件迁 reader/panels/）（全案=tickets/archive/F-GEOM-01-G8.md）' },
  { id: 'F-GEOM-01-G9', file: 'src/renderer/features/reader/view/PdfPageCanvas.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M6a=view 渲染簇迁移（14 文件迁 reader/view/）（全案=tickets/archive/F-GEOM-01-G9.md）' },
  { id: 'F-GEOM-01-G10', file: 'src/renderer/features/reader/view/ReaderPage.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '目录化 M6b=view 工具/搜索/标注 UI 簇迁移（13 文件迁 reader/view/）（全案=tickets/archive/F-GEOM-01-G10.md）' },
  { id: 'F-GEOM-01-G11', file: 'docs/reports/2026-09-18_f-geom01-campaign-closeout.md', area: 'infra', owner: 'strong', status: 'done', summary: '战役收官票（头注扫尾+净删/交互点记账报告+验收门全跑 e2e 45 全绿）（全案=tickets/archive/F-GEOM-01-G11.md）' },

  // ── 2026-09-18 复杂度治理与演进裁决书立案批（第一波 T1——12 新票；
  //    票面引用《裁决书》（docs/design/2026-09-18_complexity-governance-ruling.md）
  //    对应行，排程=docs/handoff/relay.md 五波次；骨架件头注同源）──
  { id: 'F-SESS-01', file: 'src/main/services/export_/corpus.export.service.ts', area: 'service', owner: 'strong', status: 'done', summary: '导出会话悬挂修复（abortActiveSession+advance 终局守卫+INV-65 入册——reload 后单飞锁释放）（全案=tickets/archive/F-SESS-01.md）' },
  { id: 'F-AIN-01', file: 'src/main/services/ai_sensor/ai-notes-import.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'AI 笔记回灌事务包裹（withTransaction 单篇全有或全无+中断注入测试）（全案=tickets/archive/F-AIN-01.md）' },
  { id: 'F-DEP-01', file: 'package.json', area: 'infra', owner: 'strong', status: 'done', summary: 'postcss 显式化清账（^8.5.26 devDep 显式化+lockfile 同步 [dep-change]）（全案=tickets/archive/F-DEP-01.md）' },
  { id: 'F-ELE-01', file: 'docs/reports/2026-09-18_ele-upgrade-prestudy.md', area: 'infra', owner: 'strong', status: 'done', summary: 'Electron 升级预研（prebuild 矩阵+Node 24 兼容+风险清单——纯调研零 src 变更）（全案=tickets/archive/F-ELE-01.md）' },
  { id: 'F-ALIGN-01', file: 'AGENTS.md', area: 'infra', owner: 'strong', status: 'done', summary: '组织定版对齐（钉版 v2.0.1+ORG-SEG v2 重写+词汇映射表补全+账本断流核查）（全案=tickets/archive/F-ALIGN-01.md）' },
  { id: 'F-LAYER-01', file: 'src/main/services/settings.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'settings 下沉 services（消全仓唯一分层破口+L1 锁线——core 三域禁 import electron）（全案=tickets/archive/F-LAYER-01.md）' },
  { id: 'F-SENSOR-01', file: 'src/main/services/ai_sensor/ai-sensor.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'ai_sensor 域整理（三前缀一域对齐+spread 拼盘解体+zcode-link 闭包耦合改显式注入）（全案=tickets/archive/F-SENSOR-01.md）' },
  { id: 'F-EXPORT-01', file: 'src/main/services/export_/export-session-state.ts', area: 'service', owner: 'strong', status: 'done', summary: 'corpus.export 拆件（导出会话状态机六态外提独立+IO/事件协议分离；INV-17/18 语义不破）（全案=tickets/archive/F-EXPORT-01.md）' },
  { id: 'F-TIME-01', file: 'docs/reports/2026-09-18_time-chain-prestudy.md', area: 'infra', owner: 'strong', status: 'done', summary: 'reading-time 链瘦身评估（盘点+存废候选+降档方案——产出呈裁不实施；档位裁决终结存档）（全案=tickets/archive/F-TIME-01.md）' },
  { id: 'F-TIME-02', file: 'src/renderer/features/reader/time/reading-time-setup.ts', area: 'reader', owner: 'strong', status: 'done', summary: '阅读时长功能移除（删计时器+落库链+UI 面——取代 F-TIME-01 五档降档；用户裁决第六档）（全案=tickets/archive/F-TIME-02.md）' },
  { id: 'F-DOCGOV-01', file: 'docs/architecture.md', area: 'infra', owner: 'strong', status: 'done', summary: '文档补课批（architecture 补三结构+数据模型 10 实体表+ADR 索引 0019+关卡清单）（全案=tickets/archive/F-DOCGOV-01.md）' },
  { id: 'F-PROC-01', file: 'docs/methodology.md', area: 'infra', owner: 'strong', status: 'done', summary: '制度批（DoD 增 ADR/架构回写项+交接书事故档回流段+治理基线指标扩三等）（全案=tickets/archive/F-PROC-01.md）' },
  { id: 'F-STOR-01', file: 'scripts/audits/', area: 'infra', owner: 'strong', status: 'done', summary: '存储批（audits 历史件出库归档仓外档案区+locks manifest 同步+.gitignore 止血）（全案=tickets/archive/F-STOR-01.md）' },
  { id: 'F-ELE-02', file: 'package.json', area: 'infra', owner: 'strong', status: 'done', summary: 'Electron 实施窗票 A（better-sqlite3 12.11.1→13.0.3 N-API 化 [dep-change]）（全案=tickets/archive/F-ELE-02.md）' },
  { id: 'F-ELE-03', file: 'package.json', area: 'infra', owner: 'strong', status: 'done', summary: 'Electron 实施窗票 B（Electron 42.9.3→44.4.3 [dep-change]——钉版+clipboard 三点小改）（全案=tickets/archive/F-ELE-03.md）' },
  { id: 'R2-SH3', file: 'scripts/installer-smoke.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'R2-SH1 漏项清偿——installer-smoke 常量面对齐 productName=Synapse（三常量改写）（全案=tickets/archive/R2-SH3.md）' },
  { id: 'R2-SH4', file: 'src/main/http/http-client.ts', area: 'infra', owner: 'strong', status: 'done', summary: 'R2-SH1 漏项清偿第二批（出网 User-Agent 无空格变体清偿——USER_AGENT 单源常量+文档路径失真修）（全案=tickets/archive/R2-SH4.md）' },
  // ── 2026-09-20 阅读器 UI 反馈批（用户在场轮七项反馈——规划+八项裁决
  //    D1~D8 落档 docs/design/2026-09-20_reader-ui-feedback-survey-and-plan.md；
  //    原设计文档票号 F-UI-01 与 :259 done 票（顶栏左簇垂直居中，P3 前史）
  //    撞号，本批改立 F-UI-04 起；§5 八项已裁=零决策负债直接执行 ──
  { id: 'F-UI-04', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: '顶栏文字垂直居中+顶栏/主区背景冷雾灰（translateY(-2px) 对齐整行基线——用户裁决；像素探针常驻）（全案=tickets/archive/F-UI-04.md）' },
  { id: 'F-UI-03', file: 'src/renderer/shared/ui/SplitPane.tsx', area: 'ui-kit', owner: 'strong', status: 'done', summary: '应用导航栏可调宽+窄条折叠+收起图标（SplitPane 三 prop 扩展+App nav 包裹+窄态 clip 隐藏）（全案=tickets/archive/F-UI-03.md）' },
  { id: 'F-UI-02', file: 'src/renderer/features/reader/view/ReaderToolbar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器工具栏+侧栏标签页图标化+反馈强化（五控件 svg+sr-only 文本+选择模式激活常亮）（全案=tickets/archive/F-UI-02.md）' },
  { id: 'F-RDR-02', file: 'src/renderer/features/reader/view/AnnotationEditor.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '笔记编辑器偶发无法输入（isComposing 守卫+点击弹层空白重聚焦；四场景审计零复现不立深修票）（全案=tickets/archive/F-RDR-02.md）' },
  { id: 'F-RDR-01', file: 'src/renderer/features/reader/interact/selection-evaluate.ts', area: 'reader', owner: 'strong', status: 'done', summary: '选区空白区下拖闪烁修复（snapVisualBoundary 守卫+TTL=100ms+docOrderPair 包含形态判别）（全案=tickets/archive/F-RDR-01.md）' },
  // ── T3：三主题 UI+脉络时间线战役（2026-09-26 定稿，真相源=docs/design/2026-09-26_theme-trio-final-design.md §6 八票）──
  { id: 'T3-P1', file: 'src/renderer/shared/theme.css', area: 'ui-kit', owner: 'strong', status: 'done', summary: '主题基建——token 三族入库+data-theme 切换接线+设置页接线+防漂移锁三族扩展（桥接段自动随族）（全案=tickets/archive/T3-P1.md）' },
  { id: 'T3-P2', file: 'src/renderer/app/App.tsx', area: 'ui-kit', owner: 'strong', status: 'done', summary: '壳层改版——顶栏签名/居中搜索+72px 窄轨+课题弹层联动+F-UI-03 退役+状态条（56→38px）（全案=tickets/archive/T3-P2.md）' },
  { id: 'T3-P3', file: 'src/renderer/features/library/LibraryPage.tsx', area: 'library-ui', owner: 'strong', status: 'done', summary: '文献库视图——密度列表+规格表抽屉+游标线（六列密度列表+316px 抽屉+citedByCount/lineage 载荷扩展）（全案=tickets/archive/T3-P3.md）' },
  { id: 'T3-P4', file: 'src/renderer/features/reader/view/PageBox.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '阅读器主题化——纸面三态+批注弹层皮肤随族+chrome 换肤（--paper 三族+--canvas-filter 夜间反色）（全案=tickets/archive/T3-P4.md）' },
  { id: 'T3-P5', file: 'src/shared/models/lineage.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络数据层 v2（迁移 010：month/slot/sub+lineage_graph_meta+upsertLineTypes 通道+lineage.json 导出+catalog_no）（全案=tickets/archive/T3-P5.md）' },
  { id: 'T3-P6', file: 'src/renderer/features/lineage/LineageBoard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络时间线渲染（年月分组+小卡 104×52+砖砌行错位——RT 树布局/视口状态机/SVG 画布整族退役删除）（全案=tickets/archive/T3-P6.md）' },
  { id: 'T3-P7A', file: 'src/renderer/features/lineage/LineageBoard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '连线系统·路由+线型渲染（SVG overlay+路由三式+避让四检降级链——连线永不穿卡与月份标注）（全案=tickets/archive/T3-P7A.md）' },
  { id: 'T3-P7B', file: 'src/renderer/features/lineage/LineageTimeline.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '连线系统·编辑交互（mode×picker×popover 状态机+EdgeTypePopover+store 三 action+同道错峰）（全案=tickets/archive/T3-P7B.md）' },
  { id: 'SR-SEC-01', file: 'src/main/protocol/app-file.protocol.ts', area: 'infra', owner: 'strong', status: 'done', summary: '安全加固——app-file:// ACAO 通配收束（Origin 白名单命中回显/未命中静默不加头；休眠面事实在案）（全案=tickets/archive/SR-SEC-01.md）' },
  { id: 'SR-IPC-10', file: 'src/shared/ipc/api-surface.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '契约缺口双修——workspaces 编译期保证重建+事件面 zod 兜底（type-test 双证+preload safeParse 丢帧）（全案=tickets/archive/SR-IPC-10.md）' },
  { id: 'F-CONSOL-03', file: 'playwright.config.ts', area: 'infra', owner: 'strong', status: 'done', summary: '测试资产清出——探针 spec 四件+scripts/audits 残留六件归档仓外（F-TESTREF-W2.file 勘正+基线再生成）（全案=tickets/archive/F-CONSOL-03.md）' },
  { id: 'C-A4', file: '.github/workflows/ci.yml', area: 'infra', owner: 'strong', status: 'done', summary: 'CI 口径对齐——指纹门入 CI+DoD 措辞勘正（ci.yml 增步 fail-fast；CI run 36372251379 首绿验收）（全案=tickets/archive/C-A4.md）' },
  { id: 'F-GOV-01', file: 'tickets/registry.ts', area: 'infra', owner: 'strong', status: 'done', summary: '治理减容役收官——registry 229 done 票 summary 瘦身归档+INV 主表最小三元组+防线生命周期登记册 22 行+治理面退出条件宪法条款+日落规则（两单元两提交）（全案=tickets/archive/F-GOV-01.md）' },
  { id: 'T3-U1', file: 'src/renderer/app/StatusBar.tsx', area: 'ui-kit', owner: 'strong', status: 'done', summary: 'UAT 反馈批——保存语义可见性+FOUC 补漏（状态条自动保存槽三态真文本[回炉 W3 分档：annoDirty→error+notePending→saving]+theme-boot.js 首帧兜底链[主控真机 probe 实证]+静态锁两接缝）（全案=tickets/archive/T3-U1.md）' },
  { id: 'T3-P8', file: 'src/renderer/features/lineage/LineageTimeline.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '交互收口——战役收官票（六源：槽位拖拽重排[useCardDrag 状态机+reorderMonthSlots 全序透写]/edit 改月飞行动画[月标+MonthPop+组变尾部]/检查面板重皮肤[insp-* 族，既有面全保活]/shift 平滑过渡/飞行脱节 mockup 原样/drag-hint 双文案；门一 B-1/B-2 双席同中→回炉 R1-R8[FLIP 清 inline/测量双期跳过/lazy 载荷/兜底定时器等]）（全案=tickets/archive/T3-P8.md）' },
  { id: 'F-CI-01', file: 'package.json', area: 'infra', owner: 'strong', status: 'done', summary: 'CI npm ci 红修复——better-sqlite3 缺省编译动作按包禁用（allowScripts deny；npm ci 触发 node-gyp 缺省编译根因链实证）（全案=tickets/archive/F-CI-01.md）' },
] as const

export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))

export function isTicketDone(id: string): boolean {
  return TICKET_MAP.get(id)?.status === 'done'
}

export function openTickets(): Ticket[] {
  return TICKETS.filter((t) => t.status === 'open')
}
