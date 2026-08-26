/**
 * [SR2-AI-06] companion.mjs —— CLI 探针（锁定合约，AI-05 门二探针法同型）。
 * 覆盖面：四步序全链（拾取→心跳→产物落盘→移除 job）/failed 路径 job 保留
 * （INV-26 红线：移除 job 以产物落盘成功为前提）/无 job 空转/job 不在 manifest/
 * 全库流无 job 交付/幂等重交付/normalizeSegments 规范化校验纯函数面。
 *
 * 激活方式说明：不经 guardedDescribe 直接激活——同 tests/unit/services/
 * ai-sensor.service.test.ts 头注（三屋模式试点，registry 翻状态归主控收口）。
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { normalizeSegments } from '../../../tools/ai-sensor/companion.mjs'

const run = promisify(execFile)
const COMPANION = fileURLToPath(new URL('../../../tools/ai-sensor/companion.mjs', import.meta.url))

interface CliResult {
  code: number
  stdout: string
  stderr: string
}

/** CLI 探针：真子进程跑 companion.mjs（exit 1 是受控行为，捕获后返回） */
async function cli(...args: string[]): Promise<CliResult> {
  try {
    const r = await run(process.execPath, [COMPANION, ...args], { timeout: 30_000 })
    return { code: 0, stdout: r.stdout, stderr: r.stderr }
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; killed?: boolean }
    if (err.killed === true) throw new Error('companion 探针超时')
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

interface Fixture {
  corpus: string
  protocol: string
  draftPath: (name: string, rows: unknown[]) => Promise<string>
  pending: (paperId: string, requestedAt?: string) => Promise<string>
  pendingFiles: () => Promise<string[]>
  dispose: () => Promise<void>
}

/** 语料目录（manifest+corpus+fulltext）+协议目录（pending job）夹具 */
async function makeFixture(): Promise<Fixture> {
  const base = await mkdtemp(join(tmpdir(), 'companion-'))
  const corpus = join(base, 'corpus')
  const protocol = join(base, 'protocol')
  await mkdir(join(corpus, 'corpus'), { recursive: true })
  await mkdir(join(corpus, 'fulltext'), { recursive: true })
  await mkdir(join(protocol, 'pending'), { recursive: true })
  await writeFile(
    join(corpus, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-08-27T00:00:00.000Z',
      papers: [
        {
          paperId: 'p-1',
          file: 'corpus/p-1.md',
          title: '智慧水务论文一',
          contentSha: 'sha-c',
          fulltextSha: 'sha-f',
          figures: ['figures/p-1/page-1.png'],
          exportedAt: '2026-08-27T00:00:00.000Z'
        }
      ]
    }),
    'utf8'
  )
  await writeFile(join(corpus, 'corpus', 'p-1.md'), '# 论文一语料', 'utf8')
  await writeFile(join(corpus, 'fulltext', 'p-1.txt'), '全文第一页\f全文第二页', 'utf8')
  return {
    corpus,
    protocol,
    draftPath: async (name, rows) => {
      const p = join(base, `${name}.json`)
      await writeFile(p, JSON.stringify(rows), 'utf8')
      return p
    },
    pending: async (paperId, requestedAt = '2026-08-27T00:01:00.000Z') => {
      const jobId = `job-${paperId}`
      const p = join(protocol, 'pending', `${jobId}.json`)
      await writeFile(p, JSON.stringify({ paperId, kind: 'three-read', requestedAt }), 'utf8')
      return p
    },
    pendingFiles: async () => readdir(join(protocol, 'pending')),
    dispose: async () => {
      await rm(base, { recursive: true, force: true })
    }
  }
}

/** 合法草稿行（8 字段行形状——ai_notes 同形 N2 粒度） */
function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    role: 'first-read',
    question: 'Q1',
    model: 'glm-5.3',
    quote_text: '核心引文',
    prefix_text: '前文',
    suffix_text: '后文',
    anchor_page: 3,
    content_md: '核心 idea 是……',
    ...over
  }
}

describe('SR2-AI-06 companion.mjs —— CLI 探针（四步序+INV-26）', () => {
  it('四步序全链：拾取（写心跳）→beat→deliver（产物规范化落盘+移除 job+queue 置 done）', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      await f.pending('p-1')
      // ① 拾取：打印 job+消费指针，status.json 落心跳
      const pick = await cli(f.corpus, f.protocol)
      expect(pick.code).toBe(0)
      expect(pick.stdout).toContain('p-1')
      expect(pick.stdout).toContain('智慧水务论文一')
      expect(pick.stdout).toContain('fulltext/p-1.txt')
      const st1 = JSON.parse(await readFile(join(f.protocol, 'status.json'), 'utf8'))
      expect(st1.currentPaper).toBe('p-1')
      expect(typeof st1.heartbeatAt).toBe('string')
      // ② 心跳：刷新 heartbeatAt+自述 state/role（自由文本，不契约化）
      const beat = await cli(f.corpus, f.protocol, '--beat', '一读进行中', 'first-read')
      expect(beat.code).toBe(0)
      const st2 = JSON.parse(await readFile(join(f.protocol, 'status.json'), 'utf8'))
      expect(st2.state).toBe('一读进行中')
      expect(st2.role).toBe('first-read')
      expect(st2.currentPaper).toBe('p-1') // 未给字段保留
      expect(Date.parse(st2.heartbeatAt)).toBeGreaterThanOrEqual(Date.parse(st1.heartbeatAt))
      // ③+④ 产物落盘→移除 job：多草稿文件拼接、规范化 8 字段键序
      const d1 = await f.draftPath('draft-1', [row({ question: 'Q1' }), row({ role: 'second-read', question: 'Q2', anchor_page: null, quote_text: '', prefix_text: '', suffix_text: '' })])
      const d2 = await f.draftPath('draft-2', [row({ role: 'adjudicate', question: 'divergence' })])
      const deliver = await cli(f.corpus, f.protocol, '--deliver', 'p-1', d1, d2)
      expect(deliver.code).toBe(0)
      const product = JSON.parse(await readFile(join(f.protocol, 'corpus-ai', 'p-1.json'), 'utf8'))
      expect(product).toHaveLength(3)
      expect(Object.keys(product[0])).toEqual([
        'role', 'question', 'model', 'quote_text',
        'prefix_text', 'suffix_text', 'anchor_page', 'content_md'
      ])
      expect(product[1].anchor_page).toBeNull()
      expect(product[2]).toMatchObject({ role: 'adjudicate', question: 'divergence' })
      expect(await f.pendingFiles()).toEqual([]) // job 已移除（产物落盘成功后）
      const progress = JSON.parse(await readFile(join(f.corpus, 'progress.json'), 'utf8'))
      const item = progress.items.find((i: { paperId: string }) => i.paperId === 'p-1')
      expect(item.status).toBe('done')
      expect(item.outputs[0]).toBe(resolve(join(f.protocol, 'corpus-ai', 'p-1.json')))
      // 交付后心跳仍在刷新（每步刷新）
      const st3 = JSON.parse(await readFile(join(f.protocol, 'status.json'), 'utf8'))
      expect(st3.state).toContain('p-1')
    } finally {
      await f.dispose()
    }
  })

  it('INV-26 failed 路径：草稿行 question 非法→exit 1、stderr 含行号、job 保留、产物不落盘', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      await f.pending('p-1')
      const bad = await f.draftPath('bad', [row({ question: 'Q9' })])
      const r = await cli(f.corpus, f.protocol, '--deliver', 'p-1', bad)
      expect(r.code).toBe(1)
      expect(r.stderr).toContain('question')
      expect(await f.pendingFiles()).toEqual(['job-p-1.json']) // 任何失败路径 job 保留
      await expect(readFile(join(f.protocol, 'corpus-ai', 'p-1.json'), 'utf8')).rejects.toThrow()
    } finally {
      await f.dispose()
    }
  })

  it('INV-26 failed 路径：草稿 JSON 语法损坏/零段数组→exit 1、job 保留', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      await f.pending('p-1')
      const broken = join(f.protocol, 'broken-draft.json')
      await writeFile(broken, '{bad json', 'utf8')
      const r1 = await cli(f.corpus, f.protocol, '--deliver', 'p-1', broken)
      expect(r1.code).toBe(1)
      expect(r1.stderr).toContain(broken)
      const empty = await f.draftPath('empty', [])
      const r2 = await cli(f.corpus, f.protocol, '--deliver', 'p-1', empty)
      expect(r2.code).toBe(1)
      expect(r2.stderr).toContain('零段')
      expect(await f.pendingFiles()).toEqual(['job-p-1.json'])
    } finally {
      await f.dispose()
    }
  })

  it('空转：无 pending job→exit 0 提示无 job（不写 status）', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      const r = await cli(f.corpus, f.protocol)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('无 pending job')
      await expect(readFile(join(f.protocol, 'status.json'), 'utf8')).rejects.toThrow()
    } finally {
      await f.dispose()
    }
  })

  it('job 的 paperId 不在语料 manifest→拾取 exit 1、job 保留（不可读不消费）', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      await f.pending('p-unknown')
      const r = await cli(f.corpus, f.protocol)
      expect(r.code).toBe(1)
      expect(r.stderr).toContain('p-unknown')
      expect(await f.pendingFiles()).toEqual(['job-p-unknown.json'])
    } finally {
      await f.dispose()
    }
  })

  it('manifest 不存在（导出中断）+有 job→拾取 exit 1（不激活，回应用重导）', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      await rm(join(f.corpus, 'manifest.json'))
      await f.pending('p-1')
      const r = await cli(f.corpus, f.protocol)
      expect(r.code).toBe(1)
      expect(r.stderr).toContain('manifest')
      expect(await f.pendingFiles()).toEqual(['job-p-1.json'])
    } finally {
      await f.dispose()
    }
  })

  it('全库三读流：无 pending job 也可交付（queue 驱动复用同一交付面），幂等重交付=产物覆盖', { timeout: 60_000 }, async () => {
    const f = await makeFixture()
    try {
      const d1 = await f.draftPath('draft-a', [row({ content_md: '版本一' })])
      const r1 = await cli(f.corpus, f.protocol, '--deliver', 'p-1', d1)
      expect(r1.code).toBe(0)
      const first = JSON.parse(await readFile(join(f.protocol, 'corpus-ai', 'p-1.json'), 'utf8'))
      expect(first[0].content_md).toBe('版本一')
      // 幂等重交付：新产物覆盖旧档
      const d2 = await f.draftPath('draft-b', [row({ content_md: '版本二' })])
      const r2 = await cli(f.corpus, f.protocol, '--deliver', 'p-1', d2)
      expect(r2.code).toBe(0)
      const second = JSON.parse(await readFile(join(f.protocol, 'corpus-ai', 'p-1.json'), 'utf8'))
      expect(second[0].content_md).toBe('版本二')
    } finally {
      await f.dispose()
    }
  })

  it('normalizeSegments 纯函数面：未知字段/缺字段/role 枚举/anchor_page 整型拒绝+规范化键序', () => {
    expect(normalizeSegments([row()])).toEqual([
      {
        role: 'first-read',
        question: 'Q1',
        model: 'glm-5.3',
        quote_text: '核心引文',
        prefix_text: '前文',
        suffix_text: '后文',
        anchor_page: 3,
        content_md: '核心 idea 是……'
      }
    ])
    expect(() => normalizeSegments([{ ...row(), extra: 1 }])).toThrow(/未知字段/)
    expect(() => normalizeSegments([{ ...row(), anchor_page: undefined as never }])).toThrow()
    expect(() => normalizeSegments([row({ role: 'synthesize' })])).toThrow(/role/)
    expect(() => normalizeSegments([row({ anchor_page: 1.5 })])).toThrow(/anchor_page/)
    expect(() => normalizeSegments([row({ anchor_page: 0 })])).toThrow(/anchor_page/)
    expect(() => normalizeSegments([row({ model: '' })])).toThrow(/model/)
    expect(() => normalizeSegments([row({ content_md: '  ' })])).toThrow(/content_md/)
    expect(() => normalizeSegments('不是数组' as never)).toThrow(/数组/)
  })
})
