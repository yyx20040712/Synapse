# F-SESS-01 实现者报告（ops-executor）

## 0. 开工技能清点（宪法会话开工纪律）

- test-driven-development：**用**——本票 TDD 红→绿→双变异红证核心流程。
- systematic-debugging：**用**——verify 首跑 skipSites 红按「红因定位→最小修→复验」处置。
- verification-before-completion：**用**——verify 全链+e2e 双通道真退出码落盘。
- javascript-testing-patterns / e2e-testing-patterns：**用（参照）**——vitest/playwright 以仓库既有配方（Harness/e2e-env 单源）为先。
- 前台/computer-use 类：**不用**——全部验证走命令行+无头 playwright，零前台占用。
- 其余技能：**不用**——无新依赖、无 UI 设计、无部署面（理由各如名）。

## 1. 实现摘要

缺陷（主控裁决口径）：corpus.export.service 工厂闭包 `session` 单飞锁只在 done/failed
释放；renderer reload/崩溃（main 存活）时 corpusItem 永不回传→streaming 永挂→
EXPORT_BUSY 永不释放。头注态空间表漏「renderer 死 main 活」格。

修法三件（票面 A/B/C 全落）：

- **A（advance 守卫）**：`advance()` 入口 `if (session !== s) return`（行 217）——
  已终局（failed/aborted）会话的悬挂推进不得终写 manifest/resolve；与 failSession
  的门一 N2 防御同型。
- **B（abortActiveSession）**：CorpusExportService 接口新增
  `abortActiveSession(reason): Promise<boolean>`；无在途会话返回 false，有则复用
  failSession（清 manifest.tmp+释放单飞锁+reject IO_ERROR）返回 true——零第二套清理。
  **配套内部顺序调整（自裁①）**：failSession 的 `session = null`（终局标记）从
  `await rm` 之后移到之前——守卫在 t3 竞态窗（deferOutcome 的 setImmediate 在
  check 阶段先于 rm 完成）生效的前提是终局标记同步落盘；原「先清理后释放」序下
  守卫在该窗失活（事件循环相位论证见代码注释）。三动作（清 tmp/释放/reject）全保留。
- **C（bootstrap 接线）**：窗口创建后经 `container.services.export_.abortActiveSession`
  （liveProxy）接 webContents 两事件：`did-start-navigation`（仅 details.isMainFrame）
  与 `render-process-gone`（details.reason 入 message）。注释含「SPA 应用内路由不
  触发主帧导航——不误杀应用内跳转」与「首次加载 idle 空转无害」说明。

态空间表扩格（头注行为层）：迁移表新增 abort 行（任意在途+renderer 重载/崩溃→failed）；
interrupted 行补「renderer 单死（main 存活）由 abort 行覆盖」；跨格序列七行→八行
（新增 renderer 重载 streaming 中行）；接口层补 abortActiveSession 文档行。头注
工单行未动（工单状态主控翻）。

## 2. 文件清单（逐文件+行数增减）

| 文件 | 增/减 | 说明 |
| --- | --- | --- |
| src/main/services/export_/corpus.export.service.ts | 422→445（+23） | A 守卫+B 方法+failSession 顺序调整+头注三处表格+接口层文档 |
| src/main/bootstrap.ts | 258→273（+15） | C 接线两事件（webContents） |
| tests/unit/services/corpus.export.test.ts | 443→519（+76） | 4 新用例 t1-t4+existsSync import（[locked-change] 面） |
| tests/e2e/corpus-export.spec.ts | 147→221（+74） | 第二个 test「F-SESS-01 renderer 重载格」+头注块（[locked-change] 面） |
| locks/manifest.json | 6 行 | 两测试文件 sha 同步（随 generate 链） |
| scripts/audits/f-sess-01-*.raw.txt ×7 | 新增 | 证据件（本报告+首红+M1+M2+verify+e2e 双通道+定向首绿） |

## 3. 红证

- **首红**（实现前 4 用例）：`scripts/audits/f-sess-01-first-red.raw.txt`，
  FIRST_RED_EXIT=1——4 failed（`TypeError: h.svc.abortActiveSession is not a function`
  ×3）/12 passed；t3 以 dispose ENOTEMPTY 报红（红态下 abort 调用早夭、残留 fs 在途
  与 rm 竞态的噪声——实现后不复现）。
- **M1**（删 advance 守卫一行）：`scripts/audits/f-sess-01-m1-mutation.raw.txt`，
  M1_EXIT=1——恰 t3 红（`AssertionError: expected true to be false`=manifest 被悬挂
  终写），15 passed。还原=cp 备份法（禁 git checkout）：`diff 备份 源` 输出空
  （M1_RESTORE_DIFF_EMPTY），备份即删。
- **M2**（did-start-navigation 的 abort 调用改空函数，build 后定向 e2e）：
  `scripts/audits/f-sess-01-m2-mutation.raw.txt`，M2_EXIT=1——新 test 60s 超时红
  （无接线时 reload 后会话悬挂→再发起 BUSY→成功 toast 永不出现），旧 test 2.3s 绿。
  还原 cp 备份法 diff 空（M2_RESTORE_DIFF_EMPTY）+dist 重建（BUILD_EXIT=0）。
  M2 兼证新 e2e test 非空转绿（真实走 abort 路径）。

## 4. 测试证据（全部真退出码）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| npm run verify（全链） | 0 | VERIFY_EXIT=0；指纹门 183/183 文件、用例 1757→1762（+5=4 单测+1 e2e）、断言 5334→5350（+16）、skipSites 15/15；vitest 166 文件/1717 用例（1713+4）；locks 334 一致；lint/typecheck/build 全过 |
| 定向单测（npm run test -- corpus.export.test.ts，经 npm 入口保 ABI 切换） | 0 | 16/16（存量 12+新 4） |
| 定向 e2e（npx playwright test corpus-export --project=app） | 0 | 2 passed（旧 2.3s+新 3.9s） |
| npm run test:e2e（默认门） | 0 | 43 passed（基线 42+1）2.1m |
| npm run test:e2e:all（全量门） | 0 | 45 passed（基线 44+1）2.2m |

e2e 双通道与基线差值（42→43 / 44→45）与简报预测吻合。

## 5. locks 实录

- 第 1 链：`npm run locks:unlock`（334 解锁）→ 单测 4 用例落盘 → 首红取证 → 实现
  A/B + 头注 → 单测绿 → e2e 新 test 落盘 → `npm run locks:generate`（334 条）
  → `npm run locks:apply`（334 锁定）→ locks:check EXIT=0。
- 第 2 链（skipSites 红处置）：unlock → 删新 test 的 test.skip 依赖守卫 →
  generate → apply → `node scripts/check-test-surface.mjs check` EXIT=0
  （C_after ⊇ C_before）。
- 终态：verify 内 locks:check 334/334 一致；manifest 与本票 diff 同步（主控提交时
  带 [locked-change] 尾注）。

## 6. 自裁申报（超票面决定逐条）

1. **failSession 内部顺序调整**（简报只处方守卫+复用 failSession）：`session = null`
   前移至 rm 之前。论证：deferOutcome 排队的 setImmediate 在事件循环 check 阶段
   运行，先于 rm（线程池+poll 回路）完成——终局标记不同步落盘则守卫在 t3 竞态窗
   失活、M1 无法红。原「先清理后释放」防的新窗（清理期新会话 tmp 误删）经论证不
   成立量级（新会话 cleanRebuild 自清+finalizing 终写远晚于本 rm），注释入册。
   该调整同时兑现简报「补现有 failSession 路径的 advance 盲区」（并发写失败窗同型）。
2. **新 e2e test 删 test.skip 依赖守卫**：首版照旧 test 配方复制触发指纹门
   SKIPSITE_ADDED 红（skipSites 15→16，B2 双向红规则）。F-SESS-01 测试与实现同票
   原子落地、无依赖延期面，删除=回归宪法「新测试 always-active」口径；豁免通道
   （scripts/test-surface.exemptions.json）未动（零条目）。
3. **e2e streaming 证据轮询**用「两篇任一 page-1.png 出现」而非写死第一篇 id：
   篇序=listAllIds 库序（added_at DESC），两篇种子插入序不稳定，写死即 flake 面。
4. **头注两处计数/文档同步**：「跨格序列七行」→「八行」；接口层补
   abortActiveSession 一行——简报三处表格编辑之外的最小一致性收尾（语义格零删减，
   未压缩措辞）。
5. **t4 实际先红后绿**（简报预判「可能先绿」）：t4 借 abortActiveSession 进入中止
   态，实现前该方法不存在故红；其防御断言本体（INVALID_REQUEST）确为既有防御复验。
6. **4 新单测置于既有 guardedDescribe('SR2-AI-03') 内**：复用 Harness 配方（简报
   指令）；SR2-AI-03 已 done，守卫惰性不影响激活；未为 F-SESS-01 新开守卫组——
   always-active 口径下新测试本不应挂工单门。

## 7. 疑虑

- did-start-navigation 过滤用 Electron 42 的 `details.isMainFrame`（Event params
  现代形态）——简报写「event.isMainFrame」为同一事实的签名差异，非语义偏离；
  renderer 已核无 pushState/hash 路由（纯组件态切换），isMainFrame 过滤即安全。
- render-process-gone 格无运行时红证面：e2e 不注入真实崩溃（简报已裁同 abort 通道
  单测覆盖）；该接线的正确性由 typecheck（Electron 官方签名）+代码审覆盖。
- docs/handoff/relay.md 为进场前既有脏文件（本票零触碰，git status 备案）。
- 变异备份件已全删（cp .bak 用完即删，仓库无残留）；scripts/audits 下 7 件
  f-sess-01-* 证据件+本报告按三桶口径①随收口提交入库（主控处置）。

## 8. 机读尾栏

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=3 outcome=done
