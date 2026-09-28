# INV-61 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-61 | 字号档位语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册（**T3-P2 档位增补**：+--fs-signature 18px=顶栏 wordmark 签名——值源 docs/design/2026-09-26_theme-trio-final-design.md §1 用户四轮裁决后规格；**T3-P3 档位增补**：+--fs-metric 16px=规格表抽屉四格指标读数/+--fs-nano 9px=后置章虚线徽标——值源=mockup L311 .postpone（脉络后置章语汇同源，门一回炉 d1-W4 补注）；11.5/10.5px 两半值按 ≤0.5px 归并先例入 caption/micro 档） | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS 正则全域负锚（font-size 声明值段内 数字+单位 字面量归零——新值/无分号/大小写/非 px 单位/calc 载体五通道闭合；font 简写/冒号前空白/无单位零=已知边界不入锚；2026-09-09 F-CSS-02 升级+回炉 1）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
