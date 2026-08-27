# SR2-AI-08 门二终审（独立子代理）

技能清点：用 code-review-excellence（审查方法）/verification-before-completion（只读核对实物与日志证据）；不用 systematic-debugging/TDD/subagent-driven-development（纯只读终审，无调试/实现/派发面）。配置自查：本代理只读，唯一可写本文件；禁 npm/test/git 改动性命令——全程遵守（仅 grep/wc/sed -p/tail 只读）。

裁决：**PASS**（0 B / 0 W / 3 N——N-G1 为收口动作清单增项，不构成回炉）。

## ① 处置核对（门一 findings vs 终态实物；预裁三项落地形态）

- [OK] 门一 PASS（0B/0W/9N）复核属实：其 A 节六态逐格、C 节四档证据、D 节数字对账在本审全部独立重验（见③④）。
- [OK] N-C1（变异还原 diff 空未落日志）认可门一判定：mutation.log 全文无 RESTORE-OK/diff 记录（grep 证实，仅 :476/:740 两个变异标签行），但 10:02 终局 verify 76/484 全绿（verify.log:1053-1054，exit=0 见尾部）——若变异未还原必红。还原真实成立，留痕瑕疵记入流程改进（后续变异流程把 RESTORE-OK+diff 输出并入日志），非虚假申报。
- [OK] 预裁1（observe 扩契方向 B）：schemas.ts:202-213 `observeResSchema`（注释含「六态状态机判定事实单源（AI-08 票面消费面）」）+api-surface.ts:65 `observe: { channel: 'ai-sensor/observe', Req: paperIdReqSchema, Res: observeResSchema }`+ipc/ai_sensor.ts:16 薄分发行——字段名/通道名/注释字面照预裁；**aiStatus 通道原样保留**（api-surface.ts:64），AI-10 消费面不受影响。
- [OK] 预裁2（e2e-env.ts Rule of Three 抽取）：tests/e2e/e2e-env.ts 存在（71 行），由新 spec 消费；reader-text/corpus-export 两既有 spec 未收敛改写（受锁+他票面）——门一已核抽取件正确性，留主控裁量成立，两份并存无行为差异风险。
- [OK] 预裁3（data-ticket 随翻 done 移除）：AiNotesSection.tsx:207 `data-ticket="SR2-AI-08"` 现为 open UI 工单所必需（check-tickets 规则 4：open+tsx+JSX.Element 必须含）；翻 done 时移除预演见 N-G1。
- [OK] 门二补充三条全部入实现：连续 3 次离线提示行（POLL_FAIL_THRESHOLD/`AI 状态暂不可用，将继续重试`，AiNotesSection.tsx:84/:222-226）；损坏计入计数（mock observe 拒绝用例在，mutation.log:221-222 可见其名）；幂等自愈声明在 ai-notes.store.ts 头注+失败重试用例（mutation.log:160-165）。

## ② 母本符合度（票面五层 vs ADR-0015）

**ADR §1（门控/心跳/新鲜度）**：
- [OK] 手动激活（D2b）：「AI 读文献」按钮→request-read 写 job，无任何自动触发。
- [OK] 门控轮询：5s interval 仅组件挂载期间（笔记面板打开=ADR「仅…笔记面板打开时」语义），卸载/换篇 cleanup 清 interval+cancelled 标志（INV-14 成对）；fs 轮询在 main 侧，renderer 无 Node 面。
- [OK] 心跳/新鲜度消费：经 observe 的 status（06 服务侧新鲜度判活单源）驱动 running；损坏≠missing 三态分离上抛语义由 service 保持、renderer 计连续失败（不吞不混淆）。

**ADR §3（N2 渲染面）**：
- [OK] role 分组（一读/二读/裁决，divergence 随裁决组）×question 条目；锚定段引用块+content_md 纯文本呈现，无 markdown 渲染（负面清单红线）。
- [OK] 只读零编辑/删除写路径（INV-19）；数据不写 annotations 表（store 走 ai-notes/list 独立通道）。
- [OK] locateAnchor 单入口（INV-20）；anchorPage 1 基→0 基换算与 anchor-locate 契约一致；exact 层 [data-annotation-id] 接缝已在头注+实现声明（09 交付 data-ai-note-id 延展，09 落地前页级停驻不另写降级）——符合 ADR 三层防线的「共用同一锚点定位服务，禁各写降级」。
- [OK] 七问分色单源 ai-note-style（全 var(--*) 主题变量，无硬编码色）；渲染对等（AnnotationLayer 同几何管线）按 ADR 归 09，本单不越界。
- [OK] 导入经 ai-notes/import 应用 IPC（D3 保持），目录级全量幂等无害，三桶 toast。

票面五层（行为/接口/架构/生命周期/文化）与 AiNotesSection.tsx 头注逐层比对：六态表字面一致（含 pending 文案含 state 自述可缺省、queued currentPaper=null 无他篇名两处细节）；接口签名 `AiNotesSection(props: { highlightAiNoteId?: string | null })` 一致；交付面四文件+挂载一行一致；STATUS_POLL_MS 组件私有（Rule of Three 第 2 次声明在）；错误文化两型分清（列表型静默+阈值离线行 / 动作型 toast INV-02）。

## ③ 宪法红线终审

- [OK] 安全禁令：四个新 renderer 文件 grep 零命中 node:/require/electron/process./fs./path.join——无 Node API、无绝对路径；无出网（无 fetch/XHR/新 host）。
- [OK] 分层单向：renderer→api client→ipc→service→fs，无跨层（observe ipc 一行薄分发）。
- [OK] 受锁：locks:check「117 个受锁文件与 manifest 一致」（verify.log:26）；manifest 实测 117 条 path，含四新文件（两单测+e2e spec+e2e-env.ts）——schemas/api-surface 为既有条目 sha 更新非新增，113+4=117 推演自洽。
- [OK] 行数：AiNotesSection 249≤250、AiNoteGroupList 80、store 68、style 45（wc -l 实测）；第二职责（分节列表）已拆文件。
- [OK] UTF-8/占位：quality 关卡「无占位标记/无乱码/无跨域引用」过（verify.log:11）；全审目测中文可读。
- [OK] TDD 四档证据链：红=构造级模块不存在 2 文件加载失败 exit=1（red.log:40-45）；绿=5 文件/36 用例 exit=0（green.log）+终局 76/484；变异1 取反 hasPendingJob 14 failed exit=1（mutation.log:198-228）；变异2 阈值 3→2 离线用例红 exit=1（mutation.log:713-736，失败点 :334「连续 2 次仍显示」恰证阈值语义）；verify 终局 exit=0（log 尾）；e2e 14 passed (1.3m) exit=0（e2e.log:57-58）——全部真退出码。
- [OK] git status 实测：7 改+7 新（+dist_new/ 与 audits 产物非本单实现面），与 diff.patch 13 个文件面吻合，无范围蔓延。

## ④ 机器面核对

- [OK] 76/484 数理：76=74+2 测试文件（两单测；e2e-env.ts 非 .test 不计）；484=462+22=2（style）+20（section——实现报告写 18 为笔误，verify.log:663 实测 20 tests，数理反而闭合）。
- [OK] locks 113→117：+tests/unit/renderer/ai-note-style.test.ts、ai-notes-section.test.tsx、tests/e2e/ai-notes-section.spec.ts、tests/e2e/e2e-env.ts 四新受锁路径（manifest :125/:133/:245/:249 实证）。
- [OK] e2e 面申明：14/14 含新 spec（e2e.log #1 即 ai-notes-section 全链 19.3s）；断言真实文本（「AI 一读笔记正文内容（e2e 真实文本锚）」「两读者对样本量的分歧评估」toBeVisible）+真 fs 事实（pending job 落盘、archive 归档存在、corpus-ai 清空）——远超 testid 空壳红线。
- [N-G1] **registry 翻 done 预演（收口动作清单——主控须知）**：check-tickets 规则 4b 要求 done 工单文件移除自身 data-ticket（实现者已申报）；**另发现规则 2**：翻 done 后 src 内任何非本工单文件引用 'SR2-AI-08' 即红——ai-notes.store.ts:3、AiNoteGroupList.tsx:3、ai-note-style.ts:3 三个伴生新文件头注均含 `[SR2-AI-08]` 字面（tests/ 下引用免检不受影响）。故收口翻 done 须同步：①删 AiNotesSection.tsx data-ticket 属性；②移除上述三文件头注中的工单号引用（或改写为不含号表述）。当前 open 状态下引用合法、tickets:check 过（verify.log:18-19「open 3 strong」），故不构成本单缺陷，仅收口动作增项。
- [OK] e2e spec 依赖门（DEPS=['SR2-AI-06','SR2-AI-07']，isTicketDone 已 done→不 skip，实测执行）；非 guardedDescribe，unit 新测试 always-active 符合 ADR-0017 K3 条款。

## ⑤ 成本账本行（usage 自估）

| 子代理 | 模型/档 | token 估 | 时长估 |
| --- | --- | --- | --- |
| 门二终审（本代理） | GLM 终审档 | ~46k in / ~5k out | ~8 min |
| 其余（实现/门一/e2e/主控） | 主控填 | — | — |

## 总评

**PASS**。母本（票面五层×ADR-0015 §1/§3）逐节符合；宪法红线（安全/分层/受锁 117/行数/UTF-8）全过；TDD 四档+verify+e2e 14/14 真退出码亲证于日志与实物；预裁三项落地形态与裁决字面一致；报告诚实（18 vs 20 用例为笔误，机器面数理闭合）。唯一实质输出=N-G1 收口动作清单：翻 done 时除移除 data-ticket 外，须一并清理三个伴生文件头注的工单号引用，否则 check-tickets 规则 2 红。
