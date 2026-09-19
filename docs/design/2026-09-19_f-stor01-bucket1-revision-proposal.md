# AGENTS「scripts/audits 留档三桶口径①」修订呈批稿（F-STOR-01 制度呈批面）

- 日期：2026-09-19（F-STOR-01 存储批随批产出）
- 呈批对象：AGENTS.md「依赖与提交」节「scripts/audits 留档三桶口径」段
- 状态：**待用户裁决**（《裁决书》§3 梯队五既定呈裁节点——完成产出即勾项，裁决本身待用户、不阻塞接力）

## 一、背景事实（均已机械执行——裁决 3 直接授权面）

1. `scripts/audits/` 历史内容 3639 件（1.9G 量级；git 跟踪 2871 件、受锁 .mjs/.ps1 141 件）已整体移仓外档案区 `E:/zcode_md/synapse-archive/scripts-audits/`（原名平铺）；
2. 仓内 `scripts/audits/` 仅存 README 指针件（目录存续=registry 两张 DIR 形 file 锚的路径存在性要求）；`.gitignore` 已全拦目录内容（止血：`scripts/audits/*` + README 例外）；
3. locks manifest 同步 regenerate（385→245=385−141 旧径+1 工具件随迁新径）；
4. 活工具件 `visual-diff-locate.mjs`（F-TOOL-01/INV-64）随迁 `scripts/` 根（仍受锁）；`local-state-backup/`（45M）外移档案区；`dist_new/`（7M）**删除欠账**——裁决 3 本机 52M 清理项（实现批实录：前两项毕；dist_new 删除被宿主工具文件索引句柄锁阻塞——Restart Manager 定位 PID 32304「ZCode」，仅余单文件 `app.asar` 待锁释放后补删，证据=仓外档案区 b29-find-lock-probe.ps1 探针+b29-impl-report.md）。

## 二、现行条文（原文，未动）

> **scripts/audits 留档三桶口径**（2026-09-05 F-AUDIT-01 终裁，此后常态）：
> ①证据件（raw/md/json/patch/diff——含简报/报告/门审档/verify 与变异输出）**随收口提交显式列入库**；
> ②`*out*` 探针数据目录不入库——`.gitignore` `scripts/audits/*out*/` 目录形态已拦（尾斜杠目录匹配，closeout 文件名免疫；已跟踪历史件不受影响）；
> ③mutation backup 副本禁驻留（变异还原毕即删——源文件 cp 副本留档=冗余面）。
> 收口毕 `git status` 未跟踪面应为零。

## 三、拟改条文（v2——仓外档案区登记制）

> **scripts/audits 留档口径 v2**（2026-09-19 裁决 3 出库归档后形态，F-STOR-01）：
> ①证据件（raw/md/json/patch/diff/log——含简报/报告/门审档/verify 与变异输出、探针工具件）**写入仓外档案区 `E:/zcode_md/synapse-archive/scripts-audits/`，不入库**；批次日志登记文件名清单（登记制）。仓内 `scripts/audits/` 仅存 README 指针件（`.gitignore` `scripts/audits/*` 全拦+README 例外）。
> ②探针/工具件随证据件驻仓外档案区——check-locks walk 只认仓内 `scripts/**.mjs|.ps1`，仓外件不入 manifest（跨 clone 无失效面）；`scripts/` 根下新增工具件的受锁纪律不变（walk 自动覆盖）。
> ③mutation backup 副本禁驻留（不变——变异还原毕即删）。
> 收口毕 `git status` 未跟踪面应为零（不变——证据件在仓外+目录内容已 ignore，自动成立）。

## 四、生效方式与过渡态

用户批准后由后续批次将拟改条文落入 AGENTS.md（受锁文件 [locked-change] 单源修订，同步替换三桶口径段）。过渡期机械面已由 `.gitignore` 止血先行（裁决 3 直接授权），制度文本与本稿在此窗口内 bridging——机械行为（证据件不再可能入库）与现行条文①的「随收口入库」暂时失配，属已裁决现实，本稿即消解该失配的呈批载体。

## 五、已知衍生面清单（不阻塞，随批登记）

1. `scripts/local-state.mjs` 的 audits `*.log` 归档功能自此空转（`existsSync`+空清单 warn 优雅降级，:75 预案句「可能已归档过或被清理」即此态；含 `:7` 头注「md 报告在库」句失配与 `:155` logs-restored 恢复落点）——是否退役归后续票裁量；
2. `scripts/check-dup-constants.mjs:4` 判据书指针（`scripts/audits/f-lint02-design-final.md`）成历史指针——按「历史叙述保留」口径不动，实体在档案区；
3. `.github/workflows/ci.yml` TR_RE 白名单 `^scripts/audits/` 条目 inert 保留——目录跟踪件仅余 README 指针件后该条对 README 仍可匹配，但 README 非测试面且范围闸系 `[test-refactor]` 提交的附加约束层（本批尾注仅 `[locked-change]`），风险不增；落 AGENTS 时如需精化措辞顺带处理；
4. 仓内历史文档约 83 文件含 `scripts/audits` 路径叙述（另 src/tests 代码注释约 29 行史述指针同口径）——历史口径保留，映射=档案区 `scripts-audits/` 同名件；
5. `visual-diff-locate.mjs` 随迁后 HERE 语义漂移（门一 W1）：头注用法行/缺省路径叙述/`:64` fail 消息/`:293` `meta.tool` 四处仍指 `scripts/audits/` 旧径——为保「内容零改」的 rename sha 恒等链本批不刷文本，归后续小票（合法触碰该件时顺带）；缺省输出落点 `scripts/visual-diff-report.json`/`scripts/visual-diff-crop.png` 已由 `.gitignore` 两条防护规则落位（本批修缮）；
6. 同族缺省/产物路径锚另四处（门二 P2-3 补登）：`tests/e2e/z-r2e-probe.spec.ts:33`/`z-wg1-probe.spec.ts:35`（运行时 mkdirSync 重建 `scripts/audits/*-out`——`.gitignore` 全拦零入库风险，tests 面触碰需 `[locked-change][test-refactor]` 故本批零改）、`scripts/audits/deepseek_audit.py:151-152`（已随批出库在档案区，头注「位于仓库外」自此为真）、`scripts/local-state.mjs:155`（并入第 1 条）——均归后续小票顺带改指档案区/临时目录。

## 六、呈批问题（单选）

- a. 批准拟改条文（后续批次落 AGENTS.md）；
- b. 修改后批准（批复中给出修改点）；
- c. 驳回（维持现行入库条文——`.gitignore` 止血条将与现行条文冲突，需另裁处置）。
