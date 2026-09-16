[routing]: run=20260916015328-6750 source=kimi-main model=kimi-k3 role=gate1-reviewer@9549e465 cfg=bec09005e3ac switches=0 usage=in=3874,out=2244 latency=50323ms (by ds-call-v2 链)

# 门一定点复核：F-TESTREF-00 修复轮

## 逐条核：diff vs 声明

**B-1（新文件 only 逃逸）——修复属实。**
diff `check-test-surface.mjs` 新文件分支循环头部（+144~152）：

```js
if (cs.markers.includes('only')) {
  failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
  continue
}
```

- only 判定先于 skip 判定，恒红无豁免通道，与"only 恒红含新文件"声明一致。
- 既有文件分支（+305 段）未触碰，行为保持。
- M11 raw 对拍：`FAIL ONLY_FORBIDDEN ...:2 「m11 only case」` exit=1，删除后 exit=0——证据吻合。

**W-1（双报去重）——修复属实，倒序 splice 正确。**
+314~335：先建 `skipAddedCounts`（path+title→次数），再 `for (let i = failures.length - 1; i >= 0; i--)` 倒序遍历，命中 MISSING_CASE 且计数>0 时 `splice(i,1)` 并递减。**倒序删除是 splice 边遍历的正确姿势**（正序会跳项），计数感知可处理同 key 多条 SKIP_ADDED。去重仅作用于输出数组，判定逻辑与 exit 路径未动（failures 仍在同一数组上，exit 由长度导出——去重后 MISSING_CASE 不再计数，这正是声明意图）。M12 对拍：恰一条 SKIP_ADDED、`MISSING_CASE count=0`、exit=1——吻合。

**W-2（expect 别名监视）——修复属实，哨兵面零影响（diff 可见范围内）。**
`extract.mjs` +42~44：`ALIAS_WATCHED = new Set([...THREE_API, 'expect'])`；仅 `importAliasCheck` 三处判定（default import 伪装、命名别名、伪装本地名）由 THREE_API 换为 ALIAS_WATCHED（+179、+195~198）。diff 内无其他 THREE_API 引用点改动，哨兵匹配面（callee 白名单）不在本 diff 触及范围。M13 对拍：`expect as exp → UNRESOLVABLE` exit=1，删除复绿——吻合。

**N-1（豁免身份计）——修复属实。**
四处 `exemptHitKeys.add(字符串key)` 全部改为 `for (const h of hit) exemptHitKeys.add(h)`（+187、+195、+208、+216、+254、+272、+308），Set 以条目对象身份去重：同条目跨 kind/多次命中计一，与声明一致。M14 对拍：伪豁免条目 `entries:1 hits:0 stale:1 exit 0`；终态 `entries:0 hits:0 stale:0` + `NO_RESIDUE`——吻合。

## 新破坏扫描

- 去重块 key 为 `` `${f.path} ${f.text}` ``，空格分隔存在理论碰撞（含空格路径+标题串拼接歧义），可致真实 MISSING_CASE 被误去重而静默。仓内测试路径无空格属常态，实际触发面≈0，记 N。
- 豁免上报侧（exemptHitKeys.size 的消费处）不在 diff 内，但 M14 输出实证 hits/stale 语义正确。
- 复核指令提及的 **postJson 传输层替换（重试/退避语义）在本 diff 中不可见**——按铁律标**不确定**，本趟无从裁决。
- 新文件 only+skip 同挂时仅报 ONLY_FORBIDDEN（continue 短路 skip 分支），属合理取舍，非缺陷。

## 总评

四条修复逐条与声明、变异 raw 三方对齐；倒序 splice、ALIAS_WATCHED 作用域、对象身份计三个重点攻击面均未发现新破坏。**维持收口。**

## 逐条发现

- [N-1] 去重 key 空格分隔存在理论碰撞（`check-test-surface.mjs` +320/+326：`` `${f.path} ${f.text}` ``），含空格路径下可误吞 MISSING_CASE；当前路径形态下不可触发。建议（非阻断）改用 `\0` 分隔。
- （非 finding）postJson 传输层影响：**不确定**（diff 外不可见）。

FINDINGS: B=0 W=0 N=1 VERDICT=PASS