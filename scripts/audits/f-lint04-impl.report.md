# F-LINT-04（T1）实现报告

> 实现者子代理（GLM5.3flash 档）。任务书=docs/design/2026-09-10_f-lint04-design-final.md
> §2 T1+§3 验收+§4 不做面。技能清点：test-driven-development（用——五支红证+
> 注入式并存测试即红证流程）/verification-before-completion（用——verify 真退出码
> 落盘）/systematic-debugging（备而未用——无卡点）/其余技能与票面无关不用。

## 1. 实现摘要

- **③ 单源化**：新件 `scripts/color-re.mjs` 驻 COLOR_RE 唯一字面量
  （`/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i`，无 g/y）+META_RE（哨兵特征正则，
  第三副本闭合）+stripUrlFunctions（⑦剥离器）。两消费文件 import 化，双写面
  物理消失；import 失败 fail-closed 自然抛错（红证 5 实证），无任何 try/catch
  回退。
- **③ 哨兵**：check-quality 新增 6b 段——对 eslint.config.js+check-quality.mjs
  自身文本 `matchAll(META_RE)` 计数>0 即红；哨兵行自身以 import 的 META_RE
  执行，不自咬（见 §5）。
- **⑥⑦② postcss 化**：check-quality 第 6 段 C-4 CSS 面整体迁
  `root.walkDecls`（decl.prop 以 `--` 开头=token 定义豁免色值检查）；⑦剥离在
  检测使用处先经 stripUrlFunctions；②色值域 token 同值守卫=value 剥离后命中
  COLOR_RE 的 token 声明按归一值（去空白小写）分组，同值 ≥2 键=红。
- **⑦ tsx 面**：eslint.config.js B-5 rule 同步 import COLOR_RE+
  stripUrlFunctions，inline style 字符串剥离 url 后再检。
- postcss 解析异常=push violation 非吞错（fail-open 统一，终裁 §1.6）。

## 2. 文件清单

| 文件 | 性质 | 改动 |
| --- | --- | --- |
| scripts/color-re.mjs | 新件（诞生即锁） | COLOR_RE+META_RE+stripUrlFunctions+禁令头注 |
| scripts/check-quality.mjs | 受锁 [locked-change] | 头注/import/第 6 段 postcss 化+②收集判定/6b 哨兵段（238→289 行） |
| eslint.config.js | 受锁 [locked-change] | 头注互指更新+import 化+B-5 rule 删内联正则改 import 值+剥离 |
| locks/manifest.json | 受锁流程产物 | 316→317 条（+color-re.mjs） |

## 3. 红证索引（全部「备份→植入→跑→红→还原→diff 确认空」文件备份法，禁 git checkout）

| # | raw 文件 | 植入 | 预期 | 实测 |
| --- | --- | --- | --- | --- |
| 1 | f-lint04-red1-dup-token.raw.txt | theme.css :root 加 `--flint04-t1: #123456`/`--flint04-t2: #123456` | ②红 | EXIT=1 恰一条同值守卫红（含键名对+行号+值）✓ |
| 2 | f-lint04-red2-multidecl.raw.txt | :root 单行 `--flint04b: var(--x); color: #fff;`（旧行为整行豁免逃检形态） | ⑥红 | EXIT=1 检出 `color: #fff`（同 token 行的 color 检出=声明粒度实证）✓ |
| 3a | f-lint04-red3a-url-nored.raw.txt | `.flint04-url-probe{fill:url(#face)}` | ⑦不红 | EXIT=0 ✓ |
| 3b | f-lint04-red3b-hex-red.raw.txt | 同位改 `color: #face` | ⑦红 | EXIT=1 ✓ |
| 4 | f-lint04-red4-sentinel.raw.txt | eslint.config.js B-5 create 内植一行内联 hex 正则 | ③恰一条哨兵红 | EXIT=1 violations 计数=1（哨兵红；W3 不咬 hex）✓ |
| 5 | f-lint04-red5-failclosed.raw.txt | color-re.mjs 临时改名 | fail-closed 红 | EXIT=1 ERR_MODULE_NOT_FOUND 启动即抛 ✓ |
| 并存 | f-lint04-coexist-dual-inject.raw.txt | 双注入：theme.test.ts 植 FS_DECL 副本文本行+eslint.config.js 植内联 hex 正则 | 恰两条（W3+③）互不干扰 | EXIT=1 violations=2：一条 W3（FS_DECL 多处 2 处）+一条③哨兵 ✓ |
| 存量 | f-lint04-stock-green.raw.txt / f-lint04-probe-dryrun.raw.txt | 无 | 全绿 | EXIT=0 ✓ |

## 4. 实现选择申报（票面授权「实现者现场定+申报」两处）

### 4.1 postcss import 形态

`import postcss from 'postcss'`（default import）——探针实测 default=function
可用、named.postcss=undefined（Node ESM 下 CJS 互操作仅 default 命名空间），
与主控预判一致。无异常，无需换形态。

### 4.2 ⑦ url() 剥离位置与实现

**选择：检测使用处剥离，剥离器=stripUrlFunctions 引号感知状态机，驻
color-re.mjs 导出供 CSS 面与 tsx B-5 面共用。** 理由：
- 弃正则内负向后顾 `(?<!url\()`：`url(data:...#abc)` 中段 hex 与
  `url("...#fff")` 引号隔断形态，后顾断言盖不住；剥离为语义正解。
- 弃 `/url\([^)]*\)/g` 简单正则：引号内 `)` 截断坑（deepseek 审核 §6 明示）；
  状态机逐字符+引号感知+反斜杠跳转，语义等同 value 解析。
- postcss 主包不含独立 value parser；树内无 postcss-value-parser（tailwind v4
  未传递引入），引之为虽物理零新增但超主控授权面（授权点名=postcss），故手写
  零依赖实现。

## 5. 哨兵不自咬实证

- 探针四向实测（f-lint04-probe-dryrun.raw.txt）：META_RE 对哨兵行文本
  （`content.matchAll(META_RE)` 形态）命中=0；对内联正则字面量行命中=1；对
  `new RegExp('...')` 字符串形态行命中=1；对自身 source 文本（带反斜杠形态）
  命中=0。
- 上线后实证：check-quality 全绿跑（f-lint04-stock-green.raw.txt）=哨兵对
  check-quality.mjs 自身+eslint.config.js 文本计数 0（两文件改造后所有注释
  均规避了无反斜杠 hex 字符类+量词形态）。**注意：今后维护两消费文件时注释
  禁出现该形态**（color-re.mjs 是唯一合法宿主，不在扫描面，无此约束）。

## 6. 存量零误报对照（终裁 §3.2）

探针 dry-run（postcss 化方案在存量 8 CSS 文件上）：
- 非 `--` 声明 COLOR_RE 命中（url 剥离后）=0（旧口径存量红=0，等价）；
- `--` 前缀 token 声明=109 处全部豁免色值检查（82 口径=theme.css :root 行数；
  109=全 CSS 文件含 @theme 2 行+其他皮肤件的 -- 声明，walkDecls 豁免语义
  等价）；
- 注释面命中=0；postcss 解析异常=0；
- ② 同值守卫（跨文件全局聚合）同值组=0。
- 上线后 check-quality EXIT=0 + verify 全链绿复证。

## 7. locks 实录

- 开工 `npm run locks:unlock`（316 解锁）→ 改三件 → 红证期备份/还原均不触
  generate → 收口 `npm run locks:generate`（仅生成 manifest 317 条，未设
  只读）→ `npm run locks:apply`（锁定 317）→ `npm run locks:check` 通过
  （317 与 manifest 一致）。
- 新件 color-re.mjs 诞生即入锁（check-locks walk 自动覆盖 scripts/*.mjs）。
- 备份目录 f-lint04-backup.out/（gitignore *out* 拦截）已删——mutation
  backup 禁驻留纪律。

## 8. verify 全链

`npm run verify` 真退出码=0（f-lint04-verify-full.raw.txt 落盘）。基线对照：
quality/tickets/locks/lint/typecheck/test/build 全绿；Test Files 162（基线
162 ✓）/Tests 1579（基线 1579 ✓）/locks 317（基线 316+1=color-re.mjs，段间
可解释）/registry 169 票 tickets:check 一致（F-LINT-04 状态翻转=主控收口
职责，实现者未触）。

## 9. 自裁申报（超票面明示决定）

1. **walkComments 注释面补充**：票面文字「CSS 扫描段整体迁 root.walkDecls」
   未提注释，但 ⑤ 裁决（Kimi 设计 §2.5「注释色值也禁，保持 C-4 现行不裁剪
   行为」，F-CSS-03 曾实清 6 行注释色值）在档——纯 walkDecls 会丢注释检测
   面=迁移弱化。补 `walkComments` 段保持行为等价（存量命中 0，零负担）。
2. **② 聚合域=跨文件全局**：Kimi 原文「theme.css :root+@theme 文件内聚合」；
   walkDecls 天然全域遍历，token 定义散布多文件（实测 109 处分布 8 文件）时
   跨文件同值与文件内同值同属「第二源」性质，取全局聚合。两种口径存量皆零
   同值（dry-run 实证），无存量行为差异。
3. **META_RE 带 g 例外**：COLOR_RE 禁 g/y 禁令对 META_RE 不适用——matchAll
   消费所必需（无 g 即抛 TypeError），且 matchAll 内部克隆正则不动原实例
   lastIndex；color-re.mjs 头注已注明「仅限 matchAll 只读遍历，禁挪作 test」。
4. **tsx B-5 面同步加剥离**：主控指令「tsx B-5 面的字符串同理」——B-5 的
   inline style 字符串（如 `background: 'url(#g)'`）与 CSS value 同构，共用
   stripUrlFunctions。
5. **报文格式**：②红报文含键名对+文件：行号+归一值；C-4 报文从「行文本」
   改「decl.prop: decl.value」（postcss 化后无行文本锚，声明即锚）。

## 10. 疑虑（供门审）

1. **postcss 为传递依赖**：tailwind 传递引入（8.5.26），npm 扁平 node_modules
   下 import 可达；但 package.json 无显式声明，未来 tailwind 换实现时可能静默
   消失（届时 check-quality/eslint.config 双双 fail-closed 报错，非静默失效）。
   主控已裁决此路径，遵从；提请知悉 hoisting 风险面。
2. **manifest.json CRLF**：lock-protected.ps1（PowerShell）生成的 manifest 带
   CRLF（git 提示 LF 转换警告）——locks:check 走 node JSON 解析不受行尾影响，
   为既有流程常态，未处置。
3. **W3 检测域观察**（非本票面）：并存测试首跑发现 W3 哨兵模式
   `/FS_DECL = \//g` 只咬字面「FS_DECL = /」文本——改名副本
   （`FS_DECL_COPY = /`）不触发。本票并存测试按哨兵字面域构造触发（注释行
   副本含精确文本）；该检测域窄问题属 W3 既有面，仅记录不扩票。
4. **shell 四坑又一实证**：node -e 双引号内容经 bash 变形产生一个空残留文件
   `{console.error('FAIL'`（已删）——多行脚本 Write 直写纪律再次验证必要。

## 11. 门一 R1 回炉段（B×6/W×4/N×7 放行，W-2/W-1/W-3 三小项一次回炉；W-4 主控已裁入档不动）

### 11.1 W-2 同名 token 重定义假阳（代码修）

② 判定分组结构改 `Map<归一值, Map<prop, 声明[]>>`（同名合并为一键），判定=
同值且**不同名**键 ≥2 才红。红证 f-lint04-red6-samename.raw.txt 三段：

| 段 | 植入 | 实测 |
| --- | --- | --- |
| 6a 修前 | :root `--flint04-w2: #123456` + .dark `--flint04-w2: #123456`（主题切换重绑合法形态） | EXIT=1 假阳实锤（同名被当两键） |
| 6b 修后 | 同上不撤 | EXIT=0 假阳消除 |
| 6c 不弱化 | .dark 块改异名 `--flint04-w3: #123456` | EXIT=1 异名同值仍红（报文含键名对+行号） |

还原备份法（r1bak）+diff 确认空。存量复绿（红证 6b 即含存量面 EXIT=0）。

### 11.2 W-1 哨兵语义边界（注释声明）

6b 哨兵段注释补：本哨兵=**逐字副本检测**（hex 字符类+{3,8} 量词裸形态的
原样复制）——序换/量词变体/字符类简写等变形回退不在覆盖面（T2 候选扩展，
勿当完备防线）；新增第三消费文件必须同步扩 SENTINEL_SCAN_FILES 枚举
（漏扩=新消费面脱离哨兵监控——义务声明）。注释措辞规避无反斜杠完整形态
（防哨兵自咬）。

### 11.3 W-3 at-rule prelude 盲区（注释声明）

6b 注释区补：walkDecls+walkComments 不覆盖 at-rule prelude（@supports/
@import 等行内色值）——存量零命中+形态极罕见，明示盲区不检。

### 11.4 R1 收口

- 受锁流程照旧：unlock（317）→改 check-quality.mjs→generate（317 条）→
  apply（锁定 317）→check 通过（317 与 manifest 一致）。
- verify 全链真退出码 **VERIFY-EXIT-R1=0** 追加落 f-lint04-verify-full.raw.txt
  （162 文件/1579 用例/locks 317——与基线及首版全对齐）。
- 改动面：scripts/check-quality.mjs（②判定重构+两段注释）+locks/manifest.json；
  备份目录已清；未触 git/registry。
- **index 状态发现（供主控知情）**：R1 收口 git status 时见 color-re.mjs 呈
  `A`（intent-to-add 空 blob e69de29——`git add -N` 占位标志，非实现者操作；
  推断=门一链生成 f-lint04-gate1-core.diff 所需的标准手法）。该占位不污染
  提交内容——主控收口显式 `git add` 实文件即覆盖；实现者按禁令未碰 git
  （含 reset），交主控处置。
