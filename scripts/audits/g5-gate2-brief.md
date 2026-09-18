# G5 门二简报（batch 17 · F-GEOM-01-G5）——随派发 prompt，事后落档

> 裁决岗：ops-adjudicator（deepseek-flash $max）。门二=实证终审：对证据与发现
> 逐条终裁、独立复算关键数字。可读证据件=scripts/audits/g5-*（含 raw 变异/
> 终验/补链六 log+三门审档+diff patch）+工作树源码+registry+manifest+板。

## 输入摘要

- 票面：tickets/registry.ts:296 F-GEOM-01-G5（M2=time/ 4 件目录化迁移，
  [locked-change][test-refactor]）；设计书 §3.4 M2 行+§3.1 域序图。
- 实现：4 件 829 行 mv 至 reader/time/（rename 100/100/95/99）；改写 12 行
  （深度 5+消费 3+注释 1+tests 3）；locks 345 恒定（manifest=时间戳+两 sha）。
- 门一（k2/zipoo 承载——用户指令 k1 周额度封顶）：PASS_WITH_WARNINGS
  B0/W3/N5——W1 终跑放行硬条件/W2 提交面白名单/W3 变量法取证；N1 注释旧名
  残留（主控已处置：format:4 同行二次改写，随本审包呈）。
- 验证：基线 verify EXIT=0（206/open 16/locks 345/test 170/1744/指纹
  187/1789/5411）；迁移后七关卡独立取证全绿（tickets 红=registry 两行旧径，
  主控收口职责）；构建哈希三方恒等（D3egZtl2.js 1,392.72 kB 跨 G4 master→
  本批基线→迁移后）；变异红证 M1（TS2307 EXIT=2→还原→typecheck 复绿）+
  M2（Failed to load url EXIT=1→还原→17/17 复绿+复锁）。
- 实现者自裁 4：open 17→16 时点滞后/verify.log 伪 EXIT 勘误/M2 额外锁轮/
  M1 单关复绿。

## 终裁清单（八项）

1. 零行为断言终裁（抽读等价性）；2. 关键数字独立复算（829/345/manifest 面/
   3 行/指纹门/raw 通过态）；3. 变异红证链抽查（EXIT 物理在档）；4. 构建哈希
   三方口径时点；5. §3.1 单向独立复跑；6. 门一 W1/W2/W3+N1 处置充分性；
   7. 自裁复核；8. 收口清单预核（registry 2 行随迁+翻 done+终跑变量法+单提交
   [locked-change][test-refactor]+health-scan+账本+板 20→21）时序形态。
