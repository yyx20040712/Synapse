/**
 * [R2-SET1→F-G7 拆件] UiScaleSection —— 设置页「界面缩放」节（自持组件）
 *
 * ── 行为层 ──
 * - 三档 segmented（small/medium/large；当前档 primary 高亮）：点档即存——
 *   与通用节「保存设置」按钮独立（SettingsPage runSave 面不涉缩放）
 * - 同因必须组装全量：set 通道 Req=完整 appSettingsSchema（register strict
 *   校验+整体落盘），漏带会被 zod default 静默填 'small' 抹掉用户已选档位
 *   （INV-39；载荷组装纪律从 SettingsPage 原地迁入，语义零变）
 * - 档位真值取 store（设置页 load 与 App 挂载 load 同源幂等）；未载入前
 *   默认 small——与 App 兜底同口径
 *
 * ── 接口层 ──
 * - export function UiScaleSection(): JSX.Element
 * - F-G7：SettingsPage 244 行触组件上限预警——本节拆出自持（先例=
 *   CorpusExportSection/ZcodeLinkSection；store 直订，props 零传）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - renderer/features/settings 域；依赖 settings.store+shared/ui/Button+Toast
 * - 测试：e2e smoke「R2-SET1 界面缩放」真渲染面锚定——rect ×1.25 断言经
 *   save 落地→store 替换→App 订阅 uiScale→--ui-scale 链传递性锚定 INV-39 全量
 *   载荷组装（漏带字段→zod default 回 small→rect 不缩→红，门一 N-3 在档）；
 *   store 面=settings.store.test（save 透传/乱序守卫六用例锁定）
 */
import { UI_SCALE, type UiScale } from '@shared/ipc/schemas'
import { ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED } from '../../shared/ui-constants'
import { useSettingsStore } from './settings.store'
import { SettingsSection } from './SettingsSection'

/** R2-SET1 界面缩放三档档名（百分比经 UI_SCALE 数值单源推导，不手写第二份） */
const UI_SCALE_LABEL: Record<UiScale, string> = { small: '小', medium: '中', large: '大' }

export function UiScaleSection(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const saving = useSettingsStore((s) => s.saving)
  const save = useSettingsStore((s) => s.save)
  const uiScale = settings?.uiScale ?? 'small'

  function pickScale(next: UiScale): void {
    if (saving || settings === null || settings.uiScale === next) {
      return
    }
    save({ contactEmail: settings.contactEmail, theme: settings.theme, uiScale: next })
      .then(() => showToast('界面缩放已保存', 'success'))
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
      })
  }

  return (
    <SettingsSection title="界面缩放">
      <div className="flex items-center gap-2" role="group" aria-label="界面缩放档位">
        {(Object.keys(UI_SCALE_LABEL) as UiScale[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={uiScale === s ? 'primary' : 'ghost'}
            disabled={saving || settings === null}
            onClick={() => pickScale(s)}
          >
            {`${UI_SCALE_LABEL[s]} ${Math.round(UI_SCALE[s] * 100)}%`}
          </Button>
        ))}
      </div>
      <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
        缩放侧栏与内容区文字；顶栏保持系统观感，PDF 页面恒原始大小（阅读区豁免）。
      </p>
    </SettingsSection>
  )
}
