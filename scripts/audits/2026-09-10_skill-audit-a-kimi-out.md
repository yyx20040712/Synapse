[routing]: run=20260909014024-lvg0 source=kimi-main model=kimi-k3 role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=6865,out=7638 latency=216274ms (by ds-call-v2 链)

# 终审意见（对抗式只读审核）

**B1｜角色→源路由未走 org-config，设计硬冲突**
ds-call-v2.mjs:211 链选择用 `role.def.default_source`（registry.json），全程未读 `merged.roles[roleId].source`；于是 org-config.mjs:96-99 validateProviders 校验的 `roles.*.source` 及文件3的 roles 段成为**运行期死配置**——项目覆盖件改角色档位不生效且无任何告警，与头注"角色档位来自 org-config（深合并）"直接矛盾。:184 `--list-roles` 显示 `rc.source` 更坐实双源不一致。
修正案：路由应取 `merged.roles[roleId]?.source ?? registry 默认`；validate 增加 registry↔org-config 角色键交叉校验。

**B2｜账本目录未建，成功后崩溃丢账**
ds-call-v2.mjs:180 ledgerPath 默认 `.zcode/org-ledger.jsonl`，从未 mkdir；makeLogger.ledger（~:113）appendFileSync 在纯默认件项目（无 `.zcode/` 目录）首次 ok 落账即 ENOENT——发生在 API 已成功返回之后（:148-149），**已计费响应丢失**、进程异常退出且无 exhaust 语义。
修正案：首次落账前 `mkdirSync(dirname(ledgerPath),{recursive:true})`；落账 I/O 失败应降级为 stderr 警告，不中断主流程。

**W1｜--mock-source alias 不校验，演练可静默真调**
ds-call-v2.mjs:213-214 仅校验格式不校验归属；alias 拼错时 :120 比对永不命中，故障注入演练**静默改打真实 API**，违反审查面④"不触真实 API"且零提示。
修正案：mock.alias 必须 ∈ 本次 chain，否则 exit 1。

**W2｜mock status<400 路径破损**
:126-128 mock 对象只实现 `text()`；正则不拦 200/302，:145 `await res.json()` 抛 TypeError，被 catch 当网络错退避 3 次再换源，switch 事件 error 记为 "res.json is not a function"，事件语义污染。
修正案：fail-fast 限定 mock status≥400，或补全 mock 成功路径的 json()。

**W3｜loadSources 解构无兜底 + host 配置二读**
:58 find 未命中时 `[id, prov]` 解构 undefined 裸抛 TypeError（validate 先行可挡大部分，但 hostCfg 被 validate 与 loadSources 各读一次、非原子；entry 缺 `options.baseURL`/`models` 时 :61-65 同样裸抛）。
修正案：hostCfg 单次读入传入两函数；find 未命中/字段缺失给 alias 级明示错误并 exit 2。

**N1｜exit 2 双义**：:52 配置校验失败与 :259 源尽 exhaust 同为 2，主控"欠账回退只读审"无法区分。若有意保留请文档明示，否则配置错建议改 exit 3。

**N2｜密钥面整体合格**（dry-run/日志/账本均无 key），但 buildRequest :73-75/:86-87 的 masked headers 是死代码，易诱后续维护误用 headersReal 记日志；:152 落账的 e.message 含上游响应 body 前 300 字符，极端情形可能回显敏感串，建议落账前过滤 Bearer/x-api-key 模式。

**N3｜Windows**：org-config.mjs:103 isMain 盘符大小写差异可致直跑静默无输出；ds-call-v2.mjs:180 覆盖件若写绝对路径 ledger_path，`join(cwd, abs)` 拼接错误，应先 isAbsolute 判断再 resolve。

**N4｜校验口径**：validateProviders 校验 cfg.providers 全集而非 source_chain 子集，未引用源的漂移会阻断不相关工单。收紧是否有意请确认；若是，错误信息宜注明"未在链中亦须双校验通过"。

---

**总评**：审查面②（深合并四语义+哈希确定性）、①核心（429/5xx/网络错 3 次退避、4xx 立即换源、末次守卫真实状态码、switch/exhaust 落账、exit 码）、⑤密钥内存面、⑥无 shell 依赖——实现均正确，mock 退避归零与事件照记亦符合④。但 B1 使 org-config 角色档位运行期失效（与设计书明文冲突）、B2 存在"成功即崩"丢账路径，均不可带病上线。

**放行意见：不放行。** 修复 B1/B2 为放行前提；W1~W3 应同批修复并复审；N 项可并行处置。