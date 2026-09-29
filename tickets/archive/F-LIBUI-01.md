# F-LIBUI-01 票面归档

- id: F-LIBUI-01
- file: src/renderer/app/Rail.tsx
- area: library-ui
- owner: strong
- status: done

## summary 原文（立案五层规约）

库页×侧栏 P0 修批（2026-09-29 用户反馈八项之 P0 子集——设计档=docs/design/2026-09-29_library-folders-binding-feedback-survey-and-plan.md §0/§1，D4 已批；根因=双岗探查实录全实锤）。九件：①rail-gap 空 div 删（Rail.tsx:140+theme-shell.css:246-249——下载↔文献库 12px 楔子，全栏归 3px 等距）②rail-ws-dot 色点删（Rail.tsx:126+theme-shell.css:256-265；WS_DOT_PALETTE 若 WsRailPopover 仍消费则保留待 F-WS-02 同删、仅 Rail 消费则连删——实现者查引用后执行并申报）③标签列表不刷新 bug 修（TagEditor.onChanged 只 setReloadKey 重拉详情不刷表格——追加库列表刷新，先例=FilterBar.tsx:90 onMutated）④档次表格列删（PaperList.tsx:99-106/PaperRow.tsx:54,81-85/library.css:140-145 列宽——venue-tier 单源库保留：lineage 含金量 join+corpus manifest 两消费点不动）⑤详情面板关联节脉络行+AI 评估行删（PaperDetailPanel.tsx:192-204；节空则整节删——文件夹行 F-FOLDER-01 回归）⑥DrActions 九钮两列 grid 化（library.css:310 flex-wrap→grid repeat(2,1fr)+primary 跨两列首行）⑦窗口 x/y 未钳制修（bootstrap.ts:207-229 接现成 clampBounds window-state.ts:25-33——workArea 全维钳制，底边沉任务栏根因）⑧编号 # 前缀删（PaperRow.tsx:69——ordinal 取值逻辑不动，pubNo 派生重排归 F-FOLDER-01）⑨导出语料集合整体退役 D4（LibraryPage.tsx:60-87 按钮+handler+ipc/export_.ts:130-146 corpusSet+export.service.ts buildCorpusSet/writeCorpusSet+api-surface 三方对账面收窄——设置页 corpusSession 五件套零触碰）。生命周期=TDD 先红后绿+断言级变异红证（备份法还原 diff 空）+计算样式锚（⑤h③ 先例：grid 双轨/rail 等距）+corpusSet 契约窄化豁免（reason+裁决链=设计档 D4 行）+verify 真退出码落盘。文化=零新依赖/受锁面 unlock→改→即时 apply/[locked-change][test-refactor] 尾注/计数脚本实测

## 收口记录（2026-09-30 收口，三屋全链+回炉两轮）

**实现**=ops-executor 一轮（session:host-tier，204 调用/3101s）：九件全落+15 文件（src）+13 tests+INV-73 收窄；TDD 首红 16 例（全预期红）→绿 190 件/2092 例→变异 M1-M9 九支红证+还原净→e2e 定向 3 绿（含 grid 双轨/rail 等距真 Chromium 计算样式锚）→verify EXIT=0。palette 走保留支（WsRailPopover:42/120 仍消费）；关联节实见仅两行→整节删。

**门一**=k1 首轮 B0/W2/N9 PASS+d1 首轮 B0/W6/N11 PWC（检材 1966 行自包含审包，零读取墙）。→**回炉 R1 主控亲执**（≤2 限内）：⑦接线源文本锚+M-C 红证（k1-W1）；M-A 脉络行负锚红证（d1-W2 残余——首红时序晚于该文件编辑的 TDD 申报）；M-B CSS 四类规则复活双红（d1-W4ii）；互斥注释勘正×2（d1-W6）；豁免 reason 补 token×6（d1-N10）；报告 annex 五勘正（manifest=16 sha+1 generatedAt——**主控自错实录**：初验 17 对把时间戳对计入，k1 拆解纠正；分桶 src 15/tests 12；豁免簇 ⑨13+④11+⑤7+⑧1+①3+e2e 混合 1=36）。verify 190/2093。→双席复审（新席承审——原席 completed 不可续话）：k1' B0/W2/N5 PASS+d1' B0/W3/N7 PWC，两席同向缝隙=**接线锚半还原恒绿形态**（计算行保留/传参回退）。→**回炉 R2 主控亲执**：消费面锁（x/y 双键断言）+**M-E 半还原红证**（缝隙以红证闭合）；M-D=.rail-ws-dot 复活红证（k1'-N1）；library-cards 头注六列残留勘正（k1'-W1）；DoD ADR 申报=无触及（grep 架构档+ADR 全集零 corpusSet 命中，d1'-W3）。verify 190/**2094**。

**门二**=probe 矩阵 **7/7**（verify 独立重跑 EXIT=0/全量 e2e **54/54 绿**——未改 spec 零旧行为残留红/指纹门对账 cur 207 files·2148 cases·6609 assertions·entries 188·hits 58·stale 130/locks 276/**store.load 源码实证**：写面四字段封闭，query/offset/selectedId 零触碰——跳页/关抽屉唯一路径不在 load 内，d1-W5/d1'-W2 闭环/树态 33+1 零残留/退役类名零活规则）；裁决部 **GO_WITH_CONDITIONS**（P0=0/P1=0/P2=1/P3=5——15 条 W 级 14 处置+1 销案、关键 N 级 5 闭环+3 包不足（已随 C5 补档消解其档完整性缺口）、母本九件 9/9、超面 3 项全追认、豁免 36 条抽核 4 条逐字命中、独立复算 12 项闭合、翻 done 预演绿）。**C1-C6 全落实**：C1 同族注释残差 4 处收口亲执勘正（corpus.assemble.ts:47/PaperList.tsx:2/e2e-env.ts:52/seed-paper.mjs:12）；C2 变异支数 13→14 勘正；C3 本归档+summary 瘦身+设计档随收口提交；C4 账本八席入账（executor 2793.4 万[harness 累计口径]——与 v82 227.8 万口径差=计费口径差在档，k1 席「k3」=绑定模型键名非票号笔误）；C5 双席四轮原件落档（gate1-k1/d1/k1-r1/d1-r1-verdict.md）；C6 EXIT 尾锚惯例→教训档候选。

**变异矩阵累计 14 支**（M1-M9 executor+M-C/M-A/M-B R1+M-D/M-E R2），支支红证+还原 diff 空+备份即删。

**终态基线**：verify **190 件/2094 用例 EXIT=0**（2092+1 接线锚+1 消费面锁）；指纹门 base 206/2120/6553 维持 vs cur 207/**2148**/6609（净 cases ±0/assertions -3=corpusSet 退役 -6+锚 +3，逐级 raw 在档）；豁免台账 152→**188**（+36 全带裁决链：D4 簇 13+④11+⑤7+⑧1+①3+e2e 混合 1）/hits 58/stale 130；locks **276** 维持（三轮 apply manifest 滚动）；e2e **54/54**（probe 全量）。registry open 5→4（本票 done）。

**备案面（后续票/池面候选，随裁决部建议）**：MetaEditDialog.onSaved 同构滞旧缺口（**已入 F-FOLDER-01 票面**——元数据面同构刷新）；e2e 真机窗口位置锚（F-WS-02/F-FOLDER-01）；多显示器 union 钳制（池面）；面板短号 # vs 行 007 口径（F-FOLDER-01 pubNo 统一）；注释带点号即负锚误红脆性+EXIT 尾锚惯例+同构行类 grep 计数须排除非目标行（三条教训档候选——随批回流交接书 §5）；Rail.tsx 注释与 F-WS-02 色彩迁移措辞校准（F-WS-02 立案时）。

**证据**=仓外 E:/zcode_md/synapse-archive/scripts-audits/F-LIBUI-01/（REPORT.md 含 R1/R2 annex+四席 verdict 落档+三 diff 包+首红/绿/14 变异 raw+verify×3+probe\ 七项+豁免抽样）。

> 归档于 F-GOV-01 机制（2026-09-30）；registry 主表已瘦身为结论句+本件指针。
