/**
 * [F-TESTREF-S4] check-test-surface.mjs 防御面加固 —— CLI 探针姊妹件
 * （tests/unit/tools/check-test-surface-file.test.ts 探针法同型：execFile 真子进程
 * +mkdtemp fixture 根+受控 exit code 捕获）。成因=受锁既有件零改动（姊妹件
 * 先例族）——本票四项加固面全数落本件：
 * ①台账 entries 元素前置校验（null/非对象元素→受控 exit 3 非裸崩溃）；
 * ②条目键白名单（拼错键点名报错，非死键静默通过）；③快照 fileScope 畸形校验
 * （非 true 布尔值含 "true" 字符串→snapshotCorrupt 语义，防轴二身份键不等
 * 假 added/removed 双误报）；④FILE_MISSING 二分（磁盘存在→SCAN_MISSING 指向
 * 抽取器/后缀白名单排查；磁盘不存在→既有 FILE 豁免通道完全不变）。
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

interface BaselineFileEntry {
  ticketIds: string[]
  conditionalSkipSites: string[]
  hardSkipSites: string[]
  cases: unknown[]
}

interface BaselineJson {
  version: number
  files: Record<string, BaselineFileEntry>
  stats: { fileCount: number; caseCount: number }
  exemptionsSnapshot?: unknown[]
}

interface Fixture {
  root: string
  setExemptions: (entries: unknown[]) => Promise<void>
  writeRaw: (rel: string, content: string) => Promise<void>
  removeFile: (rel: string) => Promise<void>
  readBaselineJson: () => Promise<BaselineJson>
  writeBaselineJson: (obj: BaselineJson) => Promise<void>
  dispose: () => Promise<void>
}

const CASE_A = `  it('case-a 加固基线用例', () => {
    expect(1).toBe(1)
  })`
const CASE_B = `  it('case-b 加固基线用例乙', () => {
    expect(2).toBe(2)
  })`
/** 整文件退役 fixture 用例（驻 tests/unit/extra.test.ts——T7 的删除对象） */
const EXTRA_CASE = `  it('case-x 加固整文件退役用例', () => {
    expect(5).toBe(5)
  })`
const DEMO_FILE = 'tests/unit/demo.test.ts'
const EXTRA_REL = 'tests/unit/extra.test.ts'
const HELPER_REL = 'tests/unit/foo.helper.ts'
/** 非白名单后缀探针文件内容：零测试调用形态（绕开漏扫哨兵——哨兵只盯 it/test/describe 调用形态） */
const HELPER_CONTENT = 'export const helperValue = 41\n'

function demoTest(cases: string[]): string {
  return `import { describe, expect, it } from 'vitest'\n\ndescribe('demo', () => {\n${cases.join('\n')}\n})\n`
}

/** FILE 级豁免条目（file+fileScope:true+reason+rulingLink 显式哨兵形态） */
function fileExemption(file: string): Record<string, unknown> {
  return {
    file,
    fileScope: true,
    reason: 'F-TESTREF-S4 探针豁免（演练台账）',
    rulingLink: 'docs/design/probe-f-testref-s4.md'
  }
}

/** fixture 根：tests/unit/demo.test.ts + scripts/test-surface.exemptions.json（基线不预置） */
async function makeFixture(cases: string[], entries: unknown[] = []): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'tsurface-s4-'))
  await mkdir(join(root, 'tests', 'unit'), { recursive: true })
  await mkdir(join(root, 'scripts'), { recursive: true })
  const exemPath = join(root, 'scripts', 'test-surface.exemptions.json')
  const blPath = join(root, 'scripts', 'test-surface.baseline.json')
  await writeFile(join(root, DEMO_FILE), demoTest(cases), 'utf8')
  await writeFile(exemPath, `${JSON.stringify({ version: 1, entries }, null, 2)}\n`, 'utf8')
  return {
    root,
    setExemptions: async (es) => {
      await writeFile(exemPath, `${JSON.stringify({ version: 1, entries: es }, null, 2)}\n`, 'utf8')
    },
    writeRaw: async (rel, content) => {
      await writeFile(join(root, rel), content, 'utf8')
    },
    removeFile: async (rel) => {
      await rm(join(root, rel), { force: true })
    },
    readBaselineJson: async () => JSON.parse(await readFile(blPath, 'utf8')) as BaselineJson,
    writeBaselineJson: async (obj) => {
      await writeFile(blPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
    },
    dispose: async () => {
      await rm(root, { recursive: true, force: true })
    }
  }
}

describe('F-TESTREF-S4 指纹门防御面加固（台账/快照/FILE_MISSING 三面）', () => {
  it('T1 台账 entries 含 null 元素 → 受控 exit 3（非裸崩溃）+元素索引与摘要点名', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions([null])
      const r = await cli(f.root, 'check')
      expect(r.code).toBe(3)
      expect(r.stderr).toContain('entries[0]')
      expect(r.stderr).toContain('须为对象')
    } finally {
      await f.dispose()
    }
  })

  it('T2 台账 entries 含字符串元素 → 受控 exit 3（元素索引+JSON 摘要）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions(['非对象字符串探针'])
      const r = await cli(f.root, 'check')
      expect(r.code).toBe(3)
      expect(r.stderr).toContain('entries[0]')
      expect(r.stderr).toContain('非对象字符串探针')
    } finally {
      await f.dispose()
    }
  })

  it('T3 FILE 条目（file+fileScope:true+reason+rulingLink 齐全）+拼错键 caseTitel → exit 3 点名未知键+合法键全集', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions([{ ...fileExemption(DEMO_FILE), caseTitel: 'case-a 加固基线用例' }])
      const r = await cli(f.root, 'check')
      expect(r.code).toBe(3)
      expect(r.stderr).toContain('未知键')
      expect(r.stderr).toContain('caseTitel')
      expect(r.stderr).toContain('caseTitle')
    } finally {
      await f.dispose()
    }
  })

  it('T4 matcher 条目带拼错键（无 fileScope）→ exit 3 点名未知键（对照既有泛文案不点名）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions([{
        file: DEMO_FILE,
        caseTitel: 'case-a 加固基线用例',
        reason: 'F-TESTREF-S4 探针豁免（演练台账）',
        rulingLink: 'docs/design/probe-f-testref-s4.md'
      }])
      const r = await cli(f.root, 'check')
      expect(r.code).toBe(3)
      expect(r.stderr).toContain('未知键')
      expect(r.stderr).toContain('caseTitel')
    } finally {
      await f.dispose()
    }
  })

  it('T5 快照元素 fileScope:"true" 字符串 → baseline 轴二跳过（快照损坏字样+重写修复）；check 侧照常通过（不读快照）', { timeout: 180_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B], [fileExemption(DEMO_FILE)])
    try {
      expect((await cli(f.root)).code).toBe(0)
      const bl = await f.readBaselineJson()
      const snap = (bl.exemptionsSnapshot ?? []) as Array<Record<string, unknown>>
      snap[0]!.fileScope = 'true'
      await f.writeBaselineJson(bl)
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stderr).toContain('快照损坏')
      const repaired = await f.readBaselineJson()
      const repairedSnap = (repaired.exemptionsSnapshot ?? []) as Array<Record<string, unknown>>
      expect(repairedSnap[0]!.fileScope).toBe(true)
      const rc = await cli(f.root, 'check')
      expect(rc.code).toBe(0)
      expect(rc.stdout).toContain('检查通过')
    } finally {
      await f.dispose()
    }
  })

  it('T6 假基线登一文件+磁盘放置同名非白名单后缀文件（foo.helper.ts）→ check exit 1+SCAN_MISSING（指向抽取器/白名单排查）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      const bl = await f.readBaselineJson()
      bl.files[HELPER_REL] = { ticketIds: [], conditionalSkipSites: [], hardSkipSites: [], cases: [] }
      bl.stats.fileCount = 2
      await f.writeBaselineJson(bl)
      await f.writeRaw(HELPER_REL, HELPER_CONTENT)
      const r = await cli(f.root, 'check')
      expect(r.code).toBe(1)
      expect(r.stderr).toContain('SCAN_MISSING')
      expect(r.stderr).toContain('白名单')
    } finally {
      await f.dispose()
    }
  })

  it('T8 畸形快照（fileScope:"true"）→ 直接 check exit 0——「check 不读快照」契约锁（门一双席同中 W1 回炉帧：不跑 baseline 修复，check 只消费 files/stats）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B], [fileExemption(DEMO_FILE)])
    try {
      expect((await cli(f.root)).code).toBe(0)
      const bl = await f.readBaselineJson()
      const snap = (bl.exemptionsSnapshot ?? []) as Array<Record<string, unknown>>
      snap[0]!.fileScope = 'true'
      await f.writeBaselineJson(bl)
      const rc = await cli(f.root, 'check')
      expect(rc.code).toBe(0)
      expect(rc.stdout).toContain('检查通过')
    } finally {
      await f.dispose()
    }
  })

  it('T7 对照：基线登文件+磁盘真删 → 既有 FILE_MISSING exit 1；登 FILE 豁免后转绿（豁免通道不破坏）', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      await f.writeRaw(EXTRA_REL, demoTest([EXTRA_CASE]))
      expect((await cli(f.root)).code).toBe(0)
      expect((await f.readBaselineJson()).files[EXTRA_REL]).toBeDefined()
      await f.removeFile(EXTRA_REL)
      const r1 = await cli(f.root, 'check')
      expect(r1.code).toBe(1)
      expect(r1.stderr).toContain('FILE_MISSING')
      // 负锚锁失败 kind 形态（FAIL SCAN_MISSING）而非裸子串——P2 收口文案在 hint
      // 中提及 SCAN_MISSING 无豁免通道（合法），裸子串负锚会被 hint 误中假红
      expect(r1.stderr).not.toContain('FAIL SCAN_MISSING')
      await f.setExemptions([fileExemption(EXTRA_REL)])
      const r2 = await cli(f.root, 'check')
      expect(r2.code).toBe(0)
      expect(r2.stdout).toContain('检查通过')
    } finally {
      await f.dispose()
    }
  })
})
