/**
 * 全局写冻结事件的最小共享接缝。
 *
 * 置位模块不持有任何 feature 订阅者；feature 命令态模块在初始化时登记一个
 * 失效回调。事件只表示“冻结真值已变化”，不携带投影结果。
 */

type FreezeChangedListener = (value: boolean) => void

let listener: FreezeChangedListener | null = null

/** 命令态模块初始化时登记；重复登记覆盖旧回调（当前只有一个消费面） */
export function setQuitFreezeChangedListener(next: FreezeChangedListener | null): void {
  listener = next
}

/** 冻结真值写点调用；无订阅者时为零开销 no-op */
export function notifyQuitFreezeChanged(value: boolean): void {
  listener?.(value)
}
