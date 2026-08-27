# SR2-AI-07 实现报告（ai-notes-import 回灌导入器 + ai_sensor 域迁移）

日期：2026-08-27　实现者：SR2-AI-07 实现者子代理（三屋模式）

## 开工技能清点
用：test-driven-development（四档红绿证）、verification-before-completion（verify 真退出码落盘）。
不用：systematic-debugging（无卡点调试发生）、subagent-driven-development/e2e 类（本单纯 main 侧单测面，无浏览器/收口职责——收口归主控）；其余工程技能与票面无测试面交集，不加载。

## 实现摘要
- 回灌导入器 `createAiNotesImportService`：扫描协议根 corpus-ai/ → 逐篇
  sha256×archive 账本幂等三路径（无 archive 首导 / 同 sha skipped / 异 sha
  deleteByPaper 清面重插）→ aiNoteInputSchema 逐行校验（snake→camel 映射，
  annotationId=null）→ 经 repo 写 DB → fs.rename 移 archive（Windows rename
  不覆盖已存在目标，先 rm force 再 rename）。
- 域迁移（主控裁决 1）：新立 `ai_sensor` 域四通道（ai-sensor/request-read、
  ai-sensor/status 自 export_ 迁入 + ai-notes/import、ai-notes/list 新增）；
  ServiceBundle 拆并（export_ 剥离 AiSensorService，ai_sensor = AiSensorService
  & AiNotesImportService）；register/preload/renderer 零改动（grep 证实无
  `export_.requestAiRead` 消费面；preload 按接线表动态生成，AI-08/09 未开工无渲染消费方）。
- ai_notes.repo.ts 头注「v1 无生产者」声明行修订（生产者=本导入器）。

## 文件清单（全部）
改：src/shared/ipc/api-surface.ts、src/shared/ipc/schemas.ts（受锁）、
src/main/ipc/export_.ts（删两委托行）、src/main/ipc/index.ts（+1 域接线）、
src/main/services/index.ts（装配）、src/main/db/repos/ai_notes.repo.ts（头注）、
tests/contracts/api-surface.test.ts（十域穷举行，受锁）、
tests/utils/ipc-deps.ts（受锁，见自裁）、locks/manifest.json（113）。
新增：src/main/ipc/ai_sensor.ts（19 行四通道薄分发）、
tests/unit/services/ai-notes-import.test.ts（193 行，受锁新增）。
行数上限合规：服务 226/ipc 19/测试 193 ≤500。

## 红证（四档，命令与退出码）
1. 红：`npm run test -- tests/unit/services/ai-notes-import.test.ts > scripts/audits/ai07-red.log` →
   10 failed（构造级：STUB 未导出工厂）exit=1。
2. 绿：`npm run test > scripts/audits/ai07-green.log` → 74 文件 462 用例全过 exit=0。
3. 变异红证：单 token `sha256Of(archivedText) === sha256Of(text)` → `!==`
   （cp 备份法：cp→sed 变异→测→cp 还原→diff 空 RESTORED-OK）→ 恰中断言级
   3 用例（同 sha 跳过/三桶并存/移动后二跑序列）7 passed 3 failed exit=1，
   日志 scripts/audits/ai07-mutation.log。
4. 全量：`npm run verify > scripts/audits/ai07-verify.log; echo exit=$?` →
   quality/tickets/locks/lint/typecheck/test/build 全过，**74 文件 462 用例，
   exit=0**（基线 73/452 → 用例 +10，含新测试 10 用例）。

## locks 实录
`npm run locks:unlock`（112 解锁）→ 批内改 shared/ipc×2 + contracts 测试 →
新测试落盘 → `npm run locks:generate`（113 条）→ `npm run locks:apply`
（113 锁定）→ 中途发现 tests/utils/ipc-deps.ts 需补桩行 → 二次 unlock→改→
apply → 终局 verify 内 locks:check 通过（113 与 manifest 一致）。净变化 112→113。

## 自裁申报（一切超票面决定）
1. **tests/utils/ipc-deps.ts +1 行**（票面改动面未列）：ServiceBundle 新增
   ai_sensor 后，该受锁桩工厂的 Partial 展开使 ai_sensor 类型变可选，
   typecheck 红——补 `ai_sensor: null as never,` 桩行（与其余九域同型，零行为面）。
2. **skipped 路径源文件一并移 archive**：票面只说「跳过」；不移则同 sha 产物
   永留活动区、每次全量重跑重复入 skipped 桶——按「活动区清空」语义归档
   （archive 内容相同，覆盖无害）。
3. **失败篇产物留在 corpus-ai 不移 archive**：移走即永久掩盖损坏面；留置使
   下次导入可重试（测试断言不移）。rm force+rename 取代纯 rename：Windows
   fs.rename 对已存在目标抛 EPERM，非原子窗口已用「同 sha 短路先判」最小化。
4. **扫描跳过 .tmp 残留**（AI-06 原子写中间物）：`endsWith('.json')` 且非
   `.json.tmp`（rename 语义上 .tmp 不以 .json 结尾，守卫为显式声明）。
5. **无删减面**：除 STUB 常量 AI_NOTES_IMPORT_STUB 按票面删除外，diff 自查
   无删减测试/检查；新增文件全部被引用（ai_sensor.ts 经 ipc/index.ts，
   测试经 vitest 收集）。
6. 未触碰 register.ts/preload/renderer（grep 证实零硬编码消费面，票面预期成立）。

## 疑虑
- 工作树存在**非本单**未跟踪残留 `dist_new/`（含 win-unpacked，疑为先前构建
  产物；.gitignore 只列 dist/）——未动，提请主控收口时注意 staging 显式列文件。
