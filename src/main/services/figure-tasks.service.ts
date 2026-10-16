/**
 * [F-VISFB-43] figure-tasks.service —— 图表提取任务编排（renderer 提取桥的
 * main 侧会话面；repo/资产守卫合同=figure-store.service〔42〕）。
 *
 * ── 设计前提（主控六条件①——提取调度串行化机制声明）──
 * 单用户桌面应用+单提取会话：App 桥（useFigureExtractionBridge）对 pending
 * job 逐篇 await 串行驱动（队列深度 1/篇，跨篇按导入批序——listPending 按
 * rowid 序返回）；本服务不含并发竞态面——会话表按 token 寻址、同篇再 begin
 * 即换代，服务实例生命周期=课题数据层容器（workspace 切换重建=旧会话全灭，
 * 见「workspace 代际」）。
 *
 * ── 行为层 ──
 * - enqueue（import 完成挂点建单）：缺席 paper 跳过；已有 job（pending/
 *   ready/failed 任一）不覆写=幂等；返回新建数。
 * - beginSession：pending 单开提取会话（figureStore.beginExtraction 同步
 *   重置 pending+清旧行——重提幂等）；返回 {token, sha256}（提取输入自足）；
 *   非 pending/无单=null；同篇再 begin=换代（旧 token 即失效）。
 * - storeAsset（逐资产分笔 IPC 落点）：代际三守卫（token 在册〔workspace
 *   代际——服务实例重建即旧 token 全灭〕+paper 在场〔删除/重导入换代〕+
 *   sha 同代〔快照覆写同 id 异 sha〕）任一失守=DomainError 硬拒（会话死，
 *   桥件弃单）；per-asset DomainError（digest/PNG 魔数/超限/上限——
 *   figure-store 守卫族）→failed_count 聚合记项不空整批（00B failed≠empty），
 *   返回 {stored:false, reason}；终态判定归 completeSession。
 * - completeSession：renderer 侧 failed 并入服务端聚合；终态三分=≥1 stored
 *   →ready（excess/failedCount 落账）｜0 stored∧failed>0→failed｜0/0→ready
 *   零资产（提取过零资产≠失败）；complete 后 token 焚毁（防迟到续写）。
 * - listForPaper：figures 清单（消费面协议 URL 输入）+job 三态视图（无单=null
 *   ——「从未提取」与「提取过零资产」可区分）。
 * ── 架构层 ── services→repos 单向（figure-store 注入复用）；IPC 面=ipc/figures.ts。
 * ── 文化层 ── 测试：tests/unit/services/figure-tasks.test.ts（真库——always-active）。
 */
import { randomUUID } from 'node:crypto'
import type { Repos } from '../db/repos'
import type { FigureStoreService } from './figure-store.service'
import { DomainError } from './shared/domain-error'

export interface FigurePendingJob {
  paperId: string
  sha256: string
}

export interface FigureSessionBegin {
  token: string
  sha256: string
}

export interface FigureStoreOutcome {
  stored: boolean
  figureId: string | null
  reason: string | null
}

export interface FigureItemView {
  figureId: string
  page: number
  width: number
  height: number
}

export interface FigureJobView {
  status: 'pending' | 'ready' | 'failed'
  excess: number
  failedCount: number
}

export interface FigureTaskDeps {
  repos: Repos
  figureStore: FigureStoreService
}

interface ExtractionSession {
  paperId: string
  sha256: string
  stored: number
  failed: number
}

export function createFigureTaskService(deps: FigureTaskDeps) {
  const { repos, figureStore } = deps
  const figures = repos.figures
  const sessionsByToken = new Map<string, ExtractionSession>()

  function requireSession(token: string): ExtractionSession {
    const s = sessionsByToken.get(token)
    if (s === undefined) {
      throw new DomainError('CONFLICT', '提取会话已失效（课题切换/换代/已终结）')
    }
    return s
  }

  /** 代际守卫：paper 在场+sha 同代（job 携 paperId/pdfSha 防迟到回写） */
  function requireGeneration(s: ExtractionSession): void {
    const paper = repos.papers.findById(s.paperId)
    if (paper === null) {
      throw new DomainError('NOT_FOUND', `文献不存在（会话换代拒写）：${s.paperId}`)
    }
    if (paper.sha256 !== s.sha256) {
      throw new DomainError('CONFLICT', `文献内容已换代（sha 不符拒写）：${s.paperId}`)
    }
  }

  return {
    /** import 完成挂点建单（幂等：已有 job 任一状态不覆写）；返回新建数 */
    enqueue(paperIds: readonly string[]): number {
      let created = 0
      for (const paperId of paperIds) {
        if (repos.papers.findById(paperId) === null) continue
        if (figures.getJob(paperId) !== null) continue
        figureStore.beginExtraction(paperId)
        created += 1
      }
      return created
    },

    listPending(): FigurePendingJob[] {
      const out: FigurePendingJob[] = []
      for (const paperId of figures.listPendingPaperIds()) {
        const paper = repos.papers.findById(paperId)
        if (paper !== null) out.push({ paperId, sha256: paper.sha256 })
      }
      return out
    },

    beginSession(paperId: string): FigureSessionBegin | null {
      const job = figures.getJob(paperId)
      if (job === null || job.status !== 'pending') return null
      const paper = repos.papers.findById(paperId)
      if (paper === null) return null
      figureStore.beginExtraction(paperId)
      for (const [token, s] of sessionsByToken) {
        if (s.paperId === paperId) sessionsByToken.delete(token)
      }
      const token = randomUUID()
      sessionsByToken.set(token, { paperId, sha256: paper.sha256, stored: 0, failed: 0 })
      return { token, sha256: paper.sha256 }
    },

    async storeAsset(input: {
      token: string
      digest: string
      bytes: Uint8Array
      page: number
      width: number
      height: number
      ctmX: number
      ctmY: number
      ctmW: number
      ctmH: number
    }): Promise<FigureStoreOutcome> {
      const s = requireSession(input.token)
      requireGeneration(s)
      try {
        const r = await figureStore.storeFigure(s.paperId, {
          digest: input.digest,
          bytes: input.bytes,
          page: input.page,
          width: input.width,
          height: input.height,
          ctmX: input.ctmX,
          ctmY: input.ctmY,
          ctmW: input.ctmW,
          ctmH: input.ctmH
        })
        s.stored += 1
        return { stored: true, figureId: r.figureId, reason: null }
      } catch (e) {
        if (e instanceof DomainError) {
          s.failed += 1
          return { stored: false, figureId: null, reason: e.message }
        }
        throw e
      }
    },

    completeSession(input: { token: string; excess: number; failed: number }): { status: 'ready' | 'failed' } {
      const s = requireSession(input.token)
      requireGeneration(s)
      sessionsByToken.delete(input.token)
      const totalFailed = s.failed + input.failed
      if (s.stored === 0 && totalFailed > 0) {
        figureStore.failExtraction(s.paperId)
        return { status: 'failed' }
      }
      figureStore.completeExtraction(s.paperId, { excess: input.excess, failedCount: totalFailed })
      return { status: 'ready' }
    },

    listForPaper(paperId: string): { figures: FigureItemView[]; job: FigureJobView | null } {
      const job = figures.getJob(paperId)
      return {
        figures: figureStore.listFigures(paperId).map((f) => ({
          figureId: f.figureId,
          page: f.page,
          width: f.width,
          height: f.height
        })),
        job:
          job === null
            ? null
            : { status: job.status, excess: job.excess, failedCount: job.failedCount }
      }
    }
  }
}

export type FigureTaskService = ReturnType<typeof createFigureTaskService>
