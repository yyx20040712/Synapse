# B7 工单票面——tags upsert 纯空格名空判守卫（AUDIT-B W1 修票，主控压缩票）

> registry：`B7` / file `src/main/services/tags.service.ts` / area service / strong
> 排程真相源=v30 §2 第 1 项（AUDIT-B 开审）→扫描 B7-W1（auditb-scan.md §B7+
> 对抗审 PASS_WITH_WARNINGS 无异议）。
> 形态=主控压缩票直做（SR2-F-09 先例：单卫语句+测试面，担责披露——门审照走双门）。

## 出处与现象

- P7E-01 票面 §⑤ 已知边界预告+B7 探针实锤（auditb-b7.js 真库 IPC：
  `upsert('   ')` → ok 应答+DB name='' 行 1 条+list 浮出）。
- 根因：`tags.service.ts upsert` 仅 `req.name.trim()` 后直传 repo——trim 结果
  空串无守卫（同文件 rename 面已有同型守卫先例：INVALID_REQUEST
  「标签名不能为空」）。

## 修法（对齐 rename 先例）

```ts
async upsert(req) {
  const name = req.name.trim()
  if (name === '') {
    throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
  }
  return tags.upsertByName(name)
}
```

- 消费面（TagEditor createAndAttach）既有 catch→toast 链零改。
- 边界申报：存量库已有的 name='' 行不迁移（用户可经 P7E-01 删除面手清——
  票面外）。
- 头注行为层同步一行（upsert：trim 空拒）。

## 测试规约（TDD）

- 新文件 `tests/unit/services/tags-upsert-guard.test.ts`（既有 service 测试受锁
  不动）：①纯空格名→INVALID_REQUEST「标签名不能为空」（repo 桩零调用）；
  ②正常名透传 upsertByName(trim 后)；③混空白名（制表符+换行）同样拒绝〔门一 N1 同步：原票面写「trim 后入库」，实现并为更强的拒绝面（②已覆盖 trim 透传）——按实现实况修订〕。
- 变异红证 M1：删卫语句（恒假短路）→用例①红（grep 命中证明+cp 备份还原
  diff 空）。

## 验收

- verify 全绿（基线 135 文件 1160+3 用例）+门一 Kimi+门二 deepseek 双 PASS
  （小 diff 包）+registry B7 翻 done+新测试入锁（250→251）+[locked-change] 尾注
  （tags.service.ts 非受锁——仅新测试入锁与 manifest）。
