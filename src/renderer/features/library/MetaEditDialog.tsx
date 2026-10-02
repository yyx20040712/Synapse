/**
 * MetaEditDialog —— 元数据编辑表单弹窗（PaperDetailPanel 的子件，纯表单）。
 *
 * 只负责字段编辑与补丁构造：diff 出相对原详情的变更字段（service 对空 patch
 * 不落库直接返回现状——这里空 diff 干脆不发请求），保存走 api.library.updateMeta，
 * 结果经 onSaved 回传父级刷新。authors 输入按中英文逗号/顿号/分号拆分。
 * [F-UIRES-02 R5] 7 单行字段 Enter=保存（isComposing 守卫——同「保存」钮
 * 链路含校验 toast）；摘要 textarea 零动（Enter=换行——乙类豁免）。
 */
import { useState } from 'react'
import type { PaperDetail, PaperMetaPatch } from '@shared/models/paper'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '元数据保存失败'

/** 表单形状：authors 用分隔符字符串承载，year/month/doi/impactFactor 空串代表 null */
interface MetaForm {
  title: string
  authors: string
  year: string
  venue: string
  doi: string
  abstract: string
  /** [F-FOLDER-02·D] 节点月框（1-12；空=未定月）——落位=service 层同事务写
   *  lineage_nodes.month（paperMetaPatch 契约已含，本票补 renderer 入口） */
  month: string
  /** [F-FOLDER-02·D] 影响因子（D1 手动字段——papers.impact_factor REAL） */
  impactFactor: string
}

function formOf(d: PaperDetail): MetaForm {
  return {
    title: d.title,
    authors: d.authors.join('、'),
    year: d.year === null ? '' : String(d.year),
    venue: d.venue,
    doi: d.doi === null ? '' : d.doi,
    abstract: d.abstract,
    month: d.lineage?.month == null ? '' : String(d.lineage.month),
    impactFactor: d.impactFactor === null ? '' : String(d.impactFactor)
  }
}

/** 表单 → 相对原详情的变更补丁（空 diff 返回空对象，调用方免发请求）；年份/月份/IF 合法性由调用方先行校验 */
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
  // [F-FOLDER-02·D] 月框基线=detail.lineage.month（未入脉络=无基线=null 语义）
  const month = form.month.trim() === '' ? null : Number.parseInt(form.month, 10)
  if (month !== (d.lineage?.month ?? null)) patch.month = month
  const ifNum = form.impactFactor.trim() === '' ? null : Number(form.impactFactor)
  if (ifNum !== d.impactFactor) patch.impactFactor = ifNum
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
          // [F-UIRES-02 R5] 单行字段 Enter=保存（isComposing 守卫）——与
          // 「保存」钮完全同链路（save 含校验 toast）；textarea 零动（Enter=换行）
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') {
              // [RR1-5] preventDefault 对齐 inlineKeyDown 范式（防御——现无
              // form 包裹无实际副作用）
              e.preventDefault()
              void save()
            }
          }}
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
    // [F-FOLDER-02·D] 月框（1-12 整数）与 IF（数字）同序当场拦截
    const monthText = form.month.trim()
    if (monthText !== '' && !/^(1[0-2]|[1-9])$/.test(monthText)) {
      showToast('月份需为 1-12 的整数', 'info')
      return
    }
    const ifText = form.impactFactor.trim()
    if (ifText !== '' && (Number.isNaN(Number(ifText)) || !Number.isFinite(Number(ifText)))) {
      showToast('影响因子需为数字', 'info')
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
        {field('month', '月份（1-12，留空=未定月）', 'input')}
        {field('venue', '期刊/会议', 'input')}
        {field('impactFactor', '影响因子（留空=无）', 'input')}
        {field('doi', 'DOI（留空=无）', 'input')}
        {field('abstract', '摘要', 'textarea')}
      </div>
    </Dialog>
  )
}
