# F-EXPORT-01 门二实证终审报告（ops-adjudicator 归档——岗无写通道，主控逐字归档）

> 承载：ops-adjudicator 绑定（deepseek-flash $max）。只读工具面，审包六件全读+仓读权
> 覆盖。VERDICT=GO_WITH_CONDITIONS P0=0/P1=2/P2=3/N=3 回炉 0。
> 包不足以裁决项（先行声明）：①终态 verify 真退出码+零漂移（impl-verify.log 未入包）
> ②定向 20/20/main 产物 182.85 kB/渲染产物恒等/locks 终态一致=实现者转述
> ③ipc-deps 新 sha 对账 ④变异执行时序——四项全归收口主控亲验销项（P1-1/P1-2）。

## ① 逐条裁决表

| 项 | 原判断 | 终审裁决 | 独立依据 |
| --- | --- | --- | --- |
| A. hunk 面 | 门一 25/25 等价 | 等价成立，计数勘正 **26** | 实测 `^@@`=26；门一自身枚举 2+3+1+2+1+12+1+3+1=26 仅总数标签笔误；26/26 逐 hunk 对照现源码核毕 |
| B. state 闭包 | 门一 K1「严格等价」 | 成立；**门一理由不成立，独立论证**：门一「两调用面至 markTerminal 间无 await」为假——advance 终局 :84 守卫→:98 await finalizeManifest→:104 markTerminal 确有 await；该窗内 abort→failSession→新会话 begin，无条件置空会误清新会话单飞锁——identity 复核行为正确且该交错可达。同步释放语义由「调用点先过 isActive（同步）+markTerminal 同步置 null」保持，INV-65 不弱化 | state :100-120；service :84/:104/:162/:167/:184/:206/:250/:294 |
| C. failSession 同步序 | 逐帧一致 | 成立 | service :160-170：isActive→markTerminal 同步→await rm→reject 与拆前同帧 |
| D. finalizeManifest 原子性 | 逐字段等价 | 成立 | io :95-98 tmp+rename；service :92-97 manifest 字面量；stringify(,null,2) 逐字同 |
| E. 桶键四处+第5处 | 恰 4 处 | 成立（第 5 处=无） | 迁键恰 4：ipc :86/:95+bootstrap :238/:241；corpus_export 全仓 6=4 迁键+2 定义；renderer 三处+渲染测试 stub=window.api.export_ IPC 域面通道名未动（api-surface :67-68+契约锁 :22 断言八通道不变）；受锁 ipc 测试 4 用例实读均不经迁键 handler（:40/:56/:68/:90） |
| F. 单飞闭包恰一构 | 恰一处 | 成立；门一「双构造=Blocker」措辞对旧码不适用（spread 单次求值）——现态正确 | index :99-103 局部量唯一构造+:121-122 直传；旧双 spread 已删 |
| G. deferOutcome 时序 | 等价 | 成立 | state :128-132；service :174-180 catch 在延后 thunk 内；消息串两处逐字 |
| H. INV-17 | 不破 | 不破 | assemble 零触碰；sha 逐字（io :67-77）；幂等用例在册 :253 |
| I. INV-65 | 不破+M1 | 不破 | abort :292-298 单路；迟到回传 :251-259（用例 :395）；M1 命中 :389 |
| J. 计数 | 门一复算 | 核心全对；三处勘误（25→26/181.89→181.83/impl「8 处」→9 处） | 见 ② |

K1~K8 复核全数成立（K1 理由勘正见 B；K4 证据更强=直接 grep+读测试；K5「与 JSDoc
重复」过宽→N-3）。自裁 9 条：8 准 1 基本准（6=「内容零删」失准 N-3 扩容）。

## ② 独立复算记录

1. diff：881 行/9 文件/**26 hunk**/+354/−252 净 **+102**（三径一致：前缀行算术+hunk
   头逐 hunk Σ+文件尺寸账 relay+15/locks+4/io+104/service−142/state+118/services+2/
   ipc-deps+1=+102）；简报「+250/−252」=354−104 io 件口径差（门一 N1 确证）。
2. 基线锚位：:27/:38/:48/:3794-95/:3812（181.83 非 181.89）/:3835 全对账。
3. 用例：corpus.export.test=16 it（逐行号枚举）；ipc=4；定向 20=16+4 成立。
4. 现源码行数：service 300/state 132/io 104/index 154/ipc 141/ipc-deps 52 与 impl 一致。
5. impl 报告「ipc/export_.ts 8 处」实测 9 处代码（另注释 1；迁键前 11）——勘误 P2-2。
6. 无佐证断言点名（不采信归收口）：终态 verify/定向 20/20/main 182.85 kB/渲染产物
   恒等/locks 终态/变异时序/flake 首查留档（⑦并入 P1-2）。
7. 方法：7 件现源码全文读+受锁测试关键段实读+diff 全文对照+state. 引用 9 处全枚举
   （无残留 session 变量）+IO/path 全仓枚举（仅 io 件承载盘面）。

## ③ W1/W2 处置

- W1 分工成立（裁决岗只读无执行权；终态证据只能由收口产生）。销项条件=P1-1。
- W2 销项已由本终审直证闭合：受锁 ipc 测试 4 用例不经迁键 handler（无兼容面）+
  全仓零残留 + renderer=IPC 通道面 + ipc-deps :29 已随锁（manifest :1493）。

## ④ 红线终验（亲读现源码）

INV-17 不破（assemble 零触碰+sha 单源 io）；INV-18 不破（终局单写/清空重建六步同序/
BUSY 前置 check→begin 无 await/deferOutcome 时序）；INV-65 不破（abort 单路+同步释放+
身份守卫 M1 断言级）。登记指针 stale 见 N-1（不影响行为）。

## ⑤ 收口序预批（勘正件）

原序成立，三点勘正：①终跑 verify 须在翻票后（tickets:check 对 open 计数敏感：5→4；
registry 非受锁 flip 无需 locks:apply）；②e2e 须跑 corpus-export.spec 两用例（:31 全链
+:157 重载格）对照在册 flake 台账 :68-76（count=5/unpursued/60s 超时指纹）留档一行；
红则按立案线处置禁「已知 flake」静默销项；③staging 显式列件=9 diff 文件+未跟踪面
（io 新件+b26 证据件六类+b26-claim.mjs 已锁+relay.md 板回写）。**尾注预批：仅
[locked-change] 成立**（覆盖=ipc-deps+manifest+b26-claim.mjs）；**禁加 [test-refactor]**
（diff 含 src/** TR 范围闸白名单外必红；registry/relay 非受锁不需增注）。

## ⑥ 分级清单

**P0=0。**
**P1**：P1-1 终态验证亲验（fresh verify EXIT=0+翻票后 open 4+e2e 两用例全绿+
impl-verify.log 入 staged）；P1-2 flake 首查留档（e2e 结果对照台账一行记录；红则
立案线处置——台账明载「建议与 F-EXPORT-01 同场」，本票即该场）。
**P2**：P2-1 io 件无独立变异（承重面由 M1/M2+受锁用例覆盖；未来触碰时补
finalizeManifest/cleanRebuild 变异）；P2-2 计数勘误归档（25→26/ipc 8→9/「双构造=
Blocker」对旧码不成立）；P2-3 门一 K1 论证理由勘正（结论仍立）。
**N**：N-1 INV-18/65「声明处」指针 stale（状态机表/中止守卫落点迁 export-session-
state.ts）——归 F-DOCGOV-01 或下次受锁文档场次 sync，**不在本收口扩面**（避免过审后
引入未审计改动+二次锁链）；N-2 ExportSessionPhase/MANIFEST_TMP 导出零外部消费（类型/
边界交付物防死代码面登记）；N-3 文档净损失清单（接口层 IPC [受锁] bullet+文化层两
bullet+完成后 bullet+「不对称合理」从句；信息多在他处单源）。

**总判：GO_WITH_CONDITIONS**——等价性/红线/变异/计数（勘正后）全部成立，无回炉必要；
放行收口，条件=P1-1/P1-2 闭环后提交。
