# R2-SH1 收口单（主控）——应用重命名+userData 迁移收官

> 2026-08-29。三屋零回炉+真机迁移验证通过。门二收口前置五项全兑现。

## 1. 真机迁移验证（备份-换装舞步——门一方案）

| 步骤 | 结果 |
| --- | --- |
| 全备份 | 39M 真实库 cp -r → /tmp/synapse-remake-backup-194651（双课题 default+ws-059434f6） |
| 首启（真跑无 override） | 窗口标题=**Synapse**+品牌位可见；%APPDATA%/Synapse 在（39M 完整）+Synapse Remake 已 rename 走 |
| 二启（幂等） | 跳过分支（正常启动）+旧位零重建+新位课题数据在 |
| 前置态 | 新目录迁移前不存在（NEW_DIR_ABSENT_OK）——真迁移动作非跳过 |

备份保留（回滚可用）；com.synapse.app/ 七月遗物未动（门一提醒在案）。

## 2. 收口核验

- verify 全链 exit=0（888=883+5 精确命中/locks 166/lint/typecheck/build）——
  registry 翻 done+local-state.mjs 改后重跑（顺序铁律）。
- 全量 e2e 26（SYNAPSE_USER_DATA override 面零影响——门一 11 launch 点
  穷举+主控实跑）。
- **提交双尾注 [locked-change]+[dep-change]**（ci.yml:44-48 机械强制
  package(-lock).json 变更——W-G2）。

## 3. 申报栏

1. W1 裁决：grep 验收口径修正——消费/注释面清零 ✓；迁移模块+测试功能面
   字面量 6 处=契约钉死豁免（防常量漂移致迁移静默失效——实现者测试设计）。
2. W-G1/W-G3 主控直改：electron-builder.yml productName/artifactName+
   package-lock.json root name×2（均不受锁直读核实）。
3. W4 local-state.mjs 随收口改（[locked-change] 批内）：新目录优先+旧名
   兜底（迁移前环境兼容）。
4. 诚实性扣点处置：行数申报小误差（224/95 vs 实测 229/82——门二实测在
   档）；e2e smoke/ABI-131 凭据缺口=主控收口全量 e2e 落盘补证。
5. 「显式 setPath」=实现者超票面发现（Electron 启动期缓存 userData 派生
   值）——门二裁定数据安全必要组成，申报合规。

## 4. 遗留池

- installer-smoke.mjs 旧产物名引用（:48-50）——安装器面未启用，dist 历史
  残留非源面；启用打包时随 [locked-change] 同步。
- check-tickets 正则 R2 系盲区（门二 N9 实锤——三单累计在案）。
- dist/ 旧 Synapse-Remake-*.exe 历史构建残留（非源面未动）。

## 5. 成本账本

| 屋 | token | 调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 2,998,309 | 71 | 14.3 min |
| 门一 | 775,169 | 24 | 8.5 min |
| 门二 | 686,892 | 25 | 3.7 min |
