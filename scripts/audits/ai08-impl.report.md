# SR2-AI-08 实现报告（实现者子代理）

技能清点（开工纪律）：用 test-driven-development（四档红绿变异）/verification-before-completion（verify+e2e 亲验退出码）/javascript-testing-patterns（组件测试夹具惯例）/e2e-testing-patterns（Electron e2e 先例）；不用 browser-use/webapp-testing（e2e 由 playwright 脚本执行）、frontend-design（票面 UI 已定六态规约）。

## 实现摘要

笔记面板 AI 面全链落地：ReaderNotesPanel 下部挂 AiNotesSection（六态状态机：hidden/idle/pending/queued/reading/done-unimported，判定事实=observe 通道四事实单源）+「AI 读文献」按钮（request-read 写 job，D2b 手动激活）+5s 门控轮询（挂载期间，卸载清 interval）+「导入 AI 笔记」三桶 toast+AiNoteGroupList 分节（role 三组×七问分色单源 ai-note-style，只读 INV-19）+条目单击 locateAnchor（INV-20 消费方；anchorPage 1 基→0 基）。

契约扩（主控预裁方向 B——全文列入自裁申报）：新增第五通道 `ai-sensor/observe`（Req=paperIdReqSchema；Res=strict { status: SensorStatus|null, hasPendingJob, productExists, archivedExists }）——schemas.ts observeResSchema+api-surface 端点+service observe() 聚合（三事实方法已有+readStatus，损坏≠missing 三态分离上抛保持）+ipc 薄分发改一行。组件轮询单次 observe 取全四事实（不并发调 aiStatus）。

门二补充三条落实：①轮询失败 error 态——连续 3 次离线提示行（用例「轮询失败 error 态」「status.json 损坏计入计数」）；②status.json 损坏路径单测——mock observe 拒绝（06 readStatus 损坏上抛→renderer 计连续失败）；③writeStatusProtocol 失败面幂等自愈声明——ai-notes.store.ts 头注落码（requestRead 失败零本地残留态/无自建 in-flight 锁，用例「『AI 读文献』失败…重试可再点」）。

## 文件清单

新增：
- src/renderer/features/reader/ai-note-style.ts（七问分色+中文标签+role 标签单源）
- src/renderer/features/reader/ai-notes.store.ts（AI 笔记+观测事实 store；writeStatusProtocol 声明）
- src/renderer/features/reader/AiNoteGroupList.tsx（分节纯展示+定位上抛）
- tests/unit/renderer/ai-note-style.test.ts、tests/unit/renderer/ai-notes-section.test.tsx（受锁新增）
- tests/e2e/ai-notes-section.spec.ts（受锁新增）、tests/e2e/e2e-env.ts（Rule of Three 抽取基建）

修改：
- src/shared/ipc/schemas.ts（observeResSchema [locked-change]）、src/shared/ipc/api-surface.ts（observe 端点 [locked-change]）
- src/main/services/ai_sensor/ai-sensor.service.ts（observe 聚合）、src/main/ipc/ai_sensor.ts（observe 一行）
- src/renderer/features/reader/AiNotesSection.tsx（占位→实现，249 行≤250）、ReaderNotesPanel.tsx（挂载一行）
- locks/manifest.json（[locked-change]）

## 红证四档

| 档 | 命令 | 退出码 | 日志 |
| --- | --- | --- | --- |
| 红 | npm run test -- ai-note-style.test.ts ai-notes-section.test.tsx | 1（构造级：模块不存在，2 文件加载失败） | scripts/audits/ai08-red.log |
| 绿 | npm run test --（新测+受影响面 reader-notes-panel/outline-aside/contracts/services） | 0（33+36 用例） | scripts/audits/ai08-green.log |
| 变异红证 | 变异1 `if (facts.hasPendingJob)`→`if (!...)`：14 用例红 exit=1；变异2 `POLL_FAIL_THRESHOLD 3→2`：离线阈值用例红 exit=1；均 cp 备份法还原，diff 空（RESTORE-OK） | 1/1 | scripts/audits/ai08-mutation.log |
| verify 终局 | npm run verify（quality+tickets+locks+lint+typecheck+test+build） | **0**：76 文件/484 用例全绿（基线 74/462，+2 文件+22 用例）；locks 117（基线 113，+4=两单测+e2e spec+e2e-env.ts） | scripts/audits/ai08-verify.log |

## 测试证据（含 e2e）

- 单测：ai-note-style 2 用例+ai-notes-section 18 用例（六态渲染/跨格序列①③⑤/离线阈值/损坏计数/三桶 toast×2/动作型失败/分组分色/只读/locateAnchor/卸载清 interval）——always-active（不经 guardedDescribe）。
- e2e：`npm run build && npm run test:e2e` → **14 passed (1.3m) exit=0**（基线 13，+1=ai-notes-section.spec 全链：写 job 真 IPC→真 fs pending 落盘断言→status.json fixture→reading→产物落盘+job 移除+status 移出本篇→done-unimported→真 07 导入器→真 DB→分节渲染真实文本+archive 归档断言）。日志 scripts/audits/ai08-e2e.log。

## locks 实录

unlock→批内改（schemas/api-surface/两单测/e2e spec）→locks:generate（113→117，含 4 新受锁文件）→apply；中途三次 unlock/apply 往返（行数超限修正、测试类型收窄、e2e 修正），终局 locks:check 通过（117 与 manifest 一致）。manifest 变更随提交带 [locked-change]。

## 自裁申报

1. **主控预裁全文列入**（按裁决要求）：「主控裁决（预裁，按 ADR-0017 三分法第 2 款；你须将本裁决全文列入自裁申报）：采你列的方向 B。具体规约：新增第五通道 observe：Req=paperIdReqSchema；Res=strict 对象 { status: SensorStatus | null, hasPendingJob: boolean, productExists: boolean, archivedExists: boolean }（字段名照此；status=null=status.json 不存在，与 aiStatus 语义一致）。通道名 'ai-sensor/observe'；schemas.ts 新增 observeResSchema（含注释：六态状态机判定事实单源——08 票面消费面）；api-surface.ts ai_sensor 域加端点；ipc/ai_sensor.ts 薄分发改一行（service 侧 ai-sensor.service.ts 补 observe(paperId) 聚合方法——三事实方法已有，聚合+status 读；损坏≠missing 三态分离上抛语义保持）。shared 是受锁面：locks:unlock→批内改→generate（含你两份新测试）→apply。此扩契约非放宽（契约测试十域穷举不变，方法枚举经 allChannels 自动覆盖）。组件轮询改用 observe 单次调用取全四事实（不再并发调 aiStatus）。按原六段简报+③补充三条重启。报告与日志照旧落 ai08-*。」——逐条照办（字段名/通道名/注释字面/单次调用均照此）。
2. **data-ticket 保留**：tickets:check 机器关卡要求 open 工单持 data-ticket 占位标记（删除则 verify 红）；故 AiNotesSection 根元素持 `data-ticket="SR2-AI-08"`（非空占位组件，是真实现上的标记）。**registry 翻 done 时须同步移除该属性**（收口单写动作）。
3. **e2e-env.ts 抽取（Rule of Three 第 3 次触发）**：launch/seedPaperRow 在 reader-text/corpus-export 两 spec 各一份（第 2 次保持重复），本单第 3 次出现→抽 tests/e2e/e2e-env.ts 共用；**既有两 spec 未收敛改写**（受锁+他票面，超票面不顺手改，归主控裁量）。
4. **七问中文标签**：repo 无蓝图 §4.2 七问文案原文可引（ROADMAP 指针外部文档未在库内），自定中性标签「第一问…第七问/分歧报告」为 ai-note-style 单源——若与蓝图冲突由主控/审查校正单文件即可。
5. **取色复用既有 theme.css 变量**（Q1~Q5=annotation-*、Q6=accent、Q7=ok、divergence=danger），未改 theme.css（非票面受锁面，避免范围蔓延）。
6. **service observe 无独立单测**：既有 ai-sensor.service.test.ts 受锁不可加用例；observe 为三已测方法+readStatus 的聚合薄层，契约形状由 renderer mock 测试（ObserveRes 形状驱动六态）+e2e 真链覆盖。
7. STATUS_POLL_MS=5s 组件域私有（票面原文，未提 shared）；e2e 状态迁移断言超时留 12s 轮询余量。
8. 删减面 diff 自查：git status 仅票面 7 改+7 新（含 manifest）+既有未跟踪 dist_new/（非本单产物，未触碰）；无 TODO/FIXME/placeholder（quality 关卡过）；UTF-8 中文可读（mojibake 关卡过）。

## 疑虑

- e2e fixture「工具完成」需同时移 job+改 status（currentPaper=null）才退出 reading——与 06 failed 态消解声明一致（心跳新鲜指他篇/null 非本篇完成语义），非实现缺口；真实 companion 行为面归 AI-06 工单测试。
- aiStatus 通道仍存（AI-10 设置节消费面），本单未动。
