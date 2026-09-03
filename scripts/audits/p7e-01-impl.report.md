# P7E-01 实现报告——标签生命周期（改名/合并/删除）

状态：**DONE_WITH_CONCERNS**（实现面全绿；1 条票面假设与事实不符的说明 +
1 条 e2e 环境级波动记录，见 §6；无超票面自裁决定——拆 TagLifecycleMenu.tsx
为 250 行红线触发的票面预案内动作）

## 1. 改动文件清单

修改（9）：
- `src/main/db/repos/tags.repo.ts` —— 头注修订（b3: P7-E 指针/跨表事务条款/
  生命周期层兑现）+四方法 findByName/renameTag/mergeTags（三步事务）/deleteTag（两步事务）
- `src/main/services/tags.service.ts` —— TagsDomainError（NotesDomainError 同型）
  +rename/merge/delete 三方法（校验序按票面：trim 空→存在→冲突/自身）
- `src/main/ipc/tags.ts` —— 三通道委托三行
- `src/shared/ipc/schemas.ts` —— [受锁面·主控预解锁] tagIdReqSchema/
  renameTagReqSchema/mergeTagReqSchema 三 schema
- `src/shared/ipc/api-surface.ts` —— [受锁面·主控预解锁] tags 域三通道
  （rename=tagSchema/merge+delete=trueAckSchema）；register/preload 泛型遍历零改（亲核）
- `src/renderer/features/tags/tags.store.ts` —— 命令型三动作（mutate 共用壳：
  成功链式 refresh；NOT_FOUND 失败自愈 refresh=S7，余零 refresh=S6）+
  TagWithCount/TagsMutationResult 导出
- `src/renderer/features/tags/TagFilter.tsx` —— chip onContextMenu+菜单/对话框
  宿主+`onMutated?` prop+handleMutated（S2/S3 顺序契约：先 onFilterChange(null) 后 onMutated）
- `src/renderer/features/library/FilterBar.tsx` —— onMutated 注入 library load
  （白名单既有路径零改，check-quality 亲验「无跨域引用」通过）
- `src/renderer/features/tags/TagEditor.tsx` —— :92 v2 预留注记兑现修订

新建源文件（2）：
- `src/renderer/features/tags/TagLifecycle.tsx` —— 三对话框（rename 预填/merge
  目标 chip 点选即确认/delete 计数文案；ref 型 busy 守卫=S8；失败 toast 保持开=S6）
- `src/renderer/features/tags/TagLifecycleMenu.tsx` —— 右键菜单（LineageNodeMenu
  同型；单标签「合并到…」禁用=S9）——初版三件同文件 265 行触组件 250 红线，
  按「出现第二职责就拆」+lineage 先例拆出，quality:check 复绿

新建测试（5，全 always-active 不经 guardedDescribe）：
- `tests/unit/db/repos/tags-lifecycle.repo.test.ts`（5 用例）
- `tests/unit/services/tags-lifecycle.service.test.ts`（11 用例）
- `tests/unit/renderer/tags-lifecycle.store.test.ts`（5 用例）
- `tests/unit/renderer/tag-lifecycle-ui.test.tsx`（6 用例，含补锚「合并成功后
  对话框关闭」——诊断 e2e 瞬态问题时确认为契约面顺手入册）
- `tests/e2e/tag-lifecycle.spec.ts`（1 用例，种子三篇+真实文本断言+S2 装配级）

## 2. 先红证据（scripts/audits/p7e-01-red/）

- `tags-lifecycle.repo.raw.txt` —— 5/5 红（缺失方法 TypeError）
- `tags-lifecycle.service.raw.txt` —— 11/11 红（svc.rename/merge/delete is not a function）
- `tags-lifecycle.store.raw.txt` —— 5/5 红（renameTag is not a function）
- `tag-lifecycle-ui.raw.txt` —— 6/6 红（右键后菜单缺席）
- `tag-lifecycle.e2e.raw.txt` —— 红（打标签链通过后 `tag-menu` 缺席超时——真功能红；
  首次红为测试定位器缺陷「exact 文本匹配不到含×子按钮的 chip」已改 aria-label 锚后复跑）
- 说明：service/store 两文件首跑红证因缺 `describe` 导入（vitest 未开 globals）
  收集期失败，修导入后重跑落盘上述真红——修的是测试自身可运行性非断言。

## 3. 绿证（scripts/audits/p7e-01-green/）+数字实测

- `unit-all4.raw.txt` —— 新增四单测文件 27/27 绿
- `full-unit.raw.txt` —— 全量 **132 文件 / 1140 用例全绿**（基线 128/1113：
  +4 文件 +27 用例，机器输出在档）
- `tag-lifecycle.e2e.raw.txt` —— 新 spec 单跑绿（修复瞬态定位歧义后 3 连绿
  +终态复跑绿，~2.9s/次）
- lint / typecheck / build / quality:check / tickets:check 全绿（tickets 统计
  119 票 open 0——P7E-01 条目为强票不阻塞 weak 统计，与票面预期一致）

## 4. 变异红证（scripts/audits/p7e-01-mut-m{1..4}.raw.txt，含命中证明；cp 备份法，还原后 diff 逐组验空）

- M1 repo mergeTags 删第二步 `DELETE paper_tags` —— 命中证明（grep 计数 1→0）
  → repo 测试 1 红。**与票面假设的偏差**：孤儿挂接残留用例未红——001_init.sql
  paper_tags.tag_id 带 `ON DELETE CASCADE`，外键级联兜底了孤儿（删除源标签行
  时挂接自动清）。红证经**事务原子性 mock 用例**成立（第二步语句被桩武装为
  抛错、变异后不再调用→toThrow 失败）。显式第二步保留（票面明定三步，且
  mock 编排锚依赖它）。
- M2 service rename 撤 CONFLICT 预检（条件恒假）—— 命中证明（grep=1）→
  service 测试 1 红（CONFLICT 用例 rejects 落空）
- M3 store mutate 成功后撤链式 refresh —— 命中证明（`await get().refresh()`
  2→1）→ store 测试 3 红（成功链式 refresh 全族）
- M4 TagFilter 撤 S2 onFilterChange(null)（条件恒假）—— 命中证明（grep=1）→
  UI 测试 2 红（S2/S3 invocationCallOrder+toHaveBeenCalledWith(null)）

## 5. 态空间 S1~S10 锚定对照

S1=store 测试（loadSeq 迟到丢弃）；S2/S3=UI 测试 invocationCallOrder+e2e 删除段
（丙回归=死筛选清空装配证）；S4=UI 测试（合并目标=选中→onFilterChange 零调用）；
S5=e2e 改名段（id 稳定甲行在场+徽标更新）；S6=store 测试（CONFLICT 零 refresh）+
对话框保持开（实现契约，UI 侧 S8 用例顺带锚 toast 路径）；S7=store 测试（NOT_FOUND
自愈 refresh）；S8=UI 测试（同 act 双击 rename 仅一次）；S9=UI 测试（菜单禁用）；
S10=幂等双 load 由 library.store 既有 loadSeq 承接（实现依赖既有守卫，未单列用例
——store 测试 S1 已锚同族机制）。

## 6. 顾虑与波动记录（DONE_WITH_CONCERNS 的原因）

1. **票面 M1「孤儿挂接残留」假设与 schema 事实不符**（FK CASCADE 兜底，见 §4）。
   测试网仍拦住变异（经编排锚），非防线缺口；但若后续把 CASCADE 改为 RESTRICT/
  去掉级联，孤儿用例的 raw COUNT 断言即在位——两道锚互补，无需回炉。
2. **e2e 环境级波动 ×1**（指纹：`electronApplication.firstWindow` 30s 超时于
   首跳；根因=src/main/index.ts:10 全局单实例锁，前一实例 teardown 滞后时新
   实例即刻退出→无窗口。出现 1 次于本票取证期，复跑即绿，未达「同用例 2 次」
   立案线；主控 e2e 全量时若再现即立案）。另两次同表象超时系我误序操作
   （npm test 后未切 electron 绑定即跑 playwright——node ABI 下启动即崩），
   已定位非应用缺陷，运行序铁律：e2e 前必 `use electron`（npm run build 自带）。
3. **e2e 瞬态定位歧义（已修）**：chips 刷新与对话框卸载是两次 render commit，
   间隙内 `getByRole('button',{name:'水质（2）'})` 双匹配→strict violation 首
   resolve 即红不重试（3/3 确定性复现后定位）。修=合并/删除提交后先锚
   `expect(dialog).toBeHidden()`（可重试）再断 chips。应用行为本身正确
   （对话框于点击后 <300ms 关闭，判定实验在档）。
4. 票面外既记边界不修：tags upsert 纯空格名 trim 后空串可入库（票面 §⑤ 已
   标注归 AUDIT-B）；INV-53 登记与 registry 翻状态归主控收口（未动）。

## 7. 成本申报

实现者=GLM5.3（bigmodel-coding-plan，继承主控档——派发指令 §⑦ 显式申报口径）；
会话内工具调用约 40 轮，其中 e2e 诊断取证 5 跑（探针 2+判定实验 2+复现轮询 3 连）。

## 8. 回炉一轮（门一 Kimi PASS_WITH_WARNINGS——主控裁决三项，2026-09-03）

处置对照（W2 豁免补记/N2 遗留池/N3 主控收口——不动实现面）：

- **W3 Esc 关闭**（TagLifecycleMenu.tsx）：补 useEffect keydown 监听（Escape→
  props.onClose()，unmount 成对移除；deps=[props.onClose]）；头注「ESC 归
  Dialog 域」旧口径改「菜单轻量面键盘关闭自持」。
- **N1 busy 期取消未禁**（TagLifecycle.tsx 三对话框）：useBusyGuard 增
  requestClose（pending 时 no-op）；三对话框 Dialog onClose 全量收包装回调
  （Esc/遮罩/✕ 全关闭路径过同一门）+取消按钮 disabled={guard.busy}
  （disabled:opacity-50 态与保存/确认对齐）。行数复核：223 行（≤250）。
- **W1 恒真断言口径**（tags-lifecycle.repo.test.ts）：merge/delete 两处 raw
  COUNT 注释改如实口径「schema 前瞻守卫——当前 ON DELETE CASCADE 下恒真、
  变异杀伤率为零，M1 实际红锚=事务编排 mock 用例；CASCADE 改弱则转正为首道
  防线」；测试头注同步登记（含 Kimi 实锤出处）。
- **测试补锚**（tag-lifecycle-ui.test.tsx +2 it，always-active，先红后修）：
  ①W3：菜单开→dispatch keydown Escape→菜单关闭；②N1：delete 提交飞行中
  （pending promise 挂起）取消按钮 disabled+Escape（Dialog 自身关闭路径）不
  得关→resolve 成功后才关。先红证落盘：
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-esc.raw.txt`（1 failed——菜单未关）、
  `scripts/audits/p7e-01-red/tag-lifecycle-ui-busycancel.raw.txt`（1 failed——
  取消未禁用）；修后绿证：`scripts/audits/p7e-01-green/rework-ui-repo.raw.txt`
  （13/13）。

回炉后全量：**npm test 132 文件 / 1142 用例全绿**（1140+2 新锚，
`full-unit-rework.raw.txt` 在档）+lint/typecheck/quality:check 全绿。
超票面自裁申报：无（三修+两锚均主控裁决票面内；测试头注补登属文档面同步）。
