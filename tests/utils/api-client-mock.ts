/**
 * 测试基建：api/client 与 Toast/toast-store mock 共享工厂（F-TESTREF-W1A 单源）。
 *
 * 用法（顺序契约）：测试文件必须**先** import 本工厂、**后** import 被测模块——
 * 本文件顶层的 vi.mock 在模块求值时向 vitest 注册路径 mock，注册先于被测模块
 * 加载则拦截生效（vitest 每测试文件独立模块图，状态互不串扰）。顺序写反时
 * 被测模块拿真 api（jsdom 下 window.api=undefined），调用即红，非静默失效。
 *
 * 典型迁移形态（体内 stubApi/toastSpy 引用零改动）：
 *   import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
 *   const stubApi = makeApiStub({ workspaces: { list: vi.fn() } })  // 顶层语句
 *   import 被测模块……（写在工厂 import 之后）
 *
 * 形态收敛依据（票内小判，断言语义零变化）：
 * - api/client 统一 importOriginal 展开型（存量最高频 26/38）：真模块 jsdom 加载
 *   安全（26 文件长期实证）；浅替换型的 unwrap/ApiClientError 在 renderer src
 *   零使用（死形状），并入展开型无语义影响。mock 绑定共享桩对象（引用固定、
 *   makeApiStub 在顶层语句阶段填充内容——被测代码运行时已可见）。
 * - apiEvents 为覆盖式代理：未覆盖键透传真实现（jsdom 下 window.apiEvents
 *   undefined，与原「整体替换后其余成员 undefined」语义等价）。
 * - Toast 统一展开型（15/25）：其余导出仅 ToastHost（app 级组装专用，被测
 *   feature 零 import）；toast-store 统一展开型（App 级测试挂 ToastHost 时
 *   真 Toast.tsx 消费 getToastItems/dismiss/subscribeToasts——浅替换会崩，
 *   实证 2026-09-18）。两目标 spy 独立（存量无一文件双目标共享 spy）。
 *
 * 边界：仅 renderer/jsdom 测试面适用——api/client 展开型会加载真模块（顶层
 * 读 window），node 环境测试禁用本工厂的 api mock（toast 面不受限）。
 * 受锁文件。[test-refactor][locked-change]
 */
import { vi } from 'vitest'
import type * as clientModule from '../../src/renderer/api/client'
import type * as toastModule from '../../src/renderer/shared/ui/Toast'
import type * as toastStoreModule from '../../src/renderer/shared/ui/toast-store'

// 桩状态：引用在 mock 工厂返回时固定，内容由 makeApiStub/stubApiEvents 在测试
// 文件顶层语句阶段填充（静态 import 全部完成后、任何用例运行前）。
const stubState = {
  api: {} as Record<string, unknown>,
  apiEventsOverrides: {} as Record<string, unknown>,
  unwrapOverride: null as null | ((call: Promise<unknown>) => Promise<unknown>),
  unwrapReal: null as null | ((call: Promise<unknown>) => Promise<unknown>),
  toast: vi.fn(),
  toastStore: vi.fn()
}

vi.mock('../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  stubState.unwrapReal = real.unwrap as unknown as typeof stubState.unwrapReal
  return {
    ...real,
    api: stubState.api as unknown as typeof clientModule.api,
    // unwrap 经 wrapper 每次调用时解析：默认真实现，stubUnwrap 后走覆盖
    // （存量浅替换型的「成功路径透传」语义保持通道）
    unwrap: (call: Promise<unknown>) =>
      (stubState.unwrapOverride ?? stubState.unwrapReal)?.(call),
    apiEvents: new Proxy(
      {},
      {
        get: (_target, key) =>
          typeof key === 'string' && key in stubState.apiEventsOverrides
            ? stubState.apiEventsOverrides[key]
            : (real.apiEvents as Record<string | symbol, unknown> | undefined)?.[key]
      }
    ) as unknown as typeof clientModule.apiEvents
  }
})

vi.mock('../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: stubState.toast }
})

vi.mock('../../src/renderer/shared/ui/toast-store', async (importOriginal) => {
  const real = await importOriginal<typeof toastStoreModule>()
  return { ...real, showToast: stubState.toastStore }
})

/** 填充 api 门面桩形状并返回（返回值即入参字面量——保持文件内类型化引用） */
export function makeApiStub<T extends object>(shape: T): T {
  Object.assign(stubState.api, shape)
  return shape
}

/** 覆盖 apiEvents 成员（未覆盖键透传真实现；jsdom 下真值 undefined） */
export function stubApiEvents(shape: Record<string, unknown>): void {
  Object.assign(stubState.apiEventsOverrides, shape)
}

/** 覆盖 unwrap（默认真实现——!ok 抛 ApiClientError；存量浅替换透传形态用） */
export function stubUnwrap<T>(fn: (call: Promise<T>) => Promise<unknown>): void {
  stubState.unwrapOverride = fn as unknown as (call: Promise<unknown>) => Promise<unknown>
}

/** Toast 模块入口的 showToast spy（经 `…/ui/Toast` import 的被测代码可见） */
export const toastSpy = stubState.toast

/** toast-store 直连入口的 showToast spy（经 `…/ui/toast-store` import 的被测代码可见） */
export const toastStoreSpy = stubState.toastStore
