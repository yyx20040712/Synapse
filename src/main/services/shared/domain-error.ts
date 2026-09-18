import type { AppErrorCode } from '../../../shared/app-error'
/**
 * 服务层域错误基类（F-DEDUP-01 单源）：带 AppErrorCode 的 Error，
 * register 出口经 toAppError 按 code 字段折叠（鸭子类型，不按类名）。
 * 子类名经 new.target.name 自动落 name 字段——各域子类一行继承零样板。
 */
export class DomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = new.target.name
    this.code = code
  }
}
