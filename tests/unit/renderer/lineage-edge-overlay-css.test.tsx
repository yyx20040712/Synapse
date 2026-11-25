// @vitest-environment jsdom
/**
 * [T3-P7A/P7B] EdgeOverlay CSS 锁+buildSnapshot 快照面拆件
 * （[F-LANEGRID-01 B2b] lineage-edge-overlay 行数红线 ≤500 拆出——内容零改）。
 * jsdom 无布局——CSS 文本锁与快照采集直测（几何断言驻主件）。
 * [B5 设计稿 §3.2/§3.5/§4.1/§11.2「lineage-edge-overlay-css：改锁单排 shell、nowrap、原生横滚、
 * focus accent；保留拖拽 CSS 负锚；删 drag-hint 三组 CSS 正则」——wave C 2026-11-25 断言翻转]
 * always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** [B3] 拖拽分域拆件（2026-11-22 commit A）读面=双文件拼读（机械防御——本件
 *  锁面 .tl-edges/.tl-edge 基础族=留守件，拆件零触及；断言本体零改）。 */
const css =
  readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8') +
  readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-drag.css'), 'utf8')

describe('T3-P7A/P7B EdgeOverlay CSS 锁（D-1/D-2/D-22；U8 视觉内联）', () => {
  it('CSS 锁：svg z=1 低于卡 2+inset/overflow；opacity --dur-tint 过渡（[F-SLOTGRID-01 U1] 测量冻结 opacity:0 规则随瀑布退役删）；命中层 stroke 8 且 P7a 期 pointer-events:none；图例族零残留', () => {
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*overflow:\s*visible;[^}]*z-index:\s*1/)
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*transition:\s*opacity var\(--dur-tint\)/)
    // [F-LGRAPH-01②U8] 四 kind 色 selector 退役负锚（视觉=inline dashed/color）
    expect(css).not.toMatch(/\.tl-edge\[data-kind/)
    expect(css).toMatch(/\.tl-edge-hit\s*\{[^}]*stroke-width:\s*8;[^}]*pointer-events:\s*none/)
    // [F-VISFB-21 N1] 图例族（.tl-legend/.lc）CSS 零残留负锚
    expect(css).not.toMatch(/\.tl-legend/)
    expect(css).not.toMatch(/\.lc[\s.{]/)
  })

  it('CSS 锁 [T3-P7B/U2]：编辑态双闸（CSS 面）+.lg-*/.pop 族+悬停高亮（U2 票面④ v95-6B；[F-VISFB-66] link-src 退役负锚化）', () => {
    // 双闸 CSS 面：view 基线 none（上行既有锁）+edit 态开 stroke（M-pointer-events 变异锚）
    expect(css).toMatch(/\.timeline\.editing \.tl-edge-hit\s*\{[^}]*pointer-events:\s*stroke;[^}]*cursor:\s*pointer/)
    // 悬停高亮：hover 线=宽 1.6→2.6+opacity 0.65（mockup §3.3）。
    // [回炉 R2] 可见层 pointer-events:none 使 :hover 恒不触发（死样式）——
    // 改命中层驱动同键类 .hovered；负锚锁死样式不再回潮。
    // [RR10] opacity 0.65 单源=inline（edgeVisualOpacity——错峰边 inline
    // fade 压 CSS 类使回升死样式）；CSS 仅承宽 2.6（组合锚=纯函数测试）
    expect(css).toMatch(/\.tl-edge\s*\{[^}]*stroke-width:\s*1\.6/)
    expect(css).toMatch(/\.tl-edge\.hovered\s*\{[^}]*stroke-width:\s*2\.6;\s*\}/)
    expect(css).not.toMatch(/\.tl-edge:hover/)
    // [F-LGRAPH-01②U8] linkbtn 退役负锚（「新建连线」按钮删除——画线工具替代）
    expect(css).not.toMatch(/linkbtn/)
    // [F-VISFB-66 W-09r2] 源侧高亮链整删负锚（.link-src 规则+复用面全灭）
    expect(css).not.toMatch(/link-src/)
    // [R6①] 意图值升特异性真正生效（原 .acc-body .pbtn 同特异性被 .pop .pbtn
    // 源序覆盖=死声明）
    expect(css).toMatch(/\.pop \.acc-body \.pbtn\s*\{[^}]*font-size:\s*var\(--fs-tl-hint\);[^}]*padding:\s*4px 0/)
    // [R6②] .pop .schip i 的 border-top-width 恒被组件 inline borderTop 覆盖
    // ——死属性已删（宽度面全权 inline）
    expect(css).toMatch(/\.pop \.schip i\s*\{[^}]*width:\s*26px;[^}]*display:\s*inline-block/)
    expect(css).not.toMatch(/\.pop \.schip i\s*\{[^}]*border-top-width/)
    // 编辑态卡 hover faint（mockup L259-260）
    expect(css).toMatch(/\.timeline\.editing \.tl-card\s*\{[^}]*outline:\s*1px dashed transparent/)
    expect(css).toMatch(/\.timeline\.editing \.tl-card:hover\s*\{[^}]*outline-color:\s*var\(--faint\)/)
    // [B5 设计稿 §3.2——wave C 2026-11-25 断言翻转] 原「.lg-toolbar sticky 挂 .timeline 内」退役（工具栏迁页面
    // 顶部稳定外壳）：单排工具栏三层壳——shell=flex 列 shrink-0 子件（min-width:0）；scroll=原生横滚
    // （overflow-x:auto／overflow-y:hidden／max-width:100%）；toolbar=不折行（nowrap、width:max-content、
    // min-width:100% 铺满、align-items:center）；直接子组/分隔符 flex:0 0 auto + nowrap（约束原文）
    expect(css).toMatch(/\.lg-toolbar-shell\s*\{[^}]*flex:\s*none;[^}]*min-width:\s*0;/)
    expect(css).toMatch(/\.lg-toolbar-scroll\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;[^}]*max-width:\s*100%;/)
    // [B5 §3.2 wave C 视觉门发现] 横滚容器自身=absolute 后代的包含块（sr-only 标签）：否则其包含块上溯到
    // position:relative 的壳层——逃出横滚容器裁剪面，1024 下最右开关的 sr-only 标签把 main 右溢→页面级横向滚动条
    expect(css).toMatch(/\.lg-toolbar-scroll\s*\{[^}]*position:\s*relative;[^}]*overflow-x:\s*auto;/)
    expect(css).toMatch(
      /\.lg-toolbar\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;[^}]*width:\s*max-content;[^}]*min-width:\s*100%;[^}]*align-items:\s*center;/
    )
    expect(css).toMatch(/\.lg-toolbar\s*>\s*\*\s*\{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap;/)
    expect(css, 'sticky 定位随「挂 .timeline 内」退役（不再钉在滚动容器内）').not.toMatch(/\.lg-toolbar\s*\{[^}]*position:\s*sticky/)
    expect(css, 'min-width:100% 只用于轨道铺满——不给应用/视口设最小宽度').not.toMatch(/(?:body|html|\.app-shell)[^{]*\{[^}]*min-width:\s*100%/)
    // .lg-btn 主/ghost（mockup L206-210——阴影=三稿同值 token 承载）
    expect(css).toMatch(
      /\.lg-btn\s*\{[^}]*color:\s*var\(--accent-ink\);[^}]*background:\s*var\(--accent\);[^}]*padding:\s*6px 14px;[^}]*border-radius:\s*8px;[^}]*box-shadow:\s*var\(--shadow-lg-btn\)/
    )
    expect(css).toMatch(
      /\.lg-btn\.ghost\s*\{[^}]*background:\s*var\(--panel\);[^}]*color:\s*var\(--dim\);[^}]*border:\s*1px solid var\(--line\);[^}]*box-shadow:\s*none/
    )
    // [B5 §3.5 文案删除 1/§11.2] drag-hint 三态与其全部 .drag-hint CSS 退役——零残留负锚（原三组正则翻转）
    expect(css).not.toMatch(/\.drag-hint/)
    expect(css).not.toMatch(/\.timeline\.editing\s+\.drag-hint/)
    // .pop 弹层基础面（mockup L287 逐值——fixed 240px 挂视口；[F-UIRES-03 C3]
    // 脉络侧弹层消费面已随改月链退役——基础面留驻供通用弹层族）
    expect(css).toMatch(/\.pop\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*130;[^}]*width:\s*240px;[^}]*border-radius:\s*10px;[^}]*box-shadow:\s*var\(--shadow-drag\)/)
    expect(css).toMatch(/\.pop h4\s*\{[^}]*letter-spacing:\s*2px;[^}]*color:\s*var\(--faint\)/)
    // .acc 手风琴（mockup L304-310）+schip chip i 预览（L294-296——[R6②]
    // border-top-width 死属性已删，断言迁移至 R6 段）
    expect(css).toMatch(/\.acc\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*border-radius:\s*8px;[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.acc-head\.on\s*\{[^}]*background:\s*var\(--accent-soft\);[^}]*color:\s*var\(--accent\)/)
    expect(css).toMatch(/\.pop \.schip\.on\s*\{[^}]*border-color:\s*var\(--accent\);[^}]*background:\s*var\(--accent-soft\)/)
    // acts 三型（pri/sec/dgr——dgr=三稿同值 token 承载）
    expect(css).toMatch(/\.pop \.pbtn\.pri\s*\{[^}]*background:\s*var\(--accent\);[^}]*color:\s*var\(--accent-ink\)/)
    expect(css).toMatch(/\.pop \.pbtn\.dgr\s*\{[^}]*border:\s*1px solid var\(--pop-danger-a50\);[^}]*color:\s*var\(--pop-danger\)/)
    expect(css).toMatch(/\.pop \.foot-note\s*\{[^}]*color:\s*var\(--faint\)/)
  })
})

describe('F-UIRES-03 C2·P7 buildSnapshot 采集（yearHeads 障碍源——快照面）', () => {
  /** rect 桩（jsdom 零布局——三例共用，Rule of Three 上提） */
  const mockRect = (el: Element, x: number, y: number, w: number, h: number): void => {
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
  const mountContent = (): HTMLElement => {
    const content = document.createElement('div')
    content.className = 'tl-content'
    mockRect(content, 0, 0, 1000, 800)
    return content
  }

  it('.tl-year-num rects 采入 yearHeads（内容坐标 ÷z——与 cards/labels 同源同变换）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 28, 60, 400, 20)
    content.appendChild(num)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      expect(snap.yearHeads).toEqual([{ x: 28, y: 60, w: 400, h: 20 }])
    } finally {
      content.remove()
    }
  })

  it('[N5 校准提前落地] .tl-year-num 与 .tl-year-meta 双 rect 分立采入 yearHeads（两 rect 入数组，非并集盒）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 20, 60, 58, 35)
    const meta = document.createElement('div')
    meta.className = 'tl-year-meta'
    mockRect(meta, 660, 62, 72, 14)
    content.appendChild(num)
    content.appendChild(meta)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      expect(snap.yearHeads).toEqual([
        { x: 20, y: 60, w: 58, h: 35 },
        { x: 660, y: 62, w: 72, h: 14 }
      ])
    } finally {
      content.remove()
    }
  })

  it('[N5 校准提前落地·负锚] .tl-year-head 容器自身不再采入（全宽容器 rect 挡死 band 跨年终落=CI 红 T-P1b 根因——防回归）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const head = document.createElement('div')
    head.className = 'tl-year-head'
    mockRect(head, 20, 60, 684, 34)
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 20, 60, 58, 34)
    head.appendChild(num)
    content.appendChild(head)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      // 嵌套形态同真实 DOM：仅数字区入集，容器全宽 rect 不在采集集
      expect(snap.yearHeads).toEqual([{ x: 20, y: 60, w: 58, h: 34 }])
      expect(snap.yearHeads.some((b) => b.w > 100)).toBe(false)
    } finally {
      content.remove()
    }
  })
})
