/**
 * [F-DBCAMP-01 DB-3 U2] SyncKeySection —— 设置页同步密钥节（自持组件——
 * CorpusExportSection 先例；§13.9 已裁：密钥共享=b 文本串+二维码、导入入口=
 * a 设置页单入口）。
 *
 * ── 行为层 ──
 * - 本库密钥区：bundle 文本（等宽展示）+「复制」按钮（navigator.clipboard+
 *   toast）+QR 码 svg（shared/qr/qr-encode 纯函数→rect 映射，静区 4 模块）。
 * - [回炉 R3] 「导出快照到文件」按钮：api.snapshot.exportToFile（路径=main
 *   系统对话框，INV-07）→成功 toast 含卷号（第 N 卷）；CANCELLED=info toast
 *   「已取消导出」（形态自裁=info 非弹窗——corpusSession 取消同族语义）。
 * - 「导入同步密钥」单入口：textarea 粘贴→本地正则预校验（OWNER_ID_PATTERN
 *   复用——非法=错误 toast 零 api 调用）→api.snapshot.importPeerKey→成功
 *   toast+刷新对端列表；失败 toast（ApiClientError.message）。
 * - 已导入对端列表：owner 短标（uuid 前 8 位）+导入时刻+「移除」按钮→
 *   removePeerKey。
 * - 数据面直调 window.api.snapshot.*（自持节本地 state——不建 store、不进
 *   settings.store；密钥不随快照传输——带外分发自举悖论规避，§13.6）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/sync-key-section.test.tsx（always-active，jsdom）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { OWNER_ID_PATTERN } from '@shared/models/app-meta'
import { api, unwrap, ApiClientError } from '../../api/client'
import { encodeQr } from '../../shared/qr/qr-encode'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import type { PeerKeyItem, SyncKeyInfo } from '@shared/ipc/schemas'

/** bundle 预校验（与 main 侧 service 同式——渲染层拦非法串零通道调用） */
const BUNDLE_RE = new RegExp(
  `^${OWNER_ID_PATTERN.source.replace(/^\^/, '').replace(/\$$/, '')}:[0-9a-f]{64}$`
)

function errText(e: unknown): string {
  return e instanceof ApiClientError ? e.message : '同步密钥操作失败'
}

/** QR svg（modules→rect 映射；viewBox 含 4 模块静区+白底） */
function QrImage(props: { text: string }): JSX.Element {
  const qr = useMemo(() => encodeQr(props.text), [props.text])
  const quiet = 4
  const box = qr.size + quiet * 2
  const rects: JSX.Element[] = []
  qr.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} />)
      }
    })
  })
  return (
    <svg
      data-testid="sync-key-qr"
      role="img"
      aria-label="同步密钥二维码"
      viewBox={`${-quiet} ${-quiet} ${box} ${box}`}
      width={148}
      height={148}
      shapeRendering="crispEdges"
    >
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="var(--qr-bg)" />
      <g fill="var(--qr-ink)">{rects}</g>
    </svg>
  )
}

export function SyncKeySection(): JSX.Element {
  const [info, setInfo] = useState<SyncKeyInfo | null>(null)
  const [peers, setPeers] = useState<PeerKeyItem[]>([])
  const [input, setInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const refreshPeers = useCallback(async (): Promise<void> => {
    const r = await unwrap(api.snapshot.listPeerKeys({}))
    setPeers(r.peers)
  }, [])

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        setInfo(await unwrap(api.snapshot.getSyncKey({})))
        await refreshPeers()
      } catch (e) {
        showToast(errText(e), 'error')
      }
    })()
  }, [refreshPeers])

  async function copyBundle(): Promise<void> {
    if (info === null) {
      return
    }
    try {
      await navigator.clipboard.writeText(info.bundle)
      showToast('同步密钥已复制', 'success')
    } catch {
      showToast('复制失败：剪贴板不可用', 'error')
    }
  }

  async function exportSnapshot(): Promise<void> {
    if (exporting) {
      return
    }
    setExporting(true)
    try {
      const r = await unwrap(api.snapshot.exportToFile({}))
      showToast(`快照已导出（第 ${r.snapshotSeq} 卷）`, 'success')
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'CANCELLED') {
        showToast('已取消导出', 'info')
      } else {
        showToast(errText(e), 'error')
      }
    } finally {
      setExporting(false)
    }
  }

  async function importBundle(): Promise<void> {
    const bundle = input.trim()
    if (!BUNDLE_RE.test(bundle)) {
      showToast('同步密钥格式不正确：应为 <库标识>:<64 位十六进制密钥>', 'error')
      return
    }
    if (importing) {
      return
    }
    setImporting(true)
    try {
      await unwrap(api.snapshot.importPeerKey({ bundle }))
      showToast('同步密钥已导入', 'success')
      setInput('')
      await refreshPeers()
    } catch (e) {
      showToast(errText(e), 'error')
    } finally {
      setImporting(false)
    }
  }

  async function removePeer(ownerId: string): Promise<void> {
    try {
      await unwrap(api.snapshot.removePeerKey({ ownerId }))
      showToast('已移除对端密钥', 'success')
      await refreshPeers()
    } catch (e) {
      showToast(errText(e), 'error')
    }
  }

  return (
    <section className="flex flex-col gap-2" data-testid="sync-key-section">
      <h2 className="text-sm font-medium">同步密钥</h2>
      <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
        同步密钥用于快照传输加密（接收端导入发送端密钥后可解密其快照）。密钥不经
        快照文件传输，须以带外方式（如当面扫码）分发；持有密钥即持有该库同步域
        全部权限，请勿交给不信任的设备。
      </p>
      {info !== null && (
        <div className="flex flex-col gap-2">
          <code
            data-testid="sync-key-bundle"
            className="break-all rounded border px-2 py-1 font-mono text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          >
            {info.bundle}
          </code>
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => void copyBundle()}>
                复制
              </Button>
              <Button size="sm" loading={exporting} onClick={() => void exportSnapshot()}>
                导出快照到文件
              </Button>
            </div>
            <QrImage text={info.bundle} />
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          导入同步密钥（粘贴对方设置页的密钥串）
        </span>
        <textarea
          aria-label="导入同步密钥"
          className="syn-input rounded border px-2 py-1 font-mono text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>
      <div>
        <Button variant="primary" size="sm" loading={importing} onClick={() => void importBundle()}>
          导入
        </Button>
      </div>
      {peers.length > 0 && (
        <div className="flex flex-col gap-1" data-testid="sync-key-peers">
          {peers.map((p) => (
            <div key={p.ownerId} className="flex items-center gap-2 text-xs">
              <span className="font-mono">{p.ownerId.slice(0, 8)}</span>
              <span style={{ color: 'var(--text-dim)' }}>{new Date(p.importedAt).toLocaleString()}</span>
              <Button size="sm" onClick={() => void removePeer(p.ownerId)}>
                移除
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
