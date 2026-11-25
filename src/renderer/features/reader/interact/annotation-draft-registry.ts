/**
 * [F-VISFB-12] annotation-draft-registry —— 批注草稿/flush 注册表（模块级单例）。
 *
 * ── 行为层（态×事件全表见 tests/unit/renderer/annotation-draft-flush.test.tsx
 *    头注与批次报告；INV-141 语义对齐：fulfilled≠已落库——flush 结果须查态）──
 * - 草稿表 drafts: Map<草稿键, { comment, failed }>——组件卸载时「已尝试未落盘」
 *   （failed/saving）或「本挂载恢复携带」的草稿入表；同目标重挂载 take 一次性
 *   消费恢复「最新值+failed 可重试态」。未尝试 dirty 不入表（锁定锚：annotation-
 *   editor-ux「卸载清防抖」等用例共享固定 id）——该面由取消/切目标先 flush 承接。
 * - flush 句柄表 flushHandles: Map<草稿键, () => Promise<unknown>>——文本控制器
 *   挂载期注册 flush（批注=annotation.id；总评=note:<paperId>），切目标/切 tab/
 *   定稿/退出收口消费（fire-first 立存不阻交互）。[B4-A 回炉三 A] 同一条目可携操作层
 *   history 命令的预 flush 准备（rawPreflush——批注+总评两宿主同一注册点）。
 * - 写侧守卫（防迟到写复活，notes.store 代际先例）：annotationWriteGen 派发前
 *   捕获代际；isAnnotationWriteLive 结果到达时判定（代际变∨墓碑=目标已删判废，
 *   零 store 同步）；annotationDraftSaved 写成功等值清条目。边界：删除 API 失败
 *   窄窗内到达的单发成功写按判废静默丢弃（服务器已有该值，本地 store 陈旧至
 *   下次事件自愈——13/14 票若需补偿再立项）。
 * - 删除侧：discardAnnotationDraft 删除发起即条目出表+代际自增；markAnnotationDeleted
 *   删除成功打墓碑（幂等）——此后 save 拒入/take 恒 null/写全判废（不复活已删目标）。
 *
 * ── 接口层 ──
 * - 全部导出为纯函数（无 React 依赖；控制器挂载绑定 useTextDraftRegistryBinding
 *   ——原驻本件的 React 例外面——[F-SLIMB4A-01 拆件]迁驻 use-text-draft-registry-
 *   binding.ts）；模块级 Map/Set 随会话存活（单用户本地应用，KB 量级线性增长
 *   接受——notes.store 模块级元数据同口径）
 */
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import type { RawPreflush } from '../state/reader-text-controller'

/** 卸载期草稿快照：comment=最新未落盘值；failed=最近一次保存尝试是否失败（重挂载恢复态依据） */
export interface AnnotationDraftSnapshot {
  comment: string
  failed: boolean
}

/** flush 句柄形态（结构兼容 use-annotation-draft 的 draft.flush；不 import 其类型以避循环） */
export type AnnotationDraftFlush = () => Promise<unknown>

/** [B4-A 回炉三 A] 操作层 history 命令的预 flush 准备（controller.flushPendingRaw——
 *  命令起步时同步调用，返回链任务体内直调的裸预 flush 体）；paperId=控制器所属 tab */
export interface AnnotationDraftRawPreflush {
  paperId: string
  prepare(): RawPreflush
}

/** 卸载后可重试的最新草稿（重挂载恢复面） */
const drafts = new Map<string, AnnotationDraftSnapshot>()

/** 挂载期 flush 句柄（切目标立存面）；rawPreflush=[回炉三 A] 操作层预 flush 准备（可缺） */
const flushHandles = new Map<string, { flush: AnnotationDraftFlush; rawPreflush?: AnnotationDraftRawPreflush }>()

/** 每目标写代际：删除发起自增——先捕获的写在结果到达时代际不匹配即判废 */
const generations = new Map<string, number>()

/** 删除成功墓碑：此后一切注册/恢复/写同步全拒（防迟到写复活/防目标复活） */
const tombstones = new Set<string>()

/** 卸载草稿入表（墓碑拒入——已删目标不复活草稿）；同 id 后写覆盖（最新值单源）。
 *  [F-VISFB-64] closing gate：退出握手冻结期用户写拒绝。quit 收口 ② 不经本表——
 *  挂载句柄 flush 的写结果经句柄返回态直喂 ④ 判定（②链零 registry 闸点，
 *  轮2 B-r1-01 实证；drafts 表只承接卸载残留=非②路径） */
export function saveAnnotationDraft(id: string, comment: string, failed: boolean): void {
  if (tombstones.has(id) || quitWriteBlocked()) {
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

/** 挂载期注册 flush 句柄（重复注册=同 id 单编辑器，覆盖无害）。
 *  [F-VISFB-64] closing gate：冻结期句柄变更拒绝（挂载/卸载用户命令——设计 §④） */
export function registerDraftFlush(id: string, flush: AnnotationDraftFlush, rawPreflush?: AnnotationDraftRawPreflush): void {
  if (quitWriteBlocked()) return
  flushHandles.set(id, { flush, rawPreflush })
}

/** 卸载注销 flush 句柄（closing gate 同上——冻结期拒绝） */
export function unregisterDraftFlush(id: string): void {
  if (quitWriteBlocked()) return
  flushHandles.delete(id)
}

/** 切目标消费：发起该目标 draft.flush（fire-first 立存）；无挂载句柄返回 null */
export function flushAnnotationDraft(id: string): Promise<unknown> | null {
  const handle = flushHandles.get(id)?.flush
  if (handle === undefined) {
    return null
  }
  return handle()
}

/**
 * [F-VISFB-14] 全量 flush 句柄快照（退出握手/关 tab 收口消费）：已挂载编辑器
 * 的句柄数组（快照——遍历期注册/注销不破坏）；clean 编辑器 flush=no-op（值
 * 等于 lastSaved 零写发出）。消费方 await 全部句柄后查各自返回态（句柄返回
 * 控制器 SaveState——'failed' 即未落库，INV-141 fulfilled≠已落库）。
 */
export function allDraftFlushHandles(): AnnotationDraftFlush[] {
  return [...flushHandles.values()].map((h) => h.flush)
}

/** [B4-A 回炉三 A] 操作层 history 命令目标 tab 的预 flush 准备快照（命令起步时逐个
 *  调 prepare）。只取该 tab 的控制器——裸预 flush 体由调用方链任务承载，他 tab 归其写链 */
export function allDraftRawPreflushes(paperId: string): AnnotationDraftRawPreflush[] {
  return [...flushHandles.values()].flatMap((h) =>
    h.rawPreflush !== undefined && h.rawPreflush.paperId === paperId ? [h.rawPreflush] : []
  )
}

/**
 * [F-VISFB-15 ①面1/3] fire-first 全量句柄立存（切 tab 离场/视图路由离场
 * 'reader' 消费——un-attempted dirty〔<1.5s 空闲窗内值，INV-141④ 不入表面〕
 * 随组件消亡丢值的预防面；[B4-A R1 §3] 离场先关闭离场目标单元并 fire flush）：
 * 同步发起各句柄 flush 不阻离场（零新增用户可见等待）；失败承接=句柄 failed→
 * 卸载注册承接重挂载重试+写路径 markTabDirty 观测面；句柄异常吞接（零
 * unhandled rejection）。挂载编辑器恒属 ACTIVE tab（AnnotationLayer 只随
 * 活动篇渲染；总评面板同）——离场消费即定向，无需 paperId 键。
 */
export function fireAllDraftFlushes(): void {
  for (const flush of allDraftFlushHandles()) {
    // [回炉 R3] 同步 throw 归 rejection（Promise.resolve().then 形——quit-flush
    // :40 先例）：零抛调用方/零阻同批后续句柄
    void Promise.resolve()
      .then(() => flush())
      .catch(() => undefined)
  }
}

/**
 * [F-VISFB-14] 注册表未落盘残留判定（退出握手 dirty 判定输入）：已卸载编辑器
 * 的 attempted/恢复携带草稿（drafts 表非空）——挂载期编辑器态由句柄返回值
 * 承载，本函数只看卸载残留面。
 */
export function hasPendingAnnotationDrafts(): boolean {
  return drafts.size > 0
}

/** 写派发前捕获代际（结果到达时经 isAnnotationWriteLive 判定是否判废） */
export function annotationWriteGen(id: string): number {
  return generations.get(id) ?? 0
}

/** 写结果存活性：代际未变且未墓碑才 live（迟到写判废——目标已删不复活） */
export function isAnnotationWriteLive(id: string, gen: number): boolean {
  return !tombstones.has(id) && (generations.get(id) ?? 0) === gen
}

/** 删除发起：草稿出表+代际自增（此后到达的先代际写全判废）；幂等。
 *  [F-VISFB-64] closing gate：冻结期删改用户命令拒绝（增删改写源面） */
export function discardAnnotationDraft(id: string): void {
  if (quitWriteBlocked()) return
  drafts.delete(id)
  generations.set(id, (generations.get(id) ?? 0) + 1)
}

/** 删除成功：打墓碑并清条目（幂等）——此后 save 拒入/take 恒 null/写全判废
 *  （[F-VISFB-64] closing gate 同上——冻结期拒绝） */
export function markAnnotationDeleted(id: string): void {
  if (quitWriteBlocked()) return
  tombstones.add(id)
  drafts.delete(id)
}
