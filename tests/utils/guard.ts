/**
 * 测试基建：工单守卫（受锁文件）。
 *
 * 用法：open 工单的测试用 guardedDescribe 包裹——工单未完成时整组 skip（main 恒绿），
 * 翻状态后自动激活。弱模型若不实现就翻状态，这些测试立即红（防作弊 K3）。
 *
 * 规则：测试文件禁止 import 被测模块之外的 src/main|renderer 实现细节；
 * 桩夹具统一从 ./fixtures 拿。
 */
import { describe } from 'vitest'
import { isTicketDone } from '../../tickets/registry'

export function guardedDescribe(ticketId: string, title: string, fn: () => void): void {
  const done = isTicketDone(ticketId)
  const label = done ? `${title} [${ticketId}]` : `${title} [${ticketId}]（延期：工单未完成）`
  if (done) {
    describe(label, fn)
  } else {
    describe.skip(label, fn)
  }
}
