// b3: P7-G
/**
 * [SR2-AI-03] corpus.export.service —— 五件套导出会话编排件（工单：F-EXPORT-01 拆件后形态）
 *
 * [F-EXPORT-01] 拆件（用户裁决提前主动拆——docs/design/2026-09-18_complexity-
 * governance-ruling.md 裁决 6/§3 梯队四）：状态机六态+会话对象管理外提=
 * export-session-state.ts（**态空间迁移表母本在该件头注**，本头注只留指针）；
 * 盘面 IO 纯函数外提=corpus.export.io.ts（无状态/无事件——INV-17 幂等 sha 口径+R5/R8
 * 终局单写锚定在该件头注）；本件=纯编排：progress/extract-request 事件组包
 * （出口单点 deps.sendEvent——事件不碰盘、盘面不发事件）+推进接线。
 *
 * ── 编排面关注点（保留本件） ──
 * - 装配单源（R12 红线，置顶条款）：corpus md 装配只在 corpus.assemble.ts 延展（[ai:*] 段
 *   =aiNotes 入参按 role→question 分组装配，语法不变）；本 service 只做编排/推进/终写接线——禁第二套 md 装配。
 * - 通道判定（2026-08-27 开工裁决）：C-02 既有 corpus/corpusSet 通道**保留**
 *   （单篇 md 快速导出+库页 md 集合，轻量面）；五件套会话通道=export/corpus-
 *   session（设置页「AI 语料导出」入口，AI-04；ADR-0011 v1.1 全量基座含
 *   fulltext/figures 提取 GB 级——与轻量面场景不同；两通道共用 corpus.assemble
 *   纯函数，装配单源不破非双实现）。**目录隔离条款**：五件套会话开始删旧
 *   manifest+清空重建（态空间表 idle 行，io 件 cleanRebuild）；corpusSet 写入
 *   前置守卫=目标目录含 manifest.json 时拒绝（ExportDomainError 提示选空目录
 *   ——防轻量 md 覆盖后按残留 manifest 误激活混合语料）。
 * - INTERFACE.md（interface-template.ts 静态单源，INV-11）：目录结构/front-matter
 *   字段表/引文块语法/排序规则/页码基准（p.N 1 基——corpus.assemble 头注口径
 *   同源）/fulltext 页界 \f/figures 消费说明/版本承诺——落盘在 io 件 cleanRebuild。
 * - 实现裁决（2026-08-27）：①通道名=export/corpus-session（export/corpus 已被
 *   C-02 单篇导出占用——更名避撞）②目录选择经 ipc 层系统对话框（C-02 exportTo
 *   同型；service 收已选 dir，单飞判定在本 service 单例）③progress 事件走
 *   exportCorpus 通道（sendEvent 注入，bootstrap 装配桶）。
 *
 * ── 接口层（零改——受锁等价锁：tests/unit/services/corpus.export.test.ts 零触碰即绿；
 *    三方法语义见下方 interface JSDoc）──
 * - 架构：main/services/export_ 域；依赖 repos 装配数据面+file-store（app-file:// 解析）
 *   +state/io 两件；fulltext/figures=AI-02 实时提取流式落盘（无缓存表）。
 *   预留：增量导出/figures 收窄（版本化修订）；不做：取消 UI/md 回写 DB。
 */
import { stat } from 'node:fs/promises'
import { appFileUrl } from '../../../shared/app-file-url'
import type {
  CorpusItemReq, CorpusSessionRes, ExportCorpusEvent, ExtractRequestEvent
} from '../../../shared/ipc/schemas'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Repos } from '../../db/repos'
import { sanitizePathToken } from '../shared/sanitize'
import type { FileStore } from '../import_/file-store'
import { assembleCorpusMd, orderAiNotes } from './corpus.assemble'
import {
  cleanRebuild, finalizeManifest, readCorpusSha, removeManifestTmp,
  writeCorpusMd, writeFigure, writeFulltext, type CorpusManifest
} from './corpus.export.io'
import {
  createExportSessionState, deferOutcome, SessionError, type ActiveSession
} from './export-session-state'

export interface CorpusExportDeps {
  repos: Repos
  fileStore: Pick<FileStore, 'resolveManagedPath'>
  /** main→renderer 单向事件出口（bootstrap 注入——sendProgress 同型先例） */
  sendEvent: (e: ExportCorpusEvent) => void
  /** 时间源（测试注入——manifest exportedAt/幂等不参与产物断言） */
  now?: () => string
}

export interface CorpusExportService {
  /** 五件套会话（目录经 ipc 层系统对话框已选——INV-07；终局 resolve） */
  exportCorpusSession(input: { dir: string; paperIds?: string[] }): Promise<CorpusSessionRes>
  /** renderer 回传消费端（AI-02 通道：流式落盘+会话推进） */
  corpusItem(req: CorpusItemReq): Promise<{ ok: true }>
  /** renderer 重载/崩溃（main 存活）时中止在途会话（F-SESS-01——bootstrap 接线 webContents 事件消费；无在途会话返回 false 空转无害） */
  abortActiveSession(reason: string): Promise<boolean>
}

export function createCorpusExportService(deps: CorpusExportDeps): CorpusExportService {
  const now = deps.now ?? (() => new Date().toISOString())
  const state = createExportSessionState()

  function sendProgress(s: ActiveSession, phase: 'preparing' | 'streaming' | 'finalizing'): void {
    deps.sendEvent({ type: 'progress', sessionId: s.sessionId, done: s.done, total: s.total, phase })
  }

  /** streaming→下一篇或 finalizing（advance——迁移表 streaming 行） */
  async function advance(s: ActiveSession): Promise<void> {
    // 守卫：已终局（failed/aborted）会话的悬挂推进不得终写 manifest/resolve——abortActiveSession 与 failSession 均先同步置空会话引用（终局标记）
    if (!state.isActive(s)) return
    const next = s.queue.shift()
    if (next !== undefined) {
      await startPaper(s, next)
      return
    }
    // finalizing：manifest 终局单写（tmp+rename 原子替换——io 件）
    sendProgress(s, 'finalizing')
    const manifest: CorpusManifest = {
      schemaVersion: 1,
      exportedAt: now(),
      papers: s.papers,
      ...(s.errors.length > 0 ? { errors: s.errors } : {})
    }
    await finalizeManifest(s.dir, manifest)
    const res: CorpusSessionRes = {
      dir: s.dir,
      fileCount: s.papers.length,
      errorCount: s.errors.length
    }
    state.markTerminal(s)
    s.resolve(res)
  }

  /** 对一篇发 extract-request（url=app-file://<id>——papers.repo fileUrl 同源） */
  async function startPaper(s: ActiveSession, paper: PaperDetail): Promise<void> {
    s.current = { paperId: paper.id, fulltext: [], figures: [] }
    const annotations = deps.repos.annotations.listByPaper(paper.id)
    const req: ExtractRequestEvent = {
      type: 'extract-request',
      sessionId: s.sessionId,
      paperId: paper.id,
      url: appFileUrl(paper.id),
      annotations: annotations.map((a) => ({ id: a.id, rects: a.rects }))
    }
    sendProgress(s, 'streaming')
    deps.sendEvent(req)
  }

  /** 篇终局（complete 成功落账 / error 进 errors[]）→advance；cur 由调用方同步摘牌传入（防回复-定时窗内重复终局 invoke 双推进）。 */
  async function finishPaper(
    s: ActiveSession,
    cur: { paperId: string; fulltext: string[]; figures: string[] },
    outcome: { ok: true; detail: PaperDetail } | { ok: false; reason: string }
  ): Promise<void> {
    const paperId = cur.paperId
    s.done += 1
    if (!outcome.ok) {
      s.errors.push({ paperId, reason: outcome.reason })
      await advance(s)
      return
    }
    // fulltext 终写（页界 \f）+sha；contentSha 重读 corpus md 文件字节（io 件）
    const fulltext = cur?.fulltext.join('\f') ?? ''
    const fulltextSha = await writeFulltext(s.dir, paperId, fulltext)
    const contentSha = await readCorpusSha(s.dir, paperId)
    s.papers.push({
      paperId,
      file: `corpus/${paperId}.md`,
      title: outcome.detail.title,
      contentSha,
      fulltextSha,
      figures: cur?.figures ?? [],
      exportedAt: now(),
      // ENR-02：有缓存值则两键齐带（detailById 配对透出，INV-28）；无则全省略
      ...(outcome.detail.citedByCount !== undefined && outcome.detail.citedByCount !== null
        ? {
            citedByCount: outcome.detail.citedByCount,
            citedByFetchedAt: outcome.detail.citedByFetchedAt
          }
        : {})
    })
    await advance(s)
  }

  /** 落盘/编排异常=会话 failed（manifest 不写；会话引用释放重跑修复） */
  async function failSession(s: ActiveSession, message: string): Promise<void> {
    // 防御（门一 N2 采纳）：悬挂的终局推进不得误清新会话单飞锁/二次 reject——不依赖提取器串行协议成立
    if (!state.isActive(s)) return
    // 单飞锁同步释放（终局标记先于异步清理）：已排队（setImmediate）的悬挂终局推进
    // 在 check 阶段运行时 advance 守卫据此拦截——释放晚于该窗会竞态终写 manifest；
    // 清理窗内新会话的 manifest.tmp 不受影响（新会话 cleanRebuild 自清残留，且其
    // finalizing 终写远晚于本 rm 完成）
    state.markTerminal(s)
    await removeManifestTmp(s.dir)
    s.reject(new SessionError('IO_ERROR', message))
  }

  /** 篇终局推进延后接线：时序协议=state 件 deferOutcome（setImmediate——INV-18 补条）；失败
   *  折叠处置链在此组装（failSession 归本件——state 件不吞错不碰会话对象，包装 run 接 catch 后与拆前逐句等价）。 */
  function deferOutcomeFor(s: ActiveSession, run: () => Promise<void>): void {
    deferOutcome(() =>
      run().catch((e) => {
        void failSession(s, `提取回传落盘失败：${e instanceof Error ? e.message : String(e)}`)
      })
    )
  }

  return {
    async exportCorpusSession(input) {
      if (state.current() !== null) {
        throw new SessionError('EXPORT_BUSY', '导出会话进行中，请等待完成后再发起')
      }
      // preparing：清空重建+逐篇装配 corpus md（失败篇进 errors[] 不进 streaming）；
      // 显式传入去重（schema 只限 min/max 不限唯一——重复 id 会重复装配+manifest 重复条目）
      const ids = [...new Set(input.paperIds ?? deps.repos.papers.listAllIds())]
      let created!: ActiveSession
      const promise = new Promise<CorpusSessionRes>((resolve, reject) => {
        created = {
          sessionId: `cs-${now()}-${Math.trunc(Math.random() * 1e6)}`,
          dir: input.dir,
          queue: [],
          current: null,
          papers: [],
          errors: [],
          done: 0,
          total: ids.length,
          resolve,
          reject
        }
      })
      const active = created
      state.begin(active)
      sendProgress(active, 'preparing')
      try {
        await cleanRebuild(input.dir)
        for (const id of ids) {
          const detail = deps.repos.papers.detailById(id)
          if (detail === null) {
            // done/total=全篇口径（含 preparing 失败篇）——进度条始终收敛到 total
            active.errors.push({ paperId: id, reason: '文献记录不存在' })
            active.done += 1
            continue
          }
          // file_ref 全路径解析（fileName 是基名丢了目录层，e2e 实证基名 stat 必失败；fileRefById 同源单点）
          const fileRef = deps.repos.papers.fileRefById(id)
          const managedPath =
            fileRef !== null ? deps.fileStore.resolveManagedPath(fileRef) : null
          let fileExists = managedPath !== null
          if (managedPath !== null) {
            await stat(managedPath).catch(() => {
              fileExists = false
            })
          }
          if (!fileExists) {
            active.errors.push({ paperId: id, reason: '源 PDF 文件缺失' })
            active.done += 1
            continue
          }
          const md = assembleCorpusMd({
            paper: detail,
            note: deps.repos.notes.findByPaper(id),
            annotations: deps.repos.annotations.listByPaper(id),
            aiNotes: orderAiNotes(deps.repos.aiNotes.listByPaper(id))
          })
          await writeCorpusMd(input.dir, id, md)
          active.queue.push(detail)
        }
        await advance(active)
      } catch (e) {
        await failSession(active, `导出会话失败：${e instanceof Error ? e.message : String(e)}`)
      }
      return promise
    },

    async corpusItem(req) {
      const s = state.current()
      // 防御：载荷失配（无会话/异会话/异篇）→INVALID_REQUEST（不扰动在途会话）
      if (
        s === null ||
        s.current === null ||
        req.sessionId !== s.sessionId ||
        req.paperId !== s.current.paperId
      ) {
        throw new SessionError('INVALID_REQUEST', '回传载荷与会话在途篇不匹配')
      }
      const cur = s.current
      try {
        if (req.kind === 'fulltext') {
          cur.fulltext.push(req.payload)
        } else if (req.kind === 'figure') {
          // renderer 载荷自由串不裸拼路径（路径穿越防御——消毒单源=services/shared/sanitize，
          // F-DEDUP-01；C-02 safeId 同族）：id 由应用生成本可信，纵深防御防篡改载荷（含 ../）
          const name =
            req.figure === 'anno'
              ? `anno-${sanitizePathToken(req.annotationId ?? 'unknown')}.png`
              : `page-${req.page}.png`
          cur.figures.push(
            await writeFigure(s.dir, cur.paperId, name, Buffer.from(req.payload, 'base64'))
          )
        } else if (req.kind === 'complete') {
          const detail = deps.repos.papers.detailById(cur.paperId)
          if (detail === null) throw new SessionError('INTERNAL', '篇详情在会话中消失')
          // 同步摘牌（防窗内重复终局双推进）+延后推进（回复先于下一篇请求到达）
          s.current = null
          deferOutcomeFor(s, () => finishPaper(s, cur, { ok: true, detail }))
        } else {
          s.current = null
          deferOutcomeFor(s, () => finishPaper(s, cur, { ok: false, reason: req.reason }))
        }
      } catch (e) {
        if (e instanceof SessionError && e.code === 'INVALID_REQUEST') throw e
        await failSession(s, `提取回传落盘失败：${e instanceof Error ? e.message : String(e)}`)
        throw e
      }
      return { ok: true }
    },

    async abortActiveSession(reason: string) {
      // 迁移表 abort 行：renderer 重载/崩溃（main 存活）→在途会话 failed（复用 failSession 同型处置——清 tmp+释放单飞锁+reject，无第二套清理）
      const s = state.current()
      if (s === null) return false
      await failSession(s, reason)
      return true
    }
  }
}
