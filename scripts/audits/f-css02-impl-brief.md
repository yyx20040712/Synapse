# F-CSS-02 实现者简报——theme.test 负锚正则全域化升级

> 档位：GLM5.3flash（实现者位；环境限制统一档如实记）。主控=GLM5.3。
> 票面：tickets/registry.ts F-CSS-02（本简报含主控预裁=完整任务书）。

## ① 任务一句话

tests/unit/renderer/theme.test.ts 的 FS_LITERALS 枚举负锚（12 字面量×7 件
84 用例）升级为**正则全域「任意数字 font-size 声明归零」**（枚举漏新值/
无分号/大小写/非 px 单位通道全闭合），INV-61 测试列注记同步回注。

## ② 必读序（文件清单化）

1. `AGENTS.md`——测试纪律（受锁流程/先红后绿/变异红证还原安全）。
2. `tests/unit/renderer/theme.test.ts` :389-454——现行 describe 块全文
   （FS_CSS 七件/FS_LITERALS 12 值/it.each/FS_TSX 两形态锁/@theme 正锚）。
3. `docs/invariants.md` :77 INV-61 行（测试列注记待回注）。
4. `scripts/audits/visual-diff-locate.mjs` 头注——无关本票，不读。
   （真必读第 4 件=七 CSS 目标文件，先红证植入点：theme-buttons.css 或
   theme-lineage.css 任一块内。）

## ③ 主控预裁（逐条——实现者不再自裁这些点）

1. **正则终态（推荐形态）**：`/font-size:\s*[\d.]+\s*[a-z%]/gi` 计数=0
   ——数字后跟任意单位首字符即拦（px/pt/em/rem/% 全覆盖，批二票面给的
   `[\d.]+px\s*;` 形态的三通道闭合升级：无分号依赖+大小写不敏感+非 px
   单位）。`i` flag 防大写 PX 绕过。允许实现者现场微调（如加负
   lookahead），须论证四通道（新值/无分号/大小写/非 px 单位）闭合且不
   误咬 var() 载体与注释外合法形态——七件现状零匹配是前提（动手前先
   grep 七件确认）。
2. **用例形态**：七 CSS 件各一 it（it.each 七件或七个 it——7 用例），
   断言=正则 match 计数 0，红时消息含匹配样例。**用例数 84→7 基线
   推进（1543→1466 预期）由主控在交接书记账，实现者只如实报数**。
   FS_TSX 两形态锁+@theme 正锚**原样保留**。
3. **tsx 评估面（票面「同步升级评估」的落点）**：现行两锚已是全域正则
   （`/fontSize:\s*['"`]?\d/`+`/text-\[\d/`）——评估结论=CSS 声明面
   已等价达标维持；补一项全域证据：grep 全部 `src/**/*.tsx` 的
   `fontSize:\s*['"`]?\d` 消费（不限四件）——零匹配=范围无蔓延确认；
   有第五处匹配=**申报不自裁**（BLOCKED 报主控，可能是批二漏网）。
4. **先红证（票面钉死）**：临时在皮肤件加 `font-size:13.5px`（13.5=
   现行枚举内值但已删除枚举锚）**无分号形态**一处（块内末声明合法
   CSS）→新锚红→还原（cp 备份法，禁 git checkout——AGENTS 变异还原
   安全）。原始输出落盘。
5. **变异红证双支（升级不弱化证明）**：
   a. 植入 `font-size:13.5px`（无分号）→**旧枚举锚模拟**（临时把新正
   则换回 `font-size:\s*13\.5px\s*;` 带分号形态）→不红（旧锚漏无分号
   通道实锤）→还原新锚→红。各步输出落盘。
   b. 植入 `font-size:16px`（批二枚举外新值+带分号）→新锚红（枚举漏
   新值通道闭合实锤）→还原植入。输出落盘。
6. **受锁流程**：主控已预 unlock（theme.test.ts+invariants.md 可写）
   ——实现者**不碰 locks 命令**；verify 全链 locks:check 段预期红=
   预解锁工作流（批二先例），实现者跑到 test 段绿+typecheck+lint 绿
   即可（verify 可拆跑：npm run test && npm run typecheck && npm run lint），
   locks/apply 与全量 verify=主控收口职责。
7. **INV-61 注记**（invariants.md :77 测试列）：「FS_LITERALS 负锚矩阵
   （font-size 声明形态口径——px 通用值纯文本计数不可行）」→
   「FS 正则全域负锚（任意数字 font-size 声明归零——新值/无分号/大小写/
   非 px 单位通道闭合；2026-09-09 F-CSS-02 升级）」。仅此一段文字，
   INV 其余列不动。
8. **不删 describe 头注的口径注记**——升级后注记需更新（负锚口径注记
   :396-400 段改写为正则全域口径+保留 px 通用值纯文本计数不可行教训）。

## ④ 纪律

- 证据 `.raw.txt` 后缀落盘：先红证/变异双支/tsx 全域 grep/全量 test 绿
  （各含 exit=$?）。
- 改动面=恰两文件（theme.test.ts+invariants.md）+皮肤件临时植入（还原
  后 diff 空）；`git diff` 自查范围（实现者可跑只读 git diff）。
- 测试是锁定的合约——本票本身=受锁测试的[locked-change]面，主控已裁
  升级方向，实现者不得越预裁改断言语义（正则形态微调须③1 论证）。
- 卡点=BLOCKED 停手不自裁。

## ⑤ 验收判据

1. 新锚七件全绿+旧枚举锚删除（FS_LITERALS/FS_COUNTS 结构清理，死代码
   即删）。
2. 先红证+变异双支证据在档（各自原始输出）。
3. 皮肤件还原 diff 空。
4. npm run test 全量绿（1466 用例预期）+typecheck+lint 绿。
5. INV-61 注记回注+describe 头注口径更新。

## ⑥ 报告契约

全文落 `scripts/audits/f-css02-impl.report.md`：实现摘要/正则形态终态+
论证/证据日志清单/tsx 评估结论（含全域 grep 数）/自裁申报。回复五行内。
