// b3: P7-G
/**
 * [SR2-AI-07] ai-notes-import.service —— 回灌导入器（corpus-ai 产物 →
 * ai_notes 写入+读通道，工单：open / strong）
 *
 * ── 行为层 ──
 * - E2 回灌=文件导入器（ADR-0015 §2）：目录扫描（协议根 corpus-ai/——AI-06
 *   交付的产物区）→ 逐篇解析校验（zod）→ 经 ai_notes.repo 写 DB（**写入只经
 *   应用 IPC+repo，工具永不写 DB**——D3 语义保持）；导入后产物移 archive/
 *   （ADR §2 字面）
 * - **幂等=archive 账本机制**（ADR §2「幂等：已导入篇按内容 sha 去重跳过」+
 *   「导入后产物移 archive/」两条款的合力实现）：archive/<paperId>.json
 *   存在且 sha256==源文件 → 跳过（skipped）；存在但 sha 不同 → 清面重灌
 *   （deleteByPaper+整套重插——AI-01 幂等原语）；无 archive → 首次导入
 * - **账本前提登记（门一 W07-1 处置，两条机器事实）**：①paperId 不复用
 *   （导入服务以 randomUUID 生成不循环——import.service.ts 现实现）；②
 *   paper 删→CASCADE 清 ai_notes（003 迁移）后 archive 残留无害（扫描只看
 *   corpus-ai/ 活动区不读 archive）。前提破坏场景=未来引入 paperId 复用
 *   或「保 archive 清 DB」操作面——出现时任一即须重估账本机制（登记防
 *   后续改动踩断支撑链）
 * - 产物行格式（ADR §1 字面契约）：corpus-ai/<paperId>.json=行式锚定段数组，
 *   行={ role, question, model, quote_text, prefix_text, suffix_text,
 *   anchor_page, content_md }（snake_case 文件面）→ 映射 AiNoteInput
 *   （camelCase zod 面；annotationId=null——自持锚定三元组与 annotations
 *   零耦合，D3；id/createdAt/updatedAt 由 repo 生成）
 * - 校验面（接缝归责修正，门一 W07-2：与 ai-note.ts 头注契约原文对齐）：
 *   **role 枚举真相=迁移 003 DDL CHECK（zod 为镜像消费）**；question=DDL
 *   不加 CHECK（扩展性优先）、**zod=应用边界校验单源**；aiNoteInputSchema
 *   逐行校验（七问 v1 冻结不扩枚举）；paperId 幽灵拦截（不在 papers
 *   表→该篇失败，CLI 幽灵 ID 防御同型）；行级失败→该篇失败入 errors[]
 *   （部分成功语义——AI-03 errors[] 先例，AI-05 门二 N-新1 输入防御同族）
 * - **「v1 无生产者」声明解除时点=本单**（AI-01 头注 R4 预告）：实现时
 *   ai_notes.repo.ts 头注声明行随本单修订（生产者=本导入器）
 * - Result 形状：{ imported: string[]; skipped: string[]; errors:
 *   { paperId: string; reason: string }[] }（部分成功三桶——消费方 08 按钮
 *   toast 汇总呈现）
 *
 * ── 接口层 ──
 * - export interface AiNotesImportService {
 *     importAll(): { imported: string[]; skipped: string[]; errors: { paperId: string; reason: string }[] }
 *     listByPaper(paperId: string): AiNote[]          // 08 分节数据面（repo listByPaper 透传）
 *   }
 * - IPC 面：ai-notes/import + ai-notes/list 两通道（ADR §2 字面命名；
 *   **域归属=新立 ai_sensor 域**——2026-08-27 用户裁决（ADR-0017）：随本单
 *   [locked-change] 扩契约测试 9 域穷举，并把 06 两通道自 export_ 域迁入
 *   新域（消费者未建=最后便宜窗口）；schemas+api-surface 受锁面不变
 * - 交付面：ipc/ai_notes.ts（handler 域文件，薄分发——SR-IPC-* 同型）+
 *   services/index.ts 装配+ai_notes.repo.ts 头注声明行修订
 *
 * ── 架构层 ──
 * - 分层：ipc → services → repos → db（单向；service 持 repo+协议根路径，
 *   禁 service 直写 SQL）；fs 面仅协议根（corpus-ai 读+archive 移动，
 *   rename 保原子）
 * - 依赖：ai_notes.repo（insert/deleteByPaper/listByPaper）、
 *   shared/models/ai-note（zod 单源）、node:crypto（sha256 零依赖）
 *
 * ── 生命周期层 ──
 * - 预留：分篇选择性导入（v1 全量扫描——按钮面在 08 已含当前篇语义，目录
 *   级幂等使全量重跑无害）；FTS 入 ai_notes（P7-E 候选，维持 AI-01 不做）
 * - 不做：工具侧任何 DB 直写；divergence/七问枚举扩展（冻结 v1）；
 *   annotationId 回链（自持锚定=D3 彻底化，渲染重锚归 AI-09）
 *
 * ── 文化层 ──
 * - 错误：篇级失败入 errors[] 不中断整批（部分成功）；目录不存在→空结果+
 *   { imported:[], skipped:[], errors:[] }（首次无产物=合法态非错误）；
 *   文件损坏→该篇 error（中文 reason 含路径）；禁静默吞错
 * - 测试：tests/unit/services/ai-notes-import.test.ts [受锁新增]——幂等三
 *   路径（无 archive 首导/同 sha 跳过/异 sha 清面重插不重复条目）/行级 zod
 *   拒非法 role/question/幽灵 paperId 拦截/archive 移动后二跑全 skipped/
 *   Result 三桶形状；repo 交互以真库夹具（AI-01 测试同型）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const AI_NOTES_IMPORT_STUB = 'SR2-AI-07'
