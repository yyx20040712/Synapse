# v11 交接书 §2 九项验收报告(2026-08-30 验收场)

> **结论:九项全过(ALL-PASS)**——A 面标注六项(F-A1)+B 面脉络三项
> (F-L1-C)机器代跑全绿;另登记 1 条验收口径外观察项(F-L2 适应视图后
> 节点出视口,待排查)。F-A1/F-L1 按交接书口径翻**已闭环**。
> 验收器:`scripts/audits/v11-accept.mjs`(独立验收器,非开发者取证断言
> 复用);产物:`scripts/audits/v11-accept-out/`(v11-accept.json+九截图)。

## 0. 开工记录(宪法第一条:技能清点+配置自查)

- 技能清点:**verification-before-completion 用**(验收场核心,亲验退出码
  +证据链)/ **webapp-testing+e2e-testing-patterns 用**(无头 Electron+
  Playwright 真鼠标路径,先例 f-a1/f-a2/f-l1c 配方同构)/ systematic-debugging
  **不用**(验收红线「只登记不修」,不过即开票)/ test-driven-development
  **不用**(本场无产品代码改动)/ subagent-driven-development **不用**
  (验收取证主控直跑;deepseek 补审按 §3 待用户裁定,未擅自启动)。
- 配置自查:主控 GLM-5.3;Node 24 口径 v24.20.0(本机默认 v25 会假失败,
  在档怪癖);build 产物在场。前台保护:Electron 测试实例均为隔离副本库
  (tmpdir),未触真库。
- 红线遵守:验收场零产品代码改动——本轮全部修改限于新增验收器脚本
  `scripts/audits/v11-accept.mjs` 与文档/台账。

## 1. 验收方式声明(代跑口径)

用户令「按 v11 交接书验收」——九项原为人工面,本场以**主控代跑**执行:
真鼠标用户路径(非程序化选区)+隔离副本库(复制真库 workspaces 至 tmpdir,
注入测试数据,真库零触碰)+机器断言(几何/样式/时序)+视觉模型抽查近景
截图。**用户终裁权保留**:全部截图在 v11-accept-out/,可随时抽看推翻。

## 2. 九项逐项结论

### A 面:标注(F-A1)

| # | 项 | 结论 | 机器证据 | 视觉证据 |
| --- | --- | --- | --- | --- |
| A1 | 多行高亮 | **过** | 真鼠标跨行拖选(3105 字选区)→高亮落 **3 行恰 3 块**(perLineOneBlock)/零宽幽灵 0/行内两两相交 0/同位重复 0/行间断缝全正(min=3px)/样式均匀 | v11-A1-highlight.png:每行一条完整连续色带,行间均匀断缝,文字可读,无碎块无叠深 |
| A2 | 多行下划线 | **过** | 3 行恰 3 条,**hMax=2px 细线**非色带/底边平齐 spread=0/无双线(dupPairs=0) | v11-A2-underline.png |
| A3 | 旧标注回看 | **过** | DB 注入**修复前碎裂形态**(7 块:行内错位重叠+零宽幽灵+跨行垂落 h0.035)→打开即渲染 **3 行 3 块**归并态(挂 B 读时归并/INV-E);文献库往返**重开**后 kept=9/9、归并保持(挂 A 重开重锚) | v11-A3-old-legacy.png+v11-A3-reopen.png:整齐三行带,无重叠错位叠深 |
| A4 | 叠深检查 | **过** | 单条内部 fill/fillOpacity 全一致(styleUniform)+每行单块(叠深根因=多块相交,已零相交) | 近景同 A1/A3 |
| A5 | 工具条弹出 | **过** | 干净文字处(coveredStart=false)真鼠标拖选→**400ms 弹条**(口径「约半秒」内)/visible/选区 3105 字 | v11-A5-toolbar.png |
| A6 | 反向确认 | **过** | 行间深缝:缝隙全正(min=3px)/字符间深条:行内恒单块(dupPairs=0)/盖字感:近景文字可读(视觉模型确认) | 同 A1 |

注:真库 annotations 表为空(用户未在真库落过标注)——「旧标注回看」无
存量可看,改为注入修复前形态数据验证同一条渲染路径(挂 B),口径等价。

### B 面:脉络边标签(F-L1-C)

| # | 项 | 结论 | 机器证据 | 视觉证据 |
| --- | --- | --- | --- | --- |
| B7 | 长文换行 | **过** | 6 标签 foreignObject 恒 **130×37.05**(DOM 属性断言,坐标无关)/5 条 45 字长标签截断(3 行装不下)/短标签「同源」完整/斜体+灰字 rgb(107,114,128) | v11-B7-labels.png:窄幅 3 行斜体灰注释,无一整行横贯 |
| B8 | 密集防叠+fit | **过** | 注入碰撞源(同节点对正反双长边+穿越边)后标签**两两相交 0/盖节点 0**;「适应视图」后标签 **6/6 全可见**(槽位盒参与包围盒兑现) | v11-B8-fitview.png |
| B9 | 悬停滚动 | **过** | 截断标签 hover+滚轮→**scrollTop=28.8 且画布 transform 不变**(不缩放);短标签 hover+滚轮→**画布缩放触发**(transform 变)+标签自身不滚(分流正确) | v11-B9a/B9b-short-zoom.png |

## 3. 观察项(验收口径外,登记台账待排查)

- **F-L2 [N?] 适应视图后 1 节点出视口**:点击「适应视图」后,节点
  0bd9a528(rect right=1894)超出 SVG 视口(right=1682)约 **212px**,
  4 节点仅 3 入框;标签 6/6 全可见不受影响。§2 第 8 项口径只要求「标签
  全可见」故 B8 判过,但 auto-fit 包围盒疑似未含全部节点(R2-LG10 面)
  ——待排查:该节点是否孤立/包围盒是否只含连通子图。

## 4. 取证坑(方法论入档)

1. **注入 rects 必须含 page 字段**:annotationRectSchema 为 `.strict()`
   且每块 rect 需 `{page,x,y,w,h}`——缺 page 时 zod 在打开文档链路
   (toAnnotation)当场抛错→「打开文献失败/内部错误」(契约按设计工作,
   非缺陷;取证脚本作者之坑)。
2. **getBoundingClientRect 量 foreignObject 盒=坐标假象**(f-l1c 在档
   坑重演):视觉 225×64 ÷ 实际缩放 1.734 = 130×37.05 恰合规——盒尺寸
   断言一律用 DOM 属性(getAttribute),视觉坐标只作参考。
3. **双栏 PDF 行采样**:「行高中位数×N」估计目标行会被双栏/标题区干
   扰(A2 首跑落 1 行),须按 distinct-y 行序取终点。

## 5. 产物清单

- 验收器:scripts/audits/v11-accept.mjs(两幕:B 脉络注入碰撞源→A 阅读
  器注入旧格式标注;全项真鼠标路径)
- 结果:scripts/audits/v11-accept-out/v11-accept.json(verdict=ALL-PASS)
- 截图九张:v11-{A1,A2,A3-old-legacy,A3-reopen,A5,B7,B8-fitview,
  B9a-hover-scroll,B9b-short-zoom}.png

## 6. 后续(交接书 §4 执行序衔接)

1. ✅ 复测回收(本场)→台账已翻:F-A1/F-L1→已闭环;
2. **待用户裁定**:F-A1/F-L1-C 补 deepseek 一审(§3 回溯面);
3. F-A3 选择模式票(三屋,门一 deepseek——新规首发);
4. F-L2 待排查(本场新增);
5. AUDIT-C 竞态批→B/D/E→遗留池。
