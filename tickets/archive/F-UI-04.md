# F-UI-04 票面归档（F-GOV-01）

- id: F-UI-04
- file: src/renderer/shared/theme.css
- area: ui-kit
- owner: strong
- status: done

## summary 原文

顶栏文字垂直居中+顶栏/主区背景冷雾灰（设计文档 §2.3/§2.4 P3+P4；D1=冷雾灰挂 main 全局外围/D2=详情栏纯白；**原设计文档票号 F-UI-01 与 :259 done 票撞号改立 F-UI-04**）；【毕 2026-09-20 三屋全链（回炉 2）】①theme.css --surface-cool: #f0f2f5+theme-shell.css .app-header 背景换 token+.app-main 新规则+App.tsx:192 main 挂类（红线全保：--panel/--bg 值/height 56px/app-region 计数 3 处）；②P3 侦察「墨迹偏上」叙事**证伪**（像素探针 V3 亮度判定+用户截图多模态双通道：Synapse 墨迹中心相对整行基线偏下 2.0px/logo 金线 +2.4px；初版探针 alpha 判定在不透明截图恒真退化为盒中心——门二 P1-1 揭发）；回炉 1 translateY(+0.5px) 基于伪数据错误方向已撤；③P3 终值=**用户裁决 2026-09-20「先对齐整行，后面我再反馈调整」**→.app-header-name translateY(-2px)（墨迹中心 29.6→27.6 对齐整行基线；v0.1 实测齐平 0 差不动）——**P3 待用户复验**（复验调值=translateY 值+形态锚值同迁）；④探针件 tests/e2e/z-f-ui04-vert-probe.spec.ts（probe project 常驻像素通道，dpr/双参考系/亮度阈值四通道）；受锁=theme.test（TOKENS+1/形态 it 5 断言/line-height 消息勘误）+app-shell.test（main.app-main 挂载锁 it）+探针件入锁（244→245）；挂载 it 摘类名变异+translateY -2→-1 变异+token 值变异三支红证；实现者 ops-executor 两轮（session:host-tier；拦下主控立案 Edit 吞 ] as const 失误）+门一 k1 三跳（初审 B0/W3/N6 有条件→回炉定点 B0/W1/N7→终值定点 B0/W1/N7——W1 line-height 疗效质疑全程证实）+门二 GO_WITH_CONDITIONS→销项确认 **GO**（P1×5 全销；V1 退化独立复算实锤 −0.80 vs 实测 −0.79）；verify 亲验 EXIT=0（167/1727/245/指纹门 184·1772·5375·skip14）+e2e 默认门 42/42 两轮+model-names 0 命中；批档=仓外 f-ui04-batch-record.md+终 diff f-ui04-final.diff；[locked-change]（theme.test/app-shell.test/manifest+探针件）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
