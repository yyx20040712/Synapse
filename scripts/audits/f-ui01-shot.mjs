/**
 * F-UI-01 全窗截图档（票面验收第二半：全窗截图目检）——探针已证几何居中
 * （簇中心差 -0.4px ≤1px 线内），本件只补完整顶栏参照系截图（img4 为
 * 裁剪图无下界参照，判读失真来源）。
 */
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const userData = await mkdtemp(join(tmpdir(), 'synapse-ui01s-'))
const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, SYNAPSE_USER_DATA: userData },
})
const win = await app.firstWindow()
await win.waitForTimeout(800)
await win.screenshot({ path: 'scripts/audits/f-ui01-fullwindow.png' })
await app.close()
console.log('shot saved: scripts/audits/f-ui01-fullwindow.png')
