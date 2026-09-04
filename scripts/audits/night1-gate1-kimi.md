[routing]: run=20260902173407-qwxa source=kimi-main model=kimi-k3 switches=0 usage=in=8292,out=6370 latency=230611ms (by ds-call.mjs 链)

# 门一审查报告——夜场 N 级清扫合批

## 结论速览

无 B 级阻断。**W 级 1 条（材料缺口，非代码缺陷）**，N 级 4 条，存疑 3 条。已审代码部分（diff 可见面）与票面无实质性偏差，测试锚设计普遍可对偶失败。

---

## W（回炉）

### W1 材料缺口：三个新文件缺席 diff，票面核心主张无代码证据可审

简报声明「night1-batch.diff=**全量**代码 diff，438 行」，但以下三个新文件均未出现在 diff 中：

1. **`src/main/import-gate.ts`**——bootstrap.ts:49 `import { createImportGate } from './import-gate'` 有导入，但模块本体缺席。票面主张「语义逐位一致：enter++/exit--/inFlight=>0」无法核实。
2. **`tests/unit/.../import-gate.test.ts`**——locks 241（240+此文件）证明其存在，但两用例「2→1→0 中间态锚」缺席，Q3 恒真审查无法对该组断言执行。
3. **`src/renderer/features/settings/UiScaleSection.tsx`**——SettingsPage.tsx:29 有导入，票面主张「73 行、store 直订零 props、先例=CorpusExportSection」无法核实。审点②后半（「直订 store 是否引入新的水合/时序面」）因此**不可审**——例如 UiScaleSection 内 pickScale 的 `settings === null` 守卫、`saving` 禁用逻辑是否与拆前逐位等价，无从对照。

派生风险：bootstrap.ts:143 `importInFlight: importGate.inFlight` 以**裸函数引用**注入。若 import-gate.ts 实现为依赖 `this` 的对象方法，detached 后语义即断；若为闭包（`() => count > 0`）则安全。简报称闭包语义，但实现缺席，无法排除。**回炉项：补三文件 diff（或贴全文），重点核 importGate.inFlight 的绑定形态与 UiScaleSection 的守卫逻辑。**

---

## N（知晓，可接受）

### N1 F-G9 fullscreen 中三键 toggle 错位——票面已备案，同意备案定级

main-window.ts:277 `win.on('enter-full-screen', () => send({ maximized: true }))` 后，fullscreen 中 `isMaximized()` 恒 false，图标显示「还原」；点击走 controlWindow toggle 分支，应答回读 false → 图标翻回「常态」态但仍处 fullscreen——**反向撒谎**。属「图标反映 Only」票面边界的自然推论，TitleBarControls.tsx 头注（true 态含 fullscreen 进入）已同步声明，接缝归责成立。Windows 目标下用户影响极低（fullscreen 用 F11 进出为主）。定级 N，不建议本批处理。

### N2 F-G3 minimized 关窗边界——由既有守卫覆盖，非本次引入

bootstrap.ts:201 关窗处理器保留 `window.isVisible()` 前置条件：minimized 态关窗**整个 saveBounds 分支不执行**（不落盘），故审点①问的「minimized 时 getNormalBounds 返回什么」不构成缺陷路径。该守卫先于本票存在，行为零变。

### N3 importGate.exit 无下界——语义逐位一致主张内

exit 多于 enter 时计数转负，`inFlight` 返 false。旧闭包实现同样无下界，拆模块未改变此面。实际调用序由 import 会话生命周期保证 enter/exit 配对。N。

### N4 TitleBarControls.tsx 头注改动——必要性成立

Q1 定向回答：这是 diff 内唯一非票面主文件。F-G9 扩了 main 侧事件源后，renderer 状态机迁移表（true 态来源增 enter-full-screen 沿）若不同步，头注即与实现矛盾——属接缝归责的正当同步，非超范围。**认可。**

---

## 存疑（单列）

### 存疑1 F-G3 变异红证计数与预期不符——预期 1 红，申报 2 红

boundsToPersist 变异为 `getBounds()` 后：最大化用例（window-state.test.ts:58-65，期望 1280×800 实得 1920×1040）红——**1 红**；常态等值用例（:67-71，两源同值）在 getBounds 化下**仍绿**（这正是该用例作为「行为零变旁证」的设计）。故该变异数学上只应产生 1 红。申报「night1-fg3-red（2 红）」多出的第二个红是哪个用例？若第二个红来自常态用例，则实际变异方式不是「getBounds 化」（可能改成了固定值等更强变异），红证与票面所述变异不对应。**请给 night1-fg3-red 的两个红用例名。**

### 存疑2 leave-full-screen 回读时序——Electron 语义层面合理，但无 e2e 覆盖

main-window.ts:278 `send({ maximized: win.isMaximized() })`：Electron 的 `leave-full-screen` 在窗口完成退出后发射，此时 isMaximized 应已迁移到退出后态，语义层面成立。但本次 e2e 证据（smoke:118 三键 / smoke:160 缩放）均不触 fullscreen 路径，该时序仅由 mock 单测锚定（window-control.test.ts:137-163 的 mock 是先设 `maximized=true` 再触发 leave，**测的是回读语义而非真事件时序**）。若 Windows 真机上 leave 发射先于状态迁移，图标将错发 false。建议：手动验证记录（maximized→F11→F11，看图标）或降级为已知风险入台账。不确定，如实标注。

### 存疑3 locks 覆盖面与新源文件

locks 241=240+import-gate.test.ts 一项新增。若锁覆盖面含 src 新源文件，则 `import-gate.ts` 与 `UiScaleSection.tsx` 两个新源文件未见对应锁变动申报。不确定锁机制是否只锁测试文件——若只锁测试，此项不成立；若含源文件，请说明两文件未入锁的原因。

---

## 定向问题逐答

**Q1（逐票对照）**：除 W1 材料缺口外，可见 diff 内无超范围改动。bootstrap.ts:93-96 注释改写如实反映拆模块事实；workspaceService 注入点（:143）与票面一致；createServices 传 gate 对象的「同一对象」主张在 diff 可见面只能确认 gate 于 bootstrap 顶层单次创建（:96），createServices 注入点不在 diff 视野内，随 W1 一并补核。

**Q2（边界态）**：minimized=N2（既有守卫覆盖）；leave 时序=存疑2；toggle 错位=N1（备案可接受，非必须修）。三者均无「必须修」级代码缺陷。

**Q3（恒真风险）**：可见四组断言逐条可失败——
- window-state 最大化用例：变异红证支撑（但见存疑1的红数问题）；
- window-control drag 计数（:184-186）：split 计数对「他处新增第二处 drag」必红，且机器核实 drag literal 不匹配 `no-drag` 串（`: drag` 空格前导排除了 `: no-drag` 子串）——成立；错数红证（toBe(2)）证明断言非恒真；
- F-G9 三 payload 用例：摘 enter 绑定红第一格、摘 leave 绑定红二三格，覆盖全；
- workspace 时序表用例（workspace.test.ts:430-452）：中间态断言（2→1 仍拒）确实在测 `>0` 判定——若实现为 `>1`，第二格 rejects 断言即红；若为 `>=2` 同理。**中间态非影子**，成立；
- settings 链深 3 用例：第二跳补发格（`toHaveBeenCalledTimes(2)` 后 resolve₂→`toBe(3)`+NthCalledWith(3)）测的是深度 2 用例未覆盖的排队后续接路径，链删变异红×3 支撑。成立。
- import-gate 自身两用例：不可审（W1）。

**Q4（台账一致性）**：audit0-findings.md 不在 diff 内，四行翻已修的内容无法核对。随 W1 补材料时一并提供台账 hunk。

---

## 总结

代码可见面质量合格：五票实现与票面贴合，测试锚的对偶设计（计数锁/中间态/载荷对称）均能对偶失败，无静默失败路径被新引入。唯一实质问题是**审查材料自称「全量」却缺三个新文件**，其中两个（import-gate.ts、UiScaleSection.tsx）恰是本批语义主张的载体——回炉补齐后即可放行。存疑1（fg3 红数 2 vs 预期 1）请在补材料时一并澄清，这不影响实现正确性，但影响红证证据链的自洽。