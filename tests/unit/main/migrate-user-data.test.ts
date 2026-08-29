import { describe, expect, it, afterAll, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateLegacyUserData } from '../../../src/main/migrate-user-data'
import { ensureWorkspaceLayout } from '../../../src/main/workspace-layout'
import { DB_FILE_NAME } from '../../../src/shared/constants'

/**
 * [R2-SH1] userData 目录迁移单测（改名前 productName 派生的旧目录 → 「Synapse」
 * ——改名即用户真实数据目录搬迁，第二轮数据迁移；幂等语义先例=R1-WS1
 * workspace.fs）。旧目录名字面量在本测试中逐处硬写=契约钉死（防常量被改后
 * 迁移静默失效）。
 * 真临时目录+真 rename（node 环境零 electron 依赖——fake app 结构注入）；
 * always-active（三屋纪律：新测试不经 guardedDescribe）。
 *
 * 分支矩阵=票面 §1.2 五面：
 * ① 旧在新无 → 整体 rename+setPath 新路径 ② 新已存在 → 跳过（幂等）
 * ③ 皆无 → 全新安装零动作 ④ rename 失败 → 回落旧路径运行（数据安全红线）
 * ⑤ 集成锚：迁移后 ensureWorkspaceLayout 以新路径为 userData 消费
 */
const tmpRoots: string[] = []

async function mkAppData(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tmpRoots) await rm(dir, { recursive: true, force: true })
})

/** fake app（Electron App 路径子集同型）：userData 初值=appData/Synapse（productName 派生） */
function makeFakeApp(appDataDir: string): {
  app: Parameters<typeof migrateLegacyUserData>[0]
  setPathCalls: Array<[string, string]>
} {
  const paths = new Map<string, string>([
    ['appData', appDataDir],
    ['userData', join(appDataDir, 'Synapse')]
  ])
  const setPathCalls: Array<[string, string]> = []
  return {
    app: {
      getPath: (name) => paths.get(name) ?? '',
      setPath: (name, path) => {
        setPathCalls.push([name, path])
        paths.set(name, path)
      }
    },
    setPathCalls
  }
}

describe('R2-SH1 userData 目录迁移——分支矩阵', () => {
  it('① 旧在新无：目录整体 rename 迁移 + setPath 显式指向新路径 + info 中文留痕', async () => {
    const appData = await mkAppData('r2sh1-migrate-')
    const legacy = join(appData, 'Synapse Remake')
    const next = join(appData, 'Synapse')
    await mkdir(legacy)
    await writeFile(join(legacy, 'sentinel.txt'), '真实数据', 'utf-8')
    const { app, setPathCalls } = makeFakeApp(appData)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    migrateLegacyUserData(app)
    expect(
      existsSync(join(next, 'sentinel.txt')),
      '数据文件应随目录整体迁到新路径（rename 语义=旧位消失即备份反转）'
    ).toBe(true)
    expect(existsSync(join(legacy, 'sentinel.txt')), '旧路径数据不得残留副本').toBe(false)
    expect(
      setPathCalls.some(([n, v]) => n === 'userData' && v === next),
      'rename 成功后必须显式 setPath 新路径（Electron 启动期已缓存旧值）'
    ).toBe(true)
    expect(app.getPath('userData')).toBe(next)
    expect(
      info.mock.calls.some((args) => typeof args[0] === 'string' && args[0].includes('已迁移用户数据目录')),
      '迁移成功应有 console.info 中文一行留痕'
    ).toBe(true)
    info.mockRestore()
  })

  it('② 新路径已存在（含首迁中断残留）：跳过迁移零改动——旧目录原位不动、不 setPath', async () => {
    const appData = await mkAppData('r2sh1-skip-')
    const legacy = join(appData, 'Synapse Remake')
    const next = join(appData, 'Synapse')
    await mkdir(legacy)
    await writeFile(join(legacy, 'old.txt'), '旧数据', 'utf-8')
    await mkdir(next)
    const { app, setPathCalls } = makeFakeApp(appData)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    migrateLegacyUserData(app)
    expect(existsSync(join(legacy, 'old.txt')), '跳过分支不得动旧目录（不合并不覆盖，人工可处置）').toBe(true)
    expect(existsSync(join(next, 'old.txt')), '跳过分支不得把旧目录合入新路径').toBe(false)
    expect(setPathCalls.length, '跳过分支零 setPath（默认 userData 已是新路径）').toBe(0)
    expect(warn.mock.calls.length, '跳过分支不是故障，不得 warn').toBe(0)
    info.mockRestore()
    warn.mockRestore()
  })

  it('③ 两路径皆无：全新安装语义——零动作（不建目录、不 setPath）', async () => {
    const appData = await mkAppData('r2sh1-fresh-')
    const { app, setPathCalls } = makeFakeApp(appData)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    migrateLegacyUserData(app)
    expect(existsSync(join(appData, 'Synapse Remake')), '全新安装不得凭空建旧目录').toBe(false)
    expect(existsSync(join(appData, 'Synapse')), '全新安装语义由 Electron 按需建目录——本函数零 mkdir').toBe(false)
    expect(setPathCalls.length).toBe(0)
    info.mockRestore()
  })

  it('④ rename 失败（占用/权限）：setPath 回落旧路径继续运行 + warn 中文留痕，旧数据零损伤', async () => {
    const appData = await mkAppData('r2sh1-fallback-')
    const legacy = join(appData, 'Synapse Remake')
    await mkdir(legacy)
    await writeFile(join(legacy, 'sentinel.txt'), '真实数据', 'utf-8')
    const { app, setPathCalls } = makeFakeApp(appData)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    migrateLegacyUserData(app, {
      existsSync: (p) => existsSync(p),
      renameSync: () => {
        throw new Error('EPERM: 目录被占用（模拟占用/权限失败）')
      }
    })
    expect(app.getPath('userData'), '改名失败即以旧路径继续运行（数据安全优先于重命名完成）').toBe(legacy)
    expect(
      setPathCalls.some(([n, v]) => n === 'userData' && v === legacy),
      '回落必须显式 setPath 旧路径（默认值已指向不存在的新路径——不回落=空库丢数据观感）'
    ).toBe(true)
    expect(existsSync(join(legacy, 'sentinel.txt')), '回落分支不得动旧目录数据（红线：迁移失败不丢数据）').toBe(true)
    expect(
      warn.mock.calls.some((args) => typeof args[0] === 'string' && args[0].includes('迁移失败')),
      '回落应有 console.warn 中文留痕'
    ).toBe(true)
    warn.mockRestore()
  })

  it('⑤ 集成锚：迁移后 ensureWorkspaceLayout 以新路径为 userData 消费（遗留库随迁可用）', async () => {
    const appData = await mkAppData('r2sh1-integration-')
    const legacy = join(appData, 'Synapse Remake')
    const next = join(appData, 'Synapse')
    await mkdir(legacy)
    // 遗留布局种子：userData 根 synapse.db（ensureWorkspaceLayout 内 rename 搬入
    // workspaces/default——纯 fs 搬移不打开库，哨兵文件即真实布局形态）
    await writeFile(join(legacy, DB_FILE_NAME), '', 'utf-8')
    const { app } = makeFakeApp(appData)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    migrateLegacyUserData(app)
    const layout = await ensureWorkspaceLayout(app.getPath('userData'))
    info.mockRestore()
    expect(layout.rootDir, '课题布局根必须落在新 userData 路径下').toBe(join(next, 'workspaces'))
    expect(layout.mode).toBe('workspace')
    expect(
      existsSync(join(layout.dataDir, DB_FILE_NAME)),
      '遗留库应随目录迁移后抵达 default 课题（数据链路完整）'
    ).toBe(true)
  })
})
