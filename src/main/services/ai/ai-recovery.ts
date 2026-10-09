/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-recovery —— 启动恢复扫描接线（§3.D 崩溃恢复：
 * 启动扫描 running→failed(interrupted)——同步事务崩溃即未提交=天然零副作用）。
 *
 * ── 行为层 ──
 * - 直传 aiTasks.recoverInterruptedTasks（恢复原语单源在 repo；本件=bootstrap
 *   接线锚+语义注记宿主——启动期同步 await，bootstrap assemble 闭包内调用）。
 * - 幂等：running 集空时返回 0（二跑零变化——recoverInterrupted 守卫迁移承载）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-recovery.test.ts（always-active 真库夹具）。
 */
import type { AiTasksService } from './ai-tasks.service'

/**
 * 启动恢复扫描（bootstrap 单一调用点——assemble 闭包 createServices 之后）：
 * 悬置 running 任务批量迁移 failed(interrupted)，返回迁移计数。
 */
export async function runStartupRecovery(aiTasks: AiTasksService): Promise<number> {
  return aiTasks.recoverInterruptedTasks()
}
