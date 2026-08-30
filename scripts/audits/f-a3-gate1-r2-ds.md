## 定点复核

### W1 → ADDRESSED

- `selection-mode.test.tsx` 已新增用例⑧（diff 内嵌）：
  ```
  it('⑧ S1 编辑器臂：菜单→添加笔记→editor 开 → 切选择 → editor 关；切回不自动恢复', ...)
  ```
  流程覆盖：开菜单 → 点「添加笔记」→ editor 出现 → `setSelectionMode(true)` → editor 消失 → 切回 false 仍不恢复。
- `f-a3-mutation-m2p.raw.txt` 尾部：
  ```
  Test Files  1 failed (1)
  Tests  1 failed | 7 passed (8)
  exit=1
  ```
  与“仅⑧红”一致。变异点只摘 `setEditing(null)`、保留 `setMenu(null)`，因此 ⑤（菜单臂）继续绿、⑧（编辑器臂）红，证据链闭合。raw 尾部未打印失败用例名，但结合变异点与用例⑧存在，可判定已 ADDRESSED。

### N2 → ADDRESSED

- `AnnotationLayer.tsx`：
  ```tsx
  import { useEffect, useLayoutEffect, useState } from 'react'
  ...
  useLayoutEffect(() => {
    if (selectionMode) { setMenu(null); setEditing(null) }
  }, [selectionMode])
  ```
- `AiAnnotationLayer.tsx`：
  ```tsx
  import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
  ...
  useLayoutEffect(() => {
    if (selectionMode) setSelectedId(null)
  }, [selectionMode])
  ```
- 两层头注/行内注释均已同步为“paint 前收起”“无中间帧”措辞。ADDRESSED。

### N4 → ADDRESSED

- `selection-mode.test.tsx` 用例③已改为逐一断言全部 rect：
  ```tsx
  for (const r of Array.from(annRects())) {
    expect(r.style.pointerEvents).toBe('auto')
  }
  // setSelectionMode(true) 后
  for (const r of Array.from(annRects())) {
    expect(r.style.pointerEvents).toBe('none')
  }
  ```
  不再是只断首个 rect。ADDRESSED。

## 新破坏扫描

- B：无。
- W：无。
- 针对回炉改动：
  - `useLayoutEffect` 迁移：本组件仅在 Electron renderer 运行，无 SSR 风险；effect 内 `setState` 在 `act`/事件中同步 flush，进入选择模式时两次提交均在 paint 前完成，未发现可证实的中间帧或渲染循环问题。
  - 用例⑧的 act 断言时序：`setSelectionMode(true)` 在 `act` 内调用，layout effect 同步落地，随后断言 editor 为 null 是稳定时序。
  - 用例③的循环断言形态：`ann()` 夹具含 2 个 rect，循环逐一断言不是空集合上的 vacuous pass。
- N（不确定，不阻塞）：`selection-mode.test.tsx` 用例⑥中 `aiNoteFixture` 的 `anchorPage: 1` 与 mount 时 `page={0}` 存在表面不一致；若 `anchorableNotes` 按 `anchorPage === page` 过滤，该用例应无 rect。全量绿证（956 passed）说明实际语义可能是 `page + 1` 映射或 `anchorableNotes` 另有口径，但本 diff 未包含 `anchor-serialize` 实现，无法确证，故仅记为不确定项。

## 总评

三项回炉定点（W1/N2/N4）均 ADDRESSED，回炉改动未发现可证实的回归；上述 N 为不确定低风险，不阻塞放行——建议放行门二。