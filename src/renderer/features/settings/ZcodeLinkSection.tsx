// b3: P7-G
/**
 * ZcodeLinkSection —— 设置页 zcode 联动（发现+一键装技能+心跳
 * 三档，不代启会话，工单：open / strong）
 *
 * ── 行为层 ──（完整状态机/迁移/跨格序列见工单面——本节为实现落地注释）
 * - 五态消费 zcode-link/detect Res（main 侧纯 fs 检测；running 单源=06 readStatus）：
 *   zcode-not-found（指引文案）/ found-skill-missing（+一键装技能按钮）/
 *   installed-idle / running（state 自述+currentPaper）/ error（+重试按钮）
 * - 轮询 STATUS_POLL_MS=5s（节可见期间——08 门控同族；卸载清 interval INV-14 成对）
 * - 一键装技能：确认对话框两型（首装普通/overwrite=true 覆盖重申）→zcode-link/install
 *   （纯 fs 复制，零进程——INV-21）→re-detect→installed-idle
 * - 协议目录路径展示已撤（B10-1）——本节 UI 零路径面（错误 reason 文案非展示面）
 *
 * ── 接口层 ──
 * - export function ZcodeLinkSection(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - renderer/features/settings 域（SettingsPage 挂载）；api+unwrap 统一错误面；
 *   detect 失败=error 呈现（列表型不 toast）；install 失败=动作型 toast（INV-02）
 * - 测试：tests/unit/renderer/zcode-link-section.test.tsx + e2e zcode-link.spec.ts（受锁）
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiClientError, api, unwrap } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import type { ZcodeLinkDetectRes } from '@shared/ipc/schemas'

/** 轮询周期（组件域私有——Rule of Three 第 2 次保持重复；第 3 处出现时抽 shared） */
const STATUS_POLL_MS = 5000
/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const ACTION_FAILED = '操作失败'

const CONFIRM_FIRST = '将把 AI 传感器技能安装到 zcode 技能目录。确认安装？'
const CONFIRM_OVERWRITE = '检测到已有技能目录，安装将覆盖其中文件。确认覆盖？'

export function ZcodeLinkSection(): JSX.Element {
  const [res, setRes] = useState<ZcodeLinkDetectRes | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false) // 装技能在途时暂停轮询覆写呈现

  const run = useCallback(async (): Promise<void> => {
    try {
      const r = await unwrap(api.ai_sensor.zcodeDetect({}))
      setRes(r)
      setFailed(false)
    } catch {
      setRes(null)
      setFailed(true)
    }
  }, [])

  // 门控轮询：挂载即拉一次+5s interval；卸载清（INV-14 成对）
  useEffect(() => {
    void run()
    const timer = setInterval(() => {
      if (!busyRef.current) void run()
    }, STATUS_POLL_MS)
    return () => {
      clearInterval(timer)
    }
  }, [run])

  const onInstall = (): void => {
    if (busy) return
    const msg = res?.overwrite === true ? CONFIRM_OVERWRITE : CONFIRM_FIRST
    if (!window.confirm(msg)) return
    setBusy(true)
    busyRef.current = true
    unwrap(api.ai_sensor.zcodeInstall({}))
      .then((r) => {
        showToast(`技能安装完成（${r.fileCount} 个文件）`, 'success')
        return run() // re-detect→installed-idle（迁移收口）
      })
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
      })
      .finally(() => {
        setBusy(false)
        busyRef.current = false
      })
  }

  let statusText = '检测中…'
  if (failed || res?.state === 'error') statusText = '状态读取失败'
  else if (res !== null) {
    if (res.state === 'zcode-not-found') statusText = '未发现 zcode'
    else if (res.state === 'found-skill-missing') statusText = '已发现 zcode，技能未装'
    else if (res.state === 'installed-idle') statusText = '已装技能，未运行'
    else if (res.state === 'running') {
      const paper = res.status?.currentPaper
      statusText = `运行中（${res.status?.state ?? ''}${paper !== null && paper !== undefined ? `，当前：${paper}` : ''}）`
    }
  }

  return (
    <section className="flex flex-col gap-2" data-testid="zcode-link-section">
      <h2 className="text-sm font-medium">AI 联动（zcode）</h2>
      <p
        className="m-0 text-xs"
        data-testid="zcode-link-status"
        role="status"
        style={{ color: 'var(--text-dim)' }}
      >
        {statusText}
      </p>
      {res?.state === 'error' && res.reason !== undefined && (
        <p className="m-0 text-xs" style={{ color: 'var(--danger)' }}>
          {res.reason}
        </p>
      )}
      {failed && (
        <p className="m-0 text-xs" style={{ color: 'var(--danger)' }}>
          检测通道暂不可用，将继续重试
        </p>
      )}
      {res?.state === 'zcode-not-found' && (
        <p className="m-0 text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
          请先安装 zcode 命令行工具；安装并首次运行后回本页即可自动识别（已装但从未
          运行也可能显示未发现——首次运行后自愈）。
        </p>
      )}
      {res?.state === 'found-skill-missing' && (
        <button
          type="button"
          data-action="install"
          disabled={busy}
          className="self-start rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)', color: busy ? 'var(--text-dim)' : 'var(--accent)' }}
          onClick={onInstall}
        >
          一键装技能
        </button>
      )}
      {(failed || res?.state === 'error') && (
        <button
          type="button"
          data-action="retry"
          className="self-start rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
          onClick={() => void run()}
        >
          重试
        </button>
      )}
    </section>
  )
}
