# F-EXPORT-01 门一审包（batch 26）

岗位：门一 gate1-reviewer（对抗式隔离一审）。审包自包含；diff 全文=
scripts/audits/b26-gate1-diff.patch（881 行 9 文件——git add -N 后生成，含新件
corpus.export.io.ts 全文）。实现者报告=scripts/audits/b26-impl-report.md。
基线锚=scripts/audits/b26-verify-baseline.log（EXIT=0：170 文件/1744 用例/指纹门
187·1789·5411·skip15/open 5/locks 378）。

## 票面（registry:314）

corpus.export 拆件：导出会话状态机（六态 idle/preparing/streaming/finalizing/
done/failed——「五件套」指产物数非态数）外提本件独立+IO/事件协议分离；INV-17/18
（幂等 sha/单飞）语义不破+e2e corpus-export 全链不破；中票。用户裁决提前主动拆。

## 改动面（9 文件 +250/−252）

1. export-session-state.ts 14→132：六态类型+ActiveSession 外提+createExportSessionState
   （begin/current/isActive/markTerminal）+deferOutcome 时序+态空间迁移表头注随迁
2. corpus.export.io.ts 新件 104：盘面 IO 纯函数群（cleanRebuild/writeCorpusMd/
   writeFulltext/readCorpusSha/writeFigure/finalizeManifest/removeManifestTmp）
3. corpus.export.service.ts 442→300：瘦身编排件（工厂签名/CorpusExportDeps/
   CorpusExportService 公开面零改）
4. services/index.ts：export_ 交并拆 export_+corpus_export 两键平铺（b25 同型）
5. ipc/export_.ts：恰 2 handler 迁键（corpusItem/corpusSession）
6. bootstrap.ts：恰 2 处 abortActiveSession 迁键（:238/:241 原行号）
7. tests/utils/ipc-deps.ts：1 行拆 2 行（受锁 unlock→改→即时 apply）
8. locks/manifest.json：随动（ipc-deps sha+state 骨架 sha——骨架行已有）
9. relay.md：主控 claim 面（非实现者产物）

## 行为等价主张（供对抗）

- INV-17 幂等 sha：corpus md front-matter 无 exportedAt（assemble 不动）；sha=
  文件字节 sha256（io 件纯函数等价迁移）
- INV-18 会话协议：manifest 终局单写 tmp+rename（finalizeManifest）；清空重建
  （cleanRebuild）；EXPORT_BUSY 单飞（state.begin 前置判定）；**deferOutcome
  setImmediate 时序补条**（外提 state 件）
- INV-65 中止单源：abortActiveSession→failSession 同型；**同步**释放单飞锁
  （markTerminal 同步置 null）；advance 终局守卫（isActive 身份判定）
- 测试零触碰即绿=等价锁：tests/unit/services/corpus.export.test.ts 受锁 519 行
  零改，16/16 绿（定向）

## TDD 证据（供核）

- 变异 M1：isActive 永真→定向红 EXIT=1 恰 1 用例（F-SESS-01 advance 守卫）→
  cp 还原 diff 空→复绿（b26-mutation1.log）
- 变异 M2：ipc corpusItem 键回退→tsc EXIT=2 TS2339 :86,48→还原复绿
  （b26-mutation2.log）
- verify 终态 EXIT=0 零漂移（b26-impl-verify.log）

## 实现者自裁 9 条（b26-impl-report.md §④——逐条对抗核）

1. SessionError 迁 state 件并 export（reject 类型单源）
2. ManifestPaper/CorpusManifest 迁 io 件
3. deferOutcomeFor 薄适配器（failSession 折叠链留 service）
4. writeFigure 返回 manifest 相对路径
5. markTerminal=identity 复核后置空（与无条件置空等价）
6. service 压线 300 行=删真冗余+注释合并（锚点零删）
7. 简报「14 用例」勘正为实测 16（it 块机器计数）
8. 变异时序（M1/M2 后仅 service 注释变动，已复验）
9. ExportSessionPhase 落位说明（类型导出但值层无运行时消费——类型面用例锚定）

## 主控拷问点（重点对抗，勿轻信转述）

- K1：state 闭包语义——原 `let session` 单变量与 begin/current/isActive/markTerminal
  四方法组合是否严格等价（特别是 failSession 的「先同步置 null 后异步 rm」窗口与
  abort 竞态——INV-65 同步语义是否被 markTerminal 的 identity 复核弱化）
- K2：deferOutcome 外提后 failSession 折叠链（deferOutcomeFor 适配器）——错误消息
  串「提取回传落盘失败：」等是否逐字等价；原 deferOutcome 内联 s 参数闭包改显式传参
  有无时序面差异
- K3：io 件 finalizeManifest 与原 advance 内联 tmp+rename——原子性语义/manifest
  结构（schemaVersion/exportedAt/papers/errors 条件展开）是否逐字段等价
- K4：桶键拆分四处——有无第 5 处消费面遗漏（全仓 grep export_. 导出会话三方法）
- K5：service 300 行压线手法——「删真冗余+注释合并」是否删除了承重锚
  （R12 装配单源/通道判定/INTERFACE.md 段落头注是否保留）
- K6：头注迁移表随迁完整性（八行跨格序列+迁移表全行 vs 原 :18-43）
- K7：ExportSessionPhase 六态类型——「显式化」是否产生运行时行为（应纯类型面）
- K8：ipc-deps.ts 桩拆行——`...over.services` 展开序是否保持（后写覆盖语义）

## 审计要求

逐 hunk 零行为断言；计数独立复算（勿采信本包数字）；B/W/N 分级结论
（B=Blocker 必须回炉/W=Warning 条件放行/N=Note 登记）；结论给主控处置。
