// b3: P7-B
/**
 * [SR2-UNDO-01] annotation-undo —— 标注操作级撤销栈（工单：open / strong）
 *
 * ── 行为层 ──
 * - 操作级 undo（非全文 undo 树）：三类操作的逆操作
 *   | 原操作 | 逆操作（undo） |
 *   | create（SelectionLayer 保存） | delete（api.deleteAnnotation + store.removeAnnotation） |
 *   | delete（菜单删除） | re-create（api 重建——需保存被删标注完整对象，id 复用） |
 *   | comment-edit（AnnotationEditor 保存） | update 回旧 comment（需保存编辑前 comment） |
 * - 栈 per-tab、模块级自持（annotation-undo.ts 内 Record<paperId, entry[]>——
 *   不进 TabState，避免 reader.store↔本模块循环依赖，plan 门 W2 裁决），随
 *   closeTab 清理（reader.store.closeTab 调 clearStack(paperId)——接缝一行，
 *   本工单改动面）；深度上限 50（FIFO 截断）
 * - undo 执行：api 调用失败 → 逆操作不弹栈（状态不变）+ 动作型失败 toast
 *   （INV-02）；成功 → 弹栈 + store 同步（store 同步经回调返回值由调用侧执行，
 *   本模块不 import reader.store）
 * - redo 不做（用户需求只有撤销；全文 undo 依赖 textarea 原生——B1 §7-3 对策）
 * - 触发：ctrl+z 经 keymap 注册（editable 避让自动生效——textarea 内是原生
 *   undo，本栈不接管编辑场景）；栈空时 no-op
 * - 依赖序（plan 门 W4 处置）：**依赖 SR2-TABS-01**（closeTab 清理接缝），可与
 *   TABS-02/03/04 并行，禁先于 TABS-01 实施
 *
 * ── 接口层 ──
 * - export interface UndoEntry（三类逆操作载荷的判别联合）
 * - export function pushUndo(paperId, entry): void / undo(paperId): Promise<void>
 *   （经 reader.store 动作面暴露 undo()，组件不直接 import 本模块——api 调用
 *   与 store 同步收口单点）
 *
 * ── 架构层 ──
 * - 纯逻辑+api 调用收口；接缝（本工单改动面）：SelectionLayer.tsx:142-169 与
 *   AnnotationLayer.tsx:138-185 成功路径 push、ReaderShortcuts.ts:46-51 键位表
 *   加 ctrl+z、reader.store.ts closeTab 清理一行+undo() 动作
 * - 逆操作 id 复用前提：annotations.repo.insert 是否接受显式 id——实现前核对
 *   repo 契约（tests/unit/db/repos/annotations.repo.test.ts 锁定面），不接受则
 *   re-create 用新 id（标注锚定不依赖 id，风险面=同 id 引用残留，实现时清点）
 *
 * ── 生命周期层 ──
 * - 预留：redo（P8+）；不做：跨 tab 撤销（栈随 closeTab 丢弃）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-undo.test.ts（新建，受锁）：三逆操作
 *   正确性、深度截断、api 失败不弹栈、空栈 no-op、per-tab 隔离
 */
import { unimplementedObject } from '@shared/app-error'

export const annotationUndoApi = unimplementedObject<typeof import('./annotation-undo')>(
  'SR2-UNDO-01',
  '标注操作级撤销栈'
)
