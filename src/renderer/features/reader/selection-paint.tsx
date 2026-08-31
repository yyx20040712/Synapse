/**
 * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1 修订；票面 §1a）。
 *
 * - 数据=SelectionLayer evaluate 产出的锚定 rects（mergeLineRects+mergeRects
 *   归并产物——与保存 rects 同源，「所见即所存」S2）；单层单绘：相邻行重叠
 *   输入经归并后两两分离，重叠处不再逐 span 叠深（native ::selection 的
 *   0.20×2≈0.36 加深缺陷根治——票面 §0a）。
 * - 色 rgba(0,0,0,0.20)：同修前观感（R2-F-10 灰 0.20 在案；白纸合成
 *   ≈#CCCCCC 可辨）。
 * - 渲染=React portal 进选区所在页盒：宿主取 .textLayer 父盒（与
 *   textLayer/AnnotationLayer 同 inset-0 同盒）——rects 归一化基准=
 *   pixelBoxOf(textLayer)，百分比数学与其严格同盒零换算；且页列
 *   `zoom: calc(1/var(--ui-scale))` 在档位≠1 时创建 stacking context，
 *   层必须与标注层同 context，z2 才位于 z5 标注 multiply 层之下
 *   （灰在黄下——R2-F-10 观感保持；渲染在挂载盒会被页列 sc 吞到标注之上）。
 * - 生命周期=选区生命周期（evaluate 置位/清除置空——INV-37 视觉-状态严格
 *   同步；Escape 只清工具条，层随选区真清除而消失）；pointer-events:none
 *   防吞划选手势。
 * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5）+
 *   selection-layer.test.tsx（F-A4 反转守卫）。
 */
import { createPortal } from 'react-dom'
import type { AnnotationRect } from '@shared/models/annotation'

/** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
const PAINT_BG = 'rgba(0, 0, 0, 0.20)'

export function SelectionPaint(props: {
  /** 选区所在页盒（[data-page-root]——portal 目标树的根） */
  root: HTMLElement
  /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
  rects: AnnotationRect[]
}): JSX.Element {
  const { root, rects } = props
  // 宿主=.textLayer 父盒（结构常量：textLayer 与标注层同挂该盒的 inset-0）；
  // 异常结构兜底=页盒自身（几何同页，不劣于缺层）
  const textLayer = root.querySelector('.textLayer')
  const host = textLayer?.parentElement ?? root
  return createPortal(
    <div
      data-testid="selection-rects"
      className="absolute inset-0"
      style={{ zIndex: 2, pointerEvents: 'none' }}
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
            background: PAINT_BG
          }}
        />
      ))}
    </div>,
    host
  )
}
