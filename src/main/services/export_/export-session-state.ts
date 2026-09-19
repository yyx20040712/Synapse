// b3: P7-G
/**
 * [F-EXPORT-01] corpus.export 会话状态机外提单源（自 corpus.export.service 拆出；
 * 拆件裁决=docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6/§3 梯队四）。
 *
 * ── 态空间（迁移表母本随迁本件——service 头注只留指针） ──
 * 态空间定义：idle=无会话；preparing=清目录+写 corpus md；streaming=逐篇
 * 发 extract-request+消费回传落盘；finalizing=全部篇终局后 manifest 终写；
 * done/failed=终态即会话对象销毁（不驻留——终态后新会话从 idle 起新对象）；
 * interrupted=main/renderer 同死（进程/窗口退出）——**非驻留态**：Electron
 * 单进程组下 main 死则 renderer 同死，无 IPC 悬挂/按钮卡死面；重启后新会
 * 话从 idle 起，中断目录无 manifest=工具不可激活（重跑即修复）。main 内
 * 异常≠interrupted：折叠错误码 resolve（会话 failed），不悬挂 Promise。
 * 事件迁移表：
 * | 当前态 | 事件 | 迁移 | 动作/守卫 |
 * | --- | --- | --- | --- |
 * | idle | export/corpus invoke | →preparing | 单飞守卫：已有会话→EXPORT_BUSY 拒绝（INV-18 单飞条款；消费方折叠分支=UI 提示，INV-13） |
 * | idle | （目录既有残留） | preparing 内清空 | 删旧 manifest+清空重建 corpus/fulltext/figures（残留 tmp 文件同删——终局写 manifest.tmp 后中断的残留随下次会话清理） |
 * | preparing | md 全写完 | →streaming | 逐篇发 extract-request（上一篇 complete/error 后才发下一篇——串行编排，renderer 侧无并发面） |
 * | preparing | repo/装配/写盘异常 | →failed | 折叠错误 resolve；manifest 不写 |
 * | streaming | 篇 complete | streaming | 篇计数+1；全部篇终局→finalizing |
 * | streaming | 篇 error（文件缺失/损坏） | streaming | 该篇进 errors[]，会话继续（部分成功） |
 * | streaming | chunk invoke 折叠错误 | →failed | 折叠错误 resolve；manifest 不写；重跑修复 |
 * | streaming | 流式落盘写盘失败（回传成功但写 corpus/fulltext/figures 出错） | →failed | 同上处置（故障源与回传失败不同——日志区分）；manifest 不写 |
 * | finalizing | manifest 终写完成 | →done | resolve {dir,fileCount,errorCount} |
 * | finalizing | 写盘/rename 异常 | →failed | 折叠错误 resolve |
 * | 任意在途（preparing/streaming/finalizing） | renderer 重载/崩溃（main 存活——webContents 主帧导航/render-process-gone） | →failed | abortActiveSession：清 manifest.tmp 残留+释放单飞锁+折叠 reject（IO_ERROR）；advance 守卫拦悬挂终写 manifest；重跑=清空重建（幂等） |
 * | 任意 | 进程/窗口死 | →interrupted | 无 manifest=工具不可激活；无 IPC 悬挂（同死）；renderer 单死（main 存活）由 abort 行覆盖（原「main 死则 renderer 同死」语义保留） |
 * 跨格序列八行（实现测试须逐格闭合——tests/unit/services/corpus.export.test.ts 受锁面）：
 * | 跨格序列 | 期望行为 |
 * | --- | --- |
 * | 正常全链 | preparing→streaming→finalizing→done；manifest 存在且 sha 全匹配 |
 * | 篇失败（文件缺失/损坏） | 该篇进 errors[]，会话继续；done=部分成功，UI 呈现 errorCount |
 * | chunk 回传失败（invoke 折叠错误） | 会话 failed；toast（INV-02）；manifest 不写；重跑修复 |
 * | 中断（窗口关/进程退） | 无 manifest→工具不可激活；重跑=清空重建（幂等） |
 * | renderer 重载（streaming 中） | 会话 failed：单飞锁即时释放，再发起不再 EXPORT_BUSY；无 manifest=工具不可激活；重跑=清空重建 |
 * | 并发第二会话 | EXPORT_BUSY 拒绝+按钮 disabled |
 * | 导出中用户导航离开设置页 | 流不中断（监听在 App 层）；完成/失败 toast 常驻可见 |
 * | renderer 逐页回传 | 每页一 invoke，await ack 后发下一页（天然背压）——streaming 态内数据流机制（非状态迁移，载荷 schema 见 AI-02 接口层） |
 *
 * ── 不变量锚定（[F-EXPORT-01] 随拆件迁册） ──
 * - INV-17 幂等 sha：产物文件逐字节稳定（manifest 含 exportedAt 不参与逐字节
 *   断言——sha 口径实现在 corpus.export.io.ts）。
 * - INV-18 会话协议：manifest 终局单写（R5/R8）/清空重建/EXPORT_BUSY 单飞/
 *   deferOutcome 串行不死锁时序补条（本件——setImmediate 延后篇终局推进）。
 * - INV-65 中止单源：abortActiveSession→failSession 同型处置+同步释放单飞锁
 *   （markTerminal 终局标记先于异步清理）+advance 终局守卫按会话对象身份拦截。
 */
import type { CorpusSessionRes } from '../../../shared/ipc/schemas'
import type { PaperDetail } from '../../../shared/models/paper'
import { DomainError } from '../shared/domain-error'
import type { ManifestPaper } from './corpus.export.io'

/** 会话层域错误（code 经 register toAppError 结构化保留——EXPORT_BUSY 等）；
 *  基类一行继承=services/shared/domain-error（F-DEDUP-01 单源）。
 *  [F-EXPORT-01] 随 ActiveSession 外提本件（reject 载荷类型单源）。 */
export class SessionError extends DomainError {}

/** 六态显式化（「五件套」指产物数非态数）：idle=无会话；preparing/streaming/
 *  finalizing=在途；done/failed=终态即销毁；interrupted=进程/窗口同死（非驻留
 *  态——见头注态空间定义，不入联合字面量因不可观测无迁移消费面）。 */
export type ExportSessionPhase =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'finalizing'
  | 'done'
  | 'failed'

/** 在途会话态（单飞——工厂闭包唯一实例；终局即销毁不驻留）。
 *  [F-EXPORT-01] 自 corpus.export.service 外提，字段零改。 */
export interface ActiveSession {
  sessionId: string
  dir: string
  queue: PaperDetail[]
  current: { paperId: string; fulltext: string[]; figures: string[] } | null
  papers: ManifestPaper[]
  errors: Array<{ paperId: string; reason: string }>
  done: number
  total: number
  resolve: (r: CorpusSessionRes) => void
  reject: (e: SessionError) => void
}

/** 会话引用单源（原 service 闭包 `let session: ActiveSession | null` 外提——
 *  四口 begin/current/isActive/markTerminal，调用面=service 编排件）。 */
export interface ExportSessionState {
  /** idle→preparing 起会话（置引用——单飞判据即 current() 非空）。 */
  begin(s: ActiveSession): void
  /** 当前在途会话（null=空闲——BUSY 判定/corpusItem 载荷匹配消费）。 */
  current(): ActiveSession | null
  /** 身份守卫：s 是否仍为在途会话（advance/failSession 两处悬挂推进拦截单源
   *  ——悬挂推进拦截语义：终局/中止后旧会话对象的迟到回调不得终写 manifest/
   *  误清新会话单飞锁/二次 reject）。 */
  isActive(s: ActiveSession): boolean
  /** 终局标记=同步置 null（INV-65「终局标记先于异步清理/同步释放单飞锁」承重）。 */
  markTerminal(s: ActiveSession): void
}

export function createExportSessionState(): ExportSessionState {
  let session: ActiveSession | null = null
  return {
    begin(s) {
      session = s
    },
    current() {
      return session
    },
    isActive(s) {
      return session === s
    },
    markTerminal(s) {
      // 调用面（advance/failSession）均已过 isActive 守卫——identity 复核后置空
      // 与无条件置空等价；保留复核=纵深防御（旧对象的迟到终局不得误清新会话）
      if (session === s) {
        session = null
      }
    }
  }
}

/** 篇终局推进延后至本 invoke 回复之后（setImmediate=检查阶段，晚于回复的微任务
 *  与 renderer 侧回复续体/extracting 复位）：complete 的处理器内同步发下一篇
 *  extract-request 会让事件先于回复到达 renderer——提取器仍在途（extracting
 *  未复位）按防御分支丢弃请求，串行链死锁（e2e 多篇序列实证 2026-08-27）。
 *  [INV-18 时序补条] 本函数只承担时序协议；run 的失败处置归调用方组装
 *  （service 侧接 failSession 会话折叠——本件不吞错不碰会话对象）。 */
export function deferOutcome(run: () => Promise<void>): void {
  setImmediate(() => {
    void run()
  })
}
