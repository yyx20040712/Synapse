# 交接书 v203 —— F-DRAGREMOUNT-01 三屋收口+REQFP 设计先行定稿（2026-10-16 午后）

> 前承 v202。本档=视检前序两项交付+**下场开工序单源**。用户指示：当前事项
> 完成后暂停交接（上下文预算管理）——B6 候补与 UIRES-04 翻 done 移交下场。

## §0 本场总账（runId=20261016-dragremount01）

| 事项 | 交付 | 终态 |
| --- | --- | --- |
| F-DRAGREMOUNT-01 | 方案 A 全链：实现 r0→门一（d1 PASS+k1 PWC 三 W）→回炉 r1→双席增量复审双 PASS→门二 probe 7/7+裁决部 **GO 零回炉** | 提交 6492ccba [locked-change]；CI run 38846924782 @6492ccba **success**；registry 翻 done |
| F-REQFP-01 设计先行 | 三段通道全链：drafter v1→auditor round1 返工（B1/W8/N11）→主控终裁 20 条→v2→auditor round2 有条件放行（B0/W3/N8+20/20 吸收）→主控终裁 v2.1 | 提交 b2e7a5e9（docs/design/2026-10-16_f-reqfp01-design-final.md）；O-2 留用户 |
| 治理补档 | 门一四轮审档+裁决档落仓外（28/29 号——裁决部 N1 处置） | 仓外 20261016-dragremount01/ 00-29 共 26 件 |

技术要点存档（下场免重研）：fosterRow=Math.min(positionOf(m.nodes.findIndex(id),
frameW).row, rows.length−1)——同计数行数同构原行恒在，keyed 同父=节点保育；
INV-140 在册（双件互指）；「尾挂」5 命中主控裁保留（kids 末位义机械真+单行
fixture 题内自洽）；第 18 例②段 message「remount」措辞裁维持（断言本体正确，
裁决部 N3 备查）。

## §1 下场开工序（单源）

1. **B6 候补**（v193 §2 立项，v200 用户指示列入视检前必完）：toast-store
   fold 三边界断言微批——**主控预研已定形三例**（本场已完成代码/测试面预研，
   下场可直接派发）：①error 6s fold 计时刷新（fold 后 t=9500 在场判别——B2
   只锁 success 3.5s 面）；②窗内 fold 计时重置+fold 先于 1s 窗次序锁
   （toast-store.ts:62「在场折叠先于窗」无锁——t=600 窗内折叠→3900 在场，
   次序颠倒即红）；③fold 后 1s 内 ×关再弹被窗拦（B5 只锁 >1s 放行面——
   dismiss 后 1s 内重弹=0 卡，出窗=1 卡）。落点=tests/unit/renderer/toast.test.
   tsx 折叠族 describe 内三例（always-active）+manifest sha+[locked-change]；
   紧凑三屋单元（禁与本批豁免面混淆——纯增例=⊇ 绿零豁免）。
2. **F-UIRES-04 翻 done**：registry 单行 status 翻转+批毕注记（批 3a-3d 全
   链已毕，票维持 open 仅因穿插窗序）——收口 verify 全量+push+CI 回执。
3. **用户集中视检轮**（§1.1-2 毕后主控提示排期；清单 v2=仓外
   20261015-uiinv/visual-inspection-checklist.md 面 1-7；DRAGREMOUNT 跨行
   拖起+指针停顿=清单新增候选点——门一 d1 建议在档）。
4. **下载模块 B1-B8（乙案序）**：沿 v202 §1.3 全文（B1 首动作=设计书正本
   入仓含 §3 勾选批量获取 v2.2 增补段+registry 立票+负面清单修订入宪
   [locked-change]——修订措辞随 v202 裁决）。

## §2 待用户面

1. 集中视检排期（§1.1-2 毕后）。
2. **REQFP O-2 呈裁**：Res 同批覆盖与否（主控推荐**同批**——对称静默面，
   边际成本≈金件体量翻倍；备择 Req 先行=res 键下批走 format-upgrade 单条
   登记）——U1（walker 核心）与 O-2 无耦合可先行，U2 金件形态待裁。
3. B5 呈样参数+B6 顶刊预设包清单呈样；四小面默认 v2.1 推荐值（沿 v202 §2）。

## §3 本场治理注记（新纪律两条+沿承）

- **门一回报即落档**（裁决部 N1）：门一审档=证据件，主控收到回报即写仓外
  runId 档（本场四轮系收口时补档——下场起即时落）。
- **变异链落档三步全录**（裁决部 N2）：cp 备份法证据链=变异→红→还原
  diff 空**各自实录行**（本批五支 raw 缺第三步显式行，还原事实经三重间接
  路径实证后放行——下场起三步全录）。
- 主控简报预期数字笔误两起（「九卡」/manifest 第三件误列 card-drag-
  session.ts——probe 纠正）：派发简报数字落笔前对账实测口径再收紧。
- exemptions 6 条在场（MISSING 设计通道合规）——**滞后窗口基线再生成候选**
  =下场触 test-surface 面批顺带（批 3d 先例：再生成+豁免死条目收敛）。

## §4 基线与治理

- HEAD=v203 本笔（docs-only）；前两笔=b2e7a5e9（REQFP 设计稿）+6492ccba
  （DRAGREMOUNT 收口 [locked-change]，CI success 在档）。
- registry 290 票 **open 8/done 282**（F-DRAGREMOUNT-01 翻 done）；指纹门
  **366/3617/12048**；locks **459**；exemptions 6/6/0。
- 成本（模型×供应商×套餐分列）：实现者 2 轮 6,511,867+门一 k1 两轮 76,639
  （kimi-third $max）+d1 两轮 155,763（deepseek $max）+probe 1,694,713+
  裁决部 1,499,318（kimi-third $max）=**本批 8,438,982 subagent tokens/
  77.4min**（实现者/probe=session:host-tier 随宿主档——环境限制欠账行在
  账本）；设计链（REQFP，已入 b2e7a5e9 提交注）=drafter 120,691（kimi-third
  $max）+auditor 186,021（deepseek $max）=306,712。主控=GLM-5.3 host 档。
- v203 push 后 CI 回执沿承 docs 笔全量口径（下场首动作核对或本会话收尾
  在档——视会话存续）。

## §5 沿承挂账

v201 §5 全沿承（IG-01 残余/批 3d 残余/F-M2SUB-01/pdfjs 升级票/kimi-main 认证
观察/v192 余项/计数三现记档）+v202 §5 同；本场零新增挂账（两 N 纪律已入 §3
转正，N3/N5 备查项不占挂账）。
