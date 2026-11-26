# ADR-0033：脉络模式/聚焦生命周期、单排工具栏与无 dim 视觉

## Status

Accepted（2026-11-26——B5 实现、INV 修订与测试同批落地；原 Proposed=2026-11-25 B5 设计裁决）。
本 ADR 翻案旧 P-1 进页 reset 与退出聚焦清集，并记录无 dim、单排工具栏和 R4 三模式错误出口；
不回写历史 mockup 让旧决策消失。

## Context

旧 P-1/P-3 把每次进入脉络页都重置为 browse，并在退出 focus 时清空 focusSet。该行为使用户
跨视图工作后反复重建模式与聚焦，且与 B4 已落地的 per-folder 会话挂起不一致。旧工具栏分驻
Page 与 Timeline，browse/focus 隐藏保存和编辑控件，loading/error 连模式栏也消失；窄视口的
drag-hint 和错误行把工具组挤成多排。

聚焦曾使用 focus∪一度邻接 bright 集，其余卡和边变暗。最新产品选择是画布全亮，仅以 accent
描边标识聚焦卡；因此 bright/dim 计算、参数和 CSS 不应继续作为无消费代码存在。B4 的 history
错误出口又只在 edit 可见，browse/focus 被拒后只有短 toast，无法持续处理过期栈顶项。

## Decision

1. 应用冷启动 mode=browse；`resetForMount` 不再覆写 mode/focusSet，只收 tool/palette。
   页面卸载、重挂和 folder 切换保留 mode。
2. 任意不同模式切换不清 focusSet；再点当前模式完全 no-op。清空聚焦按钮是唯一用户显式
   清空当前图入口，只在 focus 且集合非空时可用，点击后停留 focus、允许空聚焦。
3. focusSet 继续按 folder 挂起恢复，应用退出才整体消失，不写 localStorage/DB。课题切换
   成功清全部集合并归 browse；失败保旧态。
4. 所有图态 apply/replace 写点按 patch 后 nodes 原子剪枝 focusSet。删除节点不留下死 id；
   undo 恢复节点不自动恢复已删除的聚焦成员关系。
5. 聚焦视觉采用全亮无 dim。仅 focus 模式给本集卡 2px accent outline、offset 1px；删除
   bright/dim 纯函数、props、CSS 和旧视觉合同。focus 模式边 hoverScan 与 dim 解耦，拖拽
   dimmed 保留。
6. 页面顶部使用单一、满宽、不折行的工具控件轨道；空间不足由轨道自身横向滚动承担。
   保存/历史三模式可用性只读 B4 command state，编辑工具在非 edit 禁用而不消失；缩放上移，
   左右侧栏共用实际 pane 状态。
7. loading/error 保留同一工具栏外壳；删除教学性可见文案，保留真实错误、数据文本与无障碍
   状态。错误告警位于横滚轨道之外。
8. write/history error 使用同一持久告警但按来源分流；保存失败才提供保存重试，history 失败
   指引重按原方向命令。四种 CONFLICT 的确认丢弃出口三模式可达，取代 R4 edit-only 限制。
9. `ioUnsettled=Q∨F`，Q0/F0 error 不再单独阻退出、课题切换或结构写；R3 keepOpen 窄口径
   不变，自身 idle 提交的同 DOM/焦点问题由同一 React 提交批修复。

## Consequences

- 正向：跨视图和跨图保持用户工作上下文；死 id 不虚增计数；保存/历史重试不再混义；
  browse/focus 的失败可持续处理；1024×768 下工具栏不再被教学文案和错误行挤成竖排；
  移除 O(E) bright 集计算。
- 成本：需要迁移模式/聚焦、工具栏 DOM、侧栏、dim 和错误几何的受锁测试；活动 focusSet
  与挂起 entry 的同步必须集中在 registry 写口，不能新增第二状态源。
- 行为取舍：Q0/F0 error 仍显示，但不再单独构成退出/结构写未落定；这与普通写失败 Q≥1
  的继续拦截形成明确分界。mode/focus 仍不持久化，应用重启回 browse/空集合。
- 补笔（B5 实施期闭合，2026-11-25）：结构事件触发的自动和解（reconcileNow）成功收尾
  不清站立 error 相位——自动和解是后台图态再同步，不是失败命令重试，告警与丢弃出口
  只有用户显式重试/丢弃能销账（设计稿 §7.2 文义，红测
  lineage-history-stale-auto-reconcile 锁定）。
- 文档：同批修订 INV-22/91/145/153/177/187/190；ADR-0027/0032 加演进注记。历史 P-1
  文档与 B4 设计稿保留。
- 回滚：store 生命周期、registry 剪枝、错误/IO 语义、工具栏 DOM、无 dim 视觉分别可回滚；
  ADR/INV 必须与代码同向，不得只回滚一半。
