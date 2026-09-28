# F-TESTREF-00 票面归档（F-GOV-01）

- id: F-TESTREF-00
- file: scripts/check-test-surface.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 P0=测试面指纹门（**收口 2026-09-11 三屋全链+设计链三跳**）：设计链=Kimi 拟定（f-testref00-design-kimi.md，in3087/out8982）→deepseek 对抗审核（B2/W9/N4「不可终裁需回炉」——⑤i 实锤两处：体内条件 skip 15 处首日红/it.each 数组全标识符）→GLM 终裁 docs/design/2026-09-11_f-testref00-design-final.md（B1 skipSites 双向红/B2 新用例带 skip 全局红/W1 describe 标记传播/W2 断言单元=最外层 expect 调用弃区间去重/W3 非静态位源文本摘要/W4 签名多重集计数/W5 激活绿/W6 漏扫哨兵/W7 逐提交范围闸+package.json 双闸正交/W9 M1-M9）；实现=主件 check-test-surface.mjs 386 行+test-surface/extract.mjs 477 行（均 ≤500，W8 拆分落地）+基线 23910 行+空豁免清单；stats=179 文件/1623 用例/4979 断言/15 skipSite（14 helper 体内+1 describe 顶层——文件级多重集建模[自裁①门一预裁接受]/conditional=15/hard=0）/each 展开 160 行（TOKENS 104+DURATION 49+FS_CSS 7，非静态位 ⟨nse:源文本⟩ 键）/UNRESOLVABLE=0；门一 R1 deepseek 兜底（双 Kimi 源 504×6 退避——B1 空基线恒绿通道+W11/N10 放行附条件）→回炉轮 1 八项修复（B1b 基线健全性三重下限+W5 先阻断后写+W8 双桶[hard 删=ACTIVATED 绿]+W6 import 别名保守红+W7 哨兵扩+spec.tsx+W10 NEW 行断言计数+W1 diff-tree -m+W3 正则锚+W4 merge-base 兜底）+两项新自裁（namespace import 红/新文件桶新增红——R2 裁定接受）→门一 R2 kimi-main 第三退避 862s 收口放行（B0/W1[登记后续票 S1]/N6）；变异矩阵 M1-M9+M10 双半+B1b+M3/M5 主控补证复跑（W10 格式 raw 实证）——cp 备份法全 sha 还原一致；基线/豁免入 protectedFiles 双侧登记（check-locks.mjs+get-protected-files.ps1——门一 B1a：信任根受锁）；verify 全链 exit=0 亲验（test-surface:check 已入链 quality 后）；locks 322→325（319→322 为前批立案已提交——门二 N2 勘正）；[locked-change][test-refactor] 双尾注首用；残留面登记 F-TESTREF-S1（W12 哨兵 each 双层形态/N11 本地变量别名/N15 type-only import）；**门一 Kimi 席位补审毕 2026-09-16**（用户裁决补位——R1 deepseek 兜底/R2 定点复核后 Kimi 首次全量独立审：f-testref00-kimi-sup.md，in24918/out7745/246s，B1 新文件 only 逃逸通道+W1 既有用例加 skip 双报+W2 expect 别名断言面逃逸+N1 豁免 stale 计数失真——前两轮共漏项实证）；主控自为四修（B1 NEW_FILE 分支补 only 判定/W1 输出级计数感知去重倒序 splice/W2 ALIAS_WATCHED=三词∪expect 仅 importAliasCheck/N1 exemptHitKeys 改条目对象身份计）+变异 M11-M14 四支全中（f-kimi-fix-mutations-raw.txt：M11 新文件 only→ONLY_FORBIDDEN/M12 恰一 SKIP_ADDED 零 MISSING_CASE/M13 expect 别名→UNRESOLVABLE/M14 stale:1 exit 0——cp 备份法零残留）；Kimi 定点复核 PASS（f-kimi-fix-recheck.md B0/W0/N1 维持收口——N-1 去重键 \x5c0 分隔微硬化采纳延后批落）；verify exit=0 亲验；派发链实录=f-testref00-kimi-dispatch-log.md（含 5 轮 17 attempt 504 排障+499 根因修订）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
