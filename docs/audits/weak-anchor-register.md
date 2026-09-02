# 弱锚清单（集中登记——2026-09-02 文档群维护场立册）

> **为什么存在**：体检场发现（Kimi 报告 §3.1+GLM 终裁采纳）——最危险的
> 欠账不是声明级「部分锚定」（INV-02/11/13，体检评估低风险），而是
> **「已锚定」状态掩护下的锚点自声明之洞**。本册集中登记，防止弱锚在
> 「已锚定」掩护下被遗忘；作为 AUDIT-B/D 启动与后续补强票的输入面。
>
> 登记规则：①只收「状态=已锚定但锚点有洞」的条目（INV 册状态列弱锚备案
> 的集中镜像+体检/审核新发现）；②每条给洞描述/现有防线/处置关联；③
> 补强落地后在本册销项（移入已核销段）+INV 册状态列同步去弱锚注记。
> 边界：INV-02/11/13「部分」锚定三条不收（INV 册状态已如实标记，体检
> 评估=当前技术上限内接受）。

| # | 条目 | 洞 | 现有防线 | 处置关联 |
| --- | --- | --- | --- | --- |
| W-1 | INV-16 pdfjs import 白名单 | ESLint no-restricted-imports 对 dynamic import() 检查依版本而异——非白名单文件动态直连可能不拦 | static import 机器锚+架构评审面 | 观察（架构评审面覆盖；引入新动态 import 时评审点检） |
| W-2 | INV-19 存储独立（2026-09-02 升格注记） | 「数据永不写 annotations 表」无专门断言——repo 零耦合头注契约+实现 diff 证明，非持续机器锚 | repo schema 类型面+头注契约+ai_notes.repo.test（ai_notes 表自身行为） | 观察（写路径唯一性由类型面承载；ai_notes 域再改动时点检） |
| W-3 | INV-42 N6 选择模式点击 rect 零副作用 | 真机「点击 rect 零副作用」未直测——靠 pointer-events+hitTest+jsdom 守卫三层推断 | jsdom 守卫（selection-mode.test）+pointer-events 计算样式 | **AUDIT-C 票 C-2①**（真机直测补锚） |
| W-4 | INV-43 lineage fit 回退分支 | clientWidth\|\|rect.width 回退分支真机不可达性未证（受锁测试只 stub gBCR） | 真浏览器有布局恒走主路径（理论）；④数学锁嵌套复合 | 观察（M3 型 fit 消费点 jsdom 不可达由探针 A 门锁——F-L2 回炉在档） |
| W-5 | INV-44 ①断言弱于注释 | ⑦「二次 fireRO」断言弱于注释语义（N-r1 备案） | ⑦用例存在（弱形式） | 观察（注释与断言的语义差在档；改注释或加强断言随 lineage 域改动搭车） |
| W-6 | INV-44 ②探针脆性 | f-l4-verify.mjs 固定 waitForTimeout×6（800/1500/600/900/1200/900）——CI 慢机误报风险 | 无（固定等待即风险源） | **AUDIT-C 票 C-2③**（轮询化+grep 判据；顺带核备案③） |
| W-7 | INV-44 ③初始 fit 路径覆盖 | 挂载初始 fit 的 clientWidth 直取路径仅由 RO 端覆盖（r1-N2） | RO e2e 端到端覆盖 | 观察（随 C-2③ 同文件核） |
| W-8 | INV-45 末行单盒真机面 | 真库无奇数页文献——末行右盒缺席的真机形态由单测 DOM 断言代锁 | reader-double-page.test ③ DOM 断言 | 观察（真库出现奇数页文献时真机面自然补齐） |
| W-9 | F-ARCH4-M1 root.contains 可达性 | selectionToAnchor 的 root.contains 防线在 jsdom 结构性不可达（Selection.addRange 规范化反向 range）——真浏览器可达性未锚，e2e 无反向选区用例 | 无（结构性盲区） | **AUDIT-C 票 C-2②**（e2e 反向选区用例定性） |
| W-10 | SR2-AI-12 W3 七问文案值锁 | 键集断言拦键漂移不拦值漂移——文案值变化无锁 | ai-note-style 单源（结构防线） | 观察（文案改动时人工比对；lint 化随 INV-11 机器锚立项） |

## 已核销

（空——首版立册 2026-09-02；补强落地后移入此段并注明核销场与证据锚）
