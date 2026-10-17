// @vitest-environment jsdom
/**
 * [F-VISFB-15 ①面3] 视图路由离场 flush 测试（新建，always-active）。
 *
 * 锁链：
 * - 离场 'reader'（→其他视图）fire-first 消费全量挂载句柄——un-attempted
 *   dirty（<800ms 防抖窗内值）随 ReaderPage 卸载丢值的预防面（INV-141④
 *   「未尝试 dirty 不入表」锚的 flush 侧承接，非入表）；
 * - 非离场面（其他视图→reader、reader→reader）零触发；
 * - setView 恒落位（flush 不阻路由——零新增用户可见等待）；
 * - 句柄异常吞接（零 unhandled rejection——失败承接=句柄 failed→卸载注册
 *   承接重挂载重试+写路径 markTabDirty 观测面）。
 * 模块态隔离：注册表模块级——互异 id+try/finally 显式回收（annotation-draft-
 * flush 先例）。
 */
import { describe, expect, it, vi } from 'vitest'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import {
  fireAllDraftFlushes,
  registerDraftFlush,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'

/** 微任务排空（fire-first 异步链逐跳） */
async function drain(turns = 10): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

describe('view-flush —— 视图路由离场立存（F-VISFB-15 ①面3）', () => {
  it('fireAllDraftFlushes：全量挂载句柄各恰一次（fire-first 发起不 await）', async () => {
    const h1 = vi.fn(async () => 'saved')
    const h2 = vi.fn(async () => 'clean')
    registerDraftFlush('f15-v1', h1)
    registerDraftFlush('f15-v2', h2)
    try {
      fireAllDraftFlushes()
      await drain()
      expect(h1).toHaveBeenCalledTimes(1)
      expect(h2).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('f15-v1')
      unregisterDraftFlush('f15-v2')
    }
  })

  it('句柄异常吞接：rejecting 句柄零抛零 unhandled（失败承接面=注册表+写路径）', async () => {
    const bad = vi.fn(async () => {
      throw new Error('boom')
    })
    registerDraftFlush('f15-v3', bad)
    try {
      expect(() => fireAllDraftFlushes()).not.toThrow()
      await drain()
      expect(bad).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('f15-v3')
    }
  })

  it('switchViewWithFlush：reader→lineage 触发句柄+setView 落位（不阻路由）', async () => {
    const setView = vi.fn()
    const h = vi.fn(async () => 'saved')
    registerDraftFlush('f15-v4', h)
    try {
      switchViewWithFlush('reader', 'lineage', setView)
      expect(setView).toHaveBeenCalledWith('lineage')
      await drain()
      expect(h).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('f15-v4')
    }
  })

  it('非离场面零触发：library→reader 与 reader→reader 零句柄消费（setView 落位）', async () => {
    const setView = vi.fn()
    const h = vi.fn(async () => 'saved')
    registerDraftFlush('f15-v5', h)
    try {
      switchViewWithFlush('library', 'reader', setView)
      switchViewWithFlush('reader', 'reader', setView)
      await drain()
      expect(h).not.toHaveBeenCalled()
      expect(setView).toHaveBeenCalledTimes(2)
    } finally {
      unregisterDraftFlush('f15-v5')
    }
  })

  it('[R3] 同步 throw 句柄：零抛+后续句柄仍消费+路由落位（throw 归 rejection 承接）', async () => {
    const bad = vi.fn(() => {
      throw new Error('sync boom')
    })
    const good = vi.fn(async () => 'saved')
    registerDraftFlush('f15-v6', bad)
    registerDraftFlush('f15-v7', good)
    try {
      const setView = vi.fn()
      expect(() => switchViewWithFlush('reader', 'settings', setView)).not.toThrow()
      expect(setView).toHaveBeenCalledWith('settings')
      await drain()
      expect(bad).toHaveBeenCalledTimes(1)
      expect(good).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('f15-v6')
      unregisterDraftFlush('f15-v7')
    }
  })
})
