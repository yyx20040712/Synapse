# 排序雷清扫单元 实现者报告（无工单号——事件驱动存量缺陷清扫，缺陷③ 69188e8 同型）

单元：六处 ORDER BY 决胜键确定化（台账=docs/reports/2026-08-27_visual-check-findings.md 发现 3 同型雷清单
五处+主控裁决追加第六雷 listAllIds——2026-08-28 疑虑①裁决：其序直接进 manifest papers 数组，
同 added_at 平局 id 彩票抖序威胁 INV-17「同库重导出逐字节稳定」，非低频无雷）
实现者：GLM（三屋实现者子代理，ADR-0017）｜日期：2026-08-28｜派发简报=scripts/audits/sweep-order-impl-brief.md

## 0 开工记录（会话开工纪律）

技能清点：
- test-driven-development=**用**（TDD 四档为票面纪律，已加载）
- verification-before-completion=**用**（verify 真退出码落盘为本单完成定义，已加载）
- systematic-debugging=不用（修法主控已裁决，无未知调试面）
- subagent-driven-development=不用（本人即实现者，无派发面）
- code-review-excellence=不用（门一/门二独立子代理职责）
- 其余技能（前端/PDF/CI/部署等域）=不用（本单元纯 SQL 排序键+测试）

配置自查：实现者位 GLM；一切 node/npm 命令带前缀
`export PATH="/e/class/智慧水务/tools/node24:$PATH"`（本机默认 node=v25 会因 better-sqlite3 ABI 假红——铁律遵守，全程无裸 node 调用逃逸；唯一例外=首次探针未先 `sqlite-abi.mjs use node` 报 ABI 错，随即按脚本切 node ABI 后通过）。

## 1 实现摘要（③主控裁决逐条兑现）

| 现场 | 修前 | 修后 |
| --- | --- | --- |
| lineage.repo.ts:177（listNodesStmt） | `ORDER BY created_at, id` | `ORDER BY created_at, rowid` |
| lineage.repo.ts:178（listEdgesStmt） | `ORDER BY created_at, id` | `ORDER BY created_at, rowid` |
| papers.queries.ts added_desc | `p.added_at DESC, p.id DESC` | `p.added_at DESC, p.rowid DESC` |
| papers.queries.ts year_desc | `p.year DESC, p.added_at DESC`（无第三键） | `p.year DESC, p.added_at DESC, p.rowid DESC` |
| papers.queries.ts title_asc | `p.title ASC, p.id ASC` | `p.title ASC, p.rowid ASC` |
| notes.repo.ts:91（selectByLike） | `ORDER BY updated_at DESC`（无决胜键） | `ORDER BY updated_at DESC, rowid DESC` |
| papers.repo.ts:217（listAllIds，**主控裁决追加的第六雷**） | `ORDER BY added_at DESC, id DESC` | `ORDER BY added_at DESC, rowid DESC` |
| corpus.assemble.ts orderAiNotes 末级 | `a.createdAt===b.createdAt ? (a.id<b.id?-1:1) : …`（id 字典序决胜=uuid 彩票） | createdAt 比较独立成句 + 三键全平 `return 0`（末级 id 比较整支删除） |

决胜语义（裁决 4 兑现）：DESC 序配 rowid DESC（后插在前，「最新优先」列语义）；title_asc 配 rowid ASC（先插在前）。
头注/声明同步：corpus.assemble.ts:94-97 头注改为「createdAt→（三键全平=0，稳定排序保持输入序=repo rowid 确定序；id 字典序决胜已删——uuid 彩票）」；lineage.repo.ts:80-81 与接口注 :104 的「created_at,id」声明同步为 rowid（接缝归责，防⑤同型声明漂移）。notes.repo.ts:87-88 LIKE 注释补决胜键说明一行。papers.repo.ts:14-15 头注 listAllIds 行补「rowid 决胜——corpusSet 全库取数序稳定=INV-17 同库重导出幂等」。papers.queries.ts:17「附决胜键保证同键时分页稳定」原句保留（语义保持），尾补 rowid 方向说明。
rowid 边界三门沿用缺陷③先例结论：全涉及表（lineage_nodes/lineage_edges/papers/notes）非 WITHOUT ROWID、TEXT 主键非 rowid 别名、仓库零 VACUUM——插入序语义成立。消费链亲核：corpus.export.service.ts:365 `orderAiNotes(deps.repos.aiNotes.listByPaper(id))`——输入=缺陷③已修的 rowid 确定序，「稳定排序保持输入序」链路闭合。

## 2 文件清单

改动（git status 实面）：
- src/main/db/repos/lineage.repo.ts（2 SQL+2 注释行）
- src/main/db/repos/papers.repo.ts（listAllIds 1 SQL+头注 1 行——第六雷）
- src/main/db/repos/papers.queries.ts（ORDER_BY 三条+注释 1 行扩写）
- src/main/db/repos/notes.repo.ts（1 SQL+注释 1 行）
- src/main/services/export_/corpus.assemble.ts（comparator 末级重写+头注）
- tests/unit/db/repos/lineage.repo.order.test.ts（**新建**，缺陷③ ai_notes.repo.order.test.ts 同型）
- tests/unit/db/repos/papers.repo.test.ts（受锁扩：+1 裸 describe 4 it——searchSummaries 三键+listAllIds）
- tests/unit/db/repos/notes.repo.test.ts（受锁扩：+1 裸 describe 1 it+describe 导入）
- tests/unit/services/corpus.assemble.test.ts（受锁扩：+1 裸 describe 2 it+导入面扩）
- locks/manifest.json（137→138）

产物（本单元落盘）：本报告+scripts/audits/sweep-order-impl-verify.log。
临时文件 scripts/audits/sweep-order-probe.mjs（引擎平局序探针，测试设计依据）**用后即删**，未留残留。
新增测试全部 always-active 裸 describe（不经 guardedDescribe——ADR-0017 K3 面）；新注释零 SR2 工单号引用（无工单单元，check-tickets 通过=verify 链实证）。

## 3 TDD 红证（四档）

首红（对现状，未修前跑）：前五雷 4 文件 **7 failed | 41 passed**——lineage nodes/edges、papers added_desc/year_desc/title_asc、notes selectByLike、corpus 三键全平 it 全红；第六雷（主控裁决追加）单独首红 **1 failed | 22 passed**（listAllIds it——现状 id DESC 对反序 id 直插夹具确定性必红）；红因均为「现状 id 决胜/无决胜键给出与插入序确定化相反的序」，非夹具错。corpus 主键序 it 为特征化锁（现状即绿，属自裁申报 6.1）。
绿（修后）：前五雷 4 文件 48/48；第六雷 23/23；全量 **90 文件 661 用例全绿**（基线 89/652+1 文件+9 用例，零涟漪——含 lineage-import/library/corpus-export 等既有序断言面）。

变异红证（cp 备份法，每轮「备份→单点变异→恰中专属 it→cp 还原→diff 空」，禁 git checkout）：

| 轮 | 变异（单 token/单表达式） | 结果 | 还原 |
| --- | --- | --- | --- |
| R1 | lineage listNodesStmt `rowid`→`id` | nodes it 红 / edges it 绿（1 failed 1 passed） | diff 空 |
| R2 | lineage listEdgesStmt `rowid`→`id` | edges it 红 / nodes it 绿 | diff 空 |
| R3 | papers added_desc `p.rowid DESC`→`p.id DESC` | 仅 added_desc it 红（1/22） | diff 空 |
| R4 | papers year_desc 删 `, p.rowid DESC` | 仅 year_desc it 红 | diff 空 |
| R5 | papers title_asc `p.rowid ASC`→`p.id ASC` | 仅 title_asc it 红 | diff 空 |
| R6 | notes `rowid DESC`→`id DESC` | 仅 selectByLike it 红（1/4） | diff 空 |
| R7 | corpus `return 0`→还原 id 三元式 | 仅三键全平 it 红（1/20） | diff 空 |
| R8 | corpus ROLE_ORDER `'first-read': 0`→`9` | 仅主键序 it 红 | diff 空 |
| R9（第六雷） | papers.repo listAllIds `rowid DESC`→`id DESC` | 仅 listAllIds it 红（1/23） | diff 空 |

每条 ORDER BY/比较器分支均有专属红证 it——删除任一处修复必被 CI 拦截，锁面无空洞。

## 4 测试证据（verify 真退出码）

`npm run verify`（终态=文件已重锁后跑；第六雷并入后**重跑**）全链 quality+ tickets+ locks+ lint+ typecheck+ test+ build：
**VERIFY_EXIT=0**，落盘 scripts/audits/sweep-order-impl-verify.log（UTF-8 验证无替换符）。关键行：
- quality 检查通过：无占位标记 / 无乱码 / 无跨域引用
- locks 检查通过：138 个受锁文件与 manifest 一致
- Test Files 90 passed (90)；Tests 661 passed (661)
- build ✓（三段 built）
工单面零触碰（registry 未读改；tickets:check 过）。

## 5 locks 实录

unlock（137 文件）→批内改三受锁测试→写新测试→`locks:generate`（-GenerateOnly，138 条，新路径
tests/unit/db/repos/lineage.repo.order.test.ts 入册 sha256=b8708db5…0870，磁盘 sha256sum 亲验一致）
→`locks:apply`（重锁只读，138）。**第六雷轮**（主控裁决追加）：再 unlock→papers.repo.test.ts 扩 1 it+
papers.repo.ts 修 :217→`locks:generate`+`locks:apply`（仍 138 条——papers.repo.test 哈希随内容更新，
无新路径）→终态 verify 重跑落盘。
**过程失误申报**：首五雷 verify 前误执行了一次 `locks:unlock`（对只读属性的过虑）——verify 本身只读文件
不受影响且 locks:check 在其中通过；verify 结束后立即 `locks:apply` 恢复锁定，并在**锁定终态**复跑 verify
落最终日志（本报告 §4 数字取自第六雷并入后的终态轮）。

## 6 自裁申报（超票面决定+删减面自查）

1. **corpus.assemble 主键序 it（超票面测试面）**：orderAiNotes 此前零直接测试覆盖，我改比较器而主键分支
   （role→question→createdAt）无锁=改动盲区，故补 1 个特征化 it（乱序入参重排断言）+R8 变异红证。票面只
   指定三键全平 it。
2. **papers.queries :17 注释扩写**：票面「:17 注释行『附决胜键』语义保持」——原句逐字保留，尾补 rowid
   方向说明（先例=缺陷③头注扩写同型）。
3. **lineage.repo 两处注释同步（:80-81/:104）**：票面只列 SQL 两处，但「created_at,id」声明留着即复刻⑤
   同型声明漂移——接缝归责纪律驱动，属票面精神内最小同步。
4. **year_desc 测试形状=带 year 过滤**（票面未指定形状）：探针实证（EXPLAIN QUERY PLAN）无过滤形状下现状
   平局序=SCAN idx_papers_year→同 year 内 rowid DESC，与新语义**同向不可红**；带 `year=2024` 过滤形状
   现状=SEARCH 索引+末键临时 B 树→平局保持扫描序 rowid ASC→必红；修后显式 `rowid DESC` 输出与计划无关。
   首红实证 7/7 已含此 it。
5. **行尾假阳性事件**：MSYS `grep -c $'\r'` 对纯 LF 文件误报 CR 计数——node 字节级（CR-bytes=0）+
   `git ls-files --eol`（i/lf w/lf）双重仲裁，五涉改测试文件纯 LF（与缺陷③先例同口径）；git diff --stat
   142 insertions/16 deletions 纯逻辑变更无行尾噪音。
6. 删减面自查：票面五处修法+四处测试回归锁+主控裁决追加的第六雷（listAllIds）**全覆盖零删减**；简报④
   纪律逐条兑现（npm run test 未裸 npx；变异 cp 备份法；UTF-8；禁新依赖——零新依赖）。

## 7 疑虑与处置（移交主控/门审）

1. ~~papers.repo.ts:217 listAllIds 同型残留~~ → **已处置（主控 2026-08-28 裁决：追加为第六雷，本单元内修）**：
   `ORDER BY added_at DESC, rowid DESC`+受锁扩 1 it（同 added_at 两行 id 反序直插，断言=插入序倒序）
   +TDD 首红（1 failed 22 passed）+R9 变异红证+终态 verify 重跑 EXIT=0。理由登记=其序直接进 manifest
   papers 数组，批量导入同毫秒多篇为常态触发面，抖序破坏 INV-17「同库重导出逐字节稳定」。
2. year_desc 首红依赖现状查询计划（已 EXPLAIN 实证+记录）；修后断言与计划无关（显式第三键），但该 it 的
   「防退化」强度在无过滤形状下弱于其余 it（见 6.4）——已用 R4 变异（删第三键）在过滤形状下红证补强。
3. 台账发现 3 同型雷清单状态行未翻（缺陷③先例=主控收口时翻状态）——主控职责，未动。

## 8 成本账本（ADR-0017）

实现者两轮：首轮约 0.95M token / 约 40 分钟；第六雷追加轮约 0.10M token / 约 6 分钟（含 verify 复跑+R9）。
合计约 1.05M token / 约 46 分钟（含 verify 三轮+九变异轮；探针 1 次）。无回炉轮（门审在后续独立屋）。
