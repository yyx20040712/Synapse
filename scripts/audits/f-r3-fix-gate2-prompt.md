你是终审门二（对抗式二审+独立复算）。对象=AUDIT-C C-1 F-R3 修票（轨二 c CorpusExtractor 失败终接）+主控两项裁决（轨一不升级/轨二 b 不采）。本包自包含（门一报告+主控处置+完整 diff+上游查证档案+补证据）——你无仓库访问，独立复算以包内数字/代码为准，不确定的明确说不。

# 门一报告（Kimi k3 一次命中 65s：3B/2W/0N，总评=PASS 条件性附记）

[门一全文见下方「=== 门一报告全文 ===」段]

# 主控对门一 2W 的处置（你逐条裁决 ADDRESSED / NOT ADDRESSED）

1. **W1（C 变异红证未覆盖同引用重抛+恰一次上限；接线层无锚）**：
   - 已补两项变异红证（主控直做，**定向子集口径=降档证据申报**，文件
     f-r3-fix-mut-supp-{a,b}.raw.txt——包内尾摘）：变异 A（`throw err`→
     `new Error(String(err))` 包装）→ 2 failed（`rejects.toBe(boom)` 同引用
     断言承载）；变异 B（destroy 双调）→ 2 failed（`destroyCalls===1` 上限
     承载）。还原 diff 空亲验。
   - 接线层（getDocument→settleLoadTask）无测试锚：**登记遗留池**（W 级
     观察项，档=f-r3-fix 收口段）——动态 import 桩需 vi.doMock 双 specifier
     （pdfjs-dist+?url worker 模块）成本不成比例；P6 实际风险面=提取加载
     失败（罕见路径）经 e2e corpus 链全量在跑（成功路径）；回退到裸
     `.promise` 的风险=代码审查面可见（票面+头注双声明）。
2. **W2（轨一证据包外不可核实；「零噪不可达」对「降噪」论证不完全）**：
   - 采纳档案动作：本包**全文补入 f-r3-upstream-check.md**（见下方段）——
     版本×修复面矩阵+逐 tag 核验记录可复现（raw.githubusercontent+tag）。
   - 「降噪 vs 零噪」论证差：主控补论证——升级（4.10.38→5.7.284 或 6.3.289）
     的降噪收益=消 devtools-only 噪声（用户路径零影响 6/6 健康在档——收
     益上限=纯开发体验）；代价=跨 major API 迁移评估+[dep-change]+ADR+
     INV-30/INV-16/P1 TextLayer 形状/30 e2e 全量重验（核心阅读链回归面）。
     收益/风险比悬殊是主因，「零噪不可达」是补充非主论据。**长期再评估钩
     子采纳**：升级触发条件备案=「上游 pdfManagerReady 悬尾族全消（终接
     catch 完备）时连同 destroy() 族硬化（claim 拒绝+_setupCapability）一并
     重评」——落 INV 增补文本。
3. **门一 E3（runExtraction finally 可达性包外）**：主控亲验补证据——
   runExtraction 结构=try{加载→循环提取→complete}catch{error 上报}finally
   {doc!==null→doc.destroy（尽力而为）+extracting=false}；加载成功后一切
   中途异常（含 sendChecked throw/页循环异常）必经 finally；doc.destroy 自身
   拒绝仅 console.warn 不阻断（状态机头注跨格序列②在案）。加载失败路径 doc
   恒 null→由 settleLoadTask 终接（本单修复）。**P6 关闭完整性=全路径覆盖**。

# 审计工单（门二四清单+一）

①处置核对：门一全 findings+主控处置 vs 包内证据（补变异红证真实红？upstream
档案与门一转述一致？）。②母本符合度：diff vs 票面（票面=简报③修法段内联在
diff 包头部）。③宪法红线终审：分层/受锁（tests 追加未动既有用例——diff 可
核）/行数/UTF-8/TDD 证据链四档（首红/绿/变异/verify——尾摘可核）。④机器面
核对：数字对账（1081 基线+3=1084；A3 同场+7=1091——两单先后独立 verify 均
exit=0；locks 233 两连）。⑤成本账本行：实现者 GLM5.3 统一档 1.94M tok/38
工具/761s；门一 kimi-main in=7422/out=3386/65s switches=0；门二=你（deepseek
按量）。

输出：[B|W|N] 逐条+统计+总评（PASS/FAIL/条件 PASS——条件须票内可销项）。用中文。
