# SR2-F-08 门二终审档（三屋模式第三屋——门二子代理产出全文，主控转落）

> 总评：**PASS**（零实现回炉项）。审计人：门二终审子代理（只读）· 2026-08-29。
> 处置核对：门一 4W/7N 逐条 vs 终态实物——无「说了没改」；W3 四路攻击成立
> （修=违 P4；声明语义自洽性反证 F-07 才是视觉-状态分离；登记落点=invariants.md
> 宪法强制+ADR 辅记；残余风险归真机复评显式确认）。
> 母本符合度：五层全吻合（::selection 与官方 678-685 逐字一致/五处摘除净/
> P4 四零触碰/e2e 三段逐字吻合）；宪法红线零触碰（分层/受锁/安全/行数 226/
> UTF-8/TDD 四档——还原过程输出未落盘=W2 轻警告不推翻）；机器面：858=859−1
> 数理一致、locks hash 时差实锤（收口 apply 解除）、翻 done 推演闭环（规则 4
> 只查 open/4b 无残留 grep 实证）。
> 成本账本：实现者 1,951,408 tok/577s；门一 474,527 tok/339s；门二 ≈5.5×10^5 tok/≈330s。

## 收口放行条件清单（主控动作序列——已按序执行）

1. f1-forensics2.mjs 不再改（rm 已删净，门二亲验）✓
2. `npm run locks:apply` 重算 manifest（同步 forensics2 新 hash+v4 复评器入锁）→ locks:check 绿
3. registry SR2-F-08 open→done → tickets:check 转绿
4. 全量 verify 真退出码=0（七环全绿）
5. `npm run test:e2e` 全量首跑（受锁 e2e 改动后兜底+::selection 序列化实测）
6. 真机复评 v4（selection-rects 不在场+蓝色 tint 差分>0+工具条≤1.5s+拖选即时 tint+
   Esc 残留观察+重叠暗绿观察——勿用旧 3/3b 当复评器）
7. W3 登记：invariants.md（主）+ADR-0019 后果补记（辅）
8. 提交面自查：6 diff 文件+ADR+4 取证脚本（须随 manifest 入库）+v4 复评器+报告/
   票面/三屋审计档；[locked-change] 尾注；显式列文件禁 git add -A
