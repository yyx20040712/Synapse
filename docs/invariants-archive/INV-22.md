# INV-22 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-22 | 退出拦截 dirty 链路：renderer 聚合信号（**tab dirty ∪ lineage dirty**——`useTabDirtyAggregate() \|\| useLineageDirty()`（LG-03 扩面：lineage 保存态≠saved 即脏，ADR-0014 接缝条款——组合根单点扩 App.tsx，tab-dirty.ts 行为面零触碰））沿变化沿 push 上报 system/set-quit-dirty（禁止 close 事件内反向拉取 renderer）；main 模块缓存值为 close 守卫唯一判定源；dirty close=preventDefault+模态二次确认（默认焦点=取消），确认=destroy（不再触发 close，无重入），对话框异常按取消处理（窗口保持可重试）。已知窄窗（deepseek r2 WARN 存档）：push 模式存在一跳上报延迟——工单头注裁决权衡过，pull 模式时序复杂度更差不采 | main-window.ts（SR2-TABS-04，2026-08-25 deepseek W1/W2 处置后定稿）+P7-B B3-问2 退出拦截裁决 | 单测（quit-dirty-guard.test 七用例）+装配级 e2e（P7-B 收官「退」序列：dirty→取消窗口保持/确认 destroy）+组合根组件用例（lineage-board.test.tsx：lineage 保存失败→dirty=true 沿 set-quit-dirty 上报——LG-03，2026-08-27） | 已锚定（2026-08-25 收官 e2e 收口；∪lineage 扩面=组件级锚定 2026-08-27 LG-03——e2e 面随 LG-05） |
