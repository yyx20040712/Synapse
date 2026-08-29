# R2-SET1 开工记录(2026-08-29,主控会话)

> 任务:zoom 三档(小 100%/中 110%/大 125%)。来源:handoff-v7 决3(用户
> 「R2-SET1 字体:zoom 三档…根容器 zoom;PDF 画布是否跟随开工时实证,
> 跟随则阅读区豁免」)+handoff-v8 执行序 2(含 E5 caption 豁免裁决)。

## 1. 技能清点(会话开工纪律)

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| subagent-driven-development(三屋) | **用** | SET1 中票(schemas 受锁+行为面+实证面),三屋走 SH3 同型 |
| test-driven-development | **用** | 实现者红→绿→变异红证 |
| systematic-debugging | **已用** | 探针首跑「打开文献失败」——对照 e2e 同配方通过定界(环境 vs 探针),定位移植 PDF 工厂漏 %PDF-1.4 头,修正后四问全答 |
| verification-before-completion | **用** | 收口亲验 verify+e2e+locks |
| e2e-testing-patterns | **用** | e2e 断言面设计(rect 非 computed——探针实测 computed 对 zoom 无感) |
| frontend-ui-engineering | 局部参考 | 三档 segmented 皮肤遵循 theme.css 体系 |
| browser-testing/computer-use | 不用 | 无头探针已覆盖实证;前台保护规则 |
| code-review-excellence | 不用 | 门一/门二独立子代理承担 |
| 其余运维类 | 不用 | 无关联 |

配置自查:主控 GLM-5.3;子代理 general-purpose 逐个声明身份禁令;Node 24
口径(本机默认 v25 预存红)。

## 2. 开工实证(决策③明令——r2-set1-probe.mjs,产物 r2-set1-out-probe.json)

| 问 | 结果 |
| --- | --- |
| 内容行 zoom 1.1:header 高 | **44px 不变**(豁免生效;caption/顶栏观感保持,E5 解决) |
| 内容行 zoom 1.1:PDF canvas | rect 612→**673.2(×1.1 跟随实锤)**;背衬 765 不变=**位图拉伸模糊**→豁免前提成立(决策③「跟随则阅读区豁免」) |
| 子 zoom:1 能否豁免 | **不能**(673.2 不变——相乘语义,只能反向补偿) |
| zoom: calc(1 / 1.1) | **Chromium 接受**(computed 0.909091),canvas **精确恢复 612×792**;背衬匹配无模糊;textLayer 对位不受破坏(spanInCanvas 偏移正常) |
| computed fontSize | **对 zoom 无感**(nav 13.5px 不变,视觉已 14.85)——测试断言必须量 rect |

副产物:探针移植 PDF 工厂漏 `%PDF-1.4` 头致「打开文献失败」——对照法
(同配方 e2e 绿)定界后修正,证明探针环境与 e2e 等价。

## 3. 现场核查

- git:HEAD=d3655737(SH3);未跟踪=scripts/audits/f1-out 残留+本场
  r2-set1-probe.mjs/-debug/-out(后两者不入库)。
- 基线:verify 108 文件 904 用例/locks 171/e2e 27。
- 受锁面预估:schemas.ts、tests(unit ipc settings/settings.store/
  app-shell/theme.test)、e2e、invariants.md(登记)、scripts 取证 .mjs。
- 非受锁:App.tsx、SettingsPage.tsx(或新 UiScaleSection)、theme.css、
  ipc/settings.ts(预期零改)。
