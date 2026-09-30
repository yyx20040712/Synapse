# F-MIGR-01 全案 —— 迁移 012 同名退让二重撞 UNIQUE 修复（2026-09-30）

> 票：tickets/registry.ts F-MIGR-01（open→done）。复审 P1-1 立案（晨间复审报告
> =E:/zcode_md/synapse-archive/scripts-audits/2026-09-30-morning-review/report.md）。
> 修复路径裁决=用户 2026-09-30 亲选**案 a 改 012 本体**（三案呈报：a 改本体
> [单用户未分发论证]/b 执行器前置探测/c 013 补丁[对在途升级无效]——v87 §3 在档；
> 复审报告「012 已提交不可改」口径经用户裁决突破）。

## 一、缺陷与影响

- 位置：src/main/db/migrations/012_folders_graphs.sql:5（原直拼退让）+
  001_init.sql:44（collections.name TEXT NOT NULL UNIQUE）。
- 场景：存量 v11 库同存「主图」与「主图 (主图)」两 collections 行（导入子目录名
  可构造——import 按子目录名 upsert 名字任意）→012 退让 UPDATE 产出第二个
  「主图 (主图)」→UNIQUE 违例→012 事务整体回滚→**该库永远无法升级到 12**
  （fail-closed 无数据丢失，但应用无法启动，报英文 SQLite 原文）。
- 测试缺口：原 migrate-folders-graphs.test 只覆盖无冲突态。
- 应急处置（用户本机真库启动报 SQLite UNIQUE 错即此因）：临时改名冲突集合后重启。

## 二、实现（恰四文件，实测 numstat +120/-4）

| 文件 | diff | 内容 |
| --- | --- | --- |
| src/main/db/migrations/012_folders_graphs.sql | +21/-1 | 退让改递归 CTE 冲突探测式唯一名 |
| src/main/db/migrate.ts | +2/-0 | 头注补单点例外声明（接缝化解） |
| tests/unit/db/migrate-folders-graphs.test.ts | +94/-0 | 四新用例+B 补两 squatter 断言 |
| locks/manifest.json | +3/-3 | 012+测试件 hash 同步（289 件） |

- **012 修复 SQL**：`WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM
  seq WHERE n<999), cand(idx,label) AS (SELECT n, CASE WHEN n=1 THEN '主图 (主图)'
  ELSE '主图 (主图) '||n END FROM seq), pick(label) AS (SELECT label FROM cand WHERE
  NOT EXISTS (SELECT 1 FROM collections c WHERE c.name=cand.label) ORDER BY idx
  LIMIT 1) UPDATE collections SET name=(SELECT label FROM pick) WHERE name='主图'
  AND id<>'__main__'`。
- 语义要点：①首选名与原直拼字节同构（无冲突态行为零变——既有「回填冲突」用例锚）；
  ②探测覆盖**全部**在场行（含 id='__main__' 异常残留行——executor 自裁加严）；
  ③name UNIQUE 保证被退让行至多一行+原名不在候选域（无自占）；④999 全占→pick
  空→SET NULL→NOT NULL 违例炸迁移=fail-closed 终态（与修复前同构，注释在档）；
  ⑤999 次探测走 name 唯一索引常数级（裁决部 R3 复算）。
- **migrate.ts 头注**：「单点例外（在档）：012 同名退让二重撞 UNIQUE修复
  （[F-MIGR-01] P1-1——用户 2026-09-30 裁决案 a，v87 §3）」——化解与「已合入
  迁移不可修改」硬规则的声明接缝，单点限定不开普遍口。

## 三、测试面（15/15=既有 11+A/B/C/D）

| 用例 | 形态 | 断言锚 |
| --- | --- | --- |
| A 双冲突 | 主图+主图 (主图) | 不炸+退让名='主图 (主图) 2'+squatter 不动+__main__ 名+版本 12 |
| B 三重 | +主图 (主图) 2 | 退让名='主图 (主图) 3'+两 squatter 不动断言[R1 补] |
| C __main__ 残留占名 | __main__ 行 name='主图 (主图)' | 退让避开首选得 2+残留行 DO NOTHING 原样[R1 补] |
| D 999 全占 | 999 候选名全蹲占 | toThrow /NOT NULL/+user_version 停 11+原名不动（零部分状态）[R1 补] |

既有 11 用例零改动（+94/-0 零删除行=机检级证明）；新用例平铺 describe 内
（always-active）。

## 四、门链实录

1. **executor**（session:host-tier，131 万 tokens）：首红（A/B 未修时 exit=1
   UNIQUE 炸——票面病灶复现）→定向 13/13→db 全组 111/111→变异 M1（回退直拼→
   A/B 红）/M2（seq 起点 1→2→既有「回填冲突」用例红=无冲突首选名真锚）/M3
   （摘 NOT EXISTS→A/B 红），备份法还原 diff 空+备份清零；前置探针 4/4；locks
   unlock→改→apply 闭环。自裁六项（计数勘正 10→11/探测面加严/squatter 断言
   加严/999 终态/migrate.ts 不在锁面/探针驻仓外）。
2. **门一 k1**：PWC B0W1N4——W1=999 终态与 __main__ 残留占名两行为面无入库锚
   （仅仓外探针背书）；SQL 语义五帧推演通过。N4=同型排查建议（主控亲跑闭合：
   全迁移目录 SET name 唯一命中=012）。
3. **门一 d1**：PASS B0W0N3——N1=__main__ 残留无锚（同 k1-W1 后半）/N2=999
   诊断性/N3=B 断言面窄。
4. **R1 主控亲执**：补用例 C/D+B 两断言（闭 k1-W1 双面+d1-N1/N3）；变异 M4
   （探测加 `AND c.id<>'__main__'`→恰 1 failed=C）/M5（上界 999→1000→恰 1
   failed=D），还原 diff 备份对照空+备份删；定向 15/15；locks 重锁+check exit=0。
5. **d1 单席复审（R1 面）**：PASS B0W0N4（降级申报——F-WS-02 先例；裁决部终裁
   认可合宪，单点约束=后续任一 R 轮若触及 012 生产语句或修改既有断言⇒恢复
   k1+d1 双席，本降级限本轮单点）。N1-N4 留档（B 断言无便宜判别变异/999 上界
   实已双侧闭合[M2 下界+M5 上界]/C 判别前提主控亲证成立/toThrow 机制耦合与
   票面终态一致）。
6. **probe 实证 7/7**（97 万 tokens）：树态恰四文件/定向 15/15/db 全组 113/113
   （=109+4）/locks:check 289 exit=0/变异复现（cand.label 直拼→A/B/C 红 D 绿
   ——**与派发预告 A/B/D 偏差**：裁决部独立复演证实预告笔误，该变异对 D 语义
   不可区分、A/B 红=核心面已锚）/独立 SQL 语义探针 5 形态全 PASS（无冲突/双/
   三重/__main__ 残留/999 全占 throw）/全迁移目录零同型。异常三笔在档：预告
   笔误/012 只读位拦截→chmod 复位核过（locks 阳性证据）/commit-graph 噪声。
7. **裁决部终裁 GO_WITH_CONDITIONS**：C1=计数口径实测统一（+120/-4——呈报包
   分项笔误经 numstat 实测闭合）；C2=归档完整包+顺带核（既有零改动+always-active
   双过）；C3=v88 记录+账本。独立复算 R1-R9 全闭合（含候选域 999 值/UPDATE
   行数≤1/探测常数级/变异红集五支逐场景复演）。

## 五、收口验证

- **verify 亲跑真值 EXIT=0：199 件/2219 用例**（v86 基线 2215+4 逐数闭合）。
  申报：verify 首跑因仓外日志目录不存在致重定向失败、后台退出码被尾随 echo
  掩盖（管道假绿形态在档）——主控识别后建目录重跑取真值，首跑作废。
- e2e 免跑申报：零 renderer/IPC 面触碰（U1 C3 先例——F-CONSOL-11）。
- 变异红证 M1-M5 全支+还原 diff 空+备份清零（executor M1-M3+主控 R1 M4/M5）。
- locks:apply 与提交同体（manifest 289 同步，[locked-change] 机检面）。
- 证据档案=E:/zcode_md/synapse-archive/scripts-audits/2026-09-30_f-migr01/
  （probe 矩阵 7 件+探针脚本+变异链+verify 两输出）+2026-09-30_f-migr01-* 五 log。

## 六、教训候选（待批）

- 变异预告应逐场景终态模拟或标注「预测，以实测为准」（probe 偏差处置=主动呈报
  +可复演归因，裁决部评=加分项非缺陷——O4）。
- 后台任务真退出码捕获：重定向前先确保目标目录存在；尾随 echo 会掩盖失败码
  （本批 verify 首跑实录）。
