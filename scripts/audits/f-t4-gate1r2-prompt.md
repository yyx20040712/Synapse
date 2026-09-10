# 门一定点复核（R2 轮）——F-LINT-04-T4 回炉轮 1

你是门一对抗式审查员（定点复核+新破坏扫描位）。铁律：只读、逐条 ADDRESSED/NOT ADDRESSED、末尾总评。中文。

## 背景

你 R1 轮审 F-LINT-04-T4（C-4c var() 语义锚）B0/W2/N9 放行附条件。主控处置：条件 1（收口必办 verify/locked-change/raw 入库/行号 136/151 复核）——行号已由主控亲核自洽（sed 双点：App.tsx:136 setProperty/TextLayer.tsx:151 '--scale-factor'），其余=收口流程挂账；条件 3（A-2 AST 化追认）——主控收口时 registry 落笔追认。条件 2（两支红证）=回炉补证：

## 回炉指令（主控下发实现者 3 项）+回执

1. D-1 防漂移执法红证：tmp css 定义 `--ghost-only: 1px`+同文件引用 → 应红。回执：exit=1，violation 含 --ghost-only（D 集仅认 theme.css=执法实证），raw=f-t4-red-d1.raw.txt，删件。
2. D-2 块注释剥离正向：css 内 `/* var(--ghost-block) */` → 应不红。回执：exit=0，删件后复绿 exit=0，raw=f-t4-red-d2.raw.txt。
3. 报告 §3 矩阵补 D-1/D-2 两行+§7 补第 9 项自裁（postcss 错误信息截首行——R1 C-3 知悉面事后补报）。回执：全部更新。

## 复核材料（内联）

```
=== f-t4-red-d1.raw.txt（D-1 防漂移红证）===
  - C-4c var() 语义锚：--ghost-only 引用悬空（引用于 src/renderer/tmp-t4-d1.css）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS
exit=1

=== f-t4-red-d2.raw.txt（D-2 块注释不红）===
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0

=== 报告 §3 矩阵新增两行 ===
| D-1 | tmp-t4-d1.css 定义 `--ghost-only: 1px`+同文件引用 `var(--ghost-only)` | 红（D 集仅认 theme.css=防漂移执法） | exit=1，violation 含 --ghost-only ✓ | f-t4-red-d1.raw.txt |
| D-2 | tmp-t4-d2.css 块注释叙述 `/* var(--ghost-block) */` | 不红（块注释剥离正向实证——CSS 域唯一剥法；矩阵原只证 ts 行注释 R3） | exit=0 ✓（删件后复绿 exit=0） | f-t4-red-d2.raw.txt |
> D-1/D-2=门一 Kimi W 级两支回炉补证（2026-09-10 回炉轮 1——防漂移执法路径+CSS 域块注释剥离正向）。

=== 报告 §7 第 9 项 ===
9. **[回炉轮 1 事后补报]** postcss 解析失败信息截首行 `String(e.message).split('\n')[0]`（与第 6 段既有 violation 形态同口径）——门一 C-3 知悉面，补报入册。
```

## 复核点

1. D-1 是否闭合你的 W（D-1 防漂移红证缺失）——注意回执 raw 中 violation 文案含引用文件名（tmp-t4-d1.css）且该文件自身定义了 --ghost-only（定义在他 css 不进 D=单源执法——语义正确性）。
2. D-2 是否闭合你的 W（D-2 块注释剥离无红证）。
3. 报告补报是否诚实完整（§7.9 是否与 diff 实物一致——你 R1 已见 diff 中该行）。
4. 回炉是否引入新破坏（回炉只加证据件+报告节，实现 diff 零变化=回执声称——从证据自洽性判断）。

输出：逐条 ADDRESSED/NOT ADDRESSED+统计+总评（收口放行/再回炉）。