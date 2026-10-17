// b3: P7-H
/**
 * [F-VISFB-63] lineage-note-draft —— 悬浮笔记编辑草稿注册族（模块级单例，
 * annotation-draft-registry〔F-VISFB-15〕形态母本的裁剪版——单编辑会话、
 * 无恢复表：恰一编辑会话=LineageFloatingNotes 组件态 editingId/draft 的
 * 跨组件观测面）。62 号 d1 复审 W2 缺陷链：未 blur 草稿驻组件态不入暂存
 * 队列，编辑中关窗/切图/saving 窗静默丢稿（React 不对已卸载节点派发
 * onBlur——textarea 卸载无 blur 同链）。
 *
 * ── 行为面（态×事件全表=票面 T1-T10；测试=lineage-note-draft-flush.test.tsx
 *    +回炉拆件 lineage-note-draft-flush-r1.test.tsx）──
 * - pending 信号：编辑中且 draft≠note.content 即真（save 回填/他径改值均重算
 *   ——note content 经 useLineageStore selector 订阅）；等值 set=no-op 零 emit；
 *   消费面=App quitDirty 聚合第三项（关窗拦截呈现）。
 * - flush 句柄：LineageFloatingNotes 挂载期注册（commitRef 现值包装——迟到
 *   闭包取最新收口函数）；四收口消费 fireLineageNoteCommit：quit 握手 ②.5
 *   （入队后 ③ save 正道落库）/视图路由离场 lineage（fire-first 不阻路由）/
 *   切图打断（nav-graph-picker folder onClick 顶部——确认分支取消=草稿已
 *   入队保留、确认弃=含草稿全弃）/folders.changed 双分支（导入完成重取与
 *   S4 回退的前置收口——dirty/pending 跳过卸载型重载）。
 * - flushing 守卫：useLineageStore.getState().flushing=true 即 return 不
 *   commit（saving 窗 beginUnit 拒绝域〔lineage-session-ops INV-94〕——强
 *   commit 会被静默吞且组件清态谎报收口）；pending 保真由 quit-flush ④
 *   查态面承接=main confirm 降级，不静默丢。
 * - fire 后清 pending：句柄执行即草稿已转 store 暂存（lineageDirty 接棒），
 *   与卸载清理同为「信号 effect 未必及跑」的安全网（quit ④ 评估点不依赖
 *   React 调度时序——T7 确定性收口）。
 * - 卸载清理：unregister+pending 清（组件卸载=会话消亡，观测面归零）。
 *
 * ── 接口层 ──
 * - 注册族五件（set/get/subscribe/useSyncExternalStore 桥）+句柄三件+桥
 *   hook useNoteDraftBridge（体驻本件——组件 250 行红线布线 hook 化）。
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { useLineageStore } from './lineage.store'

/** 未收口草稿在场标记（编辑中且 draft≠note.content） */
let pending = false

/** 订阅者集（App 聚合面经 useSyncExternalStore 消费） */
const listeners = new Set<() => void>()

/** 挂载期收口句柄（恰一编辑会话——单槽；commitRef 现值包装） */
let flushHandle: (() => void) | null = null

function emit(): void {
  for (const cb of listeners) cb()
}

/** useSyncExternalStore 稳定引用（模块级——getSnapshot 原始值恒稳定） */
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
const getSnapshot = (): boolean => pending

/** 置位（等值 no-op 零 emit——T2 后续键零推送） */
export function setNoteDraftPending(v: boolean): void {
  if (pending === v) return
  pending = v
  emit()
}

/** 现值读（quit-flush ④ 查态面消费） */
export function noteDraftPending(): boolean {
  return pending
}

/** 订阅（测试/自持消费面） */
export function subscribeNoteDraft(cb: () => void): () => void {
  return subscribe(cb)
}

/** React 消费面（App quitDirty 聚合第三项） */
export function useNoteDraftPending(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** 挂载期注册收口句柄（编辑组件 mount effect） */
export function registerNoteDraftFlush(fn: () => void): void {
  flushHandle = fn
}

/** 卸载注销 */
export function unregisterNoteDraftFlush(): void {
  flushHandle = null
}

/**
 * fire-first commit（三收口共用）：flushing 窗 no-op（pending 保真→quit ④
 * 查态承接=main confirm）；句柄执行即草稿转 store 暂存——清 pending 与
 * 卸载清理同为信号 effect 的安全网。[R4] 句柄同步 throw=收口状态未知——
 * 吞接（pending 保真由 quit ④ 承接）不阻调用方（view-flush「不阻路由」承诺）。
 */
export function fireLineageNoteCommit(): void {
  if (useLineageStore.getState().flushing) return
  const handle = flushHandle
  if (handle === null) return
  try {
    handle()
  } catch {
    return
  }
  setNoteDraftPending(false)
}

/**
 * [F-VISFB-63] 编辑草稿桥（LineageFloatingNotes 单点装配——恰一行布线）：
 * - 挂载注册 `() => commitRef.current()`（现值取用——迟到闭包安全）；
 * - 卸载注销+清 pending；
 * - 信号 effect：editingId 在场且 draft≠note.content 置真（note content 经
 *   selector 订阅——save 回填/他径改值/他径删除〔undefined=静默出会话〕
 *   均重算）。
 */
export function useNoteDraftBridge(
  commitRef: RefObject<() => void>,
  editingId: string | null,
  draft: string
): void {
  const noteContent = useLineageStore((s) => s.floatingNotes.find((f) => f.id === editingId)?.content)
  useEffect(() => {
    // ?.: RefObject.current 可空形态（@types/react 18——挂载期恒有值，静态面收口）
    registerNoteDraftFlush(() => commitRef.current?.())
    return () => {
      unregisterNoteDraftFlush()
      setNoteDraftPending(false)
    }
  }, [commitRef])
  useEffect(() => {
    setNoteDraftPending(editingId !== null && noteContent !== undefined && draft !== noteContent)
  }, [editingId, noteContent, draft])
}
