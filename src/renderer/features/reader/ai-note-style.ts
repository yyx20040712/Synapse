// b3: P7-G
/**
 * ai-note-style —— 七问分色+中文标签单源（INV-11 单源模式，
 * annotation-style 同族新模块）。
 *
 * 接缝双向锚定声明：消费方=AiNoteGroupList（08 分节）+AI-09 AI 标注渲染层
 * （同源消费，禁 09 另建映射）+LG-04 LineageSideAiNotes（脉络侧板跨域只读
 * 消费——check-quality COMPOSITION_ROOT_ALLOW 受控例外，映射单源不因跨域
 * 复写）。取色只允许 theme.css 变量（本映射为 question→theme.css 变量的
 * 唯一出处），禁止散落硬编码色值。
 */
import type { AiNoteQuestion, AiNoteRole } from '@shared/models/ai-note'
import { AI_NOTE_ROLES } from '@shared/models/ai-note'

/** 七问+divergence 分色（theme.css 变量单源映射） */
export const QUESTION_COLOR: Record<AiNoteQuestion, string> = {
  Q1: 'var(--annotation-yellow)',
  Q2: 'var(--annotation-green)',
  Q3: 'var(--annotation-blue)',
  Q4: 'var(--annotation-red)',
  Q5: 'var(--annotation-purple)',
  Q6: 'var(--accent)',
  Q7: 'var(--ok)',
  divergence: 'var(--danger)'
}

/** question 中文标签单源（Q1~Q7+divergence） */
export const QUESTION_LABEL: Record<AiNoteQuestion, string> = {
  Q1: '第一问',
  Q2: '第二问',
  Q3: '第三问',
  Q4: '第四问',
  Q5: '第五问',
  Q6: '第六问',
  Q7: '第七问',
  divergence: '分歧报告'
}

/** role 三组中文标签（分节呈现） */
export const ROLE_LABEL: Record<AiNoteRole, string> = {
  'first-read': '一读',
  'second-read': '二读',
  adjudicate: '裁决'
}

/** role 呈现序（一读→二读→裁决；与 AI_NOTE_ROLES 枚举序一致） */
export const ROLE_ORDER: readonly AiNoteRole[] = AI_NOTE_ROLES
