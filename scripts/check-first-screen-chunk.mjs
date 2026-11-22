import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** B2 §4 方案 A：pdfjs/reader 不得回流首屏 index chunk。build 后运行。 */
const assetsDir = fileURLToPath(new URL('../out/renderer/assets/', import.meta.url))
const files = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
const entryNames = files.filter((name) => /^index-.*\.js$/.test(name))
if (entryNames.length !== 1) {
  throw new Error(`首屏 index chunk 应恰一份，实际 ${entryNames.length}：${entryNames.join(', ')}`)
}

const entryName = entryNames[0]
const entryPath = join(assetsDir, entryName)
const entry = readFileSync(entryPath, 'utf8')
for (const symbol of ['GlobalWorkerOptions', 'getDocument']) {
  let offset = -1
  while ((offset = entry.indexOf(symbol, offset + 1)) >= 0) {
    const context = entry.slice(Math.max(0, offset - 400), offset + 400)
    if (!context.includes('import("./pdf-') || !context.includes('__vitePreload')) {
      throw new Error(`首屏 chunk ${entryName} 的 ${symbol} 不在既有动态 pdf 包装器内`)
    }
  }
}
for (const fingerprint of ['PDFDocumentLoadingTask', 'data-page-column']) {
  if (entry.includes(fingerprint)) {
    throw new Error(`首屏 chunk ${entryName} 不得包含 pdfjs/reader 本体指纹 ${fingerprint}`)
  }
}

const readerChunks = files.filter((name) => /^ReaderPage-.*\.js$/.test(name))
const pdfChunks = files.filter((name) => /^pdf-.*\.js$/.test(name))
if (readerChunks.length === 0 || pdfChunks.length === 0) {
  throw new Error('ReaderPage 与 pdf 非 index 动态 chunk 必须同时存在')
}
if (!entry.includes('import("./ReaderPage-')) {
  throw new Error(`首屏 chunk ${entryName} 缺少 ReaderPage 动态 import`)
}
for (const name of readerChunks) {
  const source = readFileSync(join(assetsDir, name), 'utf8')
  if (!source.includes('data-page-column') || !source.includes('./pdf-')) {
    throw new Error(`ReaderPage 动态 chunk ${name} 缺少页列或 pdf chunk 引用`)
  }
}
for (const name of pdfChunks) {
  const source = readFileSync(join(assetsDir, name), 'utf8')
  if (!source.includes('PDFDocumentLoadingTask') || !source.includes('GlobalWorkerOptions')) {
    throw new Error(`pdf 动态 chunk ${name} 缺少 pdfjs 库指纹`)
  }
}

const report = (name) => `${name}=${statSync(join(assetsDir, name)).size}B`
console.log(`first-screen-ok entry ${report(entryName)}`)
for (const name of [...readerChunks, ...pdfChunks]) console.log(`reader-dynamic ${report(name)}`)
