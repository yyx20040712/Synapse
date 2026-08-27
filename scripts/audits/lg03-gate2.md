# SR2-LG-03 门二终审（Gate 2 Final）

日期：2026-08-27 ｜ 审者：门二终审孙代理（独立于实现者与门一）｜ 铁律：只读（唯一可写=本文件）
输入：LineageBoard.tsx 票面头注 / ADR-0014 / lg03-diff.patch（回炉前，终态以工作树为准——重点文件逐一重读）/ lg03-impl.report.md（含回炉节）/ lg03-gate1.md（含回炉复核）/ lg03-*.log 七份 / locks/manifest.json / docs/invariants.md / lineage.service.ts

技能清点（宪法开工纪律）：**用** code-review-excellence（终审深审）+ verification-before-completion（DoD/机器面对账）；**不用** TDD/systematic-debugging（只读无实现/调试面）、git 类改动性命令（铁律禁，仅 status/diff 只读）、浏览器/数据工程类（无交集）。配置自查：门二独立角色、高思考档，符合三屋模式隔离。

---

## ① 处置核对（门一 3W/7N+候裁 A/B+回炉记录 vs 终态实物）

| 项 | 门一裁决 | 终态实物核验 | 判定 |
|---|---|---|---|
| W1（6→7 处计数） | 收口按 7 处 | lineage.service.ts:272/284/289/292/299/307/314 恰 **7 处** `throw new LineageDomainError('CONFLICT',…)`（upsertNode 幽灵 1+upsertEdge 六守卫）；报告自裁 1+回炉节②两处均已改「7 处」 | **ADDRESSED** |
| W2（mutation log 缺实施命令痕迹） | 补命令实录 | lg03-mutation.log:5299-5309：M1/M2/M3+MUT-RW 四轮 cp 备份→node -e 变异→npm run test（EXIT:1）→cp 还原→diff 空 RESTORE-DIFF-EMPTY 全命令实录在档 | **ADDRESSED** |
| W3（红档措辞） | 精度修正 | 报告 :88-94 已补「构成=board 10 用例构造级断言红+store-write 文件级模块红…用例级红证由变异 M1/M2 承担」 | **ADDRESSED**（残余分解误差见新发现 W4——同族文书计数问题，非本项裁决面） |
| N1（selectedNodeId 零消费） | LG-04 票面责任，备案 | 回炉节③记录+疑虑段指针句在档；终态零改动（LineagePage:23 驻 state 空消费，头注注明 04 消费面） | 记档闭合 |
| N2/N3/N4/N5（UX 边缘/松手 k/合并丢 reparent 标记/useEffect 依赖） | 记档不拦 | 终态均维持现状未顺手改动（Board/Canvas/store 实读核对）；N3 zoom+drag 归 LG-05（Canvas 头注同申明） | 记档闭合 |
| N6（Canvas 250 恰线） | 后续扩展先拆 | 终态 wc 249（split 计数 250=恰线）；头注+报告疑虑段双声明 | 记档闭合 |
| N7（树拒绝无重试路径） | 门一复核④裁定票面一致 | 复核④论证成立（票面「重试按钮」限定域=error 态系统型失败；树拒绝非保存失败；用户级重试=重新发起连线） | 裁定维持 |
| 候裁 A（DomainError 升级） | 主控追认 | 追认字样两处落地（报告 :155+:253）+追认理由（toAppError 折叠机制）入条目；:255/:263 另两处普通 Error=importFromFile 文件 IO/JSON 解析**系统型**错误（非树守卫面），保持普通 Error 正确（renderer 侧 catch 兜底「导入草稿失败」）——非漏改 | **落地** |
| 候裁 B（导入入口回炉） | 回炉补最小面 | lineage-import.ts 41 行（confirm「导入将替换现有脉络图」字面=LG-01 票面+CANCELLED info toast+errors 汇总首条）；Board:138-146 按钮（data-testid="lineage-import"）；3 用例（board.test:421/442/455）+MUT-RW 红证 | **ADDRESSED**（门一复核详证，本审实物复核一致） |
| N-RW1（verify-rework 缺 EXIT 尾注） | 收口单补 | **已闭合**：lg03-verify.log 末行（:3628）「=== 回炉 1 轮 verify 终局 EXIT:0（84 文件 596 用例+locks 129+build 全绿——lg03-verify-rework.log 全文在上）===」——回炉终局时即已追加（报告 :264「真退出码追加 lg03-verify.log」）；证据链=verify-rework.log 全文+verify.log 尾注 EXIT:0 | **已补行** |

回炉记录三项（①导入入口②文书 W1/W3③N1 备案）与门一回炉复核判定一致，无遗漏处置。

## ② 母本符合度（票面五层 vs ADR-0014 保存语义/退出拦截/INV-04/22/27 逐节）

**ADR-0014:65-67 保存语义三条款**：
- autosave-first：✓ Board 工具条无「保存」按钮，编辑动作即经 store enqueue→flush 落库（四通道）；
- 失败不推进 savedAt（INV-04 同型不新立号）：✓ 系统型失败（flush 非 CONFLICT 分支 :176-180）saveStatus=error+lastWriteError+**数据不回填**（savedAt 等价面=数据回填+saveStatus 推进，失败均不推进）——INV-04 行本身未动（票面裁定同型沿用，store 头注 :22 显式引用）；
- 脏态投影：✓ useLineageDirty()=saveStatus≠saved（lineage.store:82-84）。

**ADR-0014 接缝条款（图视图工单自带，不动 TABS-04 冻结面）**：
- App.tsx:71 `useTabDirtyAggregate() || useLineageDirty()` 组合根单点扩——git diff 直证仅 +1 import+聚合行改写+3 行注释；
- **tab-dirty.ts 行为面零触碰字面实证**：git diff 仅头注 :14 区域 2 行注释（stale 声明更新「tabs∪lineage」），零代码行改动——TABS-04 冻结面合规；
- INV-22 扩面登记（invariants.md:36）：聚合信号构成已扩「tab dirty ∪ lineage dirty」+锚定状态更新「∪lineage 扩面=组件级锚定 2026-08-27 LG-03——e2e 面随 LG-05」——登记流程合规（docs/ 非 manifest 成员，直接改合法）。

**INV-27 消费（树守卫宿主=service）**：✓ Board 零守卫代码（pendingLink 直连 store，pendingLink 点击自己=service 自环拒绝 toast——自裁 6 字面遵从）；三拒绝路径=CONFLICT 折叠码→toast 中文 reason（flush :169-174）；INV-27 行已注「LG-03 只接线 IPC 不另写守卫」。

**票面行为层其余关键项抽核**（门一矩阵 11 项全覆盖，本审独立抽核 8 项）：拖拽 x/y 覆盖全字段载荷（moveNode :235-241）/加节点两型/加边目标选取/改父两动作+reparent 标记+**N5 部分失败语义**（writeFailToast :98-105 前缀「旧连线已移除，新连线未建立」+retry 只重发加边——remove-edge 已成功出队不重发）/remove-node 级联镜像（:129-135）/写读互锁（load :207-213 丢弃回置 ready）/写四通道 schemas（lineageUpsertNodeReqSchema/lineageIdReqSchema 共用/lineageUpsertEdgeReqSchema，全 strict）+api-surface 六端点（01 两+03 四）+ipc 薄分发零守卫+缺省归一（ipc/lineage.ts:41-60）——**逐项符合**。

**接口/架构/生命周期/文化层**：props 签名照票面（Board:96-99）；域内聚+三子组件拆分落地；renderer 全经 client 门面（lineage 域 grep 零 electron/node 导入）；负面清单遵守（core_idea=textarea 零 md 渲染；无 undo 栈混域）；INV-02 两型分清（读面 store.error 条+写面 toast/error 指示）。

## ③ 宪法红线终审

- **组件 ≤250**：wc 实测 Board 231/Canvas 249（split 250 恰线=N6 记档）/NodeMenu 77/AddNodeDialog 162/EditIdeaDialog 46/lineage-import.ts 41；store 278 ≤500——**全过**。
- **分层单向**：renderer→window.api（client 门面）零 Node/Electron；ipc→service 薄分发（守卫宿主=service，IPC 零守卫——ipc/lineage.ts 实读）；dialog 在 main（dialogs.pickJsonFile，INV-07）——**全过**。
- **受锁 129**：manifest node 计数=129 条；schemas.ts/api-surface.ts/两新测试路径全在锁（lineage-board.test.tsx/lineage-store-write.test.ts 实见于 manifest）；verify-rework.log:26「locks 检查通过：129 个受锁文件与 manifest 一致」；generatedAt 2026-08-27T07:10:28Z（本地 15:10）与回炉终轮同步——**跨提交同步纪律合规**；invariants.md 非 manifest 成员（门一已核 grep 0）直接改合法。
- **UTF-8/乱码**：本审实读 12 个交付面文件中文全部可读+verify quality 关（mojibake）绿——过。TODO/FIXME/placeholder：交付面 grep 零命中——过。
- **TDD 四档+回炉红证链**：red（EXIT:1 落盘尾注，11 failed/573 passed）/green（84 文件 593）/mutation M1-M3+MUT-RW（四轮命令实录+RESTORE-DIFF-EMPTY，变异-用例对应经门一 M2 段核实）/verify+verify-rework（初轮+回炉双 EXIT:0 终局尾注在 lg03-verify.log）——**链完整**。两实现缺陷绿档间被测试拦出（出队合并冲突/互锁卡 loading）+tsc 拦两处类型缺陷=测试有效性实证。
- **流程三条**：①受锁批内改每轮 unlock→改→generate→apply 闭环（报告声明+manifest 时间戳吻合）；②[locked-change] 尾注义务已入报告（schemas/api-surface/manifest/两测试）；③data-ticket 形态=open 期唯一绿形态（check-tickets 规则 4，翻 done 由收口单移除——规则 4b 拦残留）。

## ④ 机器面核对

- **84/596 数理**：文件 82+2=84 ✓（两新测试文件）；用例 573+23=596 ✓。**分解新发现（W4）**：实物=store-write **9** 用例+board **14** 用例（=初轮 11+回炉 3）；申报=store 10+board 10（初轮）/13（回炉后）——**总数链全自洽**（red 584=573+board 11 红：red.log:1086「11 tests 11 failed」实证+store-write 文件级 0 test 不计（:9「(0 test)」）；green 593=573+20；rework-red 596 总-2 红；verify-rework :134「9 tests」+:1268「14 tests」机器输出自证），分解数字差一=文书误差（vitest 输出全量在档可复核，非证据缺陷非瞒报）。
- **locks 129 不变（回炉只改既有）**：✓ 回炉面=lineage-board.test.tsx（既有受锁）+lineage-import.ts（renderer 实现面非受锁类）+Board——manifest 条目数 127→129（初轮 +2 新测试）后回炉零新增。
- **registry 翻 done 预演**：全仓 grep SR2-LG-03 全号（排除审计文书）=①registry 行（收口翻 done）②票面文件头注（工单号标注合法）③Board 根 div data-ticket（翻 done 移除——自裁 8+规则 4b）④lineage.spec.ts:38 DEPS 依赖数组（LG-05 声明面合法）——**票面外无非声明性残留，预演通过**。头注「工单：open / strong」字样建议收口时一并核对（LG-01/02 翻 done 先例形态为准）。
- **e2e 面 16+1 不变**：✓ 6 spec 文件 test( 计数=17（smoke 4/reader-text 8/ai-notes 2/zcode-link 1/corpus-export 1/lineage 占位 1）——既有 16 零触碰+lineage.spec.ts 占位恒真 test 由 skip 守卫（DEPS 含未 done 的 LG-04/05）延期，LG-03 未动 e2e——申明精确。
- **DomainError 升级对 LG-01 零回归**：✓ verify-rework.log:53 lineage-import.test.ts **22 tests passed**（受锁 toThrow 中文子串断言全绿——文案零改动实证）；升级面 diff 门一逐行核对过（纯类型包装）。

## 新发现（门二，均不拦）

- **W4（文书）**：用例分解申报 store 10/board 10+3 与实物 9/11+3 差一（证据见④——总数 20/23/584/593/596 全对）；红档构成修正节「11 failed=10+1」仍不精确（实=board 11 用例断言红+store 文件级 0 test，「+1」非 test 计数）。收口单按实物 9+14 口径更正即可（W1 同族计数文书误差）。
- **N-RW2（记档）**：回炉 3 用例的初始红（按钮缺失期）未单独落盘，失败能力证明=MUT-RW（2 用例红）+取消用例结构论证（变异点在 confirm 后，取消路径不受影响——门一复核已明示并接受）；取消用例负断言（通道零调用）在「confirm 恒真」型变异下结构可达红。建议后续单回炉将初始红一并落盘。

## ⑤ 成本账本（门二自身 usage 自估）

约 22 次工具调用（7 文件全读+diff/grep/log 尾取证）；输入 ~150K tok（系统提示+12 文件+七日志抽样），输出 ~13K tok（含本报告 ~5K）；耗时 ~20 分钟。无 npm/test/git 改动性命令执行（git 仅 status/diff 只读）。

---

## 总评

**PASS**。理由：门一 3W/7N+候裁 A/B 全部处置落地（N-RW1 已补行闭合）；母本五层与 ADR-0014 保存语义/退出拦截接缝/INV-04 同型/INV-22 扩面/INV-27 消费逐节符合（tab-dirty 行为面零触碰经 git diff 字面实证）；宪法红线全绿（行数/分层/受锁 129 同步/UTF-8/TDD 四档+M1-M3+MUT-RW 红证链完整）；机器面 84/596/129/16+1/LG-01 零回归全核对（唯一分解文书误差 W4 不动证据链）。**收口单执行清单**：按 7 处计数+9/14 用例分解口径更正文书、[locked-change] 尾注提交（manifest 与提交同步）、翻 done 前移除 data-ticket 标记+核对头注工单号形态、 locks:apply 即时。LG-03 可入收口。
