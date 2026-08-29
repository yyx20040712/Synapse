# 2026-08-29 LOOP 交接文档 v9——R2-SET1 zoom 三档收官

> 定位:v8 后半场。SET1(中票三屋)全收官。**新基线:verify 108 文件
> 911 用例 / locks 173 / e2e 28**(v8:108/904/171/27)。
> 本轮提交:见 git log(SET1 原子提交 [locked-change])。

## 1. R2-SET1 收官档案

- **链路**(v7 决3):uiScale 三档(small=1/medium=1.1/large=1.25,default
  small=现状 100% 零迁移)——schemas.ts 单源(UI_SCALE/UiScale)→App 挂载
  load(失败容忍默认档)+订阅→effect 单点写 documentElement `--ui-scale`
  →`.app-content-row`(内容行)整行 zoom→设置页「界面缩放」三档
  segmented 即时保存。
- **豁免面**(开工探针四问实证,r2-set1-out-probe.json):
  - header 结构性豁免:zoom 挂内容行,顶栏/caption 恒 44px(E5 裁决闭环
    ——SH3 caption 与 SET1 完全正交);
  - PDF 页列恒补偿:`[data-page-column]` `zoom: calc(1 / var(--ui-scale,1))`
    三态通配——探针实锤 canvas 跟随×1.1 即位图拉伸(612→673.2 背衬不变),
    calc 反向补偿精确恢复+textLayer 对位不破坏;取证(真实库三档遍历)
    canvasMaxDrift=0/对位恒定;
  - **断言面红线**:computed fontSize 对 CSS zoom 无感(探针实测)——
    zoom 断言必须量 rect(INV-39 登记)。
- **关键行为发现**(自裁②+INV-39):settings set 通道 Req=完整
  appSettingsSchema strict 校验——**一切 set 必须组装全量**(缺省字段被
  zod default 静默抹值;单字段 patch 直接 INVALID_REQUEST)。
- **三屋**:实现者 911/911+变异四方向(③首跑被注释字样救活→正则锚定
  声明形态后红——**CSS 文本锁须锚定声明勿 toContain**教训)→门一
  0B/4W/20+N→主控直修 W1(SettingsPage 水合一次:点档保存不再回填表单,
  防抹未保存邮箱草稿——ref 守卫)+W3(INV-39 断表空行)→门二放行。
- **取证**:r2-set1-forensics.mjs(真实库副本,⑤f)三档——header 恒 44/
  nav 比 1.1/1.25 精确/canvas drift=0/`--ui-scale` 变量链/对位 425.54 恒定。

## 2. 收口验证

- verify exit=0(108 文件 911 用例)+e2e **28/28 一次全绿**(SET1 UI 链
  用例:nav rect ×1.25±2px+header 恒 44——rect 断言)。locks 171→173
  (r2-set1-probe.mjs+r2-set1-forensics.mjs 扫入)。

## 3. 遗留池增补

- W2 备案:invariants.md **不在受锁集**(lock-protected.ps1 范围=tests/
  src/shared/migrations/配置/scripts)——实现报告「受锁」表述失真流程
  无害;若未来要把 docs/ 纳锁需 [locked-change]+manifest 扩面决策。
- W4 备案:变异还原「RESTORED-OK」输出未落档(终态实物+final 全绿为间接
  实证)——下批变异统一把还原 diff 也落 .raw.txt。
- 水合前窄窗(门二注记):SettingsPage 首帧~水合间用户输入极窄覆盖窗
  固有形态,无数据面。
- **SettingsPage 244 行(余量 6)**:下票触设置页新节必拆 UiScaleSection
  (CorpusExportSection 先例)——U2' 不触设置页,预警给后续。
- v8 §3 原两条(maximized bounds 怪癖/multiply 上限)原样有效。

## 4. 新对话执行序(v8 §4 刷新——SET1 已走)

1. ~~R2-SET1~~(✅ 本场)——用户复测面:**设置→界面缩放三档切换观感**
  (文献卡/笔记/脉络文字变大;PDF 恒不缩放;顶栏/三键不变)。
2. **U2' 脉络落地**(v7 决①+②):B 半自动确认条+重叠让位+美观 mockup
  (**先 mockup 供用户审**——L6 ⑤c)+换行红线逐面核查(节点标签/侧板/
   AI 笔记;**大档 125% 下溢出检查**——SET1 接缝,票面引用)。
3. 复测邀请(合并批):SET1 三档+SH3 三键/F 三连/UI1/LIB1。

## 5. 成本与档案

- 本场(v8→v9):主控(探针四问+票面+2W 直修+收口)+实现者 6,865,235
  tok/99 工具调用/20.8min+门一 851,862 tok/23/9.7min+门二 470,103
  tok/26/6.4min(三屋标准配置)。
- 档案:scripts/audits/r2-set1-*(票面/开工+probe.json/实现报告/门一二
  审档/diff 包/9 份 raw 证据/out 四件+forensics.json)+locks 173。
