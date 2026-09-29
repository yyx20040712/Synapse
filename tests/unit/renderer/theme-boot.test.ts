// @vitest-environment jsdom
/**
 * [T3-U1] FOUC 首帧注入脚本锁（src/renderer/public/theme-boot.js——同步经典
 * 脚本，CSP script-src self 外链面）：读 location.search 的 theme 参，合法
 * 三值才写 documentElement.dataset.theme；非法/缺参零写（留 App effect 单点
 * 真源兜底）。执行方式=vi.resetModules()+非字面量说明符动态 import（每用例
 * 重置模块注册表重跑顶层 IIFE；非字面量=TS 不检 JS 模块声明面[TS7016 规避，
 * 运行时 vite 照常解析]；宪法禁 eval/new Function，不走字符串执行面；query
 * 形 cache-bust 在 vite 文件 URL 解析面失效，不采用）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const BOOT_PATH = join(process.cwd(), 'src', 'renderer', 'public', 'theme-boot.js')
/** 非字面量说明符（运行时解析同路径——见头注） */
const BOOT_MODULE = '../../../src/renderer/public/theme-boot.js'

async function runBoot(search: string): Promise<void> {
  delete document.documentElement.dataset.theme
  Object.defineProperty(window, 'location', { configurable: true, value: { search } })
  vi.resetModules()
  await import(BOOT_MODULE)
}

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('renderer/public/theme-boot —— T3-U1 FOUC 首帧注入', () => {
  it('?theme=dark → dataset.theme=dark', async () => {
    await runBoot('?theme=dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('?theme=sepia → dataset.theme=sepia', async () => {
    await runBoot('?theme=sepia')
    expect(document.documentElement.dataset.theme).toBe('sepia')
  })

  it('[回炉 R3] ?theme=light → dataset.theme=light（三值正例闭合——INV-71「三值」措辞）', async () => {
    await runBoot('?theme=light')
    expect(document.documentElement.dataset.theme, 'light 注入=显式写 attr（非仅 dark/sepia）').toBe('light')
  })

  it('非法值（neon）→ 零写（不写 attr——App effect 兜底，禁伪造档）', async () => {
    await runBoot('?theme=neon')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('无参 → 零写', async () => {
    await runBoot('')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('脚本体=同步经典脚本（非 module——首帧前执行语义）：源码零 import/export', () => {
    const src = readFileSync(BOOT_PATH, 'utf-8')
    expect(src, '禁 import/export（module defer——首帧兜底失效，FOUC 防线破）').not.toMatch(/(^|\n)\s*(import|export)\b/)
  })
})

/**
 * [回炉 R1=k1-W1①+②] FOUC 两接缝静态锁——运行时链（脚本体/main-window 附参）
 * 已有行为锁，但两装配接缝删改不触发任何运行时红：
 * - 接缝一：index.html 的 script 引用标签（删标签=2045 全绿静默回归——脚本
 *   不被引用即首帧兜底整体失效）
 * - 接缝二：bootstrap 传参链（readThemeSync 同步读+startupTheme 透传——
 *   断链=main 恒零附参，脚本零写回退 App effect，FOUC 静默复现）
 * 静态断言=最小可行锁面（源文字符串锚；行为面由本件脚本用例+main-window-theme
 * 承载）。
 */
describe('T3-U1 FOUC 装配接缝静态锁（回炉 R1）', () => {
  it('接缝一：index.html 含 ./theme-boot.js 外链引用且位于 <head> 段内（首帧语义）', () => {
    const html = readFileSync(join(process.cwd(), 'src', 'renderer', 'index.html'), 'utf-8')
    expect(html, '外链引用在场（删标签=FOUC 静默回归——本断言即拦）').toContain('./theme-boot.js')
    const head = html.match(/<head>[\s\S]*?<\/head>/)
    expect(head, '<head> 段在场').not.toBeNull()
    expect(head![0], '引用必须驻 head（body 尾=首帧已过，兜底失效）').toContain('./theme-boot.js')
    // [F-CONSOL-05] module/defer/async 负锚（T3-U1 备案 P2 一行补强；回炉=门一
    // 双席同中 W1 正则强化）：同步执行语义=首帧兜底前提——defer/async/nomodule
    // 属性或 type=module（模块默认 defer）任一都使脚本不执行/推迟到首帧后，兜底
    // 静默失效而「引用在场+驻 head」双锚不红。i 旗标=HTML 属性名大小写不敏感；
    // ["']?=无引号合法形态；nomodule=直接不执行（比 defer 更重）；\btype=防
    // 字母接缀子串（xtype= 类——字母间无词边界不成立），不防连字符前缀：
    // data-type=module 中 \b 于连字符后恒成立仍可误中负锚（已知假阳性面，
    // 升级方向=属性结构化解析——F-CONSOL-05 遗留备案）。静态锚=tripwire
    // 最小锁面非完备保证（U1 R1 定性）。
    const tag = head![0].match(/<script\b[^>]*theme-boot\.js[^>]*>/)
    expect(tag, 'theme-boot script 标签形态在场（精确标签锚）').not.toBeNull()
    expect(tag![0], '同步执行语义：禁 defer/async/nomodule 属性与 type=module（含大小写与无引号形态）')
      .not.toMatch(/\b(defer|async|nomodule)\b|\btype\s*=\s*["']?module["']?/i)
  })

  it('接缝二：bootstrap 源文含 readThemeSync 调用+startupTheme 透传锚（传参链静态锚）', () => {
    const bootstrapSrc = readFileSync(join(process.cwd(), 'src', 'main', 'bootstrap.ts'), 'utf-8')
    expect(bootstrapSrc, 'readThemeSync 调用在场（摘除=main 恒零附参）').toMatch(/readThemeSync\(/)
    expect(bootstrapSrc, 'startupTheme 透传在场（摘除=loadURL/loadFile 无 theme query）').toContain('startupTheme')
  })
})
