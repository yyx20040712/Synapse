统计: B: 0 / W: 1 / N: 6

逐条：

[W] 1 — S1「编辑器关闭」路径无测试锁定，M2 红证粒度不足以覆盖 `setEditing(null)` 分支
tests/unit/renderer/selection-mode.test.tsx:227-240（用例⑤仅断言菜单消失/不恢复，从未打开 AnnotationEditor）｜AnnotationLayer.tsx:84-86（effect 同时 setMenu(null)+setEditing(null)）｜M2 变异若只摘 `setEditing(null)` 而保留 `setMenu(null)`，⑤④断言面全绿——红证依赖菜单断言，编辑器关闭实为盲区。

[N] 2 — 模式翻转后 effect 运行于 paint 之后，存在理论竞态窗口
AnnotationLayer.tsx:83-86 + AiAnnotationLayer.tsx:104-108｜useEffect 在提交后异步执行，切选择模式的同一提交内 rect 已 none 但旧菜单在 effect 前仍可交互；实际需用户在 <16ms 内从按钮移至菜单项，不可达，但票面生命周期层「无中间帧」表述不精确。

[N] 3 — ReaderPage toggle 闭包捕获渲染期 selectionMode，同帧连点可能 no-op
ReaderPage.tsx:181-186｜`onToggleSelectionMode={() => setSelectionMode(!selectionMode)}` 中 selectionMode 是渲染闭包值，若两次点击发生在 React 重渲染前，第二次写入相同值；双击实际间隔 >100ms 已重渲染，仅程序化极速点击触达。

[N] 4 — 用例③只断言首个 rect 的 pointerEvents，ann() 实际产两个 rects
tests/unit/renderer/selection-mode.test.tsx:205-210｜`annRects()[0]!.style.pointerEvents` 仅覆盖第一个；若 map 中第二个 rect 条件写错（如漏覆盖），测试不红——代码为统一三元表达式，实际风险低。

[N] 5 — S5（api 在途×模式切换）无测试覆盖
tests/unit/renderer/selection-mode.test.tsx 全部用例｜票面 5.1 最低集未列 S5，实现依赖「setEditing(null)/setMenu(null) 幂等」既有语义；建议后续补 busy 在途切模式的回归用例。

[N] 6 — 真机探针未验证选择模式下「点击 rect 零副作用」的浏览器层
scripts/audits/f-a3-verify.mjs:210-216（场景 B 仅拖选→工具条→保存，无点击 rect 探针）｜场景 C 的菜单出现是在常规模式；选择模式点击 rect 无菜单仅由 jsdom 层④覆盖，真机层靠 `pointerEvents:none` 推断成立。

[N] 7 — 保存链滚动漂移 2142px 未定位根因
f-a3-verify.json `B_selectionMode.scrollTop.beforeSave=9971→afterSave=12113`｜实现者疑虑 3 已申报，探针用 scrollIntoView 兜住断言；漂移源（Playwright click 滚动或保存链内滚动）未深究，建议主控另开票。

总评：实现与票面五层规约高度一致，母本符合度、宪法红线（行数 249≤250、零改动面、测试纪律）、report 诚实性均核实无误；最大风险是 S1 编辑器关闭路径仅有实现无测试锁，M2 变异红证粒度无法防止该分支回归。建议放行门二，但主控收口时补「编辑器开→切选择→编辑器关」用例（票面 5.1 可加不可减）；无需回炉。