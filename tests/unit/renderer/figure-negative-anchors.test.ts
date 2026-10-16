/**
 * [F-VISFB-43] 图表管线静态负锚（§7 验收面：禁 page.render/禁 250ms 轮询/
 * 消费面禁提取调用——断网/无提取不现场渲染）。源文本扫描（readFileSync——
 * 与 model-names/quality 关卡同族的机器锚）。always-active。
 * U3 段=管线件三锚；U7 段=消费面三件（随换源落地，先红后绿）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (rel: string): string => readFileSync(resolve(__dirname, rel), 'utf-8')
const FIGURE_DIR = '../../../src/renderer/shared/figures'

describe('[F-VISFB-43 U3] 图表管线静态负锚', () => {
  it('禁 page.render：管线四件零 getViewport/render 快照调用（XObject-only——§0-7 页快照路线否决）', () => {
    for (const f of ['figure-ctm.ts', 'figure-decode.ts', 'FigureExtractor.ts', 'useFigureExtractionBridge.ts']) {
      const src = read(`${FIGURE_DIR}/${f}`)
      expect(src.includes('.render(')).toBe(false)
      expect(src.includes('getViewport')).toBe(false)
    }
  })

  it('禁 250ms 轮询：管线四件零 250 字面量（旧 M2 反应性轮询退役——新管线无消费面轮询）', () => {
    for (const f of ['figure-ctm.ts', 'figure-decode.ts', 'FigureExtractor.ts', 'useFigureExtractionBridge.ts']) {
      const src = read(`${FIGURE_DIR}/${f}`)
      expect(src.includes('250')).toBe(false)
    }
  })

  it('管线四件零 dataURL 面（旧方案 canvas.toDataURL 路线退役——新管线 PNG 字节 IPC）', () => {
    for (const f of ['figure-ctm.ts', 'figure-decode.ts', 'FigureExtractor.ts', 'useFigureExtractionBridge.ts']) {
      const src = read(`${FIGURE_DIR}/${f}`)
      expect(src.includes('toDataURL')).toBe(false)
    }
  })
})

describe('[F-VISFB-43 U7] 消费面静态负锚（断网/无提取不现场渲染）', () => {
  const CONSUMERS = [
    '../../../src/renderer/features/library/DrPaperInfo.tsx',
    '../../../src/renderer/features/lineage/SidePaperInfo.tsx',
    '../../../src/renderer/shared/PaperInfoSection.tsx'
  ]

  it('消费三件零提取调用（禁 import FigureExtractor/旧 selectPaperImages 面——fileUrl 可见性触发退役）', () => {
    for (const rel of CONSUMERS) {
      const src = read(rel)
      expect(src.includes('FigureExtractor')).toBe(false)
      expect(src.includes('selectPaperImages')).toBe(false)
      expect(src.includes('getPaperImages')).toBe(false)
    }
  })

  it('消费三件零轮询（禁 setInterval——旧 M2 250ms 反应性轮询随管线退役）', () => {
    for (const rel of CONSUMERS) {
      const src = read(rel)
      expect(src.includes('setInterval')).toBe(false)
    }
  })

  it('旧方案件已原子退役：PaperImageExtractor 源文件与测试均不在场（〔回炉轮1 B-1〕existsSync 直查——旧 read+replace 形态把 tests/ 段吞掉恒真）', () => {
    expect(existsSync(resolve(__dirname, '../../../src/renderer/shared/PaperImageExtractor.ts'))).toBe(false)
    expect(existsSync(resolve(__dirname, '../../../tests/unit/renderer/PaperImageExtractor.test.ts'))).toBe(false)
  })
})
