/**
 * [F-RDR-02] 笔记输入四场景复现审计探针（z-*-probe 命名=probe project 专属）。
 * 用户症状「笔记编辑器偶发无法输入（复测已好疑似偶发）/连输入光标都点不上」
 * ——四候选根因真机取证（设计文档 §2.1；场景 2=IME 组词期 Esc 已由单测
 * isComposing 守卫覆盖，真机 IME 自动化不可控不在此面）：
 * ①焦点丢失后打字（全局快捷键吞键假设）；③页底标注弹层可见性（定位溢出
 * 假设）；④点击不上光标时 event.target 实际落点（点击拦截层假设——捕获相
 * listener 全程记录）。
 */
import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

async function seedAndLaunch(title: string): Promise<ReturnType<typeof wrap>> {
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const userData = await import('node:fs').then((m) => m.mkdtempSync(join(tmpdir(), 'f-rdr02-')))
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title)
  return wrap(await launch(userData))
}
async function wrap(app: Awaited<ReturnType<typeof launch>>) {
  return { app }
}

test('F-RDR-02 场景①③④：焦点丢失/弹层可见性/点击 event.target 取证', async () => {
  const title = 'F-RDR-02 复现审计文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  // 全程捕获相记录 click/pointerdown 的 event.target（场景④取证——拦截层会
  // 使 textarea 区域内的点击 target≠textarea）
  await win.evaluate(() => {
    ;(window as unknown as { __rdr02Log: string[] }).__rdr02Log = []
    const log = (window as unknown as { __rdr02Log: string[] }).__rdr02Log
    for (const type of ['pointerdown', 'click']) {
      document.addEventListener(
        type,
        (e) => {
          const t = e.target as HTMLElement
          log.push(
            `${type}->${t.tagName}${t.getAttribute('data-testid') ? `[${t.getAttribute('data-testid')}]` : ''}${t.classList.length ? `.${String(t.className).split(' ').slice(0, 2).join('.')}` : ''}`
          )
        },
        true
      )
    }
  })

  // 建注开编辑器（reader-text :186-195 配方）
  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByRole('button', { name: '高亮' }).click()
  await expect(win.getByTestId('annotation-rect').first()).toBeVisible()
  await win.getByTestId('annotation-rect').first().click()
  await win.getByTestId('annotation-menu').getByRole('button', { name: '添加笔记' }).click()
  const editor = win.getByTestId('annotation-editor')
  await expect(editor).toBeVisible()
  const ta = editor.getByRole('textbox', { name: '批注内容' })

  // 场景③：弹层 rect 视口可见性（定位溢出假设——不可见=「无法输入」体感）
  const rect = await editor.boundingBox()
  const vp = await win.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(rect, '编辑器 boundingBox 在场').not.toBeNull()
  console.log(
    '[F-RDR-02-S3]',
    JSON.stringify({ rect, viewport: vp, visible: rect !== null && vp !== null && rect.y + rect.height <= vp.height && rect.y >= 0 })
  )
  if (rect !== null && vp !== null) {
    expect(rect.y + rect.height, `弹层应在视口内（bottom=${rect.y + rect.height} vs vh=${vp.height}）`).toBeLessThanOrEqual(vp.height)
    expect(rect.y, `弹层 top 应 ≥0（top=${rect.y}）`).toBeGreaterThanOrEqual(0)
  }

  // 场景①+④复合：点击页面空白（焦点丢失）→ 激活元素核 → 再点击 textarea
  // （event.target 落点+焦点恢复+可输入三证——若有点击拦截层，target 异常或焦点不回）
  await win.mouse.click(vp!.width / 2, Math.max(60, vp!.height - 40))
  const activeAfterBlur = await win.evaluate(() => document.activeElement?.tagName ?? 'none')
  await ta.click()
  const activeAfterClick = await win.evaluate(() => document.activeElement?.getAttribute?.('aria-label') ?? document.activeElement?.tagName ?? 'none')
  await ta.fill('F-RDR-02 审计输入')
  const value = await ta.inputValue()
  const clickLog = await win.evaluate(() => (window as unknown as { __rdr02Log: string[] }).__rdr02Log)
  console.log('[F-RDR-02-S14]', JSON.stringify({ activeAfterBlur, activeAfterClick, value, clickLogTail: clickLog.slice(-6) }))
  expect(activeAfterClick, '点击 textarea 后焦点应回到批注输入框（无拦截层）').toBe('批注内容')
  expect(value, '焦点恢复后输入应进入 textarea（无吞键）').toBe('F-RDR-02 审计输入')

  // [门一 B1 双证] D6 重聚焦真机断言：先失焦（点页面空白）→ 完整指针序列点击
  // 弹层空白区（quote 段落）→ activeElement 必须仍=textarea——preventDefault
  // 抑制 mousedown 默认聚焦的实证（jsdom 无该动作族，唯真机可证）
  await win.mouse.click(vp!.width / 2, Math.max(60, vp!.height - 40))
  const blurred = await win.evaluate(() => document.activeElement?.tagName ?? 'none')
  const er = (await editor.boundingBox())!
  await win.mouse.click(er.x + 20, er.y + 8)
  const refocused = await win.evaluate(
    () => document.activeElement?.getAttribute?.('aria-label') ?? document.activeElement?.tagName ?? 'none'
  )
  console.log('[F-RDR-02-D6]', JSON.stringify({ blurred, refocused }))
  expect(blurred, '前置：点页面空白后焦点应已离开 textarea').not.toBe('批注内容')
  expect(refocused, 'D6：完整指针序列点击弹层空白后焦点应回到批注输入框（B1 修复真机证）').toBe('批注内容')
  await app.close()
})
