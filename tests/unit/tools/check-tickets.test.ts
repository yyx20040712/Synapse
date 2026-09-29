/**
 * [F-CONSOL-09] check-tickets.mjs —— CLI 探针姊妹件（check-test-surface.test.ts
 * 探针法同型：execFile 真子进程+mkdtemp fixture 根+受控 exit code 捕获）。
 * check-tickets 的 root=process.cwd()，cwd 指 fixture 根即读 fixture registry
 * ——真 registry/真票面零触碰。fixture 预建空 src/+tests/（walk=readdirSync
 * 对缺失目录 throw——空目录=规则 2/5 扫描面空数组）。
 *
 * 覆盖面=F-CONSOL-08 修复面行为锁：规则 3/4b 代码后缀 guard（json 快照镜像
 * 词面放行+可见化 note / 代码文件词面仍拦）、存在性检查前置不被 guard 吞、
 * open 票不入规则 3 扫描、对账哨兵绿形态（合法最小 registry 全绿基线）。
 *
 * fixture registry 约束（对账哨兵）：全文 status:/id: 计数=成功解析数——
 * 票行外禁出现这两组字面量（注释不带样例字面量，词面用代称拼接构造）。
 *
 * 激活方式：不经 guardedDescribe 直接激活（三屋新测试 always-active 惯例）。
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const SCRIPT = fileURLToPath(new URL('../../../scripts/check-tickets.mjs', import.meta.url))

interface CliResult {
  code: number
  stdout: string
  stderr: string
}

/** CLI 探针：真子进程跑 check（cwd=fixture 根；非零 exit 受控捕获后返回） */
async function cli(root: string): Promise<CliResult> {
  try {
    const r = await run(process.execPath, [SCRIPT], { cwd: root, timeout: 30_000 })
    return { code: 0, stdout: r.stdout, stderr: r.stderr }
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string, killed?: boolean }
    if (err.killed === true) throw new Error('check-tickets 探针超时')
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

/**
 * 占位桩调用词面（代称拼接构造——本文件属 tests/ 扫描域，直写字面会在
 * fixture 内容外多一种存在形态；词面管理纪律=代称拼接）
 */
const STUB_TOKEN = ['unimplemented', 'Object'].join('')

interface FixtureTicket {
  id: string
  file: string
  status: 'open' | 'done'
}

/** 最小合法 registry——票行物理单行+字段序固定+全文无游离 status:/id: 字面量 */
function registryOf(tickets: FixtureTicket[]): string {
  const rows = tickets.map(
    (t) => `  { id: '${t.id}', file: '${t.file}', area: 'infra', owner: 'strong', status: '${t.status}', summary: 'fixture 票' },`
  )
  return `export const tickets = [\n${rows.join('\n')}\n]\n`
}

const roots: string[] = []
afterAll(async () => {
  // maxRetries：Windows 子进程刚退出偶发 EBUSY（cwd 句柄延迟释放）
  for (const r of roots) await rm(r, { recursive: true, force: true, maxRetries: 3 })
})

async function makeFixture(tickets: FixtureTicket[], files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ct-probe-'))
  roots.push(root)
  await mkdir(join(root, 'tickets'), { recursive: true })
  await mkdir(join(root, 'src'), { recursive: true })
  await mkdir(join(root, 'tests'), { recursive: true })
  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'tickets', 'registry.ts'), registryOf(tickets), 'utf-8')
  // P7-X 已裁决集消费件（规则区 266 行硬读）——空集=fixture 票全非 P7-X 形态即可
  await writeFile(join(root, 'docs', 'ROADMAP.md'), '# fixture roadmap\n', 'utf-8')
  for (const [name, content] of Object.entries(files)) {
    const p = join(root, name)
    await mkdir(join(p, '..'), { recursive: true })
    await writeFile(p, content, 'utf-8')
  }
  return root
}

/** 全绿基线 fixture：一 done 一 open，file 全存在且无词面 */
const GREEN_TICKETS: FixtureTicket[] = [
  { id: 'F-TEST-01', file: 'snap.json', status: 'done' },
  { id: 'F-TEST-02', file: 'open-code.ts', status: 'open' },
]

describe('[F-CONSOL-09] check-tickets CLI 探针（F-CONSOL-08 修复面行为锁）', () => {
  it('T0 全绿基线：合法最小 registry EXIT=0+检查通过语（哨兵绿形态）', async () => {
    const root = await makeFixture(GREEN_TICKETS, {
      'snap.json': '{"cases":[]}',
      'open-code.ts': 'export const a = 1',
    })
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })

  it('T1 规则 3 guard：done 票 file 指 json 快照含词面镜像 → 放行 EXIT=0+跳过 note 可见', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }],
      // 快照镜像历史用例标题（含词面的文本非调用）
      { 'snap.json': `{"files":{"x.test.ts":{"cases":[{"title":"${STUB_TOKEN} 可满足类型"}]}}}` }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('内容扫描跳过（非代码后缀 file）1 票：snap.json')
  })

  it('T2 规则 3 guard 不放行代码面：done 票 file 指 .ts 含词面 → EXIT=1 占位残留红', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'code.ts', status: 'done' }],
      { 'code.ts': `export const x = ${STUB_TOKEN}('F-TEST-01')` }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('F-TEST-01 已 done，但文件仍含未实现占位：code.ts')
  })

  it('T3 存在性前置：done 票 file 不存在 → EXIT=1 文件不存在红（guard 不吞存在性检查）', async () => {
    const root = await makeFixture([{ id: 'F-TEST-01', file: 'missing.ts', status: 'done' }], {})
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('F-TEST-01 指向的文件不存在：missing.ts')
  })

  it('T3b 规则 1 存在性回归锁：不存在的 json file → EXIT=1（guard 前移=等价变异体——规则 1 独立兜底，M-3 实证无判别差）', async () => {
    const root = await makeFixture([{ id: 'F-TEST-01', file: 'missing.json', status: 'done' }], {})
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('F-TEST-01 指向的文件不存在：missing.json')
  })

  it('T4 open 票不入规则 3：open 票 file 指 .ts 含词面 → EXIT=0（占位=未完成合法）', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-02', file: 'open-code.ts', status: 'open' }],
      { 'open-code.ts': `export const x = ${STUB_TOKEN}('F-TEST-02')` }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
  })

  it('T5 对账哨兵红形态：registry 全文计数失衡 → EXIT=1 哨兵红（锁非恒真化）', async () => {
    // 失衡构造：票行外多写一行游离 status 字面量（status 计数 2 ≠ 解析数 1）
    const root = await makeFixture([{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }], {
      'snap.json': '{"cases":[]}',
    })
    await writeFile(
      join(root, 'tickets', 'registry.ts'),
      registryOf([{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }]) +
        "// 游离字面量：status: 'done'\n",
      'utf-8'
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('registry 对账失败')
  })

  it('T6 规则 4b 不放行代码面：done 票 file 指 .tsx 含自身 data-ticket 骨架标记 → EXIT=1', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'stub.tsx', status: 'done' }],
      { 'stub.tsx': 'export const S = () => <div data-ticket="F-TEST-01" />' }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('F-TEST-01 已 done，但文件仍含自身 data-ticket 骨架占位：stub.tsx')
  })

  it('T7 规则 4b guard：done 票 file 指 json 含骨架标记字面 → 放行 EXIT=0+跳过 note', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'snap2.json', status: 'done' }],
      // e2e 断言文本镜像（含 data-ticket 字面的文本非骨架残留）
      { 'snap2.json': '{"assertions":["expect(el.getAttribute(\'data-ticket="F-TEST-01"\')).toBe(null)"]}' }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('内容扫描跳过（非代码后缀 file）1 票：snap2.json')
  })
})
