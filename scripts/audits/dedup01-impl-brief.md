# F-DEDUP-01 实现者任务书（六段简报）

## ① 身份与禁令

你是实现者子代理（ops-executor，GLM5.3flash max 档），领单 F-DEDUP-01（服务层
偶然复杂度收敛+微扩，[locked-change] 常规三屋票）。禁令：

- **禁 git add/commit/push**（控制面单写者=主控；你只改工作区文件）。
- **禁翻 tickets/registry.ts 状态**；禁触碰 tickets/** 任何文件（取证也不许）。
- **禁锁操作**（locks:unlock/generate/apply 均主控收口职责）——你创建的新文件
  在 tests/** 与 src/shared/** 落盘后 locks:check 必红「未登记」，这是**预期红**
  （见④段处置法），不是你的卡点。
- **禁修改任何既有测试文件**（tests/** 受锁 CI sha256；发现测试本身有错→停下
  报告，走 [locked-change]，不得自行改测试让代码通过）。
- **禁修改 src/shared/ 既有文件**（constants.ts/app-error.ts 等全受锁；本票
  src/shared 面只允许**新建** app-file-url.ts 一个文件）。
- 禁新依赖；卡住=BLOCKED 停手报告，不自裁制度面。

## ② 必读序（逐文件读，看完再动手）

1. `AGENTS.md` —— 宪法（代码组织/安全禁令/测试纪律/完成定义）。
2. 票面（registry id=F-DEDUP-01 行，`tickets/registry.ts:279`）——五层规约等价物
   （file 锚=src/main/services/library.service.ts；票面即完整任务书）。
3. `docs/handoff/relay.md` 执行路由段——三屋纪律与本案微扩口径。
4. 先例池（逐文件看）：
   - `src/main/services/library.service.ts:36-52`——DomainError 导出形态（基类签名以此为准）；
   - `src/main/http/http-client.ts:23-33`——HttpFetchError（多 status 字段的子类先例）；
   - `src/main/services/import_/file-store.ts:140-160`——原子写最富形态（bytes+uniqueTmp+cleanOnFail+错误包装留在调用侧）；
   - `src/main/services/export_/corpus.export.service.ts:405-420`——safeName（路径穿越防御注释口径）；
   - `tests/unit/services/file-store.test.ts`——受锁测试对 FileStoreError 的 instanceof/导出消费形态（迁移必须保真）；
   - `src/shared/app-error.ts`——toAppError 鸭子类型折叠（按 code 字段，不按类名）。
5. 现状普查结论（主控已实测，你复核后可直接采用）：
   - DomainError 同构类定义 15 文件：services 11（notes/tags/reader/library/
     file-store/import/enrich/export/corpus.export[SessionError]/lineage/workspace）
     +ipc 3（lineage/system/export_）+http 1（HttpFetchError 多 status 字段）。
   - 原子写 helper 重复 4 处：file-store（copyOrWrite）/ai-sensor.service（writeAtomic）/
     workspace.fs（atomicWrite）/ipc/settings.ts（atomicWrite）。
   - 路径段清洗同型 2 处：export.service.ts:210（safeId）/corpus.export.service.ts:411（safeName），
     同正则 `/[^a-zA-Z0-9_-]/g → '_'`。
   - app-file:// URL 拼装 3 处：papers.repo.ts:251（用 APP_FILE_SCHEME）/
     app-file.protocol.ts:21（prefix 解析）/corpus.export.service.ts:250（**硬编码字面量——微扩主目标**）。

## ③ 主控裁决（票面范围内澄清，你不再自裁这些点）

1. **DomainError 基类**：新建 `src/main/services/shared/domain-error.ts`：
   ```ts
   import type { AppErrorCode } from '../../../shared/app-error'
   /** 服务层域错误基类（F-DEDUP-01 单源）：带 AppErrorCode 的 Error，
    * register 出口经 toAppError 按 code 字段折叠（鸭子类型，不按类名）。
    * 子类名经 new.target.name 自动落 name 字段——各域子类一行继承零样板。 */
   export class DomainError extends Error {
     readonly code: AppErrorCode
     constructor(code: AppErrorCode, message: string) {
       super(message)
       this.name = new.target.name
       this.code = code
     }
   }
   ```
   15 文件迁移式：`class XError extends DomainError {}`（保类名/保 name 值/保
   constructor 签名可省——默认继承 (code,message)）；HttpFetchError 特例=保留
   三参 constructor 加 `readonly status?: number`。library.service.ts 删本地定义、
   import 基类并 **re-export**（`export { DomainError }`——文件头注契约保 API 稳定，
   当前零值导入者，主控已 grep 实证）。FileStoreError 保持从 file-store.ts 导出
   （受锁测试 import 它）。**排除面**：src/shared/app-error.ts 的 NotImplementedError
   （冻结契约+ticket 字段异构）与 renderer 的 ApiClientError（异进程）不迁。
2. **原子写单源**：新建 `src/main/services/shared/atomic-write.ts`：
   `atomicWriteFile(path, content: string | Uint8Array, opts?: { ensureDir?: boolean; uniqueTmp?: boolean; cleanOnFail?: boolean }): Promise<void>`
   （tmp 形态 `${path}.tmp` / uniqueTmp 时 `${path}.tmp-${randomUUID()}`；string 用
   'utf8'，bytes 直写）。迁移 4 处：file-store 用 {uniqueTmp, cleanOnFail}（FileStoreError
   包装+basename-only 错误文案留在调用侧原样）；ai-sensor 用 {ensureDir:true}；
   workspace.fs 与 ipc/settings 用裸调。**排除面**：corpus.export manifest 终写
   （:231-232 固定名 manifest.tmp.json=态空间表契约残留清理语义，**保持内联不动**，
   报告注明）；ai-notes-import 的 rm+rename（移动语义非内容写，不动）。
3. **清洗单源**：新建 `src/main/services/shared/sanitize.ts`：
   `sanitizePathToken(raw: string): string`（正则原样上提 `/[^a-zA-Z0-9_-]/g → '_'`，
   头注记 C-02 家族+路径穿越纵深防御口径）。迁移 2 处（safeId/safeName 调用点）。
   **排除面**：ipc/export_.ts 的 safeFileName（展示名消毒：全角+空白+截断 80，异构
   家族）与 db 层 LIKE 转义 ×3（SQL 家族+db 层禁 import services）——报告注明排除理由。
4. **app-file URL 单源（微扩主目标）**：新建 `src/shared/app-file-url.ts`（本票
   src/shared 唯一新建件）：
   ```ts
   import { APP_FILE_SCHEME } from './constants'
   export const APP_FILE_URL_PREFIX = `${APP_FILE_SCHEME}://`
   export function appFileUrl(paperId: string): string {
     return `${APP_FILE_URL_PREFIX}${paperId}`
   }
   ```
   迁移 3 处：papers.repo.ts:251、app-file.protocol.ts:21（prefix 改引常量）、
   corpus.export.service.ts:250（**消灭硬编码字面量**）。
5. **文化层注释同步**：reader.service.ts 文化层「各自私有是既定惯例，避免服务间
   横向依赖」等旧惯例句（notes/tags/ipc 各文件头注同款）改写为新惯例（基类单源=
   被依赖下游位共享件，非横向耦合）。逐文件扫 `DomainError 同构|各自私有|同型`
   相关注释行。
6. **不动不变量册**：docs/invariants.md 本票不碰（INV 补册评估=主控收口职责）。

## ④ 纪律（TDD 红→绿→变异红证）

1. **测试先行**：四个新模块各配直接单测（新文件，纯增不改既有）：
   - `tests/unit/services/shared/domain-error.test.ts`——基类直构 name='DomainError'/
     code 字段值/子类（自建测试桩子类+HttpFetchError 实物）name 自动继承/instanceof
     链/toAppError 按 code 折叠（合法码保留+非法码回落 INTERNAL）；
   - `tests/unit/services/shared/atomic-write.test.ts`——string 与 bytes 双形态落盘
     内容/终名存在且 tmp 不残留/ensureDir 深目录/uniqueTmp 并发双写互不覆盖/
     cleanOnFail 失败后 tmp 清除（失败注入=写只读目录或注入 writeFile 抛错按现有
     测试风格选）；
   - `tests/unit/services/shared/sanitize.test.ts`——白名单字符保持/`../`、`..\\`、
     空白、全角、空串各形态消毒；
   - `tests/unit/shared/app-file-url.test.ts`——appFileUrl 前缀=APP_FILE_SCHEME+'://'+
     id 拼接/prefix 常量一致性。
   约束：it.each 用**裸数组字面量**（带 as const 会破指纹门抽取器）；一行一断言，
   断言行禁行尾注释；always-active 不经 guardedDescribe；文件 ≤500 行；UTF-8。
2. **首红证据**：测试写完、模块未建时先跑一次记录红（全量套跑口径：`npm run test`
   全量，不许只跑定向子集充首红）。
3. **红→绿**：建四模块→绿；再迁移 15+4+2+3 调用点→全量绿+`npm run build`。
4. **变异红证 ≥4 条**（每模块 ≥1，cp 备份法还原，禁 git checkout；还原后 diff 空
   证明）：①基类删 `this.code = code` 赋值→折叠测试红；②atomic-write 删 rename 调用
   （只写 tmp 即返）→终名存在断言红；③sanitize 正则放行 `/`（黑名单删斜杠）→路径
   穿越用例红；④appFileUrl 前缀改 'app-files://'→一致性用例红。
5. **verify 真退出码落盘**：`npm run quality:check && npm run test-surface:check &&
   npm run tickets:check` 与 `npm run lint && npm run typecheck && npm run test &&
   npm run build` 分组跑，每组 `echo "X_EXIT=$?" >> scripts/audits/dedup01-impl-verify.raw.txt`
   （追加式落盘，禁 `; echo` 只落终端形态）。**locks:check 预期红**：单独跑并落盘，
   违规行必须**恰好**=你的新文件未登记清单（tests/unit/services/shared/ 三个+
   tests/unit/shared/ 一个+src/shared/app-file-url.ts 共 5 件）——出现任何其他违规
   （既有受锁文件 hash 不一致等）=你误碰受锁面，立即 BLOCKED 报告。
   test-surface:check 必绿（纯增满足 C_after ⊇ C_before）。
6. 计数落笔前实测（wc/grep），禁凭印象——报告里一切数字来自机器输出。

## ⑤ 基线数字（自检参照，偏差超 ±5 用例即报告）

- verify 链=quality+tickets+locks+lint+typecheck+test+build；当前基线：locks=333
  受锁文件、tickets 195 票/open 10、vitest 基线≈166 文件/1719 用例（F-DEDUP-01
  收口前态；你的新测试纯增后以实测为准）。
- 指纹门基线（test-surface）=183 文件/1757 用例/5334 断言/skipSites 15——纯增
  通过，删改即红。
- Node 24.20.0（volta 项目锁定；若 node -v 非 24 用 `/c/Program Files/Volta/npm.exe`
  前缀路径跑）。

## ⑥ 报告契约

全文落 `scripts/audits/dedup01-impl.report.md`：实现摘要/文件清单（新建+修改分列，
含各行数）/首红与变异红证记录（引用 .raw.txt 日志+还原 diff 空证明）/verify 分组
退出码/locks:check 预期红原文/自裁申报（一切票面外决定，含注释改写面清单）/疑虑。
证据日志统一 `.raw.txt` 后缀入 scripts/audits/。回复五行内（完成态+报告路径+自裁数）。
