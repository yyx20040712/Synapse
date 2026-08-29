# R2-SH3 开工记录(2026-08-29,主控会话)

> 任务:frameless 标题栏合并(bilibili 式,中票三屋)。
> 来源:docs/prompts/2026-08-29_loop-handoff-v7.md §3 执行序第 2 项;
> 用户决策原文见 handoff-v5 §1 决1「顶栏希望与系统最小化-最大化-关闭栏
> 合并(bilibili 式)」。

## 1. 技能清点(会话开工纪律)

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| subagent-driven-development(三屋) | **用** | SH3 为中票三屋(ADR-0017),派发实现者+门一+门二三子代理 |
| test-driven-development | **用** | 实现者 TDD 红→绿→断言级变异红证(方法论 §4.1 ④) |
| verification-before-completion | **用** | 收口亲验 verify 真退出码+locks+diff 范围 |
| e2e-testing-patterns | **用** | 波及 e2e 窗控断言(受锁面扩) |
| frontend-ui-engineering | 局部参考 | caption 三键皮肤遵循 theme.css 既有体系(B1 教训:皮肤住类不住内联) |
| systematic-debugging | 备而不用 | 若真机验证遇到 Windows caption 异常再加载 |
| browser-testing-with-devtools / webapp-testing | 不用 | 本项目 e2e 已有 Playwright Electron 体系,统一走 npm run test:e2e;前台保护规则要求无头 |
| computer-use | 不用 | 交互验证全部无头后台;Windows 三键 hover/press 视觉归用户复测面 |
| code-review-excellence | 不用 | 审查职能由门一/门二独立子代理承担(对抗深审更強) |
| git-advanced-workflows / worktrees | 不用 | 单分支单提交,常规 git |
| 其余(dbt/k8s/airflow/postgres 等运维类) | 不用 | 与本票无关联 |

## 2. 配置自查

- 主控:builtin:bigmodel-coding-plan/GLM-5.3(当前会话)。
- 子代理:general-purpose 型,派发时逐个在 prompt 声明身份与禁令(方法论 §4.1 ①)。
- Node 口径:本机默认 v25.2.1 有 jsdom 环境红(预存,v6 交接)——跑 vitest 用
  Node 24 口径(与 CI 一致),e2e/verify 同口径。

## 3. 开工前现场核查(git/基线)

- git status:仅 scripts/audits/f1-out/*.png 历史取证残留(未跟踪,不 touch)。
- 基线:verify 107 文件 893 用例 / locks 169 / e2e 26(v7 §首)。
- 受锁面预估(将触碰→收口 [locked-change]+locks:apply):
  src/shared/ipc/api-surface.ts、src/shared/ipc/schemas.ts、
  tests/unit/ipc/system.test.ts、tests/e2e/(窗控断言)、
  (preload-surface.test.ts 视事件桥扩展而定)。
- 非受锁面:main-window.ts、ipc/system.ts、ipc/index.ts、bootstrap.ts、
  App.tsx、新 TitleBarControls 组件、theme.css。
