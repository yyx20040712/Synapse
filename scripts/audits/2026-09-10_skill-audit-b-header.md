# 审查包 B：治理脚本 + 角色档案注册表（终审）

> 背景：ai-dev-org 技能实现面补审（包 B）。对抗式只读审核：[B|W|N]+定位
> +修正案，≤1200 字，末尾放行意见。审查重点：
> ①check-constitution-budget.mjs 正则健壮性（多段/缺 END 标记/大小写/
> CRLF——文件为 LF 但输入 AGENTS.md 可能 CRLF）；
> ②skill-gc.mjs 分类误伤面：REDIRECT_RE=正文含「已退役|退役|重定向|
> retired|redirect to」且 body<2000B 才判 redirect——active 技能正文
> 提及这些词的误判概率与后果；frontmatter 解析边界（description 多行
> YAML/注释/BOM）；--apply 双开关防线与归档回滚完整性；插件缓存只读
> 不动的边界是否真实成立（当前实现根本不扫插件目录——是否算缺口）；
> ③registry.json 路径解析（相对技能根）与缺文件行为；
> ④六份角色档案（系统提示+DoD）与 references/06/07 口径一致性、提示词
> 质量；gate1-reviewer.md 与 v1 SYS_PROMPT 字节等价已机检 PASS（R2，
> 96B=96B），该件免审只审其余。
> 已知事实：技能根=C:/Users/Administrator/.zcode/skills/ai-dev-org；预算
> 上限=600 非空白字符。

=============== 文件 1：scripts/check-constitution-budget.mjs ===============
