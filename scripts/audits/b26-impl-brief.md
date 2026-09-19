# F-EXPORT-01 实现者六段简报（batch 26）

工作区根：E:\class\智慧水务\Synapse_remake（相对路径以此为基）。
票：F-EXPORT-01（registry:314）——corpus.export 拆件，owner strong，中票。
派发档位：ops-executor 绑定（GLM5.3flash $max）。

## ① 目标与边界

corpus.export.service.ts（442 行，wc 实测 443 行无尾换行口径）现为「状态机+IO+事件」
混装单件。本票拆件（用户裁决提前主动拆——裁决书 docs/design/2026-09-18_complexity-
governance-ruling.md 裁决 6/§3 梯队四）：

1. **状态机六态外提**：export-session-state.ts（骨架已立 14 行）改写真身——
   六态 idle/preparing/streaming/finalizing/done/failed 显式化+会话对象管理外提。
2. **IO/事件协议分离**：盘面 IO（cleanRebuild/落盘/sha/manifest 终写）外提独立件；
   事件协议（progress/extract-request 组包）留编排件——事件不碰盘、盘面不发事件。
3. **export_ 桶键拆分（b25 明示承接项）**：services/index.ts `export_` 交并拼盘
   （ExportService & CorpusExportService 双 spread）拆两键平铺——b25 ai_sensor
   三键平铺同型先例（batch 25，git log 5d85ffef6d 可鉴）。

**行为等价红线**（违者即返工）：
- INV-17 幂等 sha（corpus md front-matter 无 exportedAt/contentSha/fulltextSha=
  文件字节 sha256/产物文件逐字节稳定）语义不破；
- INV-18 会话协议（manifest 终局单写 tmp+rename/清空重建/EXPORT_BUSY 单飞/
  **deferOutcome 串行不死锁时序补条**——setImmediate 延后篇终局推进）语义不破；
- INV-65 中止单源（abortActiveSession→failSession 同型处置+**同步**释放单飞锁+
  advance 终局守卫按会话对象身份拦截）语义不破；
- e2e corpus-export 全链不破（主控收口跑，实现者不跑 e2e）。

## ② 设计定稿（主控预裁——签名微调可自裁申报，结构不可变）

**件 1：src/main/services/export_/export-session-state.ts（骨架→真身）**
- `export type ExportSessionPhase = 'idle' | 'preparing' | 'streaming' | 'finalizing' | 'done' | 'failed'`
- `export interface ActiveSession {...}`——字段零改从 service 外提（sessionId/dir/
  queue/current/papers/errors/done/total/resolve/reject）
- `export function createExportSessionState()`：闭包持会话引用（现 service 闭包
  `let session: ActiveSession | null` 外提单源）：
  - `begin(s): void` 置引用（idle→preparing 起会话）
  - `current(): ActiveSession | null`
  - `isActive(s): boolean` 身份守卫——现 advance/failSession 两处 `if (session !== s) return`
    单源化（注释随迁：悬挂推进拦截语义）
  - `markTerminal(s): void` 终局标记=同步置 null（INV-65「终局标记先于异步清理/
    同步释放单飞锁」承重——注释随迁）
- `export function deferOutcome(run: () => Promise<void>): void`——setImmediate
  时序协议（INV-18 补条，现 service :312-318 注释整段随迁）
- 头注承接态空间迁移表全表（现 service 头注 :6-56 迁移表+跨格序列八行——母本
  随迁本件；标注 [F-EXPORT-01] 状态机外提+INV-17/18/65 锚定指针）

**件 2：src/main/services/export_/corpus.export.io.ts（新件）**
盘面 IO 纯函数群（无状态/无事件/零 sendEvent）：
- `export const MANIFEST_TMP = 'manifest.tmp.json'`（外提单源）
- `cleanRebuild(dir)`：删 manifest+tmp+清空重建三子目录+写 INTERFACE.md
- `writeCorpusMd(dir, paperId, md)`
- `writeFulltext(dir, paperId, text): Promise<string>`（终写+返回 sha256）
- `readCorpusSha(dir, paperId): Promise<string>`（重读 corpus md 字节 sha）
- `writeFigure(dir, paperId, name, buf)`（含 figDir mkdir）
- `finalizeManifest(dir, manifest)`（writeFile tmp+rename 原子替换——R5/R8 终局单写）
- `removeManifestTmp(dir)`（failSession 清理——force+catch 语义随迁）
- 头注：[F-EXPORT-01] IO 外提+INV-17 幂等范围句+R5/R8 锚定

**件 3：corpus.export.service.ts 瘦身编排件**
- `createCorpusExportService(deps: CorpusExportDeps): CorpusExportService` 工厂签名
  零改；CorpusExportDeps/CorpusExportService 公开接口零改（repos/fileStore/sendEvent/
  now 注入面原样）——**tests/unit/services/corpus.export.test.ts（519 行 14 用例，
  受锁）零触碰即绿的等价锁**
- 内部：`const state = createExportSessionState()` 替代闭包 session 变量；
  IO 调用迁 io 件；sendProgress/extract-request 组包留本件（事件出口单点
  deps.sendEvent）
- 头注瘦身：态空间表移件 1 后留指针（「态空间母本=export-session-state.ts」+
  装配单源 R12/通道判定/INTERFACE.md 段落保留本件——编排面关注点）
- 方案切换=删除旧方案：状态机逻辑在 service 内零残留副本

**件 4-6：桶键拆分（对号迁移，恰四处消费面+一处类型+一处装配）**
- services/index.ts：ServiceBundle `export_: ExportService & CorpusExportService` →
  `export_: ExportService` + `corpus_export: CorpusExportService` 两键（注释 b25
  :85-86 同型一句：F-EXPORT-01 桶键平铺，键名与服务件一一对齐；IPC 域归属/通道名
  不动=ADR-0017 裁决保持）；装配段 :113-120 双 spread 消解——局部量先行恰一构
  +直传（b25 :95 aiSensor 同型）
- src/main/ipc/export_.ts：恰 2 handler 迁键——corpusItem(:86)/corpusSession(:88-99)
  `deps.services.export_.X` → `deps.services.corpus_export.X`；其余 6 handler
  （bibtex/csv/clipboard/report/corpus/corpusSet）export_ 键不动
- src/main/bootstrap.ts :238/:241：`container.services.export_.abortActiveSession`
  两处 → `container.services.corpus_export.abortActiveSession`
- tests/utils/ipc-deps.ts :28：`export_: null as never,` 单行拆两行
  （+`corpus_export: null as never,`）
- **零触碰面**：shared/ipc/schemas+api-surface（IPC 契约）、ipc/index.ts 装配行
  （`export_: createExportIpc(deps)` 不动）、ipc/export_.ts 其余 6 handler、
  preload/renderer、e2e specs、corpus.assemble/interface-template/export.service

## ③ 受锁面（预列清单——超出预列先停报告）

- tests/utils/ipc-deps.ts 1 行拆 2 行——`npm run locks:unlock` → 改 → **即时**
  `npm run locks:generate && npm run locks:apply` 单链（b25 同款）
- 其余全部非锁（services/ipc/bootstrap/export_ 域 src 面）
- 新增件（corpus.export.io.ts+export-session-state.ts 真身化）非锁面（src/services
  不在锁 walk 集合——但**自产任何 scripts/*.mjs 探针写完即时 generate+apply**）
- 禁改：corpus.export.test.ts 及一切 tests/**（除上述 ipc-deps.ts 预列单点）；
  shared/**；migrations；CI/lint/构建配置

## ④ TDD 义务（六段红绿闭环）

- 基线锚主控已在档：b26-verify-baseline.log EXIT=0（170 文件/1744 用例/指纹门
  187·1789·5411·skip15/open 5/locks 378）
- 实现后定向回归（vitest 定向，不跑全量）：tests/unit/services/corpus.export.test.ts
  全 14 用例绿+tests/unit/ipc/export_.test.ts 绿；再 `npm run verify` 全绿
  （tickets 红行=F-EXPORT-01 仍 open 预期态，收口主控翻票后自清）
- **变异红证 M1（状态机守卫）**：件 1 isActive 在 advance 消费处临时改永真
  （`isActive: () => true` 或删守卫）→ 定向 corpus.export.test「advance 守卫竞态窗/
  streaming-abort」用例必红（abort 后悬挂推进误终写 manifest——INV-65 承重面）
  → cp 备份法还原（**禁 git checkout——未提交面会被抹掉**）→ diff 确认空 → 复绿；
  红证 log 落 scripts/audits/b26-mutation1.log
- **变异红证 M2（桶键迁移）**：ipc/export_.ts corpusItem 行临时回退
  （corpus_export→export_）→ `npx tsc --noEmit`（或 npm run typecheck）TS2339 红
  （ServiceBundle.export_ 上已无 corpusItem——交并已拆）→ 还原 diff 空 → 复绿；
  log 落 b26-mutation2.log
- 每个变异先红再还原后绿，退出码变量法物理在档（echo $? 落 log）

## ⑤ 禁令与纪律

- 禁 git 任何写操作（add/commit/checkout）与 registry 翻票——主控收口职责
- 禁引入新依赖；禁 eval/字符串拼接 SQL 等安全禁令全数适用
- 文件 ≤500 行红线；拆件后各件目标：state ~150/io ~120/service ≤300
- 中文注释 UTF-8（Write 工具写文件，禁 heredoc——shell 隔层四坑）
- 计数落笔前实测（wc/grep 机器输出，禁凭印象）
- 中间态探针（若需）一律 Write 文件后 node 跑+写前 lint 自查+写毕即时入锁

## ⑥ 交付物

1. 三件源码（state 真身/io 新件/service 瘦身）+桶键四处迁移
2. scripts/audits/b26-impl-report.md：改动清单（逐件±行数 wc 实测）/定向回归
   输出/变异红证 M1M2 全过程（含退出码）/verify 终态/**超票面自裁逐条申报**
   （签名微调/函数切分裁量/注释去向等）
3. 完成定义：npm run verify 全绿（tickets 红=F-EXPORT-01 open 预期态除外）+
   两变异红证在档+报告完整
