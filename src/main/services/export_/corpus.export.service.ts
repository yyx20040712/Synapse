// b3: P7-G
/**
 * [SR2-AI-03] corpus.export.service —— 五件套导出会话（工单：open / strong）
 *
 * ── 行为层 ──
 * - 会话编排（状态机全表，母本=ai-plan-review §6；INV-18 随单锚定）。
 *   态空间定义：idle=无会话；preparing=清目录+写 corpus md；streaming=逐篇
 *   发 extract-request+消费回传落盘；finalizing=全部篇终局后 manifest 终写；
 *   done/failed=终态即会话对象销毁（不驻留——终态后新会话从 idle 起新对象）；
 *   interrupted=main/renderer 同死（进程/窗口退出）——**非驻留态**：Electron
 *   单进程组下 main 死则 renderer 同死，无 IPC 悬挂/按钮卡死面；重启后新会
 *   话从 idle 起，中断目录无 manifest=工具不可激活（重跑即修复）。main 内
 *   异常≠interrupted：折叠错误码 resolve（会话 failed），不悬挂 Promise。
 *   清空重建范围=corpus/fulltext/figures 三子目录内容+manifest.json+
 *   manifest.tmp（R8 裁决原文语义）——目录根用户其他文件不动；三子目录
 *   即导出产物域，用户的任意放置视为可清理（与 corpusSet 守卫的不对称
 *   合理：轻量通道无清空语义故拒绝污染，本通道会话开宗明义清空重建）。
 *   事件迁移表：
 *   | 当前态 | 事件 | 迁移 | 动作/守卫 |
 *   | --- | --- | --- | --- |
 *   | idle | export/corpus invoke | →preparing | 单飞守卫：已有会话→EXPORT_BUSY 拒绝（INV-18 单飞条款；消费方折叠分支=UI 提示，INV-13） |
 *   | idle | （目录既有残留） | preparing 内清空 | 删旧 manifest+清空重建 corpus/fulltext/figures（残留 tmp 文件同删——终局写 manifest.tmp 后中断的残留随下次会话清理） |
 *   | preparing | md 全写完 | →streaming | 逐篇发 extract-request（上一篇 complete/error 后才发下一篇——串行编排，renderer 侧无并发面） |
 *   | preparing | repo/装配/写盘异常 | →failed | 折叠错误 resolve；manifest 不写 |
 *   | streaming | 篇 complete | streaming | 篇计数+1；全部篇终局→finalizing |
 *   | streaming | 篇 error（文件缺失/损坏） | streaming | 该篇进 errors[]，会话继续（部分成功） |
 *   | streaming | chunk invoke 折叠错误 | →failed | 折叠错误 resolve；manifest 不写；重跑修复 |
 *   | streaming | 流式落盘写盘失败（回传成功但写 corpus/fulltext/figures 出错） | →failed | 同上处置（故障源与回传失败不同——日志区分）；manifest 不写 |
 *   | finalizing | manifest 终写完成 | →done | resolve {dir,fileCount,errorCount} |
 *   | finalizing | 写盘/rename 异常 | →failed | 折叠错误 resolve |
 *   | 任意 | 进程/窗口死 | →interrupted | 无 manifest=工具不可激活；无 IPC 悬挂（同死） |
 *   跨格序列七行（实现测试须逐格闭合）：
 *   | 跨格序列 | 期望行为 |
 *   | --- | --- |
 *   | 正常全链 | preparing→streaming→finalizing→done；manifest 存在且 sha 全匹配 |
 *   | 篇失败（文件缺失/损坏） | 该篇进 errors[]，会话继续；done=部分成功，UI 呈现 errorCount |
 *   | chunk 回传失败（invoke 折叠错误） | 会话 failed；toast（INV-02）；manifest 不写；重跑修复 |
 *   | 中断（窗口关/进程退） | 无 manifest→工具不可激活；重跑=清空重建（幂等） |
 *   | 并发第二会话 | EXPORT_BUSY 拒绝+按钮 disabled |
 *   | 导出中用户导航离开设置页 | 流不中断（监听在 App 层）；完成/失败 toast 常驻可见 |
 *   | renderer 逐页回传 | 每页一 invoke，await ack 后发下一页（天然背压）——streaming 态内数据流机制（非状态迁移，载荷 schema 见 AI-02 接口层） |
 * - manifest 终局单写（R5/R8）：临时文件+rename 原子替换；会话开始删旧
 *   manifest+清空重建 corpus/fulltext/figures 三子目录；schema 含
 *   schemaVersion/exportedAt/papers[]{contentSha,fulltextSha,figures,
 *   exportedAt}+可选 errors[]{paperId,reason}（papers[] 只列成功篇）；
 *   「manifest 存在=导出完整就绪」=工具侧唯一激活判据；进度不走 manifest
 * - 幂等（R6，INV-17 随单锚定）：corpus md front-matter 不含 exportedAt
 *   （时间戳只进 manifest per-paper 条目）；contentSha/fulltextSha=文件字节
 *   sha256（node:crypto 先例）；**逐字节稳定的范围=产物文件**（corpus/
 *   fulltext/figures 及其 sha）——manifest 自身含 exportedAt 不参与逐字节
 *   断言（golden 区分：内容 golden+manifest 结构断言）
 * - 单飞（R9，迁移表 idle 行）：进行中拒第二会话=app-error 新码 EXPORT_BUSY
 *   [受锁新增]——INV-18 单飞条款锚定；消费方折叠分支=UI 提示（INV-13 语义
 *   ——折叠面消费方必须分支处理，AI-04 接线）
 * - 装配单源（R12 红线，置顶条款）：corpus md 装配只在 corpus.assemble.ts
 *   延展（[ai:*] 段=aiNotes 入参按 role→question 分组装配，语法不变）；本
 *   service 只做编排/落盘/sha/manifest——禁第二套 md 装配
 * - 通道判定（2026-08-27 开工裁决，交接书指定项）：C-02 既有 corpus/
 *   corpusSet 通道**保留**（单篇 md 快速导出+库页 md 集合，轻量面）；本单
 *   新增 export/corpus 通道=五件套全量会话（设置页「AI 语料导出」入口，
 *   AI-04）。判定依据：ADR-0011 v1.1 五件套是 AI 传感器全量基座（含
 *   fulltext/figures 提取，GB 级），与库页轻量 md 集合场景不同；两者共用
 *   corpus.assemble 装配纯函数（装配单源不破）——目录形态与会话语义分层，
 *   非双实现。**目录隔离条款**：两通道不得污染对方产物——五件套会话开始
 *   删旧 manifest+清空重建（迁移表 idle 行）；corpusSet 写入前置守卫=目标
 *   目录含 manifest.json 时拒绝（ExportDomainError 提示选空目录——防轻量
 *   md 覆盖 corpus/ 后工具按残留 manifest 误激活读新旧混合语料；守卫接线
 *   随本单交付，export.service.ts 非受锁）
 * - INTERFACE.md（interface-template.ts 静态单源，INV-11）：目录结构/
 *   front-matter 字段表/引文块语法/排序规则/页码基准（p.N 1 基——corpus.
 *   assemble 头注口径同源）/fulltext 页界 \f/figures 消费说明/版本承诺
 * - **实现裁决（2026-08-27，开工落地）**：①通道名=export/corpus-session
 *   （母本 §2.3 的 export/corpus 已被 C-02 单篇导出占用——更名避撞，交接书
 *   v3 预警兑现）②目录选择经 ipc 层系统对话框（C-02 exportTo 同型——
 *   dialogs 在 ipc 层；service 收已选 dir，单飞判定仍在本 service 单例）
 *   ③progress 事件走 exportCorpus 通道（sendEvent 注入——sendProgress
 *   同型先例，bootstrap 装配桶）
 *
 * ── 接口层 ──
 * - export function createCorpusExportService(deps): CorpusExportService
 * - exportCorpusSession({dir, paperIds?})：终局 resolve {dir,fileCount,errorCount}
 * - corpusItem(req)：AI-02 回传通道消费端（流式落盘+会话推进；载荷失配
 *   →INVALID_REQUEST 防御拒绝不扰动在途会话）
 * - IPC [受锁]：export/corpus-session 通道（Req corpusSessionReqSchema/
 *   Res corpusSessionResSchema）；export/corpus-item（AI-02 建通道，本单
 *   main 侧消费流式落盘）；exportCorpus 事件发送器经 bootstrap 装配桶注入
 *
 * ── 架构层 ──
 * - main/services/export_ 域；依赖 repos（papers/annotations/notes/ai_notes
 *   ——corpus md 与 [ai:*] 段装配数据面）+corpus.assemble+file-store
 *   （app-file:// url 解析——提取请求 url 下发）+shell/dialogs（INV-07
 *   目录选择——路径只出自 main 对话框）。**fulltext/figures 数据面=导出时
 *   AI-02 对 PDF 源文件实时提取流式落盘**（无 fulltext 表/无缓存——唯一
 *   数据源=文件库 PDF 经 app-file:// 事件载荷下发）；exportCorpus 事件
 *   发送器=对 AI-02 的驱动通道（bootstrap 装配桶注入）
 *
 * ── 生命周期层 ──
 * - 预留：增量导出（manifest 字段位预留不实现）；figures 收窄（如仅标注页）
 *   =版本化修订（INTERFACE 版本号联动，ADR-0011 v1.1 第 5 条）
 * - 不做：取消 UI（v1）；md 回写 DB（投影只读——ADR-0011 存储分层）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/corpus.export.test.ts [受锁新增]：夹具库→
 *   五件套 golden 逐字节+结构断言（ADR-0011 v1.1 验收口径：front-matter
 *   可解析/引文块数=DB 标注数/序=sortByDocumentOrder/contentSha 匹配/
 *   [ai:*] 段装配）+幂等重导逐字节稳定（范围=产物文件；manifest 结构断言
 *   另立）+状态机跨格序列（篇失败/chunk 失败/落盘失败/BUSY/中断恢复）+
 *   corpusSet 目录隔离守卫（目录含 manifest.json→拒绝）
 * - IPC 载荷量化预期：corpus-item 单条=页级（figure=页快照 base64 典型
 *   <2MB；逐页 invoke 即分块粒度——禁跨页聚合大 payload 整块，母本背压
 *   原文）
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppErrorCode } from '../../../shared/app-error'
import type {
  CorpusItemReq,
  CorpusSessionRes,
  ExportCorpusEvent,
  ExtractRequestEvent
} from '../../../shared/ipc/schemas'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Repos } from '../../db/repos'
import type { FileStore } from '../import_/file-store'
import { assembleCorpusMd, orderAiNotes } from './corpus.assemble'
import { INTERFACE_MD } from './interface-template'

/** 会话层域错误（code 经 register toAppError 结构化保留——EXPORT_BUSY 等） */
class SessionError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface CorpusExportDeps {
  repos: Repos
  fileStore: Pick<FileStore, 'resolveManagedPath'>
  /** main→renderer 单向事件出口（bootstrap 注入——sendProgress 同型先例） */
  sendEvent: (e: ExportCorpusEvent) => void
  /** 时间源（测试注入——manifest exportedAt/幂等不参与产物断言） */
  now?: () => string
}

interface ManifestPaper {
  paperId: string
  file: string
  title: string
  contentSha: string
  fulltextSha: string
  figures: string[]
  exportedAt: string
}

/** 在途会话态（单飞——工厂闭包唯一实例；终局即销毁不驻留） */
interface ActiveSession {
  sessionId: string
  dir: string
  queue: PaperDetail[]
  current: { paperId: string; fulltext: string[]; figures: string[] } | null
  papers: ManifestPaper[]
  errors: Array<{ paperId: string; reason: string }>
  done: number
  total: number
  resolve: (r: CorpusSessionRes) => void
  reject: (e: SessionError) => void
}

export interface CorpusExportService {
  /** 五件套会话（目录经 ipc 层系统对话框已选——INV-07；终局 resolve） */
  exportCorpusSession(input: { dir: string; paperIds?: string[] }): Promise<CorpusSessionRes>
  /** renderer 回传消费端（AI-02 通道：流式落盘+会话推进） */
  corpusItem(req: CorpusItemReq): Promise<{ ok: true }>
}

const MANIFEST_TMP = 'manifest.tmp.json'

export function createCorpusExportService(deps: CorpusExportDeps): CorpusExportService {
  const now = deps.now ?? (() => new Date().toISOString())
  let session: ActiveSession | null = null

  /** 会话开始清空重建（迁移表 idle 行）：三子目录+manifest 本体+tmp 残留；
   *  目录根用户其他文件不动 */
  async function cleanRebuild(dir: string): Promise<void> {
    await rm(join(dir, 'manifest.json'), { force: true })
    await rm(join(dir, MANIFEST_TMP), { force: true })
    for (const sub of ['corpus', 'fulltext', 'figures']) {
      await rm(join(dir, sub), { recursive: true, force: true })
      await mkdir(join(dir, sub), { recursive: true })
    }
    await writeFile(join(dir, 'INTERFACE.md'), INTERFACE_MD, 'utf8')
  }

  function sendProgress(s: ActiveSession, phase: 'preparing' | 'streaming' | 'finalizing'): void {
    deps.sendEvent({ type: 'progress', sessionId: s.sessionId, done: s.done, total: s.total, phase })
  }

  /** streaming→下一篇或 finalizing（advance——迁移表 streaming 行） */
  async function advance(s: ActiveSession): Promise<void> {
    const next = s.queue.shift()
    if (next !== undefined) {
      await startPaper(s, next)
      return
    }
    // finalizing：manifest 终局单写（tmp+rename 原子替换）
    sendProgress(s, 'finalizing')
    const manifest = {
      schemaVersion: 1,
      exportedAt: now(),
      papers: s.papers,
      ...(s.errors.length > 0 ? { errors: s.errors } : {})
    }
    await writeFile(join(s.dir, MANIFEST_TMP), JSON.stringify(manifest, null, 2), 'utf8')
    await rename(join(s.dir, MANIFEST_TMP), join(s.dir, 'manifest.json'))
    const res: CorpusSessionRes = {
      dir: s.dir,
      fileCount: s.papers.length,
      errorCount: s.errors.length
    }
    session = null
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
      url: `app-file://${paper.id}`,
      annotations: annotations.map((a) => ({ id: a.id, rects: a.rects }))
    }
    sendProgress(s, 'streaming')
    deps.sendEvent(req)
  }

  /** 篇终局（complete 成功落账 / error 进 errors[]）→advance。
   *  cur 由调用方同步摘牌传入（防回复-定时窗内重复终局 invoke 双推进）。 */
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
    // fulltext 终写（页界 \f）+sha；contentSha 重读 corpus md 文件字节
    const fulltext = cur?.fulltext.join('\f') ?? ''
    await writeFile(join(s.dir, 'fulltext', `${paperId}.txt`), fulltext, 'utf8')
    const fulltextSha = createHash('sha256').update(fulltext, 'utf8').digest('hex')
    const contentSha = createHash('sha256')
      .update(await readFile(join(s.dir, 'corpus', `${paperId}.md`), 'utf8'), 'utf8')
      .digest('hex')
    s.papers.push({
      paperId,
      file: `corpus/${paperId}.md`,
      title: outcome.detail.title,
      contentSha,
      fulltextSha,
      figures: cur?.figures ?? [],
      exportedAt: now()
    })
    await advance(s)
  }

  /** 落盘/编排异常=会话 failed（manifest 不写；session 释放重跑修复） */
  async function failSession(s: ActiveSession, message: string): Promise<void> {
    // 防御（门一 N2 采纳）：悬挂的终局推进不得误清新会话单飞锁/二次 reject——
    // 该不变量不依赖提取器串行协议成立
    if (session !== s) return
    // 先清理后释放单飞锁（deepseek W2：清理期间新会话的 manifest.tmp 不被误删）
    await rm(join(s.dir, MANIFEST_TMP), { force: true }).catch(() => undefined)
    session = null
    s.reject(new SessionError('IO_ERROR', message))
  }

  /** 篇终局推进延后至本 invoke 回复之后（setImmediate=检查阶段，晚于回复的微任务
   *  与 renderer 侧回复续体/extracting 复位）：complete 的处理器内同步发下一篇
   *  extract-request 会让事件先于回复到达 renderer——提取器仍在途（extracting
   *  未复位）按防御分支丢弃请求，串行链死锁（e2e 多篇序列实证 2026-08-27） */
  function deferOutcome(s: ActiveSession, run: () => Promise<void>): void {
    setImmediate(() => {
      run().catch((e) => {
        void failSession(s, `提取回传落盘失败：${e instanceof Error ? e.message : String(e)}`)
      })
    })
  }

  return {
    async exportCorpusSession(input) {
      if (session !== null) {
        throw new SessionError('EXPORT_BUSY', '导出会话进行中，请等待完成后再发起')
      }
      // preparing：清空重建+逐篇装配 corpus md（失败篇进 errors[] 不进 streaming）
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
      session = active
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
          // file_ref 全路径解析（PaperDetail.fileName 是基名——丢了 xx/yy/ 目录层，
          // e2e 真环境实证基名 stat 必失败；协议层 fileRefById 同源单点）
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
          await writeFile(join(input.dir, 'corpus', `${id}.md`), md, 'utf8')
          active.queue.push(detail)
        }
        await advance(active)
      } catch (e) {
        await failSession(active, `导出会话失败：${e instanceof Error ? e.message : String(e)}`)
      }
      return promise
    },

    async corpusItem(req) {
      const s = session
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
          const figDir = join(s.dir, 'figures', cur.paperId)
          await mkdir(figDir, { recursive: true })
          // renderer 载荷自由串不裸拼路径（路径穿越防御——C-02 safeId 同型）：
          // id 由应用生成本可信，纵深防御防篡改载荷（annotationId 含 ../ 等）
          const safeName = (raw: string): string => raw.replace(/[^a-zA-Z0-9_-]/g, '_')
          const name =
            req.figure === 'anno'
              ? `anno-${safeName(req.annotationId ?? 'unknown')}.png`
              : `page-${req.page}.png`
          await writeFile(join(figDir, name), Buffer.from(req.payload, 'base64'))
          cur.figures.push(`figures/${cur.paperId}/${name}`)
        } else if (req.kind === 'complete') {
          const detail = deps.repos.papers.detailById(cur.paperId)
          if (detail === null) throw new SessionError('INTERNAL', '篇详情在会话中消失')
          // 同步摘牌（防窗内重复终局双推进）+延后推进（回复先于下一篇请求到达）
          s.current = null
          deferOutcome(s, () => finishPaper(s, cur, { ok: true, detail }))
        } else {
          s.current = null
          deferOutcome(s, () => finishPaper(s, cur, { ok: false, reason: req.reason }))
        }
      } catch (e) {
        if (e instanceof SessionError && e.code === 'INVALID_REQUEST') throw e
        await failSession(s, `提取回传落盘失败：${e instanceof Error ? e.message : String(e)}`)
        throw e
      }
      return { ok: true }
    }
  }
}
