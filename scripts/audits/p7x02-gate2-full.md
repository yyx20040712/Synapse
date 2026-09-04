# P7X-02 门二终审报告（四清单+一）

> 门二=GLM5.3flash（环境统一档=政策次选——Agent 工具面无 model 参数，与实现者同家族
> 半异构欠账如实记；与门一实际审者 deepseek=跨门异构成立）。审查对象=未提交工作树
> （13 文件 diff：票面 12 件+设计书 §10 主控追记）。全程亲跑矩阵，禁只审不跑。
> 开工技能清点：用 code-review-excellence / verification-before-completion /
> systematic-debugging（verify 红预案，未触发）；不用 TDD（审查者不写实现——
> 变异抽查≠TDD）/subagent-driven-development（本身为被派发子代理）/git 类
> （禁 git add/commit/push，无 git 操作面）/browser 类（探针=node 脚本）。

---

## 机器面亲跑矩阵（④——不信转述，全部本机实跑）

| 项 | 命令 | 实测 | 预期 | 判定 |
| --- | --- | --- | --- | --- |
| verify | `npm run verify > /tmp/g2-v.raw 2>&1` | **exit=0**；quality 过（无占位/无乱码/无跨域）；locks 检查通过：**286 个受锁文件与 manifest 一致**；Test Files **156 passed (156)**；Tests **1422 passed (1422)**；build ✓ | 156 文件/1422 用例/locks 286/exit=0 | **一致** |
| 探针 | `node scripts/audits/p7x02-impl-e2e-probe.mjs`（verify 内最新 build 产物上） | row={s:**210**,p:**1**}；**VERDICT PASS**；**exit=0**（/tmp/g2-probe.raw） | VERDICT PASS（210s/页 1）exit=0 | **一致** |
| e2e 全量 | `npx playwright test` | 【见文末补记】 | 42 passed+1 skipped（可选亲跑） | 见补记 |
| 变异①（独立复算） | outbox.ts 删队头阻塞→`npx vitest run tests/unit/renderer/reading-time-outbox.test.ts` | **3 failed \| 21 passed (24)，exit=1**；红用例=T1 队头驻留/T2 越序拒绝（expected length 1 got 3）/T4 队头保持——3 红全打队头阻塞锚点 | 预期红 | **成立** |
| 变异①还原 | `cp /tmp/g2-outbox.bak` 还原+`diff` | **RESTORE-OK diff-empty**（无 git checkout） | diff 空 | **成立** |
| 变异②（W1 逆变异） | 静态断言（bootstrap 面单测不可达，按简报④） | main.tsx **:15-19 `createRoot(rootEl).render(...)` 先行，:20 `void getReaderOutbox().replayOnStart()` 后置**——行序亲读实证；当前树无 await 前置残留 | render 先于 replayOnStart | **成立** |
| locks 计数 | manifest 解析 | **286** 条 | 286 | 一致 |

---

## ① 处置核对（门一 findings+主控处置表 vs 终态实物——「说了没改/改了没说」双向）

| 项 | 主控处置 | 终态实物核对 | 判定 |
| --- | --- | --- | --- |
| C-1 R7 空转假设（不确定-重大） | 主控源码亲证闭环+新边界第 8 条落档 | **门二独立亲证复核成立**：scroll-progress.ts **:151 `flushLedger`** 与 **:258 `takePending`** 消费同一模块级 `pending` 容器（:115 声明）；dispose（:280-287）内唯一落库路径=flushLedger；flushPending 读已排干 `pending[pid]`=undefined 即 return——**无第二条直发路径**，spView 排干后 sp.dispose 恒空转成立。设计书 §10 第 8 条在档（diff +15 行=§10 全量，主控口吻追记）。主控顺带发现的「活卷防抖直发面」（fire:168→flushLedger→saveOne→saveProgress :320 直发 api 不穿 outbox）复核属实——暂态回退窗（自愈型）边界如实申报 | **落地** |
| C-2 spView spread this 绑定 | 主控源码亲证闭环 | **门二独立亲证复核成立**：工厂 **:181 `return {`** 起返回闭包对象字面量（方法均为闭包函数属性，无原型方法/无 this 依赖）；装配工厂 createReaderScrollProgress（:304）同型透传——`{...sp, dispose(){}}` spread 安全 | **落地** |
| B-1 send 挂起无界白屏（高） | W1 渲染先行+void 后置 | main.tsx :15-19 render 先行+ :20 void 后置——白屏面结构性消除（挂起只停后台排空循环） | **落地** |
| A-2 闸门窄化/seq 单调依赖（中） | W2 排空闸门全派发阻断（身份快照+活跃标志） | outbox.ts :96-97 `replaying`+`oldIds`（回放开始镜像 id 快照）；pump 拦截 :233 `if (replaying && !oldIds.has(e.id)) continue`——**回放期新 enqueue 不论 seq 一律只入队**，与 seq 单调假设解耦；排空判据 `active>0 || (retryAt!==null && undeterminedOld())`（:247-252 检查旧集合非死信驻留）；resolve 后 :282-285 `replaying=false`+清快照+尾泵。W2 首红在档（mutation-4.raw：1 failed \| 23 passed→修复后 24） | **落地** |
| B-2 全局退避闸门宽于自裁（中） | 接受记录+边界扩申报 | 实现 §7.3 明示「任一 T4 失败后退避窗内**全部**派发暂停（含其他 paper 新条目首派发）」+疑虑④（多卷延迟 ≤31s/退避窗）——扩申报成文；单测『T4 共享退避闸门』显式锁定该语义 | **落地（记录面）** |
| B-3 启动 WARN 先于渲染丢失（中） | W1 结构性消除 | W1 消除前提门二补证成立：toast-store=模块级 store（头注「Host 未挂载时调用安全只入队不渲染」+自动消失计时从调用点起 info 3.5s/error 6s）；渲染先行后 getReaderOutbox 构造期 WARN→React 首提交（毫秒级）≪3.5s 窗——ToastHost（App.tsx:202）挂载即显示；回放期（后台数秒~31s）死信/退化 WARN 实时可见 | **落地** |
| B-4 退避跨重启清零（低） | 接受记录（频次面非计数面） | 代码面零改（处置表无代码要求）；记录落点=门一审+处置表在档（scripts/audits/p7x02-gate1.md 永久件）。**未另入设计书**——主控裁量范围内，门二记录不阻断 | **记录在档** |
| B-5 dispose 后 reject 驻留 pending（低） | 接受记录（与 B-4 同族） | 同上——代码面 dispose 后 `if (!disposed) armBackoff`（:195）语义与门一引证一致，零改 | **记录在档** |
| D-1 send 挂起无测试 | 随 W1 消解 | UI 白屏风险面已消除；未加超时定时器（超票面，主控裁决维持） | **落地** |
| D-2 setup 层无单测 | 接受缺口（亲证+e2e 补偿） | C-1/C-2 门二独立亲证+探针链路亲跑 PASS=补偿成立 | **落地（缺口申报在档）** |
| D-3 跨格组合覆盖不足 | 部分补（W2 单测） | W2 单测『排空闸门时间语义』补「回放期新 enqueue 不派发」格；其余（finish(ok)×退避唤醒交错等）接受 | **落地（部分补如裁）** |
| E-1 注种形态诚实性 | 维持预裁 | spec/探针注种=真实 store 格式（synapse.outbox.entry.<id> 独立 key+meta）；重放链（载入→T5→send→真 IPC→真 sqlite）全真；真实 enqueue 链=24 单测锚——申报与实物一致 | **维持** |
| E-2 156 vs 157 计数 | 已解释 | 门二复核 vitest.config：include=tests/**/*.test.ts(x)+src/**，**exclude tests/e2e/\*\***——156=基线 155+outbox.test；e2e spec 属 playwright 域不计数。口径确认无出入 | **解释成立** |
| 七-INV-57 注记措辞 | 随 C-1 亲证转实 | C-1 门二复核成立→「页码两来源回退窗消除」注记措辞成立（语境=R7 卸载收尾双通道面，已闭）；活卷直发面=另记 §10 第 8 条非注记弱化对象 | **落地** |

**「说了没改」**：处置表三项回炉（W1/W2/W3）全部落地（形态见上行）；**「改了没说」**：
diff 13 文件 vs 实现报告 §2 清单——报告未列设计书 §10（+15 行），该件=主控追记
（门二简报输入件明示「规约源含 §10 门一追记」），非实现者越权；实现者票面外
触碰（ReaderPage 一行/拆两件/共享退避单闸门/注种形态/liveDbPath/T5 lastError
缺省值）全部在 §7 自裁申报成文——**无未申报越权改动**。

---

## ② 母本符合度（设计书 vs 实物）

| 设计书节 | 实物核对 | 判定 |
| --- | --- | --- |
| §3 态空间 T1~T6 | T1 enqueue 先 storePut 后 mirror/pump（写前日志序 :241-246）；T2 dispatch 先 `state='in-flight'`+storeUpdate 再 send（CO-3 :199-202）；T3 resolve→mirror.delete+storeRemove 无 tombstone（:208-211）；T4 attempts+++指数退避（共享计时器 1s→…上界 5min :83-87/:156-163）+队头保持；T5 replayOnStart 同步段驻留 in-flight→attempts++→≥N 死信/<N pending（:253-267，lastError 缺省 'startup-recovery' 自裁申报⑨）；T6 死信留驻+onWarn 不自动重放+上限 50 逐最老淘汰（:164-185）；排空闸门=W2 全阻断语义（设计 §10 回炉记录兑现） | **逐格符合** |
| §4 接口草图 | OutboxEntry/OutboxStore/ReadingTimeOutbox 四成员（enqueue/pump/replayOnStart/dispose）签名照抄（:30-59）；OutboxStore 适配器独立件（CO-1 每条目独立 key `synapse.outbox.entry.<id>`+meta key，禁整表 JSON 重写）；send=api.reader.saveProgress 原签名注入（setup :66-69，secondsDelta>0 才带=旧载荷省略语义保持）——**零新 IPC** | **符合** |
| 不变量四条 | ①同步写独立 key（store=落盘投影）②per-paper seq 严格升序（队头阻塞+变异①红证锚）③永不回写 ledger（outbox 零 import reading-time）④dispose 停扫描不停已发回调（disposed 只拦 pump/armBackoff，finish 回调照常 :204-225） | **符合** |
| §5 失败模式表 | F1/F2（T4→T6+WARN）/F3（T5 attempts++）/F4（内存段申报）/F5 同构覆盖；localStorage 损坏/配额→退化内存重试+一次性强 WARN（degrade :109-113）+store 层损坏条目自清+onCorrupt | **符合** |
| §6 页码重放四条件 | ①at-least-once 诚实申报（无伪界表述）②seq 严格升序+队头阻塞+排空闸门（W2 后不依赖 seq 单调）+R7 并入（spView 排干改道，C-1 亲证吻合）+T7 取消（死信不自动重放，T6 用例锚）③复合载荷 page+seconds 同条目④纯时长条目只受规则 1 | **四条件合成成立** |
| 「页码在 enqueue 时点定死」 | 三落点：invokeOne `basePage = page ?? deps.currentPageOf(paperId)`（reading-time.ts :250）；setup onFlush `currentPageOf(paperId)`（:112）；spView.dispose `takePending(pid)` 时点页码（:130-131）。onFlush 兜底路径 currentPageOf 取 0 的不可达性分析成立（closeTab 先经 flusher 清账→dispose 无尾账；卸载时 tab 仍在 store） | **符合** |
| §7 边界申报 8 条 | 1~7 原文+第 8 条（§10 追记：活卷防抖直发面交叠窗——接受+另票候选） | **8 条在档** |
| INV-57 注记两句（受锁） | diff 亲核：仅注记面两句改（R7 双 invoke→「已并入 outbox 单队列（页码两来源回退窗消除）」；分片级失败→「outbox 兜底（at-least-once,重复界 N×3600s/条——T5 计 attempts 拦停）+localStorage 退化面=内存重试+强 WARN 申报」）——**①~④锚条款/锚定列/测试列零动** | **符合（窄幅）** |
| reading-time.test 等价面（受锁） | diff 亲核：makeFlusher deps saveProgress→enqueue、saved→enqueued、4 处断言+标题同形改写——载荷三元组断言完整性保持，直发吞错语义移交队列态空间，语义未弱化（与门一第七节结论一致） | **符合** |
| 测试面（§8+票面⑧） | 新 test 24 用例（门二逐 it 清点：态空间 20+适配器 3+纯函数 1；报告 23+1 W2 吻合），T1~T6 逐格+闸门×2（seq 版+W2 时间语义版）+队头阻塞+attempts 拦停+死信 50 上限+dispose 不变量+store mock 适配+退化两径——**always-active 无 guardedDescribe**；e2e spec=P7X-02 未 done skip 守卫 | **覆盖合格** |
| W3 e2e 同步点 | spec+探针均有 pollReadingRow（500ms×20s 上界，读活库行到 {s,p} 即过/超时抛末值）；裁决理由（DB 轮询=最终裁判面与断言同源，不加 production 观察口）成文（spec :77-80 注） | **符合** |

---

## ③ 宪法红线终审

| 红线 | 核对 | 判定 |
| --- | --- | --- |
| 受锁两轮 283→286 恒定 | manifest 实测 **286**；新四件（outbox.test/spec/探针脚本/+1）IN-LOCK 亲验；两受锁改动件（reading-time.test/invariants.md）IN-LOCK；locks:check 在亲跑 verify 内过「286 一致」；unlock→apply 全程实录在报告 §6 | **过** |
| 禁新依赖 | git status 无 package.json/package-lock 改动 | **过** |
| 行数 | wc 实测：outbox.ts **300**（W2 后仍 ≤300 票面边界）/store.ts **87**/reading-time.ts 303（≤500）/setup 139/ReaderPage **248**（组件 ≤250）/outbox.test 496（≤500）/spec 151/探针 170 | **过** |
| UTF-8 | quality 过（无乱码）+门二亲读全部触碰件中文正常 | **过** |
| TDD 四档 | 首红在档（first-red.raw：exit=1 模块未诞生加载红）；变异 4 证在档（M1 3红/M2 2红/M3 10红/M4=闸门先红 1 failed\|23 passed，各自 exit=1——门二抽查 raw 内容与报告数字一致）；绿全量=24/24（亲跑 verify 1422 全绿含）；verify 真退出码 **×4 份在档**（verify/verify2/verify3/verify4——报告正文仅点名 verify/verify3，**verify2/verify4 未报=报告完整性小瑕疵**，实质由 4 份全 exit=0 免损） | **过（含记录项）** |
| 变异还原安全 | 门二独立 cp 备份法全程实录（备份→变异→红→还原→diff 空）；实现者「m1/m2/m3-restore-ok 输出实录」**未见独立档件**（mutation raw 尾部亦无该字样）——还原事实由终态 verify exit=0 反证+门二独立闭环 | **过（含记录项）** |
| 范围蔓延 | git diff --stat=13 文件 1396+/68-，全部票面内+主控追记件；无 TODO/FIXME/placeholder（quality 过） | **过** |

---

## 终评

**PASS**（无阻断条件；主控可收口：翻 registry→[locked-change] 提交）。

非阻断记录项（5 条，随提交带入收口单）：
1. **CI 首跑激活面**：e2e spec 生而 skip（P7X-02 未 done 守卫）——主控翻状态后 CI
   首跑为残余验证面；链路已由探针 4 轮（实现者 3+门二 1）PASS 补偿。
2. 报告完整性小瑕疵：verify2/verify4 在档未点名；「restore-ok 输出实录」未见独立档
   ——实质零损（4 份全 exit=0+门二独立变异闭环）。
3. B-4/B-5 边界申报落点=门一审在档（未另入设计书）——主控裁量范围内。
4. e2e 测试面残余竞态（低概率）：二轮启动「按钮可见→close()」窗内重放未毕则轮询
   超时红（数据面无损——LS 条目驻留下次启动 T5 接管）；非确定失败立案线=同用例
   2 次照通则。
5. 环境档欠账：门二与实现者同家族（GLM5.3flash）半异构——跨门异构（对 deepseek
   门一）成立，门内异构欠账如实记；建议后续门二位维持异构优先派发。

---

## e2e 全量补记（可选亲跑项——已完成）

`npx playwright test > /tmp/g2-e2e.raw 2>&1` 实测：**42 passed (2.0m) + 1 skipped，
exit=0**——与预期 42 passed+1 skipped 完全一致（skip=P7X-02 未 done 守卫的
reading-time-replay.spec；42 基线零回归——invokeOne 改道无行为面破坏实证）。
reader 系/进度系全绿，无 flaky。

---

## 成本账本行（⑤）

- 机型/档：GLM5.3flash（环境统一档=政策次选，Agent 工具面无 model 参数；与实现者
  同家族半异构欠账如实记；与门一 deepseek 跨门异构）。
- 时长：会话钟≈开工 01:09→verify 毕 01:11:49→探针毕 01:13:29→变异毕 01:14:25→
  e2e 待收（文件时间戳实测口径）。
- token：工具面不暴露读数——按宪法禁自估纪律**不落自估值**（不可测项如实记）。
