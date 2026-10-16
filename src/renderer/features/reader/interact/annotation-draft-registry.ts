/**
 * [F-VISFB-12] annotation-draft-registry —— 批注草稿/flush 注册表（模块级单例）。
 *
 * ── 行为层（态×事件全表见 tests/unit/renderer/annotation-draft-flush.test.tsx
 *    头注与批次报告；INV-141 语义对齐：fulfilled≠已落库——flush 结果须查态）──
 * - 草稿表 drafts: Map<annotationId, { comment, failed }>——组件卸载时
 *   「已尝试未落盘」（failed/saving）或「本挂载恢复携带」的草稿入表（消费方
 *   use-annotation-draft 卸载清理判定）；同目标重挂载 take 一次性消费恢复
 *   「最新值+failed 可重试态」。未尝试 dirty 不入表（锁定锚：annotation-
 *   editor-ux「卸载清防抖」等用例共享固定 id 'anno-1'，入表即跨用例泄漏）——
 *   该面由取消/切目标先 flush 立存承接。
 * - flush 句柄表 flushHandles: Map<annotationId, () => Promise<unknown>>——
 *   编辑器挂载期注册 draft.flush，切目标（点击他条标注）时消费：fire-first
 *   发起立存不阻菜单（AnnotationLayer 点击处）。
 * - 写侧守卫（防迟到写复活，notes.store 代际先例）：annotationWriteGen 派发前
 *   捕获代际；isAnnotationWriteLive 结果到达时判定（代际变∨墓碑=目标已删判废，
 *   零 store 同步）；annotationDraftSaved 写成功等值清条目（后台写落库后注册表
 *   不留过期恢复面）。边界声明：删除 API 失败窄窗内到达的单发成功写按判废静默
 *   丢弃（服务器已有该值，本地 store 陈旧至下次事件自愈——13/14 票若需补偿
 *   再立项）。
 * - 删除侧：discardAnnotationDraft 删除发起即条目出表+代际自增；markAnnotationDeleted
 *   删除成功打墓碑（幂等）——此后 save 拒入/take 恒 null/写全判废（不复活已删目标）。
 *
 * ── 接口层 ──
 * - 全部导出为纯函数（无 React 依赖）；模块级 Map/Set 随会话存活（单用户本地
 *   应用，KB 量级线性增长接受——notes.store 模块级元数据同口径）
 */
/** 卸载期草稿快照：comment=最新未落盘值；failed=最近一次保存尝试是否失败（重挂载恢复态依据） */
export interface AnnotationDraftSnapshot {
  comment: string
  failed: boolean
}

/** flush 句柄形态（结构兼容 use-annotation-draft 的 draft.flush；不 import 其类型以避循环） */
export type AnnotationDraftFlush = () => Promise<unknown>

/** 卸载后可重试的最新草稿（重挂载恢复面） */
const drafts = new Map<string, AnnotationDraftSnapshot>()

/** 挂载期 flush 句柄（切目标立存面） */
const flushHandles = new Map<string, AnnotationDraftFlush>()

/** 每目标写代际：删除发起自增——先捕获的写在结果到达时代际不匹配即判废 */
const generations = new Map<string, number>()

/** 删除成功墓碑：此后一切注册/恢复/写同步全拒（防迟到写复活/防目标复活） */
const tombstones = new Set<string>()

/** 卸载草稿入表（墓碑拒入——已删目标不复活草稿）；同 id 后写覆盖（最新值单源） */
export function saveAnnotationDraft(id: string, comment: string, failed: boolean): void {
  if (tombstones.has(id)) {
    return
  }
  drafts.set(id, { comment, failed })
}

/** 重挂载恢复：一次性消费（取出即清——编辑存活期状态由 hook 自持，防过期恢复面） */
export function takeAnnotationDraft(id: string): AnnotationDraftSnapshot | null {
  const entry = drafts.get(id)
  if (entry === undefined) {
    return null
  }
  drafts.delete(id)
  return entry
}

/** 写成功等值清：落库值==条目值时条目过期（重挂载将由服务器值自愈为 clean）；异值保留（仍有更新草稿待存） */
export function annotationDraftSaved(id: string, comment: string): void {
  const entry = drafts.get(id)
  if (entry !== undefined && entry.comment === comment) {
    drafts.delete(id)
  }
}

/** 挂载期注册 flush 句柄（编辑器 mount effect；重复注册=同 id 单编辑器，覆盖无害） */
export function registerDraftFlush(id: string, flush: AnnotationDraftFlush): void {
  flushHandles.set(id, flush)
}

/** 卸载注销 flush 句柄 */
export function unregisterDraftFlush(id: string): void {
  flushHandles.delete(id)
}

/** 切目标消费：发起该目标 draft.flush（fire-first 立存）；无挂载句柄返回 null */
export function flushAnnotationDraft(id: string): Promise<unknown> | null {
  const handle = flushHandles.get(id)
  if (handle === undefined) {
    return null
  }
  return handle()
}

/** 写派发前捕获代际（结果到达时经 isAnnotationWriteLive 判定是否判废） */
export function annotationWriteGen(id: string): number {
  return generations.get(id) ?? 0
}

/** 写结果存活性：代际未变且未墓碑才 live（迟到写判废——目标已删不复活） */
export function isAnnotationWriteLive(id: string, gen: number): boolean {
  return !tombstones.has(id) && (generations.get(id) ?? 0) === gen
}

/** 删除发起：草稿出表+代际自增（此后到达的先代际写全判废）；幂等 */
export function discardAnnotationDraft(id: string): void {
  drafts.delete(id)
  generations.set(id, (generations.get(id) ?? 0) + 1)
}

/** 删除成功：打墓碑并清条目（幂等）——此后 save 拒入/take 恒 null/写全判废 */
export function markAnnotationDeleted(id: string): void {
  tombstones.add(id)
  drafts.delete(id)
}
