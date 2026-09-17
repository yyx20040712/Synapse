# F-TESTREF-W1C + F-TESTREF-W2 门一审简报（b4 同火两票）

> 审计域：tests/e2e/** + playwright.config.ts + package.json（scripts 段一行）。
> 红线：C 面（指纹门）零变化；src/** 零改动（范围闸）；净删记账。

## W1C：e2e 脚手架单源收敛

### 实施面（全部脚本实测口径）

| 收敛面 | 票面口径 | 实测 | 处置 |
| --- | --- | --- | --- |
| launch 本地副本 | 5 副本 | 5 文件（smoke 内联 6 处调用+4 spec 函数级副本） | 全删，import e2e-env |
| seedPaperRow 定义 | 5 定义处 | 4 spec 本地（runSeedScript+seedPaperRow 成对）+e2e-env 单源 | 4 定义全删 |
| seedPaperRow 引用 | 15 引用文件 | 15（14 spec+e2e-env 本体） | import 统一 |
| 第一跳 500ms→close | 12-15 spec 复制 | 14 文件 20 块（ai-notes-section ×2） | 全换 bootstrapMigrations(userData) |

e2e-env.ts 净变化：+bootstrapMigrations(userData) helper（launch→firstWindow→500ms→close
原配方逐字收敛）+头注更新（Rule of Three 注记改 W1C 收敛口径）。71→82 行（wc -l 实测）。

### 语义保真声明（逐项）

1. 单源 launch/seedPaperRow 与 4 spec 本地版逐字同构（reader-text/corpus-export/
   reader-scroll 参数化 id；reader-search 硬编码 'e2e-seed-p7e03'——调用点显式
   补第 5 参保真）。
2. bootstrapMigrations=原三行块的逐字收敛（500ms 不变、close 不变、无额外语义）。
3. smoke 内联 6 处 electron.launch（两种 env 展开形态）→ launch(userData) 同构。
4. import 清理面：删各文件随之不用的 spawn/copyFile/readdir/readFile/writeFile/
   electron；**readFile 在 corpus-export 测试体后部有 6 处真实消费——保留**
   （逐文件 grep 实证后定去留）。reader-text 的 `app.evaluate((electron) => …)`
   回调参数 electron 系 Playwright 注入非 import——import 里的 electron 删
   （lint no-unused-vars 实证后清）。
5. C 面：test()/test.describe() 标题+expect 断言文本零改动（指纹门 ⊇ 判定机检）。

### C 面零变化三重证据

- 指纹门：179/1623/4979/15 base=cur 全同（test-surface:check 绿，无豁免）。
- 变异红证：smoke 断言值变异（Synapse→Synapse__MUTATED__）→指纹门
  MISSING_ASSERT ×2 红（12/118 行）→cp 备份还原→diff 零残留→复绿。
- e2e 全量真跑：npm run test:e2e（旧 config 全量 44 用例含探针）退出码=
  **0（44 passed，2.1m）**（raw=scripts/audits/w1c-e2e-full.log，E2E_EXIT=0 落盘）。
- e2e 默认门真跑（W2 落盘后补——门一 N1 处置）：`--project=app`=
  **42 passed（1.9m）EXIT=0**（raw=scripts/audits/w1c-e2e-appgate.log）。
- e2e 一键全跑真跑（W2 落盘后补——门二 P1-1 处置）：`test:e2e:all`
  （app+probe）=**44 passed（2.1m）EXIT=0**（raw=scripts/audits/
  w1c-e2e-allgate.log——probe project 运行通道终态活证）。
- 变异红证 raw 落档（门一 N5 处置）：scripts/audits/w1c-mutation-raw.txt
  （MISSING_ASSERT ×2+MUTATION_EXIT=1）。
- 注释修正（门一 N4 部分处置）：z-r2e/z-wg1 两处「探针自带副本，不 import
  spec」语义失效注释改指单源——改动后指纹门复绿。

### 净删记账（分域实测——门一 W1+门二 P1-2 处置修正）

git diff --stat 分域（初版简报误用聚合行 17 文件 +73/-352——含 relay.md 认领
+3/-3 与 W2 面，口径混淆；门一勘误分域、门二终态复测再勘误——分列数字含
N4 注释修正 +2/-2）：
- W1C tests/e2e 域：16 文件 **+72/-351，净删 279 行**（门二双路闭合：
  全 patch +108/-374-非测试域 +36/-23=-266=tests 域 -279）。
- W2 面（playwright.config.ts+package.json）：2 文件 +15/-2。
- locks/manifest.json：+18/-18（sha 重算）。docs/handoff/relay.md：+3/-3（认领机制行）。

## W2：探针 spec 移出默认门

### 实施面

- playwright.config.ts：+projects 拆分——app（testIgnore=/z-.*-probe\.spec\.ts$/）
  +probe（testMatch 同式）。**spec 文件零改动**（@probe 标签形态会动 test() 标题
  即动 C 面——弃用，选 project 形态）。
- package.json scripts：test:e2e → `--project=app`（默认门不含探针）；
  +test:e2e:all → `--project=app --project=probe`（一键全跑，反模式防：移出后
  flake 复发无捕获面——宪章 §4-W2 对策）。
- CI（.github/workflows/ci.yml:74 `npx playwright test` 无过滤）：project 化后
  默认跑全部 project，CI 行为不变仍含探针捕获面。

### 验证证据

--list 对拍（playwright 静态列举，零启动）：
- app：42 用例/15 文件，探针文件零出现（末行 workspaces+zcode-link）。
- probe：2 用例/2 文件（z-r2e-probe+z-wg1-probe 各 1）。
- 全：44 用例/17 文件（42+2=44，与 F-GEOM-01 验收口径「e2e 44」一致）。
- forbidOnly：config 顶层声明未动，两 project 均承袭。

## 自裁申报（超票面决定，主控处置）

1. e2e-env.ts 头注重写（Rule of Three 注记改 W1C 口径）——注释面，无行为变化。
2. 注释措辞改动实为两处（门一 N3 勘误——初版多报）：reader-search 头注 crib 行
   指向单源；corpus-export 第一跳行内注释标注单源。reader-scroll/reader-text
   注释零改动。
3. smoke 的 import 追加（launch）放在 API_SURFACE 行后——文件内排序合规。
4. package.json 变更仅 scripts 段两行（test:e2e 改+test:e2e:all 增），无依赖变更
   （[dep-change] 尾注随宪法 package.json 变更条款带）。

## 验证终态（门一后处置面并入后复验）

- verify 全链退出码=**0**（locks:apply 后复跑；首跑红因=locks:check 拦 manifest 未重算——unlock→改→apply 预期序非缺陷，raw=w1c-verify-full.log 红/w1c-verify-full2.log 绿/探针注释修正后 w1c-verify-full3.log 终绿）。
