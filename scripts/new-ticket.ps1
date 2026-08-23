# new-ticket.ps1 —— 打印工单模板（配合 tickets/registry.ts 使用）
param([string]$Id = 'SR-XXX-00', [string]$File = 'src/path/to/module.ts', [string]$Summary = '一句话职责')

$template = @"
/**
 * [$Id] <文件名> —— $Summary（工单：open / weak）
 *
 * ── 行为层 ──
 * - <做什么；验收标准写进 tests 对应文件（已锁定，先读测试再实现）>
 * - 涉及 store+异步+用户输入时：先给状态/迁移表（态空间×事件→迁移，跨格序列
 *   显式枚举后再实现），异步 load 一律带请求序号 stale-guard（成功/失败两路径
 *   都守；形状与先例见 docs/DEVELOPMENT.md §8、AGENTS.md「状态与不变量纪律」）
 *
 * ── 接口层 ──
 * - export <签名>
 *
 * ── 架构层 ──
 * - 依赖：<路径+符号>；分层：<ipc→services→repos→db / renderer 只经 window.api>
 *
 * ── 生命周期层 ──
 * - 预留：<扩展点>；不做：<负面清单项>
 *
 * ── 文化层 ──
 * - 错误：<Result/AppError/DomainError>；禁止 any/TODO/裸 catch；文件 ≤500 行
 * - 错误反馈两型（INV-02）：动作型失败上抛由消费方 catch 后 toast；列表型失败
 *   记 store.error 由消费方 watch（带迁移守卫）；禁止静默吞错
 * - 完成后：删除占位实现 → npm run verify 绿 → 人工审查 git diff → 翻 registry 状态
 */
"@

Write-Output $template
Write-Output ''
Write-Output "然后把它登记到 tickets/registry.ts："
Write-Output "  { id: '$Id', file: '$File', area: '<ipc|db|service|network|reader|library-ui|notes-ui|tags-ui|settings-ui|ui-kit|hooks>', owner: 'weak', status: 'open', summary: '$Summary' },"
