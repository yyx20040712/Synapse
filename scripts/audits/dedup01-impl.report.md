# F-DEDUP-01 实现者报告（ops-executor，GLM5.3flash max）

> 任务书=scripts/audits/dedup01-impl-brief.md（主控签发六段简报，本单唯一
> 真相源）。环境=Node 24.20.0（volta 项目锁定，`node -v` 亲验）/npm 11.19.0。
> 证据日志=本目录 dedup01-impl-*.raw.txt 六件（首红/全量绿/build/verify/
> 变异/locks）。

## 1. 实现摘要

四个收敛面按任务书③段主控裁决全部落地，TDD 先红（全量套跑）→建模块绿→
迁移调用点→全量绿+build：

1. **DomainError 基类单源**：新建 `src/main/services/shared/domain-error.ts`
   （code: AppErrorCode + name 经 new.target.name 自动落）；15 文件迁移=
   14 文件一行继承（`class XError extends DomainError {}`，保类名/name 值/
   默认 (code,message) 签名）+ library.service.ts 删本地定义改 import 并
   **re-export**（`export { DomainError }`，API 稳定）；HttpFetchError 特例
   保留三参 constructor + `readonly status?: number`；FileStoreError 导出面
   保持 file-store.ts（受锁测试消费）。排除面照裁决：shared/app-error.ts 的
   NotImplementedError 与 renderer ApiClientError 未迁。
2. **原子写单源**：新建 `src/main/services/shared/atomic-write.ts`
   （`atomicWriteFile(path, content, opts?)`，tmp 形态/ensureDir/uniqueTmp/
   cleanOnFail 四开关语义）。迁移 4 处：file-store copyOrWrite→
   `{uniqueTmp, cleanOnFail}`（FileStoreError 包装+basename-only 文案留调用侧）；
   ai-sensor writeAtomic→`{ensureDir:true}`；workspace.fs 与 ipc/settings→裸调。
   排除面照裁决保持内联：corpus.export manifest 终写（固定名 manifest.tmp.json
   态空间契约残留清理语义）、ai-notes-import 的 rm+rename（移动语义）。
3. **清洗单源**：新建 `src/main/services/shared/sanitize.ts`
   （`sanitizePathToken`，正则原样上提 `/[^a-zA-Z0-9_-]/g → '_'`）。迁移 2 处：
   export.service safeId / corpus.export safeName（调用点改引，本地函数删除）。
   排除面照裁决：ipc/export_ safeFileName（展示名消毒异构家族）与 db 层 LIKE
   转义 ×3（SQL 家族+db 层禁 import services）。
4. **app-file URL 单源（微扩主目标）**：新建 `src/shared/app-file-url.ts`
   （APP_FILE_URL_PREFIX 派生自 APP_FILE_SCHEME + `appFileUrl(paperId)`）。
   迁移 3 处：papers.repo:251 / app-file.protocol:21（prefix 改引常量）/
   corpus.export.service:250（**硬编码 `app-file://` 字面量消灭**）。
5. **文化层注释同步**：旧惯例句（「各自私有是既定惯例，避免服务间横向依赖」
   「XX 同构/同型」）逐文件改写为基类单源新惯例（被依赖下游位共享件，非横向
   耦合）——完整清单见 §6 自裁申报-注释改写面。
6. docs/invariants.md 未碰（裁决 6：INV 补册评估=主控收口职责）。

## 2. 文件清单（行数=wc -l 实测）

**新建 8 件（src 4 + tests 4）：**

| 文件 | 行数 |
| --- | --- |
| src/main/services/shared/domain-error.ts | 15 |
| src/main/services/shared/atomic-write.ts | 52 |
| src/main/services/shared/sanitize.ts | 14 |
| src/shared/app-file-url.ts | 14 |
| tests/unit/services/shared/domain-error.test.ts | 61 |
| tests/unit/services/shared/atomic-write.test.ts | 108 |
| tests/unit/services/shared/sanitize.test.ts | 33 |
| tests/unit/shared/app-file-url.test.ts | 27 |

新测试 always-active（无 guardedDescribe）、it.each 裸数组字面量（无 as
const）、断言行无行尾注释、全部 ≤500 行。

**修改 20 件（迁移面，全部本单产物；增删行=回炉 1 后 `git diff --numstat`
逐文件实测回填）：**

| 文件 | numstat(+/-) | 迁移内容 |
| --- | --- | --- |
| src/main/db/repos/papers.repo.ts | +2/-2 | fileUrl→appFileUrl(r.id) |
| src/main/http/http-client.ts | +5/-5 | HttpFetchError 改 extends DomainError（三参+status 特例保留）+类注 |
| src/main/ipc/export_.ts | +6/-13 | ExportIpcError 一行继承+头注+类注 |
| src/main/ipc/lineage.ts | +4/-11 | LineageIpcError 一行继承+类注 |
| src/main/ipc/settings.ts | +7/-11 | 删本地 atomicWrite→atomicWriteFile 裸调（get 写回/set 两落点）+头注两处 |
| src/main/ipc/system.ts | +3/-11 | SystemDomainError 一行继承+类注增补 |
| src/main/protocol/app-file.protocol.ts | +2/-1 | prefix→APP_FILE_URL_PREFIX |
| src/main/services/ai_sensor/ai-sensor.service.ts | +11/-15 | 删本地 writeAtomic→atomicWriteFile{ensureDir}（requestRead 落点）+头注/注释三处 |
| src/main/services/enrich/enrich.service.ts | +3/-11 | EnrichDomainError 一行继承+类注 |
| src/main/services/export_/corpus.export.service.ts | +10/-13 | SessionError 一行继承+safeName→sanitizePathToken+url→appFileUrl+注释两处 |
| src/main/services/export_/export.service.ts | +8/-14 | ExportDomainError 一行继承+safeId→sanitizePathToken+注释两处 |
| src/main/services/import_/file-store.ts | +11/-18 | FileStoreError 一行继承+copyOrWrite 改 atomicWriteFile{uniqueTmp,cleanOnFail}+注释两处 |
| src/main/services/import_/import.service.ts | +3/-10 | ImportDomainError 一行继承+类注补句 |
| src/main/services/library.service.ts | +7/-13 | 删本地 DomainError、import 基类+re-export+头注/类注两处 |
| src/main/services/lineage/lineage.service.ts | +4/-12 | LineageDomainError 一行继承+类注首句改写 |
| src/main/services/notes.service.ts | +5/-12 | NotesDomainError 一行继承+架构层头注 |
| src/main/services/reader.service.ts | +5/-13 | ReaderDomainError 一行继承+文化层旧惯例句改写 |
| src/main/services/tags.service.ts | +5/-13 | TagsDomainError 一行继承+架构层头注+类注尾句 |
| src/main/services/workspaces/workspace.fs.ts | +8/-12 | 删本地 atomicWrite→atomicWriteFile 裸调（pointer/meta 两落点）+头注两处 |
| src/main/services/workspaces/workspace.service.ts | +3/-10 | WorkspaceDomainError 一行继承+类注新增 |

迁移面机器复核对账：`extends DomainError` 14 文件+library re-export=15；
`atomicWriteFile` 调用点=4 文件 6 处（settings/workspace.fs 各 2、ai-sensor/
file-store 各 1——门二 P2-3 处置补记：首版「恰 4」系文件数口径混用）；
`sanitizePathToken` 调用点恰 2；
`appFileUrl|APP_FILE_URL_PREFIX` 调用点恰 3；`extends Error` 残留仅基类本体
+NotImplementedError（排除面）+renderer ApiClientError（异进程，排除面）；
本地 atomicWrite/safeName/清洗正则/app-file 硬编码字面量残留=0（唯一剩
reader.service.ts:5 头注的文档性格式描述，非代码位）。

行数总账（回炉 1 后 numstat 实测）：**修改面 20 文件 +112/-220（净 -108）；
新建 8 件 +324（wc -l 合计同值）；全票 28 文件 +436/-220**。首版此处
+124/-232 系凭 `git diff --stat` 粗读印象（净删数碰巧同值 -108，增删子项
失实）——门一 W1 拦截，逐文件 numstat 复测后全表回填（上表）。

## 3. 首红与变异红证

**首红**（dedup01-impl-firstraw.raw.txt，测试写完、模块未建、全量套跑）：
FIRSTRED_EXIT=1，恰 4 个新测试文件 import 解析失败红（app-file-url/
domain-error/atomic-write/sanitize 各一条 "Failed to load url"），其余
166 文件/1719 用例全绿——与基线 166/1719 精确吻合（偏差 0）。

**全量绿**（dedup01-impl-green.raw.txt）：GREEN_EXIT=0，170 文件/1745 用例
（1719+新 26：domain-error 6+atomic-write 8+sanitize 9+app-file-url 3）。

**变异红证 4 条**（dedup01-impl-mutations.raw.txt；cp 备份法，禁 git
checkout——本单文件均为未提交新文件，还原后 diff 空证明=备份件与还原件
逐字节 diff 空输出；备份件还原毕即删，零驻留）：

| # | 变异 | 红证据 | 还原证明 |
| --- | --- | --- | --- |
| M1 | domain-error 删 `this.code = code` | 6 用例中 3 红（code 丢失→折叠断言红） | M1_RESTORE_DIFF_EMPTY |
| M2 | atomic-write 删 rename 调用（只写 tmp 即返） | 8 用例中 7 红（终名存在断言红） | M2_RESTORE_DIFF_EMPTY |
| M3 | sanitize 白名单放行 `/`（黑名单剔除斜杠） | 9 用例中 2 红（路径穿越用例红；M3_VITEST_EXIT=1） | M3_RESTORE_DIFF_EMPTY |
| M4 | app-file-url 前缀漂移 `app-files://` | 3 用例中 2 红（一致性用例红；M4_VITEST_EXIT=1） | M4_RESTORE_DIFF_EMPTY |

还原后四新测试定向复跑全绿：**4 文件/26 用例 passed，RESTORE_RERUN_EXIT=0**
（回炉 1-W2 补跑落档=dedup01-impl-mutations.raw.txt 尾段「回炉1-W2」节；
首版此处误写 6 文件/40 用例——该数是更早一轮含 tests/unit/shared 既有两件
的定向跑口径，且当时未落 raw，无证申报已被门一 W2 拦截）。

## 4. verify 分组真退出码（dedup01-impl-verify.raw.txt / build.raw.txt）

| 检查 | 退出码 |
| --- | --- |
| quality:check | 0 |
| test-surface:check | 0 |
| tickets:check | 0 |
| lint | 0 |
| typecheck | 0 |
| test（全量） | 0（170 文件/1745 用例） |
| build | 0 |

指纹门对账（纯增零豁免）：183→187 文件 / 1757→1790 用例 / 5334→5417 断言 /
skipSites 15→15；NEW_FILE 四件（8+6+9+3=26 用例，含 sanitize it.each 展开 7 行）
；豁免清单零条目。vitest 运行域 +26（1719→1745）。**归因更正（门二 P2-1 处置
补记）**：首版本段「+7=sanitize each 展开行，26+7=+33」双计失实（each 7 行已含
于 26 内）——正确归因=+33 用例中 26=本票四新件、7=batch 7 前票未基线化 NEW
（corpus-export.spec 1/ai-notes-import 2/corpus.export.test 4）；断言 +83 同
口径=本票 45+前票 38。总数 187/1790/5417 不变（门二独立复算确认）。

## 5. locks:check 预期红原文（dedup01-impl-locks.raw.txt，LOCKS_EXIT=1）

```
locks 检查未通过：
  - 新增受锁文件未登记：src/shared/app-file-url.ts（运行 npm run locks:apply 并带 [locked-change] 提交）
  - 新增受锁文件未登记：tests/unit/services/shared/atomic-write.test.ts（…）
  - 新增受锁文件未登记：tests/unit/services/shared/domain-error.test.ts（…）
  - 新增受锁文件未登记：tests/unit/services/shared/sanitize.test.ts（…）
  - 新增受锁文件未登记：tests/unit/shared/app-file-url.test.ts（…）
```

违规行**恰好 5 条**且全部为新文件未登记（任务书④.5 预期形态），零既有
受锁文件 hash 不一致、零其他违规——未误碰受锁面。锁操作（generate/apply）
按禁令未执行，归主控收口。

## 6. 自裁申报

1. **[测试设计自裁] atomic-write 并发双写用例改 allSettled 口径**：首版用
   Promise.all 断言双写全成——Windows 对「同目标并发替换」可瞬态拒绝后到者
   rename（EPERM 平台竞态），定向批量跑实证 1 红（单独跑绿=非确定）。修正为
   allSettled：至少一成+终名完整一方内容+tmp 零残留（单源真正保的契约=各写手
   tmp 独立、绝不字节交错）。生产调用点均为顺序写（file-store 单篇 awaited/
   ai-sensor 单落点/指针单写），测试不发明生产没有的并发完成契约。
2. **[证据形式瑕疵如实呈报] M1/M2 退出码捕获形式**：首两轮变异跑的
   `M1_EXIT/M2_VITEST_EXIT=0` 捕获的是管道中 grep 的退出码（非 vitest 退出
   码）；红证据以 raw 内 vitest 摘要行（"3 failed"/"7 failed"）为准。M3/M4
   已改「先落 log 再取真退出码」形态（=1）。教训归 M3/M4 形态，供主控定罪。
3. **注释改写面清单**（③.5 裁面的落点，全部为头注/文档性注释，零行为变更；
   回炉 1-W3 补全——**权威全集=dedup01-gate1-diff.patch 内 20 个修改文件的
   注释 hunk，机检 18 文件含注释行改动**（papers.repo/app-file.protocol 两件
   零注释改动）；首版清单漏列 6 文件已门一 W3 拦截）：
   - src/main/http/http-client.ts：HttpFetchError **类文档注新增**（基类一行
     继承+特例三参+new.target name 句——随 class 声明行替换）；
   - src/main/ipc/export_.ts：头注接口层「见 library.service 规约」→基类单源
     句；ExportIpcError **类注增补**「（基类一行继承——F-DEDUP-01 单源）」；
   - src/main/ipc/lineage.ts：LineageIpcError 类注「（export_.ts ExportIpcError
     同型…）」→「（shared/domain-error 基类一行继承…）」；
   - src/main/ipc/settings.ts：头注 set 行改单源引用；架构层「可 import」清单
     补 atomic-write 行；本地 atomicWrite 的函数注随函数体删除；
   - src/main/ipc/system.ts：SystemDomainError **类注尾句增补**「；基类一行
     继承——F-DEDUP-01 单源」（原句「外链未过守卫」保留）；
   - src/main/services/ai_sensor/ai-sensor.service.ts：头注原子写句改单源引用；
     writeAtomic 函数注随函数体删除；requestRead 调用点新增三行 ensureDir
     语义注（「行为同旧 writeAtomic」）；
   - src/main/services/enrich/enrich.service.ts：类注「（与 library/reader 的
     DomainError 同构）」→「（shared/domain-error 基类一行继承…）」；
   - src/main/services/export_/corpus.export.service.ts：SessionError **类注
     扩基类单源句**；figure 分支消毒注释「C-02 safeId 同型」→「消毒单源=
     services/shared/sanitize…C-02 safeId 同族」；
   - src/main/services/export_/export.service.ts：ExportDomainError 类注改基类
     单源表述；safeId 调用点注释「消防消毒」→「消毒单源=…/sanitize」；
   - src/main/services/import_/file-store.ts：FileStoreError 类注重写（含「受锁
     测试 import 本导出面，出口保持 file-store.ts 不变」句）；copyOrWrite 函数
     注改单源引用（sha 截断自愈/basename-only 语义句原样保留）；
   - src/main/services/import_/import.service.ts：ImportDomainError **类文档注
     补一行**「基类一行继承=services/shared/domain-error（F-DEDUP-01 单源）」；
   - src/main/services/library.service.ts：文化层句改「定义上提单源+re-export
     保 API 稳定（零值导入者实证）」；类文档注补「（定义已上提…此处
     re-export 维持历史导出面）」两句；
   - src/main/services/lineage/lineage.service.ts：类文档注首句「reader.service
     ReaderDomainError 同型」→「shared/domain-error 基类一行继承」（其余
     CONFLICT 语义句原样）；
   - src/main/services/notes.service.ts：架构层「域错误与 library/reader 的
     DomainError 同构」→一行继承+被依赖下游位表述；
   - src/main/services/reader.service.ts：文化层删「各自私有是既定惯例，避免
     服务间横向依赖」→基类单源新惯例（含「旧惯例废止」句）；
   - src/main/services/tags.service.ts：架构层「NotesDomainError 同型」→基类
     一行继承；TagsDomainError 类注尾句「与 notes 域 DomainError 同构」→
     「基类一行继承」；
   - src/main/services/workspaces/workspace.fs.ts：架构层头注改「只 import…
     与 services/shared/atomic-write（被依赖下游位）」+原子写句删「settings
     ipc 同型」；本地 atomicWrite 函数注随函数体删除（不保留悬空注释）；
   - src/main/services/workspaces/workspace.service.ts：WorkspaceDomainError
     **类注新增**（原类无注——「域错误载体（基类一行继承…）」）。
4. **不动面申报**：reader.service.ts:5 行为层头注的 `app-file://${id}` 为
   URL 格式文档性描述（非代码拼装位），保留未改——票面迁移面=3 代码调用点。
5. **场外既有面申报**：工作区 `docs/handoff/relay.md` 有本会话未触碰的既有
   改动（火协议 RUNNING/claim-b10/heartbeat 回写与 batch 8/9 日志行）——
   非本单产物，未读改未还原，git status 留痕待主控处置；`scripts/audits/
   dedup01-impl-brief.md` 为主控签发任务书（场外既有）。
6. 无其他超票面决定：未翻 registry、未触 tickets/**、未动 src/shared 既有
   文件、未动既有测试、未动 docs/invariants.md、未引新依赖、未做任何 git
   写操作（add/commit 全程未执行）。

## 7. 疑虑

- 无阻断级疑虑。一项观察供门审复核：指纹门 caseCount 与 vitest 用例数是两
  口径模型（it.each 展开行在门侧另计），本单 +33 vs +26 已逐项对账闭合
  （§4），exemptions 零条目。
- ai-sensor 迁移后 `mkdir/dirname/writeFile/rename` 四 import 收缩（原仅
  writeAtomic 使用）——lint+typecheck 双绿实证无孤儿 import。

## 8. 回炉 1 处置记录（门一终评 PASS_WITH_WARNINGS B0/W3/N8 后，仅报告+证据面）

- **W1 计数失实**：§2 表 20 行增删列与总账全部按 `git diff --numstat -- <20
  文件>` 逐行实测回填（修改面 +112/-220 净 -108，新件 8 件 +324，全票 28 文件
  +436/-220），首版 +124/-232 作废并留勘误句——数字来源=numstat 命令输出
  （§2 表逐行），与主控权威值一致。
- **W2 无证申报**：补真实定向复跑证据——`npm run test -- tests/unit/services/
  shared tests/unit/shared/app-file-url.test.ts`（Node 24.20.0）输出追加落盘
  dedup01-impl-mutations.raw.txt 尾段「回炉1-W2」节，实测 **4 文件/26 用例
  passed，RESTORE_RERUN_EXIT=0**；§3 末行改为该实测口径并注明首版 6/40 口径
  错误缘由。
- **W3 清单漏项**：§6.3 注释改写清单按 dedup01-gate1-diff.patch 注释 hunk
  全集重列——机检探针（纯 ASCII 单行 node -e，对 patch 按 `^[+-]\s*(/\*\*|\*|//)`
  计数）实证 20 修改文件中 **18 文件含注释行改动**（papers.repo/app-file.
  protocol 零注释改动），逐文件补全首版漏列的 http-client/corpus.export/
  export.service/import.service/ipc/system/workspace.service 六文件及
  tags/ipc-export_/library 类注细目；处置面=仅本报告与 mutations raw 追加，
  零 src/tests 触碰、零 git 写操作。

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=1 outcome=done
