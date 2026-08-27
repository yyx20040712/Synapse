# 任务：新设备首会话开工（设备迁移后环境自检+项目状态接管）

> 用法：新设备 DEV-SETUP.md §1~§5 全绿后，粘贴「按
> docs/prompts/2026-08-27_device-migration-handoff.md 开工」。
> 本文接续 2026-08-27 主会话（P7-H 收官 f1c1502+迁移方案 C 落地）。

## 0. 迁移后专属自检（常规开工前置之外加做）

0. **zcode 环境层先行**：若携带《ZCode 开发环境快照与迁移激活手册》
   （用户侧文件，不依赖固定路径），按其第 0 章激活协议恢复（登录/74 技能/
   8 子代理/6 命令/6 插件——其中 §4.1 循环工程栈=subagent-driven-development
   内部模板，三屋模式技能清点依赖它）；网络代理=登录与 GitHub push 共同
   前提（旧机 127.0.0.1:7890，新机以实际为准）。
1. `node -v`=24.x；`git log --oneline -3` 应见 f1c1502 或更新。
2. `npm run verify` exit 0=**86 文件 615 用例**/locks **132**/工单 104 **open 0**；
   `npm run build && npm run test:e2e`=**20/20**。
3. 若携迁移包：`node scripts/local-state.mjs import <archive>`（§4 流程）+
   启动应用核对文献库在。
4. **AGENTS.md「环境事实」节**：MinGit 路径行若与本机不符，按本机实况修订
   （一行，纯 docs）；代理端口若不同同步修订。
5. 常规开工纪律照旧：技能清点+配置自查 → 分级阅读（本册 §1 指针）→ verify 自检。

## 1. 项目状态接管（2026-08-27 迁移时点）

- **P7 主线 A~H 全域完成**：批二战役报告=docs/reports/2026-08-27_ai-campaign-batch2.md；
  脉络组=docs/reports/2026-08-27_lineage-campaign.md（含主控操作事故两起与
  教训——收口纪律强化两条）。ROADMAP 逐段 ✅ 注记为最快索引。
- **registry 104 工单 open 0**——无存量单可领；下一动作=P8 规划或新战役
  工单化（**待用户指令**，勿自启）。
- 三屋模式=默认（ADR-0017+AGENTS 工单工作流节+methodology §4 模板三件）。
- 流程改进挂账（下批模板强制化）：日志真退出码行/变异还原记录=收口机检项
  （缺=拒收）；组合根 hook 聚合禁短路写法。

## 2. 用户视检挂账（累计，建议合并一次走查）

批一①设置页导出全流程+②五件套观感；批二③zcode 激活自检（装技能→拾取
job→「AI 正在读」→回灌导入→面板分节分色）；本役④脉络视图全链（导入草稿→
树渲染→拖拽→侧板→双击跳转）+⑤RT 布局观感。视觉项按用户指示可调 GLM5.3
flash。

## 3. 已知遗留（无阻断）

- `dist_new/` 历史残留（旧机已弃；新机 clone 后本就不存在——此项作废）。
- 8491489 崩溃时序矛盾待考（lineage 战役报告 §3.3——只读记录）。
- 导入 errors 单行汇总呈现（v2 候选）。

## 4. 迁移专项说明

- 迁移丢失面盘点与方案裁决=用户 2026-08-27 选定方案 C（工程化固化）；工具=
  `scripts/local-state.mjs`（export/import/list）；引导=docs/DEV-SETUP.md。
- `tools/ai-sensor/config.json`（模型密钥）**从未创建**——若用户开始用 zcode
  联动功能，按 tools/ai-sensor/config.template.json 新建（gitignore 保持）。
- 旧机 4 个定时任务全部已完结（enabled:false）——无需迁移，新机从零。
