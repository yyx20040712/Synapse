// b3: P7-H
/**
 * LineageNightDecor —— 星象板装饰层（R2-LG9 拆件：LineageCanvas 组件
 * ≤250 行红线）。
 *
 * - 星空三层：细星/亮星平铺（theme.css .lineage-stars/.lineage-stars2）
 *   +✦ 四芒星少量精放（.lineage-sparks——绝对定位）。
 * - 边型图例（实链/推断两型——静态说明非交互件，.lineage-legend）。
 * - **装饰层纪律（设计定稿注意事项 ⑥）**：全部 data-night-decor+
 *   aria-hidden+pointer-events:none（CSS 类内声明）——不参与布局与
 *   命中测试，pan 落点穿透直达 panbg。
 */
export function LineageNightDecor(): JSX.Element {
  return (
    <>
      <div className="lineage-stars" data-night-decor aria-hidden="true" />
      <div className="lineage-stars2" data-night-decor aria-hidden="true" />
      <div className="lineage-sparks" data-night-decor aria-hidden="true">
        <span style={{ left: '14%', top: '15%' }}>✦</span>
        <span style={{ left: '72%', top: '11%', fontSize: '8px' }}>✦</span>
        <span style={{ left: '84%', top: '52%', fontSize: '9px' }}>✦</span>
        <span style={{ left: '20%', top: '82%', fontSize: '8px' }}>✦</span>
      </div>
      <div className="lineage-legend" data-night-decor aria-hidden="true">
        <span className="lineage-legend-item">
          <i />实链
        </span>
        <span className="lineage-legend-item">
          <i className="dash" />
          推断（谱系/平行）
        </span>
      </div>
    </>
  )
}
