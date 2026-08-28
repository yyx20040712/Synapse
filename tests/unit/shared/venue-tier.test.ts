import { describe, expect, it } from 'vitest'
import * as venueTierModule from '../../../src/shared/venue-tier'
import { VENUE_TIER_MAP, venueToTier } from '../../../src/shared/venue-tier'

/** ENR-02 venueToTier 映射语义（命中/未命中/空串/trim/精确等值不归一）
 * —— always-active 裸 describe（W4：不挂 C-02 guardedDescribe 块） */

describe('SR2-ENR-02 venueToTier —— venue→tier 映射（命中/未命中/空串/trim/精确等值）', () => {
  it('命中：种子表全表往返（每个键 venueToTier(venue)=表值）', () => {
    for (const [venue, tier] of Object.entries(VENUE_TIER_MAP)) {
      expect(venueToTier(venue)).toBe(tier)
    }
  })

  it('命中（字面锚）：Nature Water→T1（种子表内容=契约面，内容增量走受锁常量修订）', () => {
    expect(venueToTier('Nature Water')).toBe('T1')
  })

  it('未命中：不在表内的 venue → null（装配侧整键省略）', () => {
    expect(venueToTier('Unknown Journal of Nowhere')).toBeNull()
  })

  it('空串 → null；纯空白串 trim 后为空 → null', () => {
    expect(venueToTier('')).toBeNull()
    expect(venueToTier('   ')).toBeNull()
  })

  it('仅 trim 归一：首尾空白命中；内部空白参与精确等值', () => {
    expect(venueToTier('  Nature Water  ')).toBe('T1')
    expect(venueToTier('Nature  Water')).toBeNull()
  })

  it('不做 toLowerCase 归一（N-r2b 键=display_name 原形精确等值）', () => {
    expect(venueToTier('nature water')).toBeNull()
  })

  it('三档齐备：种子表值覆盖 T1/T2/T3（三档人工先验结构）', () => {
    const tiers = new Set(Object.values(VENUE_TIER_MAP))
    expect(tiers.has('T1')).toBe(true)
    expect(tiers.has('T2')).toBe(true)
    expect(tiers.has('T3')).toBe(true)
  })

  it('STUB 已删除：VENUE_TIER_STUB 导出不存在（实现完成 grep 零残留伴生）', () => {
    expect('VENUE_TIER_STUB' in venueTierModule).toBe(false)
  })
})
