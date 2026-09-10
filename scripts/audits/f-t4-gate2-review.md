# 门二终审报告——F-LINT-04-T4（C-4c var() 语义锚）实证二审

> 审查口径：四清单+一，只读亲验（机器面亲跑+代码亲读+raw 抽验）；唯一文件操作=临时红证件 tmp-g2.tsx 建删（完成后路径净已确认）。
> 技能清点：code-review-excellence 用（审查方法论）/ verification-before-completion 用（机器面真退出码）/ 其余不用（纯审查零实现面、无 UI/浏览器面）。

## ① 处置核对（门一 R1 findings 全项 vs 终态）

**W-2 闭合确认（D-1/D-2 回炉补证 raw 亲读）**：
- D-1 防漂移红证：f-t4-red-d1.raw.txt 尾三行实证 `--ghost-only 引用悬空（引用于 src/renderer/tmp-t4-d1.css）` + exit=1——他 css 文件内定义不入 D 集、引用即红的单源执法路径有红证。门一 R2 已裁 ADDRESSED（raw 不能独立佐证夹具定义存在性——tmp 件已删不可回溯，R2 已登记该证据力瑕疵，本门二接受同口径：互证链完整）。
- D-2 块注释剥离红证：f-t4-red-d2.raw.txt 尾三行 exit=0（含块注释叙述文件不红+删件复绿双向）——与 D-1 互证排除假绿（tmp css 确在扫描范围）。R2 裁 ADDRESSED，认可。

**N9 逐项终态确认（均未恶化）**：
- A-2 AST 化：331-335 行 walkDecls 实物在位；主控收口 registry 追认（任务书声明）。
- A-3 CSS 不剥 `//`：322 行 `if (!rel.endsWith('.css'))` 条件剥离实物在位。
- A-4/E-2 行号 136/151：本门二 sed 双点独立亲证（App.tsx 136=setProperty 行、TextLayer.tsx 151='--scale-factor' 行），且白名单注释 306-307 行所写 file:line 与实物一致——R1 不可证项就此闭合。
- C-3 截首行：338 行 `String(e.message).split('\n')[0]` 实物在位，§7.9 已事后补报（R2 裁诚实入册）。
- D-3 字面量入 R：本门二复刻红证恰好独立实证该行为存在（`'var(--gate2-ghost)'` 字符串形态入 R 翻红）——行为与 R1 记载一致，存量绿检零误报，未恶化。
- D-4 行尾 `//` 假阳/模板串误剥：322 行正则 `^\s*\/\/` 行首锚实物在位，存量零实证。
- D-7 walk 无 try/catch：310 行裸 walk 与既有各段同构，非本票引入。
- E-5 verify 全链+[locked-change]：收口挂账项（locks:check 红=主控预解锁 319 文件预期态，提交尾注+locks:apply+12 raw 入库归主控收口动作）——流程既定，非实现缺陷。

## ② 母本符合度（票面核心六要素 vs 实现，亲读 288-350 区）

| 票面要素 | 实现 | 亲验 |
| --- | --- | --- |
| R 三域扫描 | 310 行 walk src `/\.(css|ts|tsx)$/` + 309 行 VAR_REF_RE matchAll → Map<名,Set<相对路径>> | ✓ |
| 注释剥离 | 321 行块注释全域剥+322 行行首 `//` 仅 ts/tsx 剥（CSS 域不剥=A-3） | ✓ |
| D=theme.css 单源 | 331-332 行仅 theme.css walkDecls（AST 化=A-2 主控追认中）；329/340 行 varDefOk 失败即红不静默 | ✓ |
| DYNAMIC_TOKENS 单源 | 308 行段首常量恰 2 成员+306-307 行逐条注注入点 file:line（136/151 亲证自洽） | ✓ |
| 双向互指 | 白名单注 file:line（主链）+App.tsx 132-134/TextLayer.tsx 140-141 回指常量名+文件名（辅链，不带行号=稳定指）——终裁 §1.5 单向纪律落地正确 | ✓ |
| fail-open | 315-319 读取失败 push violation、336-338 解析失败 push violation，零吞错 | ✓ |

R−D−W 非空=逐名 violation 含引用文件清单（340-348 行）与票面吻合。探针 f-t4pre-rdw.mjs 留档未删（git status 亲见在库）。

## ③ 宪法红线

- **行数**：亲 wc 三文件 372/206/156——check-quality ≤500、两 tsx ≤250，与报告 §2 及主控亲核一致。
- **UTF-8**：6c 段中文注释（291-307 行）亲读全部可读，无乱码。
- **零新依赖**：postcss=第 14 行既有 import；git diff 仅两 hunk（@@ -5,7 头注职责行 / @@ -287,6 6c 追加段），import 区不在 hunk 内——diff 实证零新增 import。
- **受锁纪律**：实现者零 locks 命令（报告+证据链无痕迹）；工作树 4 M 中 registry.ts=主控立案行（实现者 §2/§8.3 已申报归属）。
- **6b 哨兵面未破坏**：git diff 中 SENTINEL_SCAN_FILES/META_RE 零触碰（grep 实证）；282-289 行哨兵消费区实物在位。

## ④ 机器面亲跑（七件）

| 项 | 结果 |
| --- | --- |
| `npm run quality:check` | exit=0，存量零 C-4c violation（R−D−W=∅ 零误报=T4PRE 基线） |
| 临时红证复刻 | 建 src/renderer/tmp-g2.tsx（`export const X = 'var(--gate2-ghost)'`）→ exit=1+violation 含 --gate2-ghost+引用文件名 → 删件 → 路径 git status 净+复跑 exit=0 |
| `node scripts/check-tickets.mjs` | exit=0（173 工单/open 1=本票） |
| `npm run lint` | exit=0 |
| 翻 done 推演 | check-quality.mjs 第 52 行 NotImplementedError 字样系注释无调用形态，规则 3 正则 `/unimplementedObject|NotImplementedError\(/` 实测不命中（node 探针 false）→ 翻 done 不红 |
| raw 抽验 3 件 | f-t4-ghost-red.raw.txt（exit=1 含 --ghost-pre=pre-impl 件转红）/f-t4-mutation-red.raw.txt（exit=1 含 --ghost-note=删剥离行变异态）/f-t4-verify-rest.raw.txt（尾行 exit=0+Test Files 162/Tests 1579 基线吻合票面）全部与报告记载一致 |
| D-1/D-2 补证 raw | 见清单①，两件在档且内容吻合 |

## ⑤ 成本账本

- 实现者（统一档）两轮：首轮 1,903,258 tok / 47 调用 / 665s；回炉轮 457,098 tok / 7 调用 / 66s。
- 门一 Kimi（kimi-main）两轮：R1 in 6,496 / out 10,206 / 254s（R1 头注亲读）；R2 in 1,172 / out 1,606 / 70.9s（R2 头注亲读）。
- 门二=本报告（统一档），用量见会话回执。

## 统计与总评

**B=0 / W=0 / N=1**（登记性：门二复刻红证兼证 D-3 字面量入 R 行为面——R1 已知悉项的行为确认，非新缺陷，存量零误报）。

**总评：PASS 无条件。** 四清单全过：门一 W-2 两支红证 raw 亲验闭合、N9 逐项终态一致未恶化（含 R1 不可证的 136/151 行号本门二独立闭合）；票面六要素与实现逐条吻合；宪法红线五项全过；机器面七件亲跑全绿+独立红证成立+翻 done 推演不红。收口挂账项（verify 全链、[locked-change] 尾注、locks:apply、A-2 registry 追认、12 raw+审计档显式入库）均为主控收口既定动作，不构成附条件。建议收口。
