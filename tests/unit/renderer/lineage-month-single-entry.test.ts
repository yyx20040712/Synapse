/**
 * [F-UIRES-03 C3] 改月单口不变量守卫（INV-107——设计稿 §4 候选 1：
 * 改月唯一入口=MetaEditDialog 月份字段；画布（lineage 域）零写月路径）。
 *
 * 例 1=src grep 守卫：退役符号族在 src/renderer 零命中（含注释——符号名
 * 彻底消失，典故残留即红）；例 2=唯一入口正身在场锚（MetaEditDialog 月份
 * 字段——防「退役改月链连 MetaEdit 面一并误删」）。MetaEdit 通道行为单测
 * 由 meta-edit-dialog.test.tsx 既有承载（patch.month 数值化+空串=null），
 * e2e 全链由 meta-year-month.spec.ts 承载——本件只锁「单口」结构面。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** 递归采集目录下全部 .ts/.tsx 源文件路径 */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      out.push(...sourceFiles(p))
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      out.push(p)
    }
  }
  return out
}

describe('F-UIRES-03 C3 改月单口（INV-107）', () => {
  it('src grep 守卫：改月链退役符号族在 src/renderer 零命中（含注释）', () => {
    const banned = [
      'moveNodeMonth',
      'onMoveNodeMonth',
      'MonthPop',
      'monthPop',
      'movePreview',
      'applyMovePreview',
      'moveTargetLabel',
      'handleYmClick',
      'pickMonth'
    ]
    const hits: string[] = []
    for (const file of sourceFiles(join(process.cwd(), 'src', 'renderer'))) {
      const text = readFileSync(file, 'utf8')
      for (const sym of banned) {
        if (text.includes(sym)) hits.push(`${file} :: ${sym}`)
      }
    }
    expect(hits, `改月链退役符号残留（画布零写月路径——INV-107）:\n${hits.join('\n')}`).toEqual([])
  })

  it('唯一入口正身在场：MetaEditDialog 月份字段（patch.month 通道载体）', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'renderer', 'features', 'library', 'MetaEditDialog.tsx'),
      'utf8'
    )
    expect(src).toContain("field('month', '月份（1-12，留空=未定月）', 'input')")
    expect(src).toContain('patch.month = month')
  })
})
