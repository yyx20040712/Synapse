# F-LINT-04-T4PRE 票面归档（F-GOV-01）

- id: F-LINT-04-T4PRE
- file: src/renderer/shared/theme.css
- area: infra
- owner: strong
- status: done

## summary 原文

颜色关卡扩展战役 T4 前置=--warning token 化（v58 §2-2 候选/Kimi 设计书 2.4 裁决=红不豁免——fallback 悬空系 token 体系静默绕过通道+语义残缺）：TabBar.tsx:139 `var(--warning, orange)` 全仓唯一引用+--warning 零定义（fallback orange=事实渲染色）；处置=theme.css :root 状态色族（--danger/--ok 侧）补 `--warning: #ffa500`（**零视觉差——CSS 规范 orange=#ffa500=rgb(255,165,0) 计算值恒等，非视觉决策**）+TabBar.tsx:139 移除 fallback 改 `var(--warning)`（死代码即删）；前置已核：#ffa500 全库唯一零同值冲突（C-4 ② 同值守卫不触发）;**收口 2026-09-10 主控自为（F-SNAP-01 先例——≤3 文件非受锁小批）+门一 GLM 同源降级（§4.5 可省面）PASS 0B/0W/4N+门二统一档 PASS 无条件（机器面六件亲跑：R−D−W 探针 ∅/var(--warning 恰 1 处/ffa500 恰定义 1 处/quality+lint+typecheck 真 exit=0/翻 done 推演过）**；验收=T4 门槛对账探针 f-t4pre-rdw.mjs（R=94/D=109/W=2 改前差集恰 --warning 悬空 exit=1→改后 R−D−W=∅ D 恰+1 exit=0——T4 var() 语义锚上线门槛达成）+⑤f 真机豁免论证（计算值恒等+全库唯一引用点非布局值）+verify 全链 exit=0；theme.test.ts 防漂移锁不加（T4 C-4c 上线后 R−D 锚反向护体——T2 票已注记）；门一 4N 注记=注释 grep 双命中[代码口径成立]/T4 前值漂移无锁窗口[低风险]/探针 VAR_DEF 不剥注释[T4 迁驻时加固]/manifest CRLF 既有形态

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
