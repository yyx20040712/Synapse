import type { KeyboardEvent } from 'react'

/**
 * 保留 Space 的原生按钮激活，但不把它冒泡给页面级滚动快捷键。
 * 不 preventDefault：Enter/Space 的默认激活链必须完整。
 */
export function keepNativeButtonSpace(event: KeyboardEvent<HTMLElement>): void {
  if (event.key === ' ') event.stopPropagation()
}
