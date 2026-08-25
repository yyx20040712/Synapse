// b3: P7-G
/**
 * [SR2-AI-03] corpus.export.service —— 五件套导出会话（工单：open / strong）
 *
 * ── 行为层 ──
 * - 会话编排（状态机全表，母本=ai-plan-review §6；INV-18 随单锚定）。
 *   态空间定义：idle=无会话；preparing=清目录+写 corpus md；streaming=逐篇
 *   发 extract-request+消费回传落盘；finalizing=全部篇终局后 manifest 终写；
 *   done/failed=终态即会话对象销毁（不驻留——终态后新会话从 idle 起新对象）；
 *   interrupted=main/renderer 同死（进程/窗口退出）——**非驻留态**：Electron
 *   单进程组下 main 死则 renderer 同死，无 IPC 悬挂/按钮卡死面；重启后新会
 *   话从 idle 起，中断目录无 manifest=工具不可激活（重跑即修复）。main 内
 *   异常≠interrupted：折叠错误码 resolve（会话 failed），不悬挂 Promise。
 *   清空重建范围=corpus/fulltext/figures 三子目录内容+manifest.json+
 *   manifest.tmp（R8 裁决原文语义）——目录根用户其他文件不动；三子目录
 *   即导出产物域，用户的任意放置视为可清理（与 corpusSet 守卫的不对称
 *   合理：轻量通道无清空语义故拒绝污染，本通道会话开宗明义清空重建）。
 *   事件迁移表：
 *   | 当前态 | 事件 | 迁移 | 动作/守卫 |
 *   | --- | --- | --- | --- |
 *   | idle | export/corpus invoke | →preparing | 单飞守卫：已有会话→EXPORT_BUSY 拒绝（INV-18 单飞条款；消费方折叠分支=UI 提示，INV-13） |
 *   | idle | （目录既有残留） | preparing 内清空 | 删旧 manifest+清空重建 corpus/fulltext/figures（残留 tmp 文件同删——终局写 manifest.tmp 后中断的残留随下次会话清理） |
 *   | preparing | md 全写完 | →streaming | 逐篇发 extract-request（上一篇 complete/error 后才发下一篇——串行编排，renderer 侧无并发面） |
 *   | preparing | repo/装配/写盘异常 | →failed | 折叠错误 resolve；manifest 不写 |
 *   | streaming | 篇 complete | streaming | 篇计数+1；全部篇终局→finalizing |
 *   | streaming | 篇 error（文件缺失/损坏） | streaming | 该篇进 errors[]，会话继续（部分成功） |
 *   | streaming | chunk invoke 折叠错误 | →failed | 折叠错误 resolve；manifest 不写；重跑修复 |
 *   | streaming | 流式落盘写盘失败（回传成功但写 corpus/fulltext/figures 出错） | →failed | 同上处置（故障源与回传失败不同——日志区分）；manifest 不写 |
 *   | finalizing | manifest 终写完成 | →done | resolve {dir,fileCount,errorCount} |
 *   | finalizing | 写盘/rename 异常 | →failed | 折叠错误 resolve |
 *   | 任意 | 进程/窗口死 | →interrupted | 无 manifest=工具不可激活；无 IPC 悬挂（同死） |
 *   跨格序列七行（实现测试须逐格闭合）：
 *   | 跨格序列 | 期望行为 |
 *   | --- | --- |
 *   | 正常全链 | preparing→streaming→finalizing→done；manifest 存在且 sha 全匹配 |
 *   | 篇失败（文件缺失/损坏） | 该篇进 errors[]，会话继续；done=部分成功，UI 呈现 errorCount |
 *   | chunk 回传失败（invoke 折叠错误） | 会话 failed；toast（INV-02）；manifest 不写；重跑修复 |
 *   | 中断（窗口关/进程退） | 无 manifest→工具不可激活；重跑=清空重建（幂等） |
 *   | 并发第二会话 | EXPORT_BUSY 拒绝+按钮 disabled |
 *   | 导出中用户导航离开设置页 | 流不中断（监听在 App 层）；完成/失败 toast 常驻可见 |
 *   | renderer 逐页回传 | 每页一 invoke，await ack 后发下一页（天然背压）——streaming 态内数据流机制（非状态迁移，载荷 schema 见 AI-02 接口层） |
 * - manifest 终局单写（R5/R8）：临时文件+rename 原子替换；会话开始删旧
 *   manifest+清空重建 corpus/fulltext/figures 三子目录；schema 含
 *   schemaVersion/exportedAt/papers[]{contentSha,fulltextSha,figures,
 *   exportedAt}+可选 errors[]{paperId,reason}（papers[] 只列成功篇）；
 *   「manifest 存在=导出完整就绪」=工具侧唯一激活判据；进度不走 manifest
 * - 幂等（R6，INV-17 随单锚定）：corpus md front-matter 不含 exportedAt
 *   （时间戳只进 manifest per-paper 条目）；contentSha/fulltextSha=文件字节
 *   sha256（node:crypto 先例）；**逐字节稳定的范围=产物文件**（corpus/
 *   fulltext/figures 及其 sha）——manifest 自身含 exportedAt 不参与逐字节
 *   断言（golden 区分：内容 golden 逐字节+manifest 结构断言）
 * - 单飞（R9，迁移表 idle 行）：进行中拒第二会话=app-error 新码 EXPORT_BUSY
 *   [受锁新增]——INV-18 单飞条款锚定；消费方折叠分支=UI 提示（INV-13 语义
 *   ——折叠面消费方必须分支处理，AI-04 接线）
 * - 装配单源（R12 红线，置顶条款）：corpus md 装配只在 corpus.assemble.ts
 *   延展（[ai:*] 段=aiNotes 入参按 role→question 分组装配，语法不变）；本
 *   service 只做编排/落盘/sha/manifest——禁第二套 md 装配
 * - 通道判定（2026-08-27 开工裁决，交接书指定项）：C-02 既有 corpus/
 *   corpusSet 通道**保留**（单篇 md 快速导出+库页 md 集合，轻量面）；本单
 *   新增 export/corpus 通道=五件套全量会话（设置页「AI 语料导出」入口，
 *   AI-04）。判定依据：ADR-0011 v1.1 五件套是 AI 传感器全量基座（含
 *   fulltext/figures 提取，GB 级），与库页轻量 md 集合场景不同；两者共用
 *   corpus.assemble 装配纯函数（装配单源不破）——目录形态与会话语义分层，
 *   非双实现。**目录隔离条款**：两通道不得污染对方产物——五件套会话开始
 *   删旧 manifest+清空重建（迁移表 idle 行）；corpusSet 写入前置守卫=目标
 *   目录含 manifest.json 时拒绝（ExportDomainError 提示选空目录——防轻量
 *   md 覆盖 corpus/ 后工具按残留 manifest 误激活读新旧混合语料；守卫接线
 *   随本单交付，export.service.ts 非受锁）
 * - INTERFACE.md（interface-template.ts 静态单源，INV-11）：目录结构/
 *   front-matter 字段表/引文块语法/排序规则/页码基准（p.N 1 基——corpus.
 *   assemble 头注口径同源）/fulltext 页界 \f/figures 消费说明/版本承诺
 *
 * ── 接口层 ──
 * - export function createCorpusExportService(deps): CorpusExportService
 * - IPC [受锁]：export/corpus {paperIds?} → {dir, fileCount, errorCount}
 *   （全库默认；会话终局 resolve）；export/corpus-item（AI-02 建通道，本单
 *   main 侧消费流式落盘）；exportCorpus 事件发送器经 bootstrap 装配桶注入
 *   （importProgress/sendProgress 同型先例）
 *
 * ── 架构层 ──
 * - main/services/export_ 域；依赖 repos（papers/annotations/notes/ai_notes
 *   ——corpus md 与 [ai:*] 段装配数据面）+corpus.assemble+file-store
 *   （app-file:// url 解析——提取请求 url 下发）+shell/dialogs（INV-07
 *   目录选择——路径只出自 main 对话框）。**fulltext/figures 数据面=导出时
 *   AI-02 对 PDF 源文件实时提取流式落盘**（无 fulltext 表/无缓存——唯一
 *   数据源=文件库 PDF 经 app-file:// 事件载荷下发）；exportCorpus 事件
 *   发送器=对 AI-02 的驱动通道（bootstrap 装配桶注入）
 *
 * ── 生命周期层 ──
 * - 预留：增量导出（manifest 字段位预留不实现）；figures 收窄（如仅标注页）
 *   =版本化修订（INTERFACE 版本号联动，ADR-0011 v1.1 第 5 条）
 * - 不做：取消 UI（v1）；md 回写 DB（投影只读——ADR-0011 存储分层）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/corpus.export.test.ts [受锁新增]：夹具库→
 *   五件套 golden 逐字节+结构断言（ADR-0011 v1.1 验收口径：front-matter
 *   可解析/引文块数=DB 标注数/序=sortByDocumentOrder/contentSha 匹配/
 *   [ai:*] 段装配）+幂等重导逐字节稳定（范围=产物文件；manifest 结构断言
 *   另立）+状态机跨格序列（篇失败/chunk 失败/落盘失败/BUSY/中断恢复）+
 *   corpusSet 目录隔离守卫（目录含 manifest.json→拒绝）
 * - IPC 载荷量化预期：corpus-item 单条=页级（figure=页快照 base64 典型
 *   <2MB；逐页 invoke 即分块粒度——禁跨页聚合大 payload 整块，母本背压
 *   原文）
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

import { NotImplementedError } from '../../../shared/app-error'
import type { CorpusItemReq } from '../../../shared/ipc/schemas'

/** 工单骨架标记（实现单元替换为真实实现） */
export const CORPUS_EXPORT_SERVICE_STUB = 'SR2-AI-03'

/**
 * 会话服务工厂（AI-03 实现前占位形态）：corpusItem 消费端随本工单落地——
 * AI-02 已建 renderer 侧回传通道（CorpusExtractor+export/corpus-item 契约），
 * 本占位经 register 折叠 NOT_IMPLEMENTED → renderer failed 路径（链路可测）。
 */
export interface CorpusExportService {
  /** 提取回传消费端：流式落盘+会话推进随本工单（AI-03）实现 */
  corpusItem(req: CorpusItemReq): Promise<{ ok: true }>
}

export function createCorpusExportService(): CorpusExportService {
  return {
    async corpusItem(_req: CorpusItemReq): Promise<{ ok: true }> {
      throw new NotImplementedError('SR2-AI-03')
    }
  }
}
