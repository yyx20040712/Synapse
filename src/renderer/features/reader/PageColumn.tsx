// b3: P7-F
/**
 * [SR2-F-01] PageColumn —— 页列几何与懒渲染回收（工单：open / strong）
 *
 * ── 行为层 ──（实现段预拆五段,每段独立可测可审）
 * - 段①页列就绪管线：doc 就绪→逐页 getPage→view 尺寸数组（缓存单源）→
 *   占位盒全列（总高确定）→onReady→F-03 恢复 scrollTo；**越界夹取锚本段**
 *   （onReady→scrollToPage 前——openPaper 时 totalPages≡0 不可行）。
 * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中）；
 *   未渲染盒空白。
 * - 段③懒渲染窗口：视口±1 页真渲染（canvas+TextLayer+AnnotationLayer+
 *   AiAnnotationLayer 实例）；离屏>2 页销毁（canvas 移除+pageText 条目删）；
 *   IntersectionObserver 占位盒驱动。
 * - 段④层实例化分工：TextLayer/AnnotationLayer/AiAnnotationLayer 每渲染页
 *   一套（props 不变父层循环）；SelectionLayer 单实例挂 ReaderPage 级
 *   （锚定根动态=选区所在页盒；工具条落点以所在页盒为参照系）。
 * - 段⑤双源机制+单页假设处遇：setPage 增 opts?:{scroll?:'to'|'none'}
 *   默认 'to'（既有五消费面零改）；store.page 变且 scroll:'to'→
 *   scrollToPage(no)（盒顶）；'none'→不滚。ReaderPage.tsx:125 越界自愈
 *   删除（夹取移段①就绪时）；:116 量测改每页自量（DPR 校准）。
 * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering
 *   →rendered→recycling→empty；跨格：快速滚动（rendering 中滚出
 *   窗口→cancel→recycling）；zoom 变化（尺寸×新 zoom 重算→窗口重评估，
 *   就绪后无 loading——缓存乘法非重取）。
 * - 内存断言：canvas 实例数 ≤ 渲染窗口+缓冲常量；快速滚动零泄漏。
 *
 * ── 接口层 ──
 * - props={doc,totalPages,zoom,renderWindow=1,recycleWindow=2,renderPage(no),
 *   onPageRender(no,payload),onReady}；页盒布局+IO+回收调度+scrollToPage+
 *   页尺寸缓存单源。
 * - PdfCanvas.tsx 拆两文件：PdfDocProvider.tsx（doc 生命周期上提，每 tab
 *   一份）+PdfPageCanvas.tsx（每页渲染单元：effect/取消/DPR 原样，props
 *   增 pageNo 固定）；两文件各 ≤250；旧文件删除（方案切换红线）。
 * - ReaderPage.tsx 布局段重构（页列+单实例 SelectionLayer）≤250；
 *   pageText 单份→Record<pageNo,PageText>（渲染窗口内，回收同删）。
 * - reader.store setPage 增第三参（默认 'to'）。
 *
 * ── 架构层 ──
 * - 分层不动；零新依赖；INV-01 零触碰；INV-16 白名单迁移：eslint.config.js
 *   受锁改（no-restricted-imports 白名单 PdfCanvas.tsx→两新文件）+
 *   invariants INV-16 文本同步；[locked-change] 随单。
 * - 不变量预登记（收口）：程序跳页与滚动同步双源区分（scroll:'none' 不
 *   触发程序滚动——防回弹；setPage 签注+scrollToPage 单口；单测跨格锚）；
 *   canvas 生命周期=渲染窗口绑定（离屏必回收；组件单测锚）。
 *
 * ── 生命周期层 ──
 * - 不做：页内偏移进度/虚拟滚动（全长真实占位）/旋转页/跨页选区。
 *
 * ── 文化层 ──
 * - 测试（裸 describe）：布局纯函数（盒高/列宽/窗口/最近页）+渲染回收
 *   调度（桩 IO）+双源机制（'none' 不触发 scrollToPage 回归锚）；
 *   e2e 批 1=reader-text.spec（多页可见断言+INV-01 保持）。
 * - 文件清单：本文件/PdfDocProvider+PdfPageCanvas（新，拆自 PdfCanvas
 *   ——旧删）/ReaderPage.tsx/reader.store.ts/eslint.config.js（受锁）/
 *   docs/invariants.md/page-column.test.tsx（新入锁）/reader-text.spec
 *   （受锁批 1）/reader.store.test（受锁扩）。
 * - 完成后：删除占位 → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架占位（实现单元替换为真实实现——规则 4 可见性标记） */
export function PageColumn(): JSX.Element {
  return <div data-ticket="SR2-F-01">P7-F F-01 骨架占位</div>
}
