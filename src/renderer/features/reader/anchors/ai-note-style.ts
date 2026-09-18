// b3: P7-G
/**
 * ai-note-style —— 七问分色+中文标签+原始命题单源（INV-11 单源模式，
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

/** 七问原始命题单源（Q1~Q7 逐字誊自蓝图 §4.2 七问 schema 表「问题」列——
 *  docs/reports/2026-08-25_ai-sensor-blueprint.md:147-153，2026-08-28 复测三
 *  问题 P2 组头对号；divergence 无蓝图表原文故类型级不入（组头保持短标签）。 */
export const QUESTION_TEXT: Record<Exclude<AiNoteQuestion, 'divergence'>, string> = {
  Q1: '核心 idea 是什么',
  Q2: '对同行的价值（改变了认知方式？开创范式大幅加快计算？解决工程问题？）',
  Q3: '工程债务：失败数据未记录处、潜在试错点（ARA 叙事税的逆向重建）',
  Q4: '学术谱系：为什么是这个单位、这个学生/作者？师承何方、祖传资源积累',
  Q5: '全文哪个片段最符合自然科学品味（深刻≠复杂：可迁移/结构普遍/可交叉印证）',
  Q6: '未声明的局限与适用边界',
  Q7: '验证强度'
}

/** role 三组中文标签（组内条目分段标注——呈现轴转置 2026-08-28 缺陷 F：一审/二审/裁决） */
export const ROLE_LABEL: Record<AiNoteRole, string> = {
  'first-read': '一审',
  'second-read': '二审',
  adjudicate: '裁决'
}

/** role 呈现序（一审→二审→裁决；与 AI_NOTE_ROLES 枚举序一致） */
export const ROLE_ORDER: readonly AiNoteRole[] = AI_NOTE_ROLES
