# F-EXPORT-01 门一对抗一审报告（ops-gate1-k2 归档——岗无写通道，主控逐字归档）

> 承载：ops-gate1-k2 绑定（kimi k3 $max，zipoo 源——用户指令 k1 封顶 k2 承载；
> b24/b25 auth 失败未再现=zipoo 5h 窗已重置实证）。审包五件全读，隔离纪律合规。
> FINDINGS: B=0 W=2 N=5 VERDICT=PASS

## 0. 计数独立复算

| 项 | 转述值 | 复算值 | 判定 |
| --- | --- | --- | --- |
| diff 文件数 | 9 | 9 | 符 |
| diff 行数 | 881 | 881 | 符 |
| 改动面增删 | +250/−252（净 −2） | 按hunk头算术净 +102（差恰 104=io 新件——stat 取自 git add -N 前口径，N1） | 不符（口径差） |
| 基线 Test Files/Tests | 170/1744 | 170/1744（baseline :3794-3795） | 符 |
| 指纹门 | 187·1789·5411·skip15 | 同（:27） | 符 |
| tickets open | 5 | 5（共 206，:38） | 符 |
| locks | 378 | 378（:48） | 符 |
| corpus.export 用例 | 14→16 | 16（baseline :96+M1 log「16 tests」机器双证） | 勘正成立 |
| 基线 main 产物 | 181.89 kB | 181.83 kB（:3812） | 转述失准（N2） |
| 基线 EXIT | 0 | BASELINE_EXIT=0（:3835） | 符 |

## 1. 逐 hunk 等价判定（25 hunk）

- relay.md（2 hunk）：主控板面非实现者产物。不适用。
- locks/manifest.json（3 hunk）：generatedAt 刷新+b26-claim.mjs 登记+ipc-deps sha 随动；
  无 export-session-state.ts 行变动=src/** 非受锁口径自洽（N4）。等价。
- bootstrap.ts（1 hunk 2 行）：:238/:241 迁键实参逐字未动。等价。
- ipc/export_.ts（2 hunk）：corpusItem(:86)/corpusSession(:95) 迁键，其余 6 handler 未动；
  CANCELLED 前置分支未动。等价。
- corpus.export.io.ts（新件 104）：cleanRebuild 六步序列逐句同序；六函数均原内联体
  纯函数化，无捕获态依赖；sha 口径逐字一致；MANIFEST_TMP 值不变；ManifestPaper
  字段集与 ENR-02 注释随迁。等价。
- corpus.export.service.ts（12 hunk）：H1 导入收敛+锚保留；H2 类型外提字段零改；
  advance 守卫同义；finalizing manifest 字面量键序/条件展开逐字保留+finalizeManifest
  组合体逐句等价+markTerminal 位序（resolve 前 await 后）与原一致；finishPaper sha
  段调用序不变；failSession 序逐帧一致（同步 markTerminal→await rm→reject，INV-65
  承重注释保留）；deferOutcomeFor 错误串逐字同+组合展开等价；exportCorpusSession
  BUSY 判定同义+check→begin 间无 await（单飞竞态面不变）；corpusItem 守卫未动+
  消毒留 service+返回模板串逐字同；abortActiveSession 同型。等价。
- export-session-state.ts（1 hunk）：四口闭包语义=原 let session 直读直写；
  markTerminal identity 复核在所有可达路径与无条件置空等价（两调用面均先过
  isActive 且其间无 await），不可达路径严格更安全；迁移表 12 行+跨格序列 8 行与原
  头注逐字比对一致。等价。
- services/index.ts（3 hunk）：createCorpusExportService 恰一处构造（局部量）；
  旧双 spread 段整体删除（双构造会撕裂单飞锁闭包=Blocker，实测无）；构造时点前移
  =工厂体无构造期副作用，时移行为惰性；`?? (() => undefined)` 原样。等价。
- tests/utils/ipc-deps.ts（1 hunk）：+1 默认键；`...over.services` 覆盖机制未动。等价。

**判定汇总：25/25 hunk 语义等价，0 不等价，0 不可证。**

## 2. 拷问点 K1~K8

- K1 成立：markTerminal identity 复核不弱化同步语义；abort-during-finalize 竞态
  两版行为逐帧相同；M1 红证物理证明守卫承重。
- K2 等价：消息串逐字/setImmediate 同相/catch 仍在延后 thunk 内/failSession 永不
  reject——无未处理拒绝差。
- K3 等价：tmp 名/stringify(,null,2)/rename 目标/键序/errors 条件展开逐字段同。
- K4 强旁证成立：M2 tsc 对旧键必红+绿跑覆盖 main 全域（同 tsconfig）；直接 grep
  证据在包外→并入 W2（主控收口已补：全仓 grep services.export_.{corpusItem,
  exportCorpusSession,abortActiveSession} 残留=0；renderer window.api.export_.
  corpusItem 三处=IPC 通道面非桶键面）。
- K5：承重锚全保留；实删=接口层三 bullet（与 JSDoc 重复）+文化层两 bullet+完成后
  bullet。非行为面（N3）。
- K6：12+8 行逐字随迁；「不对称合理」解释从句未整体保留（N3 并记）。
- K7：纯类型面无运行时消费；interrupted 不入联合与「非驻留态」口径一致。成立。
- K8：+1 默认键覆盖展开机制未动。成立。

## 3. 自裁 9 条裁决

1 准 / 2 准（依赖向 state→io→interface-template 无环）/ 3 准 / 4 准 / 5 准 /
6 基本准（承重锚保留属实；「内容零删」失准=N3）/ 7 准（16 机器双证）/
8 准（包内可核部分一致；压缩后复验证据在包外并入 W1 销项）/ 9 准。

## 4. 红线锚定复核

- INV-17：assemble 零触碰；sha 两口径逐字随迁。不破。
- INV-18：tmp+rename/清空重建/EXPORT_BUSY 前置判定/deferOutcome setImmediate 补条
  在档。不破。
- INV-65：abort→failSession 同型；同步释放（守卫与 markTerminal 间无 await）；
  advance 身份守卫；M1 断言级红证命中预判用例。不破。

## 5. 变异红证有效性

M1 有效（红 EXIT=1 恰 1 用例 test:389 manifest 存在性断言→还原 diff 空→复绿 16/16）。
M2 有效（红 EXIT=2 TS2339 :86,48 对位→还原 identical→绿——类型层变异适配桶键
迁移主张）。

## 6. 发现清单

**B：0 条。**

**W：2 条（条件放行，主控机检销项）**
- W1：终态 verify EXIT=0/定向 20/20/构建产物 182.85 kB 均实现者转述（b26-impl-
  verify.log 未入审包）；「e2e corpus-export 全链不破」无包内证据（分工=主控收口
  跑）。销项=主控收口亲验 verify 真退出码+e2e corpus-export 全绿。
- W2：ipc/export_.test.ts（受锁 4 例）桶键兼容性包内不可直证；K4 直接 grep 证据
  在包外。销项=同 W1 verify 亲验（含 typecheck 双 tsconfig）+主控 grep。

**N：5 条**
- N1：简报 stat「+250/−252」与 patch 算术净 +102 不符（差恰 104=io 新件；stat 系
  add -N 前口径）——归档时更正（真实=9 文件 +354/−252 净 +102）。
- N2：实现者报告基线 main 产物 181.89→实测 181.83 kB。
- N3：自裁 6「内容零删」过强——实删文化层两 bullet+完成后 bullet；承重锚全保留。
- N4：简报「state 骨架 sha——骨架行已有」措辞欠准（manifest 无 state 行变动与
  src/** 非受锁自洽）。
- N5：ExportSessionPhase 值层无消费（类型面交付物属预期）——登记防死代码面。

## 7. 总判

**PASS（条件放行——PASS_WITH_WARNINGS 语义）**：25/25 hunk 语义等价，三红线
不破，K1~K8 落地，自裁 8 准 1 基本准，变异双证有效。W 两项属包内不可证伪类
（收口机检即销），N 五项登记不阻收口。
