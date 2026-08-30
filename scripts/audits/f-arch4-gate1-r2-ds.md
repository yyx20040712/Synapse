### 判定结果

**N1：ADDRESSED**  
证据：`annotation-anchor.ts:31-33` 拆述版已改为「SelectionLayer 只经 anchor-serialize 间接调用；AnnotationLayer/AiAnnotationLayer 直调 findRangeAtOffset(几何)+经 anchor-serialize 调 verifyQuote(校验)」。该表述不再把 AnnotationLayer 整体说成“只经 serialize 调用”，而是明确拆为“直调 anchor”和“经 serialize 调用”双源消费，与实现者申报的 `findRangeAtOffset 直调 anchor + verifyQuote 经 serialize` 一致。

**N2：ADDRESSED**（按“源码显式文本遍历”口径）  
证据：`anchor-serialize.ts:30-31` 明确「文本枚举唯一发生在 annotation-anchor；本模块仅借 Range 做长度探测（probeTextLength 的 Range.toString 非遍历）」。`Range.toString()` 被限定为长度探测，不属于代码层手写 DOM 文本枚举；且回炉验证中纪律句未动、代码零语义改动。  
不确定点：若审计口径把 `Range.toString()` 的内部文本收集也算作“遍历”，则该句需要更严格表述为“不承担显式文本枚举”或把 `probeTextLength` 移入 `annotation-anchor`；但这是口径问题，不构成本轮实现违背。

**N3：ADDRESSED**  
证据：`AnnotationLayer.tsx:2` 现为「依赖 annotation-anchor+anchor-serialize」，完整列出 AnnotationLayer 的两个消费来源，与 N1 的“直调 anchor + 经 serialize 调 verifyQuote”双源消费一致，未再遗漏依赖声明。

**新问题：无确认新问题。**

**总评：N1/N2/N3 均按拆述口径闭合，措辞与实际双源消费形一致，无新增代码缺陷，可放行；N2 的“Range.toString 非遍历”建议在台账中注明按“源码显式遍历”口径解释。**