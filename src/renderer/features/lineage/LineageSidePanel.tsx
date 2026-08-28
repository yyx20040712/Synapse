// b3: P7-H
/**
 * LineageSidePanel —— 节点侧板详情+笔记双击跳阅读器
 *
 * ── 行为层 ──
 * - **节点单击=侧板**（蓝图 N3 字面）：元信息（title/year/paperId
 *   绑定态）+core_idea（只读呈现——编辑归 03 节点面）+**AI 笔记分节**
 *   （ai_notes/list per paper——role 三组中文标签×question 条目，
 *   **ai-note-style 分色单源复用**（AI-08 交付——本域禁复写映射，
 *   接缝双向锚定声明））+**人工笔记**（notes/get 总评层——C-03 数据
 *   面复用）；主题节点（paperId null）=仅 title/core_idea（无笔记面，
 *   空态文案「主题节点无笔记」）
 * - **笔记双击=跳阅读器**（N3：与 N1 共享 INV-20 单入口）：条目双击→
 *   ①paperId 经 OPEN_PAPER_EVENT 打开阅读器（C-06 总线先例——既有
 *   载荷=paperId 单字段）；②锚定位=阅读器侧消费（ReaderPage/阅读器
 *   既有定位面 locateAnchor——**AI 条目锚三元组传递链=全新接缝面**
 *   （门一 N7 校准：bus 既有载荷无锚字段、跨视图锚递达无先例——
 *   定位防 stale 守卫参照 anchor-locate.ts:122 locateSeq 同族思想）：
 *   侧板将 quote/prefix/suffix/anchorPage 经总线载荷扩或 store 信号
 *   递达（**实现形态票面不锁**——两路径均合法，接缝声明必须落两
 *   文件头注（本板+阅读器消费侧）；
 *   INV-20 三防线消费方级用例=页级/篇级降级路径覆盖）；**exact 层
 *   沿用 AI-09 延展**（data-ai-note-id 目标已就位零改动）
 * - 双击 vs 单击语义分界：节点单击=选中（03 onSelectNode 上抛→本板）；
 *   笔记条目双击=跳转（单击无操作——防误触，A_DR 先例族 dblclick）
 * - 数据单源（门一 W4 论证更正）：AI 笔记本板**直连 window.api
 *   ai_notes/list**——真实依据=**quality 关卡 renderer features 跨域
 *   互引红线**（ai-notes.store 属 reader 域，lineage 域 import 即违例；
 *   window.api 是 renderer 合法取数路径非「双取」）；语义面辅证=
 *   按需惰性取数（选中节点触发）与 08 面板挂载期轮询生命周期不同
 *   ——接缝声明入两文件头注（本板+ai-notes.store），review 复核此预裁
 *
 * ── 接口层 ──
 * - export function LineageSidePanel(props: { node: LineageNode | null;
 *     onJumpToPaper(payload: { paperId: string; anchor?: { quoteText:
 *     string; prefixText: string; suffixText: string; anchorPage: number |
 *     null } aiNoteId?: string } | null }): void }): JSX.Element（onJump
 *   上抛=LineagePage 编排总线发送——板不直发 bus（可测性+分层）；
 *   data-ticket 骨架标记翻 done 前移除）
 * - 交付面：LineageSidePanel.tsx+LineagePage 编排接线（bus 发送+阅读器
 *   侧消费接缝落地）
 *
 * ── 架构层 ──
 * - renderer/features/lineage 域；依赖 window.api（ai_notes/list+notes/
 *   get）+ai-note-style（跨域只读消费——quality 关卡跨域互引白名单
 *   组合根条款同型声明）+shared/open-paper-bus；禁 Node API/绝对路径
 *
 * ── 生命周期层 ──
 * - 预留：侧板固定/浮动形态；AI 笔记条目展开锚定原文上下文
 * - 不做：侧板内编辑（编辑归 03）；自动跳转（双击显式）；主题节点
 *   人工笔记面（无 paper 绑定无笔记域）
 *
 * ── 文化层 ──
 * - 错误：ai_notes/notes 取数失败=列表型瞬态（本板 error 呈现+重试
 *   ——INV-02）；空数据=空态文案非错误；跳转=动作型（失败 toast）
 * - 测试：tests/unit/renderer/lineage-side-panel.test.tsx [受锁新增]
 *   ——文献节点四区渲染（元信息/core idea/AI 分节分色类名/人工笔记）
 *   /主题节点空态/AI 条目双击→onJumpToPaper 载荷含锚三元组+aiNoteId/
 *   无锚条目→载荷 anchor 缺省（篇级防线）/单击不触发跳转/取数失败
 *   error+重试；**INV-20 消费方级用例**（跳转链路 mock 阅读器侧——
 *   页级降级路径）；**always-active**
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 data-ticket 与占位 → npm run verify 绿 → 人工审查
 *   git diff → 翻 registry
 *
 * ── 实现注（LG-04 交付）──
 * - 锚递达路径=**总线载荷扩（主控裁决路径 A）**：onJumpToPaper 载荷→
 *   LineagePage 调 requestOpenPaperAnchored（open-paper-bus 可选 anchor/
 *   aiNoteId 字段）→阅读器消费点 open-paper-anchor.ts→locateAnchor
 *   （INV-20 单入口：打开+等就绪+三防线全归它）。接缝三方头注锚定：
 *   本板+open-paper-bus+open-paper-anchor。
 * - 载荷构造单点在本板 handleNoteDblClick：anchorPage **1 基→0 基**
 *   （AiNotesSection:200 同型）；「无锚」判定=quoteText 不足 2 字符
 *   且 anchorPage null（locateAnchor paper 层阈值同源——页码在即保留
 *   anchor 走页级跳转，防回退第 0 页）。
 * - AI 分节分色=ai-note-style 单源跨域只读消费（LineageSideAiNotes
 *   白名单受控例外，check-quality COMPOSITION_ROOT_ALLOW 同型）；role
 *   分组逻辑在本域重写（Rule of Three 第 2 次保持重复——AiNoteGroupList
 *   属 reader 域不可引）。
 * - 人工笔记=notes/get 总评层只读呈现（LineageSideManualNote），无双击
 *   跳转（无锚语义下价值低——用户开篇路径已有阅读器入口，票面测试面
 *   仅 AI 条目）。
 * - node 数据源=LineagePage 经 lineage.store 查找分发（03 预留出口兑现
 *   ——store 数据消费合法，非双取）。
 */
import type { AiNote } from '@shared/models/ai-note'
import type { LineageNode } from '@shared/models/lineage'
import { LineageSideAiNotes } from './LineageSideAiNotes'
import { LineageSideManualNote } from './LineageSideManualNote'

/** 锚存在判定（quote 不足 2 字符且无页码=无锚——locateAnchor 验证阈值同源） */
function hasAnchor(n: AiNote): boolean {
  return n.quoteText.length >= 2 || n.anchorPage !== null
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
    }
    aiNoteId?: string
  } | null): void
}): JSX.Element {
  const { node } = props
  if (node === null) {
    return (
      <div

        data-testid="lineage-side-panel"
        className="flex h-full items-center justify-center p-4 text-center text-xs"
        style={{ color: 'var(--text-dim)' }}
      >
        单击节点查看详情
      </div>
    )
  }

  /** AI 条目双击→跳转载荷（构造单点：三元组透传+1 基→0 基；无锚=anchor 缺省） */
  const handleNoteDblClick = (n: AiNote): void => {
    if (node.paperId === null) return
    const anchor = hasAnchor(n)
      ? {
          quoteText: n.quoteText,
          prefixText: n.prefixText,
          suffixText: n.suffixText,
          anchorPage: n.anchorPage === null ? null : n.anchorPage - 1
        }
      : undefined
    props.onJumpToPaper({ paperId: n.paperId, anchor, aiNoteId: n.id })
  }

  return (
    <div

      data-testid="lineage-side-panel"
      className="flex h-full flex-col gap-2 overflow-auto p-2 text-xs"
    >
      <section data-testid="lineage-side-meta" data-binding={node.paperId === null ? 'theme' : 'paper'}>
        <h3 className="m-0 text-sm font-medium" style={{ color: 'var(--text)' }}>
          {node.title}
        </h3>
        <p className="m-0" style={{ color: 'var(--text-dim)' }}>
          {node.year === null ? '未知年份' : `${node.year} 年`}
          {node.paperId !== null && <span className="ml-1 rounded border px-1" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>已绑定文献</span>}
        </p>
      </section>
      <section data-testid="lineage-side-idea">
        <h4 className="m-0 font-medium" style={{ color: 'var(--text-dim)' }}>核心 idea</h4>
        <p className="m-0 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
          {node.coreIdea === '' ? '（未填写）' : node.coreIdea}
        </p>
      </section>
      {node.paperId === null ? (
        <p className="m-0" style={{ color: 'var(--text-dim)' }}>主题节点无笔记</p>
      ) : (
        <>
          <LineageSideAiNotes paperId={node.paperId} onNoteDblClick={handleNoteDblClick} />
          <LineageSideManualNote paperId={node.paperId} />
        </>
      )}
    </div>
  )
}
