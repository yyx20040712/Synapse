# 交接书 v136 —— F-UIRES-03 B3 阅读器保存按钮批交付（2026-10-05 晚场六）

> 前承 v135（B2 交付）。本档=B3 批三屋全链交付全录+裁决部三条件兑现
> +设计稿 v1.8（退出路径收窄注记——门二 C1）。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋链）；test-driven-development=用（executor
三轮 TDD 面+RR 先红后绿×3）；verification-before-completion=用（verify
亲验真退出码+probe 独立复验双证）；systematic-debugging=不用（无排障）。
配置：executor/probe=宿主随岗（GLM5.3 未绑定形态——账本记
session:host-tier）；门一 k1（kimi-third $max）+d1（deepseek $max）双审；
裁决部 $max 绑定。

## §1 基线终态（对不上禁提交）

- 基线=46777c6926a（v135 文档批，CI success 亲验 run 37320888066；
  B2 主批 run 37315272134 failure=registry 引号 lint 红已由勘误批
  1969aec3ad9 闭合——CI 首查链完整）。本批=B3 一笔（diff 13 tracked
  文件〔含收口注记件〕+2 新测试文件未跟踪转跟踪：notes-store-b3
  .test.ts 357 行/reader-notes-panel-b3.test.tsx 279 行）。verify 终验
  EXIT=0 主控亲验（251 件/2573 例）+locks 355+test-surface 89/89
  hits stale 0。

## §2 B3 交付摘要

- **四件落地**：①notes.store.ts 359 行状态机补格——NoteDraft.saveFailed
  字段（error 态入 store，组件层周期判定整删=双源消除）；dispatchSave
  单口（防抖到期/saveNow/flush 三路共用，载荷=派发闭包快照——「不覆盖
  在途载荷」既有机制）；saveNow（点击清 T 立即落盘，首载门控同
  saveSoon——RR1 补门控边界用例+变异红证）；flush（模块级 inflight
  Map 等待在途→pending 合并态立即落盘/error 立即重试一次/普遍 dirty
  no-op timer 通道承接）；消费时点一=成功回调 editSeq 前进分支启新
  防抖（不依赖组件恰在 edit 时重排）。②ReaderNotesPanel 212 行四态钮
  ——Button 消费 deriveSaveStatus（单一推导点零改动）；钮面即四态唯一
  指示（dirty=主色「保存」可点/saving=禁 spinner「保存中」/clean=灰暗
  禁用「已保存」/error=红描边「重试」可点）；aria-live="polite" 恒挂
  （播报通道恢复——弃 sr-only span=clean 态「已保存」双元素 e2e strict
  必红）；RETRY_A11Y=「重试——上次保存失败」（label-in-name 前缀形）；
  flush 卸载钩子（paperId 变化+组件卸载共用 cleanup）。③Button 加
  title/ariaLabel/className/ariaLive 四可选 props（加法，既有消费面
  零影响）。④测试族——store-b3 15 例（状态机全格 1-9+U1/U2/U 边界
  +三族序列+门控边界；always-active+动态 resetModules 隔离模块级
  编辑元数据）+panel-b3 5 例（四态全格/点击清防抖/error 点击/关面板
  /切文献族）；先红 14/14+5/5；变异四红证（M1 格8/M2 消费时点一/M3
  卸载钩子/M4 首载门控——cp 备份法还原 diff 空毕即删）。
- **门链**：executor 基批→门一 k1 B0W4N8+d1 B0W2N8 双有条件放行→
  主控亲核闭合五项（INV-106 已登记〔审包漏内联非 executor 缺〕/
  RetryButton 12 消费面非孤儿/Button loading 隐含禁用/退出通道=TABS-04
  既有语义/danger 红描边 CSS）→RR1 三件（k1-W1 门控用例/k1-W3 aria-live/
  k1-N2 label-in-name）→双席复核双 PWC（k1 B0W0N3+d1 B0W0N6）→RR2
  微修（d1-N2：e2e getByRole name 加 exact:true——Playwright name 默认
  子串匹配，「已保存/保存中」含「保存」子串会假绿）→probe 九项矩阵
  8 绿 1 部分红（红=主控简报「detectSaveFailed src 零命中」措辞失配
  ——实际零调用点零 import 成立=「纯函数刻意留驻」设计事实非缺陷）
  →裁决部 GO_WITH_CONDITIONS 三条件全兑现（C1 设计稿 §2 B3 退出路径
  收窄注记=本批 v1.8/C2 token 算术闭合——主控简报总额笔误 21,351,468
  →裁决部复算 21,191,113 采纳〔差 160,355=笔误非组件缺〕/C3 豁免
  台账散文勘误+面板头注残句修正+once 队列脆弱性归口记录）。
- **退出通道裁定（d1-W1，主控明示接受）**：票面「应用退出时等待在途
  完成后落盘」在 destroy 绕过 renderer 卸载事件的技术事实下不可达
  主动落盘；退出通道=INV-22 拦截族承载（tabDirty 在 saving∧pending/
  error 全程恒真→拦截必触发+确认框=用户知情放弃未落库增量〔TABS-04
  生命周期层既有决策〕+拦截窗内 renderer 存活 timer/在途照常落盘）。
  收窄已回写设计稿 v1.8 §2 B3 注记。
- **豁免 4 条**（89/89/0）：e2e「未保存」1+panel「未保存」1+「保存
  失败」正负 2——四态钮保意改写（rulingLink=设计稿 §2 B3）。
- **probe 矩阵**：verify EXIT=0（251 件/2573 例=裁决部从账本独立复算
  闭合：249+2 件/2553+14+5+1 例）+e2e 四件（reader-text 18〔含
  exact 加固后 A3〕/smoke 6/reader-scroll 2/lineage 15——:1294/:407
  StatusBar 双锚在位=StatusBar 不动实证）+变异独立复现（摘 flush 调用
  →恰关面板+切文献两族红 exit 1→还原 diff 空→复绿 5 passed）+行数
  五数（359/212/67/357/279）+grep 五面+未跟踪面恰 2 新测试件+中文
  可读。证据全档=仓外 E:/zcode_md/synapse-archive/scripts-audits/
  f-uirs03-b3-gate2-probe/（14 件——probe 依 §3 纪律直写仓外，仓内
  零残留）。

## §3 操作条款增补（承 v135 §3 全项外）

- **e2e getByRole name 判别力口径**（d1 复核 N-2 实锤）：Playwright
  getByRole 的 name 匹配默认=不区分大小写**子串**匹配——多态共词根
  钮面（「保存/已保存/保存中」）必须加 exact:true 锁全串，否则非目标
  态可假绿。后续 e2e 断言钮类元素一律核对此口径。
- **主控组审包自查**（k1-W4 教训）：审包「实现 diff 全录」清单需含
  docs 面（invariants/design）——executor 交付清单申报过的文件必须
  入包，防「包内无法裁决」假 W。
- **主控简报数字自加总复核**（裁决部 C2 实锤）：呈裁决部/交接书的
  token 总额=各组件值亲加一遍再落笔（本批笔误差 160,355 被裁决部
  独立复算拦截）。
- **probe 简报 grep 期望措辞**（probe 红项①教训）：「零命中」类字面
  期望须与设计事实对齐（留驻定义件+注释≠消费泄漏）——意图层表述
  （「零调用点」）优先于字面层（「零命中」）。

## §4 挂账与下场首办

- **挂账**：detectSaveFailed 留驻（src 零调用点+锁定测试锚定——与
  C4 陈旧注释〔ai-sensor.service.ts:15+check-quality.mjs:91〕同批
  清理票，删除走 [locked-change]+锁定测试改写）。
- **N 级备案（全提示级）**：U1 等待语义判别力固有弱（终态同值——
  防线=不双发并发写语义注记）/panel-b3 for-8 微任务 hack+once 队列
  跨例脆弱（裁决部 N-2：clearAllMocks 不清 once 队列，切文献例变异
  失败实为队列级联——击杀仍成立）/快速切回竞态=既有 load 守卫涵盖/
  「已保存」钮面+StatusBar 双元素靠 locator 域隔离（全页域断言未来
  撞 strict 风险）/首载窗口内点击无反馈（窗口极窄声明）/退窗 error
  态无自动重试（用户取消可手动重试）/钮 entry===undefined 过渡期
  live region 重建不播报（k1 复核 N1 边界）。
- **下场首办=C3 拖拽域重构**（设计稿 **v1.8**——v1.7 用户裁决增补
  〔卡双击退役+卡面「去文献库/去阅读器」两钮+主题节点态+e2e 面〕
  +v1.8 退出注记；T0 双红实锚随票：样板①候选槽陈旧几何+样板②包含
  块错位；F-LOCATE-01 无关——拖拽域不涉跳转链）。C3 派发前瞻四项
  （承 v135 §5.3）：①LineageTimelineCard 行数预核（增补两钮+退役
  双链后逼近组件 ≤250 行预算即先拆件）；②主题节点「去阅读器」零
  渲染/禁用态=实现者自裁申报项，C3 收口回写票面定稿；③C3 实施触
  tests/**（受锁）——locks 流程+[locked-change] 尾注+受锁 e2e 改动
  后全量 verify（tsc 关卡）随批（注意 B1 终裁口径：diff 含 src 时
  单尾注 [locked-change] 禁带 [test-refactor]）；④「去阅读器」=
  requestOpenPaper 单字段语义派发时核对现签名。
- CI 首查：本批一笔 run。

## §5 新会话开工序

1. CI 首查一笔 run（B3 提交）。
2. C3 派发（票面=设计稿 §2 C3 v1.8 节；输入含 T0 双红实锚+C3 前瞻
   四项；样板①②去包装翻转直陈销项=B/C 单元 DoD 增项随票）。
3. C3 毕后 C1（线型链+换色，迁移 015 挂靠——呈裁①深蓝 #1e3a8a 已
   定稿）→C2（锚点+吸附——样板③随 C2 形态更新）。
4. 无待裁阻塞项（呈报两项已于 2026-10-05 裁决：AI 入口维持退役/
   卡钮并入 C3）。

## §6 本场成本（收口登记）

- executor（GLM5.3 宿主随岗）：基批 13,334,691+RR1 5,408,657
  +RR2 839,455。
- 门一 k1（kimi-third $max）：一审 38,045+复核 44,932。
- 门一 d1（deepseek $max）：一审 75,943+复核 39,538。
- probe（GLM5.3 宿主随岗）：1,409,852。
- 前置链合计 21,191,113 subagent tokens（裁决部独立复算两处关键
  数字〔vitest 计数链+总额〕——主控简报总额笔误 21,351,468 经复算
  修正采纳，C2 兑现）。
- 裁决部（kimi-third $max）：1,584,559。
- 总计 22,775,672 subagent tokens。账本 680→692（B3 十二笔：impl
  ×3/k1×2/d1×2/ruling×2〔亲核+条件兑现〕/RR1·RR2 并入 impl 笔/probe/
  裁决部/commit——ts=链路序补记非事件实时，02 §9 主控补记条款）。
