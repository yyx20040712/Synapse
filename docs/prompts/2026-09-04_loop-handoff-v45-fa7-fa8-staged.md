# 2026-09-04 LOOP 交接 v45——F-A7 收官+F-A8 立案与阶段推进（门 0/门 1/门 1b 毕,门 2 已放行待开工）

> 上段=v44（F-A6 战役收官）。本段五提交：F-A7 三屋全链收官（registry done）→
> F-A8 立案（设计链三跳：Kimi 拟定→deepseek 对抗审核→GLM5.3 终裁）→门 0
> 前置票（纯函数域）→门 1 取证票（判据 a 不过→回设计）→门 1b 前置修票
> （ascent 兜底+**N4 翻案=F-A6 限定性勘误**+判据 a 分层过门）——**门 2 放行**。

## 1. 本段终态

| 项 | 数值/结论 |
| --- | --- |
| F-A7 旋转页占位盒 | **毕+registry done**（3d9d7a23d9）：PageColumn 段① pageSizes=viewport 旋转口径（rotate 归一化 %180===90 交换——与 b1 通道同源禁 getViewport）;单测 4 it+变异×2;e2e 新小票（页盒×canvas 盒 ≤2px+方向断言）;门一 Kimi PWW 2W2N（W1 注释数字 293px 实测口径回炉/W2 248 字符行债务=接受登记——**已知债务:PageColumn 压线 250 行,后续行增即拆件**）+门二 deepseek PASS 零 findings |
| F-A8 立案 | 设计链三跳毕（6c86923148）：Kimi K3 拟定（推荐 **A+C1**=项几何族主链+DOM 降回退+存量读时归并渐净;本质推演=病理页两投影分叉时唯一可信=项几何族）→deepseek ENDORSE_WITH_CHANGES（**CR1 store 就绪竞态真缺格**[MutationObserver 只观察 DOM 面]/CR2 selectionHealth 跨产链复用=假设/CR3 文档切换 store 语义/CR4 门 0 oracle 化）→主控终裁（CR1/2/4 采纳+CR3 源码裁决排除[store 换文献 fileUrl 效应整表清空]+Kimi 两假设验证毕[verifyQuote 匹配核纯文本性]）;终裁版设计书 docs/design/2026-09-04_f-seam-reanchor-design.md（态空间 S0~S6+INV 登记+阶段门 0~3） |
| F-A8 门 0 | 毕（70b6aea5b3）：anchor-serialize **locateQuote 纯文本核提取**（verifyQuote 薄壳化行为零变+受锁基准 28 用例绿）+**verifyQuoteItem**（items 域对账——TS6142 阻断自裁=结构最小面+自持剔空串拼接与 buildItemOffsets 偏移表机械对账锁定）+**resolveAnnotationRectsItem 纯域版**（S0~S3b/scale 自 entry.box 反推/畸形 try 缺席）;新件 anchor-item-verify.test.tsx 16 用例（oracle 三态+tie-break+spans 全表对账）+变异×4;门一 PWW 4W2N 回炉闭合+门二 PASS（2 NIT 转顺带——已随门 1b 落地）;tsconfig.node 无 jsx 配置债=观察项 |
| F-A8 门 1 取证 | 毕（ea2b8819e3）：探针三件 f-a8-gate1-diag/lib/page.mjs（locks 281）;**判据 a 不过**（IoU1D≥0.99 占比 6/20 最差 0.6232）——新根因=**ascent=0 声明字体直消费**（3882 27% 项,:217 isFinite 直消费 0→项链行块膨胀 16px vs 真值 9.5px;DOM 链免疫=pdf.mjs #getAscent 兜底）;判据 b 部分成立（s1rot 双向）;判据 c 弱式（间隔 20~41x+ascent-0 类 G2 盲区）;主控终裁=不过→回设计三动作（门 1b 修/口径分层/S6 保留+盲区登记） |
| F-A8 门 1b | 毕（6f7edc323b）：ascent≤0→0.8 兜底（:218 一行——**selection+annotation 双链共同缺陷**）;staged 复跑=3882 top/multi 锚 0.62~0.76→≥0.9942+错对 44→22 块（ascent 因果清零）;bottom 2 锚不动——回炉 W2 三层数据=**非 ascent 直接证据**（修补生效+膨胀 16.1→10.4px 已消+x 向 dx/dw 全零——失守归双根因[边栏分段+上下标行分段]）;**N4 翻案**：f-a6 C1 锚窗 66/250=26.4% ascent-0 项=采集面覆盖而未检出→**ADR-0019 R3 勘误注记⑧**（限定性勘误——「健康页逐位不变」混合行形态下真实/「全健康」覆盖缩限;66 项膨胀实测未补证前禁「假阴坐实」）;**判据 a 分层口径落设计书**（L1 整行常规锚健康集口径 10/10 ≥0.99 min 0.9919/L2 项内细分近似 0.8816~0.9745/L3 异形态区/L4 旋转域）——**门 2 放行** |
| 基线 | verify **155 文件/1347 用例/locks 281**/e2e 42 全绿亲验;grep TODO/FIXME/placeholder 零命中 |

## 2. 下段执行序

1. **F-A8 门 2 主链切换票**（放行基准=设计书增补节）：S0~S6 状态机上线
   （AnnotationLayer/AiAnnotationLayer 接线 resolveAnnotationRectsItem 主链+
   **CR1 store 订阅重入**[usePageItemsStore 现成 react 订阅形态——竞态 fixture
   入测试面]+DOM 链整体降回退层改名 …Dom 函数体零改）+S1 接线时补
   reconcileItemsWithDom DOM 对账+**S6 格上线**（G2 判定走 selectionHealth——
   门 1 c 弱式结论下 S6 保留+ascent-0 盲区登记）+INV 登记（INV-58 扩域/
   INV-47 适用面收缩/新 INV-59 重锚同族配对令/INV-60 重锚显示覆盖登记）
   +门 2 NIT 残留（受锁单测标题「先例」已主控裁豁免——不再动）。三屋全链。
2. F-A8 门 3 收口票（观察期后 DOM 回退层去留裁决+全量取证）。
3. P7D-01 批一（闲时可动）：动效 --dur-*+间距 inline 12 处+层级语义命名——
   零视觉差（无头截图 diff 验收）;自产 .mjs 诞生即 locks。
4. P7X-02 时长 outbox（闲时——service 层非视觉）：设计面=与 saveProgress 单
   通道关系+重启恢复语义;设计链外链双跳。
5. 被动观察：F-ARCH4-M1（原 :872）1 现在档+最近多轮绿——再 1 现即立案;
   bottom 双根因机制占比分解（门 2 后或门 3 顺带）;tsconfig.node jsx 配置债。

## 3. 本段成本账本

```
主控 GLM5.3×bigmodel-coding-plan：五票全链验收（verify 亲验 ×7 轮真退出码）
  +F-A7 双门包+裁决处置+registry;F-A8 设计链终裁（三假设源码验证）+立案;
  门 0/门 1/门 1b 门审包构建+裁决（含 W2 证据升级裁定/BLOCKED 解除）+文档
  增补（设计书判据分层 L1~L4+ADR-0019 R3 勘误⑧）+交接书 v45
实现者子代理（Agent 工具无 model 参数=环境限制统一档欠账披露,档位口径
  §4.5——GLM5.3flash 定档申报）四名：
  F-A7 实现者 4.4M tok/22min+回炉 0.73M/2.2min
  F-A8 门 0 实现者 7.35M tok/19.3min+回炉 2.35M/4.3min
  F-A8 门 1 取证实现者 18.27M tok/45.6min
  F-A8 门 1b 实现者 8.34M tok/59.4min+回炉 2.03M/10.4min
外链（Kimi/DeepSeek API 直调——调用器=python urllib 内联,端点与凭据取
  ~/.zcode/v2/config.json provider 面;Kimi K3 max_tokens 16384 稳/
  temperature 禁设[仅允许 1]/deepseek v4flash 审计 40000）：
  Kimi K3 六发：F-A7 门一 in 8429/out 2766/70s PWW;F-A8 设计 in 4646/
    out 5132/104s;门 0 门一 in 8079/out 5540/152s PWW;门 1 门一 in 6253/
    out 4441/123s PWW;门 1b 门一 in 11151/out 3255/104s PWW
  deepseek v4flash 五发：F-A7 门二 in 7957/out 19426/165s PASS;F-A8 设计
    审核 in 8164/out 13621/164s EWC;门 0 门二 in 6294/out 29898/243s PASS;
    门 1 门二 in 7859/out 26523/223s PWW;门 1b 门二 in 9159/out 29336/232s PWW
```

## 4. 教训行（本段新增）

- **python io.open(path,'w',…) 参数错值在 ValueError 抛出前已截断文件**
  （本段实录:ADR-0019 被截 0 字节——git checkout HEAD 恢复零丢失[该文件无
  未提交改动,恢复安全前提成立]）——destructive open 前全参数核对;与
  git checkout 纪律同族（「未提交面恢复安全前提」判定先行）。
- **registry.ts 注记禁裸单引号**（summary 为单引号字符串——含 'w' 类代码
  引用即提前终止串,tsc/lint 红;本段 close 首红 exit=1 实录→双引号/去引号
  修复）。
- **主控档案数字口径三连击**（门 1/1b 门二连续抓出:0.97 上限被自家样本越过/
  L1 门限用了中位数 0.9942 而实测 min 0.9919/ADR 聚合句含入 bottom 锚）——
  主控落笔数字必须回表核对（同「计数类数字实测」条款的档案面延伸）。
- 取证探针调试轮**分段留 raw**（门 1 自裁⑤:前两轮失败未分段——复算性削弱,
  门二 NIT 在案）;git add **先列后添**（不存在文件名混入=整批失败且
  2>/dev/null 吞错——本段两实录）。

## 5. 环境事实滚动

- 基线终态：**155 文件/1347 用例/locks 281/e2e 42**（v44 基线 154/1325/277/41
  →F-A7 +4 用例+1 e2e;门 0 +16 用例+1 文件;门 1 +3 locks（探针）;门 1b
  +2 用例）。
- 任务池：F-A8 open（门 2 放行待开工）+P7D-01 批一待动+P7X-02 未动。
- Kimi K3 外链调用参数定式：`POST {baseURL}/v1/chat/completions`+Bearer key
  +model 'k3'+**禁 temperature**（400 only-1 实测）+max_tokens 16384。
- F-A6 结论的限定性勘误在档（ADR-0019 R3 注记⑧）——下游引用 F-A6「健康页
  逐位不变」时须带勘误限定（混合行形态）。
- 沿用 v44/v43 各条（外链预算公式/Kimi 额度经济学/node 24 volta/行尾 LF 等）。
