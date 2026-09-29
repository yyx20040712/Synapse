/**
 * [F-TESTREF-S3] check-test-surface.mjs FILE 级豁免通道 —— CLI 探针
 * （check-test-surface.test.ts 探针法同型姊妹件：execFile 真子进程+mkdtemp
 * fixture 根+受控 exit code 捕获）。姊妹件成因=受锁既有件零改动（T3-U1
 * 姊妹件先例族）+宪法通用 ≤500 行规范（注：max-lines 对 tests 目录下 .ts 测试件
 * 已由 eslint override 关闭——扩用例不触发 lint 红，此处为规范层约束非机检阻断；
 * 门二裁决部 F1 勘正）——FILE 级豁免新用例全数落本件，既有件零改动。
 *
 * 覆盖面：FILE 级豁免（fileScope:true 显式哨兵条目）——删整测试文件的机检
 * 出路：轴一 FILE_MISSING 命中（baseline 再生成放行+check 日常消费面双测）/
 * 未登双拒（exit 4 拒写+check exit 1）/schema 两形态互斥（FILE 形态合法装载、
 * 非布尔哨兵、与 matcher 并存、零 matcher 无哨兵=既有行为回归锁）/轴二多登
 * 零命中拦截/轴二身份键（台账删条=孤儿 REMOVED 不拦+新快照落账）/同文件
 * FILE+matcher 并存协同与重复 FILE 条目多重集计数（T7/T8——R1·d1-W3 闭合）。
 *
 * 激活方式：不经 guardedDescribe 直接激活（三屋新测试 always-active 惯例，
 * 简报明文）。
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const SCRIPT = fileURLToPath(new URL('../../../scripts/check-test-surface.mjs', import.meta.url))

interface CliResult {
  code: number
  stdout: string
  stderr: string
}

/** CLI 探针：真子进程跑 baseline/check 子命令（cwd=fixture 根；受控 exit code 捕获后返回） */
async function cli(root: string, cmd: 'baseline' | 'check' = 'baseline'): Promise<CliResult> {
  try {
    const r = await run(process.execPath, [SCRIPT, cmd], { cwd: root, timeout: 30_000 })
    return { code: 0, stdout: r.stdout, stderr: r.stderr }
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; killed?: boolean }
    if (err.killed === true) throw new Error('test-surface 探针超时')
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

interface BaselineJson {
  version: number
  files: Record<string, unknown>
  stats: { fileCount: number; caseCount: number }
  exemptionsSnapshot?: unknown[]
}

interface Fixture {
  root: string
  setTest: (cases: string[]) => Promise<void>
  writeExtraTest: (rel: string, cases: string[]) => Promise<void>
  removeTest: (rel: string) => Promise<void>
  setExemptions: (entries: Record<string, unknown>[]) => Promise<void>
  readBaselineFile: () => Promise<string>
  readBaselineJson: () => Promise<BaselineJson>
  dispose: () => Promise<void>
}

const CASE_A = `  it('case-a 保留用例', () => {
    expect(1).toBe(1)
  })`
const CASE_B = `  it('case-b 保留用例乙', () => {
    expect(2).toBe(2)
  })`
/** 整文件退役 fixture 用例（驻 tests/unit/extra.test.ts——T1/T3/T6 的删除对象） */
const EXTRA_CASE = `  it('case-x 整文件退役用例', () => {
    expect(5).toBe(5)
  })`
const DEMO_FILE = 'tests/unit/demo.test.ts'
const EXTRA_REL = 'tests/unit/extra.test.ts'

function demoTest(cases: string[]): string {
  return `import { describe, expect, it } from 'vitest'\n\ndescribe('demo', () => {\n${cases.join('\n')}\n})\n`
}

/** FILE 级豁免条目（F-TESTREF-S3 显式哨兵形态：零 matcher 键+fileScope:true） */
function fileExemption(file: string): Record<string, unknown> {
  return {
    file,
    fileScope: true,
    reason: 'F-TESTREF-S3 探针豁免（演练台账）',
    rulingLink: 'docs/design/probe-f-testref-s3.md'
  }
}

/** fixture 根：tests/unit/demo.test.ts + scripts/test-surface.exemptions.json（基线不预置） */
async function makeFixture(cases: string[], entries: Record<string, unknown>[] = []): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'tsurface-s3-'))
  await mkdir(join(root, 'tests', 'unit'), { recursive: true })
  await mkdir(join(root, 'scripts'), { recursive: true })
  const testPath = join(root, 'tests', 'unit', 'demo.test.ts')
  const exemPath = join(root, 'scripts', 'test-surface.exemptions.json')
  const blPath = join(root, 'scripts', 'test-surface.baseline.json')
  await writeFile(testPath, demoTest(cases), 'utf8')
  await writeFile(exemPath, `${JSON.stringify({ version: 1, entries }, null, 2)}\n`, 'utf8')
  return {
    root,
    setTest: async (cs) => {
      await writeFile(testPath, demoTest(cs), 'utf8')
    },
    writeExtraTest: async (rel, cs) => {
      await writeFile(join(root, rel), demoTest(cs), 'utf8')
    },
    removeTest: async (rel) => {
      await rm(join(root, rel), { force: true })
    },
    setExemptions: async (es) => {
      await writeFile(exemPath, `${JSON.stringify({ version: 1, entries: es }, null, 2)}\n`, 'utf8')
    },
    readBaselineFile: () => readFile(blPath, 'utf8'),
    readBaselineJson: async () => JSON.parse(await readFile(blPath, 'utf8')) as BaselineJson,
    dispose: async () => {
      await rm(root, { recursive: true, force: true })
    }
  }
}

describe('F-TESTREF-S3 FILE 级豁免通道（删整测试文件的机检出路）', () => {
  it('T1 删整文件+登 FILE 级豁免 → baseline exit 0+RETIRING FILE_MISSING+新基线无该文件+快照含该条目', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const entry = fileExemption(EXTRA_REL)
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      expect((await f.readBaselineJson()).files[EXTRA_REL]).toBeDefined()
      await f.removeTest(EXTRA_REL)
      await f.setExemptions([entry])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING FILE_MISSING')
      const bl = await f.readBaselineJson()
      expect(bl.files[EXTRA_REL]).toBeUndefined()
      expect(bl.files[DEMO_FILE]).toBeDefined()
      expect(bl.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('T2 负向：删整文件不登豁免 → baseline exit 4+FAIL FILE_MISSING+基线逐字节不变（拒写实证）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      await f.removeTest(EXTRA_REL)
      const before = await f.readBaselineFile()
      const r = await cli(f.root)
      expect(r.code).toBe(4)
      expect(r.stderr).toContain('FILE_MISSING')
      expect(`${r.stdout}${r.stderr}`).toContain(EXTRA_REL)
      expect(await f.readBaselineFile()).toBe(before)
    } finally {
      await f.dispose()
    }
  })

  it('T3 check 子命令侧：未登 → exit 1+FILE_MISSING；登 FILE 级豁免 → exit 0（日常 verify 消费面）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      await f.removeTest(EXTRA_REL)
      const before = await f.readBaselineFile()
      const r1 = await cli(f.root, 'check')
      expect(r1.code).toBe(1)
      expect(r1.stderr).toContain('FILE_MISSING')
      expect(await f.readBaselineFile()).toBe(before)
      await f.setExemptions([fileExemption(EXTRA_REL)])
      const r2 = await cli(f.root, 'check')
      expect(r2.code).toBe(0)
      expect(r2.stdout).toContain('检查通过')
    } finally {
      await f.dispose()
    }
  })

  it('T4 schema 两形态互斥：FILE 形态合法装载；fileScope 非布尔/与 matcher 并存/零 matcher 无哨兵 → exit 3', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      // T4a：FILE 形态合法装载（文件未删、零命中——check 侧 stale 不拦，schema 接受即证）
      await f.setExemptions([fileExemption(DEMO_FILE)])
      const ra = await cli(f.root, 'check')
      expect(ra.code).toBe(0)
      // T4b：fileScope 非布尔（'yes'）→ exit 3
      await f.setExemptions([{ ...fileExemption(DEMO_FILE), fileScope: 'yes' }])
      const rb = await cli(f.root, 'check')
      expect(rb.code).toBe(3)
      expect(rb.stderr).toContain('豁免条目 schema 非法')
      // T4c：fileScope 与 matcher 键并存（互斥违例）→ exit 3
      await f.setExemptions([{ ...fileExemption(DEMO_FILE), caseTitle: 'case-a 保留用例' }])
      const rc = await cli(f.root, 'check')
      expect(rc.code).toBe(3)
      expect(rc.stderr).toContain('豁免条目 schema 非法')
      // T4d：零 matcher 且无 fileScope → exit 3（既有行为回归锁）
      await f.setExemptions([{ file: DEMO_FILE, reason: 'F-TESTREF-S3 探针豁免（演练台账）', rulingLink: 'docs/design/probe-f-testref-s3.md' }])
      const rd = await cli(f.root, 'check')
      expect(rd.code).toBe(3)
      expect(rd.stderr).toContain('豁免条目 schema 非法')
    } finally {
      await f.dispose()
    }
  })

  it('T5 轴二多登：登 FILE 条目但文件未删 → exit 4 零命中拦截+「多登」+基线不变', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions([fileExemption(DEMO_FILE)])
      const before = await f.readBaselineFile()
      const r = await cli(f.root)
      expect(r.code).toBe(4)
      expect(r.stdout).toContain('命中 0')
      expect(r.stderr).toContain('多登')
      expect(await f.readBaselineFile()).toBe(before)
    } finally {
      await f.dispose()
    }
  })

  it('T6 轴二身份：快照含 FILE 条目+台账删该条（文件保持删除态）→ exit 0+REMOVED 打印不拦+新快照无它', { timeout: 180_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      await f.removeTest(EXTRA_REL)
      await f.setExemptions([fileExemption(EXTRA_REL)])
      expect((await cli(f.root)).code).toBe(0)
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([fileExemption(EXTRA_REL)])
      // 台账删该条、文件保持删除态（基线已不含该文件——无新退役面）→ 孤儿 REMOVED 放行
      await f.setExemptions([])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('REMOVED')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([])
    } finally {
      await f.dispose()
    }
  })

  it('T7 [R1·d1-W3] 同文件 FILE 条目+matcher 条目并存：matcher 退役单用例+FILE 退役整文件——两身份不撞协同（exit 0+双 RETIRING）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const fileEntry = fileExemption(EXTRA_REL)
    const matcherEntry: Record<string, unknown> = {
      file: DEMO_FILE,
      caseTitle: 'case-b 保留用例乙',
      reason: 'F-TESTREF-S3 探针豁免（演练台账）',
      rulingLink: 'docs/design/probe-f-testref-s3.md'
    }
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      await f.removeTest(EXTRA_REL)
      await f.setTest([CASE_A])
      await f.setExemptions([matcherEntry, fileEntry])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING FILE_MISSING')
      expect(r.stdout).toContain('RETIRING MISSING_CASE')
      const bl = await f.readBaselineJson()
      expect(bl.files[EXTRA_REL]).toBeUndefined()
      expect(Object.keys(bl.files)).toEqual([DEMO_FILE])
      expect(bl.exemptionsSnapshot).toEqual([matcherEntry, fileEntry])
    } finally {
      await f.dispose()
    }
  })

  it('T8 [R1·d1-W3] 重复 FILE 条目（同身份双条）+真实删除 → 命中路径多重集计数：exit 0+快照含双条', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const dup = [fileExemption(EXTRA_REL), fileExemption(EXTRA_REL)]
    try {
      await f.writeExtraTest(EXTRA_REL, [EXTRA_CASE])
      expect((await cli(f.root)).code).toBe(0)
      await f.removeTest(EXTRA_REL)
      await f.setExemptions(dup)
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING FILE_MISSING')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual(dup)
    } finally {
      await f.dispose()
    }
  })
})
