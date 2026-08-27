import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { launch } from './e2e-env'

/**
 * zcode 联动 e2e（SR2-AI-10，受锁 [locked-change]）。
 *
 * 五态检测跨格序列①：未发现 zcode→（用户装 zcode=.zcode 目录出现）→技能未装
 * →一键装技能（confirm 自动接受）→已装未运行。INV-21 断言=**纯 fs 落地**：装
 * 技能全流程后 skills 目录文件存在且与仓库模板逐字节一致（行为零进程副作用面
 * ——不依赖任何进程行为）。~/.zcode 隔离=SYNAPSE_ZCODE_HOME（bootstrap env→
 * 构造参数映射，注入点=zcodeBaseDir 服务构造参数）。
 */
const DEPS = ['SR2-AI-06'] as const

test('zcode 联动：未发现→装 zcode→技能未装→一键装技能→fs 落地一致（INV-21 纯 fs 断言）', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  const userData = await mkdtemp(join(tmpdir(), 'synapse-ai10-'))
  const fakeHome = await mkdtemp(join(tmpdir(), 'zcode-home-'))

  const app = await launch(userData, { SYNAPSE_ZCODE_HOME: fakeHome })
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置' }).click()

  // zcode-not-found：指引文案（渲染真实文本锚）
  await expect(win.getByTestId('zcode-link-status')).toHaveText('未发现 zcode', { timeout: 10_000 })
  await expect(win.getByText(/请先安装 zcode 命令行工具/)).toBeVisible()

  // 用户装 zcode：.zcode 目录出现（fs 夹具）→5s 轮询驱动 skill-missing
  mkdirSync(join(fakeHome, '.zcode'), { recursive: true })
  await expect(win.getByTestId('zcode-link-status')).toHaveText('已发现 zcode，技能未装', {
    timeout: 12_000
  })
  const installBtn = win.getByRole('button', { name: '一键装技能' })
  await expect(installBtn).toBeVisible()

  // confirm 自动接受（reader-text.spec 同型）；点击→纯 fs 复制→re-detect→idle
  win.on('dialog', (d) => {
    void d.accept()
  })
  await installBtn.click()
  await expect(win.getByTestId('zcode-link-status')).toHaveText('已装技能，未运行', { timeout: 10_000 })

  // INV-21 断言：装技能全流程后 skills 目录文件存在（纯 fs 落地，零进程行为依赖）
  const dest = join(fakeHome, '.zcode', 'skills', 'ai-sensor')
  expect(existsSync(join(dest, 'SKILL.md'))).toBe(true)
  expect(existsSync(join(dest, 'companion.mjs'))).toBe(true)
  expect(existsSync(join(dest, 'queue.mjs'))).toBe(true)
  expect(existsSync(join(dest, 'prompts', 'first-read.md'))).toBe(true)
  // 逐字节一致（模板复制不改内容）
  expect(readFileSync(join(dest, 'SKILL.md'), 'utf8')).toBe(
    readFileSync(join(process.cwd(), 'tools', 'ai-sensor', 'SKILL.md'), 'utf8')
  )
  // 成功 toast（真实文本）
  await expect(win.getByText(/技能安装完成（\d+ 个文件）/)).toBeVisible({ timeout: 5_000 })

  await app.close()
})
