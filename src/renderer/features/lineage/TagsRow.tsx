/**
 * [F-UIRES-04 批 3b] TagsRow —— 侧板头部标签行（设计书 §4.6 D5）。
 *
 * ── 行为层 ──
 * - 只读 chips 展示（文献库全局域标签；编辑面=文献库 TagEditor——库=编辑
 *   面、脉络=展示面，域语义不同非同构破约，设计书 §4.5）。
 * - 空标签整行省略（与 SideBadges 缺席省略同模式）；宿主条件挂载=
 *   文献节点（paperId 非 null），主题节点零渲染。
 * - 自持订阅 usePaperInfoStore（读 view.data.tags——features→shared 方向
 *   合法，设计书 §4.4 跨域矩阵）。
 *
 * ── 架构层 ──
 * - [INV-D] 零 props（标签行全局域 F-TAGS-02 域化前不预埋 domain 参数；
 *   联动改点=paperInfoStore 单处——INVALIDATE 派发面同票启用）。
 */
import { usePaperInfoStore } from '../../shared/paperInfoStore'

export function TagsRow(): JSX.Element | null {
  const view = usePaperInfoStore((s) => s.view)
  const tags = view.status === 'ready' ? (view.data?.tags ?? []) : []
  if (tags.length === 0) return null
  return (
    <div className="tags-row" data-testid="lineage-side-tags">
      {tags.map((t) => (
        <span key={t.id} className="badge plain">
          {t.name}
        </span>
      ))}
    </div>
  )
}
