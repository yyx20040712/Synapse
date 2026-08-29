# R2-SH1 门二终审报告（三屋·门二屋）

> 审者自报：模型 = builtin:bigmodel-coding-plan/GLM-5.3，思考等级 = 中高（默认推理档）。
> 技能清点（AGENTS 开工纪律）：**用** code-review-excellence（终审本体）、**用**
> verification-before-completion（四清单逐项亲测：grep/wc/sha256/check-tickets 逐条推演，
> 不采信转述）；**不用** test-driven-development（铁律禁跑测试——TDD 面以证据档
> 交叉核对代替）；**不用** git-workflow-and-versioning（禁 git 写，diff 包+只读命令
> 即足）；**不用** subagent-driven-development（门二为被派发终端屋，无再派发权限）。
> 只读纪律遵守：全程零写（唯一例外=本报告）；零 npm test/verify；零 git 写。
> 全部核验命令=只读（grep/wc/sed/ls/tr+sha256sum）。

## ① 处置核对（门一全 findings + 主控裁决 vs 终态实物——防「说了没改」）

### W-G1 / W-G3 主控直改值——直读现值核实，全部到位

| 项 | 主控处置声明 | 门二直读现值 | 判定 |
| --- | --- | --- | --- |
| W-G1a | electron-builder.yml:37 productName→Synapse | `:37 productName: Synapse` | ✓ |
| W-G1b | electron-builder.yml:68 artifactName→Synapse- | `:68 artifactName: Synapse-${version}-setup.${ext}` | ✓ |
| 不受锁核实 | builder.yml 不在 locks manifest | manifest 全文 grep 无该路径（166 条目里无） | ✓ 免 unlock 舞步成立 |
| W-G3 | package-lock.json :2/:8 name→synapse | `:2 "name": "synapse"`、`:8 "name": "synapse"` 双处 | ✓ root name×2 同步 |

W-G1 落地后附带收敛：builder productName=Synapse → 打包形态 app.name 派生 userData
=appData/Synapse，与迁移目标 NEW_DIR_NAME 同向——门一 N6 假设（「默认 userData=
新名」依赖）在 dev 与打包双形态下均成立，残余敞口仅剩「未来任何第三方打包形态」，
门一建议的「下次打包实测」仍值得做但已非关键路径。

### 其余承诺项——在案登记（收口段兑现，本审记录监督面）

- W1 接受（grep 口径修正为消费/注释面清零+迁移功能面契约钉死豁免）：②节实测复核吻合。
- W2/W3 接受：index.html:8 / constants.ts:26 改动在 diff 包在场（门一 D 表已核）。
- W4：**local-state.mjs 与 installer-smoke.mjs 经 manifest 直读确认均在锁内**（manifest
  :73/:69 条目在场）→ 主控收口改 local-state.mjs 必须走 unlock→改→apply + [locked-change]，
  承诺在案；installer-smoke.mjs 归遗留池在案。
- W-G2（收口提交双尾注）：ci.yml 直读核实（④节）。
- 门一诚实性扣点处置：主控收口段跑**全量 e2e 26 落盘补证**——承诺在案，本报告登记为
  **收口前置必须兑现项**（实现者仅 smoke 4 passed 无落盘，门一 N3）。
- 真机迁移验证（备份-换装舞步，门一 E4 方案+四项注意）：归主控收口段，承诺在案。

### N 抽样对实物（抽 4，全中）

| 抽样 | 门一主张 | 门二亲测 | 判定 |
| --- | --- | --- | --- |
| N1 行数 | 实测 229/82（vs 实现者自报 224/95） | wc -l 亲测：bootstrap=229、migrate=82、test=160 | ✓ 门一值正确，实现者申报失准坐实 |
| N6 skip 零 setPath | ②分支断言 setPathCalls.length===0 依赖默认值假设 | 测试 :98 断言在场（现文直读） | ✓ 描述准确 |
| N9 check-tickets 盲区 | R2 系正则盲区致 open 0 | check-tickets.mjs:22 objRe=`SR2?-[A-Z]+-\d+`、:72 ticketRefRe 同前缀——`R2-SH1` 无 S 前缀，解析/引用检查**全套不可见** | ✓ 机制实锤（registry.ts:228 status:'open' 而 verify.log:24 报 open 0） |
| N10 getByText 唯一 | 'Synapse' 精确文本唯一源=App.tsx:143 | grep 全 tests：精确 getByText('Synapse') 仅 smoke.spec:22 一处；app-shell.test:128 为 toContain（非 strict 面）；index.html `<title>` 在 head 非 body 文本 | ✓ |

**①结论：PASS**——主控三处直改全部实物到位；全部收口承诺在案可追溯；无「说了没改」。

## ② 母本符合度（票面 §1.1/§1.2 vs 实现+超票面终审+grep 修正口径全仓核）

### §1.1 重命名（handoff-v3 §4 站1 既定）

diff 复核：package.json name/productName（:56-59）、main-window.ts:108 title、
App.tsx:143 品牌行+:136 注释、受锁 smoke.spec:22、受锁 app-shell.test.tsx :123-129
（it 名+断言+头注）——**全改 ✓**。超票面 W2（index.html:8）在场 ✓。零结构改动
（侧栏结构原样，「在侧栏内」语义保持——R2-SH2 前置无冲突）✓。

### §1.2 userData 迁移（核心 landmine）

门一 A1 已逐格核对分支矩阵 5/5（diff 复核一致：skip→:36-39 / rename+setPath→:41-45 /
皆无→:40 / 回落→:46-52）；触发条件（override else 支）、派生源（getPath('appData')
不硬编码）、判定以存在性为准、调用点在 ensureWorkspaceLayout 之前——全对齐 ✓。
bootstrap 现文直读（:49 import、:67-76 调用点）与 diff 一致，无收口期漂移。

### 「显式 setPath」超票面决定——门二终审：**保留正确**

- 申报义务：实现报告 §1 第 2 条明文申报+理由，履行 ✓（门一 A1 已核，门二确认）。
- 行为面独立评估：①成功支 setPath(new)——Electron 启动期 userData 派生值若已缓存，
  rename 后旧目录消失、不 setPath=指向不存在路径；在 productName 已改的新构建上
  幂等加固，在任何「运行时 app.name 与 NEW_DIR_NAME 派生不一致」形态下保命。
  ②回落支 setPath(legacy)——默认值=new（不存在），不回落=空库丢数据观感，**必要**
  而非可选。两者均有动作级断言+变异红证（mutation-1 删 rename 后④的红点即依赖
  回落 setPath 语义）锁住。裁定：合规超票面，且是本单数据安全红线的组成部分。
- W-G1 落地后（builder productName 同步为 Synapse）该设计的双形态自洽性进一步提升。

### grep 修正口径全仓核（消费/注释面清零+迁移功能面契约钉死豁免）——亲测

`grep -rn "Synapse Remake\|synapse-remake" src/ tests/ package.json` 实测命中**恰 6 处**：

| 命中 | 分类 |
| --- | --- |
| src/main/migrate-user-data.ts:54 `LEGACY_DIR_NAME = 'Synapse Remake'` | 迁移功能面常量（票面 §1.2 明文旧路径=精确名——模糊匹配用户目录更危险） |
| tests/unit/main/migrate-user-data.test.ts:60/:86/:108/:116/:142 | 契约钉死（防常量被改后迁移静默失效——测试头注明文此意图） |

与实现者 W1 申报、主控修正口径豁免面**精确吻合**；消费/注释/品牌/标题/断言面**零残留** ✓。
票外遗留簇（builder.yml/lock root name）已由主控 W-G1/G3 直改清偿；README/docs/
tools/registry 历史自述归遗留池无害（门一 E3 在案）。

**②结论：PASS**。

## ③ 宪法红线终审

1. **受锁批次**：manifest 条目亲数=**166** ✓；三受锁 hash 更新（constants.ts:125 条目/
   smoke.spec:209/app-shell.test:361）+新测试条目（:321）在册 ✓；**独立复算**
   tests/unit/main/migrate-user-data.test.ts sha256（LF 归一）=
   `9999655a…4df4` 与 manifest 期望值**逐位命中** ✓（check-locks 为 raw-bytes 口径，
   命中同时证实行尾纪律未破——.gitattributes LF 生效）。unlock→改→generate→apply
   流程证据（impl §4/manifest generatedAt 更新）在案。
2. **分层**：migrate-user-data.ts 现文 import 面直读=仅 `node:fs`（:38）+`node:path`
   （:39）；文件内 3 处 "electron" 字样（:16/:22/:24）**全在头注释**且均为「为何不
   import electron」的说明——零 electron 运行时/类型依赖 ✓。main 根装配方（bootstrap
   直接 import），非 services 层，分层单向未破坏；renderer 零感知 ✓。
3. **行数**：bootstrap=229、migrate=82、测试=160（亲测）——全部远低于 500 限 ✓。
4. **UTF-8/乱码**：verify quality 关通过（verify.log:15「无占位标记/无乱码/无跨域
   引用」）；本审所读全部中文注释/断言消息可读 ✓。
5. **TDD 四档**：首红（firstraw.log：模块缺失加载级红，exit=1——最弱形态，门一 N2
   已扣点；断言级开火由变异补足）→ mutation-1（删 rename：①④⑤=3 红，逐条与语义
   强关联）→ mutation-2（删回落 setPath+warn：④精准 1 红）→ verify 888 全绿 exit=0。
   四档齐备 ✓。变异还原安全（cp 备份法+diff 确认空，impl §5 自述）在案。
6. **安全禁令**：diff 面零触碰（无 SQL 拼接/renderer 越权/出网/eval/nodeIntegration）✓。

**③结论：PASS**。

## ④ 机器面核对

- **verify 数理一致**：verify.log:2631-2632 `Test Files 107 passed (107)` / `Tests 888
  passed (888)` =基线 883+新 5 **精确命中**；:2672 `verify-exit=0`（真退出码落盘）；
  :34 `locks 检查通过：166 个受锁文件与 manifest 一致`；build 三段绿（:2645-2671，
  与独立 build.log 一致）；quality/tickets/lint/typecheck 各关通过语在档 ✓。
- **翻 done 推演（check-tickets.mjs 逐规则）**：R2-SH1 翻 done 后——规则1 文件
  src/main/bootstrap.ts 存在 ✓；规则2 ticketRefRe（`SR2?` 前缀）不匹配 R2-SH1 →
  无引用检查面（bootstrap.ts 自身注释含 "R2-SH1" 亦不入检查；即便入，t.file===rel
  自引用豁免）；规则3/4b bootstrap.ts 无 NotImplementedError/unimplementedObject/
  data-ticket/工单号初值 STUB ✓；规则4 不适用（翻后 done）；规则5 测试无
  guardedDescribe('R2-SH1')（always-active 设计）✓；规则6 仅 SR2-* 前缀 → 跳过 ✓。
  **结论：翻 done 零红**（现 open 状态下 tickets:check 已绿——R2 系盲区 N9 两向皆
  不红，翻状态是纯账面动作，机器面无阻碍）。
- **e2e 面申明（档记录）**：实现者仅 e2e smoke 4 passed 无落盘凭据（门一 N3）；
  **主控承诺收口段跑全量 e2e 26 并落盘补证——本报告正式登记为收口前置必须兑现项**，
  未兑现不得视为完成定义闭合。
- **W-G2 双尾注规则 ci.yml 直读核实**：:44-48 机械强制——commit 范围内
  `git diff --name-only` 命中 `^(package(-lock)?\.json)$`（本收口提交改 package.json
  +package-lock.json，必触发）→ `git log` 无 `[dep-change]` 即 `::error::` exit 1。
  收口提交携带**[locked-change]（manifest+constants+smoke+app-shell 受锁面）+
  [dep-change]（package 双文件）双尾注**为 CI 硬性要求，主控处置正确 ✓。

**④结论：PASS**（附收口前置条件清单，见终评）。

## ⑤ 成本账本

| 屋 | token | 调用数 | 时长 | 口径 |
| --- | --- | --- | --- | --- |
| 实现者 | 2,998,309 | 71 | 14.3 分 | 主控派发回执汇出 |
| 门一 | 775,169 | 24 | 8.5 分 | 主控派发回执汇出 |
| 门二（本审） | ≈0.16M（自报估算；精确值以主控回执为准） | ≈16 | ≈20 分 | 自报 |

注：实现者自报「约 0.4M/约 25 分钟」与主控回执 3.0M/14.3 分数量级偏差——自报为
粗估非测量，与 N1 行数失准（224/95 vs 实测 229/82）同源（估算习惯），核心量化
主张（用例数/locks/退出码）无失准，不构成诚实性问题升级；账本以主控回执为准。

## 终评

**PASS——零回炉，可进主控收口**。三屋链路完整闭合：实现面分支矩阵逐格对齐票面、
「显式 setPath」超票面决定申报合规且经门二独立裁定为数据安全必要组成；门一 B0/W3/N10
的 3 项 W 全部由主控实物清偿（W-G1/G3 直改值直读核实到位）或妥善归位（W-G2 双尾注
规则+ci.yml 机械强制核实）；宪法红线五项（受锁 166 含独立 hash 复算/分层零 electron/
行数 229/82/UTF-8/TDD 四档）全绿；机器面 verify 888+exit=0+翻 done 推演零红。

**收口前置条件（按序，缺一不可）**：
1. 全量 e2e 26 跑通并落盘（补 N3 凭据缺口）；
2. 真机迁移验证：备份-换装舞步（门一 E4 四项注意——无存活实例/二启幂等必测/
   local-state.mjs 先修或手查/勿误认 com.synapse.app 历代遗物）；
3. local-state.mjs 旧路径引用改（unlock→改→apply，[locked-change] 批次）；
4. registry R2-SH1 翻 done 后**重跑 verify 全链**（methodology §4.4 顺序铁律——
   verify 永远是收口最后一个动作）；
5. 收口提交=**[locked-change]+[dep-change] 双尾注**（ci.yml:44-48 机械强制），
   显式列文件 staging（manifest/constants/smoke/app-shell/新测试两件/bootstrap/
   migrate-user-data/main-window/App/index.html/package.json/package-lock/
   builder.yml/registry+本三报告）。
