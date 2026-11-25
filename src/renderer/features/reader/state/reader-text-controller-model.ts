/**
 * [B4-A R1 §3/§4.3；F-SLIMB4A-01 拆件] reader-text-controller-model —— 文本控制器的
 * 契约类型件（自 reader-text-controller 迁出 2026-11-25：保存态/视图/宿主 ports/
 * 操作层预 flush 准备体；纯类型件，controller 原名再导出——既有导入面零改动，
 * 类型不双写）。
 *
 * ── 接口层 ──
 * - export type TextSaveState
 * - export interface TextView / TextControllerPorts / RawPreflush
 *
 * ── 架构层 ──
 * - 纯类型件：只 type-only import reader-text-history 的 target 身份类型（零运行时
 *   依赖、零环）。消费方=reader-text-controller（实现）、reader-text-history-task
 *   （预 flush 捕获入参）；reader-history-commands 与 annotation-draft-registry 取
 *   RawPreflush 仍经 controller 再导出。类型注释自 controller 原样迁入——其中
 *   「本控制器/本件」仍指 reader-text-controller（指代不变）。
 */
import type { TextTargetKey } from './reader-text-history'

export type TextSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

export interface TextControllerPorts {
  /** 落库写（单元/blur/flush 的普通写路径）：true=该值已在库。写体由宿主适配器
   *  经 per-tab lane 自行入链（控制器在链外调用） */
  persist(value: string): Promise<boolean>
  /** [B4-A 回炉 R5] 裸预 flush 写：true=该值已在库。仅供链任务体内直调——单层入链
   *  契约：不自行入链、直调 API 写（任务体内再入链=循环等待，命令永久挂起且该 tab
   *  写链堵死）；调用方=本控制器的 history 链任务或操作层 history 命令的复合链任务 */
  persistRaw(value: string): Promise<boolean>
  /** [B4-A 回炉 R5] 裸反向写（文本 undo/redo）：契约同 persistRaw——仅供控制器
   *  链任务体内直调，不自行入链 */
  historyWriteRaw(value: string): Promise<boolean>
  /** 显示值采用镜像（宿主另持草稿态时同步写回——notes 总评；key=本控制器的
   *  target：宿主回调按 key 寻址，不读渲染帧闭包——离场篇的收口写不落新篇）。
   *  persisted=false：用户新输入——宿主按未落库草稿保留（打未保存标记），不应用
   *  为已保存基线；persisted=true：控制器采纳已落库的反向值（undo/redo 成功
   *  回执）——宿主按已落库值采纳（不打未保存标记）。卸载后采纳照常通知 */
  mirror?(value: string, key: TextTargetKey, persisted: boolean): void
  /** 编辑会话终止通知（blur 与卸载两处——宿主结束操作层合并会话：批注）。
   *  卸载必通知：焦点元素随 DOM 移除不保证派发 blur，切目标/路由离场不得
   *  让会话跨挂载存活 */
  onSessionEnd?(): void
  /** [B4-A R2 §2.5 #1/#16-#17] 用户新编辑/文本 undo-redo 成功通知（宿主置该
   *  tab unfinalized——U 轴写点经 ports 注入，本件不引域 store） */
  onUserEdit?(): void
  /** 视图变更通知（宿主据此重渲染） */
  onChange(): void
}

export interface TextView {
  comment: string
  saveState: TextSaveState
  canUndo: boolean
  canRedo: boolean
}

/** [B4-A 回炉三 A] 操作层 history 命令的预 flush（命令起步时经 flushPendingRaw 取得） */
export interface RawPreflush {
  /** 裸预 flush 体——调用方链任务体内直调（不自行入链）；true=预 flush 成功 */
  run(): Promise<boolean>
  /** 命令终结时调用（成功/失败/中止同）：解除等值普通写抑制 */
  release(): void
}
