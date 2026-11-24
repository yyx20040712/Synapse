/**
 * [回炉 W-B3·R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙；处置单 R-D1；设计稿 §2.5 #18 的补充行]
 * LineageStaleHistoryDrop —— 保存错误行内的「丢弃这条过期历史」出口（自 LineageToolbar 拆件：
 * 工具组贴行数预算上限——动作钮与确认框同驻本件）。
 *
 * ── 行为层 ──
 * - 出现条件（读点判据＝lineage-history-stale staleHistoryAtTop）：错误行在场（saveState==='failed'，
 *   行自身条件——本件只在行内挂载）∧ 过期标记项仍是其方向栈的栈顶项。标记项已不在栈顶＝不渲染
 *   （动作不适用）。系统失败（非 CONFLICT）不产生标记——无出口。
 * - 点击动作钮只打开确认框，不丢弃。确认框首行＝main 返回的具体拒因消息（标记的 message 原文），
 *   说明行＝丢弃的范围与后果。
 * - 确认（「丢弃」钮）才调 store.discardStaleHistory；取消／关闭 X／Escape／点遮罩＝关闭确认框、
 *   零变化。丢弃必须用户点击并确认——不静默自动跳过。
 * - 确认框开期间出口失效（错误行消失——如写链起步把相位写成 saving，或标记项已不在栈顶）＝
 *   确认框随本件卸载而消失，不存在「对着已失效的项确认」。
 *
 * ── 接口层 ── export function LineageStaleHistoryDrop(): JSX.Element | null
 *
 * ── 架构层 ── 受控件：读 store 活动投影，丢弃经 store 动作（registry 单一写路径），零直写。
 * 确认框复用 shared/ui/Dialog（不重写模态机制），经 portal 挂 document.body（工具组祖先若有
 * transform 会改变 fixed 定位的包含块）；文案单源＝shared/ui-constants（LINEAGE_STALE_DROP_*）。
 * 受控锚：data-testid=lineage-stale-drop（动作钮）。
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Dialog } from '../../shared/ui/Dialog'
import { Button } from '../../shared/ui/Button'
import {
  LINEAGE_STALE_DROP_ACTION,
  LINEAGE_STALE_DROP_CONFIRM,
  LINEAGE_STALE_DROP_NOTE,
  LINEAGE_STALE_DROP_TITLE
} from '../../shared/ui-constants'
import { useLineageStore } from './lineage.store'
import { staleHistoryAtTop } from './lineage-history-stale'

export function LineageStaleHistoryDrop(): JSX.Element | null {
  /** 确认框开态（点击动作钮只开框——丢弃须再点确认钮） */
  const [confirming, setConfirming] = useState(false)
  const undoStack = useLineageStore((s) => s.undoStack)
  const redoStack = useLineageStore((s) => s.redoStack)
  const staleHistory = useLineageStore((s) => s.staleHistory)
  const stale = staleHistoryAtTop({ undoStack, redoStack, staleHistory })
  if (stale === null) return null // 无过期标记，或标记项已不在栈顶——出口不适用
  const close = (): void => setConfirming(false)
  return (
    <>
      <button type="button" data-testid="lineage-stale-drop" onClick={() => setConfirming(true)}>
        {LINEAGE_STALE_DROP_ACTION}
      </button>
      {confirming &&
        createPortal(
          <Dialog
            open
            title={LINEAGE_STALE_DROP_TITLE}
            onClose={close}
            actions={
              <>
                <Button variant="ghost" size="sm" onClick={close}>
                  取消
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    close()
                    useLineageStore.getState().discardStaleHistory()
                  }}
                >
                  {LINEAGE_STALE_DROP_CONFIRM}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-1 text-xs leading-6" style={{ color: 'var(--text)' }}>
              <p>{stale.message}</p>
              <p>{LINEAGE_STALE_DROP_NOTE}</p>
            </div>
          </Dialog>,
          document.body
        )}
    </>
  )
}
