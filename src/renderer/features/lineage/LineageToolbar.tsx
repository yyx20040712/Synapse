// b3: P7-H
/**
 * [T3-P7B] LineageToolbar —— 脉络工具条（换装 .lg-toolbar——mockup L204-219/
 * L496-507 逐值；sticky 挂 .timeline 内=LineageTimeline 渲染树，Board 经
 * props 下传既有回调）。
 *
 * [F-LGRAPH-01①U3] 退役行 2：「编辑脉络/完成编辑」toggle 删除（三模式栏
 * LineageModeBar 替代——editing 改受控 props，单源=lineage-view.store）。
 * 「新建连线」.lg-btn.linkbtn（display:none↔.editing 内 block——编辑模式内
 * 才显；DOM 恒在场）+添加节点 .lg-btn ghost 保留（②批工具组重做再退役）。
 * 保存态/重试 chip 行尾（[P7-H] 既有语义零变——testid 全保活）；[F-LGRAPH-01
 * ①U5] drag-hint 文案随三模式（browse 平移/focus 聚焦标记/edit 全句——
 * 三态文案 executor 拟定申报）。
 */
import type { LineageSaveStatus } from './lineage.store'
import type { LineageViewMode } from './lineage-view.store'

export function LineageToolbar(props: {
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  onAddNode(): void
  onRetrySave(): void
  /** 模式态（受控——Timeline 自 lineage-view.store 注入） */
  mode: LineageViewMode
  /** 「新建连线」（edit 态才生效——composer 双闸） */
  onNewLink(): void
}): JSX.Element {
  const { saveStatus, lastWriteError, mode } = props
  return (
    <div className="lg-toolbar">
      <button
        type="button"
        className="lg-btn ghost linkbtn"
        data-testid="lineage-link-btn"
        onClick={props.onNewLink}
      >
        新建连线
      </button>
      <button type="button" className="lg-btn ghost" data-testid="lineage-add-node" onClick={props.onAddNode}>
        添加节点
      </button>
      {saveStatus === 'saving' && (
        <span className="rounded px-2 py-1 text-xs" data-testid="lineage-save-status">
          保存中…
        </span>
      )}
      {saveStatus === 'error' && (
        <span
          className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
          role="alert"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          data-testid="lineage-save-status"
        >
          保存失败：{lastWriteError}
          <button
            type="button"
            data-testid="lineage-retry-save"
            className="rounded px-1.5 py-0.5"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={props.onRetrySave}
          >
            重试
          </button>
        </span>
      )}
      {mode === 'edit' ? (
        <span className="drag-hint" data-testid="drag-hint">
          编辑中：点连线改线型 · 点卡片月标改月 · 拖动＝月内调序
        </span>
      ) : mode === 'focus' ? (
        <span className="drag-hint" data-testid="drag-hint">
          ◎ 单击卡片＝聚焦标记（再点取消） · 拖动空白＝平移画布
        </span>
      ) : (
        <span className="drag-hint" data-testid="drag-hint">
          ✋ 拖动空白＝平移画布 · 滚轮浏览时间线
        </span>
      )}
    </div>
  )
}
