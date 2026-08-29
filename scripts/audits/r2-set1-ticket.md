# R2-SET1 票面:zoom 三档(界面缩放)——五层规约

> 来源:handoff-v7 决3(用户:「zoom 三档(小 100%/中 110%/大 125%,根容器
> zoom;PDF 画布是否跟随开工时实证,跟随则阅读区豁免」)+handoff-v8 E5
> (caption 豁免裁决一并做)。中票三屋(ADR-0017)。LOOP 会话票——禁触
> registry。开工实证已完成(r2-set1-open.md §2),票面预裁以实测为据。

## 行为层

### uiScale 状态机(三档)

| 档 | 值 | 语义 |
| --- | --- | --- |
| small(默认) | 1 | 现状 100%,零迁移 |
| medium | 1.1 | 中 |
| large | 1.25 | 大 |

- 迁移链:settings.json(无字段→zod default 'small')→App 挂载 load→
  `--ui-scale` 变量→CSS zoom 即时生效(无重启);设置页点档→save→store
  settings 替换→App 订阅重渲→变量更新。失败容忍:load 失败用默认档
  (INV-02 先例)。
- 课题切换 reload→App 重挂→load→档恢复(天然)。

### 豁免面(探针实测背书,r2-set1-out-probe.json)

- **header 结构性豁免**:zoom 挂内容行(nav+main 的父 div),header 在外
  ——实测 44px 不变;caption 三键/顶栏身份区保持系统观感(E5 裁决)。
- **PDF 页列补偿**:`[data-page-column]` 容器 `zoom: calc(1 / var(--ui-scale, 1))`
  ——实测 calc 被 Chromium 接受(computed 0.909091)且 canvas 精确恢复
  612×792 原始视觉+背衬匹配(无位图拉伸)+textLayer 对位不受破坏(探针
  Q2/Q4/Q6)。三态属性选择器通配(ready/loading/error)。
- **reader 自有页缩放正交**:pdf.js viewport scale(夹取 [0.5,3])与 CSS
  补偿相乘后 PDF 视觉只受前者——用户调 PDF 比例不受界面档影响。

### 断言面红线

computed fontSize **对 CSS zoom 无感**(实测 13.5px 不变而视觉 14.85)——
一切 zoom 效果断言必须量 getBoundingClientRect,禁查 computed font。

## 接口层

- `src/shared/ipc/schemas.ts`(受锁):
  - `appSettingsSchema` 加 `uiScale: z.enum(['small','medium','large']).default('small')`
  - 导出 `type UiScale = z.infer<...>` 与 `export const UI_SCALE: Record<UiScale, number> = { small: 1, medium: 1.1, large: 1.25 }`(数值映射单源)
- `src/main/ipc/settings.ts`:**零改**(schema 驱动,旧文件 default 填充自动兼容)
- `src/renderer/features/settings/settings.store.ts`:**零改**(Partial 透传已含)
- `src/renderer/app/App.tsx`:内容行 div 加类 `app-content-row`;订阅
  `useSettingsStore((s) => s.settings?.uiScale ?? 'small')`+挂载
  `load()`(失败容忍 catch);effect:
  `document.documentElement.style.setProperty('--ui-scale', String(UI_SCALE[uiScale]))`
- `src/renderer/shared/theme.css`:
  - `.app-content-row { zoom: var(--ui-scale, 1); }`
  - `[data-page-column] { zoom: calc(1 / var(--ui-scale, 1)); }`(注释标探针依据+对位安全)
- `src/renderer/features/settings/SettingsPage.tsx`:新节「界面缩放」——
  三档 segmented(当前档高亮;label 小/中/大+100%/110%/125% 说明;点击
  save({uiScale})→toast;saving 态禁点)。**若超 250 行拆
  UiScaleSection.tsx**(CorpusExportSection 先例)
- `docs/invariants.md`(受锁):登记跨模块不变量(见文化层)

## 架构层

- 类型单源:UiScale/UI_SCALE 只住 schemas.ts;App/SettingsPage import 复用禁手写
- SettingsPage ≤250 红线(现 196,超则拆节)
- 皮肤住类(B1 教训);zoom 值经 CSS 变量非内联 style(变量属数据通道)
- 分层:renderer→window.api 既有通道零新面
- **不变量登记**(宪法「跨模块行为不登记=未完成」):「uiScale 只缩放 HTML
  文本面(内容行);PDF 页列恒补偿至视觉 1.0;header/caption 结构性豁免」
  ——声明处=App.tsx/theme.css,强制方式=e2e rect 断言+CSS 文本锁,
  锚定 `--ui-scale`

## 生命周期层

- 旧 settings.json 兼容:zod default 填充(get 链自动,单测锁)
- dev/prod 同行为;无新依赖;无新通道
- 后续票接缝:U2'(脉络)节点/侧板文字在内容行内自动跟随档位(换行红线
  核查面含大档 125% 下溢出检查——U2' 票面引用)

## 文化层(测试=TDD 红→绿→变异红证)

- 扩 `tests/unit/ipc/ipc/settings.test.ts`(受锁):旧 settings.json(无
  uiScale)→get 返回 default 'small';set 带 uiScale:'large'→持久化回读
- 扩 `tests/unit/renderer/settings.store.test.ts`(受锁):save({uiScale:
  'medium'}) 透传断言
- 扩 `tests/unit/renderer/app-shell.test.tsx`(受锁):桩 settings get 返回
  medium→挂载后 `documentElement.style.getPropertyValue('--ui-scale')`=
  '1.1';save 后变化沿(变量更新)
- 扩 `tests/unit/renderer/theme.test.ts`(受锁):CSS 文本锁两条
  (`.app-content-row` 含 `zoom: var(--ui-scale, 1)`;`[data-page-column]`
  含 `zoom: calc(1 / var(--ui-scale, 1))`)
- e2e(受锁,smoke.spec 或新 set1 段):进设置→点「大」→nav 首项 rect
  放大 ≈×1.25(±2px)+header 高仍 44(豁免锁)——**rect 断言非 computed**
- 变异红证四方向(各落盘 .raw.txt):①default 摘除→旧文件兼容红;
  ②UI_SCALE.medium 改 1→变量断言红;③calc 补偿摘除→CSS 锁红;
  ④App setProperty 摘除→app-shell 红

## 视觉/真机验收(⑤b/⑤f)

- 真机取证脚本(探针升级入库 `scripts/audits/r2-set1-forensics.mjs`):
  三档遍历——每档量 header 高/nav rect/PDF canvas rect(补偿后恒基线)/
  textLayer 对位偏移,截图落 `r2-set1-out/`;实景=真实库副本(⑤f)
- 用户复测面:三档切换观感(文献卡/笔记/脉络文字)+PDF 恒不缩放确认

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. enum 三档+default 'small'(现状 100% 零迁移;数值 1/1.1/1.25)
2. 挂载=内容行 `.app-content-row`(nav+main);header 结构性豁免(E5)
3. PDF 页列 calc(1 / var(--ui-scale, 1)) 补偿(探针 Q2 实测接受)
4. 断言面用 rect(computed 对 zoom 无感——探针实测)
5. App 挂载 load(失败容忍);SettingsPage 既有 load 保留(store 幂等)
6. e2e 锁 UI 链(rect);PDF 补偿面归取证脚本
7. UI_SCALE/UiScale 住 schemas.ts 导出(单源)
8. ipc/settings.ts 与 settings.store 零改(类型自然覆盖)
