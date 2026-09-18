/**
 * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1/R2 修订；票面 §1a）。
 *
 * - 数据=SelectionLayer evaluate 产出的锚定 rects（mergeLineRects+mergeRects
 *   归并产物——与保存 rects 同源，「所见即所存」S2）；单层单绘：相邻行重叠
 *   输入经归并后两两分离，重叠处不再逐 span 叠深（native ::selection 的
 *   0.20×2≈0.36 加深缺陷根治）。
 * - 色 rgba(0,0,0,0.20)：同修前观感（R2-F-10 灰 0.20 在案；白纸合成
 *   ≈#CCCCCC 可辨）。
 * - [F-A5 a 面] 块几何=行簇字形带单源（[F-GEOM-01-G3] 勘正：RowBand 按
 *   档绑定（INV-68）——selection 产链喂档1 bandsFromItems 校准版/档2
 *   bandsForTextNodes 显示回退；band 匹配=matchBand，与标注层渲染同基准）：
 *   垂直=band（顶贴字形顶/底贴底缘——修前
 *   CSS 回退行盒在小字号文档上 1.5~2 倍行高、上下溢出约半行，真机基线
 *   1.57~1.83× 在档）；水平=行簇 span 实际端点夹取（clampedHorizontal
 *   ——修前行盒越出文字区）。band 缺席（jsdom/量测退化）→ 行盒原样
 *   （缺省兼容）。
 * - 渲染=React portal 进选区所在页盒：宿主取 .textLayer 父盒（与
 *   textLayer/AnnotationLayer 同 inset-0 同盒）——rects 归一化基准=
 *   pixelBoxOf(textLayer)，百分比数学与其严格同盒零换算；且页列
 *   `zoom: calc(1/var(--ui-scale))` 在档位≠1 时创建 stacking context，
 *   层必须与色块层同 context。
 * - [F-A5 c 面/ADR-0019 R2] z=PAGE_LAYER_Z.selectionPaint（3）——页内
 *   层序单源：色块背景板(1) < canvas 墨带(2) < 自绘选区(3)（选区交互视觉
 *   保持最上，票面 §0c/S4 灰块视觉在色块上）。
 * - 生命周期=选区生命周期（evaluate 置位/清除置空——INV-37 视觉-状态严格
 *   同步；Escape 只清工具条，层随选区真清除而消失）；pointer-events:none
 *   防吞划选手势。
 * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5+F-A5 段
 *   a1/a2/c1/c2）+selection-layer.test.tsx（F-A4 反转守卫）。
 */
import { memo } from 'react'
import { createPortal } from 'react-dom'
import type { AnnotationRect } from '@shared/models/annotation'
import { matchBand, type RowBand } from './annotation-resolve'
import { bandVertical, clampedHorizontal } from './annotation-style'
import { PAGE_LAYER_Z } from './page-layer-z'

/** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
const PAINT_BG = 'var(--reader-selection-paint)'

/** [F-A6-c] React.memo+props 稳定化（设计书 §3.3 次因面收敛）：root/rects/bands
 *  均来自 SelectionLayer 的 paint 状态对象——仅在 setPaint 时更换引用，组件
 *  其余状态更新（pending/busy/color/zoom 订阅）不再重渲染 portal 全子树；
 *  拖选期帧产物由快路径整对象更换（引用变=重渲染，值同=跳过） */
export const SelectionPaint = memo(function SelectionPaint(props: {
  /** 选区所在页盒（[data-page-root]——portal 目标树的根） */
  root: HTMLElement
  /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
  rects: AnnotationRect[]
  /** 行簇字形带（[F-A5]——缺省=行盒原样回退）。[F-GEOM-01-G3] 档位勘正：
   *  selection 产链实际喂入档1 校准版（calibrateBandsWithSpans(item.bands)）或
   *  档2 显示回退产物；bandsNearRects=档3、真实消费仅 AnnotationLayer S3b（INV-68） */
  bands?: RowBand[]
}): JSX.Element {
  const { root, rects, bands } = props
  // 宿主=.textLayer 父盒（结构常量：textLayer 与标注层同挂该盒的 inset-0）；
  // 异常结构兜底=页盒自身（几何同页，不劣于缺层）
  const textLayer = root.querySelector('.textLayer')
  const host = textLayer?.parentElement ?? root
  return createPortal(
    <div
      data-testid="selection-rects"
      className="absolute inset-0"
      style={{ zIndex: PAGE_LAYER_Z.selectionPaint, pointerEvents: 'none' }}
    >
      {rects.map((r, i) => {
        // [F-A5 a] 同一 matchBand 匹配键（最近中心带）——与标注层渲染同基准
        const band = matchBand(bands, r)
        const vertical = band !== undefined ? bandVertical(band) : { top: `${r.y * 100}%`, height: `${r.h * 100}%` }
        const horizontal = band !== undefined ? clampedHorizontal(r, band) : { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
        return (
          <div
            key={i}
            data-testid="selection-rect"
            className="absolute"
            style={{
              ...horizontal,
              ...vertical,
              background: PAINT_BG
            }}
          />
        )
      })}
    </div>,
    host
  )
})
