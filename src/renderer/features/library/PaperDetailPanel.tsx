// b3: P7-C
/**
 * [SR2-C-06] PaperDetailPanel —— 库侧笔记编辑面下线（工单：open / strong；
 * 历史工单 SR-LIB-04 产物承载——详情侧栏本体与导出/增强面维持）
 *
 * ── 行为层 ──
 * - 「方案切换=删除旧方案」红线：α 双层笔记编辑面自库侧下线——移除 noteOpen
 *   state+「打开笔记」按钮+NotesPanel 挂载区+import（符号锚=noteOpen/NotesPanel
 *   两标识符）；编辑面唯一归阅读器侧栏（C-03/04 已就绪，C-06 排其后为此）
 * - 替代入口：按钮「去阅读器写笔记」→ requestOpenPaper(detail.id)
 *   （open-paper-bus.ts:17 同总线——App 切视图+ReaderPage 打开链既有零新增）
 *
 * ── 接口层 ──
 * - export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element（签名不变）
 *
 * ── 架构层 ──
 * - 改动面：本文件（净减约 30 行）/notes/NotesPanel.tsx（**删除**——纯 UI 组件
 *   无其他消费方，save-status 纯函数已随 C-03 下沉 shared）/
 *   scripts/check-quality.mjs 白名单**删** `PaperDetailPanel → notes/NotesPanel`
 *   条目 [locked-change]；tab-dirty/ReaderNotesPanel→notes.store 条目保持——
 *   notes.store 留驻（五模块 ADR-0008+两消费方）
 * - 核对义务：paper-detail-export.test（受锁）mock 链核对（预期零触碰）；
 *   FTS 连续性=notes 写路径不变（既有 notes.store.test+FTS 用例回归锚）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - notes feature 剩 notes.store.ts；不做库侧只读笔记预览（B3 裁决 1）
 * - 验收：verify 全绿+[locked-change]+视检+翻 done 前移除根 data-ticket（4b）
 */
import { useEffect, useState } from 'react'
import type { PaperSource, EnrichStatus } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { Button } from '../../shared/ui/Button'
import { DiamondRule } from '../../shared/ui/DiamondRule'
import { showToast } from '../../shared/ui/Toast'
import { requestOpenPaper } from '../../shared/open-paper-bus'
import { TagEditor } from '../tags/TagEditor'
import { MetaEditDialog } from './MetaEditDialog'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const ACTION_FAILED = '操作失败'

const SOURCE_LABEL: Record<PaperSource, string> = {
  local: '本地导入',
  crossref: 'CrossRef',
  openalex: 'OpenAlex',
  arxiv: 'arXiv',
  manual: '手动'
}

const ENRICH_LABEL: Record<EnrichStatus, string> = {
  pending: '待增强',
  done: '已增强',
  failed: '增强失败',
  manual: '手动维护'
}

/** 一行键值（label 固定宽，值可换行；serif=衬线大字值——年份/被引数行） */
function Row(props: { label: string; serif?: boolean; children: string }): JSX.Element {
  return (
    <p className="flex gap-2 text-xs leading-5">
      <span className="lib-detail-k w-14 shrink-0">{props.label}</span>
      <span className={`min-w-0 break-words${props.serif === true ? ' lib-detail-v-serif' : ''}`}>
        {props.children || '—'}
      </span>
    </p>
  )
}

export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element {
  const { paperId } = props
  // 元数据/标签变更后 bump 触发重读（TagEditor onChanged 亦走这里）
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { data: detail, error, run } = useAsync(
    () => (paperId === null ? Promise.resolve(null) : unwrap(api.library.detail({ paperId }))),
    [paperId, reloadKey]
  )
  // run 是恒稳定引用，paperId/reloadKey 变化必须在这里触发重取
  // （useAsync 的 deps 只做快照不自动执行，漏列即详情永不更新）
  useEffect(() => {
    void run()
  }, [run, paperId, reloadKey])

  /** 动作型按钮统一收口：错误 toast + 成功后的刷新/提示 */
  async function runAction(action: 'enrich' | 'report' | 'bibtex' | 'corpus' | 'doi'): Promise<void> {
    if (detail === null) return
    if (action === 'enrich') {
      if (enriching) return
      setEnriching(true)
    } else if (action === 'report' || action === 'bibtex' || action === 'corpus') {
      if (exporting) return
      setExporting(true)
    }
    try {
      if (action === 'enrich') {
        const refreshed = await unwrap(api.enrich.fetch({ paperId: detail.id }))
        if (refreshed.enrichStatus === 'failed') {
          showToast('元数据增强失败：上游未响应或无匹配', 'error')
        } else {
          showToast('元数据增强完成', 'success')
        }
        setReloadKey((k) => k + 1)
      } else if (action === 'report') {
        const r = await unwrap(api.export_.report({ paperId: detail.id }))
        showToast(`已导出 ${r.count} 条内容：${r.filePath}`, 'success')
      } else if (action === 'bibtex') {
        const r = await unwrap(api.export_.bibtex({ paperIds: [detail.id] }))
        showToast(`已导出 ${r.count} 条题录：${r.filePath}`, 'success')
      } else if (action === 'corpus') {
        const r = await unwrap(api.export_.corpus({ paperId: detail.id }))
        showToast(`已导出语料 md：${r.filePath}`, 'success')
      } else if (detail.doi !== null) {
        await unwrap(api.system.openExternal({ url: `https://doi.org/${detail.doi}` }))
      }
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
    } finally {
      setEnriching(false)
      setExporting(false)
    }
  }

  if (paperId === null) {
    // 回炉 R4：空态居中+菱形分隔夹持（文案逐字保留——e2e/断言面）
    return (
      <div className="lib-detail-empty p-6 text-xs" style={{ color: 'var(--text-dim)' }}>
        <DiamondRule />
        <p>选中列表中的文献后显示详情</p>
        <DiamondRule />
      </div>
    )
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
          <button
            type="button"
            className="rounded px-2 py-0.5"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => void run()}
          >
            重试
          </button>
        </div>
      )
    }
    return (
      <div className="p-6 text-xs" style={{ color: 'var(--text-dim)' }}>
        正在加载详情…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {error !== null && (
        <div
          className="flex items-center justify-between rounded border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          role="alert"
        >
          <span>详情刷新失败，显示的是旧数据</span>
          <button
            type="button"
            className="rounded px-2 py-0.5"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => void run()}
          >
            重试
          </button>
        </div>
      )}
      <h2 className="lib-detail-title">{detail.title}</h2>
      <div className="flex flex-col gap-1">
        <Row label="作者">{detail.authors.join('、')}</Row>
        <Row label="年份" serif>{detail.year === null ? '' : String(detail.year)}</Row>
        <Row label="期刊">{detail.venue}</Row>
        <Row label="被引" serif>{detail.citedByCount === undefined ? '' : String(detail.citedByCount)}</Row>
        <Row label="来源">{SOURCE_LABEL[detail.source]}</Row>
        <Row label="增强">{ENRICH_LABEL[detail.enrichStatus]}</Row>
        <Row label="DOI">{detail.doi ?? ''}</Row>
        <Row label="统计">{`标注 ${detail.annotationCount} · 笔记 ${detail.noteCount} · 读至第 ${detail.lastReadPage + 1} 页`}</Row>
      </div>
      {detail.abstract !== '' && (
        <p className="lib-detail-abs line-clamp-6 text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
          {detail.abstract}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        <Button size="sm" onClick={() => setEditing(true)}>
          编辑元数据
        </Button>
        <Button size="sm" onClick={() => requestOpenPaper(detail.id)}>
          去阅读器写笔记
        </Button>
        <Button size="sm" loading={enriching} disabled={enrichStatusDone(detail.enrichStatus)} onClick={() => void runAction('enrich')}>
          {enriching ? '增强中…' : '增强元数据'}
        </Button>
        <Button size="sm" loading={exporting} onClick={() => void runAction('report')}>
          导出读书报告
        </Button>
        <Button size="sm" loading={exporting} onClick={() => void runAction('bibtex')}>
          导出 BibTeX
        </Button>
        <Button size="sm" loading={exporting} onClick={() => void runAction('corpus')}>
          导出语料 md
        </Button>
        {detail.doi !== null && (
          <Button size="sm" variant="ghost" onClick={() => void runAction('doi')}>
            打开 DOI 页
          </Button>
        )}
      </div>
      <TagEditor
        paperId={detail.id}
        tags={detail.tags}
        onChanged={() => setReloadKey((k) => k + 1)}
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
          }}
        />
      )}
    </div>
  )
}

/** 已增强且非失败的文献不再提供增强入口（重试请走 failed 态） */
function enrichStatusDone(status: EnrichStatus): boolean {
  return status === 'done' || status === 'manual'
}
