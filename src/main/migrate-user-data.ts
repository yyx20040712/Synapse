/**
 * [R2-SH1] userData 目录迁移（改名前 productName 派生的旧目录 → 新目录
 * 「Synapse」）——应用改名后的用户真实数据目录搬迁（第二轮数据迁移；
 * 幂等形态先例=R1-WS1 workspace.fs）。
 *
 * ── 行为层（分支矩阵=票面 §1.2）──
 * | 条件 | 动作 |
 * | 新路径在（含首迁中断残留） | 跳过：零改动旧目录、零 setPath+info 一行（幂等；旧目录原位保留=天然备份，人工可处置） |
 * | 旧在新无 | renameSync 整体迁移（同卷原子，无半迁移态）+ setPath 新路径+info 中文一行 |
 * | 皆无 | 全新安装语义：零动作（目录由 Electron 按需建——现行为保持） |
 * | rename 抛错（占用/权限） | 不 fallback 复制、不动旧目录：setPath 回落旧路径继续运行
 * |   | （数据安全优先于重命名完成）+warn 中文留痕 |
 *
 * ── 接口层 ──
 * - migrateLegacyUserData(app)：app=Electron App 的路径子集（结构注入，测试
 *   fake 同型——不 import electron 类型，node 环境可测）
 * - deps 可注入 exists/rename（默认真 node:fs）——失败分支的确定性注入测试
 *   先例=quitDirtyGuard deps（Windows 管理员态下只读目录法不可靠）
 *
 * ── 架构层 ──
 * - 独立文件（非 bootstrap 内联——票面 §2 实现者裁量）：bootstrap.ts 运行时
 *   import electron 全家桶，node 环境 vitest 无法加载；本文件与 workspace-layout
 *   同级同性质（main 根启动最早段纯 fs 件），只 import node:fs/node:path，
 *   不触 db、不触 electron
 * - 调用点=bootstrap 的 SYNAPSE_USER_DATA override 分支之后（override 时跳过
 *   迁移——e2e/取证零影响）、ensureWorkspaceLayout 之前（课题布局消费 userData 根）
 *
 * ── 生命周期层 ──
 * - 旧/新路径自 app.getPath('appData') 派生（不硬编码 %APPDATA%——跨用户目录
 *   形态；目录名派生自 productName 机制在案=票面预裁①）；判定以路径存在性为
 *   准，不比对内容（预裁②）
 * - 迁移仅 bootstrap 首启触发一次；二启命中跳过分支（幂等）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/main/migrate-user-data.test.ts（always-active；回落分支
 *   必须有测试——「迁移失败不丢数据」红线）
 */
import { existsSync as fsExistsSync, renameSync as fsRenameSync } from 'node:fs'
import { join } from 'node:path'

/** Electron App 的路径子集（结构注入——App 天然满足；测试 fake 同型） */
export interface UserDataPaths {
  getPath(name: 'appData' | 'userData'): string
  setPath(name: 'userData', path: string): void
}

/** 注入面（默认真 node:fs；失败分支确定性测试用） */
export interface MigrateDeps {
  existsSync(path: string): boolean
  renameSync(from: string, to: string): void
}

/** 旧目录名=改名前 productName 派生的 userData 目录（f1 取证器实证） */
const LEGACY_DIR_NAME = 'Synapse Remake'
/** 新目录名=现 productName「Synapse」派生（package.json 单源语义） */
const NEW_DIR_NAME = 'Synapse'

export function migrateLegacyUserData(
  app: UserDataPaths,
  deps: MigrateDeps = { existsSync: fsExistsSync, renameSync: fsRenameSync }
): void {
  const appData = app.getPath('appData')
  const newPath = join(appData, NEW_DIR_NAME)
  const legacyPath = join(appData, LEGACY_DIR_NAME)
  if (deps.existsSync(newPath)) {
    console.info(`[bootstrap] 用户数据目录已就位，跳过迁移：${newPath}`)
    return
  }
  if (!deps.existsSync(legacyPath)) return // 全新安装语义（现行为保持）
  try {
    deps.renameSync(legacyPath, newPath)
    // Electron 启动期已缓存旧 userData 值——rename 后必须显式改指新路径
    app.setPath('userData', newPath)
    console.info(`[bootstrap] 已迁移用户数据目录：${legacyPath} → ${newPath}`)
  } catch (err) {
    // 数据安全优先于重命名完成：不动旧目录、不 fallback 复制，以旧路径继续
    // 运行（数据零风险，仅目录名未变）——回落必须显式 setPath（默认值已指向
    // 不存在的新路径，不回落=空库丢数据观感）
    app.setPath('userData', legacyPath)
    console.warn(`[bootstrap] 用户数据目录迁移失败，沿用旧路径继续运行：${legacyPath}`, err)
  }
}
