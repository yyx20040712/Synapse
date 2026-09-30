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
 *
 * ── 接口层 ──
 * - export function ImportTargetSelect(props: { value: string;
 *     folderId: string | null; folderName: string | undefined;
 *     disabled?: boolean; onChange(v: string): void }): JSX.Element | null
 */
export function ImportTargetSelect(props: {
  value: string
  folderId: string | null
  folderName: string | undefined
  disabled?: boolean
  onChange(v: string): void
}): JSX.Element | null {
  const { value, folderId, folderName, disabled = false, onChange } = props
  if (folderId === null) {
    return (
      <select
        aria-label="导入到"
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        value=""
        disabled={disabled}
        onChange={() => undefined}
      >
        <option value="">仅入文献库（无节点）</option>
      </select>
    )
  }
  return (
    <select
      aria-label="导入到"
      className="rounded border px-2 py-1 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">仅入文献库（无节点）</option>
      <option value={folderId}>
        {`当前文件夹「${folderName ?? ''}」（自动建立脉络节点）`}
      </option>
    </select>
  )
}
