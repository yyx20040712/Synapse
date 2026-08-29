/**
 * [SR-SET-01] SettingsPage —— 设置页（工单：done / weak）
 *
 * ── 行为层 ──
 * - 表单：contactEmail（校验 email；说明"仅用于 CrossRef/OpenAlex 礼貌池标识"）
 * - 主题三选（light/dark/system；v1 仅存储，主题切换 v2 接线 theme.css 变量集）
 * - 「网络诊断」按钮：settings.store.diagnose → 每行 host ✓ 延迟ms / ✗（安全 §6.4 披露）
 * - 「网络行为披露」静态说明区：列出 3 个白名单 host 与触发时机（仅手动增强/诊断）
 * - 数据目录：v1 不展示路径（避免暴露给 renderer），仅"数据保存在本机"文案
 *
 * ── 接口层 ──
 * - export function SettingsPage(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 保存走 settings.store.save；store 动作型失败在此 catch 后 toast
 * - [R3-SET 皮肤票] 分节卡+金节标衬线+节间 DiamondRule（.syn-settings 作用域
 *   皮肤住 theme.css——自持节 section 根同吃）；表单控件 focus=accent 描边+
 *   gold-soft 底（.syn-input）；内联节壳拆 SettingsSection（180 行消化上限）
 */
import { useEffect, useState, type ReactNode } from 'react'
import { ALLOWED_REMOTE_HOSTS } from '@shared/constants'
import { ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { DiamondRule } from '../../shared/ui/DiamondRule'
import { showToast } from '../../shared/ui/Toast'
import { useSettingsStore } from './settings.store'
import { CorpusExportSection } from './CorpusExportSection'
import { SettingsSection } from './SettingsSection'
import { ZcodeLinkSection } from './ZcodeLinkSection'
import type { AppSettings } from '@shared/ipc/schemas'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const OP_FAILED = '操作失败'
const SAVE_OK = '设置已保存'

const THEME_LABEL: Record<AppSettings['theme'], string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统'
}

/** workspaceSection：课题管理节由 App 组合根注入（跨域经 App 编排——feature
 *  互引被 quality 门禁禁止，R1-WS2；dirty 聚合值随节由 App 一并注入） */
export function SettingsPage(props: { workspaceSection?: ReactNode }): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const saving = useSettingsStore((s) => s.saving)
  const diag = useSettingsStore((s) => s.diag)
  const load = useSettingsStore((s) => s.load)
  const save = useSettingsStore((s) => s.save)
  const diagnose = useSettingsStore((s) => s.diagnose)

  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<AppSettings['theme']>('system')
  const [diagnosing, setDiagnosing] = useState(false)

  // 载入后同步进表单（settings 到达晚于首帧）
  useEffect(() => {
    load().catch((e: unknown) => {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    })
  }, [load])
  useEffect(() => {
    if (settings !== null) {
      setEmail(settings.contactEmail)
      setTheme(settings.theme)
    }
  }, [settings])

  function runSave(): void {
    if (saving) {
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('邮箱格式不正确', 'info')
      return
    }
    save({ contactEmail: email, theme })
      .then(() => showToast(SAVE_OK, 'success'))
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
      })
  }

  async function runDiagnose(): Promise<void> {
    if (diagnosing) {
      return
    }
    setDiagnosing(true)
    try {
      await diagnose()
    } catch (e) {
      showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
    } finally {
      setDiagnosing(false)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    // syn-settings 作用域（R3-U4 皮肤票）：> section 分节卡（panel+radius-l+
    // shadow-1）+h2 金节标衬线——自持节（语料导出/zcode/注入课题节）渲染
    // section 根同吃皮肤；节间菱形分隔复用 DiamondRule（.lib-rule* 语法）
    <div className="syn-settings mx-auto flex min-h-full max-w-xl flex-col gap-4 p-6 text-sm">
      <SettingsSection title="通用">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            联系邮箱（仅用作 CrossRef/OpenAlex 礼貌池标识，附在请求 User-Agent 中）
          </span>
          <input
            aria-label="联系邮箱"
            className="syn-input rounded border px-2 py-1 text-sm"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            主题
          </span>
          <select
            aria-label="主题"
            className="syn-input rounded border px-1 py-1 text-sm"
            style={inputStyle}
            value={theme}
            onChange={(e) => setTheme(e.target.value as AppSettings['theme'])}
          >
            {Object.entries(THEME_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            v1 仅存储偏好，界面切换随 v2 接线
          </span>
        </label>
        <div>
          <Button variant="primary" size="sm" loading={saving} onClick={runSave}>
            保存设置
          </Button>
        </div>
      </SettingsSection>

      <DiamondRule />

      <SettingsSection title="网络">
        <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
          本应用出网仅限元数据增强与连通诊断，全部由你手动触发，无任何后台网络任务。
          白名单 host（在受锁常量中维护）：{ALLOWED_REMOTE_HOSTS.join('、')}。
          数据保存在本机，不经任何第三方服务器中转。
        </p>
        <div>
          <Button size="sm" loading={diagnosing} onClick={() => void runDiagnose()}>
            网络诊断
          </Button>
        </div>
        {diag !== null && (
          <table className="text-xs" aria-label="网络诊断结果">
            <thead>
              <tr style={{ color: 'var(--text-dim)' }}>
                <th className="py-1 pr-4 text-left font-normal">Host</th>
                <th className="py-1 pr-4 text-left font-normal">状态</th>
                <th className="py-1 text-left font-normal">延迟</th>
              </tr>
            </thead>
            <tbody>
              {diag.map((d) => (
                <tr key={d.host}>
                  <td className="py-0.5 pr-4">{d.host}</td>
                  <td className="py-0.5 pr-4" style={{ color: d.ok ? 'var(--ok)' : 'var(--danger)' }}>
                    {d.ok ? '✓ 可达' : '✗ 不可达'}
                  </td>
                  <td className="py-0.5">{d.ok ? `${d.latencyMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>

      {/* R1-WS2：课题管理节（App 组合根注入——见 props 注释） */}
      <DiamondRule />
      {props.workspaceSection}

      {/* AI-04：AI 语料导出节（自持组件——行数防线 R14；事件桥/终局 toast 在 App 层） */}
      <DiamondRule />
      <CorpusExportSection />

      {/* AI-10：zcode 联动节（自持组件——检测/装技能纯 fs，INV-21 零 spawn） */}
      <DiamondRule />
      <ZcodeLinkSection />
    </div>
  )
}
