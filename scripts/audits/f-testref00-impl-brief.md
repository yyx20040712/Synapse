# F-TESTREF-00 实现简报（主控→实现者，三屋模式第一屋）

## 铁律（先读，违反即作废）

1. 只读仓库+唯一可写=你的实现面文件与 scripts/audits/ 审计档；禁 git 提交/禁 registry
   翻状态/禁改本简报外文件。
2. TDD：门脚本自身行为先红后绿；九支变异红证（M1-M9）用 **cp 文件备份法**还原，
   禁 git checkout（会把未提交实现一并抹掉）。
3. 零新依赖：`import ts from 'typescript'`（树内已绑定，先例
   scripts/check-dup-constants.mjs:29）。node:fs/node:path/node:url 白名单内。
4. 文件 ≤500 行；超限拆 scripts/test-surface/ 子目录 lib（manifest 递归入锁已证）。
5. 中文注释 UTF-8；写文件显式 '\n' 行尾；全程 node:path join/relative（仓库根路径含
   中文）；基线 JSON 无 BOM、LF。
6. 不改任何 tests/** 测试文件（本票只建门不动测试——185 文件全受锁，解锁=另一票）。
7. 禁 TODO/FIXME/占位 字样（check-quality 扫 scripts）。

## 票面

- 工单 F-TESTREF-00（tickets/registry.ts 已立案 open）。
- 设计母本（**唯一权威**）：docs/design/2026-09-11_f-testref00-design-final.md
  （终裁=Kimi 原稿+deepseek 审核处置表——冲突处以终裁 §0 表与修正条款为准）。
- 背景链：docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
- 骨架已立：scripts/check-test-surface.mjs（头注规约=票面，实现时重写正文保留头注）。

## 交付件清单

1. `scripts/check-test-surface.mjs`（超 500 行拆 `scripts/test-surface/` lib+薄壳）：
   子命令 check（默认）/baseline（显式再生成，stdout 打 stats）/stats。
2. `scripts/test-surface.baseline.json`：check 首版基线（stats 输出落证据）。
3. `scripts/test-surface.exemptions.json`：空清单骨架 {version:1, entries:[]}。
4. package.json：`test-surface:check`/`test-surface:baseline`/`test-surface:stats`
   三 scripts + verify 串在 quality:check 之后插入 test-surface:check。
5. .github/workflows/ci.yml：lock-change-guard job 追加 [test-refactor] 范围闸分支
   （逐提交 git show --name-only 判路径白名单——白名单清单见设计定稿 §7；src/** 红）。
6. AGENTS.md 工单工作流段末追加 [test-refactor] 票类一行规约；
   docs/methodology.md §工单段追加同款一句（指向设计定稿）。
7. 证据件（scripts/audits/）：f-testref00-impl.report.md（报告契约见下）+
   stats 全量输出 raw + M1-M9 九支变异矩阵 raw + 基线首版 stats。

## 关键实现口径（易错点前置）

- 抽取域=tests/** 白名单 *.test.ts/*.test.tsx/*.spec.ts + 漏扫哨兵（非白名单
  .ts/.tsx 含 `\b(it|test|describe)\s*\(` → UNRESOLVABLE 红）。注意 tests/unit/
  renderer 下大量 .test.tsx 文件。
- guardedDescribe（tests/utils/guard.ts）：(静态 title, ticketId) 二元组建模，
  ticketIds 入 C 面；不用运行时展开标题。
- 体内条件 skip：三态（声明后缀=markers / 0 参或字面量真值条件=按新增 skip 红 /
  非字面量条件=skipSites 文本多重集双向红走豁免）。存量 15 处依赖门惯用法
  （test.skip(pending.length>0, `延期…`)）必须全部成功建模为 skipSites——
  stats 全量 UNRESOLVABLE=0 是验收硬项。
- it.each 三处（tests/unit/renderer/theme.test.ts:171,366,490）：const 单跳解析
  （TOKENS 模块级/DURATION_COUNTS 与 FS_CSS 回调内 const——作用域内单跳均可解析；
  有限定：const+ArrayLiteral+字面量元素，赋值/更新/遮蔽 → 保守红）；标题占位符
  printf 形态；非静态消费位替换 `⟨nse:源文本⟩`；DURATION_COUNTS 第 1 位消费的
  css/wsCss 等为非静态位——标记替换后行计数仍入多重集。
- 断言单元=最外层 expect 调用 getText 空白归一，全记不去重。
- 签名比对=同 key 下 JSON(assertions+markers+skipSites 排序) 多重集计数 ⊆ 判定。
- exit code：0 过 / 1 契约违背或 UNRESOLVABLE / 2 基线缺失损坏（硬阻断禁自愈）/
  3 豁免 schema 非法。
- Windows：路径统一 POSIX 化入基线（sep→'/'）；Git Bash 下 node 直跑。

## DoD（全过才算完）

- [ ] stats 全量跑：185 文件抽取成功、UNRESOLVABLE=0、skipSites=15、each 展开行数
      落盘（数字进报告，禁凭印象）。
- [ ] check 首版基线生成 → check 复跑 exit 0。
- [ ] M1-M9 九支变异红证全过（cp 备份法还原，diff 确认空）。
- [ ] npm run verify 全链绿（含新 test-surface:check 已入链）——真退出码落盘。
- [ ] npm run locks:generate && npm run locks:apply（新件+可能拆分件全入册）。
- [ ] grep 无 TODO/FIXME/占位（含新写文件）。

## 报告契约

全文落 scripts/audits/f-testref00-impl.report.md：实现摘要/文件清单（逐件行数）/
stats 数字/九支变异矩阵结果逐支/verify 尾部 raw/locks 实录/自裁申报（一切超票面
决定+删减面 diff 自查）/疑虑。回复五行内。
