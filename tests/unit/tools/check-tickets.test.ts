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
import { dirname, join, relative } from 'node:path'
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
/** [F-CONSOL-12] 第二占位桩调用词面（同 STUB_TOKEN 代称拼接纪律——本文件属 tests/ 扫描域） */
const ERR_TOKEN = ['NotImplemented', 'Error'].join('')
/** [F-CONSOL-12] fixture SR 系票号字面量（tests 域内裸引用=非调用形态，合法） */
const SR_DONE = 'SR-TEST-01'
const SR_OPEN = 'SR-TEST-02'
const SR_MISSING = 'SR-XX-99'

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

async function makeFixture(
  tickets: FixtureTicket[],
  files: Record<string, string>,
  // base：fixture 根基目录（默认 tmpdir；T17 需与脚本同盘——跨盘 relative 退化绝对路径）
  base = tmpdir()
): Promise<string> {
  const root = await mkdtemp(join(base, 'ct-probe-'))
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

describe('[F-CONSOL-12] check-tickets CLI 探针（规则 2 双分支+DIR/SELF 豁免面行为锁）', () => {
  /** 占位桩调用形态构造（代称注入——本文件真仓扫描域内零调用词面出现） */
  const stubCall = (id: string) => `export const s = ${STUB_TOKEN}('${id}')`
  const errThrow = (id: string) => `throw new ${ERR_TOKEN}('${id}')`

  it('T8 规则 2 src 分支：src 引用不存在的 SR 票号 → EXIT=1 引用了不存在的工单号', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }],
      { 'snap.json': '{"cases":[]}', 'src/ref.ts': `// 历史占位引用：${SR_MISSING}` }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain(`src/ref.ts: 引用了不存在的工单号 ${SR_MISSING}`)
  })

  it('T9 规则 2 src 分支：src 引用 done 票号（非该票自身 file）→ EXIT=1 引用了已完成工单', async () => {
    const root = await makeFixture(
      [{ id: SR_DONE, file: 'snap.json', status: 'done' }],
      { 'snap.json': '{"cases":[]}', 'src/ref.ts': `// 占位残留：${SR_DONE}` }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain(`src/ref.ts: 引用了已完成工单 ${SR_DONE} 的占位`)
  })

  it('T10 规则 2 src 分支：src 引用 open 票号=未完成合法占位 → EXIT=0', async () => {
    // [回炉 d1-W1] 票 file 独立于被扫文件（open-code.ts 驻根仅过规则 1 存在性，
    // 不入 src/tests 扫描域）——status 守卫（open 不红）从此可证伪：摘除该守卫
    // 则本用例红（open 跨文件引用被误报）
    const root = await makeFixture(
      [{ id: SR_OPEN, file: 'open-code.ts', status: 'open' }],
      { 'open-code.ts': 'export const b = 2', 'src/ref.ts': `export const TAG = '${SR_OPEN}' // 跨文件未完成占位` }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })

  it('T18 [回炉补] 规则 2 src 分支：done 票自身 file 内自引用 → EXIT=0（t.file===rel 自身豁免绿——self 守卫可证伪位）', async () => {
    const root = await makeFixture(
      [{ id: SR_DONE, file: 'src/self.ts', status: 'done' }],
      { 'src/self.ts': `export const SELF_TAG = '${SR_DONE}' // 自身票面内引用（自身豁免面）` }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })

  it('T11 规则 2 tests 分支：占位桩调用引用不存在的票号 → EXIT=1', async () => {
    const root = await makeFixture(
      [{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }],
      { 'snap.json': '{"cases":[]}', 'tests/stub-call.ts': stubCall(SR_MISSING) }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain(`tests/stub-call.ts: 占位桩引用了不存在的工单号 ${SR_MISSING}`)
  })

  it('T12 规则 2 tests 分支：占位桩调用引用 done 票号 → EXIT=1 样例应改非工单号字符串', async () => {
    const root = await makeFixture(
      [{ id: SR_DONE, file: 'snap.json', status: 'done' }],
      { 'snap.json': '{"cases":[]}', 'tests/stub-call.ts': stubCall(SR_DONE) }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain(`tests/stub-call.ts: 占位桩引用已完成工单 ${SR_DONE}`)
  })

  it('T12b [回炉补] 规则 2 tests 分支：第二调用词形引用 done 票号 → EXIT=1（正则 NotImplementedError 备选的失败能力锁）', async () => {
    const root = await makeFixture(
      [{ id: SR_DONE, file: 'snap.json', status: 'done' }],
      { 'snap.json': '{"cases":[]}', 'tests/stub-call.ts': errThrow(SR_DONE) }
    )
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain(`tests/stub-call.ts: 占位桩引用已完成工单 ${SR_DONE}`)
  })

  it('T13 规则 2 tests 分支：占位桩调用引用 open 票号 → EXIT=0（第二调用词形）', async () => {
    const root = await makeFixture(
      [{ id: SR_OPEN, file: 'open-code.ts', status: 'open' }],
      { 'open-code.ts': 'export const b = 2', 'tests/stub-call.ts': errThrow(SR_OPEN) }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })

  it('T14 规则 2 tests 分支：裸注释引用 done 票号（非调用形态）→ EXIT=0', async () => {
    const root = await makeFixture(
      [{ id: SR_DONE, file: 'snap.json', status: 'done' }],
      {
        'snap.json': '{"cases":[]}',
        'tests/bare-ref.ts': `// 裸注释参考 ${SR_DONE} 旧实现（规则 2 tests 只扫调用形态）`,
      }
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
  })

  it('T15 DIR 豁免清单：done 票 file 指向目录且 id 不在清单 → EXIT=1 不在 DIR_FILE_EXEMPT', async () => {
    const root = await makeFixture([{ id: 'F-DIRTEST-9', file: 'docs/bucket', status: 'done' }], {})
    await mkdir(join(root, 'docs', 'bucket'), { recursive: true })
    const r = await cli(root)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('F-DIRTEST-9 的 file 指向目录 docs/bucket——不在 DIR_FILE_EXEMPT')
  })

  it('T16 DIR 豁免清单：id=F-AUDIT-01（清单内）目录形态票 → EXIT=0', async () => {
    const root = await makeFixture([{ id: 'F-AUDIT-01', file: 'docs/audit-bucket', status: 'done' }], {})
    await mkdir(join(root, 'docs', 'audit-bucket'), { recursive: true })
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })

  it('T17 SELF_REL 自身豁免：done 票 file=本脚本自身 → 内容扫描跳过 EXIT=0', async () => {
    // 机制链（门二 B-7 结构性必然的可锁化证明）：脚本源码含占位检测词字面量
    // （规则 3 正则本体+注释），对自身运行内容扫描必自匹配假红——SELF_REL 豁免
    // （file===SELF_REL continue）是校验器自举前提。fixture 根须与脚本同盘：
    // tmpdir（C 盘）与脚本（E 盘）跨盘时 relative 退化绝对路径、经 join 拼根后
    // 存在性必红——故 base=仓父目录（仓外，不污工作树）；同盘 relative 产 ".."
    // 段路径，join 词法归一化后 existsSync 命中真实脚本路径。
    // [回炉 d1-N4a 依赖声明] 本用例证伪力依赖脚本源码含占位检测词字面量（现状=
    // 规则 3 正则本体+注释在档）——脚本重构若移除该字面量则本用例退化为恒真，
    // 重写 check-tickets 时须重评估本锁面。
    const base = dirname(dirname(dirname(SCRIPT)))
    const root = await makeFixture([{ id: 'F-TEST-01', file: 'snap.json', status: 'done' }], {}, base)
    // SELF_REL 同式计算（relative(fixtureRoot, 脚本绝对路径)→POSIX 斜杠）注入
    const selfRel = relative(root, SCRIPT).replaceAll('\\', '/')
    await writeFile(
      join(root, 'tickets', 'registry.ts'),
      registryOf([{ id: 'F-TEST-01', file: selfRel, status: 'done' }]),
      'utf-8'
    )
    const r = await cli(root)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('tickets 检查通过')
  })
})
