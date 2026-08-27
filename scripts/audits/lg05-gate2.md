# SR2-LG-05 + P7-C 门二终审报告

日期：2026-08-27 ｜ 门二终审孙代理（独立于实现者/门一/调试代理）｜ 铁律遵守：只读，唯一可写=本文件；未运行任何 npm/test/git 改动性命令（git 仅 status/log 级只读）

## 开工技能清点（宪法会话开工纪律）

- **用**：code-review-excellence（四清单审查主技——diff 逐面/证据链核验/结论分级）、
  verification-before-completion（全部关键数字亲验：双日志摘要行、manifest 实数、
  双文件 sha256 逐字节比对、registry grep、恒真 grep——零转抄门一数字）。
- **不用**：systematic-debugging（无新缺陷定位面）；TDD/e2e/browser 技能（禁
  npm/test，只审证据）；git 工作流类（禁改动性命令）；subagent-driven-development
  （末端终审不派发）；其余与只读终审无测试面交集。
- 配置自查：门二 GLM-5.3，主控派发配置，思考等级由主控设定（同源纪律）。

## 结论：**PASS（放行收口）** —— 0 B / 0 新 W / 3 记录项（不阻断）

门一 0B/4W/7N 维持；4W 处置全部落地或挂账有据；四清单逐项亲验无新回炉项。

---

## ① 处置核对（门一 4W/7N vs 终态）

- **W1（根因链时序矛盾）→ 已追记**：p7c-crash-fix.md 尾节「主控追记（门一
  W1/W4 处置）」明确「8491489 崩因存疑（可能=bisect 实验树残留污染/sourcemap
  错位），**不强行闭合解释**，记录待考」——诚实记录不闭合，与主控预裁口径
  一致（缺陷本体已修+回归锁在案+终态全绿独立成立）。✓
- **W4（责任归属）→ 已追记**：同节明确「短路写法系**主控在 SR2-LG-03 收口时
  亲笔引入**（非实现者交付，收口 diff 亲验时未识别 Rules of Hooks 违规）」
  ——行为人级归属在档，「亲验≠免检」教训锚点成立。✓
- **W2/W3（真退出码+还原红证入日志）→ 挂账去向核实**：批二战役报告
  （docs/reports/2026-08-27_ai-campaign-batch2.md §3 尾）流程改进三条在档
  （①变异还原 diff 空并入 mutation 日志"09 起已执行"；②真退出码"10 起已
  执行"；③vitest 机器输出为准）。**核实发现**：三条均为回顾性"已执行"陈述
  而非模板硬性检查项——本批（LG 批）实测第①②条均未持续（六日志零 EXIT
  行=门一 W2 实证；mutation 日志无还原记录=门一 W3 实证），"已执行"未构成
  惯例延续。**建议补第三类强化表述（只记录不阻断）**：下批派发模板将「日志
  尾 EXIT 行+变异还原 diff 空输出」升级为**收口前机检项**（缺失=收口拒收，
  与 locks manifest 同步性同强度）——文字约束已两次失效，机检化是唯一可靠
  落点。7N 复核：N1~N7 维持门一原判，无需改判（N2 的 509 行数字本审
  wc -l 复证一致）。
- **门一预裁符合度**：守卫仅依赖组=门一 N1 维持预裁（防作弊弱化三面补偿成立
  ——本审补证：恒真 grep 净+票面原文"亲验是唯一防线"在头注在档）；短路缺陷
  =主控亲笔=W4 追记吻合。✓

## ② 母本符合度（票面八验收面 vs ROADMAP P7-H 验收行）

- **P7-H 验收行原文**（docs/ROADMAP.md:347）：「工单序列 SR2-LG-01~05：
  …→侧板详情+双击跳转→**e2e 全链（浏览/编辑保存/跳转）**」。票面八验收面
  ①~⑧即该行的 e2e 展开面——LG-05 是工单序列末环，收口即 P7-H 验收闭环。✓
- **八面→四 test 映射**（diff 逐条亲验，门一 A 表结论独立复核成立）：T1=①
  真实文本（节点标题/年份三态/边计数 2）+②pan/zoom 后 poll transform+文本
  仍可断言；T2=③拖拽 poll 落点→reload ±2px 持久+⑧主题节点 data-kind=theme
  →core_idea 编辑→reload 持久；T3=④多父拒绝真实中文 toast+图不变+⑦
  main 侧 handler patch 抛错→保存失败指示条→真聚合链 close 拦截两态
  （取消=窗口保持 1/确认=归零）；T4=⑤分节 heading+分色两 CSS 变量相异+
  条目真实文本+⑥双击→PDF_KNOWN_TEXT+ai-note-rect[data-ai-note-id] 同 id
  可见。每验收面均有独立断言，映射与头注声明一致。✓
- **守卫语义（仅依赖组+翻 done 激活）**：spec `DEPS.filter((d) => !
  isTicketDone(d))`（diff:211）——当前 LG-01~04 done→pending 空→4 用例
  **已激活**（lg05/p7c 两期 e2e 实证真跑非 skip）；翻 LG-05 done 后无自身
  条件→常激活零死区。头注实现注同步修订+过时数字行已删（diff:60-62）。✓
- dialog mock/写通道 patch=票面 N8 注字面路径（app.evaluate main 侧），
  先例引用经门一 N4 线索码亲验，本审 diff 结构面复核同型。✓

## ③ 宪法红线终审

- **受锁 131 一致**：p7c-verify.log:26「locks 检查通过：131 个受锁文件与
  manifest 一致」+manifest 实数 grep -c '"path"'=**131**+**双文件 sha256
  逐字节亲验同**（lineage.spec.ts=e4554a04…/app-quit-dirty.test.tsx=
  6a7d5c…，均与 manifest 条目精确相等=manifest 与工作树同步，即时 apply
  纪律合规）。130→131 增量恰=+回归用例一条（diff manifest 块唯一新增），
  LG-05 期为内容 sha 更新不加条（spec 已在 manifest）——两期推演吻合。✓
- **e2e 纪律（真实文本）**：spec 断言全为真实中文 UI 文本（「已导入脉络图：
  3 个节点，2 条连线」「多父边拒绝：…」「保存失败：」「一读」「裁决」等），
  非 testid 空壳——52 测试全绿但文字不可见的历史红线面未重蹈。✓
- **受锁 spec 改后全量 verify**：p7c-verify.log 为七关全量（quality→
  tickets→locks→lint→typecheck→test→build，&& 链完整走完+build 尾行
  成功）——playwright/esbuild 不查类型、tsc 关卡在链内的纪律满足；时序上
  manifest generatedAt 17:28 < p7c-verify 17:32，verify 覆盖最终工作树态。✓
- **TDD 证据链**：红（lg05-red.log「4 failed」在案）/变异红（lg05-
  mutation.log 四轮各 1 failed 在案，失败形态 toBeVisible/toHaveAttribute
  与 M1~M4 断言类型对应）/绿（两期 e2e+两期 verify）。还原侧无日志=门一
  W3 已挂账项不重复开新 W；**本审补一机器面旁证**：git status src/ 唯一
  M=App.tsx（P7-C 修复），四变异涉及文件（lineage-import.ts/
  lineage.service.ts/LineageSideAiNotes.tsx/lineage.store.ts）工作树零
  未还原残留——若任一未还原必现额外 M。间接证实还原净。P7-C 回归锁红面
  依赖报告自述（W3 挂账范围），绿面=86/615 内在档。✓（带挂账引用）
- **测试纪律（新测试 always-active）**：app-quit-dirty.test.tsx 无
  guardedDescribe/无 isTicketDone 守卫（diff 全文亲验）——K3 威胁结构性
  在位。✓
- **宪法测试纪律**：未改 tests 既有断言/未放宽断言；spec 改动=票面工单本体
  授权面（占位替换）+locks 流程留痕。✓

## ④ 机器面核对（全部亲验，零转抄）

| 项 | 亲验结果 | 判 |
|---|---|---|
| vitest 数理 | lg05-verify:1973-1974=85 文件/614 用例；p7c-verify:1977-1978=86/615——86=85+1（app-quit-dirty 文件）、615=614+1（其唯一用例），增量唯一且闭合 | ✓ |
| locks 推演 | 130（lg05-verify:26）→131（p7c-verify:26）=+回归用例条目（diff manifest 唯一新增），实数 131 复验 | ✓ |
| e2e 数理 | lg05-e2e=19 passed+1 failed（failed=reader-text P7-C「已保存」10s 超时——白屏后永不可见，与崩溃机制吻合；lineage 4/4 ok）；p7c-e2e=**20 passed**（P7-C 9.9s ok+lineage T1~T4 各 ok）。20=16 基线+4 新 lineage；两期衔接自洽（修复恰使 1 failed→passed） | ✓ |
| registry 翻 done 预演 | grep status:'open' 唯一命中=SR2-LG-05（registry.ts:200）；总工单 104；LG-01~04 全 done（:196-199）→**翻 done 后 open 0=P7-H 全清收官**。registry 不在 locks manifest（grep 零命中）→翻状态无 locks 面，收口流程合规 | ✓ |
| 占位恒真删净 | 三改动文件 grep TODO/FIXME/placeholder 零命中；spec 无 `.toBe('` 自断言残留；diff 明删 `expect('SR2-LG-05').toBe(...)` 占位体 | ✓ |
| 工作树范围 | M=App.tsx/lineage.spec.ts/locks manifest，??=回归测试+audit 件+dist_new（历史残留）——与门一 E 节一致，无范围蔓延；spec 509 行（tests/** max-lines off，eslint.config.js:184-186 亲验在档） | ✓ |

## ⑤ 成本账本行

- 门二终审（本审）：约 0.55M tok / 13 分钟（技能加载+六日志 grep 核对+
  manifest/sha 亲验+registry 推演+报告落盘）。
- 实现者 LG-05：13.81M tok / 47.4min（含 P7-C 卡点归因时段）——主控账本。
- 门一：1.25M tok / 12.3min——主控账本（注：门一报告自报 0.62M/9min，
  差额或含复核轮，以主控统一口径为准）。

## 终审判词

PASS。八验收面对 P7-H 验收行全覆盖有断言、守卫语义与主控裁定一致、崩溃
修复最小面+回归锁 always-active、受锁 131 与工作树逐字节同步、全量 verify
（七关）与 20/20 e2e 在档、registry 翻 done 预演闭合（open 0=P7-H 收官）。
门一 4W 处置全落地（W1/W4 追记在档/W2/W3 挂账有去向）。记录项三条（批二
流程改进需机检化强化、TDD 还原侧红证依赖旁证、门一成本口径差）均不阻断。
建议主控收口按门一收口建议四动作执行。
