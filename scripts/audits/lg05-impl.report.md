# SR2-LG-05 实现者报告 —— 脉络图 e2e 全链

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 开工技能清点（宪法会话开工纪律）

- **用**：test-driven-development（红→绿→断言级变异红证→verify 四档全程）、
  e2e-testing-patterns（Playwright Electron 惯例：dialog 桩/app.evaluate
  main 侧注入/reload 持久/退出拦截两态先例复用）、verification-before-completion
  （e2e+verify 真退出码落盘）、javascript-testing-patterns（断言鉴别力设计：
  exact 匹配/transform 解析/写落地 poll 证据）。
- **备用于**：systematic-debugging（P7-C 跨单卡点归因全程：二分隔离/时序采样/
  静态排查——见卡点专节）。
- **不用**：git 写操作类（实现者禁令）、subagent-driven-development（末端实现者
  不派发）、browser-use/webapp-testing（Playwright 自动化非手动浏览器）、
  前端设计/数据工程类（无交集）。
- 配置自查：实现者 GLM-5.3（主控派发配置），思考等级由主控设定。

## 摘要

- **占位恒真 test 已删净**（主控收口亲验前提）：spec 内现为 4 个全链用例
  （playwright 场景句柄），八验收面①~⑧全覆盖、逐面有断言（映射见自裁 1）。
- **守卫修订（主控裁定 5）**：skip 条件从「依赖组∪自身」收敛为**仅依赖组**
  （`DEPS.filter(!isTicketDone)`）——自身条件在实现完成后反而阻碍验证；头注
  对应行同步修订（票面文字级，自裁申报 2）。
- **种子链（裁决 2 最小面）**：papers 三篇经 e2e-env.seedPaperRow（甲=真实
  PDF 供⑤⑥重锚与跳转；根/乙=幽灵行——validateDraft 只查 papers 行存在，
  脉络视图不打开它们）；AI 笔记走 08 先例预置链（corpus-ai 产物 fs 直写+
  status.json 空闲心跳→真 07 导入器 UI 导入→真 DB）——**零新种子脚本、
  零受锁基建改动**。
- **dialog mock（N8）**：app.evaluate 覆写 electron.dialog.showOpenDialog
  （corpus-export.spec.ts:132 同族——dialogs.ts pickJsonFile 调用点动态读该
  属性，覆写即生效）；confirm=win.on('dialog') 自动接受（zcode-link 同型）。
- **⑦写通道 mock（N8 字面）**：app.evaluate 于 main 侧 ipcMain.removeHandler
  +handle 重注册 'lineage/upsert-node' 抛错；退出拦截走**真聚合链**
  （store error 态→useLineageDirty→App effect→setQuitDirty→main 缓存→
  close→showMessageBox 桩两态：取消=窗口保持/确认=destroy 归零）——
  reader-text.spec.ts:285 退出拦截先例同型。
- **e2e 终态**：**19 passed / 0 skipped / 1 failed**——失败=reader-text.spec
  P7-C（**跨单 pre-existing 缺陷，与本单零交集**，独立最小复现实证+完整证据
  链见卡点专节；本单 4 用例全绿）。
- **verify 终局**：EXIT=0（quality+tickets+locks 130+lint+typecheck+
  **test 85 文件 614 用例全过**+build）——e2e 不在 vitest 计数（口径同基线）。

## 文件清单

受锁面（unlock→批内改→apply 全程留痕，locks 130 条不变——本文件已在
manifest，内容 sha 随 apply 同步）：
- tests/e2e/lineage.spec.ts（占位 47 行→全链 516 行；头注票面原文保留+
  实现注追加；4 test：T1=①②/T2=③⑧/T3=④⑦/T4=⑤⑥）
- locks/manifest.json（lineage.spec.ts 内容 sha 更新）

非受锁面：零（本单零 src 改动——git status 实证 src/ 仅余 LG-04 遗留的
untracked open-paper-anchor.ts，见卡点专节申报）。

## 红证四档（TDD）

1. **红**：占位替换后首跑 EXIT=1（4 failed——lg05-red.log 尾注）。
   首红=nav「脉络」按钮子串匹配命中文献库三篇条目（strict mode violation
   4 元素）——真实失败面；第二轮红=pan 起点撞导入 toast 卡片（tx 恒 0）+
   toHaveText 不收 stringContaining（T2）——T3/T4 先行转绿。
2. **绿**：lineage.spec 4/4 passed（26s）；全量 e2e 19 passed/0 skipped
   （占位 skip 已消）/1 failed（P7-C 跨单，见下）。
3. **断言级变异红证**（cp 备份法，禁 git checkout；每变异 rebuild 后单测
   用例验红→cp 还原→diff 空；lg05-mutation.log 含实施痕迹）：
   - M1 lineage-import.ts 导入成功 toast 文案「已导入脉络图：」→「X」——
     T1 红（1 failed，exit=1）；还原 diff 空。
   - M2 lineage.service.ts 多父拒绝文案「多父边拒绝：」→「X」——T3 红
     （1 failed，exit=1）；还原 diff 空。
   - M3 LineageSideAiNotes.tsx 色块 QUESTION_COLOR[n.question]→常量 Q2 色
     ——T4 红（分色断言 1 failed，exit=1）；还原 diff 空。
   - M4 lineage.store.ts moveNode 落点改写回旧值（x,y→n.x,n.y）——T2 红
     （落点 poll 失败 1 failed，exit=1）；还原 diff 空。
     （M4 首次 sed 模式失配零改动——diff 备份即发现，二次精确变异；
     四变异覆盖 T1~T4 每用例断言鉴别力。）
4. **verify 终局**：lg05-verify.log 尾注 EXIT:0——quality（无 TODO/FIXME/
   placeholder）+tickets+**locks 130 一致**+lint+typecheck+**test 85/614**+
   build。四变异后 git status src/ 零残留（仅 LG-04 遗留 untracked）。

## 卡点专节：reader-text.spec P7-C 稳定失败（跨单缺陷，报告主控裁决）

**现象**：'P7-C 收官：侧栏笔记面' 在全量与单独跑均失败——`fill('笔记正文')`
后约 110ms 渲染进程白屏（#root childElementCount=0，React 整树卸载），
pageerror=`TypeError: Cannot read properties of undefined (reading 'length')`。

**与本单无关的实证**：
- 本单改动面=仅 tests/e2e/lineage.spec.ts（git status 实证零 src 改动）；
- 独立最小复现 spec（临时，已删）不含任何 LG-05 改动：双击文献→笔记 tab→
  fill→110ms 崩；fill「笔记标题」同崩（onEdit 公共链）；不 fill 空闲 6s 不崩
  （排除 AiNotesSection 5s observe 轮询）；无划选高亮（无 annotations）也崩
  （排除 AnnotationLayer:104 quoteText 链）；崩点在 onChange 同步渲染链
  （远早于 1500ms 防抖保存）。
- 静态排查：fill 链全部订阅者（ReaderNotesPanel/TabBar/App→ReaderPage 全
  子树/FragmentNotesList/annotation-order/notes.store/tab-dirty）逐文件审读
  无未防御 length 读取；生产 bundle 无 sourcemap、pageerror 序列化丢栈、
  CDP exceptionThrown 未捕获——定位止步于此（时间预算 1.5h 收手）。
- vitest 85 文件 614 用例全绿（含 reader-notes-panel 组件级）——崩点在
  e2e-only 装配面。

**申报 1（LG-04 收口遗漏，确凿）**：`src/renderer/features/reader/
open-paper-anchor.ts` 为 **untracked 未提交文件**（git status ??），但
HEAD 的 ReaderPage.tsx:30 `import { openFromBus } from './open-paper-anchor'`
引用它——**checkout HEAD 后 npm run build 必失败**（本地 build 从 working
tree 取源故本会话无感）。建议主控收口时补提交。
**申报 2（基线存疑）**：主控简报基线「e2e=16 passed/1 skipped」与本会话
观察矛盾（P7-C 确定性失败，非 flake——三次复现一致）；请主控核实基线跑点
（若基线在 LG-04 收口前取得，则 P7-C 回归嫌疑指向 LG-04 的 ReaderPage 接线
或其未提交部分；若基线真实含 P7-C 绿，则环境差异需另查）。
**归属**：P7-C/reader 域缺陷超出 LG-05 票面，按「卡住了就停」纪律不越单修
——**主控裁决**（修复工单归属/是否 LG-04 回炉）。

## locks 实录

130（unlock→批内改 spec→apply 130 只读重锁，manifest 中 lineage.spec.ts
内容 sha 同步）。本单无新增受锁路径（spec 已在 manifest）→无 locks:generate。
manifest 变更随本单提交，提交信息须带 [locked-change] 尾注（主控收口执行）。

## 自裁申报

1. **八用例组合并为 4 个 playwright 场景句柄**（裁决 1「可合并为合理 test
   数」）：T1=①导入渲染真实文本+②pan/zoom 后可断言；T2=③拖拽 reload 持久
   +⑧主题节点添加/编辑 core_idea reload 持久（同 launch 两轮 reload——
   Electron 启动是 e2e 主要成本）；T3=④树拒绝 toast+⑦保存失败退出拦截
   （同一 launch：先 CONFLICT 后系统型，互不干扰——拒绝型被丢弃不卡队列
   断言先行）；T4=⑤分节分色+⑥双击跳转（AI 笔记导入链与脉络链共用一次
   launch）。每验收面均有独立断言（八面→四 test 映射入 spec 头注）。
2. **守卫修订=仅依赖组**（主控裁定 5，票面文字级）：连带头注「双条件」段
   落后补实现注说明；「完成后 e2e 16→17」的过时数字行同步删除（数字是
   占位期预估，实际 16+N 由主控基线口径管理）。**因此本单无需「临时翻
   registry 试跑」**——解法二（仅依赖组）下 spec 在自身 open 期即激活，
   无对应还原纪律记录（不适用，如实申报）。
3. **fixture 种子方案**：papers 种子复用 e2e-env.seedPaperRow（Rule of
   Three 第 2 次保持重复先例）；根/乙为幽灵行（无 PDF 文件）——脉络全链
   不打开它们，validateDraft 幽灵拦截=查 papers 行存在而非文件；AI 笔记
   走 08 预置+真导入器链而非直 SQL——零新脚本、真 07 链路覆盖（比 SQL
   种子多锚一层导入器真实行为）。
4. **⑥锚定位断言取「可见性」选项**（票面「data-ai-note-id 可见性/滚动
   位置」二选一）：locate-flash 类不作硬断言——flashAiNote 对未渲染 rect
   静默 return 无重试，AI 层异步渲染与 exact 闪烁存在竞态，硬断言 flake。
   断言=阅读器 ai-note-rect[data-ai-note-id=被双击条目 id] 可见（id 链路
   匹配=exact 层目标正确性证据）。
5. **pan 起点取左下角**：右上角有导入成功 toast 卡片盖在 svg 外层
   （pointerdown 落 toast 不冒泡 svg——pan 永不启动，第二轮回炉实证）；
   左下角 y≈height-40 避开层带横线（布局系 y=0/140/280）与左上层带标签。
6. **写落地证据=poll transform 到达落点**（store 回填在 await unwrap 之后
   ——transform 更新即写已成功）再 reload，无裸 sleep；⑦退出拦截前 1s
   缓冲（App effect+IPC 往返毫秒级，reader-text 直发通道+await 落地先例
   不适用——本单走真聚合效应，无直发面可 await）。
7. **T4 顺序=先阅读器后脉络**：AI 面板宿主在阅读器笔记 tab（导入链前置），
   回脉络导入草稿后单击/双击——顺序由宿主结构决定，非自由编排。
8. **删减面 diff 自查**：git status=tests/e2e/lineage.spec.ts（M）+
   locks/manifest.json（M）+scripts/audits/lg05-*.{log,md}（新证据）；
   src/ 零改动（open-paper-anchor.ts 为 LG-04 遗留 untracked，本会话未
   触碰其内容）；dist_new/ 历史残留（LG-01~04 报告同声明）。无范围蔓延。
9. **工单号引用纪律**：SR2-LG-05 全号仅票面文件头注原文；实现注用「LG-05」
   短式；spec 正文注释零其他 open 工单全号。

## 疑虑

- **P7-C 跨单缺陷**（卡点专节）：终态 e2e 19 passed/1 failed 的 failed 归属
  reader 域，主控裁决前「e2e 全绿」口径无法闭合——本单 4 用例+其余 15 个
  既有用例全绿是可交付面。
- **LG-04 遗漏 open-paper-anchor.ts 未提交**：CI checkout HEAD build 必红
  ——主控收口必须处理（补提交或并入修复单）。
- **T4 未断言 flash 类**（自裁 4）：若门审要求更强 exact 证据，可加「poll
  locate-flash 存在窗口」的软断言（容错超时不 fail）——现断言已是可见性
  口径的最强稳定形态。
- **T3 拒绝型断言后立即 patch 写通道**：若未来保存态指示条呈现时机变化
  （saving 瞬态闪现），lineage-save-status 计数断言可能需跟进——现实现
  CONFLICT 丢弃路径不置 error，断言稳定。
- 日志四件：scripts/audits/lg05-{red,e2e,mutation,verify}.log（真退出码
  见各尾注/回显：红=1/终态 e2e=1（P7-C）/变异=1×4/verify=0）。
