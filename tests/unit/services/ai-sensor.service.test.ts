/**
 * [SR2-AI-06] ai-sensor.service —— 伴随进程文件协议应用侧（锁定合约）。
 * 覆盖面：job 写入原子性/幂等（同篇重复⑤）/readStatus 三态（missing→未运行、
 * 损坏→上抛、新鲜/过期两判）/freshness 阈值边界/hasPendingJob/productExists/
 * archivedExists/状态机跨格序列①~⑤（fs 夹具目录驱动——态=fs 事实推导）。
 *
 * 激活方式说明（三屋模式试点，自裁申报）：本组不经 guardedDescribe 直接激活——
 * 本单元 registry 翻状态归主控收口（控制面单写者纪律，实现者禁翻），guard 包裹
 * 会使整组 skip，TDD 红/绿证与终局 verify 皆不可得；实现与测试同批交付，K3
 * 防作弊面（不实现就翻状态）不适用本形态。主控翻状态后如需收回 guard 包裹，
 * describe 包裹层一行替换即可（断言面零改动）。
 */
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HEARTBEAT_FRESH_MS,
  createAiSensorService
} from '../../../src/main/services/ai_sensor/ai-sensor.service'

const T0 = 1_768_950_400_000 // 2026-08-27T00:00:00.000Z（注入时钟基点）

interface Harness {
  root: string
  clock: { nowMs: number }
  svc: ReturnType<typeof createAiSensorService>
  dispose: () => Promise<void>
}

async function makeHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'ai-sensor-'))
  const clock = { nowMs: T0 }
  const svc = createAiSensorService({
    rootDir: root,
    now: () => new Date(clock.nowMs).toISOString(),
    uuid: (() => {
      let seq = 0
      return () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
    })()
  })
  return {
    root,
    clock,
    svc,
    dispose: async () => {
      await rm(root, { recursive: true, force: true })
    }
  }
}

/** 模拟工具侧写 status.json（heartbeatAt=时钟基点+offset） */
async function writeStatus(
  h: Harness,
  s: {
    state?: string
    currentPaper?: string | null
    role?: string | null
    heartbeatOffsetMs?: number
  }
): Promise<void> {
  await mkdir(join(h.root, 'pending'), { recursive: true })
  const hb = new Date(h.clock.nowMs + (s.heartbeatOffsetMs ?? 0)).toISOString()
  await writeFile(
    join(h.root, 'status.json'),
    JSON.stringify({
      state: s.state ?? '三读中',
      currentPaper: s.currentPaper ?? null,
      role: s.role ?? null,
      updatedAt: hb,
      heartbeatAt: hb
    }),
    'utf8'
  )
}

/** 模拟工具侧产物落盘（corpus-ai/<paperId>.json） */
async function writeProduct(h: Harness, paperId: string): Promise<void> {
  await mkdir(join(h.root, 'corpus-ai'), { recursive: true })
  await writeFile(join(h.root, 'corpus-ai', `${paperId}.json`), '[]', 'utf8')
}

/** 模拟 07 导入器移档（corpus-ai→archive） */
async function moveToArchive(h: Harness, paperId: string): Promise<void> {
  await mkdir(join(h.root, 'archive'), { recursive: true })
  await rm(join(h.root, 'corpus-ai', `${paperId}.json`))
  await writeFile(join(h.root, 'archive', `${paperId}.json`), '[]', 'utf8')
}

async function pendingFiles(h: Harness): Promise<string[]> {
  try {
    return (await readdir(join(h.root, 'pending'))).sort()
  } catch {
    return []
  }
}

describe('SR2-AI-06 ai-sensor.service —— job 写入/三态/新鲜度/跨格序列', () => {
  it('requestRead 首写：pending/<jobId>.json 落盘（内容形状+requestedAt=注入时钟；原子写无 .tmp 残留）', async () => {
    const h = await makeHarness()
    try {
      const { jobId } = await h.svc.requestRead('p-1')
      expect(jobId).toBe('00000000-0000-4000-8000-000000000001')
      const files = await pendingFiles(h)
      expect(files).toEqual([`${jobId}.json`]) // 无 .tmp 残留（tmp+rename 原子写）
      const job = JSON.parse(await readFile(join(h.root, 'pending', `${jobId}.json`), 'utf8'))
      expect(job).toEqual({
        paperId: 'p-1',
        kind: 'three-read',
        requestedAt: new Date(T0).toISOString()
      })
      // 协议根子目录=首写时创建（N06-6 幂等）
      expect((await readdir(h.root)).sort()).toEqual(['pending'])
    } finally {
      await h.dispose()
    }
  })
  
  it('幂等⑤：同篇重复写 job=返回既有 jobId 不写第二个文件；异篇=各自新 job', async () => {
    const h = await makeHarness()
    try {
      const first = await h.svc.requestRead('p-1')
      const again = await h.svc.requestRead('p-1')
      expect(again.jobId).toBe(first.jobId)
      expect(await pendingFiles(h)).toEqual([`${first.jobId}.json`])
      const other = await h.svc.requestRead('p-2')
      expect(other.jobId).not.toBe(first.jobId)
      expect(await pendingFiles(h)).toHaveLength(2)
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      expect(await h.svc.hasPendingJob('p-2')).toBe(true)
      expect(await h.svc.hasPendingJob('p-3')).toBe(false)
    } finally {
      await h.dispose()
    }
  })
  
  it('readStatus 三态：missing→null（工具从未运行 N06-4）；损坏 JSON→上抛含路径；合法→字段透传', async () => {
    const h = await makeHarness()
    try {
      expect(await h.svc.readStatus()).toBeNull()
      await writeFile(join(h.root, 'status.json'), '{broken', 'utf8')
      await expect(h.svc.readStatus()).rejects.toThrow(/status\.json/)
      await rm(join(h.root, 'status.json'))
      await writeStatus(h, { state: '二读盲读', currentPaper: 'p-1', role: 'second-read' })
      const st = await h.svc.readStatus()
      expect(st).toEqual({
        state: '二读盲读',
        currentPaper: 'p-1',
        role: 'second-read',
        updatedAt: new Date(T0).toISOString(),
        heartbeatAt: new Date(T0).toISOString(),
        running: true
      })
    } finally {
      await h.dispose()
    }
  })
  
  it('status 形态损坏≠不存在：缺 heartbeatAt / 非法日期串→上抛（三态分离，禁 catch-all）', async () => {
    const h = await makeHarness()
    try {
      await writeFile(
        join(h.root, 'status.json'),
        JSON.stringify({ state: 'x', currentPaper: null, role: null, updatedAt: 't' }),
        'utf8'
      )
      await expect(h.svc.readStatus()).rejects.toThrow(/损坏/)
      await writeFile(
        join(h.root, 'status.json'),
        JSON.stringify({
          state: 'x',
          currentPaper: null,
          role: null,
          updatedAt: 't',
          heartbeatAt: '不是日期'
        }),
        'utf8'
      )
      await expect(h.svc.readStatus()).rejects.toThrow(/heartbeatAt/)
    } finally {
      await h.dispose()
    }
  })
  
  it('freshness 阈值边界：heartbeatAt=now-10min→running true（含边界）；再 +1ms→false（单源判定输出）', async () => {
    const h = await makeHarness()
    try {
      await writeStatus(h, { heartbeatOffsetMs: -HEARTBEAT_FRESH_MS })
      expect((await h.svc.readStatus())?.running).toBe(true)
      await writeStatus(h, { heartbeatOffsetMs: -HEARTBEAT_FRESH_MS - 1 })
      const stale = await h.svc.readStatus()
      expect(stale?.running).toBe(false)
      expect(stale?.state).toBe('三读中') // 过期≠损坏：对象照常返回，仅判活翻转
    } finally {
      await h.dispose()
    }
  })
  
  it('hasPendingJob：无 pending 目录→false；损坏 job 文件→上抛（禁静默跳过）', async () => {
    const h = await makeHarness()
    try {
      expect(await h.svc.hasPendingJob('p-1')).toBe(false)
      await h.svc.requestRead('p-1')
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      const [f] = await pendingFiles(h)
      await writeFile(join(h.root, 'pending', f!), '{bad', 'utf8')
      await expect(h.svc.hasPendingJob('p-1')).rejects.toThrow(/pending/)
      await expect(h.svc.requestRead('p-2')).rejects.toThrow(/pending/) // 写前扫描同报不静默
    } finally {
      await h.dispose()
    }
  })
  
  it('productExists/archivedExists：corpus-ai 活动区与 archive 归档区各自独立判定（W06-2 拆行）', async () => {
    const h = await makeHarness()
    try {
      expect(await h.svc.productExists('p-1')).toBe(false)
      expect(await h.svc.archivedExists('p-1')).toBe(false)
      await writeProduct(h, 'p-1')
      expect(await h.svc.productExists('p-1')).toBe(true)
      expect(await h.svc.archivedExists('p-1')).toBe(false)
      await moveToArchive(h, 'p-1')
      expect(await h.svc.productExists('p-1')).toBe(false)
      expect(await h.svc.archivedExists('p-1')).toBe(true)
    } finally {
      await h.dispose()
    }
  })
  
  it('paperId 非法字符（路径穿越纵深防御，C-02 safeId 同型）→拒绝', async () => {
    const h = await makeHarness()
    try {
      await expect(h.svc.requestRead('../escape')).rejects.toThrow(/paperId/)
      await expect(h.svc.productExists('a/b')).rejects.toThrow(/paperId/)
      await expect(h.svc.archivedExists('..\\x')).rejects.toThrow(/paperId/)
      await expect(h.svc.hasPendingJob('p;drop')).rejects.toThrow(/paperId/)
    } finally {
      await h.dispose()
    }
  })
  
  it('跨格序列① no-job→pending→reading→done→imported（正常全链，谓词=fs 事实推导）', async () => {
    const h = await makeHarness()
    try {
      // no-job：无 pending、无产物、工具未运行
      expect(await h.svc.hasPendingJob('p-1')).toBe(false)
      expect(await h.svc.productExists('p-1')).toBe(false)
      expect(await h.svc.readStatus()).toBeNull()
      // →pending：按钮写 job
      await h.svc.requestRead('p-1')
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      // →reading：工具拾取+心跳起
      await writeStatus(h, { currentPaper: 'p-1' })
      expect((await h.svc.readStatus())?.running).toBe(true)
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      // →done：job 移除+corpus-ai 落盘（工具侧完成）
      const [jobFile] = await pendingFiles(h)
      await rm(join(h.root, 'pending', jobFile!))
      await writeProduct(h, 'p-1')
      expect(await h.svc.hasPendingJob('p-1')).toBe(false)
      expect(await h.svc.productExists('p-1')).toBe(true)
      // →imported：07 导入成功移 archive
      await moveToArchive(h, 'p-1')
      expect(await h.svc.archivedExists('p-1')).toBe(true)
      expect(await h.svc.productExists('p-1')).toBe(false)
    } finally {
      await h.dispose()
    }
  })
  
  it('跨格序列② 迟拾取：pending 心跳从未新鲜→心跳起才 reading（统一「等待 zcode」观测面）', async () => {
    const h = await makeHarness()
    try {
      await h.svc.requestRead('p-1')
      // 工具从未运行或心跳早已过期：job 在+心跳不新鲜→pending 观测（非 running）
      await writeStatus(h, { heartbeatOffsetMs: -HEARTBEAT_FRESH_MS - 5 })
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      expect((await h.svc.readStatus())?.running).toBe(false)
      // 迟拉起后心跳新鲜→reading
      await writeStatus(h, { currentPaper: 'p-1', heartbeatOffsetMs: 0 })
      expect((await h.svc.readStatus())?.running).toBe(true)
    } finally {
      await h.dispose()
    }
  })
  
  it('跨格序列③ 中断续跑：reading→心跳过期（job 保留→pending 观测）→重启续跑→done', async () => {
    const h = await makeHarness()
    try {
      await h.svc.requestRead('p-1')
      await writeStatus(h, { currentPaper: 'p-1' })
      expect((await h.svc.readStatus())?.running).toBe(true)
      // 工具中途死：时钟推进过阈值——job 仍在=观测坍缩回 pending
      h.clock.nowMs = T0 + HEARTBEAT_FRESH_MS + 2
      const st = await h.svc.readStatus()
      expect(st?.running).toBe(false)
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      // 重启续跑：心跳再新鲜→reading→done
      await writeStatus(h, { currentPaper: 'p-1' })
      expect((await h.svc.readStatus())?.running).toBe(true)
      const [jobFile] = await pendingFiles(h)
      await rm(join(h.root, 'pending', jobFile!))
      await writeProduct(h, 'p-1')
      expect(await h.svc.productExists('p-1')).toBe(true)
      expect(await h.svc.hasPendingJob('p-1')).toBe(false)
    } finally {
      await h.dispose()
    }
  })
  
  it('跨格序列④ 重读请求：done 后重按按钮→新 pending job（旧产物保留待覆盖，07 走 sha 变化重灌）', async () => {
    const h = await makeHarness()
    try {
      await h.svc.requestRead('p-1')
      const [jobFile] = await pendingFiles(h)
      await rm(join(h.root, 'pending', jobFile!))
      await writeProduct(h, 'p-1')
      // done 态重按按钮：无同篇 pending 在→写新 job
      const again = await h.svc.requestRead('p-1')
      expect(await h.svc.hasPendingJob('p-1')).toBe(true)
      expect(await h.svc.productExists('p-1')).toBe(true) // 旧产物不动，新读完成时覆盖
      expect(again.jobId).not.toBe(jobFile!.replace(/\.json$/, ''))
    } finally {
      await h.dispose()
    }
  })
  
})
