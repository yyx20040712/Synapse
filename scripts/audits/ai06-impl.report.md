# SR2-AI-06 伴随进程文件协议 —— 实现者报告（三屋模式试点单元）

- 日期：2026-08-27
- 角色：实现者子代理（主控派单；registry 翻状态与 git 收口归主控）
- 状态：DONE_WITH_CONCERNS（工程面全绿；含一项需主控知悉的测试激活方式自裁与两项留审计事项，见 §6/§7）

## 0. 开工记录：技能清点（宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | **用** | 票面纪律点名 TDD：先红后绿，红证见 §3 |
| verification-before-completion | **用** | 终局 verify 真退出码落盘要求（管道吞码对策已执行） |
| systematic-debugging | 备用未触发 | 全程仅一次预期内 typecheck 修正（Error.code 收窄），无缺陷战役 |
| javascript-testing-patterns | 不用 | 仓内 vitest 形态以 queue.test.ts / corpus.export.test.ts 先例为单一参照（票面要求沿仓内形态），外引模式徒增噪声 |
| subagent-driven-development | 不用 | 本单元即实现者子代理最底层，无再派发面 |
| nodejs-backend-patterns | 不用 | 服务形状由票面五层规约+queue.mjs/corpus.export.service.ts 先例完全约束 |
| code-review-excellence / requesting-code-review | 不用 | 审计归三层模式独立审计者角色，非实现者职责 |
| git-advanced-workflows / git-workflow-and-versioning | 不用 | 本单元禁 git 写操作（主控收口） |
| e2e/browser 类技能 | 不用 | AI-06 无 UI/渲染面（renderer 面仅类型推导零改动） |
| 其余领域技能（安全/可观测/数据质量等） | 不用 | 与本地 fs 协议单元无任务相关面 |

配置自查：本代理=GLM-5.3（builtin:bigmodel-coding-plan）；无再派发子代理。

## 1. 实现摘要

应用侧 `createAiSensorService`（协议根注入，五方法：requestRead 幂等写 job /
readStatus 三态+新鲜度单源判定 / hasPendingJob / productExists / archivedExists，
全部 tmp+rename 原子写、首写 mkdir recursive 幂等、损坏≠不存在三态分离上抛）；
工具侧 `companion.mjs`（queue 之上的会话壳：拾取→心跳→产物规范化落盘→移除
job 四步序，每步刷 status.json 心跳；**INV-26 红线：移除 job 以产物落盘成功
为前提**，任何失败路径 job 保留）；IPC 两通道 `ai-sensor/request-read`+
`ai-sensor/status` 经既有 export_ 域接线（委托行+ServiceBundle 交并——AI-02
corpusItem 同型先例）；SKILL.md 工作循环整体改写为 companion 模式+协议目录
平台惯例路径表；INV-26 登记入册。

## 2. 改动文件清单（逐文件一行职责）

| 文件 | 新/改 | 锁 | 职责 |
| --- | --- | --- | --- |
| src/main/services/ai_sensor/ai-sensor.service.ts | 改（STUB→实现，318 行） | 否 | 应用侧协议服务：job 幂等原子写/readStatus 三态/HEARTBEAT_FRESH_MS=10min 新鲜度单源/三判定；头注五层规约原样保留 |
| tools/ai-sensor/companion.mjs | 新（348 行） | 否 | 工具侧会话壳：拾取（requestedAt 升序+manifest 交集）/--beat/--deliver（校验→原子写→移除 job→markDone→刷心跳）；零 npm 依赖零出网 |
| tools/ai-sensor/companion.d.mts | 新（77 行） | 否 | companion.mjs TS 消费面（票面「queue.d.mts 增」的技术修正，见自裁#3） |
| tools/ai-sensor/queue.d.mts | 改（+3 行头注） | 否 | 指针注释：companion 类型面=邻接 companion.d.mts |
| tools/ai-sensor/SKILL.md | 改（工作循环+红线） | 否 | companion 模式工作循环（四步序+草稿行形状 8 字段）+协议目录平台路径表（%APPDATA% 等，B10-1 联动）+INV-26 红线 |
| src/shared/ipc/schemas.ts | 改（+22 行） | **是** | aiReadJobResSchema+sensorStatusSchema（SensorStatus 单源类型）+aiSensorStatusResSchema（.nullable()） |
| src/shared/ipc/api-surface.ts | 改（+6 行） | **是** | export_ 域 += requestAiRead（ai-sensor/request-read）/ aiStatus（ai-sensor/status） |
| src/main/services/index.ts | 改（+12 行） | 否 | ServiceDeps.aiSensorRootDir 注入；ServiceBundle.export_ 交并 AiSensorService |
| src/main/bootstrap.ts | 改（+3 行） | 否 | 装配层解析 join(userData, AI_SENSOR_DIR_NAME) 注入（app.getPath 不入 service 保可测） |
| src/main/ipc/export_.ts | 改（+5 行） | 否 | 两通道委托行（corpusItem 同型；错误上抛由 register 折叠） |
| docs/invariants.md | 改（+1 行） | 否 | INV-26 登记（三联：移除前提/判活单源/原子写）——宪法「不登记=未完成」 |
| tests/unit/services/ai-sensor.service.test.ts | 新（327 行，12 用例） | **是（generate 纳管）** | job 首写原子性/幂等⑤/readStatus 三态/形态损坏/新鲜度含边界/pending 扫描/双区判定/safeId/跨格序列①~④ |
| tests/unit/tools/companion.test.ts | 新（276 行，8 用例） | **是（generate 纳管）** | CLI 探针四步序全链/INV-26 三失败路径 job 保留/空转/不在 manifest/无 manifest/全库流交付+幂等覆盖/normalizeSegments 纯函数面 |
| locks/manifest.json | 改（110→112） | — | generate 纳管两新测试后 apply 重锁 |

零改动申明：ipc/register.ts（动态按 allChannels 注册，新通道自动接线）、
preload/index.ts（buildApi 动态枚举 API_SURFACE）、renderer/api/client.ts
（`window.api` 类型经 PreloadApi 自动延展）——票面交付面所列三处的「延展」
由既有机制自动覆盖，无需一行改动（留审计确认）。

## 3. TDD 红证摘要（scripts/audits/ai06-red.log，exit=1）

- 先写两份测试、零实现（service 仍是 stub、companion.mjs 不存在）跑
  `npm run test -- <两文件>`：
  - ai-sensor.service.test.ts：**12/12 红**，错误形态 `TypeError:
    createAiSensorService is not a function`（stub 模块缺导出，harness 构造即炸）
  - companion.test.ts：**套件收集失败**，错误形态 `Failed to load url
    ../../../tools/ai-sensor/companion.mjs … Does the file exist?`（模块不存在）
- 每条用例都真失败过（非恒真）；实现后同两文件 20/20 绿（scripts/audits/ai06-green.log，exit=0）。

## 4. 测试证据

- `npm run test`（终局 verify 内含，sqlite-abi 前置经 npm script 走）：
  **Test Files 73 passed (73)，Tests 452 passed (452)**——基线 71 文件/432 用例
  → +2 文件/+20 用例（12 service+8 companion），与预期「71→72+」一致。
- `npm run verify` 真退出码落盘（scripts/audits/ai06-verify.log，含
  `echo "exit=$?" >> 同一文件`）：**exit=0**。关卡逐面：quality 通过（无占位
  标记/无乱码/无跨域引用）/ tickets 通过 / locks 通过（112 一致）/ lint /
  typecheck / test / build 三段全绿。
- e2e 未跑：本单元无渲染面、playwright specs 零改动（基线 e2e 13/13 的面
  不受影响）；如审计需要可补跑 `npm run test:e2e`。
- CLI 可演示性（主控裁决#2）：四步序即三条命令——
  `node tools/ai-sensor/companion.mjs <语料> <协议>`（拾取+心跳）→
  `… --beat <状态> [角色]`（心跳）→ `… --deliver <paperId> <草稿.json...>`
  （产物落盘+移除 job）；探针测试逐命令真子进程验证。

## 5. locks 操作实录（周期最短化：一次 unlock 批内改完）

1. 红证跑完后（测试文件当时未纳管，不涉锁）`npm run locks:unlock` →「已解锁
   112 个文件」（112=旧 110+生成器预扫入两新测试路径）。
2. 批内完成全部受锁编辑（schemas.ts/api-surface.ts）与全部非受锁实现。
3. `npm run locks:generate`（GenerateOnly，manifest 112 条）→ `npm run
   locks:apply`（已锁定 112 个文件，只读恢复）。
4. 终局 verify 含 locks:check：112 一致通过。
   提交时 schemas.ts/api-surface.ts/locks/manifest.json/两新测试路径变更需
   **[locked-change] 尾注**（主控收口时落）。

## 6. 自裁申报清单（一切超出票面条文的工程决定）

1. **通道域归属=既有 export_ 域（通道名照票面字面 ai-sensor/\*）**。新域键
   `ai_sensor` 会使受锁 tests/contracts/api-surface.test.ts 的 ApiHandlers
   穷举字面量（9 域硬编码）typecheck 红——改该测试超出主控授权受锁面
   （schemas+api-surface+新测试路径）且触宪法「不得自行修改测试让代码通过」；
   而 notes 域会迫使改 done 工单文件 notes.service.ts 的返回契约
   （`ApiHandlers['notes']` 硬标注）。export_ 域=ADR-0015 AI 语料管线家族，
   且有 AI-02 corpusItem 完全同型先例（域内加通道+ipc 委托行+ServiceBundle
   交并，done 服务契约零涟漪）。副作用：renderer 侧调用面=
   `window.api.export_.requestAiRead/aiStatus`（AI-08 接线时知悉）。
2. **新测试不经 guardedDescribe 直接激活**（头注已声明）。主控禁翻 registry+
   要求 TDD 红绿证+终局 verify 计数——guard 包裹会使整组 skip，三者皆不可
   得；实现与测试同批交付，K3 防作弊面（不实现就翻状态）不适用本形态。主控
   翻状态后如需收回 guard 包裹=每文件一行 describe→guardedDescribe 替换。
3. **companion 类型面=新文件 companion.d.mts**（票面字面「queue.d.mts 增
   companion 类型面」技术不可行：TS 邻接声明按模块名解析，queue.d.mts 只
   服务 queue.mjs 导入；已在 queue.d.mts 头注留指针）。
4. 子命令形态：无 flag=拾取 / `--beat [状态自述] [角色]`（可选更新 state/
   role，未给字段保留）/ `--deliver <paperId> <草稿.json...>`。
5. markDone 的 outputs 记产物**绝对路径**（历史语义=语料目录相对路径；产物
   现落协议根非语料目录，绝对路径免歧义——progress.json 为工具私有信息态）。
6. deliver 不要求存在 pending job（queue 驱动全库三读流复用同一交付面）；
   job 移除按 paperId 匹配全清；重交付=产物覆盖（幂等）。
7. 零段草稿/空白 content_md 段/model 空串拒绝交付（零信息产物拒绝——queue
   N3c「零 outputs 拒绝」同型）；行形状 8 字段全必填、未知字段拒绝（严格形，
   早早拦 malformed 草稿）。
8. 协议根目录名常量 `AI_SENSOR_DIR_NAME='ai-sensor'` 落 service 文件导出
   （constants.ts 受锁且不在授权面）；rootDir 语义=协议根本身（装配层已 join）。
9. HEARTBEAT_FRESH_MS=10min 落 service 导出常量；companion 不判新鲜度（判活
   单源在应用侧，工具只刷心跳）。
10. paperId 安全字符守卫 `[A-Za-z0-9_-]+`（C-02 safeId 同型纵深防御，防
    renderer 载荷走私路径片段）双侧落点（service+companion CLI）；真实库 id
    =randomUUID 不受影响。
11. readStatus 对 heartbeatAt 不可解析日期=损坏态上抛（三态分离收窄）；
    requestRead/hasPendingJob 扫描遇损坏 job 文件=上抛（应用侧禁静默）；工具
    侧拾取扫描遇损坏 job=stderr 报告不阻塞其余 job（两侧策略差异：应用侧要
    求可见失败，工具侧要求循环可用性——job 均保留，处置归人）。
12. docs/invariants.md 新增 INV-26（宪法「跨模块不变量不登记=未完成」——
    移除前提/判活单源/原子写三联入册，单测+探针级已锚定）。
13. SKILL.md 旧「corpus-ai/<paperId>/ 分角色 md」工作流整体删除（票面「裁准
    形态=行式 JSON」+「SKILL.md 随本单实现更新」），queue.mjs --done 手工流
    由 companion --deliver 取代（queue.mjs 本体零改动，全库队列枚举面保留）。
    **回炉 1 补正（W ai06-13 如实申报）**：本条删除范围当时**误含 synthesize
    库级收尾步骤**（prompts/synthesize.md 成孤儿）——属漏报删减错误，已按
    主控裁决回滚：synthesize 步骤恢复入工作循环第 5 步（companion 四步序
    之后、队列打空触发、指向 prompts/synthesize.md，库级产物非逐篇流）；
    prompts/synthesize.md 保留（AI-05 交付资产，不删）。详见 §8。

## 7. 疑虑与留审计事项

1. **[需主控知悉]** 自裁#1/#2 是本单两项结构性决定（域归属+测试激活方式），
   均有先例/机制依据但超出票面字面，建议 plan 门/审计者专项复核；若不认可，
   回退路径分别是：新域键（需 [locked-change] 改契约测试穷举字面量）/guard
   包裹（需主控翻状态后由审计者替换，测试断言面零改动）。
2. AI-07（ai-notes/import+list 通道）将复现同款域归属问题（import_ 域的
   ipc/import_.ts 返回 `ApiHandlers['import_']` 硬标注——加通道需改该 done
   文件字面量，或循本单 export_ 交并先例归并域）；建议主控在 AI-07 开单前
   预裁决域归属口径，避免每单一议。
3. status.json 由应用只读、工具独写——当前无共享写冲突面；但应用侧
   readStatus 在工具原子写 rename 瞬间理论上可读到旧整文件（rename 原子性
   保证不会读到半个文件），观测面安全，无需加锁。
4. companion --deliver 的 markDone 在「job 已移除+产物已落」之后执行：若
   progress.json 损坏，deliver exit 1 但 app 侧观测已是 done——queue 进度
   停留在旧态，全库流可能重读该篇（幂等覆盖，无害）；已在实现头注声明该顺序
   （INV-26 只约束 job 与产物的相对序，不约束 markDone）。
5. locks/manifest.json 存在工作区 CRLF（PowerShell 生成器行为，locks:check
   按工作区字节对账通过；.gitattributes 提交时归一 LF——与既往 110 基线同
   机制，无新风险）。

## 8. 回炉 1 处置记录（门一审计三项 W，2026-08-27，全按主控裁决执行）

1. **W ai06-6（接缝互斥：outputs 路径基声明）——已处置**。queue.mjs 两处
   注释（头注 progress.json schema 行 + markDone 文档注释）改为裁决文本
   「outputs=信息态记录，路径基不约定（companion 交付落协议根绝对路径；
   queue CLI 手工流历史相对路径同容）」；**运行时零变化**（CLI usage 输出串
   未动，属 queue 手工流自述面）。涉及文件：tools/ai-sensor/queue.mjs（不受锁）。
2. **W ai06-9（红证形态+EOF）——已处置**。
   (a) tests/unit/services/ai-sensor.service.test.ts 文件末补换行（xxd 复核
   末字节 `7d 29 0a`＝`})\n`）；该文件受锁——unlock→补→apply 批内完成，
   manifest 重哈希（仍 112 条）。
   (b) 断言变异红证（文件备份法，禁 git checkout 合规）：cp 备份 service
   实现→单 token 变异 `<= HEARTBEAT_FRESH_MS` → `<`（新鲜度含边界判定）
   →`npm run test -- tests/unit/services/ai-sensor.service.test.ts`：**恰
   「freshness 阈值边界：heartbeatAt=now-10min→running true（含边界）」
   1 用例红（1 failed | 11 passed），exit=1**（日志
   scripts/audits/ai06-mutation.log）→cp 还原→diff 确认空→备份删除
   （bash rm 挂起系已知 Windows 环境事实，PowerShell Remove-Item 清除）。
   该红证证明边界断言（<= 含边界语义）真实可失败，非恒真。
3. **W ai06-13（漏报删减：synthesize 步骤）——已回滚**。SKILL.md 工作循环
   恢复 synthesize 库级收尾步骤（第 5 步：队列打空触发、四类核心贡献枚举+
   时间线、指向 prompts/synthesize.md、库级产物非逐篇流不经 --deliver）；
   §6 自裁#13 已补如实申报（见上）。prompts/synthesize.md 未删。
4. **终局证据（追加于 scripts/audits/ai06-verify.log 尾部）**：两测试文件
   复跑 `Test Files 2 passed (2)`／`Tests 20 passed (20)`，`rework1-two-files
   exit=0`；`npm run verify` 全量 `Test Files 73 passed (73)`／`Tests 452
   passed (452)`（quality/tickets/locks 112/lint/typecheck/build 全过），
   `exit=0`（echo exit=$? >> 同一文件）。
