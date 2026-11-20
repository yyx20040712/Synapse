/**
 * [前端四期 B2] DataCategory —— 设置页「数据与网络」分类内容。
 *
 * ── 行为层 ──
 * - 网络白名单说明：既有披露文案原样迁入（§6.4——host 清单单源=
 *   ALLOWED_REMOTE_HOSTS 共享常量）
 * - 「网络诊断」按钮：settings.store.diagnose → 诊断表格（每行 host ✓ 延迟
 *   ms / ✗ 不可达）——行为与表格结构零变（自 SettingsPage 迁入）
 * - 同步密钥 SyncKeySection 自持节原样迁入（内含 SnapshotImportButton；
 *   自持数据面直调 window.api.snapshot.*，不进 settings.store）
 *
 * ── 接口层 ──
 * - export function DataCategory(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - diagnose 动作型失败在此 catch 后 toast（沿承）；皮肤=settings.css
 *   setting-group/host-row
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（网络诊断按钮+
 *   同步密钥节标在场）；sync-key-section.test.tsx（节本体行为锁定）
 */
import { useState } from 'react'
import { ALLOWED_REMOTE_HOSTS } from '@shared/constants'
import { ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED } from '../../shared/ui-constants'
import { useSettingsStore } from './settings.store'
import { SyncKeySection } from './SyncKeySection'

export function DataCategory(): JSX.Element {
  const diag = useSettingsStore((s) => s.diag)
  const diagnose = useSettingsStore((s) => s.diagnose)
  const [diagnosing, setDiagnosing] = useState(false)

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

  return (
    <>
      <section className="setting-group">
        <h3>网络白名单</h3>
        <p className="setting-group-note">
          本应用出网仅限元数据增强与连通诊断，全部由你手动触发，无任何后台网络任务。
          白名单 host（在共享常量中维护）：{ALLOWED_REMOTE_HOSTS.join('、')}。
          数据保存在本机，不经任何第三方服务器中转。
        </p>
        <div>
          <Button size="sm" loading={diagnosing} onClick={() => void runDiagnose()}>
            网络诊断
          </Button>
        </div>
        {diag !== null && (
          <table className="settings-diag-table" aria-label="网络诊断结果">
            <thead>
              <tr>
                <th>Host</th>
                <th>状态</th>
                <th>延迟</th>
              </tr>
            </thead>
            <tbody>
              {diag.map((d) => (
                <tr key={d.host}>
                  <td>{d.host}</td>
                  <td
                    style={{
                      color: d.ok ? 'var(--ok)' : 'var(--danger)'
                    }}
                  >
                    {d.ok ? '✓ 可达' : '✗ 不可达'}
                  </td>
                  <td>{d.ok ? `${d.latencyMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* [F-DBCAMP-01 DB-3 U2] 同步密钥节（自持——§13.9 已裁：文本串+二维码/
          导入单入口；直调 window.api.snapshot.*） */}
      <SyncKeySection />
    </>
  )
}
