#!/usr/bin/env node
/**
 * g6-rewrite.mjs —— F-GEOM-01-G6 M3 迁移批量改写（简报 B~H 段精确清单）。
 * 两遍制：pass1 全断言（任一行不含旧串/含多于一处即整体退出 1，零写盘），
 * pass2 逐文件写盘。行号制：只在指定行内做一次子串替换。
 * 用法：node scripts/audits/g6-rewrite.mjs src|locked
 *   src    = B/C/D/G 段（非受锁面）
 *   locked = E/F/H 段（受锁面——须先 locks:unlock）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const phase = process.argv[2]
if (phase !== 'src' && phase !== 'locked') {
  console.error('usage: node scripts/audits/g6-rewrite.mjs src|locked')
  process.exit(1)
}

const R = 'src/renderer/features/reader'
const T = 'tests/unit/renderer'

// [file, line, oldSub, newSub, tag]
const SRC_EDITS = [
  // B 段：被迁件入边深度修正恰 7 行
  [`${R}/anchors/anchor-locate.ts`, 88, `'./state/reader.store'`, `'../state/reader.store'`, 'B'],
  [`${R}/anchors/anchor-locate.ts`, 89, `'./state/scroll-converge'`, `'../state/scroll-converge'`, 'B'],
  [`${R}/anchors/anchor-locate.ts`, 90, `'../../shared/open-paper-bus'`, `'../../../shared/open-paper-bus'`, 'B'],
  [`${R}/anchors/anchor-locate.ts`, 91, `'../../shared/ui/toast-store'`, `'../../../shared/ui/toast-store'`, 'B'],
  [`${R}/anchors/open-paper-anchor.ts`, 26, `'./state/reader.store'`, `'../state/reader.store'`, 'B'],
  [`${R}/anchors/open-paper-anchor.ts`, 27, `'../../shared/ui/toast-store'`, `'../../../shared/ui/toast-store'`, 'B'],
  [`${R}/anchors/open-paper-anchor.ts`, 28, `'../../shared/open-paper-bus'`, `'../../../shared/open-paper-bus'`, 'B'],
  // C 段：reader 根未迁文件消费面恰 35 处（'./x' → './anchors/x'）
  [`${R}/FragmentNotesList.tsx`, 12, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AiNoteGroupList.tsx`, 37, `'./ai-note-style'`, `'./anchors/ai-note-style'`, 'C'],
  [`${R}/PagesOverlay.tsx`, 54, `'./page-items.store'`, `'./anchors/page-items.store'`, 'C'],
  [`${R}/AiAnnotationLayer.tsx`, 70, `'./annotation-resolve'`, `'./anchors/annotation-resolve'`, 'C'],
  [`${R}/AiAnnotationLayer.tsx`, 71, `'./annotation-resolve-layered'`, `'./anchors/annotation-resolve-layered'`, 'C'],
  [`${R}/AiAnnotationLayer.tsx`, 72, `'./page-items.store'`, `'./anchors/page-items.store'`, 'C'],
  [`${R}/AiAnnotationLayer.tsx`, 73, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AiAnnotationLayer.tsx`, 75, `'./ai-note-style'`, `'./anchors/ai-note-style'`, 'C'],
  [`${R}/SelectionToolbar.tsx`, 17, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AnnotationLayer.tsx`, 42, `'./annotation-resolve'`, `'./anchors/annotation-resolve'`, 'C'],
  [`${R}/AnnotationLayer.tsx`, 43, `'./annotation-resolve-layered'`, `'./anchors/annotation-resolve-layered'`, 'C'],
  [`${R}/AnnotationLayer.tsx`, 44, `'./page-items.store'`, `'./anchors/page-items.store'`, 'C'],
  [`${R}/AnnotationLayer.tsx`, 45, `'./annotation-merge'`, `'./anchors/annotation-merge'`, 'C'],
  [`${R}/AnnotationLayer.tsx`, 46, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AiNotesSection.tsx`, 50, `'./anchor-locate'`, `'./anchors/anchor-locate'`, 'C'],
  [`${R}/ReaderToolbar.tsx`, 42, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AnnotationEditor.tsx`, 15, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/AnnotationMenu.tsx`, 41, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/release-affinity.ts`, 80, `'./annotation-anchor'`, `'./anchors/annotation-anchor'`, 'C'],
  [`${R}/release-affinity.ts`, 81, `'./anchor-blank-snap'`, `'./anchors/anchor-blank-snap'`, 'C'],
  [`${R}/OutlineAside.tsx`, 46, `'./anchor-locate'`, `'./anchors/anchor-locate'`, 'C'],
  [`${R}/PdfPageCanvas.tsx`, 33, `'./pdf-item-geometry'`, `'./anchors/pdf-item-geometry'`, 'C'],
  [`${R}/PdfPageCanvas.tsx`, 34, `'./geometry-types'`, `'./anchors/geometry-types'`, 'C'],
  [`${R}/PdfPageCanvas.tsx`, 39, `'./geometry-types'`, `'./anchors/geometry-types'`, 'C'],
  [`${R}/reader-search.store.ts`, 41, `'./geometry-types'`, `'./anchors/geometry-types'`, 'C'],
  [`${R}/selection-evaluate.ts`, 72, `'./anchor-serialize'`, `'./anchors/anchor-serialize'`, 'C'],
  [`${R}/selection-evaluate.ts`, 73, `'./annotation-anchor'`, `'./anchors/annotation-anchor'`, 'C'],
  [`${R}/selection-evaluate.ts`, 74, `'./annotation-resolve'`, `'./anchors/annotation-resolve'`, 'C'],
  [`${R}/selection-evaluate.ts`, 75, `'./annotation-band-calibrate'`, `'./anchors/annotation-band-calibrate'`, 'C'],
  [`${R}/selection-evaluate.ts`, 76, `'./pdf-item-geometry'`, `'./anchors/pdf-item-geometry'`, 'C'],
  [`${R}/selection-evaluate.ts`, 77, `'./pdf-item-geometry'`, `'./anchors/pdf-item-geometry'`, 'C'],
  [`${R}/selection-evaluate.ts`, 78, `'./page-items.store'`, `'./anchors/page-items.store'`, 'C'],
  [`${R}/selection-paint.tsx`, 35, `'./annotation-resolve'`, `'./anchors/annotation-resolve'`, 'C'],
  [`${R}/selection-paint.tsx`, 36, `'./annotation-style'`, `'./anchors/annotation-style'`, 'C'],
  [`${R}/ReaderPage.tsx`, 49, `'./open-paper-anchor'`, `'./anchors/open-paper-anchor'`, 'C'],
  // D 段：跨特性 src 消费恰 1 处
  ['src/renderer/features/lineage/LineageSideAiNotes.tsx', 22, `'../reader/ai-note-style'`, `'../reader/anchors/ai-note-style'`, 'D'],
  // G 段：registry.ts 全域随迁恰 10 行（file 字段路径段加 anchors/，status 零触碰）
  ['tickets/registry.ts', 101, 'reader/annotation-anchor.ts', 'reader/anchors/annotation-anchor.ts', 'G'],
  ['tickets/registry.ts', 160, 'reader/anchor-locate.ts', 'reader/anchors/anchor-locate.ts', 'G'],
  ['tickets/registry.ts', 205, 'reader/anchor-locate.ts', 'reader/anchors/anchor-locate.ts', 'G'],
  ['tickets/registry.ts', 212, 'reader/open-paper-anchor.ts', 'reader/anchors/open-paper-anchor.ts', 'G'],
  ['tickets/registry.ts', 223, 'reader/ai-note-style.ts', 'reader/anchors/ai-note-style.ts', 'G'],
  ['tickets/registry.ts', 244, 'reader/annotation-resolve.ts', 'reader/anchors/annotation-resolve.ts', 'G'],
  ['tickets/registry.ts', 265, 'reader/anchor-blank-snap.ts', 'reader/anchors/anchor-blank-snap.ts', 'G'],
  ['tickets/registry.ts', 280, 'reader/pdf-item-geometry.ts', 'reader/anchors/pdf-item-geometry.ts', 'G'],
  ['tickets/registry.ts', 292, 'reader/geometry-types.ts', 'reader/anchors/geometry-types.ts', 'G'],
  ['tickets/registry.ts', 297, 'reader/annotation-anchor.ts', 'reader/anchors/annotation-anchor.ts', 'G']
]

const LOCKED_EDITS = [
  // E 段：tests 受锁面恰 34 行（reader/x → reader/anchors/x；含 2 处 vi.mock 调用行）
  [`${T}/ai-note-style.test.ts`, 14, 'reader/ai-note-style', 'reader/anchors/ai-note-style', 'E'],
  [`${T}/annotation-merge.test.ts`, 15, 'reader/annotation-merge', 'reader/anchors/annotation-merge', 'E'],
  [`${T}/anchor-item-verify.test.tsx`, 28, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/anchor-item-verify.test.tsx`, 29, 'reader/annotation-resolve', 'reader/anchors/annotation-resolve', 'E'],
  [`${T}/anchor-item-verify.test.tsx`, 30, 'reader/annotation-anchor', 'reader/anchors/annotation-anchor', 'E'],
  [`${T}/anchor-item-verify.test.tsx`, 31, 'reader/pdf-item-geometry', 'reader/anchors/pdf-item-geometry', 'E'],
  [`${T}/anchor-item-verify.test.tsx`, 32, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/pdf-item-geometry.test.tsx`, 30, 'reader/pdf-item-geometry', 'reader/anchors/pdf-item-geometry', 'E'],
  [`${T}/anchor-blank-snap.test.ts`, 4, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/anchor-blank-snap.test.ts`, 5, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/release-affinity.test.ts`, 5, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/release-affinity.test.ts`, 6, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/ai-notes-section.test.tsx`, 21, 'reader/anchor-locate', 'reader/anchors/anchor-locate', 'E'],
  [`${T}/ai-notes-section.test.tsx`, 42, 'reader/anchor-locate', 'reader/anchors/anchor-locate', 'E'],
  [`${T}/ai-notes-section.test.tsx`, 51, 'reader/ai-note-style', 'reader/anchors/ai-note-style', 'E'],
  [`${T}/anchor-locate.test.ts`, 15, 'reader/anchor-locate', 'reader/anchors/anchor-locate', 'E'],
  [`${T}/band-calibration.test.tsx`, 31, 'reader/annotation-band-calibrate', 'reader/anchors/annotation-band-calibrate', 'E'],
  [`${T}/band-calibration.test.tsx`, 32, 'reader/annotation-resolve', 'reader/anchors/annotation-resolve', 'E'],
  [`${T}/band-calibration.test.tsx`, 33, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/lineage-side-panel.test.tsx`, 47, 'reader/anchor-locate', 'reader/anchors/anchor-locate', 'E'],
  [`${T}/lineage-side-panel.test.tsx`, 61, 'reader/open-paper-anchor', 'reader/anchors/open-paper-anchor', 'E'],
  [`${T}/lineage-side-panel.test.tsx`, 63, 'reader/ai-note-style', 'reader/anchors/ai-note-style', 'E'],
  [`${T}/selection-evaluate.test.tsx`, 32, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/annotation-layer.test.tsx`, 20, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/ai-annotation-layer.test.tsx`, 20, 'reader/anchor-locate', 'reader/anchors/anchor-locate', 'E'],
  [`${T}/ai-annotation-layer.test.tsx`, 22, 'reader/ai-note-style', 'reader/anchors/ai-note-style', 'E'],
  [`${T}/ai-annotation-layer.test.tsx`, 24, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/selection-item-chain.test.tsx`, 22, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/annotation-anchor.test.ts`, 7, 'reader/annotation-anchor', 'reader/anchors/annotation-anchor', 'E'],
  [`${T}/annotation-anchor.test.ts`, 11, 'reader/anchor-serialize', 'reader/anchors/anchor-serialize', 'E'],
  [`${T}/selection-paint.test.tsx`, 33, 'reader/annotation-style', 'reader/anchors/annotation-style', 'E'],
  [`${T}/selection-paint.test.tsx`, 34, 'reader/annotation-resolve', 'reader/anchors/annotation-resolve', 'E'],
  [`${T}/selection-paint.test.tsx`, 36, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  [`${T}/selection-layer.test.tsx`, 27, 'reader/page-items.store', 'reader/anchors/page-items.store', 'E'],
  // F 段：配置面恰 1 行
  ['scripts/check-quality.mjs', 99, "'reader/ai-note-style'", "'reader/anchors/ai-note-style'", 'F'],
  // H 段：e2e 注释勘正恰 1 处（行号不变）
  ['tests/e2e/z-wg1-probe.spec.ts', 7, 'annotation-resolve.ts:224', 'anchors/annotation-resolve.ts:224', 'H']
]

const edits = (phase === 'src' ? SRC_EDITS : LOCKED_EDITS)

// pass1：全断言（零写盘）
const byFile = new Map()
for (const [f] of edits) if (!byFile.has(f)) byFile.set(f, readFileSync(join(root, f), 'utf-8').split(/\r?\n/))

let fail = 0
for (const [f, ln, oldS, newS, tag] of edits) {
  const lines = byFile.get(f)
  const line = lines[ln - 1] ?? ''
  const n = line.split(oldS).length - 1
  if (n !== 1) {
    console.error(`ASSERT-FAIL [${tag}] ${f}:${ln} 旧串出现 ${n} 次（期望 1）`)
    console.error(`  行内容: ${line.trim().slice(0, 140)}`)
    fail++
  } else if (line.includes(newS)) {
    console.error(`ASSERT-FAIL [${tag}] ${f}:${ln} 已含新串（重复执行？）`)
    fail++
  }
}
if (fail > 0) { console.error(`pass1 断言失败 ${fail} 处——零写盘退出`); process.exit(1) }

// pass2：逐文件写盘（保留各行行尾原样——split(/\r?\n/) + join('\n') 统一 LF，仓库 .gitattributes 强制 LF）
for (const [f] of byFile) {
  const lines = byFile.get(f)
  for (const [ff, ln, oldS, newS] of edits) {
    if (ff !== f) continue
    lines[ln - 1] = lines[ln - 1].replace(oldS, newS)
  }
  writeFileSync(join(root, f), lines.join('\n'), 'utf-8')
}

const tags = {}
for (const [, , , , t] of edits) tags[t] = (tags[t] ?? 0) + 1
console.log(`phase=${phase} 改写完成：${edits.length} 行 / ${byFile.size} 文件 ${JSON.stringify(tags)}`)
