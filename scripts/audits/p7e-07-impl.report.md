# P7E-07 实现报告——智能排序（引用数排序）

> 实现者：三屋模式实现者子代理（GLM5.3 统一档）。票面=scripts/audits/p7e-07-brief.md。
> 证据目录=scripts/audits/p7e-07-red/（.raw.txt 全套）。

## 1. 实现摘要

四处增量改动，零新依赖零迁移零 IPC/repo 方法变更（sort 经 LibraryQuery 既有字段直传）：

1. `src/shared/models/paper.ts`：`librarySortSchema` 枚举 +`'cited_desc'`（加值向后
   兼容，旧三值全保留——与 P7E-06「切换删旧」不同形态：新增维度非方案替换）。
2. `src/main/db/repos/papers.queries.ts`：`ORDER_BY` +`cited_desc:
   'COALESCE(p.cited_by_count, 0) DESC, p.rowid DESC'`（票面① SQL 照抄；COALESCE
   显式归零+rowid 决胜，附注记引用探针实录）。
3. `src/renderer/features/library/FilterBar.tsx`：`SORT_LABEL`
   +`cited_desc: '被引（高到低）'`（下拉 Object.entries 驱动，UI 零逻辑改）。
4. `src/main/services/library.service.ts`：:20 预留注记兑现修订（照 P7E-05
   reader.service.ts:20 修订形态：「预留」→「P7E-07 已兑现」+「经新 repo 方法」→
   「ORDER_BY 映射扩展」勘误，票面④生命周期层）。

双 `Record<LibrarySort,...>` 全键约束=两处补全的类型强制闭环（M2 变异验证）。

## 2. 文件清单

| 文件 | 性质 | 变更 |
|---|---|---|
| src/shared/models/paper.ts | 受锁（主控预解锁） | 枚举加值+1 行注记 |
| src/main/db/repos/papers.queries.ts | 常规 | ORDER_BY +1 行+3 行注记 |
| src/renderer/features/library/FilterBar.tsx | 常规 | SORT_LABEL +1 行 |
| src/main/services/library.service.ts | 常规 | :20 注记修订（+4/-1 行） |
| tests/unit/db/repos/papers-cited-sort.test.ts | 新增（106 行） | S1~S5 五用例 |
| locks/manifest.json | 受锁（locks:apply 产物） | 268→269 |

`git diff --stat`：6 文件 +20/-6（其中 tickets/registry.ts 的 +1=主控建单条目，
开工前已存在，实现者未触碰）。未跟踪新文件仅新测试一件。

## 3. M1 变异前置探针（主控裁决③兑现）

`scripts/audits/p7e-07-red/probe-null-order.raw.txt`（node -e 内联，不落 .mjs
=不扩受锁面；better-sqlite3 12.11.1 / node ABI 137 / :memory:）：

- 种子插入序 a(5), d(0), c(12), b(null)；
- `ORDER BY cited_by_count DESC`（raw）→ `c,a,d,b`：**DESC 下 NULL 默认垫底**
  =与 COALESCE 归零同向（票面预判命中）；
- `COALESCE(,0) DESC, rowid DESC` → `c,a,b,d`：**0-vs-NULL 相对序分叉**——
  COALESCE 形态下两者同级、由 rowid 决胜（后插 NULL 在前）；raw 形态 0 恒在
  NULL 前（NULL 绝对最小）；
- 附带 raw ASC → `b,d,a,c`：ASC 下 NULL 最前。
- **裁决**：M1「删 COALESCE」在「NULL 后插于 cited=0」的种子布局下**真实红**
  （`M1-red-on-order: true`）——未启用 -1/反序备用形态。测试种子据此设计。

## 4. 红证（先红纪律，全量口径）

`red-full.raw.txt`：`npm run test` 全量 149 文件（148+1）/1270 用例（1265+5），
**3 failed | 1267 passed，exit=1**——红在 S1/S2/S5（`SqliteError: no such
column: undefined`=ORDER_BY 缺 cited_desc 键的运行时形态）；S3 缺省/S4 旧三值
回归两用例即绿（既有面零破坏=回归锚自证）。红形态=「新值三用例红、兼容锚绿」，
非恒真断言。

## 5. 绿证与变异红证

- 绿（目标文件）：`green-target.raw.txt` 5/5 passed，exit=0。
- **M1 删 COALESCE**（→`p.cited_by_count DESC, p.rowid DESC`）：
  `mutation-m1.raw.txt` **S1 红**（1 failed | 4 passed，exit=1）——0-vs-NULL
  相对序翻转被 S1 显式断言抓住（探针预判命中）。
- **M2 ORDER_BY 漏加键**（删 cited_desc 行）：`mutation-m2.raw.txt`
  `npm run typecheck` **error TS2741: Property 'cited_desc' is missing in
  type ... but required in type 'Readonly<Record<...>>'`，exit=2——类型闭环
  变异（Record 全键约束）。
- **M3 删决胜键 rowid**（→`COALESCE(p.cited_by_count, 0) DESC`）：
  `mutation-m3.raw.txt` **S1/S2/S5 三用例红**（3 failed | 2 passed，exit=1）——
  同键序翻转为引擎序（实测=rowid ASC 输入序），S5 分页页界断言被抓住。
- 变异还原：全部 cp 备份法（`mut-backup-papers.queries.ts`），三组还原后
  `diff` 均空（M1/M3/M2-restore-clean 回显在案）；未用 git checkout（未提交
  面保护纪律）。
- 变异顺序申报：M1→M3→M2（同载体文件连续变异复用同一备份，语义与票面
  M1~M3 三组要求等价，无减组）。

## 6. 测试证据（新测试形态）

`tests/unit/db/repos/papers-cited-sort.test.ts`（always-active 裸 describe，
P7E-06 papers-multi-tag 同口径，K3：不经 guardedDescribe）：

- 夹具：`row()` 复用 multi-tag 形态；cited 落库经 `db.prepare UPDATE`（insert
  面不含 ENR-01 三列——迁移 005 全可空默认 NULL 的既有事实）。
- 种子 quad：插入序 p-c5/p-c0/p-c12/p-cN（rowid 1~4），cited=5/0/12/NULL，
  added_at/year/title 三维分化（S4 复用同批）。
- S1 全序=[12,5,NULL,0]：**NULL 垫底+与被引 0 同级=COALESCE 归零语义显式锚**
  （票面风险①「排序语义须显式」的落地；种子含 cited=0 论文、NULL 后插——
  探针指导的 M1 红证布局，见 §8 自裁）。
- S2 全 NULL：rowid 决胜稳定序 [x3,x2,x1]。
- S3 缺省：`libraryQuerySchema.parse({}).sort==='added_desc'`+行为与显式全等。
- S4 旧三值：added_desc/year_desc/title_asc 三序断言（改前行为回归锚）。
- S5 分页：同 cited=7 两篇跨页界，limit=2 两页拼接不重不漏+total=3。

## 7. verify 与 locks 实录

- `locks-generate.raw.txt` exit=0 / `locks-apply.raw.txt` exit=0（gen-exit=0
  apply-exit=0）/ `locks-check.raw.txt`：**269 个受锁文件与 manifest 一致**
  （268→269，+1=新测试；锁序=新测试诞生即 generate+apply 先于 verify，票面⑤）。
- `verify.raw.txt`：`npm run verify` 全链（quality+tickets+locks+lint+typecheck+
  test+build）**verify-exit=0**（PIPESTATUS[0] 真码）；test 段 **149 文件
  1270 用例全 passed**（148→149 / 1265→1270，+1 文件+5 用例，实测申报）。
- e2e：本票零新 spec（票面⑥），全量 e2e 39 由主控收口复验。

## 8. 自裁申报（超票面决定）

1. **S1 种子含 cited=0 论文（票面态空间表只列 5/NULL/12）**：为显式锚定
   「未缓存与被引 0 同级垫底」语义+使 M1「删 COALESCE」真实红（探针裁决的
   红证布局）。属票面①「COALESCE 显式归零——未缓存论文与被引 0 同级垫底」
   语义的断言化，非行为偏离。
2. **tickets/registry.ts 开工即 M**：diff 确认=主控建单的 P7E-07 条目
   （status: open），实现者未触碰（禁令遵守）。
3. **manifest.json CRLF warning**：lock-protected.ps1（PowerShell）写出的既有
   行为，git 提交时按 .gitattributes 归一 LF；locks:check 磁盘口径 269 一致
   已过，非本票引入。
4. **探针经 node -e 内联**：不落 .mjs 文件=不扩受锁面（免 locks 滚动）；
   探针前经 `sqlite-abi.mjs use node` 切 ABI（node_modules 原为 electron
   ABI 146——首探针 ERR_DLOPEN_FAILED 后切换，幂等无害）。

## 9. 疑虑

- 无阻塞疑虑。
- 备注（非疑虑）：M3 红证依赖 SQLite 无决胜键时同键行的引擎序（实测=rowid
  ASC 输入序；SQLite 文档层面排序稳定性未定义）——但 S2/S5 断言锚定的是我方
  rowid DESC 决胜语义而非引擎序，实现态下确定性由决胜键保证，安全。

## 10. 成本自述

- 实现者 GLM5.3 统一档（GLM-5.3 思考级 builtin），单轮闭环未回炉。
- 工具调用 18 次（读先例池 7+探针 3+编辑 8）；全程约 20 分钟
  （20:54 全量红起测 ~20:56 verify 完成为主段）。
- token 用量：实现者无自估读数（纪律：禁自估上下文占用）。
