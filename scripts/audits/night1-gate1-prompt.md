# 门一审简报——夜场 N 级清扫合批（F-G3/F-G7/F-G8/F-G9+C-3 四知晓项转正）

批次：闲时任务场（v27 §2 第 1 项）。五小票合批，主控亲做（快票形态，蓝本=F-ARCH 修复批合批审）。
材料包=本简报+同目录 night1-batch.diff（全量代码 diff,438 行）。逐票审。

## 票面与实现形态

### 1. F-G3 maximized 态关窗 saveBounds 存大 bounds（v8 E4）
- 病根：bootstrap close 监听 `window.getBounds()` 落盘——maximized 态返回最大化尺寸→
  下次启动恢复「大窗非最大化」。
- 修法：window-state.ts 增 `boundsToPersist(win)`（取 `getNormalBounds()`，maximized 下=
  还原态几何，常态下与 getBounds 等值=行为零变）；bootstrap 接线。
- 测试锚：window-state.test.ts 两用例（maximized 取 normal/常态等值）；变异红证=
  boundsToPersist 改 getBounds 后最大化用例红（night1-fg3-mutation.raw.txt）。
- 审点①：getNormalBounds 语义（Electron 42，maximized/fullscreen 下返回 normal 态
  bounds）是否成立；close 时窗口 minimized 的边界。

### 2. F-G7 SettingsPage 拆 UiScaleSection（v9 预警：244 行余量 6）
- 修法：界面缩放节（UI_SCALE_LABEL/pickScale/三档 JSX）拆自持组件 UiScaleSection.tsx
  （73 行，store 直订零 props，先例=CorpusExportSection）；SettingsPage 244→209。
- runSave 残留 `uiScale` 局部量引用改 `settings?.uiScale ?? 'small'`（与原局部量同式，
  typecheck 拦截后修）。
- 审点②：拆件后 runSave 载荷语义是否与拆前逐位等价（原局部量=settings?.uiScale ??
  'small'）；UiScaleSection 直订 store 是否引入新的水合/时序面。

### 3. F-G8 SH3 drag 面断言 toContain 未计数（v8 SH3 门一 C9）
- 修法：window-control.test.ts drag 断言改 split 计数=恰 1（与 no-drag 计数断言对偶）。
  literal `-webkit-app-region: drag` 不匹配 `no-drag`（机器核实 drag=1/no-drag=2）。
- 红证=错数（toBe(2)）红 night1-fg8-redproof.raw.txt。

### 4. F-G9 fullscreen 不反映 maximize 图标（v8 SH3 门一 C12）
- 修法：bindWindowStateEvents 补两沿——enter-full-screen→send(true)；leave-full-screen
  →send(win.isMaximized())（离开后回最大化态图标不撒谎）；MaximizeEventsLike 接口扩
  两事件+isMaximized 回读。
- 接缝归责：TitleBarControls.tsx 状态机头注同步扩声明（true 态含 fullscreen 进入）。
- 测试锚：三 payload 用例；变异红证=摘 enter-full-screen 绑定后红
  （night1-fg9-mutation.raw.txt）。fullscreen 中点三键 toggle 的行为备案不在票面。
- 审点③：enter→true 映射下，fullscreen 中 isMaximized() 常为 false——图标显示「向下
  还原」但点击会走 maximize 分支的错位是否可接受（N 级备案 vs 应处理）；leave 回读
  isMaximized 的时序（leave 事件触发时窗口状态是否已迁移完成）。

### 5. C-3 四知晓项转正（AUDIT-C 修票场门一登记）
- ①并发双 import 计数锚：bootstrap 闭包计数拆 createImportGate() 模块
  （src/main/import-gate.ts，语义逐位一致：enter++/exit--/inFlight=>0）；
  import-gate.test.ts 两用例锚 2→1→0 中间态；变异红证=count>0 改 count>1 后红。
- ②时序表第③格显式化：workspace.test.ts 新用例（真 gate 接线）——enter×2 拒→
  exit 一次（2→1）仍拒→再 exit（1→0）放行走 L0 物化全序（closeCalls=1/
  assembledDirs=[default]/指针落位）；变异红证=create 的 importInFlight 检查摘除后
  两用例红（night1-c3-ws-mutation.raw.txt）。
- ③链深≥3：settings.store.test.ts 新用例（save₃ 排队尾尾相接，逐个补发，终态=save₃
  值）；变异红证=链删（直发）后三用例红（night1-c3-sv-mutation.raw.txt）。
- ④用例②载荷对称：链不断用例补 toHaveBeenNthCalledWith(2,{contactEmail:'two@x.y'})。
- 审点④：createImportGate 拆模块后 bootstrap 两处注入（createServices 传 gate 对象/
  workspaceService 传 gate.inFlight）是否保持「同一对象」事实（容器重建 gate 不重建）。

## 证据链（raw 皆 scripts/audits/）
- RED：night1-fg3-red（2 红）/night1-fg9-red（1 红）
- GREEN：各 *-green*.raw.txt；verify3=exit 0：**128 文件 1113 用例**（基线 127/1106+7）；
  locks 241（240+import-gate.test.ts 即时 generate+apply）；e2e 33/33 全绿
  （night1-batch-e2e.raw.txt，含 smoke:118 三键/smoke:160 界面缩放两面）
- 变异：fg3（getBounds 化红）/fg9（摘沿红）/fg8（错数红）/c3-gate（>1 红）/
  c3-ws（摘检红×2）/c3-sv（链删红×3）——全部备份法还原，diff 空（RESTORED-IDENTICAL）
- 过程失误如实申报：①首次 ws 变异用 node -e 字符串替换静默未命中（16 全绿暴露），
  改 sed 行号法+命中守卫重做；②verify 首跑 typecheck 拦两处（mock 缺 isMaximized/
  runSave 残留 uiScale）——vitest 不查类型、tsc 才拦的已知形态再现。

## 审查问题（定向）
Q1 逐票对照：五票实现与票面有无偏差/超范围改动（diff 内非票面文件=TitleBarControls
   头注=接缝归责申报，请核其必要性）？
Q2 F-G3/F-G9 各自的边界态（minimized 关窗/leave-full-screen 时序/toggle 错位）有无
   代码级缺陷（区分「N 级备案可接受」与「必须修」）？
Q3 新测试恒真风险：五组新断言逐条能否失败（对照各变异红证）？计数锚 2→1→0 的
   中间态断言是否真在测「>0 判定」而非影子实现？
Q4 台账改写（audit0-findings.md 四行翻已修）与事实一致性。

输出分级：B（阻断）/W（回炉）/N（知晓）+存疑单列。每条给 file:line 证据。
diff --git a/src/main/bootstrap.ts b/src/main/bootstrap.ts
index 657c4f1d6..27a7d4694 100644
--- a/src/main/bootstrap.ts
+++ b/src/main/bootstrap.ts
@@ -46,6 +46,7 @@ import { createServices } from './services'
 import { AI_SENSOR_DIR_NAME } from './services/ai_sensor/ai-sensor.service'
 import { resolveTemplateDir } from './services/ai_sensor/zcode-link.service'
 import { createDataLayerContainer } from './data-layer.container'
+import { createImportGate } from './import-gate'
 import { migrateLegacyUserData } from './migrate-user-data'
 import { ensureWorkspaceLayout, initWorkspaceDb } from './workspace-layout'
 import { createWorkspaceService } from './services/workspaces/workspace.service'
@@ -62,7 +63,7 @@ import {
   getQuitDirty,
   setQuitDirty
 } from './windows/main-window'
-import { loadBounds, saveBounds, type WindowBounds } from './windows/window-state'
+import { loadBounds, saveBounds, boundsToPersist, type WindowBounds } from './windows/window-state'
 import { fetchJson, fetchText, pingHost } from './http/http-client'
 import { EVENT_CHANNELS } from '../shared/ipc/api-surface'
 
@@ -89,16 +90,9 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
   // ── import 会话 gate（F-D4 A 面，INV-52）：顶层一次创建——在容器 assemble 闭包
   //    之外（每层 service 重建但 gate 同一对象）；计数>0=import in-flight，
   //    workspace 变更三入口互斥判定源。in-flight 判定=main 侧计数单源，renderer
-  //    busy 不参与（两进程面各自独立）──
-  let importInFlightCount = 0
-  const importGate = {
-    enter: () => {
-      importInFlightCount++
-    },
-    exit: () => {
-      importInFlightCount--
-    }
-  }
+  //    busy 不参与（两进程面各自独立）。C-3 N1 转正：闭包计数拆 createImportGate
+  //    模块（并发中间态 2→1→0 语义入测试锚），行为逐位一致 ──
+  const importGate = createImportGate()
 
   // ── 数据层容器（课题级可重建；与库无关项=闭包外参——票面 P1）──
   const container = createDataLayerContainer({
@@ -146,7 +140,7 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
   // switch 抛 CONFLICT 中文，拒时零库副作用）
   const workspaceService = createWorkspaceService({
     userDataDir,
-    importInFlight: () => importInFlightCount > 0,
+    importInFlight: importGate.inFlight,
     initWorkspaceDb,
     closeCurrent: () => container.closeCurrent(),
     assembleInto: (dataDir) => container.assembleInto(dataDir)
@@ -206,8 +200,8 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
   )
   window.on('close', () => {
     if (!window.isDestroyed() && window.isVisible()) {
-      const b = window.getBounds()
-      void saveBounds(userDataDir, { x: b.x, y: b.y, width: b.width, height: b.height })
+      // F-G3：取 normal 态 bounds——maximized 态关窗不落最大化尺寸
+      void saveBounds(userDataDir, boundsToPersist(window))
     }
   })
 
diff --git a/src/main/windows/main-window.ts b/src/main/windows/main-window.ts
index 5397c880a..431c1257d 100644
--- a/src/main/windows/main-window.ts
+++ b/src/main/windows/main-window.ts
@@ -32,7 +32,8 @@
  * - export function controlWindow(win: WindowLike, action: WindowControlAction)：
  *   执行后 isMaximized() 回读返回
  * - export function bindWindowStateEvents(win: MaximizeEventsLike, send)：maximize
- *   沿 → send({maximized:true}) / unmaximize 沿 → send({maximized:false})
+ *   沿 → send({maximized:true}) / unmaximize 沿 → send({maximized:false})；
+ *   F-G9 fullscreen 沿同入反映面（enter→true / leave→回读 isMaximized()）
  *
  * ── 架构层 ──
  * - main/windows 层；新通道走 shared/ipc/api-surface.ts 接线表（zod strict，
@@ -222,10 +223,15 @@ export interface WindowLike {
   isMaximized(): boolean
 }
 
-/** maximize 事件源最小形状（win.on('maximize'/'unmaximize')） */
+/** maximize 事件源最小形状（win.on('maximize'/'unmaximize'/'enter-full-screen'/
+ *  'leave-full-screen') + leave 后状态回读；结构化类型：测试免依赖 electron 真体） */
 export interface MaximizeEventsLike {
   on(event: 'maximize', listener: () => void): void
   on(event: 'unmaximize', listener: () => void): void
+  on(event: 'enter-full-screen', listener: () => void): void
+  on(event: 'leave-full-screen', listener: () => void): void
+  /** F-G9：leave-full-screen 后窗口可能回最大化态——回读真值而非恒 false */
+  isMaximized(): boolean
 }
 
 /**
@@ -258,6 +264,10 @@ export function controlWindow(win: WindowLike, action: WindowControlAction): { m
  * maximize 状态推送绑定：事件沿（含双击 drag 区最大化等 Windows 系统行为触
  * 发的沿）→ send 回传 renderer 图标态；初值不在本函数——renderer 挂载时
  * get-state 拉取（主控预裁②：时序自包含，不依赖 effect 与 load 事件先后）。
+ * F-G9：fullscreen 沿（F11 等走 enter/leave-full-screen 而非 maximize 沿，
+ * v8 SH3 门一 C12）补入反映面——enter 视占满屏发 true；leave 回读
+ * isMaximized()（离开后回最大化态图标不撒谎）。fullscreen 中点三键的
+ * toggle 行为不在本票面（图标反映 Only），备案。
  */
 export function bindWindowStateEvents(
   win: MaximizeEventsLike,
@@ -265,4 +275,6 @@ export function bindWindowStateEvents(
 ): void {
   win.on('maximize', () => send({ maximized: true }))
   win.on('unmaximize', () => send({ maximized: false }))
+  win.on('enter-full-screen', () => send({ maximized: true }))
+  win.on('leave-full-screen', () => send({ maximized: win.isMaximized() }))
 }
diff --git a/src/main/windows/window-state.ts b/src/main/windows/window-state.ts
index f0bc65f40..7d0fd4770 100644
--- a/src/main/windows/window-state.ts
+++ b/src/main/windows/window-state.ts
@@ -57,3 +57,19 @@ export async function saveBounds(userDataDir: string, bounds: WindowBounds): Pro
     // 持久化失败不阻断退出
   }
 }
+
+/** 关窗持久化的 bounds 来源最小形状（结构化类型：测试免依赖 electron 真体） */
+export interface BoundsProvider {
+  getBounds(): { x: number; y: number; width: number; height: number }
+  getNormalBounds(): { x: number; y: number; width: number; height: number }
+}
+
+/**
+ * F-G3：关窗持久化取 normal 态 bounds。maximized 态下 getBounds() 是最大化
+ * 尺寸，落盘会让下次启动恢复成「大窗非最大化」；getNormalBounds() 在
+ * maximized 下返回还原态几何，常态下与 getBounds() 等值（行为零变）。
+ */
+export function boundsToPersist(win: BoundsProvider): WindowBounds {
+  const b = win.getNormalBounds()
+  return { x: b.x, y: b.y, width: b.width, height: b.height }
+}
diff --git a/src/renderer/app/TitleBarControls.tsx b/src/renderer/app/TitleBarControls.tsx
index f9895cdd2..59ae3d201 100644
--- a/src/renderer/app/TitleBarControls.tsx
+++ b/src/renderer/app/TitleBarControls.tsx
@@ -7,8 +7,8 @@
  * - maximize 态状态机：
  *   | 态 | 含义 | 迁移 |
  *   | unknown(null) | 挂载初值未拉到 | get-state 应答 → true/false |
- *   | true | 窗口最大化 | unmaximize 沿 / toggle 应答 → false |
- *   | false | 常态 | maximize 沿（含双击 drag 区等系统行为）→ true |
+ *   | true | 窗口最大化（F-G9：fullscreen 进入亦发 true——图标反映占满屏） | unmaximize 沿 / toggle 应答 / leave-full-screen 沿且非常最大化 → false |
+ *   | false | 常态 | maximize 沿（含双击 drag 区等系统行为）/ enter-full-screen 沿 → true |
  * - 点击 → api.system.windowControl({action})；应答回读 maximized 同步图标态
  *   （事件沿与应答双通道收敛到同一 setState；点击应答与事件沿必然同值，
  *   后到者胜=终态一致——get-state 初值应答例外：仅 unknown 态生效，防
diff --git a/src/renderer/features/settings/SettingsPage.tsx b/src/renderer/features/settings/SettingsPage.tsx
index 8d2e966b8..c7e1abf52 100644
--- a/src/renderer/features/settings/SettingsPage.tsx
+++ b/src/renderer/features/settings/SettingsPage.tsx
@@ -26,8 +26,9 @@ import { showToast } from '../../shared/ui/Toast'
 import { useSettingsStore } from './settings.store'
 import { CorpusExportSection } from './CorpusExportSection'
 import { SettingsSection } from './SettingsSection'
+import { UiScaleSection } from './UiScaleSection'
 import { ZcodeLinkSection } from './ZcodeLinkSection'
-import { UI_SCALE, type AppSettings, type UiScale } from '@shared/ipc/schemas'
+import type { AppSettings } from '@shared/ipc/schemas'
 
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const OP_FAILED = '操作失败'
@@ -39,9 +40,6 @@ const THEME_LABEL: Record<AppSettings['theme'], string> = {
   system: '跟随系统'
 }
 
-/** R2-SET1 界面缩放三档档名（百分比经 UI_SCALE 数值单源推导，不手写第二份） */
-const UI_SCALE_LABEL: Record<UiScale, string> = { small: '小', medium: '中', large: '大' }
-
 /** workspaceSection：课题管理节由 App 组合根注入（跨域经 App 编排——feature
  *  互引被 quality 门禁禁止，R1-WS2；dirty 聚合值随节由 App 一并注入） */
 export function SettingsPage(props: { workspaceSection?: ReactNode }): JSX.Element {
@@ -55,9 +53,6 @@ export function SettingsPage(props: { workspaceSection?: ReactNode }): JSX.Eleme
   const [email, setEmail] = useState('')
   const [theme, setTheme] = useState<AppSettings['theme']>('system')
   const [diagnosing, setDiagnosing] = useState(false)
-  // R2-SET1：档位真值取 store（设置页 load 与 App 挂载 load 同源幂等）；未载入
-  // 前默认 small——与 App 兜底同口径
-  const uiScale = settings?.uiScale ?? 'small'
 
   // 载入后同步进表单（settings 到达晚于首帧）
   useEffect(() => {
@@ -87,25 +82,14 @@ export function SettingsPage(props: { workspaceSection?: ReactNode }): JSX.Eleme
     }
     // uiScale 随行全量携带：set 通道 Req=完整 appSettingsSchema（register strict
     // 校验+整体落盘），漏带会被 zod default 静默填 'small' 抹掉用户已选档位
-    save({ contactEmail: email, theme, uiScale })
+    // （F-G7 拆件后档位真值改直读 store——与 UiScaleSection 同口径：未载入默认 small）
+    save({ contactEmail: email, theme, uiScale: settings?.uiScale ?? 'small' })
       .then(() => showToast(SAVE_OK, 'success'))
       .catch((e: unknown) => {
         showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
       })
   }
 
-  // R2-SET1 点档：同因必须组装全量（缺省字段会被 default 覆盖现值，见 runSave 注）
-  function pickScale(next: UiScale): void {
-    if (saving || settings === null || settings.uiScale === next) {
-      return
-    }
-    save({ contactEmail: settings.contactEmail, theme: settings.theme, uiScale: next })
-      .then(() => showToast('界面缩放已保存', 'success'))
-      .catch((e: unknown) => {
-        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
-      })
-  }
-
   async function runDiagnose(): Promise<void> {
     if (diagnosing) {
       return
@@ -170,26 +154,8 @@ export function SettingsPage(props: { workspaceSection?: ReactNode }): JSX.Eleme
 
       <DiamondRule />
 
-      {/* R2-SET1 界面缩放：三档 segmented（当前档 primary 高亮；即时保存——
-          与下方通用节的「保存设置」按钮独立，点档即生效） */}
-      <SettingsSection title="界面缩放">
-        <div className="flex items-center gap-2" role="group" aria-label="界面缩放档位">
-          {(Object.keys(UI_SCALE_LABEL) as UiScale[]).map((s) => (
-            <Button
-              key={s}
-              size="sm"
-              variant={uiScale === s ? 'primary' : 'ghost'}
-              disabled={saving || settings === null}
-              onClick={() => pickScale(s)}
-            >
-              {`${UI_SCALE_LABEL[s]} ${Math.round(UI_SCALE[s] * 100)}%`}
-            </Button>
-          ))}
-        </div>
-        <p className="text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
-          缩放侧栏与内容区文字；顶栏保持系统观感，PDF 页面恒原始大小（阅读区豁免）。
-        </p>
-      </SettingsSection>
+      {/* R2-SET1 界面缩放：F-G7 拆自持组件（三档 segmented 即时保存——行为零变） */}
+      <UiScaleSection />
 
       <DiamondRule />
 
diff --git a/tests/unit/renderer/settings.store.test.ts b/tests/unit/renderer/settings.store.test.ts
index 34dbb0ee8..629c0a6af 100644
--- a/tests/unit/renderer/settings.store.test.ts
+++ b/tests/unit/renderer/settings.store.test.ts
@@ -181,14 +181,47 @@ describe('F-SV settings.save 链式全序（并发写互斥）', () => {
     // save₁ 的失败上抛 save₁ 的调用方（动作型契约零变，不吞不串）
     await expect(pSave1).rejects.toThrow('写盘失败')
     await flush()
-    // 链未被失败折断：save₂ 照常发出
+    // 链未被失败折断：save₂ 照常发出——载荷为 save₂ 自身补丁（C-3 N3：与用例①
+    // 的 toHaveBeenNthCalledWith 断言对偶，不靠终态隐含覆盖）
     expect(set).toHaveBeenCalledTimes(2)
+    expect(set).toHaveBeenNthCalledWith(2, { contactEmail: 'two@x.y' })
     resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
     await pSave2
     expect(useStore.getState().settings?.contactEmail).toBe('two@x.y')
     expect(useStore.getState().saving).toBe(false)
   })
 
+  it('C-3 N2 链深≥3：save₃ 排在 save₂ 后——尾尾相接不折断，逐个补发，终态=save₃ 值', async () => {
+    let resolveSet1!: (v: SettingsOk) => void
+    let resolveSet2!: (v: SettingsOk) => void
+    let resolveSet3!: (v: SettingsOk) => void
+    const set = vi.fn()
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet1 = r }))
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet3 = r }))
+    const useStore = await loadStore({ settings: { set } })
+    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
+    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
+    const pSave3 = useStore.getState().save({ contactEmail: 'three@x.y' })
+    await flush()
+    // 深度 3 排队：在途仍只 save₁ 一个 invoke
+    expect(set).toHaveBeenCalledTimes(1)
+    resolveSet1({ ok: true, data: { contactEmail: 'one@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await flush()
+    // save₂ 补发；save₃ 仍排队（尾尾相接的中间格）
+    expect(set).toHaveBeenCalledTimes(2)
+    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await flush()
+    // save₃ 补发——第二跳排队后续接（深度 2 用例未覆盖的路径）
+    expect(set).toHaveBeenCalledTimes(3)
+    expect(set).toHaveBeenNthCalledWith(3, { contactEmail: 'three@x.y' })
+    resolveSet3({ ok: true, data: { contactEmail: 'three@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await Promise.all([pSave1, pSave2, pSave3])
+    // 落盘序=发出序：终态恒=最后一次意图（save₃ 的值）
+    expect(useStore.getState().settings?.contactEmail).toBe('three@x.y')
+    expect(useStore.getState().saving).toBe(false)
+  })
+
   it('saving 连续：save₁ settle 后 save₂ 起跑前不闪 false（订阅帧 false 仅在全部 settle 后出现一次）', async () => {
     let resolveSet1!: (v: SettingsOk) => void
     let resolveSet2!: (v: SettingsOk) => void
diff --git a/tests/unit/services/workspace.test.ts b/tests/unit/services/workspace.test.ts
index e3a115ca2..8edb0cf9b 100644
--- a/tests/unit/services/workspace.test.ts
+++ b/tests/unit/services/workspace.test.ts
@@ -17,6 +17,7 @@ import {
 import { createWorkspaceService } from '../../../src/main/services/workspaces/workspace.service'
 import { ensureWorkspaceLayout, initWorkspaceDb } from '../../../src/main/workspace-layout'
 import { createDataLayerContainer } from '../../../src/main/data-layer.container'
+import { createImportGate } from '../../../src/main/import-gate'
 
 /**
  * [R1-WS1] workspaces 域单测（ADR-0018 库级分目录）——真临时目录+真 SQLite。
@@ -425,6 +426,32 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     expect(assembledDirs()).toEqual([])
     cur.db?.close()
   })
+
+  it('C-3 时序表第③格显式化（跨格序列 拒→放行）：真 gate enter×2 拒——exit 一次（2→1）仍拒——再 exit（1→0）放行', async () => {
+    const gate = createImportGate()
+    const { svc, closeCalls, assembledDirs, cur, u } = await l0Session('synapse-ws-c3-', {
+      importInFlight: gate.inFlight
+    })
+    gate.enter()
+    gate.enter()
+    // 时序表第①格（in-flight × create）：拒且零库副作用
+    await expect(svc.create({ name: '课题C3' })).rejects.toThrow(/导入进行中/)
+    expect(closeCalls()).toBe(0)
+    // 并发中间态 2→1：首个 import 完成，仍 in-flight——拒面不变（计数中间态消费面锚）
+    gate.exit()
+    await expect(svc.create({ name: '课题C3' })).rejects.toThrow(/导入进行中/)
+    expect(closeCalls()).toBe(0)
+    // 时序表第③格（exit 后 × 变更入口）：放行，原行为零变（此前由 ()=>false 桩隐式覆盖）
+    gate.exit()
+    const created = await svc.create({ name: '课题C3' })
+    expect(created.id).toMatch(/^[a-z0-9-]{1,64}$/)
+    expect(created.id).not.toBe(DEFAULT_WS_ID)
+    // 放行后走 L0 物化全序：关旧句柄→迁移→重建 default（assembleInto 记录）→指针落位
+    expect(closeCalls()).toBe(1)
+    expect(assembledDirs()).toEqual([join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID)])
+    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID })
+    cur.db?.close()
+  })
 })
 
 describe('data-layer.container —— 稳定 facade 热换（ipc/协议层零改动的机制面）', () => {
diff --git a/tests/unit/windows/window-control.test.ts b/tests/unit/windows/window-control.test.ts
index 2c6c682d2..ca43738f1 100644
--- a/tests/unit/windows/window-control.test.ts
+++ b/tests/unit/windows/window-control.test.ts
@@ -123,7 +123,8 @@ describe('windows/window-control —— maximize 状态推送绑定', () => {
     const win = {
       on: (event: string, listener: () => void) => {
         listeners.set(event, listener)
-      }
+      },
+      isMaximized: () => false
     }
     const sent: Array<{ maximized: boolean }> = []
     bindWindowStateEvents(win, (payload) => {
@@ -133,6 +134,33 @@ describe('windows/window-control —— maximize 状态推送绑定', () => {
     listeners.get('unmaximize')?.()
     expect(sent).toEqual([{ maximized: true }, { maximized: false }])
   })
+
+  it('F-G9 bindWindowStateEvents：fullscreen 沿补反映——enter 发 true；leave 回读 isMaximized（离开后回最大化态图标不撒谎）', () => {
+    const listeners = new Map<string, () => void>()
+    let maximized = false
+    const win = {
+      on: (event: string, listener: () => void) => {
+        listeners.set(event, listener)
+      },
+      isMaximized: () => maximized
+    }
+    const sent: Array<{ maximized: boolean }> = []
+    bindWindowStateEvents(win, (payload) => {
+      sent.push(payload)
+    })
+    // F11 等 fullscreen 走 enter-full-screen 而非 maximize 沿（v8 SH3 门一 C12）
+    listeners.get('enter-full-screen')?.()
+    expect(sent).toEqual([{ maximized: true }])
+    // 离开 fullscreen 回到最大化态：回读真值 true 而非恒 false
+    maximized = true
+    listeners.get('leave-full-screen')?.()
+    expect(sent).toEqual([{ maximized: true }, { maximized: true }])
+    // 离开 fullscreen 回到常态：false
+    maximized = false
+    sent.length = 0
+    listeners.get('leave-full-screen')?.()
+    expect(sent).toEqual([{ maximized: false }])
+  })
 })
 
 describe('windows/window-control —— frameless 窗口形状', () => {
@@ -153,8 +181,9 @@ describe('windows/window-control —— drag/no-drag 皮肤锁（CSS 文本断
     'utf8'
   )
 
-  it('.app-header 整条为拖拽区（-webkit-app-region: drag）', () => {
-    expect(css).toContain('-webkit-app-region: drag')
+  it('.app-header 整条为拖拽区——恰一处 drag 声明（F-G8 计数锁：与下方 no-drag 计数断言对偶，他处新增第二处 drag 即红）', () => {
+    const dragCount = css.split('-webkit-app-region: drag').length - 1
+    expect(dragCount).toBe(1)
   })
 
   it('切换器容器与三键容器为 no-drag（两处，点击不被 drag 吞）', () => {
diff --git a/tests/unit/windows/window-state.test.ts b/tests/unit/windows/window-state.test.ts
index 15b272a64..f442fa571 100644
--- a/tests/unit/windows/window-state.test.ts
+++ b/tests/unit/windows/window-state.test.ts
@@ -2,7 +2,13 @@ import { mkdtemp, rm, writeFile } from 'node:fs/promises'
 import { tmpdir } from 'node:os'
 import { join } from 'node:path'
 import { afterAll, describe, expect, it } from 'vitest'
-import { clampBounds, DEFAULT_BOUNDS, loadBounds, saveBounds } from '../../../src/main/windows/window-state'
+import {
+  boundsToPersist,
+  clampBounds,
+  DEFAULT_BOUNDS,
+  loadBounds,
+  saveBounds
+} from '../../../src/main/windows/window-state'
 
 const dirs: string[] = []
 async function tmpDir(): Promise<string> {
@@ -48,3 +54,19 @@ describe('windows/window-state —— 窗口位置记忆', () => {
     expect(await loadBounds(dir)).toEqual(DEFAULT_BOUNDS)
   })
 })
+
+describe('F-G3 boundsToPersist —— maximized 态关窗持久化取 normal bounds', () => {
+  it('maximized：getBounds 是最大化尺寸，持久化取 getNormalBounds（下次启动恢复还原态而非大窗非最大化）', () => {
+    const win = {
+      getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1040 }),
+      getNormalBounds: () => ({ x: 120, y: 60, width: 1280, height: 800 })
+    }
+    expect(boundsToPersist(win)).toEqual({ x: 120, y: 60, width: 1280, height: 800 })
+  })
+
+  it('常态：getNormalBounds 与 getBounds 等值——非最大化路径行为零变旁证', () => {
+    const b = { x: 10, y: 20, width: 800, height: 600 }
+    const win = { getBounds: () => ({ ...b }), getNormalBounds: () => ({ ...b }) }
+    expect(boundsToPersist(win)).toEqual({ x: 10, y: 20, width: 800, height: 600 })
+  })
+})
