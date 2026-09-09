# 审查包 A：派发器 v2 + org-config 工具（代码终审）

> 背景：ai-dev-org 技能=loop-engineering 升级替代件（2026-09-10 落地）。
> 架构设计书已经 Kimi 拟定+deepseek 审核通过；以下为**按设计落地的代码终版**，
> 此前仅有机器自检（self-test 6 向量/validate 3 源/dry-run/冒烟真调/mock
> 换源演练），未经模型代码审查——本轮补审。对抗式只读审核：[B|W|N]
> 分级+file:line 定位+建议修正案，只挑错不改写，≤1500 字，末尾放行意见。
> 已知环境事实：宿主=~/.zcode/v2/config.json（uuid 前缀+条目名双校验，
> 不符 exit 2）；v1 母本=Synapse scripts/audits/ds-call.mjs（受锁件，
> 本件不替代它，独立服役）。审查重点：
> ①与 v1 行为等价性：退避（429/5xx 指数 3 次）/4xx 立即换源/末次守卫
> 抛真实状态码/switch 事件落账/exit 码语义——除新增角色与记账外不得
> 有静默行为变更；
> ②org-config 深合并语义实现正确性（对象逐字段覆盖/未提及沿用/数组
> 整体替换/显式 null=删除）与规范化哈希确定性（递归键排序+剔 null）；
> ③fail-fast 校验完备性（uuid/name/链引用/角色源引用）；
> ④--mock-source 语义（不触真实 API/退避归零/事件照记）；
> ⑤密钥仅内存、日志与 dry-run 输出不得泄漏 key；
> ⑥Windows 兼容（路径/编码/无 shell 依赖）。

=============== 文件 1：scripts/ds-call-v2.mjs ===============
