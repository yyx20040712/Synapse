// @vitest-environment jsdom
/**
 * [T3-P4] 阅读器纸面两主题+反色零残留+弹层归一 —— 消费锁（always-active 裸
 * describe，不经 guardedDescribe——宪法 K3）。
 *
 * 锁三面（值源=docs/design/2026-09-26_theme-trio-final-design.md §2 阅读器段；
 * 视觉基准=mockups/2026-09-26_v2_theme-light.html L141-199；[B1] 暗色主题
 * 与夜间反位机制已删除——反色面改锁零残留负锚）：
 * - 纸面（A7）：PageBox 两处内联 background 消费 var(--paper)（页盒底
 *   +canvas 透明底承底层——token 首消费）；值面（两主题终值 light=#fffefb/
 *   sepia=#fdf8ec）由 theme.test.ts token 正锚独立锁定。
 * - 反色零残留（B1）：两主题纸页均不反色——theme.css 零 --canvas-filter
 *   token、theme-reader.css 零 canvas filter 规则（回填即红；旧
 *   data-thumb-canvas 选择器锚随规则删除）。
 * - 批注弹层归一：AnnotationEditor textarea 底 var(--bg)→var(--panel-2)
 *   （mockup .anno-pop textarea=panel 底系——弹层皮肤随族）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '../../../src/renderer/features/reader/state/PdfDocProvider'
import { PageBox } from '../../../src/renderer/features/reader/view/PageBox'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'
import { Thumbnail } from '../../../src/renderer/features/reader/panels/OutlineThumb'
import { makeAnnotation } from '../../utils/factories'
import type { AnnotationRect } from '../../../src/shared/models/annotation'

/** theme-reader.css 文本面（library-cards CSS 读文件先例——规则文本锁） */
const cssReader = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-reader.css'), 'utf8')
/** theme.css 文本面（token 零残留负锚——值面正锚住 theme.test.ts） */
const cssTokens = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')

/** 假 pdf 页（PdfPageCanvas 渲染链最小桩——pdf-page-canvas.test 同配方） */
function fakeDoc(): PDFDocumentProxy {
  return {
    numPages: 1,
    getPage: async () => ({
      rotate: 0,
      view: [0, 0, 612, 792],
      getViewport: () => ({ width: 612, height: 792 }),
      render: () => ({ promise: Promise.resolve(), cancel: (): void => undefined }),
      getTextContent: async () => ({ items: [], styles: {}, lang: null })
    })
  } as unknown as PDFDocumentProxy
}

let root: Root | null = null
let host: HTMLDivElement | null = null

// jsdom 无 IntersectionObserver（缩略图懒渲染依赖——OutlineThumb 子树）——
// 最小桩（reader-toolbar-icons.test 同配方）
class IntersectionObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  // jsdom 无 canvas 2d 实现（PdfPageCanvas 渲染链短路到 onError——零噪声）
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('T3-P4 纸面 —— PageBox 两处 var(--paper) 消费锁', () => {
  it('页盒底+承底层两处 style.background=var(--paper)（--paper token 首消费）', () => {
    act(() => {
      root!.render(
        <PageBox no={1} size={{ width: 612, height: 792 }} zoom={1} boxWidth={612} rendered={true}
          doc={fakeDoc()} renderPage={() => <i />} onPageRender={() => undefined} onError={() => undefined} />
      )
    })
    const box = host!.querySelector<HTMLElement>('[data-page-box="1"]')
    expect(box).not.toBeNull()
    // 渲染/占位同底（F-06 缺陷 B 语义随族）：页盒底=--paper
    expect(box!.style.background).toBe('var(--paper)')
    const pageRoot = host!.querySelector<HTMLElement>('[data-page-root="1"]')
    const sheet = pageRoot!.firstElementChild as HTMLElement
    // canvas 透明底承底层=--paper（透明底渲染的承纸面）
    expect(sheet.style.background).toBe('var(--paper)')
  })

  it('占位态页盒同底 var(--paper)（渲染/占位同底消色差跳动——F-06 随族保留）', () => {
    act(() => {
      root!.render(
        <PageBox no={2} size={{ width: 612, height: 792 }} zoom={1} boxWidth={612} rendered={false}
          doc={null} renderPage={() => <i />} onPageRender={() => undefined} onError={() => undefined} />
      )
    })
    const box = host!.querySelector<HTMLElement>('[data-page-box="2"]')
    expect(box).not.toBeNull()
    expect(box!.style.background).toBe('var(--paper)')
  })
})

describe('B1 暗色退役 —— 纸页反色机制零残留（两主题均不反色）', () => {
  it('theme-reader.css 零 canvas filter 规则+theme.css 零反色 token 定义（回填即红）', () => {
    // 旧案 A 单点规则（canvas[data-pdf-canvas],canvas[data-thumb-canvas]
    // 两选择器同体 filter 声明）已随暗色主题删除——两主题纸页均正读。
    // 锚消费/定义形态——注释提及退役 token 名不误咬，规则回填才红
    expect(cssReader, 'canvas filter 规则不得回填（filter: 声明整体零残留）').not.toMatch(
      /canvas\[[^\]]*\]\s*\{[^}]*filter:/
    )
    expect(cssReader, '反色 token var() 消费不得回填').not.toMatch(/var\(--canvas-filter\)/)
    expect(cssTokens, 'theme.css 反色 token 定义不得回填').not.toMatch(/--canvas-filter\s*:/)
  })

  it('缩略图 canvas 零 data-thumb-canvas 锚（选择器锚随反位规则删除——无消费面不得回填）', () => {
    act(() => {
      root!.render(<Thumbnail doc={fakeDoc()} pageIndex={0} active={false} onNavigate={() => undefined} />)
    })
    const canvas = host!.querySelector<HTMLCanvasElement>('canvas[data-thumb-canvas]')
    expect(canvas, 'data-thumb-canvas 已随反位规则退役（锚无消费面）').toBeNull()
  })

  it('搜索槽语汇（门一回炉补锚）：panel 底+line 描边+7px 圆角+计数 accent mono tabular-nums', () => {
    // k2-W2③ 回植锁——.rdr-num 载体退役后计数等宽数字不随载体迁移而丢
    expect(cssReader, '搜索槽=panel 底+line 描边+7px 圆角').toMatch(
      /\.rdr-search-slot\s*\{[^}]*background:\s*var\(--panel\);[^}]*border:\s*1px solid var\(--line\);[^}]*border-radius:\s*7px/
    )
    expect(cssReader, '计数=accent 色+mono+tabular-nums').toMatch(
      /\.rdr-search-count\s*\{[^}]*color:\s*var\(--accent\);[^}]*font-family:\s*var\(--mono\);[^}]*font-variant-numeric:\s*tabular-nums/
    )
  })
})

describe('T3-P4 批注弹层归一 —— AnnotationEditor textarea 底=--panel-2', () => {
  it('textarea style.background=var(--panel-2)（mockup .anno-pop textarea=panel 底系）', () => {
    const rect: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
    act(() => {
      root!.render(
        <AnnotationEditor annotation={makeAnnotation('批注草稿')} rect={rect} busy={false}
          onCancel={() => undefined} onDelete={() => undefined}
          onAutosave={async () => true} onAutosaveRaw={async () => true} />
      )
    })
    const textarea = host!.querySelector<HTMLTextAreaElement>('textarea[aria-label="批注内容"]')
    expect(textarea).not.toBeNull()
    // 旧 var(--bg)（app 全域底）→panel 底系：弹层悬浮面板语义随族
    expect(textarea!.style.background).toBe('var(--panel-2)')
  })
})

