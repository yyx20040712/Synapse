/**
 * [F-DBCAMP-01 DB-2 UI U3] PaperAiPanel —— paper 档会话薄包装（reader 侧栏
 * 「AI 会话」页签内容）。
 *
 * ── 行为层 ──
 * - useActiveTab 自取 paperId（ReaderPage 零新增 props——OutlineAside 同法）；
 *   activeTab=null 时空态占位「先打开一篇文献」（不调 IPC——无锚不 open）。
 *
 * ── 接口层 ──
 * - export function PaperAiPanel(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 锚=papers.id（TEXT uuid）；测试随 outline-aside.test（页签切换挂载面）。
 */
import { useActiveTab } from '../reader/state/useActiveTab'
import { AiSessionPanel } from './AiSessionPanel'

export function PaperAiPanel(): JSX.Element {
  const activeTab = useActiveTab()
  if (activeTab === null) {
    return (
      <div
        className="flex h-full items-center justify-center p-4 text-center text-xs"
        style={{ color: 'var(--text-dim)' }}
      >
        先打开一篇文献
      </div>
    )
  }
  return <AiSessionPanel scope="paper" anchorId={activeTab.paperId} />
}
