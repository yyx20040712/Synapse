/**
 * [AI-04] corpus-export.store —— 导出会话进度态（工单：done / strong）
 *
 * ── 行为层 ──
 * - { busy, phase('preparing'|'streaming'|'finalizing'|'done'|null), done, total,
 *   errorCount, fileCount, error }——phase/errorCount/fileCount 终局源=invoke
 *   resolve（INV-11 单源：main 会话是唯一真相源，本 store 只投影不推算）
 * - start()：发起全库会话（api.export_.corpusSession({})——目录选择在通道内
 *   main 对话框，INV-07）。发起即 busy=true+进度清零；终局 resolve→phase='done'
 *   +fileCount/errorCount 落账；终局 reject（折叠错误 EXPORT_BUSY/CANCELLED/
 *   IO_ERROR…）→进度重置+error=中文 message。终局不驻留 busy——按钮复位可重试
 * - applyProgress(p)：App 层订阅桥回写（progress 事件驱动）；**busy=false 时
 *   忽略**——终局后跨通道迟到的 progress（事件通道与 invoke 回复通道无序保证）
 *   不得把 done 态改回在途相（INV-03 迟到守卫同族）
 * - 重入守卫：busy 期间 start() 直接返回不再 invoke（通道层 EXPORT_BUSY 单飞
 *   的 UI 预防面；残余并发由 main 折叠码兜底，INV-13 消费分支=错误 message
 *   经 App 层订阅桥 toast）
 * - 终局 toast 不在本 store（App 层 useExportCorpusEvents 订阅 busy 变化沿
 *   触发——设置节卸载后反馈不丢，R14；本 store 不 import 组件域模块）
 *
 * ── 接口层 ──
 * - export const useCorpusExportStore: UseBoundStore<...>（zustand；settings
 *   域先例 settings.store 同型）
 *
 * ── 架构层 ──
 * - renderer/features/settings 域；只 import api/client 与 shared schema 类型；
 *   禁止 import 组件
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/corpus-export.test.tsx（已锁定，api 桩）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { ExportProgressEvent } from '@shared/ipc/schemas'

/** 进度相位=事件载荷三相+终局 done（invoke resolve 落账；null=未开始/已重置） */
export type CorpusExportPhase = ExportProgressEvent['phase'] | 'done'

export interface CorpusExportStore {
  /** 会话在途（含 main 对话框打开期间——发起即置位，终局复位） */
  busy: boolean
  /** 在途会话身份（首个 progress 事件建立；跨会话迟到过滤锚点） */
  sessionId: string | null
  phase: CorpusExportPhase | null
  done: number
  total: number
  /** 终局失败篇数（部分成功可见性——resolve 落账，会话中不可知） */
  errorCount: number
  /** 终局成功篇数（null=未成功终局） */
  fileCount: number | null
  /** 终局错误消息（折叠码中文 message；null=成功或未开始） */
  error: string | null
  start(): Promise<void>
  /** progress 事件回写（App 层订阅桥调用；终局后忽略） */
  applyProgress(p: ExportProgressEvent): void
}

export const useCorpusExportStore = create<CorpusExportStore>()((set, get) => ({
  busy: false,
  sessionId: null,
  phase: null,
  done: 0,
  total: 0,
  errorCount: 0,
  fileCount: null,
  error: null,

  async start() {
    if (get().busy) return
    set({ busy: true, sessionId: null, phase: null, done: 0, total: 0, errorCount: 0, fileCount: null, error: null })
    try {
      const res = await unwrap(api.export_.corpusSession({}))
      set({ busy: false, phase: 'done', errorCount: res.errorCount, fileCount: res.fileCount })
    } catch (e) {
      set({
        busy: false,
        phase: null,
        done: 0,
        total: 0,
        errorCount: 0,
        fileCount: null,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  },

  applyProgress(p) {
    const s = get()
    if (!s.busy) return
    // 跨会话迟到过滤（门一 N1 采纳）：首个 progress 建立会话身份，异身份忽略——
    // 残余窗=新会话 start 后首事件前（旧事件须跨越终局+用户点击两层，理论窗）
    if (s.sessionId !== null && s.sessionId !== p.sessionId) return
    set({ sessionId: p.sessionId, phase: p.phase, done: p.done, total: p.total })
  }
}))
