# 复审任务书：审查包 A（派发器 v2.1 + org-config 工具）回炉轮 1

> 原审发现与处置（逐条核对 ADDRESSED/NOT ADDRESSED+修订面新破坏扫描；
> ≤1000 字+放行意见）。代码已升 v2.1.0。
>
> | 原发现（源） | 处置 |
> |---|---|
> | K-B1 角色源路由未走 org-config | 路由改 `merged.roles[roleId]?.source ?? registry 默认`；新增 org-config 声明不存在角色的死配置守卫（exit 3）；--list-roles 双源标注 |
> | K-B2/ds-B2 账本 ENOENT+IO 错入远程重试 | mkdirSync 先建目录；makeSafeAppend 封装（IO 失败=stderr 一次警告，不抛入 callSource 重试语义） |
> | ds-B1 find 回调 `i is not defined` | **REJECTED（机器事实证伪）**：回调解构即 `([i, p])`、引用同为 i，四类实跑（list-sources/dry-run/冒烟/mock 演练×2）全部经过该路径无异常——系误读形参名 |
> | K-W1 mock alias 不校验 | alias 必须 ∈ 本次链，否则 exit 3（实测拦截 bad-alias） |
> | K-W2/ds-N3 mock status<400 路径破损 | 限定 status ∈ [400,599]（实测拦截 200） |
> | K-W3 解构无兜底+host 配置二读 | readHostConfig() 单次读入共用；find 未命中/字段缺失 alias 级错误 exit 3 |
> | K-N1 exit 2 双义 | 配置级=exit 3；exhaust 保持 2；文档同步 |
> | K-N2 masked 死代码+error 泄漏面 | 删除死 masked headers；新增 scrub() 脱敏（长 token 形态掩码）用于日志/账本/错误文本 |
> | K-N3 盘符大小写+绝对 ledger_path | isMain 比较 toLowerCase；isAbsolute(ledger_path) 直用 |
> | K-N4 校验口径 | 保持全集校验（防漂移），错误信息注明「未入链的声明源亦须双校验通过」 |
> | ds-W2 statusCode 非结构化 | HTTP 错误对象附 statusCode；switch/exhaust 事件记结构化字段 |
> | ds-W3 switch/exhaust 重叠 | callSource 不再记 switch/exhaust；外层链按「是否真换源」互斥记录（switch 含 from/to） |
> | ds-W4 roles.source 缺失误导 | validate 先判字段存在性，缺 source 显式报错 |
> | ds-W5 输出写失败触发换源 | 输出写入移出 try（本地 IO 与远程重试语义分离） |
> | ds-W1 v1/v2 禁混无代码机制 | 终裁=主控流程纪律+事件字段 dispatcher_version 可审计，不做代码拦截（单一调用者前提） |
> | ds-N1 数组内 null | canonicalize 数组元素亦剔 null（顺序保留），自测向量+1（共 7） |
> | ds-N2 BOM | readJson() 剥 BOM 封装（四处全用） |
> | ds-N4 runId 毫秒 | 保持现状（唯一性优先，可读性 N 级） |
>
> 机检证据：self-test 7 向量全过；validate 3 源 PASS（cfg:add15c606e1b）；
> mock 换源演练重跑 switches=1 落账正常；bad-alias/200 两守卫路径实测拦截。

=============== 文件 1：scripts/ds-call-v2.mjs（v2.1.0 修订版） ===============
