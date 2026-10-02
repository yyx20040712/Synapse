// b3: P7-H
/**
 * [F-LGRAPH-01①U4] NavGraphPicker —— 导航窗格图/文件夹下拉（mockup §3.2-1；
 * 自 LineageGraphSwitcher 迁移：S2 导入 busy 禁切/S3 folders.changed 联动/
 * S4 当前图删除回退主图——三语义行为面零变，**并集首项退役**：每图只显示
 * 自身，folderId 恒有值主图兜底）。
 *
 * - 下拉形态=当前图名+▾；点开=文件夹平铺列表（图名=文件夹名单一真相源
 *   ——本件不自持名）；T5 点一下开/再点收起/点外部收起。
 * - 切换=setFolder(值)（store 置态+重取子图——数据单源经 lineage.store，
 *   本件零直连 lineage.graph）。
 * - folders 上抛 onFoldersChange（宿主链路：NavPane→LineagePage→ModeBar
 *   图名消费——图名单源不破）。
 */
import { useEffect, useRef, useState } from 'react'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { api, unwrap, apiEvents } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { useLineageStore } from './lineage.store'
import { Dialog } from '../../shared/ui/Dialog'

export interface NavFolder {
  id: string
  name: string
}

export function NavGraphPicker(props: {
  onFoldersChange?(folders: NavFolder[] | null): void
}): JSX.Element {
  const folderId = useLineageStore((s) => s.folderId)
  const setFolder = useLineageStore((s) => s.setFolder)
  const load = useLineageStore((s) => s.load)
  const dirty = useLineageStore((s) => s.saveStatus !== 'clean') // [②U1] 暂存在场
  // 待切换图（dirty 确认挂起态——null=无挂起）
  const [pendingFolder, setPendingFolder] = useState<string | null>(null)
  const importBusy = useImportBusyStore((s) => s.busy)
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  // folders 上抛（图名消费链——首拉/重拉落定均上抛最新值）
  useEffect(() => {
    props.onFoldersChange?.(folders)
  }, [folders]) // 注：上抛回调经 props 每渲染新引用，仅随 folders 变化触发

  // S3/S4 双失效通知消费：folders.changed → 重拉列表；消费标记（changedRef）
  // 区分「事件后刷新」与「首拉」——首拉不触发图重取（宿主页挂载已 load，
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
  // stale folderId**（他页已删该文件夹——首拉落定即回退；删除 UI 在库页，
  // 脉络页不在场是常态路径）
  useEffect(() => {
    if (folders === null) return
    const current = useLineageStore.getState().folderId
    if (!folders.some((f) => f.id === current)) {
      changedRef.current = false
      setFolder(MAIN_GRAPH_ID) // S4：当前图失效——回退主图（setFolder 内含重取）
      return
    }
    if (!changedRef.current) return
    changedRef.current = false
    void load()
  }, [folders])

  // T5 外点收起（通用浮层规则）
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => {
      document.removeEventListener('click', onDoc)
    }
  }, [open])

  const currentName = folders?.find((f) => f.id === folderId)?.name ?? '主图'

  return (
    <div className="nav-graph" ref={rootRef} data-testid="lineage-nav-graph-root">
      <button
        type="button"
        className="nav-graph-btn"
        data-testid="lineage-nav-graph"
        disabled={importBusy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nm">{currentName}</span>
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="nav-graph-menu" role="listbox" aria-label="图与文件夹" data-testid="lineage-nav-graph-menu">
          {(folders ?? []).map((f) => (
            <button
              type="button"
              role="option"
              key={f.id}
              aria-selected={f.id === folderId}
              data-folder-id={f.id}
              className={f.id === folderId ? 'nav-graph-item on' : 'nav-graph-item'}
              onClick={() => {
                setOpen(false)
                // [②U1] dirty 切图两分支：暂存在场先挂起确认（A2 同值重选=切图）
                if (dirty) {
                  setPendingFolder(f.id)
                  return
                }
                setFolder(f.id)
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}
      {/* [②U1] dirty 切图未保存提示（两分支——取消留守/确认弃暂存并切换） */}
      <Dialog
        open={pendingFolder !== null}
        title="未保存的修改"
        onClose={() => setPendingFolder(null)}
        actions={
          <>
            <button type="button" className="pbtn sec" onClick={() => setPendingFolder(null)}>
              取消
            </button>
            <button
              type="button"
              className="pbtn dgr"
              data-testid="nav-graph-discard-confirm"
              onClick={() => {
                const target = pendingFolder
                setPendingFolder(null)
                if (target === null) return
                // 确认=弃暂存（不落库+队列栈清）+执行切换（load 库态覆盖）
                useLineageStore.getState().discardSession()
                setFolder(target)
              }}
            >
              放弃修改
            </button>
          </>
        }
      >
        当前脉络图有未保存的修改，切换后将放弃这些修改（不落库）。
      </Dialog>
    </div>
  )
}
