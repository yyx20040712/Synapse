#!/usr/bin/env bash
# W5 六派发串联（Kimi chain 审×3 + deepseek auditor-readonly 审×3）
set -u
NODE24="$LOCALAPPDATA/Volta/tools/image/node/24.20.0/node.exe"
SK="C:/Users/Administrator/.zcode/skills/ai-dev-org"
AU="E:/class/智慧水务/Synapse_remake/scripts/audits"
cd "$SK" || exit 9
for zone in a b c; do
  for side in kimi ds; do
    OUT="$AU/2026-09-10_w5-${zone}-${side}-out.md"
    echo "===== [$(date +%H:%M:%S)] 派发 ${zone}'/${side} ====="
    if [ "$side" = kimi ]; then
      "$NODE24" scripts/ds-call-v2.mjs --role gate1-reviewer --project ai-dev-org-optimize "$AU/2026-09-10_w5-${zone}pkg.md" "$OUT" > /dev/null 2>"$AU/2026-09-10_w5-${zone}-${side}-err.log"
    else
      "$NODE24" scripts/ds-call-v2.mjs --role auditor-readonly --project ai-dev-org-optimize "$AU/2026-09-10_w5-${zone}pkg.md" "$OUT" > /dev/null 2>"$AU/2026-09-10_w5-${zone}-${side}-err.log"
    fi
    rc=$?
    echo "  exit=$rc out=$(wc -c < "$OUT" 2>/dev/null || echo 0)B"
    if [ $rc -ne 0 ]; then echo "  !! 非零退出，err 尾行："; tail -3 "$AU/2026-09-10_w5-${zone}-${side}-err.log"; fi
  done
done
echo "===== 六派发完毕 ====="
