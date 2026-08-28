/**
 * [F-07 增补] SelectionToolbar —— 划选确认工具条（自 SelectionLayer 拆出——
 * renderer 组件 250 行上限强制；DOM 形状/testid/交互零变化）
 *
 * - 定位=SelectionLayer evaluate 产出的挂载盒相对落点（props.x/y 透传）；
 *   z-10=层叠序最顶（完整推演见 SelectionLayer.tsx 头注 F-07）
 * - 容器 mousedown 阻止默认（防抢焦点/坍缩选区）——按钮 click 才是动作语义；
 *   containerRef 由 SelectionLayer 持有（mouseup 命中工具条时不评估选区）
 * - 颜色按钮=per-tab 选择器状态（props.color/onColor——useReaderStore 订阅
 *   留驻 SelectionLayer，本组件纯展示+上抛）；KIND_LABEL 按钮映射单源随迁
 * - 组件测试：tests/unit/renderer/selection-layer.test.tsx（经 SelectionLayer
 *   挂载面断言，无独立测试文件）
 */
import type { MutableRefObject } from 'react'
import type { AnnotationColor, AnnotationKind } from '@shared/models/annotation'
import { ANNOTATION_COLORS } from '@shared/constants'
import { COLOR_LABEL, COLOR_SWATCH } from './annotation-style'

/** 工具条三种动作（kind→中文文案——按钮 map 单源） */
const KIND_LABEL: Record<AnnotationKind, string> = { highlight: '高亮', underline: '下划线', note: '备注' }

export function SelectionToolbar(props: {
  containerRef: MutableRefObject<HTMLDivElement | null>
  x: number
  y: number
  busy: boolean
  color: AnnotationColor
  onColor: (c: AnnotationColor) => void
  onSave: (kind: AnnotationKind) => void
}): JSX.Element {
  const { containerRef, x, y, busy, color, onColor, onSave } = props
  const btn = 'rounded border px-2 py-0.5 disabled:opacity-50'
  return (
    <div
      ref={containerRef}
      data-testid="selection-toolbar"
      className="absolute z-10 flex items-center gap-1 rounded border px-1.5 py-1 text-xs"
      style={{
        left: x,
        top: y,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
      // 阻止 mousedown 抢焦点/坍缩选区：按钮 click 才是动作语义
      onMouseDown={(e) => e.preventDefault()}
    >
      {ANNOTATION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`标注色：${COLOR_LABEL[c]}`}
          aria-pressed={color === c}
          className="h-4 w-4 rounded-full border"
          style={{
            background: COLOR_SWATCH[c],
            borderColor: color === c ? 'var(--text)' : 'var(--border)'
          }}
          onClick={() => onColor(c)}
        />
      ))}
      <span className="mx-0.5 inline-block h-3 w-px" style={{ background: 'var(--border)' }} />
      {(Object.keys(KIND_LABEL) as AnnotationKind[]).map((k) => (
        <button
          key={k}
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          disabled={busy}
          onClick={() => onSave(k)}
        >
          {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  )
}
