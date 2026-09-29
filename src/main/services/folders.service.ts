/**
 * [F-FOLDER-01] folders.service —— 文件夹域用例（CRUD 编排+事件广播+S1 闸）。
 *
 * ── 行为层（design-final §2.1/§3.1）──
 * - list：repos.folders.listWithCounts()（paperCount=papers.folder_id 计数）
 * - create：trim 空→INVALID_REQUEST；同名→CONFLICT（name UNIQUE 于 collections
 *   ——DOMAIN_PINS，预检先例=tags rename）；成功→folders.changed 广播
 * - rename：trim 空→INVALID_REQUEST；不存在→NOT_FOUND；他名占用→CONFLICT；
 *   成功→folders.changed（图名 1:1 跟随=同表 name 列，无独立 graph 元数据——S3）
 * - delete：不存在→NOT_FOUND；单语句 DELETE（级联 DDL 承担：文献 SET NULL+
 *   节点 CASCADE+边二跳——DOMAIN_PINS）；成功→folders.changed+lineage.changed
 *   （图结构级联变=S4 脉络页回退依据）
 * - 写三入口（create/rename/delete）S1 队列闸（INV-91）：lineagePending()=true
 *   →CONFLICT 拒绝（沿 workspace.service importInFlight 先例——拒时零库副作用）
 *
 * ── 接口层 ──
 * - export function createFoldersService(deps): ApiHandlers['folders']
 *
 * ── 架构层 ──
 * - 只依赖 repos 桶+注入判定源/事件出口（services 禁直连 db——ESLint 强制）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/folders.service.test.ts [F-FOLDER-01 受锁新增]
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import { MAIN_GRAPH_ID } from '../../shared/models/lineage'
import type { Repos } from '../db/repos'
import { DomainError } from './shared/domain-error'

/** 域错误载体（基类一行继承=F-DEDUP-01 单源） */
class FoldersDomainError extends DomainError {}

/** S1 队列闸拒绝（INV-91——renderer 脉络写队列 pending 期间文件夹突变会复活
 *  孤儿节点/产生跨图残留；用户稍后重试：先保存编辑再操作文件夹） */
function lineageSavePending(): FoldersDomainError {
  return new FoldersDomainError('CONFLICT', '脉络图编辑保存中，请先完成保存再操作文件夹')
}

export interface FoldersServiceDeps {
  repos: Repos
  /** [F-FOLDER-01] INV-91 S1 队列闸判定源（bootstrap 注入 main-window
   *  lineagePending 缓存读——renderer useLineageDirty 沿 setQuitDirty 通道上报） */
  lineagePending: () => boolean
  /** folders.changed 事件出口（main→renderer 失效通知——空载荷，renderer 重拉） */
  sendFoldersChanged: () => void
  /** lineage.changed 事件出口（图结构级联变——delete 后脉络页回退 S4） */
  sendLineageChanged: () => void
}

export function createFoldersService(deps: FoldersServiceDeps): ApiHandlers['folders'] {
  const { folders } = deps.repos

  return {
    async list(_req) {
      return folders.listWithCounts()
    },

    async create(req) {
      const name = req.name.trim()
      if (name === '') {
        // zod min(1) 拦不住纯空格——service 防御（tags upsert/rename 同序）
        throw new FoldersDomainError('INVALID_REQUEST', '文件夹名不能为空')
      }
      if (deps.lineagePending()) throw lineageSavePending()
      if (folders.findByName(name) !== null) {
        throw new FoldersDomainError('CONFLICT', '文件夹名已被占用')
      }
      const folder = folders.create(name)
      deps.sendFoldersChanged()
      return folder
    },

    async rename(req) {
      const name = req.name.trim()
      if (name === '') {
        throw new FoldersDomainError('INVALID_REQUEST', '文件夹名不能为空')
      }
      if (deps.lineagePending()) throw lineageSavePending()
      if (folders.findById(req.id) === null) {
        throw new FoldersDomainError('NOT_FOUND', `文件夹不存在：${req.id}`)
      }
      const clash = folders.findByName(name)
      if (clash !== null && clash.id !== req.id) {
        throw new FoldersDomainError('CONFLICT', '文件夹名已被占用')
      }
      folders.rename(req.id, name)
      deps.sendFoldersChanged() // 图名 1:1 跟随（S3 联动数据源）
      return { ok: true as const }
    },

    async delete(req) {
      // [回炉码 4/d1-W2/k1-W1] 主图禁删：id='__main__'=存量脉络承载锚（迁移
      // 012 存量行全集）——删除将灭主图全部节点/边（DDL 级联），特例域错误
      // 拒绝；整理路径=先把文献移至其他文件夹
      if (req.id === MAIN_GRAPH_ID) {
        throw new FoldersDomainError('CONFLICT', '主图不可删除——请先将文献移动到其他文件夹')
      }
      if (deps.lineagePending()) throw lineageSavePending()
      if (folders.findById(req.id) === null) {
        throw new FoldersDomainError('NOT_FOUND', `文件夹不存在：${req.id}`)
      }
      // 级联=DDL 承担（012：papers.folder_id SET NULL+lineage_nodes CASCADE
      // ——边随节点二跳）；确认弹窗计数面（nodeCount/edgeCount）=renderer 经
      // lineage.graph(folderId) 派生，不经本通道
      folders.remove(req.id)
      deps.sendFoldersChanged()
      deps.sendLineageChanged()
      return { ok: true as const }
    }
  }
}
