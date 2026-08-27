/**
 * ipc/ai_sensor —— AI 伴随进程域装配（AI-06 协议两通道自
 * export_ 域迁入 + AI-07 回灌导入器两通道；2026-08-27 用户裁决 ADR-0017
 * 新立本域，通道名不变——register/preload/renderer 经动态机制零改动）。
 *
 * 薄分发（SR-IPC-* 同型）：业务在 services/ai_sensor/*；协议/导入 IO 错误
 * 原样上抛，register 折叠为 Result。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createAiSensorIpc(deps: IpcDeps): ApiHandlers['ai_sensor'] {
  return {
    requestAiRead: (req) => deps.services.ai_sensor.requestRead(req.paperId),
    aiStatus: async () => deps.services.ai_sensor.readStatus(),
    observe: (req) => deps.services.ai_sensor.observe(req.paperId),
    importAll: async () => deps.services.ai_sensor.importAll(),
    listByPaper: (req) => deps.services.ai_sensor.listByPaper(req.paperId),
    // AI-10：zcode 联动两通道（检测/装技能——纯 fs，INV-21 零 spawn）
    zcodeDetect: async () => deps.services.ai_sensor.zcodeDetect(),
    zcodeInstall: async () => deps.services.ai_sensor.zcodeInstall()
  }
}
