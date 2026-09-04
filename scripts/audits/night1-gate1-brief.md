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
