// b3: P7-H
/**
 * [F-SPLIT-01] LineageBoardMenu —— 节点菜单+连线目标选取提示条（自
 * LineageBoard 拆出 2026-09-05；迁移 LineageBoard 头注节点菜单/加边/改父/
 * 目标选取职责段，JSX 语句零改纯搬运）。
 *
 * ── 行为层（原 LineageBoard 菜单+选取流程面）──
 * - **加边**=源节点菜单「连线到…」目标选取；**改父**=既有子边删除+新边添加
 *   两动作组合（UI 呈现单操作，service 两调用——树约束下改父=换父）；
 *   **删边/删节点**=节点菜单
 * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三拒绝路径=
 *   动作型 toast 中文 reason（**树守卫宿主=LG-01 service upsertEdge 运行时
 *   守卫**——本件零守卫代码只接 toast 呈现=双保险同 08 按钮禁用语义）
 * - 目标选取模式（源节点菜单发起：「连线到…」/「改父…」）提示条（激活期
 *   ——R2-LG11 浅色板态：白底 accent 描边，行为零变）；[F-ESC-01①] 提示条
 *   自治 Esc 键盘退出（INPUT/对话框/菜单让路三守卫——一次 Esc 只关最上层）
 * - 父边/管理入边派生驻本件（edges 经 store 自订阅；[F-LGRAPH-01②U8]
 *   kind 收敛后=首条入边+其余入边拆分）
 * - 状态归属不变：menu/pendingLink 与各对话框开关由宿主 LineageBoard 持有，
 *   本件经 props 收值+set 函数回写；store 写路径仍经 getState 单口
 *
 * ── 接口层 ──
 * - export interface PendingLink / export function LineageBoardMenu(props:
 *   { menu; pendingLink; setMenu; setPendingLink }): JSX.Element
 *   （[A1b] setTagNodeId 随脉络私有标签域退役删除；[A3 F-CONTRACTA-01
 *   2026-10-04] 核心想法对话框开关 props 随核心想法域全退役删除——对话框组
 *   挂点消亡）
 */
import { useEffect } from 'react'
import { useLineageStore } from './lineage.store'
import { LineageNodeMenu } from './LineageNodeMenu'
import type { LineageNode } from '@shared/models/lineage'

/** 目标选取模式（源节点菜单发起：「连线到…」/「改父…」；[F-LGRAPH-01②U8]
 *  ref 参考连接模式随综述边体系退役删除） */
export interface PendingLink {
  source: string
  mode: 'link' | 'reparent'
}

const MODE_HINT: Record<PendingLink['mode'], string> = {
  link: '连线模式：点击目标节点（源 → 目标，目标成为子节点）',
  reparent: '改父模式：点击新父节点'
}

/** 节点菜单锚（node+右键锚点——宿主 menu state 形状） */
export type MenuTarget = { node: LineageNode; anchor: { x: number; y: number } }

export function LineageBoardMenu(props: {
  menu: MenuTarget | null
  pendingLink: PendingLink | null
  setMenu: (v: MenuTarget | null) => void
  setPendingLink: (v: PendingLink | null) => void
}): JSX.Element {
  const { menu, pendingLink, setMenu, setPendingLink } = props
  const edges = useLineageStore((s) => s.edges)
  const store = useLineageStore.getState

  // 父边=首条入边（[②U5] 人工父双对话框入口退役——边级管理面=线身右键菜单
  // 「命名/线形与颜色/删除连线」承载；父边删除入口沿承）
  const menuInEdges = menu === null ? [] : edges.filter((e) => e.toNode === menu.node.id)
  const menuParentEdge = menuInEdges[0] ?? null

  // [F-ESC-01①] pendingLink 目标选取态自治 Esc（LineageNodeMenu 先例同型
  // ——无 mode 门；提示条挂 data-esc-family=menu 标记=单口让路探测面〔非
  // role=menu——语义非菜单〕）：守卫三段=①非 Escape/IME 组词早退；②目标
  // 为 INPUT/TEXTAREA/contentEditable 时原生优先；③对话框层（role=dialog）
  // 与菜单层（role=menu）在其上→让路（防 dialog/menu+pendingLink 同帧双关
  // 两层——一次 Esc 只关最上层）。关闭经 props.setPendingLink(null) 回写
  // （宿主 LineageBoard 持有态，本件勿直改）。
  useEffect(() => {
    if (pendingLink === null) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.isComposing) return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return // 输入焦点内=原生 Esc（改名取消等自治优先）
      }
      if (document.querySelector('[role="dialog"]') !== null) return
      if (document.querySelector('[role="menu"]') !== null) return
      setPendingLink(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pendingLink, setPendingLink])

  return (
    <>
      {/* 目标选取模式提示条（连线到…/改父…激活期——R2-LG11 浅色板态：
          白底 accent 描边，行为零变） */}
      {pendingLink !== null && (
        <div
          className="absolute left-1/2 top-2 z-(--z-float) flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
          data-testid="lineage-pending-link"
          data-esc-family="menu"
        >
          <span>{MODE_HINT[pendingLink.mode]}</span>
          <button type="button" className="underline" onClick={() => setPendingLink(null)}>
            取消
          </button>
        </div>
      )}

      {menu !== null && (
        <LineageNodeMenu
          node={menu.node}
          parentEdge={menuParentEdge}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onLinkTo={(id) => { setPendingLink({ source: id, mode: 'link' }); setMenu(null) }}
          onReparent={(id) => { setPendingLink({ source: id, mode: 'reparent' }); setMenu(null) }}
          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
        />
      )}
    </>
  )
}
