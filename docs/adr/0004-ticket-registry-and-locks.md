# ADR-0004：工单注册表与受锁机制（registry+locks）

日期：2026-08-21 · 状态：已接受（第 3 款受锁机制 2026-11-18 退役）

## 背景

骨架期实现由弱模型逐文件填充。三个作弊面：①改测试让代码「通过」；②改契约让编译通过；③不实现就翻状态宣称完成。同时要求 main 分支恒绿，而未完成模块的测试必然红。

## 裁决

1. 工单注册表（`tickets/registry.ts`，控制面，可编辑）：每模块一条 `{id, file, owner, status}`。
2. 测试激活：锁定测试用 `guardedDescribe(ticketId)` 包装——open 时 skip（main 恒绿），翻 done 即激活；不实现就翻状态，测试立即红。
3. 受锁机制：测试/契约/迁移/CI 配置/脚本写入 `locks/manifest.json`（sha256），CI 对账，差异即红；本地另设 OS 只读属性作提醒。合法变更走 `[locked-change]` 尾注。
4. 工单号一致性（check-tickets）：代码引用的工单号必须存在；done 工单文件不得残留占位实现；open UI 工单必须渲染 `data-ticket` 徽标。

## 后果

- 锁带来变更摩擦：接受——契约变更本该是人类决策。
- 2026-11-18 起，第 3 款受锁机制（sha256 manifest 与 OS 只读属性）随
  过度防御精简退役（用户裁决）：防静默削弱改由提交说明申报 + diff 审查
  承载。本 ADR 其余三机制（registry / guardedDescribe / check-tickets）
  仍在役。
- Proxy 占位（unimplementedObject）保证装配不崩溃、调用才报「工单未完成」。
