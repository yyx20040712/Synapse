# AUDIT-C 二波修票场 会话开篇记录（2026-09-02，主控 GLM5.3）

> 场=交接书 v22 §2 执行序。票面素材：F-R3=scripts/audits/f-r3-investigation.md
> §5 v3 终排；A3=audit-c-scan.md §1.2-a+§5-1（含 ds-审 W-5 三件套补强）；
> F-R2e=台账第 2 现立案（同值 3.45px×2）；C-3 W 级=audit-c-scan.md §5。

## 技能清点（开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| subagent-driven-development | 用 | 三屋派发蓝图+Model Selection 蓝本（§4.5 已册） |
| test-driven-development | 用 | 修票 TDD 红→绿→断言级变异红证 |
| systematic-debugging | 用 | F-R2e 排查票+轨二 b 注入实验面 |
| verification-before-completion | 用 | 收口亲验 verify 真退出码/locks/diff 范围 |
| loop-engineering / loop-defenses | 用 | 本场即 loop 场执行（预算 40% 停点纪律） |
| error-handling-patterns | 用 | 轨二 c 失败路径清理+A3 cancel/in-flight 代际设计参考 |
| writing-plans | 不用 | 票面规约=既有排查报告素材+methodology §4 模板，非新计划件 |
| requesting/receiving-code-review | 不用 | 门审=外部链 ds-call（Kimi 链/deepseek），非本地 skill 流程 |
| e2e-testing-patterns / javascript-testing-patterns | 不用 | repo 既有受锁测试范式完备，票面沿用不改测试基建 |
| browser-use / webapp-testing / browser-testing-with-devtools | 不用 | e2e 全走 npm run test:e2e 无头（AGENTS 前台焦点保护） |
| computer-use | 不用 | 无 UI 自动化需求 |
| git 系列技能 | 不用 | AGENTS.md 提交纪律更严（显式列文件+[locked-change]） |
| 其余工程技能（postgres/k8s/设计类等） | 不用 | 与本场任务无关 |

## 配置自查

- 主控=GLM5.3×bigmodel-coding-plan（判断力密集不降档——§4.5 编排者档）✓
- 实现者子代理=Agent 工具无 model 参数（环境限制统一档）——欠账照记（§4.5
  环境降级披露条款，v22 同款）；禁 git/registry/越白名单。
- 门一=ds-call.mjs Kimi 链（kimi-main→kimi-backup→deepseek 兜底）。
- 门二=deepseek v4 flash 优先（异构二审）；实现者回炉 ≤2 轮。
- 外部链简报由主控预生成（禁让审计者自跑仓库命令——零仓库接触铁律）。

## 场预算与停点

- 停点=单票回炉 ≤2；整场触 40% 即停（loop 纪律）。
- PATH 前导漂移警示（v22 §5）：一切 node/npm 调用显式 `export PATH=/d/nodejs24:$PATH`。
