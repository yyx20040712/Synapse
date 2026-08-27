# SR2-AI-07 门一对抗深审（gate1）

日期：2026-08-27　审查者：门一子代理（独立于实现者）　输入：ai07-diff.patch / 票面头注 / ai07-impl.report.md / 四份证据日志

## 开工技能清点
用：code-review-excellence（对抗审查本体）、verification-before-completion（证据逐项对日志核验）。
不用：test-driven-development（本单不写实现）、systematic-debugging（无卡点）、e2e/browser 类（纯 main 侧单测面）；其余技能与只读审计无测试面交集。

## A. 母本符合度（票面五层 vs 实现）

- **A1 幂等三路径** [N] ai-notes-import.service.ts:75-113（diff 行 296-336）：无 archive 首导（archivedText null→走导入）；同 sha→skipped 且源归档；异 sha→deleteByPaper+整套重插。三路径各有独立测试（test:625/646/659），"不重复"由 countByPaper 断言（test:655/679）。
- **A2 八字段 snake→camel 映射** [N] service parseRows（diff 行 265-276）：八字段逐一映射+annotationId:null，与票面 ADR §1 字面契约一致；首导测试断言映射结果（test:633-641）。
- **A3 role 枚举真相=003 CHECK+question zod 单源** [N] 依赖 shared/models/ai-note.ts:20-22（AI_NOTE_ROLES 镜像声明）与 :26-27（question 单源）；service 仅消费 aiNoteInputSchema（service 文件头接缝声明保留）。测试拒 third-read/Q9（test:672/683）。
- **A4 幽灵 paperId 拦截** [N] service paperExists 前置拦截（diff 行 311-314）；装配层接 repos.papers.findById（services/index.ts:410 diff 行）；测试 test:690。
- **A5 部分成功三桶** [N] importOne 逐篇返回，errors 落条目不中断（catch 兜底 diff 行 337-343）；三桶并存测试 test:710；Result 形状=schemas.ts aiNotesImportResSchema strict（diff 行 466-474），三处形状一致（service 接口/schema/票面）。
- **A6 archive 移动后二跑全 skipped** [N] test:646 为首导→重现同内容→二跑序列（跨格序列，非单格）；mutation 变异恰断此 3 用例佐证断言真实命中账本比较。
- **A7 目录不存在=空结果** [N] importAll isENOENT→返回空三桶（diff 行 351-353），test:620。
- **A8 repo 头注声明行修订** [N] ai_notes.repo.ts:63-69 diff——「无生产者声明解除」生产者=本导入器+消费者补 ai-notes/list，与票面「随本单修订」一致。
- **A9 协议根与 06 一致** [N] rootDir 注释声明同 ai-sensor.service（userData/ai-sensor），装配处两服务共用 deps.aiSensorRootDir（services/index.ts diff 行 406/408）——同根实证。
- **A10 域迁移（主控预裁 1）** [N] export_.ts 仅删两委托行（diff 行 81-84），语义原样迁至 ipc/ai_sensor.ts:12-13（requestAiRead 同步/aiStatus async 形态保持）；通道名四处一致（api-surface：ai-sensor/request-read、ai-sensor/status、ai-notes/import、ai-notes/list）。

## B. 宪法红线

- **B1 分层单向** [N] ipc/ai_sensor.ts 薄分发→services→repos；service 零 SQL（仅 repo.insert/deleteByPaper/listByPaper 调用）；测试文件直接用 db.prepare 属测试夹具惯例（AI-01 同型），非分层违规。
- **B2 SQL 拼接** [N] 全 diff 无 SQL 语句新增（service 面）。
- **B3 renderer/Node** [N] renderer/preload 零改动；grep register.ts/preload/index.ts 无 export_/ai_sensor 硬编码——动态机制（allChannels/ApiHandlers）零改动实证。
- **B4 ≤500 行** [N] service 226 / ipc 19 / test 193。
- **B5 TODO/placeholder** [N] grep 改动面零命中；AI_NOTES_IMPORT_STUB 全仓无引用（删净）。
- **B6 UTF-8** [N] diff 中文全部可读（本次读取实证）。
- **B7 受锁流程** [N] 受锁改动=shared/ipc×2+contracts 测试+ipc-deps.ts+新测试；manifest 113 条与 grep 计数一致，sha 已更新（diff 行 16-52）；verify 内 locks:check 过（exit=0）。[locked-change] 尾注属提交面，归主控收口单——非本门拦截面。
- **B8 ipc-deps.ts +1 行（主控预裁 2）** [N] 最小面成立：仅 `ai_sensor: null as never,` 一行，与相邻九域同型，无行为面。

## C. 代码与测试质量

- **C1 每测试能失败** [N] 红档 10 failed（ai07-red.log，exit=1）＝构造级全红；变异档恰断 3 用例（mutation.log：7 passed 3 failed）且中断言级目标（账本比较）——非恒真。
- **C2 断言真实行为** [N] 断言面含 DB 条目数（countByPaper）、fs 终态（namesIn('corpus-ai')/('archive')）、reason 含路径——非仅返回值。
- **C3 边缘面：损坏 JSON/非数组** [N] test:699 双覆盖（语法损坏+形态非数组），不中断整批有伴生篇断言。**空数组行** [W-轻] 合法篇产物 `[]` → imported 且零行落库（service 对空数组不设防也无测试）——语义上属合法（空产物=无段），风险极低，建议 08 消费侧注意 toast 空 imported 呈现。**sha 大小写** [N] 账本比较两侧均由同一 sha256Of 产出（hex 小写），无外部 sha 注入面，大小写议题在本设计下不可达。**rename 跨卷** [N] corpus-ai 与 archive 同属 rootDir 子目录，同卷恒成立。
- **C4 rm force+rename 非原子窗口** [W-轻] skipped/imported 路径均先 rm dest 再 rename（service diff 行 306-308/334-335）：窗口内崩溃→archive 副本丢但 corpus-ai 源仍在（skipped 路径源未删；rename 失败走 catch 落 errors，源仍在），下次导入可完整恢复——自裁申报 3 已如实申报且窗口经「同 sha 先判」最小化，不构成回炉项。
- **C5 zod strict 面** [N] aiNoteInputSchema=.omit().strict()（ai-note.ts:55-57）；parseRows 构造精确键集，多余字段/类型错均拒。
- **C6 测试 always-active** [N] 新测试顶层 it()，无 guardedDescribe（ADR-0017 裁决 3），头注声明激活方式。

## D. 报告诚实性

- **D1 自裁 1（ipc-deps +1 行）** [N] diff 行 499 属实，最小面。
- **D2 自裁 2（skipped 源一并归档）** [N] 实现 diff 行 305-309；测试断言活动区清空（test:656）——申报与实现/测试三方一致。
- **D3 自裁 3（失败篇不移 archive）** [N] failed 路径无 rename；测试断言产物留 corpus-ai（test:680）。
- **D4 自裁 4（.tmp 跳过）** [N] diff 行 357；`endsWith('.json')` 已排除 .json.tmp，第二分句为冗余显式声明——无害，已在申报中言明。
- **D5 自裁 5（无删减面）** [N] diff 全部删除行逐行核对：export_.ts 两委托行+两行注释（语义已迁 ai_sensor.ts）；manifest 旧 sha 行；service 旧头注/STUB 常量（票面要求删）。无测试/检查删减。STUB 引用全仓零命中。
- **D6 自裁 6（零触碰 register/preload/renderer）** [N] diff 无此三面文件；grep 无硬编码消费。
- **D7 数字一致** [N] 74 文件/462 用例：green.log 与 verify.log 双证；113=manifest 实数；红 10 failed/变异 3 failed 与日志逐字一致；报告「基线 73/452→+10」自洽（462-452=10=新测试用例数）。
- **D8 dist_new/ 残留申报** [N] 属实且未动——诚实，收口警示有效。

## E. 接缝与后续单

- **E1 api-surface 十域穷举自洽** [N] contract 测试 allChannels() 遍历（test:13/18/25）+SAMPLE handlers 增 ai_sensor 行（diff 行 487）；十域=原九域+ai_sensor，与 API_SURFACE 键集一致（ipc/index.ts 装配同十键）。typecheck 过（verify）=handlers 样例与 ApiHandlers 类型链闭合。
- **E2 对 08 影响** [N] 08 消费面 ai_sensor.importAll/listByPaper 已就位（schemas aiNotesImportResSchema strict 与 service Result 形状一致；listByPaper Res=z.array(aiNoteSchema) 与 repo 返回型一致）。
- **E3 AiNotesSection/ZcodeLinkSection 类型面** [N] 两组件为 AI-08 未开工的票面骨架（仅头注声明消费 ai-notes/* 通道），无运行时 window.api 调用代码——通道名未变+preload 动态生成→类型面与运行面均无感。ZcodeLinkSection 头注引 services/ai_sensor/zcode-link.service.ts 为未来文件，不受本单影响。

## 统计与总评

**0B / 2W（均轻微、已申报或风险极低）/ 其余 N。**

总评：**PASS**。票面五层逐条落地、四档红绿证真实（日志数字逐一对上）、宪法红线零触碰、自裁 6 项全部属实、域迁移最小面且通道名不变零破坏。两条 W（空数组产物无显式测试；rm+rename 非原子窗口）均为已申报/低风险观察项，可由 08 消费侧留意，不构成回炉。收口提示：报告 D8 的 dist_new/ 未跟踪残留——主控 staging 显式列文件。
