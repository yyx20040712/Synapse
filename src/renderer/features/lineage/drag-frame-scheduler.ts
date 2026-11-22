// b3: B3 commit A 纯拆件（2026-11-22）
/**
 * drag-frame-scheduler —— rAF 帧调度纯模块（B3 设计稿 §3.1）。
 *
 * [B3 commit A 性质] 纯抽取：本件只就位「可注入 rAF/clock」的调度接口与
 * 调度语义（至多一帧在飞幂等/onFrame 内重入只置 pendingInput 不双排 rAF）；
 * 调用方（card-drag-session）本批仍走原路径（effect 驻留帧循环原样搬迁），
 * 帧批接线（pointermove 只记录+schedule、段 0/段 1 flush）属 commit B。
 * [INV-100] 帧时序面「不可下沉」据此收窄：批次逻辑（调度序/排空语义/至多
 * 一帧）经注入 rAF 后可单测判别；easing/真机帧距不可下沉（归 CSS 声明锁+
 * 真机验收）。直测（至多一帧/排空/重入不双 rAF/无输入零拖拽几何读）入
 * §13 commit B 门。
 */

/** 帧调度器（§3.1 接口——schedule 幂等/cancel 摘在飞 rAF） */
export interface FrameScheduler {
  /** 记录待处理；保证至多一个 rAF 在飞（幂等） */
  schedule(): void
  /** 摘在飞 rAF（会话清理用） */
  cancel(): void
}

/**
 * 创建帧调度器（§3.1）。raf/caf 可注入（缺省=window requestAnimationFrame/
 * cancelAnimationFrame）——注入后批次逻辑可单测判别（INV-100 收窄落法）。
 *
 * 调度语义两层（W12）：
 * ①指针批合并——schedule() 幂等，保证至多一个 rAF 在飞；
 * ②重入合流——onFrame 入口置 inFrame=true 并摘在飞 rAF 标识；执行中
 *   schedule()（含滚动泵重入）只置 pendingInput=true，不再排 rAF；帧尾置
 *   inFrame=false 后按 pendingInput 合流排一个下一帧并清 pendingInput。
 * onFrame 外 schedule() 才在无在飞 rAF 时排帧。
 * 会话期自续泵（激活帧起每帧末重排下一帧直至 cancel）由 commit B 接线时
 * 在调用方驱动（每帧末 schedule()），本件不内置泵激活策略。
 */
export function createFrameScheduler(opts: {
  onFrame(now: number): void
  raf?: (cb: (t: number) => void) => number
  caf?: (id: number) => void
}): FrameScheduler {
  const raf = opts.raf ?? ((cb: (t: number) => void) => requestAnimationFrame(cb))
  const caf = opts.caf ?? ((id: number) => cancelAnimationFrame(id))
  let rafId = 0
  let inFrame = false
  let pendingInput = false

  const runFrame = (now: number): void => {
    rafId = 0
    inFrame = true
    try {
      opts.onFrame(now)
    } finally {
      inFrame = false
      if (pendingInput) {
        pendingInput = false
        rafId = raf(runFrame)
      }
    }
  }

  return {
    schedule(): void {
      if (inFrame) {
        pendingInput = true
        return
      }
      if (rafId === 0) rafId = raf(runFrame)
    },
    cancel(): void {
      if (rafId !== 0) {
        caf(rafId)
        rafId = 0
      }
      pendingInput = false
    }
  }
}
