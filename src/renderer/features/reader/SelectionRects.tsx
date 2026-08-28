/**
 * [F-07 增补] SelectionRects —— 划选自绘选区块（::selection 透明化后的视觉反馈）
 *
 * 容器=选区所在页 .textLayer 盒（anchor.rects 归一化参照系）经两盒
 * getBoundingClientRect 差值换算到挂载盒（SelectionLayer evaluate 产出，
 * 数学同工具条定位）；rect 块用 AnnotationLayer 同型百分比数学（单层单绘
 * ——重叠 span 不逐元素叠加深）。层叠序/pointer-events/禁 multiply 的完整
 * 推演登记在 SelectionLayer.tsx 头注 F-07（挂载位所有者）——本层 z-index:2
 * （.textLayer z0 之上、标注/AI 层 z5 之下），pointer-events:none 防吞
 * 划选手势；rect 背景自带 alpha（30% accent——黑字透出可读），容器禁
 * mixBlendMode（与标注层 backdrop 相乘=层间叠乘加深）。
 * 组件测试：tests/unit/renderer/selection-layer.test.tsx（经 SelectionLayer
 * 挂载面断言，无独立测试文件）。
 */
import type { AnnotationRect } from '@shared/models/annotation'

/** 自绘选区容器盒（textLayer 盒换算到挂载盒的像素几何） */
export interface SelectionOverlayBox {
  left: number
  top: number
  width: number
  height: number
}

export function SelectionRects(props: {
  overlay: SelectionOverlayBox
  rects: AnnotationRect[]
}): JSX.Element {
  const { overlay, rects } = props
  return (
    <div
      data-testid="selection-rects"
      className="absolute"
      style={{
        left: overlay.left,
        top: overlay.top,
        width: overlay.width,
        height: overlay.height,
        zIndex: 2,
        pointerEvents: 'none'
      }}
    >
      {rects.map((r, i) => (
        <div
          key={i}
          data-testid="selection-rect"
          className="absolute"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
            background: 'color-mix(in srgb, var(--accent) 30%, transparent)'
          }}
        />
      ))}
    </div>
  )
}
