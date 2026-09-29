# F-CONSOL-08 票面归档（F-GOV-01 机制）

- id: F-CONSOL-08
- file: scripts/check-tickets.mjs
- area: infra
- owner: strong
- status: done（收口时翻）

## 事故与根因链（2026-09-29 v77 交接场）

**事故**：F-CONSOL-06（基线再生成）与 F-CONSOL-07（注释勘正微票）两笔提交为
**带红提交**——两轮「verify 尾验 EXIT=0」均系管道假绿：命令形态
`npm run verify | grep | head; echo $?` 退出码取自管道末命令（head）而非 npm run，
真值=红（tickets 段）。根因违反宪法既有条款「收口单写=亲验 verify 真退出码」。

**红面根因**（check-tickets.mjs 规则 3 误报）：F-CONSOL-06 是**首个** file 字段指向
`scripts/test-surface.baseline.json` 的 done 票；规则 3 对 done 票 file 指向文件
内容做占位桩词面扫描，而基线 json 是测试面快照——镜像了历史用例标题
（contracts/api-surface「骨架期类型自洽证明」与 shared/app-error「抛带工单号的
…」两条正当标题含占位桩调用词面字样），文本镜像被误判为占位残留。历史无触发
的原因：上轮基线再生成（7a0baa6e282）无独立票号（registry 无行→规则 3 无触发
对象）；F-LINT-03（file=dup-constants.baseline.json）未红纯因快照内容巧合不含
词面。

**次生自伤实录**（流程内如实申报）：本票立案行首版 summary 写入占位桩调用词面
字样→registry.ts 属 .ts 扫描面→F-GOV-01（file=tickets/registry.ts）行触发规则 3
新红（HEAD 版 registry 既有 2 处裸词形态不匹配正则[无左括号]，本票引入的
unimplemented… 裸子串形态匹配[第一支无括号要求]）→改写立案行以代称
（「占位桩调用词面」）消解。教训：**registry summary 禁占位桩词面**（与 S4 P2
收口文案自伤 T7 裸子串同族——负锚/扫描词面禁入被扫文本）。

## 修复（diff 全文语义）

check-tickets.mjs 规则 3 与规则 4b 两处同族 guard：done 票 file 内容扫描前加
`if (!/\.(ts|tsx|mjs)$/.test(t.file)) continue`——占位桩/骨架标记是**代码形态**
（调用/属性/导出），数据快照 json 内的同名字样是测试标题/断言的镜像非声明；
后缀集与 srcFiles walk 扫描面（.ts/.tsx/.mjs）一致。DIR/存在性/豁免清单检查
（guard 之前）不受影响。连带：F-CONSOL-06/07 两票档终验记录勘正（管道假绿
如实标注+带红提交事实在档）。

## 验证与烤验

- **变异红证 M-R3**（规则 3 guard，备份法禁 git checkout）：guard 置
  `false &&` 短路→`tickets:check` EXIT=1 复现「F-CONSOL-06 已 done…」误报红
  （天然红样本）→还原→diff 对照备份为空→复跑 EXIT=0。备份件已删。
- **规则 4b guard 无变异红证路径**（如实申报）：现役无 file 指向 json 的 done 票
  快照含骨架标记字样（data-ticket 0 命中/_STUB 3 处均非工单号初值形态）——
  撤 guard 无可复现红。定性=同族预防性加固（非修红必需），红证不可自然产生，
  防御依赖=将来触发时规则 3 先例在档。
- **终验**：`npm run verify > log 2>&1; echo $?`（重定向不吃退出码）=EXIT=0
  真绿亲验；树态=check-tickets.mjs+registry.ts+manifest+两票档勘正+F-CONSOL-06/07
  无再触碰。
- **烤验**：涉脚本批=全对抗位 k1+d1 异构双审（分级烤验表明文——涉脚本不享
  carve-out）。
- **连带候选登记**：check-tickets 全防线无专属姊妹测试件（test-surface 系有
  三件先例）——防线测试面补强=交接书池面候选（S1 族邻位）。

## 门链与回炉（2026-09-29 场）

**门一=k1 PASS_WITH_CONDITIONS（B0/W3/N7）+d1 PASS_WITH_CONDITIONS（B0/W6/N5）
异构双席**（涉脚本全对抗位——分级烤验表明文不享 carve-out）。

**回炉 R1（主控亲执）处置矩阵**：
- 双席同中 W「白名单静默放行」（k1-W2=d1-W1/W2/W6）→ 实装非白名单跳过清单
  可见化：规则 3 guard 收集 `skippedNonCode`、统计区输出 note 行「内容扫描跳过
  （非代码后缀 file）N 票：…」（非红）——defense-lifecycle 重评触发器机检化
  （信号=note 清单出现新后缀类型/新跳过票）。
- k1-W3=d1-W3「4b guard vacuous」→ defense-lifecycle 登记行补注无红证预防性
  加固状态+补证触发器（首张 file 指向非代码文件且内容含骨架词面的 done 票
  出现时补变异红证）。
- k1-W1=d1-W4「registry.ts 叙述面（.ts 数据文件）guard 不覆盖——词面自伤二次
  触发」→ 裁量：本票不加第三处 guard（宪法「二次触发即重构」的分期兑现——
  继续增量补丁=屎山形成机制）；「扫描词面结构化收敛」票登记交接书池面候选
  （规则 3 正则第一支带括号收紧/AST 化两方向待设计）；代称纪律（registry
  summary 禁占位桩词面）入教训档。
- k1-N1 → 票档补记：次生自伤（registry 词面触发规则 3 新红）客观上=guard 未
  过度放行 .ts 代码面的正向验证（.ts 支扫描仍生效实证）。
- k1-N4 → 两 guard 注释补前向约束（「本 continue 仅豁免本循环的内容扫描——
  未来 readFileSync 后追加的第二检查不受此门保护」）。
- k1-N5=d1-W5「管道假绿条款化」→ 交接书 v78 §4 新操作条款（退出码取真值禁
  管道后取 $?——统一 `cmd > log 2>&1; echo $?` 形态）+§5 教训档回流；本场存量
  检索如实呈报（baseline 尾验/verify 尾验×2/tickets:check×1 共四处管道形态，
  全部被本票真值 verify EXIT=0 收敛覆盖——最终树态唯一可信绿源）。
- d1-N3 → 统计对账数字（240/241/open 变动）以收口时脚本实测为准（v78 §1）。
- d1-N4 → 发现通道=主控 F-CONSOL-07 提交后无管道重跑 tickets:check 人工发现
  （非 CI——当时未 push；教训档补防线归因：管道假绿绕过的正是「亲验真退出码」
  条款本身，机检链无缺陷）。
- d1-N5 → registry 06/07 行终验陈述勘正短注已落（机器可读入口同步）。

**终验（回炉后）**：`npm run verify > log 2>&1; echo $?` EXIT=0 真值亲验；
tickets:check 统计区含跳过 note 行（F-CONSOL-06 与 F-LINT-03 两票两条 json
路径——与 guard 设计预期一致）。

