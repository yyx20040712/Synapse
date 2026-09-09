[routing]: run=20260909015239-atei source=deepseek model=deepseek-v4-flash role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=9170,out=21784 latency=209608ms (by ds-call-v2 链)

## 原发现核处（18 条）

- K-B1 ADDRESSED：路由改 `merged.roles[roleId]?.source ?? def.default_source`；死配置守卫 exit 3；--list-roles 双源标注齐全。
- K-B2/ds-B2 ADDRESSED：mkdirSync 先建目录；makeSafeAppend 捕获 IO 失败仅一次警告，不抛入远程重试语义。
- ds-B1 REJECTED 维持：形参即 `[i, p]` 解构、引用同 i，误读成立，不重开。
- K-W1 ADDRESSED：mock alias ∉ 本次链即 exit 3，实测拦截成立。
- K-W2 ADDRESSED：status 限定 [400,599]，实测拦截 200。
- K-W3 ADDRESSED：host 配置单次读入共用；find 未命中/字段缺失给 alias 级 exit 3。
- K-N1 ADDRESSED：3=配置/2=exhaust/1=用法已分义（但见新发现 W-1，该分义被局部破环）。
- K-N2 ADDRESSED：死 masked headers 已删；scrub 覆盖日志错误文本、账本 outcome。
- K-N3 ADDRESSED：org-config isMain 比较 toLowerCase；ledger_path isAbsolute 直用。
- K-N4 ADDRESSED：providers 全集双校验，错误信息注明「未入链声明源亦须通过」。
- ds-W2 ADDRESSED：HTTP 错误对象附 statusCode，exhaust/switch 日志亦结构化携带。
- ds-W3 ADDRESSED：callSource 只记 attempt/ok；switch/exhaust 按「是否真换源」在外层互斥记录。
- ds-W4 ADDRESSED：validate 对 roles.*.source 缺失显式报错。
- ds-W5 ADDRESSED：输出写入已移出 try，与远程重试/换源语义分离。
- ds-W1 终裁复核：同意——单一调用者前提成立，dispatcher_version 可审计为约束机制。
- ds-N1/N2/N4 ADDRESSED：canonicalize 剔数组 null 且保序并加向量；readJson 剥 BOM 统一；runId 维持现状。

核处结论：17/17 ADDRESSED，1 REJECTED 维持。

## 新发现（回炉轮修订面扫描）

[W-1] **退出码「1=用法错误」再被本地 IO 错误污染，且与「已落账 ok」冲突**  
定位：ds-call-v2.mjs 头部退出码注释 vs 尾部 `writeFileSync` catch 内 `process.exit(1)`。  
问题：outPath 写失败属环境/本地 IO 错误，却被赋给「1=用法错误」；此刻 callSource 的 ok 已落账、正文已在 stdout。主控若按 exit code 判定整次调用失败并自动重试同工单，将产生第二笔真实 API 调用，恰好重蹈 K-B2 想防的「成功响应后被重试=重复计费」。  
建议修正案：退出码注释改为「1=用法或本地 IO 错误」或引入独立码；同时主控约定「stdout 已出正文即不得重试」。

[N-1] **mock 注入单点化导致「换源演练」会真实调用后续源**  
定位：ds-call-v2.mjs `--mock-source` 解析与 switch 循环。  
问题：一次只允许一个 alias 注入故障；若 mock 的是链中非末位源，switch 后的后续源为真实调用。机检「mock 换源演练 switches=1」若链中含有效真实源，可能已产生真实费用/用量。  
建议修正案：支持多 alias mock（或文档明示：无成本 switch 演练仅可在链尾 exhaust 路径达成）。

[N-2] **validate 对「空 source_chain + roles.source=chain」PASS，实际派发才 exit 1**  
定位：org-config.mjs validateProviders 仅查 source_chain 引用存在性，不查非空；ds-call-v2.mjs chain 构造段。  
问题：source_chain 被清空（覆盖件整体替换）后 validate 仍报 PASS，派发时路由源 `chain` 不可用、exit 1，误分类为用法错误。registry.default_source 有效性亦不在 validate 域内，同样推迟到执行期才暴露。  
建议修正案：validate 增加「source_chain 非空」「default_source 引用有效」检查，归 exit 3。

[N-3] **配置 JSON 语法错误/宿主文件缺失以未捕获异常退出（exit 1 带堆栈）**  
定位：org-config.mjs `loadOrgConfig/readJson/readHostConfig` 无捕获层。  
问题：配置文件损坏属配置级错误，却落在「1=用法错误」；堆栈式输出对自动化门禁判读不友好。  
建议修正案：readJson/readHostConfig 在 CLI 入口统一捕获并 exit 3（或单列环境错误码）。

## 总评

回炉处置质量高：原审 18 条全部有代码/测试证据闭环，无 B 级新阻断，修订面新破坏集中在退出码分类与 mock 演练成本语义两处。W-1 建议合入前修正（至少同步文档与主控重试约定）；N-1~N-3 可后续轮补齐。  
放行意见：**有条件放行**——先处理 W-1；N 项登记待修不阻断本次合入。