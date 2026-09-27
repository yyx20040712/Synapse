// b3: T3-P7B
/**
 * [T3-P7B] EdgeTypePopover —— 线型选择弹层（design-final §4；mockup
 * L287-291 .pop+L303-311 .acc 族+L1024-1077 形态/语义参考——repo 用 React+
 * 确定性 id，非直抄）。
 * - 单开手风琴恒四组（D-11；lineTypes 失配组=空 subs 兜底）+组头/chip 计数
 *   =edges/lineTypes 派生 useMemo 单源（禁双实现）。
 * - 组内首 chip=基础型（sub=null——D-P7B-3）；**sub 选中=kind+sub 成对置**
 *   （跨组选 chip 即换 kind）；edit 态即时应用+toast+保持开。
 * - 新建线型（D-P7B-4）：表单=EdgeNewSubForm/NewSubLauncher 子件（回炉 1
 *   R5 拆件）；确定=saveLineTypes 整批+edit 态自动选中即时应用（队列序
 *   lineTypes→edge 由 store FIFO 保证）；取消零写；R5 窗口禁建（saving/
 *   error disabled）；R2/R8 陈旧 edgeId 守卫（staleEdge——自闭+toast）。
 * - acts 行：edit 态=移除连线/create 态=创建连线（linkWithLine）。
 * - 定位=position:fixed+视口钳制（clampPopoverPos，h=实测弹层高——deps
 *   含 formOpen[R3 回炉 1]）；根 onClick stopPropagation（外点关闭排除面）。
 * - 共享纯逻辑拆驻 lineage-popover-shared.ts——re-export 保持测试导入面稳定。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageEdgeKind, LineTypeGroup, LineTypeSub } from '@shared/models/lineage'
import { LINE_TYPE_BASE_ORDER } from '@shared/models/lineage'
import { DASH_ROT, PALETTE } from './lineage-palette'
import { NewSubLauncher } from './EdgeNewSubForm'
import {
  BASE_NAMES,
  baseDashOf,
  clampPopoverPos,
  linePreviewStyle,
  nextSubId
} from './lineage-popover-shared'
import { showToast } from '../../shared/ui/toast-store'

export { BASE_NAMES, clampPopoverPos, nextSubId } from './lineage-popover-shared'

export function EdgeTypePopover(props: {
  mode: 'edit' | 'create'
  /** edit 态目标边 id */
  edgeId?: string
  /** create 态端点（新建连线流选型后落边） */
  from?: string
  to?: string
  /** 开层锚点（视口坐标） */
  cx: number
  cy: number
  lineTypes: LineTypeGroup[]
  edges: LineageEdge[]
  /** [R5 回炉 1] 保存态（窗口禁建：saving/error 禁「新建线型」——过期
   *  props.lineTypes 构建整批=前批静默丢失[同组 id 顶替/异组不得消失拒]；
   *  缺省 'saved'=纯只读测试面） */
  saveStatus?: 'saved' | 'saving' | 'error'
  onApplyLine(edgeId: string, kind: LineageEdgeKind, sub: string | null): void
  onCreateLine(from: string, to: string, kind: LineageEdgeKind, sub: string | null): void
  onRemoveLine(edgeId: string): void
  onSaveLineTypes(groups: LineTypeGroup[]): void
  onClose(): void
}): JSX.Element {
  const cur = props.mode === 'edit' ? props.edges.find((e) => e.id === props.edgeId) : undefined
  const [expanded, setExpanded] = useState<LineageEdgeKind>(cur?.kind ?? 'tree')
  const [selKind, setSelKind] = useState<LineageEdgeKind>(cur?.kind ?? 'tree')
  const [selSub, setSelSub] = useState<string | null>(cur?.sub ?? null)
  const [formOpen, setFormOpen] = useState(false)
  const [formName, setFormName] = useState('')

  // 恒四组（D-11）——失配组空 subs 兜底
  const groups = useMemo(
    () => LINE_TYPE_BASE_ORDER.map((b) => props.lineTypes.find((g) => g.base === b) ?? { base: b, subs: [] }),
    [props.lineTypes]
  )
  // 计数派生单源（组头 N 条/chip ct——禁第二实现）
  const counts = useMemo(() => {
    const byKind = new Map<LineageEdgeKind, number>()
    const bySub = new Map<string, number>()
    for (const e of props.edges) {
      byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1)
      const key = `${e.kind}|${e.sub ?? ''}`
      bySub.set(key, (bySub.get(key) ?? 0) + 1)
    }
    return { byKind, bySub }
  }, [props.edges])

  // 定位：fixed+钳制（h=实测弹层高——useLayoutEffect 二段钳制）
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState(() => clampPopoverPos(props.cx, props.cy, window.innerWidth, window.innerHeight, 0))
  useLayoutEffect(() => {
    const h = rootRef.current?.offsetHeight ?? 0
    setPos(clampPopoverPos(props.cx, props.cy, window.innerWidth, window.innerHeight, h))
    // [R3 回炉 1] deps 含 formOpen：表单展开增高后重钳（溢视口防）
  }, [props.cx, props.cy, expanded, props.lineTypes, props.edges, formOpen])

  const expandedGroup = groups.find((g) => g.base === expanded)!
  const subName = (kind: LineageEdgeKind, subId: string | null): string => {
    if (subId === null) return '基础型'
    return groups.find((g) => g.base === kind)?.subs.find((s) => s.id === subId)?.name ?? '基础型'
  }
  /** [R2/R8 回炉] 陈旧 edgeId 守卫（右键删边后弹层/表单持陈旧 id——查无→自闭+toast 不调 store；throw 保留=内部防御面） */
  const staleEdge = (): boolean =>
    props.mode === 'edit' &&
    props.edgeId !== undefined &&
    props.edges.find((e) => e.id === props.edgeId) === undefined

  /** chip 点击：kind+sub 成对置；edit 态即时应用+toast+保持开 */
  const pickChip = (kind: LineageEdgeKind, subId: string | null): void => {
    if (staleEdge()) {
      props.onClose()
      showToast('连线已移除', 'info')
      return
    }
    setSelKind(kind)
    setSelSub(subId)
    if (props.mode === 'edit' && props.edgeId !== undefined) {
      props.onApplyLine(props.edgeId, kind, subId)
      showToast(`线型已切换：${BASE_NAMES[kind]} · ${subName(kind, subId)}`, 'success')
    }
  }

  /** 新建确定：整批写+（edit 态）自动选中即时应用——enqueue 序=lineTypes→edge */
  const confirmNewSub = (name: string): void => {
    const subs = expandedGroup.subs
    const i = subs.length // D-10：索引=组内现数（按组单调）
    const created: LineTypeSub = {
      id: nextSubId(expanded, subs),
      name: name.trim() === '' ? `线型 ${subs.length + 1}` : name.trim(),
      color: PALETTE[i % PALETTE.length]!,
      dash: DASH_ROT[i % DASH_ROT.length]!,
      w: 1.7
    }
    props.onSaveLineTypes(groups.map((g) => (g.base === expanded ? { ...g, subs: [...g.subs, created] } : g)))
    setSelKind(expanded)
    setSelSub(created.id)
    // [R8 回炉 2] 自动应用挂陈旧守卫：线型写保留（合法入队），apply 跳过+自闭+toast
    if (staleEdge()) {
      setFormOpen(false)
      props.onClose()
      showToast('连线已移除', 'info')
      return
    }
    if (props.mode === 'edit' && props.edgeId !== undefined) props.onApplyLine(props.edgeId, expanded, created.id)
    showToast(`已新建子线型：${BASE_NAMES[expanded]} · ${created.name}`, 'success')
    setFormOpen(false)
  }

  return (
    <div
      className="pop edge-pop"
      data-testid="edge-pop"
      ref={rootRef}
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>线 型{props.mode === 'create' ? ' · 新建连线' : ''}</h4>
      {groups.map((g) => {
        const open = g.base === expanded
        const n = counts.byKind.get(g.base) ?? 0
        return (
          <div className="acc" key={g.base}>
            <button
              type="button"
              className={open ? 'acc-head on' : 'acc-head'}
              data-base={g.base}
              onClick={() => {
                setExpanded(g.base)
                setFormOpen(false)
              }}
            >
              <span className="tri">{open ? '▾' : '▸'}</span>
              {BASE_NAMES[g.base]}
              <span className="cnt">
                {n} 条 · {g.subs.length} 型
              </span>
            </button>
            {open && (
              <div className="acc-body">
                {/* 组内首 chip=基础型（sub=null——空组必需+可回退 D-P7B-3） */}
                <button
                  type="button"
                  className={selKind === g.base && selSub === null ? 'schip on' : 'schip'}
                  data-sub="base"
                  onClick={() => pickChip(g.base, null)}
                >
                  <i style={linePreviewStyle(1.6, baseDashOf(g.base), 'var(--accent)')} />
                  <span className="nm">基础型</span>
                  <span className="ct">{counts.bySub.get(`${g.base}|`) ?? 0}</span>
                </button>
                {g.subs.map((s) => (
                  <button
                    type="button"
                    className={selKind === g.base && selSub === s.id ? 'schip on' : 'schip'}
                    data-sub={s.id}
                    key={s.id}
                    onClick={() => pickChip(g.base, s.id)}
                  >
                    <i style={linePreviewStyle(s.w, s.dash, s.color)} />
                    <span className="nm">{s.name}</span>
                    <span className="ct">{counts.bySub.get(`${g.base}|${s.id}`) ?? 0}</span>
                  </button>
                ))}
                <NewSubLauncher
                  saveLocked={props.saveStatus !== undefined && props.saveStatus !== 'saved'}
                  formOpen={formOpen}
                  name={formName}
                  onName={setFormName}
                  preview={linePreviewStyle(
                    1.7,
                    DASH_ROT[expandedGroup.subs.length % DASH_ROT.length]!,
                    PALETTE[expandedGroup.subs.length % PALETTE.length]!
                  )}
                  onOpen={() => {
                    setFormName(`线型 ${expandedGroup.subs.length + 1}`)
                    setFormOpen(true)
                  }}
                  onConfirm={() => confirmNewSub(formName)}
                  onCancel={() => setFormOpen(false)}
                />
              </div>
            )}
          </div>
        )
      })}
      <div className="acts">
        {props.mode === 'create' ? (
          <button
            type="button"
            className="pbtn pri"
            data-testid="edge-pop-act-create"
            onClick={() => {
              props.onCreateLine(props.from ?? '', props.to ?? '', selKind, selSub)
              props.onClose()
            }}
          >
            创建连线
          </button>
        ) : (
          <button
            type="button"
            className="pbtn dgr"
            data-testid="edge-pop-act-del"
            onClick={() => {
              if (props.edgeId !== undefined) props.onRemoveLine(props.edgeId)
              props.onClose()
            }}
          >
            移除连线
          </button>
        )}
      </div>
      <div className="foot-note">B2 点击分组展开 → 选子线型</div>
    </div>
  )
}
