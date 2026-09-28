# R2-SH3 票面归档（F-GOV-01）

- id: R2-SH3
- file: scripts/installer-smoke.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

R2-SH1 漏项清偿——installer-smoke 常量面对齐 productName=Synapse（2026-09-20 ELE03 验收场用户点单「把小票清理掉」当场立项；出处=ADR-0006:111「R2-SH1 漏项，独立于本票」+F-ELE-03 收口欠账「installer-smoke productName 失配（独立票）」+增补十四 R2-SH1 预警段）：行为层=scripts/installer-smoke.mjs:48-50 三常量改写（REG_KEYS 产品名键 \'Synapse Remake\'→\'Synapse\'——子串超集旧键覆盖面不减；APP_EXE \'Synapse Remake.exe\'→\'Synapse.exe\'；UNINSTALL_EXE \'Uninstall Synapse Remake.exe\'→\'Uninstall Synapse.exe\'——与 electron-builder.yml productName=Synapse/artifactName 实配对齐）+docs/DEVELOPMENT.md:88 artifactName 文本勘误（dist/Synapse-Remake-<version>-setup.exe→dist/Synapse-<version>-setup.exe）；接口层=纯常量+文档勘误零逻辑改动；架构层=受锁 scripts/*.mjs 单链 [locked-change]（unlock→改→apply，manifest 条目数 244 不变仅 sha 同步）；生命周期层=功能级验证（smoke 实跑装/起/卸三断言）归 dist 产出后——本机 dist 阻塞在案（增补十四 C 段双因），DoD 收口线=verify EXIT=0+locks 一致+门链毕，smoke 实跑后验项挂增补十六；文化层=禁扩面（README.md:1 标题旧名=观察项呈报另裁不属本票；dist/ 旧产物 Synapse-Remake-0.1.0-setup.exe 假阳性面=补验时 --installer 显式指新包已在档）；TDD 豁免申报=常量对齐无单元测试面（smoke 依赖真实安装器产物，环境阻塞在档——「每个测试必须能失败一次」以 smoke 后验红→绿路径替代）【毕 2026-09-20 ELE03 验收场三屋全链（回炉 0）】：三常量改写+DEVELOPMENT.md:88 勘误+受锁单链（unlock→改→apply，manifest 244 条目数不变仅 sha 同步）；实现者=ops-executor（session:host-tier，零超票面；残留扫描只读申报 7 合法+3 疑似）；门一 k2 PW B0/W1/N5（W1=REG_KEYS \'Synapse\' 第三方同名软件假阳性面未注记→主控顺带修 :48 注释；N5 第四处旧名疑虑→主控 grep 亲证本文件仅 :48-50 三处消解；N3 票外三件呈报用户；N4=smoke 后验挂增补十六）；门二 GO_WITH_CONDITIONS（独立复算=manifest sha256 计数 244/registry open 计数 2/81 文件残留全量分类）+**新发现 P2-1**：src/main/http/http-client.ts:76-77,163 出网 UA=\'SynapseRemake/0.1\'（无空格变体逃逸 R2-SH1 空格 grep 口径，生产身份串随 out/main/index.js 出厂）——按禁扩面不修，呈报用户立票/豁免（门二条件 i 禁静默丢）；ADR-0006:111 欠账行回写清偿注（DoD 回写项）；收口 verify 亲验 EXIT=0（open 回落 1）；smoke 实跑后验=增补十六补验项（门二条件 ii 不销项）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
