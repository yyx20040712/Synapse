# F-R3 轨一 e 上游查证档案（pdfjs worker 泵终接 catch 现状——修票第一步）

> 查证日=2026-09-02（AUDIT-C 二波修票场，主控亲验）。方法=raw.githubusercontent
> 按 tag 拉取 src/core/worker.js 与 src/display/api.js（代理 127.0.0.1:7890），
> 与本仓 4.10.38 本地 bundle（node_modules/pdfjs-dist/build/pdf.worker.mjs）
> 逐点对照；版本清单=registry.npmjs.org（5.x 全系=5.0.375~5.7.284，另有 6.x
> 至 6.3.289）。全部锚可复现（URL=raw 文件+tag）。

## 0. 本仓 4.10.38 逃逸点精确形状（对照基线——本地 bundle 实读）

pdf.worker.mjs:56629 链尾（setupDoc 内）：

```js
getPdfManager(data).then(function (newPdfManager) { ... }).then(pdfManagerReady, onFailure);
// 4.10.38 onFailure 首语句（:56585）：
function onFailure(ex) {
  ensureNotTerminated();   // Terminate 置位后必抛 Error("Worker was terminated")
  ...
}
```

机制链（实测 8/8 指纹的唯一汇聚点）：流加载窗内 destroy→Terminate 置位
→泵 readChunk 的 ensureNotTerminated 抛/AbortException→`pdfManagerCapability
.reject`→链上 onRejected=onFailure→**onFailure 自己首语句再抛**→
`.then(pdfManagerReady, onFailure)` 产生的链尾 promise 无人终接→worker 世界
unhandled rejection（经 CDP 汇入 pageerror 仪表通道）。

## 1. 版本×修复面矩阵（逐 tag 实读核验）

| 修复面 | 4.10.38（本仓） | 5.4.624 | 5.5.207 | 5.7.284（5.x 末） | 6.3.289（npm latest） | master |
| --- | --- | --- | --- | --- | --- | --- |
| onFailure 终接守卫（`if (terminated) return;` 替换首语句 `ensureNotTerminated()`） | ✗ | ✗ | **✓** | ✓ | ✓ | ✓ |
| destroy() 主动 claim `_capability.promise.catch(()=>{})`（"Loading aborted" 不外逸 unhandled） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| destroy() `_setupCapability`（destroy 等设置链 settle——Terminate 保证经 WorkerTransport.destroy 下发） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| requestLoadedStream 两处补 onRejected（DataLoaded 求流+recovery 求流） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| pdfManagerReady 内 `loadDocument(false).then(onSuccess, 匿名 handler)` 悬尾（handler 首语句仍 ensureNotTerminated——Terminate 落初解析窗=同族 unhandled） | ✗ | ✗ | ✗ | ✗ | ✗ | **✗（未修——master 实读仍在）** |

关键 diff 证据（v5.4.624→v5.5.207 区间 worker.js **单处改动**即该修复）：

```diff
       function onFailure(ex) {
-        ensureNotTerminated();
+        if (terminated) {
+          return;
+        }
```

## 2. 结论（三态明确）

1. **上游已修本仓实测的逃逸主窗口**：落点=**v5.5.207**（区间 v5.4.624→
   v5.5.207，worker.js 单处 diff）——本仓 8/8 实测指纹（`Error: Worker was
   terminated`，全部产生于流加载窗内 destroy）的汇聚点 onFailure 被守卫。
2. **但未修全**：同族残余窗口（pdfManagerReady 悬尾——Terminate 落「初解析
   窗」或「manager-ready→pdfManagerReady 调用间隙」仍产生同消息 unhandled）
   在 **6.3.289 与 master 均未终接**（悬尾 promise 无 catch，master 实读）。
3. **destroy() 族硬化分散在 6.x**：claim 拒绝+`_setupCapability` 同步（含
   issue 16777 workerPort 关联注释）仅 6.3.289 起——5.x 全系（含 5.7.284）
   无。

## 3. 官方契约锚（门二 N3 遗留补齐——master src/display/api.js destroy() 文档注释原文）

> "Abort all network requests and destroy the worker."

master destroy() 并主动 claim 加载期拒绝（注释原文）："The setup chain
rejects `_capability` with 'Loading aborted' once the load-time chain unwinds
(see `getDocument`). Claim that rejection here so it isn't reported as
unhandled during the awaits below; callers awaiting `task.promise` still see
it."——上游官方立场：**destroy 对加载中=中止语义，且官方自认该链拒绝需
显式 claim 才不外逸 unhandled**（本仓 4.10.38 无此 claim，与本仓实锤同族）。

## 4. 裁决输入（主控终裁=见 f-r3-fix 票面+门审链）

- 升级至 5.7.284=消实测主窗口（devtools-only 噪声）；至 6.3.289=另获 destroy
  族硬化。但任一档位**均不能承诺「零同族噪声」**（§1 末行悬尾在 master 未修）
  ——票面「消除」目标在现有全部上游版本不可达，只可「主窗口消除」。
- 升级成本面=[dep-change]+ADR+跨 major API 迁移评估+INV-30/INV-16/P1
  TextLayer 形状/30 e2e 用例全量重验（宪法依赖纪律）。
- 不升级成本面=devtools 噪声维持（用户路径零影响，6/6 健康在档）+主进程
  level1 代理计数监控备案（r7 实证可收）。
