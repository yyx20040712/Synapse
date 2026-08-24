// b3: P7-B
/**
 * [SR2-TABS-03] tab-dirty —— 灰点信号聚合（工单：open / strong）
 *
 * ── 行为层 ──
 * - 信号源两写面（B3 裁决 α 双层的 tab 粒度投影）：
 *   ① annotations 面：saveComment/saveAnnotation/deleteAnnotation 的 api 失败
 *     （即时持久化面的失败残留——失败后未重试即 dirty）
 *   ② notes 面：notes.store 的 pendingEdit/saveFailed（论文级总评未落库/保存失败）
 * - 聚合：isTabDirty(paperId, signals) → boolean（纯函数：任一写面 dirty 即真）；
 *   状态归 TabState.dirty（TABS-01 预留位）——信号写入点在对应失败路径
 *   （AnnotationLayer 失败分支 / notes.store 状态镜像），成功重试后清除
 * - 消费：TabBar.tsx 灰点渲染 + 关闭脏 tab 二次确认（confirm 文案含文献名）+
 *   退出拦截上报（SR2-TABS-04 的 dirty 输入=任一 tab dirty）
 *
 * ── 接口层 ──
 * - export function isTabDirty(...): boolean（纯函数核心）
 * - 聚合钩子：useTabDirtyAggregate()——汇总所有 tab 的 dirty → 单布尔
 *   （TABS-04 退出拦截的上报源）
 *
 * ── 架构层 ──
 * - 纯逻辑模块（可测性）+ 钩子薄层；不 import 组件
 * - 接缝（本工单改动面，file:line）：AnnotationLayer.tsx:138-154（saveComment
 *   失败分支写 TabState.dirty）/ annotations 保存失败同族面（SelectionLayer.tsx
 *   save 失败 :158-161 / AnnotationLayer 删除失败 :169-185）/ notes.store.ts
 *   :176-217（saveSoon 失败状态镜像读取）/ TabBar.tsx 灰点+关闭确认 /
 *   reader.store.ts（TabState.dirty 信号写入路径，字段已由 TABS-01 建位）
 *
 * ── 生命周期层 ──
 * - 预留：P7-C 片段笔记写面并入（第三写面）；不做：脏内容 diff 粒度提示
 *
 * ── 文化层 ──
 * - 灰点不引入手动保存模式（autosave-first 数据安全，显式指示保可见性——
 *   B3/ROADMAP 红线条款）
 * - 测试：tests/unit/renderer/tab-dirty.test.ts（新建，受锁）：两写面各自
 *   dirty/清除、聚合或语义、成功重试清除 + 组件级灰点渲染与关闭确认
 *   （tab-bar.test.tsx 扩展或并入，plan 门 NIT2 处置——集成面不靠人工审查）
 */
import { unimplementedObject } from '@shared/app-error'

export const isTabDirty = unimplementedObject<(paperId: string, signals: unknown) => boolean>(
  'SR2-TABS-03',
  'isTabDirty 灰点聚合'
)
export const useTabDirtyAggregate = unimplementedObject<() => boolean>(
  'SR2-TABS-03',
  'useTabDirtyAggregate 聚合钩子'
)
