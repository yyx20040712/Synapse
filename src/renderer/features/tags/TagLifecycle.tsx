// b3: P7-E
/**
 * [F-UIRES-01 批 A U3→F-UIRES-03 B1 2026-10-05] TagLifecycle —— 标签域写路径
 * busy 守卫件（原三对话框宿主：TagMergeDialog/TagDeleteDialog 随 TagFilter 退役
 * 删除；TagRenameDialog 随 B1 批四件退役——改名/颜色编辑收口行内编辑态
 * TagDropdownRow，校验规则已承接）。busy 守卫用 ref（同步检查——同批多次
 * click 在 React 重渲染前也只放行一次，S8）；失败 toast+编辑保持开（S6）；
 * busy 飞行中禁关（N1：requestClose 关闭守卫——取消/遮罩/✕/Esc 全关闭路径
 * 统一过此门，与保存按钮 disabled 态对齐）；成功经 onMutated(disappearedId)
 * 上抛——死 id 筛选清空顺序归 TagDropdown（INV-53）。
 */
import { useRef, useState } from 'react'

/**
 * busy 守卫（ref 同步检查防同批双击——S8；setBusy 只管按钮禁用态渲染）。
 * requestClose=关闭守卫（N1）：mutation 飞行中 no-op——取消/遮罩/✕/Esc 全
 * 关闭路径统一过此门。
 * 导出供 TagDropdown（删除链）/TagDropdownRow（行编辑态）同构复用（域内单源）。
 * isPending=同步 pending 读口（行内编辑 blur 门：busy 飞行中失焦不恢复——
 * N1「编辑已收、变更随后生效」错位同型防线）。
 */
export function useBusyGuard(): {
  busy: boolean
  begin(): boolean
  end(): void
  isPending(): boolean
  requestClose(onClose: () => void): void
} {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  return {
    busy,
    begin(): boolean {
      if (pending.current) return false
      pending.current = true
      setBusy(true)
      return true
    },
    end(): void {
      pending.current = false
      setBusy(false)
    },
    isPending(): boolean {
      return pending.current
    },
    requestClose(onClose: () => void): void {
      if (!pending.current) onClose()
    }
  }
}

/** onMutated 载荷：消失的标签 id（rename/颜色=null——id 稳定；merge=源 id；
 * delete=自身 id） */
export type MutatedPayload = (disappearedId: string | null) => void
