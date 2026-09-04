# 门一 W1 回炉补充材料包（夜场 N 级清扫合批）

本包=W1 三新文件全文+台账 hunk+三条存疑澄清。代码零改动（纯补材料）。
请对补充面定点复核并给终裁（ADDRESSED/NOT ADDRESSED+新发现单列）。

## 存疑澄清（先答）

### 存疑1 F-G3「2 红」来源——RED 期两用例均红（函数不存在），变异期 1 红（如你的推演）
- night1-fg3-red.raw.txt = **RED 期**（实现前）：boundsToPersist 尚不存在，命名导入
  为 undefined → 两个新用例（maximized 取 normal+常态等值）调用即各抛 TypeError，
  **2 红=两个新用例各一**（4 passed=既有用例）。非变异档。
- night1-fg3-mutation.raw.txt = **变异期**（getBounds 化）：恰 **1 红=最大化用例**
  （常态等值用例按设计仍绿=行为零变旁证）——与你的数学推演一致。红证链自洽。

### 存疑2 leave-full-screen 回读时序——按「降级已知风险入台账」处置
Electron 文档语义：leave-full-screen 在窗口退出全屏后发射。处置=台账 F-G9 行增补
「leave 回读时序无真机验证（mock 单测锚的是回读语义非事件时序）；真机 F11 双击
验证留给在场场次」备注（见下方台账 hunk）。闲时场不做前台真机操作（纪律①）。

### 存疑3 locks 覆盖面——只锁 tests/shared/migrations/CI/lint/构建/脚本配置面，**不含 src/ 源文件**
故 import-gate.ts/UiScaleSection.tsx 两源文件无锁变动=机制内常态，非遗漏；
新增 tests/unit/main/import-gate.test.ts 已 generate+apply（240→241）。

## W1 三文件全文（依次）

