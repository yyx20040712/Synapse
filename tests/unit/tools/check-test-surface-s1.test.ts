/**
 * [F-TESTREF-S1] 指纹门抽取器语法子集补强 ①②③ —— CLI 探针姊妹件
 * （tests/unit/tools/check-test-surface.test.ts 探针法同型：execFile 真子进程
 * +mkdtemp fixture 根+受控 exit code 捕获；姊妹件成因=受锁既有件零改动先例族）。
 *
 * 覆盖面（registry 票面三项）：
 * ① 哨兵 each 双层调用形态：非白名单文件 it.each([[1]])('t %i', fn) 外层
 *   callee=CallExpression——旧哨兵双盲（内层调用 looksCase 不命中+外层
 *   calleeText=null），须补漏扫哨兵红；
 * ② 本地变量别名通道：白名单文件 const myIt = it; myIt('t', fn) 静默漏抽
 *   ——须保守红（用例 API 经本地名流经=不可静态判定，import 面外同族）；
 * ③ importAliasCheck 排除 type-only import：import type { it as myIt } 为
 *   类型面引用（运行时零绑定）——旧检测误红，须放行。
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
  const root = await mkdtemp(join(tmpdir(), 'tsurface-s1-'))
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

/** 基线用例甲（三 fixture 共用的合法白名单内容底盘） */
const CASE_A = `  it('case-a 基线用例甲', () => {
    expect(1).toBe(1)
  })`

function demoTest(cases: string[]): string {
  return `import { describe, expect, it } from 'vitest'\n\ndescribe('demo', () => {\n${cases.join('\n')}\n})\n`
}

describe('F-TESTREF-S1 抽取器语法子集补强（哨兵 each/本地别名/type-only import）', () => {
  it('S1-① 非白名单文件 each 双层调用形态 → 漏扫哨兵红（exit 1+哨兵文案点名 each）', { timeout: 60_000 }, async () => {
    const helperRel = 'tests/unit/each.helper.ts'
    const helperContent = [
      "import { expect, it } from 'vitest'",
      '',
      "it.each([[1]])('行 %i', () => {",
      '  expect(1).toBe(1)',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', demoTest([CASE_A]))
    try {
      await writeFile(join(root, helperRel), helperContent, 'utf8')
      const r = await cli(root)
      expect(r.code, '哨兵须捕获 each 双层调用形态（外层 callee=CallExpression 不再双盲）').toBe(1)
      expect(`${r.stdout}${r.stderr}`).toContain('each.helper.ts')
      expect(`${r.stdout}${r.stderr}`).toContain('漏扫哨兵')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S1-② 白名单文件本地变量别名（const myIt = it; myIt 调用）→ 保守红（exit 1+本地变量别名文案）', { timeout: 60_000 }, async () => {
    const content = [
      "import { describe, expect, it } from 'vitest'",
      '',
      'const myIt = it',
      '',
      "describe('demo', () => {",
      "  myIt('case-alias 本地别名用例', () => {",
      '    expect(1).toBe(1)',
      '  })',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      const r = await cli(root)
      expect(r.code, '本地变量别名通道不可静态判定——静默漏抽须改保守红').toBe(1)
      expect(`${r.stdout}${r.stderr}`).toContain('本地变量别名')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('S1-③ type-only import（import type { it as myIt }）→ 不误红（exit 0 首装落盘）', { timeout: 60_000 }, async () => {
    const content = [
      "import { describe, expect, it } from 'vitest'",
      "import type { it as myIt } from 'vitest'",
      '',
      "describe('demo', () => {",
      "  it('case-typeonly 类型导入用例', () => {",
      '    const typed: ReturnType<typeof myIt> | undefined = undefined',
      '    expect(typed).toBeUndefined()',
      '  })',
      '})',
      ''
    ].join('\n')
    const root = await makeFixture('tests/unit/demo.test.ts', content)
    try {
      const r = await cli(root)
      expect(r.code, 'type-only import 运行时零绑定——别名检测须排除（误红回归）').toBe(0)
      expect(`${r.stdout}${r.stderr}`).not.toContain('UNRESOLVABLE')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
