/**
 * [T3-U1] settings.service readThemeSync——FOUC 启动同步读锁。
 *
 * 与 readSettings 同一解析链（system→light 迁移+schema 校验）；不存在/损坏/
 * 不合 schema 一律回退默认 light 且禁抛（启动路径）。临时目录写真
 * settings.json（文件名单源=shared/constants SETTINGS_FILE_NAME）。
 * 既有 get/set/diagNetwork 行为由受锁 tests/unit/ipc/settings.test.ts 锁定
 * （零改）；本件只锁新增同步读面。
 */
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SETTINGS_FILE_NAME } from '../../../src/shared/constants'
import { readThemeSync } from '../../../src/main/services/settings.service'

async function freshDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'synapse-theme-boot-'))
}

async function writeSettings(content: string): Promise<string> {
  const dir = await freshDir()
  await writeFile(join(dir, SETTINGS_FILE_NAME), content, 'utf-8')
  return dir
}

describe('services/settings —— T3-U1 readThemeSync 启动主题档同步读', () => {
  it('theme=dark → dark（合法档透传）', async () => {
    const dir = await writeSettings(JSON.stringify({ contactEmail: 'a@b.cc', theme: 'dark', uiScale: 'small' }))
    expect(readThemeSync(dir)).toBe('dark')
  })

  it("存量 'system' → 迁移 light（读侧单源——与 get 同链同判）", async () => {
    const dir = await writeSettings(JSON.stringify({ contactEmail: 'a@b.cc', theme: 'system', uiScale: 'small' }))
    expect(readThemeSync(dir), "system 枚举退役（A6）——读侧平滑迁 light").toBe('light')
  })

  it('文件不存在 → 默认 light（禁抛——启动路径）', async () => {
    expect(readThemeSync(await freshDir())).toBe('light')
  })

  it('损坏 JSON → 默认 light（禁抛）', async () => {
    const dir = await writeSettings('{oops')
    expect(readThemeSync(dir)).toBe('light')
  })

  it('不合 schema（theme 越枚举）→ 默认 light', async () => {
    const dir = await writeSettings(JSON.stringify({ contactEmail: 'a@b.cc', theme: 'neon', uiScale: 'small' }))
    expect(readThemeSync(dir), 'schema 拒绝整档 → 默认档主题位（不半取字段）').toBe('light')
  })
})
