/**
 * zcode-link.service —— 设置页 zcode 联动 main 侧服务
 *
 * ── 行为层 ──
 * - detect()=五态纯 fs 检测（票面状态机；~/.zcode=CLI 痕迹最弱信号——装而未跑
 *   可接受误报，指引文案兜底）；心跳判定单源=AI-06 readStatus 的 running 字段
 *   （本服务不双写阈值——readStatus 经依赖注入消费）；readStatus 上抛
 *   （status.json 损坏）或 fs 异常→error 态含中文 reason（损坏≠missing，
 *   三态分离在 06 保持——本服务折叠为 error 呈现态，reason 原文透传）
 * - install()=技能模板递归复制至 <zcodeBaseDir>/.zcode/skills/ai-sensor/——
 *   **纯 fs，零进程（INV-21）**；覆盖装=删除重建（v1 版本对账等价——票面生命
 *   周期层）；模板缺失（SKILL.md 不在）上抛含路径中文错误
 *
 * ── 接口层 ──
 * - export interface ZcodeLinkService { zcodeDetect(): Promise<ZcodeLinkDetectRes>;
 *   zcodeInstall(): Promise<ZcodeLinkInstallRes> }（Res 形状=schemas 单一真相源）
 * - export function resolveTemplateDir(mainDir, resourcesPath, isPackaged):
 *   dev/prod 双源解析单函数收敛（prod=process.resourcesPath/ai-sensor
 *   ——extraResources 落点；dev=mainDir 上两级=仓库根的 tools/ai-sensor）
 *
 * ── 架构层 ──
 * - ai_sensor 服务族（06/07 同目录）；依赖注入 zcodeBaseDir/templateDir/
 *   readStatus（bootstrap 装配层解析注入——服务不触 app/os 保可测）
 * - 零新依赖：node:fs/promises（cp/readdir/rm/stat）
 *
 * ── 生命周期层 ──
 * - 预留：技能版本对账（应用内模板 vs 已装）；zcode 技能目录自定义路径
 * - 不做：spawn 任何进程（INV-21）；renderer 侧路径展示（B10-1）
 *
 * ── 文化层 ──
 * - 错误：install 失败上抛中文含路径（动作型，消费方 toast——INV-02）；
 *   禁静默吞错；完成后 npm run verify 绿→人工审查 git diff→翻 registry
 */
import { cp, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SensorStatus, ZcodeLinkDetectRes, ZcodeLinkInstallRes } from '../../../shared/ipc/schemas'

/** zcode 技能目录名（安装目标=join(zcodeBaseDir,'.zcode','skills',<name>)） */
export const ZCODE_SKILL_NAME = 'ai-sensor'

export interface ZcodeLinkService {
  /** 五态检测（四呈现态+error——Res.state 枚举单一真相源在 schemas） */
  zcodeDetect(): Promise<ZcodeLinkDetectRes>
  /** 递归复制技能模板（覆盖装=删除重建）；Res=fileCount */
  zcodeInstall(): Promise<ZcodeLinkInstallRes>
}

export interface ZcodeLinkDeps {
  /** zcode 基目录（prod=os.homedir()——bootstrap 注入；e2e 隔离经装配层 env 覆盖） */
  zcodeBaseDir: string
  /** 技能模板源（resolveTemplateDir 产物——bootstrap 注入） */
  templateDir: string
  /** AI-06 readStatus 单源消费（running 判定不双写） */
  readStatus: () => Promise<SensorStatus | null>
}

/** dev/prod 双源解析（单函数收敛——票面原文）：prod=resourcesPath/ai-sensor；dev=仓库 tools/ai-sensor */
export function resolveTemplateDir(
  mainDir: string,
  resourcesPath: string | null,
  isPackaged: boolean
): string {
  if (isPackaged && resourcesPath !== null) return join(resourcesPath, 'ai-sensor')
  return join(mainDir, '..', '..', 'tools', 'ai-sensor')
}

/** 文件存在性（ENOENT=false；其他错误上抛不吞——06 同型） */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === 'ENOENT') {
      return false
    }
    throw e
  }
}

/** 递归计数（install Res 的 fileCount——目录不计） */
async function countFiles(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true })
  let n = 0
  for (const e of entries) {
    if (e.isDirectory()) n += await countFiles(join(dir, e.name))
    else n += 1
  }
  return n
}

export function createZcodeLinkService(deps: ZcodeLinkDeps): ZcodeLinkService {
  const zcodeDir = join(deps.zcodeBaseDir, '.zcode')
  const skillDir = join(zcodeDir, 'skills', ZCODE_SKILL_NAME)

  return {
    async zcodeDetect() {
      try {
        if (!(await exists(zcodeDir))) {
          return { state: 'zcode-not-found' as const, status: null, overwrite: false }
        }
        if (!(await exists(join(skillDir, 'SKILL.md')))) {
          // overwrite=技能目录在但 SKILL.md 缺（部分安装）——覆盖型确认对话框事实源
          return { state: 'found-skill-missing' as const, status: null, overwrite: await exists(skillDir) }
        }
        const status = await deps.readStatus() // 上抛（status.json 损坏）→error 态
        return {
          state: status !== null && status.running ? ('running' as const) : ('installed-idle' as const),
          status,
          overwrite: false
        }
      } catch (e) {
        return {
          state: 'error' as const,
          status: null,
          overwrite: false,
          reason: e instanceof Error ? e.message : String(e)
        }
      }
    },

    async zcodeInstall() {
      const src = deps.templateDir
      if (!(await exists(join(src, 'SKILL.md')))) {
        throw new Error(`技能模板缺失（SKILL.md 不存在）：${src}——应用安装不完整或 dev 仓库结构异常`)
      }
      // 覆盖装=删除重建（v1 版本对账等价；旧残留不存活）
      await rm(skillDir, { recursive: true, force: true })
      await cp(src, skillDir, { recursive: true })
      return { fileCount: await countFiles(skillDir) }
    }
  }
}
