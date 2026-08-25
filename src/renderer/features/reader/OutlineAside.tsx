// b3: P7-C
/**
 * [SR2-C-04] OutlineAside —— 阅读器侧栏三栏宿主（工单：open / strong）
 *
 * ── 行为层 ──
 * - 三栏并列=三个并列选项卡（目录/缩略图/笔记——tab 并列非三栏同时可见，见
 *   生命周期层「不做」）——tablist 三项**上移至本组件**（OutlinePanel 内部
 *   tab 态+tablist 摘除，改 mode: 'outline'|'thumbs' prop 化——pdfjs 句柄与
 *   目录/缩略图行为零变化，纯结构迁移）
 * - 选中态记忆=本地 useState（v1 不持久化——重启回目录）；e2e 坑③（role=tab
 *   域污染）：本 tablist 与 TabBar 同 role——新增查询一律限定容器
 *   （data-testid="reader-aside"，本单建位）
 * - 笔记 tab 渲染 ReaderNotesPanel（SR2-C-03）：paperId/annotations 经
 *   useActiveTab 自取——**ReaderPage 不新增 props**（249/250 满员守恒）；
 *   onLocate=页级定位（useReaderStore.getState().setPage(annotation.page)——
 *   本单先页级，SR2-C-05 接缝升级三层防线，本行即替换点）；highlightAnnotationId
 *   接 reader.store（C-05 建位；本单传 undefined）
 * - 目录/缩略图跳页 onNavigate 收敛为 store 自取（setPage via getState——原经
 *   props 下传的 currentPage/onNavigate 移除；pdfDoc 保留 props——pdfDoc 是
 *   ReaderPage 组件态非 store，PdfCanvas onDocReady 链不动）
 * - 空态：paperId=null（无 tab）时笔记 tab 显示空态引导（与 ReaderPage 主区
 *   空态一致性——组件自身判）
 *
 * ── 接口层 ──
 * - export function OutlineAside(props: { pdfDoc: unknown; onCollapse(): void }): JSX.Element
 *
 * ── 架构层 ──
 * - owner=strong 声明：改动面以本层清单为准（AGENTS 工单工作流「只改这一个
 *   文件」是对 weak 领单的纪律；strong 单元=一个逻辑单元一个 commit——P7-A/B
 *   各单跨文件接缝先例）
 * - 改动面（file:line 锚——行号为开单时锚，串行实现后以符号锚为准）：
 *   OutlineAside.tsx（本文件，36→约 130 行——tablist 上移+三宿主）/OutlinePanel.tsx
 *   （:60 tab 态+:144-164 tablist 摘除+mode
 *   prop，200→约 170）/ReaderPage.tsx（:224-233 调用处 props 削减
 *   currentPage/onNavigate——净负，249 满员守恒预算）/OutlineThumb.tsx 零改动
 * - e2e 兼容核对属本单 DoD：reader-text.spec 既有目录/缩略图查询若锚定
 *   OutlinePanel 内 tablist 层级，随本单迁移查询锚 [locked-change]（坑③限定
 *   容器法核对——受锁 spec 改动必须全量 verify，宪法测试纪律）
 *
 * ── 生命周期层 ──
 * - 预留：第四面板（P7-G AI 分节并入笔记 tab 下部，非并列新栏——骨架 §2）；
 *   tab 选择持久化（v2 预留，不做）
 * - 不做：三栏同时可见（WPS 范式=单侧栏切换——B3 裁决解释）；右侧栏
 *
 * ── 文化层 ──
 * - 组件测试 tests/unit/renderer/outline-aside.test.tsx（新文件）：三项渲染与
 *   切换/选中记忆（切 tab 不重置）/笔记 tab 挂 ReaderNotesPanel（stub 消费）/
 *   目录跳页经 store/空态
 * - 验收含骨架属性清理：翻 done 前移除根元素 data-ticket（check-tickets 规则
 *   4b 机器拦——本头注显式声明防遗漏）
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import { OutlinePanel } from './OutlinePanel'

export function OutlineAside(props: {
  pdfDoc: unknown
  currentPage: number
  onNavigate(page: number): void
  onCollapse(): void
}): JSX.Element {
  const { pdfDoc, currentPage, onNavigate, onCollapse } = props
  return (
    <aside
      data-ticket="SR2-C-04"
      className="flex h-full flex-col border-r"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      <div
        className="flex items-center justify-between border-b px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        <span>目录 / 缩略图</span>
        <button type="button" className="rounded px-1" onClick={onCollapse}>
          收起
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <OutlinePanel pdfDoc={pdfDoc} currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </aside>
  )
}
