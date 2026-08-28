# R1-WS1 门二终审档（gate2）

> 审计对象：课题域主进程终态（回炉后 diff 1359 行）——装配容器化+workspaces
> IPC 域+遗留迁移+W1/W2 回炉三 it。铁律遵守：只读仓库（含门一审计档），
> 唯一写=本档；未跑 npm/未跑测试/未 git 写（sha/行数/git status 均只读取证）。
>
> **开工记录（宪法·技能清点）**：code-review-excellence=用（终审核心）；
> verification-before-completion=用（四清单逐项对终态实物）；TDD/
> systematic-debugging/subagent-driven-development=不用（只裁证据不写实现
> 不调试——禁跑测试面）；浏览器/部署/文档生成类=不用（与只读终审无涉）。
> 配置自查：门二席位于只读审计配置，无派发面。

## 统计行

```
检查面：1 处置核对（门一 3W+4N 逐件+回炉三 it 语义对齐）+ 2 母本符合度
（票面 P1-P5+ADR+六自裁两项证据链独立复核）+ 3 红线六面（含受锁 146 条
sha256 独立重算）+ 4 机器面三数理 + 5 成本账本
发现：Blocker 0 | Warning 1（W4 死断言）| Note 1（N5）
证据：verify 终态 97 文件 761 用例全绿 VERIFY_EXIT=0 / locks 146 条四受锁件
sha256 独立重算全匹配 / e2e 24 passed 0 skip E2E_EXIT=0 / 首红 import 失败
形态（1 failed|96 passed，746 基线实测）/ 变异 A/B 现态复证+还原双 diff 空
标注+现态 grep 复核还原完整
裁决：PASS——放行提交（W4 非正确性缺陷有同型补偿，处置建议见 W4 节）
```

---

## 清单 1：门一 findings 处置核对（「说了没改」扫描）

| 门一件 | 处置 | 终态实物核对 |
| --- | --- | --- |
| W1（L0 switch 双段链零覆盖） | 已回炉 | W1-a（workspace.test.ts:354-370）：list 只见 default → switch('default')=物化+提前返回——close×1/装配恰 [default] 无二段重建/p0 不丢/根库清空/指针=default/会话句柄活。逐条对齐门一指定「materialized && req.id===DEFAULT_WS_ID 提前返回分支」。W1-b（:372-393）：create(B) 不切指针 → switch(B)=close×2+装配序列恰 [default(物化), B(切换)]+default 旧句柄失效+B 句柄活+default 行完整+根库不存在+指针=B。对齐「双段切换分支」。✓ |
| W2（装配失败重试幂等无测试） | 已回炉 | W2 it（:395-408）：failNextAssemble 注入 → 首次 switch 上抛 /装配失败/ → 重试不被 CONFLICT 拒（busy 已释锚定）→ 成功后指针终态=B+首败前旧句柄已关+装配恢复句柄可用。与主控裁决记录字面（失败注入→中文错误→busy 释放→重试成功指针终态一致）逐条一致。✓（形态注记见 N5） |
| W3（组合回归锁缺口） | 归 WS2 | r1-ws2-brief.md P4 含新 e2e tests/e2e/workspaces.spec.ts：旧布局种子→启动迁移→新建 B→reload 空态→切回 default 在场——必经 renderer 真实 invoke workspaces/list+create+switch，即「bootstrap 实际组合 workspaces 域」的 e2e 级回归锁。归口面已在 WS2 票面在册。✓ |
| N1-N4 | 建议项不阻断 | N1（readMeta createdAt='' 空串）/N2（头注补读侧瞬态行）/N3（liveProxy bind/set 注记）均归 WS2 消费/文档面；N4（票面陈数）非实现者责任。终态无对应必改项——非「说了没改」。✓ |

「说了没改」扫描结论：门一 3W+4N 全部有处置且处置与终态/归口票面对得上，
无悬空项。回炉申报「零实现变更」双重佐证：(a) 现态 grep 与门一审版 diff
全文一致（busy 守卫三处在 :151/:165/:182、needsLegacyMigration 完整实现
:146-151）；(b) 3 it 一次绿（verify.log 回炉节 14/14）。

## 清单 2：母本符合度终核（票面 P1-P5 + ADR-0018 + 六自裁）

- **P1 容器化** ✓：assemble(dataDir) 闭包外参保持全部与库无关项（广播/
  contactEmail/zcodeBaseDir/templateDir/http/aiSensorRootDir——bootstrap 终态
  :82-167 逐项在位）；Proxy facade 形态自裁经门一裁合法；ipc/index.ts 与
  ipc/register.ts 零 diff=git status 实证（两文件不在修改面）+文件内零
  workspaces 字样（grep 空）。
- **P2 目录约定** ✓：id=ws-+8hex 短随机（workspace.fs generateWorkspaceId）、
  用户名不入路径、meta.json、指针原子写 tmp+rename；常量四件只住
  workspace.fs.ts——shared/constants.ts 不在 git 修改面（实证）。
- **P3 遗留迁移** ✓：幂等+条件强化（遗留 db 在 && default 库不在）+搬移序
  files→wal→shm→db（提交点）→meta→指针；崩溃断点续迁有专测。
- **P4 IPC 域** ✓：四通道严格 schema+WORKSPACE_NAME_MAX=40 单源+contracts
  新 it（四通道在表/名长 1-40 边界含端/Res 形状）；preload/client 零改动
  机制面=表驱动自动暴露（两文件无 workspaces 字样实证，PreloadApi 全量映射）。
- **P5 不做面** ✓：无课题删除/跨课题检索/切换通知（终态 diff 全文核过）。
- **ADR 逐节** ✓：库级分目录/全局指针/容器 facade/busy 守卫/迁移兼容
  （e2e 24 全过）/ai-sensor 协议根保持全局（bootstrap 注释明示）/INV 登记
  （INV-35 终态在册，见清单 4）全部兑现。
- **L0 态偏差裁决复核（门一 A-2）**：证据链独立复核成立——
  tests/e2e/seed-paper.mjs:12-17 `new Database(SEED_DB)` 后直接
  `INSERT INTO papers` **无任何建表**（SEED_DB 必须已持 schema，空库上必崩
  →子进程退出码非 0→seedPaperRow reject→spec 红）；tests/e2e/e2e-env.ts:62
  `SEED_DB: join(userData, 'synapse.db')` **写死根路径**（受锁 helper）。
  若首启按票面 P2 字面建 workspaces/default 则根 synapse.db 不存在→种子
  INSERT 崩→8 spec 24 测大面积红。L0（首启库在根、不建 workspaces/、物化
  延迟）是票面 P2+P3 字面矛盾（首启时迁移条件天然假+P2 命令建 default）的
  最小消解且受锁 e2e 零改动。「既有用户数据零丢失」经路径 2/3 推演+测试
  锚定成立。**维持门一裁决：非设计缺陷，无需修正案。**
- **db 直连上提 main 根裁决复核（门一 B-4）**：eslint.config.js:154-168
  分层线实证——`files: ['src/main/services/**/*.ts']` 禁 `**/db/connection*`
  与 `**/db/migrate*`，语义=「services 只能经 repos 访问数据库」；main 根
  （src/main/*.ts）无此禁令，且原 bootstrap 本就直连 openDatabase/migrate
  （装配面先例）。workspace-layout.ts/data-layer.container.ts 与 bootstrap
  同权落位；workspace.service.ts（services/ 下）零 db import、空库迁移经
  initWorkspaceDb 注入。**维持门一裁决：非字面绕行，分层语义正确落位。**
- 其余自裁（busy 三变更/可选域/五方法对账/rename ack）：门一已逐条裁且
  补偿面核对无新变化，维持。

## 清单 3：宪法红线终审

- **分层** ✓（见清单 2 复核）；ipc→services→repos→db 单向保持，域对象经
  facade 返回后方法落真实对象（liveProxy bind owner）。
- **受锁** ✓：manifest 146 条（node 读档独立计数=146，145→146 增量=
  +tests/unit/services/workspace.test.ts）；**四受锁件 sha256 以
  crypto.createHash 独立重算逐一与 manifest 匹配**（workspace.test/schemas/
  api-surface/contracts 四件 match=true）——锁与工作区终态同步，无跨提交
  延迟重生成面。时间序=unlock→改→generate→apply 两轮（初轮+lint 重构后、
  回炉后 17:11:51 二次 apply），locks:check 绿（verify.log:34）。manifest
  中唯一含 preload 的条目=tests/contracts/preload-surface.test.ts，
  src/preload/index.ts 与 docs/invariants.md 不在锁内（直改合法，本单两者
  均零改动无涉）。
- **行数** ✓（wc -l 实测）：workspace.test.ts 448（回炉 343→448，≤500）；
  workspace.fs 180/workspace.service 200/workspace-layout 77/
  data-layer.container 95/bootstrap 224/contracts 124——全部 ≤500。
- **UTF-8/占位** ✓：七个改动/新增文件 grep TODO|FIXME|placeholder 净
  （exit 1）；中文内容 Read 全程可读；quality:check mojibake 关卡绿。
- **TDD 四档** ✓：
  1. 首红=测试先建跑红：first-red.log 尾部 Failed Suites 1
     （workspace.fs 不存在 import 失败）+1 failed|96 passed+746 tests
     ——真实红形，基线 96/746 实测在案；
  2. 变异 A（删 busy 守卫）=1 failed 恰中 busy it、MUTA_EXIT=1；
  3. 变异 B（needsLegacyMigration 恒 false）=3 failed 同因果链、MUTB_EXIT=1；
     均在 lint 重构后现态复证（17:0x），cp 备份法还原双 diff 空标注
     （RESTORE_A2/B2_DIFF_EMPTY）+复跑 11 passed；
  4. 回炉零实现变更的绿=14/14 一次绿+现态与门一审版 diff 逐段 grep 一致
     （变异还原完整性独立复核）。变异证据在 11-it 版本跑、回炉（17:11）
     零实现变更故仍锚定当前实现——时间序注记（变异杀实现、实现未动）。
- **方案切换=删旧** ✓：旧装配段整体替换（bootstrap +112/-46），无双方案
  并存；改动面 git status 与报告清单完全对应（M 六件+新五件），untracked
  其余为主控其他票面文件（r2/r3 brief），非本单泄漏。

## 清单 4：机器面

- **761=758+3 数理一致** ✓：verify.log:2033-2034 终态 97 文件/761 用例
  全绿；回炉节申报 758→761（+3 it=W1-a/W1-b/W2）；回炉前初轮 verify
  VERIFY_EXIT=0（97 文件 758）在 verify.log:2093。首红基线 96/746→
  初轮 97/758（+1 文件+12=本单 11+contracts 1）→回炉 761——三段增量
  闭环自洽。
- **e2e 24 passed** ✓：e2e.log 逐条 24 ok（0 skip）+24 passed (1.2m)+
  E2E_EXIT=0——迁移兼容验收达成（种子配方=路径 1+2 端到端全链实证）。
- **INV-35 终态核对** ✓：docs/invariants.md:49 在册——课题库单活三联
  （①至多一库打开+L0 硬前提声明 ②busy 互斥 CONFLICT 中文 ③指针三态降级
  +断点续迁），锚定声明（单测面清单+e2e 24+双变异）与实际测试/证据对应，
  「renderer 切换面 reload 语义随 R1-WS2」边界声明正确。

## 清单 5：成本账本行

| 环节 | token（约） | 时长 |
| --- | --- | --- |
| 实现者初轮 | 11.15M | 30.7min |
| 实现者回炉（W1/W2） | 2.03M | 4.1min |
| 门一对抗深审 | 0.78M | 5.7min |
| 门二终审（本席，自报估算） | ≈0.6M | ≈7min |

## 本席新发现

### W4 [Warning] 受锁测试死断言：workspace.test.ts:439 第二断言被行尾注释吞掉

终态实物（cat -A 铁证）：

```
expect(() => layerA.prepare('SELECT 1')).toThrow() // 旧库已关    expect((container.services as unknown as { marker: string }).marker).toBe(dirB)
```

`marker).toBe(dirB)` 断言全文位于 `// 旧库已关` 之后至行尾（$）——**注释
内代码，永不执行**。该 it 名「services/fileStore 经 facade 活指向当前课题」
承诺 services 热换面，但「热换后 services facade 活指向新课题
（marker===dirB）」的直接断言实际死亡——测试覆盖虚报（违反宪法测试纪律
「每个测试必须能失败一次」的精神：该断言无失败机会）。diff（门一审的
1255 行版与终态 1359 行版）同形态=初版即存在，门一未察觉、实现者报告
未申报（推断为编辑事故：两行粘合）。

**判 W 不判 B 的依据**：(a) 实现无缺陷——liveProxy 工厂对 services/
fileStore 结构对称（data-layer.container.ts:439-440 同工厂同构），且同
describe 内有真实活断言锚定同一机制：:431 marker===dirA（装配初值）、
:440 fileStore 热换后指向 dirB（同 liveProxy 工厂）、:443 papersFileRef
活指向+行 446 重建关旧库——services 域热换仅缺直接断言、机制面大部分
在锚；(b) 非安全/分层/数据正确性问题；(c) 测试恒绿是真绿（其余断言全部
真实执行且经首红-变异链验证）。

**处置建议（主控三分法裁量，二选一）**：
- **(a) 推荐——WS1 微补丁二轮回炉**：unlock→将 :439 拆为两行（断言复活，
  预期一次绿——补偿断言在位）→generate→apply→verify 留证→[locked-change]
  尾注随收口提交。10 分钟级。收口单不得顺手改（收口禁改代码）。
- (b) 归 WS2 票面前置项（WS2 切换器单测自然触碰 services facade 面）。
  风险=欺骗形态存续期间后人误信该断言存在。

### N5 [Note] W2 落地形态与门一括号建议的轻微偏差

门一 W2 括号建议含「断言容器中文错误」（指装配失败后容器空态、后续经
facade 访问见 requireCurrent 的「课题数据层未装配」，container:433）。
落地 W2 断言的是 switch 上抛的中文错误（夹具模拟「装配失败：模拟课题库
被占用」）+重试链——满足主控裁决记录字面；但 facade 空态中文错误
（INV-02 族）无直接单测锚定。建议随 W4 微补丁顺手补一行（failNext 后
断言 container.services 访问抛 /课题数据层未装配/）。

## 总评与裁决

终态质量与门一评价一致：状态机完整（六态+五跨格序列头注）、8 路径推演
无数据分裂路径、迁移语义（提交点/断点续迁/幂等）全锚定、回炉三 it 与
门一指定语义逐条对齐且零实现变更、五件证据链（首红/双变异+还原/verify
真退出码/e2e 真退出码/locks 146 同步）齐全、sha256 独立重算全匹配、
改动面与申报完全对应。门二独立复核门一两项关键裁决（L0 态=db 上提
分层）证据链均成立。

**PASS——放行提交。** 附带条件性建议（不阻断）：W4 死断言以 WS1 微补丁
收口前修复为佳（主控裁量 (a)/(b)）；W4 若走 (a)，建议 N5 同补丁收口。
收口单亲验清单：verify 真退出码+locks:apply 146+diff 范围+registry 翻
状态+[locked-change] 尾注（manifest+四受锁件随提交）。
