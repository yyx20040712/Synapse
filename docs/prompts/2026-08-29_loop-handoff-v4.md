# 2026-08-29 LOOP 交接文档 v4——R2 修正役四单全收官+U4 微票+证据补档

> 定位：v3 执行序（U2a→U2b→U3→U4）**全部完成**。五提交：
> dc974cf（LG11）/6d1077d（LG12）/5ae8620（SH1）/50e0959（SH2）/U4+补档。
> 全程三屋模式（SH2 含主控 W2 压缩票；LG11 含双压缩票）。
> 详细档案=各单 registry summary+scripts/audits/r2-*/（票面/三报告/收口单/
> *.raw.txt 证据）。

## 1. 开工自检（新会话第一动作）

1. 技能清点+配置自报（宪法）；视觉取证=像素差分+DOM 转储配方（⑤b）。
2. node24 前缀 `export PATH="/d/nodejs24:$PATH"`；取证器三戒；ABI 换绑
   Windows 文件锁竞态防线（hash 校验+缓冲+use electron 兜底——SH1/LG11
   实录，r2-lg11-forensics.mjs 配方）。
3. 基线锚：verify=**107 文件 890 用例/locks 166/open 0**；e2e=**26 passed**。
4. **userData 已迁移**：真实库现驻 `%APPDATA%/Synapse`（旧 Synapse Remake
   已 rename 走；tmp 备份 synapse-remake-backup-194651 可弃）。取证器/
   脚本用新名（local-state.mjs 已改新优先旧兜底）。

## 2. 本轮交付摘要（用户五决全落地）

| 决 | 落地 | 单 |
| --- | --- | --- |
| 决1 边框编码 A | 白卡+线型×色阶矩阵（核心 accent 1.5 实线/普通 branch 1/主题+综述虚线 6-4；选中+0.75） | LG11 |
| 决2 重要度 D1' | isCore=研究性论文**出度**≥2（真机复评修正：入度版树单父下数学恒假） | LG11 |
| 决3 综述特殊化 | isSurvey 右列+淡灰虚线+**多参考边 kind:ref 完整数据面**（用户裁 A：迁移 006+service 受控豁免+右键「添加参考连接」） | LG11+LG12 |
| 决4 切换器上移 | 顶栏 44px 身份区（logo+Synapse+切换器迁位零触碰+侧栏品牌行删） | SH2 |
| 决5 衬线清零 | --font-display 五类+lib 三类消费清零（token 定义留）+--gold-night 退役 | SH2 |
| 站1 重命名 | Synapse（userData 迁移真机验证过） | SH1 |

## 3. 用户复测指引（待反馈项）

`npm run dev`（或直接启动）：①脉络新视觉（白卡/边框编码/换行/综述右列/
参考边）②顶栏身份区+切换器 ③文献卡行内等高 ④**v3 §2 复测确认四项仍待**
（灰选中浓淡/Esc 残留/暗黄绿观感/冻结反馈）。isSurvey 误判（如题名含
「综述」子串的正常论文）=D2 字段增强票入口。

## 4. 遗留池（v3 §6 续+本轮新增）

- 工程：B4/B5/B6/B7/B8/B9/v-serif 类名语义/A4/A6/A7 顺手池/installer-smoke
  旧名引用/dist 残留/check-tickets R2 系正则盲区（三单累计实锤——修复会
  拉 R2 系入规则 4/6 检查域，需逐件核 b3 头注）/e2e 剪贴板+corpus 双 flake
  （三次实录，可考虑串行化票）。
- 教训回流候选（methodology）：①公式类转译错位「单测全绿」形态（isCore
  入度恒假——涉约束公式必须推演合法数据形态可达性）②日志入库统一
  .raw.txt 后缀+add 后 ls-files 核对（*.log 拦截静默漏洞）③diff 包生成
  禁 git add 跟踪件（-N 仅新文件）④sed 连续行号删除漂移（多删行用单次
  表达式或 Edit）⑤首红落盘与变异同权（SH2 定向跑降档瑕疵）。

## 5. 成本账本（本轮累计 ≈40M tok）

LG11：实现 15.8M+门一 1.0M+门二 1.1M；LG12：10.0M+1.3M+1.6M；
SH1：3.0M+0.8M+0.7M；SH2：2.9M+1.3M+1.2M；主控控制面+压缩票+取证 ≈余量。

## 6. 下一轮候选

复测反馈驱动微项（A5+§3 四项）/D2 isSurvey 字段化/B6 workspace 删除
设计/B10 重试按钮内联压 hover/暗色主题（夜幕 token 已备）。无在途工单。
