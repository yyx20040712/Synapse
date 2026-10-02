/**
 * [F-TESTREF-S5] 抽取器邻接残余三形态补判定面 —— CLI 探针姊妹件
 * （check-test-surface-s1.test.ts 探针法同型：execFile 真子进程+mkdtemp fixture
 * 根+受控 exit code 捕获；姊妹件成因=受锁既有件零改动先例族）。
 *
 * 覆盖面（registry 票面三形态，语义全族=保守红 UNRESOLVABLE）：
 * ① 属性访问初值别名 const each = it.each / it['each']：旧 localAliasCheck 仅认
 *   裸标识符初值——别名后 each(ARR)(title,fn) callee 裸标识符，白名单抽取与
 *   漏扫哨兵双盲，须保守红（reason 含原形）；
 * ② ElementAccess 调用 it['each']('t', fn)：calleeText 对 ElementAccess 返
 *   null——白名单/哨兵两域均不中；computed 非字面量成员静态不可判，成员字面量
 *   与否同红（elementAccessCheck 两域同挂）；
 * ③ 链式 each 双层 it.concurrent.each(ARR)(title, fn)：白名单域并入 startsWith
 *   判定族自然落「不在 v1 支持子集」红支路（不做标题展开）；哨兵域 isEachDouble
 *   放宽为 watched 根前缀+each 段（it.each/it.concurrent.each 双形皆中）。
 *
 * 激活方式：不经 guardedDescribe 直接激活（三屋新测试 always-active 惯例）。
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

/** CLI 探针：真子进程跑 baseline 子命令（cwd=fixture 根；受控 exit code 捕获后返回） */
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

/** fixture 根：单测试文件 + 空 exemptions 台账（基线不预置——baseline 首装路径） */
async function makeFixture(testRel: string, testContent: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tsurface-s5-'))
  await mkdir(join(root, 'tests', 'unit'), { recursive: true })
  await mkdir(join(root, 'scripts'), { recursive: true })
  await writeFile(join(root, testRel), testContent, 'utf8')
  await writeFile(
    join(root, 'scripts', 'test-surface.exemptions.json'),
    `${JSON.stringify({ version: 1, entries: [] }, null, 2)}\n`,
    'utf8'
  )
  return root
}

/** 基线用例甲（各 fixture 共用的合法白名单内容底盘） */
const CASE_A = `  it('case-a 基线用例甲', () => {
    expect(1).toBe(1)
  })`

function demoTest(cases: string[]): string {
  return `import { describe, expect, it } from 'vitest'\n\ndescribe('demo', () => {\n${cases.join('\n')}\n})\n`
}

describe('F-TESTREF-S5 抽取器邻接残余三形态补判定面（属性访问别名/ElementAccess 调用/链式 each）', () => {
  it('S5-① 属性访问初值别名（const each = it.each 与 it[\'each\'] 复合形）→ 保守红（exit 1+原形文案）', { timeout: 60_000 }, async () => {
    const content = [
      "import { describe, expect, it } from 'vitest'",
      '',
      'const each = it.each',
      "const each2 = it['each']",
      '',
      "describe('demo', () => {",
      "  it('case-s5a 基线用例', () => {",
      '    expect(1).toBe(1)',
      '  })',
      "  each([[1]])('行 %i', () => {",
      '    expect(1).toBe(1)',
      '  })',
      "  each2([[2]])('行2 %i', () => {",
      '    expect(1).toBe(1)',
      '  })',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      const aliasHelperRel = 'tests/unit/alias.helper.ts'
      const aliasHelperContent = [
        "import { expect, it } from 'vitest'",
        '',
        'const each3 = it.each',
        ''
      ].join('\n')
      await writeFile(join(root, aliasHelperRel), aliasHelperContent, 'utf8')
      const r = await cli(root)
      expect(r.code, '属性访问初值别名使 each(ARR)(...) 双层调用静默漏抽——须保守红').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('F-TESTREF-S5①')
      expect(out).toContain('const each = it.each')
      expect(out).toContain("const each2 = it['each']")
      expect(out).toContain('alias.helper.ts')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S5-② ElementAccess 调用（it[\'each\'](title, fn)）→ 白名单与哨兵两域同红（exit 1+S5② 文案）', { timeout: 60_000 }, async () => {
    const content = demoTest([
      CASE_A,
      "  it['each']('case-s5b 成员访问调用', () => {",
      '    expect(1).toBe(1)',
      '  })',
      "  const arr = ['x']",
      "  arr['push']('y')"
    ])
    const helperRel = 'tests/unit/elem.helper.ts'
    const helperContent = [
      "import { expect, it } from 'vitest'",
      '',
      "it['each']('case-s5b-helper 非白名单域成员访问', () => {",
      '  expect(1).toBe(1)',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      await writeFile(join(root, helperRel), helperContent, 'utf8')
      const r = await cli(root)
      expect(r.code, 'ElementAccess 调用 calleeText 返 null 两域双盲——computed 成员同族保守红').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('F-TESTREF-S5②')
      expect(out).toContain('demo.test.ts')
      expect(out).toContain('elem.helper.ts')
      expect(out).not.toContain("arr['push']")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S5-③a 白名单域链式 each 双层（it.concurrent.each(ARR)(title, fn)）→ 落「不在 v1 支持子集」红支路', { timeout: 60_000 }, async () => {
    const content = demoTest([
      CASE_A,
      '  it.concurrent.each([[1]])(\'行 %i\', () => {',
      '    expect(1).toBe(1)',
      '  })'
    ])
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      const r = await cli(root)
      expect(r.code, '链式 each 双层两域同盲——白名单域须并入 startsWith 判定族落保守红').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('it.concurrent.each')
      expect(out).toContain('不在 v1 支持子集')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S5-③b 哨兵域链式 each 双层（非白名单文件 it.concurrent.each(ARR)(title, fn)）→ 漏扫哨兵红', { timeout: 60_000 }, async () => {
    const content = demoTest([CASE_A])
    const helperRel = 'tests/unit/conc.helper.ts'
    const helperContent = [
      "import { expect, it } from 'vitest'",
      '',
      "it.concurrent.each([[1]])('行 %i', () => {",
      '  expect(1).toBe(1)',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      await writeFile(join(root, helperRel), helperContent, 'utf8')
      const r = await cli(root)
      expect(r.code, '哨兵 isEachDouble 旧正则不匹配链式 each——放宽后须捕获').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('漏扫哨兵')
      expect(out).toContain('conc.helper.ts')
      expect(out).toContain('each 双层调用')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S5-④ 混合链 each 双层（白名单 it.concurrent[\'each\'] 与哨兵 it[\'concurrent\'].each）→ 两域同红（exit 1+S5② 文案+双文件名）', { timeout: 60_000 }, async () => {
    const content = demoTest([
      CASE_A,
      '  it.concurrent[\'each\']([[1]])(\'行 %i\', () => {',
      '    expect(1).toBe(1)',
      '  })'
    ])
    const helperRel = 'tests/unit/mixed.helper.ts'
    const helperContent = [
      "import { expect, it } from 'vitest'",
      '',
      "it['concurrent'].each([[1]])('行 %i', () => {",
      '  expect(1).toBe(1)',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      await writeFile(join(root, helperRel), helperContent, 'utf8')
      const r = await cli(root)
      expect(r.code, '混合链 calleeText 沿 PropertyAccess 下探遇 ElementAccess 返 null 两域盲——判据放宽为 flatRoot∈监视集严格超集后须两域同红').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('F-TESTREF-S5②')
      expect(out).toContain('demo.test.ts')
      expect(out).toContain('mixed.helper.ts')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S5-⑤ 修饰链 each 双层（白名单 it.skip.each/test.only.each）→ 落「不在 v1 支持子集」红支路（两域同源正则+根集锚）', { timeout: 60_000 }, async () => {
    const content = demoTest([
      CASE_A,
      '  it.skip.each([[1], [2]])(\'行 %s\', () => {',
      '    expect(1).toBe(1)',
      '  })',
      '  test.only.each([[3]])(\'行2 %s\', () => {',
      '    expect(1).toBe(1)',
      '  })'
    ])
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      const r = await cli(root)
      expect(r.code, '修饰链 each 白名单域前缀枚举漏判（同形哨兵反中=域间不对称）——两域同源正则后须落保守红').toBe(1)
      const out = `${r.stdout}${r.stderr}`
      expect(out).toContain('it.skip.each')
      // [d1 复审 W5 根集锚] test/describe 根同锁——假修复收窄为 ^it\. 时本断言红
      expect(out).toContain('test.only.each')
      expect(out).toContain('不在 v1 支持子集')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
