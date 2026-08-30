## W1 判定：ADDRESSED

证据：
- 文件头注已改为「pageRoot 身份传导（回炉 1-W1：内部短路优化无黑盒可观测面，不宣称）」，明确删除了对短路的锁定宣称。
- 用例⑤标题改为「pageRoot 元素身份传导：同 DOM 元素二次回报→层收到的 pageRoot 仍是同一元素；换元素回报→引用更新（真实变化传导）」，不再宣称锁定短路优化。
- 用例⑤内部新增注释：「短路优化无黑盒可观测面（React 18 批处理），本用例不宣称锁定短路——只锁身份传导（回炉 1-W1）」。
- 虽然断言未改，但原裁决给出的是「删宣称或补必然绿变异并如实降级」二选一方案，实现者选择删宣称并降级，符合要求。

## W2 判定：ADDRESSED

证据：
- `vi.mock('../../../src/renderer/features/reader/PageColumn')` 的工厂函数 props 类型已扩为九件全形：`doc`、`totalPages`、`zoom`、`scrollContainerRef`、`scrollRequest`、`onPageRender`、`renderPage`、`onReady`、`onError`。
- `probe.columnProps` 类型同样扩为九件全形，与桩一致。
- 新增用例⑥「九 props 透传锚」对原 W2 点的七件透传属性直接断言：
  - `doc` → `toBe(DOC)`
  - `totalPages` → `toBe(9)`
  - `zoom` → `toBe(1.5)`
  - `scrollContainerRef` → `toBe(scrollerRef)`
  - `scrollRequest` → `toBe(scrollRequest)`
  - `onReady` → `toBe(onReady)`（函数身份）
  - `onError` → `toBe(onError)`（函数身份）
- 原问题中七件漏传均有直接锚定；`onPageRender`/`renderPage` 虽未在⑥中断言，但已被前序用例①②③④作为运行必需路径间接锁定。实现者申报的变异红证（摘 `onReady` 透传→⑥红 1 failed）说明该用例具备实际杀毒力，不存在恒真情况。

## 新破坏扫描

- 新用例恒真：⑥ 的 `toBe` 断言依赖 `probe.columnProps` 实际赋值，漏传时必失败（有变异红证支持）；⑤ 的对照组（换元素后 `toBe(second)`）若实现不更新引用必然失败。均非恒真。
- 头注措辞回退：头注明确保留 W1/W2 回炉说明，无回退迹象。
- mock 面扩大副作用：仅扩展现有 `PageColumn` 桩的 props 类型与暴露，未新增 mock 模块，未引入新依赖或全局副作用；`TextLayer`/`AnnotationLayer`/`AiAnnotationLayer` 桩未改动。
- 未发现其他因回炉引入的破坏。

## 总评

W1/W2 均已正确回炉，实现零改且测试端修复有效；新用例⑥有明确杀伤力，无恒真、无头注回退、mock 面扩大无副作用；未发现新破坏。