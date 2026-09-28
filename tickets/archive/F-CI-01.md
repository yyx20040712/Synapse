# F-CI-01 票面归档（F-GOV-01）

- id: F-CI-01
- file: package.json
- area: infra
- owner: strong
- status: done

## summary 原文

CI npm ci 红修复——better-sqlite3 缺省编译动作按包禁用（2026-09-28 网络恢复首推三连红实证立案[CI 末绿=08-27，九月推送断网掩盖红窗一个月]；**阻断 C-A4 C2 终验收锚[CI 首跑绿]与后续全部票 CI 验收**）：行为层=package.json allowScripts 增 better-sqlite3: false（npm 11.19 install-scripts 审批机制官方落盘=npm install-scripts deny better-sqlite3；仓内既有 esbuild@0.21.5: true 先例=机制已启用态；未钉版本键=随升级存活）——根因链（仓外 fixture A/B 全实证）：npm 11.19 对「有 binding.gyp 且无 install 脚本」包在 **npm ci 形态**触发缺省动作 node-gyp rebuild（npm install 形态不触发=本地无感分叉点）→ 缺省命令经 lifecycle PATH 解析项目 .bin 的 node-gyp@9.4.1（@electron/rebuild@3.6.1←electron-builder 传递提升）→ 9.4.1 无法解析 windows-latest runner VS 18 Enterprise（unknown version undefined）→ npm ci exit 1；better-sqlite3@13.0.3 自带 prebuilds/win32-x64.node（F-ELE-02 N-API 化跨 ABI 通用 require 即得）=编译动作零产物需求，deny 后全环境统一跳过、其余包脚本行为不变（uncovered 警示+照跑态）；接口层=package.json 单字段 1+/1−，package-lock.json 零改（fixture 实证 allowScripts 不入 lock+npm ci 同步校验不涉此字段）；架构层=受锁面=无（package 件/registry 均不在 locks manifest 257）——package.json 变更触 CI [dep-change] guard=路径级尾注要求（非依赖增删，票面申报语义）；生命周期=fixture 证据链[npm ci 触发缺省动作 debug log info run code 0 实证+deny 后 897ms 零编译零 info run+require prebuilds sqlite 3.53.4 功能绿]+verify 全绿+**终验收=CI 实跑绿**（本票绿=C-A4 翻票前置锚）；文化层=「本地绿≠CI 绿」新形态登记：install/ci 形态行为差+lifecycle PATH .bin 优先级顶替 npm 自带 node-gyp 12.4.0[该版可解析 VS 18]——CI 失败排障纪律=先 lifecycle 解析链后工具版本；R5 单点配置批定档（1 配置件 2 行内、非受锁/CI/src/shared/tests 面）=门一 k1 单审+主控亲验全机检矩阵；收口 2026-09-28：**终验收兑现=CI run 36372251379 success（08-27 以来首绿——npm ci 步过[deny runner 实证]+指纹门步绿+lock-change-guard 绿+e2e 51 passed 2.6m）**；门链=k1 两轮纯内联零 Read（首轮 PWW B0W3N3：W1 allowScripts CI 零正向实证史→本 run 销项/W2 全树 binding.gyp 静态枚举恰 1 命中+不采全量重装[代理已死毁绿态树风险不对称，呈批理由钉本机 09-19 后 install 成功史]/W3 INV-81 随票登记闭合；delta 复审 PASS B0W0N2：N1 两处措辞即修[状态列锚定中+强制列真实脱扣路径 prebuilds→require→测试红]/N2 推理瑕疵记录）；主控亲验=verify 全量三跑 EXIT=0（177/1943+指纹门 194/1994/6175/12 全等基线+locks 257+exemptions 123）；实现笔=318cd79c521[dep-change][locked-change]恰 4 件 6+/3−（含 INV-81 登记+manifest 同步）；W3 兑现=INV-81 状态列本笔刷新已锚定（CI 面锚=本 run）；C-A4 翻票前置锚随本绿成立；证据=仓外 F-CI-01/（impl 报告+k1 两轮档+raw 13 件+fixture 实验场）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
