// b3: P7-F
/**
 * [SR2-F-03] scroll-progress —— 滚动进度回写恢复与键位迁移（工单：open / strong）
 *
 * ── 行为层 ──
 * - 滚动位置状态机（六态）：idle→scrolling（用户滚动）→pending（静置
 *   >2000ms 沿用防抖）→writing（setPage(id,page,{scroll:'none'})——回写
 *   不触发程序滚动防回弹；writing 中用户又滚→直接回 scrolling）→idle；
 *   restoring（程序滚动中；**用户接管判定=非 scroll 的用户输入信号
 *   （wheel/keydown/pointerdown 三类——程序 scrollToPage 自发的 scroll
 *   事件不算）→取消程序目标转 scrolling**）；loading（页列未就绪，onReady
 *   →restoring 执行恢复）。
 * - 跨格序列：滚动→切 tab→回（恢复记忆页）/滚动中关 tab（flushPending
 *   沿用）/pending 中关 tab（立即 flush）/程序跳页与用户滚动竞态（用户
 *   接管=三类输入信号）/回写竞 tab 切换（writing 前校验 activeId 失配
 *   丢弃——per-tab 记账）。
 * - 滚动→页回写：视口中心最近页纯函数；粒度=整数页（v1 零迁移——页内
 *   偏移留实锤）；pendingProgress Record<paperId,page> 语义保持。
 * - 恢复：openPaper→loading→就绪（就绪时夹取）→scrollToPage(lastReadPage)。
 * - 键位迁移：PAGE_KEYS 四键=滚动一步（一屏−一行重叠常量）；preventDefault
 *   保留（语义=统一滚动步长）；空格=下滚一屏（新增，editable 避让既有）；
 *   ctrl+wheel 缩放零触碰。
 *
 * ── 接口层 ──
 * - createScrollProgress(deps:{getPaperId,getViewport,getPageBoxes,
 *   scrollToPage,setPage,saveProgress,now,timers})——**per-tab：内部
 *   Record<paperId,State>**；时间全注入（禁真 timer）。
 * - reader.store 防抖链拆至本模块（425 行净减）；ReaderPage 装配 onScroll
 *   接线+恢复；ReaderShortcuts PAGE_KEYS 滚动步+空格（头注 :47 兑现）。
 *
 * ── 架构层 ──
 * - IPC/repo 零改动（saveProgress 沿用）；不变量登记：进度回写=视口中心
 *   最近页（纯函数+跨格单测）；程序滚动用户接管（RESTORING 取消）。
 *
 * ── 生命周期层 ──
 * - 不做：页内偏移存储/云端/进度历史。
 *
 * ── 文化层 ──
 * - 测试：状态机全格含 writing-scroll 新格+跨格五序列（时间注入）；
 *   最近页纯函数边界；reader-shortcuts.test+reader.store.test 受锁扩；
 *   e2e 批 3=reader-text.spec tab 序列段。
 * - 文件清单：本文件（新）/reader.store.ts/ReaderPage.tsx/ReaderShortcuts.ts/
 *   scroll-progress.test.ts（新入锁）/两受锁测试扩/reader-text.spec 批 3。
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const SCROLL_PROGRESS_STUB = 'SR2-F-03'
