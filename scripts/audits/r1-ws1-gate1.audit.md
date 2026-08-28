# R1-WS1 门一对抗深审档（gate1）

> 审计对象：课题域主进程——装配容器化+workspaces IPC 域+遗留迁移。
> 输入：r1-ws1-gate1.diff（1255 行）/ 票面 r1-ws1-brief.md / ADR-0018 /
> impl.report / 三日志 / 终态源码。铁律遵守：只读仓库，唯一写=本档。
>
> **开工记录（宪法·技能清点）**：code-review-excellence=用（门一核心）；
> systematic-debugging=不用（禁跑测试，缺陷定位靠日志+静态推演）；
> test-driven-development=不用（只裁实现者 TDD 证据，不写实现）；
> verification-before-completion=用（收尾核对统计行与档完整性）；其余
> （浏览器/部署/文档生成类）=不用（与只读审计无涉）。

## 统计行

```
检查面：A 状态机 8 路径推演 + B 票面 P1-P5 逐节+六自裁 + C 红线 6 面 + D 测试质量 + E 接缝
发现：Blocker 0 | Warning 3 | Note 4
证据：verify VERIFY_EXIT=0（97 文件 758 用例+locks 146）/ e2e 24 passed 0 skip E2E_EXIT=0 /
      首红（workspace.fs 加载失败 1 failed|96 passed）/ 变异 A=1 failed 恰中 busy it、
      B=3 failed（同因果链）均 MUTA_EXIT=1、还原 diff 空标注齐
裁决：放行门二（W1-W3 为测试/防线补强项，非正确性缺陷）
L0 态：非设计缺陷——受锁 e2e 种子配方兼容的必然解，同意自裁（详见 A-2）
```

---

## A. 状态机与迁移语义终审（最高优先）

### A-1 布局状态空间穷举与逐路径推演

态空间定义（fs 事实五元组）：R=workspaces/ 是否在；L=userData/synapse.db
是否在；D=workspaces/default/synapse.db 是否在；W=有效课题目录集（持
meta.json 的合法 id 目录）；P=指针状态（有效/缺省/损坏/失指）。

| # | 路径 | 推演结论 | 锚定证据 |
| --- | --- | --- | --- |
| 1 | 全新首启 → L0 | needsLegacyMigration=F（L 无）→ existsSync(R)=F → dataDir=userData，库建根，**不建 workspaces/** | workspace.test「全新首启=legacy-fresh」+ e2e 24 全过（首跳即此态） |
| 2 | L0 → 二次启动 | L 在 && D 无 → M 迁移（files→wal→shm→db 提交点→meta→指针）→ W-pvalid(default)；rename 同卷原子，根库移走**无两库并存** | workspace.test「遗留布局整体迁入 default」+「迁移幂等」 |
| 3 | L0 会话内 create(new) | 物化：closeCurrent（先关句柄——Win rename 前提）→ 迁移（会话数据随迁）→ 重建 default 容器 → 建新课题空库；指针不动仍=default → **旧数据完整入 default 且在用户视野**（容器正指 default） | workspace.test「L0 会话：create 物化遗留（旧数据入 default）」（p0 会话内行物化后可查） |
| 4 | L0 会话内 switch(B) | 物化 → materialized=true → B≠default 走 closeCurrent→指针 B→装配 B（关的是刚物化的 default——多一拍开关节拍，正确性无损）；switch(default) 提前返回（物化已完成指针+装配，免多余关库）✓ | **无直接测试**（W1）；物化链/切换链各自有测 |
| 5 | 旧版升级（根库在+无 workspaces/） | ≡路径 2；ADR「既有用户数据零丢失」兑现（rename 原子搬移非复制） | 同路径 2 |
| 6 | 指针缺省/损坏/失指 | readPointerId→null → 降级 ids[0]（'default'<'ws-*' 字典序恒先）不崩；读侧零副作用，下次写指针自愈 | workspace.test「指针缺省/损坏=降级目录序第一」 |
| 7 | workspace.json 残留但目录删 | 全删=W-empty → 建 default 空课题（mkdir 幂等+initWorkspaceDb 对已存在库 migrate 幂等）+指针；部分删=失指降级同路径 6 | workspace.test「workspaces/ 在但零有效目录」 |
| 8 | M 迁移中途崩溃 | 判定条件只看库文件（「L 在 && D 不在」），default 目录已建不干扰 → 续迁，无孤儿库；「db 已移 meta 未写」崩溃：D 在→不迁，R 在→ids=[]（default 无 meta）→W-empty 兜底重建 meta+开库幂等，**数据完好**（此崩溃点用户尚无其他课题，ids 空集成立） | workspace.test「崩溃断点续迁」 |

「两库并存各持一半数据」专项攻击：全部 8 路径推演无此态——迁移是整体
rename 序（源移走才建新面），L0 会话库=唯一库（根），物化后=唯一库
（default）。**结论：不存在数据分裂路径。**

「switch 后库不见」专项攻击：正常 switch（assemble 成功）容器指新库 ✓；
失败 switch（assemble 抛错，如目标库损坏）：容器空+指针已切+busy 已释 →
后续 IPC 经 facade 见中文「课题数据层未装配」→ register 折叠 Result
不崩进程；**重试 switch 幂等可恢复**（closeCurrent 对 null 可选链安全）；
重启按指针装配。唯一不可恢复场景=课题库文件损坏且损坏到 openDatabase
即抛 → 启动期 bootstrap reject——与旧版单库损坏同类别（**非本单新增缺陷
类别**）。残留态恢复性无测试（W2）。

busy 守卫时序 vs 头注表逐格核对：create/rename/switch 三方法均为
`if(busy) throw wsBusy(); busy=true; try{...} finally{busy=false}`——与头注
及 §6-3 自裁一致 ✓；list/currentName 读侧无守卫——物化中并发 list 走 W 分支
可能见 items 空瞬态（N2，读侧 eventual consistency，非数据损坏，头注未列
此格）。

### A-2 L0 态一致性攻击（主控点名项）——裁决：非设计缺陷

L0 下 create(new)：**根库整体迁入 default，非滞留**（materializeLegacy 序：
关句柄→migrateLegacyIntoDefault 整体搬移→重建 default 容器）——数据零分裂，
测试以会话内行 p0 锚定。L0 下建课题 B 并 switch：旧数据在 default（list 可
见、可切回），用户落 B 空库——视野语义正确。

L0 偏离的必要性证据链（本审计独立取证，非采信自报）：
- `tests/e2e/seed-paper.mjs:12-25`：`new Database(SEED_DB)` 后**直接 INSERT
  INTO papers，不建表**——SEED_DB 必须已持 schema；
- `tests/e2e/e2e-env.ts:62`：`SEED_DB: join(userData, 'synapse.db')` **写死
  根路径**（受锁 e2e helper）；
- 种子配方（reader-text.spec:102-118 首跳 launch 建库→close→种子 INSERT
  根库+PDF 落 files/→二跳断言）下，若首启按票面 P2「无目录=建 default」把
  库建在 workspaces/default → 根 synapse.db 不存在 → better-sqlite3 新建
  空库 → INSERT 无表必崩 → 8 spec 24 测大面积红。
- **票面 P2+P3 字面组合自身矛盾**（首启时 P3 迁移条件天然假、P2 命令建
  default），L0 是消解该矛盾且受锁 e2e 零改动的最小解；「既有用户数据零
  丢失」承诺经路径 2/3/4 推演+测试锚定全部成立。

结论：L0 同意自裁，不判设计缺陷，无需修正案。附带确认：迁移条件强化为
「遗留 db 在 && default 库不在」（较票面字面更强）是断点续迁的必要条件，
正确。

---

## B. 母本符合度

票面逐节：P1 容器化 ✓（assemble 闭包外参与库无关项全数保持：广播/
contactEmail/zcodeBaseDir/templateDir/http/aiSensorRootDir；facade 形态自裁
票面授权）；P2 目录约定 ✓（id=ws-+8hex 短随机、用户名不入路径、meta.json、
常量住本域文件未入 shared/constants——git status 实证 constants.ts 未动）；
P3 迁移 ✓（幂等+条件强化已裁）；P4 四通道 schema ✓（严格 schema+四通道
在表，contracts 新 it 锚定）；P5 不做面 ✓（无删除/跨课题检索/切换通知）。

六自裁逐条独立裁：
1. **L0**：同意（A-2 全证据链）。
2. **ApiHandlers.workspaces 可选**：有条件同意——类型代价真实（漏组合不再
   编译期拦），且补偿面有缺口（W3）：contracts 锚的是表与 schema，**不锚
   bootstrap 组合事实**；24 e2e 无 workspaces 通道调用，漏组合 defect 潜伏
   至 WS2 前不可见。要求 WS2 切换器 e2e 落地时自然补锁（或 WS1 微补丁，
   非阻断）。
3. **busy 覆盖三变更**：同意——L0 物化路径会关当前库，create/rename 与
   switch 交叉并发必须互斥，票面字面只写 switch 是票面疏漏，自裁补全是
   必要的；并发 switch 中文 CONFLICT 主面不变（测试锚定）。
4. **db 直连上提 main 根**：同意，且**非字面绕行**——eslint.config.js
   :154-168 分层线语义=「services 只能经 repos 访问数据库」（services/**
   禁 db/connection*|migrate*），main 根无 db 禁令且**原 bootstrap 本就
   直连 openDatabase/migrate（装配面先例）**；workspace-layout.ts/
   data-layer.container.ts 与 bootstrap 同权，services 层经 initWorkspaceDb
   依赖倒置注入——分层语义正确落位。
5. **「五方法」对账**：同意——preload/index.ts:12-22 表驱动遍历
   API_SURFACE、api/client.ts:29 `export const api = window.api`（PreloadApi
   派生）→ 四通道自动暴露零改动成立；「五」=P2 服务方法数（含无 IPC 通道
   的 currentName，票面 P2 明列故非擅自添加，测试消费防死代码）。
6. **rename Res=trueAck**：同意（deleteAnnotation 先例同构，契约扩展非放宽）。

未申报面扫描：git status 修改面 6 文件+新增 5 文件与 diff/报告清单完全
对应，无未申报改动；untracked 中 r2/r3 brief 等为主控其他票面文件，非本单
泄漏；check-quality「无跨域引用」绿=无未申报跨层。

## C. 宪法红线

- **分层**：上提裁决见 B-4（合规）。services/workspaces/* 只 import
  workspace.fs+shared ✓；ipc 域闭包经 `deps.services.<域>.<方法>` 每次调用
  惰性解引用（library.ts:24 实证形态）→ Proxy get 转发当前层 → **热换机制
  面成立**；域对象经 facade 返回后方法 this 落真实对象 ✓。
- **受锁**：manifest 146 条实证（node 读档核对），api-surface/schemas/
  contracts/workspace.test 四文件 sha256 与 diff 中值逐一一致=锁与工作区
  同步；时间序（unlock→改→generate→apply）报告 §7 申报+verify locks:check
  绿。preload/index.ts 与 docs/invariants.md 确不在锁内（manifest 核对）。
- **行数**：六个改动/新增文件 max=343（workspace.test.ts），全部 ≤500 ✓。
- **UTF-8/占位**：grep TODO|FIXME|placeholder 净（exit 1）；quality:check
  mojibake 关卡绿。
- **TDD 四档**：首红=测试先建跑红（suite 加载失败形——实现文件不存在时
  标准红形；断言级红由变异补强）；变异 A 恰中性佳（1 failed 精确命中 busy
  it）、变异 B 3 failed 均同因果链（busy it 的 setup 依赖迁移完成，连带
  合理）；cp 备份法还原+diff 空标注+复跑 11 passed ✓；且在 lint 重构后
  现态复证（申报诚实）。
- **方案切换=删旧**：旧装配段整体替换（bootstrap diff +112/-46），无双方案
  并存 ✓。

## D. 测试质量

覆盖 vs A 工单路径清单：路径 1/2/3/5/6/7/8 及 busy 并发、容器热换（真库
旧句柄失效断言）均有锚定。缺口：
- **W1**：路径 4（L0 会话内 switch 双段链）零覆盖——含
  workspace.service.ts switch 的 `materialized && req.id===DEFAULT_WS_ID`
  提前返回分支（:1241-1244）与双段切换分支，均无测试触达。
- **W2**：switch 装配失败残留态（容器空+指针已切）的**重试幂等恢复**无
  测试——竞窗本身已申报归 WS2 合理，但恢复性是纯主进程面，可单测（注入
  抛错的 assembleInto→断言容器中文错误→重试 switch 成功），不涉 renderer。

e2e 24=迁移兼容验收的证据强度：**强**——种子配方（首跳 L0→种子 INSERT
根库→二跳迁移→读种子）本身就是路径 1+2 的端到端全链实证，24/24 全过+
0 skip+E2E_EXIT=0 意味着迁移对全部既有 e2e 面零破坏；票面即以此验收。

## E. 接缝与后续

- preload/renderer：四通道经表驱动自动暴露（B-5），WS2 依赖面齐备
  （list/create/rename/switch 可调；currentName 无通道——WS2 需当前名时经
  list 比对或届时加通道，WS2 票面裁量）。
- **W3**（防线缺口，归 WS2）：ApiHandlers.workspaces 可选化后，
  「bootstrap 实际组合 workspaces 域」这一事实无任何回归锁——contracts
  测表不测组合，e2e 无 workspaces invoke；建议 WS2 切换器 e2e（必调
  list/switch）落地时自然闭锁。
- facade Proxy 类型安全缺口评估：`new Proxy({} as T)` 断言绕过=形状漂移
  运行时才炸（装配点类型检查兜底，实际风险低，已 §5 申报+单测锚）；
  N3：函数值每次 bind 新引用（方法引用恒不等）+无 set 陷阱（写入静默进
  空 target）——现 repo 无受影响消费模式，WS2 及后续禁缓存方法引用比较。

## Note 汇总

- N1 [B]：readMeta 降级 createdAt=''（目录 stat 失败竞窗）违反
  workspaceItemSchema min(1)——register 只校验 Req 不校验 Res，会静默透传；
  不崩溃、概率极低。建议 WS2 消费侧容错或 meta 读侧兜底非空。
- N2 [A]：物化中并发 list 可见 items 空瞬态（读侧 eventual consistency，
  非数据损坏）；头注状态机表未列此格，建议补一行。
- N3 [E]：liveProxy bind/set 语义注记（见 E）。
- N4 [C]：票面 §3 基线陈数（95/741 vs 实测 96/746）——实现者以首红实测
  为基并申报，非实现者责任；主控后续票面宜引实测基线。

## 总评与裁决

实现质量高：状态机前置完整（六态+五跨格序列头注）、迁移语义（提交点/
断点续迁/幂等）经 8 路径对抗推演全部成立、零改动声明（ipc/index+
register+preload+client+env.d.ts）git 实证、证据链五件（首红/变异×2/还原/
verify 真退出码/e2e 真退出码）齐全且申报诚实（含票面陈数纠偏、竞窗归口
声明）。无 Blocker；三条 W 均为测试/防线补强项而非正确性缺陷。

**放行门二：是。** W1/W2 归口二选一由主控裁：WS1 微补丁（+2~3 用例，
半小时级）或 WS2 前置补强；W3 归 WS2 切换器 e2e 自然闭锁。L0 态无需
修正案（A-2 裁决非设计缺陷）。
