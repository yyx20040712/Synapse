// b3: P7-G
/**
 * [SR2-AI-04] CorpusExportSection —— 设置页 AI 语料导出节（工单：done / strong）
 *
 * ── 行为层 ──
 * - 设置页「AI 语料导出」节：单按钮「导出语料」（目录选择在通道内 main 系统
 *   对话框——INV-07，renderer 不传路径）+进度行（phase+done/total 文件计数）
 *   +errorCount 终局呈现（部分成功可见）
 * - 进度可见性走应用 UI 事件（exportCorpus progress 载荷）→
 *   corpus-export.store（zustand 既有先例）→ 组件消费——不走 manifest
 * - App 层订阅 useExportCorpusEvents（INV-14 成对清理）：完成/失败 toast
 *   常驻可见（INV-02——设置节卸载后反馈不丢，R14）；与 Settings/Reader
 *   挂载态零耦合（导出中导航离开设置页流不中断）
 * - 单飞联动：busy 期间按钮 disabled（loading 态）——通道层 EXPORT_BUSY 折叠
 *   （INV-13/INV-18）的 UI 预防面+错误 message toast 兜底
 * - 不建 AI 配置 UI（D2b：模型三件配置全在 zcode 工具侧 config）
 *
 * ── 接口层 ──
 * - export function CorpusExportSection(): JSX.Element
 * - 交付面：corpus-export.store.ts（进度态）+useExportCorpusEvents.ts
 *   （App 层订阅）+SettingsPage 挂载（SettingsPage 现状 ~172 行+导出节
 *   将触组件 250 行限——拆本组件即防线，R14）
 *
 * ── 架构层 ──
 * - renderer/features/settings 域；依赖 corpus-export.store+shared/ui/Button
 *   （toast/事件桥不在本组件——App 层职责）
 *
 * ── 生命周期层 ──
 * - 不做：导出历史/目标目录记忆/取消按钮（v1 极简——中断重跑即修复）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/corpus-export.test.tsx（已锁定：store 三面+
 *   hook 事件桥+组件/挂载）；e2e tests/e2e/corpus-export.spec.ts（受锁：
 *   全链+真渲染面+残留清空重建）
 */
import { Button } from '../../shared/ui/Button'
import { useCorpusExportStore, type CorpusExportPhase } from './corpus-export.store'

/** 进度相位中文标签（显示单源——组件内文案不外泄） */
const PHASE_LABEL: Record<CorpusExportPhase, string> = {
  preparing: '准备语料',
  streaming: '提取全文',
  finalizing: '生成清单',
  done: '完成'
}

export function CorpusExportSection(): JSX.Element {
  const busy = useCorpusExportStore((s) => s.busy)
  const phase = useCorpusExportStore((s) => s.phase)
  const done = useCorpusExportStore((s) => s.done)
  const total = useCorpusExportStore((s) => s.total)
  const errorCount = useCorpusExportStore((s) => s.errorCount)
  const start = useCorpusExportStore((s) => s.start)

  return (
    <section className="flex flex-col gap-2" data-testid="corpus-export-section">
      <h2 className="text-sm font-medium">AI 语料导出</h2>
      <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
        将全库文献导出为 AI 语料目录（corpus 语料+全文 txt+页面图+manifest 清单+
        INTERFACE 说明），供外部 AI 工具消费；目标目录在系统对话框中选择，导出
        开始时将清空重建该目录下的产物子目录。
      </p>
      <div>
        <Button variant="primary" size="sm" loading={busy} onClick={() => void start()}>
          导出语料
        </Button>
      </div>
      {phase !== null && (
        <p
          className="text-xs"
          data-testid="corpus-export-progress"
          style={{ color: 'var(--text-dim)' }}
        >
          {PHASE_LABEL[phase]}
          {total > 0 ? ` ${done}/${total}` : ''}
          {errorCount > 0 ? `，${errorCount} 篇失败` : ''}
        </p>
      )}
    </section>
  )
}
