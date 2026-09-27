# 治理与加固五票批——设计终裁定稿（2026-09-28）

> 三段链毕：Kimi 拟定首跳稿（仓外 gov-batch-design/drafter-hop1.md，5312 out）→
> deepseek 对抗审（auditor-r1.md，B2/W10/N3 返工）→ **本档=主控终裁定稿**
> （返工按 P7 先例由主控吸收；六条草案假设全部由仓库事实闭合——见 D-19）。
> 立案真相源=本档；实现票以本档 §1-§5 为准。

## §0 终裁决定表（D-GOV-1..20——闭合审单全 findings）

| # | 决定 | 闭合 |
|---|---|---|
| D-1 | **S-1 白名单回显终态**：字面集 `{'null'}`（file:// 页 CORS Origin 恒此值）+dev 域名集（**URL 解析取 hostname 精确等值** `localhost`｜`127.0.0.1`——禁子串/后缀匹配）；无 Origin 头（`headers.get('origin')===null`）=非 CORS 请求**不加头**（JS null 与字面 `'null'` 双分支显式区分）；未命中=不带 ACAO 静默（不 403） | 审 W5/W6 |
| D-2 | **S-1 取证步前置**：实现首步=真实 PDF 链路 dev+prod 双态打印实际 Origin 串；`'app-file://'` 自请求**默认剔除白名单**（存在性未证——取证反证则补） | 审 W2 |
| D-3 | **S-2 type-test 双证形态**：正向断言挂**推断字面类型**（禁显式 `ApiHandlers` 宽型标注——宽型下 `typeof` 恒为声明型=空转）；装配体无导出点则新增零运行时类型探针导出；负向 ts-expectError 证缺域对象赋 `Required<ApiHandlers>` 必编译失败 | 审 B3 |
| D-4 | **S-2 事件分档=通知/进度类**：windowState=标题栏按钮陈旧一拍自愈；import/export=进度条陈旧，done 帧属正常载荷不经丢弃路径；丢弃仅 safeParse 失败（畸形帧）触发=可信生产者下永不路径防御。preload 接收侧 safeParse+丢帧+warn 维持 | 审 W4 |
| D-5 | **S-3 四件全移出+F-TESTREF-W2.file 勘正**：该 done 票 file 原指 `tests/e2e/z-r2e-probe.spec.ts`（移出后 check-tickets 存在性必红）→改指 `playwright.config.ts`（同票实际主改面）+summary 尾追加单行勘正注记 | 审 W10 |
| D-6 | **S-3 config/scripts 零改**：playwright 两 project 中 probe project 移出后空集无害（Playwright 空 project 不报错）；`test:e2e:all` 语义=app 全量（探针门退役注记入票面）；testIgnore 模式保留 | 主控核 config L26-30+package.json L28-29 |
| D-7 | **S-4 指纹门入 CI fail-fast**：`node scripts/check-test-surface.mjs check` 插 test --coverage 后 build 前；**现状输出已含逐 case 差异**（MISSING_CASE/SKIP_ADDED 明细——实测先例 19 MISSING_CASE 清单）→零脚本改动零隐性扩面 | 审 W12 |
| D-8 | **S-4 DoD 勘正终态文**：「npm run verify 全绿（quality+tickets+locks+lint+typecheck+test+build——**verify⊇CI：另含指纹门**；model-names=收口手动关卡未串 verify/CI）」——model-names 不属 verify 亦不属 CI，超集表述须排除 | 审 N13 |
| D-9 | **S-4 model-names 不串 CI**：src 零代号=收口纪律多轮实证，CI 化边际值低；代号逃逸事故出现再入 | 终裁 |
| D-10 | **G-1 归档键=`tickets/archive/<id>.md` 平铺**（去年份层——registry 无日期字段可机取） | 审 W9 |
| D-11 | **G-1 archive 不入锁+README 索引件单件入锁**：manifest=活跃契约面清单；归档件完整性由 git 提交保证；全量入锁=manifest 260→340+ 膨胀+每批归档全量 unlock/apply 流转 | 审 W8 |
| D-12 | **G-1 check-tickets 输入侧三约束**：瘦身 summary 保持**单行+字段序不变+禁 `id: '` 字面量**（行级 objRe 解析前提——脚本头注明载；零改脚本） | 主控独立发现（草案盲点） |
| D-13 | **G-1 提交信息字符上限撤销不设立**：提交信息=门链复算输入的审计资产（对立事实条款适用于此面——本批收口 2000+ 字符提交信息正是裁决部四源复算的输入）；**减容域限定三面**=registry summary/INV 论证/交接书滚动段 | 审 B7 |
| D-14 | **G-1 先于 P8 维持**：B7 冲突主体（提交上限）已撤销；新宪法条款只约束「新增治理面」不约束 P8 实现面；G-1 产出（瘦身机制）对 P8 交接文书为净收益 | 审 W11 |
| D-15 | **G-1a/G-1b 不拆票**：同域同机制，单票两单元两提交（存量消化/机制落宪） | 终裁（草案风险 7 开放项） |
| D-16 | **G-1 撤关护栏**：防线登记表「拦截实绩」栏空≠撤除理由；撤/并一律主控裁决 | 草案文化层维持+加严 |
| D-17 | **S-1 referer 独立论证**：不叠加 referer——Origin=CORS 规范权威信号；referrer 受 referrer-policy 控制不可靠，非防御面（弃「G-1 减容精神」引据） | 审 N15 |
| D-18 | **S-2 受锁流程补齐**：events.schemas.ts 新件+type-test 新件+api-surface/bootstrap/preload 改动全走 unlock→改→apply+[locked-change] | 审 N14 |
| D-19 | **假设闭合记录**：①R1-WS1 拆出理由=装配容器化（ADR-0018 架构本体，INV-35/registry R1-WS1 行实证）**仍成立**→SR-IPC-10 走 type-test 不收回；②tsconfig.node.json include 含 `tests/**/*.ts`=type-test 覆盖实证（且 `*.type-test.ts` 不入 vitest include=只编译不执行）；③devServerUrl=electron-vite 默认 localhost；④单用户桌面应用无其他 null-origin 上下文；⑤仓外档案区单号子目录先例在册；⑥夜批/P8/T3-U1 定性已知 | 主控核实 |
| D-20 | **五票均双审**（各触受锁/CI/安全/src/shared——不适用 R5 小批减免）；执行序见 §6 | 烤验定档 |

## §1 SR-SEC-01 app-file:// ACAO 通配收束（file=src/main/protocol/app-file.protocol.ts）

- 行为层：D-1/D-2 全量（白名单回显/无头分支/取证步/静默不加头）；验证面=reader-text
  等既有 e2e 真实 PDF 链路回归+既有 spec 内追加「伪造 Origin 无 ACAO」断言（不新增文件）。
- 接口层：模块内私有 `resolveAcao(requestOrigin: string|null): string|undefined`+
  白名单常量顶部单源；零新文件零新依赖。
- 架构层：受锁面=[app-file.protocol.ts+对应测试件+INV-07 注记]——[locked-change]；
  INV-07 补「ACAO=回显白名单形态」行+renderer origin 形态变更须同步白名单耦合注记。
- 生命周期：TDD 先红（resolveAcao 五分支纯函数单测：命中/未命中/无头/字面 null/
  dev hostname+负例 localhost.evil.com）+变异红证（白名单摘除回 `*` 必红）。
- 文化层：残余暴露如实登记（`'null'` 回显对 null-origin 页≈`*` 等宽——renderer 无
  远端内容+CSP 封死=前提已断；真实收益=挡 dev 白名单外站点+显式枚举可审计）。

## §2 SR-IPC-10 契约缺口双修（file=src/shared/ipc/api-surface.ts）

- 行为层：type-test 双证（D-3）+三事件 preload 侧 safeParse 丢帧+warn（D-4 分档论证）。
- 接口层：新 `src/shared/ipc/events.schemas.ts`（schema 与 PreloadEvents 类型邻近防漂移）；
  type-test 落 `tests/types/api-assembly.type-test.ts`（D-19②覆盖实证）。
- 架构层：受锁面 D-18 全列；main 发送侧不重复校验（镜像入侧单向纪律）。
- 生命周期：TDD（type-test 以 ts-expectError 反向自证+schema 正反例）+变异红证
  （schema 摘除/preload 校验摘除）。
- 文化层：文档同步「zod=入侧单向+事件面 preload 侧兜底」（文档+实校验双落地，
  非仅澄清）。

## §3 F-CONSOL-03 探针+audits 残留清出（file=playwright.config.ts）

- 行为层：D-5/D-6（四件移仓外 probes/ 目录+F-TESTREF-W2.file 勘正+summary 单行
  勘正注记[守 D-12 三约束]+仓内 z-probes-ARCHIVED.md 指针+scripts/audits 六件同票）。
- 接口层：历史引用不回改（审计指针性质+取代制纪律）。
- 架构层：受锁面=[tests/e2e 四件删除+新指针件+registry 勘正行]——[locked-change]；
  指纹门零影响（app project testIgnore 排除不计数——裁决部闭账实证 51=55−4）。
- 生命周期：verify 全绿（**check-tickets 存在性恢复绿=验收锚**）+移出前后文件清单
  对照落仓外+git status 未跟踪面零。
- 文化层：audits 留档口径 v2 向 tests 域扩展+「探针资产诞生即标注临时性与归档去向」。

## §4 C-A4 CI 口径对齐（file=.github/workflows/ci.yml）

- 行为层：D-7/D-8/D-9（指纹门 fail-fast 增步+DoD 勘正+model-names 留手动）。
- 接口层：ci.yml 单步+AGENTS.md 单行；baseline 随仓提交零额外产物。
- 架构层：受锁面=[ci.yml+AGENTS.md]——[locked-change]；范围闸白名单含 workflows 自洽；
  本地绿 CI 红=行尾/路径环境差优先排查（排障注记）。
- 生命周期：首推实跑=验收（CI 增步真实执行）；DoD 行注明「verify/CI 关系变更须同票勘正」。
- 文化层：「措辞即契约」先例+model-names 取舍理由留档。

## §5 F-GOV-01 治理减容役（file=tickets/registry.ts）

- 行为层：D-10..D-16 全量——①registry done summary 存量瘦身为一行结论+→
  `tickets/archive/<id>.md` 指针（全量原文仓内归档+README 索引入锁）；②INV 瘦身
  最小三元组+论证迁 design 档或 invariants-archive+退役行移出主表；③防线生命周期
  登记表（含撤关护栏 D-16）；④AGENTS.md 治理面退出条件宪法条款；⑤提交上限撤销
  （D-13）；⑥增量日落=收口满 3 批后瘦身。
- 接口层：check-tickets/guard.ts/exemptions 零改（D-19 消费方 grep 实证唯一=
  check-tickets 行级解析）；指针格式一行相对路径。
- 架构层：受锁面=[registry/invariants/AGENTS.md/archive 目录+README]——[locked-change]。
- 生命周期：两单元两提交（D-15）；验证面=全门禁绿+**抽查 5 张已瘦身 done 票三段链
  人工核可达**（指针→archive 原文→git 提交）+瘦身前后 KB 对照落仓外。
- 文化层：对立事实条款贯穿（减容只动文书体积不动拦截面——本批 B-1 拦截实绩为证）；
  ORG-12/M5 自觉升级为机制。

## §6 批执行序+烤验定档

| 序 | 票 | 定档 | 备注 |
|---|---|---|---|
| 0 | 夜批暖场（F-CONSOL-02/S1 既有候选） | 小批 | 既定惯例 |
| 1 | F-CONSOL-03 | 双审 | 纯移出+勘正，最低风险开局 |
| 2 | C-A4 | 双审 | 先于 G-1（同触 AGENTS.md/CI，先小后大） |
| 3 | SR-SEC-01 | 双审 | 安全面独立 |
| 4 | SR-IPC-10 | 双审 | 触 src/shared |
| 5 | F-GOV-01 | 双审+抽查链亲验 | 重票；产出惠及 P8 交接文书 |
| 6 | P8 | 重票 | 既定收官（立案前核 design §2 检查面板定稿态） |
| 7 | T3-U1 | 挂账批 | 既定 |

## §7 风险与备案

- S-1 dev 回归（hostname 匹配错=dev PDF 全断）→e2e 锚强制覆盖+取证步前置。
- G-1 追溯链最坏情形=指针错/漏归档→抽查 5 票三段链拦截；间接引用残余→全门禁绿兜底。
- 撤关滥用→D-16 护栏（实绩空≠可撤+主控裁决）。
- C-A4 首推 CI 实跑=一次性验收窗口（fail-fast 若误伤=基线未提交场景，排障注记在票）。
- 备案：S-1 `app-file://` 自请求取证若反证存在→白名单补项同票处理。
