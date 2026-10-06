/**
 * [F-UIRES-03 C2·P1] CardAnchorDots —— 画线锚点静态渲染层：每卡四边中点
 * （¼/½/¾ 槽位系统中的 ½ 位=slot1 几何位）各一圆点，直径 8 画布 px
 * （r=4——卡内 absolute div 圆点，随 .tl-content transform scale 随 zoom
 * 缩放）；fill=恒白（--accent-ink token 承载）+stroke 1.5 画布 px 主色。
 *
 * ── 显隐通道（CSS 单源——DOM 常驻零 JS 条件渲染）──
 * - tool=draw-solid/draw-dashed（armed，.tl-content.drawing）→ 全部卡显示；
 * - 非 armed → hover 中的卡显示（.tl-card:hover）。
 * 两支并集即任务书 P1 显示条件；可见性断言面=e2e（jsdom 不解析 CSS）。
 *
 * 边界：①pointer-events:none（不拦截卡点击/画线容器 pointer 流）；②判定面
 * 不动——可吸附锚仍是每卡 12 锚（routing/anchors slot 0/1/2），本层 4 中点
 * ⊂ 12 锚=可见 affordance 子集非判定边界（by design）；③与测量冻结期
 * （.tl-measure）无交集——锚层无过渡动画不参与冻结语义。
 */
/** 四边中点锚 side 集（与 routing/anchors Side 同源语义——静态层仅 ½ 位） */
const MID_SIDES = ['top', 'bottom', 'left', 'right'] as const

export function CardAnchorDots(): JSX.Element {
  return (
    <span className="card-anchors" aria-hidden="true">
      {MID_SIDES.map((side) => (
        <span className="card-anchor-dot" data-anchor-side={side} key={side} />
      ))}
    </span>
  )
}
