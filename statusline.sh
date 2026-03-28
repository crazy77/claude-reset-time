#!/bin/bash
# Claude Code Statusline 수집 스크립트
# rate_limits, cost, context_window 데이터를 파일로 저장

CLAUDE_DIR="$HOME/.claude"
LATEST="$CLAUDE_DIR/usage-latest.json"
HISTORY="$CLAUDE_DIR/usage-history.jsonl"

input=$(cat)

# 최신 데이터 저장 (rate_limits 유무와 관계없이 항상 저장)
echo "$input" | jq -c '{
  rate_limits: .rate_limits,
  cost: .cost,
  context_window: .context_window,
  model: .model,
  ts: (now | floor)
}' > "$LATEST" 2>/dev/null

# 이력 축적 (1분 간격으로 중복 방지)
now_ts=$(date +%s)
last_ts=$(tail -1 "$HISTORY" 2>/dev/null | jq -r '.ts // 0' 2>/dev/null)
last_ts=${last_ts:-0}
last_ts=${last_ts%.*}
diff=$(( now_ts - last_ts ))
if [ "$diff" -ge 60 ] 2>/dev/null; then
  echo "$input" | jq -c '{
    rate_limits: .rate_limits,
    cost: .cost,
    ts: (now | floor)
  }' >> "$HISTORY" 2>/dev/null
fi

# Statusline 출력
five_h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty' 2>/dev/null)
seven_d=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty' 2>/dev/null)
model=$(echo "$input" | jq -r '.model.display_name // "Claude"' 2>/dev/null)

limits=""
[ -n "$five_h" ] && limits="5h:$(printf '%.0f' "$five_h")%"
[ -n "$seven_d" ] && limits="${limits:+$limits }7d:$(printf '%.0f' "$seven_d")%"

if [ -n "$limits" ]; then
  echo "[$model] $limits"
else
  echo "[$model]"
fi
