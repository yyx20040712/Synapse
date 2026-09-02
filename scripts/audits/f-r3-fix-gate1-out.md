[routing]: run=20260902042905-iy8b source=kimi-main model=kimi-k3 switches=0 usage=in=7422,out=3386 latency=65031ms (by ds-call.mjs 链)

# 门一审计报告——AUDIT-C C-1 F-R3 修票 + 主控两项裁决

---

## A. 母本符合度 —— [B]

- **settleLoadTask 契约三径逐字落地**（CorpusExtractor.ts:191-197）：
  ```ts
  try { return await task.promise }
  catch (err) { await task.destroy().catch(() => undefined); throw err }
  ```
  成功透传不调 destroy ✓；失败 destroy 恰一次 ✓；destroy 拒绝吞并（`.catch(()=>undefined)`）后 `throw err` 原引用重抛 ✓。
- **三径被测试逐径锚定**（test:276-303）：三用例一一对应，含同引用断言（`rejects.toBe(boom)`，强于同消息）。
- **接线零行为变更**：成功路径 `return await task.promise` 透传，doc.destroy 归 runExtraction finally 语义未动（:212-213）。
- **头注状态机表如实**：:31 原证伪格拆为双路径两行（加载失败=loadingTask.destroy 加载器内终接 / invoke 折叠+提取异常=doc.destroy 归 finally），跨格序列②同步改写「两面不阻断」，与实现一致。
- 「不做」清单（runExtraction/防御分支/PdfDocProvider/序列化/e2e）diff 中零触碰 ✓。

## B. 宪法红线 —— [B]

- CorpusExtractor.ts 现 311 行 <500（报告 wc -l 实测，diff 增量 +39/-3 与规模自洽）；测试件 304 行，报告声明 tests/** max-lines 豁免——豁免条款在包外，**不确定**，但循既有惯例可信。
- 无新依赖（diff 仅两文件+manifest）；分层无污染（renderer 内纯函数）。
- 受锁面：测试件 diff 仅两块（@@ -1,11 +1,13 @@ imports / @@ -252,3 +254,51 @@ 文末追加），**既有用例零触碰**；唯一既有行改动=RenderCanvas import 行加尾逗号（import 重组副产物，非用例语义）。manifest 4 行哈希更新与 locks:apply 一致（verify locks=233 绿）。

## C. 代码与测试质量 —— [W]

1. **变异红证覆盖不全**：变异（destroy 调用→`Promise.resolve()`）仅击中两个失败路径用例的 `destroyCalls===1` 断言，证明「destroy 被调」承载真实；但 ①「重抛原错误**同引用**」断言（`rejects.toBe(boom)`）未经变异红证——若实现改为 `throw new Error(...)` 包装，无变异数据证明测试会红；②「恰一次」上限（destroy 调两次是否红）未证。断言形态本身（`toBe(1)`）具备该能力，属证据链缺口而非断言缺失。
2. **loadPdfDocument 接线无测试锚**：三用例直锚 settleLoadTask 纯函数，「getDocument→settleLoadTask」接线（:211-213）本身无用例——若接线回退为 `return getDocument(url).promise`，全部测试仍绿。getDocument 模块内消费难以结构桩注入，缺口可理解，但 P6 病灶正是接线层句柄丢弃，**建议后续单补接线形态锚**（或 e2e/集成层）。
3. 「成功路径不调 destroy」断言对生产语义覆盖充分：settleLoadTask 成功路径结构上无 destroy 调用点，断言与实现同构，无恒真风险。
4. cast 形态 `as unknown as Promise<PdfjsDocumentLike>` 循简报指定，T 由 task 推断，收窄合理。
5. 与 PdfDocProvider「句柄在册+cleanup destroy」语义一致：失败=就地终接、成功=所有权移交调用方 finally，生命周期单一持有者。
6. 次要观察（不定级）：`await task.destroy()` 若 hang，原错误将无限期不可达——票面契约即如此（"destroy 后重抛"），实现合规；pdfjs destroy 通常即决，风险低，备案。

## D. 报告诚实性 —— [B]

- 自裁 2 项（头注接口层 :42 段登记 settleLoadTask + 测试面 :71 段登记 + loadPdfDocument 注释一行 + locks:apply）vs diff：逐句可对应，**无未申报改动**。
- 数字对账自洽：红 1081+3 失败=1084、绿 1084、变异 1084（mutation 文件尾摘为还原复跑段，报告已注明「同上文件（追加段）」，非伪造）；首红 2 Unhandled Rejection 在 §3 主动披露并解释成因（实现缺失时 reject 桩无人接），绿后消失实证。
- 用例计数「基线 1081+新 3=1084」与简报预期一致，diff stat（87+/10-）与报告 §2 文件清单一致。

## E. 接缝与后续单 —— [W]

1. **轨一不升级——证据不可核实+论证目标偏移（可攻击点）**：裁决核心实锤（v5.5.207 onFailure 终接守卫=8/8 指纹逃逸汇聚点、单处 diff、残余窗口 6.3.289/master 未修）全部在**包外档案 f-r3-upstream-check.md，本包零证据**——明确说不确定，无法独立复核。论证结构上的弱点：裁决以「任一升级档位不能承诺**零**同族噪声」否定升级，但若目标是「**降**噪」而非「零噪」，消除 8/8 指纹主逃逸点本身仍有价值——残余 pdfManagerReady 悬尾与主指纹的**相对量级未量化**，「不可达零噪声」不构成「不降噪」的完整论据。不过反向面（跨 major 回归面 INV-30/INV-16/TextLayer/30 e2e 重验 vs devtools-only 噪声、用户路径零影响 6/6 在档）权重确实悬殊，**裁决结论可维持，但建议主控将 f-r3-upstream-check.md 证据补入档**，并把「降噪收益量化」留为长期再评估钩子。
2. **轨二 b 不采——[B] 内嵌**：机理准确（await 旧 destroy 不改噪声本体、引入串行切换确定代价），在轨一已接受噪声的前提下 b 无独立收益，逻辑自洽，未见漏洞。
3. **P6 泄漏面关闭完整性**：本修法关闭了「加载失败」丢弃点——worker-per-task 事实下 destroy 为唯一终止口，settleLoadTask 覆盖 getDocument 之后所有拒绝路径（Promise.all 失败时 task 未创建无泄漏；getDocument 同步抛同理）。**残余不确定**：成功路径的 doc.destroy 归 runExtraction finally——runExtraction 代码在本包外，finally 是否对所有中途异常路径可达无法核实（头注如此声称，本包无反证）。建议后续单对 runExtraction finally 可达性做一次性核对即永久关闭 P6。
4. **上游残余窗口长期风险**：4.10.38 冻结+主进程 level1 代理计数监控备案是合理缓释；风险=监控阈值失效时噪声回归无预警——属既有备案面，非本单新债。

---

## 统计

**3B / 2W / 0N**

| 项 | 级 |
|---|---|
| A 母本符合度 | B |
| B 宪法红线 | B |
| C 代码与测试质量 | W（变异红证未覆盖同引用重抛断言；接线层无测试锚） |
| D 报告诚实性 | B |
| E 接缝与裁决 | W（轨一证据包外不可核实+「零噪不可达」论证对降噪目标不完全） |

## 总评

**PASS（条件性附记）**。修票本体与票面逐字符合、测试三径锚定、报告零未申报改动，两项 W 均不阻断收口：C 项缺口（接线无锚/变异红证不全）建议登记后续单补锚；E 项轨一裁决结论维持，但主控应将 f-r3-upstream-check.md 实锤补入本档，否则「查证实锤」对后续门审不可复核。