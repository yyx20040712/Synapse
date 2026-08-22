/**
 * MetaEditDialog —— 元数据编辑表单弹窗（PaperDetailPanel 的子件，纯表单）。
 *
 * 只负责字段编辑与补丁构造：diff 出相对原详情的变更字段（service 对空 patch
 * 不落库直接返回现状——这里空 diff 干脆不发请求），保存走 api.library.updateMeta，
 * 结果经 onSaved 回传父级刷新。authors 输入按中英文逗号/顿号/分号拆分。
 */
import { useState } from 'react'
import type { PaperDetail, PaperMetaPatch } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '元数据保存失败'

/** 表单形状：authors 用分隔符字符串承载，year/doi 空串代表 null */
interface MetaForm {
  title: string
  authors: string
  year: string
  venue: string
  doi: string
  abstract: string
}

function formOf(d: PaperDetail): MetaForm {
  return {
    title: d.title,
    authors: d.authors.join('、'),
    year: d.year === null ? '' : String(d.year),
    venue: d.venue,
    doi: d.doi === null ? '' : d.doi,
    abstract: d.abstract
  }
}

/** 表单 → 相对原详情的变更补丁（空 diff 返回空对象，调用方免发请求）；年份合法性由调用方先行校验 */
function diffPatch(form: MetaForm, d: PaperDetail): PaperMetaPatch {
  const patch: PaperMetaPatch = {}
  if (form.title.trim() !== d.title) patch.title = form.title.trim()
  const authors = form.authors.split(/[,，、;；]/).map((s) => s.trim()).filter((s) => s !== '')
  if (authors.join('、') !== d.authors.join('、')) patch.authors = authors
  const yearText = form.year.trim()
  const year = yearText === '' ? null : Number.parseInt(yearText, 10)
  if (year !== d.year) patch.year = year
  if (form.venue.trim() !== d.venue) patch.venue = form.venue.trim()
  const doi = form.doi.trim() === '' ? null : form.doi.trim()
  if (doi !== d.doi) patch.doi = doi
  if (form.abstract !== d.abstract) patch.abstract = form.abstract
  return patch
}

export function MetaEditDialog(props: {
  open: boolean
  detail: PaperDetail
  onClose: () => void
  onSaved: (d: PaperDetail) => void
}): JSX.Element {
  const { open, detail, onClose, onSaved } = props
  const [form, setForm] = useState<MetaForm>(() => formOf(detail))
  const [busy, setBusy] = useState(false)

  const field = (key: keyof MetaForm, label: string, node: 'input' | 'textarea'): JSX.Element => (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
        {label}
      </span>
      {node === 'input' ? (
        <input
          className="rounded border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <textarea
          rows={4}
          className="resize-none rounded border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </label>
  )

  async function save(): Promise<void> {
    if (busy) return
    if (form.title.trim() === '') {
      showToast('标题不能为空', 'info')
      return
    }
    // 年份非空时必须是整数（垃圾输入当场拦截，不做静默丢字段）
    const yearText = form.year.trim()
    if (yearText !== '' && !/^\d+$/.test(yearText)) {
      showToast('年份需为数字', 'info')
      return
    }
    const patch = diffPatch(form, detail)
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setBusy(true)
    try {
      const saved = await unwrap(api.library.updateMeta({ paperId: detail.id, patch }))
      onSaved(saved)
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : SAVE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="编辑元数据"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" loading={busy} onClick={() => void save()}>
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {field('title', '标题', 'input')}
        {field('authors', '作者（逗号/顿号分隔）', 'input')}
        {field('year', '年份（留空=未知）', 'input')}
        {field('venue', '期刊/会议', 'input')}
        {field('doi', 'DOI（留空=无）', 'input')}
        {field('abstract', '摘要', 'textarea')}
      </div>
    </Dialog>
  )
}
