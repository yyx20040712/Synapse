# F-ELE-02 票面归档（F-GOV-01）

- id: F-ELE-02
- file: package.json
- area: infra
- owner: strong
- status: done

## summary 原文

Electron 实施窗票 A：better-sqlite3 12.11.1→13.0.3 N-API 化（用户点单 2026-09-19「立刻执行 Electron A/B 票」——增补一 Ruling ② 排期兑现；产研依托=docs/reports/2026-09-18_ele-upgrade-prestudy.md §4 票 A；§6.6 矩阵时效复核 2026-09-19 通过：13.0.3 仍 npm 最新、engines node>=22）：[dep-change]——①package.json 钉版+lockfile 同步；②.npmrc better_sqlite3_binary_host_mirror 行清理（prebuild-install 依赖随 v13 移除）；③sqlite-abi.mjs 双 ABI 机制整体退役（方案切换=删除旧方案，宪法——scripts/sqlite-abi.mjs 删除[受锁，unlock→删→regenerate→apply 单链]+package.json scripts 四调用点[postinstall/dev/build/test]改写+ELECTRON_ABI_MAP/abi-cache 机制消解+install-electron 保留；check-quality.mjs 实测零引用=条件句不触发）；④documents 勘误=ADR-0006 增执行记录+勘误「v13.x 无任何 win 预编译」句+AGENTS 环境事实段三处失准描述（V8 直接绑定/sqlite-abi.mjs 双 ABI 管理/v13 无预编译尾句）+security.md 版本行核实（无 SQLite 版本行则零改票内自裁申报）；⑤验证=verify 全链+e2e 双通道+FTS 契约面（SQLite 3.52.x→3.53.4）；低风险（三运行时实测已过，产研 §1.3）；排期=第七波 A→B【毕 2026-09-19 batch 31 三屋全链（回炉 1）】：npm install v13.0.3（+1/−16/changed 1，prebuild-install 全树消失）+scripts 四调用点摘除+.npmrc 镜像行删+sqlite-abi.mjs 删除（受锁单链 245→244）+tests/e2e 双文件 v12 换绑段删（受锁单链，回炉 #1——e2e 曾 34+36 红全因 abi-cache ENOENT，修后 42/42+44/44 全绿）+文档勘误九处（ADR-0006 执行记录+勘误/AGENTS 四处/architecture §7.8 回写/DEV-SETUP 三处/DEVELOPMENT 三处/README/ci.yml 注释/dist.mjs 头注受锁）——门一 k2 PW B0/W4/N5（W3 §7.8+W1 前两处主控顺带修，余项落 F-ELE-03 承接）+门二 GWC P0=0/P1=2/P2=3/N=7（P1-1 六处同族残留主控顺带修+P1-2 staging 含 ci.yml 兑现+P2-1 计数勘正四处+P2-2 提交注记兑现）；M1 变异红证（prebuilds 移走→21 文件红 Cannot find module build/Release→还原复绿）；verify EXIT=0 恒等链（167/1724/244/指纹门 183·1768·5368·skip14 零漂移/renderer 产物同名同尺寸）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
