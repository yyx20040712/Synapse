# R2-SH1 门一对抗深审报告（三屋·门一屋）

> 审者自报：模型 = builtin:bigmodel-coding-plan/GLM-5.3，思考等级 = 高。
> 技能清点（AGENTS 开工纪律）：**用** code-review-excellence（对抗审查本体）、**用**
> systematic-debugging（启动时序逐帧推演）；**不用** test-driven-development（只读
> 审查无实现面）、**不用** verification-before-completion（铁律禁 npm verify——以
> 证据日志交叉核对代替）、**不用** subagent-driven-development（门一为被派发子代
> 理本体，无再派发权限）。
> 只读纪律遵守：全程零写操作（唯一例外=本报告文件）、零 npm test/verify、零 git
> 写。本机实证探针均为 `ls`/`grep`/`wc` 只读命令（含 AppData Roaming 目录视察）。

## 0. 统计总览

| 级别 | 数量 | 编号 |
| --- | --- | --- |
| B（回炉级） | **0** | — |
| W（主控裁决/动作项） | **3** | W-G1 / W-G2 / W-G3（均为门一新发现，非实现者 W1-W5 复述） |
| N（提示/备忘） | 10 | N1..N10 |

**总评：PASS——可进门二**。实现面在票面范围内干净、证据链核心主张全部核实为真；
3 项 W 均为收口段主控动作项（其中 1 项与 CI 机制冲突必须处置），无一要求实现回炉。

---

## A. 母本符合度（票面 §1.1/§1.2 vs 实现）

### A1. 迁移分支矩阵（票面 §1.2 四支+回落）——5/5 对齐

对照 `src/main/migrate-user-data.ts:34-56`（工作区现文）与票面逐格：

| 票面格 | 实现 | 核验 |
| --- | --- | --- |
| 新已存在（含首迁中断残留）→跳过 | `existsSync(newPath)` 先判→info 一行 return；零改动旧目录、零 setPath | ✓（:36-39） |
| 旧在新无→整体 rename | `renameSync(legacy,new)`+`setPath('userData',new)`+info | ✓（:41-45） |
| 皆无→全新安装零动作 | `!existsSync(legacy)` 静默 return | ✓（:40） |
| rename 失败→回落旧路径+warn | catch 内 `setPath(legacy)`+warn，不 fallback 复制、不动旧目录 | ✓（:46-52） |
| 幂等/备份/中断安全语义 | 旧位消失=备份反转；同卷原子无半迁移态 | ✓（票面 §1.2 备份段原样兑现） |

**「显式 setPath(new)」超票面申报核查**：票面 §1.2 成功分支只写了 rename，未写
setPath；实现者在报告 §1 第 2 条**明文申报**了该超票面决定及理由（Electron 启动期
已缓存派生值）——申报义务履行 ✓。行为面评估：对新构建（productName 已改）默认
getPath 本就返回新路径，setPath(new) 语义上是幂等加固而非必要条件；但见 N6——
它在「运行时 app.name 与 NEW_DIR_NAME 派生不一致」的任何形态下都是保命的，保留
正确。

**触发条件与派生源**：调用点在 `SYNAPSE_USER_DATA` override 的 else 支
（bootstrap.ts:68-72），路径自 `app.getPath('appData')` 派生不硬编码 %APPDATA%
（migrate-user-data.ts:35），判定以存在性为准不比对内容（预裁②）——三项全对齐。

### A2. 重命名 4 消费位+grep 口径（按预裁 1 修正后）

- 4 消费位逐一核对 diff：main-window.ts:108 title、App.tsx:143 品牌行（:136 注释
  同步）、受锁 smoke.spec:22、受锁 app-shell.test.tsx it 名+断言+头注——全改 ✓。
- 超票面 W2（index.html:8 title）在 diff 在场 ✓。
- 修正口径 grep（`src/ tests/ package.json`）实测命中恰 6 处：
  migrate-user-data.ts:54 常量 1 + migrate-user-data.test.ts 5 处（:60/:86/:108/:116/:142）
  ——与 W1 申报和预裁 1「迁移常量 1+测试契约钉死 5」**精确吻合**，注释/品牌/标题
  消费面清零 ✓。
- **门一补充（超出预裁口径的功能面残留，非违反预裁——口径本身只查 src/tests/
  package.json）**：repo 级 grep 另见 `electron-builder.yml`、`package-lock.json`
  （root name×2）、`README.md`、docs×9、tools/ai-sensor×2、registry.ts（票面自述
  历史记录，合法）。其中 **electron-builder.yml 是功能面**（见 W-G1）、lock root
  name 是元数据陈旧（见 W-G3），其余为文档/工具/票面自述，归遗留池无害。

**A 结论：PASS**。

---

## B. 宪法红线

1. **分层**：migrate-user-data.ts import 面实测仅 `node:fs`（existsSync/renameSync）
   +`node:path`（join）——零 electron、零 db；与 workspace-layout.ts 同级同性质
   （main 根启动最早段纯 fs 件，先例成立）。renderer 零感知。ESLint 分层关卡在
   verify 内绿。✓
2. **受锁批次**：manifest diff = constants.ts/smoke.spec.ts/app-shell.test.tsx 三
   hash 更新 + 新增 `tests/unit/main/migrate-user-data.test.ts` 条目（165→166）；
   verify.log:34 `locks 检查通过：166 个受锁文件与 manifest 一致` ✓；新测试已入锁 ✓。
3. **行数**：bootstrap.ts=229、migrate-user-data.ts=82、测试=160（wc -l 实测）——
   全部远低于 500 限。但见 N1（与实现者申报数字不符）。
4. **UTF-8/乱码**：verify quality 关「无占位标记/无乱码/无跨域引用」通过；本审
   所读全部中文注释可读。✓
5. **死代码**：新模块被 bootstrap.ts:49 import+消费、被新测试消费——非孤儿；
   diff 无未引用新文件。✓
6. **安全禁令**：零触碰（无 SQL/renderer 越权/出网/eval 面）。✓

**B 结论：PASS**（CI 尾注机制冲突归 W-G2，属收口动作项非实现违规）。

---

## C. 代码与测试质量（含票面指定攻击点逐项推演）

### C-启动时序【票面类型强制审项·最高危攻击点】

**逐帧推演**（index.ts + bootstrap.ts 现文）：

```
帧0  index.ts 模块顶：requestSingleInstanceLock → registerAppFileScheme（零磁盘）
帧1  app.whenReady() 排队
帧2  ready 触发 → bootstrap(app)：
帧3    override=process.env.SYNAPSE_USER_DATA
帧4    if(override) setPath('userData',override)   // e2e/取证支
       else migrateLegacyUserData(app)             // 迁移支（:72）
帧5    const userDataDir = app.getPath('userData') // :73 ★在迁移之后
帧6    ensureWorkspaceLayout(userDataDir)          // :76 消费
帧7    readContactEmail(userDataDir) / aiSensorRootDir=join(userDataDir,...) (:80/:107)
帧8    workspaceService{userDataDir} / loadBounds / saveBounds (:124/:162/:182)
帧9    applyCsp(session.defaultSession) → createMainWindow（Chromium 磁盘写真正开始）
```

- **票面预告的「userDataDir 取值早于迁移」攻击点：不成立**。:73 在 :72 之后，
  且全 main 域 `getPath(` 消费面 grep 实测**唯一**（bootstrap.ts:73，迁移模块内部
  除外）——单一捕获点、捕获即终态，帧 6-8 全部消费迁移后值。aiSensorRootDir 的
  join 时序无恙。
- **门一延伸的更高危假说：「Chromium 在 ready 前预建新派生目录→existsSync(newPath)
  恒真→迁移分支永不触发」**。本机实证**反证**：Roaming 下**不存在** `Synapse/`
  目录，而 e2e smoke 已多次跑过改名后构建（每次 whenReady 后才 setPath tmp——若
  ready 前预建发生，必留 appData/Synapse 残渣；实际为零）。结论：本机/本 Electron 42
  配置下迁移放置在 whenReady 内不被预建毒化。残余不确定性（他机配置）由主控真机
  迁移验证兜底（见 E④）。
- **迁移耗时**：单次 `renameSync` 目录表项操作（同卷、不复制内容）——大库与空库
  同阶（毫秒级），启动延迟论证成立，无需异步化。

### C-迁移边界推演（票面指定攻击③）

- **三平台形态**：appData=Win `%APPDATA%` / mac `~/Library/Application Support` /
  linux `$XDG_CONFIG_HOME`——实现不硬编码 ✓（跨形态安全）。
- **大小写敏感性**：Win/mac FS 大小写不敏感——`appData/synapse`（异物小写）会被
  existsSync(newPath) 命中并入 skip 分支；`Synapse Remake`（含空格长名）与新名无
  形态碰撞。风险并入下条占用场景统一处置。
- **「appData/Synapse 被他应用占用」**（票面点名推演）：后果链=skip 分支→默认
  userData 指向他人目录→本应用以**空库观感**运行（synapse.db 不在他人目录内）；
  用户数据仍完整保留在旧目录（零损毁，可人工处置）。危害定级=**观感级丢库+目录
  混居**（Chromium Local Storage/GPUCache 与他应用同目录争用），非数据灭失。
  是否防御：票面预裁②明文「判定以路径存在性为准（不比对内容）」——**该风险为
  票面已裁决接受项**，实现依裁决行事无缺陷。登记为 N4 备主控知悉（真机验证可选
  加一例异物目录场景）。
- **异常面各态**：EPERM/EBUSY（占用/权限/杀软扫描）→catch→回落旧路径，测试④+
  变异红证覆盖 ✓。ENOENT（legacy 在 existsSync 与 renameSync 间消失，TOCTOU 窗）→
  catch→setPath(legacy)（此刻已不存在）→应用/Chromium 按需重建空旧名目录=全新
  安装观感；下一启 newPath 无+legacy 有→迁移重试，自愈。数据无可失（先失于外因），
  归 N5 备案。EXDEV 不可能（两路径同 appData 父卷）。

### C-测试 5 it 假锁攻击

- fake app 的 `setPathCalls` 记录真锁成立：①断言 `some([n,v]=>n==='userData'&&v===next)`
  （非仅终态 getPath——锁「显式 setPath」动作本身）；④同法锁回落 setPath(legacy)。
  变异红证反向佐证：mutation-2 删 catch 体 setPath+warn 后④精准红（getPath 终值
  回到 new 默认值——若只断言终态且默认值恰同向则假锁，此处默认值=new 而断言期望
  legacy，红点真实）。
- ②假锁攻击：skip 分支断言 setPathCalls.length===0——依赖 fake 默认 userData=new
  （:37 模拟 productName 派生，与预裁①机制一致）。模型契约正确；其假设边界见 N6。
- ⑤集成锚消费面真实：真调 `ensureWorkspaceLayout`（真实现非 mock），语义对照
  workspace-layout.ts:59-77——db 在根→migrateLegacyIntoDefault→mode='workspace'、
  rootDir=next/workspaces、库落 default——断言三件全对齐；变异佐证：mutation-1 下
  收到 'legacy-fresh'（next 空→fresh 语义），红点方向与真实现语义一致。
- 测试环境真 tmp（mkdtemp）+真 rename+afterAll 清理；always-active（无
  guardedDescribe）✓（K3 三屋纪律）。
- N7（小）：skip 分支的 info 一行未断言（只断言了 warn=0）——trivial 缺口。

### C-变异红证复核（mutation-1/2）

- mutation-1（删 rename 调用）→**3 failed**：①（sentinel 未迁）、④（无异常→
  setPath(new) 生效→终值=new≠legacy）、⑤（next 空库→legacy-fresh≠workspace）
  ——三红全与「rename 是迁移语义核心」强关联，无假红。与报告「①④⑤ 红（3）」吻合 ✓。
- mutation-2（删回落 setPath+warn、语法保持合法）→**1 failed（④）**：精准红 ✓。
  「首试整段删 catch=语法红→降级断言级重做」的披露诚实（AGENTS 变异红证=断言级
  口径，重做正确）。
- 首红形态（N2）：suite 加载失败（模块缺失，0 tests）——最弱形态首红（无断言
  曾开火）；但断言级开火证据由 mutation-1/2 补足，证据链整体成立。

### C-smoke getByText('Synapse') strict 唯一性

- DOM 内精确文本 'Synapse' 唯一源=App.tsx:143 span；全仓无其他
  `toContain('Synapse...')`/精确文本断言（grep 实测）；窗口 title 属性与
  document.title 均不入 getByText 文本节点。strict 安全 ✓（实现者 e2e smoke
  4 passed 自述+CI 将全量复跑）。

**C 结论：PASS**（N4-N7 备案）。

---

## D. 报告诚实性

| 自述主张 | 核验结果 |
| --- | --- |
| verify=107 文件 888 用例全绿 exit=0 | ✓ verify.log:2631-2634 + :2672 `verify-exit=0`；888=883+5 精确命中 |
| locks 165→166（+新测试；constants/smoke/app-shell 三 hash） | ✓ manifest diff+verify.log:34 |
| 变异红证 3 红/1 红 | ✓ 两 log 逐条复核（C 节） |
| W1 六处字面量（常量 1+测试 5） | ✓ grep 实测精确吻合 |
| W2/W3/W4 超票面与遗留申报 | ✓ 均在 diff/工作区在场可复现（constants.ts:26、index.html:8、installer-smoke.mjs:48-50、local-state.mjs:38） |
| diff 范围「9 文件+2 新」 | ✓ diff 包 12 文件=实现 11+registry（主控建单既有 M，实现者未触碰——registry R2-SH1 条目 status:'open' 未翻，符合禁令） |
| bootstrap 224 行/新模块 95 行 | ✗ **实测 229/82**（wc -l）——两数皆错但方向相反，≤500 限无违规；数字系估算非测量（N1 诚实性扣点） |
| W5「electron-builder 产物名将变 Synapse-0.1.0-setup.exe」 | ✗ **事实错误**：builder.yml:68 `artifactName: Synapse-Remake-${version}-setup.${ext}` 钉死旧名——产物名**不会**变（W-G1） |
| e2e smoke 4 passed | 无落盘 log（报告自述）；机制可信+CI 全量复跑兜底（N3） |
| 「裸 vitest 误用致 ABI 红 131 例即纠」 | 无独立落盘证据；机制与仓库 ABI 双态事实（scripts/sqlite-abi.mjs、AGENTS 环境节）自洽，可信但不可复核（N3） |
| check-tickets「open 0」而 registry R2-SH1 open | 已知 R2 系正则盲区（R2-LG12 W1 在案），非本单虚报（N9） |

**D 结论：PASS 带扣点**——核心量化主张全真；行数两处失准+W5 事实错误+两项无凭
自述，均为诚实性瑕疵非欺诈（申报义务本身履行良好）。

---

## E. 接缝

### E1. e2e 全量 override 面零影响——**穷举验证通过**

全部 9 spec 的 11 个 launch 点逐一核验：e2e-env.ts:16 `launch()` 强制
`SYNAPSE_USER_DATA: userData`（ai-notes-section/zcode-link/workspaces/lineage 四
spec 经此）+ smoke.spec 4 处内联（:18/:37/:50/:77）+ reader-text:50/
reader-scroll:72/corpus-export:33 内联。**零无 override 启动点**→e2e 永不走迁移
支→对真机 Roaming 零副作用（本机 Roaming 无 Synapse 残渣=旁证）。边界：
`SYNAPSE_USER_DATA=""`（空串 falsy→走迁移支）无任何 spec 构造此值——备案即可。

### E2. R2-SH2（顶栏票）前置

本单零结构改动兑现（App.tsx 仅文本+注释，侧栏结构原样）——品牌行迁顶栏+断言面
迁移全留给 SH2，无前置冲突；smoke getByText('Synapse') 面在 SH2 迁位后仍唯一。

### E3. 遗留池（移交主控，门一扩展为**命名簇**统一处置）

原池：installer-smoke.mjs:48-50（Reg 键/EXE 名旧引用）+ local-state.mjs:38
（硬编码旧目录——真机迁移后该取证器失效）+ dist/ 历史构建残留。
**门一新增入簇**：electron-builder.yml:37/:68（W-G1）+ package-lock.json root
name（W-G3）+ README.md。簇内一致性说明：installer-smoke 的旧名引用与
builder.yml 保持旧名**当前互相一致**——要么整簇同步改、要么整簇缓改，不可单改
一处（接缝归责：改 builder.yml 时必须同看 installer-smoke）。

### E4. 真机迁移验证缺口（归主控收口——方案可行性推演）

票面方案（旧目录造→首启→断言新位数据在+二启幂等）**可行，附四项注意**：
1. **本机现场**（只读视察）：Roaming 有真实 `Synapse Remake/`（活数据，今日
   13:03 仍在被写）+ 更早期遗物 `com.synapse.app/`（7 月真实 synapse.db+papers/
   ——先于本票的历代残留，与本单无关，验证时勿误认）；**无** `Synapse/`。
2. **沙箱不可用 env 法**：Chromium known-folder API 不认 APPDATA 环境变量覆盖
   （Win），SYNAPSE_USER_DATA 又会跳过迁移——**只能真目录备份-换装-验证-还原舞步**
   （真「Synapse Remake」快照移走→造副本→首启→断言→还原/或顺势接受真迁移）。
3. 验证前确认无存活实例（单实例锁）+ 迁移后二启幂等分支（skip+默认路径=new）
   必测——这正是 N6 假设的真机试金石。
4. local-state.mjs:38 先修（W4 已列）或临时手查，否则取证器查错路径。

---

## 门一新发现（W 级，主控裁决/动作项）

- **W-G1【打包面旧名残留+票面前提失实】** `electron-builder.yml:37
  productName: "Synapse Remake"`、`:68 artifactName: Synapse-Remake-*`——票面
  §1.3「无安装器面（installer-smoke.mjs 仅脚本）」前提**失实**（builder.yml 即
  安装器配置面）。后果：安装包名/快捷方式/安装目录/注册表仍「Synapse Remake」，
  与应用内「Synapse」割裂。**数据面无恙**（迁移目标名是模块常量硬编码，非运行时
  派生；且运行时 app.name 按标准 Electron 派生自 asar 内 package.json
  productName=新名——建议主控在下次打包实测确认此派生）。处置建议：并入 E3 命名
  簇，随 SH 系或独立微票同步（builder.yml 不在 locks manifest——grep 实测——可
  直接改，无需 unlock 舞步）。
- **W-G2【CI 尾注机制冲突——收口提交必带 [dep-change]】** ci.yml:44-48 对
  `package.json` 的 diff **机械强制** [dep-change] 尾注；票面 §1.1 预裁「非依赖
  变更——无 [dep-change]」与 CI 机制互斥。收口提交信息必须同时携带
  **[locked-change]（manifest+三受锁）与 [dep-change]（package.json 改名）**，
  否则 CI 红。归主控收口动作项，零代码改动。
- **W-G3【lockfile root name 陈旧】** package-lock.json root `"name":
  "synapse-remake"`×2 与 package.json 新名失同步。npm ci 风险低（root name 为
  元数据、依赖树未变），但下次 npm install 会churn lock。建议收口时顺手
  `npm install` 同步一次（同提交本就带 [dep-change]，无额外成本）。

## 备忘（N 级）

N1 行数申报失准（224/95 vs 实测 229/82）；N2 首红=加载级非断言级（变异补足）；
N3 e2e smoke 与 ABI-131 两项自述无落盘凭据；N4 异物占用=空库观感（预裁②已接受，
真机验证可选加例）；N5 ENOENT TOCTOU 自愈链；N6 skip 分支零 setPath 依赖「默认
userData=新名」假设——dev/标准打包成立；若未来任何打包形态改由 builder 元数据
派生 app.name 则二启空库，可选一行加固（skip 支亦 `setPath(newPath)`，幂等无害）；
N7 skip 分支 info 未断言；N8 真机验证本机现场与沙箱限制（E4）；N9 check-tickets
R2 系正则盲区（既有已知）；N10 getByText strict 已验证唯一。

## 预裁 5 项意见（主控预裁可攻击面）

1. **W1 验收口径修正——支持**。6 处命中实测精确吻合；「模糊匹配用户目录更危险」
   论证成立；契约钉死豁免是 grep 清零与 §1.2 迁移规约互斥的唯一结构性调和。
2. **W2（index.html title 超票面）——支持**。grep 验收必然覆盖；值与 main-window
   title 一致无副作用。
3. **W3（constants.ts 受锁改）——支持**。[locked-change] 批次在案（hash 更新+
   locks:check 166 绿）；消费面无精确值断言（verify 全绿佐证）。
4. **W4 两脚本移交——支持，但应扩簇**：+electron-builder.yml（W-G1）+
   package-lock root name（W-G3）+README；且 installer-smoke 与 builder.yml 的
   旧名当前互相一致，须整簇裁决不可单点改。
5. **W5（产物名波及）——部分驳回**：「产物名将变 Synapse-0.1.0-setup.exe」陈述
   **错误**（artifactName 被 builder.yml:68 钉死为 Synapse-Remake-*）；「dist/
   残留非源面不动」部分正确。W5 的提示价值由 W-G1 接管。

## 总评

**PASS（B0/W3/N10）——建议放行门二**。实现质量：分支矩阵全对齐、超票面申报诚实、
测试为真锁（动作断言+集成锚+变异红证三重）、启动时序结构干净（票面最高危攻击点
经逐帧+实证双重排除）。风险敞口全部票外/收口段：W-G1（打包命名簇）、W-G2（CI
尾注双标）、W-G3（lock 同步）+真机迁移验证四项注意（E4）。无一项构成实现回炉
依据。
