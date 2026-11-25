/**
 * [F-SLIMB4A-01 拆件；F-VISFB-12] use-text-draft-registry-binding —— 文本控制器
 * 挂载绑定 hook（自 annotation-draft-registry 拆出 2026-11-25：注册表件回归「全部
 * 导出为纯函数、无 React 依赖」，React 例外面=本件；行为零变——语句原样迁驻，
 * annotation-draft-flush/editor 族全量零改即绿）。
 *
 * ── 接口层 ──
 * - export interface TextDraftBindingDeps
 * - export function useTextDraftRegistryBinding(deps): void
 *
 * ── 架构层 ──
 * - reader/interact 域 React 适配件：只 import react 与 annotation-draft-registry
 *   （注册表函数）；唯一消费方 use-annotation-draft。注册表语义（草稿表/flush 句柄
 *   表/写侧守卫/删除侧）见 annotation-draft-registry 头注。
 */
import { useLayoutEffect } from 'react'
import {
  registerDraftFlush,
  saveAnnotationDraft,
  takeAnnotationDraft,
  unregisterDraftFlush,
  type AnnotationDraftRawPreflush
} from './annotation-draft-registry'

/**
 * [B4-A R1 §11.1] 文本控制器挂载绑定（use-annotation-draft 的注册表接线——
 * 草稿、flush 句柄与文本 target 身份适配；状态机驻控制器）。useLayoutEffect
 * （key=草稿注册表键）：①attach（存活位复位+注册表订阅——StrictMode 重挂回真）
 * ②恢复（H1）卸载草稿命中且≠服务器值→恢复值+态 ③flush 句柄注册（finalize/quit/
 * 切目标收口消费面）④卸载=注销句柄+dispose+按 R1 入表（未尝试 dirty 不入表锚保持）。
 */
export interface TextDraftBindingDeps {
  /** 草稿注册表键（批注=annotation.id；总评=note:<paperId>）——句柄/草稿表同键；
   *  null=无编辑目标（空态规约：不注册、不恢复） */
  id: string | null
  initial: string
  attach(): void
  getComment(): string
  /** 已知落库值（null=当前显示值来源未落库） */
  getLastSaved(): string | null
  getState(): 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'
  /** 恢复携带（调用侧置 restored 标志+按值/failed 应用恢复态） */
  applyRestore(comment: string, failed: boolean): void
  wasRestored(): boolean
  flush(): Promise<unknown>
  dispose(): void
  /** 卸载即收口（总评 true：离场先关闭单元并无在途写时 fire flush——其空闲计时
   *  随卸载消亡；批注编辑器 false：未尝试 dirty 不入表锚，由切目标/离场挂点承接） */
  closeoutOnUnmount: boolean
  /** 卸载收口体（闭合单元+条件立存） */
  closeout(): void
  /** [B4-A 回炉三 A] 操作层 history 命令的预 flush 准备（controller.flushPendingRaw） */
  rawPreflush?(): AnnotationDraftRawPreflush
}

export function useTextDraftRegistryBinding(deps: TextDraftBindingDeps): void {
  useLayoutEffect(() => {
    const d = deps
    const id = d.id
    if (id === null) return
    d.attach()
    const entry = takeAnnotationDraft(id)
    if (entry !== null && entry.comment !== d.initial) {
      d.applyRestore(entry.comment, entry.failed)
    }
    registerDraftFlush(id, () => d.flush(), d.rawPreflush?.())
    return () => {
      // 先闭合单元+条件立存（链任务不随卸载消亡），再销毁控制器
      if (d.closeoutOnUnmount) d.closeout()
      unregisterDraftFlush(id)
      d.dispose()
      // 卸载注册（R1）：已尝试未落盘（failed/saving）或恢复携带的草稿入表；
      // 未尝试 dirty 不入（锁定锚语义保持）
      const state = d.getState()
      const attempted = state === 'failed' || state === 'saving'
      if (d.getComment() !== d.getLastSaved() && (attempted || d.wasRestored())) {
        saveAnnotationDraft(id, d.getComment(), state === 'failed')
      }
    }
    // 依赖=草稿注册表键：target 变更换控制器——整段重挂（deps 其余成员随 key 闭包稳定）
  }, [deps.id])
}
