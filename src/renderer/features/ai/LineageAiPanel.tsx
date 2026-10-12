/**
 * [F-DBCAMP-01 DB-2 UI U3] LineageAiPanel —— lineage 档会话薄包装（脉络侧栏
 * 「AI 会话」页签内容）。
 *
 * ── 行为层 ──
 * - lineage.store 取 folderId 为锚（恒有值——主图兜底）；锚全域合法：主图
 *   '__main__' 与文件夹图同构（collections 表恒有 '__main__' 行——012 迁移
 *   无条件初始插入），主图不特判不隐藏不置灰。
 *
 * ── 接口层 ──
 * - export function LineageAiPanel(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 锚=collections.id；切图即换锚（folderId 变化→AiSessionPanel 重挂重 open
 *   ——effect deps 驱动）；测试随 e2e E1②（lineage 集成面）。
 */
import { useLineageStore } from '../lineage/lineage.store'
import { AiSessionPanel } from './AiSessionPanel'

export function LineageAiPanel(): JSX.Element {
  const folderId = useLineageStore((s) => s.folderId)
  return <AiSessionPanel scope="lineage" anchorId={folderId} />
}
