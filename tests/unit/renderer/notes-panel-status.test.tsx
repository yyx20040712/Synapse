import { beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

/**
 * NotesPanel 保存状态推导契约（UBS 批三 A4）。
 * deriveSaveStatus 是面板「保存状态指示」的单一推导点：显示诚实性依赖
 * store 的 pending 镜像（合并落地窗口/防抖窗口内切回不再误显"已保存"）。
 * 纯函数级锁定：不挂载组件（组件交互面由 e2e/人工验收覆盖，本文件锁显示状态机）。
 */
async function loadPanel() {
  vi.resetModules()
  vi.stubGlobal('window', { api: {}, apiEvents: {} })
  const mod = await import('../../../src/renderer/features/notes/NotesPanel')
  return mod.deriveSaveStatus
}

guardedDescribe('SR-NOTE-01', 'NotesPanel —— 保存状态推导（deriveSaveStatus）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('四态优先级：保存中 > 保存失败 > 未保存 > 已保存', async () => {
    const derive = await loadPanel()
    // 保存中：最高优先（周期在飞，其余态不可见）
    expect(derive(true, true, true)).toBe('保存中…')
    expect(derive(true, false, false)).toBe('保存中…')
    // 保存失败：周期结束且 savedAt 未推进（INV-04 消费）
    expect(derive(false, true, true)).toBe('保存失败')
    expect(derive(false, true, false)).toBe('保存失败')
    // 未保存：草稿含未落库编辑（pending 镜像），面板诚实显示
    expect(derive(false, false, true)).toBe('未保存')
    // 已保存：无在飞周期、无失败、无待落库编辑
    expect(derive(false, false, false)).toBe('已保存')
  })
})
