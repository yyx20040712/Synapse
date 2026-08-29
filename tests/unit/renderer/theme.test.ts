/**
 * [R3-TH1] theme token 冒烟——防漂移锁（值源=设计定稿摸鱼图）。
 *
 * token 终值单一来源 = docs/design/mockups/shell-library.html（亮面 :root）
 * 与 lineage-constellation.html（夜面 :root）——设计定稿
 * docs/design/2026-08-28_visual-system.md §0 裁决。本用例把两份 :root 的
 * 关键值逐行誊录成断言：任何 token 漂移（手改/误删/回退）即红，把「视觉
 * 基建」锚定到设计稿而非口头约定。
 *
 * 值冲突裁决（票面 P1）：--gold 两稿并存（亮面 #b8935a / 夜面 #cfae72）——
 * 亮面值占用 --gold（全域消费），夜面值别名 --gold-night（R2 消费预留）；
 * --gold-soft 取票面裁决值 rgba(207,174,114,.16)（lineage 稿）；annotation
 * 五色保持原值（e2e reader-text.spec 三处精确色断言 rgb(253,224,71) 锁定，
 * 预知必红则不制造红——预裁②口径）。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme.css', import.meta.url)),
  'utf8'
)
/** library.css 同负锚面（R2-SH2 W2 补：票面五类清单漏 lib 三处——决5「lib
 *  衬线年份」明文；负锚必须覆盖分域样式文件防回填） */
const libCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/features/library/library.css', import.meta.url)),
  'utf8'
)

/** [token 声明, 期望值]——css 内应含 "<token>: <value>;"（含尾分号防 --gold 匹配到 --gold-soft 系前缀） */
const TOKENS: Array<[string, string]> = [
  // ── 亮面（shell-library.html :root）──
  ['--bg', '#f6f4ee'],
  ['--panel', '#ffffff'],
  ['--panel-glass', 'rgba(255, 255, 255, 0.72)'],
  ['--border', '#e4ded1'],
  ['--border-gold', '#c9a86a'],
  ['--text', '#23262d'],
  ['--text-dim', '#6f7482'],
  ['--accent', '#2c5f8a'],
  ['--accent-soft', '#dcebf5'],
  ['--gold', '#b8935a'],
  ['--gold-soft', 'rgba(207, 174, 114, 0.16)'],
  ['--gold-bright', '#e3c98f'],
  ['--gold-line', 'rgba(207, 174, 114, 0.1)'],
  ['--danger', '#b3403a'],
  ['--ok', '#3d7a50'],
  ['--shadow-1', '0 1px 2px rgba(35, 38, 45, 0.06)'],
  ['--shadow-2', '0 4px 14px rgba(35, 38, 45, 0.09)'],
  ['--shadow-3', '0 10px 34px rgba(35, 38, 45, 0.16)'],
  ['--radius-s', '8px'],
  ['--radius-m', '12px'],
  ['--radius-l', '16px'],
  ['--font-display', "Georgia, 'Times New Roman', 'Songti SC', SimSun, serif"],
  ['--ink', '#1b2333'],
  ['--ink-hi', '#232d44'],
  // ── 夜面（lineage-constellation.html :root——R2 消费预留，本单只定义）──
  ['--night-bg', '#171e33'],
  ['--night-bg2', '#111728'],
  ['--node-face', '#222c4d'],
  ['--node-face-hi', '#2b3760'],
  ['--band-line', 'rgba(207, 174, 114, 0.12)'],
  ['--star', 'rgba(222, 230, 255, 0.55)'],
  ['--text-on-night', '#e9e6db'],
  ['--text-mid', '#c6cbdd'],
  ['--text-dim-on-night', '#97a0bb'],
  ['--edge-glow', 'rgba(207, 174, 114, 0.4)'],
  // ── annotation 五色：保持原值（e2e 精确色断言锁定——见文件头注）──
  ['--annotation-yellow', '#fde047'],
  ['--annotation-green', '#86efac'],
  ['--annotation-blue', '#93c5fd'],
  ['--annotation-red', '#fca5a5'],
  ['--annotation-purple', '#d8b4fe']
]

describe('R3-TH1 theme token 冒烟（mockup :root 防漂移锁）', () => {
  it.each(TOKENS)('%s 声明为设计定稿值 %s', (token, value) => {
    expect(css, `theme.css 应含 "${token}: ${value};"`).toContain(`${token}: ${value};`)
  })

  it('body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量）', () => {
    // INV-01 e2e 锚（reader-text.spec）断言三层 overflow:hidden——此处锁声明
    // 面仍在（注释+声明成对）：body 背景单源 var(--bg)+纸面丝纹（mockup 同款）
    expect(css).toContain('overflow: hidden')
    expect(css).toContain('background: var(--bg)')
    expect(css).toContain('repeating-linear-gradient(115deg')
  })
})

describe('R3-TH1 回炉 B1——Button 皮肤类防线（内联恒压类选择器缺陷锁）', () => {
  /**
   * 联审 B1：静态皮肤住内联 style 时，内联声明在层叠上恒压任何类选择器
   * （无论特异性），挂 :hover 类=永不生效（primary 提亮 .45→.7 与 ghost
   * 金铜 hover 曾静默失效）。修复形态=静态+hover 全迁 theme.css 类。
   * 本组断言锁两层：皮肤类规则存在（值面）+Button.tsx 不再用内联变体
   * 皮肤（形态面——防回退到内联）。
   */
  it('primary 静态皮肤在类规则中（CTA：inset 金 hairline .45 + 6px 切角）', () => {
    expect(css, '.syn-btn-primary 静态类应在场').toMatch(/\.syn-btn-primary\s*\{/)
    expect(css, 'inset 金 hairline .45（mockup CTA 静态值）').toMatch(
      /\.syn-btn-primary\s*\{[^}]*rgba\(201, 168, 106, 0\.45\)/
    )
    expect(css, '6px 切角 clip-path（定稿注意事项①）').toMatch(/\.syn-btn-primary\s*\{[^}]*clip-path/)
  })

  it('primary hover 提亮 .45→.7 在类规则中', () => {
    expect(css).toMatch(/\.syn-btn-primary:not\(:disabled\):hover\s*\{[^}]*rgba\(227, 201, 143, 0\.7\)/)
  })

  it('ghost hover 金铜在类规则中', () => {
    expect(css).toMatch(/\.syn-btn-ghost:not\(:disabled\):hover\s*\{[^}]*var\(--gold\)/)
  })

  it('Button.tsx 不再以变体皮肤内联压类（B1 形态锁）', () => {
    const tsx = readFileSync(
      fileURLToPath(new URL('../../../src/renderer/shared/ui/Button.tsx', import.meta.url)),
      'utf8'
    )
    expect(tsx, '静态皮肤必须住 theme.css 类（VARIANT_STYLE 内联=hover 静默失效，B1 教训）').not.toContain('VARIANT_STYLE')
    expect(tsx, 'boxShadow/clipPath 等皮肤声明不得回流 Button 内联').not.toContain('boxShadow:')
    expect(tsx).not.toContain('clipPath:')
  })
})

describe('R2-SET1 界面缩放——CSS 文本锁（内容行缩放+PDF 页列补偿）', () => {
  /**
   * INV-39 声明面锁：`.app-content-row` 整行 zoom 挂 --ui-scale 变量（App effect
   * 单点写 documentElement）；`[data-page-column]` 三态通配反向补偿恒视觉 1.0
   * （探针 r2-set1-out-probe.json 实测：calc(1/var) Chromium 接受且 canvas 精确
   * 恢复 612×792+textLayer 对位不破坏；单独 zoom:1 无效——相乘语义）。
   */
  it('.app-content-row 缩放声明在场（--ui-scale 变量单源）', () => {
    expect(css, '.app-content-row 类应在场（App 内容行）').toContain('.app-content-row')
    expect(
      css,
      'zoom 值必须经 --ui-scale 变量（非内联）——正则锚定声明形态防注释字样救活'
    ).toMatch(/\.app-content-row\s*\{[^}]*zoom:\s*var\(--ui-scale,\s*1\);/)
  })

  it('[data-page-column] 恒补偿声明在场（PDF 页列恒视觉 1.0）', () => {
    expect(css, '页列属性选择器三态通配应在场').toContain('[data-page-column]')
    expect(
      css,
      '补偿必须 calc(1 / var(--ui-scale, 1))——探针 Q2/Q4 实测形态，锚定声明'
    ).toMatch(/\[data-page-column\]\s*\{[^}]*zoom:\s*calc\(1 \/ var\(--ui-scale,\s*1\)\);/)
  })
})

describe('R2-SH2 决5——衬线消费清零+gold-night 别名退役（源码形态负锚）', () => {
  /**
   * 决5（handoff-v3 §4）：--font-display 五消费位全清（.app-nav-name（随品牌行
   * 迁顶栏新类）/.app-nav-ver/.rdr-num（tabular-nums 保留）/.rdr-aside-h4/
   * .syn-settings h2——font-family 声明删，回继承 UI 字体）；token 定义 :root
   * 保留但生产样式零消费。--gold-night 别名退役（LG10 观察项结案：LG11 清零后
   * 全仓消费=0，定义即死代码——死代码即删）。负锚锁源码形态（B1 形态锁先例）：
   * 任何 var(--font-display) 消费串回填或 --gold-night 定义复活即红。
   */
  it('theme.css 不含 var(--font-display) 消费串与 --gold-night 定义（决5 清零+别名退役）', () => {
    expect(
      css,
      '衬线展示字消费应清零——五类回继承 UI 字体（token 定义保留，此处只锁消费串）'
    ).not.toContain('var(--font-display)')
    expect(css, '--gold-night: 定义不得复活（别名退役=死代码即删）').not.toContain('--gold-night:')
    // W2 补：library.css 三处（lib-card-year/lib-detail-title/lib-detail-v-serif）
    // 同清零——负锚扩覆盖分域样式文件（主控压缩票 2026-08-29）
    expect(libCss, 'library.css 衬线消费应清零（决5 lib 年份/标题明文）').not.toContain(
      'var(--font-display)'
    )
  })
})
