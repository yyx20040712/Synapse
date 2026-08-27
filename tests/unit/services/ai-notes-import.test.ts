/**
 * [SR2-AI-07] ai-notes-import.service —— 回灌导入器（锁定合约）。
 * 覆盖面：幂等三路径（无 archive 首导/同 sha 跳过/异 sha 清面重灌不重复）/
 * 行级 zod 拒非法 role/question/幽灵 paperId 拦截/损坏 JSON/目录不存在空结果/
 * archive 移动后二跑全 skipped/Result 三桶形状/listByPaper 透传。
 * repo 交互=真库夹具（AI-01 测试同型）；fs 夹具目录驱动（AI-06 同型）。
 *
 * 激活方式（ADR-0017 裁决 3，AI-06 同型自裁申报）：always-active 不经
 * guardedDescribe——实现与测试同批交付，registry 翻状态归主控收口。
 */
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, expect, it } from 'vitest'
import { createAiNotesRepo } from '../../../src/main/db/repos/ai_notes.repo'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'
import {
  createAiNotesImportService
} from '../../../src/main/services/ai_sensor/ai-notes-import.service'

/** ADR-0015 §1 字面行形状（snake_case 文件面） */
interface FileRow {
  role: string
  question: string
  model: string
  quote_text: string
  prefix_text: string
  suffix_text: string
  anchor_page: number | null
  content_md: string
}

function fileRow(patch: Partial<FileRow> = {}): FileRow {
  return {
    role: 'first-read',
    question: 'Q1',
    model: 'glm-5.3',
    quote_text: '引文',
    prefix_text: '前',
    suffix_text: '后',
    anchor_page: 3,
    content_md: '回答内容',
    ...patch
  }
}

let db: SqliteDb
let root: string
let repo: ReturnType<typeof createAiNotesRepo>
let svc: ReturnType<typeof createAiNotesImportService>

beforeEach(async () => {
  db = createTestDb()
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
  ).run('p-1', 'a.pdf', 's-1', 't', 't')
  root = await mkdtemp(join(tmpdir(), 'ai-notes-import-'))
  repo = createAiNotesRepo(db)
  svc = createAiNotesImportService({
    rootDir: root,
    repo,
    // bad-1 亦为已存在篇（该用例专测损坏 JSON 面，非幽灵面）
    paperExists: (id) => id === 'p-1' || id === 'bad-1'
  })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** 写产物到 corpus-ai/ 活动区 */
async function putProduct(paperId: string, rows: FileRow[] | string): Promise<void> {
  await mkdir(join(root, 'corpus-ai'), { recursive: true })
  const text = typeof rows === 'string' ? rows : JSON.stringify(rows, null, 2)
  await writeFile(join(root, 'corpus-ai', `${paperId}.json`), text, 'utf8')
}

async function namesIn(dir: string): Promise<string[]> {
  try {
    return await readdir(join(root, dir))
  } catch {
    return []
  }
}

it('目录不存在→空结果三桶（首次无产物=合法态非错误）', async () => {
  const r = await svc.importAll()
  expect(r).toEqual({ imported: [], skipped: [], errors: [] })
})

it('无 archive 首导：写入 DB+产物移 archive（corpus-ai 清空）', async () => {
  await putProduct('p-1', [fileRow(), fileRow({ role: 'adjudicate', question: 'divergence', anchor_page: null })])
  const r = await svc.importAll()
  expect(r.imported).toEqual(['p-1'])
  expect(r.skipped).toEqual([])
  expect(r.errors).toEqual([])
  const notes = await svc.listByPaper('p-1')
  expect(notes).toHaveLength(2)
  expect(notes[0]).toMatchObject({
    paperId: 'p-1',
    annotationId: null,
    role: 'first-read',
    question: 'Q1',
    quoteText: '引文',
    anchorPage: 3,
    contentMd: '回答内容'
  })
  expect(await namesIn('corpus-ai')).toEqual([])
  expect(await namesIn('archive')).toEqual(['p-1.json'])
})

it('archive 同 sha：二跑 skipped，不重复写（archive 移动后全 skipped 跨格序列）', async () => {
  await putProduct('p-1', [fileRow()])
  await svc.importAll()
  // 同内容产物重现（重读同产物）：sha 相同 → skipped，条目不翻倍
  await putProduct('p-1', [fileRow()])
  const r = await svc.importAll()
  expect(r.skipped).toEqual(['p-1'])
  expect(r.imported).toEqual([])
  expect(r.errors).toEqual([])
  expect(repo.countByPaper('p-1')).toBe(1)
  expect(await namesIn('corpus-ai')).toEqual([])
})

it('archive 异 sha：清面重灌不重复（deleteByPaper+整套重插）', async () => {
  await putProduct('p-1', [fileRow(), fileRow({ question: 'Q2' })])
  await svc.importAll()
  // 新产物内容不同（少一行）：sha 异 → 清面重插
  await putProduct('p-1', [fileRow({ content_md: '新回答' })])
  const r = await svc.importAll()
  expect(r.imported).toEqual(['p-1'])
  expect(r.skipped).toEqual([])
  const notes = await svc.listByPaper('p-1')
  expect(notes).toHaveLength(1)
  expect(notes[0]?.contentMd).toBe('新回答')
})

it('行级 zod 拒非法 role：该篇入 errors（中文 reason 含路径），产物不移不写 DB', async () => {
  await putProduct('p-1', [fileRow({ role: 'third-read' })])
  const r = await svc.importAll()
  expect(r.imported).toEqual([])
  expect(r.errors).toHaveLength(1)
  expect(r.errors[0]!.paperId).toBe('p-1')
  expect(r.errors[0]!.reason).toContain('corpus-ai')
  expect(repo.countByPaper('p-1')).toBe(0)
  expect(await namesIn('corpus-ai')).toEqual(['p-1.json'])
})

it('行级 zod 拒非法 question（七问 v1 冻结）', async () => {
  await putProduct('p-1', [fileRow({ question: 'Q9' })])
  const r = await svc.importAll()
  expect(r.errors).toHaveLength(1)
  expect(repo.countByPaper('p-1')).toBe(0)
})

it('幽灵 paperId 拦截：不在 papers 表→该篇失败', async () => {
  await putProduct('ghost-1', [fileRow()])
  const r = await svc.importAll()
  expect(r.imported).toEqual([])
  expect(r.errors).toHaveLength(1)
  expect(r.errors[0]!.paperId).toBe('ghost-1')
  expect(r.errors[0]!.reason).toContain('ghost-1')
})

it('损坏 JSON/非数组形态：该篇失败入 errors 不中断整批（部分成功）', async () => {
  await putProduct('bad-1', '{not-json')
  // p-1 合法篇但产物非数组形态
  await putProduct('p-1', '{"a":1}')
  const r = await svc.importAll()
  expect(r.imported).toEqual([])
  expect(r.errors).toHaveLength(2)
  const ids = r.errors.map((e) => e.paperId).sort()
  expect(ids).toEqual(['bad-1', 'p-1'])
})

it('多篇混合：imported/skipped/errors 三桶并存（Result 三桶形状）', async () => {
  await putProduct('p-1', [fileRow()])
  await svc.importAll()
  await putProduct('p-1', [fileRow()])
  await putProduct('bad-1', 'x')
  const r = await svc.importAll()
  expect(r.imported).toEqual([])
  expect(r.skipped).toEqual(['p-1'])
  expect(r.errors.map((e) => e.paperId)).toEqual(['bad-1'])
})

it('listByPaper 透传 repo（确定性序+空篇空数组）', async () => {
  expect(await svc.listByPaper('p-1')).toEqual([])
  await putProduct('p-1', [fileRow()])
  await svc.importAll()
  expect((await svc.listByPaper('p-1')).length).toBe(1)
})
