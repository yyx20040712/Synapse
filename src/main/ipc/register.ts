/**
 * IPC 统一注册（SR-INFRA-12，已完成）。
 *
 * 职责：把 API_SURFACE 的每个通道接到对应 service 方法上，横切逻辑只写一次：
 *   zod 校验（拒绝未知字段）→ service 调用 → 异常折叠为 Result。
 * 弱模型往 ipc/*.ts 里写的只是"装配"，业务永远在 services。
 * 测试：tests/unit/ipc/make-handler.test.ts（校验失败/抛错/成功三路径）。
 */
import { ipcMain } from 'electron'
import type { z } from 'zod'
import { API_SURFACE, allChannels, type ApiHandlers } from '../../shared/ipc/api-surface'
import { err, ok, toAppError } from '../../shared/app-error'

export type RawHandler = (rawReq: unknown) => Promise<unknown>

/** 纯函数核心：校验 + 调用 + 折叠（单测覆盖，不经 ipcMain） */
export function makeChannelHandler(
  reqSchema: z.ZodType,
  fn: (req: unknown) => Promise<unknown>
): RawHandler {
  return async (rawReq: unknown) => {
    const parsed = reqSchema.safeParse(rawReq ?? {})
    if (!parsed.success) {
      return err('INVALID_REQUEST', '请求参数不合法', summarizeIssues(parsed.error))
    }
    try {
      return ok(await fn(parsed.data))
    } catch (e) {
      return { ok: false as const, error: toAppError(e) }
    }
  }
}

function summarizeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('；')
}

/** 装配：按接线表逐通道注册（register 薄壳，不测）。
 *  注意：骨架期 handlers 可能是"未实现占位代理"（见 app-error 的 stub 机制），
 *  访问其属性即抛 NotImplementedError——所以 fn 的取用必须发生在 invoke 闭包内（经
 *  makeChannelHandler 折叠为 Result），绝不能在注册阶段探测。 */
export function registerIpc(handlers: ApiHandlers): void {
  const surface = API_SURFACE as Record<string, Record<string, { channel: string; Req: z.ZodType }>>
  const fns = handlers as unknown as Record<string, Record<string, (req: unknown) => Promise<unknown>>>
  for (const { domain, method, channel } of allChannels()) {
    const ep = surface[domain]?.[method]
    if (!ep) throw new Error(`接线表缺通道：${domain}.${method}`)
    ipcMain.handle(channel, (_event, rawReq: unknown) =>
      makeChannelHandler(ep.Req, async (req) => fns[domain]![method]!(req))(rawReq)
    )
  }
}

/** 注销（测试与热重载用） */
export function unregisterIpc(): void {
  for (const { channel } of allChannels()) {
    ipcMain.removeHandler(channel)
  }
}
