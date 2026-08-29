// b3: P7-H
/**
 * LineageLegend —— 边型图例（R2-LG11 浅色严谨板；LineageNightDecor
 * 删除后的替代件——装饰层纪律沿用：data-legend+aria-hidden+
 * pointer-events:none（CSS 类内声明），不参与布局与命中测试，pan 落点
 * 穿透直达 panbg）。
 *
 * 四项（§1.1.1）：①深青蓝实线粗=核心文献 ②浅灰蓝实线=普通文献
 * ③浅灰蓝虚线=主题分组 ④淡灰虚线=综述关联——线型样式归 theme.css
 * .lineage-legend 族（i 修饰类），本件只排真实文本（测试断言面）。
 */
export function LineageLegend(): JSX.Element {
  return (
    <div className="lineage-legend" data-legend aria-hidden="true">
      <span className="lineage-legend-item">
        <i className="lg-core" />
        核心文献
      </span>
      <span className="lineage-legend-item">
        <i className="lg-normal" />
        普通文献
      </span>
      <span className="lineage-legend-item">
        <i className="lg-theme" />
        主题分组
      </span>
      <span className="lineage-legend-item">
        <i className="lg-survey" />
        综述关联
      </span>
    </div>
  )
}
