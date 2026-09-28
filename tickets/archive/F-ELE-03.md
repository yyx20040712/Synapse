# F-ELE-03 票面归档（F-GOV-01）

- id: F-ELE-03
- file: package.json
- area: infra
- owner: strong
- status: done

## summary 原文

Electron 实施窗票 B：Electron 42.9.3→44.4.3（用户点单同 F-ELE-02；§6.6 复核 2026-09-19：44 线最新 44.4.3——超产研快照 44.4.1 两小版钉版随更新、EOL 2027-03-02 不变、42 线 EOL 2026-10-20 不变）：[dep-change]——①package.json devDeps 钉版+lockfile+install-electron 重验（懒下载+npmmirror 镜像）；②clipboard 三点小改（bootstrap.ts 注入→ipc-deps.ts 类型 writeText Promise<void>→ipc/export_.ts 调用点 await/.catch——44 clipboard main 侧 Promise 化 W3C 对齐，错误面 throw 变 unhandled rejection）；③dialog defaultPath 决策点（src/main/dialogs.ts 三处未传——显式传 lastUsedPath 保体感约 10 行或接受新默认 Downloads，实施时主控裁）；④Playwright 驱动兼容首验（@playwright/test ^1.49.1 驱 M152 CDP——红则升级=独立工作量+指纹门基线重冻结）；⑤回归验证主体=e2e 双通道全量（默认门+一键全跑）+pdf.js 渲染人工视检一轮（ANGLE 静态链接，ADR-0006 修订记录既定要求）+build 冒烟；回退路径=钉版回 42.9.3 零连带（v13 在 42 下已实测，两票分离红利）；中风险（Playwright 漂移为主变量）；前置 F-ELE-02；排期=第七波 B；**门一 W1/W2/W4 承接顺带（2026-09-19 F-ELE-02 门一 k2 W 清单落票）**=electron-builder.yml:5,26 注释+:48 死配置（abi-cache 排除行）勘误+tests/e2e/seed-paper.mjs:4-5 头注勘误（受锁单链）+docs/DEV-SETUP.md:72 基线数字刷新+package.json engines >=20→>=22 收紧评估（[dep-change]——AGENTS:251 句同步再勘误）+npm run dist+smoke:installer 打包通道冒烟（W4——electron-builder.yml:17-18 验收句失真面实证）【毕 2026-09-19 batch 32 三屋全链（回炉 0）】：devDeps 钉版 44.4.3+engines >=22 收紧+clipboard 两点（Promise<void>+await/重抛）+dialogs lastDir 内存态三 pick+受锁两件单链（seed-paper 头注+export-clipboard.test 类型面 6 处——主控 [locked-change] 裁决直修）；e2e 双通道 42/42+44/44 全绿（@playwright/test 1.49 驱 M152 零漂移——产研主变量消解）+postfix verify EXIT=0 零漂移+audit --omit=dev 0 漏洞+renderer 产物同名同尺寸；门一 k2 第七票 PW B0/W3/N8（W1 architecture §7.8 主控顺带修+W2/W3 欠账携带）+门二 GWC P0=0/P1=3/P2=3/N=8 全兑现；**欠账**=dist/smoke 未端到端（环境阻塞：宿主 EBUSY+winCodeSign 无特权——修法=管理员终端跑一次 npm run dist 重建缓存，2026-08-22 先例；electron-builder 已进 packaging electron=44.4.3 段）+pdf.js 像素级人工视检归用户在场轮+R2-SH1 installer-smoke productName 失配（独立票）+本机 default_app.asar 残留 42 版内容（宿主会话锁，次会话 npm install 自愈）；W-11 字面未触发（tests/utils/ipc-deps.ts 零触碰，还原项落地面已变 Promise<void>）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
