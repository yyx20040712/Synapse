[routing]: run=20260909015751-yjrg source=kimi-main model=kimi-k3 role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=3337,out=2551 latency=89570ms (by ds-call-v2 链)

# 终审意见（包 B：治理脚本 + 角色注册表）

## ① check-constitution-budget.mjs

- **[W] 正则第 7 行**：`([\s\S]*?)` 惰性匹配只取**首个** BEGIN…END 段。多段场景下第二段超 600 也不检，静默放行。修正案：应当用全局匹配累加所有段字符数，或检出多段即 FAIL 并提示人工裁决。
- **[W] 同处无 `i` 标志**：`org-seg:begin` 小写标记不识别，报"未找到标记段"——与缺段混淆。修正案：要么正则加 `i` 并在文档固化大小写口径，要么报错信息区分"缺 BEGIN/缺 END/大小写不符"。
- **[N] 第 5 行**：`readFileSync` 无 try/catch，路径错误时抛堆栈而非干净提示（退出码碰巧仍为 1，不阻断）。
- **[N] CRLF**：`\s` 覆盖 `\r`，计数方向正确；通过。但 END 缺失时报错文案误导为"缺段"。

## ② skill-gc.mjs

- **[W] REDIRECT_RE 误伤面（classify 内）**：`已退役|退役|重定向|redirect to` 是普通词，任何 body<2000B 的 active 技能只要正文提及即判 redirect 并随 `--delete-redirects` 被归档。**本工具所属技能自身文档即含"退役/重定向"字样**——若其 SKILL.md<2000B 将自命中（尺寸不确定，标不确定）。后果可回滚故不定 B，但属高概率误判。修正案：应当收窄判据（如仅匹配 frontmatter 后首行/专用标记注释 `<!-- redirected -->`），且 redirect 命中须二次确认清单。
- **[W] frontmatter 正则无 BOM 处理**：`\uFEFF---` 开头文件判 invalid，随 `--delete-invalid` 被删。修正案：读取后先 strip BOM。
- **[W] 同日二次运行回滚完整性**：`GC-MANIFEST.json` 以 `writeFileSync` 覆盖写，同日第二批清理会**抹掉第一批清单**，"可整目录移回回滚"承诺降级。修正案：清单应当追加/合并，或时间戳细化到秒。
- **[N] description 解析**：`(.+)$` 不 trim（name 有 trim），CRLF 下 desc 带 `\r`；多行 YAML（`description: >`）只取首行致 descB 虚低——只影响估算，不影响分类安全。
- **[N] 头注声称"插件缓存目录只读盘点"**，实现根本不扫插件目录——属文档口径与实现不符（不算功能缺口，因只读原则成立；但"盘点"一词失实）。修正案：头注应改为"不扫描、不动"。
- **[N] `renameSync` 无异常处理**，中途失败留半归档态。

## ③ registry.json

- **[W] 路径解析基准未定义**：`sys_prompt_file` 为 `scripts/roles/...`，相对技能根还是相对 registry.json 所在目录，包内无 loader 佐证。解析方约定错则全部加载失败。修正案：注册表应当增加 `base: "skill_root"` 字段或写明约定。**缺文件行为**（报错/跳过）包内无任何件覆盖——不确定，建议 loader 侧显式 FAIL。
- **[N]** 六份档案=3 角色×2 文件，与 registry 三条目一致；template 命名与各 DoD 输入契约吻合。

## ④ 角色档案（gate1 免审）

- **[N]** drafter/auditor 系统提示与各自 DoD 口径自洽（候选≥2、≤6000/≤2500 字均有"任务书另有约定"出口）。
- **[N] 不确定**：references/06/07 未随包提供，口径一致性**无法核验**，建议补件后复核。

## 总评与放行意见

脚本工具面设计（双开关、归档回滚、干跑默认）合格，但存在 4 项应修：多段预算漏检、redirect 误判（含自命中风险）、BOM 误判 invalid、同日清单覆盖。**放行意见：有条件放行——4 项 [W] 修正前 skill-gc.mjs 禁止带 `--apply` 实际执行，check 脚本可用于单段现状；registry 解析基准须先落文。**