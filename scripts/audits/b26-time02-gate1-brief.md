# F-TIME-02 门一审包（batch 26 增补二）

岗位：门一 gate1-reviewer（对抗式隔离一审）。diff 全文=scripts/audits/
b26-time02-gate1-diff.patch（3777 行 35 文件，+522/−1547 净 −1025）。实现者报告
=b26-time02-impl-report.md（含 §⑤ 自裁 10 条）。基线锚=b26-time02-impl-baseline.log
（EXIT=0：170 文件/1744 用例/指纹门 187·1789·5411·skip15/locks 379/open 5）。

## 票面（registry F-TIME-02）

阅读时长功能移除（用户裁决 2026-09-19 第六档——查证 Zotero/Mendeley/EndNote/
ReadCube 均无内置时长统计，条件成立；裁决档=relay.md batch 26 增补二）。
删计时器+落库链（009 DROP COLUMN）+显示行；页码链零触碰+outbox 机制保留
（P7X-02 页码三收尾口通道）仅删时长载荷；受锁面重 [locked-change][test-refactor]。

## 改动面（35 文件）

- U1 删除件×6：reading-time.ts（计时器本体删净）/reading-time-format.ts/
  reading-time.test.ts/reader-time.test.ts/papers-reading-time.test.ts/
  reader-reading-time.spec.ts（共 −829）
- U2 新增 009 migration（DROP COLUMN reading_seconds）+migrate.ts v9 登记
- U3 renderer 改造：setup（outbox 页码通道装配件+useReaderProgressOutbox 改名）
  /outbox（OutboxEntry 删 seconds+send 二参）/outbox-store（向后兼容）/ReaderPage/
  PaperDetailPanel（删阅读 Row）
- U4 落库链：shared paper.ts（readingSeconds 删）/schemas（secondsDelta 删）/
  papers.repo（第三参删+SQL 单参）/papers.queries/reader.service（透传删）
- U5 测试面：migrate-reading-time 双跳链改写/outbox 页码面+兼容新用例/e2e replay
  改存页码半边/**contracts/schemas.test.ts+migrate.test+lineage-tags 三件超预列
  配套**/fixtures 7 件
- U6 登记：INV-57 退役注记/registry G5 file 锚随迁/exemptions 17 条/
  **指纹门基线再生成**（187·1789·5411·skip15→183·1768·5368·skip14）+diff 审计

## 主控追认（实现者中途申报两起，处置已先行——审包核其正当性）

- ①contracts/schemas.test.ts 超预列：删 schemas secondsDelta 后 strict schema
  拒收该字段→:312 专测改写为「已移除=strict 拒收」负断言（原三点界测试对象
  消失）；机械必然无裁量空间
- ②FILE_MISSING 无豁免通道（check-test-surface judge() b&&!c 分支不查豁免）→
  整文件删除唯一机检绿径=基线再生成+全量 diff 审计（INV-63 口径/G11 先例）；
  版本上探两件（migrate.test [1..8]→[1..9]+lineage-tags user_version 8→9）
  =P7E-05 v8 上探同型先例

## TDD 证据（供核）

- 定向回归 53 文件/546 用例绿（首轮假红=ABI 绑定态，切 node 绑定后绿）
- 指纹门三段链：predelta 红 21（4 FILE_MISSING+5 MISSING_CASE+12 MISSING_ASSERT，
  与授权删除面逐条对齐零意外面）→豁免后余 4 FILE_MISSING→基线再生成绿
- 变异 M1：PaperDetailPanel 加回 formatReadingTime→TS2307 EXIT=2→还原 diff 空
  →复绿；M2：migrate v9 登记移除→4 断言级红（expected 10 to be 9 族）EXIT=1
  →还原→10/10 绿（首轮 M2 因 ABI 红因错位作废重做——诚实申报）
- 终跑 verify EXIT=0（167 文件/1724 用例=Δ-3 文件/-20 用例对账；open 5=
  F-TIME-02 预期；locks 376；build 绿）

## 主控拷问点（重点对抗）

- K1：**基线再生成+豁免双轨**——predelta 21 红与授权面逐条对齐是否真零意外；
  豁免 17 条（case 5+assert 12）reason/rulingLink 形态；新基线四数字
  （183·1768·5368·skip14）与删除面算术对账
- K2：contracts/schemas.test.ts 改写——负断言「strict 拒收」是否等效锁住
  「secondsDelta 不复活」（比原三点界更弱还是恰好）
- K3：outbox 向后兼容——旧 localStorage 条目（含 seconds）replay 路径：
  isEntry 宽容度/未知字段忽略/兼容新用例断言强度
- K4：009 DROP COLUMN+migrate v9+migrate.test/lineage-tags 上探——迁移链完整性
  （008 加列→009 删列双跳）；SQLite DROP COLUMN 版本前提
- K5：**页码链零触碰**——scroll-progress/reader.store/saveProgress page 面/
  spView dispose 页码尾账改道是否原样；setup 改名（useReaderProgressOutbox）
  后装配面行为等价
- K6：净 −1025 对账+删除 6 件行数和+改造面±数（numstat 复算）
- K7：registry G5 file 锚随迁（done 票锚指向被删文件——豁免还是随迁，规则依据）
- K8：e2e replay 改存裁量（页码重放承重+旧 seconds 注种=兼容直证——断言强度）
- K9：INV-57 退役注记形态（保留历史行+退役标注 vs 删行——受锁册纪律）
- K10：useReaderProgressOutbox 改名面（简报说件名保留防扩大——setup 内导出名
  改了，ReaderPage/main.tsx 消费面随动是否零遗漏）

## 审计要求

逐 hunk 断言（删除面=「删净无残留」+保留面=「行为等价」双判）；计数独立复算；
B/W/N 分级+总判（PASS/PASS_WITH_WARNINGS/FAIL）；结论给主控处置。
