# P7-C e2e 稳定崩溃——根因定位与修复报告

日期：2026-08-27 ｜ 调试代理：systematic-debugging 方法论（最小复现→假设→证伪→收敛）
范围：tests/e2e/reader-text.spec.ts:453 P7-C 收官用例——fill('笔记正文') 后约 110ms
渲染进程 React 整树卸载（#root 空）+ pageerror=TypeError: Cannot read
properties of undefined (reading 'length')。

## 一、根因（一句话）

`src/renderer/app/App.tsx:71` 把退出拦截聚合写成
`useTabDirtyAggregate() || useLineageDirty()`——`||` **短路求值使
useLineageDirty 在 tab dirty=true 的渲染中缺席**（Rules of Hooks 违规：
同一 fiber 两次渲染 hooks 数量不同）；生产 bundle 无 dev 警告
（fewer-hooks 检查 `__DEV__` only），commit 阶段 `updateEffect` 对上
错位的 prev hook 产物（zustand 订阅对象，无 deps 字段）→
`areHookInputsEqual` 崩 `g.deps.length` → App fiber 无边界自捕 → 整树卸载。

## 二、根因链（逐步证据）

1. **触发沿**：P7-C 第 482 行 `body.fill('e2e 总评内容')` →
   ReaderNotesPanel onChange → notes.store saveSoon → `pending=true` →
   `useTabDirtyAggregate()` 返回值 false→**true** → 该次渲染短路
   `useLineageDirty()`（zustand useStore，内部 useCallback +
   useSyncExternalStore + useDebugValue 数个 hook）→ App fiber hook 链
   变短 → 后续 `useExportCorpusEvents` 的 useEffect 错位配对。
2. **崩溃点复现（vitest 级最小复现，修复前红）**：新用例构造同一序列
   （挂真 App → `useReaderStore.setState({order:['p1']})` +
   `useNotesStore.setState({noteByPaper:{p1:{...pending:true}}})`），
   抛出的栈与主控 sourcemap 捕获的 e2e 真栈**一字不差**：
   `areHookInputsEqual → updateEffectImpl → updateEffect →
   useExportCorpusEvents.ts:36 useEffect → App.tsx:74 renderWithHooks`。
   ——机制假设（短路=错位=areHookInputsEqual 崩）获直接证实。
3. **静态排查收敛**：grep 全 renderer，短路/条件 hook 调用**仅
   App.tsx:71 一处**（其余命中均为 `useReaderStore.getState()` 非 hook
   或普通 return）；LineagePage/LineageCanvas/lineage.store 无条件
   hooks（提前 return 均在全部 hooks 之后）。
4. **「组件级 614 用例全绿」的解释**：无人构造「aggregate false→true」
   翻转序列——lineage-board.test.tsx 的 INV-22 用例走 lineage-dirty
   路径（aggregate 恒 false，不触发短路方向）。
5. **主控悖论（真 LineageCanvas 模块 import 即崩、模块无副作用）的
   自洽解释**：8491489 引入 LineageCanvas 改变 rollup 产物内模块内联
   布局——错位的 effect 恰好配对上「无 deps 的 zustand 产物」（崩）
   还是「有 deps 的 useCallback 产物 `[fn, deps]`」（静默潜伏），由
   产物布局决定；故模块本身无副作用却 import 即崩、回归呈现确定性
   （06ea570 布局侥幸安全 → 8491489 布局暴露）。缺陷本体自 LG-03
   （App 组合根 ∪ 扩引入 `||` 写法）即存在；修复后 hook 链恒定，
   产物布局不再影响行为。

## 三、修复（最小面 1 处生产代码）

`src/renderer/app/App.tsx`（+5 行注释语义、行为面零变化）：

```diff
-  const quitDirty = useTabDirtyAggregate() || useLineageDirty()
+  const tabDirty = useTabDirtyAggregate()
+  const lineageDirty = useLineageDirty()
+  const quitDirty = tabDirty || lineageDirty
```

两 hook 无条件调用，`||` 只作用于返回值（或聚合语义不变——用例断言
setQuitDirty 仍收到 `{dirty:true}`）。

## 四、回归用例

- 文件：`tests/unit/renderer/app-quit-dirty.test.tsx`（新，always-active）
- 用例名：`App 组合根 —— hook 链稳定性（P7-C 崩溃回归锁） > tab dirty
  false→true 翻转（notes pending 沿）无 fewer-hooks 错位且 dirty 仍上报`
- 红→绿：修复前抛同栈 TypeError（红 EXIT 1）；修复后绿。
- 断言三层：崩溃自证（错位 TypeError 上抛即用例失败）+ dev 探针
  （console.error 无 'Rendered fewer hooks'）+ 行为面（dirty=true 仍上报）。

## 五、验证数字（全部亲验真退出码）

| 关卡 | 结果 |
| --- | --- |
| 单用例（修复前红） | 1 failed——同栈 TypeError |
| 单用例（修复后绿） | 1 passed |
| 全量 vitest | 86 文件 615 用例全绿（85+1 文件 / 614+1 用例） |
| npm run build | 成功 |
| npm run test:e2e | **20/20 全绿**（含 P7-C 收官 9.9s 通过；lineage 4+原 16） |
| npm run verify | **EXIT 0**（quality+tickets+locks+lint+typecheck+test+build） |
| locks | generate+apply：131 受锁文件（+app-quit-dirty.test.tsx） |

日志：scripts/audits/p7c-e2e.log、scripts/audits/p7c-verify.log。

## 六、改动面与残留说明

- 本单改动：`src/renderer/app/App.tsx`（9 行）、
  `tests/unit/renderer/app-quit-dirty.test.tsx`（新）、
  `locks/manifest.json`（+新测试条目；另有 LG-05 会话既有 4 行改动共存）。
- 工作树既有残留（LG-05 会话交付物，本单未触碰、原样保护）：
  `tests/e2e/lineage.spec.ts`（+476 行）、`scripts/audits/lg05-impl.report.md`、
  `dist_new/`。
- grep 无 TODO/FIXME/placeholder；git diff --stat 无范围蔓延。
- 未 git add/commit/push；未改 registry（按纪律留主控收口）。

## 主控追记（门一 W1/W4 处置，2026-08-27）

- **责任归属（W4）**：`useTabDirtyAggregate() || useLineageDirty()` 短路写法系
  **主控在 SR2-LG-03 收口时亲笔引入**（App.tsx 组合根聚合行——非实现者交付，
  收口 diff 亲验时未识别 Rules of Hooks 违规）。
- **8491489 中间态崩因未闭合（W1）**：git log -S 铁证短路行 c8758ea（LG-03）
  才引入，而主控 bisect 实测 8491489（LG-02）3/3 崩——两者矛盾。缺陷本体
  （短路）已修+回归锁在案；8491489 崩因存疑（可能=主控 bisect 实验树残留
  污染/sourcemap out 产物与源码错位），**不强行闭合解释**，记录待考。终态
  20/20+vitest 86/615 全绿独立成立。
