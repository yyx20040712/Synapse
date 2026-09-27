/**
 * [F-TESTREF-S2] check-test-surface.mjs baseline 子命令 —— CLI 探针
 * （tests/unit/tools/companion.test.ts 探针法同型：execFile 真子进程+mkdtemp
 * fixture 根+受控 exit code 捕获）。fixture 布局=<tmp>/tests/unit/demo.test.ts
 * +<tmp>/scripts/test-surface.{baseline,exemptions}.json，子进程 cwd 指 fixture
 * 根——真基线/真台账零触碰。
 *
 * 覆盖面：基线再生成对账状态机（旧基线态×两轴）——首装/纯增量/漏登拒写/
 * 正常退役/多登拦截/迁移首启（轴一照拦+补登落快照）/历史豁免巧合命中/
 * skip 类豁免（SKIP_ADDED 命中面）。
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

/** CLI 探针：真子进程跑 baseline 子命令（cwd=fixture 根；exit 4 等受控行为捕获后返回） */
async function cli(root: string): Promise<CliResult> {
  try {
    const r = await run(process.execPath, [SCRIPT, 'baseline'], { cwd: root, timeout: 30_000 })
    return { code: 0, stdout: r.stdout, stderr: r.stderr }
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; killed?: boolean }
    if (err.killed === true) throw new Error('test-surface 探针超时')
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

interface BaselineCase {
  title: string
  markers: string[]
  assertions: string[]
}

interface BaselineJson {
  version: number
  files: Record<string, { cases: BaselineCase[] }>
  stats: { fileCount: number; caseCount: number }
  exemptionsSnapshot?: unknown[]
}

interface Fixture {
  root: string
  setTest: (cases: string[]) => Promise<void>
  writeExtraTest: (rel: string, cases: string[]) => Promise<void>
  setExemptions: (entries: Record<string, string>[]) => Promise<void>
  readBaselineFile: () => Promise<string>
  readBaselineJson: () => Promise<BaselineJson>
  writeBaselineJson: (obj: BaselineJson) => Promise<void>
  writeBaselineRaw: (text: string) => Promise<void>
  dispose: () => Promise<void>
}

const CASE_A = `  it('case-a 基线用例甲', () => {
    expect(1).toBe(1)
  })`
const CASE_B = `  it('case-b 基线用例乙', () => {
    expect(2).toBe(2)
    expect(3).toBe(3)
  })`
/** case-b 收窄形态：删断言 expect(2).toBe(2)（T7 历史豁免巧合命中的退役面） */
const CASE_B_MINUS = `  it('case-b 基线用例乙', () => {
    expect(3).toBe(3)
  })`
const CASE_A_SKIP = `  it.skip('case-a 基线用例甲', () => {
    expect(1).toBe(1)
  })`
const CASE_C = `  it('case-c 增量用例丙', () => {
    expect(4).toBe(4)
  })`
/** 体内 skip 站（extract.mjs 双桶）：cond 标识符条件→conditionalSkipSites；true 字面量→hardSkipSites */
const SKIP_SITE_COND = `  it.skip(cond, '条件站')`
const SKIP_SITE_HARD = `  it.skip(true, '硬站')`

function demoTest(cases: string[]): string {
  return `import { describe, expect, it } from 'vitest'\n\ndescribe('demo', () => {\n${cases.join('\n')}\n})\n`
}

function exemption(over: { caseTitle?: string; assertionText?: string; skipSiteText?: string; file?: string }): Record<string, string> {
  const e: Record<string, string> = {
    file: over.file ?? 'tests/unit/demo.test.ts',
    reason: 'F-TESTREF-S2 探针豁免（演练台账）',
    rulingLink: 'docs/design/probe-f-testref-s2.md'
  }
  if (over.caseTitle !== undefined) e.caseTitle = over.caseTitle
  if (over.assertionText !== undefined) e.assertionText = over.assertionText
  if (over.skipSiteText !== undefined) e.skipSiteText = over.skipSiteText
  return e
}

/** fixture 根：tests/unit/demo.test.ts + scripts/test-surface.exemptions.json（基线不预置） */
async function makeFixture(cases: string[], entries: Record<string, string>[] = []): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'tsurface-'))
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
    setExemptions: async (es) => {
      await writeFile(exemPath, `${JSON.stringify({ version: 1, entries: es }, null, 2)}\n`, 'utf8')
    },
    readBaselineFile: () => readFile(blPath, 'utf8'),
    readBaselineJson: async () => JSON.parse(await readFile(blPath, 'utf8')) as BaselineJson,
    writeBaselineJson: async (obj) => {
      await writeFile(blPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
    },
    writeBaselineRaw: async (text) => {
      await writeFile(blPath, text, 'utf8')
    },
    dispose: async () => {
      await rm(root, { recursive: true, force: true })
    }
  }
}

const DEMO_FILE = 'tests/unit/demo.test.ts'

function titlesOf(bl: BaselineJson): string[] {
  return (bl.files[DEMO_FILE]?.cases ?? []).map((c) => c.title)
}

describe('F-TESTREF-S2 baseline 再生成机检对账（状态机四态×两轴）', () => {
  it('用例1 首装：无基线 → exit 0+基线含 exemptionsSnapshot（空台账=[]）', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      const bl = await f.readBaselineJson()
      expect(bl.version).toBe(1)
      expect(bl.exemptionsSnapshot).toEqual([])
      expect(titlesOf(bl).sort()).toEqual(['case-a 基线用例甲', 'case-b 基线用例乙'])
      expect(bl.stats.caseCount).toBe(2)
    } finally {
      await f.dispose()
    }
  })

  it('用例2 纯增量+零新增豁免 → exit 0，新基线含新用例', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A, CASE_B, CASE_C])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      const bl = await f.readBaselineJson()
      expect(titlesOf(bl)).toContain('case-c 增量用例丙')
      expect(bl.exemptionsSnapshot).toEqual([])
    } finally {
      await f.dispose()
    }
  })

  it('用例3 漏登：删用例不登豁免 → exit 4+FAIL 面含该用例+基线逐字节不变（拒写实证）', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A])
      const before = await f.readBaselineFile()
      const r = await cli(f.root)
      expect(r.code).toBe(4)
      expect(r.stderr).toContain('MISSING_CASE')
      expect(`${r.stdout}${r.stderr}`).toContain('case-b 基线用例乙')
      expect(await f.readBaselineFile()).toBe(before)
    } finally {
      await f.dispose()
    }
  })

  it('用例4 正常退役：删用例+登豁免 → exit 0+新基线无该用例+新快照含该豁免', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const entry = exemption({ caseTitle: 'case-b 基线用例乙' })
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A])
      await f.setExemptions([entry])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING')
      const bl = await f.readBaselineJson()
      expect(titlesOf(bl)).toEqual(['case-a 基线用例甲'])
      expect(bl.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('用例5 多登：纯增量+台账加一条不相关豁免 → exit 4（零命中拦截）+基线不变', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A, CASE_B, CASE_C])
      await f.setExemptions([exemption({ caseTitle: '毫不相关的用例' })])
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

  it('用例6 迁移首启：无快照字段旧基线——漏登轴一照拦 exit 4；补登 → exit 0+落快照', { timeout: 120_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      // 手工构造迁移前形态：剥 exemptionsSnapshot 字段
      const bl = await f.readBaselineJson()
      delete bl.exemptionsSnapshot
      await f.writeBaselineJson(bl)
      await f.setTest([CASE_A])
      const before = await f.readBaselineFile()
      const r1 = await cli(f.root)
      expect(r1.code).toBe(4)
      expect(r1.stderr).toContain('MISSING_CASE')
      expect(await f.readBaselineFile()).toBe(before)
      // 补登豁免 → 轴一过+轴二跳过（初始化）→ 写盘落快照
      const entry = exemption({ caseTitle: 'case-b 基线用例乙' })
      await f.setExemptions([entry])
      const r2 = await cli(f.root)
      expect(r2.code).toBe(0)
      expect(r2.stdout).toContain('豁免快照初始化')
      const bl2 = await f.readBaselineJson()
      expect(bl2.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('用例7 历史豁免巧合命中：快照已有条目+新退役面恰被其文本匹配+零 added → exit 0', { timeout: 60_000 }, async () => {
    const entry = exemption({ assertionText: 'expect(2).toBe(2)' })
    const f = await makeFixture([CASE_A, CASE_B], [entry])
    try {
      expect((await cli(f.root)).code).toBe(0)
      const bl1 = await f.readBaselineJson()
      expect(bl1.exemptionsSnapshot).toEqual([entry])
      // case-b 删断言 expect(2).toBe(2)——退役面恰被快照内既有条目 assertionText 匹配
      await f.setTest([CASE_A, CASE_B_MINUS])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING')
      expect(r.stdout).toContain('MISSING_ASSERT')
      const bl2 = await f.readBaselineJson()
      const b = (bl2.files[DEMO_FILE]?.cases ?? []).find((c) => c.title === 'case-b 基线用例乙')
      expect(b?.assertions).toEqual(['expect(3).toBe(3)'])
      expect(bl2.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('用例8 skip 类豁免：既有用例加 it.skip+登豁免 → 再生成 exit 0（轴二命中面覆盖 SKIP_ADDED）', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const entry = exemption({ caseTitle: 'case-a 基线用例甲' })
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A_SKIP, CASE_B])
      await f.setExemptions([entry])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING')
      expect(r.stdout).toContain('SKIP_ADDED')
      const bl = await f.readBaselineJson()
      const a = (bl.files[DEMO_FILE]?.cases ?? []).find((c) => c.title === 'case-a 基线用例甲')
      expect(a?.markers).toContain('skip')
      expect(bl.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('用例9 新文件 skip 豁免：新增 demo2.test.ts 含 it.skip+登豁免 → exit 0+RETIRING SKIP_ADDED+快照含该豁免（轴二命中实证）', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    const entry = exemption({ file: 'tests/unit/demo2.test.ts', caseTitle: 'case-d 新文件跳过用例' })
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.writeExtraTest('tests/unit/demo2.test.ts', [
        `  it.skip('case-d 新文件跳过用例', () => {
    expect(9).toBe(9)
  })`
      ])
      await f.setExemptions([entry])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING SKIP_ADDED')
      const bl = await f.readBaselineJson()
      const d = (bl.files['tests/unit/demo2.test.ts']?.cases ?? []).find((c) => c.title === 'case-d 新文件跳过用例')
      expect(d?.markers).toContain('skip')
      expect(bl.exemptionsSnapshot).toEqual([entry])
    } finally {
      await f.dispose()
    }
  })

  it('用例10 损坏基线：非法 JSON → exit 0+stdout 含「损坏」「修复」+基线重写落快照', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      await f.writeBaselineRaw('{broken')
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('损坏')
      expect(r.stdout).toContain('修复')
      const bl = await f.readBaselineJson()
      expect(bl.exemptionsSnapshot).toEqual([])
      expect(titlesOf(bl).sort()).toEqual(['case-a 基线用例甲', 'case-b 基线用例乙'])
    } finally {
      await f.dispose()
    }
  })

  it('用例11 快照畸形：非数组/含 null 元素数组 → exit 0+「豁免快照损坏」+重写（不崩溃实证）', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B])
    try {
      expect((await cli(f.root)).code).toBe(0)
      // 非数组形态（{}）
      const bl1 = await f.readBaselineJson()
      bl1.exemptionsSnapshot = {} as unknown as unknown[]
      await f.writeBaselineJson(bl1)
      const r1 = await cli(f.root)
      expect(r1.code).toBe(0)
      expect(`${r1.stdout}${r1.stderr}`).toContain('豁免快照损坏')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([])
      // 含 null 元素数组——同路径（原实现会未捕获 TypeError 崩溃，R1 后归 corrupt 语义）
      const bl2 = await f.readBaselineJson()
      bl2.exemptionsSnapshot = [null]
      await f.writeBaselineJson(bl2)
      const r2 = await cli(f.root)
      expect(r2.code).toBe(0)
      expect(`${r2.stdout}${r2.stderr}`).toContain('豁免快照损坏')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([])
      // 主控加固批（d1-W4 行为锁）：快照坏+轴一漏登（删用例不登豁免）→ 轴一照跑
      // exit 4 拒写——快照单轴坏不得连带放弃漏登拦截（真实漂移禁止被重写吞没）
      const bl3 = await f.readBaselineJson()
      bl3.exemptionsSnapshot = {} as unknown as unknown[]
      await f.writeBaselineJson(bl3)
      await f.setTest([CASE_A])
      const before = await f.readBaselineFile()
      const r3 = await cli(f.root)
      expect(r3.code).toBe(4)
      expect(r3.stderr).toContain('MISSING_CASE')
      expect(`${r3.stdout}${r3.stderr}`).toContain('豁免快照损坏')
      expect(await f.readBaselineFile()).toBe(before)
    } finally {
      await f.dispose()
    }
  })

  it('用例12 孤儿 removed：快照有条目+台账删该条+零其他变化 → exit 0+REMOVED 打印不拦+新快照不含它', { timeout: 60_000 }, async () => {
    const entry = exemption({ caseTitle: 'case-a 基线用例甲' })
    const f = await makeFixture([CASE_A, CASE_B], [entry])
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setExemptions([])
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('REMOVED')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([])
    } finally {
      await f.dispose()
    }
  })

  it('用例13 注释性修订同身份放行；同身份双条=多重集差各计（纯增量场景 exit 4）', { timeout: 120_000 }, async () => {
    const entry = exemption({ caseTitle: 'case-a 基线用例甲' })
    const f = await makeFixture([CASE_A, CASE_B], [entry])
    try {
      expect((await cli(f.root)).code).toBe(0)
      // 13a：同 file+同 caseTitle 仅改 reason（注释性修订）——R2 身份键下 added=0 放行
      const revised = { ...entry, reason: '注释性修订后的新理由（裁决链换档）' }
      await f.setExemptions([revised])
      const r1 = await cli(f.root)
      expect(r1.code).toBe(0)
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual([revised])
      // 13b 对照：台账同身份双条 vs 快照 1 条 → added=1 → 纯增量零命中 exit 4
      await f.setExemptions([entry, { ...entry }])
      const r2 = await cli(f.root)
      expect(r2.code).toBe(4)
      expect(r2.stderr).toContain('多登')
    } finally {
      await f.dispose()
    }
  })

  it('用例14 两态 skip 站豁免命中：删 conditional+hard 双站+登豁免 → exit 0+RETIRING SKIPSITE_REMOVED/HARDSKIP_REMOVED', { timeout: 60_000 }, async () => {
    const f = await makeFixture([CASE_A, CASE_B, SKIP_SITE_COND, SKIP_SITE_HARD])
    const entries = [exemption({ skipSiteText: "it.skip(cond, '条件站')" }), exemption({ skipSiteText: "it.skip(true, '硬站')" })]
    try {
      expect((await cli(f.root)).code).toBe(0)
      await f.setTest([CASE_A, CASE_B])
      await f.setExemptions(entries)
      const r = await cli(f.root)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('RETIRING SKIPSITE_REMOVED')
      expect(r.stdout).toContain('RETIRING HARDSKIP_REMOVED')
      expect((await f.readBaselineJson()).exemptionsSnapshot).toEqual(entries)
    } finally {
      await f.dispose()
    }
  })
})
