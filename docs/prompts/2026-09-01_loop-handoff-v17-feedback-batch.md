# 2026-09-01 LOOP 交接文档 v17——新反馈批五票全闭环（选区断位/双页宽度/脉络图三连）

> 背景：v16 预告的用户截图反馈批（7 图+小需求）当场全额回收——分析
> 提问四裁决→**五票全闭环**（F-V1/F-V2/F-LG13/F-LG14/F-LG15）+
> 台账登记笔共**六笔提交**（58a55ca22→465c4403c）。基线：verify
> **126 文件 1074 用例**全绿 / locks **231** / e2e **29/29**
> （P7-A flake 六场六现，复跑绿）。INV：27 修订+36/38 修订+47/48 新增。

## 0. 开工纪律（下场执行前必读）

- 会话开工技能清点+配置自查；**PATH 前导 `/d/nodejs24`（本机
  D:\nodejs 已漂移 v25.2.1——localStorage 污染 vitest+ABI 面，
  DEV-SETUP 备案，是否回装 24 待用户裁决）**。
- ABI 双坑（本批两次实录）：探针/真机前 `use electron`（node 态
  起 Electron 主进程崩 firstWindow Timeout）；test/verify 前
  `use node`（npm run test 前导已含，裸 npx 必假红）。
- **派实现者前 unlock 受锁面**（LG14 实录：主控漏 unlock→实现者
  attrib -R 自救可接受但担责披露）；门二发现子代理 shell 无 PATH
  前导会踩 node 25 假红——门审派单必须写明前导。
- staging 显式列文件不变；`.log` 后缀被 gitignore——证据落盘用
  `.raw.txt`（LG13 实录改名 9 件）。
- 其余同 v16 §0（材料包 .mjs 化/add -N 全件/体检只登记不修）。

## 1. 现状快照（2026-09-01 v17 场收口后）

| 项 | 状态 |
| --- | --- |
| **用户复测邀请面（下场首项）** | 图1/图2 整段拖选断位（同文献+旧标注重开）/图3 双页适应宽度（large 档）/图4-5 脉络紧凑卡/图6-7 节点底行含金量+标签+人工父虚线 |
| F-V1 整段拖选 band 断位 | **闭环**（紧凑行距行簇错联+INV-D 级联；estimateLinePitch 双门；INV-47） |
| F-V2 双页适应宽度空白 | **闭环**（uiScale×(clientWidth−24) 分子；R2-SET1 反向补偿交互） |
| F-LG13 节点统一尺寸+紧凑+滚动 | **闭环**（240×110/16/24/24；INV-36/38 修订） |
| F-LG14 节点元信息区+标签全链 | **闭环**（迁移 007 tags+含金量 join+底行三段；INV-48+ADR-0014 v1.1） |
| F-LG15 人工父边 manual | **闭环**（三守卫零新增天然承载+琥珀长虚线；INV-27 修订） |
| F-R2 ui-scale≠1 程序滚动漂移 | 登记待排查（large 档高优）——F-V2 同根族（ui-scale 复合口径） |
| F-R3 pdfjs stream pump 竞态 | 登记（低优） |
| P7-A 剪贴板 flake | **六场六现**（专项升级候选） |
| F-L1-C 三条/ARCH4-M1/AUDIT-C→E | 未启动（v15 §2 顺延） |
| 备案池新增 | LG14-N1 对话框同名标签 UX 缺测/N2 应用面 tags 无 min(1)/LG15 编辑期外部删边竞态 throw 面 |

## 2. 下一场执行序

1. **用户复测回收**（五票视觉面+三边样式对比表 LG15 报告在册）；
2. F-R2 排查票（ui-scale≠1 滚动落点漂移——与 F-V2 同根族可复用
   探针资产 f-v2-diag.mjs 的结构链诊断段）；
3. P7-A 剪贴板 flake 专项（六场六现够立案）；
4. 小票批+AUDIT-C→E+遗留池（同 v16 §2 顺延）。

## 3. 本场工具与流程资产（下场直接复用）

- **判别探针三元组法**（F-V1）：断位行「band 右缘 vs 最后有墨
  span 右缘 vs 含空白 span 右缘」三元组 dump——RC 系候选根因
  单轮裁决；**原生 Range rects 对照**=「缺陷在应用层还是浏览器层」
  的一刀切证据。
- **结构链诊断段**（F-V2 chain dump）：从目标元素上溯到 body 逐层
  clientWidth/offsetWidth/gBCR/computed zoom——CSS zoom 口径争议
  一轮看清（本案实证：app-content-row 放大+页列反向补偿+滚动容器
  比值干净）。
- **视觉现象三问定位法**续用（谁画的/哪个消费点/基准）+
  code-explorer 全链报告先行（819k tokens 换单轮定位，值）。
- **并行实现者规程 v2**：reader/lineage 域并行实证可行（F-V1+
  LG13）；ABI 争用「等 60s 重试」入派单；**串行依赖票（菜单文件
  交叉）排队等收口提交后再派**（LG14→LG15）。
- 门审合并裁剪先例：门一已含亲验全量+无回炉时，单票门二可与
  后票合并（LG14+LG15——主控披露在案）。
- 台账式登记+AskUserQuestion 四裁决闭环（口径先问后做）。

## 4. 成本与流程如实账（本场）

- F-V2 主控直做：探针 3 轮（v1 滚动条污染 e2e 抓红→v2 补偿相消→
  v3 终版）+三验+两笔提交（58a55ca22/3afbc3d19）。
- F-V1：code-explorer 819k/31 工具/12m（后台）+主控判别探针 2 轮
  +实现者 15.9M/94 工具/50m+门一 795k/24 工具/9m+门二（合并）
  1.5M/40 工具/13m+主控 M2/M3 补档。
- F-LG13：实现者 8.1M/89 工具/37m+门一 664k/26 工具/9m+门二
  （合并）+主控 H.1 顺手修。
- F-LG14：实现者 21.5M/182 工具/35m+门一 887k/33 工具/7m+收口
  主控（**派单未 unlock 担责披露**——实现者 attrib -R 自救）。
- F-LG15：实现者 15.1M/135 工具/22m+门一 1.2M/30 工具/7m+门二
  （LG14+LG15 合并）1.6M/36 工具/6m+主控 W1 直做（优先级上移+
  补用例）。
- 全场事故：探针库副本 Chromium 状态损坏（firstWindow Timeout
  排障 3 轮定位到 ABI 态）、gitignore .log 证据改名、INV 追加位置
  两次错（表格区外孤行——LG14 实现者+主控各一次，**追加后必
  grep -n 表格连续性**）。

## 5. 方法论资产（本场新增）

1. **紧凑排版几何失效族**：盒高>行距时一切「y 重叠/行盒」判据
   失效（F-V1 行簇错联=F-A5 band 错绑同族）——判据必须以**行距
   估计**为锚（estimateLinePitch 下中位=离群免疫）。
2. **CSS zoom 三层口径**（F-V2 实证）：clientWidth=unzoomed 布局宽
   /gBCR=zoomed 视觉宽/offsetWidth 同含滚动条——**比值取法看用途**
   （滚动容器自比值干净；被补偿元素比值相消恒 1）。
3. **结构性守卫发现**（F-LG15）：扩 kind 前先审既有守卫的条件面
   ——`if(kind==='tree')`/全边图/不区分 kind 的 dup=三守卫天然
   承载 manual，零新增代码（写新守卫前先读旧的）。
4. **迁移编号接续核查**：开迁移前 ls migrations——票面写 006 被
   实际 006_ref_edges 占用（自裁接续 007）。
5. **口径裁决先行**：数据展示类工单（含金量/标签）先 AskUserQuestion
   定字面口径再开工——「引 N·T档」并列原始值/橘黄框容器一体/
   manual 不限条数三裁决直接写进票面=实现零返工。

## 6. 档案索引（本场六笔+资产）

- F-V1：f-v1-{ticket,impl.report,diag.mjs,verify.mjs}+f-v1-out/
  （diag.json/verify.json/mut-m2m3-closeout.raw/sel·ann·verify png×5）
  +closeout raw；提交 09c0218e2
- F-V2：f-v2-{diag.mjs}+f-v2-out/{diag.png,diag-raw.txt}；
  提交 58a55ca22
- F-LG13：f-lg13-{ticket,impl.report,verify.mjs,json,png}+red/
  green/mut-m1~4/e2e-t1/final-test/probe-run.raw.txt；提交 c91d4a2fd
- F-LG14：f-lg14-同套 14 件；提交 ec1e7e959
- F-LG15：f-lg15-同套 11 件；提交 465c4403c
- 台账：audit0-findings.md（三段：登记/深夜场收口/凌晨场终态）；
  INV-27 修订+36/38 修订+47/48 新增；ADR-0014 修订 v1.1
- 基线跃迁：verify 120 文件 1018→**126 文件 1074**/locks 213→
  **231**/e2e 29 持平
