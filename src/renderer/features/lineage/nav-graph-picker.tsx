// b3: P7-H
/**
 * [F-LGRAPH-01①U4] NavGraphPicker —— 导航窗格图/文件夹下拉（mockup §3.2-1；
 * 自 LineageGraphSwitcher 迁移：S2 导入 busy 禁切/S3 folders.changed 联动/
 * S4 当前图删除回退主图——语义行为面沿承，**并集首项退役**：每图只显示自身）。
 *
 * - 下拉形态=当前图名+▾；点开=文件夹平铺列表（图名=文件夹名单一真相源
 *   ——本件不自持名）；T5 点一下开/再点收起/点外部收起。
 * - 切换=setFolder(值)（[B4 L2 §8.1] flush-first 挂起切换——数据单源经
 *   lineage.store→registry，本件零直连 lineage.graph）。
 * - folders 上抛 onFoldersChange（宿主链路：NavPane→LineagePage→ModeBar
 *   图名消费——图名单源不破）。
 * - [B4 L2 断言翻转·RR14 退役] 原 saving×切图互锁（flushing/saving 态禁切图+
 *   禁用态样式 .nav-graph-btn:disabled 沿承+确认框不可达——「禁」径消解在飞写
 *   IPC 竞态半程）随 per-folder 写链独立而退役：A 的在飞写只回写 A（挂起会话），
 *   saving 不阻切；同值重选=既有会话不双取（§8.3）。
 * - [B4 L2 断言翻转·②U1 退役] 原 dirty 切图两分支（暂存在场先挂起「未保存的
 *   修改」确认框——取消留守/「放弃修改」弃暂存）随 §2.5 #32 flush-first 语义
 *   替换：切换=提交草稿+A 未落定写即发落库（不弹弃改框）；原 [F-VISFB-63 S1]
 *   未收口草稿维（dirty∨pending 挂起）同并入 flush-first（草稿先 commit 入队）。
 * - [B4 L2] folders.changed 后的活动图重拉+dirty 跳过（S7 退化态：图名回退
 *   「主图」显示与 folderId 实值不一致、恢复沿=下次视图返回/手动切图/save-
 *   discard 后交互——不实现 dirty→clean 自动恢复（主控裁决：folder 已删的
 *   暂存图自动迁移会制造数据面惊喜，恢复沿已存在且可达））由 §2.6 #41
 *   和解链替代（结构事件→全 registry 失效+活动会话单飞和解）；当前图已删的
 *   会话处置（#42/#40）经 lineage-folder-reconcile（IO clean 清会话+回退主图；
 *   有未决写保留走既有冲突径）。
 * - [B4 L2 回炉 E4] 打开下拉即重拉活夹清单：清单的重拉点原本只有挂载效应与
 *   folders.changed 订阅；切到缓存会话零 graph IPC、导航窗格不再经 loading
 *   重挂载，无结构事件的后台变更（页面外直写库等）之后清单停在旧值。打开时
 *   重拉，清单落定后由下方既有 effect 判定并交 lineage-folder-reconcile 处置
 *   （#42/#40 同径——本件不另起清理）。
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap, apiEvents } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { useLineageStore } from './lineage.store'
import { lineageFolderReconcile } from './lineage-folder-reconcile'

export interface NavFolder {
  id: string
  name: string
}

export function NavGraphPicker(props: {
  onFoldersChange?(folders: NavFolder[] | null): void
}): JSX.Element {
  const folderId = useLineageStore((s) => s.folderId)
  const setFolder = useLineageStore((s) => s.setFolder)
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

  // folders.changed→重拉列表（S3 改名联动）。[B4 L2 §2.6 #41] 活动图重拉职责移交
  // 和解链：结构事件→全 registry 失效+活动会话单飞和解（App 级事件接线——
  // lineage-folder-reconcile bindLineageFolderEvents，脉络页不在场时挂起会话同样
  // 失效）；本件不再在事件后 load()，dirty 跳过（S7 退化态）随之退役。
  useEffect(
    () =>
      apiEvents.onFoldersChanged(() => {
        void loadFolders()
      }),
    [loadFolders]
  )

  // 活夹清单落定（首拉/事件后重拉——deps=[folders]，动作本身不重跑）：当前图不在
  // 清单=后台删夹（S4 路径 registry 化，§2.6 #42/#40）——两路径均覆盖：a) 挂载在线
  // 订阅后重拉落定；b) 挂载时会话残留已删 folder（他页已删——首拉落定即处置）。
  // 处置=lineage-folder-reconcile：会话 IO clean→清会话（历史清、owner 按 §8.4）+
  // 回退主图；有未决写（Q/F/草稿）→不得静默清，会话保留走既有冲突径（边界沿承：
  // 暂存图挂已删 folder 域，save 时笔记 upsert 可撞 CONFLICT——d1-N6 族）。
  useEffect(() => {
    if (folders === null) return
    if (folders.some((f) => f.id === useLineageStore.getState().folderId)) return
    lineageFolderReconcile.onFoldersRefreshed(folders.map((f) => f.id))
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
        onClick={() => {
          // [B4 L2 回炉 E4·S4 恢复沿] 打开即重拉活夹清单：切到缓存会话零 graph IPC、
          // 不经 loading 重挂载，HEAD 时代「切图恒重挂载本件→挂载效应重拉」的偶然
          // 刷新面已不存在——无结构事件的后台变更（页面外直写库等）之后，清单经此
          // 落定，由下方 [folders] effect 交 lineage-folder-reconcile 处置已删会话
          void loadFolders()
          setOpen((o) => !o)
        }}
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
                // [B4 L2 §2.5 #32/§8.1] 切换=flush-first：提交草稿+A 未落定写即发落库
                // （不等回执、不弹弃改框）→activeFolder 同步切；草稿提交在 setFolder 内。
                // 同值重选=既有会话不双取（§8.3）
                setOpen(false)
                setFolder(f.id)
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
