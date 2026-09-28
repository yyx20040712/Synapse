# R2-SH4 票面归档（F-GOV-01）

- id: R2-SH4
- file: src/main/http/http-client.ts
- area: infra
- owner: strong
- status: done

## summary 原文

R2-SH1 漏项清偿第二批（无空格变体+文档路径失真——2026-09-20 ELE03 验收场 R2-SH3 门二 P2-1 呈报，用户点单「立刻立票修复」）：行为层=①src/main/http/http-client.ts:76-77,163 出网 User-Agent \'SynapseRemake/0.1\'（无空格变体逃逸 R2-SH1 空格 grep 口径，生产身份串随 out/main/index.js 出厂）清偿——抽模块级单源常量 USER_AGENT=\'Synapse/0.1.0\'（productName/version 对齐 package.json；版本段 0.1→0.1.0 同笔对齐——UA 为信息性身份串零功能耦合，白名单/超时/重试/礼貌池 mailto 机制零改），fetchJson 组装式+fetchText 字面量两路消费归一；②README.md:1 标题 \'# Synapse Remake\'→\'# Synapse\'；③tools/ai-sensor/README.md:3 应用称谓旧名→Synapse；④tools/ai-sensor/SKILL.md:39,46-48 **路径失真修正**（文档把 ai-sensor 语料目录指向 %APPDATA%\\Synapse Remake\\，R2-SH1 迁移后实际=%APPDATA%\\Synapse\\——消费端按文档找错目录，非仅品牌词）；接口层=src 单文件+文档三处，零逻辑改动；架构层=**零受锁件**（四目标均不在 manifest——受锁命中为 tests/unit/http/http-client.test.ts 等测试件，本票不触碰；测试 :41 仅断言 contain(mailto) 无产品名钉死=亲证）；生命周期层=DoD verify EXIT=0+门链毕，无后验欠账（与 R2-SH3 smoke 后验不同——本票 UA 无服务器侧契约依赖）；文化层=TDD 豁免同 R2-SH3 口径（身份串无行为契约，既有 UA 测试 mailto 断言持续绿=行为中性证明）；前置 R2-SH3（P2-1 发现票）【毕 2026-09-20 ELE03 验收场三屋全链（回炉 1——门一初裁 FAIL 系主控审包转录笔误非实现物缺陷，补证重裁 PASS）】：USER_AGENT 单源常量化（\'Synapse/0.1.0\'=productName/version 对齐 package.json，版本段 0.1→0.1.0 同笔；fetchJson :78-80 组装+fetchText :166 消费——行号经门二 N4 勘正）+README.md:1 标题+ai-sensor README:3 称谓+SKILL.md:39,46-48 路径失真修正（三平台正斜杠 sed 实测）；实现者 ops-executor（session:host-tier，verify EXIT=0×2；残留申报计数 8 未经实测——门一 N10，主控 grep -c 复数更正 9=迁移常量 1+受锁测试 5+local-state 回退 3）；门一 k2 初 FAIL B1/W2/N7→B1（SKILL.md Linux 行疑反斜杠）经主控 sed 地面真值证伪=审包转录笔误→重裁 PASS B0/W0/N10（N8=审包原样性教训实证首例：diff 包一律贴工具原生输出禁人工转手压缩；N9=9/10 口径差=grep 计入 +++ 头行可解释）；门二 GO P0=0/P1=0（独立复算：9 处契约性残留行级复核+out/main/index.js:3238 已携新 UA=构建产物正向佐证+manifest 244 独立计数）+票外 P2-1 呈报：scripts/local-state.mjs:12-13 用法注释仍写缺省旧名（与 :40 实际 Synapse 优先行为不符）——受锁 [locked-change] 归下次 local-state 触碰捎带或另立小票，禁本票扩面；DoD 回写=ADR-0006 二次清偿注；收口 verify 亲验 EXIT=0（open 回落 1）；零受锁件零 [locked-change] 尾注需求

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
