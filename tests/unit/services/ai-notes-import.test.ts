/**
 * [SR2-AI-07] ai-notes-import.service —— 回灌导入器（锁定合约）。
 * 覆盖面：幂等三路径（无 archive 首导/同 sha 跳过/异 sha 清面重灌不重复）/
 * 行级 zod 拒非法 role/question/幽灵 paperId 拦截/损坏 JSON/目录不存在空结果/
 * archive 移动后二跑全 skipped/Result 三桶形状/listByPaper 透传/F-AIN-01
 * 事务原子性（中断注入零半删半插+跨篇隔离——withTransaction 全有或全无）。
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
    paperExists: (id) => id === 'p-1' || id === 'bad-1',
    // F-AIN-01：真库事务（repos.withTransaction 同式——repos/index.ts 单源形态）
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
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

/** F-AIN-01：注入中断的 repo 包装（第 nth 次 insert 抛错——事务敏感性探针） */
function failingInsertRepo(nth: number): typeof repo {
  let calls = 0
  return {
    ...repo,
    insert: (input) => {
      calls += 1
      if (calls === nth) throw new Error(`注入中断：第 ${nth} 行 insert 失败`)
      return repo.insert(input)
    }
  }
}

it('F-AIN-01 中断注入零半删半插：首插中断零行+重灌中断旧数据完整（withTransaction 全有或全无）', async () => {
  // 阶段一：首次导入第 2 行 insert 抛错→回滚后该篇零行（无半插）+errors 落
  // 「导入失败」+产物留 corpus-ai 不移 archive（失败篇不掩盖面语义保持）
  await putProduct('p-1', [fileRow(), fileRow({ question: 'Q2' })])
  const failing = createAiNotesImportService({
    rootDir: root,
    repo: failingInsertRepo(2),
    paperExists: (id) => id === 'p-1',
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  })
  const r1 = await failing.importAll()
  expect(r1.imported).toEqual([])
  expect(r1.errors).toHaveLength(1)
  expect(r1.errors[0]!.reason).toContain('导入失败')
  expect(repo.countByPaper('p-1')).toBe(0)
  expect(await namesIn('corpus-ai')).toEqual(['p-1.json'])
  expect(await namesIn('archive')).toEqual([])

  // 阶段二：成功导入 2 行后异 sha 重灌第 2 行抛错→回滚后旧 2 行完整（无半删
  // ——deleteByPaper 已回滚，旧内容非新内容）
  const rOk = await svc.importAll()
  expect(rOk.imported).toEqual(['p-1'])
  expect(repo.countByPaper('p-1')).toBe(2)
  await putProduct('p-1', [
    fileRow({ content_md: '新回答一' }),
    fileRow({ question: 'Q2', content_md: '新回答二' })
  ])
  const failing2 = createAiNotesImportService({
    rootDir: root,
    repo: failingInsertRepo(2),
    paperExists: (id) => id === 'p-1',
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  })
  const r2 = await failing2.importAll()
  expect(r2.imported).toEqual([])
  expect(r2.errors).toHaveLength(1)
  expect(repo.countByPaper('p-1')).toBe(2)
  const contents = (await svc.listByPaper('p-1')).map((n) => n.contentMd).sort()
  expect(contents).toEqual(['回答内容', '回答内容'])
  expect(await namesIn('corpus-ai')).toEqual(['p-1.json'])
})

it('F-AIN-01 跨篇隔离：篇 A 重灌成功+篇 B 重灌中断→A 新数据落库+B 旧数据完整（事务边界=单篇非整批）', async () => {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
  ).run('p-2', 'b.pdf', 's-2', 't', 't')
  // 预置：两篇均成功首导（B 留旧数据——重灌中断的回滚锚点）；本用例专用
  // clean service（paperExists 覆盖 p-2——beforeEach 桩不含）
  await putProduct('p-1', [fileRow(), fileRow({ question: 'Q2' })])
  await putProduct('p-2', [fileRow({ content_md: 'B 旧回答' })])
  const preSvc = createAiNotesImportService({
    rootDir: root,
    repo,
    paperExists: (id) => id === 'p-1' || id === 'p-2',
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  })
  const rPre = await preSvc.importAll()
  expect(rPre.imported).toEqual(['p-1', 'p-2'])
  // 异 sha 新产物：A 重灌成功、B 注入中断（deleteByPaper 已跑——半删面锚点）
  await putProduct('p-1', [
    fileRow({ content_md: 'A 新回答一' }),
    fileRow({ question: 'Q2', content_md: 'A 新回答二' })
  ])
  await putProduct('p-2', [fileRow({ content_md: 'B 新回答' })])
  let bSeen = false
  const mixed = createAiNotesImportService({
    rootDir: root,
    repo: {
      ...repo,
      insert: (input) => {
        if (input.paperId === 'p-2') {
          bSeen = true
          throw new Error('注入中断：p-2 写入失败')
        }
        return repo.insert(input)
      }
    },
    paperExists: (id) => id === 'p-1' || id === 'p-2',
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  })
  const r = await mixed.importAll()
  expect(bSeen).toBe(true)
  expect(r.imported).toEqual(['p-1'])
  expect(r.errors.map((e) => e.paperId)).toEqual(['p-2'])
  // A 新数据完整落库（B 的失败不回滚 A——事务边界=单篇非整批，部分成功语义）
  expect(repo.countByPaper('p-1')).toBe(2)
  const aContents = (await svc.listByPaper('p-1')).map((n) => n.contentMd).sort()
  expect(aContents).toEqual(['A 新回答一', 'A 新回答二'])
  // B 旧数据完整保留（B 自身的 deleteByPaper 已回滚——无半删）
  expect(repo.countByPaper('p-2')).toBe(1)
  expect((await svc.listByPaper('p-2'))[0]?.contentMd).toBe('B 旧回答')
  expect(await namesIn('corpus-ai')).toEqual(['p-2.json'])
})
