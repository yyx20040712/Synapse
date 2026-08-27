# SR2-AI-08 门一对抗深审（独立子代理）

技能清点：用 code-review-excellence（对抗深审方法）/verification-before-completion（只读核对日志证据）；不用 systematic-debugging/TDD/subagent-driven-development（只读审查，无调试/实现/派发面）。配置自查：本代理只读，唯一可写本文件。禁 npm/test/git 改动性命令——全程遵守。

裁决：**PASS**（0 B / 0 W / 9 N，其中 N1 需门二/主控知悉但不构成回炉）。

## A. 母本符合度

- [OK] 六态状态机：`derivePhase`（AiNotesSection.tsx:76-83 diff 位）逐态核对——hidden（facts 无+无 notes）/idle（同触发面+有 DB 数据）/pending（hasPendingJob+status 非 running）/queued（hasPendingJob+running 指 P 以外）/reading（running+currentPaper===P）/done-unimported（productExists&&!archivedExists）——与头注表逐格一致。按钮禁用枚举 `busy = pending|queued|reading`（diff 行 329）✓；enabled=hidden/idle/done-unimported 由用例断言（hidden 用例行 1129、done-unimported 行 1196）✓。
- [OK] imported 瞬时态：非稳态不入 Phase 枚举；导入完成→toast+loadNotes+loadObserve→archivedExists 事实驱动回 idle。跨格序列①用例（测试行 1199-1249）末段真实断言 idle 稳态（无状态行+分节就绪）。
- [OK] 跨格序列①③⑤用例存在且断言真实：①（行 1199）全链含 queued 他篇路径；③（行 1251）reading→pending（running 变 false）；⑤（行 1268）换 tab 后 `observe` lastCalledWith paperId='p-2'+文案重评估。②④票面即「同呈现不误报」消解声明，非可观测迁移，不设用例合理。
- [OK] 分节 role 三组中文标签×question 条目：AiNoteGroupList ROLE_LABEL+ROLE_ORDER（ai-note-style.ts）+空组剔除；分组用例断言 data-role 序与 h4 文本（测试行 1370-1372）。
- [OK] md 只展示不渲染：contentMd 以文本节点+whitespace-pre-wrap 呈现（AiNoteGroupList.tsx diff 行 560-562），无任何 markdown 解析；只读用例断言无 input/textarea/select（行 1381-1386）。
- [OK] 只读零写路径：组件无任何写通道调用（requestRead/importAll 是动作按钮非编辑）；INV-19 符合。
- [OK] 七问分色单源：ai-note-style.ts QUESTION_COLOR 全 `var(--annotation-*)`/`var(--accent)`/`var(--ok)`/`var(--danger)`，无硬编码色值；theme.css（src/renderer/shared/theme.css:7-19）实测变量全部存在（annotation-yellow/green/blue/red/purple、accent、accent-soft、ok、danger、text-dim、border）。单测锁 `toMatch(/^var\(--/)`（ai-note-style.test.ts:943）。
- [OK] locateAnchor 单入口消费：onLocateNote→locateAnchor，anchorPage 1 基→0 基换算与 anchor-locate.ts:68-69 契约（setPage 直用 0 基）一致；null→undefined→默认 0。INV-20 消费方级用例在（行 1388-1399）。
- [OK] STATUS_POLL_MS=5000 组件私有（AiNotesSection.tsx 顶部 const，未提 shared——Rule of Three 第 2 次保持重复，头注声明在）。
- [OK] 卸载清 interval：useEffect cleanup clearInterval+cancelled 标志；用例「卸载后不再轮询」（行 1401-1411）实测 unmount 后 15s 无新调用。
- [OK] 换 tab 全态重评估：paperId 进 effect 依赖+failCount/setOffline 复位；序列⑤用例覆盖。
- [N-A1] derivePhase 首拍窗口：observe 未返回前 facts=undefined→按 notes 有无落 hidden/idle；若 DB 有 notes 会先渲染 idle+分节（无状态行）——与稳态 idle 呈现一致，无可见跳变风险。仅记录。

## B. 宪法红线

- [OK] renderer 零 Node/Electron API/绝对路径：AiNotesSection/AiNoteGroupList/ai-note-style/ai-notes.store imports 全部为 renderer 域+@shared 类型；node:fs 仅出现在 tests/e2e/**（测试面允许）。分层单向：ipc→service→fs；renderer→api client→ipc，无跨层。
- [OK] 行数：AiNotesSection 249≤250，AiNoteGroupList 80，store 68，style 45（实测 wc -l）。分拆已做（第二职责分节列表独立成 AiNoteGroupList）。
- [OK] 受锁流程：manifest 113→117（+schemas/api-surface 两条 sha 更新+4 新文件：两单测+e2e spec+e2e-env.ts），verify 日志 locks:check「117 个受锁文件与 manifest 一致」（ai08-verify.log:26）。shared 扩契=预裁 1 授权范围，无越界字段（strict 对象四字段字面照裁决）。
- [OK] UTF-8：quality 关卡「无占位标记/无乱码/无跨域引用」过（verify 日志行 11）；本审目测 diff/测试中文全部可读。
- [OK] 无 TODO/FIXME/placeholder：同上关卡；data-ticket 标记保留=预裁 3 范畴（tickets:check 过佐证其必要性）。

## C. 代码与测试质量

- [OK] 红证：ai08-red.log 尾部 `Test Files 2 failed / exit=1（构造级：模块不存在）`——真退出码。
- [OK] 绿证：ai08-green.log 5 files/36 用例 exit=0（含 api-surface/preload-surface/ai-sensor.service 契约与受影响面）；另一段 20 用例（19 过）在 09:36:52——见 N-C1 时间线注记。
- [OK] 变异红证：变异1（hasPendingJob 取反）14 failed exit=1（mutation.log:198/476）；变异2（阈值 3→2）离线阈值用例红 exit=1。两变异均命中独立断言面，非恒真。
- [N-C1] 变异日志无还原证据锚点：报告称「cp 备份法还原，diff 空（RESTORE-OK）」，但 ai08-mutation.log 内无 RESTORE-OK/diff 输出记录；且「== 变异2 ==」标签行（:740）出现在其红证输出块之后，日志序与时序（09:36:52 段）交错。还原事实由 10:02 终局 verify 76/484 全绿间接证成（若变异未还原 verify 必红）——判定还原真实成立，属日志留痕瑕疵非虚假申报。
- [OK] e2e 断言真实文本：「AI 一读笔记正文内容（e2e 真实文本锚）」「两读者对样本量的分歧评估」可见断言+heading「一读/裁决」+真 fs 断言（pending job 落盘 1 个、archive 归档存在、corpus-ai 清空）——远超 testid 空壳红线。
- [OK] toast 三桶：imported/skipped 计数+errors 篇名、errors>0 升 error 级（行 1314-1331 断言全串+级）；两动作型失败 toast 用例在。
- [OK] store 单源：ai-notes.store.ts loadNotes/loadObserve 唯一取数点+导入后刷新走同两方法；stale-guard 序号（notes.store 同型）防晚到旧响应覆盖。selector 用 EMPTY_NOTES 稳定引用防 useSyncExternalStore 抖动——细节到位。
- [OK] e2e-env.ts 抽取件正确性（预裁 2 审点）：launch（SYNAPSE_USER_DATA env）/seedPaperRow（双 ABI 备份→子进程→finally 还原）与 reader-text.spec 既有形态同构；`dirs.sort().at(-1)` 兜底取最高 node-v ABI 合理。既有两 spec 未收敛：各自保留原副本，无行为差异风险（两份并存不互相影响；收敛改写归主控裁量成立）。

## D. 报告诚实性

- [OK] 自裁申报 8 条逐条对 diff 属实：预裁全文照录（第 1 条）；data-ticket 在实现根元素非占位组件（diff 行 384）；七问自定标签已声明风险（第 4 条——「第一问…第七问」中性文案，无库内蓝图冲突依据，可接受）；observe 无独立 service 单测（第 6 条）理由成立（受锁不可加+聚合薄层+e2e 真链覆盖）。
- [OK] 数字全对日志：76 文件/484 用例（verify.log:1053-1054）/locks 117（verify.log:26）/e2e 14 passed (1.3m) exit=0（ai08-e2e.log 尾）/红 exit=1（red.log 尾）。
- [OK] git status 实测：7 改+7 新（+dist_new/ 非本单产物已申报）——无范围蔓延。
- [N-D1] 唯一瑕疵=N-C1（RESTORE-OK 未落日志），不推翻「还原真实」结论。

## E. 接缝与后续单

- [OK] 对 09：store 头注+AiNotesSection 头注双向锚定「禁 09 双取」声明均在；AiAnnotationLayer 将订阅同 store——接口已备。data-ai-note-id 渲染节点本单已提前落在 AiNoteGroupList 条目上（diff 行 534），反而为 09 anchor-locate 延展降低接缝成本——票面虽言 09 交付，提前落位无害且被本单分色/高亮用例消费。
- [OK] 对 10：aiStatus 通道原样保留（api-surface 未删改该端点），ZcodeLinkSection 消费面不受影响。
- [OK] anchor-locate 零改动：git status 无该文件；diff 无其 hunks——09 交付面保持。
- [OK] notes.store 零触碰：git status 无该文件。
- [N-E1] 接缝提示（转 09）：observe 的 status 是全局单份（readStatus 不带 paperId），多 tab 打开时每 tab 各自轮询 observe 会重复读同一 status.json——5s×N tab 的 fs 读频可接受，但 09 若引入多标签并发渲染层，建议评估由 store 去重轮询（现单窗口单面板挂载一份组件，无实际问题）。

## 统计

B:0 / W:0 / N:9（A1、C1、D1、E1 四实质项+各节 OK 佐证项）。无回炉项。

## 总评

**PASS**。六态状态机与母本逐格符合，跨格①③⑤用例断言真实文本与真实 fs 事实；宪法红线（安全禁令/分层/行数/受锁/UTF-8）全过；红绿变异四档真退出码、verify 76/484/117/e2e 14 全绿亲证于日志；报告诚实（唯一瑕疵 N-C1：变异还原未在日志留痕，由终局 verify 间接证成，建议后续变异流程把 RESTORE-OK/diff 输出并入日志）。预裁四项均核过：observe 扩契字段字面照办、e2e-env 抽取件正确且未收敛无风险、data-ticket 保留合规、门二补充三条（离线阈值/损坏计数/幂等自愈声明+用例）全部入实现。建议门二重点仅 N-C1 留痕面与 N-E1 轮询去重提示。
