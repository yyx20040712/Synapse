# R2-SH1 票面——应用重命名 Synapse Remake→Synapse+userData 数据迁移（U3a·独立成票）

> 工单：R2-SH1 / area: infra / owner: strong / 模式：三屋（ADR-0017）
> 裁决母本：handoff-v3 §4 站1 既定+§8「重命名迁移独立成票单独审计」。
> ⚠landmine：userData 目录名派生自 productName——重命名=**用户真实数据
> 目录搬迁**（数据迁移第二轮，复用 R1-WS1 幂等模式）。
> 主控：2026-08-29 LOOP 会话。

## 1. 行为层（验收面）

### 1.1 重命名（站1 既定）

- `package.json`：`name: "synapse-remake"`→`"synapse"`；`productName:
  "Synapse Remake"`→`"Synapse"`（非依赖变更——无 [dep-change]；package.json
  不在 locks manifest，确认零受锁）。
- 文本消费位 4 处同步：`main-window.ts:108` 标题、`App.tsx:143` 品牌位
  （注释 :136 同步）、受锁 `smoke.spec.ts:22`、受锁 `app-shell.test.tsx`
  :123-129（it 名+断言；「在侧栏内」语义本期保持——品牌行迁顶栏归
  R2-SH2，本单**零结构改动**）。
- 全仓 grep「Synapse Remake」「synapse-remake」清零（注释一并；locks
  manifest 历史条目除外——manifest 是 hash 账本非消费面）。

### 1.2 userData 迁移（核心 landmine——bootstrap 最早段）

- **触发条件**：`SYNAPSE_USER_DATA` 未覆盖（e2e/取证不受影响）且
  新 userData 路径（`%APPDATA%/Synapse`）**不存在**且旧路径
  （`%APPDATA%/Synapse Remake`）**存在**。
- **迁移动作**：旧目录整体 `rename` 入新路径（同卷原子；rename 失败
  （占用/权限）→ **不 fallback 复制**、不动旧目录、`app.quit()` 前
  console.error 中文+保留旧名继续运行？——**否决**：改名失败即以旧路径
  `app.setPath('userData', 旧路径)` 继续运行（数据零风险，仅目录名未变）
  +console.warn 留痕。**数据安全优先于重命名完成**。
- **幂等**：新路径已存在（含首次迁移中断残留）→跳过迁移直接用新路径
  （旧目录保留原位不动——不合并不覆盖，人工可处置）；两者皆无=全新
  安装语义（现行为）。
- **备份**：rename 本身不删数据（旧位消失=即备份语义反转——新位即数据、
  旧位不再存在）；**中断安全**：rename 原子性由 OS 保证（同卷），无
  半迁移态。
- **边界声明**：迁移仅 bootstrap 首启触发一次；`app.getPath('appData')`
  为源（不硬编码 %APPDATA%——跨用户目录形态）。

### 1.3 不做（票外）

- 顶栏/切换器迁位+侧栏品牌行删除（R2-SH2）；字体消费清零（R2-SH2）；
- 安装器/打包产物名变更（无安装器面——installer-smoke.mjs 仅脚本）；
- 旧目录「Synapse Remake.bak」式双保留（rename 语义下无意义——数据
  已在新位；跳过分支的旧目录保留=天然备份）。

## 2. 接口层

- 新导出：无（bootstrap 内联私有函数 `migrateLegacyUserData(app)`——
  独立可测函数形态，导出仅供单测或经注入测试——实现者定，申报）。
- 迁移日志：console.info 中文一行（`[bootstrap] 已迁移用户数据目录：
  <旧> → <新>`；跳过/继续旧路径各一条 warn/info）。

## 3. 架构层

- 分层：迁移逻辑驻 main/bootstrap.ts（最早段，ensureWorkspaceLayout
  **之前**——课题布局消费 userData 根）；禁 renderer 感知迁移。
- 零新依赖；bootstrap ≤500 行（现 ~200+，增量 ~40）。

## 4. 生命周期层

- 兼容：e2e 全套（SYNAPSE_USER_DATA override）零影响；真机首启迁移后
  二启=新路径直用（幂等分支）。
- 测试面（TDD）：
  - 新 `tests/unit/main/migrate-user-data.test.ts`（**纯函数态测试**——
    迁移判定函数注入 fake app 对象 {getPath/setPath/getName}+tmp 目录
    实建：①旧在新无→rename 迁移+setPath 新 ②新已存在→跳过 ③皆无→
    全新 ④rename 抛错→回落旧路径运行+warn ⑤迁移后 ensureWorkspaceLayout
    消费新路径（集成锚））；always-active。
  - 受锁 app-shell.test+smoke.spec 断言同步（'Synapse Remake'→'Synapse'）。
  - e2e：零新 spec（smoke 即验收）；**真机迁移验证归主控收口段**（真实
    库副本取证器模式——旧目录造→首启→断言新位数据在+二启幂等）。

## 5. 文化层

- 迁移失败不丢数据=红线（回落旧路径运行分支必须有测试）；TDD 首红落盘
  `r2-sh1-firstraw.log`；变异红证 ≥2（①rename 调用删除→迁移用例红
  ②回落分支删除→④用例红）；cp 备份法；verify 真退出码落盘。
- locks：unlock→改（smoke/app-shell 两受锁）→generate（收新测试）→
  apply；165→166 预测。用例数预测=883+新测试 5=888±2。
- 基线锚：HEAD=6d1077d；verify=106 文件 883 用例/locks 165；e2e 26。

## 6. 主控预裁

1. productName 改「Synapse」→app.name=Synapse→userData 默认=
   appData/Synapse（f1 取证器实证现路径=appData/Synapse Remake——
   productName 派生机制在案）。
2. 迁移判定以**路径存在性**为准（不比对内容）；跳过分支零 IO。
3. dev 模式（npm run dev）同触发（app.name 同源）——实现者本地验证用
   SYNAPSE_USER_DATA 指向副本（禁碰真实 %APPDATA%——真机验证归主控）。
4. 全仓 grep 清零的验收口径=`grep -r "Synapse Remake\|synapse-remake"
   src/ tests/ package.json` 零命中（scripts/audits 历史档除外——证据
   文件不可改写历史）。
5. 窗口标题/品牌位改「Synapse」后 getByText('Synapse') 注意 strict：
   全仓唯一性核对（App.tsx 品牌位+窗口 title 属性不同面——title 属性
   不入 getByText DOM 文本，无 strict 风险；实现者跑 e2e 验证）。
