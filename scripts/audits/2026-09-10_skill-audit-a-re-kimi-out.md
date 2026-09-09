[routing]: run=20260909014905-k0zf source=kimi-main model=kimi-k3 role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=8173,out=6173 latency=173400ms (by ds-call-v2 链)

# 复审报告：审查包 A 回炉轮 1（ds-call-v2 v2.1.0 + org-config）

## 一、原发现逐条核对

| 原发现 | 核对结论 |
|---|---|
| K-B1 角色源路由 | **ADDRESSED**：`routeSource = merged.roles?.[roleId]?.source ?? role.def.default_source`；死配置守卫在 loadRole 内 exit 3；--list-roles 双源标注齐 |
| K-B2/ds-B2 账本 ENOENT/IO | **ADDRESSED**：mkdirSync 预建 + makeSafeAppend 单次警告降级（但见新发现 W-1） |
| ds-B1 find 回调误读 | **REJECTED 成立**：现行码解构 `([id, p])` 引用 `id`，无未定义引用；历史版本不可核，但现行码与「误读」结论一致 |
| K-W1 mock alias | **ADDRESSED**：`!chain.some(...)` → exit 3 |
| K-W2/ds-N3 mock status | **ADDRESSED**：[400,599] 区间守卫 |
| K-W3 宿主单读+解构兜底 | **ADDRESSED**：readHostConfig 单次传入 validate/loadSources 共用；未命中/缺字段 exitConfig |
| K-N1 退出码双义 | **ADDRESSED**：配置级=3，exhaust=2 |
| K-N2 脱敏 | **ADDRESSED**：死 masked 已删，scrub() 覆日志/账本/错误文本 |
| K-N3 盘符/绝对路径 | **ADDRESSED**：toLowerCase 比较 + isAbsolute 直用 |
| K-N4 全集校验 | **ADDRESSED**：错误信息含「未入链的声明源亦须双校验通过」 |
| ds-W2 statusCode | **ADDRESSED**：错误对象附 statusCode，switch/exhaust 结构化记录 |
| ds-W3 互斥 | **ADDRESSED**：callSource 不记，外层按是否真换源互斥，switch 含 from/to |
| ds-W4 source 缺失 | **ADDRESSED**：validate 先判存在性 |
| ds-W5 输出写移出 try | **ADDRESSED**（但见新发现 W-2） |
| ds-W1 禁混终裁 | **ADDRESSED**（按终裁=纪律+审计字段，dispatcher_version 已入 ctx） |
| ds-N1 数组 null | **ADDRESSED**：canonicalize 剔数组元素，自测向量=7（逐一数过 t() 调用=7 ✓） |
| ds-N2 BOM | **ADDRESSED**：readJson 剥 BOM，四处调用全走封装 |
| ds-N4 runId | 保持现状，认可 |

## 二、修订面新破坏扫描

- **[W-1] mkdirSync 前置污染只读路径**（ds-call-v2.mjs CLI 段，`mkdirSync(dirname(ledgerPath)...)` 行）：--list-roles/--list-sources/--dry-run 亦触发建目录副作用；且 mkdir 失败（EACCES 等）为裸抛 exit 1，与「配置级=exit 3」口径冲突。应当：移至 dry-run 分支之后、派发循环之前；失败改 exitConfig。
- **[W-2] ds-W5 修订引入输出丢失面**（派发成功段）：writeFileSync 移出 try 后顺序为「先写文件、后 console.log」——写失败时正文未落 stdout 即未捕获退出，产物全丢。应当：先 console.log(body) 再写文件，或写失败 catch 后仍输出 stdout 并以非 2 码退出。
- **[N-1] 死配置守卫生效点单一**：仅 loadRole 触发；org-config validate 不做 registry 交叉，--list-sources 路径亦不经过。死角色配置可潜伏。应当：文档明示守卫仅在派发时生效（或后续给 validate 加注册表交叉）。
- **[N-2] --project 同名异义**：派发器=账本条目名，org-config=配置装载目录；且派发器固定从 cwd 装载。建议改名或文档明示。
- **[N-3] 用法错误路径裸 throw**（promptPath 缺失/未知源）：栈噪声 + 靠未捕获异常碰巧 exit 1，与文档「1=用法错误」属巧合一致。建议统一 console.error+exit(1)。
- **[不确定] registry.json 未送审**：routeSource 兜底与 --list-roles 均依赖 `def.default_source`，无法核验注册表全角色具备该字段；若缺失将路由 undefined 报「不可用」，信息误导。

## 三、总评与放行意见

原 18 条中 17 条 ADDRESSED、1 条 REJECTED 经现行码复核成立；机检证据（7 向量、validate PASS、两守卫拦截）与代码实物一一对应，无虚报。修订引入 2 个 W 级新破坏，均为边缘路径（只读命令副作用、写失败丢输出），不伤主链路与远程重试/计费语义。

**放行意见：有条件放行**——主链路可投入使用；W-1/W-2 列入回炉轮 2 小批必修（改动量极小），N 级登记；registry.json 建议下轮送审以闭环不确定项。