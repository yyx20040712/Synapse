# 对抗式审查报告（批门一）

## 审查范围
F-ARCH1（closeOne 信号清理）、F-ARCH2（undo 回归锁）、F-A1-fixture（pdf-factory 几何口径）、F-ARCH5（ipc 消环）。

---

## 问题清单

### W 级

**W-1｜F-ARCH1：noteHighlight/aiNoteHighlight 对任意 tab 关闭均无条件清空，可能误伤当前激活 tab 的瞬态通知**
- 证据（src/renderer/features/reader/reader.store.ts closeTab set 块）：
  ```ts
  ...(noteHighlight !== null || aiNoteHighlight !== null ? { noteHighlight: null, aiNoteHighlight: null } : {})
  ```
- 该条件不区分被关 tab 是否为当前 activeId。若用户正在激活 tab A 查看 noteHighlight（瞬态高亮提示），此时关闭一个非激活 tab B，A 上的高亮提示会被清空。虽然注释称其“无归属维度”，但 store 中 `activeId` 是已知的，清理至少应判断 `activeId === id`，或为瞬态信号增加 paperId 归属。否则会造成非激活 tab 操作干扰激活 tab UI 状态。
- 当前测试仅覆盖“关闭被关 tab 时清空”，未覆盖“关闭他 tab 时清空”的边界，故该行为未被锁定为有意设计。

**W-2｜F-ARCH2：断言 `a-1` 被移除恒真，因 `a-1` 从未进入 store 列表**
- 证据（tests/unit/renderer/annotation-undo.concurrent.test.ts）：
  ```ts
  const list = useStore.getState().tabs['p-1']?.annotations ?? []
  expect(list.some((x) => x.id === 'a-1')).toBe(false) // 恒真：a-1 从未被 addAnnotation 添加
  expect(list.some((x) => x.id === 'a-2')).toBe(true)
  ```
- 测试中只 `pushUndo` 了一条 create 记录，但从未调用 `addAnnotation` 将 `a-1` 放入列表。因此 `list` 中 `a-1` 必然不存在，该断言在任何实现下都通过，削弱了“撤销删除真正生效”的验证力。建议先 `addAnnotation(annBase)` 再 `pushUndo`（或用真实的 undo 栈生成），使删除操作有实际对象，并验证删除后 `a-1` 确实从最新列表消失。

**W-3｜F-ARCH1 测试第三用例缺少前置断言，存在恒真通过风险**
- 证据（tests/unit/renderer/reader.store.test.ts F-ARCH1 describe 第三用例）：
  ```ts
  useStore.getState().notifyNoteHighlight('a-1')
  useStore.getState().notifyAiNoteHighlight('ai-1')
  useStore.getState().closeTab('p-1')
  expect(useStore.getState().noteHighlight).toBeNull()
  expect(useStore.getState().aiNoteHighlight).toBeNull()
  ```
- 未在 `closeTab` 前断言 `noteHighlight === 'a-1'` 且 `aiNoteHighlight === 'ai-1'`。若 `notifyNoteHighlight/notifyAiNoteHighlight` 因缺陷未生效（或 store 初始即为 null），则该用例恒真通过，无法验证“清理”逻辑。任务所述“ARCH1 删清理 2 红”中，该用例若缺前置断言则不会红，建议补上：
  ```ts
  expect(useStore.getState().noteHighlight).toBe('a-1')
  expect(useStore.getState().aiNoteHighlight).toBe('ai-1')
  ```

---

### N 级

**N-1｜F-A1-fixture：注释“Td≲18”触并为边界不精确（应为 ≤19.2pt 左右）**
- 证据（tests/utils/pdf-factory.ts 头注）：
  ```
  禁区：Td≲18（行距 24px，重叠 10.1>8.5 阈）触发跨行并簇 1 块
  ```
- 按文中 H≈34.1px、并簇阈 8.5px，反推触发并簇的 Td 上限为 `(34.1 - 8.5) / (96/72) ≈ 19.2pt`。Td=19pt 时行距 25.33px、重叠 8.77>8.5 也触发并簇，故“≲18”虽保守但数学上不准确。该注释仅做文档说明，不影响 fixture 实际行为。

**N-2｜F-A1-fixture：注释“Td 20 与 Td 24 产出完全相同”表述易误导**
- 证据（tests/utils/pdf-factory.ts 头注）：
  ```
  Td 20 与 Td 24 产出完全相同
  ```
- 若“完全相同”指归并后矩形集合逐坐标一致，这不成立——不同 Td 导致行盒 y 坐标不同，归并保留的矩形 y 坐标必然不同。应改为“并簇行为相同（均不跨行并簇）”。

**N-3｜F-ARCH5：ipc-deps.ts 文件未在 diff 中展示，无法核对接口完整性**
- 证据（src/main/ipc/index.ts）：
  ```ts
  export type { IpcDeps } from './ipc-deps'
  ```
- diff 未包含 `src/main/ipc/ipc-deps.ts` 内容，虽 `arch-scan.json` 文件数 +1 表明文件存在，但其是否完整包含原 `IpcDeps` 的全部字段（services/dialogs/shell/userDataDir/ping/setQuitDirty/controlWindow）无法从 diff 验证。需人工确认新增文件内容与原 index.ts 中删除的 interface 定义一致。

---

## 已查安全面

1. **F-ARCH1 scrollRequest 清理**：按 paperId 精确匹配，他 tab 在途信号被保护（测试用例 2 有前置断言覆盖），未发现误伤。
2. **F-ARCH2 测试有效性**：核心断言 `a-2` 保留能真实区分“真快照覆盖”变异（快照覆盖会丢失 a-2），变异红证可信。
3. **F-ARCH5 消环**：`arch-scan.json` cycles 归零，`IpcDeps` 改为 type-only re-export，未引入运行时新环。
4. **F-A1-fixture 数值自洽**：H=34.1px、Td24→行距 32px、重叠 2.1px < 8.5px 阈，数学计算一致，T4 锚成立。
5. **新测试纪律**：F-ARCH1/F-ARCH2 均使用 always-active 直测（无 guardedDescribe），符合三屋新规。

**不确定项**：`ipc-deps.ts` 实际内容未在 diff 中提供，无法确认是否缺字段；F-ARCH2 测试中模块加载顺序的注释是否为必需未验证，但测试逻辑本身不依赖该顺序。