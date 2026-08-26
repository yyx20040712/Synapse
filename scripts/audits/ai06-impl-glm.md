# SR2-AI-06 伴随进程文件协议 —— 门二终审审计档（GLM 终审位）

- 日期：2026-08-27
- 审计者：门二终审子代理（GLM 终审位；只读审查，本档为唯一写产物）
- 对象：终态 diff /tmp/ai06-diff-r1.txt（16 文件，BASE=1629069）+ 工作树实读复核
- 输入：票面 ai-sensor.service.ts 头注五层规约（实读 318 行）+ 实现者报告
  ai06-impl.report.md（194 行）+ 门一档 ai06-impl.audit.raw.txt（354 行，首轮
  B0/W3/N13 + 回炉复核三 W 全 ADDRESSED）+ 四份证据日志 + ADR-0015 全文 +
  AGENTS.md + 先例（queue.mjs / corpus.export.service.ts / api-surface.ts）+
  scripts/check-tickets.mjs 全文 + tickets/registry.ts

## 开工记录：技能清点（宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| code-review-excellence | **用** | 终审核心=代码审查终位 |
| verification-before-completion | **用** | 终审本质=完成定义逐项验证 |
| systematic-debugging | 不用 | 只读审查无调试面；发现问题即记录上报，无修复职责 |
| test-driven-development | 不用 | 不写实现/测试，只核对 TDD 证据链四档 |
| 其余领域技能 | 不用 | 纯只读审计，唯一写面=本档 |

配置自查：本位=GLM 终审门（主控指定）；无再派发。铁律遵守：未跑 npm/test/
build/git 写命令，零 src/tests/docs/tickets 改动。

---

## 清单① 处置核对（门一 3W+13N 逐条 vs 终态 + 主控五项处置真伪）

**结论：全部属实，无「说了没改」、无改出新矛盾。**

主控五项处置逐项实物核实：

1. **预裁自裁#1（通道挂 export_ 域）——与实物一致**。api-surface.ts 终态
   export_ 域 += `requestAiRead`（channel 'ai-sensor/request-read'）/
   `aiStatus`（'ai-sensor/status'）实读在案（:60-61）；services/index.ts
   `export_: ExportService & CorpusExportService & AiSensorService` 交并；
   ipc/export_.ts 两行纯委托。机器依据独立复核：tests/contracts/
   api-surface.test.ts:37-47 `ApiHandlers` 九域穷举字面量硬编码实读属实
   （library/reader/notes/tags/import_/enrich/export_/settings/system）——
   新增域键必 typecheck 红，域内加通道不触发（unimplementedObject 泛化）。
   corpusItem 先例（api-surface.ts:56，AI-02 域内加通道同型）属实。裁决成立。
2. **预裁自裁#2（新测试不经 guard）——与实物一致**。两测试文件头注均声明
   三屋模式试点+registry 翻状态归主控+guard 包裹会使三者（红绿证/verify
   计数/翻状态）皆不可得+主控翻状态后可一行收回。K3 威胁缺位论证（实现与
   测试同批交付，「不实现就翻状态」不适用）逻辑成立。模式级偏离已列用户
   待裁决——归位正确，本档不重复裁。
3. **W6 裁决（queue.mjs 注释两处）——真实落地**。queue.mjs:19-20（头注
   progress schema 行）与 :160-161（markDone JSDoc）实读均为裁决文本
   「outputs=信息态记录，路径基不约定（companion 交付落协议根绝对路径；
   queue CLI 手工流历史相对路径同容）」；diff-r1 对应两 hunk（@@ -17,7 /
   @@ -157,7）纯注释行零代码变化，「运行时零变化」承诺字面成立。:182
   用法串保留复核：实读 main() 内 console.error 串未动——门一注记「保留是
   正确取舍」维持（改它=CLI 输出变化破坏运行时零变化；且手工流相对路径
   与新注释「历史相对路径同容」自洽不互斥，实质裁决目标=互斥消除已达成）。
4. **W9 裁决（EOF+变异红证）——真实落地**。(a) service.test 实测 wc -l=328
   （回炉前 327 行无末换行+补 0a=328），diff-r1 已无 `\ No newline at end
   of file` 标记；受锁流程合规（manifest 中该文件 sha 已更新为 8e373911…，
   条数仍 112）。(b) mutation.log 实读：单文件 run、`<=`→`<` 单 token 变异
   后**恰 1 用例红**（freshness 阈值边界，AssertionError「expected false to
   be true」@ service.test:189——断言级红非构造级）、11 passed、exit=1；
   工作树 service.ts:298 实读仍 `<= HEARTBEAT_FRESH_MS`（已还原）；备份
   还原法合规（禁 git checkout，cp→变异→测→cp 还原→diff 空）。边界断言
   （<= 含边界语义）真实可失败、非恒真——已证明。
5. **W13 裁决（synthesize 恢复）——真实落地**。SKILL.md:70-72 实读恢复
   第 5 步「库级收尾（synthesize）：队列打空（pending 无 job 且 queue 全
   done）后触发——四类核心贡献枚举+时间线（prompts/synthesize.md；库级
   产物非逐篇流，无 paperId 维度，不经 companion --deliver）」；prompts/
   synthesize.md 实存（prompts/ 四文件全在，孤儿解除）；报告 §6#13 补正
   文本如实（「本条删除范围当时误含 synthesize 库级收尾步骤——属漏报删减
   错误，已按主控裁决回滚」）。触发语义双条件覆盖按篇流+全库流，与 role
   枚举（三角色无 synthesize）一致，无结构冲突。

门一 13N 复核：回炉差集（queue.mjs 注释×2 / service.test EOF / SKILL
synthesize 节×3 / 报告 §6#13+§8）全部落在声明四文件，git status 16 文件
（11 M+5 A）=原 15+queue.mjs，无第五文件偷改；13N 所锚定的代码面零触碰，
结论在终态下全部维持。门一回炉复核「三条 W 全 ADDRESSED、无新破坏、PASS
维持」——终审确认。

## 清单② 母本符合度（票面 vs ADR-0015）

**结论：五节逐项符合；三红线 diff 级核实全绿。**

- §1 协议目录四成员：pending/ + status.json + corpus-ai/ + archive/，协议根
  =join(userData, 'ai-sensor')（bootstrap.ts 装配注入）——service/companion/
  SKILL.md 三面一致 ✓
- job 形状：requestRead 写 `{ paperId, kind:'three-read', requestedAt }`
  字面（service:274），jobId=randomUUID 零依赖 ✓
- status 心跳：heartbeatAt 新鲜度判活（HEARTBEAT_FRESH_MS=10min，running
  单源在 service 输出）；「应用永不按 state 值分支」——readStatus 纯透传
  state 零分支 ✓；应用侧零常驻（无定时器，状态读取=按需 IPC）✓
- 产物行形状 8 字段：companion SEGMENT_FIELDS 字面=ADR §1 字面 `{ role,
  question, model, quote_text, prefix_text, suffix_text, anchor_page,
  content_md }`，与 ai_notes 同形 N2 粒度 ✓
- §5 密钥面不动：diff 零触碰 config.json/config.template.json，零新增出网
  host，应用零密钥面 ✓
- **failed 消解不变量实现语义 vs 票面**：票面 36-41 行声明（移除 job 以产物
  落盘为前提=协议不变量；工具失败 job 保留→观测坍缩回 pending；瞬态排除）
  与 companion deliver 实现（①normalizeSegments 校验②writeAtomic 产物
  ③rm job④markDone⑤刷心跳——移除严格在落盘后，任何 throw 点均在 rm 之前）
  及探针测试（三失败路径断言「job 保留+产物不落」成对）三方逐句一致 ✓
- **INV-26 入册文本 vs 票面**：invariants.md 终态恰 1 条 INV-26，三联表述
  （①移除前提+瞬态排除②判活单源+10min+不双写+不按 state 分支③原子写+mkdir
  幂等+两侧各自保证）与票面行为层声明逐句对应；锚定状态=「单测+探针级
  2026-08-27 SR2-AI-06；e2e 消费方面随 AI-08/10」——与实际测试锚定一致，
  e2e 留口与消费面归属正确 ✓
- **三红线 diff 级核实**：应用永不 spawn——src/main 全域 grep spawn/
  child_process 仅命中头注 INV-21 声明两处，零代码级；零出网——service 与
  companion 均零 fetch/net/http（grep 实证），package.json/lockfile 不在
  16 文件改动面（git diff --stat 空）=零新依赖（randomUUID=node:crypto
  内置）✓

## 清单③ 宪法红线终审

**结论：全绿。**

- 分层单向：ipc/export_.ts 两行纯委托 → services（index.ts 交并装配）→
  fs/promises 直读协议目录；service import 面=node:crypto/fs/path+shared
  类型，零 db/repo/sqlite 触碰（「写 DB 唯一归 07」保持）✓
- 受锁纪律：受锁触碰面=schemas.ts+api-surface.ts（两 sha 更新入 manifest）
  +两新测试（generate 纳管）+manifest 本体 110→112；unlock→批内改→
  generate→apply 流程自洽；verify 两轮「locks 检查通过：112 个受锁文件与
  manifest 一致」。[locked-change] 尾注待主控提交——与处置记录一致（尾注
  责任已在报告 §5 明示移交主控）✓
- renderer 零路径/零 Node API：git status renderer 零改动；机制实读核实
  为真——register.ts 按 allChannels() 动态注册（新通道自动接线）、preload
  buildApi 动态枚举 API_SURFACE、client.ts `export const api = window.api`
  且 PreloadApi 从 api-surface.ts 类型推导自动延展。「零改动申明」诚实 ✓
- 文件行数实数（wc -l 实测）：service 318 / companion.mjs 348 /
  companion.d.mts 77 / queue.d.mts 73 / SKILL.md 81 / service.test 328 /
  companion.test 276 / schemas.ts 257 / api-surface.ts 135——全部 ≤500 ✓
  （注：报告 §2 写 service.test「327 行」系回炉补 EOF 前数字，§8.2 已述补
  换行事实，表格数字未随回炉同步——微瑕非虚报）
- UTF-8：全部改动文件本轮实读中文正常显示+verify quality 两轮「无乱码」✓
- 无占位符：六新/改文件 grep TODO/FIXME/placeholder 零匹配+quality「无占位
  标记」✓；安全禁令 grep（eval/new Function/openExternal/nodeIntegration/
  webSecurity/sandbox）零命中 ✓
- TDD 证据链四档齐：red（12 failed+companion 套件收集失败，exit=1）→
  green（2 文件 20/20，exit=0）→ mutation（恰 1 用例断言级红，exit=1）→
  verify（73 文件/452 用例+build，exit=0，两轮）✓

## 清单④ 机器面核对

**结论：全部一致；翻 done 后 check-tickets 不会红。**

- verify 日志：终行 exit=0；`Test Files 73 passed (73)`／`Tests 452 passed
  (452)` 两轮在案（首轮 log:790-791 + 回炉后 log:1648-1649；中间 log:844
  rework1 两文件 20/20）——与基线 71/432 差=+2 文件/+20 用例（12 service
  +8 companion），数理一致 ✓
- locks manifest：grep -c '"path"'=112；两新测试路径（ai-sensor.service.
  test / companion.test）在册，schemas/api-surface 两 sha 更新；两轮
  locks:check 通过 ✓
- check-tickets 翻 done 后推演（脚本全文实读逐规则）：规则 2——工单文件
  ai-sensor.service.ts 自引用 SR2-AI-06（t.file===rel）合法；两测试文件走
  tests 分支只查 unimplementedObject/NotImplementedError 占位调用（无）；
  规则 3——done 文件无 NotImplementedError/unimplementedObject；规则 4b——
  `AI_SENSOR_SERVICE_STUB='SR2-AI-06'` 导出已删（diff -311~312），头注
  「完成后：删除 STUB」纯文字不匹配 `export const *_STUB='工单号'` 正则；
  规则 5——无 guardedDescribe 绑定问题；规则 6——:1 `// b3: P7-G` 在头注释
  区且 P7-G 已裁决（companion.mjs 同指针但 tools/ 不在扫描面）。**翻后
  不会红** ✓（翻状态动作本身归主控收口）
- e2e 面零触碰：tests/e2e/ git diff 空 ✓
- 工作区附带：?? dist_new/（2026-08-23 历史构建残留，早于本单元，门一
  ai06-16 已注记）+ ?? scripts/audits/ai06-impl.audit.raw.txt（门一档）——
  主控收口 staging 按纪律显式列文件即可，非本单产物。

## 清单⑤ 试点模式评估（门二独有，三行，供用户裁决模式推广）

1. 实现者报告诚实度高：13 自裁 12 真，唯一漏报（synthesize 删减）在门一
   拦截后如实认错补正，测试激活方式/域归属等结构性偏离全部主动申报并给
   回退路径——无虚报、无隐瞒。
2. 自裁申报制度有效：门一专审对每条自裁有独立复核抓手，本单预裁两项
   （export_ 域/不经 guard）均被证实；可补强处=申报清单聚焦「新增决定」，
   「删减面」漏报靠门一兜住——建议推广时给实现者加一条「删减行 diff 级
   自查」申报项。
3. 主控-审计分工无漏面：预裁-深审-回炉-终审四环闭合，回炉差集四文件与
   声明完全一致；唯一可见缝隙=断言级变异红证首轮缺位、经门一 W 级拦截后
   回炉补齐——建议推广时把「单 token 变异断言级红证」直接写入实现者 DoD，
   可省一轮回炉。

---

## 总评

# PASS

- 门一 3W+13N 终态逐条维持，回炉三条 W 全部真实落地且无新破坏；主控五项
  处置与实物一致（含 :182/:160 行号出入的门一注记——实质互斥已消除）。
- 票面 vs ADR-0015 五节逐项符合；failed 消解不变量实现-测试-入册三方一致；
  「应用永不 spawn/零出网/零新依赖」三红线 diff 级核实全绿。
- 宪法红线全绿（分层/受锁/renderer 零改动机制/行数/UTF-8/无占位符）；TDD
  四档证据链完整且变异红证为断言级。
- 机器面全部对得上：verify 73/452 exit=0、locks 112 一致、翻 done 后
  check-tickets 推演不红、e2e 零触碰。

**残余风险（均不阻塞）**：
1. 报告 §2 service.test 行数 327 未随回炉补 EOF 同步为 328（§8.2 已述
   事实，微瑕）。
2. 门一 ai06-12 指出 §7.4 漏同类第⑤步（writeStatusProtocol 失败面，影响
   更小、deliver 幂等可自愈）——建议 AI-08 交接时并入同款声明。
3. synthesize 库级产物去向未文档化（恢复至 AI-05 原语义水平即达标，消费
   面待未来「核心 idea 时间树」单收口）。
4. AI-07 开单前两条预裁决建议（域归属口径循 export_ 交并先例+outputs 绝对
   路径语义）宜写入交接书，避免每单一议。
5. 两新测试 always-active 的模式级偏离归用户裁决（主控已列）；dist_new/
   历史残留随主控收口 staging 核对处理。

（终审完成——只读审查，唯一写产物=本档）
