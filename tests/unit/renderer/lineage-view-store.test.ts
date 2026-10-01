// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U3] lineage-view.store —— 模式态单源（P-1/P-3/T1/T2；mockup
 * §2.1/§2.3）。态空间：mode ∈ {edit,browse,focus}（互斥单选，页面级）×
 * focusSet（focus 模式内 toggle 多卡集）×navCollapsed×navWidth（导航窗格
 * P-17）。迁移：P-1 进页缺省 browse；P-3 聚焦单出口退出（→browse/edit）
 * =focusSet 清空（再进=空集）；T1 再点聚焦=no-op 保持；T2 toggle 再点同卡
 * 取消。always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

const state = () => useLineageViewStore.getState()

beforeEach(() => {
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

describe('F-LGRAPH-01①U3 lineage-view.store —— 模式态（P-1/P-3/T1）', () => {
  it('P-1 进页缺省=browse：初始态 mode/browse 空 focusSet/nav 缺省（208 未收起）', () => {
    expect(state().mode).toBe('browse')
    expect(state().focusSet).toEqual([])
    expect(state().navCollapsed).toBe(false)
    expect(state().navWidth).toBe(208)
  })

  it('P-3 聚焦退出清空 focusSet：focus(集非空)→browse 清空；→edit 同清；再进 focus=空集', () => {
    state().setMode('focus')
    state().toggleFocus('A')
    state().toggleFocus('B')
    expect(state().focusSet).toEqual(['A', 'B'])
    state().setMode('browse') // 单出口之一：点浏览按钮
    expect(state().focusSet).toEqual([])
    expect(state().mode).toBe('browse')
    state().setMode('focus') // 再进=空集（非上次集复活）
    expect(state().focusSet).toEqual([])
    state().toggleFocus('C')
    state().setMode('edit') // 单出口之二：点编辑按钮
    expect(state().focusSet).toEqual([])
    expect(state().mode).toBe('edit')
  })

  it('T1 再点聚焦=no-op 保持：focus 态 setMode(focus) 模式与集均不变', () => {
    state().setMode('focus')
    state().toggleFocus('A')
    state().setMode('focus') // 再点聚焦按钮（三轮裁决：单出口——退出唯浏览/编辑）
    expect(state().mode).toBe('focus')
    expect(state().focusSet).toEqual(['A'])
  })

  it('T2 focusSet toggle：加入→再点同卡移出（多卡独立）；browse 态 toggle=no-op（focus 模式内语义）', () => {
    state().setMode('focus')
    state().toggleFocus('A')
    state().toggleFocus('B')
    expect(state().focusSet).toEqual(['A', 'B']) // 多卡独立标记
    state().toggleFocus('A') // 再点同卡取消
    expect(state().focusSet).toEqual(['B'])
    state().setMode('browse')
    state().toggleFocus('C')
    expect(state().focusSet).toEqual([]) // 非 focus 态不收（模式级语义）
  })

  it('clearFocus：图域隔离动作面（切图消费方调用）——集清空+模式保持 focus（空集合法）', () => {
    state().setMode('focus')
    state().toggleFocus('A')
    state().clearFocus() // 切图（mockup §2.7：focus 中切图=清空+模式保持）
    expect(state().focusSet).toEqual([])
    expect(state().mode).toBe('focus')
  })

  it('P-17 navWidth 钳 160–320：越界值回落边界；navCollapsed 翻转（U4 消费面）', () => {
    state().setNavWidth(120)
    expect(state().navWidth).toBe(160)
    state().setNavWidth(400)
    expect(state().navWidth).toBe(320)
    state().setNavWidth(250)
    expect(state().navWidth).toBe(250)
    state().setNavCollapsed(true)
    expect(state().navCollapsed).toBe(true)
  })
})
