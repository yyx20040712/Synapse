/**
 * [F-VISFB-14] 状态条保存槽视图模型测试（新建，always-active）。
 *
 * 锁链（INV-141⑤新面消费）：状态条自动保存槽与四态钮同源 save-status.ts——
 * deriveSaveStatusSlot 四态真文本（与 StatusBar 既有槽文本逐字同值=受锁
 * app-shell-t3u1 断言面零变）+alarm 档（error→.sig 消费）。
 */
import { describe, expect, it } from 'vitest'
import { deriveSaveStatusSlot, type SaveUiState } from '../../../src/renderer/shared/save-status'

describe('save-status-slot —— 状态条槽位单源推导（F-VISFB-14）', () => {
  it('四态真文本逐字锚（saved/saving/dirty/failed——与既有槽文本同值）', () => {
    expect(deriveSaveStatusSlot('saved').text).toBe('已保存')
    expect(deriveSaveStatusSlot('saving').text).toBe('保存中…')
    expect(deriveSaveStatusSlot('dirty').text).toBe('待保存')
    expect(deriveSaveStatusSlot('failed').text).toBe('保存失败')
  })

  it('alarm 档：仅 failed 真（.sig 消费——lineage error 由 App 聚合归一）；余三态假', () => {
    const states: SaveUiState[] = ['saved', 'saving', 'dirty', 'failed']
    const alarms = states.map((s) => deriveSaveStatusSlot(s).alarm)
    expect(alarms).toEqual([false, false, false, true])
  })

  it('四态全覆盖（态→视图一一对应，无未定义格）', () => {
    for (const s of ['saved', 'saving', 'dirty', 'failed'] as SaveUiState[]) {
      const view = deriveSaveStatusSlot(s)
      expect(typeof view.text).toBe('string')
      expect(view.text.length).toBeGreaterThan(0)
    }
  })
})
