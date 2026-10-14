/**
 * [F-DBCAMP-01 DB-3 U3] SnapshotImportButton —— 设置页「从文件导入快照」钮
 * （自持外提件——SyncKeySection 218 行压 250 帽，导入子块外提同
 * AiAssistantSection 先例〔简报③-6 预案〕）。
 *
 * ── 行为层 ──
 * - api.snapshot.importFromFile（路径=main 系统开文件对话框，INV-07）→Res 三态：
 *   applied=success toast「已导入第 N 卷：新 X 改 Y 删 Z」+A7 时附
 *   「，冲突 n 行（首例 entity/id）」；rejected=error toast「导入被拒：<中文
 *   映射>」（十码全映射——枚举单源=shared schemas SNAPSHOT_IMPORT_REJECT_REASONS，
 *   中文文案单源=本件映射表）；幂等 no-op=info toast；CANCELLED=info「已取消
 *   导入」（exportSnapshot 取消同族语义）。
 * - importing 守卫（连点零重入）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/sync-key-section.test.tsx（经 SyncKeySection 挂载面）。
 */
import { useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import type { SnapshotImportRejectReason } from '@shared/ipc/schemas'

/** 拒收原因码中文映射（§13.2 十码逐码——Record 全键型=增删枚举即编译红；
 *  [回炉 R8] 导出=renderer 测试全键快照断言消费面） */
export const IMPORT_REASON_ZH: Record<SnapshotImportRejectReason, string> = {
  self_reimport: '不能导入本库自身的快照',
  struct_invalid: '快照文件结构无效',
  version_mismatch: '快照格式版本不受支持',
  schema_newer: '快照数据库版本比本库新，请先升级应用',
  hmac_fail: '快照验签失败（密钥不匹配或文件损坏）',
  decrypt_fail: '快照解密失败',
  seq_stale: '该快照卷不比本地已导入的新',
  seq_conflict: '同卷号内容不一致，已拒收',
  hash_mismatch: '快照内容校验不符',
  counts_mismatch: '快照行数校验不符'
}

export function SnapshotImportButton(): JSX.Element {
  const [importing, setImporting] = useState(false)

  async function importSnapshot(): Promise<void> {
    if (importing) {
      return
    }
    setImporting(true)
    try {
      const r = await unwrap(api.snapshot.importFromFile({}))
      if (r.outcome === 'rejected') {
        showToast(`导入被拒：${IMPORT_REASON_ZH[r.reason ?? 'struct_invalid']}`, 'error')
        return
      }
      if (r.noop === true) {
        showToast(`第 ${r.snapshotSeq ?? '?'} 卷此前已导入，本次未重复应用`, 'info')
        return
      }
      const s = r.stats
      let text = `已导入第 ${r.snapshotSeq ?? '?'} 卷：新 ${s?.inserted ?? 0} 改 ${s?.updated ?? 0} 删 ${s?.deleted ?? 0}`
      if ((s?.a7Conflicts ?? 0) > 0) {
        text += `，冲突 ${s?.a7Conflicts} 行（首例 ${s?.a7FirstEntity ?? '?'}/${s?.a7FirstId ?? '?'}）`
      }
      showToast(text, 'success')
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'CANCELLED') {
        showToast('已取消导入', 'info')
      } else {
        showToast(e instanceof ApiClientError ? e.message : '快照导入失败', 'error')
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Button size="sm" loading={importing} onClick={() => void importSnapshot()}>
      从文件导入快照
    </Button>
  )
}
