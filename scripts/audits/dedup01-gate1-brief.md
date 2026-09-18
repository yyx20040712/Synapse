# F-DEDUP-01 门一审简报（对抗深审）

## 铁律

你是对抗式一审（隔离审计）：**只读**（唯一可写=你的审计报告文件）；禁跑
npm/test/git 命令；禁臆测包外事实——一切结论必须引用包内证据（file:line 或
raw 日志行）。你与实现者异构，任务是找错不是背书。

## 输入件（scripts/audits/ 下，全部可 Read）

1. **diff 审计包**：`dedup01-gate1-diff.patch`（28 文件全文 diff：20 修改+8 新建；
   +436/-220。新建件经 git add -N 已入 diff 视野——含四新模块与四新测试全文）。
2. **票面**（registry.ts:279 原文）：
   F-DEDUP-01｜file 锚=src/main/services/library.service.ts｜area=service｜owner=strong
   ｜摘要：服务层偶然复杂度收敛（终裁 §3-4——审计 P2 采纳：DomainError 15 文件定义
   class X…Error extends/17 文件引用+原子写 tmp+rename 4 文件 13 处+id/path 清洗多份
   ——Rule of Three 早已越过）：DomainError 基类上提 src/main/services/shared/
   domain-error.ts 单源（17 引用文件同票迁移）+原子写单源（tmp+rename helper）+
   path/id 清洗单源；分层铁律 ipc→services→repos→db 单向不破（共享件=被依赖下游位，
   非横向耦合——ZcodeLink→AiSensor 既有唯一例外不动）；动 src+tests 双面不属
   F-TESTREF 战役（独立 [locked-change] 常规三屋票）；微扩（2026-09-18 裁决书在册
   扩容）：app-file:// URL 三处拼装收编单源（corpus.export.service.ts:239 硬编码
   未用 APP_FILE_SCHEME——顺手项裁决书 §3 梯队三）；排期=F-TESTREF 战役毕后。
3. **主控签发的实现者任务书**：`dedup01-impl-brief.md`（六段简报=实现契约，含
   主控裁决六条与排除面）。
4. **实现者报告**：`dedup01-impl.report.md`（自裁申报 6 项在 §6）。
5. **证据日志**：dedup01-impl-{firstraw;green;verify;build;mutations;locks}.raw.txt
   六件（首红/全量绿/verify 分组退出码/build/变异红证/locks 预期红原文）。

## 主控已预裁项（可攻击，推翻需更强依据）

1. DomainError 基类用 `new.target.name` 自动落子类名（15 文件一行继承零样板）；
   NotImplementedError（冻结契约+ticket 字段异构）与 renderer ApiClientError（异进程）
   排除不迁。
2. 原子写 helper 三开关（ensureDir/uniqueTmp/cleanOnFail）+错误包装留调用侧；
   corpus.export manifest 固定名终写（态空间表契约）与 ai-notes-import rm+rename
   （移动语义）保持内联不动。
3. sanitizePathToken 只收 safeId/safeName 同正则 2 处；ipc/export_ safeFileName
   （展示名消毒异构）与 db 层 LIKE 转义 ×3（SQL 家族+db 禁 import services）排除。
4. app-file-url.ts 落 src/shared（db/protocol/services 三层共用唯一合法位），
   前缀常量+拼装函数双导出。
5. library.service re-export 保 API 稳定（历史零值导入者，主控 grep 实证）。
6. 实现者自裁 1（并发双写用例 allSettled 口径——Windows rename EPERM 平台竞态
   实证后修正）与自裁 2（M1/M2 退出码捕获形式瑕疵——红证据以 raw 内 vitest 摘要
   行为准）已阅，待你独立拷问。

## 工单 A~E

- **A 母本符合度**：diff vs 票面四收敛面+微扩目标——15 文件/4 处/2 处/3 处逐一
  对账；排除面是否恰好=预裁排除面（多删/少删都是偏票）。
- **B 宪法红线**：分层单向（ipc→services 合法性/db→shared 合法性/http→services/
  shared 合法性逐一推演）；受锁面（实现者是否碰了既有 tests/src/shared 既有文件
  ——diff 内不该有任何既有测试或 shared 既有件的修改 hunk）；安全禁令；文件
  ≤500 行；UTF-8；死代码（被删本地 helper 是否有残留引用）。
- **C 代码与测试质量**：四新模块语义（new.target.name 在直接构造/子类继承两形态
  下的 name 值；atomic-write 三开关正交性与 tmp 残留语义；sanitize 白名单边界；
  appFileUrl 拼装）；四新测试是否恒真断言/是否真能失败（对照变异红证 raw——M1/M2
  的退出码捕获瑕疵是否动摇红证据成立性）；既有受锁测试保真面（FileStoreError
  instanceof/HttpFetchError 三参签名/toAppError 折叠）是否被 diff 破坏。
- **D 报告诚实性**：报告 §2 文件清单/§3 红证/§4 verify 数字/§5 locks 原文逐条
  vs patch 与 raw 实物——自裁申报是否漏项（diff 里有而报告没申报的决定）。
- **E 接缝与后续单**：F-LAYER-01（settings 下沉）与 F-SENSOR-01/F-EXPORT-01 接缝
  （atomic-write/sanitize 新共享件是否被它们的票面预期冲突）；文化层注释改写是否
  有旧惯例句残留（patch 外你无法 grep——以 patch 内可见 hunk 为限，声明视野）。

## 输出

逐条 [B|W|N]+file:line 证据+统计（B/W/N 计数）+总评一行（PASS /
PASS_WITH_WARNINGS / FAIL）。全文落 `scripts/audits/dedup01-gate1-report.md`
（唯一可写件），回复精简（统计+总评+最重三条）。
