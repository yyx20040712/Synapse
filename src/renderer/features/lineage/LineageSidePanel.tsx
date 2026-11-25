// b3: P7-H
/**
 * [F-LGRAPH-01②U4/A5] LineageSidePanel —— 右侧常驻详情面板（宽 252；P-16
 * 常驻不收——点空白保持占位）+片段双击跳阅读器。
 *
 * ── 行为层（②批 A5 收编重整；[F-UIRES-03 B2] 三节新序）──
 * - **详情域收编**：完整题名/期刊缩写/IF/被引/年月/星标域（[F-STAR-01 A4]
 *   点亮=交互 toggle；主题节点零渲染）+底部注记。三字段可选省略（缺席整行
 *   省略——卡 L3 同源，无第二数据路径）。
 * - **core 徽章退役**（行 9）+「已绑定文献」域随行 9 收编：主题节点=
 *   「主题节点」域标识，文献节点=期刊/IF/被引域隐式承载绑定态。
 * - **空选中态**（P-16 常驻栏位）：[B5 设计稿 §3.5/§11.4——wave C 2026-11-25 断言翻转] 原「点击卡片
 *   查看详情」教学占位文案删除——面板根仍挂载（常驻栏位形态保持）、零可见教学文字；三模式点卡联动（P-13）
 *   编排归 Page（selectedNodeId 单源）。
 * - **[F-UIRES-03 B5① v1.15②裁决] 头部操作行**：「去文献库/去阅读器」两钮
 *   自卡面迁移至此（hover-only 键盘不可达挂账随迁移消解）——
 *   位置=标题/编号/徽章行下方一行两钮并排文字钮形；驻头部区不随内容滚动消失。
 *   主题节点（paperId null）沿 C3 态：「去阅读器」零渲染+「去文献库」在场
 *   （paperId=null 通道支持——编排层不置选中）；载荷签名沿卡面版。
 * - **笔记三节新序**（B2：node.paperId 非 null 时渲染，DOM 序即此序）：
 *   ①全文笔记（LineageSideManualNote——原「人工笔记」更名）→
 *   ②片段笔记（LineageSideFragments——B2 新立）→③AI 评估与建议
 *   （LineageSideAiNotes——原 AI 节更名+双击链退役，纯展示；
 *   后置占位章随真节替代整删——B4 范围裁决终结）；核心想法/标签两节已在
 *   先批退役（A3/A1b）。[A1b F-CONTRACTA-01] 标签唯一源=文献库域沿承。
 * - **片段双击=跳阅读器**（N3/INV-20 单入口——B2 后全应用唯一保留双击链；
 *   AI 条目双击链退役）。跳转载荷构造单点=handleFragmentDblClick
 *   （anchorPage=Annotation.page 0 基直传，禁 ±1 换算；锚三元组与
 *   open-paper-bus/open-paper-anchor 三方头注锚定不变）。[F-LOCATE-01]
 *   anchor 增 annotationId=Annotation.id——元素级停驻恢复锚。
 * - 数据单源：AI 评估/片段两分节直连 window.api（quality 跨域互引红线
 *   ——reader 域组件/store 不可引；接缝声明见各分节头注）。
 * - [F-UIRES-04 批 3a] 拆件瘦身：骑缝行/星标→SideCapRow（原收起钮与 onCollapse prop 随
 *   [B5 §3.4] 退役——侧栏开关迁工具栏 LineagePaneToggles）、徽章行→
 *   SideBadges（行为零变搬移，e2e 锚 testid 一字不动；主题节点分支/编排
 *   留宿主——设计书 §4.2 弃候选二理由沿承）。
 * - [F-UIRES-04 批 3b] 两挂载点（§4.1 DOM 序）：头部徽章行后 TagsRow（§4.6
 *   D5）/滚动区首件 SidePaperInfo（§4.7 信息区）——两件自持订阅取数，宿主
 *   零 hooks；主题节点（paperId null）零渲染（§4.6 字面）。
 */
import type { CSSProperties } from 'react'
import type { Annotation } from '@shared/models/annotation'
import { MAIN_GRAPH_ID, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { SideBadges } from './SideBadges'
import { SideCapRow } from './SideCapRow'
import { TagsRow } from './TagsRow'
import { SidePaperInfo } from './SidePaperInfo'
import { DrCitation } from '../library/DrCitation'
import { LineageSideAiNotes } from './LineageSideAiNotes'
import { LineageSideFragments } from './LineageSideFragments'
import { LineageSideManualNote } from './LineageSideManualNote'

/** 白玻璃卡（R2-LG11 浅色严谨板——沿承） */
const SIDE_GLASS: CSSProperties = {
  background: 'var(--panel-a92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-2)'
}

export function LineageSidePanel(props: {
  node: LineageNode | null
  onJumpToPaper(payload: {
    paperId: string
    anchor?: {
      quoteText: string
      prefixText: string
      suffixText: string
      anchorPage: number | null
      /** [F-LOCATE-01] 元素级停驻恢复锚（Annotation.id——exact 层滚动目标） */
      annotationId?: string
    }
  } | null): void
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo?: number | null
  /** [T3-P8→②U4 退役] core 徽章消费面已随行 9 退役（prop 删除——数据面留） */
  /** 含金量摘要（[②U4] 扩 venue/impactFactor——卡 L3 同源单路径） */
  metrics?: LineagePaperMetrics | null
  /** [F-UIRES-03 B5①] 操作行「去文献库」钮（卡面版签名沿承——编排归 Page：
   *  library.store 预置+requestOpenLibrary；folderId=node.folderId 单源） */
  onGotoLibrary?: (paperId: string | null, folderId: string) => void
  /** [F-UIRES-03 B5①] 操作行「去阅读器」钮（paperId 在场才渲染——主题节点零渲染；
   *  编排归 Page：requestOpenPaper 单字段开篇语义） */
  onGotoReader?: (paperId: string) => void
  /** [F-DBCAMP-01 DB-4 / F-STAR-01 A4] 星标切换（lineage.store toggleNodeStar
   *  收口链——Page 注入；载荷=节点快照三元组）；缺席=点击 no-op（title 在场性
   *  锚兼容——锁测直挂无回调面） */
  onToggleStar?: (node: { id: string; paperId: string; isStarred?: boolean }) => void
}): JSX.Element {
  const { node } = props
  if (node === null) {
    // [B5 §3.5] 空选中态=面板根仍挂载（P-16 常驻栏位），零可见教学文字（原「点击卡片查看详情」占位删除）
    return (
      <div
        data-testid="lineage-side-panel"
        className="lg-inspector h-full"
        style={{ ...SIDE_GLASS, width: '100%' }}
      />
    )
  }

  /** [B5①] 操作行「去阅读器」钮的 paperId 捕获（const 局部——条件窄化可跨
   *  回调闭包传播；JSX 属性访问窄化不跨闭包 TS2345——卡面版先例沿承） */
  const readerPid = node.paperId

  /** 片段条目双击→跳转载荷（构造单点：锚三元组透传+anchorPage 0 基直传——
   *  Annotation.page 已 0 基，禁任何 ±1 换算；OutlineAside.locateFragment 同口径） */
  const handleFragmentDblClick = (a: Annotation): void => {
    if (node.paperId === null) return
    props.onJumpToPaper({
      paperId: a.paperId,
      anchor: {
        quoteText: a.quoteText,
        prefixText: a.prefixText,
        suffixText: a.suffixText,
        anchorPage: a.page,
        annotationId: a.id
      }
    })
  }

  return (
    <div
      data-testid="lineage-side-panel"
      className="lg-inspector flex h-full flex-col gap-2 p-3.5 text-xs"
      style={{ ...SIDE_GLASS, width: '100%' }}
    >
      {/* [B5①] 头部区（shrink-0 驻留——操作行不随内容滚动消失） */}
      <section
        className="shrink-0"
        data-testid="lineage-side-meta"
        data-binding={node.paperId === null ? 'theme' : 'paper'}
      >
        {/* [F-UIRES-04 批 3a] 骑缝行/星标（原 insp-cap 块搬移→SideCapRow；收起钮随 B5 §3.4 退役） */}
        <SideCapRow node={node} pubNo={props.pubNo} onToggleStar={props.onToggleStar} />
        <div className="insp-title">{node.title}</div>
        {/* [②U4] 详情域徽章：期刊/IF/被引/年月/T 档（原 badges 块零变搬移→SideBadges） */}
        <SideBadges node={node} metrics={props.metrics} />
        {/* [F-UIRES-04 批 3b] 标签行（§4.6 D5：徽章行后操作行前；空标签整行
            省略——TagsRow 自持订阅；主题节点零渲染） */}
        {node.paperId !== null && <TagsRow />}
        {/* [F-UIRES-03 B5① v1.15 第五轮②] 头部操作行（两钮自卡面迁移——徽章行
            下两钮并排文字钮形；常驻非 hover；testid 沿卡面版不改名=迁移面 e2e
            改写最小。哨兵单源：title 判=MAIN_GRAPH_ID 常量——与 LineagePage
            编排分支同源〔RR1-A 先例沿承〕） */}
        <div className="side-jumps">
          <button
            type="button"
            className="s-jump"
            data-testid="card-goto-library"
            title={node.folderId === MAIN_GRAPH_ID ? '在文献库打开（未归文件夹——全库视图）' : '在文献库打开所在文件夹并定位'}
            onClick={() => {
              props.onGotoLibrary?.(node.paperId, node.folderId)
            }}
          >
            去文献库
          </button>
          {readerPid !== null && (
            <button
              type="button"
              className="s-jump"
              data-testid="card-goto-reader"
              title="在阅读器打开（开篇）"
              onClick={() => {
                props.onGotoReader?.(readerPid)
              }}
            >
              去阅读器
            </button>
          )}
        </div>
        {node.paperId === null && (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>
            主题节点（无文献绑定）
          </p>
        )}
      </section>
      {/* [B5①] 笔记区滚动层（头部固定+内容滚动的分区承载——操作行不随滚走） */}
      <div className="insp-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {/* [A3 F-CONTRACTA-01 2026-10-04] 核心 idea 区随核心想法域全退役删除
            （「核心想法」语义由全文笔记 notes.contentMd 承接——原
            lineage-side-idea 区/testid 消亡） */}
        {node.paperId === null ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>主题节点无笔记</p>
        ) : (
          <>
            {/* [F-UIRES-04 批 3b] 论文信息区（§4.1 滚动区 DOM 序首件——与笔记
                区同滚动承载；SidePaperInfo 自持 M1×M2 双机扇出） */}
            <SidePaperInfo paperId={node.paperId} />
            {/* [B3] 引用分节（三格式切换+预览+复制）：结构等价位=信息区之后
                笔记节之前（库域「元数据→引用」同序；节头沿脉络域 h4 语汇——
                标签节驻头部区，引用随可滚内容承载；共用件=library/DrCitation
                经 check-quality 白名单受控例外） */}
            <section data-testid="lineage-side-citation" className="flex flex-col gap-1">
              <h4
                className="m-0 pl-1.5 font-medium"
                style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)' }}
              >
                引用
              </h4>
              <DrCitation paperId={node.paperId} />
            </section>
            {/* [F-UIRES-03 B2] 三节新序（DOM 序即此序）：全文笔记→片段笔记→
                AI 评估与建议；后置占位章随③真节替代整删（B4 裁决终结） */}
            <LineageSideManualNote paperId={node.paperId} />
            <LineageSideFragments paperId={node.paperId} onFragmentDblClick={handleFragmentDblClick} />
            <LineageSideAiNotes paperId={node.paperId} />
          </>
        )}
        {/* [B5 设计稿 §3.5 文案删除 3——wave C 2026-11-25] 底部注记「编辑模式：调序 / 画线 / 调线」
            （纯操作教学文案）连同 .insp-foot 脚注行整体删除；面板底部=真实笔记/元数据区。 */}
      </div>
    </div>
  )
}
