import { beforeEach, expect, it, vi } from 'vitest'
import {
  QUIT_CONFIRM_MESSAGE,
  getQuitDirty,
  handleCloseWithQuitGuard,
  quitDirtyGuard,
  setQuitDirty
} from '../../../src/main/windows/main-window'
import { createSystemIpc } from '../../../src/main/ipc/system'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

function makeEvent(): { preventDefault: ReturnType<typeof vi.fn> } {
  return { preventDefault: vi.fn() }
}

function makeWin(): { destroy: ReturnType<typeof vi.fn> } {
  return { destroy: vi.fn() }
}

guardedDescribe('SR2-TABS-04', 'main-window 退出拦截 —— dirty 缓存与 close 守卫（四态）', () => {
  beforeEach(() => {
    setQuitDirty(false)
  })

  it('判定函数：clean 放行 / dirty 拦截', () => {
    expect(quitDirtyGuard(false)).toBe(false)
    expect(quitDirtyGuard(true)).toBe(true)
  })

  it('模块级缓存：setQuitDirty/getQuitDirty 往返（renderer push 上报的 main 侧缓存）', () => {
    setQuitDirty(true)
    expect(getQuitDirty()).toBe(true)
    setQuitDirty(false)
    expect(getQuitDirty()).toBe(false)
  })

  it('clean 态 close：不 preventDefault、不弹确认框、不 destroy（默认放行）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const confirmQuit = vi.fn(async () => true)
    await handleCloseWithQuitGuard(false, event, win, { confirmQuit })
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(confirmQuit).not.toHaveBeenCalled()
    expect(win.destroy).not.toHaveBeenCalled()
  })

  it('dirty 态 close + 确认：preventDefault → 确认框（固定文案）→ destroy 强制关闭', async () => {
    const event = makeEvent()
    const win = makeWin()
    const confirmQuit = vi.fn(async () => true)
    await handleCloseWithQuitGuard(true, event, win, { confirmQuit })
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    expect(confirmQuit).toHaveBeenCalledWith(QUIT_CONFIRM_MESSAGE)
    expect(win.destroy).toHaveBeenCalledTimes(1)
  })

  it('dirty 态 close + 取消：preventDefault → 窗口保持（不 destroy，dirty 缓存不迁）', async () => {
    const event = makeEvent()
    const win = makeWin()
    setQuitDirty(true)
    const confirmQuit = vi.fn(async () => false)
    await handleCloseWithQuitGuard(true, event, win, { confirmQuit })
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
    expect(getQuitDirty()).toBe(true)
  })

  it('dirty 态 close + 确认框异常（reject）：按取消处理——窗口保持、不抛出（deepseek W1）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const confirmQuit = vi.fn(async () => {
      throw new Error('dialog boom')
    })
    await expect(handleCloseWithQuitGuard(true, event, win, { confirmQuit })).resolves.toBeUndefined()
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
  })
})

guardedDescribe(
  'SR2-TABS-04',
  'ipc/system set-quit-dirty 通道 —— renderer→main dirty 上报透传（头注「system.test.ts 扩展」的落位处置：check-tickets 规则 5 机器裁定 guardedDescribe 文件必须 import 登记文件，故并入本文件）',
  () => {
    it('上报 dirty=true/false：透传注入的 setQuitDirty 并返回 { ok: true }', async () => {
      const seen: boolean[] = []
      const ipc = createSystemIpc(makeIpcDeps({ setQuitDirty: (d) => void seen.push(d) }))
      await expect(ipc.setQuitDirty({ dirty: true })).resolves.toEqual({ ok: true })
      await expect(ipc.setQuitDirty({ dirty: false })).resolves.toEqual({ ok: true })
      expect(seen).toEqual([true, false])
    })
  }
)
