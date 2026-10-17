/**
 * [F-VISFB-61] floating-notes.service —— 悬浮笔记用例面（B6-61 数据与会话面；
 * 62 号 UI 零依赖先行落地数据/会话契约）。
 *
 * ── 行为层 ──
 * - upsertNote：幽灵 folder 拒（CONFLICT 中文——upsertEdge 端点存在性守卫
 *   同族；域归属存在性）+x/y 有限数守卫（INVALID_REQUEST——k1-N5 畸形防线
 *   同族：z.number() 放行 Infinity/NaN 的服务层兜底）→repo.upsert（id 缺省
 *   新建/提供更新或插入〔未知 id——repo upsert 语义，回炉 R3〕——全载荷
 *   合成语义归 store 侧全载荷合成，本层直写）。
 * - removeNote：repo 透传（缺席=0 幂等——removeEdge 同族；删事件落账由
 *   024 触发器承担）。
 * - notesForGraph：graph 通道装配源（folderId 域过滤；undefined=全量并集
 *   ——graph 无参历史兼容形态）。
 * - 域删级联：DDL FK CASCADE 承担（folders.service 零侵入——012/019 族
 *   域资产先例；级联行删事件落账=021 族第十表触发器）。
 *
 * ── 文化层 ──
 * - 分层单向：只经 repos 读写面；域错误经 DomainError（CONFLICT/
 *   INVALID_REQUEST——toAppError 结构化中文 reason）。测试：
 *   tests/unit/services/floating-notes.service.test.ts。
 */
import type { FloatingNote, FloatingNoteUpsert } from '../../../shared/models/lineage'
import type { FloatingNotesRepo } from '../../db/repos/floating-notes.repo'
import { DomainError } from '../shared/domain-error'

/** 域错误载体（基类一行继承=F-DEDUP-01 单源） */
class FloatingNotesDomainError extends DomainError {}

export interface FloatingNotesService {
  /** 新建（id 缺省）或更新/插入（id 提供全载荷——在场更新 created_at 保留/
   *  未知 id 插入） */
  upsertNote(input: FloatingNoteUpsert): FloatingNote
  /** 删除（缺席=0 幂等）；返回删行数 */
  removeNote(id: string): number
  /** graph 通道装配源（folderId 域过滤；undefined=全量并集） */
  notesForGraph(folderId?: string): FloatingNote[]
}

export function createFloatingNotesService(deps: {
  repo: Pick<FloatingNotesRepo, 'upsert' | 'remove' | 'listByFolder' | 'listAll'>
  /** 域归属存在性判定（注入 repos.folders.findById——'__main__' 播种行在位） */
  folderExists: (id: string) => boolean
}): FloatingNotesService {
  const { repo, folderExists } = deps

  return {
    upsertNote(input: FloatingNoteUpsert): FloatingNote {
      if (!folderExists(input.folderId)) {
        throw new FloatingNotesDomainError(
          'CONFLICT',
          `目标文件夹不存在：${input.folderId}（悬浮笔记须落在已存在的文件夹/主图）`
        )
      }
      // 有限数守卫（k1-N5 同族）：z.number() 放行 Infinity/NaN——直写 REAL 列
      // 将产生 NaN 传染读面，请求面显性拒
      if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
        throw new FloatingNotesDomainError(
          'INVALID_REQUEST',
          '悬浮笔记坐标必须为有限数（x/y 拒绝 Infinity/NaN）'
        )
      }
      return repo.upsert(input)
    },

    removeNote(id: string): number {
      return repo.remove(id)
    },

    notesForGraph(folderId?: string): FloatingNote[] {
      return folderId === undefined ? repo.listAll() : repo.listByFolder(folderId)
    }
  }
}
