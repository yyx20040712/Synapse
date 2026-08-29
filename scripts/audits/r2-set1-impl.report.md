# R2-SET1 实现者报告（zoom 三档界面缩放，2026-08-29）

## 实现摘要

uiScale 三档（small=1/medium=1.1/large=1.25）全链落地：schemas.ts 单源
（uiScaleSchema+UiScale+UI_SCALE+appSettingsSchema.uiScale default 'small'）
→App 挂载 load（失败容忍）+订阅→effect 单点写 documentElement `--ui-scale`
→theme.css `.app-content-row`（内容行整行 zoom，header 结构性豁免）+
`[data-page-column]` 三态通配 `zoom: calc(1 / var(--ui-scale, 1))` 反向补偿
（PDF 恒视觉基线）→SettingsPage「界面缩放」节三档 segmented（primary 高亮/
即时保存/toast/saving 禁点）。ipc/settings.ts 与 settings.store.ts 行为零改
（仅 DEFAULTS 一行类型必需适配，见自裁①）。

## 文件清单（逐文件+行数变化）

| 文件 | 变化 | 说明 |
| --- | --- | --- |
| src/shared/ipc/schemas.ts（受锁） | +8/-1 | uiScaleSchema/UiScale/UI_SCALE+appSettingsSchema.uiScale（预裁⑦单源） |
| src/main/ipc/settings.ts | +1/-1 | DEFAULTS 加 uiScale:'small'（自裁①：票面「零改」tsc 不可达） |
| src/renderer/app/App.tsx | +22/-2 | 挂载 load+订阅 uiScale+--ui-scale effect+内容行类 app-content-row |
| src/renderer/shared/theme.css | +16 | .app-content-row zoom + [data-page-column] calc 补偿（注释含探针依据） |
| src/renderer/features/settings/SettingsPage.tsx | +47/-2 | 界面缩放节+pickScale 全量 save+runSave 随行 uiScale；239 行≤250 不触发拆件 |
| tests/unit/ipc/settings.test.ts（受锁） | +30/-4 | 2 新用例（旧文件 default 兼容/set 持久化）+2 处既有形状同步（自裁④） |
| tests/unit/renderer/settings.store.test.ts（受锁） | +23/-7 | 透传用例 1+6 处 SettingsOk 实参形状同步（自裁④） |
| tests/unit/renderer/app-shell.test.tsx（受锁） | +44 | stubApi settings 域+变量两面用例（挂载档 1.1/save 变化沿 1.25） |
| tests/unit/renderer/theme.test.ts（受锁） | +24 | CSS 文本锁 2 条（正则锚定声明形态——自裁③） |
| tests/e2e/smoke.spec.ts（受锁） | +44 | R2-SET1 UI 链用例（nav rect ×1.25±2px+header 恒 44；**只写未跑**，按令主控统一） |
| docs/invariants.md（受锁） | +1 行 | INV-39 登记（最高编号续号） |
| scripts/audits/r2-set1-forensics.mjs（新增，属受锁 scripts/*.mjs 面） | 新文件 ~250 行 | 三档真机取证（manifest 未登记——主控收口 locks:generate+apply） |

## 首红路径

scripts/audits/r2-set1-tdd-first-red.raw.txt（全量套跑口径，Node 24）：
7 红/904 基线绿（911 总）——ipc 3（含形状改动用例）/app-shell 2/theme 2。
绿证：r2-set1-tdd-green.raw.txt 与终测 r2-set1-final-test.raw.txt 均
**911/911 passed，exit=0**。

## 变异红证四方向（文件备份法：cp→变异→定向测→cp 还原→diff 确认空）

| 方向 | 路径 | 红行摘录 |
| --- | --- | --- |
| ①default 摘除 | r2-set1-mutation1-default-removed.raw.txt | ×「旧 settings.json 无 uiScale：get 走 zod default 填充 small（非 fallback）且既有字段保留」（fallback 吞 theme 断言杀） |
| ②UI_SCALE.medium 改 1 | r2-set1-mutation2-medium-is-1.raw.txt | ×「settings.uiScale=medium：挂载后 documentElement --ui-scale=1.1」 |
| ③calc 补偿摘除 | r2-set1-mutation3-calc-removed.raw.txt | ×「[data-page-column] 恒补偿声明在场（PDF 页列恒视觉 1.0）」 |
| ④App setProperty 摘除 | r2-set1-mutation4-setproperty-removed.raw.txt | ×变量两面用例（挂载+save 变化沿）均红 |

还原安全：四方向均 diff 备份=空确认（输出 RESTORED-OK）。

## vitest 终数

**911 passed (911)** = 基线 904+新增 7（ipc 2/store 1/app-shell 2/theme 2），
exit=0（Node 24.9.0；本机默认 v25 未用）。

## 取证产物（⑤b/⑤f：真实库副本实景三档遍历，无头）

- 脚本：scripts/audits/r2-set1-forensics.mjs（真实库拷贝配方=r2-ui1 先例；
  PDF 兜底工厂=r2-set1-probe.mjs 逐字复用含 %PDF-1.4 头——真实库有文献，
  fallbackSeeded=false 未触发）
- 产物：scripts/audits/r2-set1-out/（F-small/medium/large/settings.png
  +r2-set1-forensics.json）；run 日志 r2-set1-forensics-run.raw.txt exit=0
- 实测（真实文献 595px 宽 PDF）：headerH 三档恒 **44**（豁免锁）；nav 高比
  **1.100000/1.25 精确**；canvas rect 三档恒 **595×793（maxDrift=0）**、
  backing 恒 595（无位图拉伸）；colComputedZoom 1/0.909091/0.8（calc 补偿
  在效）；--ui-scale 变量 1/1.1/1.25（App 链）；textLayer 对位
  spanInCanvasX 三档恒 425.54（±0.01 浮点——对位不破坏）
- 多模态复评（F-medium.png）：PDF 锐利无变形、nav 可读无溢出、toast
  「界面缩放已保存」可见（INV-02）；复评存疑点「右上角三键疑似缺失」判定
  为缩略图分辨率误判（headerH=44 恒定实测+SH3 e2e 基线锁三键可见可交互，
  三键在 header 内不受内容行 zoom 影响）

## 自裁申报

1. **settings.ts DEFAULTS 加 uiScale:'small'**（+1 字段）：票面「ipc/settings.ts
   零改」字面不可达——z.infer 对 default 字段输出必填，缺字段 tsc 红。一行
   最小适配，行为零变（DEFAULTS 引用比较/写回语义不变）。
2. **点档/runSave 组装全量三字段发送**：register 对 set Req=完整
   appSettingsSchema 做 strict safeParse（INVALID_REQUEST 拒单字段 patch），
   且缺省字段被 zod default 静默填 'system'/'small' 抹掉现值（改邮箱保存会
   静默重置档位）。票面「save({uiScale})」单字段形态不可达，采 UI 层组装
   全量（settings.store/api-surface/ipc 零改约束下的正解）；SettingsPage
   两处注释已说明。已登记 INV-39。
3. **theme.test 断言首版 toContain 被注释字样救活**（变异③首跑 47 全过
   存活——探针依据注释含同串）：修正为正则锚定声明形态
   （`\[data-page-column\]\s*\{[^}]*zoom:\s*calc…`），复跑变异③红。
4. **既有受锁断言形状同步**（票面扩测授权面内）：ipc settings.test 2 处
   set 调用/toEqual 加 uiScale；settings.store.test 6 处 SettingsOk 实参加
   uiScale——均为 schema 扩字段后 typecheck 必需，断言语义不变。
5. settings.store 透传用例首跑即绿：锁既有 store 行为（Partial 透传零改）
   的回归锁，其变异杀伤面在②/④（UI_SCALE/App effect），非该用例职责。
6. App 挂载 load 失败静默 catch（默认档兜底）：挂载链非用户触发；设置页
   自身 load 失败 toast 可见（INV-02 用户面不缺），App.tsx 注释已声明。

## 疑虑

1. lint 1 error=scripts/audits/r2-set1-probe.mjs:117（主控探针遗留未跟踪
   文件的 no-unused-vars）——禁改令内未触碰，本单面 lint 零红。
2. locks:check 现红（主控探针未登记+本单受锁改动+新 forensics.mjs 未
   generate）——按令不 apply，主控收口统一 locks:generate/apply。
3. e2e R2-SET1 用例只写未跑（按令）；typecheck 已过（tsc 双 project 绿）。
4. 取证脚本兜底工厂分支未真实触发（真实库有文献）——代码路径在，无实景
   覆盖（如后续真实库清空可自然覆盖）。
