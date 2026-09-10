# F-LINT-04-T4 实现者报告——C-4c var() 语义锚（三屋·实现跳）

> 领单：F-LINT-04-T4（tickets/registry.ts open 行=票面）。
> 前置：T4PRE 收口态（R−D−W=∅）开工前亲验：探针 f-t4pre-rdw.mjs
> R=94 / D=110 / W=2 / R−D−W=∅ exit=0（2026-09-10 本场实跑）。
> 技能清点：test-driven-development 用（红→绿→变异红证全链）/
> verification-before-completion 用（verify 真退出码分段亲跑）/
> systematic-debugging 不用（实现票非调试票）/ 其余不用（无 UI/浏览器/数据面）。

## 1. 实现摘要

check-quality.mjs 新增 **6c 段 C-4c var() 语义锚**（跨文件聚合独立 pass——
B-1 check-dup-constants 先例）：扫 src 全域（.css/.ts/.tsx）注释剥离后
`matchAll /var\(\s*(--[\w-]+)/g` 收引用名集 R（Map<名, Set<相对路径>>）；
D=theme.css 定义名集；DYNAMIC_TOKENS 白名单常量驻段首（单源）；
R−D−W 非空=逐名 violations.push（含引用文件清单）。fail-open：读取/
解析异常 push violation 非吞错。注入点侧回指注释双向互指辅链落
App.tsx/TextLayer.tsx。

## 2. 文件清单（本票改动面=3 文件）

| 文件 | 改动 |
| --- | --- |
| scripts/check-quality.mjs | +62 行：头注职责行 + 6c 段（6b 之后段序递增）；312→372 行（≤500） |
| src/renderer/app/App.tsx | 132-133 行注释块融合回指句（+1 行）；205→206 行（≤250）；setProperty 行 135→136 |
| src/renderer/features/reader/TextLayer.tsx | 140 行注释融合回指句（+1 行）；155→156 行（≤250）；'--scale-factor' 行 150→151 |

未跟踪新件=12 证据 raw+本报告（scripts/audits/f-t4-*，收口由主控显式列入库）。
工作树另有 tickets/registry.ts 未提交改动=**主控派发立案行（非本实现者改动**，
git diff 亲验=T4 票行新增，提请收口知悉）。

## 3. TDD 红证矩阵（每支独立临时文件+独立 raw+exit 落盘）

| 支 | 形态 | 预期 | 实测 | raw |
| --- | --- | --- | --- | --- |
| pre-impl | tmp-ghost.tsx `var(--ghost-pre)` 悬空 | 现状不拦 exit=0 | exit=0（检测缺失红） | f-t4-preimpl-red.raw.txt |
| 转 R 红证 | 同上文件 C-4c 落地后 | exit=1 含 --ghost-pre+文件名 | exit=1 ✓ | f-t4-ghost-red.raw.txt |
| R1 | tmp-t4-r1.tsx 代码面 `var(--ghost-x)` | 红 | exit=1，violation 含 --ghost-x+引用文件名 ✓ | f-t4-red-r1.raw.txt |
| R2 | tmp-t4-r2.css CSS 面 `var(--ghost-css)` | 红 | exit=1 ✓ | f-t4-red-r2.raw.txt |
| R3 | tmp-t4-r3.tsx 注释行 `// var(--ghost-note)` | 不红（剥离） | exit=0 ✓ | f-t4-red-r3.raw.txt |
| R4 | tmp-t4-r4.tsx `var(--ui-scale)` | 不红（白名单） | exit=0 ✓ | f-t4-red-r4.raw.txt |
| NR1 | 存量 theme.css @theme 重绑（--fs-body 等） | 不红 | 存量绿检 exit=0 涵盖 ✓ | f-t4-stock-green-quality.raw.txt |
| NR2 | tmp-t4-nr2.tsx style 键 '--scale-factor' 注入形态 | 不红（非 var() 不进 R） | exit=0 ✓ | f-t4-red-nr2.raw.txt |
| D-1 | tmp-t4-d1.css 定义 `--ghost-only: 1px`+同文件引用 `var(--ghost-only)` | 红（D 集仅认 theme.css=防漂移执法） | exit=1，violation 含 --ghost-only ✓ | f-t4-red-d1.raw.txt |
| D-2 | tmp-t4-d2.css 块注释叙述 `/* var(--ghost-block) */` | 不红（块注释剥离正向实证——CSS 域唯一剥法；矩阵原只证 ts 行注释 R3） | exit=0 ✓（删件后复绿 exit=0） | f-t4-red-d2.raw.txt |

> D-1/D-2=门一 Kimi W 级两支回炉补证（2026-09-10 回炉轮 1——防漂移执法路径+CSS 域块注释剥离正向）。

## 4. 变异红证（cp 备份法——禁 git checkout）

1. cp check-quality.mjs → scripts/audits/f-t4-mutation-backup.dat；
2. 变异=删 ts/tsx 行注释剥离行（`if (!rel.endsWith('.css')) stripped = stripped.replace(/^\s*\/\/.*$/gm, '')`）；
3. R3 临时件在场跑 quality：**exit=1，C-4c violation 含 --ghost-note（注释叙述被误提取翻红）**——剥离逻辑非恒真（f-t4-mutation-red.raw.txt）；
4. cp 还原 → diff 空（backup 与还原件逐字节同）→ 备份即删、R3 临时件删；
5. 复跑 quality exit=0（复绿，计入存量绿检 raw）。

## 5. 存量绿检

- `npm run quality:check` exit=0（R−D−W=∅ 零误报=T4PRE 收口基线；NR1 含于其中）——f-t4-stock-green-quality.raw.txt
- `npm run lint` exit=0——f-t4-stock-green-lint.raw.txt

## 6. verify 真退出码（分段口径——&& 链 locks:check 红断链）

- `npm run verify`：quality ✓ → tickets ✓ → **locks:check 红 exit=1 断链（预期态：主控预解锁 319 文件，收口 apply）**，f-t4-verify.raw.txt 末行 exit=1；
- 断链后补跑 `npm run lint && npm run typecheck && npm run test && npm run build`：**exit=0**（f-t4-verify-rest.raw.txt 末行）；
- 基线核对：Test Files **162 passed (162)** / Tests **1579 passed (1579)**=票面基线吻合。

## 7. 自裁申报（超票面细节，均未先斩后奏项的事后申报面）

1. **段落落位=6b 之后段号 6c**（票面授权自裁）：段序递增自然；6b 哨兵紧随 6 段 COLOR_RE import 消费主题不拆。
2. **D 提取=postcss walkDecls（AST）而非「剥注释+VAR_DEF 正则」**：票面要求「D 提取同样剥注释」——AST 化=注释天然不进树，比正则剥离更彻底（探针差异点的加固强化形态）；@theme 块内定义（--text-xs 等）天然入集；第 6 段已有 postcss 先例零新依赖。
3. **D 解析失败跳过逐名判定（varDefOk flag）**：解析失败 violation 已红（fail-open 关卡红语义保留），跳过仅避免 R 全量 94 名刷屏噪音——非吞错。
4. **CSS 文件只剥 `/* */` 不剥 `//`**（探针蓝本对两域同剥）：CSS 无 // 语法，剥之反伤 url(//host) 形态；ts/tsx 剥行首 //（蓝本口径）。
5. **注入点行号漂移处理**：加注后 setProperty 135→136、'--scale-factor' 150→151（sed 亲验），白名单注释 file:line 写加注后实际值（136/151）保持自洽——票面原文 135/150 系加注前坐标。
6. 注释措辞：回指句按票面模板融合进现有注释块（不新起块）；App.tsx 融入「数据通道单点」块尾、TextLayer 融入 140 行描述句内。
7. 尾行「quality 检查通过」文案未加 C-4c 面：T1 落地先例=该文案不随段增改（4b/5/6 段均不在文案中），维持一致。
8. R3 临时件在 R4/NR2 支跑时保留在场（剥离后零引用=中性，供变异红证复用）；其余支均独立临时件独立跑独立删。
9. **[回炉轮 1 事后补报]** postcss 解析失败信息截首行 `String(e.message).split('\n')[0]`（与第 6 段既有 violation 形态同口径）——门一 C-3 知悉面，补报入册。

## 8. 疑虑（供门审/主控裁量）

1. **行尾注释残留面**：剥离仅行首 `//` 形态（探针蓝本）——`code; // var(--x)` 行尾注释叙述会入 R 产生假阳（存量零此形态=绿检实证；真遇=注释位置小修即消，非关卡缺陷）。
2. **模板字符串内换行行首 // 文本**会被误剥（字符串字面量内容非代码注释）——极端罕见，蓝本同形态承袭，漏报向（保守面）。
3. registry.ts 工作树未提交改动=主控立案行（§2 已述），本实现者未触 tickets/（git diff 亲验归属）。
