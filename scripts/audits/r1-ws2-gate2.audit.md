# R1-WS2 门二终审（课题切换器渲染层——回炉后终态）

> 审计人：门二独立子代理 · 2026-08-29 · 只读仓库（唯一可写=本档；禁 npm/禁测试/禁 git 写）
> 输入：r1-ws2-gate1.diff（1045 行=回炉终态）/ r1-ws2-brief.md / ADR-0018 /
> r1-ws2-impl.report.md（§11 回炉节）/ r1-ws2-gate1.audit.md（0B/4W/10N）/
> r1-ws2-verify.log（02:07 回炉后版，末尾「== 回炉」节）/
> r1-ws2-vitest-rework.log·r1-ws2-e2e-rework.log（回炉后全量）/
> r1-ws2-{vitest-full,e2e-full}.log（回炉前基线）+ 终态源码实物抽查

## 0. 开工记录·技能清点（宪法会话开工纪律）

- code-review-excellence=用（门二终审职责本体——W 处置实物 vs 裁决语义核对）；
  verification-before-completion=用（四清单机器面逐证据验证，不采信转述）。
- systematic-debugging/TDD/subagent-driven-development=不用——只读终审禁跑
  命令禁改码，无调试与实现面；审查方法已由上述两技能覆盖。
- 配置自查：本代理零派发面、只读仓库，无模型等级影响面。

## 统计行

**门二 R1-WS2 终态：PASS —— 放行提交：是（附移交项 2 条，均非本单面）**

## 1. 处置核对（门一 W 裁决 vs 终态实物）

| W | 裁决语义 | 终态实物 | 判定 |
| --- | --- | --- | --- |
| W2 假绿窗（必改） | 缺席断言前先锚「加载终态」 | workspaces.spec.ts:51 `toBeHidden('正在加载文献列表…')` 先于 :53 `toHaveCount(0)`；锚源与 LibraryPage.tsx:99-103 加载行文本同源，`{loading && <p>}` 与 `<PaperList>` 同一组件渲染块=同 commit 置/清位，声明成立 | ✓ |
| W1 error 只写不读 | 内联错误行+重试复用 load+新 it | WorkspaceSwitcher.tsx:96-105 `aria-label="课题列表错误"`（var(--danger)）+「重试」`void load()`（非 toast，持续展示型）；新 it「列表失败 error 内联呈现」锁内联+重试双面（该文件 6→7 it）；store 头注「写 error 供内联展示」→Switcher 头注登记兑现点→测试锁定，契约三点闭环 | ✓ |
| W4 deny 面零锚 | 抽纯函数+单测锚定 deny 面 | main-window.ts:79-81 `export shouldBlockNavigation`（严格 `!==`）+头注安全语义（「任何变体 URL 均不落入放行面」）；will-navigate 经纯函数接线（:124-126）；main-window-navigation.test.ts 3 it=allow 1（同 URL）+deny 2（外站 https+异 file / data: html+base64 双探）双面同文件同锁 | ✓ |
| W3 invariants 登记 | 主控收口职责，不入本单回炉 | `git diff HEAD` 名单无 docs/invariants.md——WS2 确未触碰 | ✓（裁决一致，移交主控） |

**W2 锚强度补证**：缺席断言仅一处且已前置确定性锚；快路径（断言首查时 load 已完成）papers 已 commit、慢路径（load 在飞）toBeHidden auto-retry 等到 loading 清位——两方向假绿窗均闭。其余断言（toContainText/toBeVisible）为等待出现型，auto-retry 无假绿窗面。

**「说了没改」扫描**：新文件头注四项声明（store 错误契约/Switcher 内联兑现登记/main-window 双面锚定/测试 always-active）逐项实物兑现；报告 §11 五项声明（verify exit=0、log 回炉节、locks 149→150、行数限内、专项+全量数据）与 log/实物逐一对上。唯一出入=报告 §11 行数自述 Switcher 193/main-window 198 vs 实测 177/192（见 N-2，不触红线）。

## 2. 母本符合度终核

- 门一已核 P1~P5+自裁①~⑦（维持）；回炉增量零票面偏移——W1 补强 P2 错误呈现面、W2 补强 P4 e2e 锚强度、W4 补强自裁①（will-navigate 放行）的安全锚定，均不动票面声明的行为语义。
- P4 验收场景链终态完整：旧布局种子→迁移兼容启动→默认课题+种子文献在场→新建 B（dirty=false 直切）→库空（已确定性锚）+脉络空态真实文本（「暂无脉络图——导入草稿或添加节点」）→切回 default→文献在场。
- ADR-0018:23-24 渲染层裁决字面吻合（确认 dirty 复用 quit-dirty 聚合→IPC switch→`location.reload()` 全新 stores 零 stale 态）；:29 v1 边界（不做删除）零越界。
- 分层/导入面维持：回炉增量未新增 import 面（W4 测试仅 import main-window 纯函数；W1 错误行仅用既有 theme 变量）。

## 3. 宪法红线终审

- **受锁时间序**：146→149（初轮 +3=workspaces.spec/workspace.store.test/workspace-switcher.test）→150（回炉 +1=main-window-navigation.test）；manifest 实物 150 条、generatedAt 2026-08-28T18:04:45.3Z 与 diff 一致；locks:check「150 个受锁文件与 manifest 一致」（verify.log:34）；apply 与工作区即时同步（未提交态无跨提交延迟）。✓
- **行数**：全部 ≤500——main-window 192 / Switcher 177 / workspace.store 108 / WorkspaceSection 151 / SettingsPage 185（组件亦 ≤250）。✓
- **UTF-8**：`file` 实证三代表文件 UTF-8 Unicode text；全档中文工具可读。✓
- **占位/死代码**：新面 grep 无 TODO/FIXME/placeholder；quality 段绿（verify.log:15）。✓
- **TDD 四档**：①初轮首红（两测试文件 import resolve 失败）②初轮 store 双变异恰中性红证+cp 备份还原 ③回炉 W1 新 it 首红（`error 应内联渲染: expected undefined to be defined`）→绿 7/7 ④W4 变异（`!==`→`===` 3 it 全红）→cp 还原 diff 空。四档在案；③④无独立 log 落盘（门一 N9 既有记录——报告内联引用，测试真实存在且通过有 verify.log:149/1252 佐证，可复核性降级非缺陷）。✓
- **always-active（K3）**：四个测试文件均不经 guardedDescribe（唯一 "guarded" 命中=头注声明文字「不经 guardedDescribe」）。✓
- **安全禁令**：shouldBlockNavigation 为收紧方向（严格等值唯一放行面=同 URL 重载）；无新出网 host/eval/new Function/innerHTML；windowOpenHandler/permissionPolicy/安全 flags 零触碰。✓
- **git status 范围**：5 改（manifest/main-window/App/SettingsPage/registry-TicketArea=主控修复归因）+6 新，与票面+申报面完全一致，无蔓延。✓

## 4. 机器面

| 项 | 结果 |
| --- | --- |
| 数理一致 | 100 文件 779=775+4 ✓：+1 文件=main-window-navigation（3 it，verify.log:149）+W1 1 it（switcher 6→7，:1252）；store 8 it 恒定（:1853）；总计 779（:2074）逐条对账 |
| e2e | 25 passed（rework log 02:06：workspaces.spec 1.8s；全链真实 IPC 无 mock）✓ |
| verify exit=0 | verify.log（02:07 回炉后）&& 链 quality→tickets→locks(150)→lint→typecheck→test(100/779)→build 全段执行完毕且 build 绿——链任一段非 0 即断，走完 build=exit 0 充分证据；「exit=0」附录自述与链证据互洽 ✓ |
| WS1 TicketArea 修复入位 | typecheck 绿实证；registry.ts:34 `'workspaces'` 实物在册+diff hunk 归因主控（[locked-change] 语义，属其权限面）✓ |

## 5. 成本账本行（R1-WS2 全周期）

| 单元 | token（≈M） | 时长 |
| --- | --- | --- |
| 实现者初轮 | 6.97 | 25.4 min |
| 实现者回炉 | 3.31 | 7.0 min |
| 门一 | 2.01 | 8.5 min |
| 门二（本档） | 0.55（自报近似） | ≈6 min |

## 移交主控收口项（非本单面，不阻塞提交）

1. **W3 invariants 登记**（裁决既定）：INV-35 补 renderer reload 语义一行；可顺带 N10（switch 竞窗跨库写由 FK 兜底为失败）一句话声明。
2. **N-1（新观察）** locks/manifest.json 工作副本为 CRLF——.gitattributes 强制 LF，`git add` 时自动转换入库为 LF；锁校验按受锁文件内容哈希、不受 manifest 自身行尾影响，**无需动作**，提交时留意即可。

## N 级观察（记录在案）

- **N-2** 报告 §11 行数自述 193/198 vs 实测 177/192（统计口径噪声，全部远低于上限）。
- **N-3** WorkspaceSection 不读 error（设置面列表失败时静默空列表）——nav 常驻错误行+重试全局可见已兜底，且 Section 与 Switcher 同 store 同数据；观察不改。
- 门一 N7（动作型失败/空输入提示测试留白）、N9（首红/变异证据卫生）沿用记录。

## 终审裁决

**PASS。放行提交。** 门一 0B/4W 终态核销：W1/W2/W4 回炉实物全部兑现且锚定质量高于裁决最低线；W3 按裁决归主控。机器面四项全数理一致，verify exit=0 证据链完整，宪法红线零触碰。剩余事项均为移交项与 N 级观察，无一阻塞。
