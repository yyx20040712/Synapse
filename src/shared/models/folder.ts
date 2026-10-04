/**
 * [F-FOLDER-01] 文件夹（folder）模型 —— collections 表的文件夹语义跨进程单源
 * （design-final §1.3/§2：文件夹×脉络图 1:1 绑定，图名=文件夹名单一真相源）。
 *
 * 与 models/collection.ts 的关系：collections 表先于本票存在（001——导入
 * 文件夹子目录名自动挂接 M2M）；012 起表语义升级为「文献单归属文件夹」
 * （paper_collections 退役）。collectionSchema 继续服务 library/collections
 * 只读通道（导入面历史形状）；本件=文件夹域 CRUD 契约（folders/* 四通道+
 * papers/move-folder 载荷）。
 */
import { z } from 'zod'

/** 文件夹名长度上限（workspace/tags 名长上限同型——schema 与输入框 maxLength 同源消费） */
export const FOLDER_NAME_MAX = 100

/** FolderDTO：侧栏数据源（folders/list；paperCount=papers.folder_id 计数） */
export const folderSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(FOLDER_NAME_MAX),
    position: z.number().int().min(0),
    paperCount: z.number().int().min(0)
  })
  .strict()
export type Folder = z.infer<typeof folderSchema>

/** folders/create 载荷（name UNIQUE 于 collections——DOMAIN_PINS；空名/超长 schema 级拒） */
export const folderCreateReqSchema = z
  .object({ name: z.string().min(1).max(FOLDER_NAME_MAX) })
  .strict()
export type FolderCreateReq = z.infer<typeof folderCreateReqSchema>

/** folders/rename 载荷（改名即图改名——1:1 绑定单一真相源，无独立 graph 元数据） */
export const folderRenameReqSchema = z
  .object({ id: z.string().min(1), name: z.string().min(1).max(FOLDER_NAME_MAX) })
  .strict()
export type FolderRenameReq = z.infer<typeof folderRenameReqSchema>

/**
 * folders/delete 载荷。[F-ALIGN-01 D4 2026-10-04] 域删级联语义（INV-NEW-3）：
 * 删夹=删除域内全部文献及其脉络/笔记/标注/标签关联——级联链=应用层事务
 * 先文献后夹行（papers.remove 的 DDL CASCADE：paper_tags/annotations/notes/
 * ai_notes/lineage_nodes→edges 二跳+FTS 触发器）；主图禁删（service 层守卫）
 */
export const folderDeleteReqSchema = z.object({ id: z.string().min(1) }).strict()
export type FolderDeleteReq = z.infer<typeof folderDeleteReqSchema>

/**
 * papers/move-folder 载荷。[F-ALIGN-01 D5 2026-10-04] toFolderId 收紧
 * z.string().min(1)（去 nullable）——「移出」路径全域退役（D5 2026-10-04）：
 * null 载荷 schema 拒（renderer 无 null 入口）；所有文献必在文件夹（INV-NEW-2）
 */
export const paperMoveReqSchema = z
  .object({ paperId: z.string().min(1), toFolderId: z.string().min(1) })
  .strict()
export type PaperMoveReq = z.infer<typeof paperMoveReqSchema>
