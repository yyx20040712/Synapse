你是对抗式代码审查员（门一）。审计对象=AUDIT-C C-1 F-R3 修票（轨二 c：CorpusExtractor 加载失败路径补 destroy）+主控两项裁决（轨一不升级/轨二 b 不采）。你只见本自包含包（票面+完整 diff 内联+验证摘要），零仓库访问——不得臆测包外事实，不确定的明确说不确定。

# 票面（规约）

缺陷（排查实锤在案）：pdfjs 每个未传 worker 的 loadingTask 自带专属 PDFWorker；`loadPdfDocument` 原 `return getDocument(url).promise` 丢弃 task 句柄——加载失败时 runExtraction 的 doc 恒 null，finally 的 doc.destroy() 不可达 → 每次提取加载失败泄漏一个专属 worker 线程（P6）。头注状态机表「文档加载失败→destroy（失败也释放）」一格被证伪（文档与实现不符）。

修法（主控设计）：新导出纯函数 settleLoadTask（成功透传且不调 destroy；失败 destroy 恰一次且自身拒绝被吞并后重抛原错误）+loadPdfDocument 接线（成功路径行为零变——doc.destroy 归 runExtraction finally）+头注状态机表改如实双路径。不做：runExtraction/事件防御分支/PdfDocProvider/destroy 序列化/e2e。

# 主控两项裁决（可攻击——推翻需更强依据）

1. **轨一（上游）不升级**：查证实锤（本包外档案 f-r3-upstream-check.md，可要求主控补充证据）：上游 v5.5.207 落地 onFailure 终接守卫（`if (terminated) return;` 替换 `ensureNotTerminated()`——正是本仓实测 8/8 指纹 `Error: Worker was terminated` 的逃逸汇聚点；区间 v5.4.624→v5.5.207 worker.js 单处 diff）；但同族残余窗口（pdfManagerReady 悬尾——`loadDocument(false).then(onSuccess, 匿名handler含ensureNotTerminated)` 链尾无人终接）在 6.3.289 与 master 均未修；destroy() 族硬化（claim `_capability.promise.catch(()=>{})`+`_setupCapability` 同步）仅 6.3.289 起。裁决=任一升级档位均不能承诺「零同族噪声」（票面目标不可达），而噪声定性=devtools-only（用户路径零影响，6/6 健康在档）——跨 major 升级回归面（INV-30/INV-16/P1 TextLayer 形状/30 e2e 重验）不换纯开发体验改善。维持 4.10.38+主进程 level1 代理计数监控备案。
2. **轨二 b（destroy 序列化）不采**：机理=await 旧 destroy 完成再新 getDocument——不改噪声本体（上游缺陷），对连开体验面增益未证实，且引入切换串行延迟（新文档挂载等旧销毁完成）的确定代价。噪声已被轨一裁决接受，b 无消噪声收益。

# 审计工单（A~E 逐项，输出 [B|W|N] 分级+证据）

A. 母本符合度：diff vs 票面修法逐点；settleLoadTask 契约三径（成功不 destroy/失败 destroy 恰一次/destroy 自身拒绝吞并不覆盖原错误）是否被测试逐径锚定；头注状态机表是否如实。
B. 宪法红线：分层/安全禁令/行数 ≤500/新依赖/受锁面（tests 追加是否动了既有用例）。
C. 代码与测试质量：测试是否恒真风险（taskStub 自计 destroyCalls——变异红证是否证明断言真承载）；「成功路径不调 destroy」断言对生产语义（成功路径 doc.destroy 归 finally）的覆盖是否充分；loadPdfDocument 接线 cast 形态；settleLoadTask 与 PdfDocProvider 模式（句柄在册+cleanup destroy）的语义一致性。
D. 报告诚实性：自裁申报 2 项（头注接口层/测试面清单登记+loadPdfDocument 注释一行+locks:apply）vs diff 实际——有无未申报改动。
E. 接缝与后续单：轨一/轨二 b 两项裁决的漏洞；P6 泄漏面是否被本修法完全关闭（worker-per-task 事实下 destroy 是否唯一终止口——有无其他句柄丢弃点）；上游残余窗口不升级的长期风险。

输出：[B|W|N] 逐条+file:line 或代码摘录证据+统计（xB/xW/xN）+总评（PASS/FAIL/修订后采纳/条件 PASS）。回复精简，全文在档。用中文。
