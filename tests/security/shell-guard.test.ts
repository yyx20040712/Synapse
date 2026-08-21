import { describe, expect, it } from 'vitest'
import { checkExternalUrl, openExternalGuarded } from '../../src/main/security/shell-guard'

describe('security/shell-guard —— 外链守卫攻击向量', () => {
  it('合法 https 外链通过', () => {
    expect(checkExternalUrl('https://doi.org/10.1234/abc')).toEqual({ safe: true })
    expect(checkExternalUrl('https://www.nature.com/articles/xyz')).toEqual({ safe: true })
  })

  it('拒绝：非 https、本机、内网、IP 字面量、带凭据、非法串', () => {
    const vectors = [
      'http://doi.org/10.1/x',
      'ftp://example.com/x',
      'https://localhost/app',
      'https://sub.localhost/app',
      'https://127.0.0.1/app',
      'https://10.0.0.1/app',
      'https://192.168.1.1/admin',
      'https://172.16.0.5/x',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/x',
      'https://user:pass@example.com/x',
      'javascript:alert(1)',
      'file:///C:/Windows/system.ini',
      'not a url at all'
    ]
    for (const v of vectors) {
      expect(checkExternalUrl(v), `应拒绝：${v}`).toMatchObject({ safe: false })
    }
  })

  it('公网 IP 形如 8.8.8.8 不在私网段——但按规则仍拒（IP 字面量全拒）', () => {
    expect(checkExternalUrl('https://8.8.8.8/x').safe).toBe(false)
  })

  it('openExternalGuarded：非法 URL 不触达 shell；合法 URL 触达一次', async () => {
    const opened: string[] = []
    const shell = {
      openExternal: async (u: string) => {
        opened.push(u)
      }
    }
    const bad = await openExternalGuarded(shell, 'https://127.0.0.1/x')
    expect(bad.safe).toBe(false)
    expect(opened).toEqual([])

    const good = await openExternalGuarded(shell, 'https://arxiv.org/abs/2401.00001')
    expect(good.safe).toBe(true)
    expect(opened).toEqual(['https://arxiv.org/abs/2401.00001'])
  })
})
