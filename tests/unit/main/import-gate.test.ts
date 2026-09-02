import { describe, expect, it } from 'vitest'
import { createImportGate } from '../../../src/main/import-gate'

describe('main/import-gate —— import 并发计数（C-3 N1 转正：中间态测试锚）', () => {
  it('单会话：enter→in-flight，exit→空闲', () => {
    const gate = createImportGate()
    expect(gate.inFlight()).toBe(false)
    gate.enter()
    expect(gate.inFlight()).toBe(true)
    gate.exit()
    expect(gate.inFlight()).toBe(false)
  })

  it('并发双 import 计数中间态 2→1→0：首个完成不误释互斥（>0 判定），全完成才空闲', () => {
    const gate = createImportGate()
    gate.enter()
    gate.enter()
    expect(gate.inFlight()).toBe(true) // 计数=2：双 import 在途
    gate.exit() // 首个 import 完成：2→1
    expect(gate.inFlight()).toBe(true) // 仍 in-flight——次个未完不误释互斥
    gate.exit() // 次个完成：1→0
    expect(gate.inFlight()).toBe(false)
  })
})
