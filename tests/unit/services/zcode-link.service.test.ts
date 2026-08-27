/**
 * [SR2-AI-10] zcode-link.service —— 设置页 zcode 联动 main 侧服务（锁定合约）。
 *
 * 覆盖面：detect 五态（not-found/skill-missing/installed-idle/running/error——
 * fs 夹具目录驱动+readStatus mock）/overwrite 事实（技能目录在但 SKILL.md 缺）/
 * readStatus null=从未运行不打扰 idle 判定/readStatus 上抛（status.json 损坏）→
 * error 态含中文 reason/install 递归复制（含 prompts 子目录）/覆盖装=删除重建
 * （残留旧文件不存活）/模板缺失上抛含路径/resolveTemplateDir 双源解析
 * （prod=resourcesPath/ai-sensor，dev=仓库 tools/ai-sensor）。
 * always-active（ADR-0017 裁决 3）。
 */
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createZcodeLinkService,
  resolveTemplateDir
} from '../../../src/main/services/ai_sensor/zcode-link.service'
import type { SensorStatus } from '../../../src/shared/ipc/schemas'

function status(running: boolean): SensorStatus {
  return {
    state: running ? '一读中' : '空闲',
    currentPaper: running ? 'p-1' : null,
    role: null,
    updatedAt: '2026-08-27T00:00:00Z',
    heartbeatAt: '2026-08-27T00:00:00Z',
    running
  }
}

interface Harness {
  home: string
  template: string
  readStatus: ReturnType<typeof vi.fn>
  svc: ReturnType<typeof createZcodeLinkService>
  dispose: () => Promise<void>
}

async function makeHarness(readStatusImpl?: () => Promise<SensorStatus | null>): Promise<Harness> {
  const base = await mkdtemp(join(tmpdir(), 'zcode-link-'))
  const home = join(base, 'home')
  const template = join(base, 'template')
  await mkdir(home, { recursive: true })
  // 模板夹具：SKILL.md+子目录 prompts/（递归复制面）
  await mkdir(join(template, 'prompts'), { recursive: true })
  await writeFile(join(template, 'SKILL.md'), '# 技能声明\n', 'utf8')
  await writeFile(join(template, 'companion.mjs'), '// companion\n', 'utf8')
  await writeFile(join(template, 'prompts', 'first-read.md'), '# 一读\n', 'utf8')
  const readStatus = vi.fn(readStatusImpl ?? (async () => null))
  const svc = createZcodeLinkService({ zcodeBaseDir: home, templateDir: template, readStatus })
  return {
    home,
    template,
    readStatus,
    svc,
    dispose: async () => {
      await rm(base, { recursive: true, force: true })
    }
  }
}

/** 建立 skills/ai-sensor/SKILL.md（installed 判定事实） */
async function installSkillFixture(h: Harness): Promise<void> {
  await mkdir(join(h.home, '.zcode', 'skills', 'ai-sensor'), { recursive: true })
  await writeFile(join(h.home, '.zcode', 'skills', 'ai-sensor', 'SKILL.md'), '# 已装\n', 'utf8')
}

describe('zcode-link.service detect 五态', () => {
  it('zcode-not-found：~/.zcode 不存在（技能目录父=CLI 痕迹，纯 fs）', async () => {
    const h = await makeHarness()
    try {
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('zcode-not-found')
      expect(r.status).toBeNull()
      expect(r.overwrite).toBe(false)
      expect(h.readStatus).not.toHaveBeenCalled() // 未发现即短路，不触协议
    } finally {
      await h.dispose()
    }
  })

  it('found-skill-missing：.zcode 在且 skills/ai-sensor 不存在——overwrite=false', async () => {
    const h = await makeHarness()
    try {
      await mkdir(join(h.home, '.zcode'), { recursive: true })
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('found-skill-missing')
      expect(r.overwrite).toBe(false)
    } finally {
      await h.dispose()
    }
  })

  it('found-skill-missing+overwrite：技能目录在但 SKILL.md 缺（部分安装）——overwrite=true', async () => {
    const h = await makeHarness()
    try {
      await mkdir(join(h.home, '.zcode', 'skills', 'ai-sensor'), { recursive: true })
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('found-skill-missing')
      expect(r.overwrite).toBe(true)
    } finally {
      await h.dispose()
    }
  })

  it('installed-idle：SKILL.md 在+readStatus null（工具从未运行）——不受扰', async () => {
    const h = await makeHarness(async () => null)
    try {
      await installSkillFixture(h)
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('installed-idle')
      expect(r.status).toBeNull()
    } finally {
      await h.dispose()
    }
  })

  it('installed-idle：心跳不新鲜（running=false）', async () => {
    const h = await makeHarness(async () => status(false))
    try {
      await installSkillFixture(h)
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('installed-idle')
      expect(r.status?.running).toBe(false)
    } finally {
      await h.dispose()
    }
  })

  it('running：心跳新鲜（running 单源=readStatus 输出，不双写阈值）', async () => {
    const h = await makeHarness(async () => status(true))
    try {
      await installSkillFixture(h)
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('running')
      expect(r.status?.currentPaper).toBe('p-1')
    } finally {
      await h.dispose()
    }
  })

  it('error：readStatus 上抛（status.json 损坏）→error 态含中文 reason（损坏≠missing）', async () => {
    const h = await makeHarness(async () => {
      throw new Error('status.json 读取/解析失败：…（Unexpected token）——文件损坏？')
    })
    try {
      await installSkillFixture(h)
      const r = await h.svc.zcodeDetect()
      expect(r.state).toBe('error')
      expect(r.reason).toContain('status.json')
    } finally {
      await h.dispose()
    }
  })

  it('跨格序列②：idle→running→idle（会话起止，无残留态）', async () => {
    let running = false
    const h = await makeHarness(async () => status(running))
    try {
      await installSkillFixture(h)
      expect((await h.svc.zcodeDetect()).state).toBe('installed-idle')
      running = true
      expect((await h.svc.zcodeDetect()).state).toBe('running')
      running = false
      expect((await h.svc.zcodeDetect()).state).toBe('installed-idle')
    } finally {
      await h.dispose()
    }
  })
})

describe('zcode-link.service install（纯 fs 复制，零进程——INV-21）', () => {
  it('递归复制模板至 skills/ai-sensor（含 prompts 子目录）+fileCount', async () => {
    const h = await makeHarness()
    try {
      await mkdir(join(h.home, '.zcode'), { recursive: true })
      const r = await h.svc.zcodeInstall()
      expect(r.fileCount).toBe(3)
      const dest = join(h.home, '.zcode', 'skills', 'ai-sensor')
      expect(await readFile(join(dest, 'SKILL.md'), 'utf8')).toContain('技能声明')
      expect(await readFile(join(dest, 'prompts', 'first-read.md'), 'utf8')).toContain('一读')
      // 装后 re-detect → installed-idle（迁移：skill-missing→装→idle）
      expect((await h.svc.zcodeDetect()).state).toBe('installed-idle')
    } finally {
      await h.dispose()
    }
  })

  it('覆盖装=删除重建：旧残留文件不存活', async () => {
    const h = await makeHarness()
    try {
      const dest = join(h.home, '.zcode', 'skills', 'ai-sensor')
      await mkdir(join(dest, 'stale-dir'), { recursive: true })
      await writeFile(join(dest, 'stale-file.txt'), '旧残留', 'utf8')
      await h.svc.zcodeInstall()
      expect(await readdir(dest)).not.toContain('stale-file.txt')
      expect(await readdir(dest)).not.toContain('stale-dir')
    } finally {
      await h.dispose()
    }
  })

  it('模板缺失（SKILL.md 不在）上抛中文错误含模板路径', async () => {
    const h = await makeHarness()
    try {
      await rm(join(h.template, 'SKILL.md'))
      await expect(h.svc.zcodeInstall()).rejects.toThrow(/技能模板缺失.*SKILL\.md/)
    } finally {
      await h.dispose()
    }
  })
})

describe('resolveTemplateDir 双源解析（单函数收敛）', () => {
  it('prod（isPackaged）：resourcesPath/ai-sensor（extraResources 落点）', () => {
    expect(resolveTemplateDir('C:\\app\\resources\\app.asar\\out\\main', 'C:\\app\\resources', true)).toBe(
      join('C:\\app\\resources', 'ai-sensor')
    )
  })

  it('dev：仓库 tools/ai-sensor（mainDir 上两级=仓库根）', () => {
    expect(resolveTemplateDir('E:\\repo\\out\\main', null, false)).toBe(
      join('E:\\repo', 'tools', 'ai-sensor')
    )
  })
})
