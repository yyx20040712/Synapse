# -*- coding: utf-8 -*-
"""DeepSeek-V4-Flash diff 审计调用器（工作流基础设施，位于仓库外，不入库）。

用法:
  python deepseek_audit.py --name <任务名> --diff-file <path> [--brief-file <path>] [--rules-file <path>]
产物: 与 --name 同名的 .audit.json / .audit.raw.txt 写在脚本同目录 audits/ 下。
退出码: 0=调用成功(不代表无发现), 2=API 失败
"""
import argparse
import json
import os
import sys
import urllib.request

CONFIG_PATH = os.path.expanduser(r"~\.zcode\v2\config.json")
PROVIDER_ID = "ec028588-d567-4b17-b42d-82743c8ad8f9"
MODEL = "deepseek-v4-flash"  # 实测有效模型 ID；直连（不走代理）
ENDPOINT = "https://api.deepseek.com/chat/completions"

SYSTEM_PROMPT = """你是资深软件审计工程师，对一个 Electron + TypeScript 桌面应用（本地学术文献管理 + PDF 阅读标注）的代码变更 diff 做第一道独立审计。

审计维度（按优先级）：
1. 契约与纪律：是否违反项目宪法（AGENTS.md 硬规则，随输入附上）
2. 正确性：逻辑错误、边界条件、错误处理缺失、竞态
3. 安全：SQL 注入、路径穿越、XSS、不安全 API、出网白名单外联
4. 生产质量：类型滥用(any)、死代码、占位实现、行数超标(文件≤500行)
5. 测试纪律：是否有为过测试而放宽断言/删检查的迹象

输出要求：只输出一个 JSON 对象，不要 markdown 代码围栏，不要多余文字：
{
  "verdict": "PASS" | "PASS_WITH_WARNINGS" | "FAIL",
  "findings": [
    {
      "severity": "BLOCKING" | "WARN" | "NIT",
      "file": "...",
      "line_hint": "...",
      "issue": "...",
      "evidence": "diff 或规约中的原文依据",
      "suggestion": "具体修改建议"
    }
  ],
  "summary": "两三句总体判断"
}
判级标准：BLOCKING=违反硬规则/正确性缺陷/安全问题，必须回修；WARN=应当修但不阻塞；NIT=风格建议。
没有发现就给空 findings + PASS。不要编造 diff 里不存在的内容；引用证据必须来自输入材料。"""

ANALYSIS_PROMPT = """你是资深软件审计工程师，对一份「缺陷根因分析报告」做第一道独立逻辑审计。你拿不到代码库，只审报告文本本身。

审计维度：
1. 证据纪律：每条结论是否都锚定了具体证据（file:line/代码摘录/文档引用）？有没有无证据的断言、超出证据的过度推断、或疑似编造的精确引用？
2. 推理链：从证据到结论的推演是否成立？现象→机理的因果解释是否自洽（尤其时序类推断）？
3. 分类合理性：架构/代码实现/特性/技术债 四分类的判定理由是否充分、有没有贴错标签（例如把未立项的功能说成缺陷、把已声明的取舍说成疏漏）？
4. 诚实度：报告是否明确区分了「已确证」与「需运行时信息」？有没有把假设包装成结论？
5. 完整性：是否回答了用户报告的全部子现象？修复建议与根因是否对齐？

输出要求：只输出一个 JSON 对象，不要 markdown 围栏：
{
  "verdict": "PASS" | "PASS_WITH_WARNINGS" | "FAIL",
  "findings": [
    {"severity": "BLOCKING|WARN|NIT", "file": "报告小节", "line_hint": "报告内位置", "issue": "...", "evidence": "报告原文依据", "suggestion": "..."}
  ],
  "summary": "两三句总体判断"
}
BLOCKING=存在编造/关键结论无证据/分类严重错标；WARN=推理跳步或证据不足但方向可能对；NIT=表述问题。没有发现给空 findings + PASS。"""

PLAN_PROMPT = """你是资深软件工程顾问，对一份「工程制度文档集 + 后续任务规划」做第一道独立审计。你拿不到运行环境，只审规划文本与 diff 本身。

审计维度（按优先级）：
1. 目标覆盖度：规划是否真正覆盖声明要解决的问题（用户目标：软件工程常识制度化 + 系统性梳理未考虑的东西 + 避免继续产生未定义特性；背景结论：骨架式开发在三类盲区产生缺陷——时序/竞态、接缝无主、未声明不变量）。有无目标产生路径未被任何条目覆盖？
2. 可执行性：新会话照着能否执行？靶点是否具体到 file:line？有无含糊指令、缺失前置（环境/工具/权限/数据）？
3. 内部自洽与体系一致性：四份产物（宪法新节/不变量登记册/惯例速查/接手任务书）互相引用是否一致？编号/文件路径/条款引用是否成立？与既有宪法条款（含「明确不做」负面清单、依赖禁令）有无冲突？
4. 风险：规划自身是否会引发范围蔓延/过度工程？重构批次的风险控制是否足够（"不动"作为合法结论的裁决纪律是否闭合）？
5. 基础设施与耐久性：任务书依赖的工具/路径是否耐久（临时目录、外部脚本、单点文件）？失效有无预案？

输出要求：只输出一个 JSON 对象，不要 markdown 围栏：
{
  "verdict": "PASS" | "PASS_WITH_WARNINGS" | "FAIL",
  "findings": [
    {"severity": "BLOCKING|WARN|NIT", "file": "...", "line_hint": "...", "issue": "...", "evidence": "规划文本原文依据", "suggestion": "..."}
  ],
  "summary": "两三句总体判断"
}
判级：BLOCKING=规划存在会导致任务失败/目标落空的缺陷；WARN=应当修但不阻塞；NIT=表述建议。没有发现给空 findings + PASS。不要编造文本中不存在的内容；引用证据必须来自输入材料。"""


def load_key():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg["provider"][PROVIDER_ID]["options"]["apiKey"]


def call(key, system, user):
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": 32768,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
    })
    # api.deepseek.com 直连可达；走本机代理反而 SSL 握手失败（实测）
    handler = urllib.request.ProxyHandler({})
    opener = urllib.request.build_opener(handler)
    with opener.open(req, timeout=900) as r:
        return json.load(r)


def extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("响应中未找到 JSON 对象")
    return json.loads(text[start:end + 1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--diff-file", required=True)
    ap.add_argument("--brief-file")
    ap.add_argument("--rules-file", default=r"E:\class\智慧水务\Synapse_remake\AGENTS.md")
    ap.add_argument("--mode", default="diff", choices=["diff", "analysis", "plan"])
    args = ap.parse_args()

    parts = []
    if args.mode in ('diff', 'plan') and args.rules_file and os.path.exists(args.rules_file):
        with open(args.rules_file, encoding="utf-8") as f:
            parts.append("=== 项目宪法 AGENTS.md ===\n" + f.read())
    if args.brief_file and os.path.exists(args.brief_file):
        with open(args.brief_file, encoding="utf-8") as f:
            parts.append("=== 任务简报/工单规约 ===\n" + f.read())
    with open(args.diff_file, encoding="utf-8") as f:
        parts.append("=== 待审计 diff ===\n" + f.read())
    user_content = "\n\n".join(parts)

    system = {"diff": SYSTEM_PROMPT, "analysis": ANALYSIS_PROMPT, "plan": PLAN_PROMPT}[args.mode]
    resp = call(load_key(), system, user_content)
    message = resp["choices"][0]["message"]
    raw_text = message.get("content") or ""
    reasoning = message.get("reasoning_content") or ""

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audits")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, args.name + ".audit.raw.txt"), "w", encoding="utf-8") as f:
        f.write("== reasoning ==\n" + reasoning + "\n\n== content ==\n" + raw_text)

    try:
        result = extract_json(raw_text)
    except Exception as e:
        print("JSON 解析失败:", e)
        print(raw_text[:2000])
        sys.exit(2)

    result["_meta"] = {
        "model": resp.get("model"),
        "usage": resp.get("usage"),
        "finish_reason": resp["choices"][0].get("finish_reason"),
    }
    out_path = os.path.join(out_dir, args.name + ".audit.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("verdict:", result.get("verdict"))
    for fd in result.get("findings", []):
        print(f"[{fd.get('severity')}] {fd.get('file')} {fd.get('line_hint', '')}: {fd.get('issue')}")
    print("findings:", len(result.get("findings", [])))
    print("saved:", out_path)


if __name__ == "__main__":
    main()
