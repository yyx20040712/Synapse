/**
 * [SR-LIB-04] PaperDetailPanel —— 文献详情侧栏（工单：done / weak）
 *
 * ── 行为层 ──
 * - 展示 PaperDetail 全量元数据（标题/作者/年份/期刊/DOI/摘要/来源/增强状态）
 * - 操作区：编辑元数据（MetaEditDialog 表单，保存走 api.library.updateMeta）、
 *   添加/移除标签（TagEditor）、打开笔记（NotesPanel）、增强按钮（api.enrich.fetch）、
 *   导出本篇报告（api.export_.report）、DOI 外链（api.system.openExternal）
 * - 增强中禁用按钮并显示 spinner 态文案
 *
 * ── 接口层 ──
 * - export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
 *
 * ── 架构层 ──
 * - 数据自取：useAsync(() => unwrap(api.library.detail({ paperId })))；
 *   标签/笔记组件从各自 features import——例外：由本文件作为组合根引用子组件
 *   （组合发生在页面层，store 不跨域）
 * - 增强/导出/外链按钮已接通全部后端（增强链/导出链/系统域随 Phase 5 落地）
 *   落地前点击按错误契约 toast，UI 形态先行
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 动作类错误统一 ApiClientError → toast；详情加载失败走内联红条 + 重试
 *   （首载失败占位整栏，刷新失败窄条提示旧数据）；元数据/标签变更后 bump reload 重读详情
 */
import { useEffect, useState } from 'react'
import type { PaperSource, EnrichStatus } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import { NotesPanel } from '../notes/NotesPanel'
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

/** 一行键值（label 固定宽，值可换行） */
function Row(props: { label: string; children: string }): JSX.Element {
  return (
    <p className="flex gap-2 text-xs leading-5">
      <span className="w-14 shrink-0" style={{ color: 'var(--text-dim)' }}>
        {props.label}
      </span>
      <span className="min-w-0 break-words">{props.children || '—'}</span>
    </p>
  )
}

export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element {
  const { paperId } = props
  // 元数据/标签变更后 bump 触发重读（TagEditor onChanged 亦走这里）
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
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
  async function runAction(action: 'enrich' | 'report' | 'doi'): Promise<void> {
    if (detail === null) return
    if (action === 'enrich') {
      if (enriching) return
      setEnriching(true)
    } else if (action === 'report') {
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
    return (
      <div className="p-6 text-xs" style={{ color: 'var(--text-dim)' }}>
        选中列表中的文献后显示详情
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
      <h2 className="text-sm font-medium leading-5">{detail.title}</h2>
      <div className="flex flex-col gap-1">
        <Row label="作者">{detail.authors.join('、')}</Row>
        <Row label="年份">{detail.year === null ? '' : String(detail.year)}</Row>
        <Row label="期刊">{detail.venue}</Row>
        <Row label="来源">{SOURCE_LABEL[detail.source]}</Row>
        <Row label="增强">{ENRICH_LABEL[detail.enrichStatus]}</Row>
        <Row label="DOI">{detail.doi ?? ''}</Row>
        <Row label="统计">{`标注 ${detail.annotationCount} · 笔记 ${detail.noteCount} · 读至第 ${detail.lastReadPage + 1} 页`}</Row>
      </div>
      {detail.abstract !== '' && (
        <p className="line-clamp-6 text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
          {detail.abstract}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        <Button size="sm" onClick={() => setEditing(true)}>
          编辑元数据
        </Button>
        <Button size="sm" onClick={() => setNoteOpen((v) => !v)}>
          {noteOpen ? '收起笔记' : '打开笔记'}
        </Button>
        <Button size="sm" loading={enriching} disabled={enrichStatusDone(detail.enrichStatus)} onClick={() => void runAction('enrich')}>
          {enriching ? '增强中…' : '增强元数据'}
        </Button>
        <Button size="sm" loading={exporting} onClick={() => void runAction('report')}>
          导出读书报告
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
      {noteOpen && (
        <div className="min-h-64 rounded border" style={{ borderColor: 'var(--border)' }}>
          <NotesPanel paperId={detail.id} />
        </div>
      )}
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
