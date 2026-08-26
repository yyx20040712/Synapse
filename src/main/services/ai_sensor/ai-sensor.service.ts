// b3: P7-G
/**
 * [SR2-AI-06] ai-sensor.service —— 伴随进程文件协议（应用侧 job 写入+状态
 * 轮询；工具侧拾取/心跳/产物落盘，工单：open / strong）
 *
 * ── 行为层 ──
 * - E1=B' 伴随进程+文件协议（ADR-0015 §1）：协议根=应用 `userData/ai-sensor/`
 *   （应用管），四成员——`pending/<jobId>.json`（job 请求）、`status.json`
 *   （会话状态+心跳）、`corpus-ai/<paperId>.json`（工具产物区，07 导入扫描面）、
 *   `archive/`（07 导入后产物移入区）。**corpus-ai/archive 落协议根的机器依据：
 *   07 导入器须在不感知用户自选导出目录的前提下目录扫描产物——userData/
 *   ai-sensor 是唯一裁决在案的应用可知目录**
 * - job 请求文件 `{ paperId, kind:'three-read', requestedAt }`（ADR §1 字面
 *   契约；requestedAt=ISO 串；jobId=crypto.randomUUID 零依赖）；**用户点击=
 *   手动激活**（笔记 tab「AI 读文献」按钮经 IPC 写入——按钮面归 AI-08）
 * - status.json `{ state, currentPaper, role, updatedAt, heartbeatAt }`：
 *   **state=工具侧自由文本自述，应用永不按 state 值分支——唯一判活依据=
 *   heartbeatAt 新鲜度**（ADR §1 原文「应用按新鲜度阈值判定运行中」）；
 *   HEARTBEAT_FRESH_MS=10min（容忍一次长模型调用间隔，tunable 常量）
 * - 应用侧零常驻：**无 main 侧定时器**——status 读取=按需 IPC（renderer 在
 *   08 面板打开/10 设置节可见期间驱动轮询，ADR §1 门控语义=「仅存在 pending
 *   job 或笔记面板打开时」的渲染层实现形态；负面清单「无常驻后台任务」保持）
 * - **应用可观测 job 状态机**（态=fs 事实推导，宪法状态机前置；跨格序列
 *   显式枚举后实现）：
 *
 *   | 态（本篇 P 观测） | fs 事实 | 事件→迁移 |
 *   | --- | --- | --- |
 *   | no-job | 无 pending job(P)，心跳不论 | 写 job（按钮）→ pending |
 *   | pending | pending job(P) 存在，心跳不新鲜 | 工具拾取+周期心跳起 → reading |
 *   | reading | 心跳新鲜（job(P) 在或 currentPaper=P） | 心跳过期且 job(P) 仍在 → pending（工具中断，与未拾取同观测面——统一「等待 zcode」呈现） |
 *   | reading | 同上 | job(P) 移除+corpus-ai/P.json 落盘 → done |
 *   | done | job(P) 无+corpus-ai/P.json 存在 | 07 导入成功移 archive → imported（08 分节数据就绪） |
 *   | imported | archive/P.json 存在（07 移入——本表拆行防「同上」含糊，W06-2） | 稳态回 idle 呈现（08 面数据来自 list） |
 *   | done 或 imported | done=corpus-ai 在；imported=archive 在 | 重按按钮写新 job → pending（重读：新产物覆盖，07 走 sha 变化重灌路径） |
 *
 *   **failed 态消解声明（门一 B06-1 处置）**：v5 骨架 pending→running→done/
 *   failed 的 failed 态在文件协议观测面消解——依据=ADR §1 字面「产物落
 *   corpus-ai→**移除 job**」：**移除 job 以产物落盘为前提=协议不变量**；
 *   工具失败（模型错/中断）不移除 job→观测坍缩回 pending（「等待 zcode」
 *   呈现），失败细节经 status.state 自述文本呈现（应用展示不分支）；瞬态
 *   「job 已移除+产物未落+心跳新鲜」被该不变量排除（companion 实现红线）
 *
 *   跨格序列（审计面，U2 教训——单格枚举盖不住）：
 *   ① no-job→pending→reading→done→imported（正常全链）
 *   ② pending→（心跳从未新鲜，用户迟拉起工具）→reading→done（迟拾取）
 *   ③ reading→（工具中途死：心跳过期+job 在）→pending→（重启续跑）→
 *      reading→done（中断续跑——queue 断点幂等保产物不丢，AI-05 交付语义）
 *   ④ done→pending→…（重读请求；多篇并发=多篇 job 并存，工具逐篇串行
 *      ——queue 既有串行语义，reading 期以 currentPaper 示队列进度）
 *   ⑤ 同篇重复写 job：pending 已含 P → 幂等返回（不写第二个文件）
 * - 协议文件一律原子写（tmp+rename——manifest 终局单写 R5/R8 同型先例）；
 *   协议根/子目录初始化=首写时 mkdir recursive 幂等（应用与工具两侧首写
 *   各自保证，N06-6）
 *
 * ── 接口层 ──
 * - export interface AiSensorService {
 *     requestRead(paperId: string): { jobId: string }        // 幂等：同篇 pending 在则返回既有 jobId
 *     readStatus(): SensorStatus | null                      // null=status.json 不存在=工具从未运行（N06-4）
 *     hasPendingJob(paperId: string): boolean                 // 08 状态行门控
 *     productExists(paperId: string): boolean                 // 08「待导入」判定（corpus-ai/ 活动区）
 *     archivedExists(paperId: string): boolean                // 08 imported 判定（archive/ 区——W06-2）
 *   }
 * - SensorStatus = { state: string; currentPaper: string | null; role: string | null;
 *     updatedAt: string; heartbeatAt: string; running: boolean }（running=新鲜度
 *   判定输出，单源在本服务——10 三档消费不双写阈值）
 * - IPC 面：ai-sensor/request-read + ai-sensor/status 两通道（实现时
 *   [locked-change]——src/shared/ipc/schemas.ts+api-surface.ts 受锁）
 * - 交付面（多文件，file=主交付面以头注清单为准——AI-05 P8 同型）：
 *   tools/ai-sensor/companion.mjs（**整合形态声明（W06-3）：queue 之上的
 *   会话壳**——消费 planSession/markDone 既有幂等不改 queue.mjs 语义（可
 *   延展导出），新增 pending 拾取循环+status 心跳+corpus-ai 产物落盘+job
 *   移除四步序；SKILL.md 工作循环节整体改写为 companion 模式（含协议目录
 *   平台惯例路径文档=%APPDATA%/<应用名>/ai-sensor 等——发现机制补充面，
 *   见 AI-10 B10-1 处置）；queue.d.mts 增 companion 类型面）+ipc/register.ts
 *   通道注册+services/index.ts 装配+preload/index.ts 与 renderer client
 *   延展（N06-5）
 * - **应用永不 spawn**（INV-21——companion 由 zcode 会话内用户拉起）
 * - 工具侧 CLI：`node tools/ai-sensor/companion.mjs <语料目录> <协议目录>`
 *   （双目录显式传参——ADR 定死协议目录=userData/ai-sensor、语料目录=用户
 *   导出自选；**发现机制 ADR 未规定，双目录 CLI=最小发明**：queue.mjs 单目录
 *   CLI 先例延展，协议目录平台惯例路径文档化归本单 SKILL.md——门一
 *   B10-1 处置联动；plan 门专项审查此项）
 * - 产物格式收口（接缝声明）：SKILL.md 现行示例「corpus-ai/<paperId>/
 *   分角色 md」为准例示意；**裁准形态=ADR-0015 §1 字面——corpus-ai/
 *   <paperId>.json 行式锚定段数组**（行形状 { role, question, model,
 *   quote_text, prefix_text, suffix_text, anchor_page, content_md }，与
 *   ai_notes 列同形 N2 粒度）；SKILL.md 随本单实现更新
 *
 * ── 架构层 ──
 * - 分层：ipc → services → fs（协议目录；不触 db——写 DB 唯一归 07 导入器
 *   经 repo，D3「写入只经应用 IPC」保持）；renderer → window.api → ipc
 * - 依赖：node:fs/promises+node:crypto（零新 npm 依赖）；路径基=app.getPath
 *   （'userData'）（main 侧解析，renderer 永不持绝对路径）
 * - 工具侧（tools/ai-sensor）：companion.mjs 零 npm 依赖零出网保持
 *   （AI-05 红线延续）；心跳=status.json 原子重写（heartbeatAt=now 每步刷新）
 *
 * ── 生命周期层 ──
 * - 预留：kind 枚举扩展（v1 单值 'three-read'，ADR 字面）；D utilityProcess
 *   自含方案=P8+ 升级候选（「zcode 不在跑也要能读」成硬需求时再立项）
 * - 不做：应用 spawn 任何进程（INV-21——按钮/服务双面永不）；应用侧出网
 *   （INV-08 不动）；status.json 的 state 枚举契约化（工具自述自由文本）
 *
 * ── 文化层 ──
 * - 错误：协议 IO 失败上抛中文错误含路径（动作型，消费方 toast——INV-02）；
 *   禁静默吞错；status.json 损坏≠不存在（三态分离，禁 catch-all）
 * - 测试：tests/unit/services/ai-sensor.service.test.ts [受锁新增]——job 写入
 *   原子性/幂等（同篇重复）/readStatus 三态（missing→未运行、损坏→上抛、
 *   新鲜/过期两判）/freshness 阈值边界/hasPendingJob/productExists；状态机
 *   跨格序列 ①~⑤ 用例化（fs 夹具目录驱动）；companion.mjs 探针=CLI 行为
 *   测试（拾取→心跳→产物→移除 job 四步序，AI-05 门二探针法同型）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const AI_SENSOR_SERVICE_STUB = 'SR2-AI-06'
