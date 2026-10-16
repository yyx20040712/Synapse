/**
 * [F-VISFB-42] figure-store.service —— 派生图表资产合同服务件（repo+file-store
 * 编排；提取管线蓝本=00B 接手单 20261016-visfbb0/02）。
 *
 * ── 行为层（提取会话状态机：begin → store×N → complete/fail）──
 * - beginExtraction：job=pending 零计数+旧资产行清空（重提取换季——磁盘旧
 *   文件内容寻址覆写，孤儿 digest 容忍=派生面既定边界，随篇目录硬删收口）。
 * - storeFigure 守卫序（逐条先拒后写）：①IPC 单笔 ≤FIGURE_IPC_MAX_BYTES（00B
 *   §四逐资产分笔守卫）②paper 在场（NOT_FOUND——FK 前置校验）③digest 完整性
 *   （sha256(bytes)===digest——防调用方谎报键）④PNG 魔数校验〔回炉①B-1
 *   主控收紧 PNG-only：bytes 前 8 字节须为 89 50 4E 47 0D 0A 1A 0A——00B
 *   JPEG 条款是「许可」非「要求」，现状出口（file_ref .png 后缀/协议 MIME
 *   image/png/白名单形态）三处钉死 PNG；JPEG 有损变体若未来立项=023 加
 *   format 列+file_ref/MIME/白名单三处随改（[locked-change]，43 票面承载）〕
 *   ⑤去重（findByDigest 命中=幂等复用 figureId，零写）⑥每篇上限
 *   FIGURE_MAX_PER_PAPER（渲染端截断契约的服务端防线——超限拒，excess 记档
 *   归 completeExtraction）。
 * - 落盘=file-store storeFigureBytes（atomicWriteFile tmp+rename 单源——INV-66
 *   族）；行入库=figure.repo insertFigure。
 * - completeExtraction：job=ready+excess/failedCount 落账（failed≠empty：ready
 *   +failedCount>0=「有失败项的完成」≠整批 failed——单图解码失败记档不空整批）。
 * - failExtraction：job=failed（整批失败终态——PDF 不可读/轮询超时族）。
 * - removePaperAssets：磁盘篇目录硬删（DB 行已随 papers FK CASCADE 消亡——
 *   本方法只管资产面；INV-133 扩面：硬删语义+非致命捕获在调用侧）。
 *
 * ── 架构层 ──
 * - services→repos 单向（deps 注入 Repos+FileStore）；本批零 IPC（renderer 面
 *   =43 票）；删除链接线=library/folders service 注入 figureAssets。
 *
 * ── 文化层 ──
 * - 守卫错误=DomainError（INVALID_REQUEST/NOT_FOUND）；测试：
 *   tests/unit/services/figure-store.test.ts + figures-delete-chain.test.ts。
 */
import { createHash, randomUUID } from 'node:crypto'
import { FIGURE_IPC_MAX_BYTES, FIGURE_MAX_PER_PAPER } from '../../shared/constants'
import type { Repos } from '../db/repos'
import type { FigureJobRow, FigureRow } from '../db/repos/figure.repo'
import type { FigureFileStore } from './import_/file-store'
import { DomainError } from './shared/domain-error'

export interface FigureAssetInput {
  /** 解码位图 sha256（hex64）——digest 单键（00B：禁 ref 做去重键） */
  digest: string
  bytes: Uint8Array
  /** 1 基页码（首 draw 页即归属页） */
  page: number
  width: number
  height: number
  ctmX: number
  ctmY: number
  ctmW: number
  ctmH: number
}

export interface FigureStoreService {
  /** 提取会话开始：job pending+旧资产行清空（paper 缺席 NOT_FOUND） */
  beginExtraction(paperId: string): void
  storeFigure(paperId: string, asset: FigureAssetInput): Promise<{ figureId: string; fileRef: string }>
  /** 完成：job ready+excess（超上限截断记档）+failedCount（单图失败计数） */
  completeExtraction(paperId: string, summary: { excess: number; failedCount: number }): void
  /** 整批失败终态（PDF 不可读/轮询超时族） */
  failExtraction(paperId: string): void
  getJob(paperId: string): FigureJobRow | null
  listFigures(paperId: string): FigureRow[]
  /** 协议查表（app-file figure 分支 lookup 源） */
  figureFileRef(paperId: string, figureId: string): string | null
  /** 删除链：磁盘篇目录硬删（失败抛 FileStoreError——调用侧 warn 非致命） */
  removePaperAssets(paperId: string): Promise<void>
}

export interface FigureStoreDeps {
  repos: Repos
  fileStore: FigureFileStore
}

/** 〔回炉①B-1〕PNG 魔数（89 50 4E 47 0D 0A 1A 0A）——PNG-only 收紧的判定单源 */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

function isPngBytes(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_MAGIC.length) return false
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return false
  }
  return true
}

export function createFigureStoreService(deps: FigureStoreDeps): FigureStoreService {
  const { repos, fileStore } = deps
  // 〔F-VISFB-43 条件⑤收编〕Repos.figures 转必选——42 时代的缺席 fail-fast
  // 守卫随可选键退役删除（类型面单源）
  const figures = repos.figures

  function requirePaper(paperId: string): void {
    if (repos.papers.findById(paperId) === null) {
      throw new DomainError('NOT_FOUND', `文献不存在：${paperId}`)
    }
  }

  function requireSummaryShape(n: number, label: string): void {
    if (!Number.isInteger(n) || n < 0) {
      throw new DomainError('INVALID_REQUEST', `${label} 须为非负整数：${String(n)}`)
    }
  }

  return {
    beginExtraction(paperId): void {
      requirePaper(paperId)
      repos.withTransaction(() => {
        figures.setJob(paperId, { status: 'pending', excess: 0, failedCount: 0 })
        figures.removeByPaper(paperId)
      })
    },

    async storeFigure(paperId, asset) {
      if (asset.bytes.byteLength > FIGURE_IPC_MAX_BYTES) {
        throw new DomainError(
          'INVALID_REQUEST',
          `图表资产超过单笔上限（${String(asset.bytes.byteLength)} > ${String(FIGURE_IPC_MAX_BYTES)} 字节）——降载后重试`
        )
      }
      requirePaper(paperId)
      const actual = createHash('sha256').update(asset.bytes).digest('hex')
      if (actual !== asset.digest) {
        throw new DomainError('INVALID_REQUEST', '图表资产 digest 与字节内容不符（sha256 校验失败）')
      }
      // 〔回炉①B-1〕PNG 魔数校验（守卫序④——digest 之后、去重之前；短于 8 字节
      // 同拒）；JPEG 有损变体若未来立项=023 加 format 列+file_ref/MIME/白名单
      // 三处随改（[locked-change]，43 票面承载）
      if (!isPngBytes(asset.bytes)) {
        throw new DomainError('INVALID_REQUEST', '图表资产须为 PNG 编码')
      }
      const hit = figures.findByDigest(paperId, asset.digest)
      if (hit !== null) {
        return { figureId: hit.figureId, fileRef: hit.fileRef }
      }
      if (figures.countByPaper(paperId) >= FIGURE_MAX_PER_PAPER) {
        throw new DomainError(
          'INVALID_REQUEST',
          `图表资产超出每篇上限 ${String(FIGURE_MAX_PER_PAPER)}——超限面应截断记 excess`
        )
      }
      const fileRef = await fileStore.storeFigureBytes(paperId, asset.digest, asset.bytes)
      const figureId = randomUUID()
      figures.insertFigure({
        figureId,
        paperId,
        digest: asset.digest,
        fileRef,
        page: asset.page,
        width: asset.width,
        height: asset.height,
        ctmX: asset.ctmX,
        ctmY: asset.ctmY,
        ctmW: asset.ctmW,
        ctmH: asset.ctmH
      })
      return { figureId, fileRef }
    },

    completeExtraction(paperId, summary): void {
      requirePaper(paperId)
      requireSummaryShape(summary.excess, 'excess')
      requireSummaryShape(summary.failedCount, 'failedCount')
      figures.setJob(paperId, {
        status: 'ready',
        excess: summary.excess,
        failedCount: summary.failedCount
      })
    },

    failExtraction(paperId): void {
      requirePaper(paperId)
      figures.setJob(paperId, { status: 'failed', excess: 0, failedCount: 0 })
    },

    getJob(paperId) {
      return figures.getJob(paperId)
    },

    listFigures(paperId) {
      return figures.listByPaper(paperId)
    },

    figureFileRef(paperId, figureId) {
      return figures.fileRefByFigure(paperId, figureId)
    },

    removePaperAssets(paperId) {
      return fileStore.removePaperFigures(paperId)
    }
  }
}
