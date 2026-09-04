# 门一 W1 回炉补充材料包（夜场 N 级清扫合批）

本包=W1 三新文件全文+台账 hunk+三条存疑澄清。代码零改动（纯补材料）。
请对补充面定点复核并给终裁（ADDRESSED/NOT ADDRESSED+新发现单列）。

## 存疑澄清（先答）

### 存疑1 F-G3「2 红」来源——RED 期两用例均红（函数不存在），变异期 1 红（如你的推演）
- night1-fg3-red.raw.txt = **RED 期**（实现前）：boundsToPersist 尚不存在，命名导入
  为 undefined → 两个新用例（maximized 取 normal+常态等值）调用即各抛 TypeError，
  **2 红=两个新用例各一**（4 passed=既有用例）。非变异档。
- night1-fg3-mutation.raw.txt = **变异期**（getBounds 化）：恰 **1 红=最大化用例**
  （常态等值用例按设计仍绿=行为零变旁证）——与你的数学推演一致。红证链自洽。

### 存疑2 leave-full-screen 回读时序——按「降级已知风险入台账」处置
Electron 文档语义：leave-full-screen 在窗口退出全屏后发射。处置=台账 F-G9 行增补
「leave 回读时序无真机验证（mock 单测锚的是回读语义非事件时序）；真机 F11 双击
验证留给在场场次」备注（见下方台账 hunk）。闲时场不做前台真机操作（纪律①）。

### 存疑3 locks 覆盖面——只锁 tests/shared/migrations/CI/lint/构建/脚本配置面，**不含 src/ 源文件**
故 import-gate.ts/UiScaleSection.tsx 两源文件无锁变动=机制内常态，非遗漏；
新增 tests/unit/main/import-gate.test.ts 已 generate+apply（240→241）。

## W1 三文件全文（依次）

diff --git a/docs/audits/audit0-findings.md b/docs/audits/audit0-findings.md
index ad47ecbf6..3fd7330d2 100644
--- a/docs/audits/audit0-findings.md
+++ b/docs/audits/audit0-findings.md
@@ -542,13 +542,13 @@ F-L1 用户已裁决变体 C+「防重叠遮挡+悬停滚动」两保证(F-L1-C
 | --- | --- | --- | --- | --- |
 | F-G1 | multiply 叠色物理上限(灰选中×黄标注=橄榄;F-A1 归并不覆盖此面——那是标注×标注,此是选中×标注) | N | 备案;用户不满意则 backdrop 隔离实验(重开 ADR-0019 风险) | v7 §4 |
 | F-G2 | F-11 收边定值 10%/12% 极端字体偏松/偏紧 | N | 备案;F-A1 归并后一并复评 | v7 §4 |
-| F-G3 | maximized 态关窗 saveBounds 存大 bounds(恢复大窗非最大化) | N | 备案;候选修法在档 | v8 E4 |
+| F-G3 | maximized 态关窗 saveBounds 存大 bounds(恢复大窗非最大化) | **已修** | 2026-09-03 夜场闭环：window-state 增 boundsToPersist(取 getNormalBounds)——maximized 落还原态几何,常态等值零变;bootstrap close 接线+两用例锚+变异红证 | v8 E4 |
 | F-G4 | invariants.md 不在受锁集 | N | 备案 | v9 W2 |
 | F-G5 | 变异还原 diff 未落档(间接实证) | N | 流程项:此后变异还原也落 .raw.txt | v9 W4 |
 | F-G6 | SettingsPage 表单水合前窄窗(固有) | N | 备案 | v9 门二 |
-| F-G7 | SettingsPage 244 行(余量 6)——下个设置节必拆 UiScaleSection | N | 预警 | v9 |
-| F-G8 | SH3 drag 面断言 toContain 未计数 | N | 同类风险随 F-A1 票一并扫 | v8 SH3 门一 C9 |
-| F-G9 | fullscreen 不反映 maximize 图标 | N | 备案 | v8 SH3 门一 C12 |
+| F-G7 | SettingsPage 244 行(余量 6)——下个设置节必拆 UiScaleSection | **已拆** | 2026-09-03 夜场闭环:UiScaleSection.tsx 自持(73 行,store 直订,先例=CorpusExport 节),SettingsPage 244→209 | v9 |
+| F-G8 | SH3 drag 面断言 toContain 未计数 | **已修** | 2026-09-03 夜场闭环:drag 计数锁=恰 1 处(与 no-drag 计数断言对偶;错数 2 红证) | v8 SH3 门一 C9 |
+| F-G9 | fullscreen 不反映 maximize 图标 | **已修** | 2026-09-03 夜场闭环:bindWindowStateEvents 补 enter/leave-full-screen 沿(enter→true/leave→回读 isMaximized);TitleBarControls 状态机声明同步(接缝归责);三 payload 用例+变异红证;门一 N1 备案=fullscreen 中三键 toggle 错位(图标反映 Only 票面边界);存疑2 备注=leave 回读时序无真机验证(mock 锚回读语义非事件时序),真机 F11 双击验证留给在场场次 | v8 SH3 门一 C12 |
 | F-G10 | P7-A 系统剪贴板竞态 flake | **已修** | v18 U2 闭环（2026-09-02）：清场标记+条件重读防线入 spec（[locked-change]），连跑 3 次 P7-A 全绿 | v8 §2→v18 U2 |
 | F-G11 | P7-A 分隔条拖拽（reader-text:568 SplitPane 集成）序列态非确定红：对跑内 1 红（widthAfter−widthBefore=−64/期望 ≥70，拖拽反向/落点错位形态）+单跑×5 全绿——序列依赖签名与 F-R2e 同族；另全量 run3「1 failed」身份未捕获（矩阵循环未 tee 输出，过程失误在档）不计入 | N | 备案观察：确认计数=1，未触同用例 2 次立案线；环境注记=本机前台占用态对真鼠标拖拽面敏感；再现按立案线通则升格 | 六波场 §6 |
 | F-R2e | e2e「划选高亮重开原位」序列敏感脆弱面：全量序列第三跑 3.45px 超 2px 容差（同值复现）但单跑绿+U1 收口全量亦绿——窗态持久化/顺序依赖噪声（测试注释自认已知噪声源；R3-RDRSET「间歇红环境波动」前科同族） | N | 备案 v19 观察项：再现 ≥2 次立案（容差/窗态种子隔离两案裁决）。**2026-09-02 注入证伪**：窗态差假说被实测推翻——四档注入（height 799/width 1272/1200×700×2 跑）全绿，rel 归一坐标对窗态差不敏感（归一化设计有效性反获确认，注释无需勘误）；全量 3 连跑 29/29×3 未复现；剩余嫌疑=顺序依赖/负载态（无复现不可定位）；收口后失败计数仍=1，不触发 ≥2 立案线，维持观察 | v18 U2 三连跑+2026-09-02 A-1 探针 |
=== FILE 1: src/main/import-gate.ts ===
/**
 * import 并发计数 gate（F-D4 A 面，INV-52）。
 *
 * 原形态=bootstrap 顶层闭包计数（F-D4 brief「接口层」原案）；C-3 N 级知晓项
 * 「并发双 import 计数中间态（2→1→0）无测试锚」转正拆模块——闭包不可单测，
 * 语义需锚定。计数语义与原闭包逐位一致（行为零变）：
 * - enter/exit 成对（import 会话起止各调一次；域错误上抛路径也在 try/finally 内）
 * - 计数 >0 = import in-flight——并发双 import 首个完成时 2→1，仍 in-flight
 *   （不误释 workspace 变更三入口互斥）；全部完成 1→0 才放行
 * - in-flight 判定=main 侧计数单源，renderer busy 不参与（两进程面各自独立）
 */
export interface ImportGate {
  enter(): void
  exit(): void
  /** workspace 变更三入口（create/rename/switch）互斥判定源 */
  inFlight(): boolean
}

export function createImportGate(): ImportGate {
  let count = 0
  return {
    enter: () => {
      count += 1
    },
    exit: () => {
      count -= 1
    },
    inFlight: () => count > 0
  }
}

=== FILE 2: tests/unit/main/import-gate.test.ts ===
import { describe, expect, it } from 'vitest'
import { createImportGate } from '../../../src/main/import-gate'

describe('main/import-gate —— import 并发计数（C-3 N1 转正：中间态测试锚）', () => {
  it('单会话：enter→in-flight，exit→空闲', () => {
    const gate = createImportGate()
    expect(gate.inFlight()).toBe(false)
    gate.enter()
    expect(gate.inFlight()).toBe(true)
    gate.exit()
    expect(gate.inFlight()).toBe(false)
  })

  it('并发双 import 计数中间态 2→1→0：首个完成不误释互斥（>0 判定），全完成才空闲', () => {
    const gate = createImportGate()
    gate.enter()
    gate.enter()
    expect(gate.inFlight()).toBe(true) // 计数=2：双 import 在途
    gate.exit() // 首个 import 完成：2→1
    expect(gate.inFlight()).toBe(true) // 仍 in-flight——次个未完不误释互斥
    gate.exit() // 次个完成：1→0
    expect(gate.inFlight()).toBe(false)
  })
})

=== FILE 3: src/renderer/features/settings/UiScaleSection.tsx ===
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
 * - 测试：e2e smoke「R2-SET1 界面缩放」真渲染面锚定（点档→toast+nav rect
 *   缩放）；store 面=settings.store.test（save 透传/乱序守卫六用例锁定）
 */
import { UI_SCALE, type UiScale } from '@shared/ipc/schemas'
import { ApiClientError } from '../../api/client'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import { useSettingsStore } from './settings.store'
import { SettingsSection } from './SettingsSection'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const OP_FAILED = '操作失败'

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
