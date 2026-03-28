#!/bin/bash
# Claude Code Reset Timer 설치 스크립트
# statusline 설정 + Docker 빌드/실행을 자동으로 처리합니다.

set -e

CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"
STATUSLINE_SRC="$(cd "$(dirname "$0")" && pwd)/statusline.sh"
STATUSLINE_DST="$CLAUDE_DIR/statusline.sh"

echo "=== Claude Code Reset Timer 설치 ==="
echo ""

# 1. ~/.claude 디렉토리 확인
if [ ! -d "$CLAUDE_DIR" ]; then
  echo "❌ $CLAUDE_DIR 디렉토리가 없습니다. Claude Code를 먼저 설치해주세요."
  exit 1
fi

# 2. statusline.sh 설치
echo "[1/3] Statusline 스크립트 설치..."
if [ -f "$STATUSLINE_DST" ]; then
  echo "  ⚠️  $STATUSLINE_DST 가 이미 존재합니다."
  read -p "  덮어쓰시겠습니까? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  → 건너뜁니다. 기존 스크립트에 내용을 수동 병합해주세요."
  else
    cp "$STATUSLINE_SRC" "$STATUSLINE_DST"
    chmod +x "$STATUSLINE_DST"
    echo "  ✅ 덮어쓰기 완료"
  fi
else
  cp "$STATUSLINE_SRC" "$STATUSLINE_DST"
  chmod +x "$STATUSLINE_DST"
  echo "  ✅ $STATUSLINE_DST 설치 완료"
fi

# 3. settings.json에 statusLine 등록
echo "[2/3] settings.json에 statusLine 등록..."
if [ ! -f "$SETTINGS" ]; then
  echo '{ "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }' > "$SETTINGS"
  echo "  ✅ settings.json 생성 완료"
elif grep -q '"statusLine"' "$SETTINGS" 2>/dev/null; then
  echo "  ✅ statusLine이 이미 등록되어 있습니다."
else
  # jq가 있으면 사용, 없으면 python3, 둘 다 없으면 안내
  if command -v jq &>/dev/null; then
    tmp=$(mktemp)
    jq '. + { "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    echo "  ✅ settings.json에 statusLine 추가 완료 (jq)"
  elif command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$SETTINGS') as f: d = json.load(f)
d['statusLine'] = {'type': 'command', 'command': '~/.claude/statusline.sh'}
with open('$SETTINGS', 'w') as f: json.dump(d, f, indent=2, ensure_ascii=False)
"
    echo "  ✅ settings.json에 statusLine 추가 완료 (python3)"
  else
    echo "  ⚠️  jq 또는 python3이 없어 자동 추가가 불가합니다."
    echo "  $SETTINGS 에 다음을 수동으로 추가해주세요:"
    echo '  "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" }'
  fi
fi

# 4. Docker 빌드 및 실행
echo "[3/3] Docker 빌드 및 실행..."
if ! command -v docker &>/dev/null; then
  echo "  ❌ Docker가 설치되어 있지 않습니다."
  echo "  https://docs.docker.com/get-docker/ 에서 설치 후 다시 실행해주세요."
  exit 1
fi

docker compose up -d --build

echo ""
echo "=== 설치 완료 ==="
echo ""
echo "  📊 대시보드: http://localhost:3456"
echo ""
echo "  ⚠️  Claude Code 세션을 새로 시작해야 데이터 수집이 시작됩니다."
echo "     터미널에서 'claude' 실행 → 아무 메시지 전송"
echo ""
