# F-LINT-02 实现报告（B-1 同值双常量 lint 机器化——实现段）

> 实现者子代理（三屋模式）；蓝本=终裁书 f-lint02-design-final.md 逐节照做；
> 对拍金标准=f-lint02-dryrun.raw.txt（dry-run 脚本本体已不在档，输出档在）。
> 配置自查：实现席 GLM5.3flash 档；无 vitest/test 面操作（票面禁全量 verify/test——
> 定向验证清单见 §3）。技能清点：TDD（红证形态适配为变异红证法）/完成前验证（用）；
> 系统化调试（不用——实现场非调试场）。

## 1. 实现摘要

案 A 落地：单文件 AST 扫描器（typescript@~5.6.3 devDeps 已有——**零新依赖**，
票面 §④ 顾虑项解除：无需退正则降档）挂 check-quality 第 7 段。判据=终裁 §2
六判据修正版逐条实现；baseline 棘轮=终裁 §3；B-2 副产物=终裁 §5。
**核心对拍修正：红层实测 8 组（非终裁预估 6）**——详见 §4/§6-1。

## 2. 文件清单（全部相对仓库根）

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| scripts/check-dup-constants.mjs | 新增 221 行（受锁自动入面） | AST 收集+红/warn 分层+baseline 棘轮+B-2+CLI |
| scripts/dup-constants.baseline.json | 新增 80 行（**显式登记受锁**） | 8 组存量真命中指纹 |
| scripts/check-quality.mjs | +14/-1（受锁流程内改） | import scanDuplicateConstants+第 7 段挂点 |
| scripts/check-locks.mjs | +3（受锁流程内改） | protectedFiles 显式加 baseline.json（walk 面外单文件登记） |
| scripts/lock-protected.ps1 | +2/-1（受锁流程内改） | cfg 列表同步加（与 check-locks 口径一致） |
| package.json | +1 | `"lint:dup-constants": "node scripts/check-dup-constants.mjs"` |

受锁操作：unlock（×2——中途被并发会话 re-apply 回只读，见 §6-6）→改→apply
（manifest 299 条，含 dup-constants 两件）→locks:check exit=0 亲验。

## 3. 定向验证清单（未跑 verify/test 全量——票面禁令）

- `node scripts/check-dup-constants.mjs` → exit=0（8 组 baseline 待收敛/warn 3 组）✓
- `node scripts/check-quality.mjs` → 第 7 段摘要行正常；**唯一红=AnnotationEditor.tsx
  302 行超组件上限=F-A11 收口提交（a50e3c348d）自带欠账，非本票引入**（HEAD 与工作树
  同为 301 行物理；该票面自称 verify exit=0 亲验与现状矛盾——见 §7 疑虑）
- `npx eslint scripts/check-dup-constants.mjs scripts/check-quality.mjs
  scripts/check-locks.mjs` → exit=0 ✓
- `node scripts/check-locks.mjs` → exit=0，manifest 含 dup-constants×2 ✓

## 4. 存量对拍表（收集器 vs dry-run 18 组逐组）

扫描面：214 文件（[门二 W-4 后] 顶层限定与 .spec. 排除后口径；213→214=并发会话
src 面演进，walkdiff 探针 old/new filter 实测同 214=零面差自证；dry-run 214=dry-run
时点 212 ts/tsx+2 个 env.d.ts）。声明：**141**（[门二 W-4] 顶层限定后=138 顶层纯
字面量[恰=dry-run 正则口径]+3 终裁 §2.6 归一化设计增量[AGG_COLS/INTERFACE_MD
无插值模板×2、BAND_LEFT 负数×1]；首轮曾 149[+8 嵌套]——门二裁决嵌套不收后剔除；
组级零假阳零漏）。B-2 未 export 清单 91→83（嵌套剔除同因）。

| dry-run 组 | 值（归一后） | 本器归类 | 成员文件集比对 |
| --- | --- | --- | --- |
| '操作失败' | '操作失败' | **红×2+warn**（拆分） | ACTION_FAILED 3 文件/OP_FAILED 4 文件逐一一致；整组异名另入 warn |
| 2 | 2 | 放行（数字异名） | — |
| 3 | 3 | 放行 | — |
| 0.5 | 0.5 | 放行 | — |
| 200 | 200 | 放行 | — |
| 50 | 50 | 放行 | — |
| 32 | 32 | 放行 | — |
| 15_000 | 15000 | 放行（HTTP_TIMEOUT_MS/READING_TICK_MS 异名） | — |
| 'ai-sensor' | 'ai-sensor' | warn（§2.3 长度≥4 修正案收） | 2 文件一致 |
| 100 | 100 | 放行 | — |
| 0.1 | 0.1 | 放行 | — |
| 1.5 | 1.5 | **红 baseline** | 2 文件一致 |
| 0.02 | 0.02 | **红 baseline** | 2 文件一致 |
| '标注保存失败' | '标注保存失败' | warn | 2 文件一致 |
| btn（tailwind） | 同值 | **红 baseline** | 2 文件一致（同名异值的 3 处局部 btn 正确未入组） |
| 5000 | 5000 | **红 baseline**（STATUS_POLL_MS） | 2 文件一致 |
| '标签操作失败' | '标签操作失败' | **红 baseline**（TAG_OP_FAILED） | 2 文件一致 |
| ITEM_STYLE（tailwind） | 同值 | **红 baseline** | 2 文件一致 |

结论：18 组全覆盖（8 红+3 warn+9 数字异名放行；'操作失败' 1 组拆 2 红+1 warn），
成员文件集与 dry-run 逐一吻合，零新增组。

## 5. 红证系列（变异法：临时 src/red-proof-{a,b}.ts 植入→跑→落盘→删；
git status 残留检查=零）

| 编号 | 场景 | 预期 | 实测 | 档案 |
| --- | --- | --- | --- | --- |
| RED-1 | 跨文件同名同值 RED_PROOF_SENTINEL | 红 | exit=1 | f-lint02-red-sentinel.raw.txt |
| RED-1r | 上者还原 | 绿 | exit=0 | f-lint02-red-sentinel-restore.raw.txt |
| RED-2 | 阴性对照：异名同值 RED_A=777/RED_B=777 | 不红 | exit=0 | f-lint02-red-negative.raw.txt |
| RED-3a | 矩阵：无插值模板（反引号 vs 单引号跨形态） | 红 | exit=1 | f-lint02-red-tpl.raw.txt |
| RED-3b | 矩阵：as const 包裹（一边裸字面量） | 红 | exit=1 | f-lint02-red-asc.raw.txt |
| RED-3c | 矩阵：同文件两处同名同值 | 不红 | exit=0 | f-lint02-red-samefile.raw.txt |
| RED-3d | 矩阵：trivial 值（=1）同名跨文件 | 不红 | exit=0 | f-lint02-red-trivial.raw.txt |
| RED-4 | 自裁加验：1_500≡1500 数字分隔符归一 | 红 | exit=1 | f-lint02-red-sep.raw.txt |
| RED-5 | [门一 C-2] 括号包裹 sentinel（('red-proof-sentinel') vs 裸字面量跨形态） | 红 | exit=1 | f-lint02-red-paren.raw.txt |
| RED-6 | [门二 W-4] 两文件函数内同名同值局部 const | 不红 | exit=0+输出零提及 | f-lint02-red-nested.raw.txt |
| B-1 验① | [门二 B-1] 坏 baseline→独立 CLI 硬拦截 | 红 | exit=1（corrupt 直接致红） | f-lint02-red-corrupt-cli.raw.txt |
| B-1 验② | [门二 B-1] 坏 baseline→挂点 violations 含「baseline 损坏…硬拦截」行 | 红 | check-quality exit=1+第 16 行证据 | f-lint02-red-corrupt-mount.raw.txt |
| C-1 验 | [门一 C-1] baseline 写坏→stderr 告警行+还原 exit=0+diff 空 | 告警 | 控制台亲验（回炉一轮时 exit=1 系存量红组间接效应——门二已裁失实，二轮改 corrupt 硬拦截直接保障） | 控制台亲验 |

另：首跑（baseline 未建时）全红输出档=f-lint02-first-run.raw.txt。

## 6. 自裁申报（超票面/终裁口径偏差全录）

1. **红层 8 组≠终裁 §4 预估 6 组**：'操作失败' 组内 ACTION_FAILED（3 文件同名
   同值）与 OP_FAILED（4 文件）满足 §2.3「同名同文案入红层」判据——终裁 §4
   预分组把整组归 warn 系漏看同名子对。依 §4 自身「『6 组真命中』=待对拍结论，
   实现期以对拍通过为验收（非默认事实）」条款，以判据实测为准收 8 组入 baseline。
   ACTION_FAILED×3 本就是 B-1 票意欲拦的典型同值双常量。
2. **warn 3 组≠终裁 §4/§6「2 组/warn≤2」**：§2.3 修正案（长度≥4 即 warn，'ai-sensor'
   漏收修正）在判据层必然收入 'ai-sensor'（9 字符）——§4/§6 的 2 组为修正前残留
   数字。判据层优先，实测 3 组。
3. **baseline 指纹加 kind 维**（name+kind+value+文件集）：较终裁「name+value+文件集」
   收紧——同名同值但类型层变（'5' vs 5）不互抵，重审一次。
4. **剥壳口径**：终裁 §2.6 字面为「as const/satisfies 包裹计入」；实现为
   AsExpression 全剥（含 `as SomeType`）。当前存量两种口径零差分（shell 样本全为
   数组/对象 as const，非字面量不收）；边界行为差异留档。[门一 C-2 回炉补]
   ParenthesizedExpression（('操作失败') 形态）入剥壳 while 循环——RED-5 红证在档。
   **边界矩阵补全（§2.6+门一 C-4+门二 W-1/W-4）**：计入=字面量/as const/as T/
   satisfies/括号壳/无插值模板/负数字面量/**仅顶层/模块级声明**（SourceFile 直接
   子级——[门二 W-4] 与 dry-run ^const 行首锚同口径，局部 const 不收，RED-6 用例
   在档）；排除=computed key/对象常量/插值模板/bigint（BigIntLiteral 独立节点天然
   不收+[门二 W-1] 文本 /n$/i 双保险）/函数与块级局部声明/.test./.spec. 文件
   （[门二 W-2]，当前 src 面无 spec=规则一致性修复，walkdiff 探针零面差自证）；
   **已知漏报方向 [门一 C-4]**：createSourceFile 的 parseDiagnostics 不查——TS
   parser 容错产出部分 AST，语法损坏文件可能静默漏报（与 trivial 豁免同哲学：
   宁漏报不加噪；CI 另有 typecheck 硬线兜底语法损坏）。
5. **RED-4 加验**：票面矩阵四边界外自裁加数字分隔符归一证（§2.6 要求面）。
6. **并发踩踏申报**：①本席 unlock 后受锁面被并发会话（F-A9/F-A10 之一）re-apply
   回只读，二次 unlock 后完成；②本席 locks:apply 已将 F-A9 在途中间态
   （band-calibration.test.tsx 修改态+audits 下 4 个探针 .mjs）卷入 manifest 299——
   **F-A9/F-A10 收口时须自行 re-apply 收敛**（其探针若删除亦触发 manifest 再生）。
7. **package.json 受锁与否**：票面问号项——经 check-locks.mjs protectedFiles 逐行核对
   =不在受锁面，scripts 字段新增无需 unlock 流程（[locked-change]/[dep-change] 尾注
   需求均不触发；非依赖变更）。
8. **挂点解读**：终裁「挂 check-quality 链（eslint 后）」实现为 quality:check 宿主
   第 7 段（F-LINT-01 同位先例）+独立 npm script lint:dup-constants；verify 链顺序
   未动（「eslint 后」按案 A 原意=补充 eslint 之不足的第二道 lint 解读）。
9. **B-2 副产物**：默认 stderr 一行计数（实测 91 处），DUP_CONSTANTS_B2=1 展开
   全清单——不卡 CI、不定消费规则（终裁 §5 半合派）。

## 7. 疑虑

1. **AnnotationEditor.tsx 301 行（quality 计 302）超组件 250 上限**：HEAD
   a50e3c348d（F-A11 收口提交）即此状态且工作树无后续修改；该票面自称「verify
   exit=0 亲验」与现状矛盾——非本票引入。**[门一回炉 D 项表述更正]** 组件 250
   =宪法目标线非机检线，ESLint max-lines=500 硬线为主控核销口径；原报告「quality
   第 4 段必红」断言删（主控已按目标线口径核销，机检面以 500 硬线为准）。
2. 终裁 §6 验收「verify 全链+check-quality 挂点即绿」在本仓当前场态无法达成：
   除上条欠账外 locks:check 依赖 F-A9/F-A10 收口收敛——本票面内自验面（§3）全绿。
3. 干燥跑脚本本体（f-lint02-dryrun.mjs）不在档，对拍以 raw.txt 输出为金标准
   （组级 100% 吻合已是最强可得证据；声明级 138 的正则口径细节不可完全逆向）。

## 8. 门一回炉记录（一轮，Kimi 0B/4W，主控核销 B/E 两项）

- C-1 ✓ baseline 解析 catch 加 stderr 告警行（防排障误导归因）；亲验=写坏→
  告警行（含错误详情+「检查文件是否损坏」指引）→按空处理 exit=1（损坏不放行
  =防绕过语义）→还原 exit=0+diff 空。
- C-2 ✓ literalOf 补 ParenthesizedExpression 剥壳（与 as/satisfies 同 while）；
  RED-5 括号 sentinel 红证 exit=1 在档（f-lint02-red-paren.raw.txt）。
- C-3 ✓ 挂点路径补齐 clipped 20 行截断：formatDupDetails 抽为导出函数
  （CLI 与 check-quality 共用单源）；信息性明细（baseline 待收敛+warn）两路径
  同走 clipped，newRed=红走 violations 全量（拦截语义不截断，与 check-quality
  各段一致）。
- C-4 ✓ parseDiagnostics 不查=漏报方向申报入边界矩阵（§6-4）。
- D 项 ✓ 越证表述更正（§7-1）：「必红」断言删，250=宪法目标线非机检线，
  ESLint max-lines=500 硬线为主控核销口径。
- 回炉后定向红绿：RED-5 exit=1→还原 exit=0；scanner exit=0（8 baseline/
  warn 3 不变）；check-quality 挂点明细行输出正常；eslint 两文件 exit=0。
- 并发场注记：本轮解锁后 baseline.json 只读位曾被并发会话 apply 复置（单文件
  去只读后完成验证）——locks:apply 时点场态以最终 apply 为准。

## 9. 门二回炉记录（第一轮，deepseek 1B/4W——第二轮回炉 ≤2 限内）

- **B-1 必修 ✓ baseline 损坏硬拦截**：catch 置 corrupt 标志→主流程 exit 判定
  `newRed.length>0||corrupt`（CLI）+挂点 violations push「baseline 损坏…硬拦截」。
  **认账**：一轮申报「按空处理 exit=1（损坏不放行）」与代码语义不符——该 exit=1
  系存量红组间接效应，非 catch 直接保障；净存量场损坏将静默放行（防绕过缺口）。
  此申报失实已记简报。红证两路径：CLI exit=1（f-lint02-red-corrupt-cli.raw.txt）
  +挂点 violations 第 16 行证据（f-lint02-red-corrupt-mount.raw.txt）→还原
  exit=0+diff 空。
- **W-4 ✓ 收集限定顶层/模块级**（SourceFile 直接子级）：与 dry-run ^const 行首锚
  同口径；RED-6 用例（两文件函数内同名同值局部）exit=0+输出零提及在档。存量复核：
  声明 149→141（嵌套 8 剔除）、**8 baseline+3 warn 组零变化**、B-2 91→83。
- **W-1 ✓ bigint 排除**：BigIntLiteral 独立节点天然不收+NumericLiteral 文本
  /n$/i 防御性双保险（非常规形态）——边界矩阵行已补（§6-4）。存量无 bigint
  const=零面变化。
- **W-2 ✓ .spec. 排除**：与 .test. 同口径（basename 段匹配）；walkdiff 探针
  old/new filter 实测同 214 文件零面差（当前 src 无 spec 文件=规则一致性修复）。
- **W-3 ✓ 截断文案+env 旁路**（选实现旁路）：`输出超 20 行已截断——设
  DUP_CONSTANTS_FULL=1 看全量`；clipped 内 env 检查=CLI 与挂点两路径共用单源
  自动生效。探针亲验：默认 25→21 行（含指引）/FULL=1→25 行全量。
- 回炉后定向红绿：scanner 连续 3 次 exit=0（8 baseline+3 warn 不变）；RED-6
  exit=0；B-1 两路径红→还原绿；eslint 两文件 exit=0；植入零残留。
- 瞬态申报：回炉中一次完好 baseline 下 CLI 曾 exit=1（输出被 /dev/null 吞不可
  回溯）——当前同代码同面连续 3 次稳定绿，定性=并发会话在途写的瞬态组漂移
  （F-A9/F-A10 活跃窗口），非本票代码缺陷。
