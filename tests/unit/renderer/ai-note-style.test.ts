/**
 * [SR2-AI-08] ai-note-style —— 七问分色+中文标签单源测试（锁定合约）。
 * INV-11 单源模式：全枚举覆盖+取色只允许 theme.css CSS 变量（禁散落硬编码色值）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { AI_NOTE_QUESTIONS, AI_NOTE_ROLES } from '../../../src/shared/models/ai-note'
import {
  QUESTION_COLOR,
  QUESTION_LABEL,
  QUESTION_TEXT,
  ROLE_LABEL,
  ROLE_ORDER
} from '../../../src/renderer/features/reader/ai-note-style'

describe('ai-note-style 七问分色单源', () => {
  it('八问全枚举覆盖：各持 CSS 变量取色+非空中文标签（无硬编码色值）', () => {
    expect(AI_NOTE_QUESTIONS).toHaveLength(8)
    for (const q of AI_NOTE_QUESTIONS) {
      expect(QUESTION_COLOR[q]).toMatch(/^var\(--/)
      expect(QUESTION_LABEL[q].length).toBeGreaterThan(0)
    }
    expect(QUESTION_LABEL.divergence).toBe('分歧报告')
  })

  it('七问原始命题：TEXT 恰七键（Q1~Q7）全非空（divergence 不入——蓝图 §4.2 schema 表誊录单源，SR2-AI-12）', () => {
    const seven = AI_NOTE_QUESTIONS.filter((q) => q !== 'divergence')
    expect(seven).toHaveLength(7)
    expect(Object.keys(QUESTION_TEXT).sort()).toEqual([...seven].sort())
    for (const q of seven) {
      expect(QUESTION_TEXT[q].length).toBeGreaterThan(0)
    }
  })

  it('role 三组中文标签+呈现序（一审/二审/裁决——SR2-AI-11 转置口径）', () => {
    expect(ROLE_ORDER).toEqual(AI_NOTE_ROLES)
    expect(ROLE_LABEL['first-read']).toBe('一审')
    expect(ROLE_LABEL['second-read']).toBe('二审')
    expect(ROLE_LABEL.adjudicate).toBe('裁决')
  })
})
