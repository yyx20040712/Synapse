# F-R3 轨二 c 实现报告——CorpusExtractor 加载失败路径补 destroy（闭 P6 worker 泄漏）

> 单号=F-R3（AUDIT-C 二波修票场，票面母本=f-r3-fix-brief.md）。
> 实现者=GLM5.3flash 档子代理（环境无 model 参数=统一档欠账已知，任务书预声明）。
> 全部数字经实跑脚本输出落盘核对，无凭印象值。

## 0. 开工记录（技能清点——宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 本单核心纪律：首红→实现→绿→断言级变异红证→还原 |
| verification-before-completion | 用 | 收口 npm run verify 真退出码落盘（PIPESTATUS[0]，非管道尾） |
| systematic-debugging | 不用 | 缺陷根因已由 F-R3 排查票实锤（P6），照主控裁决实现，无调试面 |
| subagent-driven-development | 不用 | 本体即实现者子代理，无派发面 |
| javascript-testing-patterns | 不用 | 桩风格已由受锁测试件锁定（接口结构桩/无 mock 库），循既有件 |
| git 类技能 | 不用 | 禁 git add/commit/push（主控收口单写者纪律） |

配置自查：PATH 前导 node v25 漂移坑已按任务书规避（一切 node/npm 前
`export PATH=/d/nodejs24:$PATH`；实跑 sqlite-abi 绑定=v24 的 v137 ABI）。

## 1. 实现摘要

按主控裁决三件落地（契约逐字照 f-r3-fix-brief.md §③）：

1. **新导出纯函数**：`PdfjsLoadTaskLike<T>` 接口（promise+destroy 形状契约）+
   `settleLoadTask<T>(task)`——成功=透传 resolve 且不调 destroy；失败=
   `await task.destroy().catch(() => undefined)`（destroy 恰一次、其自身拒绝
   吞并）后原样重抛。放置于 loadPdfDocument 前（模块级，单测锚）。
2. **loadPdfDocument 接线**：`const task = getDocument(url)` →
   `return settleLoadTask(task) as unknown as Promise<PdfjsDocumentLike>`
   （cast 形态循简报指定；成功路径行为零变——doc.destroy 归 runExtraction
   finally 语义不变）。
3. **头注状态机表修正**：原 :31 单行「文档加载失败/invoke 折叠错误/提取异常
   →failed；destroy（失败也释放）」拆为如实双路径两行（加载失败=
   loadingTask.destroy 在加载器内终接清理——worker 线程不泄漏；invoke 折叠
   错误/提取异常=doc.destroy 归 finally——失败也释放）；跨格序列②同步改写
   为「destroy 两面不阻断」（加载失败面=loadingTask.destroy 自身拒绝被终接
   吞并、原错误优先重抛；提取面=doc.destroy 尽力而为+console 日志）。

「不做」清单（简报③条4）全部遵守：不动 runExtraction/不动事件防御分支/
不动 PdfDocProvider/不加 destroy 序列化（轨二 b 另裁）/不动 e2e。

## 2. 文件清单（diff 范围自查——git diff --stat 实测）

```
 locks/manifest.json                             |  4 +-
 src/renderer/features/reader/CorpusExtractor.ts | 39 +++++++++++++++---
 tests/unit/renderer/corpus-extractor.test.ts    | 54 ++++++++++++++++++++++++-
 3 files changed, 87 insertions(+), 10 deletions(-)
```

- `src/renderer/features/reader/CorpusExtractor.ts`（非受锁）：+settleLoadTask/
  PdfjsLoadTaskLike/接线/头注三处修正。现 311 行（wc -l 实测；<500，lint+quality
  实证过）。测试件现 304 行（wc -l 实测；tests/** max-lines 豁免面）。
- `tests/unit/renderer/corpus-extractor.test.ts`（受锁，主控已解锁）：改动
  严格限于 ①vitest import 追加 describe ②named import 追加 settleLoadTask+
  type PdfjsLoadTaskLike（RenderCanvas 行加尾逗号）③文末追加 always-active
  新 describe（**禁 guardedDescribe 遵守**，直接 describe/it）。既有用例
  零触碰（git diff 亲验：仅 @@ -1,11 +1,13 @@ 与 @@ -252,3 +254,51 @@ 两块）。
- `locks/manifest.json`：locks:apply 重生成（本单测试文件新 sha 入册）。
  无删减面（纯增量，无既有行删除——测试件 -1 行=import 行尾逗号改写，
  CorpusExtractor -3 行=状态机表 :31 单行拆双行+跨格序列②原 2 行替换）。

## 3. TDD 证据链（.raw.txt 全部入 scripts/audits/）

| 阶段 | 文件 | 实测结果 |
| --- | --- | --- |
| 首红（实现缺失红） | f-r3-fix-red.raw.txt | `3 failed \| 1081 passed (1084)`，exit=1——三用例全红（settleLoadTask 未导出，esbuild 转译运行时 undefined→TypeError）。附 2 个 Unhandled Rejection=实现缺失时 reject 桩无人接的副产物（红形态可接受，见 §7） |
| 实现→绿 | f-r3-fix-green.raw.txt | `126 passed (126)` / `1084 passed (1084)`，exit=0，零 Unhandled/零 Errors（首红副产物随实现消失实证） |
| 断言级变异红证 | f-r3-fix-mutation.raw.txt | 变异=catch 分支 `await task.destroy().catch(() => undefined)` → `await Promise.resolve()`（保 await 结构最小变异）→ `2 failed \| 1082 passed (1084)`——**精确击中两个失败路径用例**（`AssertionError: expected +0 to be 1` ×2=destroyCalls 断言），成功路径用例仍绿（非误伤） |
| 变异还原 | 同上文件（追加段） | cp 备份法（备份至 /tmp，未用 git checkout）→ `diff` 空（restore verified）→ 复跑 `1084 passed (1084)` |
| verify 收口 | f-r3-fix-verify.raw.txt | `npm run verify` **exit=0**（PIPESTATUS[0] 实测）——quality（无占位/乱码/跨域）+tickets（注册表与代码一致）+locks（**233** 个受锁文件与 manifest 一致，与简报基线一致）+lint+typecheck+test（126 文件/1084 用例）+build 全过 |

用例计数对账：基线 1081 + 新增 3 = **1084**，与简报⑤预期完全一致（实测值）。
本测试件现 13 用例（原 10+新 3）。

## 4. 新增测试三用例（契约=简报③测试节逐条）

1. **成功路径**：透传 resolve 原值（同引用 toBe）+`destroyCalls===0`。
2. **失败路径**：重抛原错误（**同引用** rejects.toBe——强于同消息）+
   `destroyCalls===1`（恰一次）。
3. **失败且 destroy 自身 reject**：仍重抛**原**错误（destroy 错误被吞并不
   覆盖）+`destroyCalls===1`。

桩=接口结构桩（TaskStub extends PdfjsLoadTaskLike+destroyCalls 计数器），
无 mock 库；三用例零 setTimeout（纯 promise 微任务）——均循简报约束。

## 5. 自裁申报（超票面微决定，均为文档同步非行为面）

1. **接口层导出面清单登记 settleLoadTask**（头注 ：42 段追加一句）+**文化层
   测试面登记「settleLoadTask 失败终接三径」**（:71 段追加）+loadPdfDocument
   头注补一行「加载失败经 settleLoadTask 终接」。理由：本票病灶即「文档与
   实现不符」（状态机表被 P6 证伪），新增导出若不登记导出面清单=制造同类新
   债；属简报③条3「注释可微调」维度的最小同步。**行为面零改。**
2. **locks:apply**：宪法「受锁文件修改后即时 apply 重锁+更新 manifest」——
   verify 的 locks:check 做磁盘 sha 对账，不 apply 则 verify 必红（check-locks.mjs
   实读确认）；主控收口核对 locks=233 与简报基线一致。
3. 其余无。无删减面；无新依赖；无 tickets/registry 触碰；无 git add/commit。

## 6. 疑虑（供门审/主控复核）

1. **无**（行为面疑虑零——契约逐字照主控裁决，cast 形态循简报指定
   `as unknown as Promise<PdfjsDocumentLike>`；vite build 两条 dynamic-import
   chunk 警告为改动前既有形态，非本单引入）。
2. 备忘：build 产物 `pdf.worker.min-yatZIOMy.mjs` 与 F-R3 排查报告 §2 引用的
   worker 资产同 hash（yatZIOMy）——资产源未随本单变化。
