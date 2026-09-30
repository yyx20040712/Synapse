/**
 * [F-FOLDER-02·B] LineageGraphSwitcher —— 脉络页图切换器（design §4.2）。
 *
 * ── 行为层 ──
 * - 页首下拉：选项=「全部图（并集）」（缺省态，lineage.graph 缺省语义同源）
 *   +folders.list 1:1（图名=文件夹名单一真相源——切换器不自持名）；标题
 *   「脉络图：{名}」真文本（S3 e2e 锚）
 * - 切换=setFolder(值)（store 置态+重取该图子图——数据单源经 lineage.store，
 *   本件零直连 lineage.graph，接缝红线同 LineagePage）
 * - S3：订阅 folders.changed→重拉 folders.list（改名/新建/计数变联动）
 * - S4：刷新落定后当前图文件夹已消失（删除级联）→回退主图 __main__（恒在场
 *   不可删——folders.service 禁删锚）；未消失→图重取（移动/他图删除可能已
 *   变更本图内容）
 * - S2：导入 busy（shared/import-busy.store）→下拉禁用（禁切图）
 *
 * ── 接口层 ──
 * - export function LineageGraphSwitcher(): JSX.Element（无 props——自取静态
 *   参考数据 folders.list，useAsync 先例=FilterBar collections）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - folders.list 失败：选项回落仅全部图（标题仍随 store.folderId 由主图名
 *   兜底）——列表型瞬态不 toast 刷屏（切换动作本身可重试）
 */
import { useEffect, useRef } from 'react'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { api, unwrap, apiEvents } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { useLineageStore } from './lineage.store'

/** 全部图（并集）选项值/标题（''=select 值域保留字——folderId 恒非空串） */
const UNION_VALUE = ''
const UNION_LABEL = '全部图（并集）'

export function LineageGraphSwitcher(): JSX.Element {
  const folderId = useLineageStore((s) => s.folderId)
  const setFolder = useLineageStore((s) => s.setFolder)
  const load = useLineageStore((s) => s.load)
  const importBusy = useImportBusyStore((s) => s.busy)
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  // S3/S4 双失效通知消费：folders.changed → 重拉列表；消费标记（changedRef）
  // 区分「事件后刷新」与「首拉」——首拉不触发图重取（LineagePage 挂载已 load，
  // 防双取）；事件后刷新落定才走回退/重取判定
  const changedRef = useRef(false)
  useEffect(
    () =>
      apiEvents.onFoldersChanged(() => {
        changedRef.current = true
        void loadFolders()
      }),
    [loadFolders]
  )

  // 刷新落定判定（S4 回退/S3·移动·删除后的图重取）——getState 取当前 folderId
  // 防闭包滞后（切换动作本身不重跑本 effect：deps=[folders]）。S4 两路径均
  // 覆盖：a) 挂载在线订阅（folders.changed 后重拉落定）；b) **挂载时 store 残留
  // stale folderId**（他页已删该文件夹——首拉落定即回退；删除 UI 在库页，脉络
  // 页不在场是常态路径，非仅事件路径）
  useEffect(() => {
    if (folders === null) return
    const current = useLineageStore.getState().folderId
    if (current !== undefined && !folders.some((f) => f.id === current)) {
      changedRef.current = false
      setFolder(MAIN_GRAPH_ID) // S4：当前图失效——回退主图（setFolder 内含重取）
      return
    }
    if (!changedRef.current) return
    changedRef.current = false
    void load()
  }, [folders])

  const label =
    folderId === undefined
      ? UNION_LABEL
      : (folders?.find((f) => f.id === folderId)?.name ?? UNION_LABEL)

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="脉络图切换"
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        value={folderId ?? UNION_VALUE}
        disabled={importBusy}
        onChange={(e) => setFolder(e.target.value === UNION_VALUE ? undefined : e.target.value)}
      >
        <option value={UNION_VALUE}>{UNION_LABEL}</option>
        {(folders ?? []).map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <span
        data-testid="lineage-graph-title"
        className="text-xs font-medium"
        style={{ color: 'var(--text-dim)' }}
      >
        {`脉络图：${label}`}
      </span>
    </div>
  )
}
