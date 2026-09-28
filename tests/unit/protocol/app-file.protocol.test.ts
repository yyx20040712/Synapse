import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createAppFileHandler,
  parseAppFileUrl,
  resolveAcao
} from '../../../src/main/protocol/app-file.protocol'
import { APP_FILE_SCHEME } from '../../../src/shared/constants'
import type { FileStore } from '../../../src/main/services/import_/file-store'

describe('protocol/app-file —— URL 解析攻击向量', () => {
  it('合法：app-file://<uuid> 解析出 paperId', () => {
    expect(parseAppFileUrl(`${APP_FILE_SCHEME}://a1b2c3d4-e5f6-7890-abcd-ef0123456789`)).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef0123456789'
    )
  })

  it('合法：简单 id（短哈希）', () => {
    expect(parseAppFileUrl('app-file://paper01')).toBe('paper01')
  })

  it('攻击向量全部返回 null（含带路径/查询/片段的 URL）', () => {
    for (const evil of [
      'app-file://../../etc/passwd',
      'app-file://..%2F..%2Fetc%2Fpasswd',
      'app-file://a/b/c.pdf',
      'app-file://id?x=1',
      'app-file://id#frag',
      'app-file://',
      'app-file://id with space',
      'app-file://中文id',
      'http://evil/id',
      'app-file://' + 'a'.repeat(65)
    ]) {
      expect(parseAppFileUrl(evil), `应拒绝：${evil}`).toBeNull()
    }
    // 合法变体：末尾一个斜杠等价于无斜杠
    expect(parseAppFileUrl('app-file://paper01/')).toBe('paper01')
  })

  it('超长 id（>64）拒绝', () => {
    expect(parseAppFileUrl(`app-file://${'a'.repeat(65)}`)).toBeNull()
    expect(parseAppFileUrl(`app-file://${'a'.repeat(64)}`)).toBe('a'.repeat(64))
  })
})

// ── SR-SEC-01：ACAO 白名单回显（替代字面 '*'）──────────────────────
// 设计终裁（design-final §1）：白名单命中→回显原值；未命中=不带 ACAO 头静默
// （不 403——防破坏 pdf.js loadingTask 错误分支）；白名单=字面 'null'
// （file:// 页 CORS Origin 恒此值）+dev 域名集（URL 解析取 hostname 精确等值，
// 禁子串/后缀匹配）。
describe('protocol/app-file —— resolveAcao（SR-SEC-01 白名单纯函数）', () => {
  it('白名单命中：回显原值（dev origin 全串）', () => {
    expect(resolveAcao('http://localhost:5173')).toBe('http://localhost:5173')
    expect(resolveAcao('https://127.0.0.1:3000')).toBe('https://127.0.0.1:3000')
  })

  it('未命中：undefined（=不带 ACAO 头静默，非 403）', () => {
    expect(resolveAcao('https://evil.example')).toBeUndefined()
    expect(resolveAcao('http://evil.example:5173')).toBeUndefined()
  })

  it('无 Origin 头（headers.get 返回 null）：undefined（非 CORS 请求不加头）', () => {
    expect(resolveAcao(null)).toBeUndefined()
  })

  it("字面 'null'（file:// 页 CORS Origin 恒此值）：命中白名单回显", () => {
    expect(resolveAcao('null')).toBe('null')
  })

  it('dev hostname 解析命中：URL 解析取 hostname 精确等值（端口无关）', () => {
    expect(resolveAcao('http://localhost:5173')).toBe('http://localhost:5173')
    expect(resolveAcao('http://localhost')).toBe('http://localhost')
  })

  it("负例：localhost.evil.com 的 hostname 不等值必 undefined（禁子串/后缀匹配）", () => {
    expect(resolveAcao('http://localhost.evil.com')).toBeUndefined()
    expect(resolveAcao('http://localhost.evil.com:5173')).toBeUndefined()
    expect(resolveAcao('http://127.0.0.1.evil.com')).toBeUndefined()
  })
})

// ── SR-SEC-01：handler ACAO 接线（成功面+errorResponse 面）─────────
// 浏览器 fetch 禁伪造 Origin 头，且取证实证（仓外 SR-SEC-01/05-07）：Electron
// protocol.handle 剥离 Origin（双态恒不可观测）——带 Origin 的请求只能在 unit 层
// 经 new Request 构造真实化。此处即白名单分支的唯一真实可达测试面。
describe('protocol/app-file —— handler ACAO 接线（SR-SEC-01）', () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
  })

  /** 成功面夹具：真临时文件（handler 内 access() 真实读检查）+桶桩 store */
  async function successStub(): Promise<{ lookupHit: () => Promise<string | null>; store: FileStore }> {
    const dir = await mkdtemp(join(tmpdir(), 'sr-sec01-unit-'))
    tempDirs.push(dir)
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF 魔数（内容无关）
    const abs = join(dir, 'test.pdf')
    await writeFile(abs, bytes)
    const store: FileStore = {
      storePdfFromPath: () => {
        throw new Error('unit 桩不实现')
      },
      storePdfFromBytes: () => {
        throw new Error('unit 桩不实现')
      },
      resolveManagedPath: () => abs,
      readFileBytes: async () => bytes
    }
    return { lookupHit: async () => 'ab/cd/test.pdf', store }
  }

  const lookupMiss = async (): Promise<string | null> => null
  const missStore: FileStore = {
    storePdfFromPath: () => {
      throw new Error('unit 桩不实现')
    },
    storePdfFromBytes: () => {
      throw new Error('unit 桩不实现')
    },
    resolveManagedPath: () => {
      throw new Error('unit 桩不实现')
    },
    readFileBytes: async () => new Uint8Array()
  }

  it('伪造 Origin（白名单外）：成功响应不带 ACAO 头（静默，非 403）', async () => {
    const { lookupHit, store } = await successStub()
    const handler = createAppFileHandler(lookupHit, store)
    const res = await handler(
      new Request('app-file://paper01', { headers: { Origin: 'https://evil.example' } })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('白名单 Origin（dev）：成功响应 ACAO=回显原值', async () => {
    const { lookupHit, store } = await successStub()
    const handler = createAppFileHandler(lookupHit, store)
    const res = await handler(
      new Request('app-file://paper01', { headers: { Origin: 'http://localhost:5173' } })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })

  it("字面 'null'（file:// 页真实形态）：成功响应 ACAO='null'（回显）", async () => {
    const { lookupHit, store } = await successStub()
    const handler = createAppFileHandler(lookupHit, store)
    const res = await handler(new Request('app-file://paper01', { headers: { Origin: 'null' } }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('null')
  })

  it('无 Origin 头：成功响应不带 ACAO 头（非 CORS 请求）', async () => {
    const { lookupHit, store } = await successStub()
    const handler = createAppFileHandler(lookupHit, store)
    const res = await handler(new Request('app-file://paper01'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('errorResponse 面同接线：伪造 Origin 的 404 不带 ACAO；字面 null 的 404 回显', async () => {
    const handler404 = createAppFileHandler(lookupMiss, missStore)
    const evil = await handler404(
      new Request('app-file://paper01', { headers: { Origin: 'https://evil.example' } })
    )
    expect(evil.status).toBe(404)
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBeNull()
    const fileOrigin = await handler404(new Request('app-file://paper01', { headers: { Origin: 'null' } }))
    expect(fileOrigin.status).toBe(404)
    expect(fileOrigin.headers.get('Access-Control-Allow-Origin')).toBe('null')
  })
})
