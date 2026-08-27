# SR2-AI-10 实现者报告 —— ZcodeLinkSection（设置页 zcode 联动）

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 摘要

- 设置页 zcode 联动落地：detect 五态纯 fs 检测（not-found/skill-missing/installed-idle/
  running/error——running 单源=AI-06 readStatus 的 running 字段，本服务零阈值双写）；
  一键装技能=main 侧技能模板递归复制（cp recursive，覆盖装=删除重建），
  **全链零进程（INV-21）**；节可见期 5s 门控轮询（08 同族，卸载清 interval）。
- IPC 两通道 zcode-link/detect + zcode-link/install 挂 ai_sensor 域（主控裁决 1，
  ADR-0017）；Res/Req strict schema 自拟命名对齐既有风格。
- e2e INV-21 断言=纯 fs 落地（主控裁决 4）：装技能全流程后 skills 目录文件存在且
  与仓库模板逐字节一致——不依赖任何进程行为面。
- INV-21 在 invariants.md 由「未锚定（规划期预登记；锚定随 SR2-AI-10）」翻
  「已锚定（e2e 纯 fs 断言）」——登记册闭环。

## 文件清单

实现面（均非受锁）：
- src/main/services/ai_sensor/zcode-link.service.ts（新增，132 行 ≤500：detect 五态/
  install 复制/resolveTemplateDir 双源收敛）
- src/main/services/index.ts（ServiceDeps 增 zcodeBaseDir+templateDir；ai_sensor 交并
  ZcodeLinkService，readStatus 以 06 实例闭包注入=单源）
- src/main/ipc/ai_sensor.ts（薄分发两行）
- src/main/bootstrap.ts（SYNAPSE_ZCODE_HOME env→构造参数映射+resolveTemplateDir
  装配（__dirname/process.resourcesPath/app.isPackaged））
- src/renderer/features/settings/ZcodeLinkSection.tsx（实现 148 行 ≤250；data-ticket
  占位保留至翻 done——check-tickets 关卡 3 要求 open 工单持有标记）
- src/renderer/features/settings/SettingsPage.tsx（挂载一行）
- electron-builder.yml（extraResources: tools/ai-sensor → ai-sensor）
- docs/invariants.md（INV-21 锚定翻格）

受锁面（unlock→批内改→generate→apply 全程留痕，118→121）：
- src/shared/ipc/schemas.ts（+zcodeLinkDetectRes/InstallResSchema+类型 [locked-change]）
- src/shared/ipc/api-surface.ts（ai_sensor 域 +zcodeDetect/zcodeInstall [locked-change]）
- tests/unit/services/zcode-link.service.test.ts（新增 [locked-change]，13 用例）
- tests/unit/renderer/zcode-link-section.test.tsx（新增 [locked-change]，16 用例）
- tests/e2e/zcode-link.spec.ts（新增 [locked-change]，1 用例）
- tests/e2e/e2e-env.ts（launch 增可选 extraEnv 参数 [locked-change]——既有调用零改动）
- locks/manifest.json（121 条）

## 红证四档（TDD）

1. 红：两新测试文件首跑套件失败（组件为占位、服务不存在——断言级红非 import 红
   之外的恒真），scripts/audits/ai10-red.log，npm exit=1（14 failed/474 passed）。
2. 绿：npm run test 79 文件 520 用例全过（基线 77/491 → +2 文件+29 用例：
   组件 16+服务 13），scripts/audits/ai10-green.log，exit=0。（回炉 W1 更正：
   原文 504/+13 为手数错——verify 日志末尾手写 echo 行「504 [回炉后口径]」
   亦为错数，vitest 实际输出 520，以日志机器输出为准。）
3. 断言级变异红证（cp 备份法，禁 git checkout；npm 真退出码；四轮还原 diff 均空输出，
   scripts/audits/ai10-mutation.log）：
   - M1 detect 吞 readStatus 上抛（.catch(()=>null)）→ error 态用例红（exit=1）；还原 diff 空。
   - M2 install 覆盖装不删旧（去 rm）→ 残留不存活用例红（exit=1）；还原 diff 空。
   - M3 组件卸载不清 interval（去 clearInterval）→ 卸载用例红（exit=1）；还原 diff 空。
   - M4 覆盖型确认文案变异（恒用首装文案）→ 覆盖重申用例红（exit=1）；还原 diff 空。
4. verify 终局：scripts/audits/ai10-verify.log，exit=0（quality+tickets+locks 121+lint
   +typecheck+test 79/520+build）。

## 测试证据（含 e2e）

- 单测 service（13）：五态全枚举/not-found 短路不触协议/overwrite 事实（目录在
  SKILL.md 缺）/readStatus null 不扰 idle/running 单源消费/error 含中文 reason
  （status.json 损坏路径——mock readStatus 上抛）/跨格序列②（idle→running→idle）/
  递归复制含 prompts/fileCount/覆盖装删除重建/模板缺失上抛含路径/resolveTemplateDir
  dev+prod 双源（注入字符串路径，不依赖真打包产物——主控裁决 3）。
- 单测组件（16）：五态渲染/两确认型（首装不含「覆盖」、overwrite 含「覆盖」）/取消不
  调 install/busy 禁用防重复/装失败动作型 toast+复位/detect 拒绝与 Res error 两路径
  的 error 呈现+重试/跨格序列①②/卸载清 interval。
- e2e：scripts/audits/ai10-e2e.log，16/16 passed（基线 15→16）。新用例：SYNAPSE_
  ZCODE_HOME 隔离假 home→设置页「未发现 zcode」→.zcode 目录 fs 出现→轮询驱动
  「技能未装」→confirm 自动接受→一键装技能→「已装技能，未运行」→**纯 fs 断言**：
  skills/ai-sensor 下 SKILL.md/companion.mjs/queue.mjs/prompts/first-read.md 存在且
  SKILL.md 与仓库模板逐字节一致+成功 toast 真实文本。

## locks 实录

unlock（118 解锁）→批内改 schemas/api-surface/两单测/e2e spec/e2e-env→generate
（121 条，新增 3 受锁路径）→apply（121 只读）→check-locks 一致 exit=0。manifest
变更随本单提交，提交信息须带 [locked-change] 尾注。

## 自裁申报

1. **SYNAPSE_ZCODE_HOME env（e2e 隔离方案，主控裁决 4 授权自设计）**：注入点=
   zcode-link.service 构造参数 zcodeBaseDir（非全局 env 篡改）；bootstrap 仅做
   env→参数映射，与 SYNAPSE_USER_DATA（AI-06/08 先例）同型，已在 bootstrap 头注
   环境钩子清单登记。e2e-env.launch 增可选 extraEnv 参数（默认空——既有 3 个调用
   方零改动，锁定文件最小延展）。
2. **detect Res 增 overwrite 字段（票面外自拟）**：覆盖型二次确认（票面「覆盖已有时
   二次确认」）需要 renderer 侧知道「技能目录在但 SKILL.md 缺」这一 fs 事实；不上
   该字段则覆盖型确认无从触发。字段语义已在 schemas 头注声明。
3. **确认对话框两型落地（主控裁决 5）**：两型均确认，首装文案不含「覆盖」字样、
   overwrite=true 文案重申覆盖——组件测试两型分别断言。
4. **busy 期暂停轮询覆写呈现（busyRef）**：install 在途期间 5s 轮询不覆写 res，
   防装完前后呈现跳变竞态；非票面明文，防竞态最小发明。
5. **data-ticket 占位保留**：check-tickets 关卡 3 要求 open 工单的 UI 文件含
   data-ticket="SR2-AI-10"；票面「完成后删除占位」以翻 done 为前提（PaperDetailPanel
   同型先例）——收口单翻状态时移除该属性（一行）。
6. **删减面 diff 自查**：git diff --stat=10 文件 221+/83-，全部在本票交付面（服务/
  装配/ipc/schema/surface/组件/挂载/打包配置/受锁测试/manifest）+invariants.md；
  未跟踪 dist_new/ 为 2026-08-23 前残留（本会话未触碰）；无范围蔓延。
7. **INV-21 零 spawn 证明**：git diff 中 child_process/spawn 字样仅存在于注释与
   e2e-env.ts 既有 seed spawn 的 diff 上下文行；本单全部新增实现文件
   （zcode-link.service/ZcodeLinkSection/ipc/bootstrap/services.index/schemas/
   api-surface）grep 零 child_process/spawn/exec 调用——install=fs cp，
   detect=fs stat+readStatus，renderer 仅 IPC invoke。
8. 组件直接 api+unwrap（不经 store）：本节无跨组件共享态，CorpusExportSection 有
  store 系事件桥需求而本节无——不引第三份 store 模式。

## 疑虑

- detect 五态中 error 态的 fs 异常路径（stat 非 ENOENT 错误）经 catch-all 折叠为
  error 态——与「禁 catch-all」文化条款的张力已在服务头注声明（三态分离在 06
  readStatus 保持，本服务的 catch 是五态状态机呈现层折叠，reason 原文透传不吞）。
- prod 模板源（resourcesPath/ai-sensor）无 e2e 覆盖（不打包真产物跑测——主控
  裁决 3 明示勿依赖真打包产物）；extraResources 配置面经 dist 产物人工验收更稳，
  归收口单裁量。

## 回炉 1 轮记录（门一 W1/W2——2026-08-27 主控派发；W1 数字更正与本文档收尾由主控代记，因 zcode 宿主崩溃中断实现者收尾）

- W2（主项，宪法测试纪律「每个测试必须能失败一次」）：组件测试两用例原对占位
  恒绿——①「确认取消」②「卸载清 interval」。修复=补前置事实断言（①呈现真实
  态文本+install spy not.toHaveBeenCalled+态保持；②unmount 前轮询确已发生
  （calls≥1）+advance 15s 后 calls 不增）；自验=占位还原法 R1（npm exit=1，
  ai10-mutation.log 末段）——两用例对占位确红。
- W1：本文档三处数字更正（绿 504→520；组件 17→16；服务 14→13；verify 终局
  79/520），及指明 verify 日志手写 echo 行「504」为错数、以 vitest 机器输出为准。
- 回炉后终局：npm run verify exit=0（ai10-verify.log 11:08 时戳段：79 文件
  520 用例/locks 121）。
