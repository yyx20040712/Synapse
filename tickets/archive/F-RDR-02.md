# F-RDR-02 票面归档（F-GOV-01）

- id: F-RDR-02
- file: src/renderer/features/reader/view/AnnotationEditor.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

笔记编辑器偶发无法输入（设计文档 §2.1 P1；D6=症状更正后仍按点击重聚焦——「连输入光标都点不上」≠焦点被抢，更指向点击拦截/弹层态异常，复现审计升级+事件层取证入场景）：①确定性小修=onKeyDown 补 e.nativeEvent.isComposing 守卫（IME 组词期 Escape 不关弹层/ctrl+z 不打断组词——候选根因②；须过既有 IME 用例 annotation-editor-ux:115-378）；②D6 再聚焦=点击弹层容器空白处重聚焦 textarea（目标非 textarea/非按钮才 focus——无害缓解）；③复现审计=四场景真机取证（焦点丢失后打字[全局快捷键吞键]/IME 组词期 Esc[①修面]/页底标注弹层可见性[定位溢出]/点击不上光标时 event.target 实际落点[候选根因④事件层]）——复现命中才立案深修，未命中归档审计结论；use-annotation-draft 16 用例锁面不动；【毕 2026-09-20 三屋全链（门一 FAIL→回炉→PASS）】①isComposing 守卫（onKeyDown 首行早退——组词期 Escape/ctrl+z 不打断，annotation-editor-ux +2 it[18/18 绿，既有 16 用例零改动]）；②D6 重聚焦三守卫（e.button!==0+非 textarea+closest("button") 深判→preventDefault+focus）——**门一 B1 揭发**：pointerdown focus 会被随后 mousedown 默认聚焦抢到 body（jsdom 无该动作族=环境假绿），主控自为回炉补 preventDefault+W1/W2+真机双证（探针 blurred=BODY→完整指针序列点击弹层空白→refocused=批注内容）；③复现审计（主控探针 z-f-rdr02-repro-probe.spec.ts 受锁 248）：四场景**零复现**——①焦点丢失后点击可恢复+输入正常/③弹层在视口内（页底真案例未覆盖留未证伪注记）/④clickLog 捕获相直达 TEXTAREA 无拦截层/②IME 已单测覆盖——与用户「复测已好疑似偶发」吻合，不立深修票；门一 k1 两跳（FAIL B1 时间线逐帧推演→定点 PASS B0/W3/N2）+门二 GO 三条件全销（W-b 指纹门实数 187·1783·5426·skip14[探针在静态扫描面内]/W-a quote 划选取舍主控裁接受[纯展示引文，D6 价值优先]/W-c 真机 M3 红证[去 preventDefault→refocused=BODY 红→还原复绿]）；变异三支（M1 守卫/M2 focus/M3 真机）全还原 diff 空；verify 亲验 EXIT=0（168/1736/locks 248/指纹门 187·1783·5426·skip14）+reader-text e2e 17 passed+model-names 0；批档=仓外 f-rdr02-batch-record.md；[locked-change]（annotation-editor-ux.test/探针件/manifest 247→248）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
