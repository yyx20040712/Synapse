/**
 * [F-FOLDER-02·E] ImportTargetSelect —— 「导入到」选择器（ImportDropZone 子组件，
 * design §4.5+主控细化口径）。
 *
 * ── 行为层 ──
 * - 两选项：「仅入文献库（无节点）」（值 ''）+「当前文件夹「{名}」（自动建立
 *   脉络节点）」（值=folderId——仅在 folder 筛选态渲染该选项）；folder 态
 *   默认=该文件夹、无筛选默认=仅入文献库（默认值归一在宿主 useState 初值）
 * - busy 期禁切目标（防中途换目标语义漂移）
 * - 与导入按钮同行渲染（零垂直增量——dropzone 高度变化会挤压详情抽屉可视高，
 *   tag-input e2e 实证；故本件不含自身容器行，由宿主 flex 行内挂载）
 * - [小挂账第 7 条] 视觉补齐（零交互语义变更）：appearance:none+内联 SVG
 *   下拉箭头（TAB_ICONS 24×24 单色描边先例形态）+panel 底/border 描边——
 *   与同区按钮族视觉一致（「无边框无箭头不可发现」用户视验反馈）
 *
 * ── 接口层 ──
 * - export function ImportTargetSelect(props: { value: string;
 *     folderId: string | null; folderName: string | undefined;
 *     disabled?: boolean; onChange(v: string): void }): JSX.Element | null
 */
import type { CSSProperties } from 'react'
/** [第 7 条] 下拉箭头（inline SVG 先例形态——stroke currentColor 随文字色 token） */
const SELECT_ARROW = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="pointer-events-none absolute right-1.5"
    style={{ width: 12, height: 12, color: 'var(--text-dim)' }}
  >
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export function ImportTargetSelect(props: {
  value: string
  folderId: string | null
  folderName: string | undefined
  disabled?: boolean
  onChange(v: string): void
}): JSX.Element | null {
  const { value, folderId, folderName, disabled = false, onChange } = props
  const skin = 'appearance-none rounded border px-2 py-0.5 pr-5 text-xs'
  const skinStyle: CSSProperties = {
    appearance: 'none',
    borderColor: 'var(--border)',
    background: 'var(--panel)'
  }
  if (folderId === null) {
    return (
      <span className="relative inline-flex items-center">
        <select
          aria-label="导入到"
          className={skin}
          style={skinStyle}
          value=""
          disabled={disabled}
          onChange={() => undefined}
        >
          <option value="">仅入文献库（无节点）</option>
        </select>
        {SELECT_ARROW}
      </span>
    )
  }
  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="导入到"
        className={skin}
        style={skinStyle}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">仅入文献库（无节点）</option>
        <option value={folderId}>
          {`当前文件夹「${folderName ?? ''}」（自动建立脉络节点）`}
        </option>
      </select>
      {SELECT_ARROW}
    </span>
  )
}
