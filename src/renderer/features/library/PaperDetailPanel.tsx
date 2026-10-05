// b3: P7-C
/**
 * [SR2-C-06] PaperDetailPanel —— 规格表抽屉（T3-P3 渲染壳重制：316px
 * .lib-drawer 语汇——数据面/动作面语义全保；库侧笔记编辑面维持下线态）
 *
 * ── 行为层 ──
 * - 头区：.lib-dr-id 行（左=短号 id 前 8 位+…，右=入库状态点「● 文案」——
 *   enrich 态映射色：failed=signal「增强失败」/pending=faint「待增强」/
 *   done=ok「已入库」/manual=ok「手动维护」[自裁：manual 沿 done 色档]）
 *   +.lib-dr-title 14px/600/1.6 行高
 * - 四格指标=DrMetrics 拆件（引用/通读/标注/笔记——真文本）
 * - 键值行：YEAR-MO（年份+脉络框括注——lineage 命中时）/VENUE/DOI（link 色）
 * - 「标 签」节=TagEditor 驻留（key=detail.id 重挂竞态守卫不动）——onChanged
 *   除 bump reloadKey 重拉详情外，追加 library.store.load 列表刷新
 *   （F-LIBUI-01 ③：表格标签列不滞旧——FilterBar onMutated 同一条刷新链）
 * - 「关 联」节已退役（F-LIBUI-01 ⑤：脉络行+AI 评估行删，节位留待
 *   F-FOLDER-01 改造为文件夹行——显示归属+移动入口）
 * - 动作面九钮全保、按钮文本零改（受锁 paper-detail-export/clip/cited/
 *   notes-off 断言面）：「去阅读器写笔记」=primary（首行跨两列），其余 ghost
 * - 空态/加载态/错误行/「详情刷新失败」降级语义原样保面（DiamondRule 库域
 *   退役——简文案居中，settings 域消费保留）
 *
 * ── 接口层 ──
 * - export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element（签名不变）
 *
 * ── 架构层 ──
 * - 改动面：本文件+DrMetrics.tsx（拆件）/library.css（皮肤段）；
 *   usePaperDetailActions hook 面零触碰（busy 门+toast 收口不动）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - notes feature 剩 notes.store.ts；编辑面唯一归阅读器侧栏（C-03/04）
 * - 验收：paper-detail-export/clip/cited/notes-off 受锁面+paper-detail-drawer
 *   新件全绿（tests/unit/renderer/）
 */
import { useEffect, useState } from 'react'
import type { EnrichStatus, PaperDetail } from '@shared/models/paper'
import { api, unwrap } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { RetryButton } from '../../shared/ui/RetryButton'
import { TagEditor } from '../tags/TagEditor'
import { DrActions } from './DrActions'
import { DrMetrics } from './DrMetrics'
import { MetaEditDialog } from './MetaEditDialog'
import { useLibraryStore } from './library.store'
import { usePaperDetailActions } from './usePaperDetailActions'

/** 入库状态点：enrich 态映射（文案/色档——manual 沿 done 的 ok 色档） */
const DR_STATUS: Record<EnrichStatus, { text: string; cls: string }> = {
  pending: { text: '待增强', cls: 'lib-dr-status-faint' },
  done: { text: '已入库', cls: 'lib-dr-status-ok' },
  manual: { text: '手动维护', cls: 'lib-dr-status-ok' },
  failed: { text: '增强失败', cls: 'lib-dr-status-signal' }
}

/** 短号：id 前 8 位+…（≤8 位整串——mono 规格表语汇） */
function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

/** [F-UIRES-03 B4②] YEAR-MO 值四分支：无脉络=年份单值；命中=「2023（脉络框：
 * 2023-06）」式——month 补零（6→06）/month null=仅年无月段（「未定月」措辞
 * 退役）/lineage.year null=「未定年」+月段省略（措辞沿用） */
function yearMoText(detail: PaperDetail): string {
  const y = detail.year === null ? '—' : String(detail.year)
  if (detail.lineage === undefined) return y
  const ly = detail.lineage.year === null ? '未定年' : String(detail.lineage.year)
  const mo =
    detail.lineage.year === null || detail.lineage.month === null
      ? ''
      : `-${String(detail.lineage.month).padStart(2, '0')}`
  return `${y}（脉络框：${ly}${mo}）`
}

export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element {
  const { paperId } = props
  // 元数据/标签变更后 bump 触发重读（TagEditor onChanged 亦走这里）
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState(false)
  // F-LIBUI-01 ③：标签变更联动列表刷新（沿 FilterBar onMutated 同一条
  // library.store 刷新链——不造第二套 store 通道）
  const loadLibrary = useLibraryStore((s) => s.load)

  const { data: fetched, error, run } = useAsync(
    () => (paperId === null ? Promise.resolve(null) : unwrap(api.library.detail({ paperId }))),
    [paperId, reloadKey]
  )
  // P7E-05 收口守卫：重读期不显示旧文献（stale detail 竞态根治——tag-lifecycle
  // e2e 两现实录：切文献后 useAsync 返回前 detail 延续旧值，TagEditor 挂接点
  // key=旧 id 不重挂，Enter 落进窗口即挂错文献；id 不匹配置 null 走既有
  // loading 态，消费面（动作 hook/编辑框/TagEditor）一律拿不到 stale 数据）
  const detail = fetched !== null && fetched.id === paperId ? fetched : null
  // run 是恒稳定引用，paperId/reloadKey 变化必须在这里触发重取
  // （useAsync 的 deps 只做快照不自动执行，漏列即详情永不更新）
  useEffect(() => {
    void run()
  }, [run, paperId, reloadKey])

  // P7E-04 拆件：动作逻辑（busy 门+invoke+toast）整体驻 hook，面板只保留按钮
  const { enriching, exporting, runAction } = usePaperDetailActions(detail, () =>
    setReloadKey((k) => k + 1)
  )

  if (paperId === null) {
    // T3-P3：DiamondRule 库域退役——简文案居中（文案逐字保留）
    return <div className="lib-dr-empty">选中列表中的文献后显示详情</div>
  }
  if (detail === null) {
    if (error !== null) {
      return (
        <div
          className="m-3 flex items-center justify-between rounded border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          role="alert"
        >
          <span>{`加载详情失败：${error}`}</span>
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton */}
          <RetryButton onClick={() => void run()} />
        </div>
      )
    }
    return (
      <div className="p-6 text-xs" style={{ color: 'var(--text-dim)' }}>
        正在加载详情…
      </div>
    )
  }

  const status = DR_STATUS[detail.enrichStatus]
  // [F-FOLDER-01] 短号同源：入脉络→「·」+三位零填充 pubNo（INV-92 库级派生
  // ——与列表序号列/导出 lineage.json pub_no 同一编号源；[F-UIRES-03 B4①]
  // # 前缀→· U+00B7）；未入脉络→id 前 8 位短号现状零动（编号呈现面细化=
  // F-FOLDER-02 票面）
  const idBadge =
    detail.lineage !== undefined
      ? // ?? 0=防御注记（回炉 N5）：pubNo 由 DETAIL_SQL 窗口恒携（detailById
        // 单源装配），lineage 在场蕴含 pubNo 在场——0 兜底为不可达路径防崩
        `·${String(detail.pubNo ?? 0).padStart(3, '0')}`
      : shortId(detail.id)
  return (
    <div className="lib-dr">
      {error !== null && (
        <div
          className="flex items-center justify-between rounded border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          role="alert"
        >
          <span>详情刷新失败，显示的是旧数据</span>
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton */}
          <RetryButton onClick={() => void run()} />
        </div>
      )}
      <div className="lib-dr-head">
        <div className="lib-dr-id">
          <span>{idBadge}</span>
          <span className={status.cls}>{`● ${status.text}`}</span>
        </div>
        <h2 className="lib-dr-title">{detail.title}</h2>
      </div>
      <DrMetrics detail={detail} />
      <div className="lib-dr-body">
        <div className="lib-fld">
          <span className="lib-fld-k">YEAR-MO</span>
          <span className="lib-fld-v">{yearMoText(detail)}</span>
        </div>
        <div className="lib-fld">
          <span className="lib-fld-k">VENUE</span>
          <span className="lib-fld-v">
            {detail.venue === '' ? '—' : detail.venue}
            {/* [F-FOLDER-02·D] IF 灰字随期刊名显示（D1 手动字段——色档与主值分离） */}
            {detail.impactFactor !== null && (
              <span style={{ color: 'var(--text-dim)' }}>{` · IF ${detail.impactFactor}`}</span>
            )}
          </span>
        </div>
        <div className="lib-fld">
          <span className="lib-fld-k">DOI</span>
          <span className={`lib-fld-v${detail.doi !== null ? ' link' : ''}`}>
            {detail.doi ?? '—'}
          </span>
        </div>
        <div className="lib-dr-sec">标 签</div>
        {/* key=会话身份：切文献强制重挂——TagEditor 有状态（input/busy），换文献
            延续旧实例会让 Enter 落进旧 detail 上下文窗口（tag-lifecycle e2e 实证）。
            F-LIBUI-01 ③：onChanged=重拉详情+library 列表刷新（表格标签列不滞旧） */}
        <TagEditor
          key={detail.id}
          paperId={detail.id}
          tags={detail.tags}
          onChanged={() => {
            setReloadKey((k) => k + 1)
            void loadLibrary()
          }}
        />
      </div>
      <DrActions
        detail={detail}
        enriching={enriching}
        exporting={exporting}
        onEdit={() => setEditing(true)}
        runAction={(action) => void runAction(action)}
      />
      {editing && (
        <MetaEditDialog
          key={detail.updatedAt}
          open={editing}
          detail={detail}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            setReloadKey((k) => k + 1)
            // [F-FOLDER-02·D] F-LIBUI-01 备案缺口修：改题名/期刊等后表格滞旧——
            // onSaved 链统一走 library.list 失效重取（TagEditor onChanged 同一条
            // 刷新链，不造第二套通道）
            void loadLibrary()
          }}
        />
      )}
    </div>
  )
}
