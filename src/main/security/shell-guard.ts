/**
 * 外链守卫（SR-INFRA-07，已完成）。
 *
 * 职责：renderer 中 DOI/出版社等链接只有通过校验后才允许 shell.openExternal。
 * 规则：仅 https；禁止 localhost/内网 IP 字面量（SSRF 与钓鱼面收窄）。
 * 测试：tests/security/shell-guard.test.ts（含攻击向量集）。
 */

export interface ExternalLinkCheck {
  safe: boolean
  reason?: string
}

/** 纯校验函数（可注入 shell 的薄壳之外，全部单测覆盖在这里） */
export function checkExternalUrl(raw: string): ExternalLinkCheck {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { safe: false, reason: 'URL 无法解析' }
  }
  if (url.protocol !== 'https:') {
    return { safe: false, reason: '仅允许 https 链接' }
  }
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { safe: false, reason: '禁止打开本机地址' }
  }
  if (isPrivateIPv4Literal(host) || isIPv6Literal(host)) {
    return { safe: false, reason: '禁止打开内网/IP 字面量地址' }
  }
  if (url.username !== '' || url.password !== '') {
    return { safe: false, reason: '禁止带凭据的 URL' }
  }
  return { safe: true }
}

function isPrivateIPv4Literal(host: string): boolean {
  // 策略：拒绝一切 IPv4 字面量（含公网）。本地应用没有理由直连 IP 形态主机。
  // 只匹配点分十进制即够：WHATWG URL 解析已把整数（2130706433）/十六进制
  // （0x7f000001）/八进制（0177.0.0.1）等简写规范化为点分 hostname
  // （tests/security/shell-guard.test.ts 的简写向量锁死该前提）。
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

function isIPv6Literal(host: string): boolean {
  return host.includes(':')
}

/** 打开外链的统一入口（shell 依赖注入便于测试） */
export interface ShellLike {
  openExternal(url: string): Promise<void>
}

export async function openExternalGuarded(shell: ShellLike, raw: string): Promise<ExternalLinkCheck> {
  const check = checkExternalUrl(raw)
  if (!check.safe) return check
  await shell.openExternal(raw)
  return check
}
