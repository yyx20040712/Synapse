# SR2-LG-05 + P7-C 门一对抗深审报告

日期：2026-08-27 ｜ 门一审查子代理（独立于实现者/调试代理）｜ 铁律遵守：只读，唯一可写=本文件
输入：lg05-diff.patch / lineage.spec.ts 票面头注 / lg05-impl.report.md / p7c-crash-fix.md / 六份日志 / registry / 只读 git 考古

技能清点（开工纪律）：用=code-review-excellence（对抗审查主技）、verification-before-completion（数字/日志/退出码逐项亲验）、systematic-debugging（仅用于证伪调试报告根因链，未亲动手调试）；不用=TDD/e2e/browser 技能（禁 npm/test，只审证据）、git 工作流类（禁改动性命令，git log/show -S 只读考古）。

## 结论：**PASS（放行收口）** —— 0 B / 4 W / 7 N

无回炉项。W 均为文书/流程级（根因叙述时序矛盾、退出码措辞失实、红证/还原日志缺失、责任归属未记），实质证据链（八验收面覆盖、最小修复、20/20 终态、回归锁、数字对账、接缝预演）完整成立。

---

## A. LG-05 母本符合度（八验收面逐面核对）

| 面 | 用例 | 断言实证 | 判 |
|---|---|---|---|
| ①导入渲染真实文本 | T1 | 三节点标题 getByText + 年份三态（层带「2020 年」/卡片 2022、2023 exact）+边 `path[data-edge-id]` 计 2——真实文本非 testid 空壳 | ✓ |
| ②pan/zoom 后可断言 | T1 | pan→poll `g[data-viewport]` translate tx>0→「脉络甲文献」仍可见；zoom→poll scale>1→「脉络乙文献」+2 边仍可断言 | ✓ |
| ③拖拽 reload 持久 | T2 | 拖 +120/+80→poll transform 到落点（store 回填在 await unwrap 后=写已落地证据）→reload→±2px 内持久；无裸 sleep | ✓ |
| ④多父树拒绝 toast | T3 | 右键甲「连线到…」→pending-link 可见→点乙→`/多父边拒绝：节点 .+ 已有父节点/` 真实中文 toast+图不变（仍 2 边）+`lineage-save-status` 计 0（CONFLICT 丢弃不卡队列语义顺带锚） | ✓ |
| ⑤侧板分节分色 | T4 | 单击→`data-binding="paper"`+「已绑定文献」+core_idea 真实文本+「一读」「裁决」两 heading+色块 `--annotation-yellow` vs `--danger` 两色相异+条目真实文本（渲染真实文本红线） | ✓ |
| ⑥双击跳转全链 | T4 | 读 noteId→双击→`PDF_KNOWN_TEXT` 可见→`ai-note-rect[data-ai-note-id=同一 id]` 可见（可见性选项；flash 竞态不硬断言=自裁 4 申报，机制理由 flashAiNote 无重试成立） | ✓ |
| ⑦保存失败退出拦截 | T3 | **main 侧 evaluate 桩**：ipcMain.removeHandler+handle 重注册 'lineage/upsert-node' 抛错（N8 注字面）；拖拽→`保存失败：`指示条+重试按钮（INV-04）→1s 缓冲→close→showMessageBox 桩两态：response 1=窗口保持 1，response 0=aliveWindows<1（-1 哨兵）——reader-text.spec.ts:285+ 先例同型（亲验源码 :292-305 一致） | ✓ |
| ⑧主题节点 reload 持久 | T2 | 添加→`data-kind="theme"`+`data-binding="theme"`+「主题节点无笔记」→右键编辑 core_idea→保存→reload→节点+idea 均持久 | ✓ |

- **dialog mock=N8 路径** ✓：app.evaluate 覆写 `dialog.showOpenDialog`（corpus-export.spec.ts:~130 先例亲验同族）+confirm=win.on('dialog') 自动接受（zcode-link.spec.ts:45 亲验同型）。
- **占位恒真 test 删净** ✓：diff 删除 `expect('SR2-LG-05').toBe(...)`；grep 全文件「占位」仅存于头注流程描述（票面原文），无恒真断言；quality:check 绿。
- **守卫=仅依赖组** ✓：`DEPS.filter(!isTicketDone)`（spec:78,211-212）；翻 done 后语义无死区（DEPS 全 done→零 skip→常激活）。红日志 4 用例真跑（非 skip）为守卫激活态实证。
- 「e2e 16→17」过时数字行已删（diff :60-62）✓。

## B. 崩溃修复质量

- **修复面最小** ✓：App.tsx:76-78 两 hook 无条件调用+`||` 只作用返回值+5 行机理注释；git status 实证 src/ 全树仅此一改。或聚合语义不变由回归用例末次 `{dirty:true}` 断言锚定。
- **回归用例真实** ✓：app-quit-dirty.test.tsx（135 行）mount 真 App→`useReaderStore.setState(order)+useNotesStore.setState(pending:true)`——恰是 P7-C fill('笔记正文') 的真实驱动链（aggregate false→true 翻转）；三层断言：TypeError 上抛即失败+dev 探针无 'Rendered fewer hooks'+setQuitDirty ≥2 次且末次 `{dirty:true}`。always-active 无守卫（K3 合规）；stub 矩阵复用 lineage-board.test.tsx:173 同型（grep 亲验）。
- **主控责任记录** ✗→W4：p7c-crash-fix.md 仅到工单号级（「缺陷本体自 LG-03 即存在」），未记「LG-03 收口亲笔引入」的行为人归属。git 佐证责任事实：`git log -S` 铁证 `||` 短路行恰好 c8758ea（LG-03）引入；8491489（LG-02）App.tsx:68 为无条件单 hook。

## C. 测试质量

- **LG-05 红证** ✓：lg05-red.log 首跑 4 failed（全为 nav「脉络」strict mode violation——真实失败面，与报告首红描述一致）。「守卫临时翻 done 试跑还原纪律记录」=申报「不适用」——**机制核实成立**：仅依赖组守卫下 LG-01~04 done 即激活，无需翻 registry，红日志为证。诚实申报，非缺项。
- **变异红证** ✓（红面）：lg05-mutation.log 四轮 T1/T3/T4/T2 各 1 failed 且失败点恰中对应断言（M1 toast 文案/M2 拒绝文案/M3 色块 yellow→green 实收/M4 落点 90,0 vs 210,80）——四用例断言鉴别力逐面证实。还原侧→W3。
- **数字对账** ✓（逐项对日志）：85 文件 614 用例+locks 130（lg05-verify.log:1973-1974, :26）→86 文件 615 用例+locks 131（p7c-verify.log:1977-1978, :26）；e2e 19 passed+1 failed(P7-C 17.8s 崩)（lg05-e2e.log）→**20/20**（p7c-e2e.log:63，P7-C 9.9s 过、lineage 4/4）；tickets:check 104/open 1 两期一致；manifest diff=spec sha 更新+新测试条目（130→131 口径吻合）。

## D. 报告诚实性（自裁申报对 diff）

- LG-05 九条自裁**全部对上 diff/源码**：守卫修订(2)/八→四映射(1)/种子链 fixture+幽灵行(3)/flash 可见性选项(4)/pan 左下起点(5)/poll 落点+1s 缓冲(6)/T4 先阅读器顺序(7)/改动面自查(8)/工单号纪律(9——grep 全文件 SR2- 全号仅 3 处=票面原文×2+DEPS 数组)。未发现未申报偏差。
- 调试报告 stub 矩阵复用申报 ✓（lineage-board.test.tsx 同型亲验）。
- 两处措辞失实→W2/W3，实质不虚。

## E. 接缝

- **e2e 全局面** ✓：20=16 基线+4 新（lg05-e2e 19+1 与 p7c-e2e 20/20 两期衔接自洽：LG-05 期 1 failed 即 P7-C 跨单缺陷，修复后闭合）。
- **registry 翻 done 预演** ✓：LG-01~04 done/LG-05 open（registry.ts:196-200）→翻 done 后 open 0=**LG 组全清=P7-H 收官**；无其他 spec 引用 LG-05（grep 零命中）；DEPS 引用 done 工单号合法（corpus-export.spec.ts:90 先例）。
- **LG-04 遗留已闭环** ✓：open-paper-anchor.ts 已由主控 cbc6b1c 补提交（LG-05 报告申报 1 的处置落地），HEAD checkout build 不再必红。
- **工作树范围** ✓：M=App.tsx/lineage.spec.ts/locks manifest，??=回归测试+audit 件+dist_new（历史残留）——无范围蔓延。
- spec 509 行>500 红线：eslint.config.js:184-186 对 tests/** 显式豁免 max-lines，lint/verify 同口径绿——合法，备忘（N3）。

---

## Findings

### [W] W1 —— 调试报告根因链 §5 时序矛盾（主控预裁 3 攻击点：**成立**）
p7c-crash-fix.md:§5 称「06ea570 布局侥幸安全→8491489 布局暴露」+「缺陷本体自 LG-03 即存在」。git 考古铁证：`||` 短路行**恰好 c8758ea（LG-03）引入**；**8491489（LG-02）App.tsx:68=`const quitDirty = useTabDirtyAggregate()`，无短路、无 useLineageDirty**。若「8491489 也 3/3 崩」是字面 commit checkout 观察，则该崩溃不可能由 LG-03 才引入的 || 解释——根因链不完整（另有未识别机制）；若「8491489」实为 bundle 布局纪元的比喻指称（LG-02 改变产物图），则用 commit 号指称非 checkout 事实属表述失实。**两种读法取其一，§5 均不能自洽**。不阻断的依据（与主控预裁一致）：当前崩溃的机制有独立铁证（vitest 最小复现栈与 e2e 真栈一字不差）、修复使 hook 链恒定→布局无关性成立、终态 20/20+回归锁在位。**建议收口时补一行澄清 8491489 观察面的真实语义，并作为教训档候选**（收口亲验笔迹自身引入 Rules of Hooks 违规=「亲验≠免检」的实证）。

### [W] W2 —— 「尾注 EXIT:0」字面不实 + 上批流程改进二次未落地
六份日志 grep **零 "EXIT" 字样**。lg05-impl.report.md 称「lg05-verify.log 尾注 EXIT:0」「真退出码见各尾注」——不存在该标注。实质可推证：verify=&& 链七关输出完整走完且末关 build 成功→exit 0；红/变异「1 failed」→playwright exit 1。上批战役报告（b2d9fa3）挂账流程改进三条含「npm 真退出码（入日志）」——本批仍未兑现，报告文字再次超前于日志事实。

### [W] W3 —— 变异还原与 P7-C 回归红证无日志痕迹
lg05-mutation.log 仅含四轮红跑（这部分在案）；cp 还原→diff 空步骤仅报告自述未落日志。p7c 无 red 日志，「修复前抛同栈 TypeError（红 EXIT 1）」无落盘证据——「每测试必须能失败一次」的红面依赖自述。上批挂账「变异还原入日志」同样二次未落地。（对照：LG-05 主链红证在案，仅还原侧缺。）

### [W] W4 —— 主控责任归属未按工单记录在案
工单 B 要求核对「p7c-crash-fix.md 是否如实记 LG-03 亲笔引入」——**未记**（仅工单号级「缺陷本体自 LG-03 即存在」，无行为人）。责任事实本身清楚（c8758ea 收口提交含该行+主控预裁自认），属文书缺行非事实隐瞒。建议收口时在报告或教训档补记一行，并锚定「收口亲笔改动也需过同一测试面」的流程教训。

### [N] N1 守卫改仅依赖组——预裁维持：防作弊弱化由三面补偿（占位删净 grep 实证/票面原文保留「亲验是唯一防线」/翻 done 后零死区）；保留双条件反需临时改 registry，更差。
### [N] N2 报告「占位 47 行→全链 516 行」实测 509 行（wc -l）——文书数字小误。
### [N] N3 spec 509 行：tests/** max-lines 豁免（eslint.config.js:184-186），合法（见 E 节）。
### [N] N4 四处先例引用（dialog 桩/confirm 自动接受/退出拦截两态/window.api stub）逐一线索码亲验同型——申报不虚。
### [N] N5 「组件级 614 全绿之因」解释（无人构造 aggregate false→true 翻转）与回归用例构造面互证成立。
### [N] N6 P7-C 跨单申报纪律（不越单修+主控裁决）符合「卡住了就停」；其申报 1 已被 cbc6b1c 闭环、申报 2（基线 16/1skipped 存疑）随 P7-C 修复消解。
### [N] N7 T3 退出拦截前 1s 缓冲=真聚合链无直发面可 await 的合理替代（reader-text 先例有直发通道故 await，本单走效应链），竞态余量已申报（自裁 6）。

## 统计与总评

**0 B / 4 W / 7 N → PASS（放行收口，不回炉）**

- 回炉判据（B=票面违约/伪造证据/范围蔓延/防作弊穿破）逐项核否。
- 收口建议动作：①翻 registry SR2-LG-05→done（翻后 open 0=P7-H 收官）；②提交带 [locked-change] 尾注（manifest 两处变更随单）+即时 locks:apply 已同步（manifest 09:28 与工作树一致）；③消化 W1/W4 各补一行文字；④W2/W3 转流程改进挂账下批（真退出码+还原红证入日志——两批连续未落地，建议下批模板强制化）。
- 成本账本（门一）：约 0.62M tok / 9 分钟（只读审查+git 考古+报告落盘）。
