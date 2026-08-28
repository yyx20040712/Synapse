import { describe, expect, it } from 'vitest'
import { citedByPatch } from '../../../src/main/services/enrich/cited-by.service'

/** 刷新语义状态机（票面六格表+0 值边界+跨格序列）——always-active 裸 describe（W4） */

const T1 = '2026-01-01T00:00:00Z'
const T2 = '2026-01-02T00:00:00Z'
const T3 = '2026-01-03T00:00:00Z'

describe('SR2-ENR-01 citedByPatch —— 刷新语义状态机（六格全格+0 值边界）', () => {
  it('格1：NULL＋命中且 citedByCount 非 null（含 0）→写入 count+fetchedAt+source；0 是合法缓存值', () => {
    const p = citedByPatch({ citedByCount: 0 }, 'crossref', { cited_by_count: null }, () => T1)
    expect(p).toEqual({ count: 0, fetchedAt: T1, source: 'crossref' })
  })

  it('格1b：NULL＋命中 5 →写入 5', () => {
    const p = citedByPatch({ citedByCount: 5 }, 'openalex', { cited_by_count: null }, () => T1)
    expect(p).toEqual({ count: 5, fetchedAt: T1, source: 'openalex' })
  })

  it('格2：NULL＋命中但 citedByCount=null →null（done 态；缓存保持 NULL）', () => {
    const p = citedByPatch({ citedByCount: null }, 'arxiv', { cited_by_count: null }, () => T1)
    expect(p).toBeNull()
  })

  it('格3：NULL＋未命中/异常（work=null）→null（enrich_status=failed；缓存保持 NULL）', () => {
    const p = citedByPatch(null, 'crossref', { cited_by_count: null }, () => T1)
    expect(p).toBeNull()
  })

  it('格4：有值＋命中且非 null →强制刷新=新值+新时间戳+source（旧值被覆盖）', () => {
    const p = citedByPatch({ citedByCount: 5 }, 'openalex', { cited_by_count: 7 }, () => T2)
    expect(p).toEqual({ count: 5, fetchedAt: T2, source: 'openalex' })
  })

  it('格4b：有值 0＋命中 0 →强制刷新 0（0 走刷新格，非保留格）', () => {
    const p = citedByPatch({ citedByCount: 0 }, 'crossref', { cited_by_count: 0 }, () => T2)
    expect(p).toEqual({ count: 0, fetchedAt: T2, source: 'crossref' })
  })

  it('格5：有值＋命中但 citedByCount=null →null（旧值保留；done 态）', () => {
    const p = citedByPatch({ citedByCount: null }, 'arxiv', { cited_by_count: 7 }, () => T2)
    expect(p).toBeNull()
  })

  it('格6：有值＋未命中/异常（work=null）→null（旧值保留；failed 态）', () => {
    const p = citedByPatch(null, 'openalex', { cited_by_count: 7 }, () => T2)
    expect(p).toBeNull()
  })

  it('跨格序列（票面）：NULL→命中0→写入0→再增强命中5→刷新5→瀑布异常→旧值5保留', () => {
    // 格1：NULL＋命中 0 →写入 0（库态迁移为 0）
    const p1 = citedByPatch({ citedByCount: 0 }, 'crossref', { cited_by_count: null }, () => T1)
    expect(p1).toEqual({ count: 0, fetchedAt: T1, source: 'crossref' })
    // 格4：有值 0（上格写入的库态）＋命中 5 →强制刷新 5
    const p2 = citedByPatch({ citedByCount: 5 }, 'crossref', { cited_by_count: 0 }, () => T2)
    expect(p2).toEqual({ count: 5, fetchedAt: T2, source: 'crossref' })
    // 格6：有值 5（上格写入的库态）＋瀑布异常 →null=调用方不写，旧值 5 保留
    const p3 = citedByPatch(null, 'crossref', { cited_by_count: 5 }, () => T3)
    expect(p3).toBeNull()
  })
})
