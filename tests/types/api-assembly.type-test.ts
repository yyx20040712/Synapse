/**
 * workspaces 域装配完整性 type-test（SR-IPC-10）——只编译不执行：
 * .type-test.ts 不匹配 vitest include（单层 `*.test.ts` 模式）=只编译不执行；
 * tsconfig.node.json include 覆盖 tests 下全部 .ts，由 typecheck 编译。
 *
 * 背景（api-surface.ts ApiHandlers 头注）：workspaces 属 ComposedHandlerDomains
 * ——ApiHandlers 对该域可选 = 漏组合不再编译期拦截（R1-WS1 代价申报）。本件
 * 与 bootstrap 侧 IpcAssemblyProbe 联合补上该缺口：调用点标注探针类型
 * （漏组合=调用点编译红）+ 本件对账探针 ⊇ Required<ApiHandlers>（缺域=本件
 * 编译红），两层闭合。
 *
 * 双证形态（design-final §2 终裁）：
 * - 正向：装配探针（全推断类型，ReturnType 链单源）可赋 Required<ApiHandlers>
 *   = 组合装配后无缺域；禁显式宽型标注（宽型下 typeof 恒为声明型=断言空转，
 *   审 B3）；null 探针值 = 零运行时对象。
 * - 负向：@ts-expect-error 证「缺 workspaces 域对象（createIpcHandlers 裸返回
 *   形态=漏组合场景）赋 Required」必编译失败；若类型系统不拦则该行无错 →
 *   tsc 报「Unused '@ts-expect-error' directive」= 反向自证闭合。
 */
import type { ApiHandlers } from '../../src/shared/ipc/api-surface'
import type { IpcAssemblyProbe } from '../../src/main/bootstrap'
import type { createIpcHandlers } from '../../src/main/ipc'

// 正向证：装配体（11 静态域 + workspaces 组合注入）满足 Required<ApiHandlers>
// 全量——探针类型全推断（ReturnType<typeof createIpcHandlers> & { workspaces:
// ReturnType<typeof createWorkspaceService> }），无手工成员声明。
const _full: Required<ApiHandlers> = null as unknown as IpcAssemblyProbe

// 负向证：缺 workspaces 域（ComposedHandlerDomains 漏组合——裸
// createIpcHandlers 返回形态）不可赋 Required——类型系统真拦。
// @ts-expect-error 缺 workspaces 域不可赋 Required——类型系统真拦（负向证）
const _missing: Required<ApiHandlers> = null as unknown as ReturnType<typeof createIpcHandlers>
