import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from './e2e-env'

/**
 * [P7E-02] 拖拽导入 e2e（always-active，无工单门）——D2 装配级：
 * 真实 Electron preload 的 apiDrag 在场，合成 File（非 OS 拖拽手势）经
 * webUtils.getPathForFile 解析得 ''——被 preload 天然拒（设计行为本身，
 * INV-54），断言 toast 真实文本。真实 OS 拖拽正向链 e2e 无法模拟（合成
 * File 恰被 '' 滤除），留手动验收面在交接书申报。另锚按钮回归。
 */
test('拖拽导入：合成 File 被 preload 天然拒（toast 真实文本）+导入按钮回归', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e2-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 按钮回归：两个既有导入入口在场（拖拽为增量，不取代按钮路径）
  await expect(win.getByRole('button', { name: '导入 PDF 文件', exact: true })).toBeVisible()
  await expect(win.getByRole('button', { name: '导入文件夹' })).toBeVisible()

  // D2 装配级：drop 合成 File → preload 解析 '' → none → toast 中文文案（零崩溃）
  const zone = win.locator('.lib-dropzone')
  await expect(zone).toBeVisible()
  await zone.evaluate((el) => {
    const ev = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'dataTransfer', {
      value: { files: [new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'synthetic.pdf')] }
    })
    el.dispatchEvent(ev)
  })
  await expect(win.getByText('仅支持拖入 PDF 文件')).toBeVisible({ timeout: 10_000 })

  await app.close()
})
