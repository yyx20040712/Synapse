/**
 * aggregateSaveUiState —— IO+U→SaveUiState 聚合单源（B4-A R2 §10.1，always-active）。
 *
 * [B5 wave C 2026-11-25] 本件自 save-status-slot.test.ts 迁出并更名：原文件的「状态条保存槽
 * 视图模型」describe（deriveSaveStatusSlot 四态真文本/alarm 档/四态全覆盖三例）随 App 底部
 * 状态条整删（用户裁决 2026-11-25，设计稿外）删除——槽位函数已无消费面。本件只承载
 * aggregateSaveUiState 聚合合同（断言逐字原样迁移，零改）：reader 活动 tab 命令状态
 * （tab-dirty useActiveTabCommandState）与脉络命令状态（lineage-command-state-model）
 * 两处活跃消费的保存钮四态单源（INV-106/INV-141⑤）。
 */
import { describe, expect, it } from 'vitest'
import { aggregateSaveUiState } from '../../../src/renderer/shared/save-status'

describe('aggregateSaveUiState —— IO+U 聚合（B4-A R2 §10.1）', () => {
  it('busy 在途=saving（finalize/flush/history——最高优先级）', () => {
    expect(aggregateSaveUiState({ busy: true, error: true, pending: true, unfinalized: true })).toBe('saving')
    expect(aggregateSaveUiState({ busy: true, error: false, pending: false, unfinalized: false })).toBe('saving')
  })

  it('无在途有 IO 错误=failed（可重试）', () => {
    expect(aggregateSaveUiState({ busy: false, error: true, pending: false, unfinalized: false })).toBe('failed')
    expect(aggregateSaveUiState({ busy: false, error: true, pending: true, unfinalized: true })).toBe('failed')
  })

  it('Q0+U1=dirty 可点（idle-flush 落库后仍 dirty——即使无待写也可点保存定稿）', () => {
    expect(aggregateSaveUiState({ busy: false, error: false, pending: false, unfinalized: true })).toBe('dirty')
  })

  it('Q0+U0=saved 禁用；Q1 无在途并入 dirty 可点（保存=收口）', () => {
    expect(aggregateSaveUiState({ busy: false, error: false, pending: false, unfinalized: false })).toBe('saved')
    expect(aggregateSaveUiState({ busy: false, error: false, pending: true, unfinalized: false })).toBe('dirty')
  })
})
